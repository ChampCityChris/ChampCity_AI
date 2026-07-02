# Generic Project Scaffold Templates — Revised v11

Copy these templates into a project planning folder and replace bracketed placeholders.

This revision adds workflow-control templates that align the scaffold with the clarified prompt-pack sequence. The scaffold should not only store phase files; it should also record the workflow step, prompt used, approval gates, Builder reports, validation interviews, repair triage, and closeout readiness.

Version 3 added explicit project-intake handling. A rough project idea should be converted into a completed project intake before Prompt 1 creates the project brief and scaffold plan.

Version 4 adds `AGENTS.md` support. The scaffold should generate or review a root `AGENTS.md` file before implementation so Codex-style Builders receive durable project instructions automatically.

Version 5 adds durable Prompt 1 / Prompt 1A handoff artifacts. Prompt 1 should create `PROJECT_PROFILE.md` and `PROJECT_SCAFFOLD_PLAN.md`, and Prompt 4 should consume those files together with `PROJECT_INTAKE.md` as controlling Builder inputs.

Version 6 adds phase-level durable handoff artifacts. Any Architect or Builder output that becomes input to a later prompt should be saved into `phases/[PHASE]/handoffs/` or the relevant project-level file before the next prompt is run. This prevents dry-run plans, approvals, Builder reports, validation notes, repair scopes, and closeout readiness decisions from living only in chat.

Version 9 adds a project-level handoff folder and a Prompt 1A update handoff template. Prompt 1A should create a Builder-applied project-profile update handoff instead of requiring the human operator to manually create or paste revised files into the project folder.

Version 11 adds novice-guided Prompt 1A fields. Project-profile update handoffs should record which fields were answered, inferred, or still needed human decision, along with suggested defaults and the rationale given to the human operator.

Version 10 adds a required Markdown artifact policy. Handoff outputs must be generated or saved as actual `.md` files with the required names. DOCX and PDF exports are not equivalent to the required Markdown artifacts.


---

# project/PROJECT_INTAKE.md

```markdown
# Project Intake — [PROJECT NAME]

## Intake Status

Draft / Complete / Approved / Needs Revision

## Source Inputs

- Rough idea / roadmap / notes:
- Architect chat date:
- Prompt used: Prompt 0 — Guided New Project Intake Interview
- Saved by:

## Completed Project Intake

### Working Project Name

[Name]

### Product / Problem Summary

[Summary]

### Primary Users / Operators

- [User/operator]

### User / Operator Problem

[Problem]

### Desired User / Operator Outcome

[Outcome]

### Business / Product Goal

[Goal]

### Workspace / Source of Truth

- Workspace or intended source location:
- Source-of-truth type:
- Repository / Drive / system, if known:

### Preferred Builder / Architect Surface

- Builder tool:
- Architect surface:

### Current Stage

Idea / Prototype / MVP / Alpha / Beta / Production / Maintenance / Unknown

### Known Constraints

- [Constraint]

### Explicit Non-Goals

- [Non-goal]

### Security / Data Handling Constraints

- [Constraint]

### Validation Policy

Allowed validation:
- [Allowed]

Disallowed validation:
- [Disallowed]

Human validation responsibilities:
- [Responsibility]

### Durable Decisions Already Made

- [Decision]

### Known Risks / Uncertainty

- [Risk]

### First Likely Phase / Scaffold Target

[Phase or target]

## Assumptions

- [Assumption]

## Open Questions

- [Question]

## Intake Completeness Checklist

- [ ] Project name identified.
- [ ] Problem/opportunity identified.
- [ ] Primary users/operators identified.
- [ ] Desired outcome identified.
- [ ] Workspace/source of truth identified or explicitly unknown.
- [ ] Builder tool identified.
- [ ] Constraints and non-goals identified.
- [ ] Validation boundaries identified.
- [ ] Human responsibilities identified.
- [ ] First likely phase identified.

## Recommended Next Step

Proceed to Prompt 1 / Run Prompt 0A to save this file / Answer open questions first.
```

---

# project/PROJECT_PROFILE.md

```markdown
# Project Profile — [PROJECT NAME]

## Profile Status

Draft / Complete / Approved / Needs Revision

## Source Inputs

- Project intake: `PROJECT_INTAKE.md`
- Prompt used: Prompt 1 — New Project Opening Prompt
- Prompt 1A used: Yes / No
- Last updated:

## Project Summary

[Reusable project summary.]

## Primary Users / Operators

- [User/operator]

## Workspace and Source of Truth

- Workspace path:
- Source-of-truth type:
- Repository / Drive / app workspace / documentation bundle:
- Planning root:

## Builder and Architect Surfaces

- Builder tool:
- Architect surface:
- Manual handoff method:

## Current Stage

Idea / Prototype / MVP / Alpha / Beta / Production / Maintenance / Unknown

## Operating Rules

- [Recurring rule]

## Core Design Principles

- [Principle]

## Non-Negotiable Constraints

- [Constraint]

## Validation Policy

Allowed validation:
- [Allowed]

Disallowed validation:
- [Disallowed]

Human validation responsibilities:
- [Responsibility]

## Security and Data Handling

- [Rule]

## AGENTS.md Policy

- Root AGENTS.md location:
- Required before implementation: Yes / No / Waived
- Existing-file merge policy:
- Required recurring Builder rules:

## Standard Builder Final Report

Every Builder pass must report:

- Files/artifacts changed.
- Summary of implementation.
- Checks run.
- Checks skipped and why.
- Manual validation required.
- Residual risks.

## Default Approval Policies

- Project profile approval:
- Phase intake approval:
- Dry-run approval:
- Repair approval:
- Closeout approval:

## Assumptions

- [Assumption]

## Open Questions

- [Question]

## Recommended Next Step

Proceed to Prompt 4 / Run Prompt 1A / Answer open questions first.
```

---

# project/PROJECT_SCAFFOLD_PLAN.md

