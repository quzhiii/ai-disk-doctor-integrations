# Qoder Adapter

Locally verified vendor client. Qoder (CN build, Windows x64) registered the
unmodified local stdio MCP server and discovered the canonical Skill. No MCP
server, schema, tool description, Skill text, timeout, Core contract, or safety
boundary was changed for this validation.

Date verified: 2026-09-26.

## Registration

Qoder reads user MCP servers from a top-level `mcpServers` map in a JSON
settings file. Three scopes exist; the server entry shape is the same in all
three:

| Scope | File | Shared |
|---|---|---|
| user | `~/.qoder-cn/settings.json` | this machine, all projects |
| project | `<repo>/.qoder/settings.json` | committed with the repository |
| local | `<repo>/.qoder/settings.local.json` | gitignored, this project only |

`adapters/qoder/settings.example.json` is the entry shape. Merge it into the
`mcpServers` map rather than replacing the file, since these settings files
also hold unrelated client preferences. Only the user scope was exercised
locally; the project and local files are the client's other documented scopes
and were not verified here, including the approval prompt expected on a
first-time project-scope load.

Requirements that matter in practice:

- `args` must use an absolute path to `src/server.js`, and `npm install` must
  have run in the checkout.
- `cwd` should be the user workspace, not the integration checkout, so that any
  Core-owned snapshot from `scan_summary` stays workspace-local.
- `AIDISK_EXE` must resolve to a compatible Core. If it does not, the server
  still starts and reports `core_status.available=false`, which is the
  expected fail-closed behavior.
- `~/.qoder-cn/mcp.json` and a repository `.mcp.json` are not documented Qoder
  MCP targets, and the CN build's user entry is the `settings.json` above. A
  local `mcp.json` holding an empty `mcpServers` map was present during the
  audit and was not the active entry.

The server name is surfaced with non-alphanumeric characters normalized, so a
registration named `ai-disk-doctor` appears to the model as
`mcp__ai_disk_doctor__<tool>`. This is display/namespacing only and needs no
configuration.

## Skill installation

Copy or symlink `skills/ai-disk-doctor` (with its `references/` folder) into
the Qoder user skills directory, which for the CN build is
`~/.qoder-cn/skills/ai-disk-doctor/`. Qoder indexes the Skill from its
`SKILL.md` frontmatter (`name`, `description`) and the four `references/*.md`
links resolve relative to the installed folder.

## Not available on this client

The I3 self-service scripts (`setup`, `verify`, `launch`, `feedback`,
`safety-check`, `uninstall`) drive Claude Code's configuration surface and CLI.
They do not register, verify, or launch Qoder, and the `safe-alpha-v1` launch
profile that denies host Bash, Edit, Write, NotebookEdit, Agent, WebFetch, and
WebSearch has no recorded Qoder equivalent. Qoder adoption is therefore the
manual path described above and must not be described as an I3 self-service
flow. Automatic official-Core acquisition is likewise Claude-path-only: supply
`AIDISK_EXE` or keep `aidisk` on `PATH`.

## Tool surface seen by the client

Two distinct validations, kept separate deliberately:

**Vendor-client registration.** Qoder loaded the `mcpServers` entry, connected
to the server, and surfaced all six tools to the model, named
`mcp__ai_disk_doctor__*`. Model-initiated calls through that connection:

| Call | Result |
|---|---|
| `core_status({})` | `ok=true`, `server.mode=non-destructive-diagnostic`, `core.available=true`, `compatibility_status=compatible-unverified` |
| `aidisk_workspace_explain({})` | `status=complete`, bounded storage/evidence/handling projection, `evidence_status.truncated=true` with Core rule warnings preserved |

**Full tool matrix.** A throwaway stdio probe (not committed) drove
initialize, `tools/list`, and all six `tools/call` requests against the same
server entry values, with `cwd` set to the user workspace:

| Tool | Input | Result |
|---|---|---|
| `aidisk_capabilities` | `{}` | `ok=true`, `core_version=1.8.0`, `explainability-v1` schema `[1]` supported |
| `aidisk_workspace_explain` | `{}` | `status=complete`, `observed_bytes=33839237783` |
| `core_status` | `{}` | `ok=true`, command surface `scan`/`models`/`diff` available |
| `scan_summary` | `{}` | `ok=false` — `AI Disk Doctor Core output exceeded the capture limit` |
| `ai_model_inventory` | `{}` | `ok=true`, Core `models inventory --json` provenance echoed |
| `latest_diff` | `{}` | `ok=false` — Core returned an error (fewer than two snapshots in this workspace) |

Neither failure is Qoder-specific. `scan_summary` hitting the capture limit is
the same condition already recorded for Claude Code Run 3 in
[`docs/validation/post-p1-second-client-validation.md`](../../docs/validation/post-p1-second-client-validation.md),
so it reproduces across clients and against a different Core binary; it is
reported here as evidence of a pre-existing server/Core condition, not as an
adapter gap, and nothing was widened to make it pass. `latest_diff` reflects
snapshot count in the configured workspace and is expected to fail closed on a
fresh one.

**Fail-closed check.** Repeating the probe with `AIDISK_EXE` pointed at a
nonexistent path returned `core_status.available=false`,
`compatibility_status=unavailable`, and `aidisk_workspace_explain`
`status=core_unavailable`, with no fallback scan attempted. This confirms the
setting is the live Core selector and that the boundary holds under a
misconfigured client registration.

Not claimed: a natural-language golden-path scoring run of the kind recorded
for Claude Code and OpenCode, any I3 self-service step, and any Qoder project-
or local-scope registration (only user scope was exercised).

## Core binary placement note

`AIDISK_EXE` should not point into a `target/` build directory. A local
release build of Core at the tested baseline was copied to
`%LOCALAPPDATA%\ai-disk-doctor-cli\bin\aidisk.exe`, SHA-256
`0f7af19a7233ea92d478955ff88f891092117c1f100531235c95b4e7185b6ab0`, with a
`provenance.json` beside it, so a `cargo clean` in the Core checkout cannot
break the client registration. This is a local operator choice, not a package
mechanism: `scripts/i3.mjs` does not know about that directory and its
`uninstall` will not remove it.

