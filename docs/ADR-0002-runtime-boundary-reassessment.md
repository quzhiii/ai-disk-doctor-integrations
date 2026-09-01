# ADR-0002: Runtime Boundary Reassessment (Historical)

Status: Proposed

Date: 2026-08-19

## Context

This is a historical I0/I0.1 runtime-boundary assessment. I0 shipped a
Node.js stdio MCP server over fixed AI Disk Doctor Core CLI JSON contracts.
The current I3 runtime consumes the official v1.8.0 explainability CLI release
contract documented in the milestone evidence.

The I0.1 spike and production compatibility baseline remain pinned to merged public Core revision `52f31509394d2165cba8908da00a1036ba90479d`. The latest merged Public Core reviewed during final I0.1 review is `33d741130b9c2bdd386cb96a25e0f7c70dd1bce7`, which merged M1C `explainability-v1`. That newer Core state is not consumed by I0.1.

## Option A: Node stdio MCP over fixed Core CLI JSON

Evidence in production code:

- Uses fixed allowlisted argv only.
- No shell interpolation or arbitrary command tool.
- Model-facing inputs narrowed to `scan_summary.category?` and `ai_model_inventory.tool?`.
- `latest_diff` uses `aidisk diff --latest --json`; no Integration-side latest-pair calculation remains.
- Output is bounded and projected, not a full Core report echo.
- Works without Rust for integration users if a Core binary already exists.
- Core runtime rules/config assets are resolved by the packaged Core CLI.

Costs and gaps:

- Current Core CLI `aidisk scan --json` persists `.aidisk/reports/scan-*.json`; production scan is non-destructive but not zero-write.
- Runtime cannot verify the exact Core git revision because Core `--version` is unsupported at the tested revision.
- CLI output JSON can be large, so process and MCP output bounds are required.
- CLI contracts are less typed than `aidisk::application` and require subprocess failure mapping.

## Option B: Rust stdio MCP over `aidisk::application`

Spike location: `spikes/rust-direct-core/`.

Windows evidence from local run:

```text
cargo run --manifest-path spikes/rust-direct-core/Cargo.toml
```

Result:

```json
{
  "ok": true,
  "core_revision": "52f31509394d2165cba8908da00a1036ba90479d",
  "scan_matched_paths": 1,
  "snapshot_path": null,
  "reports_dir_exists_after_skip": false,
  "inventory_schema_version": 1,
  "inventory_assets": 0,
  "history_snapshots": 0
}
```

The spike demonstrates:

- Compiles against exact public Core git revision.
- Invokes `application::run_scan`.
- Uses `SnapshotPersistence::Skip`.
- Confirms no reports directory is created by the scan.
- Invokes `application::inventory_assets`.
- Invokes `application::read_history`.

Core asset packaging evidence:

- `cargo package --list --allow-dirty --no-verify` in Core includes `rules/` and `config/policy.yaml`.
- The direct application boundary still requires caller-provided `default_rules_dir` and `default_policy_path` values.
- A production Rust MCP would need an explicit asset-resolution and packaging design, or a new Core helper contract for packaged default rules/policy lookup.

Distribution evidence:

- Prebuilt Rust MCP binaries would remove the need for end users to install Rust.
- They would add a new multi-platform release artifact pipeline for the integration repository.
- The binary would be tightly coupled to a pinned Core git revision until Core publishes a stable package/application contract.

CI evidence in this branch:

- `rust-spike` CI job runs the spike on Windows, macOS, and Ubuntu.
- Historical `pinned-core-smoke` built Core at the I0.1 tested revision and ran the real `AIDISK_EXE` Node smoke on Ubuntu.
- This proves compile/run behavior for the proof-of-concept and pinned CLI boundary, not marketplace packaging readiness.

## M1C Explainability Architecture Input

Public Core M1C `explainability-v1` is merged at `33d741130b9c2bdd386cb96a25e0f7c70dd1bce7`.

At that merged Core state, explainability is exposed through the Rust application boundary:

- `run_explainable_scan`
- `run_explainable_scan_with_progress`

The historical I0.1 Core CLI did **not** expose an explainability CLI contract.
I0.1 therefore did not add `explain_storage` or any other explainability MCP
tool and remained tested against `52f31509394d2165cba8908da00a1036ba90479d`.
The merged application-boundary capability was architecture input for the next
milestone; the later I3 runtime now consumes the official v1.8.0 CLI contract.

## Comparison

| Dimension | Node CLI boundary | Rust application boundary |
|---|---|---|
| Scanner/risk duplication | None | None |
| Zero-write scan | No, current CLI persists snapshot | Yes, `SnapshotPersistence::Skip` proven |
| Core asset packaging | Delegated to installed Core CLI package | Requires explicit integration binary asset strategy or Core helper |
| End-user Rust requirement | No | No if prebuilt binaries are shipped |
| Release complexity | npm package plus existing Core binary | New cross-platform binary release pipeline |
| Runtime dependency | Node + Core binary | Single Rust MCP binary if assets bundled/resolved |
| Compatibility coupling | CLI JSON shape + command surface | Exact Core crate/API revision |
| Output control | Projection layer required | Projection layer still required |
| Strict architectural purity | Medium | Higher |

## Recommendation

Keep Node CLI as the I0.1 production runtime after hardening, because it is already usable with the existing Core release package and avoids adding a new binary distribution lane in this milestone.

Record Rust direct-Core as the likely long-term path if Product/Core Lane wants strict zero-write Agent scans before a Core CLI no-persist contract exists. A production migration should wait for one of:

- a merged Core CLI `scan --no-snapshot` or equivalent read-only contract, or
- a stable Core application package plus asset-resolution helper suitable for integration binaries.

The merged M1C explainability application boundary should be evaluated in that future boundary decision, but it is not consumed in PR #1.

## Unresolved Contract Gap

See `docs/core-contract-gaps/I0-readonly-scan.md`.
