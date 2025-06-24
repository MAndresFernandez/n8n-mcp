import axios from 'axios';
import { getAuthenticatedConfig } from '../tools/utils.js';

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';

/**
 * List available node types from n8n API
 * @param {Object} headers - Request headers
 * @param {string} sessionId - Session ID for authentication
 * @param {Map} clientCredentials - Client credentials map
 * @returns {Promise<Object>} API response
 */
export async function listNodeTypes(headers = {}, sessionId = null, clientCredentials = new Map()) {
  const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
  const response = await axios.get(`${N8N_BASE_URL}/types/nodes.json`, config);
  return response.data;
} 