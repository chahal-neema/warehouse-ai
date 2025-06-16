/**
 * Inventory Status Search Tool
 * Search by inventory status, slot status, and pallet status
 */

import { prisma } from '../database/client.js'
import type { MCPTool } from '../server.js'

interface InventoryStatusSearchParams {
  inventoryStatus?: string
  slotStatus?: string
  palletStatus?: string
  areaId?: string
  includeMetrics?: boolean
  groupBy?: 'area' | 'status' | 'none'
  limit?: number
}

interface StatusResult {
  productNumber: string
  productDescription: string | null
  areaId: string
  aisle: number
  bay: number
  levelNumber: number
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
  warehouseLocation: string
  rackType: string
  slotType: string
}

interface StatusMetrics {
  totalItems: number
  totalUnits: number
  totalEaches: number
  totalCube: number
  utilizationPercent: number
  statusBreakdown: {
    inventoryStatus: Record<string, number>
    slotStatus: Record<string, number>
    palletStatus: Record<string, number>
  }
  areaBreakdown: Record<string, {
    items: number
    units: number
    eaches: number
    cube: number
  }>
}

interface StatusRecommendation {
  type: 'maintenance' | 'optimization' | 'attention'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  action: string
  affectedItems: number
}

async function inventoryStatusSearch(params: InventoryStatusSearchParams): Promise<{
  items: StatusResult[]
  metrics: StatusMetrics
  recommendations: StatusRecommendation[]
  totalFound: number
  searchCriteria: Record<string, any>
}> {
  const { 
    inventoryStatus,
    slotStatus,
    palletStatus,
    areaId,
    includeMetrics = true,
    groupBy = 'none',
    limit = 500
  } = params

  try {
    // Build search conditions
    const whereConditions: any = {}
    
    if (inventoryStatus) {
      whereConditions.invyStatus = inventoryStatus
    }
    
    if (slotStatus) {
      whereConditions.slotStatus = slotStatus
    }
    
    if (palletStatus) {
      whereConditions.palletStatus = palletStatus
    }
    
    if (areaId) {
      whereConditions.areaId = areaId.toUpperCase()
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
        palletStatus: true,
        expirationDate: true,
        slotCube: true,
        availCubeRemaining: true,
        warehouseLocn: true,
        rackType: true,
        slotType: true
      },
      take: limit,
      orderBy: [
        { areaId: 'asc' },
        { invyStatus: 'asc' },
        { slotStatus: 'asc' },
        { aisle: 'asc' },
        { bay: 'asc' }
      ]
    })

    // Transform results
    const items: StatusResult[] = results.map(item => ({
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
      invyStatus: item.invyStatus,
      slotStatus: item.slotStatus,
      palletStatus: item.palletStatus,
      expirationDate: item.expirationDate,
      slotCube: item.slotCube,
      availCubeRemaining: item.availCubeRemaining,
      warehouseLocation: item.warehouseLocn,
      rackType: item.rackType,
      slotType: item.slotType
    }))

    // Calculate metrics
    const metrics: StatusMetrics = {
      totalItems: items.length,
      totalUnits: items.reduce((sum, item) => sum + item.qtyAvailUnits, 0),
      totalEaches: items.reduce((sum, item) => sum + item.qtyAvailEaches, 0),
      totalCube: items.reduce((sum, item) => sum + (item.slotCube - item.availCubeRemaining), 0),
      utilizationPercent: 0,
      statusBreakdown: {
        inventoryStatus: {},
        slotStatus: {},
        palletStatus: {}
      },
      areaBreakdown: {}
    }

    // Calculate utilization
    const totalSlotCube = items.reduce((sum, item) => sum + item.slotCube, 0)
    if (totalSlotCube > 0) {
      metrics.utilizationPercent = Math.round((metrics.totalCube / totalSlotCube) * 100)
    }

    // Build status breakdowns
    items.forEach(item => {
      // Inventory status breakdown
      metrics.statusBreakdown.inventoryStatus[item.invyStatus] = 
        (metrics.statusBreakdown.inventoryStatus[item.invyStatus] || 0) + 1
      
      // Slot status breakdown
      metrics.statusBreakdown.slotStatus[item.slotStatus] = 
        (metrics.statusBreakdown.slotStatus[item.slotStatus] || 0) + 1
      
      // Pallet status breakdown
      metrics.statusBreakdown.palletStatus[item.palletStatus] = 
        (metrics.statusBreakdown.palletStatus[item.palletStatus] || 0) + 1

      // Area breakdown
      if (!metrics.areaBreakdown[item.areaId]) {
        metrics.areaBreakdown[item.areaId] = { items: 0, units: 0, eaches: 0, cube: 0 }
      }
      metrics.areaBreakdown[item.areaId].items += 1
      metrics.areaBreakdown[item.areaId].units += item.qtyAvailUnits
      metrics.areaBreakdown[item.areaId].eaches += item.qtyAvailEaches
      metrics.areaBreakdown[item.areaId].cube += (item.slotCube - item.availCubeRemaining)
    })

    // Generate recommendations
    const recommendations: StatusRecommendation[] = []

    // Check for problematic inventory statuses
    const inactiveItems = items.filter(item => item.invyStatus !== 'A')
    if (inactiveItems.length > 0) {
      recommendations.push({
        type: 'attention',
        priority: inactiveItems.length > 50 ? 'high' : 'medium',
        description: `${inactiveItems.length} items with non-active inventory status`,
        action: 'Review inactive inventory items for potential removal or status update',
        affectedItems: inactiveItems.length
      })
    }

    // Check for slot status issues
    const problemSlots = items.filter(item => 
      item.slotStatus === 'DAMAGED' || item.slotStatus === 'BLOCKED' || item.slotStatus === 'MAINTENANCE'
    )
    if (problemSlots.length > 0) {
      recommendations.push({
        type: 'maintenance',
        priority: 'high',
        description: `${problemSlots.length} slots require maintenance attention`,
        action: 'Schedule maintenance for damaged, blocked, or maintenance-flagged slots',
        affectedItems: problemSlots.length
      })
    }

    // Check for pallet status issues
    const palletIssues = items.filter(item => 
      item.palletStatus === 'DAMAGED' || item.palletStatus === 'HOLD'
    )
    if (palletIssues.length > 0) {
      recommendations.push({
        type: 'attention',
        priority: 'medium',
        description: `${palletIssues.length} pallets with status issues`,
        action: 'Investigate and resolve damaged or held pallet statuses',
        affectedItems: palletIssues.length
      })
    }

    // Check for optimization opportunities
    const lowUtilizationAreas = Object.entries(metrics.areaBreakdown)
      .filter(([_, data]) => {
        const areaItems = items.filter(item => item.areaId === _)
        const areaCube = areaItems.reduce((sum, item) => sum + item.slotCube, 0)
        const areaUsed = data.cube
        return areaCube > 0 && (areaUsed / areaCube) < 0.5
      })

    if (lowUtilizationAreas.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'low',
        description: `${lowUtilizationAreas.length} areas with low utilization`,
        action: 'Consider consolidating inventory in underutilized areas',
        affectedItems: lowUtilizationAreas.reduce((sum, [_, data]) => sum + data.items, 0)
      })
    }

    // Sort recommendations by priority
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    // Build search criteria
    const searchCriteria: Record<string, any> = {}
    if (inventoryStatus) searchCriteria.inventoryStatus = inventoryStatus
    if (slotStatus) searchCriteria.slotStatus = slotStatus
    if (palletStatus) searchCriteria.palletStatus = palletStatus
    if (areaId) searchCriteria.areaId = areaId
    searchCriteria.groupBy = groupBy

    return {
      items,
      metrics,
      recommendations,
      totalFound: items.length,
      searchCriteria
    }

  } catch (error) {
    console.error('Error in inventoryStatusSearch:', error)
    throw new Error(`Failed to search by inventory status: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Export the MCP tool configuration
export const inventoryStatusSearchTool: MCPTool = {
  name: 'inventory_status_search',
  description: 'Search inventory by status codes (inventory, slot, pallet) with metrics and recommendations',
  inputSchema: {
    type: 'object',
    properties: {
      inventoryStatus: {
        type: 'string',
        description: 'Inventory status code to search for (e.g., "A" for active)'
      },
      slotStatus: {
        type: 'string',
        description: 'Slot status code to search for'
      },
      palletStatus: {
        type: 'string',
        description: 'Pallet status code to search for'
      },
      areaId: {
        type: 'string',
        description: 'Warehouse area ID to limit search (F=Frozen, D=Dry, R=Refrigerated)'
      },
      includeMetrics: {
        type: 'boolean',
        description: 'Whether to include detailed metrics and breakdowns',
        default: true
      },
      groupBy: {
        type: 'string',
        description: 'How to group the results',
        enum: ['area', 'status', 'none'],
        default: 'none'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return',
        default: 500,
        minimum: 1,
        maximum: 2000
      }
    }
  },
  handler: inventoryStatusSearch
}