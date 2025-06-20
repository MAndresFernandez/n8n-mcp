#!/usr/bin/env node

import http from 'http';

console.log('🧪 Testing n8n MCP SSE endpoint...\n');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/sse',
  method: 'GET',
  headers: {
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache'
  }
};

const req = http.request(options, (res) => {
  console.log(`📡 Connected to SSE endpoint`);
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  console.log('');
  
  res.on('data', (chunk) => {
    const data = chunk.toString();
    console.log('📨 Received:', data);
    
    // Parse SSE data
    const lines = data.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const jsonData = JSON.parse(line.substring(6));
          console.log('📦 Parsed JSON:', JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log('📝 Raw data:', line.substring(6));
        }
      }
    }
    console.log('---');
  });
  
  res.on('end', () => {
    console.log('🔚 SSE connection ended');
  });
  
  res.on('error', (err) => {
    console.error('❌ SSE error:', err.message);
  });
  
  // Send a test MCP message after connection
  setTimeout(() => {
    console.log('📤 Sending test message...');
    const testMessage = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });
    
    req.write(testMessage + '\n');
  }, 1000);
  
  // Close connection after 5 seconds
  setTimeout(() => {
    console.log('🔌 Closing connection...');
    req.destroy();
  }, 5000);
});

req.on('error', (err) => {
  console.error('❌ Request error:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.log('💡 Make sure the server is running: node index.js');
  }
});

req.end(); 