import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import Ajv from "ajv";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { aidiskCapabilities } from "../mcp/tools/aidisk-capabilities.js";
import { projectCapabilities, projectCapabilitiesError } from "../mcp/projection/capabilities.js";
import { validateExplainabilityCompatibility } from "../mcp/server/compatibility.js";
import { TOOL_DEFINITIONS } from "../src/schemas.js";
import {
  MAX_ERROR_EVIDENCE_CHARS,
  TESTED_CORE_REVISION,
  TESTED_CORE_VERSION,
  coreStatus,
  latestDiff as coreLatestDiff,
  latestDiffInvocation,
  modelInventory,
  modelInventoryInvocation,
  parseCoreJson,
  runCore,
  scanSummary,
  scanSummaryInvocation,
  validateCoreArgv,
  validateKnownArguments,
  validateReadOnlyArguments,
} from "../src/core.js";
import {
  DIFF_CHANGE_LIMIT,
  MCP_TEXT_LIMIT,
  MODEL_ASSET_LIMIT,
  SCAN_FINDING_LIMIT,
  contentFor,
  coreStatus as coreStatusTool,
  projectLatestDiff,
  projectModelInventory,
  projectScanReport,
} from "../src/tools.js";

const toolNames = () => TOOL_DEFINITIONS.map((tool) => tool.name);

function capabilitiesFixture(overrides = {}) {
  return {
    ok: true,
    command: "capabilities",
    contract: "agent-capabilities-v1",
    schema_version: 1,
    core_version: "1.7.0",
    capabilities: {
      explainability: {
        contract: "explainability-v1",
        schema_versions: [1],
        cli_available: true,
        snapshot_modes: ["save", "skip"],
        bounded_path_groups: true,
      },
    },
    ...overrides,
  };
}

async function fakeCoreScript(body) {
  const dir = await mkdtemp(join(tmpdir(), "aidisk-fake-core-"));
  const script = join(dir, "fake-core.mjs");
  await writeFile(script, body);
  return script;
}

function scanFixture() {
  return { scan_time: "now", volumes: [], findings: [], summary: { top_findings: [] } };
}

function inventoryFixture() {
  return { schema_version: 1, generated_at: "now", roots: [], assets: [], summary: {} };
}

function diffFixture() {
  return { generated_at: "now", before: "a", after: "b", summary: {}, changes: [] };
}

test("tool registry exposes only the hardened I0.1 non-destructive surface", () => {
  assert.deepEqual(toolNames(), ["aidisk_capabilities", "core_status", "scan_summary", "ai_model_inventory", "latest_diff"]);
  for (const tool of TOOL_DEFINITIONS) {
    assert.equal(tool.annotations.destructiveHint, false);
    assert.doesNotMatch(tool.name, /clean|delete|quarantine|restore|shell/);
  }
  assert.equal(TOOL_DEFINITIONS.find((tool) => tool.name === "aidisk_capabilities").annotations.readOnlyHint, true);
  assert.equal(TOOL_DEFINITIONS.find((tool) => tool.name === "scan_summary").annotations.readOnlyHint, false);
});

test("model-facing schemas remove arbitrary path and configuration inputs", () => {
  const byName = new Map(TOOL_DEFINITIONS.map((tool) => [tool.name, tool]));
  assert.deepEqual(Object.keys(byName.get("scan_summary").inputSchema.properties), ["category"]);
  assert.deepEqual(Object.keys(byName.get("ai_model_inventory").inputSchema.properties), ["tool"]);
  assert.deepEqual(Object.keys(byName.get("latest_diff").inputSchema.properties), []);
  const serializedInputs = JSON.stringify(TOOL_DEFINITIONS.map((tool) => tool.inputSchema));
  for (const forbidden of ["rules_dir", "policy", "rules_repo", "reports_dir", "root", "max_depth", "stale_after_days"]) {
    assert.equal(serializedInputs.includes(forbidden), false, `${forbidden} must not be model-facing`);
  }
});

