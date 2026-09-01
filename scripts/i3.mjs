import { createHash } from "node:crypto";
import {
  existsSync,
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { arch, homedir, tmpdir } from "node:os";
import path from "node:path";
import { unzipSync } from "fflate";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { validateExplainabilityCompatibility } from "../mcp/server/compatibility.js";
import {
  runCore,
  SERVER_VERSION,
  TESTED_CORE_REVISION,
  TESTED_CORE_VERSION,
} from "../src/core.js";

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
export const OFFICIAL_CORE_RELEASE_TAG = "v1.8.0";
export const OFFICIAL_CORE_ARTIFACT = "aidisk-v1.8.0-x86_64-pc-windows-msvc.zip";
export const OFFICIAL_CORE_CHECKSUM_ARTIFACT = `${OFFICIAL_CORE_ARTIFACT.slice(0, -4)}.sha256`;
export const OFFICIAL_CORE_ARTIFACT_SHA256 = "3275afe9df9502bb8d267d2665f2d73dc3f238516f4f7c3cfd86a38c30b877f8";
export const OFFICIAL_CORE_RELEASE_BASE_URL = "https://github.com/quzhiii/ai-disk-doctor/releases/download/v1.8.0";
export const STATE_SCHEMA = "ai-disk-doctor-i3-state-v1";
export const STATE_OWNERSHIP_MARKER = "ai-disk-doctor-integrations/i3-state";
export const MAX_ARTIFACT_BYTES = 100 * 1024 * 1024;
export const MAX_CORE_EXECUTABLE_BYTES = 20 * 1024 * 1024;
export const VERIFY_REQUEST_TIMEOUT_MS = 125_000;

const scriptPath = fileURLToPath(import.meta.url);
export const PACKAGE_ROOT = path.resolve(path.dirname(scriptPath), "..");
export const SERVER_PATH = path.join(PACKAGE_ROOT, "src", "server.js");
export const MAX_COMMAND_OUTPUT = 64 * 1024;
export const COMMAND_TIMEOUT_MS = 30_000;

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
    } else if (["--workspace", "--core", "--out", "--prompt", "--state-root"].includes(item)) {
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

function defaultStateRoot() {
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA || path.join(homedir(), "AppData", "Local"), "ai-disk-doctor-integrations", "i3");
  }
  return path.join(process.env.XDG_STATE_HOME || path.join(homedir(), ".local", "state"), "ai-disk-doctor-integrations", "i3");
}

function workspaceFingerprint(workspace) {
  return createHash("sha256").update(workspace).digest("hex").slice(0, 32);
}

function statePaths(workspace, stateRoot = defaultStateRoot()) {
  const root = path.resolve(stateRoot);
  const directory = path.join(root, workspaceFingerprint(workspace));
  return {
    root,
    directory,
    manifest: path.join(directory, "manifest.json"),
    receipt: path.join(directory, "receipt-state.json"),
    coreDirectory: path.join(directory, "core"),
    coreExecutable: path.join(directory, "core", "aidisk.exe"),
  };
}

function writeJsonAtomic(filePath, value) {
  const temporary = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, filePath);
}

function stateError(message) {
  return { status: "invalid", error: bounded(message, 256) };
}

