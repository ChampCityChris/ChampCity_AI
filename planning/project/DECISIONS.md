# Decisions

## Approved Project Decisions

- Use TypeScript.
- Build an Electron desktop application.
- Use npm as the package manager.
- Human-readable app name: `ChampCity A/I`.
- Use React for post-foundation UI work.
- Persist planning artifacts as paired Markdown and JSON files in the repository where app workflows need structured reuse.
- Keep current LLM workflows manual copy/paste until a dedicated provider Work Card is approved.
- Add provider-neutral LLM interfaces only; do not add live LLM API calls.
- Do not add provider-specific LLM SDKs.
- Keep MCP and connector integrations out of the Alpha app unless a dedicated Work Card approves them.
- Keep production deployment automation out of the Alpha app unless a dedicated Work Card approves it.
- Use Operator, Architect, and Implementer in product-facing terminology.
- Preserve legacy `Builder_*` storage paths and historical artifact names until a dedicated migration Work Card changes them safely.
- Remote repository URL: `https://github.com/ChampCityChris/ChampCity_AI`.
- GitHub repository visibility: public.
- Evidence attachment policy: copy durable evidence into the repo when it is small and relevant, and also record original source paths when files come from outside the repo.
