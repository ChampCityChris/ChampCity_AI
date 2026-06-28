# Main IPC

Future Work Card file operations belong here.

Rules:

- Renderer code must not receive broad filesystem access.
- IPC handlers must validate requested paths against approved planning roots.
- Approved roots are `planning/work/`, `planning/project/`, and `planning/phases/`.
- No live LLM, MCP, connector, auth, database, cloud, or deployment integrations are part of the MVP foundation.
