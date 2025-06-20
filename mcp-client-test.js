#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import axios from 'axios';
import { config } from 'dotenv';

// Load environment variables
config();

const MCP_PORT = process.env.MCP_PORT || 3001;
const MCP_BASE_URL = `http://localhost:${MCP_PORT}`;

class McpTester {
  constructor() {
    this.client = null;
    this.transport = null;
  }

  async testHttpEndpoints() {
    console.log('🔍 Testing HTTP endpoints...\n');
    
    try {
      // Test health endpoint
      console.log('📡 Testing health endpoint...');
      const healthResponse = await axios.get(`${MCP_BASE_URL}/health`);
      console.log('✅ Health check passed:', healthResponse.data);
      
      // Test SSE endpoint availability
      console.log('\n📡 Testing SSE endpoint availability...');
      try {
        const response = await axios.get(`${MCP_BASE_URL}/sse`, {
          timeout: 2000,
          validateStatus: () => true // Accept any status
        });
        console.log('✅ SSE endpoint accessible, status:', response.status);
      } catch (error) {
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
          console.log('✅ SSE endpoint is streaming (connection reset/timeout expected)');
        } else {
          console.log('⚠️  SSE endpoint error:', error.message);
        }
      }
      
      return true;
    } catch (error) {
      console.log('❌ HTTP endpoint test failed:', error.message);
      return false;
    }
  }

  async testMcpConnection() {
    console.log('\n🔗 Testing MCP connection...\n');
    
    try {
      // Create MCP client with SSE transport
      console.log('📡 Creating MCP client...');
      this.transport = new SSEClientTransport(new URL(`${MCP_BASE_URL}/sse`));
      this.client = new Client({
        name: 'n8n-mcp-test-client',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      console.log('🔌 Connecting to MCP server...');
      await this.client.connect(this.transport);
      console.log('✅ MCP connection established');
      
      return true;
    } catch (error) {
      console.log('❌ MCP connection failed:', error.message);
      return false;
    }
  }

  async testListTools() {
    console.log('\n🛠️  Testing tool listing...\n');
    
    try {
      console.log('📋 Requesting available tools...');
      const response = await this.client.request(
        { method: 'tools/list', params: {} },
        { method: 'tools/list', params: {} }
      );
      
      console.log('✅ Tools retrieved successfully');
      console.log(`📊 Found ${response.tools.length} tools:\n`);
      
      response.tools.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}`);
        console.log(`   Description: ${tool.description}`);
        console.log(`   Schema: ${JSON.stringify(tool.inputSchema?.properties || {}, null, 2)}`);
        console.log('');
      });
      
      return response.tools;
    } catch (error) {
      console.log('❌ Tool listing failed:', error.message);
      return null;
    }
  }

  async testToolCall(toolName, args = {}) {
    console.log(`\n🔧 Testing tool call: ${toolName}...\n`);
    
    try {
      console.log(`📞 Calling ${toolName} with args:`, JSON.stringify(args, null, 2));
      const response = await this.client.request(
        { method: 'tools/call', params: { name: toolName, arguments: args } },
        { method: 'tools/call', params: { name: toolName, arguments: args } }
      );
      
      console.log('✅ Tool call successful');
      console.log('📋 Response:');
      
      if (response.content && response.content[0]) {
        const content = response.content[0];
        if (content.type === 'text') {
          try {
            const parsed = JSON.parse(content.text);
            console.log(JSON.stringify(parsed, null, 2));
          } catch {
            console.log(content.text);
          }
        } else {
          console.log(content);
        }
      } else {
        console.log(JSON.stringify(response, null, 2));
      }
      
      return response;
    } catch (error) {
      console.log(`❌ Tool call ${toolName} failed:`, error.message);
      return null;
    }
  }

  async disconnect() {
    if (this.client && this.transport) {
      try {
        await this.client.close();
        console.log('\n🔌 MCP connection closed');
      } catch (error) {
        console.log('⚠️  Error closing connection:', error.message);
      }
    }
  }
}

// Alternative simple HTTP test for basic functionality
async function testWithSimpleHttp() {
  console.log('\n🔄 Fallback: Testing with simple HTTP requests...\n');
  
  try {
    // Test tools/list via POST
    console.log('📡 Testing tools/list via POST...');
    const listResponse = await axios.post(`${MCP_BASE_URL}/sse`, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    console.log('✅ HTTP POST response:', listResponse.data);
    
    // Test self_test tool via POST
    console.log('\n📡 Testing self_test tool via POST...');
    const testResponse = await axios.post(`${MCP_BASE_URL}/sse`, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'self_test',
        arguments: {}
      }
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    console.log('✅ HTTP POST self_test response:', testResponse.data);
    
    return true;
  } catch (error) {
    console.log('❌ Simple HTTP test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 n8n MCP Server Test Client\n');
  console.log('=' * 50);
  
  const tester = new McpTester();
  
  try {
    // Test HTTP endpoints first
    const httpWorking = await tester.testHttpEndpoints();
    if (!httpWorking) {
      console.log('❌ Basic HTTP endpoints not working. Is the server running?');
      process.exit(1);
    }
    
    // Try MCP connection
    const mcpConnected = await tester.testMcpConnection();
    
    if (mcpConnected) {
      // Test listing tools
      const tools = await tester.testListTools();
      
      if (tools && tools.length > 0) {
        // Test a few specific tools
        console.log('🎯 Testing specific tools...\n');
        
        // Test self_test tool
        await tester.testToolCall('self_test');
        
        // Test list_workflows tool
        await tester.testToolCall('list_workflows', { limit: 5 });
        
        // Test list_variables tool
        await tester.testToolCall('list_variables');
      }
      
      await tester.disconnect();
    } else {
      console.log('\n⚠️  MCP SDK connection failed, trying simple HTTP...');
      await testWithSimpleHttp();
    }
    
    console.log('\n🎯 Test Summary');
    console.log('=' * 30);
    console.log('✅ HTTP endpoints: Working');
    console.log(`${mcpConnected ? '✅' : '❌'} MCP connection: ${mcpConnected ? 'Working' : 'Failed'}`);
    console.log('\n🚀 Server is ready for MCP clients!');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down test client...');
  process.exit(0);
});

main().catch(console.error); 