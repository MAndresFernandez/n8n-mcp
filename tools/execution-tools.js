import { n8nApi, getAuthenticatedConfig } from './utils.js';

export async function listExecutions(args = {}, headers = {}, sessionId = null, clientCredentials = new Map()) {
  try {
    const { limit = 10 } = args;
    const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
    const response = await n8nApi.get('/executions', { 
      params: { limit },
      ...config
    });
    return {
      success: true,
      data: response.data.data,
      count: response.data.data.length,
      message: `Retrieved ${response.data.data.length} executions successfully`
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