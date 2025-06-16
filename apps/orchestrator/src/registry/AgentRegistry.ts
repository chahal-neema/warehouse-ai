/**
 * Agent Registry Service
 * 
 * Discovers and manages available agents through manifest discovery.
 * Provides dynamic agent routing without hard-coded capabilities.
 */

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

interface AgentRegistryEntry extends AgentManifest {
  endpoint?: string
  lastHealthCheck: Date
  discoveredAt: Date
  healthy: boolean
}

interface AgentDiscoveryConfig {
  agents: Array<{
    agentId: string
    endpoint?: string
    instance?: any  // For local agent instances
  }>
  refreshInterval: number
}

export class AgentRegistry {
  private agents: Map<string, AgentRegistryEntry> = new Map()
  private config: AgentDiscoveryConfig
  private refreshTimer?: NodeJS.Timeout

  constructor(config: AgentDiscoveryConfig) {
    this.config = config
  }

  async start(): Promise<void> {
    console.log('🔍 Starting Agent Registry...')
    
    // Initial discovery
    await this.discoverAgents()
    
    // Set up periodic refresh
    this.refreshTimer = setInterval(
      () => this.refreshAgents(), 
      this.config.refreshInterval
    )
    
    console.log(`✅ Agent Registry started with ${this.agents.size} agents`)
  }

  async stop(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
    this.agents.clear()
    console.log('🛑 Agent Registry stopped')
  }

  private async discoverAgents(): Promise<void> {
    for (const agentConfig of this.config.agents) {
      try {
        let manifest: AgentManifest

        if (agentConfig.instance) {
          // Local agent instance
          console.log(`📋 Fetching manifest for local agent: ${agentConfig.agentId}`)
          manifest = agentConfig.instance.getManifest()
        } else if (agentConfig.endpoint) {
          // Remote agent via HTTP
          console.log(`📋 Fetching manifest from: ${agentConfig.endpoint}/manifest`)
          const response = await fetch(`${agentConfig.endpoint}/manifest`)
          manifest = await response.json()
        } else {
          throw new Error('Agent must have either instance or endpoint')
        }

        // Validate manifest
        if (!this.validateManifest(manifest)) {
          console.error(`❌ Invalid manifest for agent: ${agentConfig.agentId}`)
          continue
        }

        // Register agent
        const entry: AgentRegistryEntry = {
          ...manifest,
          endpoint: agentConfig.endpoint,
          lastHealthCheck: new Date(),
          discoveredAt: new Date(),
          healthy: manifest.status === 'healthy'
        }

        this.agents.set(manifest.agentId, entry)
        console.log(`✅ Registered agent: ${manifest.name} (${manifest.agentId})`)
        console.log(`   Tools: ${manifest.tools.length}`)
        console.log(`   Capabilities: ${manifest.capabilities.join(', ')}`)

      } catch (error) {
        console.error(`❌ Failed to discover agent ${agentConfig.agentId}:`, error)
      }
    }
  }

  private async refreshAgents(): Promise<void> {
    console.log('🔄 Refreshing agent registry...')
    
    for (const [agentId, agent] of this.agents) {
      try {
        // Check agent health
        let healthy = false
        
        const agentConfig = this.config.agents.find(a => a.agentId === agentId)
        if (agentConfig?.instance) {
          // Local agent health check
          const health = await agentConfig.instance.healthCheck()
          healthy = health.status === 'healthy'
        } else if (agent.endpoint) {
          // Remote agent health check
          const response = await fetch(`${agent.endpoint}${agent.healthEndpoint}`)
          const health = await response.json()
          healthy = health.status === 'healthy'
        }

        agent.healthy = healthy
        agent.lastHealthCheck = new Date()
        
        if (!healthy) {
          console.warn(`⚠️ Agent ${agentId} is unhealthy`)
        }

      } catch (error) {
        console.error(`❌ Health check failed for ${agentId}:`, error)
        agent.healthy = false
      }
    }
  }

