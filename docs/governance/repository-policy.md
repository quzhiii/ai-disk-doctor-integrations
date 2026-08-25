# Repository Governance Policy

Status: Recommended policy. It records I0.4 findings and does not change GitHub settings, CI workflows, release automation, branch permissions, tags, or package publication.

Date: 2026-08-21

## Current Observations

- `master` is the production baseline at `c8adf2f9c86b2e582146f030d611ea68c72ca27f` for I0.4.
- CI currently runs on pull requests and pushes to `master`.
- Current CI checks are `node-18-windows-latest`, `node-18-macos-latest`, `node-18-ubuntu-latest`, `node-20-ubuntu-latest`, `rust-spike-windows-latest`, `rust-spike-macos-latest`, `rust-spike-ubuntu-latest`, and `pinned-core-aidisk-smoke`.
- GitHub's branch-protection API returned `404 Branch not protected` for `master` during the I0.4 audit. This records visible API state only; an owner should verify repository settings directly before relying on it.
- No release workflow or tag policy is currently configured in this repository.

## Recommended Master Protection

Configure `master` to require pull requests and the current CI checks before merge:

- require at least one approving review;
- dismiss stale approvals when new commits are pushed;
- require the branch to be up to date before merge;
- require all eight current CI checks named above;
- block force pushes and branch deletion;
- restrict direct pushes to the smallest appropriate maintainer group;
- document any administrator bypass as an incident or emergency decision in the pull request/release record.

The owner should review required-check names whenever CI is renamed. Do not require a check that is not guaranteed to run for every pull request, and do not weaken the runtime matrix merely to simplify protection settings.

## Pull Request Policy

Every production-affecting pull request should state:

- objective, baseline SHA, head SHA, and changed files;
- Core baseline/contract assumptions and compatibility impact;
- exact verification commands and results;
- safety, privacy, persistence, and output-bound impact;
- known limitations, deferred work, and owner decisions required.

Changes touching fixed Core argv, input validation, output projections, subprocess execution, Core compatibility, Skill safety rules, or release behavior need explicit safety review. Any future filesystem mutation capability requires the separate Desktop-mediated authorization design and a high-risk review; it must not be merged through a normal Alpha documentation or packaging change.

Research proposals must label unimplemented contracts as proposed and must not silently change the advertised production tool surface.

## Release Tagging Policy

Until a release workflow is approved, use the following manual policy:

- release tags identify the package version exactly, for example `v0.1.0-alpha.2` for an Alpha package version `0.1.0-alpha.2`;
- create no release tag for research-only documentation milestones such as I0.4;
- tag only a reviewed commit on protected `master` after required CI is green;
- record the Core tested baseline, runtime compatibility limitations, Node support floor, and any Core-owned scan persistence in the release notes;
- do not imply that a package tag is a Core release or that it contains Core;
- publish an Alpha/pre-release only after an owner explicitly approves the distribution form and package contents;
- preserve existing MIT OR Apache-2.0 licensing and do not change release semantics without a dedicated release/legal decision.

If npm distribution is adopted, package version, git tag, release notes, changelog entry, and published tarball inspection must all refer to the same commit. A signed artifact/checksum policy can be added with the future release pipeline; it is not implemented by I0.4.

## Owner Decisions

The following need an owner decision before configuration or release work:

- who may merge to `master` and approve safety-critical changes;
- whether the recommended branch protection should be enabled exactly as written;
- whether Node 18 remains supported or the Alpha support floor becomes Node 20;
- whether/when npm publishing is authorized and who owns package/recovery credentials;
- whether a release workflow should create tags/packages automatically or remain manually approved;
- which client, if any, merits a verified Skill marketplace integration.
