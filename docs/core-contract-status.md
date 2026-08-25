# Core Contract Status

Status: Integration tracking document. This is not a Core release manifest and does not implement or approve a Core contract.

Last reviewed: 2026-08-21

## Purpose

This table distinguishes Core contracts that the current Node Integration actually consumes from contracts proposed for future work. It prevents documentation or tool design from claiming availability before a compatible Core release exists.

The current Integration baseline is Core v1.7.0 at `52f31509394d2165cba8908da00a1036ba90479d`. Public Core M1C was reviewed at `33d741130b9c2bdd386cb96a25e0f7c70dd1bce7`; it is architecture input, not a currently consumed Node CLI contract.

| Contract | Status | Current Integration use | Evidence and boundary |
|---|---|---|---|
| Scan JSON | available | `scan_summary` invokes fixed `aidisk scan --json`, optionally with the bounded category selector. | Tested against the v1.7.0 baseline. Current scan may persist a Core-owned report snapshot, so it is non-destructive diagnostic, not strict read-only. |
| Models inventory | available | `ai_model_inventory` invokes fixed `aidisk models inventory --json`, optionally with the allowlisted tool selector. | Tested against the v1.7.0 baseline. Core metadata only; Integration does not inspect content. |
| Latest diff | available | `latest_diff` invokes fixed `aidisk diff --latest --json`. | Tested against the v1.7.0 baseline. Core owns latest-snapshot selection and history/diff semantics. |
| Explainability CLI | proposed | Not consumed. No `explain_storage` or explain tool exists. | Draft PR #3 proposes `aidisk explain --json` with `explainability-v1`, Core provenance, and bounded semantics. Public M1C is currently an application-boundary capability. |
| No-snapshot diagnostic scan | proposed | Not consumed. `scan_summary` retains current snapshot-writing behavior. | Draft PR #3 proposes `aidisk scan --json --snapshot skip` with an explicit no-persistent-write guarantee. |
| Application asset provider | proposed | Not consumed in production. Rust remains a research spike only. | Draft PR #3 proposes a Core-owned default rules/policy asset provider for distributable application consumers. |

## Status Meanings

- `available`: The current Node runtime invokes and tests the Core CLI surface against the recorded baseline.
- `proposed`: A contract request documented by this Integration repository. It is unavailable unless and until Core releases a compatible contract.
- `not consumed`: Core may have an adjacent capability, but the Integration does not call it or claim it in its runtime surface.

## Change Rules

Update this document only when evidence changes:

- a Core release adds or changes a CLI/application contract;
- Integration changes its fixed production invocations or compatibility testing;
- a proposal is accepted, rejected, or superseded by an owner/Core decision.

Do not change a proposed contract to `available` based on a branch, source inspection, or an Integration-only mock. Record the released Core version, capability/schema identifier, compatibility evidence, and any changed persistence/privacy behavior first.

Draft PR #3 is the current proposal source: https://github.com/quzhiii/ai-disk-doctor-integrations/pull/3
