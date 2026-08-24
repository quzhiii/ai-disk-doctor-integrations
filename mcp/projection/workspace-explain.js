import { CoreError } from "../../src/core.js";

export const AGENT_DIAGNOSTIC_CLI_CONTRACT = "agent-diagnostic-cli-v1";
export const EXPLAINABILITY_CONTRACT = "explainability-v1";
export const EXPLAINABILITY_SCHEMA_VERSION = 1;
export const MAX_EXPLAIN_STRING = 256;
export const MAX_EXPLAIN_WARNINGS = 16;
export const MAX_EXPLAIN_CATEGORIES = 16;
export const MAX_EXPLAIN_RULES = 32;

const STORAGE_FIELDS = [
  "observed_bytes",
  "total_size_bytes",
  "potential_bytes",
  "actionable_bytes",
  "quarantine_bytes",
  "official_cleanup_bytes",
  "report_only_bytes",
  "partial_bytes",
  "reclaimable_safe_bytes",
  "safe_bytes",
  "review_bytes",
  "dangerous_bytes",
  "system_bytes",
];

const HANDLING_FIELDS = ["quarantine_bytes", "official_cleanup_bytes", "report_only_bytes", "partial_bytes"];

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedString(value, limit = MAX_EXPLAIN_STRING) {
  return typeof value === "string" ? value.slice(0, limit) : null;
}

function requireObject(value, message) {
  if (!isObject(value)) throw new CoreError(message);
  return value;
}

function requireString(value, message) {
  if (typeof value !== "string") throw new CoreError(message);
  return value;
}

function requireInteger(value, message) {
  if (!Number.isInteger(value) || value < 0) throw new CoreError(message);
  return value;
}

function validateCoreExplainResponse(report) {
  requireObject(report, "Core explain response is not an object");
  if (report.ok !== true || report.command !== "explain") {
    throw new CoreError("Core explain response has an invalid envelope");
  }
  if (report.contract !== AGENT_DIAGNOSTIC_CLI_CONTRACT || report.schema_version !== 1) {
    throw new CoreError("Core explain CLI contract is unsupported");
  }
  requireString(report.core_version, "Core explain response is missing core_version");
  const snapshot = requireObject(report.snapshot, "Core explain response is missing snapshot metadata");
  if (snapshot.requested !== "skip" || snapshot.persisted !== false || snapshot.path !== null) {
    throw new CoreError("Core explain response violated the snapshot skip contract");
  }

  const explainability = requireObject(report.explainability, "Core explain response is missing explainability");
  if (
    explainability.contract !== EXPLAINABILITY_CONTRACT
    || explainability.schema_version !== EXPLAINABILITY_SCHEMA_VERSION
  ) {
    throw new CoreError("Core explainability contract is unsupported");
  }
  const storage = requireObject(explainability.storage, "Core explain response is missing storage");
  for (const field of STORAGE_FIELDS) requireInteger(storage[field], `Core storage field '${field}' is invalid`);

  const evidence = requireObject(explainability.evidence, "Core explain response is missing evidence");
  if (!['complete', 'partial'].includes(evidence.status)) {
    throw new CoreError("Core evidence status is invalid");
  }
  requireInteger(evidence.partial_findings, "Core partial_findings is invalid");
  if (!Array.isArray(evidence.warnings)) throw new CoreError("Core evidence warnings are invalid");
  for (const warning of evidence.warnings) {
    requireObject(warning, "Core evidence warning is invalid");
    requireString(warning.code, "Core evidence warning code is invalid");
    requireString(warning.message, "Core evidence warning message is invalid");
  }

  if (!Array.isArray(explainability.categories)) throw new CoreError("Core categories are invalid");
  for (const category of explainability.categories) {
    requireObject(category, "Core category is invalid");
    requireString(category.category_id, "Core category_id is invalid");
    requireString(category.category_name, "Core category_name is invalid");
    const handling = requireObject(category.handling, "Core category handling is invalid");
    for (const field of HANDLING_FIELDS) requireInteger(handling[field], `Core handling field '${field}' is invalid`);
    if (!Array.isArray(category.rules)) throw new CoreError("Core category rules are invalid");
    for (const rule of category.rules) {
      requireObject(rule, "Core rule is invalid");
      requireString(rule.rule_id, "Core rule_id is invalid");
      requireString(rule.rule_name, "Core rule_name is invalid");
      requireString(rule.handling_mode, "Core handling_mode is invalid");
    }
  }
  return report;
}

function projectStorage(storage) {
  return Object.fromEntries(STORAGE_FIELDS.map((field) => [field, storage[field]]));
}

function projectEvidence(evidence) {
  return {
    status: evidence.status,
    partial_findings: evidence.partial_findings,
    warnings: evidence.warnings.slice(0, MAX_EXPLAIN_WARNINGS).map((warning) => ({
      code: boundedString(warning.code),
      message: boundedString(warning.message),
    })),
    truncated: evidence.warnings.length > MAX_EXPLAIN_WARNINGS,
  };
}

function projectHandling(categories) {
  const projectedCategories = categories.slice(0, MAX_EXPLAIN_CATEGORIES).map((entry) => ({
    category_id: boundedString(entry.category_id),
    category_name: boundedString(entry.category_name),
    handling: Object.fromEntries(HANDLING_FIELDS.map((field) => [field, entry.handling[field]])),
    rules: entry.rules.slice(0, MAX_EXPLAIN_RULES).map((rule) => ({
      rule_id: boundedString(rule.rule_id),
      rule_name: boundedString(rule.rule_name),
      handling_mode: boundedString(rule.handling_mode),
    })),
    truncated: entry.rules.length > MAX_EXPLAIN_RULES,
  }));
  return {
    categories: projectedCategories,
    truncated: categories.length > MAX_EXPLAIN_CATEGORIES,
  };
}

export function projectWorkspaceExplain({ report, category = null }) {
  validateCoreExplainResponse(report);
  const explainability = report.explainability;
  return {
    ok: true,
    tool: "aidisk_workspace_explain",
    status: explainability.evidence.status,
    category,
    storage_summary: projectStorage(explainability.storage),
    evidence_status: projectEvidence(explainability.evidence),
    handling_recommendation: projectHandling(explainability.categories),
    error: null,
  };
}

export function workspaceExplainError(type, message, category = null) {
  return {
    ok: false,
    tool: "aidisk_workspace_explain",
    status: type,
    category,
    storage_summary: null,
    evidence_status: null,
    handling_recommendation: null,
    error: {
      type,
      message: boundedString(message, 512) || "Workspace explanation failed",
      details: {
        contract: EXPLAINABILITY_CONTRACT,
        schema_version: EXPLAINABILITY_SCHEMA_VERSION,
      },
    },
  };
}

export function classifyWorkspaceExplainError(error) {
  if (error?.name === "CoreError" && error.message.includes("unavailable")) return "core_unavailable";
  if (
    error?.name === "CoreError"
    && (error.message.includes("contract is unsupported") || error.message.includes("snapshot skip contract"))
  ) return "contract_unavailable";
  if (error?.name === "CoreError") return "invalid_core_response";
  return "projection_failed";
}
