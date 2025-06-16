/**
 * Find Product Locations Tool
 * Searches for products by product ID or description
 */
import { prisma } from '../database/client.js';
async function findProductLocations(params) {
    const { productNumber, productDescription, includeDetails = true, limit = 50 } = params;
    if (!productNumber && !productDescription) {
        throw new Error('Either productNumber or productDescription must be provided');
    }
    try {
        // Build search conditions
        const whereConditions = {};
        if (productNumber) {
            whereConditions.productNumber = productNumber;
        }
        if (productDescription) {
            whereConditions.prodDesc = {
                contains: productDescription
            };
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
                zone: true,
                qtyAvailUnits: true,
                qtyAvailEaches: true,
                invyStatus: true,
                slotStatus: true,
                palletId: true,
                licensePlate: true,
                expirationDate: true,
                slotCube: true,
                availCubeRemaining: true,
                warehouseLocn: true
            },
            take: limit,
            orderBy: [
                { areaId: 'asc' },
                { aisle: 'asc' },
                { bay: 'asc' },
                { levelNumber: 'asc' }
            ]
        });
        // Transform results
        const products = results.map(item => ({
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
            palletId: item.palletId,
            licensePlate: item.licensePlate,
            expirationDate: item.expirationDate,
            slotCube: item.slotCube,
            availCubeRemaining: item.availCubeRemaining,
            warehouseLocation: item.warehouseLocn
        }));
        // Build search criteria description
        let searchCriteria = '';
        if (productNumber) {
            searchCriteria += `Product Number: ${productNumber}`;
        }
        if (productDescription) {
            if (searchCriteria)
                searchCriteria += ', ';
            searchCriteria += `Description contains: "${productDescription}"`;
        }
        return {
            products,
            totalFound: products.length,
            searchCriteria
        };
    }
    catch (error) {
        console.error('Error in findProductLocations:', error);
        throw new Error(`Failed to find product locations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
// Export the MCP tool configuration
export const findProductLocationsTool = {
    name: 'find_product_locations',
    description: 'Search for products by product ID or description and return their warehouse locations',
    inputSchema: {
        type: 'object',
        properties: {
            productNumber: {
                type: 'string',
                description: 'Exact product number to search for'
            },
            productDescription: {
                type: 'string',
                description: 'Text to search for in product descriptions (case-insensitive)'
            },
            includeDetails: {
                type: 'boolean',
                description: 'Whether to include detailed location and inventory information',
                default: true
            },
            limit: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 50,
                minimum: 1,
                maximum: 500
            }
        },
        anyOf: [
            { required: ['productNumber'] },
            { required: ['productDescription'] }
        ]
    },
    handler: findProductLocations
};
//# sourceMappingURL=find-product-locations.js.map