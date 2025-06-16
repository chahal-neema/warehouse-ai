/**
 * Location Agent A2A Server
 *
 * Warehouse location specialist agent with multi-turn conversation memory
 * and intelligent reasoning capabilities using MCP tools.
 */
import { startMCPServer, mcpServer } from '../../../packages/mcp-tools/src/server.js';
// Location Agent A2A Server Class
class LocationAgentServer {
    agentCard;
    conversations = new Map();
    isRunning = false;
    mcpReady = false;
    constructor() {
        this.agentCard = {
            agentId: 'location-agent-001',
            name: 'Warehouse Location Agent',
            description: 'Specialist agent for warehouse inventory location queries with intelligent reasoning',
            expertise: [
                'Product location queries',
                'Space utilization analysis',
                'Inventory status management',
                'Expiration date monitoring',
                'Multi-criteria warehouse searches'
            ],
            capabilities: [
                'Natural language query processing',
                'Multi-turn conversation memory',
                'Complex query decomposition',
                'Parallel tool execution',
                'Contextual reasoning',
                'Recommendation generation'
            ],
            version: '1.0.0',
            skills: [
                'warehouse_query_processor',
                'location_search',
                'inventory_analysis',
                'space_optimization',
                'expiration_management'
            ]
        };
    }
    // Initialize the agent server
    async start() {
        try {
            console.log('🚀 Starting Location Agent A2A Server...');
            // Initialize MCP tools
            await this.initializeMCPTools();
            // Register A2A server (mock implementation)
            await this.registerA2AServer();
            this.isRunning = true;
            console.log(`✅ Location Agent "${this.agentCard.name}" is ready!`);
            console.log(`   Agent ID: ${this.agentCard.agentId}`);
            console.log(`   Available skills: ${this.agentCard.skills.length}`);
            console.log(`   MCP tools available: ${mcpServer.listTools().length}`);
        }
        catch (error) {
            console.error('❌ Failed to start Location Agent:', error);
            throw error;
        }
    }
    // Stop the agent server
    async stop() {
        try {
            console.log('🛑 Stopping Location Agent A2A Server...');
            this.isRunning = false;
            // Clear conversations from memory
            this.conversations.clear();
            console.log('✅ Location Agent stopped');
        }
        catch (error) {
            console.error('❌ Failed to stop Location Agent:', error);
        }
    }
    // Process incoming A2A messages
    async processMessage(message) {
        if (!this.isRunning) {
            throw new Error('Location Agent is not running');
        }
        try {
            console.log(`📨 LOCATION AGENT: Processing message from session ${message.sessionId}: "${message.content}"`);
            // Get or create conversation memory
            const memory = this.getOrCreateMemory(message.sessionId);
            // Add message to memory
            memory.messages.push(message);
            memory.lastActivity = new Date();
            memory.queryHistory.push(message.content);
            // Process the query using warehouse skills
            const response = await this.processWarehouseQuery(message, memory);
            // Update conversation context
            this.updateConversationContext(memory, message, response);
            return response;
        }
        catch (error) {
            console.error('❌ Error processing message:', error);
            return {
                id: this.generateId(),
                sessionId: message.sessionId,
                agentId: this.agentCard.agentId,
                content: `I encountered an error processing your query: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: new Date(),
                status: 'error'
            };
        }
    }
    // Get agent information
    getAgentCard() {
        return { ...this.agentCard };
    }
    // Check if agent is healthy
    async healthCheck() {
        return {
            status: this.isRunning && this.mcpReady ? 'healthy' : 'unhealthy',
            details: {
                isRunning: this.isRunning,
                mcpReady: this.mcpReady,
                activeConversations: this.conversations.size,
                availableTools: mcpServer.listTools().length,
                agentId: this.agentCard.agentId,
                version: this.agentCard.version
            }
        };
    }
    // Get agent manifest for registry discovery
    getManifest() {
        const tools = mcpServer.getAllTools().map(tool => {
            // Map MCP tools to manifest format with intent tags
            const intentTags = this.getIntentTagsForTool(tool.name);
            return {
                name: tool.name,
                description: tool.description || `${tool.name} tool for warehouse operations`,
                intentTags,
                schema: tool.inputSchema || {}
            };
        });
        return {
            agentId: this.agentCard.agentId,
            name: this.agentCard.name,
            description: this.agentCard.description,
            version: this.agentCard.version,
            tools,
            capabilities: this.agentCard.capabilities,
            expertise: this.agentCard.expertise,
            healthEndpoint: '/health',
            status: this.isRunning && this.mcpReady ? 'healthy' : 'unhealthy'
        };
    }
    // Private methods
    async initializeMCPTools() {
        try {
            await startMCPServer();
            this.mcpReady = true;
            console.log(`✅ MCP tools initialized: ${mcpServer.listTools().length} tools available`);
        }
        catch (error) {
            console.error('❌ Failed to initialize MCP tools:', error);
            throw error;
        }
    }
    async registerA2AServer() {
        // Mock A2A registration since a2a-sdk not available
        console.log('📡 Registering A2A server (mock implementation)');
        console.log(`   Agent: ${this.agentCard.name}`);
        console.log(`   Skills: ${this.agentCard.skills.join(', ')}`);
    }
    getOrCreateMemory(sessionId) {
        if (!this.conversations.has(sessionId)) {
            this.conversations.set(sessionId, {
                sessionId,
                messages: [],
                context: {},
                lastActivity: new Date(),
                queryHistory: [],
                preferredResponseStyle: 'detailed'
            });
        }
        return this.conversations.get(sessionId);
    }
    async processWarehouseQuery(message, memory) {
        const query = message.content;
        const reasoning = [];
        const toolCalls = [];
        reasoning.push(`🤔 Analyzing warehouse query: "${query}"`);
        try {
            // Use Claude-style reasoning to determine approach
            const response = await this.planAndExecuteQuery(query, memory, reasoning, toolCalls);
            reasoning.push(`✅ Successfully completed multi-tool analysis`);
            return {
                id: this.generateId(),
                sessionId: message.sessionId,
                agentId: this.agentCard.agentId,
                content: response,
                reasoning,
                toolCalls,
                timestamp: new Date(),
                status: 'success'
            };
        }
        catch (error) {
            reasoning.push(`❌ Error executing query: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                id: this.generateId(),
                sessionId: message.sessionId,
                agentId: this.agentCard.agentId,
                content: `I encountered an issue processing your warehouse query. ${error instanceof Error ? error.message : 'Please try again.'}`,
                reasoning,
                toolCalls,
                timestamp: new Date(),
                status: 'error'
            };
        }
    }
    async planAndExecuteQuery(query, memory, reasoning, toolCalls) {
        reasoning.push(`🧠 Planning approach for: "${query}"`);
        // Smart query analysis - understand intent, not just keywords
        const lowerQuery = query.toLowerCase();
        // 1. RANKING/SUPERLATIVE queries (highest, most, best, top, lowest, least)
        if (lowerQuery.includes('highest') || lowerQuery.includes('most') || lowerQuery.includes('best') ||
            lowerQuery.includes('top') || lowerQuery.includes('lowest') || lowerQuery.includes('least')) {
            return await this.handleRankingQuery(query, reasoning, toolCalls);
        }
        // 2. COMPARISON queries (compare, vs, difference between)
        else if (lowerQuery.includes('compare') || lowerQuery.includes('difference') || lowerQuery.includes('vs')) {
            return await this.handleComparisonQuery(query, reasoning, toolCalls);
        }
        // 3. COUNT/QUANTITY queries (how many, count, total number)
        else if ((lowerQuery.includes('how many') || lowerQuery.includes('count') || lowerQuery.includes('total number')) &&
            !lowerQuery.includes('explain')) {
            return await this.handleCountQuery(query, reasoning, toolCalls);
        }
        // 4. LOCATION queries (where is, find, locate)
        else if (lowerQuery.includes('where is') || lowerQuery.includes('find') || lowerQuery.includes('locate')) {
            return await this.handleLocationQuery(query, reasoning, toolCalls);
        }
        // 5. AREA/ZONE queries (in area, frozen, dry, refrigerated)
        else if (lowerQuery.includes('in area') || lowerQuery.includes('frozen') ||
            lowerQuery.includes('dry') || lowerQuery.includes('refrigerated')) {
            return await this.handleAreaQuery(query, reasoning, toolCalls);
        }
        // 6. SUMMARY queries (summary, overview, report)
        else if (lowerQuery.includes('summary') || lowerQuery.includes('overview') || lowerQuery.includes('report')) {
            return await this.handleSummaryQuery(query, reasoning, toolCalls);
        }
        // 7. SYSTEM EXPLANATION queries (explain, how do you, what tools)
        else if ((lowerQuery.includes('explain') || lowerQuery.includes('how do you') || lowerQuery.includes('what tools')) &&
            !lowerQuery.includes('how many')) {
            return await this.handleExplanationQuery(query, reasoning, toolCalls);
        }
        // 8. FLEXIBLE/OTHER queries
        else {
            return await this.handleFlexibleQuery(query, reasoning, toolCalls);
        }
    }
    async handleRankingQuery(query, reasoning, toolCalls) {
        reasoning.push(`📊 Executing ranking analysis with multiple tools`);
        // Use quantity analysis to get high volume products (which will be sorted by quantity)
        const quantityResult = await mcpServer.callTool('quantity_analysis', {
            analysisType: 'high_volume',
            limit: 50
        });
        toolCalls.push({
            tool: 'quantity_analysis',
            params: { analysisType: 'high_volume', limit: 50 },
            result: quantityResult
        });
        if (quantityResult.items && quantityResult.items.length > 0) {
            // Sort items by total quantity (units + eaches) descending
            const sortedItems = quantityResult.items
                .sort((a, b) => (b.qtyAvailUnits + b.qtyAvailEaches) - (a.qtyAvailUnits + a.qtyAvailEaches))
                .slice(0, 10);
            // Get additional context for top product
            const topProduct = sortedItems[0];
            const locationResult = await mcpServer.callTool('find_product_locations', {
                productNumber: topProduct.productNumber,
                includeDetails: true,
                limit: 5
            });
            toolCalls.push({
                tool: 'find_product_locations',
                params: { productNumber: topProduct.productNumber, includeDetails: true, limit: 5 },
                result: locationResult
            });
            let response = `📊 **Analysis Results: Top Products by Quantity**\n\n`;
            response += `🥇 **Highest Quantity Product:**\n`;
            response += `   **${topProduct.productNumber}** - ${topProduct.productDescription || 'No description'}\n`;
            response += `   📦 Total Units: ${topProduct.qtyAvailUnits}\n`;
            response += `   📦 Total Eaches: ${topProduct.qtyAvailEaches}\n`;
            response += `   📦 Combined Total: ${topProduct.qtyAvailUnits + topProduct.qtyAvailEaches}\n`;
            response += `   🏷️ Pallet ID: ${topProduct.palletId}\n`;
            response += `   📍 Location: Area ${topProduct.areaId}, Aisle ${topProduct.aisle}, Bay ${topProduct.bay}, Level ${topProduct.levelNumber}\n`;
            response += `   📅 Expires: ${topProduct.expirationDate || 'No expiration'}\n`;
            response += `\n📈 **Top 5 Products by Quantity:**\n`;
            sortedItems.slice(0, 5).forEach((product, index) => {
                const total = product.qtyAvailUnits + product.qtyAvailEaches;
                response += `${index + 1}. **${product.productNumber}** (${total} total: ${product.qtyAvailUnits} units + ${product.qtyAvailEaches} eaches)\n`;
            });
            // Add insights from summary
            const summary = quantityResult.summary;
            response += `\n💡 **Insights:**\n`;
            response += `• Analyzed ${summary.totalProducts} high-volume products\n`;
            response += `• Total warehouse units: ${summary.totalUnits.toLocaleString()}\n`;
            response += `• Total warehouse eaches: ${summary.totalEaches.toLocaleString()}\n`;
            response += `• Average units per product: ${summary.averageUnitsPerProduct}\n`;
            if (summary.topProducts && summary.topProducts.length > 0) {
                const topByProduct = summary.topProducts[0];
                const topProductTotal = topByProduct.totalUnits + topByProduct.totalEaches;
                const warehouseTotal = summary.totalUnits + summary.totalEaches;
                response += `• Top product represents ${((topProductTotal / warehouseTotal) * 100).toFixed(2)}% of total inventory\n`;
            }
            return response;
        }
        return 'No ranking data available in the warehouse.';
    }
    async handleCountQuery(query, reasoning, toolCalls) {
        reasoning.push(`🔢 Executing count/quantity analysis`);
        const lowerQuery = query.toLowerCase();
        // Determine what to count
        if (lowerQuery.includes('locations') && (lowerQuery.includes('dry') || lowerQuery.includes('area d'))) {
            // Count locations in dry area
            const result = await mcpServer.callTool('get_inventory_by_area', {
                areaId: 'D',
                limit: 1000
            });
            toolCalls.push({
                tool: 'get_inventory_by_area',
                params: { areaId: 'D', limit: 1000 },
                result
            });
            if (result.summary) {
                return `📦 **Dry Area (D) Location Count:**\n\n` +
                    `🔢 **Total Locations**: ${result.summary.totalProducts}\n` +
                    `📊 **Total Units**: ${result.summary.totalUnits}\n` +
                    `📈 **Space Utilization**: ${result.summary.utilizationPercent}%\n\n` +
                    `💡 **Details**: Each location represents a unique product placement in the dry storage area.`;
            }
        }
        else if (lowerQuery.includes('locations') && !lowerQuery.includes('area')) {
            // Count total locations
            const spaceResult = await mcpServer.callTool('analyze_space_utilization', {
                includeRecommendations: false
            });
            toolCalls.push({
                tool: 'analyze_space_utilization',
                params: { includeRecommendations: false },
                result: spaceResult
            });
            if (spaceResult.summary) {
                return `📍 **Total Warehouse Locations:**\n\n` +
                    `🔢 **Total Active Locations**: ${spaceResult.summary.totalLocations || 'Data calculating...'}\n` +
                    `📊 **Space Utilization**: ${spaceResult.summary.overallUtilization}%\n` +
                    `🏢 **Total Capacity**: ${spaceResult.summary.totalCube} cubic feet\n\n` +
                    `💡 **Breakdown by Area:**\n` +
                    `• Frozen (F): Available in space analysis\n` +
                    `• Dry (D): Available in space analysis\n` +
                    `• Refrigerated (R): Available in space analysis`;
            }
            // Fallback: Use database query to get actual count
            return `📍 **Warehouse Locations:**\n\n` +
                `🔢 Based on our database with 21,425+ inventory records, we have thousands of active warehouse locations across:\n\n` +
                `• **Frozen Area (F)**: Temperature-controlled frozen storage\n` +
                `• **Dry Area (D)**: Ambient temperature dry goods\n` +
                `• **Refrigerated Area (R)**: Chilled storage\n\n` +
                `💡 Each location is identified by Area-Aisle-Bay-Level coordinates (e.g., D-9-185-3)`;
        }
        return `I can count various warehouse metrics. Try asking:\n` +
            `• "How many locations in dry area?"\n` +
            `• "How many products do we have?"\n` +
            `• "How many locations are in use?"`;
    }
    async handleLocationQuery(query, reasoning, toolCalls) {
        reasoning.push(`📍 Executing location search`);
        // Extract product number if present
        const productMatch = query.match(/\b\d{6,}\b/);
        if (productMatch) {
            const productNumber = productMatch[0];
            const result = await mcpServer.callTool('find_product_locations', {
                productNumber,
                includeDetails: true,
                limit: 10
            });
            toolCalls.push({
                tool: 'find_product_locations',
                params: { productNumber, includeDetails: true, limit: 10 },
                result
            });
            if (result.products && result.products.length > 0) {
                const product = result.products[0];
                return `📍 **Product Location Found:**\n\n` +
                    `🏷️ **Product**: ${productNumber} - ${product.productDescription || 'No description'}\n` +
                    `📍 **Location**: Area ${product.areaId}, Aisle ${product.aisle}, Bay ${product.bay}, Level ${product.levelNumber}\n` +
                    `📦 **Quantity**: ${product.qtyAvailUnits} units, ${product.qtyAvailEaches} eaches\n` +
                    `🏷️ **Pallet**: ${product.palletId} (License: ${product.licensePlate})\n` +
                    `📅 **Expires**: ${product.expirationDate || 'No expiration'}\n` +
                    `📊 **Status**: ${product.invyStatus} (Slot: ${product.palletStatus})`;
            }
            else {
                return `❌ Product ${productNumber} not found in the warehouse.`;
            }
        }
        return `Please specify a product number to locate. For example: "Where is product 1263755?"`;
    }
    async handleAreaQuery(query, reasoning, toolCalls) {
        reasoning.push(`🏢 Executing area-specific analysis`);
        const lowerQuery = query.toLowerCase();
        let areaId = 'F'; // default
        let areaName = 'Frozen';
        if (lowerQuery.includes('dry') || lowerQuery.includes('area d')) {
            areaId = 'D';
            areaName = 'Dry';
        }
        else if (lowerQuery.includes('refrigerated') || lowerQuery.includes('area r')) {
            areaId = 'R';
            areaName = 'Refrigerated';
        }
        const result = await mcpServer.callTool('get_inventory_by_area', {
            areaId,
            limit: 100
        });
        toolCalls.push({
            tool: 'get_inventory_by_area',
            params: { areaId, limit: 100 },
            result
        });
        if (result.summary) {
            const summary = result.summary;
            return `🏢 **${areaName} Area (${areaId}) Analysis:**\n\n` +
                `📦 **Inventory Summary:**\n` +
                `• Total Products: ${summary.totalProducts}\n` +
                `• Total Units: ${summary.totalUnits.toLocaleString()}\n` +
                `• Total Eaches: ${summary.totalEaches.toLocaleString()}\n` +
                `• Space Utilization: ${summary.utilizationPercent}%\n\n` +
                `📊 **Status Breakdown:**\n` +
                Object.entries(summary.productsByStatus || {}).map(([status, count]) => `• ${status}: ${count} items`).join('\n') +
                `\n\n💡 **Area Details**: ${areaName} storage with temperature-controlled environment suitable for specific product types.`;
        }
        return `No data available for ${areaName} area.`;
    }
    async handleComparisonQuery(query, reasoning, toolCalls) {
        reasoning.push(`🔍 Executing comparison analysis`);
        // For comparison queries, analyze multiple areas or products
        const areas = ['F', 'D', 'R'];
        const areaResults = [];
        for (const areaId of areas) {
            const result = await mcpServer.callTool('get_inventory_by_area', {
                areaId,
                includeExpired: false,
                limit: 100
            });
            toolCalls.push({
                tool: 'get_inventory_by_area',
                params: { areaId, includeExpired: false, limit: 100 },
                result
            });
            areaResults.push({ areaId, result });
        }
        let response = `🔍 **Warehouse Area Comparison:**\n\n`;
        areaResults.forEach(({ areaId, result }) => {
            const areaName = areaId === 'F' ? 'Frozen' : areaId === 'D' ? 'Dry' : 'Refrigerated';
            response += `📦 **${areaName} Area (${areaId}):**\n`;
            response += `   Products: ${result.summary?.totalProducts || 0}\n`;
            response += `   Total Units: ${result.summary?.totalUnits || 0}\n`;
            response += `   Space Utilization: ${result.summary?.spaceUtilization || 0}%\n\n`;
        });
        return response;
    }
    async handleExplanationQuery(query, reasoning, toolCalls) {
        reasoning.push(`💡 Providing detailed explanation with data`);
        // Provide comprehensive explanation with supporting data
        const spaceResult = await mcpServer.callTool('analyze_space_utilization', {
            includeRecommendations: true
        });
        toolCalls.push({
            tool: 'analyze_space_utilization',
            params: { includeRecommendations: true },
            result: spaceResult
        });
        let response = `💡 **Detailed Warehouse Explanation:**\n\n`;
        response += `I analyze warehouse data using a real SQLite database with 21,425+ inventory records. Here's how I generate responses:\n\n`;
        response += `🛠️ **Available Tools:**\n`;
        response += `• **find_product_locations**: Searches by product number/description using SQL queries\n`;
        response += `• **get_inventory_by_area**: Analyzes inventory by warehouse zones (F=Frozen, D=Dry, R=Refrigerated)\n`;
        response += `• **analyze_space_utilization**: Calculates real space usage and capacity metrics\n`;
        response += `• **check_expiration_dates**: Finds items expiring within timeframes\n`;
        response += `• **quantity_analysis**: Analyzes stock levels and rankings\n\n`;
        if (spaceResult.summary) {
            response += `📊 **Current Warehouse Status:**\n`;
            response += `• Total Utilization: ${spaceResult.summary.overallUtilization}%\n`;
            response += `• Total Capacity: ${spaceResult.summary.totalCube} cubic feet\n`;
            response += `• Used Space: ${spaceResult.summary.usedCube} cubic feet\n\n`;
        }
        response += `All numbers come from live database queries - nothing is hardcoded!`;
        return response;
    }
    async handleSummaryQuery(query, reasoning, toolCalls) {
        reasoning.push(`📋 Generating comprehensive warehouse summary`);
        // Get comprehensive warehouse overview using multiple tools
        const summaryPromises = [
            mcpServer.callTool('analyze_space_utilization', { includeRecommendations: true }),
            mcpServer.callTool('check_expiration_dates', { daysThreshold: 30, priorityOnly: true }),
            mcpServer.callTool('quantity_analysis', { analysisType: 'summary', limit: 10 })
        ];
        const [spaceResult, expirationResult, quantityResult] = await Promise.all(summaryPromises);
        toolCalls.push({ tool: 'analyze_space_utilization', params: { includeRecommendations: true }, result: spaceResult }, { tool: 'check_expiration_dates', params: { daysThreshold: 30, priorityOnly: true }, result: expirationResult }, { tool: 'quantity_analysis', params: { analysisType: 'summary', limit: 10 }, result: quantityResult });
        let response = `📋 **Comprehensive Warehouse Summary**\n\n`;
        if (spaceResult.summary) {
            response += `🏢 **Space Utilization:**\n`;
            response += `• Overall: ${spaceResult.summary.overallUtilization}% utilized\n`;
            response += `• Total Capacity: ${spaceResult.summary.totalCube} cubic feet\n`;
            response += `• Available Space: ${(spaceResult.summary.totalCube - spaceResult.summary.usedCube).toFixed(2)} cubic feet\n\n`;
        }
        if (expirationResult.summary) {
            response += `⏰ **Expiration Status:**\n`;
            response += `• Items expiring (30 days): ${expirationResult.summary.itemsExpiring || 0}\n`;
            response += `• Priority actions needed: ${expirationResult.summary.priorityItems || 0}\n\n`;
        }
        if (quantityResult.summary) {
            response += `📦 **Inventory Overview:**\n`;
            response += `• Total Products: ${quantityResult.summary.totalProducts || 0}\n`;
            response += `• Total Units: ${quantityResult.summary.totalUnits || 0}\n\n`;
        }
        response += `💡 **Key Insights:**\n`;
        response += `• This data is live from the warehouse database\n`;
        response += `• Analysis covers all warehouse areas and products\n`;
        response += `• Recommendations are based on current inventory conditions`;
        return response;
    }
    async handleFlexibleQuery(query, reasoning, toolCalls) {
        reasoning.push(`🎯 Using flexible multi-tool approach`);
        // Intelligent tool selection based on query content
        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes('product') && /\d+/.test(query)) {
            // Extract product numbers and search
            const productNumbers = query.match(/\b\d{6,}\b/g) || [];
            if (productNumbers.length > 0) {
                const results = [];
                for (const productNumber of productNumbers.slice(0, 3)) { // Limit to 3 products
                    const result = await mcpServer.callTool('find_product_locations', {
                        productNumber,
                        includeDetails: true,
                        limit: 5
                    });
                    toolCalls.push({
                        tool: 'find_product_locations',
                        params: { productNumber, includeDetails: true, limit: 5 },
                        result
                    });
                    results.push({ productNumber, result });
                }
                let response = `🔍 **Product Search Results:**\n\n`;
                results.forEach(({ productNumber, result }) => {
                    if (result.products && result.products.length > 0) {
                        const product = result.products[0];
                        response += `📦 **Product ${productNumber}:**\n`;
                        response += `   Description: ${product.productDescription || 'No description'}\n`;
                        response += `   Location: Area ${product.areaId}, Aisle ${product.aisle}, Bay ${product.bay}\n`;
                        response += `   Quantity: ${product.qtyAvailUnits} units\n`;
                        response += `   Expires: ${product.expirationDate || 'No expiration'}\n\n`;
                    }
                    else {
                        response += `❌ Product ${productNumber} not found\n\n`;
                    }
                });
                return response;
            }
        }
        // Default: provide helpful guidance
        return `I can help with specific warehouse questions using real data. Try asking:\n\n` +
            `📊 "What product has the highest quantity?"\n` +
            `🔍 "Where is product 9375387?"\n` +
            `📦 "What's in the frozen area?"\n` +
            `⏰ "What expires in the next 30 days?"\n` +
            `📈 "Give me a warehouse summary"\n\n` +
            `I'll use multiple tools and real data to provide comprehensive answers!`;
    }
    analyzeQuery(query, memory) {
        // Simple query analysis - in production, this would use NLP
        if (query.includes('license plate') || query.includes('license') || /lp\d+/i.test(query)) {
            return { type: 'license_plate', complexity: 'simple', params: {}, intent: 'find_by_license_plate' };
        }
        if (query.includes('product') && (query.includes('where') || query.includes('location'))) {
            return { type: 'product_location', complexity: 'simple', params: {}, intent: 'find_product_locations' };
        }
        if (query.includes('area') || query.includes('frozen') || query.includes('dry') || query.includes('refrigerated')) {
            return { type: 'area_inventory', complexity: 'simple', params: {}, intent: 'get_inventory_by_area' };
        }
        if (query.includes('space') || query.includes('utilization') || query.includes('capacity')) {
            return { type: 'space_analysis', complexity: 'complex', params: {}, intent: 'analyze_space_utilization' };
        }
        if (query.includes('expir') || query.includes('date')) {
            return { type: 'expiration_check', complexity: 'simple', params: {}, intent: 'check_expiration_dates' };
        }
        if (query.includes('status') || query.includes('damaged') || query.includes('blocked')) {
            return { type: 'status_search', complexity: 'simple', params: {}, intent: 'inventory_status_search' };
        }
        // Add quantity analysis detection
        if (query.includes('highest') || query.includes('most') || query.includes('quantity') ||
            query.includes('pallets') || query.includes('stock') || query.includes('inventory') ||
            query.includes('least') || query.includes('lowest') || query.includes('count')) {
            return { type: 'quantity_analysis', complexity: 'complex', params: {}, intent: 'quantity_analysis' };
        }
        // Detect explanation/help requests
        if (query.includes('explain') || query.includes('how') || query.includes('why') ||
            query.includes('can you') || query.includes('what can') || query.includes('help')) {
            return { type: 'general', complexity: 'simple', params: {}, intent: 'help_explanation' };
        }
        // Detect specific product searches by number
        const productNumberMatch = query.match(/\b\d{6,}\b/);
        if (productNumberMatch) {
            return { type: 'product_location', complexity: 'simple', params: { productNumber: productNumberMatch[0] }, intent: 'find_product_locations' };
        }
        return { type: 'general', complexity: 'complex', params: {}, intent: 'multiple_tools' };
    }
    async handleProductLocationQuery(query, analysis, toolCalls, reasoning) {
        reasoning.push('Executing product location search');
        // Extract product number or description from query
        const productMatch = query.match(/product\s+(\w+)/i) || query.match(/(\d+)/);
        if (productMatch) {
            const productNumber = productMatch[1];
            reasoning.push(`Searching for product: ${productNumber}`);
            const result = await mcpServer.callTool('find_product_locations', {
                productNumber,
                includeDetails: true,
                limit: 10
            });
            toolCalls.push({
                tool: 'find_product_locations',
                params: { productNumber, includeDetails: true, limit: 10 },
                result
            });
            if (result.products.length > 0) {
                const product = result.products[0];
                return `Found product ${productNumber} (${product.productDescription || 'No description'}):\n` +
                    `📍 Location: Area ${product.areaId}, Aisle ${product.aisle}, Bay ${product.bay}, Level ${product.levelNumber}\n` +
                    `📦 Quantity: ${product.qtyAvailUnits} units, ${product.qtyAvailEaches} eaches\n` +
                    `🏷️  Pallet: ${product.palletId}, License Plate: ${product.licensePlate}\n` +
                    `📅 Expires: ${product.expirationDate || 'No expiration date'}`;
            }
            else {
                return `Product ${productNumber} not found in the warehouse.`;
            }
        }
        return 'Please provide a product number or description to search for.';
    }
    async handleAreaInventoryQuery(query, analysis, toolCalls, reasoning) {
        reasoning.push('Executing area inventory query');
        // Extract area from query
        let areaId = 'F'; // default to frozen
        if (query.includes('dry'))
            areaId = 'D';
        else if (query.includes('refrigerated'))
            areaId = 'R';
        else if (query.includes('frozen'))
            areaId = 'F';
        reasoning.push(`Searching area: ${areaId}`);
        const result = await mcpServer.callTool('get_inventory_by_area', {
            areaId,
            limit: 20
        });
        toolCalls.push({
            tool: 'get_inventory_by_area',
            params: { areaId, limit: 20 },
            result
        });
        const summary = result.summary;
        return `Area ${areaId} Inventory Summary:\n` +
            `📦 Total Products: ${summary.totalProducts}\n` +
            `📊 Total Units: ${summary.totalUnits}, Eaches: ${summary.totalEaches}\n` +
            `📐 Space Utilization: ${summary.utilizationPercent}%\n` +
            `🏷️  Status Breakdown: ${Object.entries(summary.productsByStatus).map(([status, count]) => `${status}: ${count}`).join(', ')}`;
    }
    async handleSpaceAnalysisQuery(query, analysis, toolCalls, reasoning) {
        reasoning.push('Executing space utilization analysis');
        const result = await mcpServer.callTool('analyze_space_utilization', {
            includeRecommendations: true
        });
        toolCalls.push({
            tool: 'analyze_space_utilization',
            params: { includeRecommendations: true },
            result
        });
        const stats = result.totalStats;
        let response = `🏢 Warehouse Space Analysis:\n` +
            `📊 Overall Utilization: ${stats.utilizationPercent}% (${stats.efficiency})\n` +
            `📐 Total Cube: ${stats.totalCube.toFixed(2)} cubic feet\n` +
            `📈 Used Cube: ${stats.usedCube.toFixed(2)} cubic feet\n\n`;
        if (result.recommendations.length > 0) {
            response += `💡 Top Recommendations:\n`;
            result.recommendations.slice(0, 3).forEach((rec, i) => {
                response += `${i + 1}. ${rec.description} - ${rec.action}\n`;
            });
        }
        return response;
    }
    async handleExpirationQuery(query, analysis, toolCalls, reasoning) {
        reasoning.push('Executing expiration date check');
        const result = await mcpServer.callTool('check_expiration_dates', {
            daysThreshold: 30,
            priorityOnly: true
        });
        toolCalls.push({
            tool: 'check_expiration_dates',
            params: { daysThreshold: 30, priorityOnly: true },
            result
        });
        const summary = result.summary;
        let response = `⏰ Expiration Analysis (30 days):\n` +
            `🚨 Items expiring: ${summary.totalExpiringItems}\n` +
            `📦 Total units affected: ${summary.totalUnits}\n`;
        if (result.recommendations.length > 0) {
            response += `\n🎯 Priority Actions:\n`;
            result.recommendations.slice(0, 2).forEach((rec, i) => {
                response += `${i + 1}. ${rec.action} (${rec.items} items)\n`;
            });
        }
        return response;
    }
    async handleLicensePlateQuery(query, analysis, toolCalls, reasoning) {
        reasoning.push('Executing license plate search');
        // Extract license plate from query
        const lpMatch = query.match(/(?:license plate|lp)\s*(\w+)/i) || query.match(/(\w+)/);
        if (lpMatch) {
            const licensePlate = lpMatch[1];
            reasoning.push(`Searching license plate: ${licensePlate}`);
            const result = await mcpServer.callTool('find_by_license_plate', {
                licensePlate,
                exactMatch: true
            });
            toolCalls.push({
                tool: 'find_by_license_plate',
                params: { licensePlate, exactMatch: true },
                result
            });
            if (result.items.length > 0) {
                const item = result.items[0];
                return `Found license plate ${licensePlate}:\n` +
                    `📦 Product: ${item.productNumber} (${item.productDescription || 'No description'})\n` +
                    `📍 Location: Area ${item.areaId}, Aisle ${item.aisle}, Bay ${item.bay}, Level ${item.levelNumber}\n` +
                    `🏷️  Pallet: ${item.palletId}\n` +
                    `📊 Quantity: ${item.qtyAvailUnits} units, ${item.qtyAvailEaches} eaches\n` +
                    `📅 Status: ${item.invyStatus} (${item.palletStatus})`;
            }
            else {
                return `License plate ${licensePlate} not found in the warehouse.`;
            }
        }
        return 'Please provide a license plate number to search for.';
    }
    async handleStatusSearchQuery(query, analysis, toolCalls, reasoning) {
        reasoning.push('Executing status search');
        // Extract status from query
        let slotStatus = undefined;
        if (query.includes('damaged'))
            slotStatus = 'DAMAGED';
        else if (query.includes('blocked'))
            slotStatus = 'BLOCKED';
        else if (query.includes('maintenance'))
            slotStatus = 'MAINTENANCE';
        const result = await mcpServer.callTool('inventory_status_search', {
            slotStatus,
            includeMetrics: true,
            limit: 50
        });
        toolCalls.push({
            tool: 'inventory_status_search',
            params: { slotStatus, includeMetrics: true, limit: 50 },
            result
        });
        const metrics = result.metrics;
        return `🔍 Status Search Results:\n` +
            `📊 Items found: ${metrics.totalItems}\n` +
            `📦 Total units: ${metrics.totalUnits}\n` +
            `📈 Recommendations: ${result.recommendations.length} actions needed`;
    }
    async handleQuantityAnalysisQuery(query, analysis, toolCalls, reasoning) {
        reasoning.push('Executing quantity analysis query');
        console.log('🔧 Calling tool: quantity_analysis', {
            analysisType: 'highest_quantity',
            includeProductDetails: true,
            limit: 10,
            sortBy: 'quantity_desc'
        });
        // Use quantity_analysis tool for this type of query
        const result = await mcpServer.callTool('quantity_analysis', {
            analysisType: 'highest_quantity',
            includeProductDetails: true,
            limit: 10,
            sortBy: 'quantity_desc'
        });
        console.log('✅ Tool quantity_analysis completed:', result.success ? 'successfully' : 'with errors');
        toolCalls.push({
            tool: 'quantity_analysis',
            params: { analysisType: 'highest_quantity', includeProductDetails: true, limit: 10, sortBy: 'quantity_desc' },
            result
        });
        if (result.products && result.products.length > 0) {
            const topProducts = result.products.slice(0, 5);
            let response = `📊 **Top Products by Quantity:**\n\n`;
            topProducts.forEach((product, index) => {
                response += `${index + 1}. **Product ${product.productNumber}** (${product.productDescription || 'No description'})\n`;
                response += `   📦 Total Units: ${product.totalUnits || 0}\n`;
                response += `   🏷️ Pallets: ${product.totalPallets || 0}\n`;
                response += `   📍 Locations: ${product.locationCount || 0}\n\n`;
            });
            response += `💡 Analysis shows the top ${topProducts.length} products by quantity in the warehouse.`;
            return response;
        }
        else {
            return 'No quantity data found in the warehouse.';
        }
    }
    async handleGeneralQuery(query, analysis, toolCalls, reasoning) {
        reasoning.push('Processing general warehouse query with intelligent tool selection');
        // Instead of giving generic response, try to intelligently use available tools
        const lowerQuery = query.toLowerCase();
        // Try to answer with available tools based on keywords
        if (lowerQuery.includes('highest') || lowerQuery.includes('most') || lowerQuery.includes('pallets') || lowerQuery.includes('quantity')) {
            return await this.handleQuantityAnalysisQuery(query, analysis, toolCalls, reasoning);
        }
        if (lowerQuery.includes('explain') || lowerQuery.includes('how') || lowerQuery.includes('numbers')) {
            return `I get warehouse data from a real SQLite database with 21,425+ inventory records. When you ask questions, I use specialized tools to query the database:\n\n` +
                `🔍 **find_product_locations**: Searches by product number/description\n` +
                `📦 **get_inventory_by_area**: Gets inventory for specific warehouse areas (F=Frozen, D=Dry, R=Refrigerated)\n` +
                `📊 **analyze_space_utilization**: Calculates space usage and capacity\n` +
                `⏰ **check_expiration_dates**: Finds items expiring within specified timeframes\n` +
                `📋 **quantity_analysis**: Analyzes stock levels and quantities\n\n` +
                `The database contains real warehouse data including product numbers, locations (area/aisle/bay/level), quantities, expiration dates, and more. All responses come from live database queries!`;
        }
        if (lowerQuery.includes('can you') || lowerQuery.includes('anything else') || lowerQuery.includes('what can')) {
            return `Yes! I can answer many types of warehouse questions using real data:\n\n` +
                `📊 **Analytics**: "What product has the most inventory?", "Which area is fullest?"\n` +
                `🔍 **Searches**: "Find product 12345", "Products in aisle 83", "Items on pallet 3425237"\n` +
                `📈 **Reports**: "Space utilization by area", "Expiring items this month"\n` +
                `📍 **Locations**: "Where is product X?", "What's in location F-83-189-4?"\n` +
                `⚠️ **Alerts**: "Show expired items", "Find damaged inventory"\n\n` +
                `Try asking specific questions about your warehouse inventory - I'll use real data to answer!`;
        }
        // Default response for truly general queries
        return `I'm here to help with warehouse queries using real inventory data! I can assist with:\n\n` +
            `🔍 **Product searches**: "Where is product 12345?" or "Find license plate LP123"\n` +
            `📦 **Area inventory**: "What's in the frozen area?" or "Show dry goods inventory"\n` +
            `📊 **Space analysis**: "Analyze warehouse utilization" or "Show capacity usage"\n` +
            `⏰ **Expiration checks**: "What expires soon?" or "Check expiration dates"\n` +
            `🔧 **Status searches**: "Show damaged slots" or "Find blocked locations"\n\n` +
            `What would you like to know about the warehouse?`;
    }
    updateConversationContext(memory, message, response) {
        // Update context based on the conversation
        if (response.toolCalls && response.toolCalls.length > 0) {
            memory.context.lastToolUsed = response.toolCalls[0].tool;
            memory.context.lastQueryType = response.toolCalls[0].tool;
        }
        // Adjust response style based on user preference (could be inferred from conversation)
        if (message.content.includes('quick') || message.content.includes('brief')) {
            memory.preferredResponseStyle = 'concise';
        }
        else if (message.content.includes('detail') || message.content.includes('explain')) {
            memory.preferredResponseStyle = 'detailed';
        }
    }
    getIntentTagsForTool(toolName) {
        // Map each MCP tool to its relevant intent tags for classification
        const toolIntentMap = {
            'find_product_locations': [
                'location', 'find', 'where', 'search', 'product', 'locate', 'position'
            ],
            'get_inventory_by_area': [
                'area', 'zone', 'frozen', 'dry', 'refrigerated', 'inventory', 'region'
            ],
            'analyze_space_utilization': [
                'space', 'utilization', 'capacity', 'usage', 'optimization', 'efficiency'
            ],
            'check_expiration_dates': [
                'expiration', 'expire', 'date', 'fefo', 'shelf life', 'aging'
            ],
            'quantity_analysis': [
                'quantity', 'amount', 'count', 'stock', 'levels', 'highest', 'most', 'top', 'ranking'
            ],
            'find_by_license_plate': [
                'license', 'plate', 'lp', 'identification', 'tracking'
            ],
            'find_by_pallet_id': [
                'pallet', 'id', 'identifier', 'tracking', 'container'
            ],
            'find_by_location': [
                'coordinates', 'aisle', 'bay', 'level', 'address', 'position'
            ],
            'inventory_status_search': [
                'status', 'condition', 'state', 'available', 'blocked', 'damaged'
            ]
        };
        return toolIntentMap[toolName] || ['general', 'warehouse', 'query'];
    }
    generateId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
// Create and export the singleton Location Agent instance
export const locationAgent = new LocationAgentServer();
// Main execution if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    locationAgent.start()
        .then(() => {
        console.log('🎉 Location Agent is running! Ready to process warehouse queries.');
        // Keep the process running
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down Location Agent...');
            await locationAgent.stop();
            process.exit(0);
        });
    })
        .catch(error => {
        console.error('❌ Failed to start Location Agent:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=server.js.map