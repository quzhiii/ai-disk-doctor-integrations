import {
  AGENT_CAPABILITIES_CONTRACT,
  EXPLAINABILITY_CONTRACT,
  SUPPORTED_EXPLAINABILITY_SCHEMA_VERSION,
} from "../projection/capabilities.js";

function requiredState(overrides = {}) {
  return {
    core_executable: false,
    capabilities_command: false,
    explainability_contract: false,
    schema_version: false,
    snapshot_skip: false,
    bounded_output: false,
    ...overrides,
  };
}

export function validateExplainabilityCompatibility(report) {
  const shapeValid = report && typeof report === "object" && !Array.isArray(report);
  if (!shapeValid) {
    return {
      compatible: false,
      status: "malformed",
      required: requiredState(),
      reasons: ["capabilities response is not an object"],
    };
  }

  const explainability = report.capabilities?.explainability;
  const contractValid = report.contract === AGENT_CAPABILITIES_CONTRACT && report.command === "capabilities";
  const schemaValid = report.schema_version === 1;
  const coreExecutable = report.ok === true && typeof report.core_version === "string";
  const explainabilityContract = explainability?.contract === EXPLAINABILITY_CONTRACT;
  const schemaVersion = Array.isArray(explainability?.schema_versions)
    && explainability.schema_versions.includes(SUPPORTED_EXPLAINABILITY_SCHEMA_VERSION);
  const snapshotSkip = Array.isArray(explainability?.snapshot_modes)
    && explainability.snapshot_modes.includes("skip");
  const boundedOutput = explainability?.bounded_path_groups === true;
  const required = requiredState({
    core_executable: coreExecutable,
    capabilities_command: contractValid && schemaValid,
    explainability_contract: explainabilityContract,
    schema_version: schemaVersion,
    snapshot_skip: snapshotSkip,
    bounded_output: boundedOutput,
  });
  const reasons = [];
  if (!coreExecutable) reasons.push("Core did not report a usable core_version");
  if (!contractValid) reasons.push("capabilities contract envelope is unsupported");
  if (!schemaValid) reasons.push("capabilities schema version is unsupported");
  if (!explainabilityContract) reasons.push("explainability-v1 is unavailable");
  if (!schemaVersion) reasons.push("supported explainability schema version is unavailable");
  if (!snapshotSkip) reasons.push("explainability snapshot skip mode is unavailable");
  if (!boundedOutput) reasons.push("bounded path-group output is unavailable");
  const compatible = Object.values(required).every(Boolean);
  return {
    compatible,
    status: compatible ? "compatible" : "incompatible",
    required,
    reasons,
  };
}
