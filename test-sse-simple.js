#!/usr/bin/env node

import http from 'http';

console.log('🧪 Testing n8n MCP SSE endpoint (simple)...\n');

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
  console.log(`📋 Content-Type: ${res.headers['content-type']}`);
  console.log(`🔄 Connection: ${res.headers['connection']}`);
  console.log('');
  
  res.on('data', (chunk) => {
    const data = chunk.toString();
    console.log('📨 Received SSE data:');
    console.log(data);
    
    // Parse SSE data
    const lines = data.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const jsonData = JSON.parse(line.substring(6));
          console.log('📦 Parsed JSON:');
          console.log(JSON.stringify(jsonData, null, 2));
          
          if (jsonData.method === 'notification/connected') {
            console.log('✅ Successfully connected to n8n MCP server via SSE!');
            console.log(`🛠️  Server has ${jsonData.params.tools} tools available`);
          }
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
  
  // Close connection after 3 seconds
  setTimeout(() => {
    console.log('🔌 Closing connection...');
    req.destroy();
  }, 3000);
});

req.on('error', (err) => {
  console.error('❌ Request error:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.log('💡 Make sure the server is running: node index.js');
  }
});

req.end(); 