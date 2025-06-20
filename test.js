#!/usr/bin/env node

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';
import axios from 'axios';

// Load environment variables
config();

const MCP_PORT = process.env.MCP_PORT || 3001;
const MCP_BASE_URL = `http://localhost:${MCP_PORT}`;

/**
 * Test for the n8n MCP server using HTTP transport
 */

console.log('🧪 Testing n8n MCP Server (HTTP)\n');

async function testMcpServer() {
  console.log('Starting MCP server...');
  
  // Spawn the MCP server
  const mcpServer = spawn('node', ['index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverReady = false;
  
  mcpServer.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log('Server:', output);
    if (output.includes('MCP server running on')) {
      serverReady = true;
    }
  });

  mcpServer.stderr.on('data', (data) => {
    console.log('Server stderr:', data.toString().trim());
  });

  // Wait for server to start with timeout
  console.log('Waiting for server to start...');
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!serverReady && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }
  
  if (!serverReady) {
    console.log('⚠️  Server may not have started properly, proceeding with tests...');
  }

  try {
    // Test health endpoint
    console.log('\n📋 Testing: Health Check');
    try {
      const healthResponse = await axios.get(`${MCP_BASE_URL}/health`, {
        timeout: 5000
      });
      console.log('✅ Health check passed:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      console.log('   Make sure the server is running and accessible');
      return;
    }

    // Test MCP SSE endpoint availability with proper timeout
    console.log('\n📋 Testing: MCP SSE Endpoint');
    try {
      // Test with GET request (should fail but gives us info about endpoint)
      const response = await axios.get(`${MCP_BASE_URL}/sse`, {
        timeout: 3000,
        validateStatus: () => true // Accept any status code
      });
      console.log('✅ MCP SSE endpoint is accessible, status:', response.status);
    } catch (error) {
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        console.log('✅ MCP SSE endpoint is accessible (connection reset/timeout expected for SSE)');
      } else {
        console.log('⚠️  MCP SSE endpoint test:', error.message);
      }
    }

    // Test MCP protocol with POST request
    console.log('\n📋 Testing: MCP Protocol (POST)');
    try {
      const mcpRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      };
      
      const response = await axios.post(`${MCP_BASE_URL}/sse`, mcpRequest, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.result && response.data.result.tools) {
        console.log('✅ MCP Protocol working!');
        console.log(`   Found ${response.data.result.tools.length} tools available\n`);
        
        // List ALL tools with their descriptions
        console.log('📋 Available MCP Tools:');
        console.log('=' * 50);
        
        const tools = response.data.result.tools;
        tools.forEach((tool, index) => {
          console.log(`${index + 1}. ${tool.name}`);
          console.log(`   📝 ${tool.description}`);
          
          // Show parameters if available
          if (tool.inputSchema && tool.inputSchema.properties) {
            const params = Object.keys(tool.inputSchema.properties);
            if (params.length > 0) {
              console.log(`   📋 Parameters: ${params.join(', ')}`);
            }
          }
          
          // Show required parameters
          if (tool.inputSchema && tool.inputSchema.required && tool.inputSchema.required.length > 0) {
            console.log(`   ⚠️  Required: ${tool.inputSchema.required.join(', ')}`);
          }
          
          console.log(''); // Empty line for readability
        });
        
        // Group tools by category
        console.log('📊 Tools by Category:');
        console.log('=' * 30);
        
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
        
      } else {
        console.log('⚠️  MCP Protocol responded but no tools found');
      }
    } catch (error) {
      console.log('❌ MCP Protocol test failed:', error.message);
      if (error.response && error.response.data) {
        console.log('   Server response:', error.response.data);
      }
    }

    // Test self_test tool if available
    console.log('\n📋 Testing: Self-Test Tool');
    try {
      const selfTestRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'self_test',
          arguments: {}
        }
      };
      
      const response = await axios.post(`${MCP_BASE_URL}/sse`, selfTestRequest, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.data && response.data.result) {
        console.log('✅ Self-test completed');
        
        // Try to parse the result
        try {
          const content = response.data.result.content[0];
          if (content && content.type === 'text') {
            const testResult = JSON.parse(content.text);
            console.log('   n8n Connection:', testResult.connection ? '✅ Connected' : '❌ Failed');
            console.log('   Base URL:', testResult.baseUrl);
            
            if (testResult.tests) {
              console.log('   Workflows:', testResult.tests.workflows?.read ? '✅ Read' : '❌ Read', 
                         testResult.tests.workflows?.write ? '✅ Write' : '❌ Write');
              console.log('   Executions:', testResult.tests.executions?.read ? '✅ Read' : '❌ Read');
              console.log('   Variables:', testResult.tests.variables?.read ? '✅ Read' : '❌ Read');
              console.log('   Credentials:', testResult.tests.credentials?.read ? '✅ Read' : '❌ Read');
            }
            
            if (testResult.errors && testResult.errors.length > 0) {
              console.log('   Issues found:');
              testResult.errors.forEach(error => {
                console.log(`     - ${error}`);
              });
            }
          }
        } catch (parseError) {
          console.log('   Raw result:', response.data.result.content[0].text);
        }
      }
    } catch (error) {
      console.log('⚠️  Self-test failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    mcpServer.kill('SIGTERM');
    
    // Give it a moment to clean shutdown
    setTimeout(() => {
      if (mcpServer.killed === false) {
        mcpServer.kill('SIGKILL');
      }
    }, 2000);
    
    console.log('🎯 Test completed');
  }
}

