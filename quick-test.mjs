#!/usr/bin/env node

import express from 'express'

// Quick test to make sure basic Express setup works
const app = express()
app.use(express.json())

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Basic setup working!',
    timestamp: new Date().toISOString()
  })
})

const server = app.listen(3001, () => {
  console.log('✅ Test server running on http://localhost:3001')
  console.log('📍 Test endpoint: http://localhost:3001/test')
  
  // Auto-shutdown after 2 seconds
  setTimeout(() => {
    console.log('🛑 Shutting down test server...')
    server.close()
  }, 2000)
})