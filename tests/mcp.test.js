import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import Ajv from "ajv";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { TOOL_DEFINITIONS } from "../src/schemas.js";
import {
  coreStatus,
  modelInventory,
  parseCoreJson,
  scanHistory,
  scanSummary,
  validateKnownArguments,
  validateReadOnlyArguments,
} from "../src/core.js";
import {
  coreStatus as coreStatusTool,
  scanHistory as scanHistoryTool,
} from "../src/tools.js";

test("tool schemas expose only the I0 read-only surface", () => {
  assert.deepEqual(
    TOOL_DEFINITIONS.map((tool) => tool.name),
    ["core_status", "scan_summary", "ai_model_inventory", "scan_history"],
  );
  for (const tool of TOOL_DEFINITIONS) {
    assert.equal(tool.annotations.destructiveHint, false);
    assert.ok(tool.inputSchema);
  }
  assert.equal(
    TOOL_DEFINITIONS.find((tool) => tool.name === "scan_summary").annotations.readOnlyHint,
    false,
  );
});

test("tool input and output schemas compile and validate structured output", async () => {
  const ajv = new Ajv({ strict: false });
  for (const tool of TOOL_DEFINITIONS) {
    assert.doesNotThrow(() => ajv.compile(tool.inputSchema));
    assert.doesNotThrow(() => ajv.compile(tool.outputSchema));
  }
  const statusSchema = ajv.compile(TOOL_DEFINITIONS[0].outputSchema);
  assert.equal(statusSchema(await coreStatusTool()), true, ajv.errorsText(statusSchema.errors));
  const historySchema = ajv.compile(TOOL_DEFINITIONS[3].outputSchema);
  assert.equal(historySchema(await scanHistoryTool({})), true, ajv.errorsText(historySchema.errors));
});

test("mutation-shaped arguments are rejected before Core launch", () => {
  assert.throws(() => validateReadOnlyArguments({ yes: true }), /read-only/);
  assert.throws(() => validateReadOnlyArguments({ quarantine_root: "x" }), /read-only/);
  assert.throws(() => validateReadOnlyArguments({ arbitrary_shell: "dir" }), /read-only/);
});

test("unknown arguments are rejected by individual tool boundaries", () => {
  assert.throws(() => validateKnownArguments({ unexpected: true }, []), /not supported/);
  assert.throws(() => scanHistory({ root: "x" }), /not supported/);
  assert.throws(() => scanSummary({ shell: "dir" }), /not supported/);
});

test("malformed Core JSON produces structured diagnostics", () => {
  assert.throws(
    () => parseCoreJson("not-json", { args: ["scan", "--json"] }),
    (error) => error.name === "CoreError" && error.details.stdout === "not-json",
  );
});

test("history reads metadata without requiring Core", async () => {
  const reportsDir = await mkdtemp(join(tmpdir(), "aidisk-history-"));
  await writeFile(join(reportsDir, "scan-20260819-000000-000.json"), "{}");
  await writeFile(join(reportsDir, "scan-20260819-000001-000.json"), "{}");
  const result = scanHistory({ reports_dir: reportsDir });
  assert.equal(result.snapshots.length, 2);
  assert.equal(result.latest_pair.after.file_name, "scan-20260819-000001-000.json");
});

test("missing Core returns structured status", async () => {
  const previous = process.env.AIDISK_EXE;
  process.env.AIDISK_EXE = "definitely-not-aidisk-executable";
  try {
    const result = await coreStatus();
    assert.equal(result.ok, false);
    assert.equal(result.core.status, "unavailable");
  } finally {
    if (previous === undefined) delete process.env.AIDISK_EXE;
    else process.env.AIDISK_EXE = previous;
  }
});

test("MCP stdio smoke lists tools and returns Core status", async () => {
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
  assert.deepEqual(
    listed.tools.map((tool) => tool.name),
    ["core_status", "scan_summary", "ai_model_inventory", "scan_history"],
  );
  const status = await client.callTool({ name: "core_status", arguments: {} });
  assert.equal(status.isError, undefined);
  assert.equal(JSON.parse(status.content[0].text).server.mode, "read-only");
  const rejected = await client.callTool({ name: "scan_history", arguments: { shell: "dir" } });
  assert.equal(rejected.isError, true);
  assert.equal(rejected.structuredContent, undefined);
  const invalid = await client.callTool({ name: "ai_model_inventory", arguments: { max_depth: -1 } });
  assert.equal(invalid.isError, true);
  await client.close();
});

test("actual Core status and inventory smoke when AIDISK_EXE is supplied", async (t) => {
  if (!process.env.AIDISK_EXE) {
    t.skip("set AIDISK_EXE to run the real Core smoke");
    return;
  }
  const status = await coreStatus();
  assert.equal(status.ok, true);
  const inventory = await modelInventory({ root: join(tmpdir(), "missing-ai-disk-root") });
  assert.equal(typeof inventory.summary.total_assets, "number");
});
