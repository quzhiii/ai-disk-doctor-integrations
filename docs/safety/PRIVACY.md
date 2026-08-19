# Privacy Boundary

Date: 2026-08-19

AI Disk Doctor Integrations performs no cloud upload, telemetry, billing, account lookup, or remote synchronization.

## What MCP Results May Expose

Tool results may enter the configured host Agent/model context. Depending on the Core response, this can include:

- local paths
- file or directory sizes
- volume names and mount points
- categories
- Core risk/action/reason/warning fields
- partial scan status and partial reasons
- model asset metadata such as logical name, manager, format, stale status, and Core recommendations
- latest diff paths and byte deltas from Core snapshots

## What This Integration Does Not Return

The integration does not read or return:

- prompt contents
- transcript contents
- source code contents
- document contents
- credentials
- cookies or tokens
- model binary contents
- arbitrary files selected by the model

## Boundaries

- Core owns scanning and inventory semantics.
- The integration bounds returned findings, assets, diff changes, Core stdout/stderr capture, error evidence, and text content.
- The host Agent may still transmit MCP metadata to whatever model/provider the user configured. This is outside the integration repository’s control.
