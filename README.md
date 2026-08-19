# AI Disk Doctor Integrations

Universal local Agent Skill and read-only MCP server for [AI Disk Doctor Core](https://github.com/quzhiii/ai-disk-doctor).

This repository is an integration and distribution layer. It does not implement a second scanner, cleaner, risk engine, recovery model, or policy system. The local Core remains the execution and policy source of truth.

## Alpha Scope

The MCP server exposes four tools:

| Tool | Behavior | Core side effect |
|---|---|---|
| `core_status` | Check Core availability and required command surface | None |
| `scan_summary` | Run the existing `aidisk scan --json` contract | Core may save `.aidisk/reports/scan-*.json` |
| `ai_model_inventory` | Run the existing `aidisk models inventory --json` contract | None intended |
| `scan_history` | List local Core-owned snapshot metadata | None |

I0 exposes no `clean`, `restore`, `quarantine`, `delete`, arbitrary shell, or arbitrary filesystem mutation tool. `explain_storage` is intentionally not included until the merged M1C Explainability Contract is available in the public Core.

## Install

### Prerequisites

- Node.js 18 or newer.
- AI Disk Doctor Core v1.7.0 or a compatible later Core on `PATH` as `aidisk`/`aidisk.exe`.
- Set `AIDISK_EXE` when the Core binary is installed elsewhere.

Install from a checkout:

```bash
git clone https://github.com/quzhiii/ai-disk-doctor-integrations.git
cd ai-disk-doctor-integrations
npm install
npm start
```

For a deterministic local installation, pin the repository checkout or use a tagged release. The npm dependency is pinned to `@modelcontextprotocol/sdk` `1.30.0` in `package-lock.json`.

The process uses MCP stdio transport and should be started by an MCP client, not opened as a standalone interactive program.

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
      "enabled": true
    }
  }
}
```

For a global install, use absolute paths for `command` arguments and set `AIDISK_EXE` in `environment` if needed. Set `cwd` to the user workspace where Core snapshots should be stored, rather than the integration checkout. Then use `opencode mcp list` or ask the agent to check `core_status`. The checked-in example is under `adapters/opencode/opencode.jsonc`.

OpenCode Agent Skills are discovered from `.opencode/skills`, `.claude/skills`, or `.agents/skills`. Copy or symlink `skills/ai-disk-doctor` into one of those locations for a project or user installation.

### Qwen Code

Qwen Code supports local stdio MCP servers through `qwen mcp` or `settings.json`:

```bash
qwen mcp add --scope user --transport stdio ai-disk-doctor node ./src/server.js
```

Equivalent `.qwen/settings.json` entry:

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

The repository root is a Qwen extension package through its `qwen-extension.json`. Install the repository as a local extension after `npm install`; see `adapters/qwen/README.md`. The canonical Skill remains the same Skill, not a Qwen-specific governance implementation.

### CodeBuddy / WorkBuddy

Use the local MCP configuration surface supported by the installed product and point it at the same `node ./src/server.js` stdio process. Set its working directory to the workspace where Core snapshot history should live. No Expert persona or vendor-specific risk logic is included. Exact packaging is deferred until an official, locally testable CodeBuddy / WorkBuddy client contract is available; see `adapters/codebuddy/README.md`.

### TRAE

Use TRAE’s documented project MCP configuration and add the same local stdio process. Set its working directory to the workspace where Core snapshot history should live. Exact project packaging is deferred until a TRAE client is locally available for validation; see `adapters/trae/README.md`.

## Core Diagnostics

```bash
# Verify the Core directly
aidisk --help

# Verify the integration server syntax
npm run check

# Override the Core executable
# Windows PowerShell:
$env:AIDISK_EXE = 'C:\\Tools\\aidisk.exe'
# POSIX shells:
export AIDISK_EXE=/opt/aidisk
```

If Core is missing or returns malformed/incompatible output, `core_status` reports a structured failure. The MCP process does not download Core, clone repositories, contact a cloud service, or silently substitute another scanner.

## Safety Boundary

- MCP transport is local stdio only.
- The server starts only the configured `aidisk` executable with fixed read-oriented subcommands.
- No arbitrary shell or arbitrary command tool exists.
- No cleanup, quarantine execution, restore, deletion, or mutation tool exists.
- `scan_summary` is marked `readOnlyHint: false` because current Core scan persistence can write an AI Disk Doctor-owned snapshot. It is still `destructiveHint: false` and does not modify user/workspace files.
- Model inventory is metadata-only according to the Core contract; this integration does not read prompt, transcript, source, document, token, cookie, or credential contents.
- Paths supplied to tools are passed only to the corresponding Core command or history metadata reader. They are not recursively read by this integration.

Agents must never bypass these rules by deleting paths with shell commands. If a future mutation flow is approved, it must use a separate authorization surface.

## Development

```bash
npm install
npm run check
npm test
```

For a real Core smoke, install/build the pinned Core revision, put `aidisk` on `PATH` or set `AIDISK_EXE`, and run `npm test`. The real-Core test is skipped when `AIDISK_EXE` is not set. The remaining protocol tests use temporary directories and a missing-Core case; they do not pretend that vendor clients are installed.

## License

The integration source is dual-licensed under MIT or Apache-2.0. See [`LICENSE-MIT`](LICENSE-MIT) and [`LICENSE-APACHE`](LICENSE-APACHE). Core licensing remains governed by the public Core repository.

## Status

I0 Alpha. This repository is not the commercial Desktop and contains no accounts, billing, entitlements, telemetry, cloud synchronization, or proprietary Desktop code.
