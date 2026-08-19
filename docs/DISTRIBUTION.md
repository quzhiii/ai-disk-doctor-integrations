# Distribution And Commercial Boundary

This repository distributes the open local Skill and non-destructive diagnostic MCP adapter. It contains no billing, entitlement, account, telemetry, cloud upload, or vendor-specific paid logic.

Future Pro capabilities can be surfaced without putting payment logic into every Agent wrapper by having the Core report a local capability/edition status in a stable contract. The universal MCP server can then expose that status as evidence, while each thin adapter continues to forward the same tools. No entitlement mechanism is implemented in I0.

The commercial Desktop remains a separate product and repository. It may own human review and one-time authorization for future mutation, but it must reuse Core execution truth.
