# Project Identity

AI Disk Doctor Integrations is the MCP, Skill, Agent adapter, and compatibility
layer for AI Disk Doctor. It also owns bounded projections, Agent validation,
and self-service Agent distribution.

It is not a scanner, cleaner, risk engine, policy engine, recovery engine,
Desktop, or second Core implementation. The Core repository,
`quzhiii/ai-disk-doctor`, is the execution and policy source of truth.

# Repository Boundary

Integration owns:

- MCP and Skill integration;
- Agent adapters and compatibility contracts;
- bounded, evidence-preserving projections;
- Agent/client validation;
- self-service Agent distribution.

Integration does not own scanner logic, cleanup semantics, risk
classification, recoverability policy, filesystem mutation policy, or Desktop
UX. Do not duplicate Core behavior in this repository.

# Required Reading

At the start of every new Agent session, before substantive work, use the
Read tool to read these files in order:

1. `docs/governance/MILESTONE_PROTOCOL.md`
2. `docs/milestones/CURRENT.md`
3. The milestone contract named by `CURRENT.md`

Do not assume Markdown paths are automatically expanded or loaded. Actually
read each file with the Read tool. Then audit the current repository, branch,
HEAD, working tree, relevant code, docs, tests, and workflows.

# Runtime / Product Truth

Use this order to determine what the product and runtime currently are:

1. Current repository code and public contracts
2. Current accepted runtime and product documentation
3. Current accepted validation evidence
4. Historical decisions and validation records
5. Chat assumptions

Code and public contracts decide current reality. Historical or archived
material must not override it. Label historical evidence as historical and do
not present it as runtime behavior.

# Execution Authority

Use this order to determine what the Agent is authorized to do in the current
milestone:

1. Frozen current milestone contract
2. Repo-level governance in `AGENTS.md` and `docs/governance/MILESTONE_PROTOCOL.md`
3. Accepted product and runtime documentation as supporting context
4. Chat assumptions

The frozen milestone decides current execution scope. It must never override
runtime facts or public contracts, and current product documentation must not
silently expand the frozen milestone's scope.

# Agent Planning

After reading the milestone contract, verify the baseline and inspect relevant
implementation, tests, documentation, and CI. Produce an internal execution
plan and classify findings as blocking or non-blocking before editing.

If the frozen contract is sufficiently clear, decide ordinary implementation
details autonomously. Do not pause for owner input about filenames, function
boundaries, test organization, or routine refactoring.

# Agent Execution

The Agent is authorized to complete the frozen milestone, including:

- branch creation and focused implementation;
- tests, debugging, and compatible CI fixes;
- milestone-required documentation;
- evidence collection;
- a coherent Draft PR;
- remediation of blocking findings.

Preserve the Integration/Core boundary and existing safety behavior. One
milestone should produce one coherent PR where practical. Do not expand the
roadmap or add unrelated product ideas.

# Hard Stop

Stop, explain the evidence, state the decision needed, and wait for the Owner
when work requires any of the following:

1. Changing frozen product scope, user promise, target user, or milestone outcome.
2. Relying on unconfirmed law, policy, platform requirements, commercial facts, or vendor behavior that changes a product decision.
3. Changing an experiment population, research design, evidence standard, or experimental authorization boundary.
4. Changing a public schema, protocol, persistent data contract, compatibility boundary, or migration semantics.
5. Expanding filesystem permissions, mutation, deletion, shell execution, credential access, data collection, telemetry, cloud transmission, or authorization scope.
6. Force-pushing, rewriting published history, deleting unique history or unresolved data, or performing a destructive migration.

Never bypass dry-run, explicit consent, fail-closed behavior, or Core safety
boundaries. If a requested result needs a new mutation surface or a second
engine, it is a hard stop.

# Acceptance and Evidence

Owner acceptance is based on real evidence: the GitHub PR and actual diff,
tests, CI, artifacts, screenshots where relevant, runtime evidence, and the
frozen acceptance criteria. An Agent summary is not acceptance evidence by
itself.

Fix any issue that can fail milestone acceptance, safety, correctness, tests,
CI, or the frozen contract during the current milestone. Record future
improvements, optional UX, unrelated defects, and refactors as non-blocking
backlog instead of polluting the PR.

# Milestone Gate

Do not start the next milestone until the Owner accepts the current milestone
Gate as PASS. The Agent must not automatically extend the roadmap or weaken
frozen acceptance criteria. If the criteria appear wrong, use the hard-stop
process.

# Final Return

At completion, return exactly one proposed next step and report:

- branch and Draft PR;
- HEAD SHA and changed files;
- tests, CI, and relevant runtime evidence;
- blocking issues and non-blocking backlog;
- acceptance result against the frozen Gate.

Stop at the acceptance gate. Do not begin the next milestone in the same
session unless the Owner explicitly authorizes that change of scope.
