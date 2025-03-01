/**
 * This script tests the agent_proxy tool by sending a JSON-RPC request to the MCP server.
 */

import { spawn } from "child_process";

// Configuration
const agentId = process.env.AGENT_ID || "your-agent-id";
const apiKey = process.env.API_KEY || "your-api-key";

console.log(`Starting JSON-RPC test with agent ID: ${agentId}`);

// Spawn the MCP server process
const serverProcess = spawn("node", [
  "dist/index.js", 
  "--agent-id", agentId, 
  "--api-key", apiKey
], {
  cwd: process.cwd(),
  stdio: ["pipe", "pipe", "inherit"] // We'll write to stdin and read from stdout
});

// Create a JSON-RPC request to call the agent-proxy tool
const jsonRpcRequest = {
  jsonrpc: "2.0",
  id: "test-1",
  method: "tools/call",
  params: {
    name: "agent-proxy",
    arguments: {
      messages: [
        {
          role: "user",
          content: "I'm testing the agent_proxy tool in the brightsy-mcp project. Can you confirm that you're receiving this message through the agent_proxy tool and respond with a simple greeting?"
        }
      ]
    }
  }
};

// Wait for the server to start up
setTimeout(() => {
  console.log("Sending JSON-RPC request to MCP server...");
  // Send the request to the server
  serverProcess.stdin.write(JSON.stringify(jsonRpcRequest) + "\n");
}, 2000);

// Process the response
let responseData = "";
serverProcess.stdout.on("data", (data) => {
  responseData += data.toString();
  
  try {
    // Try to parse the response as JSON
    const response = JSON.parse(responseData);
    console.log("Received JSON-RPC response:");
    console.log(JSON.stringify(response, null, 2));
    
    // Clean up and exit
    serverProcess.kill();
    process.exit(0);
  } catch (error) {
    // If we can't parse it yet, wait for more data
  }
});

// Handle process events
serverProcess.on("error", (error) => {
  console.error("Failed to start server process:", error);
  process.exit(1);
});

serverProcess.on("exit", (code, signal) => {
  if (code !== null && code !== 0) {
    console.error(`Server process exited with code ${code}`);
    process.exit(code);
  }
});

// Handle termination signals
process.on("SIGINT", () => {
  console.log("Received SIGINT, terminating server...");
  serverProcess.kill("SIGINT");
  process.exit(0);
});

// Set a timeout to prevent hanging
setTimeout(() => {
  console.error("Test timed out after 30 seconds");
  serverProcess.kill();
  process.exit(1);
}, 30000); 