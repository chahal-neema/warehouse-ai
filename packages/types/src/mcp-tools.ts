/**
 * TypeScript types for MCP Tools
 * Shared types for warehouse AI inventory tools
 */

// Base warehouse area types
export type WarehouseArea = 'F' | 'D' | 'R' // Frozen, Dry, Refrigerated

// Priority levels used across tools
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'
export type ActionPriority = 'critical' | 'high' | 'medium' | 'low'

// Space efficiency levels
export type SpaceEfficiency = 'Low' | 'Optimal' | 'High' | 'Critical'

// Common location information
export interface LocationInfo {
  areaId: string
  aisle: number
  bay: number
  levelNumber: number
  zone: string | null
  warehouseLocation: string
}

// Common product information
export interface ProductInfo {
  productNumber: string
  productDescription: string | null
}

// Common inventory quantities
export interface InventoryQuantities {
  qtyAvailUnits: number
  qtyAvailEaches: number
}

// Common space information
export interface SpaceInfo {
  slotCube: number
  availCubeRemaining: number
}

// =============================================================================
// FIND PRODUCT LOCATIONS TOOL TYPES
// =============================================================================

export interface FindProductLocationsParams {
  productNumber?: string
  productDescription?: string
  includeDetails?: boolean
  limit?: number
}

export interface ProductLocation extends ProductInfo, LocationInfo, InventoryQuantities, SpaceInfo {
  invyStatus: string
  slotStatus: string
  palletId: string
  licensePlate: string
  expirationDate: string | null
}

export interface FindProductLocationsResult {
  products: ProductLocation[]
  totalFound: number
  searchCriteria: string
}

// =============================================================================
// GET INVENTORY BY AREA TOOL TYPES
// =============================================================================

export interface GetInventoryByAreaParams {
  areaId: WarehouseArea | string
  inventoryStatus?: string
  slotStatus?: string
  includeExpired?: boolean
  groupBy?: 'product' | 'location' | 'none'
  limit?: number
}

export interface AreaInventoryItem extends ProductInfo, LocationInfo, InventoryQuantities, SpaceInfo {
  invyStatus: string
  slotStatus: string
  palletId: string
  expirationDate: string | null
  rackType: string
  slotType: string
}

export interface AreaSummary {
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

export interface GetInventoryByAreaResult {
  inventory: AreaInventoryItem[]
  summary: AreaSummary
  totalFound: number
  filters: string[]
}

// =============================================================================
// ANALYZE SPACE UTILIZATION TOOL TYPES
// =============================================================================

export interface AnalyzeSpaceUtilizationParams {
  areaId?: WarehouseArea | string
  aisle?: number
  includeRecommendations?: boolean
  minUtilization?: number
  maxUtilization?: number
}

export interface SpaceUtilization {
  area: string
  aisle?: number
  totalSlots: number
  occupiedSlots: number
  totalCube: number
  usedCube: number
  availableCube: number
  utilizationPercent: number
  efficiency: SpaceEfficiency
}

export interface SpaceRecommendation {
  type: 'underutilized' | 'overutilized' | 'optimal' | 'expired_priority'
  priority: ActionPriority
  description: string
  location: string
  action: string
  impact: string
}

export interface SpaceTotalStats {
  totalCube: number
  usedCube: number
  utilizationPercent: number
  efficiency: string
}

export interface AnalyzeSpaceUtilizationResult {
  utilization: SpaceUtilization[]
  totalStats: SpaceTotalStats
  recommendations: SpaceRecommendation[]
  analysisScope: string
}

// =============================================================================
// CHECK EXPIRATION DATES TOOL TYPES  
// =============================================================================

export interface CheckExpirationDatesParams {
  daysThreshold?: number
  areaId?: WarehouseArea | string
  includeExpired?: boolean
  sortBy?: 'expiration' | 'quantity' | 'location'
  priorityOnly?: boolean
  limit?: number
}

export interface ExpiringItem extends ProductInfo, LocationInfo, InventoryQuantities, SpaceInfo {
  expirationDate: string
  daysUntilExpiration: number
  priority: Priority
  palletId: string
  licensePlate: string
  invyStatus: string
}

export interface ExpirationSummary {
  totalExpiringItems: number
  totalExpiringUnits: number
  totalExpiringEaches: number
  totalExpiringCube: number
  itemsByPriority: Record<string, number>
  itemsByArea: Record<string, number>
  avgDaysUntilExpiration: number
}

export interface ExpirationRecommendation {
  priority: ActionPriority
  action: string
  items: number
  description: string
  timeframe: string
  impact: string
}

export interface CheckExpirationDatesResult {
  expiringItems: ExpiringItem[]
  summary: ExpirationSummary
  recommendations: ExpirationRecommendation[]
  analysisDate: string
  criteria: string[]
}

// =============================================================================
// MCP TOOL INTERFACE TYPES
// =============================================================================

export interface MCPToolInputSchema {
  type: 'object'
  properties: Record<string, any>
  required?: string[]
  anyOf?: any[]
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: MCPToolInputSchema
  handler: (params: any) => Promise<any>
}

// Union type for all tool parameter types
export type MCPToolParams = 
  | FindProductLocationsParams 
  | GetInventoryByAreaParams 
  | AnalyzeSpaceUtilizationParams 
  | CheckExpirationDatesParams

// Union type for all tool result types
export type MCPToolResult = 
  | FindProductLocationsResult 
  | GetInventoryByAreaResult 
  | AnalyzeSpaceUtilizationResult 
  | CheckExpirationDatesResult

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface MCPToolError {
  code: string
  message: string
  details?: any
}

export class MCPToolException extends Error {
  code: string
  details?: any

  constructor(code: string, message: string, details?: any) {
    super(message)
    this.name = 'MCPToolException'
    this.code = code
    this.details = details
  }
}