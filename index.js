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
import http from 'http';
import url from 'url';
import { spawn } from 'child_process';

// Load environment variables
config();

const N8N_API_TOKEN = process.env.N8N_API || process.env.N8N_API_KEY;
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_URL = `${N8N_BASE_URL}/api/v1`;
const MCP_PORT = process.env.MCP_PORT || 3001;

// Configure axios for n8n API
const n8nApi = axios.create({
  baseURL: N8N_API_URL,
  headers: {
    'X-N8N-API-KEY': N8N_API_TOKEN,
    'Content-Type': 'application/json'
  }
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

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      console.log('\nShutting down MCP server...');
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
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
          },
          {
            name: 'get_workflow',
            description: 'Get a specific workflow by ID',
            inputSchema: {
              type: 'object',
              properties: {
                workflowId: {
                  type: 'string',
                  description: 'The workflow ID to retrieve',
                  required: true
                }
              },
              required: ['workflowId']
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
                  description: 'Name of the workflow',
                  required: true
                },
                nodes: {
                  type: 'array',
                  description: 'Array of workflow nodes',
                  required: true
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
                  description: 'The workflow ID to update',
                  required: true
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
            name: 'delete_workflow',
            description: 'Delete a workflow by ID',
            inputSchema: {
              type: 'object',
              properties: {
                workflowId: {
                  type: 'string',
                  description: 'The workflow ID to delete',
                  required: true
                }
              },
              required: ['workflowId']
            }
          },
          {
            name: 'activate_workflow',
            description: 'Activate a workflow by ID',
            inputSchema: {
              type: 'object',
              properties: {
                workflowId: {
                  type: 'string',
                  description: 'The workflow ID to activate',
                  required: true
                }
              },
              required: ['workflowId']
            }
          },
          {
            name: 'deactivate_workflow',
            description: 'Deactivate a workflow by ID',
            inputSchema: {
              type: 'object',
              properties: {
                workflowId: {
                  type: 'string',
                  description: 'The workflow ID to deactivate',
                  required: true
                }
              },
              required: ['workflowId']
            }
          },
          {
            name: 'list_variables',
            description: 'List all variables in n8n instance',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Limit number of variables returned (default: 50)',
                  default: 50
                }
              }
            }
          },
          {
            name: 'get_variable',
            description: 'Get a specific variable by key',
            inputSchema: {
              type: 'object',
              properties: {
                key: {
                  type: 'string',
                  description: 'The variable key to retrieve',
                  required: true
                }
              },
              required: ['key']
            }
          },
          {
            name: 'create_variable',
            description: 'Create a new variable',
            inputSchema: {
              type: 'object',
              properties: {
                key: {
                  type: 'string',
                  description: 'Variable key',
                  required: true
                },
                value: {
                  type: 'string',
                  description: 'Variable value',
                  required: true
                }
              },
              required: ['key', 'value']
            }
          },
          {
            name: 'update_variable',
            description: 'Update an existing variable',
            inputSchema: {
              type: 'object',
              properties: {
                key: {
                  type: 'string',
                  description: 'Variable key to update',
                  required: true
                },
                value: {
                  type: 'string',
                  description: 'New variable value',
                  required: true
                }
              },
              required: ['key', 'value']
            }
          },
          {
            name: 'delete_variable',
            description: 'Delete a variable by key',
            inputSchema: {
              type: 'object',
              properties: {
                key: {
                  type: 'string',
                  description: 'Variable key to delete',
                  required: true
                }
              },
              required: ['key']
            }
          },
          {
            name: 'list_credentials',
            description: 'List all credentials in n8n instance',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Limit number of credentials returned (default: 50)',
                  default: 50
                }
              }
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
                  description: 'Credential name',
                  required: true
                },
                type: {
                  type: 'string',
                  description: 'Credential type',
                  required: true
                },
                data: {
                  type: 'object',
                  description: 'Credential data',
                  required: true
                }
              },
              required: ['name', 'type', 'data']
            }
          },
          {
            name: 'delete_credential',
            description: 'Delete a credential by ID',
            inputSchema: {
              type: 'object',
              properties: {
                credentialId: {
                  type: 'string',
                  description: 'The credential ID to delete',
                  required: true
                }
              },
              required: ['credentialId']
            }
          },
          {
            name: 'list_executions',
            description: 'List workflow executions',
            inputSchema: {
              type: 'object',
              properties: {
                workflowId: {
                  type: 'string',
                  description: 'Filter by workflow ID'
                },
                limit: {
                  type: 'number',
                  description: 'Limit number of executions returned (default: 20)',
                  default: 20
                },
                status: {
                  type: 'string',
                  description: 'Filter by execution status (success, error, waiting, running)',
                  enum: ['success', 'error', 'waiting', 'running']
                }
              }
            }
          },
          {
            name: 'get_execution',
            description: 'Get a specific execution by ID',
            inputSchema: {
              type: 'object',
              properties: {
                executionId: {
                  type: 'string',
                  description: 'The execution ID to retrieve',
                  required: true
                }
              },
              required: ['executionId']
            }
          },
          {
            name: 'self_test',
            description: 'Test the n8n MCP server connection and permissions',
            inputSchema: {
              type: 'object',
              properties: {}
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
          case 'list_workflows':
            result = await this.listWorkflows(args);
            break;
          case 'get_workflow':
            result = await this.getWorkflow(args);
            break;
          case 'create_workflow':
            result = await this.createWorkflow(args);
            break;
          case 'update_workflow':
            result = await this.updateWorkflow(args);
            break;
          case 'delete_workflow':
            result = await this.deleteWorkflow(args);
            break;
          case 'activate_workflow':
            result = await this.activateWorkflow(args);
            break;
          case 'deactivate_workflow':
            result = await this.deactivateWorkflow(args);
            break;
          case 'list_variables':
            result = await this.listVariables(args);
            break;
          case 'get_variable':
            result = await this.getVariable(args);
            break;
          case 'create_variable':
            result = await this.createVariable(args);
            break;
          case 'update_variable':
            result = await this.updateVariable(args);
            break;
          case 'delete_variable':
            result = await this.deleteVariable(args);
            break;
          case 'list_credentials':
            result = await this.listCredentials(args);
            break;
          case 'create_credential':
            result = await this.createCredential(args);
            break;
          case 'delete_credential':
            result = await this.deleteCredential(args);
            break;
          case 'list_executions':
            result = await this.listExecutions(args);
            break;
          case 'get_execution':
            result = await this.getExecution(args);
            break;
          case 'self_test':
            result = await this.selfTest(args);
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
  }

  // Workflow Management
  async listWorkflows(args) {
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

  async getWorkflow(args) {
    try {
      const { workflowId } = args;
      const response = await n8nApi.get(`/workflows/${workflowId}`);
      
      return {
        success: true,
        workflow: response.data,
        message: `Retrieved workflow: ${response.data.name}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: `Failed to get workflow: ${args.workflowId}`
      };
    }
  }

  async createWorkflow(args) {
    try {
      const { name, nodes, connections = {}, settings = {} } = args;
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
        workflow: response.data,
        message: `Created workflow: ${name}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: `Failed to create workflow: ${args.name}`
      };
    }
  }

  async updateWorkflow(args) {
    try {
      const { workflowId, ...updateData } = args;
      const response = await n8nApi.patch(`/workflows/${workflowId}`, updateData);
      
      return {
        success: true,
        workflow: response.data,
        message: `Updated workflow: ${workflowId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: `Failed to update workflow: ${args.workflowId}`
      };
    }
  }

  async deleteWorkflow(args) {
    try {
      const { workflowId } = args;
      await n8nApi.delete(`/workflows/${workflowId}`);
      
      return {
        success: true,
        message: `Deleted workflow: ${workflowId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: `Failed to delete workflow: ${args.workflowId}`
      };
    }
  }

  async activateWorkflow(args) {
    try {
      const { workflowId } = args;
      const response = await n8nApi.patch(`/workflows/${workflowId}`, { active: true });
      
      return {
        success: true,
        workflow: response.data,
        message: `Activated workflow: ${workflowId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: `Failed to activate workflow: ${args.workflowId}`
      };
    }
  }

  async deactivateWorkflow(args) {
    try {
      const { workflowId } = args;
      const response = await n8nApi.patch(`/workflows/${workflowId}`, { active: false });
      
      return {
        success: true,
        workflow: response.data,
        message: `Deactivated workflow: ${workflowId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: `Failed to deactivate workflow: ${args.workflowId}`
      };
    }
  }

  // Variable Management
  async listVariables(args) {
    try {
      const { limit = 50 } = args || {};
      const response = await n8nApi.get('/variables', {
        params: { limit }
      });
      
      return {
        success: true,
        variables: response.data.data || [],
        count: response.data.data?.length || 0,
        message: `Retrieved ${response.data.data?.length || 0} variables`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to list variables'
      };
    }
  }

  async getVariable(args) {
    try {
      const { key } = args;
      const response = await n8nApi.get(`/variables/${key}`);
      
      return {
        success: true,
        variable: response.data,
        message: `Retrieved variable: ${key}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: `Failed to get variable: ${args.key}`
      };
    }
  }

  async createVariable(args) {
    try {
      const { key, value } = args;
      const response = await n8nApi.post('/variables', { key, value });
      
      return {
        success: true,
        variable: response.data,
        message: `Created variable: ${key}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: `Failed to create variable: ${args.key}`
      };
    }
  }

  async updateVariable(args) {
    try {
      const { key, value } = args;
      const response = await n8nApi.patch(`/variables/${key}`, { value });
      
      return {
        success: true,
        variable: response.data,
        message: `Updated variable: ${key}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: `Failed to update variable: ${args.key}`
      };
    }
  }

  async deleteVariable(args) {
    try {
      const { key } = args;
      await n8nApi.delete(`/variables/${key}`);
      
      return {
        success: true,
        message: `Deleted variable: ${key}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: `Failed to delete variable: ${args.key}`
      };
    }
  }

  // Credential Management
  async listCredentials(args) {
    try {
      const { limit = 50 } = args || {};
      const response = await n8nApi.get('/credentials', {
        params: { limit }
      });
      
      // Remove sensitive data from credentials
      const sanitizedCredentials = response.data.data?.map(cred => ({
        id: cred.id,
        name: cred.name,
        type: cred.type,
        createdAt: cred.createdAt,
        updatedAt: cred.updatedAt
      })) || [];
      
      return {
        success: true,
        credentials: sanitizedCredentials,
        count: sanitizedCredentials.length,
        message: `Retrieved ${sanitizedCredentials.length} credentials`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to list credentials'
      };
    }
  }

  async createCredential(args) {
    try {
      const { name, type, data } = args;
      const response = await n8nApi.post('/credentials', { name, type, data });
      
      return {
        success: true,
        credential: {
          id: response.data.id,
          name: response.data.name,
          type: response.data.type
        },
        message: `Created credential: ${name}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: `Failed to create credential: ${args.name}`
      };
    }
  }

  async deleteCredential(args) {
    try {
      const { credentialId } = args;
      await n8nApi.delete(`/credentials/${credentialId}`);
      
      return {
        success: true,
        message: `Deleted credential: ${credentialId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: `Failed to delete credential: ${args.credentialId}`
      };
    }
  }

  // Execution Management
  async listExecutions(args) {
    try {
      const { workflowId, limit = 20, status } = args || {};
      const params = { limit };
      
      if (workflowId) params.workflowId = workflowId;
      if (status) params.status = status;
      
      const response = await n8nApi.get('/executions', { params });
      
      return {
        success: true,
        executions: response.data.data || [],
        count: response.data.data?.length || 0,
        message: `Retrieved ${response.data.data?.length || 0} executions`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to list executions'
      };
    }
  }

  async getExecution(args) {
    try {
      const { executionId } = args;
      const response = await n8nApi.get(`/executions/${executionId}`);
      
      return {
        success: true,
        execution: response.data,
        message: `Retrieved execution: ${executionId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: `Failed to get execution: ${args.executionId}`
      };
    }
  }

  // System Management
  async handleMcpMessage(message, transport) {
    try {
      console.log('🔄 Processing MCP message:', message.method);
      
      if (message.method === 'initialize') {
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'n8n-mcp-server',
              version: '1.0.0'
            }
          }
        };
        transport.send(response);
        return;
      }
      
      if (message.method === 'tools/list') {
        const tools = [];
        for (const [name, handler] of Object.entries(this.tools)) {
          tools.push({
            name: name,
            description: handler.description,
            inputSchema: handler.inputSchema
          });
        }
        
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            tools: tools
          }
        };
        transport.send(response);
        return;
      }
      
      if (message.method === 'tools/call') {
        const { name, arguments: args } = message.params;
        
        if (!this.tools[name]) {
          transport.send({
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32601,
              message: 'Method not found',
              data: `Tool '${name}' not found`
            }
          });
          return;
        }
        
        try {
          const result = await this.tools[name].handler(args || {});
          transport.send({
            jsonrpc: '2.0',
            id: message.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                }
              ]
            }
          });
        } catch (error) {
          transport.send({
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32603,
              message: 'Internal error',
              data: error.message
            }
          });
        }
        return;
      }
      
      // Unknown method
      transport.send({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: 'Method not found',
          data: `Method '${message.method}' not implemented`
        }
      });
      
    } catch (error) {
      console.error('Error handling MCP message:', error);
      transport.send({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message
        }
      });
    }
  }

  async selfTest(args) {
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
    
    // Test 3: Check API permissions
    try {
      await n8nApi.get('/variables?limit=1');
      tests.push({
        test: 'API Permissions (Variables)',
        status: 'PASS',
        details: {
          variables_access: true
        }
      });
    } catch (error) {
      tests.push({
        test: 'API Permissions (Variables)',
        status: 'FAIL',
        error: error.response?.data?.message || error.message
      });
    }
    
    // Test 4: Check credentials access
    try {
      await n8nApi.get('/credentials?limit=1');
      tests.push({
        test: 'API Permissions (Credentials)',
        status: 'PASS',
        details: {
          credentials_access: true
        }
      });
    } catch (error) {
      tests.push({
        test: 'API Permissions (Credentials)',
        status: 'FAIL',
        error: error.response?.data?.message || error.message
      });
    }
    
    // Test 5: Check executions access
    try {
      await n8nApi.get('/executions?limit=1');
      tests.push({
        test: 'API Permissions (Executions)',
        status: 'PASS',
        details: {
          executions_access: true
        }
      });
    } catch (error) {
      tests.push({
        test: 'API Permissions (Executions)',
        status: 'FAIL',
        error: error.response?.data?.message || error.message
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

  async runStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 n8n MCP server running on stdio');
    console.error(`🔗 Connected to n8n: ${N8N_BASE_URL}`);
    console.error('📋 18 tools available: workflows, variables, credentials, executions, system');
    console.error('💡 Use with Claude Desktop or other MCP clients via stdio transport');
  }

  async runHttp() {
    console.log('🚀 Starting n8n MCP HTTP bridge server...');
    
    // Create HTTP server for health checks and MCP proxy
    const httpServer = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);
      
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
      
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
          server: {
            name: 'n8n-mcp-server',
            version: '1.0.0',
            tools_count: 18,
            n8n_url: N8N_BASE_URL,
            api_configured: !!N8N_API_TOKEN
          },
          endpoints: {
            health: `http://localhost:${MCP_PORT}/health`,
            test: `http://localhost:${MCP_PORT}/test`,
            sse: `http://localhost:${MCP_PORT}/sse`,
            info: `http://localhost:${MCP_PORT}/`
          },
          mcp_access: {
            stdio_command: `node index.js`,
            test_command: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node index.js`,
            claude_desktop_config: {
              command: "node",
              args: ["index.js"],
              cwd: process.cwd(),
              env: {
                N8N_API_KEY: "your-api-key-here",
                N8N_BASE_URL: N8N_BASE_URL
              }
            }
          }
        }));
        return;
      }

      // SSE endpoint for MCP protocol
      if (parsedUrl.pathname === '/sse') {
        // Set SSE headers
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control'
        });

        // Send initial connection message
        res.write(`data: ${JSON.stringify({
          jsonrpc: '2.0',
          method: 'notification/connected',
          params: {
            message: 'Connected to n8n MCP server via SSE',
            server: 'n8n-mcp-server',
            version: '1.0.0',
            tools: 18
          }
        })}\n\n`);

        // Create a custom transport that works with SSE
        const sseTransport = {
          start: () => Promise.resolve(),
          send: (message) => {
            try {
              const data = JSON.stringify(message);
              res.write(`data: ${data}\n\n`);
            } catch (error) {
              console.error('Error sending SSE message:', error);
            }
          },
          close: () => {
            if (!res.destroyed) {
              res.end();
            }
          }
        };

        // Handle incoming messages from the client
        let messageBuffer = '';
        req.on('data', (chunk) => {
          messageBuffer += chunk.toString();
          const lines = messageBuffer.split('\n');
          messageBuffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const message = JSON.parse(line.trim());
                console.log('📨 SSE received:', JSON.stringify(message, null, 2));
                
                // Handle MCP messages directly
                this.handleMcpMessage(message, sseTransport);
              } catch (error) {
                console.error('Error parsing SSE message:', error);
                sseTransport.send({
                  jsonrpc: '2.0',
                  id: null,
                  error: {
                    code: -32700,
                    message: 'Parse error',
                    data: error.message
                  }
                });
              }
            }
          }
        });

        req.on('end', () => {
          if (messageBuffer.trim()) {
            try {
              const message = JSON.parse(messageBuffer.trim());
              this.handleMcpMessage(message, sseTransport);
            } catch (error) {
              console.error('Error parsing final SSE message:', error);
            }
          }
        });

        req.on('close', () => {
          console.log('SSE connection closed');
        });

        req.on('error', (error) => {
          console.error('SSE request error:', error);
        });

        return;
      }

      // Test endpoint for quick MCP testing
      if (parsedUrl.pathname === '/test' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            // Simple test - run self_test
            const result = await this.selfTest({});
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'MCP server test completed',
              result: result
            }));
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: error.message
            }));
          }
        });
        return;
      }

      // Default response with usage instructions
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`n8n MCP Server

Available endpoints:
- GET /health - Health check
- POST /test - Run self-test
- GET /sse - Server-Sent Events (MCP over HTTP)

For MCP protocol access:
- SSE (HTTP Stream): http://localhost:${MCP_PORT}/sse
- stdio: node index.js
- remote: npx mcp-remote stdio node index.js

The server supports all 18 n8n tools:
- Workflow management (7 tools)
- Variable management (5 tools) 
- Credential management (3 tools)
- Execution management (2 tools)
- System management (1 tool)

Usage examples:
- Test SSE: curl -N http://localhost:${MCP_PORT}/sse
- Health check: curl http://localhost:${MCP_PORT}/health
- Run self-test: curl -X POST http://localhost:${MCP_PORT}/test
`);
    });
    
    httpServer.listen(MCP_PORT, '0.0.0.0', () => {
      console.log(`🚀 n8n MCP server running on http://0.0.0.0:${MCP_PORT}`);
      console.log(`❤️  Health check: http://localhost:${MCP_PORT}/health`);
      console.log(`🧪 Test endpoint: POST http://localhost:${MCP_PORT}/test`);
      console.log(`📡 SSE endpoint: http://localhost:${MCP_PORT}/sse`);
      console.log(`🔗 n8n connection: ${N8N_BASE_URL}`);
      console.log('');
      console.log('📡 MCP Protocol Access:');
      console.log(`   • SSE (HTTP Stream): http://localhost:${MCP_PORT}/sse`);
      console.log(`   • Direct stdio: echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node index.js`);
      console.log(`   • Test tools: npm test`);
      console.log('');
      console.log('🤖 AI Assistant Integration:');
      console.log('   • Claude Desktop (stdio): Add to ~/.claude_desktop_config.json:');
      console.log('     {');
      console.log('       "mcpServers": {');
      console.log('         "n8n": {');
      console.log('           "command": "node",');
      console.log('           "args": ["index.js"],');
      console.log(`           "cwd": "${process.cwd()}",`);
      console.log('           "env": {');
      console.log(`             "N8N_API_KEY": "${N8N_API_TOKEN ? '[CONFIGURED]' : '[SET_YOUR_API_KEY]'}",`);
      console.log(`             "N8N_BASE_URL": "${N8N_BASE_URL}"`);
      console.log('           }');
      console.log('         }');
      console.log('       }');
      console.log('     }');
      console.log('');
      console.log('   • HTTP/SSE clients: Connect to http://localhost:3001/sse');
      console.log('   • Other MCP clients: Use stdio transport with command "node index.js"');
      console.log('');
      console.log('📋 Available: 18 n8n tools (workflows, variables, credentials, executions, system)');
    });
  }

  async run() {
    // Check if we're being called directly or as stdio
    if (process.stdin.isTTY) {
      // Running in terminal - start HTTP server
      await this.runHttp();
    } else {
      // Being piped to - run as stdio MCP server
      await this.runStdio();
    }
  }
}

const server = new N8nMcpServer();
server.run().catch(console.error); 