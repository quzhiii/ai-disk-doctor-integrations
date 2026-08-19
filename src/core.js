import { spawn } from "node:child_process";

export const SERVER_VERSION = "0.1.0-alpha.2";
export const TESTED_CORE_REVISION = "52f31509394d2165cba8908da00a1036ba90479d";
export const TESTED_CORE_VERSION = "1.7.0";
export const CORE_TIMEOUT_MS = 120_000;
export const MAX_CORE_STDOUT_BYTES = 4 * 1024 * 1024;
export const MAX_CORE_STDERR_BYTES = 64 * 1024;
export const MAX_ERROR_EVIDENCE_CHARS = 4_096;

const CORE_COMMAND_SURFACE = [
  ["scan", "--help"],
  ["models", "inventory", "--help"],
  ["diff", "--help"],
];
const INVENTORY_TOOLS = ["auto", "ollama", "huggingface", "lm-studio", "generic"];
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

class BoundedCapture {
  constructor(limit) {
    this.limit = limit;
    this.totalBytes = 0;
    this.truncated = false;
    this.chunks = [];
    this.capturedBytes = 0;
  }

  append(chunk) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this.totalBytes += buffer.length;
    const remaining = this.limit - this.capturedBytes;
    if (remaining > 0) {
      const captured = buffer.subarray(0, remaining);
      this.chunks.push(captured);
      this.capturedBytes += captured.length;
    }
    if (buffer.length > remaining) {
      this.truncated = true;
    }
  }

  text(limit = Number.POSITIVE_INFINITY) {
    return Buffer.concat(this.chunks)
      .toString("utf8")
      .slice(0, limit);
  }
}

export function coreCommand() {
  return process.env.AIDISK_EXE || "aidisk";
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

export function validateReadOnlyArguments(args = {}) {
  for (const key of Object.keys(args)) {
    const normalized = key.toLowerCase().replace(/^-+/, "").replaceAll("-", "_");
    if (
      mutationArguments.has(normalized) ||
      normalized.includes("delete") ||
      normalized.includes("clean") ||
      normalized.includes("shell") ||
      normalized.includes("quarantine") ||
      normalized.includes("restore")
    ) {
      throw new CoreError(`argument '${key}' is not available in the non-destructive diagnostic integration`);
    }
  }
}

export function validateCoreArgv(args) {
  const serialized = JSON.stringify(args);
  const exact = new Set([
    JSON.stringify(["scan", "--help"]),
    JSON.stringify(["scan", "--json"]),
    JSON.stringify(["models", "inventory", "--help"]),
    JSON.stringify(["models", "inventory", "--json"]),
    JSON.stringify(["diff", "--help"]),
    JSON.stringify(["diff", "--latest", "--json"]),
    JSON.stringify(["--version"]),
  ]);
  if (exact.has(serialized)) return;
  if (
    args.length === 4 &&
    args[0] === "scan" &&
    args[1] === "--json" &&
    args[2] === "--category" &&
    typeof args[3] === "string" &&
    args[3].length > 0 &&
    args[3].length <= 128
  ) {
    return;
  }
  if (
    args.length === 5 &&
    args[0] === "models" &&
    args[1] === "inventory" &&
    args[2] === "--json" &&
    args[3] === "--tool" &&
    INVENTORY_TOOLS.includes(args[4])
  ) {
    return;
  }
  throw new CoreError("Core invocation is not on the I0.1 allowlist", { args });
}

function errorDetails(stdout, stderr, args, captures = {}) {
  const stdoutText = typeof stdout === "string" ? stdout : stdout?.text?.() || "";
  const stderrText = typeof stderr === "string" ? stderr : stderr?.text?.() || "";
  const stdoutTruncated = captures.stdout?.truncated || false;
  const stderrTruncated = captures.stderr?.truncated || false;
  return {
    args,
    stdout: stdoutText.slice(0, MAX_ERROR_EVIDENCE_CHARS),
    stderr: stderrText.slice(0, MAX_ERROR_EVIDENCE_CHARS),
    stdout_truncated: stdoutTruncated,
    stderr_truncated: stderrTruncated,
    truncated: stdoutTruncated || stderrTruncated,
    stdout_bytes: captures.stdout?.totalBytes,
    stderr_bytes: captures.stderr?.totalBytes,
  };
}

function executeCore(args, {
  command = coreCommand(),
  cwd = process.cwd(),
  timeoutMs = CORE_TIMEOUT_MS,
  prefixArgs = [],
} = {}) {
  validateCoreArgv(args);
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...prefixArgs, ...args], {
      cwd,
      env: { ...process.env, CI: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const stdout = new BoundedCapture(MAX_CORE_STDOUT_BYTES);
    const stderr = new BoundedCapture(MAX_CORE_STDERR_BYTES);
    let settled = false;
    let outputLimitExceeded = false;
    const timer = setTimeout(() => {
      child.kill();
      if (!settled) {
        settled = true;
        reject(new CoreError("AI Disk Doctor Core timed out", {
          args,
          timeoutMs,
          ...errorDetails(stdout, stderr, args, { stdout, stderr }),
        }));
      }
    }, timeoutMs);

    const rejectOnce = (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(error);
      }
    };

    stdout.onExceeded = () => {
      outputLimitExceeded = true;
      child.kill();
    };
    stderr.onExceeded = () => {
      outputLimitExceeded = true;
      child.kill();
    };
    child.stdout.on("data", (chunk) => {
      stdout.append(chunk);
      if (stdout.truncated) stdout.onExceeded();
    });
    child.stderr.on("data", (chunk) => {
      stderr.append(chunk);
      if (stderr.truncated) stderr.onExceeded();
    });
    child.on("error", (error) => {
      rejectOnce(new CoreError("AI Disk Doctor Core is unavailable", {
        command,
        cause: error.message,
      }));
    });
    child.on("close", (code) => {
      if (settled) return;
      clearTimeout(timer);
      if (outputLimitExceeded) {
        rejectOnce(new CoreError("AI Disk Doctor Core output exceeded the capture limit", {
          ...errorDetails(stdout, stderr, args, { stdout, stderr }),
          output_limit_bytes: {
            stdout: MAX_CORE_STDOUT_BYTES,
            stderr: MAX_CORE_STDERR_BYTES,
          },
        }));
        return;
      }
      const result = {
        code,
        stdout: stdout.text(),
        stderr: stderr.text(),
        captures: { stdout, stderr },
      };
      if (code !== 0) {
        rejectOnce(new CoreError("AI Disk Doctor Core returned an error", {
          code,
          ...errorDetails(stdout, stderr, args, { stdout, stderr }),
        }));
        return;
      }
      settled = true;
      resolve(result);
    });
  });
}

