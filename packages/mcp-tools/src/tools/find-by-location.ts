/**
 * Find by Location Tool
 * Search inventory by specific warehouse location coordinates
 */

import { prisma } from '../database/client.js'
import type { MCPTool } from '../server.js'

interface FindByLocationParams {
  areaId?: string
  aisle?: number
  bay?: number
  levelNumber?: number
  zone?: string
  includeEmpty?: boolean
  sortBy?: 'product' | 'quantity' | 'expiration'
}

interface LocationResult {
  location: {
    areaId: string
    aisle: number
    bay: number
    levelNumber: number
    zone: string | null
    warehouseLocation: string
  }
  productNumber: string
  productDescription: string | null
  palletId: string
  licensePlate: string
  qtyAvailUnits: number
  qtyAvailEaches: number
  invyStatus: string
  slotStatus: string
  palletStatus: string
  expirationDate: string | null
  slotCube: number
  availCubeRemaining: number
  rackType: string
  slotType: string
  dateReceived: string | null
}

interface LocationSummary {
  totalSlots: number
  occupiedSlots: number
  emptySlots: number
  totalUnits: number
  totalEaches: number
  totalCube: number
  utilizationPercent: number
  uniqueProducts: number
  areaRange: string
  aisleRange: string
  bayRange: string
  levelRange: string
}

