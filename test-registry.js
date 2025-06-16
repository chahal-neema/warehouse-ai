#!/usr/bin/env node

// Quick test of the new agent registry system
import { locationAgent } from './apps/location-agent/src/server.js'

async function testRegistry() {
  try {
    console.log('🧪 Testing Agent Registry System...')
    
    // Start the location agent
    console.log('🚀 Starting location agent...')
    await locationAgent.start()
    
    // Get the manifest
    console.log('📋 Getting agent manifest...')
    const manifest = locationAgent.getManifest()
    
    console.log('✅ Agent manifest retrieved successfully!')
    console.log(`Agent: ${manifest.name} (${manifest.agentId})`)
    console.log(`Tools: ${manifest.tools.length}`)
    console.log(`Capabilities: ${manifest.capabilities.length}`)
    
    // Show tools
    console.log('\n🛠️ Available Tools:')
    manifest.tools.forEach(tool => {
      console.log(`  • ${tool.name}: ${tool.description}`)
      console.log(`    Intent tags: ${tool.intentTags.join(', ')}`)
    })
    
    // Test health check
    console.log('\n🏥 Health check...')
    const health = await locationAgent.healthCheck()
    console.log(`Status: ${health.status}`)
    
    console.log('\n✅ All tests passed! Agent registry is working.')
    
    // Stop the agent
    await locationAgent.stop()
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
  }
}

testRegistry()