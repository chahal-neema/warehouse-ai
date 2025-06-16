/**
 * Find by Pallet ID Tool
 * Search inventory by pallet ID
 */
import { prisma } from '../database/client.js';
async function findByPalletId(params) {
    const { palletId, includeDetails = true, exactMatch = true } = params;
    if (!palletId) {
        throw new Error('Pallet ID is required');
    }
    try {
        // Build search conditions
        const whereConditions = {};
        if (exactMatch) {
            whereConditions.palletId = palletId;
        }
        else {
            whereConditions.palletId = {
                contains: palletId
            };
        }
        // Execute search
        const results = await prisma.inventoryLocation.findMany({
            where: whereConditions,
            select: {
                palletId: true,
                licensePlate: true,
                palletStatus: true,
                productNumber: true,
                prodDesc: true,
                areaId: true,
                aisle: true,
                bay: true,
                levelNumber: true,
                zone: true,
                qtyAvailUnits: true,
                qtyAvailEaches: true,
                invyStatus: true,
                slotStatus: true,
                expirationDate: true,
                slotCube: true,
                availCubeRemaining: true,
                warehouseLocn: true,
                dateReceived: true,
                rackType: true,
                slotType: true
            },
            orderBy: [
                { areaId: 'asc' },
                { aisle: 'asc' },
                { bay: 'asc' },
                { levelNumber: 'asc' }
            ]
        });
        // Transform results
        const items = results.map(item => ({
            palletId: item.palletId,
            licensePlate: item.licensePlate,
            palletStatus: item.palletStatus,
            productNumber: item.productNumber,
            productDescription: item.prodDesc,
            areaId: item.areaId,
            aisle: item.aisle,
            bay: item.bay,
            levelNumber: item.levelNumber,
            zone: item.zone,
            qtyAvailUnits: item.qtyAvailUnits,
            qtyAvailEaches: item.qtyAvailEaches,
            invyStatus: item.invyStatus,
            slotStatus: item.slotStatus,
            expirationDate: item.expirationDate,
            slotCube: item.slotCube,
            availCubeRemaining: item.availCubeRemaining,
            warehouseLocation: item.warehouseLocn,
            dateReceived: item.dateReceived,
            rackType: item.rackType,
            slotType: item.slotType
        }));
        // Calculate pallet summary if items found
        let palletSummary = undefined;
        if (items.length > 0) {
            const firstItem = items[0];
            palletSummary = {
                totalUnits: items.reduce((sum, item) => sum + item.qtyAvailUnits, 0),
                totalEaches: items.reduce((sum, item) => sum + item.qtyAvailEaches, 0),
                totalCube: items.reduce((sum, item) => sum + (item.slotCube - item.availCubeRemaining), 0),
                status: firstItem.palletStatus,
                location: `Area ${firstItem.areaId}, Aisle ${firstItem.aisle}, Bay ${firstItem.bay}, Level ${firstItem.levelNumber}`
            };
        }
        return {
            items,
            totalFound: items.length,
            palletId,
            searchType: exactMatch ? 'exact' : 'partial',
            palletSummary
        };
    }
    catch (error) {
        console.error('Error in findByPalletId:', error);
        throw new Error(`Failed to find items by pallet ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
// Export the MCP tool configuration
export const findByPalletIdTool = {
    name: 'find_by_pallet_id',
    description: 'Search for inventory items by pallet ID with pallet summary',
    inputSchema: {
        type: 'object',
        properties: {
            palletId: {
                type: 'string',
                description: 'Pallet ID to search for',
                minLength: 1
            },
            includeDetails: {
                type: 'boolean',
                description: 'Whether to include detailed information',
                default: true
            },
            exactMatch: {
                type: 'boolean',
                description: 'Whether to search for exact match or partial match',
                default: true
            }
        },
        required: ['palletId']
    },
    handler: findByPalletId
};
//# sourceMappingURL=find-by-pallet-id.js.map