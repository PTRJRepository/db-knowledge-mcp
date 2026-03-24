# DB Knowledge MCP

Enterprise-grade MCP server yang membaca metadata database (SQL Server, MySQL, PostgreSQL) dan menyimpan ke vector knowledge base untuk dibaca cepat oleh AI agent.

**Repository:** https://github.com/PTRJRepository/db-knowledge-mcp

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [UI Dashboard](#ui-dashboard)
- [Configuration](#configuration)
- [Tools (MCP)](#tools-mcp)
- [API Reference](#api-reference)
- [Architecture](#architecture)

---

## Overview

DB Knowledge MCP adalah sistem yang dirancang untuk enterprise yang secara otomatis:
1. Membaca metadata database (tables, columns, relationships, indexes)
2. Menyimpan sebagai vector embeddings untuk pencarian cepat
3. Menyajikan sebagai graph visualization interaktif

```
┌─────────────────────────────────────────────────────────────┐
│                    DB Knowledge MCP                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │ Database │   │   Scanner    │   │     Embedder       │  │
│  │ Connectors   │  (Schema)    │   │  (OpenAI/Local)    │  │
│  └────┬─────┘   └──────┬───────┘   └─────────┬──────────┘  │
│       │                │                     │             │
│       └────────────────┼─────────────────────┘             │
│                        ▼                                   │
│              ┌─────────────────┐                           │
│              │  Vector Store   │                           │
│              │  (JSON Files)   │                           │
│              └────────┬────────┘                           │
│                       │                                    │
│       ┌───────────────┼────────────────┐                  │
│       ▼               ▼                ▼                  │
│  ┌──────────┐   ┌───────────┐   ┌──────────────┐          │
│  │ MCP Tools│   │ REST API  │   │   UI Graph   │          │
│  │  (8 tools)   │ (Port 5005)  │ (Vis Network) │          │
│  └──────────┘   └───────────┘   └──────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Multi-Database Support**: SQL Server, MySQL, PostgreSQL
- **Zero-Credential Storage**: IP, port, password tidak disimpan di knowledge base
- **8 MCP Tools**: list_databases, scan_database, search_knowledge, dll
- **REST API**: Full API access di port 5005
- **UI Graph**: Interactive knowledge graph visualization (Obsidian-like)
- **Vector Search**: Semantic search menggunakan OpenAI embeddings
- **Enterprise Ready**: JSON-based storage, TypeScript, comprehensive docs

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/PTRJRepository/db-knowledge-mcp.git
cd db-knowledge-mcp

# Install dependencies
npm install

# Build
npm run build

# Configure databases (edit config/databases.json)
# {
#   "databases": [
#     {
#       "id": "my_db",
#       "name": "My Database",
#       "type": "sqlserver",  // sqlserver | mysql | postgresql
#       "host": "localhost",
#       "port": 1433,
#       "database": "mydb",
#       "username": "user",
#       "password": "pass",   // NOT stored in knowledge base
#       "enabled": true
#     }
#   ]
# }

# Start combined server (API + UI on port 5005)
npm run start:combined

# Or run separately:
# MCP Server (stdio): npm start
# REST API only: node dist/server.js
```

---

## UI Dashboard

Buka **http://localhost:5005** untuk mengakses UI dashboard.

### Features

```
┌──────────────────────────────────────────────────────────────────┐
│  DB Knowledge Graph                                    [Search...] │
├────────────┬─────────────────────────────────┬────────────────────┤
│ SIDEBAR    │                                 │ DETAIL PANEL       │
│            │     ┌───┐                       │ (appears on click)  │
│ [DB: ▼]    │    ┌┴───┴┐                      │                    │
│            │    │ DB  │                      │ Type: Table        │
│ Tables: 24 │   ┌┴─────┴┐                     │                    │
│ Chunks: 156│   │ Table │                      │ Columns:           │
│            │   └─┬───┬─┘                      │ - id (int) PK     │
│ [Search]   │     │   │                        │ - name (varchar)   │
│            │  ┌──┐┌──┐┌──┐                    │ - created_at       │
│ LEGEND     │  │C1││C2││FK│                     │                    │
│ ● Database │  └──┘└──┘└──┘                    │ Knowledge Chunks:  │
│ ● Table    │                                 │ [table_desc...]    │
│ ● Column   │                                 │                    │
│ ● Relation │                                 │                    │
└────────────┴─────────────────────────────────┴────────────────────┘
```

### Interactive Features

| Action | Description |
|--------|-------------|
| **Click Node** | Opens detail panel with full information |
| **Hover Node** | Shows tooltip with preview |
| **Drag Node** | Reposition nodes manually |
| **Scroll** | Zoom in/out |
| **Search Box** | Filter nodes in real-time |
| **DB Selector** | Switch between knowledge bases |

### Detail Panel

When you click a node, the detail panel shows:
- **Node Type**: Database, Table, Column, or Relationship
- **Metadata**: Schema, data type, nullable, etc.
- **Knowledge Chunks**: Full embedded knowledge about the entity
- **Relationships**: Connected nodes and edges

---

## Configuration

### `config/databases.json`

```json
{
  "databases": [
    {
      "id": "db_payroll",
      "name": "Payroll Database",
      "type": "sqlserver",
      "host": "localhost",
      "port": 1433,
      "database": "payroll_db",
      "username": "sa",
      "password": "your_password",
      "description": "PT Rebinmas Payroll System",
      "enabled": true
    },
    {
      "id": "db_attendance",
      "name": "Attendance Database",
      "type": "mysql",
      "host": "localhost",
      "port": 3306,
      "database": "attendance_db",
      "username": "root",
      "password": "your_password",
      "description": "Employee Attendance Tracking",
      "enabled": true
    },
    {
      "id": "db_inventory",
      "name": "Inventory Database",
      "type": "postgresql",
      "host": "localhost",
      "port": 5432,
      "database": "inventory_db",
      "username": "postgres",
      "password": "your_password",
      "description": "Warehouse Inventory Management",
      "enabled": true
    }
  ],
  "embedder": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "dimensions": 1536
  },
  "storage": {
    "type": "json",
    "path": "knowledgebases"
  }
}
```

### Environment Variables (Optional)

```bash
# For OpenAI embeddings
OPENAI_API_KEY=sk-...
```

---

## Tools (MCP)

DB Knowledge MCP menyediakan 8 tools untuk AI agents:

### 1. `list_databases`
List semua database yang dikonfigurasi.

```json
{}
```

Returns: Array of databases dengan status knowledge base mereka.

### 2. `scan_database`
Scan database dan simpan schema ke knowledge base.

```json
{
  "databaseId": "db_payroll",
  "options": {
    "tables": ["employees", "salaries"]  // optional filter
  }
}
```

### 3. `search_knowledge`
Pencarian semantic di knowledge base.

```json
{
  "query": "employee salary calculation",
  "databaseId": "db_payroll",  // optional
  "options": {
    "limit": 10,
    "minScore": 0.1,
    "chunkTypes": ["table", "column"]
  }
}
```

### 4. `get_table_info`
Get detailed information tentang sebuah table.

```json
{
  "databaseId": "db_payroll",
  "tableName": "employees",
  "schema": "dbo"  // optional
}
```

### 5. `get_column_info`
Get detailed information tentang sebuah column.

```json
{
  "databaseId": "db_payroll",
  "tableName": "employees",
  "columnName": "salary"
}
```

### 6. `get_table_relationships`
Get semua foreign key relationships untuk sebuah table.

```json
{
  "databaseId": "db_payroll",
  "tableName": "employees"
}
```

### 7. `get_database_overview`
Get overview database termasuk semua tables.

```json
{
  "databaseId": "db_payroll"
}
```

### 8. `delete_knowledge_base`
Delete knowledge base untuk sebuah database.

```json
{
  "databaseId": "db_payroll"
}
```

### 9. `test_connection`
Test koneksi ke database.

```json
{
  "databaseId": "db_payroll"
}
```

---

## API Reference

Server runs on **port 5005**.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/knowledge-bases` | List all knowledge bases |
| GET | `/api/knowledge-bases/:id` | Get full knowledge base |
| POST | `/api/scan/:databaseId` | Scan a database |
| POST | `/api/scan-all` | Scan all enabled databases |

### Examples

```bash
# Health check
curl http://localhost:5005/api/health

# List knowledge bases
curl http://localhost:5005/api/knowledge-bases

# Get full knowledge base
curl http://localhost:5005/api/knowledge-bases/db_payroll

# Scan a database
curl -X POST http://localhost:5005/api/scan/db_payroll

# Scan all databases
curl -X POST http://localhost:5005/api/scan-all
```

---

## Architecture

### Directory Structure

```
db-knowledge-mcp/
├── config/
│   └── databases.json        # Database configurations
├── knowledgebases/           # Generated knowledge bases (JSON)
├── public/
│   └── index.html           # UI Dashboard
├── src/
│   ├── mcp-server.ts        # MCP stdio server
│   ├── server.ts            # Express REST API + UI server
│   ├── connectors/          # Database connectors
│   │   ├── base.ts          # Abstract base class
│   │   ├── sqlserver.ts     # SQL Server connector
│   │   ├── mysql.ts         # MySQL connector
│   │   └── postgresql.ts    # PostgreSQL connector
│   ├── embedder/
│   │   └── schema-embedder.ts # Schema → Embeddings
│   └── storage/
│       └── vector-store.ts   # JSON-based vector store
├── dist/                     # Compiled output
├── docs/
│   └── API.md               # Detailed API docs
├── package.json
├── tsconfig.json
└── README.md
```

### Knowledge Base Entities

Untuk setiap database, 3 entitas knowledge dibuat:

1. **Database Overview** (`database_overview`)
   - Total tables, columns, relationships
   - Database purpose dan description

2. **Table Entity** (`table`)
   - Table name, schema, description
   - Column list dengan types
   - Indexes dan primary keys

3. **Column Entity** (`column`)
   - Column name, data type, constraints
   - NULLability, default values
   - Foreign key relationships

4. **Relationship Entity** (`relationship`)
   - Foreign key definitions
   - Parent-child table relationships

---

## Development

```bash
# Build
npm run build

# Start MCP server (stdio mode)
npm start

# Start combined server (REST + UI)
npm run start:combined

# Scan all databases
npm run scan-all

# Watch mode (build on changes)
npm run dev
```

---

## License

MIT License - PT Rebinmas 2026
