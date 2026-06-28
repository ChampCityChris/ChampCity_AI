# ChampCity_AI Builder Rules

## Source of Truth

- Verify the workspace path before editing. The approved workspace is `C:\Users\chapm\Projects\ChampCity_AI`.
- Treat repository files, planning files, and approved Work Cards as the source of truth.
- Do not rely on vague chat context when a durable project file exists.
- Planning artifacts live under `planning/`.

## Scope Control

- Do not broaden the approved Work Card scope.
- Do not implement unrelated refactors.
- Do not add dependencies without approval beyond the approved Electron + TypeScript foundation.
- Do not add authentication, databases, cloud services, deployment automation, MCP integrations, connector integrations, or provider-specific LLM SDKs for the MVP foundation.

## Security

- Do not expose, request, print, or store secrets.
- Do not write API keys, tokens, credentials, or private tokens into generated artifacts.
- Do not claim validation that was not actually performed.
- Renderer code must not use unrestricted filesystem access.
- Filesystem writes must be mediated by Electron main/preload IPC and constrained to approved project planning paths.

## Validation

- Run available validation commands before reporting completion.
- If a check cannot be run, report the reason clearly.
- Current foundation validation is typecheck/build focused until unit tests are added.

## Final Report Requirements

Final Builder reports must include:

- Files changed.
- Implementation summary.
- Checks run.
- Checks skipped and why.
- Manual validation required.
- Residual risks.
