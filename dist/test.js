import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";
// Configuration from environment variables
const TEST_AGENT_ID = process.env.AGENT_ID || process.env.BRIGHTSY_AGENT_ID || '';
const TEST_API_KEY = process.env.API_KEY || process.env.BRIGHTSY_API_KEY || '';
const TOOL_NAME = process.env.TOOL_NAME || process.env.BRIGHTSY_TOOL_NAME || "brightsy";
// Validate required environment variables
if (!TEST_AGENT_ID || !TEST_API_KEY) {
    console.error('Error: Required environment variables not set');
    console.error('Please set the following environment variables:');
    console.error('  AGENT_ID or BRIGHTSY_AGENT_ID: The agent ID to use for testing');
    console.error('  API_KEY or BRIGHTSY_API_KEY: The API key to use for testing');
    console.error('  TOOL_NAME or BRIGHTSY_TOOL_NAME: (optional) The tool name to use (default: brightsy)');
    process.exit(1);
}
// After validation, we can safely assert these as strings
const validatedAgentId = TEST_AGENT_ID;
const validatedApiKey = TEST_API_KEY;
// Test cases
const testCases = [
    {
        name: "Create first message",
        message: "test:echo First message",
        expectedPartial: "```\nFirst message\n```"
    },
    {
        name: "Add to conversation",
        message: "test:echo Second message",
        expectedPartial: "```\nSecond message\n```"
    },
    {
        name: "Check conversation history",
        message: "test:history",
        expectedPartial: "test:echo First message"
    },
    {
        name: "Clear conversation history",
        message: "clear history",
        expectedPartial: "history has been cleared"
    },
    {
        name: "Verify history cleared",
        message: "test:history",
        expectedPartial: "I notice you want to test something related to history"
    },
    {
        name: "Test simulation",
        message: "test:simulate This is a simulated response",
        expectedPartial: "simulated response"
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
            BRIGHTSY_TEST_MODE: "true"
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
                        messages: [{ role: "user", content: test.message }]
                    }
                };
                console.log("Calling tool with params:", JSON.stringify(toolParams, null, 2));
                const result = await client.callTool(toolParams);
                // Extract text from response
                const responseText = result.content
                    .filter(item => item.type === "text")
                    .map(item => item.text)
                    .join("\n");
                console.log(`Response: ${responseText}`);
                // Check if response matches expected
                let passed = false;
                if (test.expectedPartial && responseText.includes(test.expectedPartial)) {
                    passed = true;
                }
                if (passed) {
                    console.log("✅ Test passed");
                    passedTests++;
                }
                else {
                    console.log("❌ Test failed");
                    console.log(`Expected to include: ${test.expectedPartial}`);
                    console.log(`Actual: ${responseText}`);
                }
            }
            catch (error) {
                console.error(`Error in test "${test.name}":`, error);
                console.log("❌ Test failed due to error");
            }
        }
        // Print summary
        console.log(`\nTest summary: ${passedTests}/${testCases.length} tests passed`);
    }
    catch (error) {
        console.error("Error connecting to server:", error);
    }
    finally {
        // Clean up
        console.log("Cleaning up...");
        try {
            await client.close();
        }
        catch (e) {
            console.error("Error closing client:", e);
        }
    }
}
// Run the tests
runTests().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
});
