/**
 * Check Expiration Dates Tool
 * Find items expiring soon with priority recommendations
 */
import { prisma } from '../database/client.js';
async function checkExpirationDates(params) {
    const { daysThreshold = 30, areaId, includeExpired = false, sortBy = 'expiration', priorityOnly = false, limit = 200 } = params;
    try {
        const today = new Date();
        const thresholdDate = new Date();
        thresholdDate.setDate(today.getDate() + daysThreshold);
        // Build search conditions
        const whereConditions = {
            expirationDate: {
                not: null
            }
        };
        if (includeExpired) {
            whereConditions.expirationDate.lte = thresholdDate.toISOString().split('T')[0];
        }
        else {
            whereConditions.expirationDate.gte = today.toISOString().split('T')[0];
            whereConditions.expirationDate.lte = thresholdDate.toISOString().split('T')[0];
        }
        if (areaId) {
            whereConditions.areaId = areaId.toUpperCase();
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
                qtyAvailUnits: true,
                qtyAvailEaches: true,
                expirationDate: true,
                palletId: true,
                licensePlate: true,
                invyStatus: true,
                slotCube: true,
                warehouseLocn: true
            },
            orderBy: {
                expirationDate: 'asc'
            }
        });
        // Transform results and calculate priority
        const expiringItems = results
            .map(item => {
            const expirationDate = new Date(item.expirationDate);
            const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            let priority;
            if (daysUntilExpiration < 0)
                priority = 'Critical'; // Already expired
            else if (daysUntilExpiration <= 7)
                priority = 'Critical';
            else if (daysUntilExpiration <= 14)
                priority = 'High';
            else if (daysUntilExpiration <= 21)
                priority = 'Medium';
            else
                priority = 'Low';
            return {
                productNumber: item.productNumber,
                productDescription: item.prodDesc,
                areaId: item.areaId,
                aisle: item.aisle,
                bay: item.bay,
                levelNumber: item.levelNumber,
                qtyAvailUnits: item.qtyAvailUnits,
                qtyAvailEaches: item.qtyAvailEaches,
                expirationDate: item.expirationDate,
                daysUntilExpiration,
                priority,
                palletId: item.palletId,
                licensePlate: item.licensePlate,
                invyStatus: item.invyStatus,
                slotCube: item.slotCube,
                warehouseLocation: item.warehouseLocn
            };
        })
            .filter(item => !priorityOnly || item.priority === 'Critical' || item.priority === 'High');
        // Sort results
        const sortedItems = [...expiringItems].sort((a, b) => {
            switch (sortBy) {
                case 'quantity':
                    return (b.qtyAvailUnits + b.qtyAvailEaches) - (a.qtyAvailUnits + a.qtyAvailEaches);
                case 'location':
                    return a.areaId.localeCompare(b.areaId) || a.aisle - b.aisle || a.bay - b.bay;
                case 'expiration':
                default:
                    return a.daysUntilExpiration - b.daysUntilExpiration;
            }
        }).slice(0, limit);
        // Calculate summary statistics
        const summary = {
            totalExpiringItems: expiringItems.length,
            totalExpiringUnits: expiringItems.reduce((sum, item) => sum + item.qtyAvailUnits, 0),
            totalExpiringEaches: expiringItems.reduce((sum, item) => sum + item.qtyAvailEaches, 0),
            totalExpiringCube: expiringItems.reduce((sum, item) => sum + item.slotCube, 0),
            itemsByPriority: {},
            itemsByArea: {},
            avgDaysUntilExpiration: 0
        };
        // Group by priority and area
        expiringItems.forEach(item => {
            summary.itemsByPriority[item.priority] = (summary.itemsByPriority[item.priority] || 0) + 1;
            summary.itemsByArea[item.areaId] = (summary.itemsByArea[item.areaId] || 0) + 1;
        });
        // Calculate average days until expiration
        if (expiringItems.length > 0) {
            summary.avgDaysUntilExpiration = Math.round(expiringItems.reduce((sum, item) => sum + item.daysUntilExpiration, 0) / expiringItems.length);
        }
        // Generate recommendations
        const recommendations = [];
        const criticalItems = expiringItems.filter(item => item.priority === 'Critical');
        const highItems = expiringItems.filter(item => item.priority === 'High');
        const mediumItems = expiringItems.filter(item => item.priority === 'Medium');
        if (criticalItems.length > 0) {
            recommendations.push({
                priority: 'critical',
                action: 'Immediate action required',
                items: criticalItems.length,
                description: `${criticalItems.length} items expired or expiring within 7 days`,
                timeframe: 'Immediate (within 24 hours)',
                impact: `Risk of ${criticalItems.reduce((sum, item) => sum + item.qtyAvailUnits, 0)} units becoming waste`
            });
        }
        if (highItems.length > 0) {
            recommendations.push({
                priority: 'high',
                action: 'Plan disposal or discount sales',
                items: highItems.length,
                description: `${highItems.length} items expiring within 14 days`,
                timeframe: 'Within 1 week',
                impact: `${highItems.reduce((sum, item) => sum + item.qtyAvailUnits, 0)} units need priority handling`
            });
        }
        if (mediumItems.length > 0) {
            recommendations.push({
                priority: 'medium',
                action: 'Monitor and prepare for action',
                items: mediumItems.length,
                description: `${mediumItems.length} items expiring within 21 days`,
                timeframe: 'Within 2 weeks',
                impact: `Plan logistics for ${mediumItems.reduce((sum, item) => sum + item.qtyAvailUnits, 0)} units`
            });
        }
        // Area-specific recommendations
        const frozenItems = expiringItems.filter(item => item.areaId === 'F');
        if (frozenItems.length > 0) {
            recommendations.push({
                priority: 'medium',
                action: 'Review frozen storage temperature and rotation',
                items: frozenItems.length,
                description: `${frozenItems.length} frozen items expiring - check temperature logs`,
                timeframe: 'Ongoing monitoring',
                impact: 'Prevent premature expiration in frozen section'
            });
        }
        // Build criteria description
        const criteria = [
            `Days threshold: ${daysThreshold}`,
            `Include expired: ${includeExpired ? 'Yes' : 'No'}`,
            `Sort by: ${sortBy}`,
            `Priority only: ${priorityOnly ? 'Yes' : 'No'}`
        ];
        if (areaId)
            criteria.push(`Area: ${areaId.toUpperCase()}`);
        return {
            expiringItems: sortedItems,
            summary,
            recommendations: recommendations.sort((a, b) => {
                const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }),
            analysisDate: today.toISOString().split('T')[0],
            criteria
        };
    }
    catch (error) {
        console.error('Error in checkExpirationDates:', error);
        throw new Error(`Failed to check expiration dates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
// Export the MCP tool configuration
export const checkExpirationDatesTool = {
    name: 'check_expiration_dates',
    description: 'Find items expiring soon with priority recommendations and action plans',
    inputSchema: {
        type: 'object',
        properties: {
            daysThreshold: {
                type: 'number',
                description: 'Number of days ahead to check for expiring items',
                default: 30,
                minimum: 1,
                maximum: 365
            },
            areaId: {
                type: 'string',
                description: 'Warehouse area ID to analyze (F=Frozen, D=Dry, R=Refrigerated)',
                enum: ['F', 'D', 'R']
            },
            includeExpired: {
                type: 'boolean',
                description: 'Whether to include already expired items',
                default: false
            },
            sortBy: {
                type: 'string',
                description: 'How to sort the results',
                enum: ['expiration', 'quantity', 'location'],
                default: 'expiration'
            },
            priorityOnly: {
                type: 'boolean',
                description: 'Only return critical and high priority items',
                default: false
            },
            limit: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 200,
                minimum: 1,
                maximum: 1000
            }
        }
    },
    handler: checkExpirationDates
};
//# sourceMappingURL=check-expiration-dates.js.map