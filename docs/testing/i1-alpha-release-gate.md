# I1 Alpha Release Gate

Status: Historical PASS for the I1 Alpha non-destructive Agent integration boundary.

Date: 2026-08-24

## Decision

I1 Alpha was complete as a local, read-only diagnostic integration. This is a
historical gate record; current runtime truth is official Core v1.8.0 and the
current milestone is I3 Self-Service Safe Alpha.

This gate does not authorize M2, Desktop work, cleanup, restore, quarantine, delete, shell, commercial, telemetry, cloud, account, or billing features.

## Architecture

### Core Source Of Truth

AI Disk Doctor Core remains authoritative for:

- scanner traversal and findings;
- rules and policy;
- storage accounting;
- risk and handling semantics;
- evidence, warnings, partial status, and omission semantics;
- explainability categories and rule evidence;
- model inventory, history, and diff semantics.

Integration does not recreate or reinterpret those semantics. The pinned Core baseline is:

```text
repository: quzhiii/ai-disk-doctor
commit: cac502f73c39f1b5de13bab3e4de86a5c29684fc
version: v1.7.0

Historical I1 release-gate record only. Current runtime baseline is official
Core v1.8.0 at `3e3f38535af74dcb168c7c1f01773a1b80fee052`.
```

### Integration Boundary

The Node process provides local MCP stdio transport, narrow model-facing schemas, fixed Core argv construction, subprocess timeout/output bounds, capability compatibility checks, and bounded Agent-facing projections.

The only explain execution paths in the historical I1 boundary were:

```text
aidisk capabilities --json
aidisk explain --json --snapshot skip
aidisk explain --json --snapshot skip --category <validated-category>
```

No arbitrary Core command, executable, path, root, policy, rules directory, reports directory, shell text, or mutation control is forwarded from an Agent.

### MCP Semantic Tools

The registered MCP tools are:

- `aidisk_capabilities`: machine-readable Core capability discovery and explainability compatibility status;
- `aidisk_workspace_explain`: bounded Core explainability projection after the capability gate passes;
- `core_status`: Core availability and compatibility provenance;
- `scan_summary`: bounded Core scan evidence, with the truthful existing snapshot side effect;
- `ai_model_inventory`: bounded model asset metadata;
- `latest_diff`: bounded Core-owned latest diff.

The I1 Alpha semantic flow is:

```text
aidisk_capabilities
        |
        +--> compatible=true
                    |
                    +--> aidisk_workspace_explain
```

## MCP Gate

### Registered Tools And Schemas

- Tool discovery is available through MCP `initialize` and `tools/list`.
- `aidisk_capabilities` accepts no model-facing input.
- `aidisk_workspace_explain` accepts only optional `category`.
- Other tools expose only their documented bounded selectors.
- Unknown input fields are rejected by the MCP schema and handler validation.
- Output schemas compile with Ajv and validate structured success/error results.

### Permissions

- `aidisk_capabilities`: `readOnlyHint: true`, `destructiveHint: false`.
- `aidisk_workspace_explain`: `readOnlyHint: true`, `destructiveHint: false`.
- All registered tools have `destructiveHint: false`.
- `scan_summary` retains `readOnlyHint: false` because the existing Core scan may persist a Core-owned snapshot; it does not mutate user files.

## Security Gate

The audit confirms the following exclusions:

- no mutation MCP tools;
- no cleanup, delete, restore, or quarantine execution path;
- no shell or arbitrary executable tool;
- no model-facing filesystem root, arbitrary path, policy, rules, or reports input;
- no filesystem write performed by explainability execution;
- no telemetry, cloud upload, account, billing, or external service integration;
- no prompt, transcript, source, document, token, cookie, credential, or model-content reads for classification.

The subprocess boundary uses direct spawning with fixed allowlisted argv. Raw Core stdout/stderr and arbitrary nested Core metadata are not returned as successful MCP output. Explain output is bounded by known storage fields, warning/category/rule limits, and string limits.

## Compatibility Gate

### Capability Handshake

The integration first invokes:

```text
aidisk capabilities --json
```

The compatibility gate requires:

- `agent-capabilities-v1` contract;
- capabilities schema version `1`;
- Core-reported `core_version`;
- `explainability-v1` contract;
- explainability schema version `1`;
- `snapshot_modes` containing `skip`;
- bounded path-group support.

### Explain Contract Validation

The explain adapter requires:

- `agent-diagnostic-cli-v1` contract;
- CLI schema version `1`;
- `command: "explain"` and `ok: true`;
- `snapshot.requested: "skip"`;
- `snapshot.persisted: false`;
- `snapshot.path: null`;
- nested `explainability-v1` schema version `1`;
- valid storage counters, evidence status, warnings, categories, handling totals, and rule summaries.

### Fail Closed

The integration returns structured failure states and does not fall back to another scanner or locally generated semantics:

- `core_unavailable`;
- `contract_unavailable`;
- `invalid_core_response`;
- `projection_failed`.

Failed capability checks prevent explain execution. Snapshot-writing or malformed explain responses are rejected.

## Evidence

### Integration Evidence

The audit started from the clean I1.3 implementation commit:

```text
repository: quzhiii/ai-disk-doctor-integrations
branch: research/i1-alpha-preparation
audit baseline: aeb8d710843a22074a6384bc6428c475495d6d14
integration implementation final SHA: c1c1fad24b07a9cf8bfbaaa3473ef54d37de99a5
release gate documentation: this finalization commit, with the current PR head recorded in PR #5
```

### Tests

The final verification set is:

```text
npm run check
npm test
npm audit --audit-level=moderate
git diff --check
```

I1.4 adds an MCP SDK Agent compatibility test covering initialize, tool discovery, readable schemas, capability-first flow, explain invocation, and forbidden input rejection. Vendor-specific validation is recorded separately in `docs/compatibility/i1-agent-validation.md`.

The local fake-Core tests cover exact argv, malformed/unavailable/incompatible Core, snapshot skip enforcement, bounded projection, and raw-output exclusion. The pinned-Core CI smoke validates the real Core contract and no-snapshot explain behavior.

### CI Evidence

The historical CI workflow covered:

- Node 18 on Windows, macOS, and Ubuntu;
- Node 20 on Ubuntu;
- Rust spike format/run checks on Windows, macOS, and Ubuntu;
- pinned Core build and real `AIDISK_EXE` smoke.

The latest completed CI run before this release-gate commit was run `32708849684`, with all jobs successful. The commit containing this gate will trigger the final PR validation run.

## Agent Compatibility

The validation matrix covers OpenCode, Qwen Code, WorkBuddy, CodeBuddy, and TRAE. Where a vendor client was unavailable or its local configuration contract was not verifiable, the audit reports shared MCP protocol validation only and does not fabricate a vendor manifest.

See [`i1-agent-validation.md`](../compatibility/i1-agent-validation.md) for versions, setup assumptions, results, and limitations.

## Final Gate Result

```text
architecture: PASS
mcp discovery and schemas: PASS
permissions: PASS
security boundary: PASS
capability handshake: PASS
schema validation: PASS
fail-closed behavior: PASS
agent compatibility validation: PASS with documented vendor-client limitations
mutation/action scope: PASS, no mutation capability added
```

I1 Alpha stops here. No M2 or commercial feature work is included.
