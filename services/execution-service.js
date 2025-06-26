import { n8nApi, getAuthenticatedConfig } from '../tools/utils.js';

/**
 * List executions from n8n API
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of executions to return
 * @param {Object} headers - Request headers
 * @param {string} sessionId - Session ID for authentication
 * @param {Map} clientCredentials - Client credentials map
 * @returns {Promise<Object>} API response
 */
export async function listExecutions({ limit = 10 } = {}, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
  const response = await n8nApi.get('/executions', { 
    params: { limit },
    ...config
  });
  return response.data;
}

/**
 * Execute a workflow in n8n API
 * 
 * IMPORTANT NOTE: The n8n public API does not have a direct workflow execution endpoint.
 * The /rest/workflows/{id}/run endpoint is an internal API that requires different authentication.
 * 
 * According to n8n documentation and team recommendations, the proper way to execute workflows
 * via API is to:
 * 1. Use webhook triggers with the Execute Workflow node
 * 2. Create custom webhook endpoints that call workflows
 * 3. Use the n8n public API for workflow management, not execution
 * 
 * This function attempts to use the internal endpoint for demonstration/testing purposes,
 * but in production, you should implement webhook-based workflow execution.
 * 
 * @param {string} workflowId - The workflow ID to execute
 * @param {Object} inputData - Input data for the workflow execution
 * @param {Object} headers - Request headers
 * @param {string} sessionId - Session ID for authentication
 * @param {Map} clientCredentials - Client credentials map
 * @returns {Promise<Object>} API response
 */
export async function executeWorkflow(workflowId, inputData = {}, headers = {}, sessionId = null, clientCredentials = new Map()) {
  if (!workflowId) {
    throw new Error('workflowId is required');
  }
  
  const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
  
  try {
    // IMPORTANT: This is an internal n8n endpoint, not part of the public API
    // It may require session-based authentication rather than API key authentication
    // For production use, implement webhook-based workflow execution instead
    const response = await n8nApi.post(`/rest/workflows/${workflowId}/run`, inputData, config);
    return response.data;
  } catch (error) {
    // Handle common authentication/authorization errors with helpful messages
    if (error.response?.status === 401) {
      const errorMessage = "Unauthorized - The /rest/workflows/{id}/run endpoint is an internal API that requires different authentication than the public API. Consider implementing webhook-based workflow execution instead.";
      const newError = new Error(errorMessage);
      newError.response = error.response;
      newError.recommendation = "Use webhook triggers with Execute Workflow nodes for API-based workflow execution";
      throw newError;
    } else if (error.response?.status === 404) {
      const errorMessage = "Workflow not found or not accessible for execution via internal API";
      const newError = new Error(errorMessage);
      newError.response = error.response;
      newError.recommendation = "Ensure the workflow exists and consider using webhook-based execution";
      throw newError;
    }
    
    // If the internal endpoint doesn't work, try the alternative execution endpoint
    if (error.response?.status === 405) {
      try {
        // Alternative endpoint for workflow execution (also likely to fail with public API)
        const response = await n8nApi.post('/executions', {
          workflowId,
          data: inputData
        }, config);
        return response.data;
      } catch (fallbackError) {
        // If both endpoints fail, throw the original error with more context
        const errorMessage = error.response?.data?.message || error.message;
        const newError = new Error(`Failed to execute workflow ${workflowId}: ${errorMessage}. For production use, implement webhook-based workflow execution as recommended by n8n.`);
        newError.response = error.response;
        newError.recommendation = "Implement webhook-based workflow execution for reliable API access";
        throw newError;
      }
    }
    throw error;
  }
}

/**
 * Get execution details from n8n API
 * @param {string} executionId - The execution ID
 * @param {Object} headers - Request headers
 * @param {string} sessionId - Session ID for authentication
 * @param {Map} clientCredentials - Client credentials map
 * @returns {Promise<Object>} API response
 */
export async function getExecution(executionId, headers = {}, sessionId = null, clientCredentials = new Map()) {
  if (!executionId) {
    throw new Error('executionId is required');
  }
  
  const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
  const response = await n8nApi.get(`/executions/${executionId}`, config);
  return response.data;
} 