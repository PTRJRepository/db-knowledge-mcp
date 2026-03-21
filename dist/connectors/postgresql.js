"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgreSQLConnector = void 0;
const pg_1 = require("pg");
const base_1 = require("./base");
class PostgreSQLConnector extends base_1.BaseDatabaseConnector {
    pool = null;
    constructor(config) {
        super(config);
    }
    async connect() {
        if (this.pool)
            return;
        this.pool = new pg_1.Pool({
            host: this.config.host,
            port: this.config.port,
            user: this.config.username,
            password: this.config.password,
            database: this.config.database,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
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
            await this.pool.query('SELECT 1');
            return true;
        }
        catch {
            return false;
        }
    }
    async getTables() {
        await this.connect();
        const result = await this.pool.query(`
      SELECT 
        schemaname as schema,
        tablename as name
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schemaname, tablename
    `);
        return result.rows.map((row) => ({
            name: row.name,
            schema: row.schema,
            columns: [],
            primaryKeys: [],
            foreignKeys: [],
            indexes: []
        }));
    }
    async getTableSchema(tableName, schema = 'public') {
        await this.connect();
        const columnsQuery = `
      SELECT 
        c.column_name as name,
        c.data_type as dataType,
        c.is_nullable = 'YES' as isNullable,
        c.column_default as defaultValue,
        c.character_maximum_length as maxLength,
        c.numeric_precision as precision,
        c.numeric_scale as scale,
        CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END as isPrimaryKey,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as isForeignKey,
        fk.foreign_table_name as referencedTable,
        fk.foreign_column_name as referencedColumn
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu
        ON c.table_name = kcu.table_name 
        AND c.column_name = kcu.column_name
        AND c.table_schema = kcu.table_schema
      LEFT JOIN information_schema.table_constraints tc
        ON kcu.constraint_name = tc.constraint_name
        AND tc.constraint_type = 'PRIMARY KEY'
      LEFT JOIN (
        SELECT 
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
      ) fk ON c.column_name = fk.column_name AND c.table_name = fk.foreign_table_name
      WHERE c.table_name = $1 AND c.table_schema = $2
      ORDER BY c.ordinal_position
    `;
        const columnsResult = await this.pool.query(columnsQuery, [tableName, schema]);
        const columns = columnsResult.rows.map((col) => ({
            name: col.name,
            dataType: col.dataType,
            isNullable: col.isNullable,
            isPrimaryKey: col.isPrimaryKey,
            defaultValue: col.defaultValue,
            maxLength: col.maxLength,
            precision: col.precision,
            scale: col.scale,
            isForeignKey: col.isForeignKey,
            referencedTable: col.referencedTable,
            referencedColumn: col.referencedColumn
        }));
        const primaryKeys = columns.filter(c => c.isPrimaryKey).map(c => c.name);
        const indexesQuery = `
      SELECT 
        i.relname as name,
        ARRAY_AGG(a.attname ORDER BY x.n) as columns,
        ix.indisunique as isUnique,
        ix.indisprimary as isPrimary
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN LATERAL UNNEST(ix.indkey) WITH ORDINALITY AS x(attnum, n) ON true
      JOIN pg_attribute a ON a.attnum = x.attnum AND a.attrelid = t.oid
      WHERE t.relname = $1 AND n.nspname = $2
      GROUP BY i.relname, ix.indisunique, ix.indisprimary
    `;
        const indexesResult = await this.pool.query(indexesQuery, [tableName, schema]);
        const indexes = indexesResult.rows.map((idx) => ({
            name: idx.name,
            columns: idx.columns,
            isUnique: idx.isUnique,
            isPrimary: idx.isPrimary
        }));
        const foreignKeysQuery = `
      SELECT 
        tc.constraint_name as name,
        kcu.column_name as column,
        ccu.table_name AS referencedTable,
        ccu.column_name AS referencedColumn,
        rc.update_rule as onUpdate,
        rc.delete_rule as onDelete
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      LEFT JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.table_name = $1
        AND kcu.table_schema = $2
    `;
        const fkResult = await this.pool.query(foreignKeysQuery, [tableName, schema]);
        const foreignKeys = fkResult.rows.map((fk) => ({
            name: fk.name,
            column: fk.column,
            referencedTable: fk.referencedTable,
            referencedColumn: fk.referencedColumn,
            onUpdate: fk.onUpdate,
            onDelete: fk.onDelete
        }));
        const countResult = await this.pool.query(`SELECT COUNT(*) as count FROM "${schema}"."${tableName}"`);
        const rowCount = parseInt(countResult.rows[0].count);
        return {
            name: tableName,
            schema,
            columns,
            primaryKeys,
            foreignKeys,
            indexes,
            rowCount
        };
    }
}
exports.PostgreSQLConnector = PostgreSQLConnector;
//# sourceMappingURL=postgresql.js.map