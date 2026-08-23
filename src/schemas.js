export const CORE_COMMANDS = ["capabilities", "scan", "models", "diff"];

const objectSchema = {
  type: "object",
  additionalProperties: false,
};

const provenanceSchema = {
  type: "object",
  required: ["source", "command", "tested_core_version", "tested_core_revision", "side_effects"],
  properties: {
    source: { const: "ai-disk-doctor-core-cli" },
    command: { type: "array", items: { type: "string" } },
    tested_core_version: { type: "string" },
    tested_core_revision: { type: "string" },
    side_effects: { type: "array", items: { type: "string" } },
  },
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
        mode: { const: "non-destructive-diagnostic" },
      },
      additionalProperties: true,
    },
    core: {
      type: "object",
      required: [
        "command",
        "expected_version",
        "tested_revision",
        "revision_verification",
        "version_verification",
        "command_surface",
        "available",
        "compatibility_status",
      ],
      properties: {
        command: { type: "string" },
        expected_version: { type: "string" },
        detected_version: { type: ["string", "null"] },
        tested_revision: { type: "string" },
        revision_verification: { type: "string" },
        version_verification: { type: "string" },
        command_surface: { type: "object", additionalProperties: true },
        capabilities: { type: "array", items: { type: "string" } },
        available: { type: "boolean" },
        compatibility_status: {
          enum: ["tested", "compatible-unverified", "incompatible", "unavailable"],
        },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: false,
};

const capabilityContractSchema = {
  type: "object",
  required: ["name", "supported", "schema_versions", "cli_available", "snapshot_modes", "bounded_path_groups"],
  properties: {
    name: { type: "string", maxLength: 128 },
    supported: { type: "boolean" },
    schema_versions: { type: "array", maxItems: 8, items: { type: "integer" } },
    cli_available: { type: "boolean" },
    snapshot_modes: { type: "array", maxItems: 4, items: { type: "string", maxLength: 128 } },
    bounded_path_groups: { type: "boolean" },
  },
  additionalProperties: false,
};

const capabilitiesOutputSchema = {
  type: "object",
  required: ["ok", "tool", "core_version", "contracts", "truncated", "provenance", "integration_status"],
  properties: {
    ok: { type: "boolean" },
    tool: { const: "aidisk_capabilities" },
    core_version: { type: ["string", "null"], maxLength: 64 },
    contracts: { type: "array", maxItems: 16, items: capabilityContractSchema },
    truncated: { type: "boolean" },
    provenance: {
      type: "object",
      required: ["source", "command", "core_contract", "schema_version"],
      properties: {
        source: { const: "ai-disk-doctor-core-cli" },
        command: { const: ["capabilities", "--json"] },
        core_contract: { const: "agent-capabilities-v1" },
        schema_version: { type: ["integer", "null"] },
      },
      additionalProperties: false,
    },
    integration_status: {
      type: "object",
      required: ["compatible", "status", "required"],
      properties: {
        compatible: { type: "boolean" },
        status: { type: "string", maxLength: 64 },
        required: { type: "object", additionalProperties: { type: "boolean" } },
        reasons: { type: "array", maxItems: 16, items: { type: "string", maxLength: 512 } },
      },
      additionalProperties: false,
    },
    error: {
      type: "object",
      required: ["type", "message", "details"],
      properties: {
        type: { type: "string", maxLength: 128 },
        message: { type: "string", maxLength: 512 },
        details: { type: "object", additionalProperties: true },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

const boundedScanOutputSchema = {
  type: "object",
  required: [
    "ok",
    "tool",
    "provenance",
    "volumes",
    "summary",
    "top_findings",
    "total_findings",
    "returned_findings",
    "truncated",
  ],
  properties: {
    ok: { const: true },
    tool: { const: "scan_summary" },
    provenance: provenanceSchema,
    scan_time: { type: ["string", "null"] },
    policy: { type: ["object", "null"] },
    volumes: { type: "array", items: { type: "object", additionalProperties: true } },
    summary: { type: "object", additionalProperties: true },
    top_findings: {
      type: "array",
      maxItems: 25,
      items: {
        type: "object",
        required: ["top_finding", "finding", "matched_core_finding"],
        properties: {
          top_finding: { type: "object", additionalProperties: true },
          finding: { type: ["object", "null"], additionalProperties: true },
          matched_core_finding: { type: "boolean" },
        },
        additionalProperties: false,
      },
    },
    total_findings: { type: "integer", minimum: 0 },
    returned_findings: { type: "integer", minimum: 0, maximum: 25 },
    truncated: { type: "boolean" },
  },
  additionalProperties: false,
};

const boundedInventoryOutputSchema = {
  type: "object",
  required: [
    "ok",
    "tool",
    "provenance",
    "summary",
    "roots",
    "assets",
    "total_assets",
    "returned_assets",
    "truncated",
  ],
  properties: {
    ok: { const: true },
    tool: { const: "ai_model_inventory" },
    provenance: provenanceSchema,
    schema_version: { type: ["integer", "null"] },
    generated_at: { type: ["string", "null"] },
    stale_after_days: { type: ["integer", "null"] },
    summary: { type: "object", additionalProperties: true },
    roots: { type: "array", items: { type: "object", additionalProperties: true } },
    assets: { type: "array", maxItems: 25, items: { type: "object", additionalProperties: true } },
    total_assets: { type: "integer", minimum: 0 },
    returned_assets: { type: "integer", minimum: 0, maximum: 25 },
    truncated: { type: "boolean" },
  },
  additionalProperties: false,
};

const boundedDiffOutputSchema = {
  type: "object",
  required: [
    "ok",
    "tool",
    "provenance",
    "summary",
    "changes",
    "total_changes",
    "returned_changes",
    "truncated",
  ],
  properties: {
    ok: { const: true },
    tool: { const: "latest_diff" },
    provenance: provenanceSchema,
    generated_at: { type: ["string", "null"] },
    before: { type: ["string", "null"] },
    after: { type: ["string", "null"] },
    summary: { type: "object", additionalProperties: true },
    changes: { type: "array", maxItems: 50, items: { type: "object", additionalProperties: true } },
    total_changes: { type: "integer", minimum: 0 },
    returned_changes: { type: "integer", minimum: 0, maximum: 50 },
    truncated: { type: "boolean" },
  },
  additionalProperties: false,
};

export const TOOL_DEFINITIONS = [
  {
    name: "aidisk_capabilities",
    title: "AI Disk Doctor Capabilities",
    description:
      "Discover the local AI Disk Doctor machine-readable capability contract and report whether the future explainability gate is compatible. This performs no scan and does not modify files.",
    inputSchema: { ...objectSchema, properties: {} },
    outputSchema: capabilitiesOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "core_status",
    title: "AI Disk Doctor Core Status",
    description:
      "Check local AI Disk Doctor Core availability, required command surface, semantic version, and compatibility provenance without scanning or modifying files.",
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
      "Run AI Disk Doctor's existing non-destructive scan and return a bounded projection of Core JSON evidence. The current Core CLI may persist an AI Disk Doctor-owned snapshot under .aidisk/reports; it does not mutate user files.",
    inputSchema: {
      ...objectSchema,
      properties: {
        category: {
          type: "string",
          minLength: 1,
          maxLength: 128,
          description: "Optional Core rule category filter. The integration validates only bounds; Core owns category semantics.",
        },
      },
    },
    outputSchema: boundedScanOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "ai_model_inventory",
    title: "AI Model And Cache Inventory",
    description:
      "Use AI Disk Doctor's existing metadata-only model inventory with Core defaults and return a bounded asset projection. It does not read model, prompt, source, token, or credential contents and does not mutate files.",
    inputSchema: {
      ...objectSchema,
      properties: {
        tool: {
          type: "string",
          enum: ["auto", "ollama", "huggingface", "lm-studio", "generic"],
          description: "Optional Core inventory tool selector.",
        },
      },
    },
    outputSchema: boundedInventoryOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "latest_diff",
    title: "AI Disk Doctor Latest Diff",
    description:
      "Use Core-owned latest snapshot discovery and diff semantics through aidisk diff --latest --json. No reports directory or paths are accepted from the model.",
    inputSchema: { ...objectSchema, properties: {} },
    outputSchema: boundedDiffOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];

export const TOOL_NAMES = new Set(TOOL_DEFINITIONS.map((tool) => tool.name));