```markdown
# Project Scaffold Plan — [PROJECT NAME]

## Scaffold Plan Status

Draft / Approved / Needs Revision

## Source Inputs

- Project intake: `PROJECT_INTAKE.md`
- Project profile: `PROJECT_PROFILE.md`
- Prompt used: Prompt 1 — New Project Opening Prompt
- Prompt 1A revision: Yes / No

## Planning Root

`[PLANNING ROOT]`

## Files to Create

Project-level files:
- `project/PROJECT_INTAKE.md`
- `project/PROJECT_PROFILE.md`
- `project/PROJECT_SCAFFOLD_PLAN.md`
- `project/00_PROJECT_BRIEF.md`
- `project/01_OPERATING_RULES.md`
- `project/02_DECISIONS_LOG.md`
- `project/03_RISKS_AND_DEBT.md`
- `project/04_GLOSSARY.md`
- `project/05_ARCHIVE_INDEX.md`
- `project/06_WORKFLOW_INDEX.md`
- `project/07_PROMPT_INDEX.md`
- `project/08_AGENTS_MD_POLICY.md`
- `project/09_DEVELOPMENT_ENVIRONMENT.md`
- `project/10_GIT_AND_SOURCE_CONTROL.md`
- `project/11_TOOLING_CAPABILITY_POLICY.md`
- `project/12_MARKDOWN_ARTIFACT_POLICY.md`
- `project/handoffs/01_PROJECT_PROFILE_UPDATE_HANDOFF.md`

## First Phase Folder

- Phase name:
- Phase folder:
- Phase objective:

Phase files:
- `00_PHASE_STATE.md`
- `01_INTAKE.md`
- `02_REQUIREMENTS.md`
- `03_CURRENT_SYSTEM_CONTEXT.md`
- `04_ARCHITECTURE_BLUEPRINT.md`
- `05_ACCEPTANCE_CRITERIA.md`
- `06_IMPLEMENTATION_PLAN.md`
- `07_BUILDER_PROMPTS.md`
- `08_VALIDATION_PLAN.md`
- `09_VALIDATION_RESULTS.md`
- `10_DECISIONS_LOG.md`
- `11_RISKS_AND_DEBT.md`
- `12_HANDOFF_TO_NEXT_PHASE.md`
- `13_APPROVAL_GATES.md`
- `14_REPAIR_TRIAGE.md`

Handoff artifacts:
- `handoffs/README.md`
- `handoffs/01_PHASE_INTAKE_HANDOFF.md`
- `handoffs/02_PHASE_FILE_BUNDLE.md`
- `handoffs/03_PHASE_FILE_COMPLETENESS_REVIEW.md`
- `handoffs/04_BUILDER_DRY_RUN_PLAN.md`
- `handoffs/05_DRY_RUN_APPROVAL.md`
- `handoffs/06_BUILDER_IMPLEMENTATION_REPORT.md`
- `handoffs/07_HUMAN_VALIDATION_RECORD.md`
- `handoffs/08_REPAIR_HANDOFF.md`
- `handoffs/09_CLOSEOUT_READINESS_REVIEW.md`
- `handoffs/10_COMMIT_ARCHIVE_SUMMARY.md`

Evidence folders:
- `sprints/.gitkeep`
- `handoffs/.gitkeep`
- `evidence/screenshots/.gitkeep`
- `evidence/logs/.gitkeep`
- `evidence/exports/.gitkeep`
- `evidence/builder-summaries/.gitkeep`

## First Phase Intake Draft

[Draft only. This is not a completed phase intake unless explicitly marked complete.]

## Scaffold Population Rules

- Preserve completed `PROJECT_INTAKE.md`.
- Preserve completed `PROJECT_PROFILE.md`.
- Preserve approved `PROJECT_SCAFFOLD_PLAN.md`.
- Create placeholders for phase files unless Prompt 6 has already generated completed content.
- Do not modify implementation/source files during scaffold creation.

## Builder Guardrails

- Verify workspace/source of truth before editing.
- Stop if controlling inputs are missing and not explicitly waived.
- Do not rely on prior chat context.
- Do not initialize frameworks, install dependencies, or create application code during scaffold creation.

## Post-Scaffold Next Steps

1. Run Prompt 4A to create or review root `AGENTS.md`.
2. Run Prompt 4B to audit Git and development environment readiness.
3. Run Prompt 4C only if Skills/MCP/tool capability planning is needed.
4. Run Prompt 3A if the first phase intake is only a placeholder.
5. Run Prompt 6 after phase intake is complete.

## Prompt 4 Builder Input Bundle

Attach or paste:
- `PROJECT_INTAKE.md`
- `PROJECT_PROFILE.md`
- `PROJECT_SCAFFOLD_PLAN.md`

## Risks and Drift Warnings

- [Risk]

## Recommended Next Step

Proceed to Prompt 4 / Revise scaffold plan / Run Prompt 1A.
```


---

# project/handoffs/01_PROJECT_PROFILE_UPDATE_HANDOFF.md

````markdown
# Project Profile Update Handoff — [PROJECT NAME]

## Handoff Status

Draft / Ready for Builder / Applied / Needs Revision

## Source Inputs

- Prompt used: Prompt 1A — Guided Project Profile Interview
- Project intake: `project/PROJECT_INTAKE.md`
- Existing project profile: `project/PROJECT_PROFILE.md`
- Existing scaffold plan: `project/PROJECT_SCAFFOLD_PLAN.md`
- Human operator answers:

## Profile Gap Analysis

| Field | Status: Answered / Inferred / Needs Human Decision | Source / Rationale |
|---|---|---|
| [Field] | [Status] | [Source/rationale] |

## Suggested Defaults Presented

| Field | Recommended Default | Other Common Choices | Impact if Changed Later | Accepted? |
|---|---|---|---|---|
| [Field] | [Default] | [Options] | Low / Medium / High | Yes / No |

## Profile Questions Resolved

- [Question/field] — [Answer/decision]

## Assumptions Accepted

- [Assumption]

## Files to Update

| File | Action | Notes |
|---|---|---|
| `project/PROJECT_PROFILE.md` | Replace / Create / No change | [Notes] |
| `project/PROJECT_SCAFFOLD_PLAN.md` | Replace / Create / No change | [Notes] |
| `project/02_DECISIONS_LOG.md` | Append / No change | [Notes] |
| `project/03_RISKS_AND_DEBT.md` | Append / No change | [Notes] |
| `project/08_AGENTS_MD_POLICY.md` | Update / No change | [Notes] |
| `AGENTS.md` | Propose patch / Apply authorized patch / No change | [Notes] |

## Replacement Content — project/PROJECT_PROFILE.md

```markdown
[Paste complete revised PROJECT_PROFILE.md content.]
```

## Replacement Content — project/PROJECT_SCAFFOLD_PLAN.md

Required only if scaffold structure, first phase, validation policy, AGENTS.md policy, workspace, source of truth, stack, persistence, or Git assumptions changed.

```markdown
[Paste complete revised PROJECT_SCAFFOLD_PLAN.md content or write No change.]
```

## Decision Log Entries to Append

```markdown
[Paste decision entries or write None.]
```

## Risk / Debt Entries to Append

```markdown
[Paste risk/debt entries or write None.]
```

## AGENTS.md / AGENTS Policy Patch Notes

```markdown
[Paste patch notes or write None.]
```

