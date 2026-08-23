# I1 Explain Storage Boundary

Status: I1.2 contract preparation only. `aidisk_workspace_explain` is registered as a read-only MCP boundary, but Core explain execution is intentionally not implemented.

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
  | existing aidisk capabilities --json handshake only in I1.2
  v
Compatibility result
  |
  +--> contract_unavailable error
  |
  +--> not_implemented response
```

I1.2 does not invoke `aidisk explain`. A compatible capability handshake returns `not_implemented` so the Agent can distinguish an approved boundary from an executable Core feature. An unavailable or unsupported contract returns `contract_unavailable` with bounded gate reasons.

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

The future Agent-facing output is intentionally narrow:

- explanation status;
- requested category;
- bounded storage summary;
- evidence status;
- handling recommendation from the Core contract;
- bounded compatibility or not-implemented error.

Raw CLI output, internal debug fields, arbitrary nested metadata, unrestricted paths, and subprocess diagnostics are not part of this MCP projection. The I1.2 response keeps future Core-owned fields `null` because no explain execution occurs.

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

The tool declares `readOnlyHint: true` and `destructiveHint: false`. It performs no filesystem write, shell execution, network telemetry, cloud upload, or mutation. Its only I1.2 subprocess path is the existing fixed `capabilities --json` handshake.

## Contract Gate

The handler requires the existing machine-readable capability contract and supported explainability schema version. It does not parse help text, infer compatibility from a version number, or fall back to scan output. If the gate fails, the handler returns a structured compatibility error and no explain command is attempted.

## Stop Condition

This document does not authorize Core changes or real explain execution. A later milestone requires a released Core explainability contract, fixture coverage, exact argv tests, bounded projection tests, and owner approval before replacing `not_implemented` with execution.
