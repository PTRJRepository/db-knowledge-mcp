# Contributing to DB Knowledge MCP

Thank you for your interest in contributing!

## How to Contribute

### Reporting Issues

1. Check existing issues before creating new ones
2. Use issue templates when available
3. Include reproduction steps and expected behavior

### Pull Requests

1. Fork the repository
2. Create a feature branch (`feat/my-feature`)
3. Make your changes
4. Add tests if applicable
5. Submit PR with clear description

### Code Style

- Use TypeScript strict mode
- Follow existing code formatting
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Commit Messages

```
feat: add new database connector
fix: resolve connection pool leak
docs: update API documentation
refactor: simplify embedder interface
test: add integration tests for MySQL connector
```

---

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/db-knowledge-mcp.git
cd db-knowledge-mcp

# Add upstream remote
git remote add upstream https://github.com/PTRJRepository/db-knowledge-mcp.git

# Create feature branch
git checkout -b feat/my-feature

# Install dependencies
npm install

# Make changes...

# Build and test
npm run build
npm run scan-all
```

### Running Tests

```bash
# TODO: Add test suite
npm test
```

---

## Adding New Database Connectors

See [README.md](README.md#adding-new-database-connectors) for detailed instructions.

### Checklist for New Connectors

- [ ] Create connector class extending `BaseDatabaseConnector`
- [ ] Implement `connect()`, `disconnect()`, `getTables()`, `getTableInfo()`
- [ ] Add type definitions in `base.ts`
- [ ] Export from `src/connectors/index.ts`
- [ ] Add example config to `config/databases.json`
- [ ] Update documentation
- [ ] Test with actual database

---

## Code Review Process

1. Automated checks (CI/CD, linting)
2. Review for code quality and architecture
3. Verify documentation updates
4. Test with real database connections
5. Approval and merge
