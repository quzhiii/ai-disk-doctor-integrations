# Core CLI Explainability Contract Proposal

Status: Proposed upstream contract; not implemented in Core or Integration.

Date: 2026-08-20

## Objective

Provide a stable Core-owned CLI contract that allows the existing Node MCP boundary to consume M1C `explainability-v1` without implementing a second explainability engine.

The preferred command shape is:

```text
aidisk explain --json [--category <category>] [--snapshot <save|skip>]
```

`aidisk scan --explain --json` may be accepted as an alias only if it produces the identical contract and provenance semantics. The Integration lane should target one canonical command, preferably `explain`, to avoid coupling explainability to the legacy scan output mode.

## Input Semantics

Required and optional inputs for the Integration-compatible subset:

| Input | Required | Semantics |
|---|---:|---|
| `--json` | Yes | Selects the machine-readable contract. Other formats are not part of this proposal. |
| `--category <category>` | No | Uses the existing Core category filter semantics. Empty, control-character, or overlong values fail with a structured usage error. |
| `--snapshot <save\|skip>` | No | Selects Core snapshot persistence. The default must be explicit in help and output; `save` preserves normal history behavior, while `skip` is the Integration diagnostic mode. |
| `--rules-dir`, `--rules-repo`, `--policy`, `--root` | Not in the Integration subset | These may remain CLI/admin capabilities only if Core documents their side effects and the Integration allowlist never exposes them to the model. |

The command must not accept mutation controls such as `--yes`, cleanup, restore, quarantine execution, shell, or arbitrary command arguments.

## Output Contract

The canonical JSON response should be a stable envelope around Core-owned values:

```json
{
  "contract": "explainability-v1",
  "schema_version": 1,
  "provenance": {
    "source": "ai-disk-doctor-core-cli",
    "command": ["explain", "--json", "--snapshot", "skip"],
    "core_version": "1.7.0",
    "core_revision": null,
    "snapshot_persistence": "skip",
    "side_effects": [],
    "bounded_semantics": {
      "path_groups_per_rule": 50
    }
  },
  "scan": {
    "scan_time": "<Core timestamp>",
    "policy": {},
    "volumes": [],
    "findings": [],
    "summary": {}
  },
  "explainability": {
    "contract": "explainability-v1",
    "schema_version": 1,
    "accounting": {},
    "storage": {},
    "evidence": {},
    "volumes": [],
    "categories": []
  }
}
```

The `explainability` object must preserve the M1C fields and enum spellings defined by Core. The `scan` object must preserve Core scan evidence required to understand the explanation. Core may add fields only under the compatibility rules below; it must not silently change the meaning of existing fields.

The response must include `snapshot_path` or an equivalent explicit persistence result in `provenance`. For `snapshot=skip`, it must be `null` and no reports directory may be created.

## Provenance Requirements

The response provenance must report:

- canonical executed argv in order, excluding the executable path if the Integration separately reports it;
- Core semantic version;
- Core revision when the binary can prove it, otherwise `null` or an explicit `not-runtime-verifiable` status;
- `snapshot_persistence` as `save` or `skip`;
- side effects, with an empty list for strict diagnostic mode;
- the explainability contract and schema version;
- bounded semantics, including the Core path-group limit.

The Integration must copy these fields and must not replace them with a hand-written provenance model.

## Bounded Output Behavior

M1C already bounds path groups to 50 per rule and reports `total_path_groups`, `included_path_groups`, `omitted_path_groups`, `omitted_bytes`, and `limit`. Those fields are part of the contract and must be preserved.

The command must not silently drop categories, rules, findings, warnings, or accounting totals because of a transport buffer. If Core introduces an overall output limit, it must either:

1. return a structured nonzero error with the configured limit and affected scope; or
2. return explicit `truncated` and omission metadata for every affected collection and keep totals authoritative.

The Integration subprocess capture limit remains a denial-of-service guard, not a semantic truncation mechanism. A capture overflow must be reported as an error rather than projected as a complete explanation.

## Warning And Evidence Semantics

Core owns warning generation and deduplication. The CLI must preserve:

- evidence status `complete` or `partial`;
- `partial_findings`;
- warning codes `partial-lower-bound`, `rule-warning`, and `partial-reason`;
- rule rationale, warning strings, and partial reasons;
- accounting flags describing byte basis, deduplication, and partial-byte treatment.

Warnings are evidence, not authorization. An Integration client must not convert a warning, risk code, or handling mode into a cleanup decision.

## Path And Privacy Semantics

M1C currently discloses raw local paths with `disclosure = raw-local-path`. The CLI must document this explicitly and retain `raw_path`, `display_path`, sensitivity, and volume reference semantics. It must not read file contents, prompts, source, credentials, or model contents to improve the explanation.

## Compatibility Expectations

Core should expose capability metadata through `aidisk --help` or a machine-readable status command:

```json
{
  "capability": "explainability-cli",
  "contract": "explainability-v1",
  "schema_version": 1,
  "snapshot_skip": true
}
```

Compatibility rules:

- exact contract identifier and schema version are required;
- a Core version without this capability is `unavailable`, not silently downgraded;
- additive fields are allowed within schema version 1;
- existing fields, enum values, accounting semantics, and omission semantics are stable within schema version 1;
- a breaking change requires a new contract or schema version;
- runtime revision identity remains provenance unless Core can prove it.

## Acceptance Tests For Core

Core should add tests proving:

- canonical command and help output;
- empty and category-filtered inputs;
- `explainability-v1` and schema version 1 output;
- parity between `run_explainable_scan` and CLI output;
- path-group omission semantics;
- warning and partial evidence semantics;
- raw path disclosure documentation;
- unsupported capability and incompatible schema errors;
- no mutation and explicit snapshot behavior.
