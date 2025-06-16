/**
 * End-to-End Orchestrator Test Suite
 * Tests the complete flow: User -> Orchestrator -> Claude -> Location Agent -> MCP Tools -> Database
 */

import { orchestrator } from './app.js'

interface TestQuery {
  category: string
  query: string
  expectedIntent?: string
  expectedAgent?: string
  shouldSucceed: boolean
}

const TEST_QUERIES: TestQuery[] = [
  // Product Location Queries
  {
    category: 'Product Location',
    query: 'Where is product 9375387?',
    expectedIntent: 'find_product_location',
    expectedAgent: 'location-agent-001',
    shouldSucceed: true
  },
  {
    category: 'Product Location',
    query: 'Can you tell me where I can find product 3192598?',
    expectedIntent: 'find_product_location',
    expectedAgent: 'location-agent-001',
    shouldSucceed: true
  },

  // Area Inventory Queries
  {
    category: 'Area Inventory',
    query: 'Show me what products are in the frozen area',
    expectedIntent: 'area_inventory',
    expectedAgent: 'location-agent-001',
    shouldSucceed: true
  },
  {
    category: 'Area Inventory',
    query: 'What inventory do we have in the dry goods section?',
    expectedIntent: 'area_inventory',
    expectedAgent: 'location-agent-001',
    shouldSucceed: true
  },

  // License Plate Searches
  {
    category: 'License Plate',
    query: 'Find license plate LP123456',
    expectedIntent: 'license_plate_search',
    expectedAgent: 'location-agent-001',
    shouldSucceed: true
  },

  // Space Analysis
  {
    category: 'Space Analysis',
    query: 'Analyze warehouse space utilization',
    expectedIntent: 'space_analysis',
    expectedAgent: 'location-agent-001',
    shouldSucceed: true
  },
  {
    category: 'Space Analysis',
    query: 'How efficiently are we using our warehouse space?',
    expectedIntent: 'space_analysis',
    expectedAgent: 'location-agent-001',
    shouldSucceed: true
  },

  // Expiration Management
  {
    category: 'Expiration',
    query: 'What products expire in the next 30 days?',
    expectedIntent: 'expiration_check',
    expectedAgent: 'location-agent-001',
    shouldSucceed: true
  },
  {
    category: 'Expiration',
    query: 'Show me critical expiring items',
    expectedIntent: 'expiration_check',
    expectedAgent: 'location-agent-001',
    shouldSucceed: true
  },

  // Complex Multi-part Queries
  {
    category: 'Complex',
    query: 'Find frozen products that expire this month and show me their locations',
    expectedAgent: 'location-agent-001',
    shouldSucceed: true
  },

  // Conversational Queries
  {
    category: 'Conversational',
    query: 'Hello, I need help with warehouse inventory',
    expectedAgent: 'location-agent-001',
    shouldSucceed: true
  },

  // Edge Cases
  {
    category: 'Edge Case',
    query: 'What is the meaning of life?',
    expectedAgent: 'location-agent-001',
    shouldSucceed: true // Should gracefully handle non-warehouse queries
  }
]

interface TestResult {
  query: string
  category: string
  success: boolean
  responseTime: number
  agentUsed?: string
  classification?: any
  response?: string
  error?: string
}

class OrchestratorTester {
  private results: TestResult[] = []
  private sessionId: string

  constructor() {
    this.sessionId = `test_session_${Date.now()}`
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting End-to-End Orchestrator Test Suite')
    console.log('=' .repeat(60))
    console.log('🔄 Testing: User → Orchestrator → Claude → Location Agent → MCP Tools → Database')
    console.log('=' .repeat(60))

    try {
      // Start the orchestrator
      console.log('\n📋 Initializing Orchestrator...')
      await orchestrator.start()
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check health
      const health = await orchestrator.getHealth()
      console.log('🏥 System Health:', health.status)
      console.log(`🤖 Agents: ${Object.keys(health.agents).length}`)
      
      if (health.status !== 'healthy') {
        throw new Error('Orchestrator is not healthy')
      }

      console.log('✅ Orchestrator ready for testing\n')

      // Run tests by category
      const categories = [...new Set(TEST_QUERIES.map(q => q.category))]
      
      for (const category of categories) {
        await this.runCategoryTests(category)
      }

      // Run conversation flow test
      await this.runConversationFlowTest()

      // Print comprehensive summary
      this.printDetailedSummary()

    } catch (error) {
      console.error('\n❌ Test suite failed:', error)
    } finally {
      // Stop the orchestrator
      console.log('\n🧹 Stopping Orchestrator...')
      await orchestrator.stop()
      console.log('✅ Orchestrator stopped')
    }
  }

