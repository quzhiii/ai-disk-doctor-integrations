# Qwen Code Adapter

The repository root is the Qwen Code extension package. It contains the documented root `qwen-extension.json`, `QWEN.md`, canonical `skills/` directory, and local stdio MCP server source.

Install a checked-out repository only after running `npm install` in its root:

```bash
qwen extensions install /absolute/path/to/ai-disk-doctor-integrations
```

The extension starts `src/server.js` with the Qwen workspace as its working directory, so Core-owned scan snapshots remain workspace-local. The current installed local Qwen CLI was `0.0.1-alpha.8` and did not expose the documented `mcp` or extension management commands during this audit; use a current Qwen Code build that supports the official configuration surface.
