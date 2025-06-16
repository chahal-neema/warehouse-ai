# Warehouse AI - Truly Agentic Architecture Implementation

> **Context**: Evolving from hard-coded single-agent system to modular, extensible multi-agent platform

## 🎯 **Architecture Vision**

Transform the current tightly-coupled orchestrator-agent system into a truly agentic platform with:
- **Dynamic agent discovery** via manifest registry
- **LLM-based intent classification** replacing regex patterns  
- **Tool plan graphs** with dependency management
- **Deterministic execution engine** with parallel processing
- **Dedicated summariser agent** for unified responses
- **Extensible agent contracts** with escalation handling

---

## 🚀 **CRITICAL PATH IMPLEMENTATION**

### Task 5.1: Agent Registry with Manifest Discovery ✅
**Status**: COMPLETED | **Priority**: CRITICAL | **Time**: 3-4 hours

**Objective**: Implement dynamic agent discovery to decouple orchestrator from hard-coded agent knowledge

**COMPLETED**: ✅
- Agent capabilities were hard-coded in orchestrator prompt (lines 418-447 in app.ts) - FIXED
- Adding new agents required orchestrator code changes and redeploys - SOLVED
- No discoverability of agent tools and capabilities - IMPLEMENTED

**Implementation Completed**:
- ✅ Designed agent manifest schema with tool descriptions and intent tags
- ✅ Added `getManifest()` method to location agent exposing capabilities
- ✅ Created `AgentRegistry` service in orchestrator that fetches and caches manifests  
- ✅ Implemented registry refresh mechanism for dynamic agent discovery
- ✅ Replaced hard-coded agent capabilities in orchestrator with dynamic registry data

**Manifest Schema**:
```json
{
  "agentId": "location-agent-001",
  "name": "Warehouse Location Agent", 
  "description": "Specialist for inventory location queries",
  "version": "1.0.0",
  "tools": [
    {
      "name": "find_product_locations",
      "description": "Search for product locations by ID or description",
      "intentTags": ["location", "find", "where"],
      "schema": {...}
    }
  ],
  "capabilities": ["location_search", "inventory_analysis"],
  "healthEndpoint": "/health"
}
```

**Benefits Achieved**: ✅
- Plug-and-play agent onboarding without orchestrator changes
- Configuration-driven routing instead of code changes  
- Clear agent capability documentation
- Intent-based tool matching with semantic tags
- Comprehensive health monitoring and statistics

---

### Task 5.2: LLM-Based Intent Classification ⏳
**Status**: PENDING | **Priority**: HIGH | **Time**: 2-3 hours

**Objective**: Replace brittle regex patterns with few-shot LLM classifier for robust intent detection

**Current Problem**:
- Location agent uses keyword matching (lines 270-312 in server.ts)
- Fails on paraphrases ("biggest pile" vs "highest quantity")
- Cannot handle multi-part queries ("compare X and Y, then rank Z")

**Implementation Steps**:
- [ ] Create few-shot prompt with 8-10 canonical examples per intent
- [ ] Implement confidence scoring for intent classification  
- [ ] Add support for multi-part query detection and decomposition
- [ ] Create fallback classification strategies for low confidence
- [ ] Add intent validation against available agents/tools from registry

**Few-Shot Examples**:
```
Query: "What product has the highest quantity?"
Intent: ranking_analysis
Confidence: 95
Agents: [location-agent-001]
Tools: [quantity_analysis, find_product_locations]

Query: "Compare frozen vs dry areas then show top 3 expiring"  
Intent: multi_step_analysis
Confidence: 90
Agents: [location-agent-001]
Steps: [area_comparison, expiration_analysis]
```

**Benefits**:
- Better handling of natural language variations
- Confidence-based routing decisions  
- Support for complex multi-step queries

---

### Task 5.3: Tool Plan Graph Generation ⏳
**Status**: PENDING | **Priority**: HIGH | **Time**: 4-5 hours

