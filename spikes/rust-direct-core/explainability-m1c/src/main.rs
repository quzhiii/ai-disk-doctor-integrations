use std::fs;
use std::path::{Path, PathBuf};

use aidisk::application::{
    run_explainable_scan, run_explainable_scan_with_progress, ScanRequest, SnapshotPersistence,
};
use anyhow::{Context, Result};

const CORE_REVISION: &str = "33d741130b9c2bdd386cb96a25e0f7c70dd1bce7";
const EXPECTED_CONTRACT: &str = "explainability-v1";
const EXPECTED_SCHEMA_VERSION: u16 = 1;
const EXPECTED_PATH_GROUP_LIMIT: usize = 50;
const PATH_GROUP_COUNT: usize = 55;

fn main() -> Result<()> {
    let temp = tempfile::tempdir().context("temp workspace")?;
    let workspace = temp.path();
    let rules_dir = workspace.join("rules");
    let cache_root = workspace.join("cache");
    let policy_path = workspace.join("config").join("policy.yaml");
    let reports_dir = workspace.join("reports");

    fs::create_dir_all(&rules_dir)?;
    fs::create_dir_all(&cache_root)?;
    fs::create_dir_all(policy_path.parent().expect("policy has parent"))?;

    let mut paths = Vec::new();
    for index in 0..PATH_GROUP_COUNT {
        let path = cache_root.join(format!("path-{index:02}"));
        fs::create_dir_all(&path)?;
        fs::write(path.join("artifact.bin"), vec![0_u8; index + 1])?;
        paths.push(path);
    }
    write_policy(&policy_path)?;
    write_rule(&rules_dir.join("explainability.yaml"), &paths)?;

    let request = scan_request(&rules_dir, &policy_path, &reports_dir, workspace);
    let result = run_explainable_scan(request.clone()).context("run_explainable_scan")?;
    let mut progress_events = Vec::new();
    let progress_result = run_explainable_scan_with_progress(request, |event| {
        progress_events.push(format!(
            "{}/{}:{}",
            event.current, event.total, event.rule_id
        ));
    })
    .context("run_explainable_scan_with_progress")?;

    assert!(result.scan.snapshot_path.is_none());
    assert!(progress_result.scan.snapshot_path.is_none());
    assert!(
        !reports_dir.exists(),
        "SnapshotPersistence::Skip must not create scan snapshots"
    );
    assert_eq!(result.explainability.contract, EXPECTED_CONTRACT);
    assert_eq!(
        result.explainability.schema_version,
        EXPECTED_SCHEMA_VERSION
    );
    assert_eq!(result.scan.report.summary.schema_version, 2);
    assert_eq!(result.scan.report.summary.matched_paths, PATH_GROUP_COUNT);
    assert_eq!(result.explainability.categories.len(), 1);

    let category = &result.explainability.categories[0];
    assert_eq!(category.rules.len(), 1);
    let rule = &category.rules[0];
    assert_eq!(rule.path_group_summary.total_path_groups, PATH_GROUP_COUNT);
    assert_eq!(
        rule.path_group_summary.included_path_groups,
        EXPECTED_PATH_GROUP_LIMIT
    );
    assert_eq!(rule.path_group_summary.omitted_path_groups, 5);
    assert_eq!(rule.path_group_summary.omitted_bytes, 15);
    assert_eq!(rule.path_group_summary.limit, EXPECTED_PATH_GROUP_LIMIT);
    assert_eq!(rule.path_groups.len(), EXPECTED_PATH_GROUP_LIMIT);
    assert_eq!(result.explainability.storage.observed_bytes, sum_bytes());
    assert_eq!(result.explainability.storage.report_only_bytes, sum_bytes());
    assert!(
        result
            .explainability
            .accounting
            .category_sum_matches_storage
    );
    assert!(result.explainability.accounting.rule_sum_matches_category);
    assert!(result.explainability.accounting.path_group_sum_matches_rule);
    assert!(
        result
            .explainability
            .accounting
            .partial_bytes_excluded_from_handling_totals
    );
    assert!(!progress_events.is_empty());

    let output = serde_json::json!({
        "ok": true,
        "core_revision": CORE_REVISION,
        "functions_tested": [
            "run_explainable_scan",
            "run_explainable_scan_with_progress"
        ],
        "contract": result.explainability.contract,
        "explainability_schema_version": result.explainability.schema_version,
        "scan_schema_version": result.scan.report.summary.schema_version,
        "scan_matched_paths": result.scan.report.summary.matched_paths,
        "snapshot_path": result.scan.snapshot_path,
        "reports_dir_exists_after_skip": reports_dir.exists(),
        "progress_events": progress_events,
        "storage": {
            "observed_bytes": result.explainability.storage.observed_bytes,
            "report_only_bytes": result.explainability.storage.report_only_bytes,
            "partial_bytes": result.explainability.storage.partial_bytes
        },
        "accounting": result.explainability.accounting,
        "evidence": result.explainability.evidence,
        "path_group_summary": rule.path_group_summary,
        "first_path_group": rule.path_groups.first(),
        "rule_risk": rule.risk,
        "rule_handling_mode": rule.handling_mode,
        "rule_provenance": rule.provenance,
        "rule_recoverability": rule.recoverability,
        "semantic_source": "Core ExplainableScanResult fields; spike assertions verify invariants without re-deriving risk, handling, recoverability, provenance, or action eligibility"
    });
    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}

fn scan_request(
    rules_dir: &Path,
    policy_path: &Path,
    reports_dir: &Path,
    workspace: &Path,
) -> ScanRequest {
    ScanRequest {
        rules_dir: Some(rules_dir.to_path_buf()),
        rules_repo: None,
        category: Some("m1c-spike".to_string()),
        policy: Some(policy_path.to_path_buf()),
        default_rules_dir: workspace.join("unused-rules"),
        default_policy_path: workspace.join("unused-policy.yaml"),
        reports_dir: Some(reports_dir.to_path_buf()),
        persist_snapshot: SnapshotPersistence::Skip,
    }
}

fn write_policy(policy_path: &Path) -> Result<()> {
    fs::write(
        policy_path,
        r#"sensitive_markers:
  - token
  - credential
  - secret
planner:
  skip_modified_within_minutes: 30
  allow_actions:
    - quarantine
    - report-only
    - guide
  max_scan_depth: 20
"#,
    )?;
    Ok(())
}

fn write_rule(rule_path: &Path, paths: &[PathBuf]) -> Result<()> {
    let detector_paths = paths
        .iter()
        .map(|path| format!("    - '{}'", yaml_single_quote(&path.display().to_string())))
        .collect::<Vec<_>>()
        .join("\n");
    fs::write(
        rule_path,
        format!(
            r#"schema_version: 2
id: m1c-explainability-path-groups
name: M1C Explainability Path Groups
category: m1c-spike
platform: cross-platform
detector:
  paths:
{detector_paths}
  evidence:
    - spike-generated-path-patterns
data_kind: generated-cache-fixture
recoverability: redownload
sensitivity: none
default_liveness: inactive-fixture
decision:
  risk: review
  confidence: high
action:
  type: report-only
  adapter: none
  supports_dry_run: true
  supports_rollback: false
content_access: metadata-only
reason: "M1C explainability spike fixture"
warnings:
  - "spike warning from rule metadata"
"#
        ),
    )?;
    Ok(())
}

fn yaml_single_quote(value: &str) -> String {
    value.replace('\'', "''")
}

fn sum_bytes() -> u64 {
    (1..=PATH_GROUP_COUNT as u64).sum()
}