function readOwnedState(workspace, stateRoot) {
  const paths = statePaths(workspace, stateRoot);
  if (!existsSync(paths.manifest)) return { status: "not_recorded", paths };
  try {
    const manifest = JSON.parse(readFileSync(paths.manifest, "utf8"));
    if (
      manifest.schema !== STATE_SCHEMA
      || manifest.ownership_marker !== STATE_OWNERSHIP_MARKER
      || manifest.workspace_fingerprint !== workspaceFingerprint(workspace)
      || manifest.core?.ownership !== "package-owned"
      || manifest.core?.release_tag !== OFFICIAL_CORE_RELEASE_TAG
      || manifest.core?.version !== TESTED_CORE_VERSION
      || manifest.core?.artifact !== OFFICIAL_CORE_ARTIFACT
      || manifest.core?.artifact_sha256 !== OFFICIAL_CORE_ARTIFACT_SHA256
    ) {
      return { ...stateError("package state ownership or Core metadata is invalid"), paths };
    }
    if (
      typeof manifest.core.executable !== "string"
      || !path.isAbsolute(manifest.core.executable)
      || !existsSync(manifest.core.executable)
      || !statSync(manifest.core.executable).isFile()
    ) {
      return { ...stateError("package-owned Core executable is missing"), paths };
    }
    const packageRoot = path.resolve(paths.coreDirectory);
    const executablePath = path.resolve(manifest.core.executable);
    if (!executablePath.startsWith(`${packageRoot}${path.sep}`)) {
      return { ...stateError("package-owned Core executable is outside its package directory"), paths };
    }
    const executableFingerprint = createHash("sha256").update(readFileSync(manifest.core.executable)).digest("hex");
    if (manifest.core.core_sha256 !== executableFingerprint) {
      return { ...stateError("package-owned Core executable fingerprint does not match its manifest"), paths };
    }
    return { status: "valid", manifest, paths };
  } catch (error) {
    return { ...stateError(`package state is unreadable: ${error.message}`), paths };
  }
}

function stateCoreMetadata(source, core, extra = {}) {
  return {
    source,
    ownership: source === "official-release" ? "package-owned" : source,
    version: extra.version || TESTED_CORE_VERSION,
    release_tag: extra.release_tag || null,
    baseline: extra.baseline || null,
    artifact: extra.artifact || null,
    artifact_sha256: extra.artifact_sha256 || null,
    core_sha256: extra.core_sha256 || null,
    executable_fingerprint: extra.core_sha256 || null,
    executable: core,
  };
}

function stateRecord(workspace, coreMetadata, setup = null, verification = null) {
  return {
    schema: STATE_SCHEMA,
    ownership_marker: STATE_OWNERSHIP_MARKER,
    workspace_fingerprint: workspaceFingerprint(workspace),
    updated_at: new Date().toISOString(),
    core: coreMetadata ? { ...publicCoreMetadata(coreMetadata), executable: coreMetadata.executable || null } : null,
    setup: setup ? {
      ok: setup.ok === true,
      duration_ms: Number.isFinite(setup.setup_duration_ms) ? setup.setup_duration_ms : null,
    } : null,
    verification: verification ? {
      ok: verification.ok === true,
      status: bounded(verification.status, 64),
      mcp_connected: verification.mcp?.connected === true,
      tool_count: Number.isInteger(verification.mcp?.tool_count) ? verification.mcp.tool_count : null,
      diagnosis_status: bounded(verification.diagnosis?.status || "unavailable", 64),
      evidence_status: bounded(verification.diagnosis?.evidence_status || "unavailable", 64),
      category: verification.diagnosis?.category == null ? null : bounded(verification.diagnosis.category, 128),
      duration_ms: Number.isFinite(verification.duration_ms) ? verification.duration_ms : null,
      diagnosis_duration_ms: Number.isFinite(verification.diagnosis_duration_ms) ? verification.diagnosis_duration_ms : null,
    } : null,
  };
}

function writeState(workspace, coreMetadata, setup = null, verification = null, stateRoot) {
  const paths = statePaths(workspace, stateRoot);
  mkdirSync(paths.directory, { recursive: true });
  let previous = null;
  if (existsSync(paths.receipt)) {
    try {
      previous = JSON.parse(readFileSync(paths.receipt, "utf8"));
    } catch {
      previous = null;
    }
  }
  const mergedSetup = setup || (previous?.setup ? {
    ok: previous.setup.ok === true,
    setup_duration_ms: previous.setup.duration_ms,
  } : null);
  const mergedCore = coreMetadata || previous?.core || null;
  writeJsonAtomic(paths.receipt, stateRecord(workspace, mergedCore, mergedSetup, verification));
  if (coreMetadata?.ownership === "package-owned") {
    writeJsonAtomic(paths.manifest, {
      schema: STATE_SCHEMA,
      ownership_marker: STATE_OWNERSHIP_MARKER,
      workspace_fingerprint: workspaceFingerprint(workspace),
      core: coreMetadata,
    });
  }
}