test("tool input and output schemas compile and validate structured output", async () => {
  const ajv = new Ajv({ strict: false });
  for (const tool of TOOL_DEFINITIONS) {
    assert.doesNotThrow(() => ajv.compile(tool.inputSchema));
    assert.doesNotThrow(() => ajv.compile(tool.outputSchema));
  }
  const statusSchema = ajv.compile(TOOL_DEFINITIONS.find((tool) => tool.name === "core_status").outputSchema);
  assert.equal(statusSchema(await coreStatusTool()), true, ajv.errorsText(statusSchema.errors));
  const latestDiffSchema = ajv.compile(TOOL_DEFINITIONS.find((tool) => tool.name === "latest_diff").outputSchema);
  assert.equal(
    latestDiffSchema(projectLatestDiff({ report: diffFixture(), argv: ["diff", "--latest", "--json"] })),
    true,
    ajv.errorsText(latestDiffSchema.errors),
  );
});

test("aidisk_capabilities returns a bounded compatible projection", async () => {
  const script = await fakeCoreScript(`
const args = process.argv.slice(2);
if (JSON.stringify(args) !== JSON.stringify(['capabilities','--json'])) process.exit(2);
console.log(JSON.stringify(${JSON.stringify(capabilitiesFixture())}));
`);
  const result = await aidiskCapabilities({}, { command: process.execPath, prefixArgs: [script] });
  const schema = new Ajv({ strict: false }).compile(
    TOOL_DEFINITIONS.find((tool) => tool.name === "aidisk_capabilities").outputSchema,
  );
  assert.equal(schema(result), true);
  assert.equal(result.ok, true);
  assert.equal(result.tool, "aidisk_capabilities");
  assert.equal(result.core_version, "1.7.0");
  assert.equal(result.contracts[0].name, "explainability-v1");
  assert.equal(result.integration_status.compatible, true);
  assert.deepEqual(result.provenance.command, ["capabilities", "--json"]);
});

test("aidisk_capabilities reports Core unavailable without fallback", async () => {
  const result = await aidiskCapabilities({}, { command: "definitely-not-aidisk-executable" });
  assert.equal(result.ok, false);
  assert.equal(result.integration_status.status, "unavailable");
  assert.equal(result.error.type, "core-capabilities-error");
  assert.deepEqual(result.provenance.command, ["capabilities", "--json"]);
});

test("aidisk_capabilities reports malformed Core response as a bounded error", async () => {
  const script = await fakeCoreScript("console.log('not-json');");
  const result = await aidiskCapabilities({}, { command: process.execPath, prefixArgs: [script] });
  assert.equal(result.ok, false);
  assert.equal(result.integration_status.status, "malformed");
  assert.equal(result.error.type, "core-capabilities-error");
  assert.equal(result.error.details.command.join(" "), "capabilities --json");
});

test("unsupported explainability contract fails the compatibility gate", async () => {
  const report = capabilitiesFixture({
    capabilities: {
      explainability: {
        contract: "explainability-v2",
        schema_versions: [2],
        cli_available: true,
        snapshot_modes: ["save"],
        bounded_path_groups: true,
      },
    },
  });
  const script = await fakeCoreScript(`console.log(JSON.stringify(${JSON.stringify(report)}));`);
  const result = await aidiskCapabilities({}, { command: process.execPath, prefixArgs: [script] });
  assert.equal(result.ok, false);
  assert.equal(result.integration_status.status, "incompatible");
  assert.equal(result.error.type, "compatibility-error");
  assert.match(result.error.message, /compatibility gate/);
});

test("capability projection bounds contract summaries and never echoes raw output", () => {
  const capabilities = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [
    `contract-${index}`,
    { contract: `contract-${index}`, schema_versions: [1], cli_available: true, snapshot_modes: ["save"], bounded_path_groups: false },
  ]));
  const result = projectCapabilities({ report: capabilitiesFixture({ capabilities }), argv: ["capabilities", "--json"] });
  assert.equal(result.contracts.length, 16);
  assert.equal(result.truncated, true);
  assert.equal(Object.hasOwn(result, "raw"), false);
  const error = projectCapabilitiesError(new Error("raw stdout should not be returned"));
  assert.equal(Object.hasOwn(error, "raw"), false);
});

test("compatibility gate requires machine-readable contract evidence", () => {
  const result = validateExplainabilityCompatibility(capabilitiesFixture());
  assert.equal(result.compatible, true);
  const unsupported = validateExplainabilityCompatibility(capabilitiesFixture({ contract: "other-contract" }));
  assert.equal(unsupported.compatible, false);
  assert.equal(unsupported.required.capabilities_command, false);
});

