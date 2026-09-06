# Node Alpha Scope

Status: I0.4 planning document. It describes the current Node MCP route and does not add a tool or change runtime behavior.

Date: 2026-08-21

## Purpose

The Agent Alpha helps users understand AI and developer workspace storage from local Core evidence. The production boundary remains the Node MCP server over fixed AI Disk Doctor Core CLI commands.

```text
Agent client
    |
    | local MCP stdio
    v
Node MCP
    |
    | fixed Core CLI argv
    v
AI Disk Doctor Core
```

The Alpha is an evidence and explanation experience, not a cleanup authority. It must preserve the current local-only, bounded-output, no-shell, no-arbitrary-path boundary.

## User Questions

The Alpha should help with questions such as:

- Why did available disk space decrease recently?
- Which AI tools, IDEs, model runtimes, or model caches are using storage?
- What changed between the latest Core-owned snapshots?
- What current storage findings need user review or a more specific Core explanation?
- Is the local Core available and compatible with this integration?

An Agent should describe the strongest conclusion that current Core evidence supports, state uncertainty and truncation, and identify the smallest safe follow-up diagnostic. It must not turn a classification, warning, risk, action, or size into deletion advice.

## Current Available Evidence

| User need | Current MCP evidence | Limits and required disclosure |
|---|---|---|
| Understand present storage pressure | `scan_summary` returns bounded volumes, summary, policy, and top Core findings. | The current CLI invocation is `aidisk scan --json`; it may save a Core-owned `.aidisk/reports/scan-*.json` snapshot. It does not modify user/workspace files. |
| Identify AI model/cache storage | `ai_model_inventory` returns Core metadata for supported model assets and cache roots. | Metadata only. The Integration does not read model, prompt, source, document, token, cookie, credential, or model-binary contents. |
| Understand recent growth | `latest_diff` uses Core-owned `aidisk diff --latest --json`. | Requires suitable Core history. If history is unavailable or insufficient, the Alpha reports that result rather than calculating a replacement diff. |
| Focus a scan on a known category | `scan_summary` accepts the existing bounded `category` selector. | The category is a Core filter, not an arbitrary path, rule, policy, root, reports directory, or command input. |
| Check prerequisites | `core_status` reports executable availability, command surface, version information when Core can provide it, and compatibility provenance. | Current Core cannot prove its exact git revision at runtime. The tested revision remains provenance, not runtime identity. |

The current Alpha tool surface is exactly `core_status`, `scan_summary`, `ai_model_inventory`, and `latest_diff`. Each result is a bounded projection of Core-owned data. A `truncated` result is incomplete evidence, not permission to infer omitted details.

## Recommended Alpha Conversation

1. Use `core_status` when Core availability or compatibility is unknown.
2. Use `scan_summary` for current disk/storage questions, disclosing its Core-owned snapshot side effect.
3. Use `ai_model_inventory` for model runtime and cache questions.
4. Use `latest_diff` for recent-change questions when Core history exists.
5. Explain only returned Core evidence, warnings, partial status, and provenance. Identify missing evidence rather than fabricating a root cause.

## Missing Core Contracts

The following questions need contracts that are not available in the current Core CLI baseline:

| Needed capability | Why the current Alpha cannot provide it | Required Core contract |
|---|---|---|
| Explain why a finding is classified, including accounting, evidence groups, rationale, and omissions | Public Core M1C exposes `explainability-v1` through a Rust application boundary, not through the current Node-consumable CLI. Integration must not recreate an explainability engine. | Proposed `aidisk explain --json [--category <category>] [--snapshot <save|skip>]` explainability CLI contract. |
| Run a strict diagnostic scan without Core report persistence | Current `aidisk scan --json` may write a Core-owned snapshot. Integration must not claim strict read-only behavior or suppress persistence itself. | Proposed `aidisk scan --json --snapshot skip` diagnostic no-snapshot contract. |
| Move a future Rust MCP from spike to distribution | The application boundary currently depends on caller-provided rules and policy paths. | Proposed Core application asset-provider contract. This is a future platform option, not an Alpha migration commitment. |

These contracts are proposed in Draft PR #3 and have not been implemented by Core. Their absence means the Alpha must return current scan, inventory, and diff evidence only.

## Explicit Non-Goals

The Node Alpha does not:

- decide whether any file is safe to delete;
- perform, recommend, or authorize automatic cleanup;
- create cleanup, delete, quarantine, restore, shell, or arbitrary filesystem tools;
- accept arbitrary paths, rules, policy, root, reports directory, executable, or command arguments from the model;
- implement its own scanner, model inventory, history, diff, explainability, risk, action, handling, recoverability, or policy logic;
- read file contents to classify storage;
- add telemetry, cloud, accounts, billing, or a Desktop runtime;
- migrate the production MCP boundary to Rust.

Future mutation, if ever approved, remains a separate Core-plan and Desktop-human-authorization workflow. It is outside Agent Alpha.