  private async runCategoryTests(category: string): Promise<void> {
    const categoryQueries = TEST_QUERIES.filter(q => q.category === category)
    
    console.log(`\n🔍 Testing Category: ${category}`)
    console.log('-'.repeat(50))

    for (let i = 0; i < categoryQueries.length; i++) {
      const testQuery = categoryQueries[i]
      await this.runSingleTest(testQuery, i + 1)
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  private async runSingleTest(testQuery: TestQuery, testNumber: number): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log(`  ${testNumber}. Testing: "${testQuery.query}"`)
      
      // Process query through orchestrator
      const result = await orchestrator.processQuery(
        testQuery.query, 
        this.sessionId + '_' + testNumber,
        'test-user'
      )

      const responseTime = Date.now() - startTime

      // Validate result
      this.validateTestResult(result, testQuery, responseTime)

      this.results.push({
        query: testQuery.query,
        category: testQuery.category,
        success: true,
        responseTime,
        agentUsed: result.agentUsed,
        classification: result.classification,
        response: result.response
      })

      console.log(`     ✅ Success (${responseTime}ms)`)
      console.log(`     🎯 Intent: ${result.classification.intent} (${result.classification.confidence}% confidence)`)
      console.log(`     🤖 Agent: ${result.agentUsed}`)
      console.log(`     🗣️  Response: ${result.response.substring(0, 80)}${result.response.length > 80 ? '...' : ''}`)

    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      this.results.push({
        query: testQuery.query,
        category: testQuery.category,
        success: false,
        responseTime,
        error: errorMessage
      })
      
      console.log(`     ❌ Failed (${responseTime}ms): ${errorMessage}`)
    }
  }

  private validateTestResult(result: any, testQuery: TestQuery, responseTime: number): void {
    // Check response time
    if (responseTime > 10000) { // 10 seconds
      throw new Error(`Response too slow: ${responseTime}ms`)
    }

    // Check agent routing
    if (testQuery.expectedAgent && result.agentUsed !== testQuery.expectedAgent) {
      throw new Error(`Wrong agent: expected ${testQuery.expectedAgent}, got ${result.agentUsed}`)
    }

    // Check response content
    if (!result.response || result.response.length < 10) {
      throw new Error('Response too short or empty')
    }

    // Check classification confidence
    if (result.classification.confidence < 30) {
      console.log(`     ⚠️  Low confidence: ${result.classification.confidence}%`)
    }
  }

