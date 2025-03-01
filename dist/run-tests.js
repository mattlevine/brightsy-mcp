/**
 * This script builds and runs all the test scripts.
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
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
}
catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
}
// Check for required environment variables
if (!process.env.AGENT_ID || !process.env.API_KEY) {
    console.warn("\nWarning: AGENT_ID and/or API_KEY environment variables are not set.");
    console.warn("Tests will use placeholder values and will likely fail to connect to a real agent.");
    console.warn("Set these environment variables before running the tests:\n");
    console.warn("  export AGENT_ID=your-agent-id");
    console.warn("  export API_KEY=your-api-key");
    console.warn("  export TOOL_NAME=custom-tool-name (optional, defaults to 'brightsy' or 'agent-proxy' depending on the test)\n");
}
// Display tool name information
const toolName = process.env.TOOL_NAME || "(default)";
console.warn(`Using tool name: ${toolName}`);
console.warn("You can customize the tool name with the TOOL_NAME environment variable.\n");
// Run the tests
console.log("\n=== Running command-line test ===");
try {
    execSync("node dist/test-agent-proxy.js", {
        stdio: "inherit",
        timeout: 30000 // 30 second timeout
    });
}
catch (error) {
    console.error("Command-line test failed:", error);
}
console.log("\n=== Running direct MCP protocol test ===");
try {
    execSync("node dist/test-direct.js", {
        stdio: "inherit",
        timeout: 30000 // 30 second timeout
    });
}
catch (error) {
    console.error("Direct MCP protocol test failed:", error);
}
console.log("\nAll tests completed.");
