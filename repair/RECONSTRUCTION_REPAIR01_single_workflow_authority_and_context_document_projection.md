# RECONSTRUCTION-REPAIR01 — Single Workflow Authority and Context-Document Projection

## Repair Type

Temporary pre-dogfood reconstruction repair. This card is intentionally stored outside `planning/` because the defect being repaired causes planning-document classification and workspace projection to mis-handle non-lifecycle documents. The repair artifacts are temporary evidence and are not new canonical project-planning authority.

## Governing Standard

Use:

`planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

This Repair Card is evidence-derived, tightly bounded, and must not reopen unrelated accepted behavior.

## Parent / Failed Workflow

The failed workflow is the fresh ChampCity A/I reconstruction transition from Approved Project Architect Interview to Project Planning.

Current reconstruction corpus under `planning/` is exactly:

- `planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md`
- `planning/project/Design_Documents/FUTURE_APPLICATION_DESIGN.md`
- `planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`
- `planning/project/Project_Intake/PROJECT_INTAKE_champcity_a_i.md`
- `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md`
- `planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_champcity_a_i.md`

There is no active `planning/phases/` corpus and no active `planning/Architect_Drafts/` content.

## Confirmed Failure Evidence

After the Project Architect Interview is Approved:

1. While the Operator remains in the Architect Interview workspace, the top rail reports:
   - Project Intake: Completed
   - Architect Interview: Completed
   - Project Planning: Ready
2. When the Operator enters the Project Planning workspace, Project Planning changes to `Needs Attention`.
3. `Prepare Project Planning Handoff` becomes disabled.
4. The Project Planning document surface selects `WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` as though it were a Pending Project Planning review document.
5. The UI displays disposition controls for that standards document, but the disposition cannot be applied because the file is plain noncanonical Markdown.
6. Fully terminating and restarting ChampCity A/I does not clear the blocker.

The Operator must not be required to approve, rewrite, relocate, or otherwise mutate the retained Work Card standard, current application baseline, or future application design merely to allow Project Planning to begin.

## Confirmed Repository Facts

### Canonical lifecycle evidence is valid

The current Project Intake is canonical, readable, Approved, and declares existing source/planning.

The Project Architect Interview Prompt is canonical, Approved, and references the current Project Intake revision.

The Project Architect Interview is canonical, readable, Approved, and references the current Project Intake and Prompt revisions.

`CURRENT_APPLICATION_BASELINE.md` is canonical `artifactType=context-document`, `participationRole=contextOnly`, Approved.

`FUTURE_APPLICATION_DESIGN.md` is canonical `artifactType=context-document`, `participationRole=contextOnly`, Approved.

`WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` is plain Markdown. `planningDocumentService` therefore reads it as `artifactType=legacy-unmanaged`, `participationRole=historical`.

### The semantic lifecycle resolver does not require the standard as a gate

`src/shared/documents/lifecycleArtifact.ts` classifies `contextOnly` and historical material as non-gating lifecycle evidence.

`src/shared/documents/documentOrder.ts` excludes `nonReviewHandoff`, `contextOnly`, and `historical` documents from `isCurrentLifecycleDocument()` before freshness/disposition gating.

The repository-derived top-rail projection therefore reports Project Planning `Ready` before the Project Planning workspace-specific model overrides it.

### A parallel path/filename-based workspace classifier remains

`src/shared/workspaces/documentWorkspace.ts` independently assigns UI workspaces by path/filename heuristics.

Confirmed problematic rules include:

- `legacy-unmanaged` / `historical` documents are forced into `project-planning-review` under `Historical and unmanaged documents`;
- any path containing `design_documents` is classified by `isPhasePlanning()` into `phase-planning-bundle`.

This causes the cleaned Design Documents corpus to be projected incorrectly:

```text
CURRENT_APPLICATION_BASELINE.md
canonical contextOnly
→ Phase Planning

FUTURE_APPLICATION_DESIGN.md
canonical contextOnly
→ Phase Planning

WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md
legacy-unmanaged / historical
→ Project Planning
```

### The renderer also contains duplicate review-document logic

`src/renderer/app/App.tsx` defines a local `isWorkflowReviewDocument()` that treats every document except `nonReviewHandoff` as reviewable. That means `contextOnly` and `historical` documents can be auto-selected as lifecycle review documents.

A separate helper already exists at:

`src/renderer/app/workflowReviewDocuments.ts`

but `App.tsx` does not use it. Even that helper must be checked against the intended invariant below because lifecycle review eligibility should be limited to actual review roles, not merely canonical/non-handoff content.

### Multiple state projections can disagree

The current code has separate mechanisms for lifecycle/workspace state, including:

- `classifyLifecycleArtifact()`;
- `resolveFirstNonApproved()`;
- `classifyPlanningDocument()`;
- `deriveProjectLifecycleRailStatuses()`;
- `getArchitectOutputWorkspaceModel()` and its domain-specific overlays.

In `App.tsx`, the repository-derived rail status can be overwritten by the active `architectOutputModel.railStatus` when an Architect-output workspace is entered. The observed result is Project Planning `Ready` outside the workspace and `Needs Attention` inside it.

The repair must remove the contradictory authority effect. Presentation helpers may remain, but they must not create a second answer to the authoritative lifecycle state.

## Confirmed Defect

ChampCity A/I retains parallel document-routing/review-state logic from the earlier workflow architecture. Path-based workspace assignment and broad renderer review predicates can promote context/historical documents into lifecycle review surfaces. The active Architect-output workspace model can then override a repository-derived `Ready` Project Planning state with a contradictory `Needs Attention` state.

The result is a false Project Planning blocker on a valid reconstruction corpus.

## Root Cause

Workflow authority and UI presentation are not fully separated.

Canonical semantic metadata and exact lifecycle relationships govern the repository resolver, while older path/filename heuristics and duplicated renderer predicates independently determine workspace ownership, auto-selection, review controls, and active-workspace rail presentation.

Those parallel mechanisms disagree for the cleaned reconstruction corpus.

## Repair Objective

Establish one semantic workflow-authority result for Project Planning and make renderer/workspace presentation consume that result without inventing additional lifecycle gates.

After repair, the exact six-file reconstruction corpus above must transition from Approved Architect Interview to Project Planning with Project Planning consistently `Ready`, with `Prepare Project Planning Handoff` enabled.

Context-only and historical documents may remain inspectable as reference material, but they must never masquerade as pending lifecycle review artifacts or become disposition gates.

## Authorized Scope

### 1. Correct document workspace projection

Inspect and minimally repair:

- `src/shared/workspaces/documentWorkspace.ts`
- related workspace-document tests

Requirements:

- remove `design_documents` as a Phase Planning ownership heuristic;
- stop treating `legacy-unmanaged` / `historical` material as Project Planning review authority;
- classify lifecycle-owned documents from semantic artifact metadata / participation role wherever such metadata exists;
- context documents may be grouped for reference, but their physical directory must not convert them into Project Planning or Phase Planning review artifacts;
- plain historical/unmanaged documents may be visible as reference/history, but not as the current review document of a lifecycle workspace.

Do not create a new planning authority system or a new persistence schema merely to solve presentation grouping.

### 2. Establish strict lifecycle review eligibility

Inspect and minimally repair:

- `src/renderer/app/App.tsx`
- `src/renderer/app/workflowReviewDocuments.ts`
- `src/shared/workspaces/projectRailPresentation.ts` if required
- relevant renderer/workspace tests

Required invariant:

```text
Lifecycle review document = canonical, readable, non-error document
AND participationRole is gatingReview or compoundGatingReview
AND the artifact semantically belongs to that lifecycle review workspace.
```

The following must never be auto-selected or dispositioned as lifecycle review documents:

- `contextOnly`;
- `historical`;
- `nonReviewHandoff`;
- `legacy-unmanaged` / noncanonical Markdown.

Remove or consolidate duplicate review predicates rather than leaving multiple divergent implementations.

### 3. Remove contradictory active-workspace rail authority

Inspect and minimally repair:

- `src/shared/workspaces/projectLifecycleRailStatus.ts`
- `src/main/architectOutputs/architectOutputWorkspaceService.ts`
- `src/main/projectPlanning/projectPlanningService.ts`
- `src/main/projectPlanning/projectPlanningContext.ts`
- renderer rail override logic in `src/renderer/app/App.tsx`

Requirements:

- entering Project Planning must not change the underlying Project Planning lifecycle state merely because a workspace-specific projection is loaded;
- one authoritative Project Planning state must drive both the rail and handoff eligibility;
- the Project Planning Architect-output workspace may expose output-specific UI state, but must not invent a contradictory lifecycle gate;
- if Project Planning genuinely cannot prepare a handoff, the exact blocking reason and evidence path(s) must be surfaced to the Operator rather than only showing `Needs Attention` and disabling the button;
- the clean six-file reconstruction corpus must resolve as `reconciliation-required`, `ready-for-handoff`, `canPrepareHandoff=true` before a Project Planning handoff exists.

The Implementer must trace and state the exact current code path that produces the observed live `Needs Attention` result. Do not simply force the rail label to `Ready` or enable the button unconditionally.

### 4. Add the real reconstruction regression fixture

Add focused regression coverage that reproduces the current cleaned repository shape:

- Approved canonical Project Intake;
- Approved canonical Architect Interview Prompt referencing the Intake;
- Approved canonical Project Architect Interview referencing Intake + Prompt;
- Approved canonical `contextOnly` Current Application Baseline under `planning/project/Design_Documents/`;
- Approved canonical `contextOnly` Future Application Design under the same directory, including source references that may point to deliberately removed historical development artifacts;
- plain noncanonical `WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` under the same directory;
- substantive source under `src/`;
- no Project Profile;
- no Project Roadmap;
- no `planning/phases/` corpus;
- no Architect draft files.

The fixture must prove both main-process/project-planning behavior and renderer/workspace projection behavior.

## Required Acceptance Criteria

### AC1 — Clean reconstruction resolves Project Planning Ready

With the exact regression corpus:

```text
Project Intake          Completed
Architect Interview     Completed
Project Planning        Ready
```

Project Planning model must report:

```text
reconciliationMode = reconciliation-required
state = ready-for-handoff
canPrepareHandoff = true
```

### AC2 — Workspace navigation cannot change lifecycle truth

Switching between Architect Interview and Project Planning must not change Project Planning from `Ready` to `Needs Attention` unless repository evidence actually changes.

The top rail and Project Planning handoff controls must consume consistent authority.

### AC3 — Handoff can be prepared

Before Profile/Roadmap outputs exist, `Prepare Project Planning Handoff` is enabled.

Invoking it creates/prepares the current Project Planning handoff and draft-bundle contract through the existing application-owned path. The repair must not bypass `generateProjectPlanningHandoff()`, `prepareProjectPlanningHandoff()`, or the existing Architect-output promotion contract.

### AC4 — Context documents are reference only

`CURRENT_APPLICATION_BASELINE.md` and `FUTURE_APPLICATION_DESIGN.md` remain readable/available as context but:

- are not Project Planning or Phase Planning disposition targets;
- are not auto-selected as the current lifecycle review document;
- do not block handoff preparation because they are `contextOnly` or because their historical source references are no longer present.

### AC5 — The Work Card standard is not a lifecycle review artifact

`WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` may remain plain Markdown and historical/unmanaged.

It must not:

- become the current Project Planning review document;
- display actionable lifecycle disposition controls;
- block Project Planning;
- require conversion to current canonical schema merely to proceed.

### AC6 — Review controls are semantically bounded

Only canonical `gatingReview` or `compoundGatingReview` artifacts that semantically belong to the active lifecycle review workspace may receive lifecycle disposition controls.

`contextOnly`, `historical`, `nonReviewHandoff`, and noncanonical documents fail closed as non-review reference material.

### AC7 — Actual Project Planning review still works

After valid Project Profile and Project Roadmap drafts are promoted through the existing atomic bundle path:

- both outputs appear in the Project Planning review surface;
- both remain synchronized as one compound review bundle;
- disposition controls function for the real outputs;
- Approved Profile + Roadmap complete Project Planning and allow Phase Map progression.

### AC8 — Genuine Project Planning defects still block

Existing true failure cases must continue to report `Needs Attention` or `Not Ready` as appropriate, including malformed canonical evidence, target collisions, duplicate canonical Intake evidence, stale required lifecycle sources, and partial/mismatched Profile/Roadmap bundles.

The repair must not weaken real evidence/freshness protections in order to make the reconstruction fixture pass.

### AC9 — Exact blocker diagnostics are visible

If the Project Planning workspace-specific model reports a blocking state, the Operator-facing UI must show the model's exact reason rather than only a generic `Needs Attention` state with disabled actions.

### AC10 — No parallel replacement workflow

The repair must consolidate or align existing classification/projection helpers. It must not introduce another resolver, hidden state store, special reconstruction bypass, filename exception specific to ChampCity A/I, or manually hard-coded six-file allowlist.

## Preserved Behavior

The following must remain unchanged except where required by the defect above:

- canonical Markdown metadata and disposition model;
- source-revision freshness checks for lifecycle artifacts;
- Project Intake and Architect Interview behavior;
- Project Planning reconciliation mode for existing-source repositories;
- atomic Project Profile + Project Roadmap draft promotion and compound review;
- Phase Map gating on current Approved Profile + Roadmap;
- Work Card, Repair, Validation, and Close lifecycle behavior;
- Agent Harness/MCP runtime and OAuth behavior;
- Codex implementation harness;
- development-environment provisioning;
- selected-project behavior unrelated to this presentation/authority defect.

## Forbidden Changes

Do not:

- modify the approved Project Intake or Project Architect Interview to work around this bug;
- rewrite `CURRENT_APPLICATION_BASELINE.md`, `FUTURE_APPLICATION_DESIGN.md`, or the Work Card standard merely to satisfy the current classifier;
- move Design Documents into Project/Phase lifecycle folders as a workaround;
- create placeholder Project Profile/Roadmap artifacts;
- weaken canonical source-revision or freshness validation for actual lifecycle artifacts;
- hard-code ChampCity A/I filenames as a special case;
- create a second lifecycle resolver or another persistent workflow-state index;
- restore removed Phase 01–08 planning history;
- redesign unrelated renderer workspaces;
- modify Agent Harness OAuth/MCP behavior;
- perform Git stage/commit/push/branch mutation unless separately authorized by the Operator.

## Required Files / Areas to Inspect

At minimum inspect:

- `src/shared/documents/lifecycleArtifact.ts`
- `src/shared/documents/documentOrder.ts`
- `src/shared/workspaces/documentWorkspace.ts`
- `src/shared/workspaces/projectLifecycleRailStatus.ts`
- `src/shared/workspaces/projectRailPresentation.ts`
- `src/main/projectPlanning/projectPlanningContext.ts`
- `src/main/projectPlanning/projectPlanningPreflight.ts`
- `src/main/projectPlanning/projectPlanningService.ts`
- `src/main/architectOutputs/architectOutputWorkspaceService.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/workflowReviewDocuments.ts`
- existing Project Planning, workspace, rail, and renderer tests.

Inspect additional production code only where necessary to trace the exact live `Needs Attention` path.

## Focused Validation

Do not run the entire historical suite by default for this bounded repair.

Required validation:

```text
npm run typecheck
npm run build
node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/workspaces/workspace-document-review.test.cjs test/renderer/document-review-surface-source.test.cjs test/renderer/architect-output-workspace-source.test.cjs test/renderer/figma-redesign-shell.test.cjs
```

Add and run one focused reconstruction regression test file for the exact cleaned six-document corpus. If the Implementer chooses a different filename, report it exactly.

If implementation expands beyond the authorized surfaces above, add only the directly relevant focused regression lane and explain why. Full `npm test` is not required unless the repair unexpectedly changes broad lifecycle behavior.

## Required Live Operator Validation

After focused tests pass:

1. Launch ChampCity A/I against the cleaned reconstruction corpus.
2. Verify Architect Interview remains Completed.
3. Verify Project Planning shows Ready before entering the workspace.
4. Enter Project Planning.
5. Verify Project Planning remains Ready.
6. Verify no context/historical standards document is presented as the current lifecycle review artifact.
7. Verify `Prepare Project Planning Handoff` is enabled.
8. Prepare the Project Planning handoff.
9. Verify the workspace transitions to the normal waiting-for-output/copy-handoff state.
10. Continue through creation/promotion of Project Profile + Roadmap and verify their compound review controls.

Any failure must be captured as exact runtime evidence and must not be bypassed by manually editing dispositions.

## Implementer Report

Write the complete Repair Implementer Report to:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01_single_workflow_authority_and_context_document_projection.md`

The report must include:

- repository/branch/status verification;
- exact defect reproduced before correction;
- exact code path that caused Project Planning to become `Needs Attention` only when its workspace-specific model loaded;
- root cause;
- files changed;
- classification/projection logic removed, consolidated, or changed;
- reconstruction regression fixture description;
- focused validation commands and exact results;
- preserved true-blocker tests;
- deviations;
- blockers;
- remaining Operator live validation;
- confirmation that no Git mutation was performed unless separately authorized.

## Return Path

After implementation, return this repair for Architect code review and then Operator live validation.

If the repair passes, the Operator will archive/remove the temporary `repair/` artifacts and continue the fresh ChampCity A/I reconstruction from the existing Approved Project Architect Interview into Project Planning.

Do not create new canonical Project Planning artifacts outside the normal application workflow during this repair.