async function findByLocation(params: FindByLocationParams): Promise<{
  items: LocationResult[]
  summary: LocationSummary
  totalFound: number
  searchCriteria: Record<string, any>
}> {
  const { 
    areaId, 
    aisle, 
    bay, 
    levelNumber, 
    zone,
    includeEmpty = false,
    sortBy = 'product'
  } = params

  try {
    // Build search conditions
    const whereConditions: any = {}
    
    if (areaId) {
      whereConditions.areaId = areaId.toUpperCase()
    }
    
    if (aisle !== undefined) {
      whereConditions.aisle = aisle
    }
    
    if (bay !== undefined) {
      whereConditions.bay = bay
    }
    
    if (levelNumber !== undefined) {
      whereConditions.levelNumber = levelNumber
    }
    
    if (zone) {
      whereConditions.zone = zone
    }

    // If not including empty slots, filter for active inventory
    if (!includeEmpty) {
      whereConditions.OR = [
        { qtyAvailUnits: { gt: 0 } },
        { qtyAvailEaches: { gt: 0 } }
      ]
    }

    // Execute search
    const results = await prisma.inventoryLocation.findMany({
      where: whereConditions,
      select: {
        areaId: true,
        aisle: true,
        bay: true,
        levelNumber: true,
        zone: true,
        warehouseLocn: true,
        productNumber: true,
        prodDesc: true,
        palletId: true,
        licensePlate: true,
        qtyAvailUnits: true,
        qtyAvailEaches: true,
        invyStatus: true,
        slotStatus: true,
        palletStatus: true,
        expirationDate: true,
        slotCube: true,
        availCubeRemaining: true,
        rackType: true,
        slotType: true,
        dateReceived: true
      }
    })

    // Sort results
    const sortedResults = [...results].sort((a, b) => {
      switch (sortBy) {
        case 'quantity':
          return (b.qtyAvailUnits + b.qtyAvailEaches) - (a.qtyAvailUnits + a.qtyAvailEaches)
        case 'expiration':
          if (!a.expirationDate && !b.expirationDate) return 0
          if (!a.expirationDate) return 1
          if (!b.expirationDate) return -1
          return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
        case 'product':
        default:
          return a.productNumber.localeCompare(b.productNumber)
      }
    })

    // Transform results
    const items: LocationResult[] = sortedResults.map(item => ({
      location: {
        areaId: item.areaId,
        aisle: item.aisle,
        bay: item.bay,
        levelNumber: item.levelNumber,
        zone: item.zone,
        warehouseLocation: item.warehouseLocn
      },
      productNumber: item.productNumber,
      productDescription: item.prodDesc,
      palletId: item.palletId,
      licensePlate: item.licensePlate,
      qtyAvailUnits: item.qtyAvailUnits,
      qtyAvailEaches: item.qtyAvailEaches,
      invyStatus: item.invyStatus,
      slotStatus: item.slotStatus,
      palletStatus: item.palletStatus,
      expirationDate: item.expirationDate,
      slotCube: item.slotCube,
      availCubeRemaining: item.availCubeRemaining,
      rackType: item.rackType,
      slotType: item.slotType,
      dateReceived: item.dateReceived
    }))

    // Calculate summary
    const occupiedSlots = items.filter(item => 
      item.qtyAvailUnits > 0 || item.qtyAvailEaches > 0
    ).length
    
    const totalCube = items.reduce((sum, item) => sum + item.slotCube, 0)
    const usedCube = items.reduce((sum, item) => sum + (item.slotCube - item.availCubeRemaining), 0)
    const uniqueProducts = new Set(items.map(item => item.productNumber)).size

    // Calculate ranges for summary
    const areas = [...new Set(items.map(item => item.location.areaId))].sort()
    const aisles = items.map(item => item.location.aisle)
    const bays = items.map(item => item.location.bay)
    const levels = items.map(item => item.location.levelNumber)

    const summary: LocationSummary = {
      totalSlots: items.length,
      occupiedSlots,
      emptySlots: items.length - occupiedSlots,
      totalUnits: items.reduce((sum, item) => sum + item.qtyAvailUnits, 0),
      totalEaches: items.reduce((sum, item) => sum + item.qtyAvailEaches, 0),
      totalCube: Math.round(totalCube * 100) / 100,
      utilizationPercent: totalCube > 0 ? Math.round((usedCube / totalCube) * 100) : 0,
      uniqueProducts,
      areaRange: areas.length > 0 ? `${areas[0]}${areas.length > 1 ? ` - ${areas[areas.length - 1]}` : ''}` : 'N/A',
      aisleRange: aisles.length > 0 ? `${Math.min(...aisles)}${aisles.length > 1 ? ` - ${Math.max(...aisles)}` : ''}` : 'N/A',
      bayRange: bays.length > 0 ? `${Math.min(...bays)}${bays.length > 1 ? ` - ${Math.max(...bays)}` : ''}` : 'N/A',
      levelRange: levels.length > 0 ? `${Math.min(...levels)}${levels.length > 1 ? ` - ${Math.max(...levels)}` : ''}` : 'N/A'
    }

    // Build search criteria for response
    const searchCriteria: Record<string, any> = {}
    if (areaId) searchCriteria.areaId = areaId
    if (aisle !== undefined) searchCriteria.aisle = aisle
    if (bay !== undefined) searchCriteria.bay = bay
    if (levelNumber !== undefined) searchCriteria.levelNumber = levelNumber
    if (zone) searchCriteria.zone = zone
    searchCriteria.includeEmpty = includeEmpty
    searchCriteria.sortBy = sortBy

    return {
      items,
      summary,
      totalFound: items.length,
      searchCriteria
    }

  } catch (error) {
    console.error('Error in findByLocation:', error)
    throw new Error(`Failed to find items by location: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Export the MCP tool configuration
export const findByLocationTool: MCPTool = {
  name: 'find_by_location',
  description: 'Search for inventory by specific warehouse location coordinates with location summary',
  inputSchema: {
    type: 'object',
    properties: {
      areaId: {
        type: 'string',
        description: 'Warehouse area ID (F=Frozen, D=Dry, R=Refrigerated)'
      },
      aisle: {
        type: 'number',
        description: 'Specific aisle number',
        minimum: 1
      },
      bay: {
        type: 'number',
        description: 'Specific bay number',
        minimum: 1
      },
      levelNumber: {
        type: 'number',
        description: 'Specific level number',
        minimum: 1
      },
      zone: {
        type: 'string',
        description: 'Specific zone identifier'
      },
      includeEmpty: {
        type: 'boolean',
        description: 'Whether to include empty slots (no inventory)',
        default: false
      },
      sortBy: {
        type: 'string',
        description: 'How to sort the results',
        enum: ['product', 'quantity', 'expiration'],
        default: 'product'
      }
    }
  },
  handler: findByLocation
}