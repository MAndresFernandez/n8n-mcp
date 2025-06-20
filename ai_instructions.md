# AI Instructions for n8n Bridge

## Purpose
This is a Node.js server that bridges AI code editors with n8n automation platform. It allows AI assistants to create, manage, and execute n8n workflows programmatically.

## Server Capabilities

### Connection Management
- Tests n8n API connection on startup
- Checks and reports available permissions
- Provides health status endpoints

### Available Permissions (varies by n8n setup)
- **Workflows**: Read and write operations
- **Executions**: View execution history and results
- **Credentials**: Access to stored credentials (if permitted)
- **Users**: User management (if available)

## API Endpoints

### Status & Health
- `GET /health` - Server health check
- `GET /api/n8n/status` - n8n connection status and permissions

### Workflows
- `GET /api/workflows` - List all workflows
- `POST /api/workflows` - Create new workflow
- `POST /api/workflows/create-with-backup` - Create workflow with local backup (AI recommended)
- `GET /api/workflows/:id` - Get specific workflow
- `PUT /api/workflows/:id` - Update existing workflow
- `POST /api/workflows/:id/execute` - Execute workflow

### Executions
- `GET /api/executions` - List workflow executions

## How AI Should Use This Bridge

### 1. Check Connection First
Always verify n8n connection and permissions:
```javascript
GET /api/n8n/status
```

### 2. Check Local Instructions
Read `local_instructions.md` if it exists to understand available local tools and services.

### 3. Handle Credential Workflows
For workflows requiring credentials:
1. Create workflow with placeholder credentials
2. Provide clear credential instructions to user
3. Wait for user confirmation that credentials are added
4. Retest workflow to ensure it works with actual credentials

### 4. Workflow Creation
When creating workflows, use proper n8n node structures:
```javascript
POST /api/workflows
{
  "name": "My Workflow",
  "nodes": [...],
  "connections": {...},
  "active": false
}
```

### 5. Node Structure
Each n8n node must have:
- `name`: Unique identifier
- `type`: Node type (e.g., 'n8n-nodes-base.httpRequest')
- `parameters`: Node configuration
- `position`: [x, y] coordinates
- `typeVersion`: Node version

### 6. Common Node Types
- `n8n-nodes-base.start` - Workflow trigger
- `n8n-nodes-base.httpRequest` - HTTP requests
- `n8n-nodes-base.code` - Custom JavaScript code
- `n8n-nodes-base.set` - Set data values
- `n8n-nodes-base.if` - Conditional logic

### 7. Best Practices
- Always start with a trigger node
- Use meaningful node names
- Set `active: false` for new workflows (activate manually)
- Test workflows before making them active
- Handle errors gracefully

## AI Flow Creation Rules

### Mandatory Workflow Creation Process
1. **ALWAYS create a local file first** - Before creating any workflow in n8n, save the workflow definition as a JSON file in the `workflows/` folder
2. **File naming convention** - Use descriptive names: `workflows/workflow-name-YYYY-MM-DD.json`
3. **Review and validate** - Check the local file for correctness before API submission
4. **Version control** - Keep local files for backup, version tracking, and collaboration
5. **Documentation** - Include a comment in the JSON with the workflow purpose and creation date
6. **ALWAYS make workflows testable** - Every workflow must include a webhook trigger or other testing mechanism
7. **Handle credentials manually** - If nodes require credentials, ask user to add them manually in n8n UI, then retest
8. **ALWAYS backtest workflow steps** - Test each workflow step using nodejs webhook to ensure data flows correctly through the entire pipeline
9. **ALWAYS include mock data functionality** - Every workflow must support mock data activation when webhook is called with `?mock=1` parameter

### Local File Structure
```json
{
  "metadata": {
    "created": "2025-06-18",
    "purpose": "Description of what this workflow does",
    "version": "1.0",
    "testingMethod": "webhook" // How to test this workflow
  },
  "workflow": {
    "name": "Workflow Name",
    "nodes": [...],
    "connections": {...},
    "settings": {}
  }
}
```

### Testing Requirements

**CRITICAL**: Every workflow MUST be testable. Include at least one of these testing methods:

#### 1. Webhook Trigger (Recommended)
- **Node**: `n8n-nodes-base.webhook`
- **Method**: POST, GET, or both
- **Path**: Use descriptive paths like `/test-workflow-name`
- **Authentication**: Consider webhook security if needed

```javascript
{
  "name": "Webhook Trigger",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "test-my-workflow",
    "httpMethod": "POST",
    "responseMode": "responseNode"
  },
  "position": [240, 300],
  "typeVersion": 1
}
```

#### 2. Manual Trigger
- **Node**: `n8n-nodes-base.manualTrigger`
- **Usage**: For workflows that need manual testing
- **Good for**: Development and debugging

#### 3. Schedule Trigger (for testing)
- **Node**: `n8n-nodes-base.cron`
- **Usage**: Set to run every few minutes during testing
- **Remember**: Disable or adjust schedule after testing

#### 4. HTTP Request Node (for API testing)
- **Node**: `n8n-nodes-base.httpRequest`
- **Usage**: Create a separate "test" branch in workflow
- **Method**: Include a test endpoint that validates workflow logic

