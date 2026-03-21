"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const connectors_1 = require("../connectors");
const schema_embedder_1 = require("../embedder/schema-embedder");
const vector_store_1 = require("../storage/vector-store");
async function loadConfig() {
    const data = await promises_1.default.readFile(path_1.default.join(process.cwd(), 'config', 'databases.json'), 'utf-8');
    return JSON.parse(data);
}
async function scanAll() {
    console.log('Starting full database scan...\n');
    const config = await loadConfig();
    const vectorStore = new vector_store_1.VectorStore(path_1.default.join(process.cwd(), 'knowledgebases'));
    const embedder = new schema_embedder_1.SchemaEmbedder({
        provider: config.embedder.provider,
        model: config.embedder.model,
        dimensions: config.embedder.dimensions
    });
    await vectorStore.initialize();
    const results = [];
    for (const dbConfig of config.databases) {
        if (!dbConfig.enabled) {
            console.log(`[SKIP] ${dbConfig.name} - disabled`);
            continue;
        }
        console.log(`\n[SCANNING] ${dbConfig.name} (${dbConfig.type})...`);
        const connector = (0, connectors_1.createConnector)(dbConfig);
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`[ERROR] ${dbConfig.name}: ${errorMessage}`);
            results.push({
                databaseId: dbConfig.id,
                status: 'error',
                message: errorMessage
            });
        }
        finally {
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
//# sourceMappingURL=scan-all.js.map