# n8n MCP Server - Connection Instructions

## ✅ Server Status: UPDATED WITH MORE TOOLS ✅

The MCP server has been successfully updated and now supports **10 tools** (expanded from 4) with SSE (Server-Sent Events) support.

## 🚀 Quick Start

### 1. Start the MCP Server

```bash
# Install dependencies (if not already done)
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your n8n API key and URL

# Start the server using the standard entry point
npm start
# OR
source .env && node index.js
```

The server will start on port 3001 and display:
```
🚀 n8n MCP server running on http://0.0.0.0:3001
📡 MCP endpoint: http://localhost:3001/mcp
❤️  Health check: http://localhost:3001/health
🔗 n8n connection: http://localhost:5678
✨ Ready for MCP Inspector!
```

### 2. Test Connection with mcp-remote-client
```bash
npx -p mcp-remote mcp-remote-client http://localhost:3001/mcp
```

### 3. Health Check
```bash
curl http://localhost:3001/health
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file with:
```bash
N8N_API_KEY=your_api_key_here
N8N_BASE_URL=http://localhost:5678
MCP_PORT=3001
```

## 📋 Available Tools (10 Total)

### ✅ Core Tools (Working)
- `self_test` - **COMPREHENSIVE DIAGNOSTIC TOOL** - Tests all 10 MCP tools with sample inputs and returns detailed input/output for each test, plus success rates and automatic cleanup
- `list_workflows` - List all workflows in n8n
- `get_workflow` - Get a specific workflow by ID **[FIXED - now returns full workflow data]**
- `list_executions` - List workflow executions

### ✅ Workflow Management (Working)  
- `create_workflow` - Create a new workflow
- `update_workflow` - Update an existing workflow

### ⚠️ Workflow Toggle (May have API limitations)
- `activate_workflow` - Activate a workflow by ID (toggle on)
- `deactivate_workflow` - Deactivate a workflow by ID (toggle off)

### ⚠️ Credentials Management (May have API limitations)
- `list_credentials` - List all credentials
- `create_credential` - Create a new credential

**Note:** Some tools may return 405 errors depending on your n8n version and API configuration. The core workflow tools are fully functional.

## 🧪 Testing

### Comprehensive Self-Test (Recommended)
Run the built-in comprehensive diagnostic:
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' && \
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"self_test","arguments":{}}}'
```

### External Test Suite
Run the external test script:
```bash
node test-mcp-connection.js
```

### Test Specific Tools

#### Test List Workflows (Enhanced)
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    }
  }' && \
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "list_workflows",
      "arguments": {"limit": 3}
    }
  }'
```

## 🔍 MCP Inspector

Use the official MCP Inspector for interactive testing:

```bash
npx @modelcontextprotocol/inspector
```

**Configuration:**
- Transport: `Streamable HTTP`
- URL: `http://localhost:3001/mcp`

## 📊 Test Results

**Last Test Run:** ✅ 8/10 tools fully functional (80% success rate)

## 🧪 Comprehensive Self-Test Results

Run `self_test` to get detailed diagnostics of all tools:

| Test                | Status | Input/Output Available         |
| ------------------- | ------ | ------------------------------ |
| n8n API Connection  | ✅ PASS | ✅                              |
| list_workflows      | ✅ PASS | ✅                              |
| get_workflow        | ✅ PASS | ✅                              |
| list_executions     | ✅ PASS | ✅                              |
| create_workflow     | ✅ PASS | ✅                              |
| update_workflow     | ✅ PASS | ✅                              |
| activate_workflow   | ❌ FAIL | ✅ (shows API error)            |
| deactivate_workflow | ✅ PASS | ✅                              |
| list_credentials    | ❌ FAIL | ✅ (shows security restriction) |
| create_credential   | ✅ PASS | ✅                              |

**Self-test features:**
- 🧪 Tests all 10 tools with real sample inputs
- 📊 Returns detailed input/output for each test
- 🔍 Shows exact error messages and status codes
- 🧹 Automatically cleans up test workflows
- 📈 Provides success rate statistics

## 🐛 Troubleshooting

### Common Issues

1. **Server won't start**
   - Check if port 3001 is available: `lsof -i :3001`
   - Verify environment variables are set
   - Check n8n is running on port 5678

2. **n8n API connection fails**
   - Verify N8N_API_KEY is correct
   - Check N8N_BASE_URL is accessible
   - Test n8n API directly: `curl -H "X-N8N-API-KEY: your_key" http://localhost:5678/api/v1/workflows`

3. **405 Method Not Allowed errors**
   - Some n8n API endpoints may not support certain HTTP methods
   - Check your n8n version compatibility
   - Use alternative workflows for unsupported operations

4. **MCP client connection fails**
   - Ensure server is running: `curl http://localhost:3001/health`
   - Check MCP endpoint is accessible: `curl http://localhost:3001/mcp`

### Fixed Issues

- ❌ **mcp-http-server.js**: SSE transport error (`this.res.writeHead is not a function`)
- ✅ **mcp-sse-fixed.js**: Working properly with custom SSE implementation
- ✅ **Added 6 new tools**: create_workflow, update_workflow, activate_workflow, deactivate_workflow, list_credentials, create_credential
- ✅ **get_workflow tool**: Fixed to return complete workflow data instead of just `{success: true}`

## 🎯 What Changed

### From 4 Tools to 10 Tools:
**Before:**
- self_test
- list_workflows  
- get_workflow
- list_executions

**After (Added 6 new tools):**
- ✅ create_workflow
- ✅ update_workflow  
- ⚠️ activate_workflow (toggle on)
- ⚠️ deactivate_workflow (toggle off)
- ⚠️ list_credentials
- ⚠️ create_credential

## 📝 Notes

- The server implements the **Streamable HTTP transport** with SSE support
- MCP protocol version: `2024-11-05`
- Compatible with `mcp-remote` and `@modelcontextprotocol/inspector`
- Server supports CORS for web-based clients
- Some advanced features may require specific n8n versions or configurations 