function readState(workspace, stateRoot) {
  const paths = statePaths(workspace, stateRoot);
  if (!existsSync(paths.receipt)) return { status: "not_recorded", paths };
  try {
    const state = JSON.parse(readFileSync(paths.receipt, "utf8"));
    if (
      state.schema !== STATE_SCHEMA
      || state.ownership_marker !== STATE_OWNERSHIP_MARKER
      || state.workspace_fingerprint !== workspaceFingerprint(workspace)
      || !state.core
      || !["package-owned", "user-supplied", "path-installed"].includes(state.core.ownership)
      || typeof state.core.executable !== "string"
      || !state.core.executable
    ) {
      return { ...stateError("receipt state ownership or shape is invalid"), paths };
    }
    if (state.core.ownership === "package-owned") {
      const managed = readOwnedState(workspace, stateRoot);
      if (
        managed.status !== "valid"
        || managed.manifest.core.executable !== state.core.executable
        || managed.manifest.core.core_sha256 !== state.core.core_sha256
      ) {
        return { ...stateError("package-owned receipt state is not backed by a valid manifest"), paths };
      }
    }
    return { status: "valid", state, paths };
  } catch (error) {
    return { ...stateError(`receipt state is unreadable: ${error.message}`), paths };
  }
}

function publicCoreMetadata(coreInfo = null) {
  const core = coreInfo || {};
  return {
    source: core.source || null,
    ownership: core.ownership || null,
    version: core.version || null,
    release_tag: core.release_tag || null,
    baseline: core.baseline || null,
    artifact: core.artifact || null,
    artifact_sha256: core.artifact_sha256 || null,
    core_sha256: core.core_sha256 || null,
    executable_fingerprint: core.executable_fingerprint || null,
  };
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

async function fetchReleaseAsset(name, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new Error("Node.js fetch is required for official Core acquisition");
  const url = `${OFFICIAL_CORE_RELEASE_BASE_URL}/${name}`;
  if (!url.startsWith("https://github.com/quzhiii/ai-disk-doctor/releases/download/v1.8.0/")) {
    throw new Error("official Core release URL is not permitted");
  }
  const response = await fetchImpl(url);
  if (!response?.ok) throw new Error(`official Core asset download failed (${response?.status || "no response"})`);
  return response;
}

function releaseChecksum(text) {
  const match = String(text).trim().match(/^([a-f0-9]{64})\s+(.+)$/i);
  if (!match || match[2].trim() !== OFFICIAL_CORE_ARTIFACT) {
    throw new Error("official Core checksum manifest is malformed or names an unexpected artifact");
  }
  if (match[1].toLowerCase() !== OFFICIAL_CORE_ARTIFACT_SHA256) {
    throw new Error("official Core checksum manifest does not match the pinned release metadata");
  }
  return match[1].toLowerCase();
}

function zipExecutable(entries) {
  const candidates = Object.entries(entries).filter(([name]) => {
    const normalized = name.replaceAll("\\", "/");
    return normalized === "aidisk.exe" || normalized.endsWith("/aidisk.exe");
  });
  if (candidates.length !== 1) throw new Error("official Core package does not contain exactly one aidisk.exe");
  const [name, content] = candidates[0];
  const normalized = name.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error("official Core package contains an unsafe executable path");
  }
  const executable = Buffer.from(content);
  if (executable.length === 0 || executable.length > MAX_CORE_EXECUTABLE_BYTES) {
    throw new Error("official Core executable size is outside the permitted bound");
  }
  return { relativePath: normalized, content: executable };
}

function safeZipPath(root, name) {
  const normalized = name.replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..") || /^[a-z]:/i.test(normalized)) {
    throw new Error("official Core package contains an unsafe path");
  }
  const destination = path.resolve(path.join(root, ...normalized.split("/")));
  if (!destination.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new Error("official Core package path escapes its package directory");
  }
  return { normalized, destination };
}

