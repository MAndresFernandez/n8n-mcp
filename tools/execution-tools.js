import * as executionService from '../services/execution-service.js';

export async function listExecutions(args = {}, headers = {}, sessionId = null, clientCredentials = new Map()) {
  try {
    const { limit = 10 } = args;
    const response = await executionService.listExecutions({ limit }, headers, sessionId, clientCredentials);
    return {
      success: true,
      data: response.data,
      count: response.data.length,
      total: response.nextCursor ? 'More available' : response.data.length,
      message: `Retrieved ${response.data.length} executions successfully`
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

export async function executeWorkflow(args, headers = {}, sessionId = null, clientCredentials = new Map()) {
  try {
    const { workflowId, inputData = {} } = args;
    
    if (!workflowId) {
      throw new Error('workflowId is required');
    }
    
    const response = await executionService.executeWorkflow(workflowId, inputData, headers, sessionId, clientCredentials);
    return {
      success: true,
      data: response,
      message: `Workflow ${workflowId} executed successfully via internal API endpoint`,
      executionId: response.id || response.executionId,
      note: 'This uses n8n\'s internal API which may not work in all environments'
    };
  } catch (error) {
    // Add helpful context for common authentication errors
    let errorMessage = error.response?.data?.message || error.message;
    let recommendation = error.recommendation || '';
    
    if (error.message.includes('Unauthorized') || error.message.includes('internal API')) {
      recommendation = 'For production use, implement webhook-based workflow execution as recommended by n8n';
    }
    
    return {
      success: false,
      error: errorMessage,
      message: `Failed to execute workflow ${args.workflowId}: ${errorMessage}`,
      statusCode: error.response?.status || 'unknown',
      recommendation: recommendation
    };
  }
}

export async function getExecution(args, headers = {}, sessionId = null, clientCredentials = new Map()) {
  try {
    const { executionId } = args;
    
    if (!executionId) {
      throw new Error('executionId is required');
    }
    
    const response = await executionService.getExecution(executionId, headers, sessionId, clientCredentials);
    return {
      success: true,
      data: response,
      message: `Execution ${executionId} retrieved successfully`
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      message: `Failed to get execution ${args.executionId}: ${error.response?.data?.message || error.message}`,
      statusCode: error.response?.status || 'unknown'
    };
  }
} 