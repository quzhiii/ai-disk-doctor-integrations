# ADR-0001: Thin Local MCP Adapter Over the Core CLI Contract

Status: Accepted for I0 Alpha

Date: 2026-08-19

## Context

AI Disk Doctor Core is the execution and policy source of truth. The public Core at the tested revision `52f3150` exposes a public Rust `aidisk::application` boundary, but a separate public integration repository must also be installable by users who do not have a Core source checkout or Rust toolchain. Linking the integration crate directly would couple releases and duplicate distribution assumptions.

The Core CLI already has stable JSON-oriented commands for the I0 read surface:

- `aidisk scan --json`
- `aidisk models inventory --json`
- Core-owned `.aidisk/reports/scan-*.json` snapshot metadata

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

The server reports its own version and the tested Core revision in `core_status`. It verifies the required command surface with `aidisk --help` and records whether `aidisk --version` is supported and parseable. A reported Core version other than the pinned v1.7.0 baseline is marked incompatible rather than silently accepted. `AIDISK_EXE` allows explicit binary selection; otherwise `aidisk` is resolved through the host process `PATH`.

## Alternatives Rejected

### Rust MCP binary linked to the Core crate

Rejected for I0 distribution: it would require a synchronized workspace or vendored Core source and a second cross-platform binary release pipeline. Reconsider when the Core publishes a stable consumable library/package contract.

### Duplicated JavaScript scanner or model inventory

Rejected. It would create a second execution truth, risk model, and privacy boundary.

### Remote/cloud MCP service

Rejected. I0 is local-first, has no account, telemetry, cloud dependency, or data upload.

## Safety Consequences

The server has no arbitrary shell, delete, clean, quarantine, restore, or mutation tool. Tool annotations explicitly distinguish user/workspace read behavior from Core-owned snapshot persistence:

- `core_status`, `ai_model_inventory`, `scan_history`: `readOnlyHint: true`
- `scan_summary`: `readOnlyHint: false`, `destructiveHint: false`, because current Core scan saves a snapshot

I0 does not expose `explain_storage` until the merged M1C Explainability Contract is available in the public Core.

## Compatibility Contract

The integration pins and tests against Core v1.7.0 at commit `52f3150`. A later Core can be used if its command surface and JSON shape remain compatible; `core_status` only asserts the required command names in I0 and does not falsely claim semantic compatibility for untested changes.

## Future Mutation Design Only

Mutation remains outside this ADR’s implementation scope. A future design must be:

```text
Agent -> propose action -> Core plan -> Desktop human review
      -> explicit one-time authorization -> quarantine execution
      -> journal + restore
```

No permanent unrestricted cleanup authority is granted to an Agent.
