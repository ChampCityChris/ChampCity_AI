# ChampCity_AI Implementer Rules

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

## Repository Code, Test, and Migration Boundary

Before adding or modifying production code, tests, scripts, migrations, fixtures, packaging, or test-lane configuration, read:

`docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`

Mandatory rules:

- Production behavior and authority belong under `src/` or another explicitly approved runtime package.
- Production code must not import from `test/`, temporary fixture directories, Work-Card-specific migration directories, or abandoned scripts.
- Tests remain in the source repository after release but are not packaged application runtime.
- Work Cards normally update capability-oriented test suites. Do not create a permanent Work-Card-specific test island unless the approved Work Card authorizes it.
- Work-Card-specific migration utilities are presumed bounded to that Work Card. Do not expand them to mirror new production architecture without explicit promotion and relocation authority.
- A historical or abandoned migration must not import and reproduce the live workflow catalog merely to keep an obsolete test passing.
- Supported migrations must identify a current schema or release upgrade obligation and be versioned by that boundary.
- Do not place production authority in test code or treat test fixtures as a second implementation of production behavior.
- Do not add a new production feature to an abandoned script solely because a legacy test imports current production definitions.
- If a Work Card omits the capability suite, migration obligation, temporary fixture boundary, or release-package impact needed to implement safely, stop and report the missing authority.

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
- Active Implementer Reports use `Implementer_Reports/` and `IMPLEMENTER_REPORT_*` paths.
- Markdown and JSON are synchronized representations of one logical artifact revision; an unsynchronized pair is blocking.

## Work Card Artifacts

- Every durable Work Card must be saved as both structured JSON for app workflows and rendered Markdown for human-readable planning records.
- Required JSON path pattern: `planning/phases/<phase-folder>/Work_Cards/<work_card_id>_<slug>.json`.
- Required Markdown path pattern: `planning/phases/<phase-folder>/Work_Cards/<work_card_id>_<slug>.md`.
- The JSON artifact is the structured app-readable Work Card source.
- The Markdown artifact is the durable human-readable rendering.
- Implementers must not create Markdown-only Work Cards unless the prompt explicitly says it is a temporary note and not an app-selectable Work Card.

## Security

- Do not expose, request, print, or store secrets.
- Do not write API keys, tokens, credentials, or private tokens into generated artifacts.
- Do not claim validation that was not actually performed.
- Renderer code must not use unrestricted filesystem access.
- Filesystem writes must be mediated by Electron main/preload IPC and constrained to approved project planning paths.

## Local Path Redaction

- Do not write concrete local machine paths into committed artifacts, Work Cards, Implementer Reports, validation records, closeout records, planning documents, or handoff prompts.
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

Feature-branch Work Card review rule:

- If a Work Card explicitly names a feature branch, create that branch from the approved base branch and commit/push only to the named feature branch.
- Do not push that Work Card directly to `dev` or `master` unless the Work Card explicitly authorizes it.
- Do not merge a feature branch back into `dev`; Architect/Operator review and approval happen after the pushed feature branch and Implementer Report are available.

## Commit Hash Reporting Rule

A report committed in the same commit as the work cannot know that commit's hash before the commit exists.

Implementer Reports must include:

- branch name
- intended commit message
- files staged or committed
- validation results
- whether a commit was created
- Commit hash: pending until commit is created, when the report is part of the same commit

After committing, the Implementer final response must include the actual commit hash from `git rev-parse HEAD`.

Do not amend a committed report solely to insert its own commit hash, because that changes the commit hash.

If the project requires a durable artifact containing the final commit hash, the Architect or Implementer must create a separate follow-up review/checkpoint artifact in a later commit.

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
- Implementer Reports must list remaining Operator manual validation steps under manual validation required; they must not claim those steps were completed by the Operator unless the Operator actually provided that result.
- If a prompt says to manually validate, interpret that as: describe the Operator manual validation required, unless the prompt explicitly says the Implementer is authorized to perform a non-acceptance smoke check.

## Implementer Report Artifacts

- Every Implementer pass must create a Markdown Implementer Report and place it in the `Implementer_Reports` folder for the respective phase being worked.
- Required path pattern: `planning/phases/<phase-folder>/Implementer_Reports/`.
- Required report naming convention: `IMPLEMENTER_REPORT_<work_card_or_fix_id>_<short_task_name>.md`.
- Example Work Card report: `planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_work_card_schema_renderer.md`.
- Example fix/governance report: `planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_FIX01_agents_report_rule.md`.
- The report must identify whether the pass was for a numbered Work Card or a simple fix/governance update.
- The report must be committed with the related work unless the prompt explicitly says not to commit.
- Each Implementer Report must include:
  - Repository path inspected.
  - Git branch and remote status.
  - Files created.
  - Files modified.
  - Files intentionally not created.
  - Commands run and results.
  - Validation performed.
  - Validation skipped and reason.
  - Git actions performed, including commit hash and tag if applicable, subject to the Commit Hash Reporting Rule.
  - Security/secret-safety notes.
  - Blocking questions, if any.
  - Recommended next Implementer task.

## Final Report Requirements

Final Implementer reports must include:

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

## Literal Compliance, Execution Passes, And Independent Verification

- Implement Work Card requirements literally. Do not substitute a mechanism the Implementer considers equivalent when the Work Card requires or prohibits a specific architecture, authority path, schema, boundary, or test.
- A passing end-to-end route or green test suite does not satisfy a requirement while a prohibited production mechanism remains.
- Replacement-mode Work Cards default to deletion of superseded authority. Runtime compatibility readers, aliases, fallbacks, dual authority, and legacy-field interpretation are prohibited unless the Work Card explicitly preserves them.
- Missing mandatory authority fields must block. Production runtime code must not act as a migration layer for legacy records.
- Large implementation Work Cards must be executed through an approved Execution Pass Plan. Execution Passes are subordinate implementation procedure, not Work Cards, repairs, candidates, approvals, or acceptance decisions.
- The application should compile bounded Implementer and Independent Verifier packets from the approved Work Card, Acceptance Contract, current repository state, and verified prior pass results. Routine packet transfer must not require Operator copy/paste.
- Implementer-authored tests are necessary but not sufficient. Each material pass requires independent verification before the Execution Run advances.
- Independent verification must inspect production code and run adversarial acceptance tests. It must not modify production code or treat the Implementer Report narrative as proof.
- The Implementer must not perform final Operator acceptance. A Validation Agent may execute the approved Operator validation procedure and draft a report, but the human Operator retains approval, rejection, and observation authority.
- Follow `docs/governance/EXECUTION_PASS_PROTOCOL.md`, `docs/governance/IMPLEMENTER_LITERAL_COMPLIANCE_PROTOCOL.md`, and `docs/governance/INDEPENDENT_VALIDATION_PROTOCOL.md`. If a required protocol is missing, unreadable, or contradicts the approved Work Card, stop and report the contradiction.
