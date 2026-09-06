# ADR-0003: Explainability Consumption Boundary

Status: Proposed

Date: 2026-08-20

## Context

I0.1 kept production on a hardened Node MCP over fixed Core CLI JSON. Public Core M1C `explainability-v1` is now merged at `33d741130b9c2bdd386cb96a25e0f7c70dd1bce7`, but I0.1 did not consume it.

I0.2 evaluates which stable boundary should consume M1C explainability. This PR is evidence-only: it adds no production `explain_storage` MCP tool and does not modify Core or Desktop.

## Evidence Summary

- Rust application boundary exposes `run_explainable_scan` and `run_explainable_scan_with_progress`.
- The I0.2 `explainability-m1c` spike compiles against exact Core `33d741130b9c2bdd386cb96a25e0f7c70dd1bce7` and verifies `contract = explainability-v1`, schema version 1, scan schema version 2, bounded path groups, Core accounting fields, provenance, recoverability evidence, progress callback, and no snapshot with `SnapshotPersistence::Skip`.
- Core CLI at the audited revision has no explainability command and no no-snapshot scan option.
- Core crate packaging includes `rules/` and `config/policy.yaml`, but `aidisk::application` does not expose public default asset resolution helpers.

## Decision Matrix

| Dimension | Node CLI | Rust application |
|---|---|---|
| M1C explainability | Blocked until Core adds an explainability CLI contract | Proven by I0.2 spike via `run_explainable_scan` and `run_explainable_scan_with_progress` |
| zero-write | Blocked; `aidisk scan --json` persists snapshots and no no-snapshot flag exists | Proven with `SnapshotPersistence::Skip` |
| typed contracts | CLI JSON is process-level and less typed | Stronger typed Rust structs from `aidisk::application` |
| asset resolution | Strong; installed Core CLI owns rules/config lookup | Blocked for production unless Core exposes public asset helpers or Integration designs adjacent/package assets without duplication |
| packaging | Existing Node package plus installed Core binary | New Rust MCP binary/package lane or embedded runtime strategy |
| cross-platform | Proven by I0.1 Node matrix and pinned-Core smoke | Spike runs on Windows/macOS/Ubuntu in CI; production packaging still unproven |
| end-user dependencies | Node plus installed Core binary | Potentially one prebuilt Rust MCP binary, but release pipeline is new |
| Core version coupling | CLI command surface and JSON schema coupling | Exact Core crate/API revision coupling |
| release complexity | Lower; current production route exists | Higher; binary distribution, asset packaging, and Core API pinning needed |
| semantic duplication risk | Low if Core adds CLI explainability; high if Integration simulates it | Low for explainability semantics; risk shifts to asset duplication if not solved correctly |

## Asset Resolution Options

| Option | Correctness | Packaging | Update Semantics | Cross-Platform | Duplication Risk | Release Complexity |
|---|---|---|---|---|---|---|
| Core CLI assets | High; CLI already owns lookup | Existing Core binary package | Follows Core release | Already used by Core CLI | None | Low |
| Core crate package assets | Medium; assets are packaged, but application caller has no stable runtime path | Requires locating Cargo/package/install layout | Tied to crate revision | Needs explicit design | Low if referenced, high if copied | Medium |
| Embedded assets in Integration binary | Medium only if generated from pinned Core during build | Prebuilt Rust binary embeds assets | Frozen until Integration release | Good after build | Risk of stale duplicated source if not generated from Core | Medium-high |
| Runtime adjacent assets | Medium if distributed beside binary from Core release artifact | Need installer/archive layout | Updated with binary package | Good if paths are deterministic | Low if sourced from Core artifact | Medium |
| Core public asset helper | Highest; Core remains source of truth | Caller asks Core for defaults | Follows Core package contract | Core owns behavior | None | Lowest long-term, requires Core change |

## Recommendation

Decision remains blocked for production migration.

Rust application is the better technical boundary for M1C semantics and zero-write behavior, but production migration should not proceed until asset resolution is solved without copying Core rules/policy into this repository. Until then, keep Node CLI as the production MCP boundary and pursue one of these minimal Core contracts:

1. Core CLI explainability plus no-snapshot option for Node consumption.
2. Public application asset-resolution helper for Rust consumption.

If Product/Core wants zero-write explainability sooner than a CLI contract, prioritize the public application asset helper and a Rust MCP binary packaging spike next.

## Non-Blocking Follow-Ups

- Node 18 CI runtime/tests pass, but `npm ci` warns because transitive `@hono/node-server@2.1.1` declares Node `>=20`; re-evaluate Node support floor before formal tag/npm distribution.
- Master branch protection is not configured; handle in repo governance, not this architecture PR.
