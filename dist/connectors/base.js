"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDatabaseConnector = void 0;
class BaseDatabaseConnector {
    config;
    constructor(config) {
        this.config = config;
    }
    async getFullSchema() {
        const tables = await this.getTables();
        let totalColumns = 0;
        for (const table of tables) {
            const fullTable = await this.getTableSchema(table.name, table.schema);
            table.columns = fullTable.columns;
            table.primaryKeys = fullTable.primaryKeys;
            table.foreignKeys = fullTable.foreignKeys;
            table.indexes = fullTable.indexes;
            table.rowCount = fullTable.rowCount;
            totalColumns += table.columns.length;
        }
        return {
            databaseId: this.config.id,
            databaseName: this.config.name,
            databaseType: this.config.type,
            tables,
            totalTables: tables.length,
            totalColumns,
            scannedAt: new Date().toISOString()
        };
    }
}
exports.BaseDatabaseConnector = BaseDatabaseConnector;
//# sourceMappingURL=base.js.map