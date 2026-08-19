# Safety Model

AI Disk Doctor follows a read-first, consent-gated, reversible governance model. I0.1 intentionally stops before planning or executing mutation.

## Behavior Classes

| Class | Meaning in I0 |
|---|---|
| User/workspace read | Core scan and inventory may inspect paths for existence, metadata, and sizes according to Core rules and defaults. |
| Core-owned side effect | Current Core CLI scan saves `.aidisk/reports/scan-*.json`. This is not user-file cleanup, but it is a write. |
| Destructive behavior | Delete, quarantine execution, restore execution, arbitrary shell, and arbitrary filesystem mutation. None are exposed by I0. |

## Evidence Discipline

Use the fields produced by Core reports. Do not open prompts, transcripts, source code, documents, tokens, cookies, credentials, or model contents merely to improve a classification. Unknown or partial evidence fails closed.

## Input Boundary

Model-facing inputs are intentionally narrow: `scan_summary.category?`, `ai_model_inventory.tool?`, and no inputs for `latest_diff`. The Skill must not ask the user for arbitrary rules, policy, reports, root, executable, shell, or cleanup paths.

## Future Mutation Design Only

The intended future pattern is:

```text
Agent -> propose action -> Core plan -> Desktop human review
      -> explicit one-time authorization -> quarantine execution
      -> journal + restore
```

No Agent should receive permanent unrestricted cleanup authority. This flow is design-only in I0.
