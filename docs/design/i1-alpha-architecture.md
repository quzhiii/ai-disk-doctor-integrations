# I1 Alpha Architecture

Status: I1 preparation only. This document describes the future Agent Alpha architecture after Core ships compatible explainability contracts. It does not add `explain_storage`, change runtime behavior, modify Core, or modify Desktop.

Date: 2026-08-21

## Goal

I1 Alpha should let an Agent explain AI workspace storage using Core-owned evidence while preserving the current Integration rule: Core is the only source of truth for scan, policy, risk, action, recoverability, history, diff, model inventory, and explainability.

Future flow:

```text
Agent
  |
  v
MCP explain_storage
  |
  v
Core explainability contract
  |
  v
bounded projection
  |
  v
Agent response
```

The current production MCP boundary remains the Node server over fixed Core CLI argv. I1 implementation must wait until Core exposes a released, versioned explainability CLI contract and a released no-snapshot diagnostic mode.

## Ownership Boundary

Core owns:

- scanner traversal and matched findings;
- rules, policy, risk, action, handling, and recoverability semantics;
- explainability accounting, evidence, warning generation, omission metadata, and provenance;
- snapshot persistence semantics and any no-snapshot guarantee;
- Core compatibility and schema version identifiers.

Integration owns:

- MCP stdio transport;
- tool registration after compatibility gates pass;
- narrow model-facing input validation;
- fixed argv construction for the released Core contract;
- subprocess timeout and output-capture guardrails;
- bounded projection that preserves Core totals, omissions, warnings, and provenance;
- structured unavailable/incompatible errors when Core cannot satisfy the contract.

Integration must not calculate or override Core risk, cleanup action, deletion recommendation, recoverability, warning semantics, policy result, path sensitivity, or explainability output.

## Schema Flow

The future schema flow has five layers:

| Layer | Source | Responsibility |
|---|---|---|
| User request | Agent conversation | Expresses intent such as explaining storage growth or a Core finding. It is not forwarded as an arbitrary Core query. |
| MCP input | Integration | Minimal structured input, likely optional `category`, with no arbitrary paths or command controls. |
| Core command | Integration invoking Core | Exact released argv, expected to be `aidisk explain --json --snapshot skip` plus optional validated category after Core supports it. |
| Core JSON | Core | Authoritative `explainability-v1` payload, schema version, evidence, warning, omission, and provenance fields. |
| MCP output | Integration | Bounded wrapper/projection that preserves Core fields and separately labels Integration transport metadata. |

The Agent response should be generated from MCP output and must state uncertainty, warnings, partial status, truncation, and provenance when relevant. It should not infer hidden files, omitted path groups, or cleanup decisions.

## Provenance Handling

The future tool must preserve Core provenance as data, not reconstruct it. Required provenance handling:

- report the actual Core command shape supplied by Core or exact Integration argv when the Core contract requires that arrangement;
- preserve Core contract name and schema version;
- preserve Core version and revision verification status;
- preserve snapshot persistence mode, snapshot path/result, and side effects;
- preserve path disclosure semantics and bounded-output semantics;
- add Integration wrapper provenance only in a separate field.

If Core cannot provide required provenance, the tool must return `unavailable` or `incompatible` rather than inventing provenance from Integration assumptions.

## Error Handling

The future I1 tool should fail closed for:

- Core executable unavailable;
- Core command surface missing the explainability contract;
- unsupported contract or schema version;
- missing no-snapshot diagnostic guarantee;
- Core output missing required provenance, evidence, warnings, or omission fields;
- malformed JSON;
- subprocess timeout;
- stdout/stderr capture overflow;
- Core nonzero exit or structured capability error.

Error responses should be bounded, structured, and diagnostic. They may identify what capability is missing and what the user can safely check next, but they must not fall back to local filesystem scans, shell commands, `scan_summary`-derived explainability, or Rust application calls outside the chosen production boundary.

## Compatibility Checks

Before enabling `explain_storage`, Integration must verify:

- Core explainability CLI capability is available;
- expected contract identifier is present;
- supported schema version is present;
- no-snapshot diagnostic mode is available and guaranteed;
- provenance fields are present and valid;
- output bounding and omission semantics are stable;
- category selector semantics match the released Core contract;
- current Node subprocess bounds are compatible with representative Core output.

Until all checks pass against a released Core baseline, `explain_storage` remains unregistered and unavailable.

## Non-Goals

I1 Alpha architecture does not include:

- cleanup, delete, quarantine, restore, or shell tools;
- arbitrary path, root, policy, rules, reports directory, executable, or command input;
- Desktop authorization or mutation UX;
- a Rust MCP production migration;
- Core source, rules, or policy changes;
- package publishing, npm release, or marketplace release.
