// Tool dispatcher - centralized tool calling logic
import { selfTest } from './test-tools.js';
import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  deleteWorkflow
} from './workflow-tools.js';
import { listExecutions, executeWorkflow, getExecution } from './execution-tools.js';
import { listCredentials, createCredential } from './credential-tools.js';
import { listNodes } from './node-tools.js';

// Map of tool names to their corresponding functions
const toolHandlers = {
  'self_test': selfTest,
  'list_workflows': listWorkflows,
  'get_workflow': getWorkflow,
  'list_executions': listExecutions,
  'execute_workflow': executeWorkflow,
  'get_execution': getExecution,
  'create_workflow': createWorkflow,
  'update_workflow': updateWorkflow,
  'activate_workflow': activateWorkflow,
  'deactivate_workflow': deactivateWorkflow,
  'delete_workflow': (args, headers, sessionId, clientCredentials) => 
    deleteWorkflow(args.workflowId, headers, sessionId, clientCredentials),
  'list_credentials': listCredentials,
  'create_credential': createCredential,
  'list_nodes': listNodes
};

/**
 * Dispatch a tool call to the appropriate handler function
 * @param {string} toolName - Name of the tool to call
 * @param {Object} args - Arguments for the tool
 * @param {Object} headers - Request headers
 * @param {string} sessionId - Session ID for authentication
 * @param {Map} clientCredentials - Map of stored client credentials
 * @returns {Promise<Object>} Tool execution result
 */
export async function dispatchTool(toolName, args, headers, sessionId, clientCredentials) {
  const handler = toolHandlers[toolName];
  
  if (!handler) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  
  return await handler(args, headers, sessionId, clientCredentials);
} 