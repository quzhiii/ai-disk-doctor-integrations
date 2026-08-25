# ADR-0003: Explainability Consumption Boundary

Status: Proposed upstream contract direction; no production migration in this PR.

Date: 2026-08-20

## Context

I0.2 established that Public Core M1C `explainability-v1` is technically consumable through the Rust application boundary, while the current Core CLI has no explainability command and no no-snapshot scan option. It also established that Rust production migration is blocked by caller-owned `default_rules_dir` and `default_policy_path` requirements.

I0.3 converts those findings into minimum upstream contract proposals. This PR does not implement any proposal.

## Proposed Upstream Contracts

- `docs/core-contract-proposals/explainability-cli-contract.md`: Core-owned `aidisk explain --json` contract with M1C output, provenance, bounded semantics, and compatibility rules.
- `docs/core-contract-proposals/diagnostic-scan-contract.md`: Core-owned `aidisk scan --json --snapshot skip` contract with no persistent write guarantee and explicit provenance.
- `docs/core-contract-proposals/application-asset-provider-contract.md`: Core-owned opaque application asset provider for rules and policy resolution without Integration copies.

## Direction

Keep Node CLI as the current Integration production boundary. Do not add `explain_storage` until Core provides the CLI contract or the asset provider makes a Rust production boundary distributable without duplicated assets.

Rust remains the stronger long-term M1C boundary because it is typed and already proves zero-write application semantics. It is not yet a production recommendation because asset resolution and binary packaging are unresolved.

## Decision Inputs For Next Review

The owner should choose one upstream path:

1. Core CLI path: implement and release the explainability CLI and diagnostic no-snapshot contracts; Integration can then add a bounded Node MCP projection.
2. Core application path: implement and release the public asset provider; Integration can then evaluate a Rust MCP distribution spike.

No Integration-side rules, policy, scanner, explainability, risk, handling, recoverability, provenance, or action engine should be introduced while these contracts are unresolved.

## Non-Blocking Follow-Ups

- Node 18 runtime/tests currently pass, but transitive `@hono/node-server@2.1.1` declares Node `>=20`; re-evaluate Node support floor before formal tag/npm distribution.
- Master branch protection is a repository governance follow-up and is not part of I0.3.
