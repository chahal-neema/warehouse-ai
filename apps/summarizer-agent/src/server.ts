/**
 * Summarizer Agent
 *
 * Generates unified responses from raw tool results.
 */

import { v4 as uuidv4 } from 'uuid'

// Basic types mirroring the Location Agent structures
interface SummarizeRequest {
  query: string
  intent: string
  toolResults: Array<{ tool: string; result: any }>
  context?: Record<string, any>
}

interface SummarizeResponse {
  id: string
  summary: string
  reasoning: string[]
  escalate: null | 'clarify' | 'summary'
  status: 'success' | 'error'
}

interface AgentManifest {
  agentId: string
  name: string
  description: string
  version: string
  tools: Array<{
    name: string
    description: string
    intentTags: string[]
    schema: any
  }>
  capabilities: string[]
  expertise: string[]
  healthEndpoint: string
  status: string
}

interface AgentCard {
  agentId: string
  name: string
  description: string
  version: string
  capabilities: string[]
  expertise: string[]
}

class SummarizerAgentServer {
  private agentCard: AgentCard
  private isRunning = false

  constructor() {
    this.agentCard = {
      agentId: 'summarizer-agent-001',
      name: 'Warehouse Summarizer Agent',
      description: 'Generates final user friendly summaries from raw tool results',
      version: '1.0.0',
      capabilities: ['response_generation', 'multi_tool_summary'],
      expertise: ['reporting', 'warehouse_insights']
    }
  }

  async start(): Promise<void> {
    console.log('🚀 Starting Summarizer Agent...')
    this.isRunning = true
    console.log(`✅ Summarizer Agent "${this.agentCard.name}" is ready!`)
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping Summarizer Agent...')
    this.isRunning = false
    console.log('✅ Summarizer Agent stopped')
  }

  async healthCheck(): Promise<{ status: string }> {
    return { status: this.isRunning ? 'healthy' : 'unhealthy' }
  }

  getManifest(): AgentManifest {
    return {
      agentId: this.agentCard.agentId,
      name: this.agentCard.name,
      description: this.agentCard.description,
      version: this.agentCard.version,
      tools: [
        {
          name: 'summarize_results',
          description: 'Combine multiple tool outputs into a single summary',
          intentTags: ['summarize', 'combine', 'report'],
          schema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              intent: { type: 'string' },
              toolResults: { type: 'array' }
            },
            required: ['query', 'toolResults']
          }
        }
      ],
      capabilities: this.agentCard.capabilities,
      expertise: this.agentCard.expertise,
      healthEndpoint: '/health',
      status: this.isRunning ? 'healthy' : 'unhealthy'
    }
  }

  async processMessage(request: SummarizeRequest): Promise<SummarizeResponse> {
    if (!this.isRunning) {
      throw new Error('Summarizer Agent is not running')
    }

    const reasoning: string[] = []
    reasoning.push('Combining tool results')

    let summary = `**Summary for:** "${request.query}"\n\n`

    for (const entry of request.toolResults) {
      const result = entry.result
      let snippet = ''

      if (result && typeof result === 'object') {
        if (result.summary) {
          snippet = JSON.stringify(result.summary)
        } else if (Array.isArray(result.items)) {
          snippet = `${result.items.length} items`
        } else {
          snippet = Object.keys(result).slice(0, 3).join(', ')
        }
      } else {
        snippet = String(result)
      }

      summary += `• From ${entry.tool}: ${snippet}\n`
    }

    summary += '\n_All data sourced from warehouse tools._'

    return {
      id: uuidv4(),
      summary,
      reasoning,
      escalate: null,
      status: 'success'
    }
  }
}

export const summarizerAgent = new SummarizerAgentServer()

