import axios from 'axios';
import { getAuthenticatedConfig } from './utils.js';

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';

export async function listNodes(headers = {}, sessionId = null, clientCredentials = new Map()) {
  try {
    console.log(`[DEBUG] Fetching available node types from n8n`);

    const config = getAuthenticatedConfig(headers, sessionId, clientCredentials);
    const response = await axios.get(`${N8N_BASE_URL}/types/nodes.json`, config);

    console.log(`[DEBUG] List nodes response status:`, response.status);
    
    const nodes = response.data;
    const nodeCount = nodes.length;
    
    // Create a summary of node types
    const nodeTypes = {};
    const nodesByGroup = {};
    
    nodes.forEach(node => {
      const group = node.group?.[0] || 'unknown';
      if (!nodesByGroup[group]) {
        nodesByGroup[group] = [];
      }
      nodesByGroup[group].push({
        name: node.name,
        displayName: node.displayName,
        description: node.description,
        version: node.version,
        usableAsTool: node.usableAsTool || false
      });
      
      if (!nodeTypes[group]) {
        nodeTypes[group] = 0;
      }
      nodeTypes[group]++;
    });

    console.log(`[DEBUG] Successfully retrieved ${nodeCount} node types`);

    return {
      success: true,
      totalNodes: nodeCount,
      nodesByGroup: nodesByGroup,
      summary: nodeTypes,
      message: `Retrieved ${nodeCount} available node types grouped by category`
    };
  } catch (error) {
    console.error(`[ERROR] Failed to list node types:`, error.response?.data || error.message);
    return {
      success: false,
      error: `Failed to list node types: ${error.response?.data?.message || error.message}`,
      status: error.response?.status
    };
  }
} 