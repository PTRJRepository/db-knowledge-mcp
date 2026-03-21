import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { createConnector, DatabaseConfig } from './connectors';
import { SchemaEmbedder } from './embedder/schema-embedder';
import { VectorStore, KnowledgeBase, SearchResult } from './storage/vector-store';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'databases.json');

interface ServerConfig {
  databases: DatabaseConfig[];
  embedder: {
    provider: string;
    model: string;
    dimensions: number;
  };
  storage: {
    type: string;
    path: string;
  };
}

async function loadConfig(): Promise<ServerConfig> {
  const data = await fs.readFile(CONFIG_PATH, 'utf-8');
  return JSON.parse(data);
}

const configPromise = loadConfig();
const vectorStore = new VectorStore(path.join(process.cwd(), 'knowledgebases'));
const embedder = new SchemaEmbedder({
  provider: 'openai',
  model: 'text-embedding-3-small',
  dimensions: 1536
});

const mcp = new FastMCP({
  name: 'db-knowledge-mcp',
  version: '1.0.0',
  instructions: 'Enterprise Database Schema Knowledge Base - Reads database metadata and stores as searchable vector knowledge for AI agents'
});

const ListDatabasesArgs = z.object({});
const ScanDatabaseArgs = z.object({
  databaseId: z.string(),
  options: z.object({
    tables: z.array(z.string()).optional()
  }).optional()
});
const SearchKnowledgeArgs = z.object({
  query: z.string(),
  databaseId: z.string().optional(),
  options: z.object({
    limit: z.number().default(10),
    minScore: z.number().default(0.1),
    chunkTypes: z.array(z.enum(['database_overview', 'table', 'column', 'relationship'])).optional()
  }).optional()
});
const GetTableInfoArgs = z.object({
  databaseId: z.string(),
  tableName: z.string(),
  schema: z.string().optional()
});
const GetColumnInfoArgs = z.object({
  databaseId: z.string(),
  tableName: z.string(),
  columnName: z.string()
});
const GetRelationshipsArgs = z.object({
  databaseId: z.string(),
  tableName: z.string()
});
const GetOverviewArgs = z.object({
  databaseId: z.string()
});
const DeleteKnowledgeArgs = z.object({
  databaseId: z.string()
});
const TestConnectionArgs = z.object({
  databaseId: z.string()
});

mcp.addTool({
  name: 'list_databases',
  description: 'List all configured databases in the knowledge base',
  annotations: { readOnlyHint: true },
  parameters: ListDatabasesArgs,
  async execute() {
    const config = await configPromise;
    const knowledgeBases = await vectorStore.list();
    
    const dbList = config.databases.map(db => {
      const kb = knowledgeBases.find(k => k.databaseId === db.id);
      return {
        id: db.id,
        name: db.name,
        type: db.type,
        description: db.description,
        enabled: db.enabled,
        hasKnowledgeBase: !!kb,
        lastUpdated: kb?.updatedAt || null,
        statistics: kb?.statistics || null
      };
    });

    return { content: [{ type: 'text' as const, text: JSON.stringify(dbList, null, 2) }] };
  }
});

mcp.addTool({
  name: 'scan_database',
  description: 'Scan a database and store its schema in the knowledge base',
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  parameters: ScanDatabaseArgs,
  async execute(args) {
    const { databaseId } = args;
    const config = await configPromise;
    const dbConfig = config.databases.find(d => d.id === databaseId);
    
    if (!dbConfig) {
      return { content: [{ type: 'text' as const, text: `Database not found: ${databaseId}` }], isError: true };
    }

    if (!dbConfig.enabled) {
      return { content: [{ type: 'text' as const, text: `Database is disabled: ${databaseId}` }], isError: true };
    }

    const connector = createConnector(dbConfig);
    
    try {
      const schema = await connector.getFullSchema();
      const embeddingResult = await embedder.embedSchema(schema);
      const knowledgeBase = await vectorStore.save(databaseId, embeddingResult.chunks);
      
      return {
        content: [{
          type: 'text' as const,
          text: `Successfully scanned database ${databaseId}.\nStored ${embeddingResult.chunks.length} knowledge chunks.\n\nStatistics:\n${JSON.stringify(knowledgeBase.statistics, null, 2)}`
        }]
      };
    } finally {
      await connector.disconnect();
    }
  }
});

mcp.addTool({
  name: 'search_knowledge',
  description: 'Search the database knowledge base for schema information',
  annotations: { readOnlyHint: true },
  parameters: SearchKnowledgeArgs,
  async execute(args) {
    const { query, databaseId, options = {} } = args;
    let results: Map<string, SearchResult[]>;
    
    if (databaseId) {
      const searchResults = await vectorStore.search(databaseId, query, options);
      results = new Map([[databaseId, searchResults]]);
    } else {
      results = await vectorStore.searchAll(query, options);
    }

    const formatted: string[] = [];
    
    for (const [dbId, searchResults] of results) {
      if (searchResults.length === 0) continue;
      
      formatted.push(`\n=== Database: ${dbId} ===`);
      
      for (const result of searchResults) {
        formatted.push(`\n[Score: ${result.score.toFixed(3)}] ${result.chunk.chunkType.toUpperCase()}`);
        if (result.chunk.metadata.tableName) {
          formatted.push(`Table: ${result.chunk.metadata.schema}.${result.chunk.metadata.tableName}`);
        }
        if (result.chunk.metadata.columnName) {
          formatted.push(`Column: ${result.chunk.metadata.columnName} (${result.chunk.metadata.dataType})`);
        }
        formatted.push(`\`\`\`\n${result.chunk.content}\n\`\`\``);
      }
    }

    if (formatted.length === 0) {
      return { content: [{ type: 'text' as const, text: 'No results found.' }] };
    }

    return { content: [{ type: 'text' as const, text: formatted.join('\n') }] };
  }
});

