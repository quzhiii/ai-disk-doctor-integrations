import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

export const SERVER_VERSION = "0.1.0-alpha.1";
export const TESTED_CORE_REVISION = "52f3150";
export const TESTED_CORE_VERSION = "1.7.0";
export const CORE_TIMEOUT_MS = 120_000;

const mutationArguments = new Set([
  "yes",
  "dry_run",
  "quarantine_root",
  "index",
  "command",
  "shell",
]);

export class CoreError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "CoreError";
    this.details = details;
  }
}

export function validateKnownArguments(args, allowed) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new CoreError("tool arguments must be an object");
  }
  for (const key of Object.keys(args)) {
    if (!allowed.includes(key)) {
      throw new CoreError(`argument '${key}' is not supported by this tool`);
    }
  }
}

export function coreCommand() {
  return process.env.AIDISK_EXE || "aidisk";
}

export function validateReadOnlyArguments(args = {}) {
  for (const key of Object.keys(args)) {
    if (
      mutationArguments.has(key) ||
      key.includes("delete") ||
      key.includes("clean") ||
      key.includes("shell")
    ) {
      throw new CoreError(`argument '${key}' is not available in the read-only integration`);
    }
  }
}

export function validatePathArgument(value, label) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.includes("\0")) {
    throw new CoreError(`${label} must be a valid local path string`);
  }
  return value;
}

export function runCore(args, { cwd = process.cwd(), timeoutMs = CORE_TIMEOUT_MS } = {}) {
  validateReadOnlyArguments(Object.fromEntries(args.map((arg) => [arg, true])));
  return new Promise((resolvePromise, reject) => {
    const child = spawn(coreCommand(), args, {
      cwd,
      env: { ...process.env, CI: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new CoreError("AI Disk Doctor Core timed out", { args, timeoutMs }));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(
        new CoreError("AI Disk Doctor Core is unavailable", {
          cause: error.message,
          command: coreCommand(),
        }),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new CoreError("AI Disk Doctor Core returned an error", {
            code,
            args,
            stderr: stderr.trim(),
            stdout: stdout.trim(),
          }),
        );
        return;
      }
      try {
        resolvePromise(parseCoreJson(stdout, { args, stderr }));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function parseCoreJson(stdout, { args = [], stderr = "" } = {}) {
  try {
    return JSON.parse(stdout.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new CoreError("AI Disk Doctor Core returned malformed JSON", {
      args,
      cause: error.message,
      stdout: stdout.slice(0, 2000),
      stderr: stderr.trim(),
    });
  }
}

export function runCoreText(args, { cwd = process.cwd(), timeoutMs = CORE_TIMEOUT_MS } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(coreCommand(), args, {
      cwd,
      env: { ...process.env, CI: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new CoreError("AI Disk Doctor Core timed out", { args, timeoutMs }));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new CoreError("AI Disk Doctor Core is unavailable", {
        cause: error.message,
        command: coreCommand(),
      }));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new CoreError("AI Disk Doctor Core returned an error", {
          code,
          args,
          stderr: stderr.trim(),
          stdout: stdout.trim(),
        }));
        return;
      }
      resolvePromise(stdout);
    });
  });
}

export async function coreStatus() {
  const status = {
    ok: false,
    server: {
      name: "ai-disk-doctor",
      version: SERVER_VERSION,
      transport: "stdio",
      mode: "read-only",
    },
    core: {
      command: coreCommand(),
      expected_version: TESTED_CORE_VERSION,
      tested_revision: TESTED_CORE_REVISION,
      detected_version: null,
      compatible: false,
      available: false,
      capabilities: [],
    },
  };
  try {
    const help = await runCoreText(["--help"]);
    status.core.available = true;
    status.core.capabilities = ["scan", "models", "diff"].filter((command) =>
      String(help).includes(command),
    );
    status.core.compatible = status.core.capabilities.length === 3;
    try {
      const versionOutput = await runCoreText(["--version"]);
      const detected = versionOutput.match(/\b(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)\b/)?.[1] || null;
      status.core.detected_version = detected;
      status.core.version_verification = detected ? "reported" : "unparseable";
      if (detected && detected !== TESTED_CORE_VERSION) {
        status.core.compatible = false;
      }
    } catch {
      status.core.version_verification = "unsupported-by-core";
    }
    status.core.status = status.core.compatible ? "compatible" : "incompatible";
    status.ok = status.core.compatible;
  } catch (error) {
    status.core.status = "unavailable";
    status.core.error = error.message;
    status.core.error_details = error.details;
  }
  return status;
}

function coreArgsForScan(args) {
  validateKnownArguments(args, ["category", "rules_dir", "policy"]);
  validateReadOnlyArguments(args);
  const result = ["scan", "--json"];
  const category = typeof args.category === "string" && args.category.trim() ? args.category : undefined;
  if (args.category !== undefined && !category) {
    throw new CoreError("category must be a non-empty string");
  }
  const rulesDir = validatePathArgument(args.rules_dir, "rules_dir");
  const policy = validatePathArgument(args.policy, "policy");
  if (category) result.push("--category", category);
  if (rulesDir) result.push("--rules-dir", rulesDir);
  if (policy) result.push("--policy", policy);
  return result;
}

export function scanSummary(args = {}) {
  return runCore(coreArgsForScan(args));
}

export function modelInventory(args = {}) {
  validateKnownArguments(args, ["tool", "root", "max_depth", "stale_after_days"]);
  validateReadOnlyArguments(args);
  const result = ["models", "inventory", "--json"];
  const tool = args.tool || "auto";
  if (!["auto", "ollama", "huggingface", "lm-studio", "generic"].includes(tool)) {
    throw new CoreError("tool must be auto, ollama, huggingface, lm-studio, or generic");
  }
  result.push("--tool", tool);
  const root = validatePathArgument(args.root, "root");
  if (root) result.push("--root", root);
  if (args.max_depth !== undefined) result.push("--max-depth", String(args.max_depth));
  if (args.stale_after_days !== undefined) {
    result.push("--stale-after-days", String(args.stale_after_days));
  }
  return runCore(result);
}

export function scanHistory(args = {}) {
  validateKnownArguments(args, ["reports_dir"]);
  validateReadOnlyArguments(args);
  const reportsDir = resolve(
    validatePathArgument(args.reports_dir, "reports_dir") || join(process.cwd(), ".aidisk", "reports"),
  );
  if (!existsSync(reportsDir)) {
    return { reports_dir: reportsDir, snapshots: [], latest_snapshot: null, latest_pair: null };
  }
  const snapshots = readdirSync(reportsDir)
    .filter((fileName) => fileName.startsWith("scan-") && fileName.endsWith(".json"))
    .sort()
    .map((fileName) => ({ path: join(reportsDir, fileName), file_name: fileName }));
  const latestSnapshot = snapshots.at(-1) || null;
  const before = snapshots.at(-2) || null;
  return {
    reports_dir: reportsDir,
    snapshots,
    latest_snapshot: latestSnapshot,
    latest_pair: before && latestSnapshot ? { before, after: latestSnapshot } : null,
  };
}
