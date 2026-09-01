# ADR-0001: Thin Local MCP Adapter Over the Core CLI Contract

Status: Historical record for I0/I0.1 Alpha; current runtime baseline is recorded below

Date: 2026-08-19

## Context

AI Disk Doctor Core is the execution and policy source of truth. I0.1 is tested against Core revision `52f31509394d2165cba8908da00a1036ba90479d`, which exposes a public Rust `aidisk::application` boundary. A separate public integration repository must also be installable by users who do not have a Core source checkout or Rust toolchain. Linking the integration crate directly would couple releases and duplicate distribution assumptions.

The Core CLI already has stable JSON-oriented commands for the I0 read surface:

- `aidisk scan --json`
- `aidisk models inventory --json`
- `aidisk diff --latest --json` for Core-owned latest snapshot discovery and diff semantics

## Decision

Implement one small Node.js 18+ MCP stdio server that invokes only the existing Core CLI contract. Keep the Skill and vendor packages declarative and thin.

```text
Agent client
    |
    | local MCP stdio
    v
Node integration server
    |
    | fixed argv, no shell interpolation
    v
AI Disk Doctor Core CLI
    |
    v
existing rules / policy / scanner / model inventory / history
```

The server reports its own version and the tested Core release baseline in `core_status`. It verifies the required command surface with subcommand help probes and records whether `aidisk --version` is supported and parseable. The release baseline is provenance, not runtime identity, because current Core binaries do not expose a git revision. A reported Core version other than the pinned v1.8.0 baseline is marked incompatible rather than silently accepted. `AIDISK_EXE` allows explicit binary selection; otherwise `aidisk` is resolved through the host process `PATH`.

The server mode is `non-destructive-diagnostic`, not `read-only`, because `scan_summary` may persist a Core-owned snapshot even though it exposes no destructive action against user/workspace files.

I0.1 narrows the production MCP facade:

- `scan_summary` accepts only `category?` and returns a bounded projection.
- `ai_model_inventory` accepts only `tool?` and returns a bounded projection.
- `latest_diff` replaces Integration-derived `scan_history`; Core owns latest-pair discovery through `diff --latest`.
- Core stdout/stderr and MCP text payloads are bounded.

## Alternatives Rejected

### Rust MCP binary linked to the Core crate

Rejected for I0 distribution: it would require a synchronized workspace or vendored Core source and a second cross-platform binary release pipeline. Reconsider when the Core publishes a stable consumable library/package contract.

### Duplicated JavaScript scanner or model inventory

Rejected. It would create a second execution truth, risk model, and privacy boundary.

### Remote/cloud MCP service

Rejected. I0 is local-first, has no account, telemetry, cloud dependency, or data upload.

## Safety Consequences

The server has no arbitrary shell, delete, clean, quarantine, restore, or mutation tool. Tool annotations explicitly distinguish user/workspace read behavior from Core-owned snapshot persistence:

- `core_status`, `ai_model_inventory`, `latest_diff`: `readOnlyHint: true`
- `scan_summary`: `readOnlyHint: false`, `destructiveHint: false`, because current Core scan saves a snapshot

Historical note: M1C `explainability-v1` was initially merged in Public Core at
`33d741130b9c2bdd386cb96a25e0f7c70dd1bce7`, before the official v1.8.0 CLI
contract was consumed by the later I3 runtime. The I0.1 statements above are
historical and do not describe the current Alpha surface.

## Compatibility Contract

The integration pins and tests against the official Core v1.8.0 release at accepted baseline `3e3f38535af74dcb168c7c1f01773a1b80fee052`. Runtime statuses distinguish `compatible-unverified`, `incompatible`, and `unavailable`; `tested` is reserved for a future Core identity mechanism that proves the exact revision.

## Future Mutation Design Only

Mutation remains outside this ADR’s implementation scope. A future design must be:

```text
Agent -> propose action -> Core plan -> Desktop human review
      -> explicit one-time authorization -> quarantine execution
      -> journal + restore
```

No permanent unrestricted cleanup authority is granted to an Agent.
