# Threat Model

Date: 2026-08-19

Scope: AI Disk Doctor Integrations I0.1 MCP server, canonical Skill, and thin adapter docs.

## Summary

The integration is local-only and non-destructive, but it runs inside host Agents that may have broader permissions. Safety depends on the MCP capability boundary, Core policy, and future Desktop authorization, not on the host Agent being well behaved.

| Threat | Boundary | Mitigation | Residual Risk |
|---|---|---|---|
| Agent shell bypass | Skill and permission guidance | Skill forbids direct deletion, no MCP shell tool exists, docs warn host shell is not the safety boundary | A host Agent with shell access can still run unrelated commands outside MCP |
| Model-supplied filesystem paths | MCP schema and runtime validation | No model-facing rules, policy, root, reports, executable, or arbitrary path inputs remain | Host config still contains local paths controlled by user/admin |
| Arbitrary policy/rules injection | MCP input narrowing | `scan_summary` exposes only `category?`; no `rules_dir`, `rules_repo`, or `policy` arguments | Core CLI itself still supports those flags outside this MCP server |
| Output/context flooding | Core capture and projection layer | Core stdout/stderr caps, error evidence caps, bounded findings/assets/diff changes, concise text content | Large but valid summaries/volumes can still consume context within configured bounds |
| Local path metadata disclosure | Output projection and privacy docs | Returns bounded Core metadata only; no file contents are read by the integration | Paths, sizes, categories, risks, and actions may enter the host model context |
| Malicious/tampered Core executable | `AIDISK_EXE`/PATH trust boundary | `core_status` reports command, version if available, command surface, and compatibility state | Current Core cannot prove git revision at runtime; users must install trusted Core binaries |
| Core version drift | Compatibility status | Distinguishes tested revision provenance from runtime identity; version mismatch is incompatible; otherwise `compatible-unverified` | Semantic drift can exist if CLI shape is compatible but behavior changes |
| Adapter drift | Compatibility matrix | Unsupported clients are status-only; no fabricated manifests for unavailable products | Vendor config formats can change after audit |
| Host Auto/YOLO modes | Permission model | Docs state host permissions are not the destructive safety boundary; MCP exposes no mutation tools | Host may independently grant shell/file tools outside MCP |
| Remote rules/network expansion | MCP input narrowing | No `rules_repo` argument is exposed; server does not fetch remote rules | Core CLI used outside MCP can still resolve remote rules when explicitly invoked |
| Future mutation escalation | Architecture docs | Mutation is design-only: Agent proposal, Core plan, Desktop human review, one-time authorization, quarantine, journal, restore | Future implementation requires separate threat model and review |

## Non-Goals

- This integration does not sandbox the host Agent.
- This integration does not verify binary signatures for Core.
- This integration does not prevent a user from invoking `aidisk` directly outside MCP.
- This integration does not implement cleanup, restore, quarantine, billing, telemetry, or cloud sync.
