#!/usr/bin/env node

import http from 'http';

console.log('🧪 Testing n8n MCP protocol over SSE...\n');

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

let messageId = 1;

const req = http.request(options, (res) => {
  console.log(`📡 Connected to SSE endpoint (Status: ${res.statusCode})`);
  
  res.on('data', (chunk) => {
    const data = chunk.toString();
    const lines = data.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const jsonData = JSON.parse(line.substring(6));
          console.log('📨 Received:', JSON.stringify(jsonData, null, 2));
          
          // Handle responses
          if (jsonData.method === 'notification/connected') {
            console.log('✅ Connected! Sending initialize...');
            sendMessage({
              jsonrpc: '2.0',
              id: messageId++,
              method: 'initialize',
              params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: {
                  name: 'sse-test-client',
                  version: '1.0.0'
                }
              }
            });
          } else if (jsonData.result && jsonData.result.protocolVersion) {
            console.log('✅ Initialized! Requesting tools list...');
            sendMessage({
              jsonrpc: '2.0',
              id: messageId++,
              method: 'tools/list',
              params: {}
            });
          } else if (jsonData.result && jsonData.result.tools) {
            console.log(`✅ Got ${jsonData.result.tools.length} tools! Testing self_test...`);
            sendMessage({
              jsonrpc: '2.0',
              id: messageId++,
              method: 'tools/call',
              params: {
                name: 'self_test',
                arguments: {}
              }
            });
          } else if (jsonData.result && jsonData.result.content) {
            console.log('✅ Tool call successful!');
            console.log('🔚 Test completed successfully');
            req.destroy();
          }
        } catch (e) {
          console.log('📝 Raw SSE data:', line.substring(6));
        }
      }
    }
  });
  
  const sendMessage = (message) => {
    console.log('📤 Sending:', JSON.stringify(message, null, 2));
    req.write(JSON.stringify(message) + '\n');
  };
  
  res.on('end', () => {
    console.log('🔚 SSE connection ended');
  });
  
  res.on('error', (err) => {
    console.error('❌ SSE error:', err.message);
  });
});

req.on('error', (err) => {
  console.error('❌ Request error:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.log('💡 Make sure the server is running: node index.js');
  }
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - closing connection');
  req.destroy();
}, 10000);

req.end(); 