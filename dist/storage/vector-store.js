"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStore = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class VectorStore {
    storagePath;
    cache = new Map();
    constructor(storagePath) {
        this.storagePath = storagePath;
    }
    async initialize() {
        await promises_1.default.mkdir(this.storagePath, { recursive: true });
    }
    async save(databaseId, chunks) {
        const existing = await this.load(databaseId);
        const groupedChunks = this.groupChunks(chunks);
        const now = new Date().toISOString();
        const knowledgeBase = {
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
        await promises_1.default.writeFile(filePath, JSON.stringify(knowledgeBase, null, 2), 'utf-8');
        this.cache.set(databaseId, knowledgeBase);
        return knowledgeBase;
    }
    async load(databaseId) {
        if (this.cache.has(databaseId)) {
            return this.cache.get(databaseId);
        }
        const filePath = this.getFilePath(databaseId);
        try {
            const data = await promises_1.default.readFile(filePath, 'utf-8');
            const knowledgeBase = JSON.parse(data);
            this.cache.set(databaseId, knowledgeBase);
            return knowledgeBase;
        }
        catch {
            return null;
        }
    }
    async delete(databaseId) {
        const filePath = this.getFilePath(databaseId);
        await promises_1.default.unlink(filePath).catch(() => { });
        this.cache.delete(databaseId);
    }
    async list() {
        await this.initialize();
        const files = await promises_1.default.readdir(this.storagePath);
        const knowledgeBases = [];
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
    async search(databaseId, query, options = {}) {
        const kb = await this.load(databaseId);
        if (!kb)
            return [];
        const queryLower = query.toLowerCase();
        const results = [];
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
    async searchAll(query, options = {}) {
        const allKbs = await this.list();
        const resultsMap = new Map();
        for (const kb of allKbs) {
            const results = await this.search(kb.databaseId, query, options);
            if (results.length > 0) {
                resultsMap.set(kb.databaseId, results);
            }
        }
        return resultsMap;
    }
    async getTable(databaseId, tableName, schema) {
        const kb = await this.load(databaseId);
        if (!kb)
            return null;
        return kb.chunks.find(c => c.chunkType === 'table' &&
            c.metadata.tableName === tableName &&
            (!schema || c.metadata.schema === schema)) || null;
    }
    async getColumn(databaseId, tableName, columnName) {
        const kb = await this.load(databaseId);
        if (!kb)
            return null;
        return kb.chunks.find(c => c.chunkType === 'column' &&
            c.metadata.tableName === tableName &&
            c.metadata.columnName === columnName) || null;
    }
    async getRelatedTables(databaseId, tableName) {
        const kb = await this.load(databaseId);
        if (!kb)
            return [];
        return kb.chunks.filter(c => c.chunkType === 'relationship' &&
            (c.metadata.tableName === tableName || c.metadata.referencedTable === tableName));
    }
    groupChunks(chunks) {
        return {
            databaseOverview: chunks.filter(c => c.chunkType === 'database_overview'),
            tables: chunks.filter(c => c.chunkType === 'table'),
            columns: chunks.filter(c => c.chunkType === 'column'),
            relationships: chunks.filter(c => c.chunkType === 'relationship')
        };
    }
    calculateSimilarity(query, content) {
        const queryWords = new Set(query.split(/\s+/).filter(w => w.length > 2));
        const contentWords = new Set(content.split(/\s+/).filter(w => w.length > 2));
        let matches = 0;
        for (const word of queryWords) {
            if (contentWords.has(word)) {
                matches++;
            }
            else {
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
    getFilePath(databaseId) {
        return path_1.default.join(this.storagePath, `${databaseId}.json`);
    }
}
exports.VectorStore = VectorStore;
//# sourceMappingURL=vector-store.js.map