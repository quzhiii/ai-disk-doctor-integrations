# Milestone Agent Collaboration Protocol v1

This protocol defines the repository-level collaboration model for AI Disk
Doctor Integrations:

```text
Repo Contract -> Milestone Contract -> Autonomous Execution
-> PR / CI / Evidence -> Owner Acceptance
```

`AGENTS.md` is the short, persistent Repo Contract. A milestone contract
freezes the current work. Execution evidence is produced by the Agent, PR,
tests, CI, artifacts, and runtime validation.

## Roles

### Owner / Product and Architecture

The Owner:

- defines and freezes the milestone;
- authorizes product, policy, research, safety, and contract changes;
- reviews evidence and accepts or rejects the Gate;
- decides whether and when to start the next milestone.

The Owner does not need to approve ordinary implementation details already
covered by the frozen contract.

### Agent

The Agent:

- audits repository reality and verifies the baseline;
- reads the governance and milestone contracts;
- plans and executes the frozen scope;
- debugs and runs relevant tests;
- fixes blocking issues;
- prepares a coherent Draft PR;
- collects reproducible evidence and stops at the acceptance Gate.

The Agent must preserve current Integration/Core boundaries and must not
silently broaden permissions, mutation, data collection, or product scope.

## Truth and Authority

Keep two questions separate:

- **Runtime / Product Truth:** What are the product and runtime currently?
- **Execution Authority:** What may the Agent do in this milestone?

Determine Runtime / Product Truth in this order:

1. Current repository code and public contracts
2. Current accepted runtime and product documentation
3. Current accepted validation evidence
4. Historical decisions and validation records
5. Chat assumptions

Determine Execution Authority in this order:

1. Frozen current milestone contract
2. Repo-level governance in `AGENTS.md` and this protocol
3. Accepted product and runtime documentation as supporting context
4. Chat assumptions

Code and public contracts decide current reality. The frozen milestone decides
current execution scope. A milestone must never override runtime facts or
public contracts, while current product documentation must not silently expand
a frozen milestone's scope.

## Milestone Lifecycle

The standard lifecycle is:

```text
PROPOSED -> FROZEN -> IN_PROGRESS -> EVIDENCE_READY -> PASS
                                      \
                                       -> BLOCKED
```

Only the Owner may move a milestone from `PROPOSED` to `FROZEN`. An Agent may
audit or implement a milestone only after the contract is explicitly frozen.
`EVIDENCE_READY` means the Agent has supplied the required evidence; it is not
acceptance. `PASS` is an Owner decision. `BLOCKED` means progress cannot
continue without a decision, dependency, or fix outside the Agent's authority.
These six values are the only formal milestone lifecycle states:
`PROPOSED`, `FROZEN`, `IN_PROGRESS`, `EVIDENCE_READY`, `PASS`, and `BLOCKED`.

## Frozen Contract

Every frozen milestone contract must state:

- Objective;
- User / Product Question;
- In Scope;
- Out of Scope;
- Baseline;
- Constraints;
- Safety Boundary;
- Deliverables;
- Frozen Acceptance Criteria;
- Evidence Required;
- Hard Stops;
- Decision Gate;
- Next Step boundary.

The frozen contract is the acceptance boundary. The Agent may choose the
implementation structure when it stays inside that boundary, but may not
silently relax criteria or convert an excluded capability into included work.

## Finding Classification

### BLOCKING

A finding is `BLOCKING` when it can cause acceptance, safety, correctness,
test, CI, or frozen-contract failure. The Agent must fix it in the current
milestone when authorized and technically possible. If it requires an Owner
decision, the milestone is `BLOCKED` until that decision is made.

### NON_BLOCKING

A finding is `NON_BLOCKING` when it is a future improvement, optimization,
optional UX refinement, unrelated defect, or refactor that does not prevent
the frozen Gate. Record it in the PR or follow-up backlog and do not expand
the current milestone to address it.

### HARD_STOP

`HARD_STOP` is an authority boundary, not a severity ranking. It applies when
the requested work would change frozen product scope, external-policy
assumptions, experiment authorization, public or persistent contracts,
safety/privacy/compliance boundaries, or published repository history. Stop,
present the evidence and decision needed, and wait for the Owner.

## Evidence Hierarchy

Prefer evidence in this order:

1. Actual runtime evidence from the intended path
2. GitHub PR and actual diff
3. Automated tests
4. CI results
5. Artifacts and screenshots where relevant
6. Agent summary and interpretation

The summary should link or identify the stronger evidence. A statement that
something works is not a substitute for the test, CI result, artifact, or
runtime trace that demonstrates it.

Evidence must be local-first and redacted where appropriate. Do not publish
raw user paths, prompts, transcripts, source, documents, credentials, tokens,
cookies, model contents, or other sensitive filesystem data merely to make a
report persuasive.

## Scope Discipline

Start with an audit of current code, contracts, docs, tests, workflows, and
repository status. If an unrelated issue is discovered, classify it. Fix it
only when it is blocking the frozen milestone and the fix remains in scope.
Otherwise record it under `Non-blocking Findings` and leave it unchanged.

Do not infer permission from historical plans, archived validation, or chat
assumptions. Current repository truth and accepted current documentation take
precedence.

## PR Discipline

Prefer one coherent PR per milestone. The PR should identify the objective,
baseline, changed files, decisions, safety impact, exact verification, CI,
known limitations, deferred work, and acceptance state. Keep the PR focused;
do not add a new product idea, next milestone, or unrelated cleanup.

The Agent may create or update a Draft PR and repair blocking CI or test
failures. The Agent must not merge the PR or claim Owner acceptance.

## Acceptance

The Owner evaluates the frozen Acceptance Criteria against the evidence. The
Agent may not lower a threshold, reinterpret an exclusion, or declare `PASS`
because implementation is inconvenient. If the standard is inadequate or
conflicts with a product or safety decision, use `HARD_STOP` and request the
Owner's decision.

An accepted Gate is the only authorization to begin the next milestone. The
Agent stops after returning the required evidence and one proposed next step.
