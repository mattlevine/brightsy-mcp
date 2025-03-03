import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";
// Configuration
const TEST_AGENT_ID = "9eace707-acb5-457b-b2fd-4a6e9807e7ad";
const TEST_API_KEY = "d2c23514-93c4-4dda-bd28-b77ec62fe7b2";
const TOOL_NAME = "brightsy";
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