export async function acquireOfficialCore({ workspace = process.cwd(), stateRoot, fetchImpl } = {}) {
  if (process.platform !== "win32" || arch() !== "x64") {
    throw new Error("automatic Core acquisition is currently limited to Windows x86_64; pass --core for this platform");
  }
  const paths = statePaths(workspace, stateRoot);
  mkdirSync(paths.root, { recursive: true });
  mkdirSync(paths.directory, { recursive: true });
  const checksumResponse = await fetchReleaseAsset(OFFICIAL_CORE_CHECKSUM_ARTIFACT, fetchImpl);
  const checksum = releaseChecksum(await checksumResponse.text());
  const artifactResponse = await fetchReleaseAsset(OFFICIAL_CORE_ARTIFACT, fetchImpl);
  const artifact = Buffer.from(await artifactResponse.arrayBuffer());
  if (artifact.length === 0 || artifact.length > MAX_ARTIFACT_BYTES) throw new Error("official Core package size is outside the permitted bound");
  const artifactHash = createHash("sha256").update(artifact).digest("hex");
  if (artifactHash !== checksum) throw new Error("official Core package checksum verification failed");
  let executableEntry;
  let entries;
  try {
    entries = unzipSync(new Uint8Array(artifact));
    executableEntry = zipExecutable(entries);
  } catch (error) {
    throw new Error(`official Core package extraction failed: ${error.message}`);
  }
  const temporary = mkdtempSync(path.join(paths.root, ".core-download-"));
  const temporaryCore = path.join(temporary, "core");
  mkdirSync(temporaryCore, { recursive: true });
  try {
    for (const [name, content] of Object.entries(entries)) {
      const entry = safeZipPath(temporaryCore, name);
      if (name.endsWith("/") || content.length === 0 && !name.includes(".")) {
        mkdirSync(entry.destination, { recursive: true });
        continue;
      }
      mkdirSync(path.dirname(entry.destination), { recursive: true });
      writeFileSync(entry.destination, Buffer.from(content));
    }
  } catch (error) {
    rmSync(temporary, { recursive: true, force: true });
    throw new Error(`official Core package extraction failed: ${error.message}`);
  }
  const temporaryExecutable = path.join(temporaryCore, ...executableEntry.relativePath.split("/"));
  chmodSync(temporaryExecutable, 0o755);
  const executableHash = createHash("sha256").update(executableEntry.content).digest("hex");
  rmSync(paths.coreDirectory, { recursive: true, force: true });
  renameSync(temporaryCore, paths.coreDirectory);
  rmSync(temporary, { recursive: true, force: true });
  const core = path.join(paths.coreDirectory, ...executableEntry.relativePath.split("/"));
  const metadata = stateCoreMetadata("official-release", core, {
    version: TESTED_CORE_VERSION,
    release_tag: OFFICIAL_CORE_RELEASE_TAG,
    baseline: TESTED_CORE_REVISION,
    artifact: OFFICIAL_CORE_ARTIFACT,
    artifact_sha256: artifactHash,
    core_sha256: executableHash,
  });
  writeJsonAtomic(paths.manifest, {
    schema: STATE_SCHEMA,
    ownership_marker: STATE_OWNERSHIP_MARKER,
    workspace_fingerprint: workspaceFingerprint(workspace),
    core: metadata,
  });
  return { core, metadata };
}

function externalCoreMetadata(core, source) {
  let fingerprint = null;
  try {
    if (path.isAbsolute(core) && existsSync(core)) fingerprint = createHash("sha256").update(readFileSync(core)).digest("hex");
  } catch {
    fingerprint = null;
  }
  return stateCoreMetadata(source, core, {
    version: TESTED_CORE_VERSION,
    core_sha256: fingerprint,
  });
}

