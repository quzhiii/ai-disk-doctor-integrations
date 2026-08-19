# Tool Semantics

## `core_status`

Checks the configured Core executable with `aidisk --help` and verifies the required command surface. It does not scan or write state.

## `scan_summary`

Invokes the existing `aidisk scan --json` contract with optional `category` only. It may persist a Core-owned scan snapshot under the current workspace’s `.aidisk/reports`. It returns a bounded projection of Core evidence and never invokes `plan`, `clean`, `restore`, or an arbitrary command.

## `ai_model_inventory`

Invokes the existing `aidisk models inventory --json` contract with optional `tool` only. Supported selectors are `auto`, `ollama`, `huggingface`, `lm-studio`, and `generic`. It uses Core defaults for root, depth, and stale cutoff. It returns bounded Core metadata and inventory evidence, not model contents.

## `latest_diff`

Invokes `aidisk diff --latest --json` with fixed arguments. Core owns latest snapshot discovery and diff semantics. No reports directory, before path, after path, or arbitrary local path is accepted from the model.

## Structured Results

Successful calls return concise text plus MCP `structuredContent`. Failures return `isError: true` with concise bounded text. Core stdout/stderr evidence is capped and truncation is explicit in error details when available.
