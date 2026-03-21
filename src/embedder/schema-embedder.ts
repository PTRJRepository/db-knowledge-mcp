import { DatabaseSchema, TableInfo, ColumnInfo } from '../connectors/base';

export interface EmbeddingChunk {
  id: string;
  databaseId: string;
  databaseName: string;
  chunkType: 'database_overview' | 'table' | 'column' | 'relationship';
  chunkId: string;
  content: string;
  metadata: {
    tableName?: string;
    schema?: string;
    columnName?: string;
    dataType?: string;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
    referencedTable?: string;
    referencedColumn?: string;
  };
  vector?: number[];
}

export interface EmbeddingResult {
  chunks: EmbeddingChunk[];
  totalTokens: number;
  embeddedAt: string;
}

export class SchemaEmbedder {
  private embedderConfig: EmbedderConfig;
  
  constructor(embedderConfig: EmbedderConfig) {
    this.embedderConfig = embedderConfig;
  }

  async embedSchema(schema: DatabaseSchema): Promise<EmbeddingResult> {
    const chunks: EmbeddingChunk[] = [];
    let totalTokens = 0;

    chunks.push(this.createDatabaseOverviewChunk(schema));
    totalTokens += this.estimateTokens(chunks[0].content);

    for (const table of schema.tables) {
      chunks.push(this.createTableChunk(schema.databaseId, schema.databaseName, table));
      totalTokens += this.estimateTokens(chunks[chunks.length - 1].content);

      for (const column of table.columns) {
        chunks.push(this.createColumnChunk(schema.databaseId, schema.databaseName, table, column));
        totalTokens += this.estimateTokens(chunks[chunks.length - 1].content);
      }

      for (const fk of table.foreignKeys) {
        chunks.push(this.createRelationshipChunk(schema.databaseId, schema.databaseName, table, fk));
        totalTokens += this.estimateTokens(chunks[chunks.length - 1].content);
      }
    }

    return {
      chunks,
      totalTokens,
      embeddedAt: new Date().toISOString()
    };
  }

  private createDatabaseOverviewChunk(schema: DatabaseSchema): EmbeddingChunk {
    const tableNames = schema.tables.map(t => t.name).join(', ');
    const content = `
Database: ${schema.databaseName}
Type: ${schema.databaseType}
Total Tables: ${schema.totalTables}
Total Columns: ${schema.totalColumns}
Description: ${schema.databaseName} is a ${schema.databaseType} database containing ${schema.totalTables} tables.

Tables in this database:
${tableNames}

This database is part of the enterprise payroll and HR system infrastructure.
    `.trim();

    return {
      id: `${schema.databaseId}__overview`,
      databaseId: schema.databaseId,
      databaseName: schema.databaseName,
      chunkType: 'database_overview',
      chunkId: 'overview',
      content,
      metadata: {}
    };
  }

  private createTableChunk(databaseId: string, databaseName: string, table: TableInfo): EmbeddingChunk {
    const columnDescriptions = table.columns.map(col => {
      let desc = `- ${col.name}: ${col.dataType}`;
      if (!col.isNullable) desc += ' (NOT NULL)';
      if (col.isPrimaryKey) desc += ' [PRIMARY KEY]';
      if (col.isForeignKey) desc += ` [FK -> ${col.referencedTable}.${col.referencedColumn}]`;
      if (col.defaultValue) desc += ` DEFAULT: ${col.defaultValue}`;
      return desc;
    }).join('\n');

    const content = `
Table: ${table.name}
Schema: ${table.schema}
Database: ${databaseName}

Columns:
${columnDescriptions}

Primary Keys: ${table.primaryKeys.join(', ') || 'None'}
Indexes: ${table.indexes.map(i => `${i.name} (${i.columns.join(', ')})`).join('; ') || 'None'}
Row Count: ${table.rowCount ?? 'Unknown'}
    `.trim();

    return {
      id: `${databaseId}__table__${table.schema}.${table.name}`,
      databaseId,
      databaseName,
      chunkType: 'table',
      chunkId: `${table.schema}.${table.name}`,
      content,
      metadata: {
        tableName: table.name,
        schema: table.schema
      }
    };
  }

  private createColumnChunk(
    databaseId: string, 
    databaseName: string, 
    table: TableInfo, 
    column: ColumnInfo
  ): EmbeddingChunk {
    const content = `
Column: ${table.name}.${column.name}
Table: ${table.name}
Schema: ${table.schema}
Database: ${databaseName}
Data Type: ${column.dataType}
Nullable: ${column.isNullable}
Default: ${column.defaultValue || 'None'}
${column.maxLength ? `Max Length: ${column.maxLength}` : ''}
${column.precision ? `Precision: ${column.precision}, Scale: ${column.scale}` : ''}

${column.isPrimaryKey ? 'This is a PRIMARY KEY column.' : ''}
${column.isForeignKey ? `This is a FOREIGN KEY referencing ${column.referencedTable}.${column.referencedColumn}.` : ''}
    `.trim();

    return {
      id: `${databaseId}__column__${table.schema}.${table.name}.${column.name}`,
      databaseId,
      databaseName,
      chunkType: 'column',
      chunkId: `${table.schema}.${table.name}.${column.name}`,
      content,
      metadata: {
        tableName: table.name,
        schema: table.schema,
        columnName: column.name,
        dataType: column.dataType,
        isPrimaryKey: column.isPrimaryKey,
        isForeignKey: column.isForeignKey,
        referencedTable: column.referencedTable,
        referencedColumn: column.referencedColumn
      }
    };
  }

  private createRelationshipChunk(
    databaseId: string,
    databaseName: string,
    table: TableInfo,
    fk: { name: string; column: string; referencedTable: string; referencedColumn: string; onUpdate?: string; onDelete?: string }
  ): EmbeddingChunk {
    const content = `
Relationship: ${table.name}.${fk.column} -> ${fk.referencedTable}.${fk.referencedColumn}
Type: Foreign Key
Source Table: ${table.name}
Source Column: ${fk.column}
Target Table: ${fk.referencedTable}
Target Column: ${fk.referencedColumn}
Constraint Name: ${fk.name}
On Update: ${fk.onUpdate || 'NO ACTION'}
On Delete: ${fk.onDelete || 'NO ACTION'}

This foreign key establishes a referential integrity constraint between ${table.name} and ${fk.referencedTable}.
    `.trim();

    return {
      id: `${databaseId}__fk__${table.schema}.${table.name}.${fk.column}`,
      databaseId,
      databaseName,
      chunkType: 'relationship',
      chunkId: `${table.schema}.${table.name}.${fk.column}`,
      content,
      metadata: {
        tableName: table.name,
        columnName: fk.column,
        referencedTable: fk.referencedTable,
        referencedColumn: fk.referencedColumn
      }
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export interface EmbedderConfig {
  provider: 'openai' | 'local';
  model: string;
  dimensions: number;
  apiKey?: string;
  endpoint?: string;
}
