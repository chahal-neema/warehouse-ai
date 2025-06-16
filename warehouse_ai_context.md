# Warehouse AI MVP - Project Context & Progress (Node.js)

## Project Overview
Building a warehouse AI system using Google's A2A protocol and Anthropic's MCP for natural language queries about inventory, locations, and analytics. Built with Node.js for beautiful UI and fast development.

## Architecture Summary
```
User Query → Orchestrator (A2A Client) → Specialist Agents (A2A Servers) → MCP Tools → WMS Database
```

### Core Components
1. **Orchestrator Agent**: A2A client that routes natural language queries
2. **Location Agent**: A2A server for product location queries  
3. **Inventory Agent**: A2A server for quantity/expiration data
4. **MCP Tools**: Database connectors and calculation tools
5. **Web Interface**: Beautiful React/Next.js frontend with real-time updates

## Technology Stack
- **Node.js 18+**: Backend runtime with ES modules
- **TypeScript**: Type safety and better development experience
- **A2A SDK**: Google's Agent2Agent protocol (JavaScript/TypeScript)
- **MCP SDK**: Anthropic's Model Context Protocol (Node.js implementation)
- **Express.js**: REST API framework with middleware support
- **Socket.io**: Real-time WebSocket communication
- **Next.js/React**: Modern frontend with server-side rendering
- **Tailwind CSS**: Utility-first CSS framework for beautiful UI
- **Prisma**: Modern database ORM with type safety
- **Anthropic SDK**: Claude API integration for NL processing
- **PostgreSQL**: Production database (SQLite for development)

## WMS Data Structure
Based on real warehouse snapshot with these key fields:
```typescript
interface InventoryLocation {
  divisionNumber: string;
  warehouseLocation: string;
  areaId: 'F' | 'D' | 'R'; // Frozen/Dry/Refrigerated
  aisle: number;
  bay: number;
  levelNumber: number;
  productNumber: string;
  productDescription: string;
  qtyAvailableUnits: number;
  qtyAvailableEaches: number;
  expirationDate?: Date;
  slotCube: number;
  availCubeRemaining: number;
  inventoryStatus: string;
  slotStatus: string;
}
```

## Target Query Examples
- Simple: "Where is product 9375387?"
- Inventory: "How many cases of bread do we have?"
- Expiration: "What products expire in the next 30 days?"
- Analytics: "Show me space utilization in frozen area"
- Complex: "What frozen products expire this month that I should move to high-traffic areas?"

## Project Structure
```
warehouse-ai/
├── apps/
│   ├── orchestrator/          # A2A client and query routing
│   │   ├── src/
│   │   │   ├── agents/        # A2A client implementations
│   │   │   ├── nlp/           # Claude integration for intent classification
│   │   │   ├── routes/        # Express.js routes
│   │   │   └── app.ts         # Main application
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── location-agent/        # A2A server for location queries
│   │   ├── src/
│   │   │   ├── skills/        # A2A skill handlers
│   │   │   ├── mcp/           # MCP tool integrations
│   │   │   └── server.ts      # A2A server setup
│   │   └── package.json
│   ├── inventory-agent/       # A2A server for inventory management
│   │   ├── src/
│   │   │   ├── skills/        # A2A skill handlers
│   │   │   ├── mcp/           # MCP tool integrations
│   │   │   └── server.ts      # A2A server setup
│   │   └── package.json
│   └── web-ui/               # Next.js frontend application
│       ├── src/
│       │   ├── app/          # App router pages
│       │   ├── components/   # Reusable UI components
│       │   ├── lib/          # Utilities and API clients
│       │   └── hooks/        # React hooks for state management
│       ├── package.json
│       └── next.config.js
├── packages/
│   ├── mcp-tools/            # Shared MCP tools package
│   │   ├── src/
│   │   │   ├── database/     # Database connectors
│   │   │   ├── calculators/  # Business logic calculations
│   │   │   └── server.ts     # MCP server implementation
│   │   └── package.json
│   ├── types/                # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── warehouse.ts  # Warehouse domain types
│   │   │   ├── a2a.ts        # A2A protocol types
│   │   │   └── mcp.ts        # MCP tool types
│   │   └── package.json
│   └── config/               # Shared configuration
│       ├── src/
│       │   ├── database.ts   # Database configuration
│       │   ├── a2a.ts        # A2A settings
│       │   └── logging.ts    # Structured logging
│       └── package.json
├── tools/
│   ├── scripts/              # Development and deployment scripts
│   ├── database/             # Database migrations and seeds
│   └── docker/               # Docker configurations
├── package.json              # Root package.json with workspaces
├── turbo.json               # Turborepo configuration for monorepo
├── docker-compose.yml       # Development environment
└── README.md
```

## Implementation Phases

### Phase 1: Foundation (Week 1) - Tasks 1.1-2.5
**Goal**: Monorepo setup with A2A, MCP, and database connectivity
**Deliverables**: Project structure, MCP tools, database connection

