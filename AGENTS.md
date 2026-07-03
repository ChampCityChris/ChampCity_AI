# ChampCity_AI Builder Rules

## Source of Truth

- Verify the workspace path before editing. The approved workspace is `<PROJECT_REPO>`.
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

## Local Path Redaction

- Do not write concrete local machine paths into committed artifacts, Work Cards, Builder/Implementer Reports, validation records, closeout records, planning documents, or handoff prompts.
- This rule applies to both Architect and Implementer outputs.
- Use `<PROJECT_REPO>` to refer to the local repository root.
- Use repo-relative paths for files inside the project, for example `planning/phases/phase-03/Work_Cards/WC02_durable_current_required_action_model.md`.
- Architects and Implementers may verify the actual local path during execution, but committed reports must record that as "verified approved repo root" rather than printing the concrete local path.
- Do not use concrete Windows, macOS, Linux, or home-directory paths in durable committed artifacts. Use `<PROJECT_REPO>` or repo-relative paths instead.

## Git Branch And Push Policy

The stable baseline branch is `master` unless the Operator later renames the repository default branch.

The active implementation branch is `dev`.

Implementers must not commit or push directly to `master` unless a Work Card explicitly authorizes it.

Normal Implementer flow:

1. Start from the approved repo root.
2. Confirm current branch and remote.
3. Switch to `dev`; create it from `master` if it does not exist.
4. Pull/rebase the latest upstream branch state when safe.
5. Make only approved Work Card changes.
6. Run the required validation lane.
7. Run a local safety scan before staging:
   - no secrets, tokens, API keys, credentials, or `.env` files
   - no concrete local machine paths
   - no large local handoff archives, zip files, screenshots, build outputs, or generated junk unless explicitly approved
8. Stage only intended files.
9. Review staged diff.
10. Commit with a plain Work Card message.
11. Push to `origin/dev`.
12. Report branch, commit hash, pushed status, validation results, skipped checks, and remaining dirty files.

Architect/Operator approval is required before merging `dev` into `master`.

## Validation

- Run available automated validation commands before reporting completion.
- If a check cannot be run, report the reason clearly.
- Required validation commands before release tags:
  - `npm run typecheck`
  - `npm run build`
  - `npm test`
  - `git status --short`
- Future validation additions: add unit tests and renderer smoke tests once those exist.

## Implementer vs. Operator Validation

- Implementer validation is limited to automated checks, code-level verification, and non-acceptance smoke checks explicitly needed to confirm the app launches or the changed code path is reachable.
- The Implementer must not perform Operator manual validation, Human Validation acceptance, Work Card acceptance, phase closeout, or product-owner approval unless the prompt explicitly grants that authority.
- The Implementer must not create, save, or mark final Human Validation records as accepted on behalf of the Operator.
- Manual validation tasks that require visual judgment, usability judgment, live workflow acceptance, evidence-path confirmation, or closeout approval belong to the Operator.
- Builder Reports must list remaining Operator manual validation steps under manual validation required; they must not claim those steps were completed by the Operator unless the Operator actually provided that result.
- If a prompt says to manually validate, interpret that as: describe the Operator manual validation required, unless the prompt explicitly says the Implementer is authorized to perform a non-acceptance smoke check.

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

## Validation lane rule

Before running tests, builds, Electron startup, Vite, Vitest, Playwright, esbuild, or any command that may spawn child processes, read:

`docs/dev/VALIDATION_COMMAND_LANES.md`

This project has a known false-failure mode where sandboxed Codex execution can produce `spawn EPERM`, especially when esbuild or other child-process-heavy tooling is involved.

Do not repeatedly retry these commands inside the sandbox. Use the approved validation wrapper/lane documented in `docs/dev/VALIDATION_COMMAND_LANES.md`.

When reporting validation, state which execution lane was used. Do not mark validation as complete based only on a sandboxed command that failed with `spawn EPERM`.