test("missing Core status is unavailable and reports non-destructive diagnostic mode", async () => {
  const previous = process.env.AIDISK_EXE;
  process.env.AIDISK_EXE = "definitely-not-aidisk-executable";
  try {
    const result = await coreStatus();
    assert.equal(result.ok, false);
    assert.equal(result.server.mode, "non-destructive-diagnostic");
    assert.equal(result.core.compatibility_status, "unavailable");
  } finally {
    if (previous === undefined) delete process.env.AIDISK_EXE;
    else process.env.AIDISK_EXE = previous;
  }
});

test("input narrowing rejects forbidden filesystem and mutation argument names", () => {
  for (const key of ["yes", "delete", "cleanup", "clean", "quarantine", "restore", "shell", "arbitrary_shell"]) {
    assert.throws(() => validateReadOnlyArguments({ [key]: true }), /non-destructive diagnostic/);
  }
  assert.throws(() => validateReadOnlyArguments({ "--yes": true }), /non-destructive diagnostic/);
  assert.throws(() => validateCoreArgv(["clean", "--dry-run", "--json"]), /allowlist/);
  assert.throws(() => validateKnownArguments({ unexpected: true }, []), /not supported/);
  for (const key of ["rules_dir", "policy", "root", "reports_dir", "command", "shell", "delete", "cleanup", "quarantine", "restore"]) {
    assert.throws(() => scanSummary({ [key]: "x" }), /not supported|non-destructive diagnostic/);
    assert.throws(() => modelInventory({ [key]: "x" }), /not supported|non-destructive diagnostic/);
  }
});

test("argv validation does not reject allowed values containing mutation words", async () => {
  const script = await fakeCoreScript(`
const args = process.argv.slice(2);
if (JSON.stringify(args) !== JSON.stringify(['scan','--json','--category','cleanup-cache'])) process.exit(2);
console.log(JSON.stringify({ scan_time:'now', volumes:[], findings:[], summary:{ top_findings: [] } }));
`);
  const result = await scanSummary({ category: "cleanup-cache" }, { command: process.execPath, prefixArgs: [script] });
  assert.equal(result.scan_time, "now");
});

test("fixed Core invocations do not accept arbitrary paths or commands", async () => {
  const calls = join(await mkdtemp(join(tmpdir(), "aidisk-calls-")), "calls.jsonl");
  const script = await fakeCoreScript(`
import { appendFileSync } from 'node:fs';
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(calls)}, JSON.stringify(args) + '\\n');
if (args[0] === 'scan') console.log(JSON.stringify(${JSON.stringify(scanFixture())}));
else if (args[0] === 'models') console.log(JSON.stringify(${JSON.stringify(inventoryFixture())}));
else if (args[0] === 'diff') console.log(JSON.stringify(${JSON.stringify(diffFixture())}));
else console.log('help');
`);
  await scanSummary({ category: "ai-agent" }, { command: process.execPath, prefixArgs: [script] });
  await modelInventory({ tool: "ollama" }, { command: process.execPath, prefixArgs: [script] });
  await coreLatestDiff({ command: process.execPath, prefixArgs: [script] });
  const recorded = (await import("node:fs/promises")).readFile(calls, "utf8");
  assert.deepEqual(
    (await recorded).trim().split("\n").map((line) => JSON.parse(line)),
    [
      ["scan", "--json", "--category", "ai-agent"],
      ["models", "inventory", "--json", "--tool", "ollama"],
      ["diff", "--latest", "--json"],
    ],
  );
});

test("provenance.command is the exact argv executed by the Core invocation", async () => {
  const script = await fakeCoreScript(`
const args = process.argv.slice(2);
if (args[0] === 'scan') console.log(JSON.stringify(${JSON.stringify(scanFixture())}));
else if (args[0] === 'models') console.log(JSON.stringify(${JSON.stringify(inventoryFixture())}));
else if (args[0] === 'diff') console.log(JSON.stringify(${JSON.stringify(diffFixture())}));
else console.log('help');
`);
  const options = { command: process.execPath, prefixArgs: [script] };

  const scanDefault = projectScanReport(await scanSummaryInvocation({}, options));
  assert.deepEqual(scanDefault.provenance.command, ["scan", "--json"]);

  const scanCategory = projectScanReport(await scanSummaryInvocation({ category: "ai-agent" }, options));
  assert.deepEqual(scanCategory.provenance.command, ["scan", "--json", "--category", "ai-agent"]);

  const inventoryDefault = projectModelInventory(await modelInventoryInvocation({}, options));
  assert.deepEqual(inventoryDefault.provenance.command, ["models", "inventory", "--json"]);

  const inventoryTool = projectModelInventory(await modelInventoryInvocation({ tool: "ollama" }, options));
  assert.deepEqual(inventoryTool.provenance.command, ["models", "inventory", "--json", "--tool", "ollama"]);

  const diff = projectLatestDiff(await latestDiffInvocation(options));
  assert.deepEqual(diff.provenance.command, ["diff", "--latest", "--json"]);
});

