// Tool registry - centralized tool definitions for MCP server
export const toolRegistry = [
  {
    name: 'self_test',
    description: 'Test basic server functionality and n8n API connectivity',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'list_workflows',
    description: 'List all workflows in the n8n instance',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of workflows to return (default: 50)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_workflow',
    description: 'Get detailed information about a specific workflow by ID',
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
    description: 'List workflow executions with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of executions to return (default: 10, max: 100)'
        }
      }
    }
  },
  {
    name: 'execute_workflow',
    description: 'Execute a workflow manually with optional input data',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'The workflow ID to execute'
        },
        inputData: {
          type: 'object',
          description: 'Optional input data for the workflow execution',
          default: {}
        }
      },
      required: ['workflowId']
    }
  },
  {
    name: 'get_execution',
    description: 'Get detailed information about a specific execution by ID',
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
    name: 'create_workflow',
    description: 'Create a new workflow in n8n',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The workflow name'
        },
        nodes: {
          type: 'array',
          description: 'Array of nodes for the workflow'
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
          description: 'The workflow name'
        },
        nodes: {
          type: 'array',
          description: 'Array of nodes for the workflow'
        }
      },
      required: ['workflowId']
    }
  },
  {
    name: 'delete_workflow',
    description: 'Delete an existing workflow',
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
    description: 'Activate a workflow',
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
    description: 'Deactivate a workflow',
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
    description: 'List all credentials in the n8n instance',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of credentials to return (default: 50)'
        }
      },
      required: []
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
          description: 'The credential name'
        },
        type: {
          type: 'string',
          description: "The credential type (e.g., 'httpBasicAuth', 'telegramApi')"
        },
        data: {
          type: 'object',
          description: 'The credential data/configuration'
        }
      },
      required: ['name', 'type', 'data']
    }
  },
  {
    name: 'list_nodes',
    description: 'List all available node types that n8n currently supports',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
]; 