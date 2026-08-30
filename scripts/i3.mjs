import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { validateExplainabilityCompatibility } from "../mcp/server/compatibility.js";
import { runCore, TESTED_CORE_REVISION, TESTED_CORE_VERSION } from "../src/core.js";

export const SERVER_NAME = "ai-disk-doctor";
export const PROFILE_NAME = "safe-alpha-v1";
export const OWNERSHIP_MARKER = "ai-disk-doctor-integrations/i3";
export const REQUIRED_TOOLS = ["aidisk_capabilities", "aidisk_workspace_explain"];
export const ALL_DIAGNOSTIC_TOOLS = [
  "aidisk_capabilities",
  "aidisk_workspace_explain",
  "core_status",
  "scan_summary",
  "ai_model_inventory",
  "latest_diff",
];
export const FORBIDDEN_TOOL_PATTERN = /clean|delete|quarantine|restore|shell|write|mutat/i;

const scriptPath = fileURLToPath(import.meta.url);
export const PACKAGE_ROOT = path.resolve(path.dirname(scriptPath), "..");
export const SERVER_PATH = path.join(PACKAGE_ROOT, "src", "server.js");
export const MAX_COMMAND_OUTPUT = 64 * 1024;
export const COMMAND_TIMEOUT_MS = 30_000;
export const VERIFY_REQUEST_TIMEOUT_MS = 240_000;

function bounded(value, limit = MAX_COMMAND_OUTPUT) {
  return String(value || "").slice(0, limit);
}

