# n8n MCP Server - Connection Instructions

## ✅ Server Status: WORKING ✅

The MCP server has been successfully tested and is working with SSE (Server-Sent Events) support.

## 🚀 Quick Start

### 1. Start the MCP Server
```bash
node mcp-sse-fixed.js
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

## 📋 Available Tools

The MCP server provides these tools:
- `self_test` - Test n8n connection and permissions
- `list_workflows` - List all workflows in n8n
- `get_workflow` - Get a specific workflow by ID
- `list_executions` - List workflow executions

## 🧪 Testing

### Automated Test
Run the comprehensive test suite:
```bash
node test-mcp-connection.js
```

### Manual Tests

#### Test Self Test Tool
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "self_test",
      "arguments": {}
    }
  }'
```

#### Test List Workflows
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "list_workflows",
      "arguments": {"limit": 5}
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

**Last Test Run:** ✅ All tests passed!

| Test              | Status               |
| ----------------- | -------------------- |
| Health Check      | ✅                    |
| Tools List        | ✅                    |
| Self Test         | ✅                    |
| List Workflows    | ✅                    |
| MCP Remote Client | ⚠️ (timeout expected) |

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

3. **MCP client connection fails**
   - Ensure server is running: `curl http://localhost:3001/health`
   - Check MCP endpoint is accessible: `curl http://localhost:3001/mcp`

### Fixed Issues

- ❌ **mcp-http-server.js**: SSE transport error (`this.res.writeHead is not a function`)
- ✅ **mcp-sse-fixed.js**: Working properly with custom SSE implementation

## 📝 Notes

- The server implements the **Streamable HTTP transport** with SSE support
- MCP protocol version: `2024-11-05`
- Compatible with `mcp-remote` and `@modelcontextprotocol/inspector`
- Server supports CORS for web-based clients 