**Objective**: Build intelligent planner that creates execution graphs with dependencies

**Current Problem**:
- Only individual agents can plan multi-tool workflows
- No cross-agent coordination for complex queries
- No parallel execution optimization

**Implementation Steps**:
- [ ] Design tool-plan graph data structure with nodes and dependencies
- [ ] Create planner prompt that generates execution graphs from queries
- [ ] Implement dependency resolution for sequential vs parallel execution
- [ ] Add support for context passing between tool calls ({{step1.result}})
- [ ] Create graph validation and optimization logic

**Graph Structure**:
```json
{
  "planId": "plan_123",
  "query": "Compare dry vs frozen areas then find top expiring products",
  "nodes": [
    {
      "id": "step1", 
      "agent": "location-agent-001",
      "tool": "get_inventory_by_area",
      "params": {"areaId": "D"},
      "dependencies": []
    },
    {
      "id": "step2",
      "agent": "location-agent-001", 
      "tool": "get_inventory_by_area",
      "params": {"areaId": "F"},
      "dependencies": []
    },
    {
      "id": "step3",
      "agent": "location-agent-001",
      "tool": "check_expiration_dates", 
      "params": {"products": "{{step1.products + step2.products}}"},
      "dependencies": ["step1", "step2"]
    }
  ]
}
```

**Benefits**:
- Complex multi-agent/multi-tool workflows
- Parallel execution where possible
- Proper dependency management and context passing

---

### Task 5.4: Deterministic Execution Engine ⏳
**Status**: PENDING | **Priority**: HIGH | **Time**: 3-4 hours

**Objective**: Create robust executor that walks graphs with retries and validation

**Current Problem**:
- No centralized execution orchestration
- Limited error handling and retry logic
- No performance metrics or observability

**Implementation Steps**:
- [ ] Build graph execution engine with Promise.all for parallel nodes
- [ ] Implement JSON schema validation for all tool outputs
- [ ] Add retry logic with exponential backoff for transient failures
- [ ] Create execution metrics and timing collection
- [ ] Add circuit breaker pattern for failing tools

**Execution Engine Features**:
```typescript
class ExecutionEngine {
  async executeGraph(plan: ToolPlanGraph): Promise<ExecutionResult> {
    // Topological sort for execution order
    // Parallel execution of independent nodes
    // Schema validation and retry logic
    // Metric collection and logging
  }
}
```

**Benefits**:
- Reliable multi-tool orchestration
- Better observability and debugging
- Graceful handling of tool failures
- Performance optimization through parallelization

---

### Task 5.5: Dedicated Summariser Agent ⏳
**Status**: PENDING | **Priority**: MEDIUM | **Time**: 2-3 hours

**Objective**: Centralize response generation for unified brand voice and quality

**Current Problem**:
- Each agent generates its own prose responses
- Inconsistent tone and formatting across responses
- No central place to improve response quality

**Implementation Steps**:
- [ ] Create new summariser agent focused on response generation
- [ ] Design structured input format for raw tool results
- [ ] Implement brand voice and style guidelines in summariser
- [ ] Add context-aware response formatting based on query type
- [ ] Create escalation handling for clarification requests

**Summariser Input**:
```json
{
  "query": "What product has the highest quantity?",
  "intent": "ranking_analysis", 
  "toolResults": [
    {"tool": "quantity_analysis", "result": {...}},
    {"tool": "find_product_locations", "result": {...}}
  ],
  "context": {"user_preference": "detailed"}
}
```

**Benefits**:
- Consistent response quality across all queries
- Centralized place to improve prose and tone  
- Better handling of complex multi-tool results
- A/B testing of response formats

---

### Task 5.6: Revised Agent Contracts ⏳
**Status**: PENDING | **Priority**: MEDIUM | **Time**: 2-3 hours

**Objective**: Update agent interfaces for structured responses and escalation

