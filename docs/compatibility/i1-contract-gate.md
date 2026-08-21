# I1 Contract Gate

Status: Compatibility gate draft. It defines conditions for enabling future `explain_storage`; it does not enable the tool or consume unavailable Core contracts.

Date: 2026-08-21

## Purpose

`explain_storage` may be enabled only when Integration can prove that the installed Core exposes the required explainability and diagnostic contracts. The gate prevents the Node MCP runtime from silently falling back to incomplete evidence or Integration-generated semantics.

## Required Core Capabilities

Before enabling `explain_storage`, Core must provide:

- explainability CLI contract available through a stable command surface;
- supported contract identifier, expected to be `explainability-v1` unless superseded by an accepted Core release;
- supported schema version;
- diagnostic no-snapshot mode for the explain command;
- explicit snapshot persistence result and no persistent-write guarantee;
- required provenance fields;
- required evidence, warning, partial, and omission fields;
- bounded output semantics documented by Core.

## Gate Checks

The Integration preflight must verify:

| Check | Requirement | Failure behavior |
|---|---|---|
| Command availability | Core exposes the released explainability CLI. | Tool unavailable. |
| Contract identifier | Core output reports the expected contract. | Tool unavailable or incompatible. |
| Schema version | Core output schema version is supported by Integration. | Tool unavailable or incompatible. |
| Provenance | Core reports command/provenance, Core version/revision status, snapshot mode/result, and side effects. | Tool unavailable or incompatible. |
| No-snapshot mode | Core supports and guarantees diagnostic `snapshot=skip`. | Tool unavailable. |
| Bounded output | Core reports omission/truncation metadata needed to preserve authoritative totals. | Tool unavailable or output error. |
| Input constraints | Category selector semantics are documented and bounded. | Reject input or keep tool unavailable. |
| Runtime bounds | Representative Core output fits Integration capture/projection strategy or fails with structured overflow. | Tool unavailable until projection is designed. |

The gate may run at server startup, tool-listing time, or first invocation. Whichever timing is chosen, the MCP server must not advertise a usable `explain_storage` tool when the gate has failed.

## Supported States

Recommended states for future status reporting:

- `available`: every gate passed for the running Core.
- `unavailable`: Core is missing or the command/capability is absent.
- `incompatible`: Core exposes a related command but contract, schema, provenance, or no-snapshot semantics do not match.
- `disabled`: owner/user configuration has disabled the proposed tool even though Core appears compatible.

The current repository state is `unavailable` because the current Node-consumable Core explainability CLI and no-snapshot diagnostic contracts have not been released.

## Prohibited Fallbacks

If any gate fails, Integration must not:

- register `explain_storage` as partially available;
- call `scan_summary` and present it as explainability;
- calculate explainability from findings;
- call Rust application APIs from the Node production boundary;
- run shell commands or local filesystem scans;
- accept arbitrary paths, rules, policy, executable, or reports directory inputs;
- downgrade to a snapshot-writing Core explain command for Alpha diagnostics.

## Evidence Required To Open The Gate

Opening the gate in a future PR requires:

- released Core version or pinned revision with the accepted contract;
- Core documentation or help/capability output showing the contract;
- fixtures covering empty, category-filtered, partial, warning, omitted, and error responses;
- local and CI tests for exact argv, schema validation, provenance preservation, bounded projection, and gate failures;
- privacy review confirming Integration does not read file contents;
- owner approval of the final MCP tool name, input schema, output schema, and status behavior.

Until that evidence exists, I1 preparation stops at documentation and PR review.
