#!/usr/bin/env node

/**
 * Endpoint Testing Script
 * Tests the orchestrator endpoints functionality
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Starting Endpoint Testing...\n');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEndpoints() {
  console.log('🚀 Starting orchestrator...');
  
  // Start the orchestrator
  const orchestrator = spawn('npx', ['tsx', 'src/app.ts'], {
    cwd: join(__dirname, 'apps', 'orchestrator'),
    env: { 
      ...process.env, 
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'dummy-key-for-test'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  let errorOutput = '';

  orchestrator.stdout.on('data', (data) => {
    output += data.toString();
    console.log(`📊 OUT: ${data.toString().trim()}`);
  });

  orchestrator.stderr.on('data', (data) => {
    errorOutput += data.toString();
    console.log(`❌ ERR: ${data.toString().trim()}`);
  });

  // Wait for startup
  console.log('⏳ Waiting for orchestrator to start...');
  await sleep(8000);

  // Check if server started
  if (output.includes('running on') || output.includes('ready')) {
    console.log('✅ Orchestrator appears to be running');
    
    try {
      // Test health endpoint
      console.log('\n🏥 Testing /health endpoint...');
      const healthResponse = await fetch('http://localhost:3000/health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Health endpoint working:', JSON.stringify(healthData, null, 2));
      } else {
        console.log(`❌ Health endpoint failed: ${healthResponse.status}`);
      }

      // Test agents endpoint
      console.log('\n🤖 Testing /agents endpoint...');
      const agentsResponse = await fetch('http://localhost:3000/agents');
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        console.log('✅ Agents endpoint working:', JSON.stringify(agentsData, null, 2));
      } else {
        console.log(`❌ Agents endpoint failed: ${agentsResponse.status}`);
      }

      // Test query endpoint
      console.log('\n🔍 Testing /query endpoint...');
      const queryResponse = await fetch('http://localhost:3000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'What product has the highest number of pallets?',
          sessionId: 'test-session'
        })
      });
      
      if (queryResponse.ok) {
        const queryData = await queryResponse.json();
        console.log('✅ Query endpoint working:', {
          agentUsed: queryData.agentUsed,
          responseTime: queryData.responseTime,
          responseLength: queryData.response ? queryData.response.length : 0
        });
      } else {
        console.log(`❌ Query endpoint failed: ${queryResponse.status}`);
      }

    } catch (error) {
      console.log('❌ Failed to test endpoints:', error.message);
    }
  } else {
    console.log('❌ Orchestrator failed to start properly');
    console.log('Output:', output);
    console.log('Error:', errorOutput);
  }

  // Clean up
  console.log('\n🧹 Cleaning up...');
  orchestrator.kill();
  
  await sleep(1000);
  console.log('✅ Test completed');
}

testEndpoints().catch(console.error);