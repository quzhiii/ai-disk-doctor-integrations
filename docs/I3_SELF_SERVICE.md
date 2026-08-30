# I3 Self-Service Safe Alpha

This package provides a Windows-first self-service path for a first-time Claude
Code user. The path is local and diagnosis-only:

```text
npm install
-> npm run setup -- --workspace <workspace> [--core <aidisk.exe>]
-> npm run verify -- --workspace <workspace> [--core <aidisk.exe>]
-> npm run alpha -- --workspace <workspace> [--core <aidisk.exe>]
-> npm run feedback -- --workspace <workspace> --out <receipt.json>
```

Node.js 18 or newer, Claude Code, and a compatible AI Disk Doctor Core are
required. The tested Core explain path has a 180-second execution bound so a
real workspace scan is not incorrectly reported as unavailable. `setup` checks the Core `agent-capabilities-v1` contract before it
changes Claude configuration. It registers the package at Claude Code's local
scope with an absolute server path and the workspace as the process working
directory. The workspace path is configuration, not model-facing tool input.

## Setup

Run from the checked-out integration package:

```powershell
npm install
npm run setup -- --workspace C:\Users\me\my-project --core C:\Tools\aidisk.exe
```

`--core` is optional when `aidisk.exe` is already on `PATH`. Setup refuses to
replace an existing same-name Claude server unless its environment contains
both package ownership markers:

```text
AIDISK_INTEGRATION_MANAGED_BY=ai-disk-doctor-integrations/i3
AIDISK_INTEGRATION_PROFILE=safe-alpha-v1
```

This prevents the package from overwriting unrelated user configuration.

## Verify And Launch

`verify` uses the MCP SDK over local stdio, not a generic filesystem scan. It
checks initialize, tool discovery, the required capability tool, and the
no-category workspace explanation. If Core or the contract is unavailable,
diagnosis is reported as unavailable and no fallback scan is attempted.

```powershell
npm run verify -- --workspace C:\Users\me\my-project --core C:\Tools\aidisk.exe
npm run alpha -- --workspace C:\Users\me\my-project --core C:\Tools\aidisk.exe
```

`alpha` starts Claude with a temporary strict MCP configuration. Only the six
existing diagnostic MCP tools are allowed. Bash, Edit, Write, NotebookEdit,
Agent, WebFetch, and WebSearch are explicitly denied. The temporary config is
removed when Claude exits. No cleanup, delete, quarantine, restore, arbitrary
shell, or arbitrary filesystem tool is added.

## Feedback

Feedback preparation is optional and local:

```powershell
npm run feedback -- --workspace C:\Users\me\my-project --out .\ai-disk-doctor-feedback.json
```

The receipt contains setup/verification outcome metadata, profile and schema
identifiers, timing, and a short fingerprint. It does not contain workspace
paths, Core paths, prompts, transcripts, source, documents, credentials,
tokens, cookies, model contents, or raw Core output. Review the file locally
and obtain explicit consent before sharing it.

The frozen safety spot check can be reproduced after setup:

```powershell
npm run safety-check -- --workspace C:\Users\me\my-project --core C:\Tools\aidisk.exe --json
```

It asks Claude the mutation-shaped prompt from the I3 contract while the safe
profile denies host shell and mutation tools. A failure is reported; no delete
fallback is attempted.

## Uninstall Scope

```powershell
npm run uninstall -- --workspace C:\Users\me\my-project
```

Uninstall removes only the local-scope `ai-disk-doctor` registration when both
I3 ownership markers match. It does not delete the integration checkout,
Core, `.aidisk` reports, user files, or any unrelated Claude configuration.

## Troubleshooting

- `Claude Code CLI is unavailable`: install Claude Code or make `claude` available on `PATH`.
- `Core compatibility check failed`: install/build the tested Core v1.7.0 or pass its absolute executable with `--core`; do not substitute a shell scan.
- `not_configured`: run `setup` for the same workspace before `verify`, or check that Claude Code's local configuration is available.
- `mcp_unavailable`: run `claude mcp get ai-disk-doctor` and confirm the local server can start; do not grant shell bypass to compensate.
- `diagnosis_unavailable`: preserve the unavailable result. The Alpha intentionally fails closed instead of using generic disk commands.
- `not_package_owned`: do not force removal. Inspect the existing registration and remove it manually only if it is yours.

The MCP server may persist a Core-owned snapshot only through the explicit
`scan_summary` tool. The primary `aidisk_workspace_explain` verification path
uses Core's no-snapshot mode and does not persist a snapshot.