test("mutation-like substrings in a legal category value do not trigger argv false positives", async () => {
  const script = await fakeCoreScript(`
const args = process.argv.slice(2);
if (JSON.stringify(args) !== JSON.stringify(['scan','--json','--category','cleanup-cache'])) process.exit(2);
console.log(JSON.stringify(${JSON.stringify(scanFixture())}));
`);
  const invocation = await scanSummaryInvocation(
    { category: "cleanup-cache" },
    { command: process.execPath, prefixArgs: [script] },
  );
  assert.deepEqual(invocation.argv, ["scan", "--json", "--category", "cleanup-cache"]);
  assert.deepEqual(projectScanReport(invocation).provenance.command, invocation.argv);
});

test("latest_diff uses Core diff --latest and performs no pair calculation", async () => {
  const script = await fakeCoreScript(`
const args = process.argv.slice(2);
if (JSON.stringify(args) !== JSON.stringify(['diff','--latest','--json'])) process.exit(2);
console.log(JSON.stringify({ generated_at:'now', before:'core-before.json', after:'core-after.json', summary:{ grew:1 }, changes:[{ path:'x', delta_bytes:1 }] }));
`);
  const result = projectLatestDiff(await latestDiffInvocation({ command: process.execPath, prefixArgs: [script] }));
  assert.equal(result.before, "core-before.json");
  assert.equal(result.after, "core-after.json");
  assert.equal(result.returned_changes, 1);
});

test("latest_diff surfaces Core insufficient-history errors without Integration fallback", async () => {
  const script = await fakeCoreScript(`
const args = process.argv.slice(2);
if (JSON.stringify(args) !== JSON.stringify(['diff','--latest','--json'])) process.exit(2);
console.error(JSON.stringify({ ok:false, error:{ message:'diff --latest requires at least two scan snapshots' } }));
process.exit(1);
`);
  await assert.rejects(
    () => coreLatestDiff({ command: process.execPath, prefixArgs: [script] }),
    (error) => {
      assert.equal(error.name, "CoreError");
      assert.match(error.details.stderr, /at least two scan snapshots/);
      return true;
    },
  );
});

test("bounded scan projection preserves Core fields without full report echo", () => {
  const findings = Array.from({ length: SCAN_FINDING_LIMIT + 5 }, (_, index) => ({
    id: `rule-${index}`,
    name: `Rule ${index}`,
    category: "ai-agent",
    path: `/tmp/path-${index}`,
    exists: true,
    size_bytes: index,
    partial: false,
    partial_reasons: [],
    risk: "review",
    action: "report-only",
    reason: "core reason",
    warnings: [],
  }));
  const report = {
    scan_time: "now",
    policy: { planner: {} },
    volumes: [{ mount_point: "/", total_bytes: 1, available_bytes: 1 }],
    findings,
    summary: {
      schema_version: 2,
      total_size_bytes: 123,
      top_findings: findings.map(({ id, path, risk, size_bytes, partial }) => ({ id, path, risk, size_bytes, partial })),
    },
  };
  const result = projectScanReport({ report, argv: ["scan", "--json"] });
  assert.equal(result.returned_findings, SCAN_FINDING_LIMIT);
  assert.equal(result.total_findings, findings.length);
  assert.equal(result.truncated, true);
  assert.equal(result.top_findings[0].finding.reason, "core reason");
  assert.equal(contentFor(result)[0].text.length <= MCP_TEXT_LIMIT, true);
});

