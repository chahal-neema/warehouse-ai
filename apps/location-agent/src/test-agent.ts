/**
 * Location Agent Test Suite
 * Test the Location Agent with real warehouse queries
 */

import { locationAgent } from './server.js'

// Test queries that simulate real warehouse worker conversations
const TEST_QUERIES = [
  {
    category: 'Product Location',
    queries: [
      'Where is product 9375387?',
      'Can you find product 1007005?',
      'Show me the location of product 3192598'
    ]
  },
  {
    category: 'License Plate Search',
    queries: [
      'Find license plate LP123456',
      'Where is license plate ABC789?',
      'Look up LP999888'
    ]
  },
  {
    category: 'Area Inventory',
    queries: [
      'What products are in the frozen area?',
      'Show me dry goods inventory',
      'What\'s in the refrigerated section?'
    ]
  },
  {
    category: 'Space Analysis',
    queries: [
      'Analyze warehouse space utilization',
      'Show me capacity usage',
      'What areas need attention for space optimization?'
    ]
  },
  {
    category: 'Expiration Management',
    queries: [
      'What products expire soon?',
      'Check expiration dates for the next 30 days',
      'Show me critical expiring items'
    ]
  },
  {
    category: 'Status Searches',
    queries: [
      'Show me damaged slots',
      'Find blocked locations',
      'What items need maintenance?'
    ]
  },
  {
    category: 'Multi-turn Conversation',
    queries: [
      'Hello, I need help finding some products',
      'Can you search for product 9375387?',
      'Now show me what\'s in the same area',
      'Are there any expiring items in that area?'
    ]
  }
]

interface TestResult {
  query: string
  category: string
  success: boolean
  responseTime: number
  response?: any
  error?: string
}

class LocationAgentTester {
  private results: TestResult[] = []
  private sessionId: string

  constructor() {
    this.sessionId = `test_session_${Date.now()}`
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Location Agent Test Suite')
    console.log('=' .repeat(60))

    try {
      // Start the Location Agent
      console.log('\n📋 Initializing Location Agent...')
      await locationAgent.start()
      
      // Wait a moment for initialization
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Check agent health
      const health = await locationAgent.healthCheck()
      console.log('🏥 Agent Health Check:', health.status)
      
      if (health.status !== 'healthy') {
        throw new Error('Location Agent is not healthy')
      }

      console.log('✅ Location Agent initialized successfully\n')

      // Run all test categories
      for (const category of TEST_QUERIES) {
        await this.runCategoryTests(category)
      }

      // Print summary
      this.printTestSummary()

    } catch (error) {
      console.error('\n❌ Test suite failed:', error)
    } finally {
      // Stop the agent
      await locationAgent.stop()
      console.log('\n🧹 Location Agent stopped')
    }
  }

