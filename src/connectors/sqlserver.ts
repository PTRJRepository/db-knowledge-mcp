import mssql, { ConnectionPool } from 'mssql';
import { BaseDatabaseConnector, DatabaseConfig, TableInfo, ColumnInfo, ForeignKeyInfo, IndexInfo } from './base';

export class SQLServerConnector extends BaseDatabaseConnector {
  private pool: ConnectionPool | null = null;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    if (this.pool) return;

    const poolConfig: mssql.config = {
      server: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };

    this.pool = await mssql.connect(poolConfig);
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      await this.pool!.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async getTables(): Promise<TableInfo[]> {
    await this.connect();

    const query = `
      SELECT 
        TABLE_SCHEMA as [schema],
        TABLE_NAME as name
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;

    const result = await this.pool!.query(query);
    
    return result.recordset.map((row: any) => ({
      name: row.name,
      schema: row.schema,
      columns: [],
      primaryKeys: [],
      foreignKeys: [],
      indexes: []
    }));
  }

  async getTableSchema(tableName: string, schema: string = 'dbo'): Promise<TableInfo> {
    await this.connect();

    const columnsQuery = `
      SELECT 
        c.COLUMN_NAME as name,
        c.DATA_TYPE as dataType,
        c.IS_NULLABLE as isNullable,
        c.COLUMN_DEFAULT as defaultValue,
        c.CHARACTER_MAXIMUM_LENGTH as maxLength,
        c.NUMERIC_PRECISION as precision,
        c.NUMERIC_SCALE as scale,
        CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as isPrimaryKey,
        fk.isForeignKey,
        fk.referencedTable,
        fk.referencedColumn
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN (
        SELECT ku.COLUMN_NAME, ku.TABLE_SCHEMA, ku.TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku 
          ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
        WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME 
        AND c.TABLE_SCHEMA = pk.TABLE_SCHEMA 
        AND c.TABLE_NAME = pk.TABLE_NAME
      LEFT JOIN (
        SELECT 
          fk_cols.COLUMN_NAME,
          fk_cols.TABLE_SCHEMA,
          fk_cols.TABLE_NAME,
          1 as isForeignKey,
          pk_tc.TABLE_NAME as referencedTable,
          pk_cols.COLUMN_NAME as referencedColumn
        FROM INFORMATION_SCHEMA.FOREIGN_KEY_COLUMNS fk_cols
        JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS fk_tc
          ON fk_cols.CONSTRAINT_OBJECT_ID = fk_tc.OBJECT_ID
        JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk_tc
          ON fk_cols.REFERENCED_OBJECT_ID = pk_tc.OBJECT_ID
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pk_cols
          ON fk_cols.REFERENCED_OBJECT_ID = pk_cols.OBJECT_ID
          AND fk_cols.REFERENCED_COLUMN_NAME = pk_cols.COLUMN_NAME
        WHERE fk_tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
      ) fk ON c.COLUMN_NAME = fk.COLUMN_NAME
        AND c.TABLE_SCHEMA = fk.TABLE_SCHEMA
        AND c.TABLE_NAME = fk.TABLE_NAME
      WHERE c.TABLE_NAME = @tableName AND c.TABLE_SCHEMA = @schema
      ORDER BY c.ORDINAL_POSITION
    `;

    const request = this.pool!.request();
    request.input('tableName', mssql.VarChar, tableName);
    request.input('schema', mssql.VarChar, schema);
    
    const columnsResult = await request.query(columnsQuery);
    
    const columns: ColumnInfo[] = columnsResult.recordset.map((col: any) => ({
      name: col.name,
      dataType: col.dataType,
      isNullable: col.isNullable === 'YES',
      isPrimaryKey: col.isPrimaryKey === 1,
      defaultValue: col.defaultValue,
      maxLength: col.maxLength,
      precision: col.precision,
      scale: col.scale,
      isForeignKey: col.isForeignKey === 1,
      referencedTable: col.referencedTable,
      referencedColumn: col.referencedColumn
    }));

    const primaryKeys = columns.filter(c => c.isPrimaryKey).map(c => c.name);

    const indexesQuery = `
      SELECT 
        i.name as name,
        STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY iic.key_ordinal) as columns,
        i.is_unique as isUnique,
        i.is_primary_key as isPrimary
      FROM sys.indexes i
      JOIN sys.index_columns iic ON i.object_id = iic.object_id AND i.index_id = iic.index_id
      JOIN sys.columns c ON i.object_id = c.object_id AND iic.column_id = c.column_id
      JOIN sys.tables t ON i.object_id = t.object_id
      JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE t.name = @tableName AND s.name = @schema
        AND i.type > 0
      GROUP BY i.name, i.is_unique, i.is_primary_key
    `;

    const request2 = this.pool!.request();
    request2.input('tableName', mssql.VarChar, tableName);
    request2.input('schema', mssql.VarChar, schema);
    
    const indexesResult = await request2.query(indexesQuery);
    const indexes: IndexInfo[] = indexesResult.recordset.map((idx: any) => ({
      name: idx.name,
      columns: idx.columns.split(', '),
      isUnique: idx.isUnique,
      isPrimary: idx.isPrimary
    }));

    const foreignKeysQuery = `
      SELECT 
        fk.name as name,
        kcu.COLUMN_NAME as column,
        pc.TABLE_NAME as referencedTable,
        pkc.COLUMN_NAME as referencedColumn,
        fk.update_referential_action as onUpdate,
        fk.delete_referential_action as onDelete
      FROM sys.foreign_keys fk
      JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON fk.parent_object_id = tc.CONSTRAINT_OBJECT_ID
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
        ON fkc.parent_column_id = kcu.ORDINAL_POSITION
        AND fkc.parent_object_id = OBJECT_ID(kcu.TABLE_SCHEMA + '.' + kcu.TABLE_NAME)
      JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS pc ON fk.referenced_object_id = pc.CONSTRAINT_OBJECT_ID
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pkc
        ON fkc.referenced_column_id = pkc.ORDINAL_POSITION
        AND fkc.referenced_object_id = OBJECT_ID(pkc.TABLE_SCHEMA + '.' + pkc.TABLE_NAME)
      WHERE tc.TABLE_NAME = @tableName AND tc.TABLE_SCHEMA = @schema
    `;

    const request3 = this.pool!.request();
    request3.input('tableName', mssql.VarChar, tableName);
    request3.input('schema', mssql.VarChar, schema);
    
    const fkResult = await request3.query(foreignKeysQuery);
    const foreignKeys: ForeignKeyInfo[] = fkResult.recordset.map((fk: any) => ({
      name: fk.name,
      column: fk.column,
      referencedTable: fk.referencedTable,
      referencedColumn: fk.referencedColumn,
      onUpdate: fk.onUpdate,
      onDelete: fk.onDelete
    }));

    const countResult = await this.pool!.query(`
      SELECT COUNT(*) as count FROM [${schema}].[${tableName}]
    `);
    const rowCount = countResult.recordset[0].count;

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
