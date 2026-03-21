import { BaseDatabaseConnector, DatabaseConfig, TableInfo } from './base';
export declare class MySQLConnector extends BaseDatabaseConnector {
    private pool;
    constructor(config: DatabaseConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    testConnection(): Promise<boolean>;
    getTables(): Promise<TableInfo[]>;
    getTableSchema(tableName: string, schema?: string): Promise<TableInfo>;
}
//# sourceMappingURL=mysql.d.ts.map