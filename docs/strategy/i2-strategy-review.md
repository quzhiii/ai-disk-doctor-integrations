# I2 Strategy Review

Status: Decision record

Current runtime truth: see the repository README and current validation docs, especially `docs/validation/post-p1-second-client-validation.md` and `docs/validation/agent-tool-role-clarification.md`.

This is a historical strategic decision record. It explains why the next validation direction moved toward Agent-native diagnosis and proposal-first safety; it is not the current implementation roadmap.

## Decision

AI Disk Doctor should pursue Agent-native Diagnostic Capability as the next validation direction while preserving Desktop as a later human-facing adapter over the same Core execution truth.

The preferred product sequence is:

```text
validated diagnosis -> evidence interpretation -> read-only proposal preview -> explicit human action
```

The strategy does not authorize cleanup, delete, restore, quarantine execution, shell fallback, Desktop implementation, billing, telemetry, or a new MCP tool. It records the decision to validate whether real Agents and users can consume bounded Core evidence before expanding the product surface.

## Current Context

The current Integration master now includes the accepted Agent tool role clarification and second-client validation records. Those files supersede older raw validation snapshots for operational truth:

- Claude Code is the first Alpha golden client.
- OpenCode is a tested client/configuration limitation for the first Alpha path.
- Core P1 resolved the complete-explain timeout blocker for the intended no-category path.
- The MCP runtime and read-only safety boundary remain valid.

## Rationale

AI Disk Doctor is most differentiated when it explains AI/developer workspace state, not when it competes with generic disk cleanup tools on deletion volume.

The product problem is semantic and lifecycle-oriented:

- model runtimes, AI IDEs, Agents, caches, sessions, and project artifacts create storage that is difficult to attribute;
- users need evidence, category, handling mode, warning, and uncertainty context before they trust any recommendation;
- recovery and rebuild cost matter separately from raw byte size;
- mutation must remain behind explicit Core-owned policy and human approval.

Desktop remains strategically important, but building a richer Desktop before Agent evidence consumption is reliable would add another validation surface without resolving the observed Agent-facing ergonomics problem.

## Ownership Boundary

| Layer | Ownership |
| --- | --- |
| Core | scanner, rules, policy, risk, planning, mutation policy, quarantine, restore, history, explainability, action semantics |
| Integration | MCP, Skill, Agent adapters, bounded projection, capability compatibility, Agent validation |
| Desktop | future human-facing UX and local adapter over Core truth |

Integration must not implement a second scanner, cleaner, risk engine, policy system, model inventory engine, or explainability engine.

## Diagnosis, Proposal, Action

Proposal and action must remain separate contracts and stages.

| Stage | Responsibility | Strategic Requirement |
| --- | --- | --- |
| Diagnosis | Observe metadata and return bounded Core evidence | Read-only, evidence-grounded, fail closed |
| Explanation | Explain what was observed, why, with warnings and uncertainty | Preserve Core categories, handling, and evidence status |
| Proposal | Present a human-previewable candidate with rationale and bounds | Read-only; no hidden authorization or shell command |
| Action | Execute an approved plan through Core policy and recovery controls | Deferred until proposal comprehension and explicit approval are validated |

Future proposal outputs should preserve this invariant until a separate authorization flow exists:

```text
proposal.safety.mutation_authorized = false
```

## Agent-Facing API Ergonomics

The historical I1/I2 evidence showed that optional-argument behavior can become a product risk. A client may select the right tool but still invent a category selector, receive an empty scoped response, and treat it as a full overview.

For the current I1 line, keep the existing `aidisk_workspace_explain(category?)` contract and rely on the accepted tool-role clarification. A future Agent-first surface may split complete overview and focused category operations only if measured client behavior justifies the extra contract surface.

## Deferred Work

- Do not add mutation tools through Integration.
- Do not add a second scanner or fallback filesystem analyzer.
- Do not treat OpenCode-specific limitation as a reason to weaken the Core/Integration boundary.
- Validate user value and comprehension before building cleanup or commercial surfaces.
- Keep Desktop aligned with Core as execution source of truth.
