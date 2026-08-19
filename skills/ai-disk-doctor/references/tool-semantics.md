# Tool Semantics

## `core_status`

Checks the configured Core executable with `aidisk --help` and verifies the required command surface. It does not scan or write state.

## `scan_summary`

Invokes the existing `aidisk scan --json` contract. It may persist a Core-owned scan snapshot under the current workspace’s `.aidisk/reports`. It never invokes `plan`, `clean`, `restore`, or an arbitrary command.

## `ai_model_inventory`

Invokes the existing `aidisk models inventory --json` contract. Supported selectors are `auto`, `ollama`, `huggingface`, `lm-studio`, and `generic`. It returns Core metadata and inventory evidence, not model contents.

## `scan_history`

Lists filenames and paths matching `scan-*.json` in the selected reports directory and returns the newest pair when available. It does not parse arbitrary workspace files or write state.

## Structured Results

Successful calls return a JSON text content block and MCP `structuredContent`. Failures return `isError: true` with a stable `{ ok: false, error: { type, message, details } }` shape.
