# Example Project Profile — ChampCity RP Desktop — Revised v11

This is an example of specializing the generic scaffold for an existing project. It should not be treated as the default for unrelated projects.

## Project Name

ChampCity RP Desktop

## Project Summary

Electron desktop solo roleplay engine with deterministic application-owned state, persistence, mechanics, rules, import/export behavior, and LLM-assisted narration/extraction.

## Workspace Path

```text
<PROJECT_REPO>
```

## Source of Truth

GitHub repository:

```text
ChampCityChris/ChampCity_RP_Desktop
```

## Builder Tool

Codex App.

## Architect Surface

ChatGPT.com Architect chat.


## Project Intake Artifact Policy

- New projects should start with Prompt 0 and produce `PROJECT_INTAKE.md`.
- `PROJECT_INTAKE.md` should be saved before Prompt 1 whenever possible.
- Prompt 1 should consume the attached or pasted `PROJECT_INTAKE.md`, not informal chat memory.
- After scaffold creation, the intake artifact should be preserved under `planning/project/PROJECT_INTAKE.md`.
- If the intake changes materially, the revised intake should be saved and the project brief should be updated.


## Project Profile and Scaffold Plan Artifact Policy

- Prompt 1 should produce copy-ready `PROJECT_PROFILE.md` and `PROJECT_SCAFFOLD_PLAN.md` before Prompt 4 is sent to the Builder.
- Prompt 1A should revise `PROJECT_PROFILE.md` when project-profile details are incomplete.
- Prompt 1A should also revise `PROJECT_SCAFFOLD_PLAN.md` if the answers change workspace, source-of-truth, folder structure, first phase, validation policy, or AGENTS.md policy.
- Prompt 4 should consume `PROJECT_INTAKE.md`, `PROJECT_PROFILE.md`, and `PROJECT_SCAFFOLD_PLAN.md` as controlling source files.
- The Builder must not create the scaffold from transient chat context when these files exist or should exist.
- After scaffold creation, preserve these artifacts under `planning/project/`.



## Markdown Artifact Download Policy

- Any Architect output that becomes input to a later prompt should be produced as an actual downloadable `.md` file attachment with the required filename.
- DOCX/PDF exports are not equivalent to the required `.md` artifacts.
- If ChatGPT cannot create the `.md` file directly in the current interface, the Architect should state that clearly and provide exact fallback Markdown content.
- When a file-backed handoff matters, use the corresponding Builder save/apply prompt to create the `.md` file at the required path.
- Prompt 0 should produce `PROJECT_INTAKE.md` as an actual `.md` artifact.
- Prompt 1 should produce `PROJECT_PROFILE.md` and `PROJECT_SCAFFOLD_PLAN.md` as actual `.md` artifacts.
- Phase handoffs under `planning/phases/[PHASE]/handoffs/` should be actual `.md` files before they are used by the next prompt.
## Prompt 1A Novice-Guidance Policy

- Prompt 1A should review `PROJECT_INTAKE.md`, `PROJECT_PROFILE.md`, and `PROJECT_SCAFFOLD_PLAN.md` before asking the user any questions.
- Do not ask the user to invent project-profile policy from scratch when a safe default can be inferred.
- For each unresolved project-profile field, provide a recommended default, common alternatives, plain-language rationale, and impact if changed later.
- Allow the user to approve safe defaults as a bundle.
- For ChampCity RP Desktop, default to Codex App, ChatGPT.com Architect surface, GitHub source of truth, root `AGENTS.md`, no Playwright installation, no live desktop visual validation by Builder, and human validation for Electron/Ollama/visual/subjective behavior unless a phase explicitly changes those policies.
- Push back on options that weaken source-of-truth discipline, validation honesty, or secrets handling.


## Durable Handoff Artifact Policy

For clean Architect / Builder handoffs, any prompt output that becomes input to a later prompt should be saved before the next step runs.

Project-level handoff files:

- `PROJECT_INTAKE.md`
- `PROJECT_PROFILE.md`
- `PROJECT_SCAFFOLD_PLAN.md`
- `planning/project/handoffs/01_PROJECT_PROFILE_UPDATE_HANDOFF.md` when Prompt 1A is used

Phase-level handoff files should live under:

```text
planning/phases/[PHASE]/handoffs/
```

Required phase-level handoff artifacts:

- `01_PHASE_INTAKE_HANDOFF.md` — completed phase intake from Prompt 3A.
- `02_PHASE_FILE_BUNDLE.md` — generated phase-file bundle from Prompt 6.
- `03_PHASE_FILE_COMPLETENESS_REVIEW.md` — Prompt 6A review and corrections.
- `04_BUILDER_DRY_RUN_PLAN.md` — Builder dry-run plan from Prompt 8.
- `05_DRY_RUN_APPROVAL.md` — Architect/human approval from Prompt 8A.
- `06_BUILDER_IMPLEMENTATION_REPORT.md` — Builder implementation or repair report.
- `07_HUMAN_VALIDATION_RECORD.md` — human validation capture.
- `08_REPAIR_HANDOFF.md` — repair triage and narrow repair prompt.
- `09_CLOSEOUT_READINESS_REVIEW.md` — closeout readiness decision.
- `10_COMMIT_ARCHIVE_SUMMARY.md` — commit, archive, or change-summary text.

These files are transport artifacts. The controlling phase state, validation results, decisions, and risks should still be reconciled into the standard phase files.

