# Platform Compatibility

The integration uses Node.js stdio and passes local arguments to the Core executable. The Core release baseline supports Windows, Linux, and macOS.

| Platform | Local process | Core path override | I0 status |
|---|---|---|---|
| Windows | `node` + `aidisk.exe` | `AIDISK_EXE` | Supported by design; smoke-tested on Windows host |
| Linux | `node` + `aidisk` | `AIDISK_EXE` | Supported by design; CI syntax/tests only in this alpha |
| macOS | `node` + `aidisk` | `AIDISK_EXE` | Supported by design; CI syntax/tests only in this alpha |

Path arguments are forwarded as individual process arguments, not interpolated into a shell command. Use absolute paths in vendor configuration when a GUI-launched client has a different `PATH`.
