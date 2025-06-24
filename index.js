#!/usr/bin/env node

import dotenv from 'dotenv';
import http from 'http';
import url from 'url';

// Import tool modules
import { validateAuthentication, extractApiKeyFromHeaders } from './tools/utils.js';
import { toolRegistry } from './tools/tool-registry.js';
import { dispatchTool } from './tools/tool-dispatcher.js';

// Load environment variables
dotenv.config();

const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const MCP_PORT = process.env.MCP_PORT || 3001;

// Check if API key is available in environment
const hasEnvApiKey = !!N8N_API_KEY;

class N8nMcpServer {
  constructor() {
    this.initialized = false;
    this.setupErrorHandling();
    // Store client credentials by session ID
    this.clientCredentials = new Map();
    this.sessionCounter = 0;
  }

  setupErrorHandling() {
    process.on('SIGINT', async () => {
      console.log('\nShutting down server...');
      process.exit(0);
    });
  }

  // Store credentials when client connects with auth header
  storeClientCredentials(headers = {}) {
    const headerApiKey = extractApiKeyFromHeaders(headers);
    if (headerApiKey) {
      this.sessionCounter++;
      const sessionId = `session_${this.sessionCounter}_${Date.now()}`;
      this.clientCredentials.set(sessionId, headerApiKey);
      console.log(`🔐 Stored credentials for session: ${sessionId}`);
      return sessionId;
    }
    return null;
  }

  // Handle JSON-RPC messages
  async handleMessage(message, headers = {}) {
    try {
      console.log(`📥 Received MCP request: ${message.method || 'unknown'}`);
      
      // Handle initialization (store credentials if provided)
      if (message.method === 'initialize') {
        this.initialized = true;
        
        // Store client credentials if provided in headers
        const sessionId = this.storeClientCredentials(headers);
        
        const result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'n8n-mcp-server',
            version: '1.0.0'
          }
        };
        
        // Include session info if credentials were stored
        if (sessionId) {
          result.serverInfo.sessionId = sessionId;
          result.serverInfo.authenticationStored = true;
        }
        
        return {
          jsonrpc: '2.0',
          result,
          id: message.id
        };
      }
      
