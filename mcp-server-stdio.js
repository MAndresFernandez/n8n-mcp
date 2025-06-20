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
      console.error('\nShutting down MCP server...');
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 n8n MCP server running on stdio');
  }
}

const server = new N8nMcpServer();
server.run().catch(console.error); 