# Services Layer Architecture

This document outlines the new services layer architecture that separates API calls from business logic in the n8n MCP server.

## Overview

All n8n API calls have been extracted from the tool files into dedicated service modules. Each service is responsible for a specific API domain and includes comprehensive unit tests to validate expected API responses.

## Structure

```
services/
├── workflow-service.js      # Workflow API operations
├── execution-service.js     # Execution API operations
├── credential-service.js    # Credential API operations
└── node-service.js         # Node type API operations

tests/
└── services/
    ├── workflow-service.test.js
    ├── execution-service.test.js
    ├── credential-service.test.js
    └── node-service.test.js
```

## Service Functions

### Workflow Service (`services/workflow-service.js`)
- `listWorkflows(options, headers, sessionId, clientCredentials)` - List workflows
- `getWorkflow(workflowId, headers, sessionId, clientCredentials)` - Get specific workflow
- `createWorkflow(workflowData, headers, sessionId, clientCredentials)` - Create new workflow
- `updateWorkflow(workflowId, updates, headers, sessionId, clientCredentials)` - Update workflow
- `activateWorkflow(workflowId, headers, sessionId, clientCredentials)` - Activate workflow
- `deactivateWorkflow(workflowId, headers, sessionId, clientCredentials)` - Deactivate workflow
- `deleteWorkflow(workflowId, headers, sessionId, clientCredentials)` - Delete workflow

### Execution Service (`services/execution-service.js`)
- `listExecutions(options, headers, sessionId, clientCredentials)` - List workflow executions

### Credential Service (`services/credential-service.js`)
- `listCredentials(options, headers, sessionId, clientCredentials)` - List credentials
- `createCredential(credentialData, headers, sessionId, clientCredentials)` - Create credential

### Node Service (`services/node-service.js`)
- `listNodeTypes(headers, sessionId, clientCredentials)` - List available node types

## Testing

Each service includes comprehensive unit tests using Jest and nock for HTTP mocking:

- **Expected API Responses**: Tests verify exact API response structures
- **Error Handling**: Tests cover various error scenarios (401, 404, 500, etc.)
- **Input Validation**: Tests verify parameter validation and required fields
- **Edge Cases**: Tests cover empty responses, large datasets, etc.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Jest Configuration

Jest is properly configured for ES modules with:
- **ES Modules Support**: Uses `--experimental-vm-modules` flag
- **Module Mapping**: Maps `.js` imports correctly  
- **Test Timeout**: 15 seconds for API calls
- **Coverage Collection**: Tracks service file coverage
- **Test Environment**: Node.js environment

## Benefits

1. **Separation of Concerns**: API logic is separated from business logic
2. **Testability**: Each API call can be tested independently
3. **Maintainability**: Changes to API interactions are centralized
4. **Documentation**: Tests serve as API response documentation
5. **Reliability**: Known expected responses ensure consistency

## Migration from Tools

The tool files now import and use the service functions instead of making direct API calls:

```javascript
// Before
const response = await n8nApi.get('/workflows', config);

// After
const response = await workflowService.listWorkflows(options, headers, sessionId, clientCredentials);
```

This maintains the same functionality while providing better structure and testability.

## Expected API Responses

The unit tests document the exact structure of n8n API responses:

### Workflow List Response
```json
{
  "data": [
    {
      "id": "1",
      "name": "Test Workflow",
      "active": true,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

### Execution List Response
```json
{
  "data": [
    {
      "id": "1",
      "workflowId": "workflow-1",
      "mode": "manual",
      "status": "success",
      "startedAt": "2023-01-01T10:00:00.000Z",
      "stoppedAt": "2023-01-01T10:01:00.000Z",
      "finished": true
    }
  ]
}
```

### Node Types Response
```json
[
  {
    "name": "n8n-nodes-base.manualTrigger",
    "displayName": "Manual Trigger",
    "description": "Manually triggers a workflow",
    "version": 1,
    "group": ["trigger"],
    "usableAsTool": false
  }
]
```

This architecture ensures reliable, well-tested API integration with the n8n platform. 