mcp.addTool({
  name: 'get_table_info',
  description: 'Get detailed information about a specific table',
  annotations: { readOnlyHint: true },
  parameters: GetTableInfoArgs,
  async execute(args) {
    const { databaseId, tableName, schema } = args;
    const result = await vectorStore.getTable(databaseId, tableName, schema);
    
    if (!result) {
      return {
        content: [{ type: 'text' as const, text: `Table ${tableName} not found in knowledge base. Try scanning the database first.` }]
      };
    }

    return { content: [{ type: 'text' as const, text: result.content }] };
  }
});

mcp.addTool({
  name: 'get_column_info',
  description: 'Get detailed information about a specific column',
  annotations: { readOnlyHint: true },
  parameters: GetColumnInfoArgs,
  async execute(args) {
    const { databaseId, tableName, columnName } = args;
    const result = await vectorStore.getColumn(databaseId, tableName, columnName);
    
    if (!result) {
      return { content: [{ type: 'text' as const, text: `Column ${tableName}.${columnName} not found in knowledge base.` }] };
    }

    return { content: [{ type: 'text' as const, text: result.content }] };
  }
});

mcp.addTool({
  name: 'get_table_relationships',
  description: 'Get all relationships (foreign keys) for a table',
  annotations: { readOnlyHint: true },
  parameters: GetRelationshipsArgs,
  async execute(args) {
    const { databaseId, tableName } = args;
    const relationships = await vectorStore.getRelatedTables(databaseId, tableName);
    
    if (relationships.length === 0) {
      return { content: [{ type: 'text' as const, text: `No relationships found for table ${tableName}.` }] };
    }

    const formatted = relationships.map(r => {
      return `[${r.metadata.tableName}.${r.metadata.columnName}] -> [${r.metadata.referencedTable}.${r.metadata.referencedColumn}]\n${r.content}`;
    }).join('\n\n');

    return { content: [{ type: 'text' as const, text: formatted }] };
  }
});

mcp.addTool({
  name: 'get_database_overview',
  description: 'Get overview of a database including all tables',
  annotations: { readOnlyHint: true },
  parameters: GetOverviewArgs,
  async execute(args) {
    const { databaseId } = args;
    const kb = await vectorStore.load(databaseId);
    
    if (!kb) {
      return {
        content: [{ type: 'text' as const, text: `Knowledge base not found for ${databaseId}. Try scanning the database first.` }]
      };
    }

    const overview = kb.chunks.find(c => c.chunkType === 'database_overview');
    const tables = kb.chunks.filter(c => c.chunkType === 'table');

    let response = `Database: ${kb.name}\n`;
    if (overview) {
      response += `\n${overview.content}\n`;
    }
    response += `\n\nTables (${tables.length}):\n`;
    for (const table of tables) {
      response += `- ${table.metadata.schema}.${table.metadata.tableName}\n`;
    }

    return { content: [{ type: 'text' as const, text: response }] };
  }
});

mcp.addTool({
  name: 'delete_knowledge_base',
  description: 'Delete a database knowledge base',
  annotations: { readOnlyHint: false, destructiveHint: true },
  parameters: DeleteKnowledgeArgs,
  async execute(args) {
    const { databaseId } = args;
    await vectorStore.delete(databaseId);
    return { content: [{ type: 'text' as const, text: `Knowledge base deleted for ${databaseId}.` }] };
  }
});

mcp.addTool({
  name: 'test_connection',
  description: 'Test connection to a database',
  annotations: { readOnlyHint: true },
  parameters: TestConnectionArgs,
  async execute(args) {
    const { databaseId } = args;
    const config = await configPromise;
    const dbConfig = config.databases.find(d => d.id === databaseId);
    
    if (!dbConfig) {
      return { content: [{ type: 'text' as const, text: `Database not found: ${databaseId}` }] };
    }

    const connector = createConnector(dbConfig);
    
    try {
      const connected = await connector.testConnection();
      return {
        content: [{
          type: 'text' as const,
          text: connected 
            ? `Successfully connected to ${dbConfig.name} (${dbConfig.type})`
            : `Failed to connect to ${dbConfig.name}`
        }]
      };
    } finally {
      await connector.disconnect();
    }
  }
});

export function startServer() {
  vectorStore.initialize();
  mcp.start({ transportType: 'stdio' });
  console.log('DB Knowledge MCP Server started');
}

startServer();