## Prompt 1B Input Instruction

Use this file as the controlling input for Prompt 1B. The Builder should apply the updates to the correct project files and must not modify implementation/source files.
````

---

# project/00_PROJECT_BRIEF.md

```markdown
# Project Brief — [PROJECT NAME]

## Summary

[One-paragraph project summary.]

## Project Intake Summary

- Intake source:
- Problem/opportunity:
- Desired outcome:
- First likely phase:
- Key assumptions:
- Open questions:

## Primary Users / Operators

- [User/operator]

## Current Stage

Idea / Prototype / MVP / Alpha / Beta / Production / Maintenance

## Source of Truth

- Workspace:
- Repository / Drive / System:
- Branch or versioning rules:

## Architect / Builder Workflow

- Architect surface:
- Builder tool:
- Prompt pack version:
- Manual handoff method:
- Root AGENTS.md status:

## Core Design Principles

- [Principle]

## Non-Negotiable Constraints

- [Constraint]

## Key Workflows

- [Workflow]

## Known Limitations

- [Limitation]

## Last Updated

[YYYY-MM-DD]
```

---

# project/01_OPERATING_RULES.md

```markdown
# Operating Rules — [PROJECT NAME]

## Workspace Verification

Before editing, the Builder must verify:

- Active workspace:
- Source of truth:
- Branch/version context:

If verification fails, stop without editing.

## Builder Boundaries

- The Builder may:
- The Builder may not:

## Architect / Builder Handoff Rules

- Root `AGENTS.md` must be created or reviewed before implementation work.
- The Builder must work from scaffold files, `AGENTS.md`, and explicit prompts.
- Chat context is not source of truth.
- Placeholder intake files are not complete phase intake.
- Any prompt output that becomes input to a later prompt must be saved as a Markdown handoff artifact before proceeding.
- Medium/high-risk work requires dry-run approval before implementation.
- Dry-run plans, approvals, Builder reports, human validation, repair triage, closeout readiness, and commit/archive summaries must be captured in `phases/[PHASE]/handoffs/` or their corresponding phase files.
- Builder reports must be captured into the scaffold after each pass.

## Allowed Validation

- [Check/test/review]

## Disallowed Validation

- [Disallowed check/test/tool]

## Refactor Rules

- [Rule]

## Security / Data Handling

- [Rule]

## AGENTS.md Policy

- Root AGENTS.md location:
- Created/reviewed date:
- Required recurring instructions:
- Existing AGENTS.md merge policy:

## Approval Gates

- Project intake approval:
- Project profile approval:
- Phase intake approval:
- Phase-file completeness approval:
- Dry-run implementation approval:
- Repair scope approval:
- Phase closeout approval:

## Final Report Requirements

Every Builder pass must report:

- Files/artifacts changed.
- Summary of implementation.
- Checks run.
- Checks skipped and why.
- Manual validation required.
- Residual risks.
```

---

# project/02_DECISIONS_LOG.md

```markdown
# Project Decisions Log — [PROJECT NAME]

## Decision YYYY-MM-DD-01 — [Title]

Context:

Decision:

Reason:

Consequences:

Superseded by:
```

---

# project/03_RISKS_AND_DEBT.md

```markdown
# Project Risks and Debt — [PROJECT NAME]

## Technical / Process Debt

- [Debt]

## UX / Operator Debt

- [Debt]

## Testing / Validation Debt

- [Debt]

## Security / Compliance Risks

- [Risk]

## Workflow / Handoff Risks

- [Risk]

## Deferred Work

- [Deferred item]
```

---

# project/04_GLOSSARY.md

```markdown
# Glossary — [PROJECT NAME]

## Terms

### [Term]

Definition:

Related files/systems:
```

---

# project/05_ARCHIVE_INDEX.md

```markdown
# Archive Index — [PROJECT NAME]

## Closed Phases

| Phase | Status | Close Date | Summary | Handoff |
|---|---|---:|---|---|
| [Phase] | Closed | [YYYY-MM-DD] | [Summary] | [Path] |

## Superseded Documents

- [Document/path] — [Reason superseded]

## Evidence Locations

- [Path] — [Description]
```

---

# project/06_WORKFLOW_INDEX.md

```markdown
# Workflow Index — [PROJECT NAME]

## Purpose

This file maps the manual Architect / Builder process to exact prompt-pack items and expected outputs.

## Current Workflow Position

- Current phase:
- Current step:
- Required input:
- Recommended prompt:
- Expected output:
- Next action:

## Workflow Steps

| Step | Prompt | Actor | Purpose | Required Input | Expected Output | Complete When |
|---:|---|---|---|---|---|---|
| 0 | Prompt 0 | Architect | Complete new-project intake | Rough project idea | `PROJECT_INTAKE.md` | Intake file is complete |
| 0A | Prompt 0A | Builder | Save project intake file | `PROJECT_INTAKE.md` content | Saved bootstrap file | File exists |
| 1 | Prompt 1 | Architect | Start project | `PROJECT_INTAKE.md` | `PROJECT_PROFILE.md` and `PROJECT_SCAFFOLD_PLAN.md` | Durable project profile and scaffold plan exist |
| 1A | Prompt 1A | Architect | Complete project profile | Partial `PROJECT_PROFILE.md` / open questions | `project/handoffs/01_PROJECT_PROFILE_UPDATE_HANDOFF.md` + Prompt 1B Builder update prompt | Profile update handoff is ready |
| 1B | Prompt 1B | Builder | Apply profile updates | `01_PROJECT_PROFILE_UPDATE_HANDOFF.md` | Updated project profile/scaffold plan/logs/policy files | Updates applied and reported |
| 2 | Prompt 4 | Builder | Create scaffold | `PROJECT_INTAKE.md`, `PROJECT_PROFILE.md`, `PROJECT_SCAFFOLD_PLAN.md` | Placeholder files preserving controlling inputs | Files exist |
| 3A | Prompt 4A | Builder | Create/review AGENTS.md | Project operating rules | Root AGENTS.md | Durable agent instructions exist |
| 3B | Prompt 4B | Builder | Audit development environment and Git readiness | Workspace and AGENTS.md | Readiness docs | Environment is ready or blockers known |
| 3C | Prompt 4C | Architect/Builder | Decide whether Skills/MCP/tools are needed | Readiness audit | Tooling policy/backlog | Capability decision recorded |
| 4 | Prompt 3A | Architect | Complete phase intake | Placeholder intake / rough idea | `01_INTAKE.md` content + `handoffs/01_PHASE_INTAKE_HANDOFF.md` | Intake handoff is saved |
| 5 | Prompt 6 | Architect | Generate phase files | Completed intake handoff | Phase file content + `handoffs/02_PHASE_FILE_BUNDLE.md` | File bundle is ready to apply |
| 6 | Prompt 6A | Architect | Review phase files | Draft phase file bundle | `handoffs/03_PHASE_FILE_COMPLETENESS_REVIEW.md` | No blocking gaps |
| 7 | Prompt 7 | Builder | Apply phase files | Phase file bundle | Updated scaffold files | Files applied |
| 8 | Prompt 8 | Builder | Dry-run plan | Phase files | `handoffs/04_BUILDER_DRY_RUN_PLAN.md` | Plan is saved |
| 9 | Prompt 8A | Architect/Human | Review dry run | Dry-run plan handoff | `handoffs/05_DRY_RUN_APPROVAL.md` | Approval gate is saved |
| 10 | Prompt 9 | Builder | Implement pass | Approved plan handoff | Builder report for `handoffs/06_BUILDER_IMPLEMENTATION_REPORT.md` | Report returned |
| 11 | Prompt 9A | Architect | Capture Builder report | Builder report | `handoffs/06_BUILDER_IMPLEMENTATION_REPORT.md` + scaffold updates | Report captured |
| 12 | Prompt 11A/11 | Human/Architect | Capture validation | Observations/evidence | `handoffs/07_HUMAN_VALIDATION_RECORD.md` + validation updates | Criteria updated |
| 13 | Prompt 10A/10 | Architect/Builder | Triage/repair | Failed criteria + evidence | `handoffs/08_REPAIR_HANDOFF.md` + repair prompt/fix | Failure resolved or deferred |
| 14 | Prompt 12A/12 | Architect | Close phase | State/results/risks | `handoffs/09_CLOSEOUT_READINESS_REVIEW.md` + closeout/handoff | Phase closed |
| 15 | Prompt 13 | Architect | Commit/archive summary | Report + validation | `handoffs/10_COMMIT_ARCHIVE_SUMMARY.md` | Summary saved |
| 16 | Prompt 2 | Architect | Open next phase | Handoff | New phase design | Next phase started |
```

