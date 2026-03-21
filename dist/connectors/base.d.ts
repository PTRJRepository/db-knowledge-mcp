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
export declare abstract class BaseDatabaseConnector {
    protected config: DatabaseConfig;
    constructor(config: DatabaseConfig);
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract getTables(): Promise<TableInfo[]>;
    abstract getTableSchema(tableName: string, schema?: string): Promise<TableInfo>;
    abstract testConnection(): Promise<boolean>;
    getFullSchema(): Promise<DatabaseSchema>;
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
//# sourceMappingURL=base.d.ts.map