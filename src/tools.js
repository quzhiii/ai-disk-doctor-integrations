import {
  TESTED_CORE_REVISION,
  TESTED_CORE_VERSION,
  coreStatus as getCoreStatus,
  latestDiffInvocation as getLatestDiffInvocation,
  modelInventoryInvocation,
  scanSummaryInvocation as getScanSummaryInvocation,
} from "./core.js";

export const SCAN_FINDING_LIMIT = 25;
export const MODEL_ASSET_LIMIT = 25;
export const DIFF_CHANGE_LIMIT = 50;
export const MCP_TEXT_LIMIT = 2_000;

function provenance(command, sideEffects = []) {
  return {
    source: "ai-disk-doctor-core-cli",
    command: [...command],
    tested_core_version: TESTED_CORE_VERSION,
    tested_core_revision: TESTED_CORE_REVISION,
    side_effects: sideEffects,
  };
}

function textSummary(value) {
  const lines = [
    `ok=${value.ok}`,
    `tool=${value.tool}`,
    `source=${value.provenance?.source || value.source || "unknown"}`,
  ];
  if (value.total_findings !== undefined) {
    lines.push(`findings=${value.returned_findings}/${value.total_findings}`);
  }
  if (value.total_assets !== undefined) {
    lines.push(`assets=${value.returned_assets}/${value.total_assets}`);
  }
  if (value.total_changes !== undefined) {
    lines.push(`changes=${value.returned_changes}/${value.total_changes}`);
  }
  if (value.storage_summary?.total_size_bytes !== undefined) {
    lines.push(`total_size_bytes=${value.storage_summary.total_size_bytes}`);
  }
  if (value.evidence_status?.status !== undefined) {
    lines.push(`evidence_status=${value.evidence_status.status}`);
  }
  if (value.handling_recommendation?.categories !== undefined) {
    lines.push(`categories=${value.handling_recommendation.categories.length}`);
  }
  if (value.truncated !== undefined) {
    lines.push(`truncated=${value.truncated}`);
  }
  return lines.join("\n").slice(0, MCP_TEXT_LIMIT);
}

function matchFinding(findings, topFinding) {
  return findings.find((finding) => finding.id === topFinding.id && finding.path === topFinding.path) || null;
}

export function projectScanReport(invocation, { findingLimit = SCAN_FINDING_LIMIT } = {}) {
  const { report, argv } = invocation;
  const topFindings = Array.isArray(report.summary?.top_findings)
    ? report.summary.top_findings.slice(0, findingLimit)
    : [];
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const projectedFindings = topFindings.map((top) => ({
    top_finding: top,
    finding: matchFinding(findings, top),
    matched_core_finding: matchFinding(findings, top) !== null,
  }));
  return {
    ok: true,
    tool: "scan_summary",
    provenance: provenance(argv, [
      "current Core CLI scan persists a Core-owned .aidisk/reports/scan-*.json snapshot",
    ]),
    scan_time: report.scan_time,
    policy: report.policy,
    volumes: report.volumes || [],
    summary: report.summary || {},
    top_findings: projectedFindings,
    total_findings: findings.length,
    returned_findings: projectedFindings.length,
    truncated: findings.length > projectedFindings.length,
  };
}

export function projectModelInventory(invocation, { assetLimit = MODEL_ASSET_LIMIT } = {}) {
  const { report, argv } = invocation;
  const assets = Array.isArray(report.assets) ? report.assets : [];
  const projectedAssets = assets.slice(0, assetLimit);
  return {
    ok: true,
    tool: "ai_model_inventory",
    provenance: provenance(argv),
    schema_version: report.schema_version,
    generated_at: report.generated_at,
    stale_after_days: report.stale_after_days,
    summary: report.summary || {},
    roots: report.roots || [],
    assets: projectedAssets,
    total_assets: assets.length,
    returned_assets: projectedAssets.length,
    truncated: assets.length > projectedAssets.length,
  };
}

export function projectLatestDiff(invocation, { changeLimit = DIFF_CHANGE_LIMIT } = {}) {
  const { report, argv } = invocation;
  const changes = Array.isArray(report.changes) ? report.changes : [];
  const projectedChanges = changes.slice(0, changeLimit);
  return {
    ok: true,
    tool: "latest_diff",
    provenance: provenance(argv),
    generated_at: report.generated_at,
    before: report.before,
    after: report.after,
    summary: report.summary || {},
    changes: projectedChanges,
    total_changes: changes.length,
    returned_changes: projectedChanges.length,
    truncated: changes.length > projectedChanges.length,
  };
}

export function contentFor(value) {
  return [{ type: "text", text: textSummary(value) }];
}

export async function coreStatus(args = {}) {
  if (Object.keys(args).length > 0) {
    throw new Error("core_status does not accept arguments");
  }
  return getCoreStatus();
}

export async function scanSummary(args) {
  return projectScanReport(await getScanSummaryInvocation(args));
}

export async function aiModelInventory(args) {
  return projectModelInventory(await modelInventoryInvocation(args));
}

export async function latestDiff(args = {}) {
  if (Object.keys(args).length > 0) {
    throw new Error("latest_diff does not accept arguments");
  }
  return projectLatestDiff(await getLatestDiffInvocation());
}
