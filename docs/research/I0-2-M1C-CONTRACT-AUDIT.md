# I0.2 M1C Contract Audit

Date: 2026-08-20

Integration baseline: `c8adf2f9c86b2e582146f030d611ea68c72ca27f`

Public Core audited revision: `33d741130b9c2bdd386cb96a25e0f7c70dd1bce7`

## Scope

This audit examines how the Integration lane could consume Public Core M1C `explainability-v1`. It is research-only. It does not add `explain_storage`, does not rewrite the production MCP server, and does not modify Core or Desktop.

## Application Contract

Public Core exposes the M1C contract through the Rust application boundary:

- `aidisk::application::run_explainable_scan(request: ScanRequest) -> Result<ExplainableScanResult>`
- `aidisk::application::run_explainable_scan_with_progress(request: ScanRequest, on_progress) -> Result<ExplainableScanResult>`
- `aidisk::application::ExplainableScanResult { scan: ScanResult, explainability: ExplainabilityReport }`
- `aidisk::application::ScanRequest` includes `rules_dir`, `rules_repo`, `category`, `policy`, `default_rules_dir`, `default_policy_path`, `reports_dir`, and `persist_snapshot`.
- `aidisk::application::SnapshotPersistence::{Save, Skip}` controls whether Core persists a scan snapshot.

The explainability contract is defined by Core as:

- `contract = "explainability-v1"`
- `schema_version = 1`
- scan report `summary.schema_version = 2`

## Input Requirements

Rust application callers must provide a complete `ScanRequest`.

- `rules_dir`: optional explicit rules directory. If absent, Core uses `rules_repo` or `default_rules_dir`.
- `rules_repo`: optional Core-managed rules repo reference.
- `category`: optional Core category filter.
- `policy`: optional explicit policy path. If absent, Core attempts `default_policy_path`, then falls back to Core's built-in default policy object.
- `default_rules_dir`: required caller-supplied path; Core does not expose a public helper for package default rules lookup.
- `default_policy_path`: required caller-supplied path; Core does not expose a public helper for package default policy lookup.
- `reports_dir`: optional path used only when `persist_snapshot = Save`.
- `persist_snapshot`: `Skip` gives the strict no-snapshot application path proven by Core tests and by the I0.2 spike.

## Safety Semantics

M1C explainability is a reporting layer over the Core scan result and loaded rules. Integration must not re-derive or reinterpret these fields:

- risk: Core emits `RiskCode::{Safe, Review, Dangerous, System}`.
- handling: Core emits `HandlingMode::{Quarantine, OfficialManual, ReportOnly, Unknown}` from the scan finding action.
- recoverability: Core emits `RecoverabilityEvidence` from rule metadata and rollback support.
- rule provenance: Core emits `RuleProvenance`, including rule source path, schema version, digest, detector evidence, content access, confidence, action type, adapter, dry-run support, and rollback support.
- action eligibility: Core scan/rule metadata determines action method and explainability handling mode; Integration should only project or bound fields.

The application scan does not execute cleanup, restore, quarantine, deletion, shell commands, or Desktop actions. With `SnapshotPersistence::Skip`, the application boundary returns `snapshot_path = None` and does not create the provided reports directory in the spike.

## Accounting Semantics

Core reports the accounting basis explicitly:

- byte basis: `logical-rule-match-lower-bound`
- deduplication: `per-rule-path-only`
- category sums match storage: true
- rule sums match category: true
- path-group sums match rule: true
- partial bytes are included in total size: true
- partial bytes are excluded from handling totals: true

Integration should preserve these semantics verbatim. It should not infer reclaimability from total, risk, stale status, or path-group data.

## Evidence And Warning Semantics

Core emits `EvidenceSummary`:

- `status`: `complete` when no partial bytes exist, otherwise `partial`.
- `partial_findings`: copied from scan summary.
- `warnings`: deduped Core evidence warnings with codes:
  - `partial-lower-bound`
  - `rule-warning`
  - `partial-reason`

Rule-level rationale includes Core rule `reason`, rule warnings, and deduped partial reasons. Integration should expose these as evidence, not transform them into new policy decisions.

## Path Disclosure

Core M1C path evidence currently uses:

- `raw_path`
- `display_path`
- `disclosure = raw-local-path`
- `sensitivity` from rule metadata
- optional volume reference based on longest matching mount point

This means M1C explainability can disclose local paths to the MCP host/model context if exposed. Any future MCP tool must use bounded projection and clear privacy wording. Integration must not open file contents to improve explanation quality.

## Bounded Path Groups

Core bounds path groups per rule:

- limit: 50 path groups per rule
- `total_path_groups`
- `included_path_groups`
- `omitted_path_groups`
- `omitted_bytes`

The I0.2 spike creates 55 distinct matched paths and verifies Core returns 50 included path groups, 5 omitted path groups, and omitted bytes from Core's own path-group summary. Integration should preserve omitted counts rather than expanding paths or re-scanning.

## Rule Provenance

Core rules are loaded from YAML files and enriched with:

- source path
- schema version
- SHA-256 digest
- detector evidence
- data kind
- recoverability
- sensitivity
- default liveness
- decision confidence
- action type/adapter/dry-run/rollback support
- content access

This is enough for Integration to explain why Core classified an item without reconstructing rule provenance itself.

## Recoverability Evidence

Core maps rule metadata recoverability into:

- `kind`: `redownload`, `rebuildable`, `unknown`, or `other-declared`
- `reversibility`: `supported`, `not-guaranteed`, or `unknown`
- evidence strings including declared recoverability and rollback support

Integration must not override recoverability based on path names, file extensions, or model assumptions.

## CLI Contract Audit

At audited Core revision `33d741130b9c2bdd386cb96a25e0f7c70dd1bce7`, CLI help exposes commands: `scan`, `plan`, `clean`, `restore`, `diff`, `anomaly`, `doctor`, `rules`, `models`, `visualize`, and `help`.

`aidisk scan --help` exposes `--json`, `--category`, `--rules-dir`, `--rules-repo`, `--large-files`, `--root`, and `--policy`. It does not expose:

- `aidisk explain`
- `aidisk scan --explain --json`
- `aidisk scan --no-snapshot`
- `aidisk scan --snapshot=skip`

The CLI scan path still uses `SnapshotPersistence::Save`, so Node CLI production remains non-destructive diagnostic but not zero-write.

## Asset Resolution Audit

Core CLI has private helpers:

- `default_rules_dir()` looks for adjacent/current `rules`, adjacent/current `aidisk/rules`, then falls back to `env!("CARGO_MANIFEST_DIR")/rules`.
- `default_policy_path()` similarly looks for adjacent/current `config/policy.yaml`, then falls back to the manifest directory.

These helpers are private to `cli.rs`, not exported through `aidisk::application`. `cargo package --list --allow-dirty --no-verify` confirms the Core crate package contains `rules/*.yaml` and `config/policy.yaml`, but Rust application callers still need a stable runtime path to those assets.

## Integration Conclusion

M1C direct application consumption is technically viable and tested in the I0.2 spike. Production Rust migration is still blocked by stable asset resolution unless Integration accepts a packaging strategy that does not duplicate Core rules/policy or Core exposes a public asset-resolution helper / embedded asset contract.
