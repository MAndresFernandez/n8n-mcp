# Quick Start Guide

Get your n8n MCP server running in 5 minutes! 🚀

## Prerequisites ✅

- ✅ Node.js 18+ installed
- ✅ n8n instance running (local or remote)
- ✅ n8n API key ready

## 1. Setup (2 minutes)

```bash
# Clone and install
git clone <your-repo-url>
cd n8n-ai-bridge
npm install

# Configure environment
cp .env.example .env
# Edit .env with your details:
# N8N_API_KEY=your-api-key-here
# N8N_BASE_URL=http://localhost:5678
```

## 2. Test Connection (1 minute)

```bash
# Test n8n connectivity
npm run health

# Run full test suite
npm test
```

Expected output:
```
✅ MCP initialization successful
✅ Found 18 tools
🎉 All tools respond correctly via MCP protocol!
```

## 3. Claude Desktop Setup (2 minutes)

Add to `~/.claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "node",
      "args": ["index.js"],
      "cwd": "/path/to/n8n-ai-bridge",
      "env": {
        "N8N_API_KEY": "your-api-key-here",
        "N8N_BASE_URL": "http://localhost:5678"
      }
    }
  }
}
```

Restart Claude Desktop.

## 4. Verify Integration

In Claude Desktop, ask:
> "Can you list my n8n workflows?"

You should see your workflows! 🎉

## Quick Commands

```bash
# Start server (HTTP mode)
npm start

# Run tests
npm test

# Health check
npm run health

# Self-test via HTTP
npm run self-test

# Test MCP protocol directly
npm run mcp-test
```

## Troubleshooting

**Connection Issues?**
```bash
# Check n8n is running
curl http://localhost:5678

# Verify API key
curl -H "X-N8N-API-KEY: your-key" http://localhost:5678/api/v1/workflows?limit=1
```

**Claude Desktop Not Working?**
- Restart Claude Desktop after config changes
- Check file path in config is absolute
- Verify environment variables are set

**License Errors?**
- Variables require n8n Pro/Enterprise (expected for Community Edition)
- Some tools may have restricted access based on n8n configuration

## Available Tools

Once connected, you can ask Claude to:

### Workflows
- "List all my workflows"
- "Show me workflow details for ID 123"
- "Create a new workflow that sends emails"
- "Activate my 'Data Sync' workflow"

### Variables (Pro/Enterprise)
- "List my environment variables"
- "Create a variable called API_KEY"
- "Update the DATABASE_URL variable"

### Executions
- "Show my recent workflow executions"
- "Get details for execution ID 456"
- "List failed executions from today"

### System
- "Test the n8n connection"
- "Check server health"

## Next Steps

- ✅ **Working?** Great! Start automating with AI
- ❌ **Issues?** Check the [full README](README.md) for detailed troubleshooting
- 🤝 **Questions?** Open an issue on GitHub

---

**Happy automating! 🤖✨** 