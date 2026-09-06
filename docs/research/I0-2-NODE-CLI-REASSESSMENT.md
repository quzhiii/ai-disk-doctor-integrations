# I0.2 Node CLI Route Reassessment

Date: 2026-08-20

Public Core audited revision: `33d741130b9c2bdd386cb96a25e0f7c70dd1bce7`

## Current CLI Surface

`aidisk --help` exposes:

- `scan`
- `plan`
- `clean`
- `restore`
- `diff`
- `anomaly`
- `doctor`
- `rules`
- `models`
- `visualize`

`aidisk scan --help` exposes:

- `--format`
- `--json`
- `--markdown`
- `--category`
- `--rules-dir`
- `--rules-repo`
- `--large-files`
- `--min-size`
- `--root`
- `--policy`

It does not expose an explainability CLI contract and does not expose no-snapshot behavior.

## Missing Contracts

For Node CLI to consume M1C without semantic duplication, Core would need a contract such as:

```text
aidisk explain --json [--category <category>]
```

or:

```text
aidisk scan --json --explain [--category <category>]
```

For strict zero-write behavior, Core would also need:

```text
aidisk scan --json --no-snapshot
```

or:

```text
aidisk scan --json --snapshot=skip
```

## Non-Option

Integration must not parse raw scan reports and rules to simulate M1C. That would create a second explainability engine and duplicate Core semantics for risk, handling, recoverability, provenance, action eligibility, warnings, and accounting.

## Node Route Conclusion

Keep Node CLI as the current production MCP boundary for I0.1 capabilities. For explainability, Node is blocked until Core exposes a CLI-owned M1C contract. If Product/Core wants explainability without Rust production migration, the minimal next Core work is a CLI JSON explainability contract plus a no-snapshot option.
