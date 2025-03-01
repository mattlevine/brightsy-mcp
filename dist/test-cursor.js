/**
 * This script tests the agent_proxy tool with Cursor.
 * It sets up a simple HTTP server that can receive requests from Cursor's MCP client.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Configuration
const agentId = process.env.AGENT_ID || "your-agent-id";
const apiKey = process.env.API_KEY || "your-api-key";
const toolName = process.env.TOOL_NAME || "agent-proxy";
const PORT = 3333;
console.log(`Starting test with agent ID: ${agentId}`);
console.log(`Using tool name: ${toolName}`);
// Create server instance
const server = new McpServer({
    name: "cursor-test-mcp",
    version: "1.0.0",
});
// Register the agent proxy tool
server.tool(toolName, "Proxy requests to an OpenAI-compatible AI agent", {
    messages: z.array(z.object({
        role: z.string().describe("The role of the message sender"),
        content: z.union([z.string(), z.array(z.any())]).describe("The content of the message")
    })).describe("The messages to send to the agent")
}, async ({ messages }) => {
    console.log("Agent proxy tool called with messages:", JSON.stringify(messages, null, 2));
    // For testing purposes, just echo back the message
    return {
        content: [
            {
                type: "text",
                text: `Received message: "${messages[0]?.content || 'No message'}"`,
            },
        ],
    };
});
// Start the server
async function main() {
    try {
        const transport = new StdioServerTransport();
        // Connect to the transport
        console.log(`Connecting to transport...`);
        await server.connect(transport);
        console.log(`Test MCP Server running on stdio`);
        console.log(`Registered tool name: ${toolName}`);
        console.log(`Ready to receive requests`);
        // Keep the process running
        process.stdin.resume();
        // Handle termination signals
        process.on('SIGINT', () => {
            console.log('Received SIGINT signal, shutting down...');
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            console.log('Received SIGTERM signal, shutting down...');
            process.exit(0);
        });
    }
    catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
