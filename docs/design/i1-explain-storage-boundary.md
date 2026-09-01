# I1 Explain Storage Boundary (Historical Context)

Status: I1.3 runtime adapter implemented against the pinned Core `agent-diagnostic-cli-v1` and `explainability-v1` contracts.

Date: 2026-08-24

## Agent Intent

The future tool gives an Agent a narrow interface for asking Core to explain AI workspace storage evidence. Typical intent is:

- explain a current storage classification;
- explain a focused Core category;
- understand storage accounting and evidence status.

Natural-language intent remains in the Agent conversation. The MCP input contains only an optional Core category selector. It does not become an arbitrary Core query.

## MCP Boundary

```text
Agent
  |
  | aidisk_workspace_explain({ category? })
  v
MCP contract boundary
  |
  | fixed aidisk capabilities --json handshake
  v
Compatibility result
  |
  +--> contract_unavailable error
  |
  +--> fixed aidisk explain --json --snapshot skip invocation
             |
             +--> bounded Agent-facing projection
             +--> structured Core/projection error
```

The handler first validates the machine-readable capability handshake. Only a compatible Core may reach the explain invocation. The runtime adapter executes exactly `aidisk explain --json --snapshot skip`, or that same fixed argv with the validated category selector appended. It does not pass arbitrary arguments or allow snapshot selection. Category semantics remain owned by Core.

The explain response is validated before projection. The adapter requires the `agent-diagnostic-cli-v1` envelope, schema version `1`, `core_version`, the no-snapshot response (`requested: skip`, `persisted: false`, `path: null`), and the nested `explainability-v1` report with integer storage counters, evidence status, warnings, categories, handling totals, and rules. Unsupported or malformed Core output fails closed.

## Core Ownership

When a future Core explainability contract is consumed, Core remains authoritative for:

- storage accounting;
- evidence status and partial reasons;
- rule/category explanation;
- handling recommendation;
- risk, action, and recoverability semantics;
- warnings, omissions, and provenance.

Integration must not recreate, rank, normalize, or override those semantics.

## Projection Responsibility

The Agent-facing output is intentionally narrow:

- explanation status;
- requested category;
- bounded storage summary;
- evidence status;
- bounded handling recommendation from the Core contract;
- bounded structured error category.

The success projection includes Core storage counters, evidence status and warnings, and up to 16 categories with up to 32 rule summaries per category. Strings are bounded to 256 characters. Raw CLI output, accounting internals, volume metadata, path groups, rule rationale, provenance, recoverability details, arbitrary nested metadata, unrestricted paths, and subprocess diagnostics are not part of this MCP projection. The projection does not calculate risk, cleanup eligibility, recoverability, or action recommendations.

## Input And Security Constraints

Allowed input:

```json
{
  "category": "optional string"
}
```

Rejected input includes:

- root or filesystem paths;
- rules or policy overrides;
- arbitrary Core command arguments;
- executable selection;
- snapshot control;
- arbitrary filters;
- shell, cleanup, delete, quarantine, or restore instructions.

The tool declares `readOnlyHint: true` and `destructiveHint: false`. It performs no filesystem write, shell execution, network telemetry, cloud upload, or mutation. Its subprocess paths are the fixed capability handshake and the fixed no-snapshot explain command. Core’s skip mode is required so the diagnostic call does not create a scan snapshot.

## Contract Gate

The handler requires the existing machine-readable capability contract and supported explainability schema version. It does not parse help text, infer compatibility from a version number, or fall back to scan output. If the gate fails, the handler returns a structured compatibility error and no explain command is attempted. Runtime failures are mapped to `core_unavailable`, `contract_unavailable`, `invalid_core_response`, or `projection_failed`.

## Stop Condition

This document does not authorize cleanup, restore, quarantine, delete, shell, network, telemetry, or cloud behavior. Real Core smoke validation still depends on the pinned Core binary supplied by CI; local tests use a fake Core executable to prove the exact argv and projection boundary when the developer’s installed binary predates the explain CLI contract.
