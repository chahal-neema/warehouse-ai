/**
 * Find by License Plate Tool
 * Search inventory by license plate number
 */

import { prisma } from '../database/client.js'
import type { MCPTool } from '../server.js'

interface FindByLicensePlateParams {
  licensePlate: string
  includeDetails?: boolean
  exactMatch?: boolean
}

interface LicensePlateResult {
  licensePlate: string
  palletId: string
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
  palletStatus: string
  expirationDate: string | null
  slotCube: number
  availCubeRemaining: number
  warehouseLocation: string
  dateReceived: string | null
}

async function findByLicensePlate(params: FindByLicensePlateParams): Promise<{
  items: LicensePlateResult[]
  totalFound: number
  licensePlate: string
  searchType: 'exact' | 'partial'
}> {
  const { licensePlate, includeDetails = true, exactMatch = true } = params

  if (!licensePlate) {
    throw new Error('License plate is required')
  }

  try {
    // Build search conditions
    const whereConditions: any = {}
    
    if (exactMatch) {
      whereConditions.licensePlate = licensePlate
    } else {
      whereConditions.licensePlate = {
        contains: licensePlate
      }
    }

    // Execute search
    const results = await prisma.inventoryLocation.findMany({
      where: whereConditions,
      select: {
        licensePlate: true,
        palletId: true,
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
        palletStatus: true,
        expirationDate: true,
        slotCube: true,
        availCubeRemaining: true,
        warehouseLocn: true,
        dateReceived: true
      },
      orderBy: [
        { areaId: 'asc' },
        { aisle: 'asc' },
        { bay: 'asc' },
        { levelNumber: 'asc' }
      ]
    })

    // Transform results
    const items: LicensePlateResult[] = results.map(item => ({
      licensePlate: item.licensePlate,
      palletId: item.palletId,
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
      palletStatus: item.palletStatus,
      expirationDate: item.expirationDate,
      slotCube: item.slotCube,
      availCubeRemaining: item.availCubeRemaining,
      warehouseLocation: item.warehouseLocn,
      dateReceived: item.dateReceived
    }))

    return {
      items,
      totalFound: items.length,
      licensePlate,
      searchType: exactMatch ? 'exact' : 'partial'
    }

  } catch (error) {
    console.error('Error in findByLicensePlate:', error)
    throw new Error(`Failed to find items by license plate: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Export the MCP tool configuration
export const findByLicensePlateTool: MCPTool = {
  name: 'find_by_license_plate',
  description: 'Search for inventory items by license plate number',
  inputSchema: {
    type: 'object',
    properties: {
      licensePlate: {
        type: 'string',
        description: 'License plate number to search for',
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
    required: ['licensePlate']
  },
  handler: findByLicensePlate
}