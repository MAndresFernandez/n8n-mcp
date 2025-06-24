import { n8nApi, getAuthenticatedConfig } from '../tools/utils.js';

/**
 * List workflows from n8n API
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of workflows to return
 * @param {Object} headers - Request headers
 * @param {string} sessionId - Session ID for authentication
 * @param {Map} clientCredentials - Client credentials map
 * @returns {Promise<Object>} API response
 */
export async function listWorkflows({ limit = 50 } = {}, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
  const response = await n8nApi.get('/workflows', { 
    params: { limit },
    ...config
  });
  return response.data;
}

/**
 * Get a specific workflow by ID from n8n API
 * @param {string} workflowId - The workflow ID
 * @param {Object} headers - Request headers
 * @param {string} sessionId - Session ID for authentication
 * @param {Map} clientCredentials - Client credentials map
 * @returns {Promise<Object>} API response
 */
export async function getWorkflow(workflowId, headers = {}, sessionId = null, clientCredentials = new Map()) {
  if (!workflowId) {
    throw new Error('workflowId is required');
  }
  
  const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
  const response = await n8nApi.get(`/workflows/${workflowId}`, config);
  return response.data;
}

/**
 * Create a new workflow in n8n API
 * @param {Object} workflowData - Workflow data
 * @param {string} workflowData.name - Workflow name
 * @param {Array} workflowData.nodes - Workflow nodes
 * @param {Object} workflowData.connections - Node connections
 * @param {Object} workflowData.settings - Workflow settings
 * @param {Object} headers - Request headers
 * @param {string} sessionId - Session ID for authentication
 * @param {Map} clientCredentials - Client credentials map
 * @returns {Promise<Object>} API response
 */
export async function createWorkflow(workflowData, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const { name, nodes, connections = {}, settings = {} } = workflowData;
  
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
  
  const payload = {
    name,
    nodes,
    connections,
    settings
  };
  
  const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
  const response = await n8nApi.post('/workflows', payload, config);
  return response.data;
}

/**
 * Update an existing workflow in n8n API
 * @param {string} workflowId - The workflow ID
 * @param {Object} updates - Updates to apply
 * @param {Object} headers - Request headers
 * @param {string} sessionId - Session ID for authentication
 * @param {Map} clientCredentials - Client credentials map
 * @returns {Promise<Object>} API response
 */
export async function updateWorkflow(workflowId, updates, headers = {}, sessionId = null, clientCredentials = new Map()) {
  if (!workflowId) {
    throw new Error('workflowId is required');
  }
  
  // Get the current workflow first to preserve its structure
  const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
  const currentResponse = await n8nApi.get(`/workflows/${workflowId}`, config);
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
  
  const response = await n8nApi.put(`/workflows/${workflowId}`, workflowData, config);
  return response.data;
}

/**
 * Activate a workflow in n8n API
 * @param {string} workflowId - The workflow ID
 * @param {Object} headers - Request headers
 * @param {string} sessionId - Session ID for authentication
 * @param {Map} clientCredentials - Client credentials map
 * @returns {Promise<Object>} API response
 */
export async function activateWorkflow(workflowId, headers = {}, sessionId = null, clientCredentials = new Map()) {
  if (!workflowId) {
    throw new Error('workflowId is required');
  }
  
  const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
  
  try {
    // Try the specific activate endpoint first
    const response = await n8nApi.post(`/workflows/${workflowId}/activate`, {}, config);
    return response.data;
  } catch (error) {
    
    // If the specific endpoint doesn't exist, try the general approach
    if (error.response?.status === 404) {
      const getResponse = await n8nApi.get(`/workflows/${workflowId}`, config);
      const workflowData = { ...getResponse.data.data, active: true };
      const updateResponse = await n8nApi.put(`/workflows/${workflowId}`, workflowData, config);
      return updateResponse.data;
    }
    
    // If it's a 400 error, check if the workflow is already active
    if (error.response?.status === 400) {
      try {
        const getResponse = await n8nApi.get(`/workflows/${workflowId}`, config);
        const workflow = getResponse.data;
        
        // If workflow is already active, consider it a success
        if (workflow.active === true) {
          return {
            ...workflow,
            message: 'Workflow was already active'
          };
        }
        
        // If not active, try the general update approach
        const workflowData = { ...workflow, active: true };
        const updateResponse = await n8nApi.put(`/workflows/${workflowId}`, workflowData, config);
        return updateResponse.data;
      } catch (fallbackError) {
        // If fallback also fails, throw the original error
        throw error;
      }
    }
    
    throw error;
  }
}

/**
 * Deactivate a workflow in n8n API
 * @param {string} workflowId - The workflow ID
 * @param {Object} headers - Request headers
 * @param {string} sessionId - Session ID for authentication
 * @param {Map} clientCredentials - Client credentials map
 * @returns {Promise<Object>} API response
 */
export async function deactivateWorkflow(workflowId, headers = {}, sessionId = null, clientCredentials = new Map()) {
  if (!workflowId) {
    throw new Error('workflowId is required');
  }
  
  const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
  
  try {
    // Try the specific deactivate endpoint first
    const response = await n8nApi.post(`/workflows/${workflowId}/deactivate`, {}, config);
    return response.data;
  } catch (error) {
    // If the specific endpoint doesn't exist, try the general approach
    if (error.response?.status === 404) {
      const getResponse = await n8nApi.get(`/workflows/${workflowId}`, config);
      const workflowData = { ...getResponse.data.data, active: false };
      const updateResponse = await n8nApi.put(`/workflows/${workflowId}`, workflowData, config);
      return updateResponse.data;
    }
    
    // If it's a 400 error, check if the workflow is already inactive
    if (error.response?.status === 400) {
      try {
        const getResponse = await n8nApi.get(`/workflows/${workflowId}`, config);
        const workflow = getResponse.data;
        
        // If workflow is already inactive, consider it a success
        if (workflow.active === false) {
          return {
            ...workflow,
            message: 'Workflow was already inactive'
          };
        }
        
        // If still active, try the general update approach
        const workflowData = { ...workflow, active: false };
        const updateResponse = await n8nApi.put(`/workflows/${workflowId}`, workflowData, config);
        return updateResponse.data;
      } catch (fallbackError) {
        // If fallback also fails, throw the original error
        throw error;
      }
    }
    
    throw error;
  }
}

/**
 * Delete a workflow from n8n API
 * @param {string} workflowId - The workflow ID
 * @param {Object} headers - Request headers
 * @param {string} sessionId - Session ID for authentication
 * @param {Map} clientCredentials - Client credentials map
 * @returns {Promise<Object>} API response
 */
export async function deleteWorkflow(workflowId, headers = {}, sessionId = null, clientCredentials = new Map()) {
  if (!workflowId) {
    throw new Error('Workflow ID is required');
  }

  const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
  const response = await n8nApi.delete(`/workflows/${workflowId}`, config);
  return response.data;
} 