---

# project/07_PROMPT_INDEX.md

```markdown
# Prompt Index — [PROJECT NAME]

## Prompt Pack Version

[Version/date]

## Active Prompt Set

| Prompt ID | Prompt Name | Actor | Workflow Step | Notes |
|---|---|---|---|---|
| 0 | Guided New Project Intake Interview | Architect | Complete project intake | Outputs `PROJECT_INTAKE.md` |
| 0A | Save Project Intake File | Builder | Save project intake | Optional bootstrap file save |
| 1 | New Project Opening Prompt | Architect | Start project | Creates project plan from completed intake |
| 1A | Guided Project Profile Interview | Architect | Complete profile | Produces project-profile update handoff |
| 1B | Apply Project Profile Updates | Builder | Apply profile updates | Updates files from Prompt 1A handoff |
| 4A | AGENTS.md Creation / Review Prompt | Builder | Setup agent instructions | Use before implementation |
| 3A | Guided Phase Intake Interview | Architect | Complete intake | Use after placeholder scaffold exists |
| 6 | Phase File Generation Prompt | Architect | Generate phase files | Requires completed intake |
| 6A | Phase File Completeness Review | Architect | Review phase files | Use before Builder applies files |
| 7 | Apply Phase Files Prompt | Builder | Apply phase files | Updates scaffold only |
| 8 | Builder Dry-Run Planning Prompt | Builder | Dry-run plan | No edits |
| 8A | Dry-Run Review and Approval Prompt | Architect/Human | Approval gate | Approve/reject plan |
| 9 | Builder Implementation Prompt | Builder | Implement | Requires approval |
| 9A | Builder Report Capture Prompt | Architect | Capture report | Durable update |
| 10A | Architect Repair Triage Prompt | Architect | Repair triage | Before repair prompt |
| 10 | Builder Repair Prompt | Builder | Repair | Narrow fix only |
| 11A | Guided Human Validation Interview | Architect/Human | Validation capture | Converts observations to record |
| 11 | Human Validation Capture Prompt | Architect | Validation update | Produces file entries |
| 12A | Phase Closeout Readiness Interview | Architect | Closeout readiness | Before closing phase |
| 12 | Phase Closeout Prompt | Architect | Closeout | Generates handoff |
| 13 | Commit / Archive Message Prompt | Architect | Archive summary | Optional |
```

---

# AGENTS.md

```markdown
# AGENTS.md — [PROJECT NAME]

## Purpose

This file provides durable instructions for AI coding agents working in this repository/workspace.

## Source of Truth

- Workspace:
- Repository/source:
- Planning folder:
- Chat context is not source of truth.

## Required Startup Checks

Before editing, the Builder must:

1. Print the current working directory.
2. Confirm the expected workspace/source of truth.
3. Read the relevant planning files for the current phase.
4. Stop without editing if verification fails.

## Builder Operating Rules

- Work only from scaffold files, this `AGENTS.md`, and explicit prompts.
- Do not broaden scope.
- Do not perform unrelated refactors.
- Do not introduce dependencies unless authorized.
- Do not delete validation history.
- Preserve existing behavior unless a phase explicitly changes it.
- Do not hard-code behavior to a specific validation example.

## Validation Policy

Allowed validation:

- [Allowed check/test/review]

Disallowed validation:

- [Disallowed check/test/tool/action]

Human validation required for:

- [Manual validation area]

## Security and Data Handling

- Do not expose secrets, credentials, tokens, or private data.
- Do not use credentials autonomously.
- Do not perform live-system actions without explicit approval.

## Final Report Requirements

Every Builder pass must report:

- Files/artifacts changed.
- Summary of implementation.
- Checks run.
- Checks skipped and why.
- Manual validation required.
- Residual risks.
```

---

# project/08_AGENTS_MD_POLICY.md

```markdown
# AGENTS.md Policy — [PROJECT NAME]

## Purpose

This file records how root `AGENTS.md` should be created, reviewed, and maintained.

## Root AGENTS.md Location

- Path:

## Status

Missing / Drafted / Active / Needs Review / Superseded

## Required Content

- Source-of-truth rules.
- Startup verification rules.
- Builder scope-control rules.
- Allowed validation.
- Disallowed validation.
- Human-validation responsibilities.
- Security/data handling limits.
- Final-report requirements.

## Existing File Merge Policy

If `AGENTS.md` already exists:

- Do not overwrite without explicit approval.
- Compare it against current operating rules.
- Propose a patch or replacement section.
- Preserve useful existing repository conventions.

## Last Reviewed

[YYYY-MM-DD]
```

---


---

