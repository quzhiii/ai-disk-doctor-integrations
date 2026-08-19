export const CORE_COMMANDS = ["scan", "models", "diff"];

const objectSchema = {
  type: "object",
  additionalProperties: false,
};

const coreStatusOutputSchema = {
  type: "object",
  required: ["ok", "server", "core"],
  properties: {
    ok: { type: "boolean" },
    server: {
      type: "object",
      required: ["name", "version", "transport", "mode"],
      properties: {
        name: { type: "string" },
        version: { type: "string" },
        transport: { const: "stdio" },
        mode: { const: "read-only" },
      },
      additionalProperties: true,
    },
    core: {
      type: "object",
      required: ["command", "expected_version", "tested_revision", "compatible", "available"],
      properties: {
        command: { type: "string" },
        expected_version: { type: "string" },
        tested_revision: { type: "string" },
        detected_version: { type: ["string", "null"] },
        compatible: { type: "boolean" },
        available: { type: "boolean" },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: false,
};

const coreReportOutputSchema = {
  type: "object",
  required: ["ok", "source", "mode", "report"],
  properties: {
    ok: { const: true },
    source: { const: "ai-disk-doctor-core" },
    mode: { const: "read-only" },
    report: { type: "object", additionalProperties: true },
  },
  additionalProperties: false,
};

const historyOutputSchema = {
  type: "object",
  required: ["ok", "source", "mode", "reports_dir", "snapshots", "latest_snapshot", "latest_pair"],
  properties: {
    ok: { const: true },
    source: { const: "ai-disk-doctor-core-snapshot-metadata" },
    mode: { const: "read-only" },
    reports_dir: { type: "string" },
    snapshots: {
      type: "array",
      items: {
        type: "object",
        required: ["path", "file_name"],
        properties: { path: { type: "string" }, file_name: { type: "string" } },
        additionalProperties: false,
      },
    },
    latest_snapshot: { type: ["object", "null"] },
    latest_pair: { type: ["object", "null"] },
  },
  additionalProperties: false,
};

export const TOOL_DEFINITIONS = [
  {
    name: "core_status",
    title: "AI Disk Doctor Core Status",
    description:
      "Check whether the local AI Disk Doctor Core is installed, compatible, and callable. This does not scan or modify files.",
    inputSchema: { ...objectSchema, properties: {} },
    outputSchema: coreStatusOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "scan_summary",
    title: "AI Disk Doctor Scan Summary",
    description:
      "Run AI Disk Doctor's existing non-destructive scan and return its structured JSON report. The Core may persist an AI Disk Doctor-owned snapshot under .aidisk/reports; it does not mutate user files.",
    inputSchema: {
      ...objectSchema,
      properties: {
        category: {
          type: "string",
          description: "Optional existing Core rule category filter.",
        },
        rules_dir: {
          type: "string",
          description: "Optional local rules directory understood by the Core.",
        },
        policy: {
          type: "string",
          description: "Optional local policy file understood by the Core.",
        },
      },
    },
    annotations: {
      // Core scan creates a Core-owned snapshot; this is not a read-only MCP call.
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    outputSchema: coreReportOutputSchema,
  },
  {
    name: "ai_model_inventory",
    title: "AI Model And Cache Inventory",
    description:
      "Use AI Disk Doctor's existing metadata-only model inventory for Ollama, Hugging Face, LM Studio, or generic model files. It does not read model, prompt, source, token, or credential contents and does not mutate files.",
    inputSchema: {
      ...objectSchema,
      properties: {
        tool: {
          type: "string",
          enum: ["auto", "ollama", "huggingface", "lm-studio", "generic"],
        },
        root: {
          type: "string",
          description: "Optional inventory root path.",
        },
        max_depth: { type: "integer", minimum: 0, maximum: 100 },
        stale_after_days: { type: "integer", minimum: 0, maximum: 36500 },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    outputSchema: coreReportOutputSchema,
  },
  {
    name: "scan_history",
    title: "AI Disk Doctor Scan History",
    description:
      "List AI Disk Doctor scan snapshot metadata and the newest pair in the local .aidisk/reports directory. This reads only Core-owned snapshot metadata and files; it does not modify workspace content.",
    inputSchema: {
      ...objectSchema,
      properties: {
        reports_dir: {
          type: "string",
          description: "Optional local AI Disk Doctor reports directory.",
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    outputSchema: historyOutputSchema,
  },
];

export const TOOL_NAMES = new Set(TOOL_DEFINITIONS.map((tool) => tool.name));
