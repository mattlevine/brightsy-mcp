import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn, type ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

// Configuration
const TEST_AGENT_ID = "e6b93840-e117-4390-a9e6-0d78f5c5bbcf";
const TEST_API_KEY = "d5243ff6-caa5-4456-808e-3a0d60a84e5e";
const TOOL_NAME = "brightsy";

// Test cases
const testCases = [
  {
    name: "Create first conversation",
    conversationId: "test1",
    message: "test:echo First message in test1",
    expectedResponse: "Echo: first message in test1"
  },
  {
    name: "Add to first conversation",
    conversationId: "test1",
    message: "test:echo Second message in test1",
    expectedResponse: "Echo: second message in test1"
  },
  {
    name: "Create second conversation",
    conversationId: "test2",
    message: "test:echo Message in test2",
    expectedResponse: "Echo: message in test2"
  },
  {
    name: "Check conversation stats",
    conversationId: "default",
    message: "test:stats",
    expectedPartial: "Count: 2"
  },
  {
    name: "Clear first conversation",
    conversationId: "test1",
    message: "clear conversation",
    expectedResponse: "Conversation test1 has been cleared."
  },
  {
    name: "Verify first conversation cleared",
    conversationId: "default",
    message: "test:stats",
    expectedPartial: "\"test1\":0"
  },
  {
    name: "Test simulation",
    conversationId: "test3",
    message: "test:simulate This is a simulated response",
    expectedResponse: "This is a simulated response"
  },
  {
    name: "List conversations",
    conversationId: "default",
    message: "list conversations",
    expectedPartial: "test3"
  }
];

async function runTests() {
  console.log("Starting MCP stdio server tests...");
  
  // Create a transport connected to stdio
  const transport = new StdioClientTransport({
    command: "/opt/homebrew/bin/node",
    args: [
      path.resolve("dist/index.js"),
      "--agent-id", TEST_AGENT_ID,
      "--api-key", TEST_API_KEY,
      "--tool-name", TOOL_NAME
    ],
    env: {
      BRIGHTSY_TEST_MODE: "true",
      BRIGHTSY_MAINTAIN_HISTORY: "true"
    }
  });
  
  // Create MCP client
  const client = new McpClient({
    name: "test-client",
    version: "1.0.0"
  });
  
  try {
    // Connect to the server
    console.log("Connecting to server...");
    await client.connect(transport);
    console.log("Connected to server");
    
    // Run each test case
    let passedTests = 0;
    
    for (const [index, test] of testCases.entries()) {
      console.log(`\n[${index + 1}/${testCases.length}] Running test: ${test.name}`);
      
      try {
        // Call the agent proxy tool
        const toolParams = {
          name: TOOL_NAME,
          arguments: {
            messages: [{ role: "user", content: test.message }],
            conversationId: test.conversationId
          }
        };
        
        console.log("Calling tool with params:", JSON.stringify(toolParams, null, 2));
        
        const result = await client.callTool(toolParams);
        
        // Extract text from response
        const responseText = (result.content as Array<{type: string, text: string}>)
          .filter(item => item.type === "text")
          .map(item => item.text)
          .join("\n");
        
        console.log(`Response: ${responseText}`);
        
        // Check if response matches expected
        let passed = false;
        
        if (test.expectedResponse && responseText === test.expectedResponse) {
          passed = true;
        } else if (test.expectedPartial && responseText.includes(test.expectedPartial)) {
          passed = true;
        }
        
        if (passed) {
          console.log("✅ Test passed");
          passedTests++;
        } else {
          console.log("❌ Test failed");
          console.log(`Expected: ${test.expectedResponse || "to include " + test.expectedPartial}`);
          console.log(`Actual: ${responseText}`);
        }
      } catch (error) {
        console.error(`Error in test "${test.name}":`, error);
        console.log("❌ Test failed due to error");
      }
    }
    
    // Print summary
    console.log(`\nTest summary: ${passedTests}/${testCases.length} tests passed`);
    
  } catch (error) {
    console.error("Error connecting to server:", error);
  } finally {
    // Clean up
    console.log("Cleaning up...");
    try {
      await client.close();
    } catch (e) {
      console.error("Error closing client:", e);
    }
  }
}

// Run the tests
runTests().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
}); 