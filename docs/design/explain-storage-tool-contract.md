# Explain Storage Tool Contract

Status: Superseded by the implemented `aidisk_workspace_explain` runtime boundary in `i1-explain-storage-boundary.md`. This remains historical design context for a broader future tool.

Date: 2026-08-21

## Purpose

`explain_storage` was a proposed diagnostic MCP tool for explaining Core storage findings. The current implementation is the narrower `aidisk_workspace_explain`, a consumer of Core explainability output rather than an Integration-owned explanation engine.

## Proposed Tool

```text
name: explain_storage
status: proposed-only
transport: local MCP stdio
core dependency: released Core explainability CLI plus no-snapshot diagnostic contract
```

The tool is unavailable until Core exposes a compatible contract and Integration passes the compatibility gate.

## Input Contract

Proposed model-facing input:

```json
{
  "intent": "optional concise user intent label",
  "category": "optional Core category selector"
}
```

`intent` is descriptive only. It helps the Agent frame the response and must not be forwarded to Core as an arbitrary prompt, path, query, or command. A future implementation may omit `intent` entirely if the MCP schema can remain narrower.

`category` is optional and maps only to Core's released category filter semantics. It must be bounded, non-empty when supplied, free of control characters, and rejected if it exceeds the Core-defined maximum.

## Rejected Inputs

The tool must reject:

- arbitrary paths, roots, glob patterns, report paths, or volume selectors;
- shell commands, command fragments, stdin, environment overrides, or executable paths;
- cleanup, delete, quarantine, restore, `--yes`, dry-run, or mutation instructions;
- policy overrides, rules directories, rules repositories, config paths, or asset-provider paths;
- snapshot mode chosen by the model;
- request fields that ask Integration to compute risk, deletion recommendation, recoverability, or safety-to-remove status.

Unknown input fields are errors. There is no compatibility mode that passes unrecognized fields through to Core.

## Core Invocation

The intended Core invocation is a fixed argv shape only after Core releases it, expected to be equivalent to:

```text
aidisk explain --json --snapshot skip [--category <category>]
```

Integration must not call a snapshot-writing explain command for the Alpha diagnostic mode. If `--snapshot skip` is unavailable or not guaranteed by Core, the MCP tool remains unavailable.

## Output Contract

The output must preserve Core-owned fields:

- Core contract identifier;
- Core schema version;
- Core provenance;
- scan evidence needed to understand the explanation;
- explainability evidence;
- accounting basis and totals;
- warning codes and warning text;
- partial evidence and partial reasons;
- omission counts, omitted bytes, limits, and truncation indicators;
- path disclosure metadata and sensitivity semantics.

Proposed wrapper shape:

```json
{
  "ok": true,
  "tool": "explain_storage",
  "core": {
    "contract": "explainability-v1",
    "schema_version": 1,
    "provenance": {},
    "scan": {},
    "explainability": {}
  },
  "integration": {
    "projection": "bounded",
    "transport": "mcp-stdio"
  }
}
```

The exact final shape must be based on the released Core schema. Integration wrapper fields must be additive and clearly separate from Core fields.

## Integration Must Not Calculate

Integration must not calculate or infer:

- risk;
- deletion recommendation;
- safety-to-remove status;
- cleanup action;
- recoverability;
- policy result;
- rule match rationale;
- storage accounting totals;
- missing or omitted evidence groups;
- warnings, partial status, or omission semantics.

If a user asks whether something can be deleted, the tool response may only report Core evidence and say that deletion is outside the Alpha tool's authority unless a future Core/Desktop-authorized mutation workflow exists.

## Error Contract

Expected error categories:

- `core-unavailable`;
- `contract-unavailable`;
- `schema-unsupported`;
- `provenance-missing`;
- `snapshot-skip-unavailable`;
- `core-error`;
- `malformed-core-json`;
- `output-limit-exceeded`;
- `invalid-input`.

Errors must include bounded evidence and the missing capability when safe. They must not include file contents, prompt contents, credentials, cookies, tokens, or unbounded Core stdout/stderr.

## Registration Gate

The Node MCP server must not list `explain_storage` until:

- Core contract availability is verified at startup or preflight;
- schema version support is implemented and tested;
- no-snapshot diagnostic behavior is verified;
- output projection preserves Core evidence, provenance, warnings, and omissions;
- tests cover invalid inputs and unavailable/incompatible Core;
- owner approval is recorded for the final MCP schema.
