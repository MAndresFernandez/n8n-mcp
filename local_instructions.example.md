# Local Instructions (Example)

## About me
The purpose of this file is to allow users to instruct AI about available tools in their machine and how to connect to them.

Copy this file to `local_instructions.md` and customize it with your actual local setup.

## Local tools

### chromium
**Description**: Browserless Chromium instance for web scraping and browser automation.
- **Service**: Running via Docker Compose
- **URL**: http://localhost:5679
- **WebSocket URL**: ws://localhost:5679
- **Purpose**: Web scraping, PDF generation, screenshot capture, browser automation

**n8n Integration**:
- Use `n8n-nodes-puppeteer` node type
- Connect to WebSocket URL: `ws://localhost:5679`
- Supports headless browser operations
- Max concurrent sessions: 10

**Example Usage**:
```javascript
// In n8n Puppeteer node
{
  "browserWSEndpoint": "ws://localhost:5679",
  "args": ["--no-sandbox", "--disable-setuid-sandbox"]
}
```

### [Add your other local tools here]

#### Example Tool Template
**Description**: Brief description of the tool
- **Service**: How it's running (Docker, local install, etc.)
- **URL/Connection**: How to connect to it
- **Purpose**: What it's used for

**n8n Integration**:
- Node type to use
- Connection details
- Special configuration

## Environment Variables
Add any local environment variables that AI should know about:

```bash
# Example local environment variables
CHROMIUM_WS_URL=ws://localhost:5679
LOCAL_SERVICE_URL=http://localhost:8080
```

## Notes
- Keep this file in `.gitignore` to avoid committing sensitive local information
- Update this file when you add new local services
- Provide clear connection details for AI to use in n8n workflows 