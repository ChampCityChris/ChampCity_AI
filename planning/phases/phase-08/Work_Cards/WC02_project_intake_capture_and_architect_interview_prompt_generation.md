# Work Card — Phase 08 WC02 Project Intake Capture and Architect Interview Prompt Generation

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium
Depends on: WC01, WC01A, WC01B
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC02_project_intake_capture_and_architect_interview_prompt_generation.md`

## Purpose

Implement `project-intake-capture`, the fixed Operator questionnaire, safe project-repository selection and initialization, the durable Project Intake pair, and the deterministic Project Architect Interview Prompt pair.

## Controlling Designs

- `PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md`
- `PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`
- `ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`

## Workspace

```text
id: project-intake-capture
level: project
stage: intake
order: 10
```

## Fixed Fields

Required:

- Project Name — short text
- Project Purpose — long text
- Desired Outcome — long text
- Project Type — approved dropdown values
- Project Repository — repository/folder selector
- Existing source code or project-planning documents — Yes/No

Optional:

- Known Constraints or Non-Negotiables
- repository-review context, visible only when the existing-project answer is Yes

## Repository Initialization

Repository selection must be main/preload mediated. The renderer receives no unrestricted filesystem authority.

When the selected repository has no `planning/` directory, WC02 must safely initialize only the minimal project planning directories needed for Project Intake and generated handoffs. It must not initialize phases, Work Cards, Git, dependencies, source code, or hidden state.

An inaccessible or invalid selection produces a local actionable error.

## Canonical Outputs

```text
planning/project/Project_Intake/PROJECT_INTAKE_<project-slug>.md
planning/project/Project_Intake/PROJECT_INTAKE_<project-slug>.json

planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<project-slug>.md
planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<project-slug>.json
```

Successful Operator submission writes the Project Intake as:

```text
participationRole=gatingReview
Document.Status=Approved
```

The direct Submit action is the Operator's approval of the captured answers; no second intake approval screen is created.

The generated prompt uses:

```text
participationRole=nonReviewHandoff
Document.Status=Approved
```

It must name the exact Architect output target:

```text
planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_<project-slug>.md
planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_<project-slug>.json
```

Both artifact pairs must contain `artifactRevision`; the prompt records the current Project Intake source revision.

## Reconciliation Prompt

A Yes answer requires the Architect to inspect the selected repository through ChampCity MCP, distinguish verified facts from Operator statements and recommendations, cite repository-relative paths where practical, and ensure later planning begins from verified current state.

Do not create a standalone reconciliation artifact by default.

## Editing and Invalidation

Editing substantive intake content increments its revision, regenerates the non-review prompt, and invokes the WC01B invalidation chain. Any existing Architect Interview and downstream planning evidence becomes Pending or stale according to the shared contract.

No stale generated prompt may be retained.

## Write Safety

Use synchronized staged writes and rollback. Show resulting repository-relative paths. Pair-write failure may not be reported as success.

## Explicit Non-Goals

No embedded browser, MCP browser handoff, live interview, Project Planning, repository reconciliation execution, lifecycle persistence, provider API, new dependency, Git command, commit, or push.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Cover empty-repository initialization, fixed fields, conditional input, slugging, pair synchronization, greenfield/reconciliation prompts, canonical interview output target, Approved non-review handoff role, revision regeneration, invalidation, and rollback.

## Acceptance Criteria

1. `project-intake-capture` is registry-backed at Project / Intake order 10.
2. The fixed form and conditional field match the approved design.
3. New repositories receive only minimal safe planning initialization.
4. Project Intake and prompt pairs use canonical paths and revisions.
5. Submitted Project Intake is Approved without a duplicate approval screen.
6. Generated prompt is an Approved `nonReviewHandoff` and cannot gate progression.
7. The prompt names the canonical interview output pair.
8. Existing-project prompts require the approved repository review.
9. Intake edits regenerate the prompt and invalidate downstream evidence.
10. Pair writes are safe and errors remain local.
11. No later workspace or Git behavior is introduced.
12. Typecheck, build, and tests pass.

## Implementer Report Requirements

Record repository verification, changed files, initialization boundary, field contract, paths, disposition/participation treatment, revision behavior, invalidation evidence, validation results, and remaining Operator validation. End with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should complete greenfield and existing-project intakes, inspect both output pairs, edit intake content, and confirm prompt regeneration and downstream invalidation.

## Document Disposition

Document.Status=Approved
