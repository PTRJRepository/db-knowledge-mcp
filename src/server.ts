import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { createConnector, DatabaseConfig } from './connectors/index';
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

export class MCPService {
  private vectorStore: VectorStore;
  private embedder: SchemaEmbedder;
  private configPromise: Promise<ServerConfig>;
  
  constructor(configPath?: string) {
    const configFile = configPath || CONFIG_PATH;
    this.configPromise = (async () => {
      const data = await fs.readFile(configFile, 'utf-8');
      return JSON.parse(data);
    })();
    
    this.vectorStore = new VectorStore(path.join(process.cwd(), 'knowledgebases'));
    this.embedder = new SchemaEmbedder({
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 1536
    });
  }
  
  async listKnowledgeBases(): Promise<KnowledgeBase[]> {
    return this.vectorStore.list();
  }
  
  async getKnowledgeBase(id: string): Promise<KnowledgeBase | null> {
    return this.vectorStore.load(id);
  }
  
  async scanDatabase(databaseId: string): Promise<{ success: boolean; chunks: number; statistics: any }> {
    const config = await this.configPromise;
    const dbConfig = config.databases.find(d => d.id === databaseId);
    
    if (!dbConfig) {
      throw new Error(`Database not found: ${databaseId}`);
    }
    
    if (!dbConfig.enabled) {
      throw new Error(`Database is disabled: ${databaseId}`);
    }
    
    const connector = createConnector(dbConfig);
    
    try {
      const schema = await connector.getFullSchema();
      const embeddingResult = await this.embedder.embedSchema(schema);
      const knowledgeBase = await this.vectorStore.save(databaseId, embeddingResult.chunks);
      
      return {
        success: true,
        chunks: embeddingResult.chunks.length,
        statistics: knowledgeBase.statistics
      };
    } finally {
      await connector.disconnect();
    }
  }
  
  async scanAllDatabases(): Promise<{ results: any[] }> {
    const config = await this.configPromise;
    const results = [];
    
    for (const db of config.databases) {
      if (db.enabled) {
        try {
          const result = await this.scanDatabase(db.id);
          results.push({ databaseId: db.id, ...result });
        } catch (error: any) {
          results.push({ databaseId: db.id, success: false, error: error.message });
        }
      }
    }
    
    return { results };
  }
  
  async testConnection(databaseId: string): Promise<boolean> {
    const config = await this.configPromise;
    const dbConfig = config.databases.find(d => d.id === databaseId);
    
    if (!dbConfig) {
      throw new Error(`Database not found: ${databaseId}`);
    }
    
    const connector = createConnector(dbConfig);
    
    try {
      return await connector.testConnection();
    } finally {
      await connector.disconnect();
    }
  }
  
  async searchInKnowledgeBase(databaseId: string, query: string, options?: any): Promise<SearchResult[]> {
    return this.vectorStore.search(databaseId, query, options);
  }
}

// Express App
const app = express();
const PORT = 5005;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

const mcpService = new MCPService();

app.get('/api/knowledge-bases', async (req, res) => {
  try {
    const kbs = await mcpService.listKnowledgeBases();
    res.json(kbs);
  } catch (error: any) {
    console.error('Error listing knowledge bases:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/knowledge-bases/:id', async (req, res) => {
  try {
    const kb = await mcpService.getKnowledgeBase(req.params.id);
    if (!kb) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }
    res.json(kb);
  } catch (error: any) {
    console.error('Error getting knowledge base:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scan/:databaseId', async (req, res) => {
  try {
    const result = await mcpService.scanDatabase(req.params.databaseId);
    res.json(result);
  } catch (error: any) {
    console.error('Error scanning database:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scan-all', async (req, res) => {
  try {
    const results = await mcpService.scanAllDatabases();
    res.json(results);
  } catch (error: any) {
    console.error('Error scanning databases:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get(/^\/.*$/, (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.listen(PORT, () => {
  console.log(`DB Knowledge MCP Server running at http://localhost:${PORT}`);
  console.log(`UI Dashboard: http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  GET  /api/knowledge-bases        - List all knowledge bases`);
  console.log(`  GET  /api/knowledge-bases/:id   - Get knowledge base details`);
  console.log(`  POST /api/scan/:databaseId      - Scan a specific database`);
  console.log(`  POST /api/scan-all             - Scan all databases`);
  console.log(`  GET  /api/health               - Health check`);
});

export { app };
