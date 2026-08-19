# Examples

## Disk Suddenly Full

Call `core_status`, then `scan_summary`. Summarize the largest findings by Core category and risk. If a finding is missing, partial, active, sensitive, or report-only, say so rather than recommending removal.

## Model Storage

Call `ai_model_inventory` with `tool: "auto"`. Separate logical size, exclusive physical size, shared physical size, recovery size, reclaim confidence, and blocked/unknown status. Never equate a stale model with automatically removable content.

## Recent Growth

Call `scan_history`. If `latest_pair` exists, explain the snapshot paths and tell the user that I0 provides metadata only. Do not independently compare file contents or invent a growth ranking before a Core explainability/diff contract is explicitly integrated.

## Missing Core

Call `core_status`. Report the configured executable, expected Core version/revision, and the structured error. Recommend installing the signed/released Core or setting `AIDISK_EXE`; do not fall back to shell deletion commands.