# project/09_DEVELOPMENT_ENVIRONMENT.md

```markdown
# Development Environment — [PROJECT NAME]

## Readiness Status

Ready / Needs Setup / Blocked / Unknown

## Detected Stack

- Runtime/language:
- Framework:
- Package manager/build tool:
- Operating system assumptions:

## Setup Commands

- Install dependencies:
- Start development server/app:
- Build:
- Test:
- Lint:
- Typecheck:

## Validation Commands

### Builder-Allowed

- [Command] — [Purpose]

### Builder-Disallowed Without Approval

- [Command/tool/action] — [Reason]

## Environment Variables

- `.env.example` exists: Yes / No / N/A
- Required variables documented: Yes / No / N/A
- Secrets must never be printed in Builder reports.

## Known Setup Issues

- [Issue]

## Last Readiness Audit

- Date:
- Prompt used: Prompt 4B
- Result:
```

---

# project/10_GIT_AND_SOURCE_CONTROL.md

```markdown
# Git and Source Control — [PROJECT NAME]

## Source Control Status

- Git repository: Yes / No / N/A
- Current branch:
- Remote/source of truth:
- Default working branch:
- Branching policy:

## Pre-Work Requirements

Before implementation, the Builder must report:

- Current directory.
- Git top-level path, if applicable.
- Current branch.
- Remote URL, if applicable.
- Working tree status.
- Existing uncommitted changes.

## Commit / Archive Policy

- Commit authority:
- Commit message format:
- When to archive phase records:
- When to tag or release:

## Ignore / Secrets Policy

- `.gitignore` exists: Yes / No / N/A
- Dependency folders ignored:
- Build artifacts ignored:
- Logs ignored:
- `.env` files ignored:
- `.env.example` allowed:

## Known Git Risks

- [Risk]
```

---

# project/11_TOOLING_CAPABILITY_POLICY.md

```markdown
# Tooling Capability Policy — [PROJECT NAME]

## Purpose

This file records whether the project needs additional Builder capabilities beyond ordinary file editing and shell-safe checks.

## Capability Status

- AGENTS.md: Required / Optional / Waived
- Project-specific Skills: Needed now / Useful later / Not needed
- MCP/tool connections: Needed now / Useful later / Not needed
- Local helper scripts: Needed now / Useful later / Not needed

## Skills Policy

Use Skills when a repeatable workflow should be packaged for reliable reuse.

Candidate Skills:

- [Skill] — [Workflow solved] — [Needed now/later]

## MCP / Connector Policy

Use MCP or connector tools only when structured access to an external system is necessary and the human operator approves the security model.

Candidate tools:

- [Tool/MCP] — [Purpose] — [Credential/network risk] — [Needed now/later]

## Security Rules

- Do not store secrets in prompts, AGENTS.md, or scaffold files.
- Do not enable credentialed tools without explicit approval.
- Do not perform live-system actions without human approval.

## Deferred Tooling Backlog

- [Deferred capability]
```

---

# project/12_MARKDOWN_ARTIFACT_POLICY.md

```markdown
# Markdown Artifact Policy — [PROJECT NAME]

## Purpose

This file defines how Architect / Builder handoff artifacts must be created, saved, and reused.

## Core Rule

Any workflow output that becomes input to a later prompt must be saved as an actual `.md` file before the next prompt runs.

DOCX, PDF, screenshots, or unsaved chat text are not equivalent to the required Markdown artifacts.

## Required Project-Level Markdown Artifacts

- `PROJECT_INTAKE.md`
- `PROJECT_PROFILE.md`
- `PROJECT_SCAFFOLD_PLAN.md`
- `project/handoffs/01_PROJECT_PROFILE_UPDATE_HANDOFF.md`, if Prompt 1A is used

## Required Phase-Level Markdown Artifacts

- `handoffs/01_PHASE_INTAKE_HANDOFF.md`
- `handoffs/02_PHASE_FILE_BUNDLE.md`
- `handoffs/03_PHASE_FILE_COMPLETENESS_REVIEW.md`
- `handoffs/04_BUILDER_DRY_RUN_PLAN.md`
- `handoffs/05_DRY_RUN_APPROVAL.md`
- `handoffs/06_BUILDER_IMPLEMENTATION_REPORT.md`
- `handoffs/07_HUMAN_VALIDATION_RECORD.md`
- `handoffs/08_REPAIR_HANDOFF.md`
- `handoffs/09_CLOSEOUT_READINESS_REVIEW.md`
- `handoffs/10_COMMIT_ARCHIVE_SUMMARY.md`

## Architect Output Requirement

When using ChatGPT as Architect, prompts should request a downloadable `.md` file attachment with the exact required filename.

If the interface cannot create the `.md` file attachment, the Architect must clearly say so and provide exact fallback Markdown content that the user or Builder can save.

## Builder Save Requirement

When asked to save or apply a handoff artifact, the Builder must create the actual `.md` file at the requested path and report the saved path.

## Replacement / Conflict Rule

If a required `.md` artifact already exists:

- Do not overwrite silently.
- Report that the file exists.
- Preserve existing content unless the prompt explicitly instructs replacement.
- Prefer appending dated entries for logs and history files.
- For replacement artifacts, save or report the prior version if the project policy requires it.

## Last Reviewed

[YYYY-MM-DD]
```

---

# phases/[PHASE]/00_PHASE_STATE.md

```markdown
# Phase State — [PHASE NAME]

## Status

Draft / Intake Complete / Phase Files Drafted / Ready for Builder / Dry Run Requested / Dry Run Approved / In Implementation / Builder Report Captured / In Human Validation / Repair Needed / Repair In Progress / Accepted / Closeout Review / Closed

## Phase Objective

[One-paragraph summary.]

## Current Workflow Position

- Current step:
- Prompt pack item to use next:
- Required input for next step:
- Expected output from next step:
- Current blocker:

## Current Position

- Last completed step:
- Current blocker:
- Next action:

## Accepted Decisions

- [Decision]

## Rejected Approaches

- [Rejected approach and reason]

## Open Questions

- [Question]

## Last Updated

[YYYY-MM-DD]
```

---

# phases/[PHASE]/01_INTAKE.md

```markdown
# Intake — [PHASE NAME]

## Intake Status

Placeholder / Interview Needed / Complete / Approved

## Source Inputs

- Placeholder scaffold file:
- User rough idea:
- Project profile:
- Relevant prior phase handoff:

## Problem

[What is broken, missing, confusing, inefficient, risky, or incomplete?]

## User / Operator Goal

[What should the user/operator experience or gain after this phase?]

## Business / Product Goal

[Why this phase matters.]

## Affected Users / Operators

- [User/operator]

## Affected Systems / Artifacts

- [System/artifact]

## Constraints

- [Constraint]

## Out of Scope

- [Out-of-scope item]

## Success Definition

[What must be true for the phase to be accepted?]

## Validation Evidence Needed

- [Evidence type]

## Assumptions

- [Assumption]

## Open Questions

- [Question]
```

