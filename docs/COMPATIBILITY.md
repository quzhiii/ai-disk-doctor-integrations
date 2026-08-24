# Compatibility Matrix

Last audited: 2026-08-24

Sources are linked to official vendor documentation. Availability is based on the local machine, not inference.

## Core compatibility state

- Tested baseline: AI Disk Doctor Core v1.7.0 at `cac502f73c39f1b5de13bab3e4de86a5c29684fc`.
- I1.3 consumes `aidisk capabilities --json` for compatibility discovery, then `aidisk explain --json --snapshot skip` with an optional validated category selector. It requires `agent-capabilities-v1`, `agent-diagnostic-cli-v1`, and `explainability-v1` schema `1`.
- Runtime compatibility is checked by `core_status`. The tested revision is provenance; current Core binaries do not prove an exact git revision at runtime.

| Client | Installation method | Skill support | MCP support | Local process | Permissions | Invocation UX | Tested version/date | Evidence status |
|---|---|---:|---:|---:|---|---|---|---|
| OpenCode | `opencode.json(c)` local MCP; copy Skill to `.opencode/skills`, `.claude/skills`, or `.agents/skills` | Yes | Yes, local stdio | Yes | Client-controlled; do not grant shell bypass | MCP tools become available automatically; use `opencode mcp list` | OpenCode 1.16.2, 2026-08-19 | verified locally: `OPENCODE_CONFIG_CONTENT=... opencode mcp list` returned `ai-disk-doctor connected`; SDK stdio smoke also passed |
| Qwen Code | `qwen mcp add --transport stdio`; project Skill in `.qwen/skills`; root extension manifest | Yes | Yes, stdio | Yes | `trust` defaults false; keep false | `/mcp`, model-invoked Skill, or tool calls | Qwen Code 0.0.1-alpha.8, 2026-08-19 | verified by official contract only; installed CLI did not expose `mcp`/`extensions` subcommands, so local client smoke is unavailable |
| CodeBuddy | Deferred pending an official, locally verified configuration contract | unavailable | unavailable | unavailable | Product-controlled | Product-specific | CLI unavailable locally, 2026-08-19 | unavailable; status-only adapter; no invented manifest |
| WorkBuddy | Deferred pending an official, locally verified configuration contract | unavailable | unavailable | unavailable | Product-controlled | Product-specific | CLI unavailable locally, 2026-08-19 | unavailable; status-only adapter; no invented manifest |
| TRAE | Deferred pending a locally verified project configuration contract | Official Skills docs exist | Official MCP docs exist | not tested | Product-controlled | Product-specific | CLI unavailable locally, 2026-08-19 | verified by official contract only; no local client smoke; no invented manifest |

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
