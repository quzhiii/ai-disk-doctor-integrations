# AI Disk Doctor Integrations

Universal local Agent Skill and non-destructive diagnostic MCP server for [AI Disk Doctor Core](https://github.com/quzhiii/ai-disk-doctor).

This repository is an integration and distribution layer. It does not implement a second scanner, cleaner, risk engine, recovery model, policy system, history engine, or explainability engine. The local Core remains the execution and policy source of truth.

## Alpha Scope

The MCP server exposes six tools:

| Tool | Behavior | Model-facing inputs | Core side effect |
|---|---|---|---|
| `aidisk_capabilities` | Discover Core's machine-readable capability contract and evaluate the explainability readiness gate | None | None |
| `aidisk_workspace_explain` | Run Core explainability through the fixed no-snapshot diagnostic contract and return bounded storage/evidence/handling summaries | `category?` | None |
| `core_status` | Check Core availability, required command surface, and compatibility provenance | None | None |
| `scan_summary` | Run `aidisk scan --json` and return bounded Core evidence | `category?` | Current Core CLI may save `.aidisk/reports/scan-*.json` |
| `ai_model_inventory` | Run `aidisk models inventory --json` with Core defaults and return bounded assets | `tool?` | None intended |
| `latest_diff` | Run Core-owned `aidisk diff --latest --json` and return bounded changes | None | None |

I1.3 exposes no `clean`, `restore`, `quarantine`, `delete`, arbitrary shell, arbitrary executable, arbitrary rules/policy path, arbitrary reports directory, or arbitrary filesystem mutation tool. `aidisk_workspace_explain` is read-only and invokes only `aidisk explain --json --snapshot skip` with an optional validated category selector.

### Core state used by I0.1

- Tested Core baseline: v1.7.0 at `cac502f73c39f1b5de13bab3e4de86a5c29684fc`.
- Pinned Core provides `agent-capabilities-v1` and `agent-diagnostic-cli-v1`, embedding `explainability-v1` schema `1` in the fixed `explain --json --snapshot skip` response.

## Install

### Prerequisites

- Node.js 18 or newer.
- AI Disk Doctor Core v1.7.0 on `PATH` as `aidisk`/`aidisk.exe`, or set `AIDISK_EXE`.
- This integration is tested against Core revision `cac502f73c39f1b5de13bab3e4de86a5c29684fc`. Runtime compatibility is checked by `core_status` and the machine-readable `aidisk capabilities --json` contract; current Core binaries do not expose a runtime git revision, so the exact revision is not claimed from runtime detection.

Install from a checkout:

```bash
git clone https://github.com/quzhiii/ai-disk-doctor-integrations.git
cd ai-disk-doctor-integrations
npm install
npm start
```

The process uses MCP stdio transport and should be started by an MCP client. The npm dependency set is locked in `package-lock.json`.

### OpenCode

OpenCode supports project-local MCP declarations in `opencode.json` or `opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "ai-disk-doctor": {
      "type": "local",
      "command": ["node", "C:/absolute/path/to/ai-disk-doctor-integrations/src/server.js"],
      "cwd": "C:/absolute/path/to/your-workspace",
      "environment": { "AIDISK_EXE": "aidisk" },
      "enabled": true
    }
  }
}
```

Set `cwd` to the user workspace where Core snapshots should be stored, rather than the integration checkout. Then use `opencode mcp list` or ask the agent to check `core_status`. The checked-in example is under `adapters/opencode/opencode.jsonc`.

OpenCode Agent Skills are discovered from `.opencode/skills`, `.claude/skills`, or `.agents/skills`. Copy or symlink `skills/ai-disk-doctor` into one of those locations for a project or user installation.

### Qwen Code

Qwen Code supports local stdio MCP servers and extensions in current official documentation. Equivalent `.qwen/settings.json` entry:

```json
{
  "mcpServers": {
    "ai-disk-doctor": {
      "command": "node",
      "args": ["/absolute/path/to/ai-disk-doctor-integrations/src/server.js"],
      "cwd": "/absolute/path/to/your-workspace",
      "env": { "AIDISK_EXE": "aidisk" },
      "trust": false
    }
  }
}
```

The repository root is a Qwen extension package through `qwen-extension.json`; see `adapters/qwen/README.md`. The locally installed Qwen CLI in this environment was too old to expose documented MCP/extension subcommands, so client smoke is not claimed.

### CodeBuddy / WorkBuddy

Exact packaging is deferred until an official, locally testable CodeBuddy / WorkBuddy client contract is available; see `adapters/codebuddy/README.md`. No Expert persona or vendor-specific risk logic is included.

### TRAE

TRAE MCP and Skill docs exist, but exact project packaging is deferred until a TRAE client is locally available for validation; see `adapters/trae/README.md`.

## Safety Boundary

- MCP transport is local stdio only.
- `core_status.server.mode` is `non-destructive-diagnostic`: the server exposes no destructive action, but `scan_summary` can cause Core-owned snapshot persistence.
- The server starts only the configured `aidisk` executable with fixed allowlisted argv.
- `aidisk_capabilities` accepts no model-facing input and invokes only the fixed `aidisk capabilities --json` argv.
- Model-facing inputs are limited to `aidisk_workspace_explain.category`, `scan_summary.category`, and `ai_model_inventory.tool`.
- `aidisk_workspace_explain` first checks `aidisk capabilities --json`, then invokes only `aidisk explain --json --snapshot skip` with an optional validated `--category`. It rejects missing/unsupported contracts, malformed response envelopes, and snapshot-writing behavior.
- No model-facing rules, policy, root, reports directory, executable, shell, cleanup, quarantine, restore, or delete parameter exists.
- `scan_summary` is non-destructive but `readOnlyHint: false` because current Core CLI scan persists a Core-owned snapshot. It is `destructiveHint: false` and does not modify user/workspace files.
- Output is bounded: scan findings, model assets, diff changes, Core stdout/stderr capture, error evidence, and MCP text content all have hard limits.
- Model inventory is metadata-only according to the Core contract; this integration does not read prompt, transcript, source, document, token, cookie, credential, or model binary contents.
- `aidisk_capabilities` does not parse human help text or infer support from version numbers. Missing, malformed, or unsupported capability contracts fail closed.

Agents must never bypass these rules by deleting paths with shell commands. If a future mutation flow is approved, it must use a separate Desktop-mediated authorization surface.

## Development

```bash
npm install
npm run check
npm test
npm audit --audit-level=moderate
git diff --check
cargo fmt --manifest-path spikes/rust-direct-core/Cargo.toml -- --check
cargo run --manifest-path spikes/rust-direct-core/Cargo.toml
```

For a real Core smoke, install/build the pinned Core revision `cac502f73c39f1b5de13bab3e4de86a5c29684fc`, set `AIDISK_EXE` to that binary, and run `npm test`. CI includes a pinned-Core `AIDISK_EXE` smoke in addition to protocol-only Node tests and the Rust direct-Core spike.

## License

The integration source is dual-licensed under MIT or Apache-2.0. See [`LICENSE-MIT`](LICENSE-MIT) and [`LICENSE-APACHE`](LICENSE-APACHE). Core licensing remains governed by the public Core repository.

## Status

I1 Alpha Agent Integration. This repository is not the commercial Desktop and contains no accounts, billing, entitlements, telemetry, cloud synchronization, or proprietary Desktop code.