---

# phases/[PHASE]/02_REQUIREMENTS.md

```markdown
# Requirements — [PHASE NAME]

## Functional Requirements

- FR-01:
- FR-02:

## Nonfunctional Requirements

- NFR-01:
- NFR-02:

## UX / Operator Requirements

- UX-01:
- UX-02:

## Workflow / Handoff Requirements

- WF-01:
- WF-02:

## Data / Persistence Requirements

- DR-01:
- DR-02:

## Compatibility / Migration Requirements

- CR-01:

## Security / Compliance Requirements

- SR-01:

## Explicit Exclusions

- EX-01:
```

---

# phases/[PHASE]/03_CURRENT_SYSTEM_CONTEXT.md

```markdown
# Current System Context — [PHASE NAME]

## Relevant Existing Behavior

[Describe current behavior or current process.]

## Relevant Files / Artifacts

- `[path or artifact]` — [purpose]

## Relevant Data Structures / Records

- [Structure]

## Relevant Screens / Workflows

- [Screen/workflow]

## Relevant Prompt-Pack Items

- [Prompt ID] — [Use]

## Prior Fixes / Decisions That Must Not Regress

- [Prior fix/decision]

## Known Validation Limits

- [Limit]
```

---

# phases/[PHASE]/04_ARCHITECTURE_BLUEPRINT.md

```markdown
# Architecture / Process Blueprint — [PHASE NAME]

## Design Summary

[High-level design.]

## Ownership Boundaries

- Application/system owns:
- AI/automation owns:
- Human operator owns:

## Workflow Step Flow

[Describe how the user moves from intake to phase files, dry-run, implementation, validation, repair, and closeout.]

## UI / Workflow Flow

[Describe user/operator flow.]

## Data / State Flow

[Describe state, files, records, storage, or handoff flow.]

## Prompt Generation Flow

[Describe which prompt templates are generated from which inputs.]

## Integration / Service Flow

[Describe APIs, IPC, connectors, scripts, or external systems if applicable.]

## Validation Strategy

[Describe automated and manual validation.]

## Failure Modes

- [Failure mode]

## Deferred Work

- [Deferred item]
```

---

# phases/[PHASE]/05_ACCEPTANCE_CRITERIA.md

```markdown
# Acceptance Criteria — [PHASE NAME]

## AC-01 — [Criterion Name]

Given [starting condition],
When [action],
Then [expected result].

Validation evidence:
- [Screenshot/log/export/manual observation/test]

## Completeness Checklist

- [ ] Criteria are observable.
- [ ] Criteria map to the phase objective.
- [ ] Criteria identify validation evidence.
- [ ] Criteria do not require disallowed validation.
- [ ] Criteria distinguish Builder validation from human validation.
```

---

# phases/[PHASE]/06_IMPLEMENTATION_PLAN.md

```markdown
# Implementation Plan — [PHASE NAME]

## Recommended Passes

### Pass 1 — [Name]

Objective:

Expected files/artifacts:

Validation:

Approval gate before implementation: Yes / No

### Pass 2 — [Name]

Objective:

Expected files/artifacts:

Validation:

Approval gate before implementation: Yes / No

## Files / Artifacts Likely to Change

- `[path/artifact]`

## Files / Artifacts That Should Not Change

- `[path/artifact]`

## Stop Conditions

- Stop if workspace/source verification fails.
- Stop if implementation requires broad redesign outside this phase.
- Stop if validation requires an unapproved tool, credential, or live-system action.
- Stop if dry-run approval has not been captured for medium/high-risk changes.
```

---

# phases/[PHASE]/07_BUILDER_PROMPTS.md

```markdown
# Builder Prompts — [PHASE NAME]

## Prompt-Pack Mapping

| Workflow Need | Prompt ID | Prompt Name | Status |
|---|---|---|---|
| Apply phase files | Prompt 7 | Apply Phase Files Prompt | Not used / Used |
| Dry-run plan | Prompt 8 | Builder Dry-Run Planning Prompt | Not used / Used |
| Implementation | Prompt 9 | Builder Implementation Prompt | Not used / Used |
| Repair | Prompt 10 | Builder Repair Prompt | Not used / Used |

## Scaffold Prompt

[Paste prompt.]

## Dry-Run Prompt

[Paste prompt.]

## Implementation Prompt — Pass 1

[Paste prompt.]

## Repair Prompt

[Paste prompt if needed.]
```

---

# phases/[PHASE]/08_VALIDATION_PLAN.md

```markdown
# Validation Plan — [PHASE NAME]

## Builder-Allowed Validation

- [Check]

## Builder-Disallowed Validation

- [Disallowed check/tool/action]

## Human Manual Validation

1. [Step]
2. [Step]
3. [Step]

## Evidence to Capture

- Screenshots:
- Logs:
- Exports:
- Test output:
- Manual observations:

## Acceptance Criteria Mapping

| Criterion | Builder validation | Human validation | Evidence required |
|---|---|---|---|
| AC-01 | [Yes/No] | [Yes/No] | [Evidence] |

## Pass / Fail Rules

- Pass:
- Fail:
- Needs repair:
- Deferrable with explicit approval:
```

---

# phases/[PHASE]/09_VALIDATION_RESULTS.md

```markdown
# Validation Results — [PHASE NAME]

## Builder Report Entry — [YYYY-MM-DD] — [Pass Name]

Files/artifacts changed:

Implementation summary:

Checks run:

Checks skipped and why:

Manual validation required:

Residual risks:

## Human Validation Entry — [YYYY-MM-DD] — [Pass Name]

Environment:

Build/run command or procedure:

Observed behavior:

Acceptance criteria:

- AC-01: Pass / Fail / Unclear / Deferred
- AC-02: Pass / Fail / Unclear / Deferred

Evidence:

- Screenshot:
- Logs:
- Export:
- Test output:
- Manual observation:

Required repair:

[None or description]
```

---

# phases/[PHASE]/10_DECISIONS_LOG.md

```markdown
# Decisions Log — [PHASE NAME]

## Decision YYYY-MM-DD-01 — [Title]

Context:

Decision:

Reason:

Consequences:

Promote to project-level decisions log: Yes / No

Superseded by:
```

---

# phases/[PHASE]/11_RISKS_AND_DEBT.md

