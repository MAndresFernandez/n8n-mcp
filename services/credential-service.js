import { n8nApi, getAuthenticatedConfig } from '../tools/utils.js';

/**
 * List credentials from n8n API
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of credentials to return
 * @param {Object} headers - Request headers
 * @param {string} sessionId - Session ID for authentication
 * @param {Map} clientCredentials - Client credentials map
 * @returns {Promise<Object>} API response
 */
export async function listCredentials({ limit = 50 } = {}, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
  const response = await n8nApi.get('/credentials', { 
    params: { limit },
    ...config
  });
  return response.data;
}

/**
 * Create a new credential in n8n API
 * @param {Object} credentialData - Credential data
 * @param {string} credentialData.name - Credential name
 * @param {string} credentialData.type - Credential type
 * @param {Object} credentialData.data - Credential data/configuration
 * @param {Object} headers - Request headers
 * @param {string} sessionId - Session ID for authentication
 * @param {Map} clientCredentials - Client credentials map
 * @returns {Promise<Object>} API response
 */
export async function createCredential(credentialData, headers = {}, sessionId = null, clientCredentials = new Map()) {
  const { name, type, data } = credentialData;
  
  if (!name || !type) {
    throw new Error('Name and type are required');
  }
  
  const payload = { name, type, data };
  const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
  const response = await n8nApi.post('/credentials', payload, config);
  return response.data;
} 