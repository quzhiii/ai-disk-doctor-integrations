# Compatibility Matrix

Last audited: 2026-08-19

Sources are linked to official vendor documentation. Availability is based on the local machine, not inference.

| Client | Installation method | Skill support | MCP support | Local process | Permissions | Invocation UX | Tested version/date | Status |
|---|---|---:|---:|---:|---|---|---|---|
| OpenCode | `opencode.json(c)` local MCP; copy Skill to `.opencode/skills`, `.claude/skills`, or `.agents/skills` | Yes | Yes, local stdio | Yes | Client-controlled; do not grant shell bypass | MCP tools become available automatically; use `opencode mcp list` | OpenCode 1.16.2, 2026-08-19 | SDK stdio smoke passed; client CLI available, no server configured during audit |
| Qwen Code | `qwen mcp add --transport stdio`; project Skill in `.qwen/skills`; optional root extension manifest | Yes | Yes, stdio | Yes | `trust` defaults false; keep false | `/mcp`, model-invoked Skill, or tool calls | Qwen Code 0.0.1-alpha.8, 2026-08-19 | Official configuration verified; installed CLI did not expose `mcp`/`extensions` subcommands, so client smoke is unavailable |
| CodeBuddy | Deferred pending an official, locally verified configuration contract | Evidence needed per build | Evidence needed per build | Evidence needed per build | Product-controlled | Product-specific | CLI unavailable locally, 2026-08-19 | Status-only adapter; no invented manifest |
| WorkBuddy | Deferred pending an official, locally verified configuration contract | Evidence needed per build | Evidence needed per build | Evidence needed per build | Product-controlled | Product-specific | CLI unavailable locally, 2026-08-19 | Status-only adapter; no invented manifest |
| TRAE | Deferred pending a locally verified project configuration contract | Official Skills docs exist | Official MCP docs exist | Product/build dependent | Product-controlled | Product-specific | CLI unavailable locally, 2026-08-19 | Status-only adapter; no invented manifest |

## Official References

- [OpenCode MCP servers](https://opencode.ai/docs/mcp-servers/)
- [OpenCode Agent Skills](https://opencode.ai/docs/skills/)
- [Qwen Code MCP](https://qwenlm.github.io/qwen-code-docs/en/users/features/mcp/)
- [Qwen Code Agent Skills](https://qwenlm.github.io/qwen-code-docs/en/users/features/skills/)
- [Qwen Code extensions](https://qwenlm.github.io/qwen-code-docs/en/users/extension/introduction/)
- [Qwen Code extension development](https://qwenlm.github.io/qwen-code-docs/en/developers/extensions/getting-started-extensions/)
- [TRAE MCP documentation](https://docs.trae.ai/ide/model-context-protocol)
- [TRAE Skills documentation](https://docs.trae.ai/ide/skills)

CodeBuddy and WorkBuddy packaging remains intentionally conservative until the exact installed product documentation and local client are available. No unverified client behavior is encoded in the canonical Skill or MCP server.
