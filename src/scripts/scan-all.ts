import fs from 'fs/promises';
import path from 'path';
import { createConnector, DatabaseConfig } from '../connectors';
import { SchemaEmbedder } from '../embedder/schema-embedder';
import { VectorStore } from '../storage/vector-store';

interface ServerConfig {
  databases: DatabaseConfig[];
  embedder: {
    provider: 'openai' | 'local';
    model: string;
    dimensions: number;
  };
  storage: {
    type: string;
    path: string;
  };
}

async function loadConfig(): Promise<ServerConfig> {
  const data = await fs.readFile(path.join(process.cwd(), 'config', 'databases.json'), 'utf-8');
  return JSON.parse(data);
}

async function scanAll() {
  console.log('Starting full database scan...\n');
  
  const config = await loadConfig();
  const vectorStore = new VectorStore(path.join(process.cwd(), 'knowledgebases'));
  const embedder = new SchemaEmbedder({
    provider: config.embedder.provider,
    model: config.embedder.model,
    dimensions: config.embedder.dimensions
  });
  
  await vectorStore.initialize();
  
  const results: { databaseId: string; status: 'success' | 'error'; message: string }[] = [];
  
  for (const dbConfig of config.databases) {
    if (!dbConfig.enabled) {
      console.log(`[SKIP] ${dbConfig.name} - disabled`);
      continue;
    }
    
    console.log(`\n[SCANNING] ${dbConfig.name} (${dbConfig.type})...`);
    
    const connector = createConnector(dbConfig);
    
    try {
      const schema = await connector.getFullSchema();
      const embeddingResult = await embedder.embedSchema(schema);
      const knowledgeBase = await vectorStore.save(dbConfig.id, embeddingResult.chunks);
      
      console.log(`[SUCCESS] ${dbConfig.name}`);
      console.log(`  - Tables: ${knowledgeBase.statistics.tables}`);
      console.log(`  - Columns: ${knowledgeBase.statistics.columns}`);
      console.log(`  - Relationships: ${knowledgeBase.statistics.relationships}`);
      console.log(`  - Total chunks: ${knowledgeBase.statistics.totalChunks}`);
      
      results.push({
        databaseId: dbConfig.id,
        status: 'success',
        message: `Scanned ${knowledgeBase.statistics.totalChunks} chunks`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`[ERROR] ${dbConfig.name}: ${errorMessage}`);
      results.push({
        databaseId: dbConfig.id,
        status: 'error',
        message: errorMessage
      });
    } finally {
      await connector.disconnect();
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('SCAN COMPLETE\n');
  
  for (const result of results) {
    const icon = result.status === 'success' ? '✓' : '✗';
    console.log(`${icon} ${result.databaseId}: ${result.message}`);
  }
  
  const successCount = results.filter(r => r.status === 'success').length;
  console.log(`\nTotal: ${successCount}/${results.length} databases scanned successfully`);
}

scanAll().catch(console.error);