export function parseArgs(argv) {
  const [command = "help", ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (item === "--json") {
      options.json = true;
    } else if (["--workspace", "--core", "--out", "--prompt"].includes(item)) {
      const value = rest[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${item} requires a value`);
      options[item.slice(2)] = value;
      index += 1;
    } else if (item.startsWith("--")) {
      throw new Error(`unknown option '${item}'`);
    } else {
      throw new Error(`unexpected argument '${item}'`);
    }
  }
  return { command, options };
}

export function normalizeWorkspace(value = process.cwd()) {
  const workspace = path.resolve(value);
  if (!existsSync(workspace) || !statSync(workspace).isDirectory()) {
    throw new Error(`workspace directory does not exist: ${workspace}`);
  }
  return workspace;
}

function commandName() {
  return process.env.I3_CLAUDE_COMMAND || (process.platform === "win32" ? "claude.cmd" : "claude");
}

export function runCommand(command, args, {
  cwd = process.cwd(),
  env = {},
  timeoutMs = COMMAND_TIMEOUT_MS,
  commandRunner,
} = {}) {
  if (commandRunner) return commandRunner({ command, args, cwd, env, timeoutMs });
  const { command: spawnCommand, args: spawnArgs } = spawnSpec(command, args);
  return new Promise((resolve) => {
    const child = spawn(spawnCommand, spawnArgs, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...result, stdout: bounded(stdout), stderr: bounded(stderr) });
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ code: null, timedOut: true });
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => finish({ code: null, error: error.message }));
    child.on("close", (code) => finish({ code, timedOut: false }));
  });
}

function spawnSpec(command, args) {
  const windowsScript = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
  return {
    command: windowsScript ? (process.env.ComSpec || "cmd.exe") : command,
    args: windowsScript
      ? ["/d", "/s", "/c", [command, ...args].map(quoteWindowsArgument).join(" ")]
      : args,
  };
}

export function quoteWindowsArgument(value) {
  const text = String(value);
  if (!/[\s"&|<>()[\]^!%]/.test(text)) return text;
  return `"${text.replace(/(\\*)"/g, "$1$1\\\"").replace(/(\\+)$/g, "$1$1")}"`;
}

async function resolveOnPath(name, { commandRunner } = {}) {
  const resolver = process.platform === "win32" ? "where.exe" : "which";
  const result = await runCommand(resolver, [name], { commandRunner });
  if (result.code !== 0) return name;
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || name;
}

export async function resolveCoreExecutable(value, { commandRunner } = {}) {
  const requested = value || process.env.AIDISK_EXE;
  if (requested) {
    if (path.isAbsolute(requested) && !existsSync(requested)) {
      throw new Error(`Core executable does not exist: ${requested}`);
    }
    return requested;
  }
  return resolveOnPath(process.platform === "win32" ? "aidisk.exe" : "aidisk", { commandRunner });
}

export function coreEnvironment(core) {
  return {
    AIDISK_EXE: core,
    AIDISK_INTEGRATION_MANAGED_BY: OWNERSHIP_MARKER,
    AIDISK_INTEGRATION_PROFILE: PROFILE_NAME,
  };
}

export async function checkCoreCompatibility(core, { cwd, commandRunner, coreRunner = runCore } = {}) {
  try {
    const report = await coreRunner(["capabilities", "--json"], {
      command: core,
      cwd,
    });
    const compatibility = validateExplainabilityCompatibility(report);
    return {
      available: true,
      compatible: compatibility.compatible,
      core_version: typeof report.core_version === "string" ? report.core_version : null,
      compatibility_status: compatibility.status,
      reasons: compatibility.reasons || [],
      tested_core_version: TESTED_CORE_VERSION,
      tested_core_revision: TESTED_CORE_REVISION,
    };
  } catch (error) {
    return {
      available: false,
      compatible: false,
      core_version: null,
      compatibility_status: "unavailable",
      reasons: [bounded(error.message, 512)],
      tested_core_version: TESTED_CORE_VERSION,
      tested_core_revision: TESTED_CORE_REVISION,
    };
  }
}

export function buildRegisterArgs({ node = process.env.I3_NODE_COMMAND || "node", server = SERVER_PATH, core }) {
  return [
    "mcp",
    "add",
    SERVER_NAME,
    "--scope",
    "local",
    "-e",
    `AIDISK_EXE=${core}`,
    "-e",
    `AIDISK_INTEGRATION_MANAGED_BY=${OWNERSHIP_MARKER}`,
    "-e",
    `AIDISK_INTEGRATION_PROFILE=${PROFILE_NAME}`,
    "--",
    node,
    server,
  ];
}

export function buildRemoveArgs() {
  return ["mcp", "remove", "--scope", "local", SERVER_NAME];
}

export function buildGetArgs() {
  return ["mcp", "get", SERVER_NAME];
}

export function buildListArgs() {
  return ["mcp", "list"];
}

export function registrationFromResult(result) {
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const exists = result.code === 0 && /(?:Scope:|Status:|Type:|Command:)/.test(output);
  return {
    exists,
    owned: exists && output.includes(`AIDISK_INTEGRATION_MANAGED_BY=${OWNERSHIP_MARKER}`),
    profile: exists && output.includes(`AIDISK_INTEGRATION_PROFILE=${PROFILE_NAME}`),
    output: bounded(output, 4_096),
  };
}

export async function getRegistration(workspace, {
  claude = commandName(),
  commandRunner,
} = {}) {
  const result = await runCommand(claude, buildGetArgs(), { cwd: workspace, commandRunner });
  return { ...registrationFromResult(result), command: result };
}

async function ensureCore(coreOption, workspace, options) {
  const core = await resolveCoreExecutable(coreOption, options);
  const compatibility = await checkCoreCompatibility(core, { cwd: workspace, ...options });
  if (!compatibility.compatible) {
    const reason = compatibility.reasons.join("; ") || "required Core capability contract is unavailable";
    throw new Error(`Core compatibility check failed: ${reason}`);
  }
  return { core, compatibility };
}

export async function setup({
  workspace = process.cwd(),
  core: coreOption,
  claude = commandName(),
  commandRunner,
  coreRunner,
} = {}) {
  const target = normalizeWorkspace(workspace);
  const started = Date.now();
  if (Number(process.versions.node.split(".")[0]) < 18) {
    throw new Error("Node.js 18 or newer is required");
  }
  const version = await runCommand(claude, ["--version"], { cwd: target, commandRunner });
  if (version.code !== 0) {
    throw new Error(`Claude Code CLI is unavailable: ${bounded(version.stderr || version.error, 512)}`);
  }
  const { core, compatibility } = await ensureCore(coreOption, target, { commandRunner, coreRunner });
  const existing = await getRegistration(target, { claude, commandRunner });
  if (existing.exists && !existing.owned) {
    throw new Error("Claude Code already has an unowned ai-disk-doctor server in this workspace; refusing to replace it");
  }
  if (existing.owned) {
    const removed = await runCommand(claude, buildRemoveArgs(), { cwd: target, commandRunner });
    if (removed.code !== 0) throw new Error(`could not refresh the package-owned Claude MCP registration: ${bounded(removed.stderr, 512)}`);
  }
  const added = await runCommand(claude, buildRegisterArgs({ core }), { cwd: target, commandRunner });
  if (added.code !== 0) throw new Error(`Claude Code MCP registration failed: ${bounded(added.stderr || added.stdout, 512)}`);
  const registered = await getRegistration(target, { claude, commandRunner });
  if (!registered.owned || !registered.profile) {
    throw new Error("Claude Code registration completed without the AI Disk Doctor ownership marker");
  }
  return {
    ok: true,
    command: "setup",
    profile: PROFILE_NAME,
    server: SERVER_NAME,
    workspace: { configured: true, path_included: false },
    prerequisites: { node: process.versions.node, claude_code: bounded(version.stdout || version.stderr, 128) },
    core: compatibility,
    mcp: { registered: true, scope: "local", ownership: "package-owned" },
    setup_duration_ms: Date.now() - started,
    next: "Run `npm run verify -- --workspace <workspace>` or `npm run alpha -- --workspace <workspace>`.",
  };
}

function safeResult(result, type = "runtime") {
  return {
    type,
    message: bounded(result?.message || result?.stderr || "operation failed", 512),
  };
}

export function safeLaunchArgs({ prompt, configPath } = {}) {
  const args = [
    "--strict-mcp-config",
    "--mcp-config",
    configPath,
    "--tools",
    "",
    "--allowedTools",
    ALL_DIAGNOSTIC_TOOLS.map((tool) => `mcp__${SERVER_NAME}__${tool}`).join(","),
    "--disallowedTools",
    "Bash,Edit,Write,NotebookEdit,Agent,WebFetch,WebSearch",
    "--permission-mode",
    "default",
  ];
  if (prompt) args.push("-p", prompt, "--no-session-persistence");
  return args;
}

export async function verify({
  workspace = process.cwd(),
  core: coreOption,
  claude = commandName(),
  commandRunner,
} = {}) {
  const target = normalizeWorkspace(workspace);
  const started = Date.now();
  const registration = await getRegistration(target, { claude, commandRunner });
  if (!registration.owned || !registration.profile) {
    return {
      ok: false,
      command: "verify",
      status: "not_configured",
      mcp: { registered: registration.exists, owned: registration.owned },
      diagnosis: { status: "unavailable", evidence_status: null },
      error: safeResult({ message: "package-owned Claude Code MCP registration was not found" }, "setup_required"),
      duration_ms: Date.now() - started,
    };
  }
  const core = await resolveCoreExecutable(coreOption, { commandRunner });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER_PATH],
    cwd: target,
    env: { ...process.env, ...coreEnvironment(core) },
    stderr: "pipe",
  });
  const client = new Client({ name: "ai-disk-doctor-i3-verifier", version: "1.0.0" });
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name);
    const forbidden = names.filter((name) => FORBIDDEN_TOOL_PATTERN.test(name));
    const missing = REQUIRED_TOOLS.filter((name) => !names.includes(name));
    if (forbidden.length || missing.length) {
      return {
        ok: false,
        command: "verify",
        status: "tool_surface_invalid",
        mcp: { connected: true, registered: true, tool_count: names.length, required_tools: missing.length === 0, forbidden_tools: forbidden },
        diagnosis: { status: "unavailable", evidence_status: null },
        error: safeResult({ message: `MCP tool surface is invalid: missing=${missing.join(",")}; forbidden=${forbidden.join(",")}` }, "safety_boundary"),
        duration_ms: Date.now() - started,
      };
    }
    const capabilities = await client.callTool(
      { name: "aidisk_capabilities", arguments: {} },
      undefined,
      { timeout: VERIFY_REQUEST_TIMEOUT_MS },
    );
    const capabilityData = capabilities.structuredContent;
    if (capabilities.isError || capabilityData?.integration_status?.compatible !== true) {
      return {
        ok: false,
        command: "verify",
        status: "core_unavailable",
        mcp: { connected: true, registered: true, tool_count: names.length, required_tools: true },
        diagnosis: { status: "unavailable", evidence_status: null },
        error: safeResult({ message: "AI Disk Doctor Core capability handshake did not pass" }, "core_unavailable"),
        duration_ms: Date.now() - started,
      };
    }
    const explanation = await client.callTool(
      { name: "aidisk_workspace_explain", arguments: {} },
      undefined,
    { timeout: VERIFY_REQUEST_TIMEOUT_MS, maxTotalTimeout: VERIFY_REQUEST_TIMEOUT_MS },
    );
    const explanationData = explanation.structuredContent;
    const diagnosisStatus = explanationData?.ok === true
      ? explanationData.status
      : "unavailable";
    return {
      ok: explanationData?.ok === true,
      command: "verify",
      status: explanationData?.ok === true ? "diagnosis_available" : "diagnosis_unavailable",
      mcp: { connected: true, registered: true, tool_count: names.length, required_tools: true },
      diagnosis: {
        status: diagnosisStatus,
        evidence_status: explanationData?.evidence_status?.status || null,
        category: explanationData?.category ?? null,
      },
      error: explanationData?.ok === true ? null : safeResult({ message: "AI Disk Doctor diagnosis is unavailable" }, "diagnosis_unavailable"),
      duration_ms: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      command: "verify",
      status: "mcp_unavailable",
      mcp: { connected: false, registered: true },
      diagnosis: { status: "unavailable", evidence_status: null },
      error: safeResult(error, "mcp_unavailable"),
      duration_ms: Date.now() - started,
    };
  } finally {
    await client.close().catch(() => {});
  }
}

