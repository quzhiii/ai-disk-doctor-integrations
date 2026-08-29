# Alpha User Test Plan

Status: Current Alpha user-value validation plan

This plan replaces the older OpenCode-first alpha planning draft. The current Alpha path uses Claude Code as the first golden client and treats OpenCode as a known tested client/configuration limitation for the initial path.

## Purpose

Validate whether AI-heavy users find AI Disk Doctor's evidence-based explanation of local AI workspace storage useful.

This Alpha is not intended to re-validate that MCP can connect, Core can return evidence, or the prior timeout blocker is resolved. Those are already covered by current validation records.

The Alpha tests user value and comprehension:

- do users recognize the AI/developer storage problem;
- can they understand category, evidence, handling, risk, and uncertainty;
- do they trust the diagnosis enough to inspect further or return later;
- do they show demand for a future Desktop or safe action workflow.

## Current Baseline

Current operational truth:

- Core P1 performance blocker is resolved for the intended complete explain path.
- MCP runtime works through the Integration server.
- The read-only safety boundary works.
- Claude Code is the first Alpha golden client.
- OpenCode is a tested client/configuration limitation and is not recommended as the first Alpha path.

Do not use older validation reports to override this baseline.

## Target Users

Initial sample: 5-10 users.

Prioritize:

- Claude Code users;
- AI coding and Agent-heavy users;
- Cursor or local-model users who can also use Claude Code for the test;
- developers and technical power users who understand local tooling but are not necessarily storage experts.

Do not optimize this Alpha for general consumer users yet.

## Product Surface

Allowed surface:

- Diagnosis;
- Explanation;
- discussion of possible future Proposal concepts.

Not allowed:

- cleanup execution;
- delete execution;
- restore execution;
- quarantine execution;
- generic cleaner fallback;
- shell or filesystem scanning as a substitute when AI Disk Doctor evidence is unavailable.

Proposal cards or language may be shown for comprehension, but no action execution is included in this Alpha.

## Safe Alpha Boundary

The test profile should keep the Agent host constrained so AI Disk Doctor failure does not become an improvised filesystem operation.

Core principle:

```text
diagnostic unavailable -> report unavailable
```

Not:

```text
diagnostic unavailable -> improvise filesystem action
```

Recommended constraints:

- limit the Agent to the AI Disk Doctor MCP tools needed for diagnosis;
- disallow Bash mutation and avoid shell fallback for disk sizing;
- disallow Edit and Write during the test session where the host supports it;
- do not expose cleanup, delete, restore, quarantine, or arbitrary command tools;
- preserve local-first behavior and avoid collecting prompts, transcripts, source code, credentials, model contents, or document contents.

## Self-Service Onboarding Goal

Target path:

```text
Download or clone package
-> configure Claude Code MCP
-> verify connected
-> run one smoke check
-> ask: "我的电脑为什么越来越满？"
```

Target setup time: 5 minutes or less.

If testers cannot complete this without operator help, record `ONBOARDING_FRICTION`. Do not create an installer, updater, Desktop package, or new runtime path in this documentation consolidation round.

## Task A: Natural Diagnosis

Prompt:

```text
我的电脑为什么越来越满？
```

Observe:

- whether the complete workspace explain path succeeds;
- whether evidence is complete, partial, scoped empty, or unavailable;
- whether the user understands the main category contributors;
- whether the user understands evidence and uncertainty;
- whether the Agent avoids unsupported shell fallback and mutation claims.

## Task B: Value Recognition

Question:

```text
在使用 AI Disk Doctor 前，你知道这些 AI 工具/缓存/模型占了这么多空间吗？
```

Record:

- yes;
- partly;
- no;
- short explanation in the user's words.

## Task C: Action Intent

Question:

```text
看到结果之后，你最想做什么？
```

Do not prompt with answer choices before the user responds.

Classify the natural response after the fact:

- ignore;
- inspect;
- cleanup;
- quarantine;
- uninstall;
- monitor;
- ask for Desktop;
- other.

No action is executed during the Alpha.

## Task D: Trust Boundary

Check whether the user understands that Diagnosis, Proposal, and Action are separate.

Use plain language:

- Diagnosis means what was observed and explained.
- Proposal means a possible future next step for review.
- Action means actually changing files.

Pass criteria:

- user can explain that no cleanup, delete, restore, or quarantine happened;
- user can state what evidence they would want before approving any future action;
- user does not confuse a diagnostic category with permission to delete.

## Metrics

### Technical Completion

- setup success;
- MCP connected;
- smoke check completed;
- workspace explain completed;
- evidence status: complete, partial, scoped empty, unavailable, or timed out;
- onboarding time;
- `ONBOARDING_FRICTION` if setup exceeds target or needs operator help.

### User Comprehension

- can identify the largest AI storage contributor;
- can explain at least one category;
- can describe at least one evidence or warning source;
- can explain uncertainty or partial evidence;
- can distinguish Diagnosis, Proposal, and Action.

### Value

Ask:

```text
这个结果对你有多大帮助？
```

Score 1-5 and capture a short reason.

### Trust

Ask:

```text
你是否信任这个诊断？
```

Score 1-5 and capture what increased or reduced trust.

### Future Intent

Record whether the user says they would:

- use again;
- install a Desktop version;
- want safe cleanup;
- pay.

Payment is only a signal in this Alpha. It is not a pricing or conversion experiment.

## Success Gate

Exploratory result: `ALPHA_SIGNAL_POSITIVE` when at least 5 users complete the test and:

- at least 4 of 5 complete diagnosis successfully;
- at least 4 of 5 correctly understand one major storage cause;
- at least 3 of 5 say they would use it again;
- at least 3 of 5 show clear interest in Desktop or safe action.

This is qualitative Alpha evidence, not statistical proof of product-market fit or willingness to pay.

## Reporting Rules

- Keep user data local unless the participant explicitly consents to sharing a redacted report.
- Do not copy raw local paths into public reports unless they are already synthetic or safely redacted.
- Do not collect credential, token, source-code, document, prompt, transcript, cookie, or model-content data.
- Separate technical setup failures from product comprehension failures.
- Treat unavailable diagnosis as an honest unavailable result, not as permission to improvise another scanner.

## Archive-Only Inputs

Older source documents used to prepare this plan remain archive-only unless an owner explicitly chooses otherwise:

- older OpenCode-first alpha draft;
- post-P1 golden path revalidation raw report;
- preliminary I2 Agent diagnostic validation results.

These records informed this plan but are not current runtime truth.
