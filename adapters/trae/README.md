# TRAE Adapter Status

TRAE publishes MCP and Skills documentation, but no locally installed TRAE client was available for I0 validation. This adapter intentionally does not guess a project configuration filename or manifest shape.

When the exact client contract is verified, its thin adapter must launch the same local `node /absolute/path/to/src/server.js` process, set the working directory to the user workspace, and reference the canonical `skills/ai-disk-doctor` folder. It must not add vendor-specific governance, scanning, risk, cleanup, or recovery logic.
