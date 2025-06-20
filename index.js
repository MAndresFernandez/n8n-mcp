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
        failed: 0,
        skipped: 0
      }
    };

    console.log('🧪 Starting comprehensive self-test of all MCP tools...');

    // Test 1: Basic n8n API Connection
    await this.testBasicConnection(results);

    // Test 2: list_workflows
    await this.testListWorkflows(results);

    // Test 3: get_workflow (if workflows exist)
    await this.testGetWorkflow(results);

    // Test 4: list_executions
    await this.testListExecutions(results);

    // Test 5: create_workflow
    await this.testCreateWorkflow(results);

    // Test 6: update_workflow (if create succeeded)
    await this.testUpdateWorkflow(results);

    // Test 7: activate_workflow (if workflow exists)
    await this.testActivateWorkflow(results);

    // Test 8: deactivate_workflow (if workflow exists)
    await this.testDeactivateWorkflow(results);

    // Test 9: list_credentials
    await this.testListCredentials(results);

    // Test 10: create_credential
    await this.testCreateCredential(results);

    // Test 11: delete_workflow
    await this.testDeleteWorkflow(results);

    // Test 12: list_nodes
    await this.testListNodes(results);

    // Clean up test workflows
    await this.cleanupTestWorkflows(results);

    const successRate = ((results.summary.passed / results.summary.total) * 100).toFixed(1);
    
    return {
      success: true,
      data: results,
      message: `Self-test completed: ${results.summary.passed}/${results.summary.total} tests passed (${successRate}% success rate)`
    };
  }

  async testBasicConnection(results) {
    const testName = 'n8n API Connection';
    try {
      const response = await n8nApi.get('/workflows', { params: { limit: 1 } });
      results.tests.push({
        name: testName,
        status: 'PASS',
        message: 'Successfully connected to n8n API',
        input: { endpoint: '/workflows', params: { limit: 1 } },
        output: { status: 'connected', workflowCount: response.data.data?.length || 0 }
      });
      results.summary.passed++;
    } catch (error) {
      results.tests.push({
        name: testName,
        status: 'FAIL',
        message: `Failed to connect to n8n API: ${error.message}`,
        input: { endpoint: '/workflows', params: { limit: 1 } },
        output: { error: error.message }
      });
      results.summary.failed++;
    }
    results.summary.total++;
  }

  async testListWorkflows(results) {
    const testName = 'list_workflows';
    const testInput = { limit: 3 };
    
    try {
      const result = await this.listWorkflows(testInput);
      results.tests.push({
        name: testName,
        status: result.success ? 'PASS' : 'FAIL',
        message: result.message || (result.success ? 'Successfully listed workflows' : 'Failed to list workflows'),
        input: testInput,
        output: {
          success: result.success,
          count: result.count,
          hasData: !!result.data,
          error: result.error
        }
      });
      if (result.success) results.summary.passed++;
      else results.summary.failed++;
    } catch (error) {
      results.tests.push({
        name: testName,
        status: 'FAIL',
        message: `Unexpected error: ${error.message}`,
        input: testInput,
        output: { error: error.message }
      });
      results.summary.failed++;
    }
    results.summary.total++;
  }

  async testGetWorkflow(results) {
    const testName = 'get_workflow';
    
    // First get a workflow ID to test with
    let testWorkflowId = null;
    try {
      const workflows = await this.listWorkflows({ limit: 1 });
      if (workflows.success && workflows.data && workflows.data.length > 0) {
        testWorkflowId = workflows.data[0].id;
      }
    } catch (error) {
      // Ignore error, will skip test
    }

    if (!testWorkflowId) {
      results.tests.push({
        name: testName,
        status: 'SKIP',
        message: 'No workflows available to test with',
        input: { note: 'Requires existing workflow' },
        output: { skipped: true, reason: 'No workflows found' }
      });
      results.summary.skipped++;
      results.summary.total++;
      return;
    }

    const testInput = { workflowId: testWorkflowId };
    
    try {
      const result = await this.getWorkflow(testInput);
      results.tests.push({
        name: testName,
        status: result.success ? 'PASS' : 'FAIL',
        message: result.message || (result.success ? 'Successfully retrieved workflow' : 'Failed to retrieve workflow'),
        input: testInput,
        output: {
          success: result.success,
          workflowName: result.data?.name,
          nodeCount: result.data?.nodes?.length,
          hasConnections: !!result.data?.connections,
          error: result.error
        }
      });
      if (result.success) results.summary.passed++;
      else results.summary.failed++;
    } catch (error) {
      results.tests.push({
        name: testName,
        status: 'FAIL',
        message: `Unexpected error: ${error.message}`,
        input: testInput,
        output: { error: error.message }
      });
      results.summary.failed++;
    }
    results.summary.total++;
  }

  async testListExecutions(results) {
    const testName = 'list_executions';
    const testInput = { limit: 2 };
    
    try {
      const result = await this.listExecutions(testInput);
      results.tests.push({
        name: testName,
        status: result.success ? 'PASS' : 'FAIL',
        message: result.message || (result.success ? 'Successfully listed executions' : 'Failed to list executions'),
        input: testInput,
        output: {
          success: result.success,
          count: result.count,
          hasData: !!result.data,
          error: result.error
        }
      });
      if (result.success) results.summary.passed++;
      else results.summary.failed++;
    } catch (error) {
      results.tests.push({
        name: testName,
        status: 'FAIL',
        message: `Unexpected error: ${error.message}`,
        input: testInput,
        output: { error: error.message }
      });
      results.summary.failed++;
    }
    results.summary.total++;
  }

  async testCreateWorkflow(results) {
    const testName = 'create_workflow';
    const testInput = {
      name: 'Self-Test Workflow',
      nodes: [
        {
          name: 'Manual Trigger',
          type: 'n8n-nodes-base.manualTrigger',
          parameters: {},
          position: [240, 300],
          typeVersion: 1,
          id: 'self-test-manual-trigger'
        }
      ],
      connections: {},
      settings: {}
    };
    
    try {
      const result = await this.createWorkflow(testInput);
      
      // Store workflow ID for cleanup and update test
      if (result.success && result.data?.id) {
        if (!results.testWorkflowIds) results.testWorkflowIds = [];
        results.testWorkflowIds.push(result.data.id);
      }
      
      results.tests.push({
        name: testName,
        status: result.success ? 'PASS' : 'FAIL',
        message: result.message || (result.success ? 'Successfully created workflow' : 'Failed to create workflow'),
        input: testInput,
        output: {
          success: result.success,
          workflowId: result.data?.id,
          workflowName: result.data?.name,
          nodeCount: result.data?.nodes?.length,
          error: result.error
        }
      });
      if (result.success) results.summary.passed++;
      else results.summary.failed++;
    } catch (error) {
      results.tests.push({
        name: testName,
        status: 'FAIL',
        message: `Unexpected error: ${error.message}`,
        input: testInput,
        output: { error: error.message }
      });
      results.summary.failed++;
    }
    results.summary.total++;
  }

  async testUpdateWorkflow(results) {
    const testName = 'update_workflow';
    
    // Check if we have a test workflow from create test
    const testWorkflowId = results.testWorkflowIds?.[0];
    
    if (!testWorkflowId) {
      results.tests.push({
        name: testName,
        status: 'SKIP',
        message: 'No test workflow available (create_workflow must succeed first)',
        input: { note: 'Requires successful create_workflow' },
        output: { skipped: true, reason: 'No test workflow ID available' }
      });
      results.summary.skipped++;
      results.summary.total++;
      return;
    }

    const testInput = {
      workflowId: testWorkflowId,
      name: 'Updated Self-Test Workflow',
      nodes: [
        {
          name: 'Manual Trigger',
          type: 'n8n-nodes-base.manualTrigger',
          parameters: {},
          position: [240, 300],
          typeVersion: 1,
          id: 'self-test-manual-trigger'
        },
        {
          name: 'Test Set Node',
          type: 'n8n-nodes-base.set',
          parameters: {
            values: {
              string: [{ name: 'test', value: 'self-test-value' }]
            }
          },
          position: [460, 300],
          typeVersion: 2,
          id: 'self-test-set-node'
        }
      ],
      connections: {
        'Manual Trigger': {
          main: [[{ node: 'Test Set Node', type: 'main', index: 0 }]]
        }
      }
    };
    
    try {
      const result = await this.updateWorkflow(testInput);
      results.tests.push({
        name: testName,
        status: result.success ? 'PASS' : 'FAIL',
        message: result.message || (result.success ? 'Successfully updated workflow' : 'Failed to update workflow'),
        input: testInput,
        output: {
          success: result.success,
          workflowId: result.data?.id,
          workflowName: result.data?.name,
          nodeCount: result.data?.nodes?.length,
          error: result.error
        }
      });
      if (result.success) results.summary.passed++;
      else results.summary.failed++;
    } catch (error) {
      results.tests.push({
        name: testName,
        status: 'FAIL',
        message: `Unexpected error: ${error.message}`,
        input: testInput,
        output: { error: error.message }
      });
      results.summary.failed++;
    }
    results.summary.total++;
  }

  async testActivateWorkflow(results) {
    const testName = 'activate_workflow';
    
    const testWorkflowId = results.testWorkflowIds?.[0];
    
    if (!testWorkflowId) {
      results.tests.push({
        name: testName,
        status: 'SKIP',
        message: 'No test workflow available',
        input: { note: 'Requires test workflow' },
        output: { skipped: true, reason: 'No test workflow ID available' }
      });
      results.summary.skipped++;
      results.summary.total++;
      return;
    }

    const testInput = { workflowId: testWorkflowId };
    
    try {
      const result = await this.activateWorkflow(testInput);
      results.tests.push({
        name: testName,
        status: result.success ? 'PASS' : 'FAIL',
        message: result.message || (result.success ? 'Successfully activated workflow' : 'Failed to activate workflow'),
        input: testInput,
        output: {
          success: result.success,
          workflowId: result.data?.id,
          active: result.data?.active,
          error: result.error,
          statusCode: result.statusCode
        }
      });
      if (result.success) results.summary.passed++;
      else results.summary.failed++;
    } catch (error) {
      results.tests.push({
        name: testName,
        status: 'FAIL',
        message: `Unexpected error: ${error.message}`,
        input: testInput,
        output: { error: error.message }
      });
      results.summary.failed++;
    }
    results.summary.total++;
  }

  async testDeactivateWorkflow(results) {
    const testName = 'deactivate_workflow';
    
    const testWorkflowId = results.testWorkflowIds?.[0];
    
    if (!testWorkflowId) {
      results.tests.push({
        name: testName,
        status: 'SKIP',
        message: 'No test workflow available',
        input: { note: 'Requires test workflow' },
        output: { skipped: true, reason: 'No test workflow ID available' }
      });
      results.summary.skipped++;
      results.summary.total++;
      return;
    }

    const testInput = { workflowId: testWorkflowId };
    
    try {
      const result = await this.deactivateWorkflow(testInput);
      results.tests.push({
        name: testName,
        status: result.success ? 'PASS' : 'FAIL',
        message: result.message || (result.success ? 'Successfully deactivated workflow' : 'Failed to deactivate workflow'),
        input: testInput,
        output: {
          success: result.success,
          workflowId: result.data?.id,
          active: result.data?.active,
          error: result.error,
          statusCode: result.statusCode
        }
      });
      if (result.success) results.summary.passed++;
      else results.summary.failed++;
    } catch (error) {
      results.tests.push({
        name: testName,
        status: 'FAIL',
        message: `Unexpected error: ${error.message}`,
        input: testInput,
        output: { error: error.message }
      });
      results.summary.failed++;
    }
    results.summary.total++;
  }

  async testListCredentials(results) {
    const testName = 'list_credentials';
    const testInput = { limit: 5 };
    
    try {
      const result = await this.listCredentials(testInput);
      results.tests.push({
        name: testName,
        status: result.success ? 'PASS' : 'FAIL',
        message: result.message || (result.success ? 'Successfully listed credentials' : 'Failed to list credentials'),
        input: testInput,
        output: {
          success: result.success,
          count: result.count,
          hasData: !!result.data,
          error: result.error,
          statusCode: result.statusCode,
          note: result.note
        }
      });
      if (result.success) results.summary.passed++;
      else results.summary.failed++;
    } catch (error) {
      results.tests.push({
        name: testName,
        status: 'FAIL',
        message: `Unexpected error: ${error.message}`,
        input: testInput,
        output: { error: error.message }
      });
      results.summary.failed++;
    }
    results.summary.total++;
  }

  async testCreateCredential(results) {
    const testName = 'create_credential';
    const testInput = {
      name: 'Self-Test Credential',
      type: 'httpBasicAuth',
      data: {
        user: 'test-user',
        password: 'test-password'
      }
    };
    
    try {
      const result = await this.createCredential(testInput);
      
      // Store credential ID for potential cleanup
      if (result.success && result.data?.id) {
        if (!results.testCredentialIds) results.testCredentialIds = [];
        results.testCredentialIds.push(result.data.id);
      }
      
      results.tests.push({
        name: testName,
        status: result.success ? 'PASS' : 'FAIL',
        message: result.message || (result.success ? 'Successfully created credential' : 'Failed to create credential'),
        input: testInput,
        output: {
          success: result.success,
          credentialId: result.data?.id,
          credentialName: result.data?.name,
          hasData: !!result.data,
          error: result.error,
          statusCode: result.statusCode,
          note: result.note
        }
      });
      if (result.success) results.summary.passed++;
      else results.summary.failed++;
    } catch (error) {
      results.tests.push({
        name: testName,
        status: 'FAIL',
        message: `Unexpected error: ${error.message}`,
        input: testInput,
        output: { error: error.message }
      });
      results.summary.failed++;
    }
    results.summary.total++;
  }

  async testDeleteWorkflow(results) {
    const testName = 'delete_workflow';
    
    // Create a temporary workflow just for deletion testing
    let deleteTestWorkflowId = null;
    
    try {
      // First create a workflow specifically for testing deletion
      const createInput = {
        name: 'MCP Delete Test Workflow',
        nodes: [
          {
            name: 'Manual Trigger',
            type: 'n8n-nodes-base.manualTrigger',
            parameters: {},
            position: [240, 300],
            typeVersion: 1,
            id: 'delete-test-manual-trigger'
          }
        ],
        connections: {}
      };
      
      const createResult = await this.createWorkflow(createInput);
      if (createResult.success) {
        deleteTestWorkflowId = createResult.data.id;
      }
    } catch (error) {
      // Ignore create error, will skip delete test
    }
    
    if (!deleteTestWorkflowId) {
      results.tests.push({
        name: testName,
        status: 'SKIP',
        message: 'Could not create temporary workflow for deletion test',
        input: { note: 'Requires ability to create workflow first' },
        output: { skipped: true, reason: 'Failed to create test workflow' }
      });
      results.summary.skipped++;
      results.summary.total++;
      return;
    }

    const testInput = { workflowId: deleteTestWorkflowId };
    
    try {
      const result = await this.deleteWorkflow(testInput.workflowId);
      results.tests.push({
        name: testName,
        status: result.success ? 'PASS' : 'FAIL',
        message: result.message || (result.success ? 'Successfully deleted workflow' : 'Failed to delete workflow'),
        input: testInput,
        output: {
          success: result.success,
          workflowId: result.workflowId,
          error: result.error,
          status: result.status
        }
      });
      if (result.success) results.summary.passed++;
      else results.summary.failed++;
    } catch (error) {
      results.tests.push({
        name: testName,
        status: 'FAIL',
        message: `Unexpected error: ${error.message}`,
        input: testInput,
        output: { error: error.message }
      });
      results.summary.failed++;
    }
    results.summary.total++;
  }

  async testListNodes(results) {
    const testName = 'list_nodes';
    const testInput = { note: 'No parameters required' };
    
    try {
      const result = await this.listNodes();
      results.tests.push({
        name: testName,
        status: result.success ? 'PASS' : 'FAIL',
        message: result.message || (result.success ? 'Successfully listed node types' : 'Failed to list node types'),
        input: testInput,
        output: {
          success: result.success,
          totalNodes: result.totalNodes,
          groupCount: result.nodesByGroup ? Object.keys(result.nodesByGroup).length : 0,
          topGroups: result.summary ? Object.entries(result.summary)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([group, count]) => `${group}: ${count}`) : [],
          error: result.error,
          status: result.status
        }
      });
      if (result.success) results.summary.passed++;
      else results.summary.failed++;
    } catch (error) {
      results.tests.push({
        name: testName,
        status: 'FAIL',
        message: `Unexpected error: ${error.message}`,
        input: testInput,
        output: { error: error.message }
      });
      results.summary.failed++;
    }
    results.summary.total++;
  }

  async cleanupTestWorkflows(results) {
    if (!results.testWorkflowIds || results.testWorkflowIds.length === 0) {
      return;
    }

    console.log('🧹 Cleaning up test workflows...');
    
    for (const workflowId of results.testWorkflowIds) {
      try {
        await n8nApi.delete(`/workflows/${workflowId}`);
        console.log(`✅ Deleted test workflow: ${workflowId}`);
      } catch (error) {
        console.log(`⚠️ Failed to delete test workflow ${workflowId}: ${error.message}`);
      }
    }
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
      
      // Validate nodes have required fields
      for (const node of nodes) {
        if (!node.name || !node.type || !node.id) {
          throw new Error('Each node must have name, type, and id fields');
        }
        if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
          throw new Error('Each node must have a position array with [x, y] coordinates');
        }
      }
      
      // Create workflow data (active field is read-only, don't include it)
      const workflowData = {
        name,
        nodes,
        connections,
        settings
      };
      
      const response = await n8nApi.post('/workflows', workflowData);
      return {
        success: true,
        data: response.data,
        message: `Workflow "${name}" created successfully with ID: ${response.data.id}`
      };
    } catch (error) {
      console.error(`Error creating workflow:`, error.message);
      const errorMsg = error.response?.data?.message || error.message;
      return {
        success: false,
        error: errorMsg,
        message: `Failed to create workflow: ${errorMsg}`,
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
      
      // Get the current workflow first to preserve its structure
      const currentResponse = await n8nApi.get(`/workflows/${workflowId}`);
      const currentWorkflow = currentResponse.data;
      
      // Merge updates with current workflow, excluding read-only fields
      const {
        createdAt, updatedAt, id, active, isArchived, 
        versionId, triggerCount, shared, tags, 
        staticData, meta, pinData, ...updatableFields 
      } = currentWorkflow;
      
      const workflowData = {
        ...updatableFields,
        ...updates
      };
      
      // Validate nodes if provided
      if (updates.nodes) {
        for (const node of updates.nodes) {
          if (!node.name || !node.type || !node.id) {
            throw new Error('Each node must have name, type, and id fields');
          }
          if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
            throw new Error('Each node must have a position array with [x, y] coordinates');
          }
        }
      }
      
      const response = await n8nApi.put(`/workflows/${workflowId}`, workflowData);
      return {
        success: true,
        data: response.data,
        message: `Workflow "${response.data.name}" (${workflowId}) updated successfully`
      };
    } catch (error) {
      console.error(`Error updating workflow ${args.workflowId}:`, error.message);
      const errorMsg = error.response?.data?.message || error.message;
      return {
        success: false,
        error: errorMsg,
        message: `Failed to update workflow ${args.workflowId}: ${errorMsg}`,
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
                description: 'Test all tools to verify server functionality and n8n API connectivity',
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
          case 'delete_workflow':
            result = await this.deleteWorkflow(args.workflowId);
            break;
          case 'list_nodes':
            result = await this.listNodes();
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

  // Delete workflow method
  async deleteWorkflow(workflowId) {
    try {
      if (!workflowId) {
        throw new Error('Workflow ID is required');
      }

      console.log(`[DEBUG] Deleting workflow with ID: ${workflowId}`);

      const response = await axios.delete(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}`, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      console.log(`[DEBUG] Delete workflow response:`, response.status, response.data);

      return {
        success: true,
        message: `Workflow ${workflowId} deleted successfully`,
        workflowId: workflowId
      };
    } catch (error) {
      console.error(`[ERROR] Failed to delete workflow:`, error.response?.data || error.message);
      return {
        success: false,
        error: `Failed to delete workflow: ${error.response?.data?.message || error.message}`,
        status: error.response?.status,
        workflowId: workflowId
      };
    }
  }

  // List available node types method
  async listNodes() {
    try {
      console.log(`[DEBUG] Fetching available node types from n8n`);

      const response = await axios.get(`${N8N_BASE_URL}/types/nodes.json`, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      console.log(`[DEBUG] List nodes response status:`, response.status);
      
      const nodes = response.data;
      const nodeCount = nodes.length;
      
      // Create a summary of node types
      const nodeTypes = {};
      const nodesByGroup = {};
      
      nodes.forEach(node => {
        const group = node.group?.[0] || 'unknown';
        if (!nodesByGroup[group]) {
          nodesByGroup[group] = [];
        }
        nodesByGroup[group].push({
          name: node.name,
          displayName: node.displayName,
          description: node.description,
          version: node.version,
          usableAsTool: node.usableAsTool || false
        });
        
        if (!nodeTypes[group]) {
          nodeTypes[group] = 0;
        }
        nodeTypes[group]++;
      });

      console.log(`[DEBUG] Successfully retrieved ${nodeCount} node types`);

      return {
        success: true,
        totalNodes: nodeCount,
        nodesByGroup: nodesByGroup,
        summary: nodeTypes,
        message: `Retrieved ${nodeCount} available node types grouped by category`
      };
    } catch (error) {
      console.error(`[ERROR] Failed to list node types:`, error.response?.data || error.message);
      return {
        success: false,
        error: `Failed to list node types: ${error.response?.data?.message || error.message}`,
        status: error.response?.status
      };
    }
  }
}

const server = new N8nMcpServer();
server.run().catch(console.error); 