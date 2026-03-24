import { BaseDatabaseConnector, DatabaseConfig, TableInfo, ColumnInfo, ForeignKeyInfo, IndexInfo, DatabaseSchema } from './base';
import { SQLServerConnector } from './sqlserver';
import { MySQLConnector } from './mysql';
import { PostgreSQLConnector } from './postgresql';

export { BaseDatabaseConnector, DatabaseConfig, TableInfo, ColumnInfo, ForeignKeyInfo, IndexInfo, DatabaseSchema } from './base';
export { SQLServerConnector } from './sqlserver';
export { MySQLConnector } from './mysql';
export { PostgreSQLConnector } from './postgresql';

export function createConnector(config: DatabaseConfig): BaseDatabaseConnector {
  switch (config.type) {
    case 'sqlserver':
      return new SQLServerConnector(config);
    case 'mysql':
      return new MySQLConnector(config);
    case 'postgresql':
      return new PostgreSQLConnector(config);
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}
