# n8n MCP Server Usage

## Server Information
- MCP Server URL: http://localhost:3001/sse
- Health Check: http://localhost:3001/health
- n8n Instance: http://localhost:5678

## Starting the Server
```bash
npm start
```

## Testing the Server
```bash
# Health check
curl http://localhost:3001/health

# Full test suite
npm test

# Simple MCP test
npm run test:mcp
```

## Claude Desktop Configuration
Add this to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "n8n": {
      "url": "http://localhost:3001/sse"
    }
  }
}
```

## Available Tools
- **Workflow Management**: list_workflows, get_workflow, create_workflow, update_workflow, delete_workflow
- **Workflow Control**: activate_workflow, deactivate_workflow  
- **Variable Management**: list_variables, get_variable, create_variable, update_variable, delete_variable
- **Credential Management**: list_credentials, create_credential, delete_credential
- **Execution Management**: list_executions, get_execution
- **Diagnostics**: self_test - Test n8n connection and permissions

## Environment Variables
- `N8N_API`: Your n8n API key
- `N8N_BASE_URL`: Your n8n instance URL (default: http://localhost:5678)
- `MCP_PORT`: MCP server port (default: 3001)

## Troubleshooting
- If tests hang, make sure no other process is using port 3001
- Check that your n8n instance is running and accessible
- Verify API key has sufficient permissions for the operations you need
