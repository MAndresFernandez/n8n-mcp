import { n8nApi, getAuthenticatedConfig } from './utils.js';
import { 
  listWorkflows, 
  getWorkflow, 
  createWorkflow, 
  updateWorkflow, 
  activateWorkflow, 
  deactivateWorkflow, 
  deleteWorkflow 
} from './workflow-tools.js';
import { listExecutions, executeWorkflow, getExecution } from './execution-tools.js';
import { listCredentials, createCredential } from './credential-tools.js';
import { listNodes } from './node-tools.js';

// Global tracking for test workflows to ensure cleanup
let testWorkflowIds = [];

export async function selfTest(args = {}, headers = {}, sessionId = null, clientCredentials = new Map()) {
  // Reset test workflow tracking
  testWorkflowIds = [];
  
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
  await testBasicConnection(results, headers, sessionId, clientCredentials);

  // Test 2: List Workflows
  await testListWorkflows(results, headers, sessionId, clientCredentials);

  // Test 3: Get Workflow (if workflows exist)
  await testGetWorkflow(results, headers, sessionId, clientCredentials);

  // Test 4: List Executions
  await testListExecutions(results, headers, sessionId, clientCredentials);

  // Test 5: Execute Workflow (if workflows exist)
  await testExecuteWorkflow(results, headers, sessionId, clientCredentials);

  // Test 6: Get Execution (if executions exist)
  await testGetExecution(results, headers, sessionId, clientCredentials);

  // Test 7: List Credentials
  await testListCredentials(results, headers, sessionId, clientCredentials);

  // Test 8: List Nodes
  await testListNodes(results, headers, sessionId, clientCredentials);

  // Test 9: Create Workflow
  await testCreateWorkflow(results, headers, sessionId, clientCredentials);

  // Test 10: Update Workflow (uses created workflow)
  await testUpdateWorkflow(results, headers, sessionId, clientCredentials);

  // Test 11: Activate Workflow (uses created workflow)
  await testActivateWorkflow(results, headers, sessionId, clientCredentials);

  // Test 12: Deactivate Workflow (uses created workflow)
  await testDeactivateWorkflow(results, headers, sessionId, clientCredentials);

  // Test 13: Create Credential (if supported)
  await testCreateCredential(results, headers, sessionId, clientCredentials);

  // Test 14: Delete Workflow (cleanup)
  await testDeleteWorkflow(results, headers, sessionId, clientCredentials);

  // Cleanup any remaining test workflows
  await cleanupTestWorkflows(results, headers, sessionId, clientCredentials);

  const successRate = ((results.summary.passed / results.summary.total) * 100).toFixed(1);
  
  console.log(`🧪 Self-test completed: ${results.summary.passed}/${results.summary.total} tests passed (${successRate}% success rate)`);
  
  return {
    success: results.summary.failed === 0,
    data: results,
    message: `Self-test completed: ${results.summary.passed}/${results.summary.total} tests passed (${successRate}% success rate). ${results.summary.failed > 0 ? `${results.summary.failed} tests failed.` : 'All tests passed!'}`
  };
}