```markdown
# Risks and Debt — [PHASE NAME]

## Accepted Technical / Process Debt

- [Debt]

## UX / Operator Debt

- [Debt]

## Testing / Validation Debt

- [Debt]

## Workflow / Handoff Risks

- [Risk]

## Risks

- [Risk]

## Deferred to Later Phase

- [Deferred item]

## Promote to Project-Level Risk Log

- [Risk/debt item]
```

---

# phases/[PHASE]/12_HANDOFF_TO_NEXT_PHASE.md

```markdown
# Handoff to Next Phase — [PHASE NAME]

## Closeout Readiness

- Ready to close: Yes / No
- Failed criteria remaining:
- Unclear criteria remaining:
- Deferred items approved:
- Decisions promoted:
- Risks/debt promoted:

## Completed

- [Completed item]

## Validated

- [Validated item]

## Not Completed

- [Item]

## Do Not Reopen Unless Necessary

- [Decision/fix]

## Recommended Next Phase

[Next phase name and rationale.]

## Opening Prompt for Next Phase

```text
[Paste next chat opening prompt.]
```
```

---

# phases/[PHASE]/13_APPROVAL_GATES.md

```markdown
# Approval Gates — [PHASE NAME]

## Gate — Phase Intake Approval

Status: Pending / Approved / Rejected / Needs Revision

Reviewed input:

Decision:

Required changes:

Date:

## Gate — Phase File Completeness Approval

Status: Pending / Approved / Rejected / Needs Revision

Reviewed input:

Decision:

Required changes:

Date:

## Gate — Dry-Run Approval

Status: Pending / Approved / Rejected / Needs Revision

Reviewed input:

Decision:

Required changes:

Date:

## Gate — Closeout Approval

Status: Pending / Approved / Rejected / Needs Revision

Reviewed input:

Decision:

Required changes:

Date:
```

---

# phases/[PHASE]/14_REPAIR_TRIAGE.md

```markdown
# Repair Triage — [PHASE NAME]

## Failed Criteria

- [AC-ID] — [Failure]

## Evidence Reviewed

- [Evidence]

## Suspected Root Cause

[Root cause or uncertainty.]

## Repair Scope

[What should be fixed.]

## Repair Non-Goals

- [Do not change]

## Files / Artifacts Likely Affected

- `[path/artifact]`

## Validation Required After Repair

- [Validation]

## Repair Prompt Generated

Yes / No
```


---

# phases/[PHASE]/handoffs/README.md

```markdown
# Handoff Artifacts — [PHASE NAME]

## Purpose

This folder stores copy-ready Markdown artifacts that bridge one prompt or actor step to the next. These files prevent the workflow from relying on transient chat memory.

## Authority Rule

- Phase files remain the durable design and validation record.
- Handoff files are transport snapshots used to move cleanly between Architect, Builder, and human validation steps.
- If a handoff artifact conflicts with an approved phase file, update the phase file or regenerate the handoff before proceeding.

## Standard Handoff Files

| File | Created By | Used By | Purpose |
|---|---|---|---|
| `01_PHASE_INTAKE_HANDOFF.md` | Prompt 3A | Prompt 6 | Completed phase intake bundle. |
| `02_PHASE_FILE_BUNDLE.md` | Prompt 6 | Prompt 6A / Prompt 7 | Full generated phase-file content. |
| `03_PHASE_FILE_COMPLETENESS_REVIEW.md` | Prompt 6A | Prompt 7 / Prompt 8 | Readiness review and corrections. |
| `04_BUILDER_DRY_RUN_PLAN.md` | Prompt 8 | Prompt 8A | Builder no-edit implementation plan. |
| `05_DRY_RUN_APPROVAL.md` | Prompt 8A | Prompt 9 | Final approved pass objective and constraints. |
| `06_BUILDER_IMPLEMENTATION_REPORT.md` | Prompt 9 / 9A | Prompt 11A / 10A / 12A | Builder report captured into durable record. |
| `07_HUMAN_VALIDATION_RECORD.md` | Prompt 11A / 11 | Prompt 10A / 12A | Human validation observations and criteria status. |
| `08_REPAIR_HANDOFF.md` | Prompt 10A | Prompt 10 | Narrow repair scope and evidence. |
| `09_CLOSEOUT_READINESS_REVIEW.md` | Prompt 12A | Prompt 12 | Closeout readiness decision and unresolved items. |
| `10_COMMIT_ARCHIVE_SUMMARY.md` | Prompt 13 | Git/archive workflow | Commit, archive, or change-summary text. |
```

---

# phases/[PHASE]/handoffs/01_PHASE_INTAKE_HANDOFF.md

```markdown
# Phase Intake Handoff — [PHASE NAME]

## Handoff Status

Draft / Complete / Approved / Needs Revision

## Source Inputs

- Prompt used: Prompt 3A — Guided Phase Intake Interview
- Project profile:
- Placeholder intake:
- Human operator inputs:

## Completed Phase Intake Summary

- Phase name:
- Phase folder:
- Problem being solved:
- User/operator goal:
- Business/product goal:
- Affected users/operators:
- Affected systems/artifacts:
- In scope:
- Out of scope:
- Constraints:
- Prior decisions that must not regress:
- Required validation evidence:
- Acceptance-level success definition:
- Recommended Builder passes:

## Assumptions

- [Assumption]

## Open Questions

- [Question]

## Prompt 6 Input Instruction

Use this file as the controlling intake input for Prompt 6. Do not use a placeholder `01_INTAKE.md` as completed intake unless it matches this handoff.
```

---

# phases/[PHASE]/handoffs/02_PHASE_FILE_BUNDLE.md

```markdown
# Phase File Bundle — [PHASE NAME]

## Bundle Status

Draft / Ready for Review / Approved to Apply / Needs Revision

## Source Inputs

- Prompt used: Prompt 6 — Phase File Generation Prompt
- Phase intake handoff: `handoffs/01_PHASE_INTAKE_HANDOFF.md`
- Project profile:

## Files Included

- `00_PHASE_STATE.md`
- `01_INTAKE.md`
- `02_REQUIREMENTS.md`
- `03_CURRENT_SYSTEM_CONTEXT.md`
- `04_ARCHITECTURE_BLUEPRINT.md`
- `05_ACCEPTANCE_CRITERIA.md`
- `06_IMPLEMENTATION_PLAN.md`
- `07_BUILDER_PROMPTS.md`
- `08_VALIDATION_PLAN.md`
- `10_DECISIONS_LOG.md`
- `11_RISKS_AND_DEBT.md`
- `12_HANDOFF_TO_NEXT_PHASE.md`

## Apply Instruction

Use this bundle as the controlling input for Prompt 7 after Prompt 6A has either approved it or provided corrections.

## Generated File Content

[Paste full generated phase file content here.]
```

