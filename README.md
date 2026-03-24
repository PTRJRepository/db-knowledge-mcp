# DB Knowledge MCP

> Enterprise-grade MCP server untuk membaca metadata database dan menyimpan ke vector knowledge base dengan UI graph interaktif (Obsidian-like).

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

## 🎯 Overview

DB Knowledge MCP membaca metadata database (SQL Server, MySQL, PostgreSQL) dan menyimpannya sebagai vector knowledge base yang bisa dibaca cepat oleh AI agent. Dilengkapi dengan UI graph interaktif seperti Obsidian untuk visualisasi dan eksplorasi relationship antar tabel.

## ✨ Features

### Core Features
- **Multi-Database Support**: SQL Server, MySQL, PostgreSQL
- **Vector Knowledge Base**: Simpan schema sebagai embedded vectors
- **8 MCP Tools**: list_databases, scan_database, search_knowledge, dll
- **Semantic Search**: Query natural language ke knowledge base

### UI Dashboard (Port 5005)
- **Interactive Graph**: Vis Network visualization
- **Clickable Nodes**: Klik node untuk melihat detail
- **Database Selector**: Switch antar knowledge bases
- **Real-time Search**: Filter nodes dengan search bar
- **Zoom & Pan**: Navigasi graph dengan mouse
- **Drag Nodes**: Atur posisi node sesuka hati
- **Auto-layout**: Button untuk auto-arrange graph

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- Database credentials (SQL Server, MySQL, atau PostgreSQL)

### Installation

```bash
git clone https://github.com/PTRJRepository/db-knowledge-mcp.git
cd db-knowledge-mcp
npm install
npm run build
```

### Configuration

