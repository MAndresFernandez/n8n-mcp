#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import dotenv from 'dotenv';
import http from 'http';

// Load environment variables
dotenv.config();

const N8N_API_KEY = process.env.N8N_API_KEY || process.env.N8N_API;
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const MCP_PORT = process.env.MCP_PORT || 3001;

// Validate environment variables
if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY is required in .env file');
  console.error('Set it as: N8N_API_KEY=your_api_key_here node mcp-streamable-server.js');
  process.exit(1);
}

// Create axios instance for n8n API
const n8nApi = axios.create({
  baseURL: `${N8N_BASE_URL}/api/v1`,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

class N8nMcpServer {
  constructor() {
    this.server = new Server(
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

    this.setupErrorHandling();
    this.setupToolHandlers();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      console.log('\nShutting down server...');
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'self_test',
            description: 'Test the connection to n8n and verify permissions',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'list_workflows',
            description: 'List all workflows in n8n',
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
          },
          {
            name: 'get_workflow',
            description: 'Get a specific workflow by ID',
            inputSchema: {
              type: 'object',
              properties: {
                workflowId: {
                  type: 'string',
                  description: 'The workflow ID to retrieve'
                }
              },
              required: ['workflowId']
            }
          },
          {
            name: 'list_executions',
            description: 'List workflow executions',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Limit number of executions returned (default: 10)',
                  default: 10
                }
              }
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        let result;
        
        switch (name) {
          case 'self_test':
            result = await this.selfTest(args);
            break;
          case 'list_workflows':
            result = await this.listWorkflows(args);
            break;
          case 'get_workflow':
            result = await this.getWorkflow(args);
            break;
          case 'list_executions':
            result = await this.listExecutions(args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
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
        console.error(`Error executing tool ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  // Tool implementations
  async selfTest(args) {
    const results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };

    // Test n8n connection
    try {
      await n8nApi.get('/workflows', { params: { limit: 1 } });
      results.tests.push({
        name: 'n8n API Connection',
        status: 'PASS',
        message: 'Successfully connected to n8n API'
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({
        name: 'n8n API Connection',
        status: 'FAIL',
        message: `Failed to connect to n8n API: ${error.message}`
      });
      results.summary.failed++;
    }
    results.summary.total++;

    return {
      success: true,
      data: results,
      message: `Self-test completed: ${results.summary.passed}/${results.summary.total} tests passed`
    };
  }

  async listWorkflows(args) {
    const { limit = 50 } = args;
    const response = await n8nApi.get('/workflows', { params: { limit } });
    return {
      success: true,
      data: response.data.data,
      count: response.data.data.length,
      total: response.data.nextCursor ? 'More available' : response.data.data.length
    };
  }

  async getWorkflow(args) {
    const { workflowId } = args;
    const response = await n8nApi.get(`/workflows/${workflowId}`);
    return {
      success: true,
      data: response.data.data
    };
  }

  async listExecutions(args) {
    const { limit = 10 } = args;
    const response = await n8nApi.get('/executions', { params: { limit } });
    return {
      success: true,
      data: response.data.data,
      count: response.data.data.length
    };
  }

  async run() {
    // Create HTTP server
    const httpServer = http.createServer();
    
    // Create SSE transport with proper endpoint
    const transport = new SSEServerTransport('/message', httpServer);
    
    // Connect the MCP server to the transport
    await this.server.connect(transport);
    
    // Start the HTTP server
    httpServer.listen(MCP_PORT, '0.0.0.0', () => {
      console.log(`🚀 n8n MCP server running on http://0.0.0.0:${MCP_PORT}`);
      console.log(`📡 MCP endpoint: http://localhost:${MCP_PORT}/message`);
      console.log(`🔗 n8n connection: ${N8N_BASE_URL}`);
      console.log(`✨ Ready for MCP Inspector!`);
      console.log(`\n🔍 Use MCP Inspector: npx @modelcontextprotocol/inspector http://localhost:${MCP_PORT}/message`);
    });

    // Handle server shutdown
    process.on('SIGTERM', () => {
      console.log('Shutting down server...');
      httpServer.close();
    });
  }
}

const server = new N8nMcpServer();
server.run().catch(console.error); 