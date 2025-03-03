/**
 * This script builds and runs all the test scripts.
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

// Configuration from environment variables
const AGENT_ID = process.env.AGENT_ID || process.env.BRIGHTSY_AGENT_ID || '';
const API_KEY = process.env.API_KEY || process.env.BRIGHTSY_API_KEY || '';
const TOOL_NAME = process.env.TOOL_NAME || process.env.BRIGHTSY_TOOL_NAME || "brightsy";

// Validate required environment variables
if (!AGENT_ID || !API_KEY) {
  console.error('Error: Required environment variables not set');
  console.error('Please set the following environment variables:');
  console.error('  AGENT_ID or BRIGHTSY_AGENT_ID: The agent ID to use for testing');
  console.error('  API_KEY or BRIGHTSY_API_KEY: The API key to use for testing');
  console.error('  TOOL_NAME or BRIGHTSY_TOOL_NAME: (optional) The tool name to use (default: brightsy)');
  process.exit(1);
}

// Ensure we're in the right directory
const packageJsonPath = join(process.cwd(), "package.json");
if (!existsSync(packageJsonPath)) {
  console.error("Error: package.json not found. Make sure you're running this from the brightsy-mcp directory.");
  process.exit(1);
}

// Build the project
console.log("Building the project...");
try {
  execSync("npm run build", { stdio: "inherit" });
  console.log("Build successful!");
} catch (error) {
  console.error("Build failed:", error);
  process.exit(1);
}

// Run the tests with environment variables
const env = {
  ...process.env,
  AGENT_ID,
  API_KEY,
  TOOL_NAME
};

console.log("\n=== Running MCP stdio server tests ===");
try {
  execSync("node dist/test.js", { 
    stdio: "inherit",
    timeout: 60000, // 60 second timeout
    env
  });
} catch (error) {
  console.error("MCP stdio server tests failed:", error);
}

console.log("\n=== Running direct MCP protocol test ===");
try {
  execSync("node dist/test-direct.js", { 
    stdio: "inherit",
    timeout: 60000, // 60 second timeout
    env
  });
} catch (error) {
  console.error("Direct MCP protocol test failed:", error);
}

console.log("\nAll tests completed."); 