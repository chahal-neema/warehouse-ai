import { summarizerAgent } from './server.js'

async function runTest() {
  await summarizerAgent.start()

  const request = {
    query: 'Where is product 12345?',
    intent: 'location_query',
    toolResults: [
      { tool: 'find_product_locations', result: { products: [{ productNumber: '12345', areaId: 'D' }] } },
      { tool: 'analyze_space_utilization', result: { summary: { overallUtilization: 80 } } }
    ]
  }

  const response = await summarizerAgent.processMessage(request)
  console.log(response.summary)

  await summarizerAgent.stop()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTest().catch(err => {
    console.error('Test failed', err)
    process.exit(1)
  })
}

export { runTest }
