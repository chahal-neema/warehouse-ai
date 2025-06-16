/**
 * MCP Server for Warehouse AI Inventory Tools
 *
 * Since mcp-sdk is not available, this is a mock/stub implementation
 * that provides the same interface for our inventory tools.
 */
// Mock MCP Server class
class MCPServer {
    tools = new Map();
    addTool(tool) {
        this.tools.set(tool.name, tool);
        console.log(`✅ Registered MCP tool: ${tool.name}`);
    }
    async callTool(name, params) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool ${name} not found`);
        }
        try {
            console.log(`🔧 Calling tool: ${name}`, params);
            const result = await tool.handler(params);
            console.log(`✅ Tool ${name} completed successfully`);
            return result;
        }
        catch (error) {
            console.error(`❌ Tool ${name} failed:`, error);
            throw error;
        }
    }
    listTools() {
        return Array.from(this.tools.keys());
    }
    getAllTools() {
        return Array.from(this.tools.values());
    }
    getToolInfo(name) {
        return this.tools.get(name);
    }
}
// Create singleton MCP server instance
export const mcpServer = new MCPServer();
// Server lifecycle functions
export async function startMCPServer() {
    try {
        console.log('🚀 Starting MCP Server for Warehouse AI...');
        // Register all inventory tools
        await registerInventoryTools();
        console.log(`✅ MCP Server started with ${mcpServer.listTools().length} tools:`);
        mcpServer.listTools().forEach(toolName => {
            console.log(`   - ${toolName}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start MCP Server:', error);
        throw error;
    }
}
export async function stopMCPServer() {
    try {
        console.log('🛑 Stopping MCP Server...');
        // Cleanup if needed
        console.log('✅ MCP Server stopped');
    }
    catch (error) {
        console.error('❌ Failed to stop MCP Server:', error);
    }
}
// Tool registration function
async function registerInventoryTools() {
    try {
        // Core inventory tools
        const { findProductLocationsTool } = await import('./tools/find-product-locations.js');
        const { getInventoryByAreaTool } = await import('./tools/get-inventory-by-area.js');
        const { analyzeSpaceUtilizationTool } = await import('./tools/analyze-space-utilization.js');
        const { checkExpirationDatesTool } = await import('./tools/check-expiration-dates.js');
        // Extended search tools
        const { findByLicensePlateTool } = await import('./tools/find-by-license-plate.js');
        const { findByPalletIdTool } = await import('./tools/find-by-pallet-id.js');
        const { findByLocationTool } = await import('./tools/find-by-location.js');
        const { inventoryStatusSearchTool } = await import('./tools/inventory-status-search.js');
        const { quantityAnalysisTool } = await import('./tools/quantity-analysis.js');
        // Register core tools
        mcpServer.addTool(findProductLocationsTool);
        mcpServer.addTool(getInventoryByAreaTool);
        mcpServer.addTool(analyzeSpaceUtilizationTool);
        mcpServer.addTool(checkExpirationDatesTool);
        // Register extended tools
        mcpServer.addTool(findByLicensePlateTool);
        mcpServer.addTool(findByPalletIdTool);
        mcpServer.addTool(findByLocationTool);
        mcpServer.addTool(inventoryStatusSearchTool);
        mcpServer.addTool(quantityAnalysisTool);
    }
    catch (error) {
        console.error('❌ Failed to register inventory tools:', error);
        throw error;
    }
}
//# sourceMappingURL=server.js.map