## Manual Workflow Policy

- The project uses the Architect / Builder scaffold workflow.
- The Builder should execute from project files, phase files, and explicit prompts, not vague chat context.
- Prompt 4 scaffold creation should use `PROJECT_INTAKE.md`, `PROJECT_PROFILE.md`, and `PROJECT_SCAFFOLD_PLAN.md` as controlling inputs. If Prompt 1A was used, Prompt 1B should apply its update handoff before Prompt 4 runs.
- Each phase should use the prompt-pack workflow index.
- Placeholder intake files are not complete phase intake.
- Dry-run plans must be reviewed before medium/high-risk implementation.
- Builder reports, validation observations, repair triage, and closeout decisions must be captured in the planning folder.
- Dry-run plans, dry-run approvals, Builder reports, validation records, repair handoffs, closeout readiness reviews, and commit/archive summaries should be saved under the phase `handoffs/` folder before being used by the next prompt.
- Root `AGENTS.md` should exist in the repository and be reviewed before implementation passes.


## AGENTS.md Policy

Root `AGENTS.md` should live at:

```text
<PROJECT_REPO>/AGENTS.md
```

Required recurring Builder instructions:

- Verify the repository path and remote before editing.
- Treat the planning folder and phase files as source of truth for implementation scope.
- Do not rely on vague chat context.
- Do not install Playwright or perform live desktop visual validation.
- Do not broaden scope or refactor unrelated systems.
- Report files changed, checks run, checks skipped, manual validation required, and residual risks.
- Do not include secrets, credentials, API keys, or private tokens in `AGENTS.md`.

Existing-file policy:

- If `AGENTS.md` exists, Codex should inspect it and propose a patch rather than overwrite it.
- If `AGENTS.md` does not exist, Codex should create it from the project operating rules.


## Core Architecture Principles

- LLMs generate narration, creative content, and candidate observations.
- Application code owns canonical state, persistence, rules, validation, mechanics, and durable structure.
- Mechanics overlays, world books, narrator rules, personas, and campaign attachment logic should remain decoupled unless a phase explicitly designs a connection.
- Avoid hard-coding behavior to validation examples.
- Avoid broad refactors during narrow repair passes.

## Workspace Verification Rules

Before editing, Codex must:

1. Print current working directory.
2. Print git top-level path.
3. Print `git remote -v`.
4. Confirm the repo path is `<PROJECT_REPO>`.
5. Confirm the remote is `ChampCityChris/ChampCity_RP_Desktop`.
6. Stop without editing if verification fails.

## Allowed Validation

- Static checks available in the repo.
- Type checks available in the repo.
- Existing unit tests available in the repo.
- Manual instructions for the human operator.

## Disallowed Validation

- Do not install Playwright.
- Do not attempt Playwright validation unless explicitly authorized.
- Do not perform live desktop click-through validation.
- Do not claim visual validation without human evidence.

## Human Validation Responsibilities

The human operator validates:

- Electron desktop UI behavior.
- Visual drawer/layout behavior.
- Ollama/model behavior.
- Streaming response behavior.
- Debug exports.
- Screenshots.
- Subjective RP/narrator quality.

## Required Approval Gates

- Project intake approval before project brief/scaffold planning when starting a new project.
- Phase intake approval before phase-file generation.
- Phase-file completeness approval before Builder applies files.
- Dry-run approval before implementation for medium/high-risk changes.
- Human validation approval before phase acceptance.
- Closeout readiness approval before phase closeout.

## Preferred Phase Naming

```text
planning/phases/phase-XX-short-name/
```

Examples:

```text
planning/phases/phase-06e-ui-ux-polish/
planning/phases/phase-07-character-mechanics-and-roll-ui/
```

## Standard Builder Final Report

Codex final reports must include:

- Files changed.
- Summary of implementation.
- Checks run.
- Checks skipped and why.
- Manual validation required.
- Residual risks.

## Standard Durable Capture After Builder Report

After each Builder report, the Architect or human operator should update:

- `00_PHASE_STATE.md`
- `09_VALIDATION_RESULTS.md`
- `11_RISKS_AND_DEBT.md` if residual risk or skipped checks remain
- `13_APPROVAL_GATES.md` if the pass requires approval status


## Development Environment Readiness Policy

Before implementation work, Codex should run a readiness audit that reports:

- Current workspace and Git top-level path.
- Current branch and remote.
- Working tree status and pre-existing uncommitted changes.
- Detected package manager/build tool.
- Install, dev/start, build, lint, typecheck, and test commands if available.
- Whether `.gitignore` protects dependency folders, build artifacts, logs, and `.env` files.
- Whether `.env.example` or equivalent setup documentation exists.

Codex must not install dependencies, initialize frameworks, run Playwright, perform live desktop click-through validation, print secrets, or make source changes during the readiness audit unless explicitly authorized.

## Skills / MCP / Tooling Policy

- `AGENTS.md` is required and should contain durable project instructions.
- Project-specific Skills are useful later for repeatable workflows such as validation capture, Builder report parsing, scaffold generation, and release/archive summaries.
- MCP or connector tooling is not required for MVP/manual workflow and should be deferred unless it solves a concrete repeated problem with an approved security model.
- Credentialed tools must not be enabled or used without explicit human approval.
- Prefer local Markdown, AGENTS.md, prompt templates, and manual copy/paste before external automation.
