# I0.2 Explainability Consumption Contract Gaps

Date: 2026-08-20

Public Core audited revision: `33d741130b9c2bdd386cb96a25e0f7c70dd1bce7`

## Gap 1: CLI Explainability Contract

The current Core CLI has no explainability command or scan explainability flag. A Node production boundary cannot consume M1C without adding one of these Core-owned contracts:

- `aidisk explain --json [--category <category>]`
- `aidisk scan --json --explain [--category <category>]`

Required properties:

- output includes Core `ExplainableScanResult` or a documented JSON projection with `contract = explainability-v1`
- no Integration-side risk, handling, recoverability, provenance, or action eligibility derivation
- fixed semantics for snapshot behavior
- bounded path-group semantics preserved, including omitted counts and bytes
- privacy wording for raw local path disclosure

## Gap 2: CLI No-Snapshot Scan

The current Core CLI scan still uses `SnapshotPersistence::Save`. A strict zero-write Node route needs one of:

- `aidisk scan --json --no-snapshot`
- `aidisk scan --json --snapshot=skip`
- an explainability CLI command that supports no-snapshot semantics

## Gap 3: Rust Application Asset Resolution

The Rust application boundary requires callers to provide `default_rules_dir` and `default_policy_path`. Core CLI has private resource lookup helpers, and the Core package includes `rules/` and `config/policy.yaml`, but there is no public application helper such as:

- `aidisk::application::default_rules_dir()`
- `aidisk::application::default_policy_path()`
- `aidisk::application::default_assets()`
- an embedded asset provider for rules/policy with Core-owned update semantics

## Non-Goals For This Integration PR

- Do not modify Core.
- Do not copy Core rules or policy into the Integration repository.
- Do not implement an Integration-side explainability engine.
- Do not add `explain_storage` until a production consumption boundary is selected and tested.