### Testing Best Practices
- **Document test URL** in workflow metadata
- **Include test data examples** in local file comments
- **Test before activation** - always verify workflow works
- **Provide clear test instructions** for other developers
- **Use meaningful webhook paths** that describe the workflow purpose
- **ALWAYS backtest each step** - Test each workflow step using nodejs webhook to ensure data flows correctly
- **ALWAYS prepare mock data** - Include mock data inside each workflow so users can trigger n8n flow when entering n8n webhook with `?mock=1` parameter

### Credential Management

**IMPORTANT**: Never include actual credentials in workflow definitions. Follow this process:

#### When Nodes Require Credentials:
1. **Create workflow without credentials** - Use placeholder or empty credential fields
2. **Document required credentials** in workflow metadata
3. **Ask user to add credentials manually** - Provide clear instructions
4. **Wait for user confirmation** - Don't proceed until user confirms credentials are added
5. **Retest the workflow** - Verify it works with actual credentials

#### Credential Instructions Template:
```
⚠️ CREDENTIALS REQUIRED

This workflow requires the following credentials to be added manually in n8n:

1. Go to n8n UI (http://localhost:5678)
2. Navigate to Settings → Credentials
3. Add the following credentials:
   - [Credential Type]: [Description]
   - [Credential Type]: [Description]

Required credentials for this workflow:
- Google Sheets API: For accessing spreadsheet data
- Slack API: For sending notifications

After adding credentials:
1. Edit the workflow in n8n UI
2. Assign credentials to the respective nodes
3. Test the workflow using: [TEST_URL]
4. Confirm workflow works properly

Please confirm when credentials are added and ready for testing.
```

#### Credential Node Examples:
```javascript
// Example node with credential placeholder
{
  "name": "Google Sheets",
  "type": "n8n-nodes-base.googleSheets",
  "parameters": {
    "operation": "read",
    "documentId": "your-sheet-id",
    "sheetName": "Sheet1"
  },
  "credentials": {
    "googleSheetsOAuth2Api": "[TO_BE_CONFIGURED]"
  },
  "position": [460, 300],
  "typeVersion": 1
}
```

#### Metadata for Credential Workflows:
```json
{
  "metadata": {
    "requiresCredentials": true,
    "credentialTypes": ["googleSheetsOAuth2Api", "slackApi"],
    "credentialInstructions": "Add Google Sheets and Slack credentials in n8n UI"
  }
}
```

## Error Handling
All API responses follow this format:
```javascript
// Success
{
  "status": "success",
  "data": {...}
}

// Error
{
  "status": "error",
  "message": "Error description"
}
```

## Environment Variables
- `N8N_API`: JWT token for n8n API authentication
- `N8N_BASE_URL`: n8n base URL (default: http://localhost:5678) - API path (/api/v1) is automatically appended
- `PORT`: Server port (default: 3000)

## Local Instructions File

### Purpose
The `local_instructions.md` file allows users to document their local tools and services for AI interaction. This file is git-ignored to prevent committing sensitive local setup information.

### Usage
- **File**: `local_instructions.md` (user creates from `local_instructions.example.md`)
- **Status**: Git-ignored for security
- **Content**: Local tools, connection details, environment variables, n8n integration notes

### For AI Assistants
1. **Always check** if `local_instructions.md` exists before creating workflows
2. **Read and understand** available local tools and their connection details
3. **Use the specified connection information** when integrating local services
4. **Respect the documented limitations** (max sessions, ports, etc.)

### Local Tools Integration
When creating workflows that use local tools:
- Reference the connection details from `local_instructions.md`
- Use the specified node types and configurations
- Include proper error handling for local service connectivity
- Test connections before deploying workflows

## Security Notes
- API token is required for all n8n operations
- All requests are authenticated through the bridge
- Permissions are checked on server startup
- Test workflows are automatically cleaned up

## Usage Examples

### Create a Simple HTTP Request Workflow (with local backup - RECOMMENDED)
```javascript
POST /api/workflows/create-with-backup
{
  "metadata": {
    "purpose": "Fetch data from external API",
    "version": "1.0",
    "author": "AI Assistant",
    "testingMethod": "webhook",
    "testUrl": "http://localhost:5678/webhook/test-api-fetch"
  },
  "workflow": {
    "name": "Simple HTTP Request",
    "nodes": [
      {
        "name": "Webhook Trigger",
        "type": "n8n-nodes-base.webhook",
        "parameters": {
          "path": "test-api-fetch",
          "httpMethod": "POST",
          "responseMode": "responseNode"
        },
        "position": [240, 300],
        "typeVersion": 1
      },
      {
        "name": "HTTP Request",
        "type": "n8n-nodes-base.httpRequest",
        "parameters": {
          "url": "https://api.example.com/data",
          "method": "GET"
        },
        "position": [460, 300],
        "typeVersion": 1
      },
      {
        "name": "Response",
        "type": "n8n-nodes-base.respond",
        "parameters": {},
        "position": [680, 300],
        "typeVersion": 1
      }
    ],
    "connections": {
      "Webhook Trigger": {
        "main": [
          [{"node": "HTTP Request", "type": "main", "index": 0}]
        ]
      },
      "HTTP Request": {
        "main": [
          [{"node": "Response", "type": "main", "index": 0}]
        ]
      }
    },
    "settings": {}
  }
}
```

This bridge enables seamless integration between AI assistants and n8n, allowing for intelligent workflow automation creation and management. 