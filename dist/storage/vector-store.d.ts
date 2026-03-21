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
export declare class VectorStore {
    private storagePath;
    private cache;
    constructor(storagePath: string);
    initialize(): Promise<void>;
    save(databaseId: string, chunks: EmbeddingChunk[]): Promise<KnowledgeBase>;
    load(databaseId: string): Promise<KnowledgeBase | null>;
    delete(databaseId: string): Promise<void>;
    list(): Promise<KnowledgeBase[]>;
    search(databaseId: string, query: string, options?: SearchOptions): Promise<SearchResult[]>;
    searchAll(query: string, options?: SearchOptions): Promise<Map<string, SearchResult[]>>;
    getTable(databaseId: string, tableName: string, schema?: string): Promise<EmbeddingChunk | null>;
    getColumn(databaseId: string, tableName: string, columnName: string): Promise<EmbeddingChunk | null>;
    getRelatedTables(databaseId: string, tableName: string): Promise<EmbeddingChunk[]>;
    private groupChunks;
    private calculateSimilarity;
    private getFilePath;
}
//# sourceMappingURL=vector-store.d.ts.map