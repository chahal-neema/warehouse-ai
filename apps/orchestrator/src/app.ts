/**
 * Warehouse AI Orchestrator
 * 
 * A2A Client that routes natural language queries to specialist agents
 * using Claude for intelligent query classification and coordination.
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import Anthropic from '@anthropic-ai/sdk'
import { locationAgent } from '../../location-agent/src/server'
import { AgentRegistry } from './registry/AgentRegistry.js'
import { classifyQueryLLM } from './nlp/query-router.js'

// Types for A2A messaging (mock since a2a-sdk not available)
interface A2AMessage {
  id: string
  sessionId: string
  agentId: string
  content: string
  timestamp: Date
  metadata?: Record<string, any>
}

interface A2AResponse {
  id: string
  sessionId: string
  agentId: string
  content: string
  reasoning?: string[]
  toolCalls?: Array<{
    tool: string
    params: any
    result: any
  }>
  timestamp: Date
  status: 'success' | 'error' | 'partial'
}

interface QueryClassification {
  intent: string
  confidence: number
  targetAgent: string
  parameters: Record<string, any>
  complexity: 'simple' | 'moderate' | 'complex'
  reasoning: string[]
}

interface ConversationContext {
  sessionId: string
  userId?: string
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'agent'
    content: string
    timestamp: Date
    agentId?: string
  }>
  context: Record<string, any>
  lastActivity: Date
  preferences: {
    responseStyle: 'concise' | 'detailed' | 'technical'
    preferredAgent?: string
  }
}


// Orchestrator Class
class WarehouseAIOrchestrator {
  private app: express.Application
  private claude: Anthropic
  private conversations: Map<string, ConversationContext> = new Map()
  private agentRegistry: AgentRegistry
  private isRunning = false
  private port: number

  constructor(port: number = 3000) {
    this.port = port
    this.app = express()
    
    // Initialize Claude
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    // Initialize Agent Registry
    this.agentRegistry = new AgentRegistry({
      agents: [
        {
          agentId: 'location-agent-001',
          instance: locationAgent  // Local instance
        }
      ],
      refreshInterval: 30000  // 30 seconds
    })

    this.setupMiddleware()
    this.setupRoutes()
  }

  // Initialize the orchestrator
  async start(): Promise<void> {
    try {
      console.log('🚀 Starting Warehouse AI Orchestrator...')
      
      // Validate Claude API
      console.log('🔑 Validating Claude API...')
      await this.validateClaudeAPI()
      
      // Initialize agents
      console.log('🤖 Initializing agents...')
      await this.initializeAgents()
      
      // Start Express server
      const server = this.app.listen(this.port, () => {
        this.isRunning = true
        const registryStats = this.agentRegistry.getRegistryStats()
        console.log(`✅ Orchestrator running on http://localhost:${this.port}`)
        console.log(`📊 Agent registry: ${registryStats.totalAgents} agents (${registryStats.healthyAgents} healthy)`)
        console.log(`🛠️ Total tools: ${registryStats.totalTools}`)
        console.log(`🧠 Claude API: Connected`)
      })

      return new Promise((resolve) => {
        server.on('listening', resolve)
      })
      
    } catch (error) {
      console.error('❌ Failed to start Orchestrator:', error)
      throw error
    }
  }

  // Stop the orchestrator
  async stop(): Promise<void> {
    try {
      console.log('🛑 Stopping Warehouse AI Orchestrator...')
      this.isRunning = false
      
      // Stop agents
      await this.stopAgents()
      
      console.log('✅ Orchestrator stopped')
    } catch (error) {
      console.error('❌ Failed to stop Orchestrator:', error)
    }
  }

  // Process user queries
  async processQuery(query: string, sessionId: string, userId?: string): Promise<{
    response: string
    reasoning: string[]
    agentUsed: string
    classification: QueryClassification
    responseTime: number
  }> {
    const startTime = Date.now()
    
    try {
      console.log(`📨 Processing query for session ${sessionId}: "${query}"`)
      
      // Get or create conversation context
      const context = this.getOrCreateContext(sessionId, userId)
      
      // Classify the query using Claude
      const classification = await this.classifyQuery(query, context)
      console.log(`🎯 Query classified: ${classification.intent} (${classification.confidence}% confidence)`)
      
      console.log(`📋 ORCHESTRATOR: About to route to agent: ${classification.targetAgent}`)
      
      // Route to appropriate agent
      const agentResponse = await this.routeToAgent(query, classification, context)
      
      console.log(`✅ ORCHESTRATOR: Received agent response, length: ${agentResponse.content.length}`)
      
      // Update conversation context
      this.updateConversationContext(context, query, agentResponse, classification)
      
      const responseTime = Date.now() - startTime
      
      return {
        response: agentResponse.content,
        reasoning: [...classification.reasoning, ...(agentResponse.reasoning || [])],
        agentUsed: classification.targetAgent,
        classification,
        responseTime
      }
      
    } catch (error) {
      console.error('❌ Error processing query:', error)
      throw error
    }
  }

  // Get orchestrator health status
  async getHealth(): Promise<{
    status: string
    agents: Record<string, any>
    conversations: number
    uptime: number
    registry: any
  }> {
    const allAgents = this.agentRegistry.getAllAgents()
    const agentHealth: Record<string, any> = {}
    
    for (const agent of allAgents) {
      agentHealth[agent.agentId] = {
        name: agent.name,
        status: agent.healthy ? 'healthy' : 'unhealthy',
        lastCheck: agent.lastHealthCheck,
        toolCount: agent.tools.length,
        capabilities: agent.capabilities
      }
    }

    return {
      status: this.isRunning ? 'healthy' : 'stopped',
      agents: agentHealth,
      conversations: this.conversations.size,
      uptime: process.uptime(),
      registry: this.agentRegistry.getRegistryStats()
    }
  }

  // Private methods

  private setupMiddleware(): void {
    // Disable helmet CSP for demo functionality
    this.app.use(helmet({ contentSecurityPolicy: false }))
    this.app.use(cors())
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true }))
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`)
      next()
    })
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.getHealth()
        res.json(health)
      } catch (error) {
        res.status(500).json({ error: 'Health check failed' })
      }
    })

    // Main query endpoint
    this.app.post('/query', async (req, res) => {
      try {
        const { query, sessionId = `session_${Date.now()}`, userId } = req.body
        
        if (!query) {
          return res.status(400).json({ error: 'Query is required' })
        }

        const result = await this.processQuery(query, sessionId, userId)
        res.json(result)
        
      } catch (error) {
        console.error('Query endpoint error:', error)
        res.status(500).json({ 
          error: 'Failed to process query',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    // Get conversation history
    this.app.get('/conversation/:sessionId', (req, res) => {
      const { sessionId } = req.params
      const context = this.conversations.get(sessionId)
      
      if (!context) {
        return res.status(404).json({ error: 'Conversation not found' })
      }
      
      res.json({
        sessionId,
        history: context.conversationHistory,
        context: context.context,
        preferences: context.preferences
      })
    })

    // Agent registry endpoint
    this.app.get('/agents', (req, res) => {
      const agents = this.agentRegistry.getAllAgents()
      res.json({
        agents,
        stats: this.agentRegistry.getRegistryStats()
      })
    })

    // Interactive demo endpoint
    this.app.get('/demo', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Warehouse AI Demo</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .chat { border: 1px solid #ddd; height: 400px; overflow-y: scroll; padding: 10px; margin: 10px 0; }
            .message { margin: 10px 0; padding: 10px; border-radius: 5px; }
            .user { background: #e3f2fd; text-align: right; }
            .assistant { background: #f3e5f5; }
            input[type="text"] { width: 70%; padding: 10px; }
            button { padding: 10px 20px; background: #2196f3; color: white; border: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>🏢 Warehouse AI Assistant</h1>
          <p>Ask me about warehouse inventory, product locations, space utilization, and more!</p>
          
          <div id="chat" class="chat"></div>
          
          <div>
            <input type="text" id="queryInput" placeholder="Ask about warehouse inventory..." onkeypress="if(event.key==='Enter') sendQuery()">
            <button onclick="sendQuery()">Send</button>
          </div>

          <script>
            const sessionId = 'demo_' + Date.now();
            
            function addMessage(content, isUser) {
              const chat = document.getElementById('chat');
              const message = document.createElement('div');
              message.className = 'message ' + (isUser ? 'user' : 'assistant');
              message.innerHTML = isUser ? 'You: ' + content : 'AI: ' + content.replace(/\\n/g, '<br>');
              chat.appendChild(message);
              chat.scrollTop = chat.scrollHeight;
            }
            
            async function sendQuery() {
              const input = document.getElementById('queryInput');
              const query = input.value.trim();
              if (!query) return;
              
              addMessage(query, true);
              input.value = '';
              
              try {
                const response = await fetch('/query', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query, sessionId })
                });
                
                const result = await response.json();
                addMessage(result.response + '\\n\\n🤖 Agent: ' + result.agentUsed + ' (' + result.responseTime + 'ms)', false);
              } catch (error) {
                addMessage('Error: ' + error.message, false);
              }
            }
            
            // Add welcome message
            addMessage('Hello! I\\'m your Warehouse AI Assistant. I can help you find products, check inventory, analyze space utilization, and more. What would you like to know?', false);
          </script>
        </body>
        </html>
      `)
    })
  }

  private async validateClaudeAPI(): Promise<void> {
    // Skip Claude validation in test mode or if API key is not provided
    if (process.env.NODE_ENV === 'test' || !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'dummy-key-for-test') {
      console.log('⚠️ Claude API validation skipped (test mode or no API key)')
      return
    }
    
    try {
      // Test Claude API with a simple message
      await this.claude.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      })
      console.log('✅ Claude API validated')
    } catch (error) {
      console.error('❌ Claude API validation failed:', error)
      throw new Error('Invalid Claude API key or connection failed')
    }
  }

  private async initializeAgents(): Promise<void> {
    try {
      // Initialize Location Agent
      console.log('🤖 Initializing Location Agent...')
      await locationAgent.start()
      
      // Start Agent Registry (discovers and registers agents)
      console.log('🔍 Starting Agent Registry...')
      await this.agentRegistry.start()
      
      console.log('✅ Agents initialized')
    } catch (error) {
      console.error('❌ Failed to initialize agents:', error)
      throw error
    }
  }

  private async stopAgents(): Promise<void> {
    try {
      await locationAgent.stop()
      await this.agentRegistry.stop()
      console.log('✅ Agents stopped')
    } catch (error) {
      console.error('❌ Failed to stop agents:', error)
    }
  }

  private async classifyQuery(query: string, context: ConversationContext): Promise<QueryClassification> {
    return classifyQueryLLM(query, context.context, this.claude, this.agentRegistry)
  }

  private async routeToAgent(query: string, classification: QueryClassification, context: ConversationContext): Promise<A2AResponse> {
    console.log(`🚀 ORCHESTRATOR: Routing to agent: ${classification.targetAgent}`)
    
    const agent = this.agentRegistry.getAgent(classification.targetAgent)
    
    if (!agent) {
      console.log(`❌ ORCHESTRATOR: Agent ${classification.targetAgent} not found in registry`)
      throw new Error(`Agent ${classification.targetAgent} not found`)
    }

    if (!agent.healthy) {
      console.log(`⚠️ ORCHESTRATOR: Agent ${classification.targetAgent} is unhealthy`)
      throw new Error(`Agent ${classification.targetAgent} is unhealthy`)
    }

    console.log(`✅ ORCHESTRATOR: Agent found in registry: ${agent.name}`)

    // Create A2A message
    const message: A2AMessage = {
      id: this.generateId(),
      sessionId: context.sessionId,
      agentId: 'orchestrator',
      content: query,
      timestamp: new Date(),
      metadata: {
        classification,
        context: context.context
      }
    }

    console.log(`📤 ORCHESTRATOR: Sending message to ${classification.targetAgent}:`, message.id)

    // Dynamic agent routing
    console.log(`🎯 ORCHESTRATOR: Calling ${agent.name}.processMessage()`)
    
    // For now, we know it's the location agent - in future this would be more dynamic
    if (classification.targetAgent === 'location-agent-001') {
      const response = await locationAgent.processMessage(message)
      console.log(`📥 ORCHESTRATOR: Received response from ${agent.name}:`, response.id)
      return response
    } else {
      throw new Error(`Agent routing not implemented for: ${classification.targetAgent}`)
    }
  }

  private getOrCreateContext(sessionId: string, userId?: string): ConversationContext {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, {
        sessionId,
        userId,
        conversationHistory: [],
        context: {},
        lastActivity: new Date(),
        preferences: {
          responseStyle: 'detailed'
        }
      })
    }
    return this.conversations.get(sessionId)!
  }

  private updateConversationContext(
    context: ConversationContext, 
    query: string, 
    response: A2AResponse, 
    classification: QueryClassification
  ): void {
    // Add to conversation history
    context.conversationHistory.push(
      {
        role: 'user',
        content: query,
        timestamp: new Date()
      },
      {
        role: 'agent',
        content: response.content,
        timestamp: response.timestamp,
        agentId: response.agentId
      }
    )

    // Update context
    context.context.lastIntent = classification.intent
    context.context.lastAgent = classification.targetAgent
    context.context.lastParameters = classification.parameters
    context.lastActivity = new Date()

    // Keep conversation history manageable
    if (context.conversationHistory.length > 20) {
      context.conversationHistory = context.conversationHistory.slice(-20)
    }
  }


  private generateId(): string {
    return `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Create and export the orchestrator instance
export const orchestrator = new WarehouseAIOrchestrator()

// Main execution if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  orchestrator.start()
    .then(() => {
      console.log('🎉 Warehouse AI Orchestrator is ready!')
      console.log('📱 Demo available at: http://localhost:3000/demo')
      console.log('🔗 API endpoint: http://localhost:3000/query')
      
      // Graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down Orchestrator...')
        await orchestrator.stop()
        process.exit(0)
      })
    })
    .catch(error => {
      console.error('❌ Failed to start Orchestrator:', error)
      process.exit(1)
    })
}