import { BaseDatabaseConnector, DatabaseConfig, TableInfo } from './base';
export declare class SQLServerConnector extends BaseDatabaseConnector {
    private pool;
    constructor(config: DatabaseConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    testConnection(): Promise<boolean>;
    getTables(): Promise<TableInfo[]>;
    getTableSchema(tableName: string, schema?: string): Promise<TableInfo>;
}
//# sourceMappingURL=sqlserver.d.ts.map