  private async runConversationFlowTest(): Promise<void> {
    console.log(`\n🗣️  Testing Multi-Turn Conversation Flow`)
    console.log('-'.repeat(50))

    const conversationQueries = [
      'Hello, I need help with warehouse operations',
      'Where is product 9375387?',
      'What other products are in the same area?',
      'Are any of those products expiring soon?',
      'Thank you for your help'
    ]

    const conversationSessionId = `conversation_test_${Date.now()}`

    for (let i = 0; i < conversationQueries.length; i++) {
      const query = conversationQueries[i]
      console.log(`  ${i + 1}. User: "${query}"`)
      
      try {
        const result = await orchestrator.processQuery(query, conversationSessionId, 'conversation-test-user')
        console.log(`     🤖 Assistant: ${result.response.substring(0, 100)}${result.response.length > 100 ? '...' : ''}`)
        console.log(`     📊 Agent: ${result.agentUsed}, Time: ${result.responseTime}ms`)
        
      } catch (error) {
        console.log(`     ❌ Error: ${error}`)
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  private printDetailedSummary(): void {
    const totalTests = this.results.length
    const successfulTests = this.results.filter(r => r.success).length
    const failedTests = totalTests - successfulTests
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests

    console.log('\n' + '='.repeat(60))
    console.log('📊 END-TO-END TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`🧪 Total Tests: ${totalTests}`)
    console.log(`✅ Successful: ${successfulTests}`)
    console.log(`❌ Failed: ${failedTests}`)
    console.log(`📈 Success Rate: ${Math.round((successfulTests / totalTests) * 100)}%`)
    console.log(`⏱️  Average Response Time: ${Math.round(avgResponseTime)}ms`)

    // Performance analysis
    const fastTests = this.results.filter(r => r.responseTime < 2000).length
    const slowTests = this.results.filter(r => r.responseTime >= 5000).length
    
    console.log('\n⚡ Performance Analysis:')
    console.log(`  Fast responses (<2s): ${fastTests}/${totalTests} (${Math.round(fastTests/totalTests*100)}%)`)
    console.log(`  Slow responses (>5s): ${slowTests}/${totalTests} (${Math.round(slowTests/totalTests*100)}%)`)

    // Category breakdown
    console.log('\n📋 Results by Category:')
    const categories = [...new Set(this.results.map(r => r.category))]
    
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category)
      const categorySuccess = categoryResults.filter(r => r.success).length
      const categoryTotal = categoryResults.length
      const categorySuccessRate = Math.round((categorySuccess / categoryTotal) * 100)
      const avgTime = Math.round(categoryResults.reduce((sum, r) => sum + r.responseTime, 0) / categoryTotal)
      
      console.log(`  ${category}: ${categorySuccess}/${categoryTotal} (${categorySuccessRate}%, ${avgTime}ms avg)`)
    })

    // Agent usage
    console.log('\n🤖 Agent Usage:')
    const agentUsage = new Map<string, number>()
    this.results.filter(r => r.success && r.agentUsed).forEach(r => {
      agentUsage.set(r.agentUsed!, (agentUsage.get(r.agentUsed!) || 0) + 1)
    })
    
    for (const [agent, count] of agentUsage) {
      console.log(`  ${agent}: ${count} queries`)
    }

    // Failed tests details
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests Details:')
      this.results.filter(r => !r.success).forEach((result, index) => {
        console.log(`  ${index + 1}. "${result.query}" (${result.category})`)
        console.log(`     Error: ${result.error}`)
        console.log(`     Time: ${result.responseTime}ms`)
      })
    }

    // Success criteria evaluation
    console.log('\n🎯 Success Criteria Evaluation:')
    const criteriaResults = {
      'Functionality (>90% success)': successfulTests / totalTests >= 0.9,
      'Performance (<3s avg response)': avgResponseTime < 3000,
      'Agent Routing (correct agent)': this.results.filter(r => r.success && r.agentUsed === 'location-agent-001').length / successfulTests >= 0.8,
      'Claude Integration (working)': this.results.some(r => r.success && r.classification),
      'End-to-End Flow (working)': successfulTests > 0
    }

    Object.entries(criteriaResults).forEach(([criteria, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${criteria}`)
    })

    const overallSuccess = Object.values(criteriaResults).every(Boolean)
    console.log(`\n🏆 Overall Assessment: ${overallSuccess ? '✅ PASS' : '❌ NEEDS IMPROVEMENT'}`)

    console.log('\n' + '='.repeat(60))
  }

  getResults(): TestResult[] {
    return [...this.results]
  }
}

// Demo function for quick testing
async function runQuickDemo(): Promise<void> {
  console.log('🎮 Quick Orchestrator Demo')
  console.log('=' .repeat(40))
  
  try {
    await orchestrator.start()
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const demoQueries = [
      'Where is product 9375387?',
      'What products are in the frozen area?',
      'Analyze warehouse space utilization'
    ]
    
    for (const query of demoQueries) {
      console.log(`\n👤 User: ${query}`)
      
      try {
        const result = await orchestrator.processQuery(query, 'demo_session', 'demo-user')
        console.log(`🤖 Assistant: ${result.response}`)
        console.log(`📊 Meta: ${result.agentUsed} (${result.responseTime}ms, ${result.classification.confidence}% confidence)`)
        
      } catch (error) {
        console.log(`❌ Error: ${error}`)
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
  } finally {
    await orchestrator.stop()
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'test'
  
  if (mode === 'demo') {
    runQuickDemo()
      .then(() => console.log('\n🎉 Demo completed!'))
      .catch(error => {
        console.error('❌ Demo failed:', error)
        process.exit(1)
      })
  } else {
    const tester = new OrchestratorTester()
    tester.runAllTests()
      .then(() => {
        const results = tester.getResults()
        const failedCount = results.filter(r => !r.success).length
        console.log(`\n🏁 Test suite completed. Exiting with code ${failedCount > 0 ? 1 : 0}`)
        process.exit(failedCount > 0 ? 1 : 0)
      })
      .catch(error => {
        console.error('❌ Test suite failed:', error)
        process.exit(1)
      })
  }
}

export { OrchestratorTester, runQuickDemo }