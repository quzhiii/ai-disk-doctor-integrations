# I1 Alpha Test Plan (Historical)

Status: I1.3 baseline implemented. This document retains future coverage goals beyond the current adapter tests.

Date: 2026-08-21

## Scope

The I1 Alpha test plan covers the Node MCP `aidisk_workspace_explain` capability and its relationship to existing tools. The pinned Core provides the compatible explainability CLI and no-snapshot diagnostic contract.

Current tools remain:

- `aidisk_capabilities`;
- `aidisk_workspace_explain`;
- `core_status`;
- `scan_summary`;
- `ai_model_inventory`;
- `latest_diff`.

Current tests prove `aidisk_workspace_explain` fails closed when its Core contracts are unavailable and accepts only its fixed argv. Future tests extend real-Core and edge-case coverage.

## Scenario 1: User Asks Why Disk Usage Increased

User question example:

```text
Why did my disk usage increase recently?
```

Expected MCP behavior when Core explainability is unavailable:

- use `core_status` when compatibility is unknown;
- use `latest_diff` for Core-owned recent change evidence when history exists;
- optionally use `scan_summary` for current bounded findings;
- `aidisk_workspace_explain` returns a structured unavailable or invalid-contract status;
- do not calculate a replacement diff or explanation in Integration.

Expected MCP behavior when Core explainability is available:

- use `latest_diff` to identify recent growth when needed;
- call `aidisk_workspace_explain` only for Core explanation of current classifications or relevant category;
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
- use `aidisk_workspace_explain` only when its capability gate passes and only to explain Core classifications/accounting;
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

Expected MCP behavior when Core explainability is unavailable:

- report that detailed explainability is blocked by missing Core CLI contract;
- use existing `scan_summary` evidence only if the user wants current findings;
- do not synthesize rule rationale beyond returned Core fields.

Expected MCP behavior when Core explainability is available:

- validate minimal input, such as optional category;
- invoke only the fixed Core explain argv with diagnostic no-snapshot mode;
- return the documented bounded Core storage, evidence, handling, category, and rule projection;
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
- `scan_summary`, `ai_model_inventory`, `latest_diff`, and `aidisk_workspace_explain` return structured Core unavailable errors;
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
- `aidisk_workspace_explain` remains unavailable unless explainability contract, schema, and no-snapshot gate all pass;
- error includes the missing or unsupported capability;
- existing available tools continue only if their current compatibility contract is satisfied.

Expected Agent response:

- state which capability is missing or unsupported;
- avoid using `scan_summary` as an explainability fallback;
- tell the user that detailed explanation requires a compatible Core release.

## Additional Test Types

Future coverage should add:

- real-Core tests for `aidisk_workspace_explain` category filtering, partial evidence, warnings, and no-snapshot side effects;
- schema tests for Core passthrough, Integration wrapper fields, errors, and bounded output;
- fake-Core protocol tests for unavailable, incompatible, malformed, missing-provenance, output-overflow, and Core-error cases;
- real-Core smoke tests gated on a released Core binary with explainability and no-snapshot support;
- MCP stdio smoke tests proving the tool is listed only when enabled by the compatibility gate;
- privacy tests proving no file contents are read or returned by Integration fixtures.

Current fake-Core tests cover input rejection, exact argv, unavailable Core, unsupported contracts, malformed output, and raw-output exclusion.