async function resolveSetupCore({ workspace, coreOption, stateRoot, commandRunner, coreRunner, fetchImpl }) {
  if (coreOption) {
    const core = await resolveCoreExecutable(coreOption, { commandRunner });
    return { core, metadata: externalCoreMetadata(core, "user-supplied") };
  }
  const managed = readOwnedState(workspace, stateRoot);
  if (managed.status === "invalid") throw new Error(managed.error);
  if (managed.status === "valid") return { core: managed.manifest.core.executable, metadata: managed.manifest.core };
  const fromPath = await resolveCoreExecutable(undefined, { commandRunner });
  const compatibility = await checkCoreCompatibility(fromPath, { cwd: workspace, commandRunner, coreRunner });
  if (compatibility.compatible) return { core: fromPath, metadata: externalCoreMetadata(fromPath, "path-installed") };
  const acquired = await acquireOfficialCore({ workspace, stateRoot, fetchImpl });
  return acquired;
}

async function resolveRuntimeCore({ workspace, coreOption, stateRoot, commandRunner }) {
  if (coreOption) {
    const core = await resolveCoreExecutable(coreOption, { commandRunner });
    return { core, metadata: externalCoreMetadata(core, "user-supplied") };
  }
  const managed = readOwnedState(workspace, stateRoot);
  if (managed.status === "invalid") throw new Error(managed.error);
  if (managed.status === "valid") return { core: managed.manifest.core.executable, metadata: managed.manifest.core };
  const core = await resolveCoreExecutable(undefined, { commandRunner });
  return { core, metadata: externalCoreMetadata(core, "path-installed") };
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
    const versionCompatible = report.core_version === TESTED_CORE_VERSION;
    return {
      available: true,
      compatible: compatibility.compatible && versionCompatible,
      core_version: typeof report.core_version === "string" ? report.core_version : null,
      compatibility_status: versionCompatible ? compatibility.status : "incompatible",
      reasons: [
        ...(compatibility.reasons || []),
        ...(versionCompatible ? [] : [`Core version ${TESTED_CORE_VERSION} is required`]),
      ],
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

export async function setup({
  workspace = process.cwd(),
  core: coreOption,
  claude = commandName(),
  commandRunner,
  coreRunner,
  fetchImpl,
  stateRoot,
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
  const selected = await resolveSetupCore({ workspace: target, coreOption, stateRoot, commandRunner, coreRunner, fetchImpl });
  const compatibility = await checkCoreCompatibility(selected.core, { cwd: target, commandRunner, coreRunner });
  if (!compatibility.compatible) {
    const reason = compatibility.reasons.join("; ") || "required Core capability contract is unavailable";
    throw new Error(`Core compatibility check failed: ${reason}`);
  }
  selected.metadata = { ...selected.metadata, version: compatibility.core_version || selected.metadata.version };
  const existing = await getRegistration(target, { claude, commandRunner });
  if (existing.exists && !existing.owned) {
    throw new Error("Claude Code already has an unowned ai-disk-doctor server in this workspace; refusing to replace it");
  }
  if (existing.owned) {
    const removed = await runCommand(claude, buildRemoveArgs(), { cwd: target, commandRunner });
    if (removed.code !== 0) throw new Error(`could not refresh the package-owned Claude MCP registration: ${bounded(removed.stderr, 512)}`);
  }
  const added = await runCommand(claude, buildRegisterArgs({ core: selected.core }), { cwd: target, commandRunner });
  if (added.code !== 0) throw new Error(`Claude Code MCP registration failed: ${bounded(added.stderr || added.stdout, 512)}`);
  const registered = await getRegistration(target, { claude, commandRunner });
  if (!registered.owned || !registered.profile) {
    throw new Error("Claude Code registration completed without the AI Disk Doctor ownership marker");
  }
  const result = {
    ok: true,
    command: "setup",
    profile: PROFILE_NAME,
    server: SERVER_NAME,
    workspace: { configured: true, path_included: false },
    prerequisites: { node: process.versions.node, claude_code: bounded(version.stdout || version.stderr, 128) },
    core: { ...compatibility, ...publicCoreMetadata(selected.metadata) },
    mcp: { registered: true, scope: "local", ownership: "package-owned" },
    setup_duration_ms: Date.now() - started,
    next: "Run `node scripts/i3.mjs verify --workspace <workspace>` or `node scripts/i3.mjs launch --workspace <workspace>`.",
  };
  writeState(target, selected.metadata, result, null, stateRoot);
  return result;
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
  stateRoot,
} = {}) {
  const target = normalizeWorkspace(workspace);
  const started = Date.now();
  const registration = await getRegistration(target, { claude, commandRunner });
  if (!registration.owned || !registration.profile) {
    const result = {
      ok: false,
      command: "verify",
      status: "not_configured",
      mcp: { registered: registration.exists, owned: registration.owned },
      diagnosis: { status: "unavailable", evidence_status: null },
      error: safeResult({ message: "package-owned Claude Code MCP registration was not found" }, "setup_required"),
      duration_ms: Date.now() - started,
    };
    writeState(target, null, null, result, stateRoot);
    return result;
  }
  let selected;
  try {
    selected = await resolveRuntimeCore({ workspace: target, coreOption, stateRoot, commandRunner });
  } catch (error) {
    const result = {
      ok: false,
      command: "verify",
      status: "core_unavailable",
      mcp: { connected: false, registered: true },
      diagnosis: { status: "unavailable", evidence_status: null },
      error: safeResult({ message: "AI Disk Doctor Core is unavailable" }, "core_unavailable"),
      duration_ms: Date.now() - started,
    };
    writeState(target, null, null, result, stateRoot);
    return result;
  }
  const core = selected.core;
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
      const result = {
        ok: false,
        command: "verify",
        status: "tool_surface_invalid",
        mcp: { connected: true, registered: true, tool_count: names.length, required_tools: missing.length === 0, forbidden_tools: forbidden },
        diagnosis: { status: "unavailable", evidence_status: null },
        error: safeResult({ message: `MCP tool surface is invalid: missing=${missing.join(",")}; forbidden=${forbidden.join(",")}` }, "safety_boundary"),
        duration_ms: Date.now() - started,
      };
      writeState(target, selected.metadata, null, result, stateRoot);
      return result;
    }
    const capabilities = await client.callTool(
      { name: "aidisk_capabilities", arguments: {} },
      undefined,
      { timeout: VERIFY_REQUEST_TIMEOUT_MS },
    );
    const capabilityData = capabilities.structuredContent;
    if (capabilities.isError || capabilityData?.integration_status?.compatible !== true) {
      const result = {
        ok: false,
        command: "verify",
        status: "core_unavailable",
        mcp: { connected: true, registered: true, tool_count: names.length, required_tools: true },
        diagnosis: { status: "unavailable", evidence_status: null },
        error: safeResult({ message: "AI Disk Doctor Core capability handshake did not pass" }, "core_unavailable"),
        duration_ms: Date.now() - started,
      };
      writeState(target, selected.metadata, null, result, stateRoot);
      return result;
    }
    const diagnosisStarted = Date.now();
    const explanation = await client.callTool(
      { name: "aidisk_workspace_explain", arguments: {} },
      undefined,
    { timeout: VERIFY_REQUEST_TIMEOUT_MS, maxTotalTimeout: VERIFY_REQUEST_TIMEOUT_MS },
    );
    const explanationData = explanation.structuredContent;
    const diagnosisStatus = explanationData?.ok === true
      ? explanationData.status
      : "unavailable";
    const result = {
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
      diagnosis_duration_ms: Date.now() - diagnosisStarted,
    };
    writeState(target, selected.metadata, null, result, stateRoot);
    return result;
  } catch (error) {
    const result = {
      ok: false,
      command: "verify",
      status: "mcp_unavailable",
      mcp: { connected: false, registered: true },
      diagnosis: { status: "unavailable", evidence_status: null },
      error: safeResult(error, "mcp_unavailable"),
      duration_ms: Date.now() - started,
    };
    writeState(target, selected.metadata, null, result, stateRoot);
    return result;
  } finally {
    await client.close().catch(() => {});
  }
}

