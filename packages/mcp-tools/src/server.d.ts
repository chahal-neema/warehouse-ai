/**
 * MCP Server for Warehouse AI Inventory Tools
 *
 * Since mcp-sdk is not available, this is a mock/stub implementation
 * that provides the same interface for our inventory tools.
 */
interface MCPTool {
    name: string;
    description: string;
    inputSchema: any;
    handler: (params: any) => Promise<any>;
}
declare class MCPServer {
    private tools;
    addTool(tool: MCPTool): void;
    callTool(name: string, params: any): Promise<any>;
    listTools(): string[];
    getAllTools(): MCPTool[];
    getToolInfo(name: string): MCPTool | undefined;
}
export declare const mcpServer: MCPServer;
export declare function startMCPServer(): Promise<void>;
export declare function stopMCPServer(): Promise<void>;
export type { MCPTool };
//# sourceMappingURL=server.d.ts.map