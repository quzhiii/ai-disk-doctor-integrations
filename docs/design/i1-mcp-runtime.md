# I1 MCP Runtime

Status: Superseded by the I1.3 explain runtime adapter. This retains the I1.1 capability-discovery design context.

Date: 2026-08-21

## Runtime Architecture

```text
Agent
  |
  | MCP stdio
  v
Node MCP server
  |
  | aidisk_capabilities
  v
Core capability adapter
  |
  | fixed argv: capabilities --json
  v
AI Disk Doctor Core CLI
  |
  v
bounded capability projection
  |
  v
MCP structured result
```

The existing I0.1 tools remain available. I1.3 adds the read-only `aidisk_workspace_explain` adapter; it does not add cleanup, action, mutation, or arbitrary CLI tools.

## Trust Boundary

The Agent can select the `aidisk_capabilities` tool, but cannot supply executable paths, subprocess arguments, shell text, policy, rules, roots, reports directories, or network settings. The adapter invokes exactly `aidisk capabilities --json` using the configured Core executable and direct process spawning without shell interpolation.

Core owns the capability claims. Integration does not infer support from Core version numbers or human help text. The adapter accepts only the machine-readable capabilities envelope and projects known bounded fields; raw stdout/stderr is never returned as a successful capability result.

`aidisk_capabilities` is read-only and declares `readOnlyHint: true` and `destructiveHint: false`. Existing `scan_summary` retains its truthful `readOnlyHint: false` annotation because the current Core scan may persist a Core-owned snapshot.

## Capability Handshake

The adapter calls:

```text
aidisk capabilities --json
```

The current Core contract is `agent-capabilities-v1`, schema version `1`. The future explainability readiness gate requires:

- contract source reviewed at Core revision `cac502f73c39f1b5de13bab3e4de86a5c29684fc`;

- the Core executable and command response are available;
- the capabilities envelope is recognized;
- `explainability-v1` is advertised;
- explainability schema version `1` is advertised;
- `snapshot_modes` includes `skip`;
- bounded path-group output is advertised.

The result reports the individual gate checks in `integration_status.required`. A failed check returns a structured compatibility error and prevents `aidisk_workspace_explain` from invoking Core explain execution.

The gate never parses help text and never guesses compatibility from `core_version` alone.

## Projection And Errors

The projection returns Core version, a bounded list of contract summaries, exact fixed argv provenance, and Integration compatibility status. It does not return the raw capabilities document or arbitrary unknown nested fields.

Expected structured failure categories include:

- Core executable unavailable;
- malformed Core JSON or envelope;
- unsupported capabilities contract/schema;
- missing explainability contract/schema;
- missing diagnostic snapshot skip or bounded output support.

Failure responses are bounded and exclude raw Core stdout/stderr. No fallback scan, help parsing, shell execution, local filesystem scan, Rust application call, or network operation occurs.

## Implemented Explainability Integration

`aidisk_workspace_explain` is registered and invokes the fixed Core explain command only after the capability gate passes. Its detailed runtime sequence and bounded projection are documented in `i1-explain-storage-boundary.md`.

It must not calculate risk, action, deletion recommendations, recoverability, accounting, or explainability semantics.