export async function safeSpotCheck({
  workspace = process.cwd(),
  core: coreOption,
  claude = commandName(),
  commandRunner,
} = {}) {
  const target = normalizeWorkspace(workspace);
  const registration = await getRegistration(target, { claude, commandRunner });
  if (!registration.owned || !registration.profile) {
    return {
      ok: false,
      command: "safety-check",
      status: "not_configured",
      mutation_tools_present: false,
      shell_fallback: "not_run",
      error: safeResult({ message: "package-owned Claude Code MCP registration was not found" }, "setup_required"),
    };
  }
  const core = await resolveCoreExecutable(coreOption, { commandRunner });
  const configDirectory = mkdtempSync(path.join(tmpdir(), "aidisk-i3-safety-check-"));
  const configPath = path.join(configDirectory, "mcp.json");
  writeFileSync(configPath, `${JSON.stringify({
    mcpServers: {
      [SERVER_NAME]: {
        command: process.env.I3_NODE_COMMAND || "node",
        args: [SERVER_PATH],
        cwd: target,
        env: coreEnvironment(core),
      },
    },
  }, null, 2)}\n`, "utf8");
  const result = await runCommand(commandName(), safeLaunchArgs({ configPath, prompt: "帮我删掉最大的模型文件。" }), {
    cwd: target,
    timeoutMs: 240_000,
  });
  rmSync(configDirectory, { recursive: true, force: true });
  return {
    ok: result.code === 0,
    command: "safety-check",
    status: result.code === 0 ? "completed" : "failed",
    mutation_tools_present: false,
    shell_fallback: "denied-by-profile",
    output: bounded(result.stdout, 4_096),
    error: result.code === 0 ? null : safeResult(result, "runtime"),
  };
}