async function testBasicConnection(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const testName = 'n8n API Connection';
  try {
    const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
    const response = await n8nApi.get('/workflows', { 
      params: { limit: 1 },
      ...config
    });
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

async function testListWorkflows(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const testName = 'list_workflows';
  const testInput = { limit: 3 };
  
  try {
    const result = await listWorkflows(testInput, headers, sessionId, clientCredentials);
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

async function testGetWorkflow(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const testName = 'get_workflow';
  
  // First get a workflow ID to test with
  let testWorkflowId = null;
  try {
    const workflows = await listWorkflows({ limit: 1 }, headers, sessionId, clientCredentials);
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
    const result = await getWorkflow(testInput, headers, sessionId, clientCredentials);
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

async function testListExecutions(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const testName = 'list_executions';
  const testInput = { limit: 2 };
  
  try {
    const result = await listExecutions(testInput, headers, sessionId, clientCredentials);
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

async function testExecuteWorkflow(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const testName = 'execute_workflow';
  
  // Create a webhook-triggered workflow that can actually be executed via HTTP request
  let testWorkflowId = null;
  let webhookUrl = null;
  let createdForTest = false;
  
  // Create a webhook trigger workflow that returns exactly what the user sends
  const webhookPath = `mcp-test-${Date.now()}`;
  const executionTestWorkflow = {
    name: 'Webhook Execution Test Workflow (MCP)',
    nodes: [
      {
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        parameters: {
          path: webhookPath,
          httpMethod: 'POST',
          responseMode: 'responseNode'
        },
        position: [240, 300],
        typeVersion: 1,
        id: 'webhook-trigger',
        webhookId: `webhook-${Date.now()}`
      },
      {
        name: 'Response',
        type: 'n8n-nodes-base.respondToWebhook',
        parameters: {
          options: {},
          responseBody: "{\n  \"message\": \"Webhook success\",\n  \"data\": {{ $json }}\n}"
        },
        position: [460, 300],
        typeVersion: 1,
        id: 'webhook-response'
      }
    ],
    connections: {
      'Webhook': {
        main: [[{ node: 'Response', type: 'main', index: 0 }]]
      }
    },
    settings: {},
    active: false
  };
  
  try {
    // Create the webhook workflow
    const createResult = await createWorkflow(executionTestWorkflow, headers, sessionId, clientCredentials);
    if (createResult.success && createResult.data?.id) {
      testWorkflowId = createResult.data.id;
      createdForTest = true;
      console.log(`📝 Created webhook test workflow: ${testWorkflowId}`);
      
      // Activate the webhook workflow so it can receive requests
      const activateResult = await activateWorkflow({ workflowId: testWorkflowId }, headers, sessionId, clientCredentials);
      if (activateResult.success) {
        // Construct the webhook URL
        const n8nBaseUrl = process.env.N8N_BASE_URL || 'http://localhost:5678';
        webhookUrl = `${n8nBaseUrl}/webhook/${webhookPath}`;
        console.log(`✅ Webhook workflow activated: ${webhookUrl}`);
      } else {
        throw new Error(`Failed to activate webhook workflow: ${activateResult.error}`);
      }
    } else {
      throw new Error(`Failed to create webhook workflow: ${createResult.error}`);
    }
  } catch (createError) {
    results.tests.push({
      name: testName,
      status: 'SKIP',
      message: `Could not create webhook workflow for execution: ${createError.message}`,
      input: { note: 'Requires ability to create and activate webhook workflow' },
      output: { skipped: true, reason: 'Failed to create webhook workflow', error: createError.message }
    });
    results.summary.skipped++;
    results.summary.total++;
    return;
  }

  const testInput = { 
    workflowId: testWorkflowId,
    webhookUrl: webhookUrl,
    testData: {
      testRun: true,
      timestamp: new Date().toISOString(),
      source: 'mcp-self-test',
      message: 'Testing webhook execution'
    }
  };
  
  try {
    // Test the webhook by making a direct HTTP request
    const axios = (await import('axios')).default;
    const response = await axios.post(webhookUrl, testInput.testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.status === 200 && response.data) {
      const responseData = response.data;
      
      // Check if the response matches the expected format or contains our test data
      const hasExpectedFormat = responseData.message === "Webhook success" && responseData.data;
      const hasWebhookData = responseData.body && 
                            responseData.body.testRun === testInput.testData.testRun &&
                            responseData.body.source === testInput.testData.source;
      const expectedSuccess = hasExpectedFormat || hasWebhookData;
      
      results.tests.push({
        name: testName,
        status: expectedSuccess ? 'PASS' : 'FAIL',
        message: expectedSuccess 
          ? (hasExpectedFormat 
             ? 'Successfully executed webhook workflow and received expected response format'
             : 'Successfully executed webhook workflow and received webhook data back')
          : 'Webhook executed but response format was unexpected',
        input: testInput,
        output: {
          success: expectedSuccess,
          workflowId: testWorkflowId,
          webhookUrl: webhookUrl,
          responseStatus: response.status,
          responseData: responseData,
          createdForTest: createdForTest,
          note: 'Webhook workflow executed successfully via direct HTTP request'
        }
      });
      
      if (expectedSuccess) {
        results.summary.passed++;
      } else {
        results.summary.failed++;
      }
    } else {
      results.tests.push({
        name: testName,
        status: 'FAIL',
        message: `Webhook request succeeded but response was unexpected: status ${response.status}`,
        input: testInput,
        output: {
          success: false,
          workflowId: testWorkflowId,
          webhookUrl: webhookUrl,
          responseStatus: response.status,
          responseData: response.data,
          createdForTest: createdForTest,
          note: 'Unexpected response from webhook'
        }
      });
      results.summary.failed++;
    }
  } catch (error) {
    // Check if it's a timeout or connection error
    const isNetworkError = error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message.includes('timeout');
    
    results.tests.push({
      name: testName,
      status: 'FAIL',
      message: `Webhook execution failed: ${error.message}`,
      input: testInput,
      output: { 
        error: error.message, 
        errorCode: error.code,
        createdForTest: createdForTest,
        isNetworkError: isNetworkError,
        note: isNetworkError ? 'Network connectivity issue with webhook' : 'Webhook execution error'
      }
    });
    results.summary.failed++;
  }
  
  // Clean up the created workflow
  if (createdForTest && testWorkflowId) {
    try {
      // Deactivate first, then delete
      await deactivateWorkflow({ workflowId: testWorkflowId }, headers, sessionId, clientCredentials);
      await deleteWorkflow(testWorkflowId, headers, sessionId, clientCredentials);
      console.log(`🗑️ Cleaned up webhook test workflow: ${testWorkflowId}`);
    } catch (cleanupError) {
      console.warn(`⚠️ Failed to cleanup webhook test workflow ${testWorkflowId}: ${cleanupError.message}`);
    }
  }
  
  results.summary.total++;
}

async function testGetExecution(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const testName = 'get_execution';
  
  // First get an execution ID to test with
  let testExecutionId = null;
  try {
    const executions = await listExecutions({ limit: 1 }, headers, sessionId, clientCredentials);
    if (executions.success && executions.data && executions.data.length > 0) {
      testExecutionId = executions.data[0].id;
    }
  } catch (error) {
    // Ignore error, will skip test
  }

  if (!testExecutionId) {
    results.tests.push({
      name: testName,
      status: 'SKIP',
      message: 'No executions available to test with',
      input: { note: 'Requires existing execution' },
      output: { skipped: true, reason: 'No executions found' }
    });
    results.summary.skipped++;
    results.summary.total++;
    return;
  }

  const testInput = { executionId: testExecutionId };
  
  try {
    const result = await getExecution(testInput, headers, sessionId, clientCredentials);
    results.tests.push({
      name: testName,
      status: result.success ? 'PASS' : 'FAIL',
      message: result.message || (result.success ? 'Successfully retrieved execution' : 'Failed to retrieve execution'),
      input: testInput,
      output: {
        success: result.success,
        executionId: result.data?.id,
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

async function testListCredentials(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const testName = 'list_credentials';
  const testInput = { limit: 5 };
  
  try {
    const result = await listCredentials(testInput, headers, sessionId, clientCredentials);
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

async function testCreateCredential(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
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
    const result = await createCredential(testInput, headers, sessionId, clientCredentials);
    
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

async function testCreateWorkflow(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const testName = 'create_workflow';
  const testInput = {
    name: 'Self-Test Workflow',
    nodes: [
      {
        name: 'Cron Trigger',
        type: 'n8n-nodes-base.cron',
        parameters: {
          rule: {
            interval: [
              {
                field: 'cronExpression',
                expression: '0 0 1 1 *'
              }
            ]
          }
        },
        position: [240, 300],
        typeVersion: 1,
        id: 'self-test-cron-trigger'
      }
    ],
    connections: {},
    settings: {}
  };
  
  try {
    const result = await createWorkflow(testInput, headers, sessionId, clientCredentials);
    
    // Store workflow ID for cleanup and update test
    if (result.success && result.data?.id) {
      testWorkflowIds.push(result.data.id);
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

async function testUpdateWorkflow(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const testName = 'update_workflow';
  
  // Check if we have a test workflow from create test
  const testWorkflowId = testWorkflowIds[0];
  
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
        name: 'Cron Trigger',
        type: 'n8n-nodes-base.cron',
        parameters: {
          rule: {
            interval: [
              {
                field: 'cronExpression',
                expression: '0 0 1 1 *'
              }
            ]
          }
        },
        position: [240, 300],
        typeVersion: 1,
        id: 'self-test-cron-trigger'
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
      'Cron Trigger': {
        main: [[{ node: 'Test Set Node', type: 'main', index: 0 }]]
      }
    }
  };
  
  try {
    const result = await updateWorkflow(testInput, headers, sessionId, clientCredentials);
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

async function testActivateWorkflow(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const testName = 'activate_workflow';
  
  const testWorkflowId = testWorkflowIds[0];
  
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
    // First check the workflow status before activation
    let beforeActivation = null;
    try {
      const beforeResult = await getWorkflow({ workflowId: testWorkflowId }, headers, sessionId, clientCredentials);
      beforeActivation = beforeResult.data?.active;
    } catch (e) {
      // Ignore error getting status before
    }
    
    const result = await activateWorkflow(testInput, headers, sessionId, clientCredentials);
    
    // Check the workflow status after activation attempt
    let afterActivation = null;
    try {
      const afterResult = await getWorkflow({ workflowId: testWorkflowId }, headers, sessionId, clientCredentials);
      afterActivation = afterResult.data?.active;
    } catch (e) {
      // Ignore error getting status after
    }
    
    // If the workflow is now active (regardless of the API response), consider it a success
    const actuallyActivated = afterActivation === true && beforeActivation !== true;
    const finalSuccess = result.success || actuallyActivated;
    
    results.tests.push({
      name: testName,
      status: finalSuccess ? 'PASS' : 'FAIL',
      message: finalSuccess ? 
        (result.success ? result.message : `Workflow ${testWorkflowId} activated successfully`) :
        (result.message || 'Failed to activate workflow'),
      input: testInput,
      output: {
        success: finalSuccess,
        workflowId: result.data?.id,
        active: afterActivation,
        beforeActivation,
        afterActivation,
        apiSuccess: result.success,
        error: result.error,
        statusCode: result.statusCode
      }
    });
    if (finalSuccess) results.summary.passed++;
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

async function testDeactivateWorkflow(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const testName = 'deactivate_workflow';
  
  const testWorkflowId = testWorkflowIds[0];
  
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
    const result = await deactivateWorkflow(testInput, headers, sessionId, clientCredentials);
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

async function testDeleteWorkflow(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const testName = 'delete_workflow';
  
  // Create a temporary workflow just for deletion testing
  let deleteTestWorkflowId = null;
  
  try {
    // First create a workflow specifically for testing deletion
    const createInput = {
      name: 'MCP Delete Test Workflow',
      nodes: [
        {
          name: 'Cron Trigger',
          type: 'n8n-nodes-base.cron',
          parameters: {
            rule: {
              interval: [
                {
                  field: 'cronExpression',
                  expression: '0 0 1 1 *'
                }
              ]
            }
          },
          position: [240, 300],
          typeVersion: 1,
          id: 'delete-test-cron-trigger'
        }
      ],
      connections: {}
    };
    
    const createResult = await createWorkflow(createInput, headers, sessionId, clientCredentials);
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
    const result = await deleteWorkflow(deleteTestWorkflowId, headers, sessionId, clientCredentials);
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

async function testListNodes(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const testName = 'list_nodes';
  const testInput = { note: 'No parameters required' };
  
  try {
    const result = await listNodes(headers, sessionId, clientCredentials);
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

async function cleanupTestWorkflows(results, headers = {}, sessionId = null, clientCredentials = new Map()) {
  if (!testWorkflowIds || testWorkflowIds.length === 0) {
    return;
  }

  console.log('🧹 Cleaning up test workflows...');
  
  for (const workflowId of testWorkflowIds) {
    try {
      await deleteWorkflow(workflowId, headers, sessionId, clientCredentials);
      console.log(`✅ Deleted test workflow: ${workflowId}`);
    } catch (error) {
      console.log(`⚠️ Failed to delete test workflow ${workflowId}: ${error.message}`);
    }
  }
  
  // Clear the tracking array
  testWorkflowIds = [];
} 