async function validateEnvironment() {
  console.log('🔍 Validating environment...');
  
  const requiredEnvVars = ['N8N_API', 'N8N_BASE_URL'];
  const missingVars = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }
  
  if (missingVars.length > 0) {
    console.log('❌ Missing environment variables:', missingVars.join(', '));
    console.log('Please set these in your .env file:');
    console.log('N8N_API=your_api_key_here');
    console.log('N8N_BASE_URL=http://localhost:5678');
    return false;
  }
  
  console.log('✅ Environment variables are set');
  console.log(`   N8N_BASE_URL: ${process.env.N8N_BASE_URL}`);
  console.log(`   N8N_API: ${process.env.N8N_API ? '[SET]' : '[NOT SET]'}`);
  console.log(`   MCP_PORT: ${MCP_PORT}`);
  return true;
}

async function createExampleMcpConfig() {
  console.log('\n📝 Creating example MCP configuration...');
  
  const httpConfig = {
    "mcpServers": {
      "n8n": {
        "url": `${MCP_BASE_URL}/sse`
      }
    }
  };
  
  writeFileSync('mcp-config-http.json', JSON.stringify(httpConfig, null, 2));
  
  console.log('✅ MCP configuration saved to mcp-config-http.json');
  console.log('You can use this configuration with MCP-compatible tools like Claude Desktop');
}

async function createUsageInstructions() {
  console.log('\n📚 Creating usage instructions...');
  
  const instructions = `# n8n MCP Server Usage

## Server Information
- MCP Server URL: ${MCP_BASE_URL}/sse
- Health Check: ${MCP_BASE_URL}/health
- n8n Instance: ${process.env.N8N_BASE_URL || 'http://localhost:5678'}

## Starting the Server
\`\`\`bash
npm start
\`\`\`

## Testing the Server
\`\`\`bash
# Health check
curl ${MCP_BASE_URL}/health

# Full test suite
npm test

# Simple MCP test
npm run test:mcp
\`\`\`

## Claude Desktop Configuration
Add this to your Claude Desktop MCP settings:

\`\`\`json
{
  "mcpServers": {
    "n8n": {
      "url": "${MCP_BASE_URL}/sse"
    }
  }
}
\`\`\`

## Available Tools
- **Workflow Management**: list_workflows, get_workflow, create_workflow, update_workflow, delete_workflow
- **Workflow Control**: activate_workflow, deactivate_workflow  
- **Variable Management**: list_variables, get_variable, create_variable, update_variable, delete_variable
- **Credential Management**: list_credentials, create_credential, delete_credential
- **Execution Management**: list_executions, get_execution
- **Diagnostics**: self_test - Test n8n connection and permissions

## Environment Variables
- \`N8N_API\`: Your n8n API key
- \`N8N_BASE_URL\`: Your n8n instance URL (default: http://localhost:5678)
- \`MCP_PORT\`: MCP server port (default: 3001)

## Troubleshooting
- If tests hang, make sure no other process is using port ${MCP_PORT}
- Check that your n8n instance is running and accessible
- Verify API key has sufficient permissions for the operations you need
`;

  writeFileSync('USAGE.md', instructions);
  console.log('✅ Usage instructions saved to USAGE.md');
}

async function main() {
  console.log('🚀 n8n MCP Server Test Suite\n');
  
  // Validate environment
  const envValid = await validateEnvironment();
  if (!envValid) {
    console.log('\n⚠️  Environment validation failed. Please fix and try again.');
    process.exit(1);
  }
  
  // Create configurations
  await createExampleMcpConfig();
  await createUsageInstructions();
  
  // Run the tests
  await testMcpServer();
  
  console.log('\n✨ All tests completed!');
  console.log('   - Use `npm start` to run the MCP server');
  console.log('   - Use `npm run test:mcp` for quick testing');
  console.log('   - Check USAGE.md for detailed instructions');
}

// Handle interruption gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch((error) => {
  console.error('Test suite failed:', error.message);
  process.exit(1);
}); 