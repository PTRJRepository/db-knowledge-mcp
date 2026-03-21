import { DatabaseSchema } from '../connectors/base';
export interface EmbeddingChunk {
    id: string;
    databaseId: string;
    databaseName: string;
    chunkType: 'database_overview' | 'table' | 'column' | 'relationship';
    chunkId: string;
    content: string;
    metadata: {
        tableName?: string;
        schema?: string;
        columnName?: string;
        dataType?: string;
        isPrimaryKey?: boolean;
        isForeignKey?: boolean;
        referencedTable?: string;
        referencedColumn?: string;
    };
    vector?: number[];
}
export interface EmbeddingResult {
    chunks: EmbeddingChunk[];
    totalTokens: number;
    embeddedAt: string;
}
export declare class SchemaEmbedder {
    private embedderConfig;
    constructor(embedderConfig: EmbedderConfig);
    embedSchema(schema: DatabaseSchema): Promise<EmbeddingResult>;
    private createDatabaseOverviewChunk;
    private createTableChunk;
    private createColumnChunk;
    private createRelationshipChunk;
    private estimateTokens;
}
export interface EmbedderConfig {
    provider: 'openai' | 'local';
    model: string;
    dimensions: number;
    apiKey?: string;
    endpoint?: string;
}
//# sourceMappingURL=schema-embedder.d.ts.map