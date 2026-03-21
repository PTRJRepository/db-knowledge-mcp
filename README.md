# DB Knowledge MCP

Enterprise-grade MCP server yang membaca metadata database (SQL Server, MySQL, PostgreSQL) dan menyimpan ke vector knowledge base untuk dibaca cepat oleh AI agent.

## Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                    DB Knowledge MCP                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ SQL Server   │  │    MySQL     │  │  PostgreSQL   │      │
│  │  Connector   │  │   Connector  │  │   Connector   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └────────────┬────┴──────────────────┘              │
│                      ▼                                       │
│         ┌────────────────────────┐                          │
│         │   Schema Embedder      │                          │
│         │  - Database Overview   │                          │
│         │  - Table Info          │                          │
│         │  - Column Details      │                          │
│         │  - Relationships        │                          │
│         └────────────┬───────────┘                          │
│                      ▼                                       │
│         ┌────────────────────────┐                          │
│         │    Vector Store         │                          │
│         │  - knowledgebases/      │                          │
│         │    ├── db_payroll.json  │                          │
│         │    ├── db_attendance.json│                        │
│         │    └── db_project.json  │                          │
│         └────────────────────────┘                          │
│                      ▲                                       │
│                      │                                       │
│         ┌────────────┴────────────┐                          │
│         │   MCP Tools (8 tools)   │                          │
│         │  - list_databases       │                          │
│         │  - scan_database        │                          │
│         │  - search_knowledge     │                          │
│         │  - get_table_info       │                          │
│         │  - get_column_info      │                          │
│         │  - get_table_relationships│                        │
│         │  - get_database_overview │                          │
│         │  - delete_knowledge_base │                          │
│         └─────────────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Struktur Knowledge Base

Setiap database disimpan sebagai satu entitas knowledge dengan chunk:

| Chunk Type | Description | Content |
|------------|-------------|---------|
| `database_overview` | Overview database | Nama, type, jumlah tabel, deskripsi |
| `table` | Info tabel | Nama, kolom, primary key, index, row count |
| `column` | Info kolom | Nama, data type, nullable, default, FK info |
| `relationship` | Foreign key | Relasi antar tabel dengan ON UPDATE/DELETE |

## Setup

```bash
cd /home/workspace/db-knowledge-mcp
npm install
```

## Konfigurasi Database

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
      "password": "YOUR_PASSWORD",
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
      "password": "YOUR_PASSWORD",
      "enabled": true
    },
    {
      "id": "db_project",
      "name": "Project Management Database",
      "type": "postgresql",
      "host": "localhost",
      "port": 5432,
      "database": "project_db",
      "username": "postgres",
      "password": "YOUR_PASSWORD",
      "enabled": true
    }
  ]
}
```

## Penggunaan

### Build & Start

```bash
npm run build
npm start
```

### Scan Semua Database

```bash
npm run scan-all
```

### MCP Tools

#### 1. list_databases
Daftar semua database yang terkonfigurasi:

```json
{"tool": "list_databases"}
```

#### 2. scan_database
Scan satu database dan simpan ke knowledge base:

```json
{"tool": "scan_database", "arguments": {"databaseId": "db_payroll"}}
```

#### 3. search_knowledge
Cari informasi schema:

```json
{"tool": "search_knowledge", "arguments": {"query": "employee table", "databaseId": "db_payroll"}}
```

#### 4. get_table_info
Get detail tabel:

```json
{"tool": "get_table_info", "arguments": {"databaseId": "db_payroll", "tableName": "employees", "schema": "dbo"}}
```

#### 5. get_column_info
Get detail kolom:

```json
{"tool": "get_column_info", "arguments": {"databaseId": "db_payroll", "tableName": "employees", "columnName": "employee_id"}}
```

#### 6. get_table_relationships
Get semua foreign key untuk satu tabel:

```json
{"tool": "get_table_relationships", "arguments": {"databaseId": "db_payroll", "tableName": "employees"}}
```

#### 7. get_database_overview
Get overview database:

```json
{"tool": "get_database_overview", "arguments": {"databaseId": "db_payroll"}}
```

#### 8. delete_knowledge_base
Hapus knowledge base:

```json
{"tool": "delete_knowledge_base", "arguments": {"databaseId": "db_payroll"}}
```

## Knowledge Base Storage

Knowledge bases disimpan di `knowledgebases/` sebagai JSON files:

```
knowledgebases/
├── db_payroll.json      # ~50-200 chunks per database
├── db_attendance.json
└── db_project.json
```

Setiap chunk memiliki:
- `id`: Unique identifier
- `databaseId`: Database origin
- `chunkType`: overview | table | column | relationship
- `content`: Human-readable text
- `metadata`: Structured metadata

## Enterprise Features

- **No Credentials in Code**: Semua konfigurasi di `config/databases.json`
- **Connection Pooling**: SQL Server, MySQL, PostgreSQL connectors dengan pooling
- **Chunking Strategy**: Database → Tables → Columns → Relationships
- **Semantic Search**: Keyword + substring matching dengan scoring
- **Type Safety**: Full TypeScript dengan strict mode
- **Scalable**: Tambahkan database baru dengan edit config saja

## Credential Security

Password database TIDAK disimpan di knowledge base JSON. Knowledge base hanya menyimpan:
- Schema metadata (nama tabel, kolom, tipe data)
- Relationships (nama tabel terkait)
- Statistical info (row count, index info)

Tidak ada data sensitif yang dibaca atau disimpan.
