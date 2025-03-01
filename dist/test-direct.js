/**
 * This script tests the agent_proxy tool directly by sending a properly formatted
 * MCP request to the server's stdin and reading the response from stdout.
 */
import { spawn } from "child_process";
// Configuration
const agentId = process.env.AGENT_ID || "your-agent-id";
const apiKey = process.env.API_KEY || "your-api-key";
const toolName = process.env.TOOL_NAME || "brightsy";
console.log(`Starting direct test with agent ID: ${agentId}`);
console.log(`Using tool name: ${toolName}`);
// Check if command line arguments were provided
const args = process.argv.slice(2);
let cmdAgentId = agentId;
let cmdApiKey = apiKey;
let cmdToolName = toolName;
// Parse command line arguments
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    // Handle arguments with equals sign (--key=value)
    if (arg.startsWith('--') && arg.includes('=')) {
        const [key, value] = arg.substring(2).split('=', 2);
        if (key === 'agent-id' || key === 'agent_id') {
            cmdAgentId = value;
        }
        else if (key === 'api-key' || key === 'api_key') {
            cmdApiKey = value;
        }
        else if (key === 'tool-name' || key === 'tool_name') {
            cmdToolName = value;
        }
    }
    // Handle arguments with space (--key value)
    else if (arg.startsWith('--')) {
        const key = arg.substring(2);
        const nextArg = i + 1 < args.length ? args[i + 1] : undefined;
        if (nextArg && !nextArg.startsWith('--')) {
            if (key === 'agent-id' || key === 'agent_id') {
                cmdAgentId = nextArg;
            }
            else if (key === 'api-key' || key === 'api_key') {
                cmdApiKey = nextArg;
            }
            else if (key === 'tool-name' || key === 'tool_name') {
                cmdToolName = nextArg;
            }
            i++; // Skip the next argument as we've used it as a value
        }
    }
    // Handle positional arguments
    else if (i === 0) {
        cmdAgentId = arg;
    }
    else if (i === 1) {
        cmdApiKey = arg;
    }
    else if (i === 2) {
        cmdToolName = arg;
    }
}
if (cmdAgentId !== agentId || cmdApiKey !== apiKey || cmdToolName !== toolName) {
    console.log(`Using command line arguments: agent_id=${cmdAgentId}, tool_name=${cmdToolName}`);
}
// Spawn the MCP server process
const serverProcess = spawn("node", [
    "dist/index.js",
    cmdAgentId,
    cmdApiKey,
    cmdToolName
], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "inherit"] // We'll write to stdin and read from stdout
});
// Create a simple MCP request to call the tool
const mcpRequest = {
    jsonrpc: "2.0",
    id: "test-1",
    method: "tools/call",
    params: {
        name: cmdToolName,
        arguments: {
            messages: [
                {
                    role: "user",
                    content: "Hello, can you help me with a simple task?"
                }
            ]
        }
    }
};
// Wait for the server to start up
setTimeout(() => {
    console.log("Sending request to MCP server...");
    console.log(`Using tool name in request: ${cmdToolName}`);
    // Send the request to the server
    serverProcess.stdin.write(JSON.stringify(mcpRequest) + "\n");
}, 2000);
// Process the response
let responseData = "";
serverProcess.stdout.on("data", (data) => {
    responseData += data.toString();
    try {
        // Try to parse the response as JSON
        const response = JSON.parse(responseData);
        console.log("Received response:");
        console.log(JSON.stringify(response, null, 2));
        // Clean up and exit
        serverProcess.kill();
        process.exit(0);
    }
    catch (error) {
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
