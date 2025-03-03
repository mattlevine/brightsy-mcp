/**
 * This script builds and runs all the test scripts.
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
// Configuration
const AGENT_ID = "9eace707-acb5-457b-b2fd-4a6e9807e7ad";
const API_KEY = "d2c23514-93c4-4dda-bd28-b77ec62fe7b2";
const TOOL_NAME = "brightsy";
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
}
catch (error) {
    console.error("MCP stdio server tests failed:", error);
}
console.log("\n=== Running direct MCP protocol test ===");
try {
    execSync("node dist/test-direct.js", {
        stdio: "inherit",
        timeout: 60000, // 60 second timeout
        env
    });
}
catch (error) {
    console.error("Direct MCP protocol test failed:", error);
}
console.log("\nAll tests completed.");
