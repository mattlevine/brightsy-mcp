import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";
import * as path from "path";

async function runClient() {
  console.log("Starting MCP client test with main server...");
  
  // Create a transport connected to stdio
  const transport = new StdioClientTransport({
    command: "/opt/homebrew/bin/node",
    args: [
      path.resolve("dist/index.js"),
      "--agent-id", "e6b93840-e117-4390-a9e6-0d78f5c5bbcf",
      "--api-key", "d5243ff6-caa5-4456-808e-3a0d60a84e5e",
      "--tool-name", "brightsy"
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
    
    // Test messages to send with conversation IDs
    const testConversations = [
      { id: "test-convo-1", messages: ["test:echo Hello in conversation 1", "test:echo Second message in conversation 1"] },
      { id: "test-convo-2", messages: ["test:echo Hello in conversation 2"] },
      { id: "test-convo-1", messages: ["test:echo Third message in conversation 1"] }
    ];
    
    // Send each message in each conversation
    for (const conversation of testConversations) {
      console.log(`\n--- Conversation: ${conversation.id} ---`);
      
      for (const message of conversation.messages) {
        // Call the agent proxy tool
        const toolParams = {
          name: "brightsy",
          arguments: {
            messages: [{ role: "user", content: message }],
            conversationId: conversation.id
          }
        };
        
        console.log(`\nSending message: "${message}"`);
        console.log("Calling tool with params:", JSON.stringify(toolParams, null, 2));
        
        const result = await client.callTool(toolParams);
        console.log("Result:", JSON.stringify(result, null, 2));
      }
    }
    
    // Test listing conversations
    console.log("\n--- Testing list conversations command ---");
    const listParams = {
      name: "brightsy",
      arguments: {
        messages: [{ role: "user", content: "list conversations" }],
        conversationId: "default"
      }
    };
    
    console.log("Calling tool with params:", JSON.stringify(listParams, null, 2));
    const listResult = await client.callTool(listParams);
    console.log("Result:", JSON.stringify(listResult, null, 2));
    
    // Test conversation stats
    console.log("\n--- Testing conversation stats command ---");
    const statsParams = {
      name: "brightsy",
      arguments: {
        messages: [{ role: "user", content: "test:stats" }],
        conversationId: "default"
      }
    };
    
    console.log("Calling tool with params:", JSON.stringify(statsParams, null, 2));
    const statsResult = await client.callTool(statsParams);
    console.log("Result:", JSON.stringify(statsResult, null, 2));
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Clean up
    console.log("\nCleaning up...");
    try {
      await client.close();
    } catch (e) {
      console.error("Error closing client:", e);
    }
  }
}

// Run the client
runClient().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
}); 