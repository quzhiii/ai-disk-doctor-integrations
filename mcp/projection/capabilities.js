import { CoreError } from "../../src/core.js";

export const MAX_CAPABILITY_CONTRACTS = 16;
export const MAX_SCHEMA_VERSIONS = 8;
export const MAX_SNAPSHOT_MODES = 4;
export const MAX_CAPABILITY_STRING = 128;
export const AGENT_CAPABILITIES_CONTRACT = "agent-capabilities-v1";
export const EXPLAINABILITY_CONTRACT = "explainability-v1";
export const SUPPORTED_EXPLAINABILITY_SCHEMA_VERSION = 1;

function boundedString(value, limit = MAX_CAPABILITY_STRING) {
  return typeof value === "string" ? value.slice(0, limit) : null;
}

function projectCapability(name, capability) {
  if (!capability || typeof capability !== "object" || Array.isArray(capability)) return null;
  if (typeof capability.contract !== "string") return null;
  return {
    name: boundedString(capability.contract),
    supported: capability.cli_available === true,
    schema_versions: Array.isArray(capability.schema_versions)
      ? capability.schema_versions.filter((version) => Number.isInteger(version)).slice(0, MAX_SCHEMA_VERSIONS)
      : [],
    cli_available: capability.cli_available === true,
    snapshot_modes: Array.isArray(capability.snapshot_modes)
      ? capability.snapshot_modes.filter((mode) => typeof mode === "string").slice(0, MAX_SNAPSHOT_MODES)
      : [],
    bounded_path_groups: capability.bounded_path_groups === true,
  };
}

export function projectCapabilities({ report, argv }) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new CoreError("Core capabilities response was not an object");
  }
  if (report.ok !== true || report.command !== "capabilities" || report.contract !== AGENT_CAPABILITIES_CONTRACT) {
    throw new CoreError("Core capabilities response has an unsupported envelope");
  }
  if (!Number.isInteger(report.schema_version) || typeof report.core_version !== "string") {
    throw new CoreError("Core capabilities response is missing its schema or version");
  }
  if (!report.capabilities || typeof report.capabilities !== "object" || Array.isArray(report.capabilities)) {
    throw new CoreError("Core capabilities response is missing capabilities");
  }

  const contracts = Object.entries(report.capabilities)
    .map(([name, capability]) => projectCapability(name, capability))
    .filter(Boolean);
  return {
    ok: true,
    tool: "aidisk_capabilities",
    core_version: boundedString(report.core_version, 64),
    contracts: contracts.slice(0, MAX_CAPABILITY_CONTRACTS),
    truncated: contracts.length > MAX_CAPABILITY_CONTRACTS,
    provenance: {
      source: "ai-disk-doctor-core-cli",
      command: [...argv],
      core_contract: AGENT_CAPABILITIES_CONTRACT,
      schema_version: report.schema_version,
    },
  };
}

export function projectCapabilitiesError(error, { status = "unavailable", required = {} } = {}) {
  const details = {
    command: ["capabilities", "--json"],
    capability: AGENT_CAPABILITIES_CONTRACT,
  };
  if (Number.isInteger(error?.details?.code)) details.exit_code = error.details.code;
  if (typeof error?.details?.cause === "string") details.cause = error.details.cause.slice(0, 512);
  return {
    ok: false,
    tool: "aidisk_capabilities",
    core_version: null,
    contracts: [],
    truncated: false,
    provenance: {
      source: "ai-disk-doctor-core-cli",
      command: ["capabilities", "--json"],
      core_contract: AGENT_CAPABILITIES_CONTRACT,
      schema_version: null,
    },
    integration_status: {
      compatible: false,
      status,
      required,
    },
    error: {
      type: error?.name === "CoreError" ? "core-capabilities-error" : "capabilities-error",
      message: typeof error?.message === "string" ? error.message.slice(0, 512) : "Core capabilities failed",
      details,
    },
  };
}