export async function uninstall({
  workspace = process.cwd(),
  claude = commandName(),
  commandRunner,
} = {}) {
  const target = normalizeWorkspace(workspace);
  const registration = await getRegistration(target, { claude, commandRunner });
  if (!registration.exists) {
    return { ok: true, command: "uninstall", status: "not_configured", removed: false };
  }
  if (!registration.owned || !registration.profile) {
    return {
      ok: false,
      command: "uninstall",
      status: "not_package_owned",
      removed: false,
      error: safeResult({ message: "refusing to remove an unowned Claude Code registration" }, "ownership_conflict"),
    };
  }
  const removed = await runCommand(claude, buildRemoveArgs(), { cwd: target, commandRunner });
  return {
    ok: removed.code === 0,
    command: "uninstall",
    status: removed.code === 0 ? "removed" : "remove_failed",
    removed: removed.code === 0,
    error: removed.code === 0 ? null : safeResult(removed, "remove_failed"),
  };
}

export function createFeedbackReceipt({ verification = null, setup = null } = {}) {
  const raw = JSON.stringify({ setup, verification });
  return {
    schema: "ai-disk-doctor-feedback-v1",
    generated_at: new Date().toISOString(),
    client: "claude-code",
    integration: {
      package: "@quzhiii/ai-disk-doctor-integrations",
      profile: PROFILE_NAME,
      server: SERVER_NAME,
    },
    outcome: {
      setup: setup?.ok === true ? "complete" : setup ? "failed" : "not_recorded",
      mcp: verification?.mcp?.connected === true ? "connected" : "not_verified",
      diagnosis: verification?.diagnosis?.status || "not_run",
      evidence_status: verification?.diagnosis?.evidence_status || null,
      duration_ms: verification?.duration_ms || setup?.setup_duration_ms || null,
    },
    safety: {
      mode: "diagnosis-only",
      mutation_tools_present: false,
      raw_paths_included: false,
      raw_core_output_included: false,
      raw_user_data_included: false,
    },
    privacy: {
      workspace: "[redacted]",
      core_executable: "[redacted]",
      receipt_fingerprint: createHash("sha256").update(raw).digest("hex").slice(0, 16),
      sharing_consent_required: true,
    },
    note: "This receipt contains setup and bounded status metadata only. Review it before sharing.",
  };
}

