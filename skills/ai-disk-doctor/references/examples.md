# Examples

## Disk Suddenly Full

Call `core_status`, then `scan_summary`. Summarize the largest returned findings by Core category and risk. If a finding is missing, partial, active, sensitive, or report-only, say so rather than recommending removal. If `truncated` is true, say the MCP result is bounded.

## Model Storage

Call `ai_model_inventory` with `tool: "auto"` or another Core-supported selector. Separate logical size, exclusive physical size, shared physical size, recovery size, reclaim confidence, and blocked/unknown status when Core returns those fields. Never equate a stale model with automatically removable content.

## Recent Growth

Call `latest_diff`. Explain the Core-provided `before`, `after`, summary, and bounded changes. Do not independently list report directories, calculate latest pairs, compare file contents, or invent a growth ranking outside the Core diff output.

## Missing Core

Call `core_status`. Report the configured executable, detected version if available, tested revision provenance, revision verification status, compatibility status, and structured error. Recommend installing the signed/released Core or setting `AIDISK_EXE`; do not fall back to shell deletion commands.
