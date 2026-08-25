import { readCapabilities } from "../../adapters/core/capabilities.js";
import {
  projectCapabilities,
  projectCapabilitiesError,
} from "../projection/capabilities.js";
import { validateExplainabilityCompatibility } from "../server/compatibility.js";

export async function aidiskCapabilities(args = {}, options = {}) {
  try {
    const invocation = await readCapabilities(args, options);
    const projected = projectCapabilities(invocation);
    const integrationStatus = validateExplainabilityCompatibility(invocation.report);
    if (!integrationStatus.compatible) {
      return {
        ...projected,
        ok: false,
        integration_status: integrationStatus,
        error: {
          type: "compatibility-error",
          message: "AI Disk Doctor Core does not satisfy the explainability compatibility gate",
          details: { reasons: integrationStatus.reasons },
        },
      };
    }
    return { ...projected, integration_status: integrationStatus };
  } catch (error) {
    const status = error?.message?.includes("malformed JSON") || error?.message?.includes("response")
      ? "malformed"
      : "unavailable";
    return projectCapabilitiesError(error, { status });
  }
}
