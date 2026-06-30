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

## Durable Project Decisions

- Remote repository URL: `https://github.com/ChampCityChris/ChampCity_AI`.
- GitHub repository visibility: public.
- Human-readable app name: `ChampCity A/I`.
- Use `ChampCity A/I` for the Electron window title and package metadata where applicable.
- Frontend framework direction: start with React for post-foundation UI work because Figma will be the UI designer and React is preferred for design handoff.
- Evidence attachment policy: copy durable evidence into the repo when it is small and relevant, and also record original source paths when the file comes from outside the repo.
- Future LLM provider policy: design for provider abstraction, but do not implement SDKs yet.
- Likely future LLM providers include OpenAI API, Anthropic, local Ollama, and a generic OpenAI-compatible endpoint for providers such as Featherless or LM Studio.
- Product-facing role terminology: use `Implementer` for the coding/build agent role in visible UI, prompts, and new explanatory copy.
- Legacy artifact compatibility: existing schema fields, filenames, and folders may still use `Builder_*` names, including `Builder_Prompts`, `Builder_Reports`, and `BUILDER_REPORT_*`, until a dedicated migration Work Card updates storage paths safely.
- Historical records should not be renamed casually; when legacy Builder artifact paths are shown, explain that they are compatibility storage names for Implementer-facing work.

## Work Card Artifacts

- Every durable Work Card must be saved as both structured JSON for app workflows and rendered Markdown for human-readable planning records.
- Required JSON path pattern: `planning/phases/<phase-folder>/Work_Cards/<work_card_id>_<slug>.json`.
- Required Markdown path pattern: `planning/phases/<phase-folder>/Work_Cards/<work_card_id>_<slug>.md`.
- The JSON artifact is the structured app-readable Work Card source.
- The Markdown artifact is the durable human-readable rendering.
- Implementers/builders must not create Markdown-only Work Cards unless the prompt explicitly says it is a temporary note and not an app-selectable Work Card.

## Security

- Do not expose, request, print, or store secrets.
- Do not write API keys, tokens, credentials, or private tokens into generated artifacts.
- Do not claim validation that was not actually performed.
- Renderer code must not use unrestricted filesystem access.
- Filesystem writes must be mediated by Electron main/preload IPC and constrained to approved project planning paths.

## Validation

- Run available validation commands before reporting completion.
- If a check cannot be run, report the reason clearly.
- Required validation commands before release tags:
  - `npm run typecheck`
  - `npm run build`
  - `npm test`
  - `git status --short`
- Future validation additions: add unit tests and renderer smoke tests once those exist.

## Builder Report Artifacts

- Every Builder pass must create a Markdown Builder Report and place it in the `Builder_Reports` folder for the respective phase being worked.
- Required path pattern: `planning/phases/<phase-folder>/Builder_Reports/`.
- Required report naming convention: `BUILDER_REPORT_<work_card_or_fix_id>_<short_task_name>.md`.
- Example Work Card report: `planning/phases/phase-01/Builder_Reports/BUILDER_REPORT_WC01_work_card_schema_renderer.md`.
- Example fix/governance report: `planning/phases/phase-01/Builder_Reports/BUILDER_REPORT_FIX01_agents_report_rule.md`.
- The report must identify whether the pass was for a numbered Work Card or a simple fix/governance update.
- The report must be committed with the related work unless the prompt explicitly says not to commit.
- Each Builder Report must include:
  - Repository path inspected.
  - Git branch and remote status.
  - Files created.
  - Files modified.
  - Files intentionally not created.
  - Commands run and results.
  - Validation performed.
  - Validation skipped and reason.
  - Git actions performed, including commit hash and tag if applicable.
  - Security/secret-safety notes.
  - Blocking questions, if any.
  - Recommended next Implementer task.

## Final Report Requirements

Final Builder reports must include:

- Files changed.
- Implementation summary.
- Checks run.
- Checks skipped and why.
- Manual validation required.
- Residual risks.
