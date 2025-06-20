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
    try {
      const { limit = 50 } = args;
      const response = await n8nApi.get('/workflows', { params: { limit } });
      return {
        success: true,
        data: response.data.data,
        count: response.data.data.length,
        total: response.data.nextCursor ? 'More available' : response.data.data.length,
        message: `Retrieved ${response.data.data.length} workflows successfully`
      };
    } catch (error) {
      console.error('Error listing workflows:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to list workflows',
        statusCode: error.response?.status || 'unknown'
      };
    }
  }

  async getWorkflow(args) {
    try {
      const { workflowId } = args;
      if (!workflowId) {
        throw new Error('workflowId is required');
      }
      
      const response = await n8nApi.get(`/workflows/${workflowId}`);
      
      if (response.data && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: `Workflow ${workflowId} retrieved successfully`
        };
      } else {
        // Handle case where response structure is different
        return {
          success: true,
          data: response.data,
          message: `Workflow ${workflowId} retrieved successfully`,
          note: 'Response structure may vary'
        };
      }
    } catch (error) {
      console.error(`Error getting workflow ${args.workflowId}:`, error.message);
      return {
        success: false,
        error: error.message,
        message: `Failed to get workflow ${args.workflowId}`,
        statusCode: error.response?.status || 'unknown'
      };
    }
  }

  async listExecutions(args = {}) {
    try {
      const { limit = 10 } = args;
      const response = await n8nApi.get('/executions', { params: { limit } });
      return {
        success: true,
        data: response.data.data,
        count: response.data.data.length,
        message: `Retrieved ${response.data.data.length} executions successfully`
      };
    } catch (error) {
      console.error('Error listing executions:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to list executions',
        statusCode: error.response?.status || 'unknown'
      };
    }
  }

  async createWorkflow(args) {
    try {
      const { name, nodes, connections = {}, settings = {} } = args;
      
      if (!name || !nodes || !Array.isArray(nodes) || nodes.length === 0) {
        throw new Error('Name and nodes array are required');
      }
      
      const workflowData = {
        name,
        nodes,
        connections,
        settings,
        active: false
      };
      
      const response = await n8nApi.post('/workflows', workflowData);
      return {
        success: true,
        data: response.data.data,
        message: `Workflow "${name}" created successfully`
      };
    } catch (error) {
      console.error(`Error creating workflow:`, error.message);
      return {
        success: false,
        error: error.message,
        message: `Failed to create workflow`,
        statusCode: error.response?.status || 'unknown'
      };
    }
  }

  async updateWorkflow(args) {
    try {
      const { workflowId, ...updates } = args;
      
      if (!workflowId) {
        throw new Error('workflowId is required');
      }
      
      // Use PUT instead of PATCH as some n8n versions don't support PATCH
      const response = await n8nApi.put(`/workflows/${workflowId}`, updates);
      return {
        success: true,
        data: response.data.data,
        message: `Workflow ${workflowId} updated successfully`
      };
    } catch (error) {
      console.error(`Error updating workflow ${args.workflowId}:`, error.message);
      return {
        success: false,
        error: error.message,
        message: `Failed to update workflow ${args.workflowId}`,
        statusCode: error.response?.status || 'unknown'
      };
    }
  }

  async activateWorkflow(args) {
    try {
      const { workflowId } = args;
      
      if (!workflowId) {
        throw new Error('workflowId is required');
      }
      
      // Use POST to /workflows/{id}/activate endpoint
      const response = await n8nApi.post(`/workflows/${workflowId}/activate`);
      return {
        success: true,
        data: response.data.data || { id: workflowId, active: true },
        message: `Workflow ${workflowId} activated successfully`
      };
    } catch (error) {
      console.error(`Error activating workflow ${args.workflowId}:`, error.message);
      // If the specific endpoint doesn't exist, try the general approach
      if (error.response?.status === 404) {
        try {
          // Get the workflow first to preserve its structure
          const getResponse = await n8nApi.get(`/workflows/${args.workflowId}`);
          const workflowData = { ...getResponse.data.data, active: true };
          const updateResponse = await n8nApi.put(`/workflows/${args.workflowId}`, workflowData);
          return {
            success: true,
            data: updateResponse.data.data,
            message: `Workflow ${args.workflowId} activated successfully (via update)`
          };
        } catch (updateError) {
          return {
            success: false,
            error: `Both activation methods failed: ${error.message} and ${updateError.message}`,
            message: `Failed to activate workflow ${args.workflowId}`,
            statusCode: error.response?.status || 'unknown'
          };
        }
      }
      return {
        success: false,
        error: error.message,
        message: `Failed to activate workflow ${args.workflowId}`,
        statusCode: error.response?.status || 'unknown'
      };
    }
  }

  async deactivateWorkflow(args) {
    try {
      const { workflowId } = args;
      
      if (!workflowId) {
        throw new Error('workflowId is required');
      }
      
      // Use POST to /workflows/{id}/deactivate endpoint
      const response = await n8nApi.post(`/workflows/${workflowId}/deactivate`);
      return {
        success: true,
        data: response.data.data || { id: workflowId, active: false },
        message: `Workflow ${workflowId} deactivated successfully`
      };
    } catch (error) {
      console.error(`Error deactivating workflow ${args.workflowId}:`, error.message);
      // If the specific endpoint doesn't exist, try the general approach
      if (error.response?.status === 404) {
        try {
          // Get the workflow first to preserve its structure
          const getResponse = await n8nApi.get(`/workflows/${args.workflowId}`);
          const workflowData = { ...getResponse.data.data, active: false };
          const updateResponse = await n8nApi.put(`/workflows/${args.workflowId}`, workflowData);
          return {
            success: true,
            data: updateResponse.data.data,
            message: `Workflow ${args.workflowId} deactivated successfully (via update)`
          };
        } catch (updateError) {
          return {
            success: false,
            error: `Both deactivation methods failed: ${error.message} and ${updateError.message}`,
            message: `Failed to deactivate workflow ${args.workflowId}`,
            statusCode: error.response?.status || 'unknown'
          };
        }
      }
      return {
        success: false,
        error: error.message,
        message: `Failed to deactivate workflow ${args.workflowId}`,
        statusCode: error.response?.status || 'unknown'
      };
    }
  }

  async listCredentials(args) {
    try {
      const { limit = 50 } = args;
      const response = await n8nApi.get('/credentials', { params: { limit } });
      return {
        success: true,
        data: response.data.data,
        count: response.data.data.length,
        message: `Retrieved ${response.data.data.length} credentials successfully`
      };
    } catch (error) {
      console.error('Error listing credentials:', error.message);
      // Credentials endpoint might not be available in all n8n versions or configurations
      if (error.response?.status === 405 || error.response?.status === 404) {
        return {
          success: false,
          error: 'Credentials API not available',
          message: 'n8n credentials endpoint is not accessible (this is normal for security reasons)',
          statusCode: error.response?.status,
          note: 'Credentials management may be restricted in your n8n instance'
        };
      }
      return {
        success: false,
        error: error.message,
        message: 'Failed to list credentials',
        statusCode: error.response?.status || 'unknown'
      };
    }
  }

  async createCredential(args) {
    try {
      const { name, type, data } = args;
      
      if (!name || !type) {
        throw new Error('Name and type are required');
      }
      
      const credentialData = { name, type, data };
      const response = await n8nApi.post('/credentials', credentialData);
      return {
        success: true,
        data: response.data.data,
        message: `Credential "${name}" created successfully`
      };
    } catch (error) {
      console.error(`Error creating credential:`, error.message);
      // Credentials endpoint might not be available in all n8n versions or configurations
      if (error.response?.status === 405 || error.response?.status === 404) {
        return {
          success: false,
          error: 'Credentials API not available',
          message: 'n8n credentials endpoint is not accessible (this is normal for security reasons)',
          statusCode: error.response?.status,
          note: 'Credentials management may be restricted in your n8n instance'
        };
      }
      return {
        success: false,
        error: error.message,
        message: `Failed to create credential`,
        statusCode: error.response?.status || 'unknown'
      };
    }
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
              },
              {
                name: 'create_workflow',
                description: 'Create a new workflow',
                inputSchema: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Name of the workflow'
                    },
                    nodes: {
                      type: 'array',
                      description: 'Array of workflow nodes'
                    },
                    connections: {
                      type: 'object',
                      description: 'Node connections configuration',
                      default: {}
                    },
                    settings: {
                      type: 'object',
                      description: 'Workflow settings',
                      default: {}
                    }
                  },
                  required: ['name', 'nodes']
                }
              },
              {
                name: 'update_workflow',
                description: 'Update an existing workflow',
                inputSchema: {
                  type: 'object',
                  properties: {
                    workflowId: {
                      type: 'string',
                      description: 'The workflow ID to update'
                    },
                    name: {
                      type: 'string',
                      description: 'New name for the workflow'
                    },
                    nodes: {
                      type: 'array',
                      description: 'Updated array of workflow nodes'
                    },
                    connections: {
                      type: 'object',
                      description: 'Updated node connections configuration'
                    },
                    settings: {
                      type: 'object',
                      description: 'Updated workflow settings'
                    }
                  },
                  required: ['workflowId']
                }
              },
              {
                name: 'activate_workflow',
                description: 'Activate a workflow by ID (toggle on)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    workflowId: {
                      type: 'string',
                      description: 'The workflow ID to activate'
                    }
                  },
                  required: ['workflowId']
                }
              },
              {
                name: 'deactivate_workflow',
                description: 'Deactivate a workflow by ID (toggle off)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    workflowId: {
                      type: 'string',
                      description: 'The workflow ID to deactivate'
                    }
                  },
                  required: ['workflowId']
                }
              },
              {
                name: 'list_credentials',
                description: 'List all credentials',
                inputSchema: {
                  type: 'object',
                  properties: {}
                }
              },
              {
                name: 'create_credential',
                description: 'Create a new credential',
                inputSchema: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Name of the credential'
                    },
                    type: {
                      type: 'string',
                      description: 'Type of the credential'
                    },
                    data: {
                      type: 'object',
                      description: 'Credential data'
                    }
                  },
                  required: ['name', 'type', 'data']
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
          case 'create_workflow':
            result = await this.createWorkflow(args);
            break;
          case 'update_workflow':
            result = await this.updateWorkflow(args);
            break;
          case 'activate_workflow':
            result = await this.activateWorkflow(args);
            break;
          case 'deactivate_workflow':
            result = await this.deactivateWorkflow(args);
            break;
          case 'list_credentials':
            result = await this.listCredentials(args);
            break;
          case 'create_credential':
            result = await this.createCredential(args);
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