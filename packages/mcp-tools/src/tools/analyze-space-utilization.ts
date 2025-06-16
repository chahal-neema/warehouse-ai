/**
 * Analyze Space Utilization Tool
 * Calculate capacity usage and space analytics
 */

import { prisma } from '../database/client.js'
import type { MCPTool } from '../server.js'

interface AnalyzeSpaceUtilizationParams {
  areaId?: 'F' | 'D' | 'R' | string
  aisle?: number
  includeRecommendations?: boolean
  minUtilization?: number
  maxUtilization?: number
}

interface SpaceUtilization {
  area: string
  aisle?: number
  totalSlots: number
  occupiedSlots: number
  totalCube: number
  usedCube: number
  availableCube: number
  utilizationPercent: number
  efficiency: 'Low' | 'Optimal' | 'High' | 'Critical'
}

interface SpaceRecommendation {
  type: 'underutilized' | 'overutilized' | 'optimal' | 'expired_priority'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  location: string
  action: string
  impact: string
}

async function analyzeSpaceUtilization(params: AnalyzeSpaceUtilizationParams): Promise<{
  utilization: SpaceUtilization[]
  totalStats: {
    totalCube: number
    usedCube: number
    utilizationPercent: number
    efficiency: string
  }
  recommendations: SpaceRecommendation[]
  analysisScope: string
}> {
  const { 
    areaId, 
    aisle, 
    includeRecommendations = true,
    minUtilization = 70,
    maxUtilization = 95 
  } = params

  try {
    // Build search conditions
    const whereConditions: any = {}
    
    if (areaId) {
      whereConditions.areaId = areaId.toUpperCase()
    }
    
    if (aisle) {
      whereConditions.aisle = aisle
    }

    // Get raw data for analysis
    const rawData = await prisma.inventoryLocation.findMany({
      where: whereConditions,
      select: {
        areaId: true,
        aisle: true,
        bay: true,
        levelNumber: true,
        slotCube: true,
        availCubeRemaining: true,
        invyStatus: true,
        slotStatus: true,
        productNumber: true,
        prodDesc: true,
        expirationDate: true,
        qtyAvailUnits: true,
        qtyAvailEaches: true
      }
    })

    if (rawData.length === 0) {
      throw new Error('No inventory data found for the specified criteria')
    }

    // Group data by area (and optionally by aisle)
    const groupedData = new Map<string, typeof rawData>()
    
    rawData.forEach(item => {
      const key = aisle ? `${item.areaId}-${item.aisle}` : item.areaId
      if (!groupedData.has(key)) {
        groupedData.set(key, [])
      }
      groupedData.get(key)!.push(item)
    })

    // Calculate utilization for each group
    const utilization: SpaceUtilization[] = []
    let totalCubeAcrossAll = 0
    let totalUsedCubeAcrossAll = 0

    for (const [key, items] of groupedData) {
      const [area, aisleNum] = key.split('-')
      
      const totalCube = items.reduce((sum, item) => sum + item.slotCube, 0)
      const availableCube = items.reduce((sum, item) => sum + item.availCubeRemaining, 0)
      const usedCube = totalCube - availableCube
      
      const totalSlots = items.length
      const occupiedSlots = items.filter(item => 
        item.qtyAvailUnits > 0 || item.qtyAvailEaches > 0
      ).length

      const utilizationPercent = totalCube > 0 ? Math.round((usedCube / totalCube) * 100) : 0
      
      let efficiency: SpaceUtilization['efficiency']
      if (utilizationPercent < minUtilization) efficiency = 'Low'
      else if (utilizationPercent <= maxUtilization) efficiency = 'Optimal'
      else if (utilizationPercent <= 98) efficiency = 'High'
      else efficiency = 'Critical'

      utilization.push({
        area,
        aisle: aisleNum ? parseInt(aisleNum) : undefined,
        totalSlots,
        occupiedSlots,
        totalCube: Math.round(totalCube * 100) / 100,
        usedCube: Math.round(usedCube * 100) / 100,
        availableCube: Math.round(availableCube * 100) / 100,
        utilizationPercent,
        efficiency
      })

      totalCubeAcrossAll += totalCube
      totalUsedCubeAcrossAll += usedCube
    }

    // Calculate total stats
    const totalUtilizationPercent = totalCubeAcrossAll > 0 
      ? Math.round((totalUsedCubeAcrossAll / totalCubeAcrossAll) * 100) 
      : 0

    let totalEfficiency: string
    if (totalUtilizationPercent < minUtilization) totalEfficiency = 'Low'
    else if (totalUtilizationPercent <= maxUtilization) totalEfficiency = 'Optimal'
    else if (totalUtilizationPercent <= 98) totalEfficiency = 'High'
    else totalEfficiency = 'Critical'

    const totalStats = {
      totalCube: Math.round(totalCubeAcrossAll * 100) / 100,
      usedCube: Math.round(totalUsedCubeAcrossAll * 100) / 100,
      utilizationPercent: totalUtilizationPercent,
      efficiency: totalEfficiency
    }

    // Generate recommendations if requested
    const recommendations: SpaceRecommendation[] = []
    
    if (includeRecommendations) {
      // Underutilized areas
      utilization.filter(u => u.efficiency === 'Low').forEach(u => {
        recommendations.push({
          type: 'underutilized',
          priority: 'medium',
          description: `Area ${u.area}${u.aisle ? ` Aisle ${u.aisle}` : ''} is underutilized at ${u.utilizationPercent}%`,
          location: `Area ${u.area}${u.aisle ? ` Aisle ${u.aisle}` : ''}`,
          action: 'Consider consolidating inventory or relocating products from overutilized areas',
          impact: `Could free up ${Math.round(u.availableCube)} cubic feet of space`
        })
      })

      // Overutilized areas
      utilization.filter(u => u.efficiency === 'Critical' || u.efficiency === 'High').forEach(u => {
        const priority = u.efficiency === 'Critical' ? 'critical' : 'high'
        recommendations.push({
          type: 'overutilized',
          priority,
          description: `Area ${u.area}${u.aisle ? ` Aisle ${u.aisle}` : ''} is ${u.efficiency.toLowerCase()} utilization at ${u.utilizationPercent}%`,
          location: `Area ${u.area}${u.aisle ? ` Aisle ${u.aisle}` : ''}`,
          action: u.efficiency === 'Critical' 
            ? 'Immediate relocation needed - consider emergency overflow areas'
            : 'Plan to relocate some inventory to underutilized areas',
          impact: `Need ${Math.round(u.usedCube * 0.1)} cubic feet additional capacity`
        })
      })

      // Check for expired items that could free up space
      const expiredItems = rawData.filter(item => {
        if (!item.expirationDate) return false
        const expDate = new Date(item.expirationDate)
        return expDate < new Date()
      })

      if (expiredItems.length > 0) {
        const expiredCube = expiredItems.reduce((sum, item) => sum + (item.slotCube - item.availCubeRemaining), 0)
        recommendations.push({
          type: 'expired_priority',
          priority: 'high',
          description: `${expiredItems.length} expired items occupying ${Math.round(expiredCube)} cubic feet`,
          location: 'Various locations',
          action: 'Prioritize removal of expired inventory to free up space',
          impact: `Could free up ${Math.round(expiredCube)} cubic feet immediately`
        })
      }
    }

    // Sort recommendations by priority
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    // Build analysis scope description
    let analysisScope = 'Warehouse-wide'
    if (areaId && aisle) {
      analysisScope = `Area ${areaId.toUpperCase()} Aisle ${aisle}`
    } else if (areaId) {
      analysisScope = `Area ${areaId.toUpperCase()}`
    } else if (aisle) {
      analysisScope = `Aisle ${aisle} (all areas)`
    }

    return {
      utilization: utilization.sort((a, b) => b.utilizationPercent - a.utilizationPercent),
      totalStats,
      recommendations,
      analysisScope
    }

  } catch (error) {
    console.error('Error in analyzeSpaceUtilization:', error)
    throw new Error(`Failed to analyze space utilization: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Export the MCP tool configuration
export const analyzeSpaceUtilizationTool: MCPTool = {
  name: 'analyze_space_utilization',
  description: 'Calculate warehouse space utilization and capacity usage with optimization recommendations',
  inputSchema: {
    type: 'object',
    properties: {
      areaId: {
        type: 'string',
        description: 'Warehouse area ID to analyze (F=Frozen, D=Dry, R=Refrigerated). Omit for warehouse-wide analysis',
        enum: ['F', 'D', 'R']
      },
      aisle: {
        type: 'number',
        description: 'Specific aisle number to analyze. Can be combined with areaId',
        minimum: 1
      },
      includeRecommendations: {
        type: 'boolean',
        description: 'Whether to include optimization recommendations',
        default: true
      },
      minUtilization: {
        type: 'number',
        description: 'Minimum utilization percentage for optimal efficiency',
        default: 70,
        minimum: 0,
        maximum: 100
      },
      maxUtilization: {
        type: 'number',
        description: 'Maximum utilization percentage for optimal efficiency',
        default: 95,
        minimum: 0,
        maximum: 100
      }
    }
  },
  handler: analyzeSpaceUtilization
}