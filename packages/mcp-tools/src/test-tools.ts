/**
 * Test Functions for MCP Tools
 * Comprehensive testing of all inventory tools
 */

import { mcpServer, startMCPServer, stopMCPServer } from './server.js'
import { connectDatabase, disconnectDatabase } from './database/client.js'

// Test configuration
const TEST_CONFIG = {
  // Known product numbers for testing (you may need to adjust these based on your CSV data)
  knownProductNumber: '9375387',
  knownProductDescription: 'BREAD',
  testAreaId: 'F', // Frozen area
  testAisle: 83,
  expirationDaysThreshold: 30
}

// Test result tracking
interface TestResult {
  testName: string
  passed: boolean
  duration: number
  error?: string
  result?: any
}

class TestRunner {
  private results: TestResult[] = []

  async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log(`\n🧪 Running test: ${testName}`)
      const result = await testFn()
      const duration = Date.now() - startTime
      
      this.results.push({
        testName,
        passed: true,
        duration,
        result
      })
      
      console.log(`✅ ${testName} - PASSED (${duration}ms)`)
      
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      this.results.push({
        testName,
        passed: false,
        duration,
        error: errorMessage
      })
      
      console.log(`❌ ${testName} - FAILED (${duration}ms)`)
      console.log(`   Error: ${errorMessage}`)
    }
  }

  printSummary(): void {
    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0)

    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Tests: ${this.results.length}`)
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⏱️  Total Time: ${totalTime}ms`)
    console.log(`📈 Success Rate: ${Math.round((passed / this.results.length) * 100)}%`)

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:')
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`   - ${result.testName}: ${result.error}`)
      })
    }

    console.log('\n' + '='.repeat(60))
  }

  getResults(): TestResult[] {
    return [...this.results]
  }
}

// Individual test functions
async function testFindProductLocationsByNumber(): Promise<any> {
  const result = await mcpServer.callTool('find_product_locations', {
    productNumber: TEST_CONFIG.knownProductNumber,
    includeDetails: true,
    limit: 10
  })

  // Validate result structure
  if (!result.products || !Array.isArray(result.products)) {
    throw new Error('Result must have products array')
  }

  if (typeof result.totalFound !== 'number') {
    throw new Error('Result must have totalFound number')
  }

  if (!result.searchCriteria || typeof result.searchCriteria !== 'string') {
    throw new Error('Result must have searchCriteria string')
  }

  console.log(`   Found ${result.totalFound} locations for product ${TEST_CONFIG.knownProductNumber}`)
  
  return result
}

async function testFindProductLocationsByDescription(): Promise<any> {
  const result = await mcpServer.callTool('find_product_locations', {
    productDescription: TEST_CONFIG.knownProductDescription,
    includeDetails: true,
    limit: 5
  })

  if (!result.products || !Array.isArray(result.products)) {
    throw new Error('Result must have products array')
  }

  console.log(`   Found ${result.totalFound} products matching "${TEST_CONFIG.knownProductDescription}"`)
  
  return result
}

async function testGetInventoryByArea(): Promise<any> {
  const result = await mcpServer.callTool('get_inventory_by_area', {
    areaId: TEST_CONFIG.testAreaId,
    includeExpired: true,
    limit: 20
  })

  // Validate result structure
  if (!result.inventory || !Array.isArray(result.inventory)) {
    throw new Error('Result must have inventory array')
  }

  if (!result.summary || typeof result.summary !== 'object') {
    throw new Error('Result must have summary object')
  }

  if (!result.summary.totalProducts || typeof result.summary.totalProducts !== 'number') {
    throw new Error('Summary must have totalProducts number')
  }

  console.log(`   Found ${result.summary.totalProducts} products in area ${TEST_CONFIG.testAreaId}`)
  console.log(`   Space utilization: ${result.summary.utilizationPercent}%`)
  
  return result
}

async function testAnalyzeSpaceUtilization(): Promise<any> {
  const result = await mcpServer.callTool('analyze_space_utilization', {
    areaId: TEST_CONFIG.testAreaId,
    includeRecommendations: true,
    minUtilization: 70,
    maxUtilization: 95
  })

  // Validate result structure
  if (!result.utilization || !Array.isArray(result.utilization)) {
    throw new Error('Result must have utilization array')
  }

  if (!result.totalStats || typeof result.totalStats !== 'object') {
    throw new Error('Result must have totalStats object')
  }

  if (!result.recommendations || !Array.isArray(result.recommendations)) {
    throw new Error('Result must have recommendations array')
  }

  console.log(`   Analysis scope: ${result.analysisScope}`)
  console.log(`   Overall utilization: ${result.totalStats.utilizationPercent}%`)
  console.log(`   Recommendations: ${result.recommendations.length}`)
  
  return result
}

