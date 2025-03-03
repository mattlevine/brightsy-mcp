import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Get command line arguments
const args = process.argv.slice(2);
let agent_id = undefined;
let api_key = undefined;
let initialMessage = undefined;
let tool_name = process.env.BRIGHTSY_TOOL_NAME || "brightsy";
// Parse command-line arguments
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    // Handle arguments with equals sign (--key=value)
    if (arg.startsWith('--') && arg.includes('=')) {
        const [key, value] = arg.substring(2).split('=', 2);
        if (key === 'agent-id' || key === 'agent_id') {
            agent_id = value;
        }
        else if (key === 'api-key' || key === 'api_key') {
            api_key = value;
        }
        else if (key === 'message') {
            initialMessage = value;
        }
        else if (key === 'tool-name' || key === 'tool_name') {
            tool_name = value;
        }
    }
    // Handle arguments with space (--key value)
    else if (arg.startsWith('--')) {
        const key = arg.substring(2);
        const nextArg = i + 1 < args.length ? args[i + 1] : undefined;
        if (nextArg && !nextArg.startsWith('--')) {
            if (key === 'agent-id' || key === 'agent_id') {
                agent_id = nextArg;
            }
            else if (key === 'api-key' || key === 'api_key') {
                api_key = nextArg;
            }
            else if (key === 'message') {
                initialMessage = nextArg;
            }
            else if (key === 'tool-name' || key === 'tool_name') {
                tool_name = nextArg;
            }
            i++; // Skip the next argument as we've used it as a value
        }
    }
    // Handle positional arguments
    else if (agent_id === undefined) {
        agent_id = arg;
    }
    else if (api_key === undefined) {
        api_key = arg;
    }
    else if (tool_name === undefined) {
        tool_name = arg;
    }
    else if (initialMessage === undefined) {
        initialMessage = arg;
    }
}
// Check for environment variables if not provided via command line
if (!agent_id) {
    agent_id = process.env.BRIGHTSY_AGENT_ID;
}
if (!api_key) {
    api_key = process.env.BRIGHTSY_API_KEY;
}
console.error(`Parsed arguments: agent_id=${agent_id}, tool_name=${tool_name}, message=${initialMessage ? 'provided' : 'not provided'}`);
if (!agent_id || !api_key) {
    console.error('Usage: node dist/index.js <agent_id> <api_key> [tool_name] [message]');
    console.error('   or: node dist/index.js --agent-id=<agent_id> --api-key=<api_key> [--tool-name=<tool_name>] [--message=<message>]');
    console.error('   or: node dist/index.js --agent-id <agent_id> --api-key <api_key> [--tool-name <tool_name>] [--message <message>]');
    console.error('');
    console.error('Environment variables:');
    console.error('   BRIGHTSY_AGENT_ID: Agent ID (alternative to command line argument)');
    console.error('   BRIGHTSY_API_KEY: API Key (alternative to command line argument)');
    console.error('   BRIGHTSY_TOOL_NAME: Tool name (default: brightsy)');
    console.error('   BRIGHTSY_AGENT_API_URL: Base URL for agent API (default: https://brightsy.ai)');
    process.exit(1);
}
// Create server instance
const server = new McpServer({
    name: "brightsy-mcp",
    version: "1.0.0",
});
// Initialize conversation history
let conversationHistory = [];
// Get the agent API base URL from environment variable or use default
const agentApiBaseUrl = process.env.BRIGHTSY_AGENT_API_URL || 'https://brightsy.ai';
// Helper function to process content from the agent response
function processContent(content) {
    if (!content) {
        return [{ type: "text", text: "No content in response" }];
    }
    // If content is a string, return it as text
    if (typeof content === 'string') {
        return [{ type: "text", text: content }];
    }
    // If content is an array, process each item
    if (Array.isArray(content)) {
        return content.map(item => {
            if (typeof item === 'string') {
                return { type: "text", text: item };
            }
            // Handle content blocks (text, image, etc.)
            if (item.text) {
                return { type: "text", text: item.text };
            }
            // For other types, convert to string representation
            return {
                type: "text",
                text: `[${item.type} content: ${JSON.stringify(item)}]`
            };
        });
    }
    // If we can't process it, return a string representation
    return [{ type: "text", text: JSON.stringify(content) }];
}
// Register the agent proxy tool
server.tool(tool_name, `Proxy requests to an Brightsy AI agent`, {
    messages: z.array(z.object({
        role: z.string().describe("The role of the message sender"),
        content: z.union([z.string(), z.array(z.any())]).describe("The content of the message")
    })).describe("The messages to send to the agent")
}, async ({ messages }) => {
    try {
        console.error(`Agent proxy tool called with messages:`);
        console.error(JSON.stringify(messages, null, 2));
        // Check for special command to clear history
        if (messages.length === 1 &&
            messages[0].role === 'user' &&
            typeof messages[0].content === 'string' &&
            messages[0].content.trim().toLowerCase() === 'clear history') {
            conversationHistory = [];
            console.error('Conversation history cleared');
            return {
                content: [
                    {
                        type: "text",
                        text: "Conversation history has been cleared.",
                    },
                ],
            };
        }
        // Check for test commands
        if (messages.length === 1 &&
            messages[0].role === 'user' &&
            typeof messages[0].content === 'string') {
            const content = messages[0].content.trim();
            // Add the message to conversation history before processing
            conversationHistory = [...conversationHistory, messages[0]];
            // Handle test:echo command
            if (content.startsWith('test:echo ')) {
                const message = content.substring('test:echo '.length);
                return {
                    content: [
                        {
                            type: "text",
                            text: "```\n" + message + "\n```"
                        }
                    ]
                };
            }
            // Handle test:history command
            if (content === 'test:history') {
                console.error(`Checking history with ${conversationHistory.length} messages:`);
                conversationHistory.forEach((msg, i) => {
                    console.error(`[${i}] ${msg.role}: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`);
                });
                if (conversationHistory.length > 1) {
                    // Find the first non-history-check message
                    for (let i = 0; i < conversationHistory.length - 1; i++) {
                        const msg = conversationHistory[i];
                        console.error(`Checking message ${i}: ${msg.role} - ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`);
                        if (msg.role === 'user' && typeof msg.content === 'string' && !msg.content.includes('test:history')) {
                            console.error(`Found message: ${msg.content}`);
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: msg.content
                                    }
                                ]
                            };
                        }
                    }
                }
                console.error('No suitable message found in history');
                return {
                    content: [
                        {
                            type: "text",
                            text: "I notice you want to test something related to history"
                        }
                    ]
                };
            }
            // Handle test:simulate command
            if (content.startsWith('test:simulate ')) {
                const message = content.substring('test:simulate '.length);
                return {
                    content: [
                        {
                            type: "text",
                            text: message
                        }
                    ]
                };
            }
        }
        // Add new messages to conversation history (for non-test commands)
        conversationHistory = [...conversationHistory, ...messages];
        console.error(`Using conversation history with ${conversationHistory.length} messages`);
        const agentUrl = `${agentApiBaseUrl}/api/v1beta/agent/${agent_id}/chat/completion`;
        console.error(`Forwarding request to agent: ${agent_id}`);
        console.error(`Agent URL: ${agentUrl}`);
        const requestBody = {
            messages: conversationHistory,
            stream: false
        };
        console.error(`Request body: ${JSON.stringify(requestBody, null, 2)}`);
        const response = await fetch(agentUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${api_key}`
            },
            body: JSON.stringify(requestBody)
        });
        console.error(`Response status: ${response.status} ${response.statusText}`);
        console.error(`Response headers: ${JSON.stringify(Object.fromEntries([...response.headers]), null, 2)}`);
        // Clone the response to log the raw response body
        const responseClone = response.clone();
        const rawResponseText = await responseClone.text();
        console.error(`Raw response body: ${rawResponseText}`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error from agent: ${response.status} ${errorText}`);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error from agent: ${errorText}`,
                    },
                ],
            };
        }
        // Try to parse the response as JSON
        let data;
        try {
            data = JSON.parse(rawResponseText);
            console.error(`Response received from agent and parsed as JSON`);
        }
        catch (parseError) {
            console.error(`Failed to parse response as JSON: ${parseError}`);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error parsing response: ${parseError}\nRaw response: ${rawResponseText}`,
                    },
                ],
            };
        }
        console.error(`Response data: ${JSON.stringify(data, null, 2)}`);
        // Extract the assistant's response
        const assistantMessage = data.choices?.[0]?.message;
        if (!assistantMessage) {
            console.error(`No assistant message found in response: ${JSON.stringify(data, null, 2)}`);
            return {
                content: [
                    {
                        type: "text",
                        text: "No message in agent response",
                    },
                ],
            };
        }
        console.error(`Assistant message: ${JSON.stringify(assistantMessage, null, 2)}`);
        // Add the assistant's response to the conversation history
        if (assistantMessage) {
            conversationHistory.push({
                role: assistantMessage.role || 'assistant',
                content: assistantMessage.content
            });
            console.error(`Added assistant response to history. History now has ${conversationHistory.length} messages`);
        }
        // Handle the case where content is already an array of content blocks
        if (Array.isArray(assistantMessage.content)) {
            console.error(`Content is an array, processing directly`);
            // Map the content array to the expected format
            const processedContent = assistantMessage.content.map((item) => {
                if (typeof item === 'string') {
                    return { type: "text", text: item };
                }
                // Handle content blocks (text, image, etc.)
                if (item.text) {
                    return { type: "text", text: item.text };
                }
                // For other types, convert to string representation
                return {
                    type: "text",
                    text: `[${item.type || 'unknown'} content: ${JSON.stringify(item)}]`
                };
            });
            console.error(`Directly processed content: ${JSON.stringify(processedContent, null, 2)}`);
            return {
                content: processedContent,
            };
        }
        // Process the content from the assistant's message (for string or other formats)
        const processedContent = processContent(assistantMessage.content);
        console.error(`Processed content: ${JSON.stringify(processedContent, null, 2)}`);
        return {
            content: processedContent,
        };
    }
    catch (error) {
        console.error('Error forwarding request:', error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
        };
    }
});
// If an initial message was provided, process it immediately after server starts
async function processInitialMessage() {
    if (initialMessage) {
        console.error(`Processing initial message: ${initialMessage}`);
        try {
            // Create a messages array with the initial message
            const messages = [
                { role: "user", content: initialMessage }
            ];
            // Add to conversation history
            conversationHistory.push(...messages);
            // Instead of trying to access the tool directly, make a request to the local API
            const agentUrl = `${agentApiBaseUrl}/api/v1beta/agent/${agent_id}/chat/completion`;
            console.error(`Forwarding initial message to agent: ${agent_id}`);
            const requestBody = {
                messages: conversationHistory,
                stream: false
            };
            const response = await fetch(agentUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api_key}`
                },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error from agent: ${response.status} ${errorText}`);
                console.log(`Error from agent: ${errorText}`);
                return;
            }
            const data = await response.json();
            console.error(`Response received from agent`);
            // Extract the assistant's response
            const assistantMessage = data.choices?.[0]?.message;
            if (!assistantMessage) {
                console.log("No message in agent response");
                return;
            }
            // Add the assistant's response to the conversation history
            if (assistantMessage) {
                conversationHistory.push({
                    role: assistantMessage.role || 'assistant',
                    content: assistantMessage.content
                });
                console.error(`Added assistant response to history. History now has ${conversationHistory.length} messages`);
            }
            // Handle the case where content is already an array of content blocks
            if (Array.isArray(assistantMessage.content)) {
                // Map the content array to extract text
                const textOutput = assistantMessage.content
                    .map((item) => {
                    if (typeof item === 'string')
                        return item;
                    if (item.text)
                        return item.text;
                    return JSON.stringify(item);
                })
                    .join("\n");
                console.log(textOutput);
                return;
            }
            // Process and output the content
            const processedContent = processContent(assistantMessage.content);
            const textOutput = processedContent
                .filter(item => item.type === "text")
                .map(item => item.text)
                .join("\n");
            console.log(textOutput);
        }
        catch (error) {
            console.error("Error processing initial message:", error);
            console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
// Start the server
async function main() {
    try {
        const transport = new StdioServerTransport();
        // Add event listeners for process events
        process.on('SIGINT', () => {
            console.error('Received SIGINT signal, shutting down...');
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            console.error('Received SIGTERM signal, shutting down...');
            process.exit(0);
        });
        // Keep stdin open
        process.stdin.resume();
        // Connect to the transport
        console.error(`Connecting to transport...`);
        await server.connect(transport);
        console.error(`Brightsy MCP Server running on stdio`);
        console.error(`Connected to agent: ${agent_id}`);
        console.error(`Registered tool name: ${tool_name}`);
        console.error(`Agent API URL: ${agentApiBaseUrl}`);
        console.error(`Ready to receive requests`);
        // Process initial message if provided
        await processInitialMessage();
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
