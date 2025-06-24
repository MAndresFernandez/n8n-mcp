import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';

// Create base axios instance for n8n API
export const n8nApi = axios.create({
  baseURL: `${N8N_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Extract API key from various header formats
export function extractApiKeyFromHeaders(headers = {}) {
  // Check for N8N-specific headers first (priority)
  const n8nApiKey = headers['n8n-api-key'] || headers['N8N-API-KEY'] || headers['N8N_API_KEY'];
  if (n8nApiKey) {
    return n8nApiKey;
  }
  
  // Fallback to Bearer token authorization
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    if (bearerToken) {
      return bearerToken;
    }
  }
  
  return null;
}

// Get API key from session, headers, or environment
export function getApiKey(sessionId, headers, clientCredentials) {
  // Check stored session credentials first (priority)
  if (sessionId && clientCredentials.has(sessionId)) {
    return clientCredentials.get(sessionId);
  }
  
  // Check for API key in headers
  const headerApiKey = extractApiKeyFromHeaders(headers);
  if (headerApiKey) {
    return headerApiKey;
  }
  
  // Fall back to environment variable
  return process.env.N8N_API_KEY;
}

// Create authenticated axios config
export function getAuthenticatedConfig(headers = {}, sessionId = null, clientCredentials = new Map()) {
  const apiKey = getApiKey(sessionId, headers, clientCredentials);
  if (!apiKey) {
    throw new Error('N8N_API_KEY is required either in stored session, headers, or environment variables');
  }
  
  return {
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json'
    }
  };
}

// Validate authentication for tool calls
export function validateAuthentication(headers = {}, sessionId = null, clientCredentials = new Map()) {
  const apiKey = getApiKey(sessionId, headers, clientCredentials);
  if (!apiKey) {
    return {
      isValid: false,
      error: {
        code: -32001,
        message: 'Authentication required. Please provide N8N_API_KEY in request headers during connection or set it as environment variable.',
        data: {
          requiredHeaders: ['N8N-API-KEY', 'N8N_API_KEY', 'n8n-api-key'],
          bearerToken: 'Authorization: Bearer <your_n8n_api_key>',
          environmentVariable: 'N8N_API_KEY',
          sessionSupport: 'Store credentials during initial connection for automatic reuse'
        }
      }
    };
  }
  
  return { isValid: true };
} 