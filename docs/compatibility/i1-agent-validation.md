# I1.4 Agent Compatibility Validation

Status: I1.4 validation record. No MCP tools or mutation capabilities are added by this milestone.

Date: 2026-08-24

## Scope

This validation checks that an Agent-compatible MCP client can start the local server, initialize the MCP session, discover readable tool schemas, complete the capability-first flow, and remain inside the non-destructive permission boundary.

The expected explainability flow is:

```text
Agent
  |
  +--> aidisk_capabilities
  |       |
  |       +--> compatibility result
  |
  +--> aidisk_workspace_explain
          |
          +--> bounded Core explainability projection
```

The server currently exposes six hardened tools. The I1.4-specific required subset is:

- `aidisk_capabilities`;
- `aidisk_workspace_explain`.

All tools remain local stdio MCP tools. No cleanup, delete, restore, quarantine, shell, telemetry, cloud, or arbitrary filesystem tool is present.

## Validation Matrix

| Agent | Setup assumption | Validation result | Limitation |
|---|---|---|---|
| OpenCode | Project-local `opencode.json(c)` points to `node src/server.js`, with the user workspace as `cwd` | MCP protocol compatibility passed through the shared stdio initialize/tool-list/capability/explain mock; local `opencode --version` returned `1.18.19` | `opencode mcp list` reported no configured servers in this workspace, so a configured vendor-client smoke is not claimed |
| Qwen Code | Current Qwen MCP or extension configuration launches the same local stdio server; `qwen-extension.json` remains the checked-in setup reference | MCP protocol compatibility passed through the shared stdio mock; local `qwen --version` returned `0.0.1-alpha.8` | Installed Qwen build did not expose the documented MCP/extension management surface during the prior audit, so client registration smoke is not claimed |
| WorkBuddy | An official local stdio MCP configuration is available | Shared MCP mock passed for the common protocol and safety boundary | `workbuddy` is not installed and no official local manifest was verified; no fabricated configuration is included |
| CodeBuddy | An official local stdio MCP configuration is available | Shared MCP mock passed for the common protocol and safety boundary | `codebuddy` is not installed and no official local manifest was verified; no fabricated configuration is included |
| TRAE | An official local stdio MCP configuration is available | Shared MCP mock passed for the common protocol and safety boundary | `trae` is not installed and no local client configuration was verified; no fabricated manifest is included |

"Shared MCP mock" means the repository's MCP SDK client starts `src/server.js` over stdio and exercises the same protocol an Agent client consumes. It is not a claim that the vendor client was installed or registered successfully.

## Discovery Validation

The repository test performs MCP initialize and tool discovery. It verifies:

- the server connects over stdio;
- all registered tool names are returned;
- `aidisk_capabilities` has an empty input schema;
- `aidisk_workspace_explain` exposes only optional `category` input;
- explainability is marked `readOnlyHint: true` and `destructiveHint: false`;
- output schemas compile and accept the structured results.

The expected I1.4 subset is present:

```text
aidisk_capabilities
aidisk_workspace_explain
```

## Capability Flow Validation

The fake Core executable accepts only these calls:

```text
capabilities --json
explain --json --snapshot skip
```

The Agent compatibility test initializes an MCP SDK client over stdio and verifies tool discovery and schemas. It then invokes the same registered handlers with a fake-Core subprocess option, calls `aidisk_capabilities` first, requires `integration_status.compatible=true`, and calls `aidisk_workspace_explain` only after that result passes. This split keeps the production server configuration unchanged while proving the capability gate and explain operation cross-platform.

The fake-Core handler invocation is not a claim that a vendor client registered a custom fake executable. Real vendor clients receive the same MCP schemas and handler behavior through the production `AIDISK_EXE` configuration.

## Permission Boundary Validation

The Agent-facing test attempts to send these fields to `aidisk_workspace_explain`:

- `cleanup`;
- `delete`;
- `restore`;
- `root`;
- `policy`.

Each request is rejected by the MCP boundary. Existing tests also verify that mutation-like arguments and arbitrary Core argv are rejected, and that every registered tool has `destructiveHint: false`.

The validation does not invoke shell commands, inspect file contents, create snapshots through explain, upload data, or use network services.

## Skill Validation

`skills/ai-disk-doctor/SKILL.md` documents:

- capability discovery before explainability use;
- the read-only MCP boundary;
- `aidisk_workspace_explain` as the Core-owned explainability path;
- fail-closed behavior for unavailable or incompatible Core;
- no cleanup, delete, restore, quarantine, shell, or filesystem bypass;
- preservation of partial, warning, and bounded-output semantics.

## Known Limitations

- Vendor-specific client registration is fully validated only where an installed client and documented configuration surface are available.
- OpenCode and Qwen local versions/configuration surfaces are not equivalent to the CI MCP SDK smoke.
- WorkBuddy, CodeBuddy, and TRAE remain protocol-compatible by shared mock only; their exact product manifests are intentionally deferred.
- The local Core binary predates the pinned explain CLI contract. The pinned-Core CI job is the real-Core validation authority.
- This milestone does not add pagination, full path/provenance drill-down, cleanup authorization, or Desktop integration.

## Security Gate

The I1.4 validation found no:

- mutation tools;
- shell or arbitrary executable tools;
- model-facing root, policy, rules, reports, or arbitrary path inputs;
- telemetry, cloud, account, billing, or upload code.

The server remains a local, non-destructive diagnostic MCP boundary.
