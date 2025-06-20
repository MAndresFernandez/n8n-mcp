#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import http from 'http';
import url from 'url';

// Load environment variables
dotenv.config();

const N8N_API_KEY = process.env.N8N_API_KEY || process.env.N8N_API;
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const MCP_PORT = process.env.MCP_PORT || 3001;

// Validate environment variables
if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY is required in .env file');
  console.error('Set it as: N8N_API_KEY=your_api_key_here node mcp-sse-fixed.js');
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
    this.initialized = false;
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    process.on('SIGINT', async () => {
      console.log('\nShutting down server...');
      process.exit(0);
    });
  }

  // Tool implementations
  async selfTest() {
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

  async listWorkflows(args = {}) {
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

  async listExecutions(args = {}) {
    const { limit = 10 } = args;
    const response = await n8nApi.get('/executions', { params: { limit } });
    return {
      success: true,
      data: response.data.data,
      count: response.data.data.length
    };
  }

  // Handle JSON-RPC messages
  async handleMessage(message) {
    try {
      console.log(`📥 Received MCP request: ${message.method || 'unknown'}`);
      
      // Handle initialization
      if (message.method === 'initialize') {
        this.initialized = true;
        return {
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'n8n-mcp-server',
              version: '1.0.0'
            }
          },
          id: message.id
        };
      }
      
      // Check if initialized for other methods
      if (!this.initialized && message.method !== 'initialize') {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32002,
            message: 'Server not initialized'
          },
          id: message.id
        };
      }
      
      // Handle tools/list
      if (message.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          result: {
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
          },
          id: message.id
        };
      }
      
      // Handle tools/call
      if (message.method === 'tools/call') {
        const { name, arguments: args } = message.params;
        
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
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          },
          id: message.id
        };
      }
      
      // Handle notifications/initialized
      if (message.method === 'notifications/initialized') {
        // No response needed for notifications
        return null;
      }
      
      // Unknown method
      return {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: 'Method not found'
        },
        id: message.id
      };
      
    } catch (error) {
      console.error('Error handling message:', error);
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message
        },
        id: message.id || null
      };
    }
  }

  async run() {
    // Create HTTP server implementing Streamable HTTP transport
    const httpServer = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);
      
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Accept');
      
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      // Health check endpoint
      if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'ok', 
          message: 'n8n MCP server is running',
          timestamp: new Date().toISOString(),
          transport: 'streamable-http',
          endpoints: {
            health: `http://localhost:${MCP_PORT}/health`,
            mcp: `http://localhost:${MCP_PORT}/mcp`
          }
        }));
        return;
      }

      // MCP endpoint - implements Streamable HTTP transport
      if (parsedUrl.pathname === '/mcp') {
        if (req.method === 'POST') {
          // Handle JSON-RPC messages from client
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', async () => {
            try {
              const message = JSON.parse(body);
              
              // Check if client accepts Server-Sent Events
              const acceptHeader = req.headers.accept || '';
              const supportsSSE = acceptHeader.includes('text/event-stream');
              
              // Handle the message
              const response = await this.handleMessage(message);
              
              // Don't send response for notifications
              if (response === null) {
                res.writeHead(202, { 'Content-Type': 'text/plain' });
                res.end('Accepted');
                return;
              }
              
              if (supportsSSE) {
                // Return SSE stream for requests
                res.writeHead(200, {
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  'Connection': 'keep-alive',
                  'Access-Control-Allow-Origin': '*'
                });
                
                // Send response as SSE event
                res.write(`data: ${JSON.stringify(response)}\n\n`);
                res.end();
              } else {
                // Return JSON response
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));
              }
            } catch (error) {
              console.error('Error processing request:', error);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: {
                  code: -32700,
                  message: 'Parse error'
                },
                id: null
              }));
            }
          });
        } else if (req.method === 'GET') {
          // Handle GET request for SSE stream (optional)
          const acceptHeader = req.headers.accept || '';
          if (acceptHeader.includes('text/event-stream')) {
            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'Access-Control-Allow-Origin': '*'
            });
            
            // Keep connection alive for server-initiated messages
            const keepAlive = setInterval(() => {
              res.write(': keepalive\n\n');
            }, 30000);
            
            req.on('close', () => {
              clearInterval(keepAlive);
            });
          } else {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
          }
        } else {
          res.writeHead(405, { 'Content-Type': 'text/plain' });
          res.end('Method Not Allowed');
        }
        return;
      }

      // Default 404 response
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Not Found. Available endpoints:
- GET /health - Health check
- POST /mcp - MCP Streamable HTTP endpoint
- GET /mcp - MCP SSE stream (optional)`);
    });
    
    // Start the HTTP server
    httpServer.listen(MCP_PORT, '0.0.0.0', () => {
      console.log(`🚀 n8n MCP server running on http://0.0.0.0:${MCP_PORT}`);
      console.log(`📡 MCP endpoint: http://localhost:${MCP_PORT}/mcp`);
      console.log(`❤️  Health check: http://localhost:${MCP_PORT}/health`);
      console.log(`🔗 n8n connection: ${N8N_BASE_URL}`);
      console.log(`✨ Ready for MCP Inspector!`);
      console.log(`\n🔍 Use MCP Inspector:`);
      console.log(`   Transport: Streamable HTTP`);
      console.log(`   URL: http://localhost:${MCP_PORT}/mcp`);
      console.log(`   npx @modelcontextprotocol/inspector`);
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