---
name: ai-disk-doctor
description: Diagnose AI and developer workspace storage with AI Disk Doctor's local Core. Use when asking why a disk is full, which AI tools or model caches consume space, what changed recently, what Core evidence supports a classification, or what should be reviewed safely.
license: MIT OR Apache-2.0
compatibility: Tested against AI Disk Doctor Core v1.7.0 at the I1.4 Agent compatibility-validation baseline. Workspace explain performs its own runtime compatibility gate. Requires an MCP-compatible Agent client; scan_summary may persist a Core-owned snapshot.
metadata:
  integration: ai-disk-doctor-integrations
  safety: non-destructive-diagnostic-alpha
---

# AI Disk Doctor

Use the AI Disk Doctor MCP tools as the workspace storage governance layer. The local AI Disk Doctor Core is the only source of truth for scanning, model inventory, history, diff, rules, policy, risk, and future cleanup planning.

## When To Use

Use this Skill for questions such as:

- Why is my disk suddenly full?
- Which AI tools, IDEs, or model caches are consuming storage?
- What did Claude, OpenCode, Cursor, Ollama, or other tools leave locally?
- What changed since the previous scan?
- Which findings need review, and what evidence supports that classification?

## I1 Workflow

1. For a natural storage diagnosis such as why the computer is getting full, call `aidisk_workspace_explain` as the primary entry point with `{}` and no `category` field. Its handler performs the capability compatibility check internally.
2. Supply `aidisk_workspace_explain.category` only when the user explicitly requests a focused, named Core category. Preserve the user's requested category without guessing a different value.
3. Use `aidisk_capabilities` for explicit capability inspection or compatibility troubleshooting, such as what AI Disk Doctor supports or whether the Core contract/schema is available. It is not required before `aidisk_workspace_explain`.
4. Call `core_status` when the Core may be missing or the environment is unfamiliar. If workspace explain reports an unavailable or incompatible Core, report that diagnostic state and stop.
5. Use `scan_summary` for explicit scanner-level findings or low-level scan inspection. Prefer `aidisk_workspace_explain` for general questions about why storage is growing or the workspace is full. Use its `category` only when the user asks for a focused area; do not provide rules, policy, root, reports, or executable paths.
6. Call `ai_model_inventory` only for explicit model-asset or model-inventory questions, or inspection of known AI model files. Only use the optional `tool` selector. Treat unknown, incomplete, custom, shared, or credential-adjacent assets conservatively.
7. Call `latest_diff` when the user asks what changed recently. Core owns snapshot discovery and diff semantics.
8. Explain findings with Core evidence. Preserve partial status, warning text, and bounded-output markers; do not turn handling or risk evidence into cleanup authorization.

## Safety Rules

- Never delete, move, quarantine, restore, or rewrite files with shell commands to work around this Skill.
- I0 exposes no destructive MCP tool. Do not invent one.
- Do not classify unknown, active, partial, sensitive, source, prompt, credential, or recovery data as safe to remove.
- A report-only or review finding is not an authorization to mutate it.
- Say clearly that `scan_summary` may create an AI Disk Doctor-owned snapshot under `.aidisk/reports`; it does not modify user/workspace files.
- Do not ask for or supply arbitrary rules, policy, root, reports directory, executable, or shell arguments.
- Do not read file contents merely to classify storage. Use Core metadata and rule evidence.
- If the Core is missing or incompatible, report that fact and stop at diagnostics. Do not substitute a generic cleaner or shell scan.

## Response Shape

Lead with the largest supported conclusion, then provide:

- evidence and the Core schema/version source
- risk and uncertainty
- items requiring review or explicitly blocked
- the smallest safe next diagnostic step

Do not promise reclaimable space unless the Core explicitly reports an estimate. Reclaim confidence is not the same as recovery value. If output says `truncated: true`, say the response is a bounded projection and suggest focused follow-up diagnostics rather than inventing missing detail.

## Explainability Boundary

`aidisk_workspace_explain` performs `aidisk_capabilities({})` internally, then invokes Core through the fixed no-snapshot explain command only when its machine-readable compatibility gate passes. It returns a bounded projection of Core-owned storage, evidence, handling, category, and rule data. If it reports `core_unavailable`, `contract_unavailable`, `invalid_core_response`, or `projection_failed`, report that diagnostic state and do not replace it with shell scans or Integration-generated explainability.

## Agent Compatibility

Use the local stdio MCP server from the Agent's documented configuration surface. For natural storage diagnosis, call `aidisk_workspace_explain({})`; do not add a category. Use `aidisk_capabilities` separately for explicit capability inspection or compatibility troubleshooting, not as a required preflight. The I1.4 validation record is in `docs/compatibility/i1-agent-validation.md`.

This Skill is read-only. It exposes no cleanup, delete, restore, quarantine, shell, arbitrary filesystem, telemetry, or cloud operation. Do not invent vendor-specific configuration fields for clients whose local MCP contract has not been verified. If a client is unavailable, use the shared MCP protocol validation result only as protocol evidence, not as a claim of client registration support.

For the safety model, tool semantics, examples, and compatibility details, load the linked references only when needed:

- [Safety model](references/safety-model.md)
- [Tool semantics](references/tool-semantics.md)
- [Examples](references/examples.md)
- [Platform compatibility](references/platform-compatibility.md)