---

# phases/[PHASE]/handoffs/03_PHASE_FILE_COMPLETENESS_REVIEW.md

```markdown
# Phase File Completeness Review — [PHASE NAME]

## Review Status

Ready / Needs Minor Revision / Not Ready

## Source Inputs

- Prompt used: Prompt 6A — Phase File Completeness Review
- Reviewed bundle: `handoffs/02_PHASE_FILE_BUNDLE.md`

## Findings

- Missing sections:
- Vague requirements:
- Weak acceptance criteria:
- Missing validation evidence:
- Scope drift risks:
- Blocking questions:

## Corrections Required Before Prompt 7

- [Correction]

## Prompt 7 Decision

Proceed / Revise First / Return to Prompt 3A or Prompt 6
```

---

# phases/[PHASE]/handoffs/04_BUILDER_DRY_RUN_PLAN.md

```markdown
# Builder Dry-Run Plan — [PHASE NAME] — [PASS NAME]

## Plan Status

Submitted / Needs Revision / Approved / Rejected / Split Required

## Source Inputs

- Prompt used: Prompt 8 — Builder Dry-Run Planning Prompt
- Phase files read:
- Root AGENTS.md read: Yes / No / Missing

## Proposed Implementation Plan

- Files/artifacts likely to change:
- Files/artifacts that should not change:
- Data/process flow affected:
- UI/workflow flow affected:
- Risks and regression points:
- Checks expected:
- Manual validation required:
- Recommended pass size:
- Conflicts or blockers:

## Prompt 8A Input Instruction

Use this file as the controlling Builder dry-run input for Prompt 8A.
```

---

# phases/[PHASE]/handoffs/05_DRY_RUN_APPROVAL.md

```markdown
# Dry-Run Approval — [PHASE NAME] — [PASS NAME]

## Approval Status

Approved / Approved with Changes / Rejected / Split Required

## Source Inputs

- Prompt used: Prompt 8A — Dry-Run Review and Approval Prompt
- Reviewed dry-run plan: `handoffs/04_BUILDER_DRY_RUN_PLAN.md`

## Approval Decision

- Decision:
- Required changes:
- Scope limits:
- Disallowed changes:
- Required validation:
- Human validation required:

## Final Approved Pass Objective

[Approved pass objective.]

## Prompt 9 Input Instruction

Use this file as the controlling approval input for Prompt 9. Do not implement from an unapproved dry-run plan.
```

---

# phases/[PHASE]/handoffs/06_BUILDER_IMPLEMENTATION_REPORT.md

```markdown
# Builder Implementation Report — [PHASE NAME] — [PASS NAME]

## Report Status

Submitted / Captured / Needs Clarification

## Source Inputs

- Prompt used: Prompt 9 — Builder Implementation Prompt
- Approved dry-run approval: `handoffs/05_DRY_RUN_APPROVAL.md`

## Builder Report

### Files / Artifacts Changed

- [File/artifact]

### Summary of Implementation

[Summary.]

### Checks Run

- [Check] — [Result]

### Checks Skipped and Why

- [Check] — [Reason]

### Manual Validation Required

- [Validation]

### Residual Risks

- [Risk]

## Prompt 11A / 10A / 12A Input Instruction

Use this file as the Builder-report input for validation capture, repair triage, or closeout readiness.
```

---

# phases/[PHASE]/handoffs/07_HUMAN_VALIDATION_RECORD.md

```markdown
# Human Validation Record — [PHASE NAME] — [PASS NAME]

## Validation Status

Pass / Fail / Unclear / Deferred / Mixed

## Source Inputs

- Prompt used: Prompt 11A or Prompt 11
- Builder report: `handoffs/06_BUILDER_IMPLEMENTATION_REPORT.md`
- Acceptance criteria:
- Evidence references:

## Environment

- Device/system:
- Build/run procedure:
- Data used:

## Observed Behavior

[Observed behavior.]

## Acceptance Criteria Results

| Criterion | Result | Evidence | Notes |
|---|---|---|---|
| AC-01 | Pass / Fail / Unclear / Deferred | [Evidence] | [Notes] |

## Required Repair

[None or repair summary.]

## Prompt 10A / 12A Input Instruction

Use this file as validation input for repair triage or closeout readiness.
```

---

# phases/[PHASE]/handoffs/08_REPAIR_HANDOFF.md

```markdown
# Repair Handoff — [PHASE NAME] — [PASS NAME]

## Repair Status

Draft / Ready for Builder / In Repair / Repaired / Deferred

## Source Inputs

- Prompt used: Prompt 10A — Architect Repair Triage Prompt
- Failed validation record: `handoffs/07_HUMAN_VALIDATION_RECORD.md`
- Builder report:
- Evidence:

## Failed Criteria

- [AC-ID] — [Failure]

## Root-Cause Hypothesis

[Hypothesis or uncertainty.]

## Repair Scope

[What should be fixed.]

## Repair Non-Goals

- [Do not change]

## Files / Artifacts Likely Affected

- `[path/artifact]`

## Validation Required After Repair

- [Validation]

## Prompt 10 Builder Input Instruction

Use this file as the controlling repair input for Prompt 10. Do not broaden repair scope.
```

---

# phases/[PHASE]/handoffs/09_CLOSEOUT_READINESS_REVIEW.md

```markdown
# Closeout Readiness Review — [PHASE NAME]

## Readiness Status

Ready / Not Ready / Ready with Accepted Deferrals

## Source Inputs

- Prompt used: Prompt 12A — Phase Closeout Readiness Interview
- Phase state:
- Validation results:
- Human validation record:
- Builder report:
- Risks/debt:

## Review Findings

- Completed items:
- Validated items:
- Failed criteria remaining:
- Unclear criteria remaining:
- Accepted deferrals:
- Decisions to promote:
- Risks/debt to promote:
- Recommended next phase:

## Prompt 12 Input Instruction

Use this file as the controlling closeout-readiness input for Prompt 12.
```

---

# phases/[PHASE]/handoffs/10_COMMIT_ARCHIVE_SUMMARY.md

```markdown
# Commit / Archive Summary — [PHASE NAME]

## Summary Status

Draft / Used / Superseded

## Source Inputs

- Prompt used: Prompt 13 — Commit / Archive Message Prompt
- Builder report:
- Human validation record:
- Phase closeout summary:

## One-Line Subject

[Subject under 72 characters.]

## Summary Body

- [Change]
- [Validation]
- [Deferred work]
- [Risks/debt promoted]
```
