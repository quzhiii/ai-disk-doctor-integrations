use std::fs;
use std::path::PathBuf;

use aidisk::application::{
    inventory_assets, read_history, run_scan, ApplicationInventoryTool, AssetInventoryRequest,
    HistoryRequest, ScanRequest, SnapshotPersistence,
};
use anyhow::{Context, Result};

fn main() -> Result<()> {
    let temp = tempfile::tempdir().context("temp workspace")?;
    let workspace = temp.path();
    let rules_dir = workspace.join("rules");
    let cache_dir = workspace.join("cache");
    let policy_path = workspace.join("config").join("policy.yaml");
    fs::create_dir_all(&rules_dir)?;
    fs::create_dir_all(&cache_dir)?;
    fs::create_dir_all(policy_path.parent().expect("policy has parent"))?;
    fs::write(cache_dir.join("artifact.bin"), vec![0_u8; 32])?;
    fs::write(
        rules_dir.join("cache.yaml"),
        format!(
            r#"id: rust-direct-core-spike
name: Rust Direct Core Spike
category: spike
platform: cross-platform
paths:
  - '{}'
risk: review
cleanup:
  method: report-only
exclusions: []
reason: "spike fixture"
warnings: []
"#,
            cache_dir.display()
        ),
    )?;
    fs::write(
        &policy_path,
        r#"sensitive_markers:
  - token
planner:
  skip_modified_within_minutes: 30
  allow_actions:
    - quarantine
    - report-only
    - guide
  max_scan_depth: 20
"#,
    )?;

    let reports_dir = workspace.join("reports");
    let scan = run_scan(ScanRequest {
        rules_dir: Some(rules_dir.clone()),
        rules_repo: None,
        category: Some("spike".to_string()),
        policy: Some(policy_path.clone()),
        default_rules_dir: PathBuf::from("unused-rules"),
        default_policy_path: PathBuf::from("unused-policy.yaml"),
        reports_dir: Some(reports_dir.clone()),
        persist_snapshot: SnapshotPersistence::Skip,
    })?;
    assert_eq!(scan.report.summary.matched_paths, 1);
    assert!(scan.snapshot_path.is_none());
    assert!(
        !reports_dir.exists(),
        "SnapshotPersistence::Skip must not create reports dir"
    );

    let inventory = inventory_assets(AssetInventoryRequest {
        root: Some(cache_dir.clone()),
        tool: ApplicationInventoryTool::Generic,
        max_depth: 5,
        stale_after_days: 90,
    })?;

    let history = read_history(HistoryRequest {
        reports_dir: Some(reports_dir.clone()),
    })?;
    assert!(history.snapshots.is_empty());

    let result = serde_json::json!({
        "ok": true,
        "core_revision": "52f31509394d2165cba8908da00a1036ba90479d",
        "scan_matched_paths": scan.report.summary.matched_paths,
        "snapshot_path": scan.snapshot_path,
        "reports_dir_exists_after_skip": reports_dir.exists(),
        "inventory_schema_version": inventory.schema_version,
        "inventory_assets": inventory.summary.total_assets,
        "history_snapshots": history.snapshots.len(),
        "asset_packaging_observation": "direct git dependency compiles code, but runtime rules/config assets still need explicit packaging or caller-supplied paths"
    });
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}
