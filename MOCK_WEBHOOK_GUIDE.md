# n8n Mock Webhook Functionality Guide

## Overview

The mock webhook functionality allows you to test webhook flows with predefined mock data instead of requiring real data. When you add `?mock=1` to any webhook URL, it will return mock data including a sample image from Picsum.

## Features

✅ **Mock Parameter Detection**: Automatically detects `?mock=1` query parameter  
✅ **Mock Image Fetching**: Downloads sample image from `https://picsum.photos/seed/picsum/200/300`  
✅ **Consistent Response Format**: Returns the same format as regular webhook responses  
✅ **Flow Testing**: Perfect for testing downstream workflow steps without real data  

## Workflow Structure

The mock webhook workflow includes:

1. **Webhook Trigger**: Receives GET requests with optional `?mock=1` parameter
2. **Mock Parameter Check**: IF condition that checks for `mock=1`
3. **Mock Path**: Fetches image from Picsum API and prepares mock response
4. **Regular Path**: Processes normal webhook data
5. **Response**: Returns appropriate JSON response

## Usage Examples

### Regular Webhook Call
```bash
curl "http://localhost:5678/webhook/test-mock-2025-06-18-2025-06-18-19-42-30"
```

**Response:**
```json
{
  "message": "received",
  "files": [],
  "received_body": {
    "query": {},
    "headers": {},
    "timestamp": "2025-06-18T19:45:00.000Z",
    "source": "regular_webhook",
    "description": "This is regular webhook response data",
    "workflow": "Test Webhook with Mock"
  },
  "isMock": false
}
```

### Mock Webhook Call
```bash
curl "http://localhost:5678/webhook/test-mock-2025-06-18-2025-06-18-19-42-30?mock=1"
```

**Response:**
```json
{
  "message": "received",
  "files": [
    {
      "originalName": "mock-image.jpg",
      "filename": "mock-image__2025-06-18T19-45-00-000Z.jpg",
      "size": 15432,
      "mimetype": "image/jpeg",
      "publicUrl": "https://picsum.photos/seed/picsum/200/300"
    }
  ],
  "received_body": {
    "mock": "1",
    "timestamp": "2025-06-18T19:45:00.000Z",
    "source": "mock_data",
    "description": "This is mock data generated when ?mock=1 parameter is passed",
    "workflow": "Test Webhook with Mock"
  },
  "isMock": true,
  "mockImageBase64": "iVBORw0KGgoAAAANSUhEUgAAAMgAAAEsCAYAAACG+vy+..."
}
```

## Setup Instructions

### 1. Activate the Workflow

1. Open n8n UI at `http://localhost:5678`
2. Find the workflow named "Test Webhook with Mock" (ID: `Byq250cOoHThBpUA`)
3. Click the toggle switch to activate it
4. The webhook will be available at: `http://localhost:5678/webhook/test-mock-2025-06-18-2025-06-18-19-42-30`

### 2. Test the Functionality

Run the test script:
```bash
node test_mock_webhook.js
```

Or test manually with curl:
```bash
# Regular call
curl "http://localhost:5678/webhook/test-mock-2025-06-18-2025-06-18-19-42-30"

# Mock call
curl "http://localhost:5678/webhook/test-mock-2025-06-18-2025-06-18-19-42-30?mock=1"
```

## Implementation Details

### Mock Image Source
- **URL**: `https://picsum.photos/seed/picsum/200/300`
- **Format**: JPEG image, 200x300 pixels
- **Seed**: `picsum` (ensures consistent image for testing)

### Mock Data Structure
The mock response follows the same format as your existing webhook upload endpoint:

```javascript
{
  message: "received",
  files: [
    {
      originalName: "mock-image.jpg",
      filename: `mock-image__${timestamp}.jpg`,
      size: imageBufferSize,
      mimetype: "image/jpeg",
      publicUrl: "https://picsum.photos/seed/picsum/200/300"
    }
  ],
  received_body: {
    mock: "1",
    timestamp: "ISO timestamp",
    source: "mock_data",
    description: "Mock data description",
    workflow: "Test Webhook with Mock"
  },
  isMock: true,
  mockImageBase64: "base64EncodedImageData"
}
```

### Workflow Nodes

1. **Webhook Trigger**
   - Path: `test-mock-2025-06-18-2025-06-18-19-42-30`
   - Method: GET
   - Response Mode: responseNode

2. **Check Mock Parameter** (IF node)
   - Condition: `{{ $json.query.mock }}` equals `"1"`
   - True path: Mock flow
   - False path: Regular flow

3. **Fetch Mock Image** (HTTP Request)
   - URL: `https://picsum.photos/seed/picsum/200/300`
   - Response format: file (binary)

4. **Prepare Mock Response** (Code node)
   - Processes the fetched image
   - Creates mock response structure
   - Includes base64 encoded image data

5. **Prepare Regular Response** (Code node)
   - Creates standard webhook response
   - No files included

6. **Merge Responses** (Merge node)
   - Combines mock and regular paths

7. **Response** (Respond to Webhook)
   - Returns JSON response with appropriate headers

## Benefits for Testing

1. **Consistent Test Data**: Same image and structure every time
2. **No External Dependencies**: Works without real file uploads
3. **Flow Validation**: Test downstream processing without setup
4. **Development Speed**: Quick iterations during development
5. **Debugging**: Predictable data for troubleshooting

## Integration with Existing Workflows

You can add mock functionality to any existing webhook by:

1. Adding an IF condition to check for `?mock=1`
2. Creating a mock data branch that returns appropriate test data
3. Ensuring the mock response matches your expected data structure

## Example: Adding Mock to Sequence Diagram Workflow

```javascript
// In your Parse Input node, add mock detection:
const isMock = $json.query.mock === "1";

if (isMock) {
  return [{
    json: {
      originalMessage: "Mock sequence diagram test",
      chatId: "1150779136",
      diagramCode: "User->System: Mock test\nSystem-->User: Mock response",
      diagramUrl: "https://sequencediagram.org/index.html#mock",
      source: "mock_data",
      timestamp: new Date().toISOString()
    }
  }];
}
```

## Troubleshooting

### Webhook Returns 404
- Ensure the workflow is activated in n8n UI
- Check the webhook path matches exactly
- Verify n8n is running on port 5678

### Mock Parameter Not Working
- Ensure the IF condition checks for string `"1"`, not number `1`
- Verify the query parameter is correctly formatted: `?mock=1`
- Check the workflow execution logs in n8n

### Image Not Loading
- Verify internet connection for Picsum API access
- Check if the HTTP Request node is configured correctly
- Ensure response format is set to "file"

## Advanced Usage

### Custom Mock Images
Replace the Picsum URL with your own image URL:
```javascript
"url": "https://your-domain.com/mock-image.jpg"
```

### Multiple Mock Scenarios
Add additional conditions for different mock types:
```javascript
const mockType = $json.query.mockType || "default";
switch(mockType) {
  case "large": return largeFileMock;
  case "error": return errorMock;
  default: return defaultMock;
}
```

### Environment-Specific Mocks
Use environment variables to control mock behavior:
```javascript
const enableMock = process.env.ENABLE_MOCK === "true";
const isMock = enableMock && $json.query.mock === "1";
```

---

This mock webhook functionality provides a robust testing foundation for your n8n workflows, enabling faster development and more reliable testing procedures. 