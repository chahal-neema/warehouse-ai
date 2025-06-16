/**
 * Location Agent A2A Server
 *
 * Warehouse location specialist agent with multi-turn conversation memory
 * and intelligent reasoning capabilities using MCP tools.
 */
interface A2AMessage {
    id: string;
    sessionId: string;
    agentId: string;
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}
interface A2AResponse {
    id: string;
    sessionId: string;
    agentId: string;
    content: string;
    reasoning?: string[];
    toolCalls?: Array<{
        tool: string;
        params: any;
        result: any;
    }>;
    timestamp: Date;
    status: 'success' | 'error' | 'partial';
}
interface AgentCard {
    agentId: string;
    name: string;
    description: string;
    expertise: string[];
    capabilities: string[];
    version: string;
    skills: string[];
}
interface AgentManifest {
    agentId: string;
    name: string;
    description: string;
    version: string;
    tools: Array<{
        name: string;
        description: string;
        intentTags: string[];
        schema: any;
    }>;
    capabilities: string[];
    expertise: string[];
    healthEndpoint: string;
    status: string;
}
declare class LocationAgentServer {
    private agentCard;
    private conversations;
    private isRunning;
    private mcpReady;
    constructor();
    start(): Promise<void>;
    stop(): Promise<void>;
    processMessage(message: A2AMessage): Promise<A2AResponse>;
    getAgentCard(): AgentCard;
    healthCheck(): Promise<{
        status: string;
        details: Record<string, any>;
    }>;
    getManifest(): AgentManifest;
    private initializeMCPTools;
    private registerA2AServer;
    private getOrCreateMemory;
    private processWarehouseQuery;
    private planAndExecuteQuery;
    private handleRankingQuery;
    private handleCountQuery;
    private handleLocationQuery;
    private handleAreaQuery;
    private handleComparisonQuery;
    private handleExplanationQuery;
    private handleSummaryQuery;
    private handleFlexibleQuery;
    private analyzeQuery;
    private handleProductLocationQuery;
    private handleAreaInventoryQuery;
    private handleSpaceAnalysisQuery;
    private handleExpirationQuery;
    private handleLicensePlateQuery;
    private handleStatusSearchQuery;
    private handleQuantityAnalysisQuery;
    private handleGeneralQuery;
    private updateConversationContext;
    private getIntentTagsForTool;
    private generateId;
}
export declare const locationAgent: LocationAgentServer;
export {};
//# sourceMappingURL=server.d.ts.map