### Phase 2: Location Agent (Week 2) - Tasks 3.1-4.5  
**Goal**: First working A2A agent with location queries
**Deliverables**: Location Agent responding to A2A queries via MCP tools

### Phase 3: Multi-Agent System (Week 3) - Tasks 5.1-6.5
**Goal**: Orchestrator routing queries between multiple agents
**Deliverables**: Inventory Agent, Orchestrator, basic API

### Phase 4: Beautiful UI (Week 4) - Tasks 7.1-7.5
**Goal**: Production-ready system with stunning interface
**Deliverables**: Next.js UI, real-time updates, deployment ready

## Success Criteria
- **Functional**: 95% accuracy on 20 test queries
- **Performance**: <2 second response time for simple queries  
- **UI/UX**: Beautiful, responsive interface with real-time updates
- **Scalability**: Modular architecture supporting new agents

## Dependencies
```json
{
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "turbo": "^1.11.0",
    "prisma": "^5.7.0"
  }
}
```

### Per App Dependencies:
```json
{
  "orchestrator": [
    "express", "socket.io", "@anthropic-ai/sdk", 
    "a2a-sdk", "cors", "helmet", "winston"
  ],
  "agents": [
    "a2a-sdk", "mcp-sdk", "@prisma/client", "zod"
  ],
  "web-ui": [
    "next", "react", "tailwindcss", "framer-motion",
    "socket.io-client", "react-query", "recharts"
  ],
  "mcp-tools": [
    "mcp-sdk", "@prisma/client", "date-fns", "lodash"
  ]
}
```

---

## Progress Tracking

### ✅ Completed Tasks
<!-- Update this section as tasks are completed -->

### 🚧 Current Task
<!-- Update with current task being worked on -->

### ❌ Blocked/Issues
<!-- Track any blockers or issues encountered -->

### 📝 Notes & Decisions
<!-- Document important decisions and context for future reference -->

---

## Quick Reference Commands

### Development Setup
```bash
# Install dependencies for all workspaces
npm install

# Start all services in development
npm run dev

# Start specific services
npm run dev:orchestrator
npm run dev:location-agent
npm run dev:inventory-agent  
npm run dev:web-ui

# Database operations
npm run db:migrate
npm run db:seed
npm run db:studio
```

### Production Commands
```bash
# Build all applications
npm run build

# Start production servers
npm run start:orchestrator
npm run start:agents
npm run start:web

# Docker deployment
docker-compose up -d
```

### Testing
```bash
# Run all tests
npm run test

# Test specific workspace
npm run test:orchestrator
npm run test:agents
npm run test:mcp-tools

# Integration tests
npm run test:integration

# E2E tests with Playwright
npm run test:e2e
```

## UI/UX Design Goals

### Design System
- **Color Palette**: Professional warehouse/logistics theme
  - Primary: Deep blue (#1e40af) for trust and reliability
  - Secondary: Orange (#f97316) for action and alerts
  - Success: Green (#16a34a) for positive states
  - Warning: Amber (#f59e0b) for attention
  - Error: Red (#dc2626) for critical issues

### Key UI Components
- **Dashboard**: Real-time warehouse overview with key metrics
- **Query Interface**: Chat-style input with autocomplete and suggestions
- **Data Visualization**: Interactive charts for inventory, space utilization, expiration timelines
- **Location Maps**: Visual warehouse layout with product placement
- **Alert Center**: Priority notifications for expiring products, space issues
- **Response Cards**: Structured display of query results with actions

### Responsive Design
- **Desktop**: Full dashboard with multiple panels and advanced features
- **Tablet**: Streamlined interface optimized for warehouse tablets
- **Mobile**: Essential functions for on-the-go warehouse staff

### Real-time Features
- **Live Inventory Updates**: Socket.io for real-time inventory changes
- **Query Streaming**: Stream complex query results as they're processed
- **Collaborative Queries**: Multiple users can see shared query sessions
- **Status Indicators**: Live agent status and system health

## Architecture Diagrams

### A2A Communication Flow (Node.js)
```
Express.js API → Orchestrator Agent (A2A Client)
    ↓ HTTP/WebSocket + A2A Protocol
Location Agent (Express + A2A Server) ← Inventory Agent (Express + A2A Server)
    ↓ MCP Protocol (Node.js)
PostgreSQL ← MCP Tools (Node.js) → Business Logic
```

### Frontend Architecture
```
Next.js App Router → React Components → Tailwind Styling
    ↓
Socket.io Client ← REST API Client → Tanstack Query
    ↓
Real-time Updates ← Query Management → State Management
```

### Monorepo Structure Benefits
- **Shared Types**: TypeScript interfaces across all apps
- **Shared Tools**: Common MCP tools and utilities
- **Coordinated Development**: Turbo for fast builds and testing
- **Type Safety**: End-to-end type safety from database to UI