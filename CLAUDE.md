# DB Knowledge MCP - Developer Guide

## Project Overview

Enterprise MCP server for reading database metadata and storing as vector knowledge base. Has two modes:
1. **MCP Mode**: STDIO-based MCP server for AI tool integration
2. **Combined Mode**: Express server + UI Dashboard on port 5005

## Quick Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run MCP server (stdio mode)
npm start

# Run combined server (REST API + UI on port 5005)
npm run start:combined

# Scan all databases
npm run scan-all

# Development watch
npm run dev
```

## Architecture

### Entry Points

| Mode | Entry | Port | Use Case |
|------|-------|------|----------|
| MCP | `dist/mcp-server.js` | STDIO | AI tool integration |
| Combined | `dist/server.js` | 5005 | REST API + UI Dashboard |

### Module Structure

```
src/
├── connectors/     # Database abstraction layer
│   ├── base.ts     # BaseDatabaseConnector abstract class
│   ├── sqlserver.ts
│   ├── mysql.ts
│   ├── postgresql.ts
│   └── index.ts    # createConnector() factory
├── embedder/
│   └── schema-embedder.ts  # Schema → Embedding chunks
├── storage/
│   └── vector-store.ts     # JSON file-based vector store
├── mcp-server.ts   # MCP stdio server (exports startServer())
└── server.ts       # Express + MCPService class
```

### Key Classes

#### VectorStore
```typescript
class VectorStore {
  initialize(): void
  async save(databaseId: string, chunks: EmbeddingChunk[]): Promise<KnowledgeBase>
  async load(databaseId: string): Promise<KnowledgeBase | null>
  async search(databaseId: string, query: string, options?: SearchOptions): Promise<SearchResult[]>
  async searchAll(query: string, options?: SearchOptions): Promise<Map<string, SearchResult[]>>
  async delete(databaseId: string): Promise<void>
}
```

#### SchemaEmbedder
```typescript
class SchemaEmbedder {
  async embedSchema(schema: DatabaseSchema): Promise<{ chunks: EmbeddingChunk[], summary: string }>
  async embedChunk(chunk: EmbeddingChunk): Promise<number[]>
}
```

#### MCPService (in server.ts)
```typescript
class MCPService {
  constructor()
  async scanDatabase(databaseId: string): Promise<ScanResult>
  async scanAllDatabases(): Promise<ScanResult[]>
  async getKnowledgeBases(): Promise<KnowledgeBase[]>
  async getKnowledgeBase(id: string): Promise<KnowledgeBase | null>
  async getGraphData(id: string): Promise<GraphData>
  async search(databaseId: string, query: string, options?: SearchOptions): Promise<SearchResult[]>
  async testConnection(databaseId: string): Promise<boolean>
}
```

## Configuration

Edit `config/databases.json`:

```json
{
  "databases": [
    {
      "id": "unique_id",
      "name": "Display Name",
      "type": "sqlserver|mysql|postgresql",
      "host": "localhost",
      "port": 1433,
      "database": "db_name",
      "username": "user",
      "password": "pass",
      "enabled": true,
      "description": "Optional description"
    }
  ],
  "embedder": {
    "provider": "openai|local",
    "model": "text-embedding-3-small",
    "dimensions": 1536
  },
  "storage": {
    "type": "json|pgvector",
    "path": "knowledgebases"
  }
}
```

## Knowledge Chunk Types

| Type | Description | Content |
|------|-------------|---------|
| database_overview | Summary of entire database | Name, table count, description |
| table | Individual table schema | Name, columns, indexes, FKs |
| column | Column details | Name, type, nullable, default |
| relationship | Foreign key relationship | Source → Target mapping |

## UI Dashboard

Located at `public/index.html` - single-page app using:
- **Vis Network**: Graph visualization
- **Vanilla JS**: No framework, fast loading

### API for UI

UI fetches data from these endpoints:

```javascript
// Get all knowledge bases
GET /api/knowledge-bases

// Get graph data for visualization
GET /api/knowledge-bases/:id/graph
// Response: { nodes: [...], edges: [...] }

// Search
GET /api/knowledge-bases/:id/search?q=query

// Scan database
POST /api/scan/:databaseId
```

## Adding New Database Connectors

1. Create new file in `src/connectors/` (e.g., `oracle.ts`)
2. Extend `BaseDatabaseConnector`
3. Implement required methods: `connect()`, `disconnect()`, `getTables()`, `getTableSchema()`, `testConnection()`
4. Export class in `src/connectors/index.ts`

## Environment Variables (Optional)

```bash
# OpenAI API key (if using OpenAI embeddings)
OPENAI_API_KEY=sk-...

# Or use local embeddings (no API key needed)
EMBEDDER_PROVIDER=local
```

## Troubleshooting

### "Cannot find module" errors
```bash
npm run build
```

### Database connection fails
- Check credentials in `config/databases.json`
- Test connectivity: `curl -X POST http://localhost:5005/api/test-connection/:id`

### Empty graph
- Scan database first: `curl -X POST http://localhost:5005/api/scan/:id`
- Check knowledgebases folder for generated files

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Commit changes
git add .
git commit -m "Add feature: my feature"

# Push
git push origin feature/my-feature

# Create PR on GitHub
```
