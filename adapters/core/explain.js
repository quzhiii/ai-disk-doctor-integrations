import { CoreError, runCore, validateKnownArguments, validateReadOnlyArguments } from "../../src/core.js";

export const EXPLAIN_ARGV = ["explain", "--json", "--snapshot", "skip"];
const MAX_CATEGORY_LENGTH = 128;

function explainArgv(args = {}) {
  validateKnownArguments(args, ["category"]);
  validateReadOnlyArguments(args);
  const argv = [...EXPLAIN_ARGV];
  if (args.category !== undefined) {
    if (
      typeof args.category !== "string"
      || !args.category.trim()
      || args.category.length > MAX_CATEGORY_LENGTH
      || args.category.includes("\0")
      || [...args.category].some((char) => char.charCodeAt(0) < 0x20)
    ) {
      throw new CoreError("category must be a non-empty string of at most 128 characters without control characters");
    }
    argv.push("--category", args.category.trim());
  }
  return argv;
}

export function explainInvocation(args = {}, options = {}) {
  const argv = explainArgv(args);
  return runCore(argv, options).then((report) => ({ report, argv }));
}
