# AI Disk Doctor Integrations

Universal local Agent Skill and non-destructive diagnostic MCP server for [AI Disk Doctor Core](https://github.com/quzhiii/ai-disk-doctor).

This repository is an integration and distribution layer. It does not implement a second scanner, cleaner, risk engine, recovery model, policy system, history engine, or explainability engine. The local Core remains the execution and policy source of truth.

## Alpha Scope

The MCP server exposes four tools:

| Tool | Behavior | Model-facing inputs | Core side effect |
|---|---|---|---|
| `core_status` | Check Core availability, required command surface, and compatibility provenance | None | None |
| `scan_summary` | Run `aidisk scan --json` and return bounded Core evidence | `category?` | Current Core CLI may save `.aidisk/reports/scan-*.json` |
| `ai_model_inventory` | Run `aidisk models inventory --json` with Core defaults and return bounded assets | `tool?` | None intended |
| `latest_diff` | Run Core-owned `aidisk diff --latest --json` and return bounded changes | None | None |

I0.1 exposes no `clean`, `restore`, `quarantine`, `delete`, arbitrary shell, arbitrary executable, arbitrary rules/policy path, arbitrary reports directory, arbitrary filesystem mutation tool, or explainability MCP tool.

### Core state used by I0.1

- Tested Core baseline: v1.7.0 at `52f31509394d2165cba8908da00a1036ba90479d`.
- Latest merged Public Core reviewed during I0.1: `33d741130b9c2bdd386cb96a25e0f7c70dd1bce7`, which merged M1C `explainability-v1`.
- M1C is **not consumed by I0.1**. The current explainability contract is exposed through the Rust application boundary, while the Core CLI has no explainability CLI contract for this integration to call.

## Install

### Prerequisites

- Node.js 18 or newer.
- AI Disk Doctor Core v1.7.0 on `PATH` as `aidisk`/`aidisk.exe`, or set `AIDISK_EXE`.
- This integration is tested against Core revision `52f31509394d2165cba8908da00a1036ba90479d`. Runtime compatibility is checked by `core_status`; current Core binaries do not expose a runtime git revision, so the exact revision is not claimed from runtime detection.

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
- Model-facing inputs are limited to `scan_summary.category` and `ai_model_inventory.tool`.
- No model-facing rules, policy, root, reports directory, executable, shell, cleanup, quarantine, restore, or delete parameter exists.
- `scan_summary` is non-destructive but `readOnlyHint: false` because current Core CLI scan persists a Core-owned snapshot. It is `destructiveHint: false` and does not modify user/workspace files.
- Output is bounded: scan findings, model assets, diff changes, Core stdout/stderr capture, error evidence, and MCP text content all have hard limits.
- Model inventory is metadata-only according to the Core contract; this integration does not read prompt, transcript, source, document, token, cookie, credential, or model binary contents.

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

For a real Core smoke, install/build the pinned Core revision `52f31509394d2165cba8908da00a1036ba90479d`, set `AIDISK_EXE` to that binary, and run `npm test`. CI includes a pinned-Core `AIDISK_EXE` smoke in addition to protocol-only Node tests and the Rust direct-Core spike.

## License

The integration source is dual-licensed under MIT or Apache-2.0. See [`LICENSE-MIT`](LICENSE-MIT) and [`LICENSE-APACHE`](LICENSE-APACHE). Core licensing remains governed by the public Core repository.

## Status

I0.1 Alpha. This repository is not the commercial Desktop and contains no accounts, billing, entitlements, telemetry, cloud synchronization, or proprietary Desktop code.
