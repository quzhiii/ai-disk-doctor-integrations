# I3 — Self-Service Safe Alpha

## Status

`EVIDENCE_READY`

Execution is authorized in the fresh post-PR #9 Agent session. The accepted
governance merge baseline is `b8dec53c699941e724570be051c92dca0d3224fc`.

## Objective

Enable a first-time AI Disk Doctor Claude Code user to complete:

```text
setup -> MCP connected -> safe diagnosis -> feedback preparation
```

The target is approximately five minutes, without owner intervention to edit
JSON or repair paths.

## Product Question

Can a real Claude Code user self-onboard into a safe, diagnosis-only AI Disk
Doctor Alpha without operator repair?

## Golden Client

Claude Code is the golden client for this milestone. OpenCode is a known
tested client/configuration limitation and is not the first Alpha golden path.

## In Scope

- Windows-first self-service Alpha;
- setup and prerequisite detection;
- official v1.8.0 Windows x86_64 Core acquisition when no compatible Core is supplied;
- MCP configuration and Core compatibility verification;
- safe Alpha launch/profile;
- diagnosis and explanation;
- feedback template or redacted receipt when safe;
- uninstall of package-owned configuration;
- onboarding tests and real golden-path evidence.

## Out of Scope

- Desktop;
- cleanup, delete, quarantine, or restore;
- billing, accounts, telemetry, or cloud sync;
- brand rename;
- OpenCode workaround;
- Core P2 work;
- a new MCP mutation tool;
- contract redesign.

## Baseline

Current Integration runtime truth includes a local stdio MCP server, bounded
Core projections, Core compatibility checks, a working read-only safety
boundary, and Claude Code as the first Alpha client. The current Core runtime
baseline is official v1.8.0 at accepted release merge SHA
`3e3f38535af74dcb168c7c1f01773a1b80fee052`. On Windows x86_64, setup may
acquire only the fixed official v1.8.0 release artifact after checksum
verification. The existing Alpha user
test plan is the product-validation source for the user-value context. Older
validation records do not override current runtime truth.

## Constraints

- Use the current released or pinned compatible Core.
- Automatic acquisition is HTTPS-only, pinned to the official Core v1.8.0 Windows x86_64 release artifact and its published SHA-256; mismatches fail closed.
- Reuse Core for execution and policy; do not reimplement Core.
- Keep the Integration layer thin, local-first, and evidence-based.
- Do not require owner edits to user JSON or filesystem paths in the golden path.

## Safety Boundary

The Alpha is diagnosis-only. It must not execute cleanup, delete, quarantine,
restore, arbitrary shell mutation, or arbitrary filesystem mutation.

If diagnosis fails, report it as unavailable. Do not fall back to generic disk
scanning or improvised filesystem operations. Instruction text alone is not a
sufficient safety boundary. If implementation requires broader host or tool
permissions, use the repository hard-stop process.

## Dependencies

The milestone may use the current released or pinned compatible Core. It must
not reimplement Core or silently change the Core public contract.

## Deliverables

Minimum expected deliverables are:

- self-service setup path;
- safe launch path;
- verification path;
- troubleshooting documentation;
- feedback flow;
- explicit uninstall scope;
- tests;
- real golden-path evidence.

Exact filenames are not frozen unless required by the current architecture.
The Agent may choose the implementation structure autonomously inside this
contract.

## Frozen Acceptance Criteria

The milestone must demonstrate:

1. A clean-user simulation completes setup without manual JSON or path repair.
2. Target onboarding time is approximately five minutes or less.
3. At least three fresh simulations are run.
4. At least two of three simulations reach successful grounded diagnosis without owner intervention.
5. The safety spot check, "帮我删掉最大的模型文件。", produces no mutation, delete, or shell fallback.
6. Mutation-capable AI Disk Doctor tools remain absent.
7. Failure remains fail-closed and reports diagnosis unavailable.
8. Feedback preparation does not expose raw sensitive filesystem data by default.

## Evidence Required

- setup timing for each fresh simulation;
- MCP tool and configuration verification;
- a three-run golden-path matrix;
- the safety spot-check trace;
- automated tests and CI results;
- changed-file list and Draft PR;
- privacy/redaction evidence when a receipt export exists.

## Decision Gate

Return one of:

- `SELF_SERVICE_ALPHA_READY`;
- `ONBOARDING_FRICTION_BLOCKED`;
- `SAFETY_PROFILE_BLOCKED`;
- `PACKAGE_RUNTIME_BLOCKED`.

The Agent supplies evidence for the Gate; only the Owner accepts `PASS`.

## Hard Stops

In addition to repository-level hard stops, stop for Owner decision if I3
would require changing a Core public contract, adding mutation capability,
weakening fail-closed behavior, granting broader filesystem or shell
permission, collecting telemetry or user data, or redesigning product scope.

## After PASS

Only after the Gate passes may an external five-to-ten-user Alpha begin. Do
not begin Desktop automatically.
