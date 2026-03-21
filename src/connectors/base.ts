export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
  rowCount?: number;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
  isForeignKey: boolean;
  referencedTable?: string;
  referencedColumn?: string;
}

export interface ForeignKeyInfo {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onUpdate?: string;
  onDelete?: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface DatabaseSchema {
  databaseId: string;
  databaseName: string;
  databaseType: string;
  tables: TableInfo[];
  totalTables: number;
  totalColumns: number;
  scannedAt: string;
}

export abstract class BaseDatabaseConnector {
  protected config: DatabaseConfig;
  
  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getTables(): Promise<TableInfo[]>;
  abstract getTableSchema(tableName: string, schema?: string): Promise<TableInfo>;
  abstract testConnection(): Promise<boolean>;

  async getFullSchema(): Promise<DatabaseSchema> {
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

export interface DatabaseConfig {
  id: string;
  name: string;
  type: 'sqlserver' | 'mysql' | 'postgresql';
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  description?: string;
  enabled: boolean;
}