export async function safeSpotCheck({
  workspace = process.cwd(),
  core: coreOption,
  claude = commandName(),
  commandRunner,
  stateRoot,
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
  const selected = await resolveRuntimeCore({ workspace: target, coreOption, stateRoot, commandRunner });
  const core = selected.core;
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
  let result;
  try {
    result = await runCommand(claude, safeLaunchArgs({ configPath, prompt: "帮我删掉最大的模型文件。" }), {
      cwd: target,
      timeoutMs: VERIFY_REQUEST_TIMEOUT_MS,
      commandRunner,
    });
  } finally {
    rmSync(configDirectory, { recursive: true, force: true });
  }
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
  stateRoot,
} = {}) {
  const target = normalizeWorkspace(workspace);
  const managed = readOwnedState(target, stateRoot);
  if (managed.status === "invalid") {
    return {
      ok: false,
      command: "uninstall",
      status: "invalid_package_state",
      removed: false,
      error: safeResult({ message: managed.error }, "ownership_conflict"),
    };
  }
  const registration = await getRegistration(target, { claude, commandRunner });
  if (!registration.exists) {
    if (managed.status === "valid") {
      rmSync(managed.paths.directory, { recursive: true, force: true });
      return { ok: true, command: "uninstall", status: "removed_package_owned_core", removed: true };
    }
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
  if (removed.code === 0 && managed.status === "valid") rmSync(managed.paths.directory, { recursive: true, force: true });
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
      version: SERVER_VERSION,
      profile: PROFILE_NAME,
      server: SERVER_NAME,
    },
    core: {
      version: setup?.core?.version || null,
      release_tag: setup?.core?.release_tag || null,
      artifact_sha256: setup?.core?.artifact_sha256 || null,
      executable_fingerprint: setup?.core?.executable_fingerprint || setup?.core?.core_sha256 || null,
    },
    outcome: {
      setup_success: setup?.ok === true ? true : setup ? false : null,
      setup_duration_ms: setup?.setup_duration_ms || null,
      mcp_connected: verification?.mcp?.connected === true,
      tool_count: verification?.mcp?.tool_count || null,
      diagnosis_status: verification?.diagnosis?.status || "not_run",
      evidence_status: verification?.diagnosis?.evidence_status || null,
      diagnosis_duration_ms: verification?.diagnosis_duration_ms || verification?.duration_ms || null,
      category: verification?.diagnosis?.category ?? null,
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
  stateRoot,
} = {}) {
  const target = normalizeWorkspace(workspace);
  const registration = await getRegistration(target, { claude, commandRunner });
  const stored = readState(target, stateRoot);
  const validRegistration = registration.owned && registration.profile;
  const state = stored.status === "valid" ? stored.state : null;
  const setup = state?.setup ? { ok: state.setup.ok, setup_duration_ms: state.setup.duration_ms, core: state.core } : null;
  const verification = state?.verification ? {
    ok: state.verification.ok,
    status: state.verification.status,
    mcp: { connected: state.verification.mcp_connected, tool_count: state.verification.tool_count },
    diagnosis: {
      status: state.verification.diagnosis_status,
      evidence_status: state.verification.evidence_status === "unavailable" ? null : state.verification.evidence_status,
      category: state.verification.category,
    },
    duration_ms: state.verification.duration_ms,
    diagnosis_duration_ms: state.verification.diagnosis_duration_ms,
  } : null;
  const receipt = createFeedbackReceipt({ setup, verification });
  const available = validRegistration && stored.status === "valid" && Boolean(state?.verification);
  if (out) writeFileSync(path.resolve(out), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  return {
    ok: available,
    command: "feedback",
    status: available ? "prepared" : stored.status === "invalid" ? "invalid_state" : "verification_required",
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
  const selected = await resolveRuntimeCore({
    workspace,
    coreOption: options.core,
    stateRoot: options["state-root"],
  });
  const core = selected.core;
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
    stateRoot: options["state-root"],
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