**Current Problem**:
- Agents return mixed markdown and data
- No standardized error handling or escalation
- Difficult to separate data from presentation

**Implementation Steps**:
- [ ] Define new agent response contract with structured JSON
- [ ] Add escalation flags ("clarify", "summary", null)
- [ ] Implement context field for intermediate results
- [ ] Update location agent to new contract
- [ ] Add response validation in orchestrator

**New Response Contract**:
```json
{
  "ok": true,
  "payload": {
    "products": [...],
    "locations": [...],
    "metadata": {...}
  },
  "escalate": null | "clarify" | "summary",
  "confidence": 0.95,
  "reasoning": ["step1", "step2"],
  "metrics": {"executionTime": 1234, "toolsCalled": 2}
}
```

**Benefits**:
- Clear separation between data and presentation
- Better error handling and clarification flows
- Easier testing and validation
- Standardized escalation patterns

---

## ✅ **PHASE 1 COMPLETION STATUS**

### **Task 5.1: Agent Registry with Manifest Discovery** ✅ COMPLETED
**Achievement**: Successfully decoupled orchestrator from hard-coded agent knowledge
- **Files Created**: `apps/orchestrator/src/registry/AgentRegistry.ts` (346 lines)
- **Files Modified**: 
  - `apps/location-agent/src/server.ts` (added manifest system)
  - `apps/orchestrator/src/app.ts` (integrated registry)
  - `packages/mcp-tools/src/server.ts` (added getAllTools)
- **Key Features**: Dynamic agent discovery, intent tag mapping, health monitoring
- **Impact**: New agents can be added without orchestrator code changes

### **Remaining Tasks**: 
- **Task 5.2**: LLM-Based Intent Classification (NEXT - IN PROGRESS)
- **Task 5.3**: Tool Plan Graph Generation  
- **Task 5.4**: Deterministic Execution Engine
- **Task 5.5**: Dedicated Summariser Agent
- **Task 5.6**: Revised Agent Contracts

## 📋 **MIGRATION STRATEGY**

### Phase 0: Registry Foundation ✅ COMPLETED
- ✅ Added manifest capability to location agent via `getManifest()` method
- ✅ Created comprehensive registry service with health monitoring  
- ✅ Dynamic agent discovery and capabilities without behavior change
- ✅ Foundation established for all future agentic features

### Phase 1: LLM Classification (Feature Flagged) 
- Replace keyword matching with LLM classifier
- Ship behind feature flag for A/B testing
- Validate improved intent detection

### Phase 2: Execution Engine (Single Agent)
- Implement planner and executor but restrict to location agent
- Validates end-to-end graph execution flow
- No multi-agent complexity yet

### Phase 3: Summariser Integration
- Route multi-tool outputs through dedicated summariser
- Collect quality metrics and user feedback
- Refine brand voice and response templates

### Phase 4: Multi-Agent Platform  
- Onboard new agents (space, billing, etc.) using manifests
- Demonstrate plug-and-play agent addition
- Full multi-agent coordination operational

---

## 🎯 **SUCCESS METRICS**

- **Helpfulness**: Multi-tool plans answer compound queries in single response
- **Extensibility**: New agents deployable without orchestrator changes
- **Reliability**: <2% tool failure rate with automatic retries
- **Performance**: 95th percentile response time <5 seconds
- **Consistency**: Unified response quality across all agent types

---

## 🛠️ **TECHNICAL DEBT ADDRESSED**

1. ✅ **Tight Coupling**: Registry decouples orchestrator from agent knowledge
2. ✅ **Brittle Intent Detection**: LLM classifier handles natural language variations
3. ✅ **No Global Planning**: Execution engine coordinates multi-agent workflows
4. ✅ **Inconsistent Responses**: Summariser agent ensures unified brand voice

This transformation evolves the system from a proof-of-concept to a production-ready, extensible warehouse AI platform.