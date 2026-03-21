"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLConnector = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const base_1 = require("./base");
class MySQLConnector extends base_1.BaseDatabaseConnector {
    pool = null;
    constructor(config) {
        super(config);
    }
    async connect() {
        if (this.pool)
            return;
        this.pool = promise_1.default.createPool({
            host: this.config.host,
            port: this.config.port,
            user: this.config.username,
            password: this.config.password,
            database: this.config.database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        });
    }
    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }
    async testConnection() {
        try {
            await this.connect();
            const [rows] = await this.pool.query('SELECT 1');
            return true;
        }
        catch {
            return false;
        }
    }
    async getTables() {
        await this.connect();
        const [rows] = await this.pool.query(`
      SELECT TABLE_SCHEMA as \`schema\`, TABLE_NAME as name
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
        AND TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);
        return rows.map((row) => ({
            name: row.name,
            schema: row.schema,
            columns: [],
            primaryKeys: [],
            foreignKeys: [],
            indexes: []
        }));
    }
    async getTableSchema(tableName, schema) {
        await this.connect();
        const dbName = schema || this.config.database;
        const [columnsRows] = await this.pool.query(`
      SELECT 
        c.COLUMN_NAME as name,
        c.DATA_TYPE as dataType,
        c.IS_NULLABLE as isNullable,
        c.COLUMN_DEFAULT as defaultValue,
        c.CHARACTER_MAXIMUM_LENGTH as maxLength,
        c.NUMERIC_PRECISION as precision,
        c.NUMERIC_SCALE as scale,
        c.COLUMN_KEY as columnKey,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = c.TABLE_SCHEMA 
           AND TABLE_NAME = c.TABLE_NAME 
           AND COLUMN_NAME = c.COLUMN_NAME
           AND COLUMN_KEY = 'PRI') as isPrimaryKey
      FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_NAME = ? AND c.TABLE_SCHEMA = ?
      ORDER BY c.ORDINAL_POSITION
    `, [tableName, dbName]);
        const columns = columnsRows.map((col) => ({
            name: col.name,
            dataType: col.dataType,
            isNullable: col.isNullable === 'YES',
            isPrimaryKey: col.isPrimaryKey > 0,
            defaultValue: col.defaultValue,
            maxLength: col.maxLength,
            precision: col.precision,
            scale: col.scale,
            isForeignKey: col.columnKey === 'MUL',
            referencedTable: undefined,
            referencedColumn: undefined
        }));
        const primaryKeys = columns.filter(c => c.isPrimaryKey).map(c => c.name);
        const [fkRows] = await this.pool.query(`
      SELECT 
        kcu.COLUMN_NAME as column,
        kcu.CONSTRAINT_NAME as constraintName,
        kcu.REFERENCED_TABLE_NAME as referencedTable,
        kcu.REFERENCED_COLUMN_NAME as referencedColumn,
        rc.UPDATE_RULE as onUpdate,
        rc.DELETE_RULE as onDelete
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
        ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      WHERE kcu.TABLE_NAME = ?
        AND kcu.TABLE_SCHEMA = ?
        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    `, [tableName, dbName]);
        const foreignKeys = fkRows.map((fk) => ({
            name: fk.constraintName,
            column: fk.column,
            referencedTable: fk.referencedTable,
            referencedColumn: fk.referencedColumn,
            onUpdate: fk.onUpdate,
            onDelete: fk.onDelete
        }));
        columns.forEach(col => {
            const fk = foreignKeys.find(f => f.column === col.name);
            if (fk) {
                col.isForeignKey = true;
                col.referencedTable = fk.referencedTable;
                col.referencedColumn = fk.referencedColumn;
            }
        });
        const [indexRows] = await this.pool.query(`
      SELECT 
        INDEX_NAME as name,
        COLUMN_NAME as column,
        NON_UNIQUE as nonUnique,
        INDEX_NAME as indexName
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [tableName, dbName]);
        const indexMap = new Map();
        for (const idx of indexRows) {
            if (!indexMap.has(idx.name)) {
                indexMap.set(idx.name, {
                    name: idx.name,
                    columns: [],
                    isUnique: idx.nonUnique === 0,
                    isPrimary: idx.name === 'PRIMARY'
                });
            }
            indexMap.get(idx.name).columns.push(idx.column);
        }
        const indexes = Array.from(indexMap.values());
        const [[countResult]] = await this.pool.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        const rowCount = countResult.count;
        return {
            name: tableName,
            schema: dbName,
            columns,
            primaryKeys,
            foreignKeys,
            indexes,
            rowCount
        };
    }
}
exports.MySQLConnector = MySQLConnector;
//# sourceMappingURL=mysql.js.map