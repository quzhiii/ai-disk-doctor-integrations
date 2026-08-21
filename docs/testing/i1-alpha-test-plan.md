# I1 Alpha Test Plan

Status: Planning only. These tests describe future behavior after Core explainability contracts exist. This document adds no production tests and no runtime functionality.

Date: 2026-08-21

## Scope

The I1 Alpha test plan covers the future Node MCP `explain_storage` capability and its relationship to existing tools. The plan assumes Core has released a compatible explainability CLI and no-snapshot diagnostic contract.

Current tools remain:

- `core_status`;
- `scan_summary`;
- `ai_model_inventory`;
- `latest_diff`.

Future tests must prove `explain_storage` is unavailable when its Core contracts are unavailable and available only when every compatibility gate passes.

## Scenario 1: User Asks Why Disk Usage Increased

User question example:

```text
Why did my disk usage increase recently?
```

Expected MCP behavior before Core explainability is available:

- use `core_status` when compatibility is unknown;
- use `latest_diff` for Core-owned recent change evidence when history exists;
- optionally use `scan_summary` for current bounded findings;
- do not call or list `explain_storage`;
- do not calculate a replacement diff or explanation in Integration.

Expected MCP behavior after Core explainability is available:

- use `latest_diff` to identify recent growth when needed;
- call `explain_storage` only for Core explanation of current classifications or relevant category;
- preserve Core provenance, warning, partial, and omission metadata;
- Agent response states whether evidence is complete, partial, or bounded.

Failure expectation:

- if Core history is insufficient, report insufficient history and suggest a future scan/snapshot cycle rather than inventing growth causes.

## Scenario 2: User Asks Which AI Tool Consumes Storage

User question example:

```text
Which AI tool is taking the most space?
```

Expected MCP behavior:

- use `ai_model_inventory` for model/cache metadata;
- use `scan_summary` if broader workspace findings are needed;
- use `explain_storage` only after Core explainability is available and only to explain Core classifications/accounting;
- preserve model inventory metadata boundaries and do not read model, prompt, source, credential, or token contents.

Expected Agent response:

- cite returned Core totals, roots, assets, stale status, and truncation;
- distinguish model inventory evidence from scan findings;
- avoid declaring anything safe to delete.

## Scenario 3: User Asks Explanation Of Finding

User question example:

```text
Why is this finding classified this way?
```

Expected MCP behavior before Core explainability is available:

- report that detailed explainability is blocked by missing Core CLI contract;
- use existing `scan_summary` evidence only if the user wants current findings;
- do not synthesize rule rationale beyond returned Core fields.

Expected MCP behavior after Core explainability is available:

- validate minimal input, such as optional category;
- invoke only the fixed Core explain argv with diagnostic no-snapshot mode;
- return Core contract, schema version, evidence, provenance, warnings, partial reasons, and omission fields;
- return an unavailable/incompatible error if any required Core field is missing.

Expected Agent response:

- explain the Core-provided rationale and evidence;
- state warnings and partial evidence clearly;
- avoid deletion, cleanup, recoverability, or safety recommendations unless a future authorized Core/Desktop workflow exists.

## Scenario 4: Core Unavailable

Setup:

- `AIDISK_EXE` points to a missing executable or Core is absent from `PATH`.

Expected MCP behavior:

- `core_status` reports unavailable with bounded diagnostic evidence;
- `scan_summary`, `ai_model_inventory`, `latest_diff`, and future `explain_storage` return structured Core unavailable errors;
- no fallback shell scan, local filesystem traversal, or mock Core result occurs.

Expected Agent response:

- tell the user Core is unavailable;
- identify the configured command when safe;
- suggest installing/configuring Core or `AIDISK_EXE`;
- do not provide storage conclusions without Core evidence.

## Scenario 5: Core Version Incompatible

Setup:

- Core command exists but does not expose required command surface, contract, schema version, or no-snapshot guarantee.

Expected MCP behavior:

- `core_status` reports incompatible or compatible-unverified according to current status rules;
- future `explain_storage` remains unavailable unless explainability contract, schema, provenance, and no-snapshot gate all pass;
- error includes the missing or unsupported capability;
- existing available tools continue only if their current compatibility contract is satisfied.

Expected Agent response:

- state which capability is missing or unsupported;
- avoid using `scan_summary` as an explainability fallback;
- tell the user that detailed explanation requires a compatible Core release.

## Test Types Needed Later

Future implementation should add:

- unit tests for `explain_storage` input rejection and exact argv allowlist;
- schema tests for Core passthrough, Integration wrapper fields, errors, and bounded output;
- fake-Core protocol tests for unavailable, incompatible, malformed, missing-provenance, output-overflow, and Core-error cases;
- real-Core smoke tests gated on a released Core binary with explainability and no-snapshot support;
- MCP stdio smoke tests proving the tool is listed only when enabled by the compatibility gate;
- privacy tests proving no file contents are read or returned by Integration fixtures.

No new production tests should be added before there is an implementation or released Core contract to test against.
