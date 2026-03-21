import fs from 'fs/promises';
import path from 'path';
import { EmbeddingChunk } from '../embedder/schema-embedder';

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  databaseId: string;
  chunks: StoredChunk[];
  createdAt: string;
  updatedAt: string;
  statistics: {
    totalChunks: number;
    databaseOverview: number;
    tables: number;
    columns: number;
    relationships: number;
  };
}

export interface StoredChunk extends EmbeddingChunk {
  embeddedAt: string;
}

export interface SearchResult {
  chunk: EmbeddingChunk;
  score: number;
}

export interface SearchOptions {
  limit?: number;
  minScore?: number;
  chunkTypes?: string[];
  tableName?: string;
}

export class VectorStore {
  private storagePath: string;
  private cache: Map<string, KnowledgeBase> = new Map();

  constructor(storagePath: string) {
    this.storagePath = storagePath;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.storagePath, { recursive: true });
  }

  async save(databaseId: string, chunks: EmbeddingChunk[]): Promise<KnowledgeBase> {
    const existing = await this.load(databaseId);
    
    const groupedChunks = this.groupChunks(chunks);
    const now = new Date().toISOString();

    const knowledgeBase: KnowledgeBase = {
      id: databaseId,
      name: chunks[0]?.databaseName || databaseId,
      description: `Knowledge base for ${chunks[0]?.databaseName || databaseId}`,
      databaseId,
      chunks: chunks.map(c => ({ ...c, embeddedAt: now })),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      statistics: {
        totalChunks: chunks.length,
        databaseOverview: groupedChunks.databaseOverview.length,
        tables: groupedChunks.tables.length,
        columns: groupedChunks.columns.length,
        relationships: groupedChunks.relationships.length
      }
    };

    const filePath = this.getFilePath(databaseId);
    await fs.writeFile(filePath, JSON.stringify(knowledgeBase, null, 2), 'utf-8');
    
    this.cache.set(databaseId, knowledgeBase);
    
    return knowledgeBase;
  }

  async load(databaseId: string): Promise<KnowledgeBase | null> {
    if (this.cache.has(databaseId)) {
      return this.cache.get(databaseId)!;
    }

    const filePath = this.getFilePath(databaseId);
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const knowledgeBase = JSON.parse(data) as KnowledgeBase;
      this.cache.set(databaseId, knowledgeBase);
      return knowledgeBase;
    } catch {
      return null;
    }
  }

  async delete(databaseId: string): Promise<void> {
    const filePath = this.getFilePath(databaseId);
    await fs.unlink(filePath).catch(() => {});
    this.cache.delete(databaseId);
  }

  async list(): Promise<KnowledgeBase[]> {
    await this.initialize();
    const files = await fs.readdir(this.storagePath);
    const knowledgeBases: KnowledgeBase[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const databaseId = file.replace('.json', '');
        const kb = await this.load(databaseId);
        if (kb) {
          knowledgeBases.push(kb);
        }
      }
    }

    return knowledgeBases;
  }

  async search(databaseId: string, query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const kb = await this.load(databaseId);
    if (!kb) return [];

    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const chunk of kb.chunks) {
      if (options.chunkTypes && !options.chunkTypes.includes(chunk.chunkType)) {
        continue;
      }

      if (options.tableName && chunk.metadata.tableName !== options.tableName) {
        continue;
      }

      const score = this.calculateSimilarity(queryLower, chunk.content.toLowerCase());
      
      if (score >= (options.minScore || 0)) {
        results.push({ chunk, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, options.limit || 10);
  }

  async searchAll(query: string, options: SearchOptions = {}): Promise<Map<string, SearchResult[]>> {
    const allKbs = await this.list();
    const resultsMap = new Map<string, SearchResult[]>();

    for (const kb of allKbs) {
      const results = await this.search(kb.databaseId, query, options);
      if (results.length > 0) {
        resultsMap.set(kb.databaseId, results);
      }
    }

    return resultsMap;
  }

  async getTable(databaseId: string, tableName: string, schema?: string): Promise<EmbeddingChunk | null> {
    const kb = await this.load(databaseId);
    if (!kb) return null;

    return kb.chunks.find(c => 
      c.chunkType === 'table' && 
      c.metadata.tableName === tableName &&
      (!schema || c.metadata.schema === schema)
    ) || null;
  }

  async getColumn(databaseId: string, tableName: string, columnName: string): Promise<EmbeddingChunk | null> {
    const kb = await this.load(databaseId);
    if (!kb) return null;

    return kb.chunks.find(c =>
      c.chunkType === 'column' &&
      c.metadata.tableName === tableName &&
      c.metadata.columnName === columnName
    ) || null;
  }

  async getRelatedTables(databaseId: string, tableName: string): Promise<EmbeddingChunk[]> {
    const kb = await this.load(databaseId);
    if (!kb) return [];

    return kb.chunks.filter(c =>
      c.chunkType === 'relationship' &&
      (c.metadata.tableName === tableName || c.metadata.referencedTable === tableName)
    );
  }

  private groupChunks(chunks: EmbeddingChunk[]): Record<string, EmbeddingChunk[]> {
    return {
      databaseOverview: chunks.filter(c => c.chunkType === 'database_overview'),
      tables: chunks.filter(c => c.chunkType === 'table'),
      columns: chunks.filter(c => c.chunkType === 'column'),
      relationships: chunks.filter(c => c.chunkType === 'relationship')
    };
  }

  private calculateSimilarity(query: string, content: string): number {
    const queryWords = new Set(query.split(/\s+/).filter(w => w.length > 2));
    const contentWords = new Set(content.split(/\s+/).filter(w => w.length > 2));
    
    let matches = 0;
    for (const word of queryWords) {
      if (contentWords.has(word)) {
        matches++;
      } else {
        for (const contentWord of contentWords) {
          if (contentWord.includes(word) || word.includes(contentWord)) {
            matches += 0.5;
            break;
          }
        }
      }
    }

    const queryLength = queryWords.size;
    const maxPossibleMatches = Math.max(queryLength, 1);
    
    return matches / maxPossibleMatches;
  }

  private getFilePath(databaseId: string): string {
    return path.join(this.storagePath, `${databaseId}.json`);
  }
}
