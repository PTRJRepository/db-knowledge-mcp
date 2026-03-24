# DB Knowledge MCP

Enterprise-grade MCP server yang membaca metadata database (SQL Server, MySQL, PostgreSQL) dan menyimpan ke vector knowledge base untuk dibaca cepat oleh AI agent.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Tools (MCP)](#tools-mcp)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Knowledge Base Structure](#knowledge-base-structure)
- [Development](#development)
- [License](#license)

---

## Overview

DB Knowledge MCP adalah MCP (Model Context Protocol) server yang berfungsi sebagai bridge antara database relasional dan AI agent. Server ini membaca metadata database secara read-only (tanpa menyimpan password) dan menghasilkan vector embeddings yang dapat digunakan untuk semantic search.

### Use Cases

- **AI Agent Knowledge Base**: Berikan context lengkap tentang struktur database ke AI agent
- **Documentation Automation**: Generate otomatis dokumentasi schema database
- **Impact Analysis**: Analisa dampak perubahan schema dengan mencari relasi terkait
- **Data Discovery**: Temukan tabel dan kolom yang relevan dengan natural language

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DB Knowledge MCP                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ SQL Server   │  │    MySQL     │  │ PostgreSQL  │               │
│  │  Connector   │  │  Connector   │  │  Connector  │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                      │
│         └─────────────────┼─────────────────┘                      │
│                           ▼                                         │
│              ┌────────────────────────┐                            │
│              │   Schema Reader        │                            │
│              │   (Read-only metadata) │                            │
│              └───────────┬────────────┘                            │
│                          ▼                                         │
│              ┌────────────────────────┐                            │
│              │   Schema Embedder      │                            │
│              │   (Text + Embeddings) │                            │
│              └───────────┬────────────┘                            │
│                          ▼                                         │
│              ┌────────────────────────┐                            │
│              │   Vector Store         │                            │
│              │   (JSON Knowledge Base)│                            │
│              └────────────────────────┘                            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    MCP Tools (8 tools)                         │  │
│  │  scan_database │ get_knowledge_base │ search_schema           │  │
│  │  get_table_info │ compare_databases │ list_databases         │  │
│  │  refresh_database │ get_statistics                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

### 🔒 Security First
- **Read-only**: Hanya membaca metadata, tidak pernah membaca data tabel
- **No Password Storage**: Credential tidak disimpan di knowledge base
- **Connection Isolation**: Setiap database connector dengan config terpisah

### 📊 Comprehensive Schema Extraction
- Tables & Columns (data types, nullable, defaults)
- Primary Keys & Foreign Keys
- Indexes & Constraints
- Row counts (optional, configurable)

### 🧠 Vector Knowledge Base
- Structured embeddings untuk semantic search
- Chunked representation (database → table → column → relationship)
- Full-text search capability tanpa embedding API

### 🔌 MCP Protocol
- 8 tools untuk interaksi via MCP
- JSON schema validation
- Progress reporting untuk operasi panjang

---

## Quick Start

### 1. Installation

```bash
# Clone repository
git clone https://github.com/PTRJRepository/db-knowledge-mcp.git
cd db-knowledge-mcp

# Install dependencies
npm install

# Build
npm run build
```

### 2. Configuration

Edit `config/databases.json`:

```json
{
  "databases": [
    {
      "id": "my_database",
      "name": "My Database",
      "type": "sqlserver",
      "host": "localhost",
      "port": 1433,
      "database": "mydb",
      "username": "sa",
      "password": "your_password",
      "enabled": true
    }
  ],
  "embedder": {
    "provider": "local",
    "model": "all-MiniLM-L6-v2",
    "dimensions": 384
  },
  "storage": {
    "type": "file",
    "path": "./knowledgebases"
  }
}
```

### 3. Run

```bash
# Start MCP server (stdio mode)
npm start

# Or run scan-all for batch processing
npm run scan-all
```

---

## Configuration

### Database Configuration

```json
{
  "id": "unique_database_id",
  "name": "Display Name",
  "type": "sqlserver | mysql | postgresql",
  "host": "database.host.com",
  "port": 1433,
  "database": "database_name",
  "username": "db_user",
  "password": "db_password",
  "description": "Optional description",
  "enabled": true
}
```

### Supported Database Types

| Type | Default Port | Driver |
|------|--------------|--------|
| `sqlserver` | 1433 | mssql |
| `mysql` | 3306 | mysql2 |
| `postgresql` | 5432 | pg |

### Embedder Configuration

```json
{
  "embedder": {
    "provider": "openai | local",
    "model": "text-embedding-3-small | all-MiniLM-L6-v2",
    "dimensions": 1536
  }
}
```

### Storage Configuration

```json
{
  "storage": {
    "type": "file | memory",
    "path": "./knowledgebases"
  }
}
```

---

## Tools (MCP)

### 1. `scan_database`

Scan entire database and store schema in knowledge base.

**Arguments:**
```json
{
  "databaseId": "db_payroll"
}
```

**Response:**
```json
{
  "databaseId": "db_payroll",
  "knowledgeBaseId": "kb_db_payroll_20260324",
  "tablesScanned": 45,
  "chunksCreated": 892,
  "duration": "12.5s"
}
```

---

### 2. `get_knowledge_base`

Get complete knowledge base for a database.

**Arguments:**
```json
{
  "databaseId": "db_payroll"
}
```

**Response:**
```json
{
  "id": "kb_db_payroll_20260324",
  "databaseId": "db_payroll",
  "databaseName": "Payroll Database",
  "description": "PT Rebinmas Payroll System",
  "statistics": {
    "totalChunks": 892,
    "tables": 45,
    "columns": 312,
    "relationships": 67
  },
  "createdAt": "2026-03-24T09:00:00Z",
  "updatedAt": "2026-03-24T09:12:30Z"
}
```

---

### 3. `search_schema`

Search schema using natural language.

**Arguments:**
```json
{
  "databaseId": "db_payroll",
  "query": "employee salary tax",
  "limit": 10
}
```

**Response:**
```json
{
  "query": "employee salary tax",
  "results": [
    {
      "chunkType": "column",
      "tableName": "employees",
      "columnName": "base_salary",
      "dataType": "decimal(15,2)",
      "content": "employees.base_salary decimal(15,2) NOT NULL - Employee base monthly salary",
      "relevanceScore": 0.95
    },
    {
      "chunkType": "column",
      "tableName": "tax Calculations",
      "columnName": "pph21_amount",
      "dataType": "decimal(15,2)",
      "content": "tax_calculations.pph21_amount decimal(15,2) - PPh 21 tax amount",
      "relevanceScore": 0.89
    }
  ]
}
```

---

### 4. `get_table_info`

Get detailed information about a specific table.

**Arguments:**
```json
{
  "databaseId": "db_payroll",
  "tableName": "employees"
}
```

**Response:**
```json
{
  "databaseId": "db_payroll",
  "table": {
    "name": "employees",
    "schema": "dbo",
    "columns": [
      {
        "name": "id",
        "dataType": "int",
        "isPrimaryKey": true,
        "isNullable": false
      },
      {
        "name": "name",
        "dataType": "nvarchar(255)",
        "isPrimaryKey": false,
        "isNullable": false
      }
    ],
    "primaryKeys": ["id"],
    "foreignKeys": [],
    "rowCount": 1500
  }
}
```

---

### 5. `compare_databases`

Compare schema between two databases.

**Arguments:**
```json
{
  "databaseIdA": "db_payroll",
  "databaseIdB": "db_payroll_backup"
}
```

**Response:**
```json
{
  "databaseA": "db_payroll",
  "databaseB": "db_payroll_backup",
  "differences": {
    "addedTables": ["audit_logs"],
    "removedTables": [],
    "modifiedTables": {
      "employees": {
        "addedColumns": ["updated_at"],
        "removedColumns": [],
        "modifiedColumns": []
      }
    }
  }
}
```

---

### 6. `list_databases`

List all configured databases.

**Arguments:** None

**Response:**
```json
{
  "databases": [
    {
      "id": "db_payroll",
      "name": "Payroll Database",
      "type": "sqlserver",
      "status": "connected"
    },
    {
      "id": "db_attendance",
      "name": "Attendance Database",
      "type": "mysql",
      "status": "connected"
    }
  ]
}
```

---

### 7. `refresh_database`

Re-scan database and update knowledge base.

**Arguments:**
```json
{
  "databaseId": "db_payroll"
}
```

**Response:**
```json
{
  "databaseId": "db_payroll",
  "previousKnowledgeBase": "kb_db_payroll_20260324",
  "newKnowledgeBase": "kb_db_payroll_20260325",
  "tablesScanned": 45,
  "chunksCreated": 895,
  "changesDetected": {
    "tablesAdded": 1,
    "tablesRemoved": 0,
    "columnsAdded": 3
  }
}
```

---

### 8. `get_statistics`

Get knowledge base statistics.

**Arguments:**
```json
{
  "databaseId": "db_payroll"
}
```

**Response:**
```json
{
  "databaseId": "db_payroll",
  "statistics": {
    "totalChunks": 892,
    "byType": {
      "database_overview": 1,
      "table": 45,
      "column": 312,
      "relationship": 67
    },
    "byTable": {
      "employees": 28,
      "departments": 12,
      "salaries": 35
    }
  }
}
```

---

## API Reference

### MCP Server

**Transport:** stdio (default), http-stream, sse

**Start Server:**
```bash
node dist/mcp-server.js
```

**With HTTP Stream:**
```bash
node dist/mcp-server.js --transport http-stream --port 3000
```

### Programmatic Usage

```typescript
import { SchemaReader } from './dist/connectors/index.js';
import { SchemaEmbedder } from './dist/embedder/schema-embedder.js';
import { VectorStore } from './dist/storage/vector-store.js';

// Load config
const config = JSON.parse(await fs.readFile('config/databases.json', 'utf-8'));

// Connect to database
const connector = SchemaReader.createConnector(config.databases[0]);
await connector.connect();

// Read schema
const schema = await connector.readFullSchema();
await connector.disconnect();

// Generate embeddings
const embedder = new SchemaEmbedder({ provider: 'local', dimensions: 384 });
const chunks = await embedder.embedSchema(schema, config.databases[0]);

// Store
const store = new VectorStore('./knowledgebases');
await store.initialize();
await store.addChunks(config.databases[0].id, chunks);
```

---

## Usage Examples

### Example 1: Initial Database Scan

```bash
# Run scan-all script
npm run scan-all
```

Output:
```
🔍 Scanning databases...
📊 db_payroll: 45 tables, 312 columns
📊 db_attendance: 28 tables, 156 columns  
📊 db_project: 67 tables, 445 columns

✅ All databases scanned successfully
💾 Knowledge bases saved to ./knowledgebases/
```

### Example 2: MCP Tool Usage

Start the MCP server and use tools:

```json
// Tool: scan_database
{
  "tool": "scan_database",
  "arguments": {
    "databaseId": "db_payroll"
  }
}
```

### Example 3: Search Schema

```json
// Tool: search_schema
{
  "tool": "search_schema", 
  "arguments": {
    "databaseId": "db_payroll",
    "query": "employee salary pph21",
    "limit": 5
  }
}
```

---

## Knowledge Base Structure

### Directory Structure

```
knowledgebases/
├── db_payroll/
│   ├── kb_db_payroll_20260324.json
│   ├── kb_db_payroll_latest.json -> kb_db_payroll_20260324.json
│   └── metadata.json
├── db_attendance/
│   └── ...
└── db_project/
    └── ...
```

### Knowledge Base Schema

```json
{
  "id": "kb_db_payroll_20260324",
  "databaseId": "db_payroll",
  "databaseName": "Payroll Database",
  "description": "PT Rebinmas Payroll System",
  "createdAt": "2026-03-24T09:00:00Z",
  "updatedAt": "2026-03-24T09:12:30Z",
  "statistics": {
    "totalChunks": 892,
    "databaseOverview": 1,
    "tables": 45,
    "columns": 312,
    "relationships": 67
  },
  "chunks": [
    {
      "id": "chunk_001",
      "databaseId": "db_payroll",
      "databaseName": "Payroll Database",
      "chunkType": "database_overview",
      "content": "Payroll Database | SQL Server | PT Rebinmas Payroll System...",
      "metadata": {}
    },
    {
      "id": "chunk_002", 
      "chunkType": "table",
      "content": "employees | dbo | Employee master data...",
      "metadata": {
        "tableName": "employees",
        "schema": "dbo"
      }
    }
  ]
}
```

### Chunk Types

| Type | Description | Content |
|------|-------------|---------|
| `database_overview` | High-level database info | Database name, type, description, table count |
| `table` | Table metadata | Table name, schema, column summary |
| `column` | Column details | Column name, type, constraints, nullable |
| `relationship` | FK relationships | Source/target tables and columns |

---

## Development

### Project Structure

```
db-knowledge-mcp/
├── config/
│   └── databases.json          # Database configurations
├── knowledgebases/              # Generated knowledge bases
├── src/
│   ├── mcp-server.ts           # Main MCP server
│   ├── connectors/
│   │   ├── base.ts             # Abstract base connector
│   │   ├── sqlserver.ts        # SQL Server implementation
│   │   ├── mysql.ts            # MySQL implementation
│   │   └── postgresql.ts       # PostgreSQL implementation
│   ├── embedder/
│   │   └── schema-embedder.ts # Schema to embedding conversion
│   ├── storage/
│   │   └── vector-store.ts     # Vector knowledge storage
│   └── scripts/
│       └── scan-all.ts         # Batch scan script
├── dist/                        # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

### Build

```bash
npm run build
```

### Test

```bash
# Run scan-all
npm run scan-all

# Or start MCP server
npm start
```

### Adding New Database Connectors

1. Create new connector in `src/connectors/`
2. Extend `BaseDatabaseConnector`
3. Implement required methods:
   - `connect()`
   - `disconnect()`
   - `getTables()`
   - `getTableInfo()`
4. Export from `src/connectors/index.ts`

```typescript
// Example: src/connectors/oracle.ts
import { BaseDatabaseConnector, DatabaseConfig } from './base';

export class OracleConnector extends BaseDatabaseConnector {
  async connect(): Promise<void> { /* ... */ }
  async disconnect(): Promise<void> { /* ... */ }
  async getTables(): Promise<string[]> { /* ... */ }
  async getTableInfo(tableName: string): Promise<TableInfo> { /* ... */ }
}
```

---

## License

MIT License - see LICENSE file for details.

---

## Support

- GitHub Issues: https://github.com/PTRJRepository/db-knowledge-mcp/issues
- Documentation: https://github.com/PTRJRepository/db-knowledge-mcp#readme
