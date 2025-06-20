#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';

// Validate environment variables
if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY is required in .env file');
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
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
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
            name: 'delete_workflow',
            description: 'Delete a workflow by ID',
            inputSchema: {
              type: 'object',
              properties: {
                workflowId: {
                  type: 'string',
                  description: 'The workflow ID to delete'
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
                  description: 'The workflow ID to activate'
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
                  description: 'The workflow ID to deactivate'
                }
              },
              required: ['workflowId']
            }
          },
          {
            name: 'list_variables',
            description: 'List all environment variables',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_variable',
            description: 'Get a specific environment variable',
            inputSchema: {
              type: 'object',
              properties: {
                key: {
                  type: 'string',
                  description: 'The variable key to retrieve'
                }
              },
              required: ['key']
            }
          },
          {
            name: 'create_variable',
            description: 'Create a new environment variable',
            inputSchema: {
              type: 'object',
              properties: {
                key: {
                  type: 'string',
                  description: 'The variable key'
                },
                value: {
                  type: 'string',
                  description: 'The variable value'
                }
              },
              required: ['key', 'value']
            }
          },
          {
            name: 'update_variable',
            description: 'Update an existing environment variable',
            inputSchema: {
              type: 'object',
              properties: {
                key: {
                  type: 'string',
                  description: 'The variable key to update'
                },
                value: {
                  type: 'string',
                  description: 'The new variable value'
                }
              },
              required: ['key', 'value']
            }
          },
          {
            name: 'delete_variable',
            description: 'Delete an environment variable',
            inputSchema: {
              type: 'object',
              properties: {
                key: {
                  type: 'string',
                  description: 'The variable key to delete'
                }
              },
              required: ['key']
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
          },
          {
            name: 'delete_credential',
            description: 'Delete a credential by ID',
            inputSchema: {
              type: 'object',
              properties: {
                credentialId: {
                  type: 'string',
                  description: 'The credential ID to delete'
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
                limit: {
                  type: 'number',
                  description: 'Limit number of executions returned (default: 10)',
                  default: 10
                },
                workflowId: {
                  type: 'string',
                  description: 'Filter by workflow ID'
                },
                status: {
                  type: 'string',
                  description: 'Filter by execution status',
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
                  description: 'The execution ID to retrieve'
                }
              },
              required: ['executionId']
            }
          },
          {
            name: 'self_test',
            description: 'Test the connection to n8n and verify permissions',
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

  async createWorkflow(args) {
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
      data: response.data.data,
      message: `Workflow "${name}" created successfully`
    };
  }

  async updateWorkflow(args) {
    const { workflowId, ...updates } = args;
    const response = await n8nApi.patch(`/workflows/${workflowId}`, updates);
    return {
      success: true,
      data: response.data.data,
      message: `Workflow ${workflowId} updated successfully`
    };
  }

  async deleteWorkflow(args) {
    const { workflowId } = args;
    await n8nApi.delete(`/workflows/${workflowId}`);
    return {
      success: true,
      message: `Workflow ${workflowId} deleted successfully`
    };
  }

  async activateWorkflow(args) {
    const { workflowId } = args;
    const response = await n8nApi.patch(`/workflows/${workflowId}`, { active: true });
    return {
      success: true,
      data: response.data.data,
      message: `Workflow ${workflowId} activated successfully`
    };
  }

  async deactivateWorkflow(args) {
    const { workflowId } = args;
    const response = await n8nApi.patch(`/workflows/${workflowId}`, { active: false });
    return {
      success: true,
      data: response.data.data,
      message: `Workflow ${workflowId} deactivated successfully`
    };
  }

  async listVariables(args) {
    const response = await n8nApi.get('/variables');
    return {
      success: true,
      data: response.data.data,
      count: response.data.data.length
    };
  }

  async getVariable(args) {
    const { key } = args;
    const response = await n8nApi.get(`/variables/${key}`);
    return {
      success: true,
      data: response.data.data
    };
  }

  async createVariable(args) {
    const { key, value } = args;
    const response = await n8nApi.post('/variables', { key, value });
    return {
      success: true,
      data: response.data.data,
      message: `Variable "${key}" created successfully`
    };
  }

  async updateVariable(args) {
    const { key, value } = args;
    const response = await n8nApi.patch(`/variables/${key}`, { value });
    return {
      success: true,
      data: response.data.data,
      message: `Variable "${key}" updated successfully`
    };
  }

  async deleteVariable(args) {
    const { key } = args;
    await n8nApi.delete(`/variables/${key}`);
    return {
      success: true,
      message: `Variable "${key}" deleted successfully`
    };
  }

  async listCredentials(args) {
    const response = await n8nApi.get('/credentials');
    return {
      success: true,
      data: response.data.data,
      count: response.data.data.length
    };
  }

  async createCredential(args) {
    const { name, type, data } = args;
    const credentialData = { name, type, data };
    const response = await n8nApi.post('/credentials', credentialData);
    return {
      success: true,
      data: response.data.data,
      message: `Credential "${name}" created successfully`
    };
  }

  async deleteCredential(args) {
    const { credentialId } = args;
    await n8nApi.delete(`/credentials/${credentialId}`);
    return {
      success: true,
      message: `Credential ${credentialId} deleted successfully`
    };
  }

  async listExecutions(args) {
    const { limit = 10, workflowId, status } = args;
    const params = { limit };
    if (workflowId) params.workflowId = workflowId;
    if (status) params.status = status;
    
    // Note: n8n API doesn't support 'offset' parameter, only 'limit' and filters
    const response = await n8nApi.get('/executions', { params });
    return {
      success: true,
      data: response.data.data,
      count: response.data.data.length,
      note: 'n8n API uses cursor-based pagination, not offset-based'
    };
  }

  async getExecution(args) {
    const { executionId } = args;
    const response = await n8nApi.get(`/executions/${executionId}`);
    return {
      success: true,
      data: response.data.data
    };
  }

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

    // Test workflow permissions
    try {
      await n8nApi.get('/workflows', { params: { limit: 1 } });
      results.tests.push({
        name: 'Workflow Read Permission',
        status: 'PASS',
        message: 'Can read workflows'
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({
        name: 'Workflow Read Permission',
        status: 'FAIL',
        message: `Cannot read workflows: ${error.message}`
      });
      results.summary.failed++;
    }
    results.summary.total++;

    // Test executions permissions
    try {
      await n8nApi.get('/executions', { params: { limit: 1 } });
      results.tests.push({
        name: 'Execution Read Permission',
        status: 'PASS',
        message: 'Can read executions'
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({
        name: 'Execution Read Permission',
        status: 'FAIL',
        message: `Cannot read executions: ${error.message}`
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('n8n MCP server running on stdio');
  }
}

const server = new N8nMcpServer();
server.run().catch(console.error); 