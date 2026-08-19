import {
  coreStatus as getCoreStatus,
  modelInventory,
  scanHistory as getScanHistory,
  scanSummary as getScanSummary,
} from "./core.js";

export async function coreStatus(args = {}) {
  if (Object.keys(args).length > 0) {
    throw new Error("core_status does not accept arguments");
  }
  return getCoreStatus();
}

export async function scanSummary(args) {
  const report = await getScanSummary(args);
  return {
    ok: true,
    source: "ai-disk-doctor-core",
    mode: "read-only",
    report,
  };
}

export async function aiModelInventory(args) {
  const report = await modelInventory(args);
  return {
    ok: true,
    source: "ai-disk-doctor-core",
    mode: "read-only",
    report,
  };
}

export async function scanHistory(args) {
  return {
    ok: true,
    source: "ai-disk-doctor-core-snapshot-metadata",
    mode: "read-only",
    ...getScanHistory(args),
  };
}
