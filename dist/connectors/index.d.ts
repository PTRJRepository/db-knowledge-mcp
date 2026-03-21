import { BaseDatabaseConnector, DatabaseConfig } from './base';
export { BaseDatabaseConnector, DatabaseConfig } from './base';
export { SQLServerConnector } from './sqlserver';
export { MySQLConnector } from './mysql';
export { PostgreSQLConnector } from './postgresql';
export type DatabaseType = 'sqlserver' | 'mysql' | 'postgresql';
export declare function createConnector(config: DatabaseConfig): BaseDatabaseConnector;
export declare function getSupportedDatabases(): DatabaseType[];
//# sourceMappingURL=index.d.ts.map