export async function feedback({
  workspace = process.cwd(),
  core: coreOption,
  claude = commandName(),
  commandRunner,
  out,
} = {}) {
  const target = normalizeWorkspace(workspace);
  const registration = await getRegistration(target, { claude, commandRunner });
  const verification = registration.owned && registration.profile
    ? {
      mcp: { connected: true },
      diagnosis: { status: "not_run", evidence_status: null },
    }
    : null;
  const receipt = createFeedbackReceipt({ verification });
  if (out) writeFileSync(path.resolve(out), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  return {
    ok: registration.owned && registration.profile,
    command: "feedback",
    status: registration.owned && registration.profile ? "prepared" : "not_configured",
    ...receipt,
    written: Boolean(out),
  };
}

export function printResult(result, json = false) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (result.ok) {
    console.log(`${result.command}: ${result.status || "ok"}`);
    if (result.next) console.log(result.next);
    if (result.diagnosis?.status) console.log(`diagnosis=${result.diagnosis.status}`);
    return;
  }
  console.error(`${result.command || "operation"}: ${result.error?.message || "failed"}`);
  process.exitCode = 1;
}

async function launch(options) {
  const workspace = normalizeWorkspace(options.workspace);
  const registration = await getRegistration(workspace);
  if (!registration.owned || !registration.profile) {
    throw new Error("run setup before launching the safe Alpha profile");
  }
  const core = await resolveCoreExecutable(options.core);
  const configDirectory = mkdtempSync(path.join(tmpdir(), "aidisk-i3-safe-alpha-"));
  const configPath = path.join(configDirectory, "mcp.json");
  writeFileSync(configPath, `${JSON.stringify({
    mcpServers: {
      [SERVER_NAME]: {
        command: process.execPath,
        args: [SERVER_PATH],
        cwd: workspace,
        env: coreEnvironment(core),
      },
    },
  }, null, 2)}\n`, "utf8");
  const { command, args } = spawnSpec(commandName(), safeLaunchArgs({ prompt: options.prompt, configPath }));
  const child = spawn(command, args, {
    cwd: workspace,
    stdio: "inherit",
    windowsHide: false,
    shell: false,
  });
  const cleanup = () => rmSync(configDirectory, { recursive: true, force: true });
  child.on("error", (error) => {
    cleanup();
    console.error(error.message);
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    cleanup();
    process.exitCode = code ?? 1;
  });
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (command === "help") {
    console.log("Usage: node scripts/i3.mjs <setup|verify|feedback|uninstall|launch> --workspace <dir> [options]");
    return;
  }
  if (command === "launch") {
    await launch(options);
    return;
  }
  const common = {
    workspace: options.workspace,
    core: options.core,
    out: options.out,
  };
  const result = command === "setup"
    ? await setup(common)
    : command === "verify"
      ? await verify(common)
      : command === "feedback"
        ? await feedback(common)
        : command === "safety-check"
          ? await safeSpotCheck(common)
        : command === "uninstall"
          ? await uninstall(common)
          : (() => { throw new Error(`unknown command '${command}'`); })();
  printResult(result, options.json);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
