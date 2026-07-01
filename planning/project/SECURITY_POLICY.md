# Security Policy

- Do not store secrets in repo artifacts.
- Do not perform automated code execution without approval.
- Do not add MCP or connector integrations to the Alpha app without a dedicated approved Work Card.
- Do not write credentials into Work Cards, `AGENTS.md`, logs, generated prompts, or generated artifacts.
- Route authentication, payments, data deletion, migrations, secrets, production, and compliance changes as High Risk.
- Electron filesystem writes must be constrained to approved planning paths.
- The Electron renderer process must use context isolation and no unrestricted Node integration.
- Future file writes must be mediated by Electron main/preload IPC.
