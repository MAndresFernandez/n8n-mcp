#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
import { config } from 'dotenv';

// Load environment variables
config();

const N8N_API_TOKEN = process.env.N8N_API || process.env.N8N_API_KEY;
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_URL = `${N8N_BASE_URL}/api/v1`;

// Configure axios for n8n API
const n8nApi = axios.create({
  baseURL: N8N_API_URL,
  headers: {
    'X-N8N-API-KEY': N8N_API_TOKEN,
    'Content-Type': 'application/json'
  }
});

const server = new Server(
  {
    name: 'n8n-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'self_test',
        description: 'Test the n8n MCP server connection and permissions',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'list_workflows',
        description: 'List all workflows in n8n instance',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Limit number of workflows returned (default: 50)',
              default: 50
            }
          }
        }
      }
    ]
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let result;
    
    switch (name) {
      case 'self_test':
        result = await selfTest(args);
        break;
      case 'list_workflows':
        result = await listWorkflows(args);
        break;
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error(`Tool ${name} error:`, error);
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error.message}`
    );
  }
});

// Self test function
async function selfTest(args) {
  const tests = [];
  
  // Test 1: Check environment variables
  try {
    if (!N8N_API_TOKEN) {
      throw new Error('N8N_API_TOKEN not configured');
    }
    tests.push({
      test: 'Environment Configuration',
      status: 'PASS',
      details: {
        n8n_base_url: N8N_BASE_URL,
        api_token_configured: !!N8N_API_TOKEN
      }
    });
  } catch (error) {
    tests.push({
      test: 'Environment Configuration',
      status: 'FAIL',
      error: error.message
    });
  }
  
  // Test 2: Check n8n API connectivity
  try {
    const response = await n8nApi.get('/workflows?limit=1');
    tests.push({
      test: 'n8n API Connectivity',
      status: 'PASS',
      details: {
        response_status: response.status,
        api_version: 'v1',
        accessible: true
      }
    });
  } catch (error) {
    tests.push({
      test: 'n8n API Connectivity',
      status: 'FAIL',
      error: error.response?.data?.message || error.message,
      details: {
        status_code: error.response?.status,
        url: error.config?.url
      }
    });
  }
  
  const passedTests = tests.filter(t => t.status === 'PASS').length;
  const totalTests = tests.length;
  const allPassed = passedTests === totalTests;
  
  return {
    success: allPassed,
    summary: {
      total_tests: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      overall_status: allPassed ? 'HEALTHY' : 'ISSUES_DETECTED'
    },
    tests,
    timestamp: new Date().toISOString(),
    server_info: {
      name: 'n8n-mcp-server',
      version: '1.0.0',
      n8n_url: N8N_BASE_URL
    }
  };
}

// List workflows function
async function listWorkflows(args) {
  try {
    const { limit = 50 } = args || {};
    const response = await n8nApi.get('/workflows', {
      params: { limit }
    });
    
    return {
      success: true,
      workflows: response.data.data || [],
      count: response.data.data?.length || 0,
      message: `Retrieved ${response.data.data?.length || 0} workflows`
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      message: 'Failed to list workflows'
    };
  }
}

// Error handling
server.onerror = (error) => {
  console.error('[MCP Error]', error);
};

process.on('SIGINT', async () => {
  console.error('\nShutting down MCP server...');
  process.exit(0);
});

// Start server
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 n8n MCP server running on stdio');
}

run().catch(console.error); 