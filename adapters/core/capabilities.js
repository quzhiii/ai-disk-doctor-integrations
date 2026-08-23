import { runCore, validateKnownArguments, validateReadOnlyArguments } from "../../src/core.js";

export const CAPABILITIES_ARGV = ["capabilities", "--json"];

export function capabilitiesInvocation(args = {}, options = {}) {
  validateKnownArguments(args, []);
  validateReadOnlyArguments(args);
  const argv = [...CAPABILITIES_ARGV];
  return runCore(argv, options).then((report) => ({ report, argv }));
}

export const readCapabilities = capabilitiesInvocation;
