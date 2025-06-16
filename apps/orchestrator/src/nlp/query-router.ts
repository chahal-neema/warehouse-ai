export interface QueryClassification {
  intent: string
  confidence: number
  targetAgent: string
  parameters: Record<string, any>
  complexity: 'simple' | 'moderate' | 'complex'
  reasoning: string[]
}

import Anthropic from '@anthropic-ai/sdk'
import { AgentRegistry } from '../registry/AgentRegistry.js'

// Few-shot examples used in the prompt
const FEW_SHOT = [
  { query: 'Where is product 9375387?', intent: 'product_location_search' },
  { query: 'How many pallets of flour do we have?', intent: 'inventory_count_query' },
  { query: 'What product has the highest quantity?', intent: 'inventory_ranking_analysis' },
  { query: 'Analyze warehouse space utilization', intent: 'space_analysis' },
  { query: 'Give me a warehouse summary', intent: 'comprehensive_summary' },
  { query: 'Compare frozen vs dry areas then show top 3 expiring', intent: 'multi_step_query' }
]

export async function classifyQueryLLM(
  query: string,
  context: Record<string, any>,
  claude: Anthropic,
  registry: AgentRegistry
): Promise<QueryClassification> {
  // In test mode or without API key use fallback
  if (process.env.NODE_ENV === 'test' || !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'dummy-key-for-test') {
    return fallbackClassification(query, registry)
  }

  const agentContext = registry.generatePromptContext()
  const examples = FEW_SHOT.map(e => `Query: "${e.query}"\nIntent: ${e.intent}`).join('\n')
  const systemPrompt = `You classify warehouse queries into intents.\n${agentContext}\n\nExamples:\n${examples}\n\nRespond with JSON {intent, confidence, targetAgent, parameters, complexity, reasoning}`

  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Claude timeout')), 10000))

  try {
    const claudePromise = claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: query }]
    })

    const response = await Promise.race([claudePromise, timeoutPromise]) as any
    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected Claude response')
    const classification = JSON.parse(content.text.trim()) as QueryClassification

    // Validate target agent
    const agent = registry.getAgent(classification.targetAgent)
    if (!agent || !agent.healthy) {
      const fallback = fallbackClassification(query, registry)
      fallback.reasoning.push('Target agent unavailable, using fallback')
      return fallback
    }

    if (classification.confidence === undefined) classification.confidence = 50

    if (classification.confidence < 40) {
      const fallback = fallbackClassification(query, registry)
      fallback.reasoning.push('Low confidence fallback')
      return fallback
    }

    return classification
  } catch (err) {
    console.error('LLM classification failed:', err)
    return fallbackClassification(query, registry)
  }
}

export function fallbackClassification(query: string, registry: AgentRegistry): QueryClassification {
  const lower = query.toLowerCase()
  let intent = 'general_warehouse_query'
  if (lower.includes('where is') || /\b\d{6,}\b/.test(lower)) intent = 'product_location_search'
  else if (lower.includes('how many') || lower.includes('count')) intent = 'inventory_count_query'
  else if (lower.includes('highest') || lower.includes('most')) intent = 'inventory_ranking_analysis'
  else if (lower.includes('summary') || lower.includes('overview')) intent = 'comprehensive_summary'
  else if (lower.includes('space')) intent = 'space_analysis'
  else if (lower.includes('expire')) intent = 'expiration_check'

  const agent = registry.getHealthyAgents()[0]
  const target = agent ? agent.agentId : 'location-agent-001'

  return {
    intent,
    confidence: 50,
    targetAgent: target,
    parameters: { query },
    complexity: query.includes(' and ') || query.includes(' then ') ? 'complex' : 'simple',
    reasoning: ['Rule-based fallback']
  }
}
