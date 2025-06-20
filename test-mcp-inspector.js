#!/usr/bin/env node

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

// Test configuration
const MCP_SERVER_URL = 'http://localhost:3001/mcp';
const INSPECTOR_URL = 'http://localhost:6274';
const TEST_TIMEOUT = 30000; // 30 seconds

class MCPInspectorTest {
  constructor() {
    this.inspectorProcess = null;
    this.serverRunning = false;
  }

  async startInspector() {
    console.log('🚀 Starting MCP Inspector...');
    
    // Start the MCP Inspector
    this.inspectorProcess = spawn('npx', ['@modelcontextprotocol/inspector'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    // Handle inspector output
    this.inspectorProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Inspector] ${output.trim()}`);
      
      // Check if inspector is ready
      if (output.includes('localhost:6274') || output.includes('http://127.0.0.1:6274')) {
        console.log('✅ MCP Inspector is ready!');
      }
    });

    this.inspectorProcess.stderr.on('data', (data) => {
      console.log(`[Inspector Error] ${data.toString().trim()}`);
    });

    this.inspectorProcess.on('close', (code) => {
      console.log(`Inspector process exited with code ${code}`);
    });

    // Wait for inspector to start
    console.log('⏳ Waiting for MCP Inspector to start...');
    await setTimeout(8000); // Give it time to start
  }

  async testWithPuppeteer() {
    console.log('🌐 Starting Puppeteer test...');
    
    try {
      // Navigate to the inspector
      await mcp_puppeteer_navigate({
        url: INSPECTOR_URL,
        launchOptions: {
          headless: false, // Show browser for debugging
          defaultViewport: { width: 1200, height: 800 }
        }
      });

      console.log('📸 Taking initial screenshot...');
      await mcp_puppeteer_screenshot({
        name: 'inspector-initial',
        width: 1200,
        height: 800
      });

      // Wait for page to load
      await setTimeout(3000);

      // Look for transport type dropdown
      console.log('🔧 Configuring transport type...');
      try {
        // Try to find and click the transport dropdown
        await mcp_puppeteer_click({
          selector: 'select[name="transport"], select:has(option[value="streamable-http"]), .transport-select, [data-testid="transport-select"]'
        });
        
        await setTimeout(1000);
        
        // Select Streamable HTTP
        await mcp_puppeteer_select({
          selector: 'select[name="transport"], select:has(option[value="streamable-http"]), .transport-select, [data-testid="transport-select"]',
          value: 'streamable-http'
        });
        
        console.log('✅ Selected Streamable HTTP transport');
      } catch (error) {
        console.log('⚠️  Could not find transport dropdown, it might already be set');
      }

      // Fill in the server URL
      console.log('🔗 Setting server URL...');
      try {
        // Try different possible selectors for the URL input
        const urlSelectors = [
          'input[name="url"]',
          'input[name="serverUrl"]', 
          'input[placeholder*="URL"]',
          'input[placeholder*="url"]',
          'input[type="url"]',
          '.url-input',
          '[data-testid="server-url"]'
        ];

        let urlSet = false;
        for (const selector of urlSelectors) {
          try {
            await mcp_puppeteer_fill({
              selector: selector,
              value: MCP_SERVER_URL
            });
            console.log(`✅ Set URL using selector: ${selector}`);
            urlSet = true;
            break;
          } catch (e) {
            // Try next selector
          }
        }

        if (!urlSet) {
          console.log('⚠️  Could not find URL input field');
        }
      } catch (error) {
        console.log('❌ Error setting URL:', error.message);
      }

      await setTimeout(2000);

      // Try to connect
      console.log('🔌 Attempting to connect...');
      try {
        // Look for connect button
        const connectSelectors = [
          'button:contains("Connect")',
          'button[type="submit"]',
          '.connect-button',
          '[data-testid="connect-button"]',
          'button:has-text("Connect")',
          'input[type="submit"]'
        ];

        let connected = false;
        for (const selector of connectSelectors) {
          try {
            await mcp_puppeteer_click({
              selector: selector
            });
            console.log(`✅ Clicked connect using selector: ${selector}`);
            connected = true;
            break;
          } catch (e) {
            // Try next selector
          }
        }

        if (!connected) {
          console.log('⚠️  Could not find connect button, trying to press Enter');
          // Try pressing Enter on the URL field
          await mcp_puppeteer_evaluate({
            script: `
              const urlInput = document.querySelector('input[name="url"], input[name="serverUrl"], input[type="url"]');
              if (urlInput) {
                urlInput.focus();
                urlInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
              }
            `
          });
        }
      } catch (error) {
        console.log('❌ Error connecting:', error.message);
      }

      // Wait for connection attempt
      await setTimeout(5000);

      console.log('📸 Taking connection attempt screenshot...');
      await mcp_puppeteer_screenshot({
        name: 'inspector-connection-attempt',
        width: 1200,
        height: 800
      });

      // Check for connection status
      console.log('🔍 Checking connection status...');
      const connectionStatus = await mcp_puppeteer_evaluate({
        script: `
          // Look for success indicators
          const successIndicators = [
            document.querySelector('.connection-success'),
            document.querySelector('.connected'),
            document.querySelector('[data-testid="connection-status"]:contains("connected")'),
            document.querySelector('.status-success')
          ].filter(Boolean);

          // Look for error indicators  
          const errorIndicators = [
            document.querySelector('.connection-error'),
            document.querySelector('.error'),
            document.querySelector('[data-testid="connection-error"]'),
            document.querySelector('.status-error')
          ].filter(Boolean);

          // Look for tools list (indicates successful connection)
          const toolsList = document.querySelector('.tools-list, [data-testid="tools-list"], .tool-item');
          
          // Check page text content
          const pageText = document.body.innerText || document.body.textContent || '';
          const hasConnectionError = pageText.includes('Connection Error') || pageText.includes('connection error');
          const hasTools = pageText.includes('self_test') || pageText.includes('list_workflows');

          return {
            hasSuccessIndicators: successIndicators.length > 0,
            hasErrorIndicators: errorIndicators.length > 0,
            hasToolsList: !!toolsList,
            hasConnectionError,
            hasTools,
            pageText: pageText.substring(0, 500) // First 500 chars for debugging
          };
        `
      });

      console.log('📊 Connection Status:', connectionStatus);

      // Test tools if connected
      if (connectionStatus.hasTools || connectionStatus.hasToolsList) {
        console.log('🛠️  Connection successful! Testing tools...');
        
        // Try to click on a tool
        try {
          await mcp_puppeteer_click({
            selector: '.tool-item:first-child, [data-testid="tool-self_test"], button:contains("self_test")'
          });
          
          await setTimeout(2000);
          
          console.log('📸 Taking tools screenshot...');
          await mcp_puppeteer_screenshot({
            name: 'inspector-tools-view',
            width: 1200,
            height: 800
          });
        } catch (error) {
          console.log('⚠️  Could not interact with tools:', error.message);
        }
      } else if (connectionStatus.hasConnectionError) {
        console.log('❌ Connection failed - still showing connection error');
      } else {
        console.log('⚠️  Connection status unclear');
      }

      // Final screenshot
      console.log('📸 Taking final screenshot...');
      await mcp_puppeteer_screenshot({
        name: 'inspector-final',
        width: 1200,
        height: 800
      });

      console.log('✅ Puppeteer test completed!');
      
      return {
        success: connectionStatus.hasTools || connectionStatus.hasToolsList,
        error: connectionStatus.hasConnectionError,
        status: connectionStatus
      };

    } catch (error) {
      console.error('❌ Puppeteer test failed:', error);
      
      // Take error screenshot
      try {
        await mcp_puppeteer_screenshot({
          name: 'inspector-error',
          width: 1200,
          height: 800
        });
      } catch (e) {
        console.log('Could not take error screenshot');
      }
      
      return {
        success: false,
        error: true,
        message: error.message
      };
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up...');
    
    if (this.inspectorProcess) {
      console.log('🛑 Stopping MCP Inspector...');
      this.inspectorProcess.kill('SIGTERM');
      
      // Force kill if it doesn't stop
      setTimeout(() => {
        if (this.inspectorProcess && !this.inspectorProcess.killed) {
          this.inspectorProcess.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  async run() {
    console.log('🧪 Starting MCP Inspector Test Suite');
    console.log(`📡 Testing connection to: ${MCP_SERVER_URL}`);
    console.log(`🌐 Inspector URL: ${INSPECTOR_URL}`);
    
    try {
      // Start the inspector
      await this.startInspector();
      
      // Run the Puppeteer test
      const result = await this.testWithPuppeteer();
      
      // Report results
      console.log('\n📋 Test Results:');
      console.log('================');
      if (result.success) {
        console.log('✅ MCP Connection: SUCCESS');
        console.log('✅ Tools Available: YES');
        console.log('✅ Inspector Working: YES');
      } else if (result.error) {
        console.log('❌ MCP Connection: FAILED');
        console.log('❌ Connection Error: YES');
        console.log('❌ Inspector Working: PARTIAL');
      } else {
        console.log('⚠️  MCP Connection: UNCLEAR');
        console.log('⚠️  Status: UNKNOWN');
      }
      
      return result;
      
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      return { success: false, error: true, message: error.message };
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new MCPInspectorTest();
  
  // Handle cleanup on exit
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Test interrupted');
    await test.cleanup();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n⏹️  Test terminated');
    await test.cleanup();
    process.exit(0);
  });
  
  // Run the test
  test.run()
    .then((result) => {
      console.log('\n🏁 Test completed');
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Unhandled error:', error);
      process.exit(1);
    });
}

export default MCPInspectorTest; 