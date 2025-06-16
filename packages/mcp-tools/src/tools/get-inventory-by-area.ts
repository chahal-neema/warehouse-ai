/**
 * Get Inventory by Area Tool
 * Query inventory by warehouse area (F/D/R)
 */

import { prisma } from '../database/client.js'
import type { MCPTool } from '../server.js'

interface GetInventoryByAreaParams {
  areaId: 'F' | 'D' | 'R' | string
  inventoryStatus?: string
  slotStatus?: string
  includeExpired?: boolean
  groupBy?: 'product' | 'location' | 'none'
  limit?: number
}

interface AreaInventoryItem {
  productNumber: string
  productDescription: string | null
  areaId: string
  aisle: number
  bay: number
  levelNumber: number
  zone: string | null
  qtyAvailUnits: number
  qtyAvailEaches: number
  invyStatus: string
  slotStatus: string
  palletId: string
  expirationDate: string | null
  slotCube: number
  availCubeRemaining: number
  rackType: string
  slotType: string
}

interface AreaSummary {
  areaId: string
  totalProducts: number
  totalUnits: number
  totalEaches: number
  totalSlotCube: number
  totalAvailableCube: number
  utilizationPercent: number
  productsByStatus: Record<string, number>
  slotsByStatus: Record<string, number>
}

async function getInventoryByArea(params: GetInventoryByAreaParams): Promise<{
  inventory: AreaInventoryItem[]
  summary: AreaSummary
  totalFound: number
  filters: string[]
}> {
  const { 
    areaId, 
    inventoryStatus, 
    slotStatus, 
    includeExpired = true, 
    groupBy = 'none',
    limit = 100 
  } = params

  if (!areaId) {
    throw new Error('areaId is required (F=Frozen, D=Dry, R=Refrigerated)')
  }

  try {
    // Build search conditions
    const whereConditions: any = {
      areaId: areaId.toUpperCase()
    }

    if (inventoryStatus) {
      whereConditions.invyStatus = inventoryStatus
    }

    if (slotStatus) {
      whereConditions.slotStatus = slotStatus
    }

    if (!includeExpired) {
      whereConditions.expirationDate = {
        gte: new Date().toISOString().split('T')[0] // Today or future
      }
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
        expirationDate: true,
        slotCube: true,
        availCubeRemaining: true,
        rackType: true,
        slotType: true
      },
      take: limit,
      orderBy: [
        { aisle: 'asc' },
        { bay: 'asc' },
        { levelNumber: 'asc' },
        { productNumber: 'asc' }
      ]
    })

    // Transform results
    const inventory: AreaInventoryItem[] = results.map(item => ({
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
      expirationDate: item.expirationDate,
      slotCube: item.slotCube,
      availCubeRemaining: item.availCubeRemaining,
      rackType: item.rackType,
      slotType: item.slotType
    }))

    // Calculate summary statistics
    const summary: AreaSummary = {
      areaId: areaId.toUpperCase(),
      totalProducts: inventory.length,
      totalUnits: inventory.reduce((sum, item) => sum + item.qtyAvailUnits, 0),
      totalEaches: inventory.reduce((sum, item) => sum + item.qtyAvailEaches, 0),
      totalSlotCube: inventory.reduce((sum, item) => sum + item.slotCube, 0),
      totalAvailableCube: inventory.reduce((sum, item) => sum + item.availCubeRemaining, 0),
      utilizationPercent: 0,
      productsByStatus: {},
      slotsByStatus: {}
    }

    // Calculate utilization percentage
    if (summary.totalSlotCube > 0) {
      const usedCube = summary.totalSlotCube - summary.totalAvailableCube
      summary.utilizationPercent = Math.round((usedCube / summary.totalSlotCube) * 100)
    }

    // Group by inventory status
    inventory.forEach(item => {
      summary.productsByStatus[item.invyStatus] = (summary.productsByStatus[item.invyStatus] || 0) + 1
      summary.slotsByStatus[item.slotStatus] = (summary.slotsByStatus[item.slotStatus] || 0) + 1
    })

    // Build filters description
    const filters: string[] = [`Area: ${areaId.toUpperCase()}`]
    if (inventoryStatus) filters.push(`Inventory Status: ${inventoryStatus}`)
    if (slotStatus) filters.push(`Slot Status: ${slotStatus}`)
    if (!includeExpired) filters.push('Excluding expired items')

    return {
      inventory,
      summary,
      totalFound: inventory.length,
      filters
    }

  } catch (error) {
    console.error('Error in getInventoryByArea:', error)
    throw new Error(`Failed to get inventory by area: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Export the MCP tool configuration
export const getInventoryByAreaTool: MCPTool = {
  name: 'get_inventory_by_area',
  description: 'Query inventory by warehouse area (F=Frozen, D=Dry, R=Refrigerated) with optional filtering',
  inputSchema: {
    type: 'object',
    properties: {
      areaId: {
        type: 'string',
        description: 'Warehouse area ID (F=Frozen, D=Dry, R=Refrigerated)',
        enum: ['F', 'D', 'R']
      },
      inventoryStatus: {
        type: 'string',
        description: 'Filter by inventory status (e.g., "A" for active)'
      },
      slotStatus: {
        type: 'string',
        description: 'Filter by slot status'
      },
      includeExpired: {
        type: 'boolean',
        description: 'Whether to include expired items',
        default: true
      },
      groupBy: {
        type: 'string',
        description: 'How to group the results',
        enum: ['product', 'location', 'none'],
        default: 'none'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return',
        default: 100,
        minimum: 1,
        maximum: 1000
      }
    },
    required: ['areaId']
  },
  handler: getInventoryByArea
}