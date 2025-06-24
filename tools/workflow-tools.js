import * as workflowService from '../services/workflow-service.js';

export async function listWorkflows(args = {}, headers = {}, sessionId = null, clientCredentials = new Map()) {
  try {
    const { limit = 50 } = args;
    const response = await workflowService.listWorkflows({ limit }, headers, sessionId, clientCredentials);
    return {
      success: true,
      data: response.data,
      count: response.data.length,
      total: response.nextCursor ? 'More available' : response.data.length,
      message: `Retrieved ${response.data.length} workflows successfully`
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

export async function getWorkflow(args, headers = {}, sessionId = null, clientCredentials = new Map()) {
  try {
    const { workflowId } = args;
    if (!workflowId) {
      throw new Error('workflowId is required');
    }
    
    const response = await workflowService.getWorkflow(workflowId, headers, sessionId, clientCredentials);
    return {
      success: true,
      data: response.data || response,
      message: `Workflow ${workflowId} retrieved successfully`
    };
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

export async function createWorkflow(args, headers = {}, sessionId = null, clientCredentials = new Map()) {
  try {
    const { name, nodes, connections = {}, settings = {} } = args;
    const workflowData = { name, nodes, connections, settings };
    
    const response = await workflowService.createWorkflow(workflowData, headers, sessionId, clientCredentials);
    return {
      success: true,
      data: response,
      message: `Workflow "${name}" created successfully with ID: ${response.id}`
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

export async function updateWorkflow(args, headers = {}, sessionId = null, clientCredentials = new Map()) {
  try {
    const { workflowId, ...updates } = args;
    
    const response = await workflowService.updateWorkflow(workflowId, updates, headers, sessionId, clientCredentials);
    return {
      success: true,
      data: response,
      message: `Workflow "${response.name}" (${workflowId}) updated successfully`
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

export async function activateWorkflow(args, headers = {}, sessionId = null, clientCredentials = new Map()) {
  try {
    const { workflowId } = args;
    
    const response = await workflowService.activateWorkflow(workflowId, headers, sessionId, clientCredentials);
    return {
      success: true,
      data: response.data || response,
      message: `Workflow ${workflowId} activated successfully`
    };
  } catch (error) {
    
    // For 400 errors, check if the workflow is actually active now
    if (error.response?.status === 400) {
      try {
        const getResponse = await workflowService.getWorkflow(args.workflowId, headers, sessionId, clientCredentials);
        if (getResponse.active === true) {
          return {
            success: true,
            data: getResponse,
            message: `Workflow ${args.workflowId} is now active (was already active or activation succeeded despite error)`
          };
        }
      } catch (checkError) {
        // Ignore check error, fall through to original error
      }
    }
    
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      message: `Failed to activate workflow ${args.workflowId}: ${error.response?.data?.message || error.message}`,
      statusCode: error.response?.status || 'unknown'
    };
  }
}

export async function deactivateWorkflow(args, headers = {}, sessionId = null, clientCredentials = new Map()) {
  try {
    const { workflowId } = args;
    
    const response = await workflowService.deactivateWorkflow(workflowId, headers, sessionId, clientCredentials);
    return {
      success: true,
      data: response.data || response,
      message: `Workflow ${workflowId} deactivated successfully`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `Failed to deactivate workflow ${args.workflowId}`,
      statusCode: error.response?.status || 'unknown'
    };
  }
}

export async function deleteWorkflow(workflowId, headers = {}, sessionId = null, clientCredentials = new Map()) {
  try {
    const response = await workflowService.deleteWorkflow(workflowId, headers, sessionId, clientCredentials);

    return {
      success: true,
      message: `Workflow ${workflowId} deleted successfully`,
      workflowId: workflowId
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete workflow: ${error.response?.data?.message || error.message}`,
      status: error.response?.status,
      workflowId: workflowId
    };
  }
} 