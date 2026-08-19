# I0 Read-Only Scan Contract Gap

Date: 2026-08-19

I0.1 tested Public Core baseline: `52f31509394d2165cba8908da00a1036ba90479d`

Latest merged Public Core reviewed during final I0.1 review: `33d741130b9c2bdd386cb96a25e0f7c70dd1bce7` (M1C `explainability-v1`).

## Current Public CLI Behavior

```text
aidisk scan --json
  -> application::SnapshotPersistence::Save
  -> may create .aidisk/reports/scan-*.json
```

This behavior is useful for Core history, diff, anomaly, and scheduled governance. It is non-destructive with respect to user/workspace files, but it is not a zero-write read-only scan.

## Agent Integration Requirement

For strict read-only MCP semantics, the Agent integration needs:

```text
read-only scan
  -> no snapshot persistence
  -> no user/workspace mutation
  -> no Core-owned report write
```

The merged Core application boundary already supports `SnapshotPersistence::Skip`, and the Rust spike proves it avoids snapshot creation. The public CLI does not expose that choice at the I0.1 tested revision.

## Possible Core/Product Lane Solution

A future merged Core contract could expose one of:

- `aidisk scan --json --no-snapshot`
- `aidisk scan --json --snapshot=skip`
- a stable application/binary integration contract with packaged default asset resolution

The option should preserve current CLI defaults so existing history/diff behavior does not regress.

## Non-Goals For This Integration Lane

- Do not modify Core.
- Do not publish a Core contract from the integration repository.
- Do not consume M1C explainability in I0.1 merely because M1C is merged. Its current contract is on the Rust application boundary and the Core CLI has no explainability CLI contract.
- Do not claim `readOnlyHint: true` for `scan_summary` until the production runtime demonstrably avoids Core-owned writes.
