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