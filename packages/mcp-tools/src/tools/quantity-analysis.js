/**
 * Quantity Analysis Tool
 * Find low stock, overstock, and quantity-based insights
 */
import { prisma } from '../database/client.js';
async function quantityAnalysis(params) {
    const { analysisType, minUnits = 0, maxUnits = 999999, minEaches = 0, maxEaches = 999999, areaId, includeRecommendations = true, limit = 200 } = params;
    try {
        // Build base search conditions
        let whereConditions = {};
        if (areaId) {
            whereConditions.areaId = areaId.toUpperCase();
        }
        // Apply analysis type specific filters
        switch (analysisType) {
            case 'zero_stock':
                whereConditions.AND = [
                    { qtyAvailUnits: 0 },
                    { qtyAvailEaches: 0 }
                ];
                break;
            case 'low_stock':
                whereConditions.AND = [
                    {
                        OR: [
                            { qtyAvailUnits: { gt: 0, lte: Math.max(minUnits, 5) } },
                            { qtyAvailEaches: { gt: 0, lte: Math.max(minEaches, 10) } }
                        ]
                    }
                ];
                break;
            case 'overstock':
                whereConditions.OR = [
                    { qtyAvailUnits: { gte: Math.max(maxUnits, 100) } },
                    { qtyAvailEaches: { gte: Math.max(maxEaches, 500) } }
                ];
                break;
            case 'high_volume':
                whereConditions.OR = [
                    { qtyAvailUnits: { gte: 50 } },
                    { qtyAvailEaches: { gte: 200 } }
                ];
                break;
            case 'summary':
                // No additional filters for summary
                break;
            default:
                // Custom range
                whereConditions.AND = [
                    { qtyAvailUnits: { gte: minUnits, lte: maxUnits } },
                    { qtyAvailEaches: { gte: minEaches, lte: maxEaches } }
                ];
        }
        // Execute search
        const results = await prisma.inventoryLocation.findMany({
            where: whereConditions,
            select: {
                productNumber: true,
                prodDesc: true,
                areaId: true,
                aisle: true,
                bay: true,
                levelNumber: true,
                palletId: true,
                licensePlate: true,
                qtyAvailUnits: true,
                qtyAvailEaches: true,
                invyStatus: true,
                slotStatus: true,
                expirationDate: true,
                slotCube: true,
                availCubeRemaining: true,
                warehouseLocn: true,
                rackType: true,
                slotType: true
            },
            take: limit,
            orderBy: [
                { qtyAvailUnits: analysisType === 'overstock' ? 'desc' : 'asc' },
                { qtyAvailEaches: analysisType === 'overstock' ? 'desc' : 'asc' },
                { productNumber: 'asc' }
            ]
        });
        // Transform results and categorize quantities
        const items = results.map(item => {
            const totalQuantity = item.qtyAvailUnits + item.qtyAvailEaches;
            let quantityCategory;
            if (totalQuantity === 0)
                quantityCategory = 'Zero';
            else if (totalQuantity <= 15)
                quantityCategory = 'Low';
            else if (totalQuantity <= 100)
                quantityCategory = 'Normal';
            else if (totalQuantity <= 500)
                quantityCategory = 'High';
            else
                quantityCategory = 'Overstock';
            return {
                productNumber: item.productNumber,
                productDescription: item.prodDesc,
                areaId: item.areaId,
                aisle: item.aisle,
                bay: item.bay,
                levelNumber: item.levelNumber,
                palletId: item.palletId,
                licensePlate: item.licensePlate,
                qtyAvailUnits: item.qtyAvailUnits,
                qtyAvailEaches: item.qtyAvailEaches,
                totalQuantity,
                invyStatus: item.invyStatus,
                slotStatus: item.slotStatus,
                expirationDate: item.expirationDate,
                slotCube: item.slotCube,
                availCubeRemaining: item.availCubeRemaining,
                warehouseLocation: item.warehouseLocn,
                quantityCategory,
                rackType: item.rackType,
                slotType: item.slotType
            };
        });
        // Calculate summary statistics
        const totalUnits = items.reduce((sum, item) => sum + item.qtyAvailUnits, 0);
        const totalEaches = items.reduce((sum, item) => sum + item.qtyAvailEaches, 0);
        const summary = {
            totalProducts: items.length,
            totalUnits,
            totalEaches,
            averageUnitsPerProduct: items.length > 0 ? Math.round(totalUnits / items.length) : 0,
            averageEachesPerProduct: items.length > 0 ? Math.round(totalEaches / items.length) : 0,
            quantityDistribution: {},
            areaDistribution: {},
            topProducts: []
        };
        // Build quantity distribution
        items.forEach(item => {
            summary.quantityDistribution[item.quantityCategory] =
                (summary.quantityDistribution[item.quantityCategory] || 0) + 1;
        });
        // Build area distribution
        items.forEach(item => {
            if (!summary.areaDistribution[item.areaId]) {
                summary.areaDistribution[item.areaId] = { products: 0, units: 0, eaches: 0, averageUnits: 0 };
            }
            summary.areaDistribution[item.areaId].products += 1;
            summary.areaDistribution[item.areaId].units += item.qtyAvailUnits;
            summary.areaDistribution[item.areaId].eaches += item.qtyAvailEaches;
        });
        // Calculate average units per area
        Object.keys(summary.areaDistribution).forEach(area => {
            const areaData = summary.areaDistribution[area];
            areaData.averageUnits = areaData.products > 0 ? Math.round(areaData.units / areaData.products) : 0;
        });
        // Build top products by quantity
        const productTotals = new Map();
        items.forEach(item => {
            const key = item.productNumber;
            if (!productTotals.has(key)) {
                productTotals.set(key, {
                    productNumber: item.productNumber,
                    productDescription: item.productDescription,
                    totalUnits: 0,
                    totalEaches: 0,
                    locations: 0
                });
            }
            const product = productTotals.get(key);
            product.totalUnits += item.qtyAvailUnits;
            product.totalEaches += item.qtyAvailEaches;
            product.locations += 1;
        });
        summary.topProducts = Array.from(productTotals.values())
            .sort((a, b) => (b.totalUnits + b.totalEaches) - (a.totalUnits + a.totalEaches))
            .slice(0, 10);
        // Generate recommendations
        const recommendations = [];
        if (includeRecommendations) {
            const zeroStockItems = items.filter(item => item.quantityCategory === 'Zero');
            const lowStockItems = items.filter(item => item.quantityCategory === 'Low');
            const overstockItems = items.filter(item => item.quantityCategory === 'Overstock');
            if (zeroStockItems.length > 0) {
                recommendations.push({
                    type: 'investigation',
                    priority: 'high',
                    description: `${zeroStockItems.length} products with zero stock found`,
                    action: 'Investigate if these are empty slots that should be filled or items that should be removed from system',
                    affectedProducts: zeroStockItems.length,
                    estimatedImpact: 'Could free up storage space or indicate reorder needs'
                });
            }
            if (lowStockItems.length > 0) {
                recommendations.push({
                    type: 'reorder',
                    priority: 'medium',
                    description: `${lowStockItems.length} products with low stock levels`,
                    action: 'Review reorder points and consider restocking low inventory items',
                    affectedProducts: lowStockItems.length,
                    estimatedImpact: 'Prevent stockouts and maintain service levels'
                });
            }
            if (overstockItems.length > 0) {
                recommendations.push({
                    type: 'redistribute',
                    priority: 'medium',
                    description: `${overstockItems.length} products with high stock levels`,
                    action: 'Consider redistributing excess inventory or reviewing demand forecasts',
                    affectedProducts: overstockItems.length,
                    estimatedImpact: 'Optimize storage space and reduce carrying costs'
                });
            }
            // Area-specific recommendations
            const areaImbalances = Object.entries(summary.areaDistribution)
                .filter(([_, data]) => data.averageUnits > 100 || data.averageUnits < 5);
            if (areaImbalances.length > 0) {
                recommendations.push({
                    type: 'consolidate',
                    priority: 'low',
                    description: `${areaImbalances.length} areas with quantity imbalances`,
                    action: 'Review inventory distribution across areas for optimization opportunities',
                    affectedProducts: areaImbalances.reduce((sum, [_, data]) => sum + data.products, 0),
                    estimatedImpact: 'Improve warehouse efficiency and picking optimization'
                });
            }
        }
        // Sort recommendations by priority
        recommendations.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        return {
            items,
            summary,
            recommendations,
            totalFound: items.length,
            analysisType,
            thresholds: {
                minUnits,
                maxUnits,
                minEaches,
                maxEaches,
                areaId: areaId || 'All areas'
            }
        };
    }
    catch (error) {
        console.error('Error in quantityAnalysis:', error);
        throw new Error(`Failed to perform quantity analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
// Export the MCP tool configuration
export const quantityAnalysisTool = {
    name: 'quantity_analysis',
    description: 'Analyze inventory quantities to find low stock, overstock, and quantity-based insights',
    inputSchema: {
        type: 'object',
        properties: {
            analysisType: {
                type: 'string',
                description: 'Type of quantity analysis to perform',
                enum: ['low_stock', 'overstock', 'zero_stock', 'high_volume', 'summary'],
                default: 'summary'
            },
            minUnits: {
                type: 'number',
                description: 'Minimum units threshold for custom analysis',
                minimum: 0,
                default: 0
            },
            maxUnits: {
                type: 'number',
                description: 'Maximum units threshold for custom analysis',
                minimum: 0,
                default: 999999
            },
            minEaches: {
                type: 'number',
                description: 'Minimum eaches threshold for custom analysis',
                minimum: 0,
                default: 0
            },
            maxEaches: {
                type: 'number',
                description: 'Maximum eaches threshold for custom analysis',
                minimum: 0,
                default: 999999
            },
            areaId: {
                type: 'string',
                description: 'Warehouse area ID to analyze (F=Frozen, D=Dry, R=Refrigerated)'
            },
            includeRecommendations: {
                type: 'boolean',
                description: 'Whether to include optimization recommendations',
                default: true
            },
            limit: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 200,
                minimum: 1,
                maximum: 1000
            }
        },
        required: ['analysisType']
    },
    handler: quantityAnalysis
};
//# sourceMappingURL=quantity-analysis.js.map