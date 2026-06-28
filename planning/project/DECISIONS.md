# Decisions

## Approved Foundation Decisions

- Use TypeScript.
- Build an Electron desktop application.
- Use npm as the package manager.
- Persist Work Cards as Markdown files in the repository.
- Store Work Cards at `planning/work/[slug]/WORK_CARD.md`.
- Store evidence at `planning/work/[slug]/evidence/`.
- Keep MVP LLM workflows manual copy/paste initially.
- Add provider-neutral LLM interfaces only; do not add live LLM API calls.
- Do not add provider-specific LLM SDKs.
- Keep MCP and connector integrations out of the MVP app.
- Keep production deployment automation out of MVP scope.
- Keep the foundation shell plain TypeScript/DOM without a frontend framework.