  private validateManifest(manifest: any): manifest is AgentManifest {
    return (
      typeof manifest === 'object' &&
      typeof manifest.agentId === 'string' &&
      typeof manifest.name === 'string' &&
      typeof manifest.description === 'string' &&
      typeof manifest.version === 'string' &&
      Array.isArray(manifest.tools) &&
      Array.isArray(manifest.capabilities) &&
      Array.isArray(manifest.expertise)
    )
  }

  // Public API methods

  getAgent(agentId: string): AgentRegistryEntry | undefined {
    return this.agents.get(agentId)
  }

  getAllAgents(): AgentRegistryEntry[] {
    return Array.from(this.agents.values())
  }

  getHealthyAgents(): AgentRegistryEntry[] {
    return this.getAllAgents().filter(agent => agent.healthy)
  }

  findAgentsByCapability(capability: string): AgentRegistryEntry[] {
    return this.getAllAgents().filter(agent => 
      agent.capabilities.includes(capability) && agent.healthy
    )
  }

  findAgentsByExpertise(expertise: string): AgentRegistryEntry[] {
    return this.getAllAgents().filter(agent => 
      agent.expertise.includes(expertise) && agent.healthy
    )
  }

  findAgentsByTool(toolName: string): AgentRegistryEntry[] {
    return this.getAllAgents().filter(agent => 
      agent.tools.some(tool => tool.name === toolName) && agent.healthy
    )
  }

  findAgentsByIntentTags(tags: string[]): Array<{agent: AgentRegistryEntry, score: number}> {
    const results: Array<{agent: AgentRegistryEntry, score: number}> = []

    for (const agent of this.getHealthyAgents()) {
      let score = 0
      
      // Score based on tool intent tags
      for (const tool of agent.tools) {
        const matchingTags = tool.intentTags.filter(tag => 
          tags.some(queryTag => queryTag.toLowerCase().includes(tag.toLowerCase()) ||
                                 tag.toLowerCase().includes(queryTag.toLowerCase()))
        )
        score += matchingTags.length * 2  // Tool matches worth more
      }
      
      // Score based on capabilities and expertise
      const capabilityMatches = agent.capabilities.filter(cap => 
        tags.some(tag => cap.toLowerCase().includes(tag.toLowerCase()) ||
                         tag.toLowerCase().includes(cap.toLowerCase()))
      )
      score += capabilityMatches.length

      const expertiseMatches = agent.expertise.filter(exp => 
        tags.some(tag => exp.toLowerCase().includes(tag.toLowerCase()) ||
                         tag.toLowerCase().includes(exp.toLowerCase()))
      )
      score += expertiseMatches.length

      if (score > 0) {
        results.push({ agent, score })
      }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score)
  }

  getRegistryStats(): {
    totalAgents: number
    healthyAgents: number
    totalTools: number
    avgToolsPerAgent: number
    lastRefresh: Date
  } {
    const agents = this.getAllAgents()
    const healthyAgents = this.getHealthyAgents()
    const totalTools = agents.reduce((sum, agent) => sum + agent.tools.length, 0)

    return {
      totalAgents: agents.length,
      healthyAgents: healthyAgents.length,
      totalTools,
      avgToolsPerAgent: agents.length > 0 ? totalTools / agents.length : 0,
      lastRefresh: new Date(Math.max(...agents.map(a => a.lastHealthCheck.getTime())))
    }
  }

  generatePromptContext(): string {
    // Generate dynamic agent capabilities for Claude prompts
    const healthyAgents = this.getHealthyAgents()
    
    if (healthyAgents.length === 0) {
      return 'No healthy agents available.'
    }

    let context = 'AVAILABLE AGENTS AND CAPABILITIES:\n\n'
    
    for (const agent of healthyAgents) {
      context += `${agent.agentId}: ${agent.name}\n`
      context += `  Description: ${agent.description}\n`
      context += `  Tools:\n`
      
      for (const tool of agent.tools) {
        context += `    * ${tool.name}: ${tool.description}\n`
        context += `      Intent tags: ${tool.intentTags.join(', ')}\n`
      }
      
      context += `  Capabilities: ${agent.capabilities.join(', ')}\n`
      context += `  Expertise: ${agent.expertise.join(', ')}\n\n`
    }

    return context
  }
}