      // Check if initialized for other methods
      if (!this.initialized && message.method !== 'initialize') {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32002,
            message: 'Server not initialized'
          },
          id: message.id
        };
      }
      
      // Handle tools/list
      if (message.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          result: {
            tools: toolRegistry
          },
          id: message.id
        };
      }
      
      // Handle tools/call
      if (message.method === 'tools/call') {
        // Extract session ID if provided by client
        const sessionId = message.params?.sessionId || headers['x-session-id'] || null;
        
        // Validate authentication for tool calls (check session first, then headers)
        const authResult = validateAuthentication(headers, sessionId, this.clientCredentials);
        if (!authResult.isValid) {
          return {
            jsonrpc: '2.0',
            error: authResult.error,
            id: message.id
          };
        }
        
        const { name, arguments: args } = message.params;
        
        // Use the centralized tool dispatcher
        const result = await dispatchTool(name, args, headers, sessionId, this.clientCredentials);
        
        return {
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          },
          id: message.id
        };
      }
      
      // Handle notifications/initialized
      if (message.method === 'notifications/initialized') {
        // No response needed for notifications
        return null;
      }
      
      // Unknown method
      return {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: 'Method not found'
        },
        id: message.id
      };
      
    } catch (error) {
      console.error('Error handling message:', error);
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message
        },
        id: message.id || null
      };
    }
  }

  async run() {
    // Create HTTP server implementing Streamable HTTP transport
    const httpServer = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);
      
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Accept, N8N-API-KEY, N8N_API_KEY, Authorization');
      
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      // Health check endpoint
      if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'ok', 
          message: 'n8n MCP server is running',
          timestamp: new Date().toISOString(),
          transport: 'streamable-http',
          endpoints: {
            health: `http://localhost:${MCP_PORT}/health`,
            mcp: `http://localhost:${MCP_PORT}/mcp`
          }
        }));
        return;
      }

      // MCP endpoint - implements Streamable HTTP transport
      if (parsedUrl.pathname === '/mcp') {
        if (req.method === 'POST') {
          // Handle JSON-RPC messages from client
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', async () => {
            try {
              const message = JSON.parse(body);
              
              // Check if client accepts Server-Sent Events
              const acceptHeader = req.headers.accept || '';
              const supportsSSE = acceptHeader.includes('text/event-stream');
              
              // Handle the message with headers
              const response = await this.handleMessage(message, req.headers);
              
              // Don't send response for notifications
              if (response === null) {
                res.writeHead(202, { 'Content-Type': 'text/plain' });
                res.end('Accepted');
                return;
              }
              
              if (supportsSSE) {
                // Return SSE stream for requests
                res.writeHead(200, {
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  'Connection': 'keep-alive',
                  'Access-Control-Allow-Origin': '*'
                });
                
                // Send response as SSE event
                res.write(`data: ${JSON.stringify(response)}\n\n`);
                res.end();
              } else {
                // Return JSON response
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));
              }
            } catch (error) {
              console.error('Error processing request:', error);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: {
                  code: -32700,
                  message: 'Parse error'
                },
                id: null
              }));
            }
          });
        } else if (req.method === 'GET') {
          // Handle GET request for SSE stream (optional)
          const acceptHeader = req.headers.accept || '';
          if (acceptHeader.includes('text/event-stream')) {
            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'Access-Control-Allow-Origin': '*'
            });
            
            // Keep connection alive for server-initiated messages
            const keepAlive = setInterval(() => {
              res.write(': keepalive\n\n');
            }, 30000);
            
            req.on('close', () => {
              clearInterval(keepAlive);
            });
          } else {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
          }
        } else {
          res.writeHead(405, { 'Content-Type': 'text/plain' });
          res.end('Method Not Allowed');
        }
        return;
      }

      // Default 404 response
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Not Found. Available endpoints:
- GET /health - Health check
- POST /mcp - MCP Streamable HTTP endpoint
- GET /mcp - MCP SSE stream (optional)`);
    });
    
    // Start the HTTP server
    httpServer.listen(MCP_PORT, '0.0.0.0', () => {
      console.log(`🚀 n8n MCP server running on http://0.0.0.0:${MCP_PORT}`);
      console.log(`📡 MCP endpoint: http://localhost:${MCP_PORT}/mcp`);
      console.log(`❤️  Health check: http://localhost:${MCP_PORT}/health`);
      console.log(`🔗 n8n connection: ${N8N_BASE_URL}`);
      console.log(`✨ Ready for MCP Inspector!`);
      
      // Show authentication status
      if (hasEnvApiKey) {
        console.log(`🔐 Authentication: Using N8N_API_KEY from environment`);
      } else {
        console.log(`🔐 Authentication: N8N_API_KEY not found in environment`);
        console.log(`💡 To authenticate, include N8N_API_KEY in your request headers:`);
        console.log(`   - Header: "N8N-API-KEY: your_api_key_here"`);
        console.log(`   - Header: "N8N_API_KEY: your_api_key_here"`);
        console.log(`   - Header: "n8n-api-key: your_api_key_here"`);
        console.log(`   - Header: "Authorization: Bearer your_api_key_here"`);
      }
      
      console.log(`\n🔍 Use MCP Inspector:`);
      console.log(`   Transport: Streamable HTTP`);
      console.log(`   URL: http://localhost:${MCP_PORT}/mcp`);
      console.log(`   npx @modelcontextprotocol/inspector`);
    });

    // Handle server shutdown
    process.on('SIGTERM', () => {
      console.log('Shutting down server...');
      httpServer.close();
    });
  }
}

const server = new N8nMcpServer();
server.run().catch(console.error);
