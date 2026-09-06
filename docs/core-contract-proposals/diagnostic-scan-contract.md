# Core Diagnostic No-Snapshot Contract Proposal

Status: Proposed upstream contract; not implemented in Core or Integration.

Date: 2026-08-20

## Objective

Add an explicit Core scan mode for Agent diagnostics that preserves the existing scanner, rules, policy, risk, and accounting semantics while suppressing Core-owned snapshot persistence.

The preferred syntax is:

```text
aidisk scan --json --snapshot skip
```

`--diagnostic-only` may be a user-facing alias, but `--snapshot skip` is preferred because it states the specific persistence behavior and can be shared by future `explain` commands.

## Input Semantics

The command must use the same semantic inputs as normal `aidisk scan --json`:

- optional Core category filter;
- Core-selected default rules and policy;
- optional explicit rules/policy inputs for trusted CLI callers;
- identical scanner depth and policy behavior.

The Integration-compatible subset remains narrow: `category` and the fixed snapshot selector. The model must not control root, rules directory, policy path, reports directory, executable, rules repository, or arbitrary command inputs.

If a requested operation would write a Core-owned rules repository cache, generated report, or other persistent diagnostic state, `snapshot=skip` must fail closed or use a documented read-only path. It must never silently downgrade to a write-capable mode.

## Required Guarantees

With `--snapshot skip`, Core must guarantee:

1. no user/workspace file mutation;
2. no `.aidisk/reports/scan-*.json` creation or update;
3. no snapshot directory creation as a side effect;
4. no cleanup, quarantine, restore, delete, shell, or arbitrary command execution;
5. no network or cloud write behavior;
6. no rules-repository cache write, unless that cache is explicitly outside the diagnostic contract and the caller opts into it;
7. the same scanner, rules, policy, risk, handling, recoverability, accounting, and warning semantics as normal scan;
8. an explicit machine-readable persistence result.

The mode may allocate process-local temporary memory/files needed for execution, but those temporary artifacts must be cleaned before successful completion and must not become Core history or user data.

## Provenance Requirements

The JSON response must include an explicit provenance object:

```json
{
  "provenance": {
    "operation": "scan",
    "command": ["scan", "--json", "--snapshot", "skip"],
    "snapshot_persistence": "skip",
    "snapshot_path": null,
    "side_effects": [],
    "write_guarantee": "no-user-file-mutation-and-no-core-persistent-write",
    "core_version": "1.7.0",
    "core_revision": null
  }
}
```

The actual executed argv must be reported, not reconstructed by an adapter. If a required guarantee cannot be met, Core must return a structured error identifying the violated capability rather than returning a misleading successful report.

## Semantic Parity

`snapshot=skip` changes persistence only. It must not change:

- rule loading or rule source digests;
- policy snapshot;
- scanner traversal and max depth;
- risk levels;
- handling/action fields;
- recoverability evidence;
- partial findings and warnings;
- storage/accounting totals;
- explainability output when used with the proposed CLI explainability contract.

The normal `scan --json` default remains unchanged for existing history/diff workflows.

## Compatibility Expectations

Core capability status should expose:

```json
{
  "capability": "diagnostic-scan-no-snapshot",
  "contract": "diagnostic-scan-v1",
  "schema_version": 1,
  "snapshot_skip": true
}
```

Compatibility rules:

- absence of the capability is `unavailable`;
- a binary that accepts the flag but violates the write guarantee is incompatible;
- output provenance and write guarantees are stable within schema version 1;
- a later capability may add modes, but must not change the meaning of `skip`;
- Core must document platform-specific temporary behavior.

## Acceptance Tests For Core

Core should add tests proving, on Windows, macOS, and Linux:

- same report semantics for save versus skip except snapshot metadata;
- no reports directory or scan snapshot under skip;
- source/user fixture paths remain unchanged;
- no rules cache write under strict skip;
- structured provenance fields and exact mode;
- explicit failure when a required no-write guarantee cannot be provided;
- compatibility/status capability reporting.