Edit `config/databases.json`:

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
      "enabled": true,
      "description": "Production payroll system"
    },
    {
      "id": "db_hris",
      "name": "HRIS Database",
      "type": "mysql",
      "host": "localhost",
      "port": 3306,
      "database": "hris_db",
      "username": "root",
      "password": "your_password",
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

### Running

#### Mode 1: Combined Server (REST API + UI Dashboard)
```bash
npm run start:combined
```
- **UI Dashboard**: http://localhost:5005
- **REST API**: http://localhost:5005/api/*

#### Mode 2: MCP Server Only (STDIO)
```bash
npm start
```
Berguna untuk integrate dengan AI tools lain (Zo Computer, Claude, dll)

#### Mode 3: Scan All Databases
```bash
npm run scan-all
```

## 📊 UI Dashboard Guide

### Graph View
```
┌─────────────────────────────────────────────────────────────┐
│  DB Knowledge Graph                              [Search...] │
├─────────────────────────────────────────────────────────────┤
│  [Dropdown: Select Database ▼]  [Scan]  [Refresh]  [Layout] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         ┌──────────────┐                                   │
│         │ db_payroll   │ ← Database Node (Cyan)            │
│         └──────┬───────┘                                   │
│                │                                            │
│         ┌──────┴───────┐                                   │
│         │  employees   │ ← Table Node (Green)              │
│         └──────┬───────┘                                   │
│                │                                            │
│    ┌───────────┼───────────┐                               │
│    │           │           │                               │
│ ┌──┴──┐   ┌───┴───┐   ┌───┴───┐                           │
│ │ id  │   │name   │   │ dept  │ ← Column Nodes (Yellow)   │
│ └──┬──┘   └───┬───┘   └───┬───┘                           │
│    │         │           │                                 │
│    └─────────┴───────────┘                                 │
│    │                                           (Click node)  │
│    └────────────► Shows detail panel ◄────────────         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Legend: ● Database  ● Table  ● Column  ● Relationship      │
└─────────────────────────────────────────────────────────────┘
```

### Node Colors
| Type | Color | Description |
|------|-------|-------------|
| Database | Cyan (#00bcd4) | Root node untuk setiap database |
| Table | Green (#4caf50) | Tabel dalam database |
| Column | Yellow (#ffeb3b) | Kolom dalam tabel |
| Relationship | Red (#f44336) | Foreign key relationship |

### Using the UI

1. **Select Database**: Gunakan dropdown untuk memilih database
2. **Scan**: Klik "Scan" untuk scan database dan update knowledge base
3. **Search**: Ketik di search bar untuk filter nodes
4. **Click Node**: Klik node untuk melihat detail di panel kanan
5. **Drag**: Drag node untuk reposisi
6. **Zoom**: Scroll mouse untuk zoom in/out
7. **Layout**: Klik "Layout" untuk auto-arrange graph

### Detail Panel

Ketika node diklik, panel kanan menampilkan:

**Database Node:**
```
┌─────────────────────────┐
│ 📊 db_payroll           │
├─────────────────────────┤
│ Type: SQL Server        │
│ Tables: 25              │
│ Columns: 156            │
│ Last Updated: 2026-03  │
├─────────────────────────┤
│ [Scan] [Delete]         │
└─────────────────────────┘
```

**Table Node:**
```
┌─────────────────────────┐
│ 📋 employees           │
├─────────────────────────┤
│ Schema: dbo             │
│ Columns: 12             │
│ Row Count: 1,250        │
├─────────────────────────┤
│ Primary Keys:           │
│   • employee_id         │
├─────────────────────────┤
│ Foreign Keys:            │
│   • department_id →     │
│     departments(id)     │
├─────────────────────────┤
│ [View Details]          │
└─────────────────────────┘
```

**Column Node:**
```
┌─────────────────────────┐
│ 📌 employee_id          │
├─────────────────────────┤
│ Type: int               │
│ Nullable: No             │
│ Primary Key: Yes        │
│ Foreign Key: No         │
├─────────────────────────┤
│ Part of: employees      │
└─────────────────────────┘
```

## 🔧 MCP Tools

### 1. list_databases
List semua database yang dikonfigurasi.

```json
{
  "name": "list_databases",
  "description": "List all configured databases"
}
```

### 2. scan_database
Scan database dan simpan ke knowledge base.

```json
{
  "name": "scan_database",
  "arguments": {
    "databaseId": "db_payroll"
  }
}
```

### 3. search_knowledge
Search knowledge base dengan query.

```json
{
  "name": "search_knowledge",
  "arguments": {
    "query": "employee salary",
    "databaseId": "db_payroll",
    "options": {
      "limit": 10,
      "minScore": 0.1
    }
  }
}
```

### 4. get_table_info
Get detail table.

```json
{
  "name": "get_table_info",
  "arguments": {
    "databaseId": "db_payroll",
    "tableName": "employees",
    "schema": "dbo"
  }
}
```

### 5. get_column_info
Get detail column.

```json
{
  "name": "get_column_info",
  "arguments": {
    "databaseId": "db_payroll",
    "tableName": "employees",
    "columnName": "salary"
  }
}
```

### 6. get_table_relationships
Get semua foreign key relationships untuk table.

```json
{
  "name": "get_table_relationships",
  "arguments": {
    "databaseId": "db_payroll",
    "tableName": "employees"
  }
}
```

### 7. get_database_overview
Get overview database termasuk semua tables.

```json
{
  "name": "get_database_overview",
  "arguments": {
    "databaseId": "db_payroll"
  }
}
```

### 8. delete_knowledge_base
Delete knowledge base untuk database.

```json
{
  "name": "delete_knowledge_base",
  "arguments": {
    "databaseId": "db_payroll"
  }
}
```

## 🌐 REST API

### Base URL
```
http://localhost:5005/api
```

### Endpoints

#### GET /api/knowledge-bases
List semua knowledge bases.

```bash
curl http://localhost:5005/api/knowledge-bases
```

#### GET /api/knowledge-bases/:id
Get detail knowledge base.

```bash
curl http://localhost:5005/api/knowledge-bases/db_payroll
```

#### GET /api/knowledge-bases/:id/graph
Get graph data untuk visualization.

```bash
curl http://localhost:5005/api/knowledge-bases/db_payroll/graph
```

Response:
```json
{
  "nodes": [
    { "id": "db_payroll", "label": "Payroll DB", "type": "database", "color": "#00bcd4" },
    { "id": "employees", "label": "employees", "type": "table", "color": "#4caf50" },
    { "id": "employee_id", "label": "employee_id", "type": "column", "color": "#ffeb3b" }
  ],
  "edges": [
    { "from": "employees", "to": "employee_id", "label": "pk" }
  ]
}
```

#### GET /api/knowledge-bases/:id/search?q=query
Search dalam knowledge base.

```bash
curl "http://localhost:5005/api/knowledge-bases/db_payroll/search?q=salary"
```

#### POST /api/scan/:databaseId
Scan database.

```bash
curl -X POST http://localhost:5005/api/scan/db_payroll
```

#### POST /api/scan-all
Scan semua database.

```bash
curl -X POST http://localhost:5005/api/scan-all
```

#### GET /api/databases
List database configs.

```bash
curl http://localhost:5005/api/databases
```

#### POST /api/test-connection/:databaseId
Test koneksi database.

```bash
curl -X POST http://localhost:5005/api/test-connection/db_payroll
```

#### GET /api/health
Health check.

```bash
curl http://localhost:5005/api/health
```

## 📁 Project Structure

```
db-knowledge-mcp/
├── config/
│   └── databases.json       # Konfigurasi database
├── public/
│   └── index.html           # UI Dashboard
├── src/
│   ├── connectors/          # Database connectors
│   │   ├── base.ts          # Base connector class
│   │   ├── sqlserver.ts     # SQL Server connector
│   │   ├── mysql.ts         # MySQL connector
│   │   ├── postgresql.ts    # PostgreSQL connector
│   │   └── index.ts         # Factory function
│   ├── embedder/
│   │   └── schema-embedder.ts  # Schema → Embeddings
│   ├── storage/
│   │   └── vector-store.ts  # JSON vector store
│   ├── mcp-server.ts        # MCP stdio server
│   └── server.ts            # Express + UI server
├── knowledgebases/           # Generated KB storage
├── dist/                     # Compiled output
├── docs/
│   └── API.md              # Detailed API docs
├── CLAUDE.md               # Developer guide
├── README.md               # This file
└── package.json
```

## 🔌 Database Support

### SQL Server
```json
{
  "id": "db_payroll",
  "name": "Payroll DB",
  "type": "sqlserver",
  "host": "localhost",
  "port": 1433,
  "database": "payroll",
  "username": "sa",
  "password": "***"
}
```

### MySQL
```json
{
  "id": "db_hris",
  "name": "HRIS DB",
  "type": "mysql",
  "host": "localhost",
  "port": 3306,
  "database": "hris",
  "username": "root",
  "password": "***"
}
```

### PostgreSQL
```json
{
  "id": "db_analytics",
  "name": "Analytics DB",
  "type": "postgresql",
  "host": "localhost",
  "port": 5432,
  "database": "analytics",
  "username": "postgres",
  "password": "***"
}
```

## 🔐 Security Notes

- **No credentials stored in code**: Semua credentials di `config/databases.json`
- **Read-only access**: Connector hanya baca metadata, tidak write
- **Local storage**: Knowledge base disimpan lokal, tidak dikirim ke cloud
- **HTTPS-ready**: Bisa taruh di reverse proxy (nginx, Caddy) untuk production

## 🛠️ Development

### Build
```bash
npm run build
```

### Run Tests
```bash
npm test
```

### Lint
```bash
npm run lint
```

## 📝 License

MIT License - lihat [LICENSE](LICENSE)

## 🤝 Contributing

1. Fork repository
2. Buat branch baru (`git checkout -b feature/xxx`)
3. Commit changes (`git commit -m 'Add feature xxx'`)
4. Push ke branch (`git push origin feature/xxx`)
5. Buat Pull Request

## 📧 Contact

- **Author**: attapangestu
- **GitHub**: https://github.com/PTRJRepository/db-knowledge-mcp
