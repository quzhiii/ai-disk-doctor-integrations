# I3 Self-Service Safe Alpha

This package provides a Windows-first self-service path for a first-time Claude
Code user. The path is local and diagnosis-only:

```text
npm install
  -> node scripts/i3.mjs setup --workspace <workspace> [--core <aidisk.exe>]
  -> node scripts/i3.mjs verify --workspace <workspace> [--core <aidisk.exe>]
  -> node scripts/i3.mjs launch --workspace <workspace> [--core <aidisk.exe>]
  -> node scripts/i3.mjs feedback --workspace <workspace> --out <receipt.json>
```

Node.js 18 or newer and Claude Code are required. A compatible Core can be
provided with `--core`, found on `PATH`, or acquired automatically on Windows
x86_64. Automatic acquisition is pinned to the official AI Disk Doctor v1.8.0
release, downloads only from the fixed GitHub Release URL, verifies the
published SHA-256 before extraction, and records package ownership in a local
manifest. The Core explain execution bound is 120 seconds. `setup` checks the Core `agent-capabilities-v1` contract before it
changes Claude configuration. It registers the package at Claude Code's local
scope with an absolute server path and the workspace as the process working
directory. The workspace path is configuration, not model-facing tool input.

## Setup

Run from the checked-out integration package:

```powershell
npm install
node scripts/i3.mjs setup --workspace C:\Users\me\my-project --core C:\Tools\aidisk.exe
```

`--core` is optional. Setup first reuses a package-owned verified Core, then a
compatible `aidisk.exe` on `PATH`, and otherwise acquires the fixed official
Windows x86_64 v1.8.0 package. Setup refuses to
replace an existing same-name Claude server unless its environment contains
both package ownership markers:

```text
AIDISK_INTEGRATION_MANAGED_BY=ai-disk-doctor-integrations/i3
AIDISK_INTEGRATION_PROFILE=safe-alpha-v1
```

This prevents the package from overwriting unrelated user configuration.

The package-owned Core is stored outside the workspace with a manifest that
records the release tag, artifact name, artifact SHA-256, executable
fingerprint, and ownership. A user-supplied or PATH-installed Core is never
removed by uninstall. Automatic ARM64 acquisition is intentionally deferred
for this Windows x86_64 Alpha target.

## Verify And Launch

`verify` uses the MCP SDK over local stdio, not a generic filesystem scan. It
checks initialize, tool discovery, the required capability tool, and the
no-category workspace explanation. If Core or the contract is unavailable,
diagnosis is reported as unavailable and no fallback scan is attempted.

```powershell
node scripts/i3.mjs verify --workspace C:\Users\me\my-project --core C:\Tools\aidisk.exe
node scripts/i3.mjs launch --workspace C:\Users\me\my-project --core C:\Tools\aidisk.exe
```

`launch` starts Claude with a temporary strict MCP configuration. Only the six
existing diagnostic MCP tools are allowed. Bash, Edit, Write, NotebookEdit,
Agent, WebFetch, and WebSearch are explicitly denied. The temporary config is
removed when Claude exits. No cleanup, delete, quarantine, restore, arbitrary
shell, or arbitrary filesystem tool is added.

## Feedback

Feedback preparation is optional and local:

```powershell
node scripts/i3.mjs feedback --workspace C:\Users\me\my-project --out .\ai-disk-doctor-feedback.json
```

The receipt contains the real most-recent setup and verify outcome: schema,
integration version/profile, Core release version/tag and fingerprints, setup
success/duration, MCP connection/tool count, diagnosis status, evidence status,
diagnosis duration, category, diagnosis-only safety mode, and sharing consent.
It does not contain workspace
paths, Core paths, prompts, transcripts, source, documents, credentials,
tokens, cookies, model contents, or raw Core output. Review the file locally
and obtain explicit consent before sharing it.

The frozen safety spot check can be reproduced after setup:

```powershell
node scripts/i3.mjs safety-check --workspace C:\Users\me\my-project --core C:\Tools\aidisk.exe --json
```

It asks Claude the mutation-shaped prompt from the I3 contract while the safe
profile denies host shell and mutation tools. The command requests Claude's
bounded `stream-json` event format and verifies the actual initialized tool
surface, observed tool calls, shell/mutation absence, and final response
classification. It records only tool names, counts, profile metadata, and
bounded classifications; raw transcript, paths, credentials, and sensitive
content are not retained. A missing or contradictory trace fails closed; no
delete fallback is attempted.

## Uninstall Scope

```powershell
node scripts/i3.mjs uninstall --workspace C:\Users\me\my-project
```

Uninstall removes only the local-scope `ai-disk-doctor` registration when both
I3 ownership markers match. It does not delete the integration checkout,
Core, `.aidisk` reports, user files, or any unrelated Claude configuration.

## Troubleshooting

- `Claude Code CLI is unavailable`: install Claude Code or make `claude` available on `PATH`.
- `Core compatibility check failed`: provide a compatible v1.8.0 Core with `--core`, or repair the official release acquisition; do not substitute a shell scan.
- `not_configured`: run `setup` for the same workspace before `verify`, or check that Claude Code's local configuration is available.
- `mcp_unavailable`: run `claude mcp get ai-disk-doctor` and confirm the local server can start; do not grant shell bypass to compensate.
- `diagnosis_unavailable`: preserve the unavailable result. The Alpha intentionally fails closed instead of using generic disk commands.
- `not_package_owned`: do not force removal. Inspect the existing registration and remove it manually only if it is yours.

The MCP server may persist a Core-owned snapshot only through the explicit
`scan_summary` tool. The primary `aidisk_workspace_explain` verification path
uses Core's no-snapshot mode and does not persist a snapshot.
