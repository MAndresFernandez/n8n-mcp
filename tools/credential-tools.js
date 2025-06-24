import { n8nApi, getAuthenticatedConfig } from './utils.js';

export async function listCredentials(args, headers = {}, sessionId = null, clientCredentials = new Map()) {
  try {
    const { limit = 50 } = args;
    const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
    const response = await n8nApi.get('/credentials', { 
      params: { limit },
      ...config
    });
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

export async function createCredential(args, headers = {}, sessionId = null, clientCredentials = new Map()) {
  try {
    const { name, type, data } = args;
    
    if (!name || !type) {
      throw new Error('Name and type are required');
    }
    
    const credentialData = { name, type, data };
    const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
    const response = await n8nApi.post('/credentials', credentialData, config);
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