# I0.2 Asset Resolution Investigation

Date: 2026-08-20

Public Core audited revision: `33d741130b9c2bdd386cb96a25e0f7c70dd1bce7`

## Problem

A Rust production MCP that calls `aidisk::application::run_explainable_scan` must provide `default_rules_dir` and `default_policy_path`. Integration must not copy Core rules, fork policy logic, hardcode developer-machine paths, or create a second rules/policy source of truth.

## Current Core Facts

- Core CLI private `default_rules_dir()` resolves adjacent/current `rules`, current `aidisk/rules`, then `env!("CARGO_MANIFEST_DIR")/rules`.
- Core CLI private `default_policy_path()` resolves adjacent/current `config/policy.yaml`, then `env!("CARGO_MANIFEST_DIR")/config/policy.yaml`.
- `aidisk::application::ScanRequest` requires caller-provided `default_rules_dir` and `default_policy_path`.
- `aidisk::application` does not export a default asset-resolution helper.
- Core crate/package includes `rules/*.yaml` and `config/policy.yaml` when inspected with `cargo package --list --allow-dirty --no-verify`.

## Options

| Option | Correctness | Packaging | Update Semantics | Cross-Platform Behavior | Duplication Risk | Release Complexity |
|---|---|---|---|---|---|---|
| Use installed Core CLI assets indirectly | High; CLI owns lookup | Existing Core install/package | Follows Core releases | Already supported by CLI | None | Low, but does not solve Rust app path needs |
| Locate Core crate/package assets at runtime | Medium; package includes assets | Requires knowing Cargo/git/package layout | Tied to crate checkout/cache, not product install | Fragile outside developer machines | Low if referenced only | High operational fragility |
| Embed Core assets into Rust MCP at build time | Medium if generated from pinned Core source | Prebuilt binary can be self-contained | Frozen until Integration release | Good after build | Medium; easy to become stale duplicated source | Medium-high |
| Ship runtime-adjacent assets beside Rust MCP | Medium-high if assets are copied from Core release artifact during packaging | Installer/archive must preserve layout | Updated with Integration binary | Good with deterministic layout | Medium unless packaging is generated from Core artifact | Medium |
| Core exposes public asset helper / provider | Highest | Integration asks Core for default paths/assets | Core owns asset source and updates | Core-owned cross-platform behavior | None | Requires Core contract change, lowest long-term Integration complexity |
| Core exposes CLI explainability contract | Highest for Node route | Existing CLI package owns assets | Follows Core releases | Existing CLI behavior | None | Requires Core contract change, avoids Rust MCP asset blocker |

## Recommendation

Do not choose Rust production migration until one of these is true:

1. Core exports public application asset resolution, for example `aidisk::application::default_assets()` or `default_rules_dir()` / `default_policy_path()`.
2. Integration has a packaging pipeline that derives adjacent `rules/` and `config/policy.yaml` from the pinned Core artifact at release time, without storing a second maintained copy in this repository.
3. Core adds a CLI explainability contract and Node remains the production boundary.

The cleanest long-term Rust path is a Core-owned public asset helper because it preserves one execution truth and one asset truth.
