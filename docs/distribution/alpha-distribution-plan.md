# Alpha Distribution Plan

Status: I0.4 research only. No package, executable, marketplace listing, release workflow, or installation behavior is added by this document.

Date: 2026-08-21

## Current State

The current Alpha is installable from a checkout:

- Node MCP starts with `node src/server.js` over local stdio;
- an existing AI Disk Doctor Core binary must be available as `aidisk`/`aidisk.exe` or selected by `AIDISK_EXE`;
- Core is not bundled, downloaded, or remotely invoked by this repository;
- OpenCode has a checked-in local MCP configuration example and Skill installation guidance;
- the repository package has an `npm start` script but no `bin` field or published-package distribution claim;
- Rust direct-Core work remains spike evidence and is not a distributable MCP binary.

The current Node package declares Node `>=18`. Before a formal npm Alpha, the owner must resolve the known I0.3 follow-up: transitive `@hono/node-server@2.1.1` declares Node `>=20`. The published support floor must match verified runtime/dependency behavior.

## Release Options

| Option | Alpha value | New requirements | Recommendation |
|---|---|---|---|
| Checkout installation | Already documented and testable. Lowest release complexity. | User installs Node dependencies and configures a local absolute path. | Keep as the immediate developer/early-adopter path. |
| npm package | Lets users install a versioned Node MCP adapter without cloning the repository. | Define npm ownership, `files` allowlist, executable entry point, package lifecycle, Node support floor, Core prerequisite messaging, and package smoke tests. | Preferred next packaging research path after owner approval; do not publish in I0.4. |
| `npx` executable | Convenient one-command MCP command once an npm package has a stable executable. | Same npm requirements plus a `bin` wrapper that launches only the existing stdio server, stable package name, and Windows/macOS/Linux invocation tests. | Treat as a delivery form of the npm package, not a separate runtime or a pre-I0.4 commitment. |
| Prebuilt MCP binary | Could remove a Node dependency if the production boundary became Rust. | Core asset-provider contract, cross-platform build/sign/release pipeline, artifact checksums, update/support policy, and pinned Core compatibility strategy. | Defer. It does not help the current Node Alpha and must not be introduced before the Core application asset-provider path is resolved. |
| Skill marketplace | May improve discovery in clients that publish a verified Skill format. | Client-specific marketplace contract, review process, versioning, permission/privacy review, and local MCP setup story. | Defer until a target marketplace is officially documented and locally validated. Do not invent vendor manifests. |
| OpenCode installation docs | Supports the current verified local stdio route and Skill discovery. | Keep config examples synchronized with the final checkout or npm executable form and test them with supported OpenCode versions. | Maintain as the first documented client path. An npm/npx guide may be added only after the package contract exists. |

## Recommended Alpha Sequence

1. Keep checkout installation while product and Core contracts are still changing.
2. Resolve the Node support floor and npm package ownership/release authority.
3. Prototype a minimal npm distribution that exposes the existing Node stdio server only. It must not bundle or download Core, add a shell wrapper, add a new tool, or change MCP inputs.
4. Add installation and `npx` smoke coverage on Windows, macOS, and Linux only after the npm executable is designed.
5. Re-evaluate a Rust binary only if Core releases the application asset-provider contract and the owner chooses that platform lane.

## Distribution Invariants

Any Alpha distribution form must preserve:

- local stdio MCP transport and direct fixed-argv Core execution without shell interpolation;
- the current four-tool, non-destructive diagnostic surface unless a separately approved milestone changes it;
- no arbitrary path/configuration inputs from the model;
- bounded Core/MCP output and structured errors;
- no Core bundling, implicit Core download, remote rules download, telemetry, cloud, account, billing, or licensing-key behavior;
- explicit disclosure that current `scan_summary` can create a Core-owned report snapshot;
- Core version/command-surface compatibility evidence, without falsely claiming an unverifiable runtime revision;
- dual-license and dependency-license review before publication.

## Release Readiness Checklist

Before any Alpha package or release tag, confirm:

- the owner approves a stable package name, npm organization/access, and maintainer/recovery process;
- the declared Node version is supported by direct and transitive dependencies and all CI targets;
- the executable starts the unchanged stdio server and has no non-MCP stdout protocol pollution;
- install, `core_status`, unavailable-Core, and compatible-Core smoke tests pass on Windows, macOS, and Linux;
- package contents exclude development artifacts, Core binaries, local reports, credentials, and unrelated files;
- OpenCode setup guidance is verified against the intended package form;
- Core installation, supported baseline, `AIDISK_EXE`, snapshot behavior, privacy, and non-goals are documented;
- tag, package version, release notes, commit provenance, checksums where applicable, and CI evidence agree.

No item in this checklist authorizes publication by itself. Publishing requires an explicit release decision and a separate release-focused review.
