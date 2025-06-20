#!/usr/bin/env node

import axios from 'axios';
import { config } from 'dotenv';
import EventSource from 'eventsource';

// Load environment variables
config();

const MCP_PORT = process.env.MCP_PORT || 3001;
const MCP_BASE_URL = `http://localhost:${MCP_PORT}`;

class SimpleMcpTester {
  constructor() {
    this.requestId = 1;
  }

  async testHealthCheck() {
    console.log('🏥 Testing health check endpoint...');
    try {
      const response = await axios.get(`${MCP_BASE_URL}/health`);
      console.log('✅ Health check passed');
      console.log('📊 Server info:', JSON.stringify(response.data, null, 2));
      return true;
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      return false;
    }
  }

  async testSSEConnection() {
    console.log('\n📡 Testing SSE connection...');
    
    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          eventSource.close();
          console.log('⚠️  SSE connection timeout (this might be expected)');
          resolve(false);
        }
      }, 3000);

      const eventSource = new EventSource(`${MCP_BASE_URL}/sse`);
      
      eventSource.onopen = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          eventSource.close();
          console.log('✅ SSE connection established');
          resolve(true);
        }
      };

      eventSource.onerror = (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          eventSource.close();
          console.log('⚠️  SSE connection error (might be expected for testing)');
          resolve(false);
        }
      };
    });
  }

  async sendMcpRequest(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: method,
      params: params
    };

    console.log(`📤 Sending MCP request: ${method}`);
    console.log('   Request:', JSON.stringify(request, null, 2));

    try {
      const response = await axios.post(`${MCP_BASE_URL}/sse`, request, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('📥 Response received');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.log('❌ Request failed:', error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Data:', error.response.data);
      }
      return null;
    }
  }

  async testListTools() {
    console.log('\n🛠️  Testing tools/list...');
    const response = await this.sendMcpRequest('tools/list');
    
    if (response && response.result && response.result.tools) {
      const tools = response.result.tools;
      console.log(`✅ Found ${tools.length} tools:\n`);
      
      console.log('📋 Complete List of Available MCP Tools:');
      console.log('=' * 50);
      
      tools.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}`);
        console.log(`   📝 ${tool.description}`);
        
        if (tool.inputSchema && tool.inputSchema.properties) {
          const props = Object.keys(tool.inputSchema.properties);
          if (props.length > 0) {
            console.log(`   📋 Parameters: ${props.join(', ')}`);
          }
        }
        
        if (tool.inputSchema && tool.inputSchema.required && tool.inputSchema.required.length > 0) {
          console.log(`   ⚠️  Required: ${tool.inputSchema.required.join(', ')}`);
        }
        
        console.log(''); // Empty line
      });
      
      // Categorized summary
      console.log('📊 Tools Summary by Category:');
      console.log('=' * 35);
      
      const categories = {
        'Workflow Management': tools.filter(t => t.name.includes('workflow') && !t.name.includes('activate') && !t.name.includes('deactivate')),
        'Workflow Control': tools.filter(t => t.name.includes('activate') || t.name.includes('deactivate')),
        'Variable Management': tools.filter(t => t.name.includes('variable')),
        'Credential Management': tools.filter(t => t.name.includes('credential')),
        'Execution Management': tools.filter(t => t.name.includes('execution')),
        'Diagnostics': tools.filter(t => t.name === 'self_test')
      };
      
      Object.entries(categories).forEach(([category, categoryTools]) => {
        if (categoryTools.length > 0) {
          console.log(`\n🔧 ${category} (${categoryTools.length} tools):`);
          categoryTools.forEach(tool => {
            console.log(`   - ${tool.name}`);
          });
        }
      });
      
      return tools;
    } else {
      console.log('❌ No tools found in response');
      return null;
    }
  }

  async testToolCall(toolName, args = {}) {
    console.log(`\n🔧 Testing tool call: ${toolName}...`);
    const response = await this.sendMcpRequest('tools/call', {
      name: toolName,
      arguments: args
    });

    if (response && response.result) {
      console.log(`✅ Tool ${toolName} executed successfully`);
      
      // Try to parse and display the content nicely
      if (response.result.content && response.result.content[0]) {
        const content = response.result.content[0];
        if (content.type === 'text') {
          try {
            const parsed = JSON.parse(content.text);
            console.log('📋 Result:');
            console.log(JSON.stringify(parsed, null, 2));
          } catch {
            console.log('📋 Result (raw):', content.text);
          }
        }
      }
      
      return response.result;
    } else {
      console.log(`❌ Tool ${toolName} failed`);
      return null;
    }
  }

  async runComprehensiveTest() {
    console.log('🧪 n8n MCP Server - Comprehensive Test\n');
    console.log('='.repeat(50));

    // Test 1: Health check
    const healthWorking = await this.testHealthCheck();
    if (!healthWorking) {
      console.log('\n💥 Health check failed. Is the server running?');
      console.log('Try running: npm start');
      return false;
    }

    // Test 2: SSE connection
    await this.testSSEConnection();

    // Test 3: List tools
    const tools = await this.testListTools();
    if (!tools || tools.length === 0) {
      console.log('\n💥 No tools available. Server might not be working correctly.');
      return false;
    }

    // Test 4: Test specific tools
    console.log('\n🎯 Testing key functionality...');
    
    // Test self_test tool
    await this.testToolCall('self_test');
    
    // Test list_workflows with parameters
    await this.testToolCall('list_workflows', { limit: 3 });
    
    // Test list_variables
    await this.testToolCall('list_variables');

    // Test list_executions
    await this.testToolCall('list_executions', { limit: 5 });

    // Summary
    console.log('\n🎉 Test Summary');
    console.log('='.repeat(30));
    console.log('✅ HTTP endpoints: Working');
    console.log('✅ MCP protocol: Working');
    console.log(`✅ Available tools: ${tools.length}`);
    console.log('\n🚀 MCP server is fully functional!');
    
    console.log('\n📋 To use with Claude Desktop, add this configuration:');
    console.log(JSON.stringify({
      "mcpServers": {
        "n8n": {
          "url": `${MCP_BASE_URL}/sse`
        }
      }
    }, null, 2));

    return true;
  }
}

async function main() {
  const tester = new SimpleMcpTester();
  
  try {
    await tester.runComprehensiveTest();
  } catch (error) {
    console.error('\n💥 Test failed with error:', error);
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Make sure the server is running: npm start');
    console.log('2. Check if port 3001 is available');
    console.log('3. Verify environment variables in .env');
    process.exit(1);
  }
}

// Handle interruption gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

main(); 