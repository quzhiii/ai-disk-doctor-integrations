import Ajv from "ajv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { aidiskCapabilities } from "../mcp/tools/aidisk-capabilities.js";
import { aidiskWorkspaceExplain } from "../mcp/tools/aidisk-workspace-explain.js";
import {
  aiModelInventory,
  contentFor,
  coreStatus,
  latestDiff,
  scanSummary,
} from "./tools.js";
import { TOOL_DEFINITIONS } from "./schemas.js";
import { SERVER_VERSION } from "./core.js";

const ajv = new Ajv({ strict: false });
const toolsByName = new Map(TOOL_DEFINITIONS.map((tool) => [tool.name, tool]));
const inputValidators = new Map(
  TOOL_DEFINITIONS.map((tool) => [tool.name, ajv.compile(tool.inputSchema)]),
);
const outputValidators = new Map(
  TOOL_DEFINITIONS.map((tool) => [tool.name, ajv.compile(tool.outputSchema)]),
);

const server = new Server(
  { name: "ai-disk-doctor", version: SERVER_VERSION },
  { capabilities: { tools: { listChanged: false } } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params?.name;
  const args = request.params?.arguments || {};
  const handlers = {
    aidisk_capabilities: aidiskCapabilities,
    aidisk_workspace_explain: aidiskWorkspaceExplain,
    core_status: coreStatus,
    scan_summary: scanSummary,
    ai_model_inventory: aiModelInventory,
    latest_diff: latestDiff,
  };
  if (!handlers[name] || !toolsByName.has(name)) {
    throw new Error(`Unknown tool: ${name}`);
  }
  try {
    const validateInput = inputValidators.get(name);
    if (!validateInput(args)) {
      throw new Error(`invalid ${name} arguments: ${ajv.errorsText(validateInput.errors)}`);
    }
    const value = await handlers[name](args);
    const validateOutput = outputValidators.get(name);
    if (!validateOutput(value)) {
      throw new Error(`invalid ${name} output: ${ajv.errorsText(validateOutput.errors)}`);
    }
    return { content: contentFor(value), structuredContent: value };
  } catch (error) {
    const value = {
      ok: false,
      error: {
        type: error.name || "Error",
        message: error.message,
        details: error.details || {},
      },
    };
    return {
      isError: true,
      content: [{ type: "text", text: `ok=false\nerror=${value.error.message}`.slice(0, 2_000) }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