test("bounded model inventory projection preserves Core asset semantics", () => {
  const assets = Array.from({ length: MODEL_ASSET_LIMIT + 2 }, (_, index) => ({
    id: `asset-${index}`,
    logical_name: `model-${index}`,
    action: "report-only",
    reclaim_confidence: 0,
  }));
  const report = { schema_version: 1, generated_at: "now", roots: [], assets, summary: { total_assets: assets.length } };
  const result = projectModelInventory({ report, argv: ["models", "inventory", "--json"] });
  assert.equal(result.returned_assets, MODEL_ASSET_LIMIT);
  assert.equal(result.total_assets, assets.length);
  assert.equal(result.truncated, true);
  assert.equal(result.assets[0].action, "report-only");
});

test("bounded latest diff projection limits Core changes", () => {
  const changes = Array.from({ length: DIFF_CHANGE_LIMIT + 1 }, (_, index) => ({ path: `p${index}`, delta_bytes: index }));
  const report = { generated_at: "now", before: "b", after: "a", summary: {}, changes };
  const result = projectLatestDiff({ report, argv: ["diff", "--latest", "--json"] });
  assert.equal(result.returned_changes, DIFF_CHANGE_LIMIT);
  assert.equal(result.total_changes, changes.length);
  assert.equal(result.truncated, true);
});

test("malformed Core JSON and output flooding return bounded diagnostics", async () => {
  assert.throws(
    () => parseCoreJson("not-json", { args: ["scan", "--json"] }),
    (error) => error.name === "CoreError" && error.details.stdout === "not-json",
  );
  const script = await fakeCoreScript("process.stdout.write('x'.repeat(5 * 1024 * 1024));");
  await assert.rejects(
    () => runCore(["scan", "--json"], { command: process.execPath, prefixArgs: [script] }),
    (error) => {
      assert.equal(error.name, "CoreError");
      assert.equal(error.details.truncated, true);
      assert.equal(error.details.stdout.length <= MAX_ERROR_EVIDENCE_CHARS, true);
      return true;
    },
  );
});

test("MCP stdio smoke lists hardened tools and rejects invalid inputs", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(process.cwd(), "src", "server.js")],
    env: { ...process.env, AIDISK_EXE: process.env.AIDISK_EXE || "aidisk" },
    cwd: process.cwd(),
    stderr: "pipe",
  });
  const client = new Client({ name: "integration-test", version: "0.1.0" });
  await client.connect(transport);
  const listed = await client.listTools();
  assert.deepEqual(listed.tools.map((tool) => tool.name), toolNames());
  const status = await client.callTool({ name: "core_status", arguments: {} });
  assert.equal(status.isError, undefined);
  assert.equal(status.structuredContent.server.mode, "non-destructive-diagnostic");
  const rejected = await client.callTool({ name: "scan_summary", arguments: { rules_dir: "x" } });
  assert.equal(rejected.isError, true);
  assert.equal(rejected.structuredContent, undefined);
  const invalid = await client.callTool({ name: "ai_model_inventory", arguments: { root: "x" } });
  assert.equal(invalid.isError, true);
  await client.close();
});

test("actual Core status and inventory smoke when AIDISK_EXE is supplied", async (t) => {
  if (!process.env.AIDISK_EXE) {
    t.skip("set AIDISK_EXE to run the real Core smoke");
    return;
  }
  const status = await coreStatus();
  assert.equal(status.core.tested_revision, TESTED_CORE_REVISION);
  assert.equal(status.core.expected_version, TESTED_CORE_VERSION);
  assert.notEqual(status.core.compatibility_status, "unavailable");
  const inventory = await modelInventory({ tool: "generic" });
  assert.equal(typeof inventory.summary.total_assets, "number");
});

test("current Node CLI scan may create a Core-owned snapshot", async (t) => {
  if (!process.env.AIDISK_EXE) {
    t.skip("set AIDISK_EXE to run the real Core scan side-effect smoke");
    return;
  }
  const workspace = await mkdtemp(join(tmpdir(), "aidisk-scan-side-effect-"));
  await mkdir(join(workspace, ".aidisk"), { recursive: true });
  await scanSummary({ category: "definitely-no-category" }, { cwd: workspace });
  const reports = await readdir(join(workspace, ".aidisk", "reports"));
  assert.equal(reports.some((name) => name.startsWith("scan-") && name.endsWith(".json")), true);
});