export function runCore(args, options = {}) {
  return executeCore(args, options).then(({ stdout, stderr, captures }) =>
    parseCoreJson(stdout, { args, stderr, captures }));
}

export function runCoreText(args, options = {}) {
  return executeCore(args, options).then(({ stdout }) => stdout);
}

async function runCoreInvocation(args, options = {}) {
  const argv = [...args];
  const report = await runCore(argv, options);
  return { report, argv };
}

export function parseCoreJson(stdout, { args = [], stderr = "", captures = {} } = {}) {
  try {
    return JSON.parse(stdout.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new CoreError("AI Disk Doctor Core returned malformed JSON", {
      cause: error.message,
      ...errorDetails(stdout, stderr, args, captures),
    });
  }
}

function parseVersion(text) {
  return text.match(/\b(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)\b/)?.[1] || null;
}

export async function coreStatus() {
  const core = {
    command: coreCommand(),
    expected_version: TESTED_CORE_VERSION,
    detected_version: null,
    tested_revision: TESTED_CORE_REVISION,
    revision_verification: "not-runtime-verifiable",
    version_verification: "not-runtime-verifiable",
    command_surface: {},
    capabilities: [],
    available: false,
    compatibility_status: "unavailable",
  };
  const status = {
    ok: false,
    server: {
      name: "ai-disk-doctor",
      version: SERVER_VERSION,
      transport: "stdio",
      mode: "non-destructive-diagnostic",
    },
    core,
  };

  try {
    for (const [command, ...args] of CORE_COMMAND_SURFACE) {
      try {
        await runCoreText(args.length ? [command, ...args] : [command]);
        core.command_surface[command] = "available";
        core.capabilities.push(command);
      } catch (error) {
        core.command_surface[command] = "unavailable";
        core.command_surface[`${command}_error`] = {
          message: error.message,
          details: error.details || {},
        };
      }
    }
    core.available = core.capabilities.length > 0;
    try {
      const versionOutput = await runCoreText(["--version"]);
      core.detected_version = parseVersion(versionOutput);
      core.version_verification = core.detected_version ? "reported" : "unparseable";
    } catch {
      core.version_verification = "unsupported-by-core";
    }
    if (!core.available) {
      core.compatibility_status = "unavailable";
    } else if (core.detected_version && core.detected_version !== TESTED_CORE_VERSION) {
      core.compatibility_status = "incompatible";
    } else if (core.capabilities.length === CORE_COMMAND_SURFACE.length) {
      core.compatibility_status = "compatible-unverified";
    } else {
      core.compatibility_status = "incompatible";
    }
    status.ok = ["tested", "compatible-unverified"].includes(core.compatibility_status);
  } catch (error) {
    core.error = error.message;
    core.error_details = error.details || {};
    core.compatibility_status = "unavailable";
    status.ok = false;
  }
  return status;
}

function coreArgsForScan(args) {
  validateKnownArguments(args, ["category"]);
  validateReadOnlyArguments(args);
  const result = ["scan", "--json"];
  if (args.category !== undefined) {
    if (typeof args.category !== "string" || !args.category.trim() || args.category.length > 128) {
      throw new CoreError("category must be a non-empty string of at most 128 characters");
    }
    if (args.category.includes("\0") || [...args.category].some((char) => char.charCodeAt(0) < 0x20)) {
      throw new CoreError("category contains unsupported control characters");
    }
    result.push("--category", args.category.trim());
  }
  return result;
}

function coreArgsForModelInventory(args) {
  validateKnownArguments(args, ["tool"]);
  validateReadOnlyArguments(args);
  const result = ["models", "inventory", "--json"];
  if (args.tool !== undefined) {
    if (!INVENTORY_TOOLS.includes(args.tool)) {
      throw new CoreError("tool must be auto, ollama, huggingface, lm-studio, or generic");
    }
    result.push("--tool", args.tool);
  }
  return result;
}

function coreArgsForLatestDiff() {
  return ["diff", "--latest", "--json"];
}

export function scanSummaryInvocation(args = {}, options = {}) {
  return runCoreInvocation(coreArgsForScan(args), options);
}

export function scanSummary(args = {}, options = {}) {
  return scanSummaryInvocation(args, options).then(({ report }) => report);
}

export function modelInventoryInvocation(args = {}, options = {}) {
  return runCoreInvocation(coreArgsForModelInventory(args), options);
}

export function modelInventory(args = {}, options = {}) {
  return modelInventoryInvocation(args, options).then(({ report }) => report);
}

export function latestDiffInvocation(options = {}) {
  return runCoreInvocation(coreArgsForLatestDiff(), options);
}

export function latestDiff(options = {}) {
  return latestDiffInvocation(options).then(({ report }) => report);
}