  private async runCategoryTests(category: { category: string; queries: string[] }): Promise<void> {
    console.log(`\n🔍 Testing Category: ${category.category}`)
    console.log('-'.repeat(40))

    for (let i = 0; i < category.queries.length; i++) {
      const query = category.queries[i]
      await this.runSingleTest(query, category.category, i + 1)
      
      // Small delay between queries to simulate real conversation
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  private async runSingleTest(query: string, category: string, testNumber: number): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log(`  ${testNumber}. Testing: "${query}"`)
      
      // Create A2A message
      const message = {
        id: `test_msg_${Date.now()}_${testNumber}`,
        sessionId: this.sessionId,
        agentId: 'test-client',
        content: query,
        timestamp: new Date()
      }

      // Process the message
      const response = await locationAgent.processMessage(message)
      const responseTime = Date.now() - startTime

      // Validate response
      if (response.status === 'success' && response.content) {
        this.results.push({
          query,
          category,
          success: true,
          responseTime,
          response
        })
        
        console.log(`     ✅ Success (${responseTime}ms)`)
        console.log(`     🤖 Response: ${response.content.substring(0, 100)}${response.content.length > 100 ? '...' : ''}`)
        
        if (response.toolCalls && response.toolCalls.length > 0) {
          console.log(`     🔧 Tools used: ${response.toolCalls.map(tc => tc.tool).join(', ')}`)
        }
        
        if (response.reasoning && response.reasoning.length > 0) {
          console.log(`     🧠 Reasoning steps: ${response.reasoning.length}`)
        }
        
      } else {
        throw new Error(response.content || 'Unknown error')
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      this.results.push({
        query,
        category,
        success: false,
        responseTime,
        error: errorMessage
      })
      
      console.log(`     ❌ Failed (${responseTime}ms): ${errorMessage}`)
    }
  }

  private printTestSummary(): void {
    const totalTests = this.results.length
    const successfulTests = this.results.filter(r => r.success).length
    const failedTests = totalTests - successfulTests
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Tests: ${totalTests}`)
    console.log(`✅ Successful: ${successfulTests}`)
    console.log(`❌ Failed: ${failedTests}`)
    console.log(`📈 Success Rate: ${Math.round((successfulTests / totalTests) * 100)}%`)
    console.log(`⏱️  Average Response Time: ${Math.round(avgResponseTime)}ms`)

    // Category breakdown
    console.log('\n📋 Results by Category:')
    const categories = [...new Set(this.results.map(r => r.category))]
    
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category)
      const categorySuccess = categoryResults.filter(r => r.success).length
      const categoryTotal = categoryResults.length
      const categorySuccessRate = Math.round((categorySuccess / categoryTotal) * 100)
      
      console.log(`  ${category}: ${categorySuccess}/${categoryTotal} (${categorySuccessRate}%)`)
    })

    // Failed tests details
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:')
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`  - "${result.query}" (${result.category}): ${result.error}`)
      })
    }

    // Performance insights
    console.log('\n⚡ Performance Insights:')
    const fastTests = this.results.filter(r => r.responseTime < 1000).length
    const slowTests = this.results.filter(r => r.responseTime >= 3000).length
    
    console.log(`  Fast responses (<1s): ${fastTests}`)
    console.log(`  Slow responses (>3s): ${slowTests}`)

    console.log('\n' + '='.repeat(60))
  }

  getResults(): TestResult[] {
    return [...this.results]
  }
}

// Demo function for interactive testing
async function runInteractiveDemo(): Promise<void> {
  console.log('🎮 Location Agent Interactive Demo')
  console.log('=' .repeat(40))
  
  await locationAgent.start()
  
  const demoQueries = [
    'Hello! Can you help me find some products?',
    'Where is product 9375387?',
    'What products are in the frozen area?',
    'Show me space utilization analysis',
    'Check what expires in the next 30 days'
  ]
  
  const sessionId = 'demo_session'
  
  for (let i = 0; i < demoQueries.length; i++) {
    const query = demoQueries[i]
    console.log(`\n👤 User: ${query}`)
    
    const message = {
      id: `demo_msg_${i}`,
      sessionId,
      agentId: 'demo-user',
      content: query,
      timestamp: new Date()
    }
    
    try {
      const response = await locationAgent.processMessage(message)
      console.log(`🤖 Agent: ${response.content}`)
      
      if (response.reasoning && response.reasoning.length > 0) {
        console.log(`🧠 Reasoning: ${response.reasoning.join(' → ')}`)
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error}`)
    }
    
    // Pause between messages
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  await locationAgent.stop()
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'test'
  
  if (mode === 'demo') {
    runInteractiveDemo()
      .then(() => console.log('\n🎉 Demo completed!'))
      .catch(error => {
        console.error('❌ Demo failed:', error)
        process.exit(1)
      })
  } else {
    const tester = new LocationAgentTester()
    tester.runAllTests()
      .then(() => {
        const results = tester.getResults()
        const failedCount = results.filter(r => !r.success).length
        process.exit(failedCount > 0 ? 1 : 0)
      })
      .catch(error => {
        console.error('❌ Test suite failed:', error)
        process.exit(1)
      })
  }
}

export { LocationAgentTester, runInteractiveDemo }