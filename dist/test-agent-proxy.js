import { spawn } from "child_process";
// Configuration
const agentId = process.env.AGENT_ID || "your-agent-id";
const apiKey = process.env.API_KEY || "your-api-key";
const testMessage = "Hello, can you help me with a simple task?";
const toolName = process.env.TOOL_NAME || "brightsy";
console.log(`Starting test with agent ID: ${agentId}`);
console.log(`Using tool name: ${toolName}`);
console.log(`Test message: "${testMessage}"`);
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
// Spawn the MCP server process with the test message
const serverProcess = spawn("node", [
    "dist/index.js",
    cmdAgentId,
    cmdApiKey,
    cmdToolName,
    testMessage
], {
    cwd: process.cwd(),
    stdio: "inherit" // Inherit stdio to see output directly
});
// Handle process events
serverProcess.on("error", (error) => {
    console.error("Failed to start server process:", error);
    process.exit(1);
});
serverProcess.on("exit", (code, signal) => {
    console.log(`Server process exited with code ${code} and signal ${signal}`);
    process.exit(code || 0);
});
// Handle termination signals
process.on("SIGINT", () => {
    console.log("Received SIGINT, terminating server...");
    serverProcess.kill("SIGINT");
});
process.on("SIGTERM", () => {
    console.log("Received SIGTERM, terminating server...");
    serverProcess.kill("SIGTERM");
});
