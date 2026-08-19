# Platform Compatibility

The integration uses Node.js stdio and passes local arguments to the Core executable. The Core release baseline supports Windows, Linux, and macOS.

| Platform | Local process | Core path override | I0.1 status |
|---|---|---|---|
| Windows | `node` + `aidisk.exe` | `AIDISK_EXE` | Node protocol tests and Rust spike in CI; real Core smoke on Windows host |
| Linux | `node` + `aidisk` | `AIDISK_EXE` | Node protocol tests and Rust spike in CI |
| macOS | `node` + `aidisk` | `AIDISK_EXE` | Node protocol tests and Rust spike in CI |

No model-facing arbitrary path arguments are exposed. The MCP host configuration still needs an absolute path to `src/server.js` and may set `AIDISK_EXE` when a GUI-launched client has a different `PATH`.