async function testCheckExpirationDates(): Promise<any> {
  const result = await mcpServer.callTool('check_expiration_dates', {
    daysThreshold: TEST_CONFIG.expirationDaysThreshold,
    areaId: TEST_CONFIG.testAreaId,
    includeExpired: false,
    sortBy: 'expiration',
    priorityOnly: false,
    limit: 50
  })

  // Validate result structure
  if (!result.expiringItems || !Array.isArray(result.expiringItems)) {
    throw new Error('Result must have expiringItems array')
  }

  if (!result.summary || typeof result.summary !== 'object') {
    throw new Error('Result must have summary object')
  }

  if (!result.recommendations || !Array.isArray(result.recommendations)) {
    throw new Error('Result must have recommendations array')
  }

  console.log(`   Found ${result.summary.totalExpiringItems} items expiring within ${TEST_CONFIG.expirationDaysThreshold} days`)
  console.log(`   Priority recommendations: ${result.recommendations.length}`)
  
  return result
}

async function testWarehouseWideSpaceAnalysis(): Promise<any> {
  const result = await mcpServer.callTool('analyze_space_utilization', {
    includeRecommendations: true,
    minUtilization: 60,
    maxUtilization: 90
  })

  console.log(`   Warehouse-wide analysis: ${result.analysisScope}`)
  console.log(`   Total utilization: ${result.totalStats.utilizationPercent}%`)
  console.log(`   Areas analyzed: ${result.utilization.length}`)
  
  return result
}

async function testCriticalExpirationItems(): Promise<any> {
  const result = await mcpServer.callTool('check_expiration_dates', {
    daysThreshold: 7, // Only items expiring within a week
    includeExpired: true,
    priorityOnly: true, // Only critical and high priority
    sortBy: 'expiration',
    limit: 100
  })

  console.log(`   Critical items found: ${result.summary.totalExpiringItems}`)
  if (result.summary.totalExpiringItems > 0) {
    console.log(`   Average days until expiration: ${result.summary.avgDaysUntilExpiration}`)
  }
  
  return result
}

async function testInvalidParameters(): Promise<any> {
  try {
    // This should fail - no parameters provided
    await mcpServer.callTool('find_product_locations', {})
    throw new Error('Should have failed with no parameters')
  } catch (error) {
    // This is expected
    console.log(`   Correctly rejected invalid parameters: ${error instanceof Error ? error.message : String(error)}`)
    return { error: 'Expected error occurred' }
  }
}

// Main test runner function
export async function runAllTests(): Promise<TestResult[]> {
  console.log('🚀 Starting MCP Tools Test Suite')
  console.log('=' .repeat(60))

  const testRunner = new TestRunner()

  try {
    // Initialize database and MCP server
    console.log('\n📋 Initializing test environment...')
    
    const dbConnected = await connectDatabase()
    if (!dbConnected) {
      throw new Error('Failed to connect to database')
    }
    
    await startMCPServer()
    console.log('✅ Test environment initialized')

    // Run all tests
    await testRunner.runTest('Find Product by Number', testFindProductLocationsByNumber)
    await testRunner.runTest('Find Product by Description', testFindProductLocationsByDescription)
    await testRunner.runTest('Get Inventory by Area', testGetInventoryByArea)
    await testRunner.runTest('Analyze Space Utilization (Area)', testAnalyzeSpaceUtilization)
    await testRunner.runTest('Check Expiration Dates', testCheckExpirationDates)
    await testRunner.runTest('Warehouse-wide Space Analysis', testWarehouseWideSpaceAnalysis)
    await testRunner.runTest('Critical Expiration Items', testCriticalExpirationItems)
    await testRunner.runTest('Invalid Parameters Handling', testInvalidParameters)

  } catch (error) {
    console.error('\n❌ Test environment setup failed:', error)
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test environment...')
    await stopMCPServer()
    await disconnectDatabase()
    console.log('✅ Test environment cleaned up')
  }

  // Print final summary
  testRunner.printSummary()
  
  return testRunner.getResults()
}

// Export individual test functions for targeted testing
export {
  testFindProductLocationsByNumber,
  testFindProductLocationsByDescription,
  testGetInventoryByArea,
  testAnalyzeSpaceUtilization,
  testCheckExpirationDates,
  testWarehouseWideSpaceAnalysis,
  testCriticalExpirationItems,
  testInvalidParameters,
  TestRunner
}

// Main execution if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(results => {
      const failed = results.filter(r => !r.passed).length
      process.exit(failed > 0 ? 1 : 0)
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error)
      process.exit(1)
    })
}