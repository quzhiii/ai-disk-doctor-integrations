import { explainInvocation } from "../../adapters/core/explain.js";
import { aidiskCapabilities } from "./aidisk-capabilities.js";
import { validateKnownArguments, validateReadOnlyArguments } from "../../src/core.js";
import {
  classifyWorkspaceExplainError,
  projectWorkspaceExplain,
  workspaceExplainError,
} from "../projection/workspace-explain.js";

const MAX_CATEGORY_LENGTH = 128;
function validateCategory(category) {
  if (category === undefined) return null;
  if (typeof category !== "string" || !category.trim() || category.length > MAX_CATEGORY_LENGTH) {
    throw new Error("category must be a non-empty string of at most 128 characters");
  }
  if (category.includes("\0") || [...category].some((char) => char.charCodeAt(0) < 0x20)) {
    throw new Error("category contains unsupported control characters");
  }
  return category.trim();
}

function compatibilityError(category, capability) {
  const integrationStatus = capability.integration_status || {};
  return {
    ok: false,
    tool: "aidisk_workspace_explain",
    status: "contract_unavailable",
    category,
    storage_summary: null,
    evidence_status: null,
    handling_recommendation: null,
    error: {
      type: "contract_unavailable",
      message: "AI Disk Doctor explainability contract is unavailable or unsupported",
      details: {
        contract: "explainability-v1",
        schema_version: 1,
        reasons: Array.isArray(integrationStatus.reasons)
          ? integrationStatus.reasons.slice(0, 8)
          : ["Core capability handshake did not pass"],
        required: integrationStatus.required || {},
      },
    },
  };
}

export async function aidiskWorkspaceExplain(args = {}, options = {}) {
  validateKnownArguments(args, ["category"]);
  validateReadOnlyArguments(args);
  const category = validateCategory(args.category);
  const capability = await aidiskCapabilities({}, options);
  if (capability.integration_status?.compatible !== true) {
    if (capability.integration_status?.status === "unavailable") {
      return workspaceExplainError("core_unavailable", "AI Disk Doctor Core is unavailable", category);
    }
    if (capability.integration_status?.status === "malformed") {
      return workspaceExplainError("invalid_core_response", "Core capabilities response is invalid", category);
    }
    return compatibilityError(category, capability);
  }

  try {
    const invocation = await explainInvocation(category === null ? {} : { category }, options);
    return projectWorkspaceExplain({ report: invocation.report, category });
  } catch (error) {
    const type = classifyWorkspaceExplainError(error);
    return workspaceExplainError(type, error.message, category);
  }
}
