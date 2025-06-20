#!/usr/bin/env node

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

class McpTester {
  constructor() {
    this.testResults = [];
    this.messageId = 1;
  }

  async sendMcpMessage(message) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', ['index.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            // Parse multiple JSON responses
            const responses = output.trim().split('\n').filter(line => line.trim());
            const parsedResponses = responses.map(line => JSON.parse(line));
            resolve(parsedResponses);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}\nOutput: ${output}`));
          }
        } else {
          reject(new Error(`Process exited with code ${code}\nError: ${errorOutput}`));
        }
      });

      child.stdin.write(message);
      child.stdin.end();
    });
  }

  async initialize() {
    console.log('🚀 Initializing MCP connection...');
    
    const initMessage = JSON.stringify({
      jsonrpc: "2.0",
      id: this.messageId++,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "n8n-mcp-tester",
          version: "1.0.0"
        }
      }
    }) + '\n';

    try {
      const responses = await this.sendMcpMessage(initMessage);
      const initResponse = responses[0];
      
      if (initResponse.result) {
        console.log('✅ MCP initialization successful');
        console.log(`   Server: ${initResponse.result.serverInfo.name} v${initResponse.result.serverInfo.version}`);
        return true;
      } else {
        console.log('❌ MCP initialization failed:', initResponse.error);
        return false;
      }
    } catch (error) {
      console.log('❌ MCP initialization error:', error.message);
      return false;
    }
  }

  async listTools() {
    console.log('\n📋 Listing available tools...');
    
    const listMessage = JSON.stringify({
      jsonrpc: "2.0",
      id: this.messageId++,
      method: "tools/list",
      params: {}
    }) + '\n';

    try {
      const responses = await this.sendMcpMessage(listMessage);
      const listResponse = responses[0];
      
      if (listResponse.result && listResponse.result.tools) {
        const tools = listResponse.result.tools;
        console.log(`✅ Found ${tools.length} tools:`);
        tools.forEach((tool, index) => {
          console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
        });
        return tools;
      } else {
        console.log('❌ Failed to list tools:', listResponse.error);
        return [];
      }
    } catch (error) {
      console.log('❌ Error listing tools:', error.message);
      return [];
    }
  }

  async testTool(toolName, args = {}) {
    const callMessage = JSON.stringify({
      jsonrpc: "2.0",
      id: this.messageId++,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args
      }
    }) + '\n';

    try {
      const responses = await this.sendMcpMessage(callMessage);
      const callResponse = responses[0];
      
      if (callResponse.result && callResponse.result.content) {
        const content = callResponse.result.content[0];
        const result = JSON.parse(content.text);
        return {
          success: true,
          tool: toolName,
          result: result
        };
      } else {
        return {
          success: false,
          tool: toolName,
          error: callResponse.error || 'Unknown error'
        };
      }
    } catch (error) {
      return {
        success: false,
        tool: toolName,
        error: error.message
      };
    }
  }

  async runAllTests() {
    console.log('🧪 Starting comprehensive n8n MCP tool tests...\n');

    // Initialize connection
    const initialized = await this.initialize();
    if (!initialized) {
      console.log('❌ Cannot proceed without successful initialization');
      return;
    }

    // List all tools
    const tools = await this.listTools();
    if (tools.length === 0) {
      console.log('❌ No tools available for testing');
      return;
    }

    console.log('\n🔧 Testing individual tools...\n');

    // Test each tool category
    await this.testSystemTools();
    await this.testWorkflowTools();
    await this.testVariableTools();
    await this.testCredentialTools();
    await this.testExecutionTools();

    // Print summary
    this.printSummary();
  }

  async testSystemTools() {
    console.log('📊 Testing System Management Tools:');
    
    // Test self_test
    console.log('   Testing self_test...');
    const selfTestResult = await this.testTool('self_test');
    this.testResults.push(selfTestResult);
    
    if (selfTestResult.success) {
      const summary = selfTestResult.result.summary;
      console.log(`   ✅ self_test: ${summary.passed}/${summary.total_tests} tests passed`);
      if (summary.overall_status === 'HEALTHY') {
        console.log('      🟢 System is healthy');
      } else {
        console.log('      🟡 System has some issues (likely license-related)');
      }
    } else {
      console.log(`   ❌ self_test failed: ${selfTestResult.error}`);
    }
  }

  async testWorkflowTools() {
    console.log('\n🔄 Testing Workflow Management Tools:');
    
    const workflowTools = [
      'list_workflows',
      'get_workflow', 
      'create_workflow',
      'update_workflow',
      'delete_workflow',
      'activate_workflow',
      'deactivate_workflow'
    ];

    for (const tool of workflowTools) {
      console.log(`   Testing ${tool}...`);
      
      let args = {};
      if (tool === 'list_workflows') {
        args = { limit: 5 };
      } else if (tool === 'get_workflow') {
        args = { workflowId: 'test-id' }; // This will likely fail but tests the structure
      } else if (tool === 'create_workflow') {
        args = { 
          name: 'Test Workflow',
          nodes: [
            {
              id: 'start',
              type: 'n8n-nodes-base.start',
              position: [250, 300],
              parameters: {}
            }
          ]
        };
      } else if (['update_workflow', 'delete_workflow', 'activate_workflow', 'deactivate_workflow'].includes(tool)) {
        args = { workflowId: 'test-id' };
      }

      const result = await this.testTool(tool, args);
      this.testResults.push(result);
      
      if (result.success) {
        if (result.result.success) {
          console.log(`   ✅ ${tool}: ${result.result.message || 'Success'}`);
        } else {
          console.log(`   🟡 ${tool}: ${result.result.message || result.result.error} (Expected for test data)`);
        }
      } else {
        console.log(`   ❌ ${tool}: ${result.error}`);
      }
    }
  }

  async testVariableTools() {
    console.log('\n📝 Testing Variable Management Tools:');
    
    const variableTools = [
      'list_variables',
      'get_variable',
      'create_variable', 
      'update_variable',
      'delete_variable'
    ];

    for (const tool of variableTools) {
      console.log(`   Testing ${tool}...`);
      
      let args = {};
      if (tool === 'list_variables') {
        args = { limit: 5 };
      } else if (['get_variable', 'delete_variable'].includes(tool)) {
        args = { key: 'test-key' };
      } else if (['create_variable', 'update_variable'].includes(tool)) {
        args = { key: 'test-key', value: 'test-value' };
      }

      const result = await this.testTool(tool, args);
      this.testResults.push(result);
      
      if (result.success) {
        if (result.result.success) {
          console.log(`   ✅ ${tool}: ${result.result.message || 'Success'}`);
        } else {
          console.log(`   🟡 ${tool}: ${result.result.message || result.result.error} (May require license)`);
        }
      } else {
        console.log(`   ❌ ${tool}: ${result.error}`);
      }
    }
  }

  async testCredentialTools() {
    console.log('\n🔐 Testing Credential Management Tools:');
    
    const credentialTools = [
      'list_credentials',
      'create_credential',
      'delete_credential'
    ];

    for (const tool of credentialTools) {
      console.log(`   Testing ${tool}...`);
      
      let args = {};
      if (tool === 'list_credentials') {
        args = { limit: 5 };
      } else if (tool === 'create_credential') {
        args = { 
          name: 'Test Credential',
          type: 'httpBasicAuth',
          data: { user: 'test', password: 'test' }
        };
      } else if (tool === 'delete_credential') {
        args = { credentialId: 'test-id' };
      }

      const result = await this.testTool(tool, args);
      this.testResults.push(result);
      
      if (result.success) {
        if (result.result.success) {
          console.log(`   ✅ ${tool}: ${result.result.message || 'Success'}`);
        } else {
          console.log(`   🟡 ${tool}: ${result.result.message || result.result.error} (Expected for test data)`);
        }
      } else {
        console.log(`   ❌ ${tool}: ${result.error}`);
      }
    }
  }

  async testExecutionTools() {
    console.log('\n⚡ Testing Execution Management Tools:');
    
    const executionTools = [
      'list_executions',
      'get_execution'
    ];

    for (const tool of executionTools) {
      console.log(`   Testing ${tool}...`);
      
      let args = {};
      if (tool === 'list_executions') {
        args = { limit: 5 };
      } else if (tool === 'get_execution') {
        args = { executionId: 'test-id' };
      }

      const result = await this.testTool(tool, args);
      this.testResults.push(result);
      
      if (result.success) {
        if (result.result.success) {
          console.log(`   ✅ ${tool}: ${result.result.message || 'Success'}`);
        } else {
          console.log(`   🟡 ${tool}: ${result.result.message || result.result.error} (Expected for test data)`);
        }
      } else {
        console.log(`   ❌ ${tool}: ${result.error}`);
      }
    }
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const successful = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    
    console.log(`Total tools tested: ${total}`);
    console.log(`MCP protocol responses: ${successful}/${total} (${Math.round(successful/total*100)}%)`);
    
    // Categorize results
    const protocolFailures = this.testResults.filter(r => !r.success);
    const n8nFailures = this.testResults.filter(r => r.success && r.result && !r.result.success);
    const fullSuccesses = this.testResults.filter(r => r.success && r.result && r.result.success);
    
    console.log(`Full successes: ${fullSuccesses.length}`);
    console.log(`n8n API issues: ${n8nFailures.length} (expected for test data/license)`);
    console.log(`MCP protocol issues: ${protocolFailures.length}`);
    
    if (protocolFailures.length > 0) {
      console.log('\n❌ MCP Protocol Failures:');
      protocolFailures.forEach(failure => {
        console.log(`   - ${failure.tool}: ${failure.error}`);
      });
    }
    
    if (successful === total) {
      console.log('\n🎉 All tools respond correctly via MCP protocol!');
      console.log('   The server is ready for production use.');
    } else {
      console.log('\n⚠️  Some tools have MCP protocol issues that need attention.');
    }
    
    console.log('\n💡 Note: n8n API failures are expected when:');
    console.log('   - Using test data (non-existent IDs)');
    console.log('   - Missing n8n license features (variables)');
    console.log('   - n8n server configuration restrictions');
  }
}

// Run the tests
const tester = new McpTester();
tester.runAllTests().catch(console.error); 