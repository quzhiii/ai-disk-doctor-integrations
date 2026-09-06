# Proposed Explainability MCP Boundary

Status: Proposed design only. `explain_storage` is not registered, implemented, documented as available, or permitted in the current Node MCP runtime.

Date: 2026-08-21

## Purpose

If Core releases a stable explainability CLI, the Node MCP may consume that Core-owned contract as a bounded diagnostic projection. This design prevents the Integration from becoming a second scanner, explainability engine, risk model, action engine, or recovery model.

The prerequisite Core command is proposed in Draft PR #3:

```text
aidisk explain --json [--category <category>] [--snapshot <save|skip>]
```

This document does not require that command name, schema, or tool to ship. A future implementation starts only after Core publishes a capability/version contract and the owner accepts the relevant upstream release.

## Proposed Tool

```text
Name: explain_storage
Status: PROPOSED
```

The tool would answer a narrow question: what Core evidence explains the currently reported storage classifications and accounting? It would not answer whether a user should remove anything.

## Proposed Input

The model-facing input remains minimal:

```json
{
  "category": "optional Core category selector"
}
```

`category` is optional and may only be passed when the user asks for a focused Core category. Its validation must use the Core CLI contract's bounded category rules. The user's natural-language question stays in the Agent conversation; it is not forwarded to Core as an unbounded prompt or query.

The proposed tool must not accept:

- arbitrary filesystem paths, roots, volume selectors, or report paths;
- rules, policy, rules-repository, asset-provider, or executable paths;
- arbitrary Core flags, shell commands, environment values, or stdin;
- cleanup, deletion, quarantine, restore, confirmation, or mutation controls;
- caller-selected snapshot persistence. The Integration diagnostic mode is fixed to `skip` only after Core guarantees that behavior.

## Core Capability Preflight

Before registering or invoking the tool, a future Integration release must verify Core capability metadata for:

- capability: `explainability-cli`;
- contract: `explainability-v1`;
- supported schema version;
- diagnostic snapshot skip support;
- explicit strict no-snapshot/no-persistent-write guarantee.

If Core does not provide every required capability, the tool is unavailable. It must not call `scan_summary`, consume the Rust application API, synthesize explainability from findings, or silently use a snapshot-writing command as a fallback.

After preflight, the only allowed Core argv shapes are the exact canonical explain command with `--json`, fixed `--snapshot skip`, and optionally the validated category pair. Invocation remains local, uses direct process spawning without a shell, and retains existing timeout and bounded-capture protections.

## Proposed Output Boundary

The response should preserve the Core-owned explainability envelope and label all Integration behavior separately:

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
  "projection": {
    "bounded": true,
    "source": "ai-disk-doctor-core-cli"
  }
}
```

The final schema must retain, without semantic reinterpretation:

- Core contract and schema version;
- Core provenance, including actual executed command, Core version/revision status, snapshot persistence, snapshot result, side effects, and bounded semantics;
- Core scan evidence needed to interpret the explanation;
- accounting basis, totals, deduplication, partial-byte treatment, categories, rule rationale, evidence groups, and omission counts;
- Core warnings, partial status, partial reasons, raw-path disclosure metadata, and any explicit truncation/omission indicators.

The Integration may add wrapper metadata that identifies transport-level bounds. It may not hand-write Core provenance, reconstruct omitted groups, or report a capture-truncated subprocess result as complete. A Core output overflow at the Integration capture limit is an explicit error, not a truncated successful explanation.

## Bounded Projection Rules

Core owns semantic output bounds. In particular, the proposed `explainability-v1` contract owns per-rule path-group limits and its total/included/omitted counts and bytes. The Integration must preserve those fields.

The Integration may apply an additional fixed MCP response bound only if it can preserve authoritative totals and explicit omission metadata for every affected collection. Until that projection is specified and tested against a released Core contract, failure is safer than an Integration-generated partial explanation.

The MCP text summary remains concise and points to the structured result. It must state incomplete, partial, or truncated status without guessing omitted evidence.

## Ownership Boundary

Core alone calculates and defines:

- rule matches and scanner traversal;
- storage accounting and deduplication;
- risk, action, handling, and recoverability;
- rule rationale, warnings, partial findings, and evidence status;
- path sensitivity/disclosure semantics;
- policy and asset provenance.

Integration alone owns:

- local MCP stdio transport;
- narrow input validation and fixed argv selection;
- capability compatibility checks;
- subprocess timeout and denial-of-service capture guards;
- preserving Core output in a documented bounded MCP response.

Integration must not calculate, replace, rank, normalize, or authorize risk, action, handling, recoverability, or cleanup conclusions. A warning or `review` action remains evidence for the user, never authority for an Agent to mutate files.

## Failure And Privacy Behavior

The future tool returns a structured unavailable or incompatible result when required Core capability, schema, no-snapshot guarantee, or provenance is absent. It returns a bounded diagnostic error for Core failure, malformed JSON, timeout, or output overflow.

Explainability may contain Core-provided raw local paths and metadata. The Integration must keep the existing local-only privacy boundary, disclose that MCP results may enter the configured host model context, and never read file contents to enrich Core evidence.

## Acceptance Gate

No production change follows from this document. Before implementation, all of the following are required:

1. Core release and documentation of the explainability CLI and diagnostic no-snapshot contracts.
2. A compatibility fixture proving the released Core command, schema, provenance, warning, partial, and omission semantics.
3. Node tests for exact argv, input rejection, unavailable/incompatible Core, no fallback, bounded output, and privacy disclosure.
4. Owner approval of the final MCP schema and updated safety/documentation review.
