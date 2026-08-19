# Permission Model

Date: 2026-08-19

## Layers

| Layer | Authority | I0.1 Behavior |
|---|---|---|
| Host Agent permission | Controls what the host can do, including shell/file tools outside this MCP server | Not trusted as the primary destructive safety boundary |
| MCP capability | Defines the tools this integration exposes to the model | Four non-destructive tools; no shell, delete, cleanup, quarantine, restore, rules path, policy path, root path, or reports path |
| Core capability | Owns scan, rules, policy, risk, model inventory, history, diff, anomaly, cleanup, and recovery semantics | Invoked only through fixed allowlisted read-oriented CLI argv in production Node runtime |
| Future Desktop authorization | Human-facing control plane for future mutation | Design-only; not implemented in I0.1 |

## Current MCP Tools

- `core_status`: no inputs; checks command surface and compatibility provenance.
- `scan_summary`: optional `category`; current Core CLI may persist a Core-owned snapshot, so MCP `readOnlyHint` is false.
- `ai_model_inventory`: optional `tool`; Core defaults own root/depth/stale behavior.
- `latest_diff`: no inputs; Core owns latest snapshot discovery through `diff --latest`.

## Mutation Policy

I0.1 exposes no mutation capability. Future mutation must use a separate design:

```text
Agent -> propose action -> Core plan -> Desktop human review
      -> explicit one-time authorization -> quarantine execution
      -> journal + restore
```

No Agent receives permanent unrestricted cleanup authority.

## Host Auto Mode

Even if a host runs in Auto/YOLO mode, this MCP server still has no destructive tool. However, the host may have other tools outside this server. Users should deny or constrain host shell/filesystem capabilities when they want AI Disk Doctor to be the safety boundary.
