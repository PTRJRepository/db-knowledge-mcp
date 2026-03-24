# DB Knowledge MCP - Developer Guide

## Project Overview

Enterprise MCP server for reading database metadata and storing as vector knowledge base for AI agents.

## Quick Commands

```bash
# Build
npm run build

# Start MCP server
npm start

# Scan all databases
npm run scan-all
```

## Configuration

Edit `config/databases.json` to add/remove databases.

## Architecture

- `src/connectors/` - Database connectors (SQL Server, MySQL, PostgreSQL)
- `src/embedder/` - Schema to embedding conversion
- `src/storage/` - Vector knowledge storage
- `src/mcp-server.ts` - Main MCP server with 8 tools

## Adding New Connector

1. Create `src/connectors/newdb.ts`
2. Extend `BaseDatabaseConnector`
3. Implement: `connect()`, `disconnect()`, `getTables()`, `getTableInfo()`
4. Export from `src/connectors/index.ts`
5. Add type to `DatabaseConfig` interface

## Testing

```bash
# Test with actual database
npm run scan-all
```

## Deployment

The MCP server runs via stdio by default. Configure your MCP client to connect to the server executable.
