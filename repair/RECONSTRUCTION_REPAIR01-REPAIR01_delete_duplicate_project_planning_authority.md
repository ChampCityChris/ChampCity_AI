# RECONSTRUCTION-REPAIR01-REPAIR01 — Delete Duplicate Project Planning Authority

## Repair Type

Repair of failed Architect review for `RECONSTRUCTION-REPAIR01`.

This repair is a temporary pre-dogfood reconstruction repair and remains outside `planning/` so the current reconstruction corpus is not polluted by repair-control artifacts.

## Governing Standard

Use:

`planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

The correction must remain concise, evidence-derived, and limited to the failed authority-consolidation requirement.

## Parent Repair / Failed Review

Parent Repair Card:

`repair/RECONSTRUCTION_REPAIR01_single_workflow_authority_and_context_document_projection.md`

Parent Implementer Report:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01_single_workflow_authority_and_context_document_projection.md`

Architect disposition:

`RECONSTRUCTION-REPAIR01 — REVISION REQUIRED`

The parent repair successfully corrected context/historical document projection and strict review-document eligibility, but it did not complete the central requirement to establish one Project Planning authority.

## Preserved Passed Scope From Parent Repair

The following parent-repair behavior is already correct and must remain intact:

- `classifyPlanningDocument()` consults semantic lifecycle classification before path/filename fallback behavior;
- `design_documents` is no longer a Phase Planning ownership heuristic;
- canonical `contextOnly` documents remain reference material rather than lifecycle review authority;
- historical/unmanaged documents remain reference/history rather than lifecycle review authority;
- `workflowReviewDocuments.ts` requires canonical readable `gatingReview` or `compoundGatingReview` evidence in the correct semantic workspace;
- `App.tsx` no longer uses its former broad local predicate that treated every role except `nonReviewHandoff` as reviewable;
- the clean reconstruction fixture exists and verifies context/history is not selected as Project Planning review output.

Do not reopen or redesign those passed corrections unless directly required to remove the remaining duplicate authority.

## Confirmed Remaining Defect

Project Planning still has two independent state authorities.

### Authority A — main-process Project Planning model

`src/main/projectPlanning/projectPlanningService.ts`

`getProjectPlanningWorkspaceModel(workspaceRoot)` resolves the real Project Planning state from:

- canonical Intake / Prompt / Interview relationships;
- Project Planning reconciliation preflight;
- substantive repository evidence;
- malformed planning evidence;
- Project Profile / Roadmap target collisions;
- current handoff state;
- Profile / Roadmap bundle state;
- source-revision freshness;
- exact blocking reason and evidence paths;
- handoff preparation eligibility.

This is the authoritative Project Planning model and must remain the sole owner of Project Planning lifecycle state.

### Authority B — duplicate renderer/shared Project Planning calculation

`src/shared/workspaces/projectLifecycleRailStatus.ts` still independently computes Project Planning through:

```text
deriveProjectPlanningRailStatus()
→ projectPlanningContextFromSummaries()
→ projectPlanningTargets()
→ bundleState()
→ defaultInterviewTarget()
→ projectSlugFromInterview()
→ hasSourceRevision() where used only by this duplicate Project Planning chain
```

This calculation has less information than the main-process model. In particular, it cannot evaluate the complete Project Planning repository preflight that can detect conditions such as greenfield/source mismatch or malformed planning evidence.

As a result it can report:

```text
Project Planning = Ready
```

while the authoritative Project Planning model reports:

```text
Project Planning = Needs Attention
```

### Active-workspace override still masks the duplication

`src/renderer/app/App.tsx` still does this after deriving the top rail:

```text
deriveProjectLifecycleRailStatuses(...)
        ↓
renderer-side Project Planning result

then, when an Architect-output model is loaded:

statuses[architectOutputModel.workspaceId] = architectOutputModel.railStatus
```

For `project-planning-review`, the active workspace therefore replaces one Project Planning state calculation with another only after the Project Planning model is loaded.

That is the same architectural pattern that produced the original observed defect:

```text
before entering Project Planning → one authority result
enter Project Planning          → second authority result replaces it
```

The parent repair made the two paths agree for the clean reconstruction fixture but did not delete the duplicate authority.

## Root Cause

The earlier workflow architecture left a renderer/shared convenience projection that independently reconstructs Project Planning state from document summaries.

Later Project Planning work introduced a richer main-process Project Planning model with repository reconciliation and exact handoff eligibility, but the old renderer/shared calculation was retained instead of being removed.

The active Architect-output workspace rail override then became a reconciliation mechanism between two authorities rather than a simple presentation mechanism.

This repair must remove that architecture, not add synchronization tests around it.

## Repair Objective

Delete the duplicate Project Planning lifecycle calculation and establish this single authority path:

```text
resolveProjectPlanningContext(workspaceRoot)
        ↓
getProjectPlanningWorkspaceModel(workspaceRoot)
        ↓
ProjectPlanningWorkspaceModel
  state
  railStatus
  canPrepareHandoff
  reason
  evidencePaths
        ↓
renderer / top rail / Project Planning controls
```

There must not be a second function that independently infers Project Planning lifecycle state from `PlanningDocumentSummary[]`.

The top rail must show the same authoritative Project Planning state before, during, and after navigation into the Project Planning workspace because it consumes the same model, not because two calculations are tested to remain equivalent.

## Required Deletion

The Implementer must physically remove the duplicate Project Planning authority code from `src/shared/workspaces/projectLifecycleRailStatus.ts`.

At minimum delete:

- `deriveProjectPlanningRailStatus()`;
- `projectPlanningContextFromSummaries()`;
- `projectPlanningTargets()`;
- `bundleState()`;
- `defaultInterviewTarget()` if it becomes unused after deletion;
- `projectSlugFromInterview()` if it becomes unused after deletion;
- `hasSourceRevision()` if it becomes unused after deletion;
- any imports/types that exist only to support the deleted Project Planning recomputation.

Do not leave these functions commented out, deprecated, wrapped, renamed, or hidden behind a compatibility flag.

Do not replace them with a new renderer-side Project Planning resolver under another name.

If a listed helper is still legitimately used by a non-Project-Planning lifecycle calculation, retain only that legitimately shared portion and explain the use in the Implementer Report. The Project Planning recomputation itself must be gone.

## Authorized Architecture

### 1. Main-process Project Planning model is the sole authority

Retain:

`getProjectPlanningWorkspaceModel(workspaceRoot)`

as the sole Project Planning state authority.

Do not duplicate its logic in the renderer or shared presentation code.

The authoritative model already owns:

```text
state
railStatus
requiredAction
reason
evidencePaths
canPrepareHandoff
canCopyHandoff
reconciliationMode
repositoryReviewRequired
bundleSynchronizationState
```

Presentation code must consume these outputs rather than reconstructing them.

### 2. Make authoritative Project Planning status available independent of active workspace

The renderer must have the authoritative Project Planning model/status available before the Operator enters Project Planning.

Use the smallest existing application-owned IPC/projection path that directly returns or transparently projects `getProjectPlanningWorkspaceModel()`.

Acceptable implementation shapes include:

- a minimal read-only Project Planning model IPC/preload method; or
- extending an existing current-project model/projection to include the authoritative Project Planning result.

A generic Architect-output wrapper may be reused only if it directly consumes `getProjectPlanningWorkspaceModel()` and does not independently calculate Project Planning lifecycle state.

Do not create another state store, resolver, cache authority, or renderer-side reimplementation.

### 3. Change the top-rail derivation contract

`deriveProjectLifecycleRailStatuses()` may continue to derive downstream project rail states, but it must no longer calculate Project Planning itself.

Its Project Planning status must be supplied as an authoritative input.

Intended shape:

```text
deriveProjectLifecycleRailStatuses(documents, {
  projectIntakeStatus,
  architectInterviewStatus,
  projectPlanningStatus
})
```

or an equivalently direct projection.

The function may continue using the supplied Project Planning status to determine whether Phase Map and later project stages are ready.

It must not infer Project Planning state from the document corpus.

### 4. Delete the Project Planning active-workspace rail replacement

In `App.tsx`, remove the special behavior that allows a Project Planning Architect-output model loaded only while the workspace is active to replace the already displayed Project Planning lifecycle status.

Specifically, `project-planning-review` must not participate in an active-workspace-only assignment equivalent to:

```text
statuses[architectOutputModel.workspaceId] = architectOutputModel.railStatus
```

if that assignment is what changes Project Planning authority depending on navigation state.

Architect-output models may still control output-slot presentation, copy/prepare actions, review controls, and other output-specific UI behavior.

They must not become a second lifecycle-state authority.

### 5. Handoff eligibility must consume the same authority

`Prepare Project Planning Handoff` must be enabled/disabled from the authoritative Project Planning model or a transparent projection of that model.

The rail and the handoff button must therefore have the same underlying authority.

Do not solve this by enabling the button whenever the rail says Ready.

Do not solve it by making the renderer infer eligibility.

### 6. Surface exact blockers

When the authoritative Project Planning model reports `not-ready` or `needs-attention`, the Project Planning workspace must visibly show:

- the exact `reason` or `requiredAction`;
- relevant `evidencePaths` where practical;
- disabled handoff actions as a consequence of that model state.

A generic `Needs Attention` label with no explanation is not sufficient.

This diagnostic presentation is not a new gate; it explains the existing authoritative gate.

## Required Acceptance Criteria

### AC1 — Duplicate Project Planning calculation is deleted

Production source no longer contains:

```text
deriveProjectPlanningRailStatus
projectPlanningContextFromSummaries
projectPlanningTargets
bundleState
```

for Project Planning lifecycle inference.

No replacement renderer/shared Project Planning state resolver exists.

A source-level regression test must assert the duplicate authority functions are absent.

### AC2 — One Project Planning authority exists

`getProjectPlanningWorkspaceModel()` is the only code path that decides Project Planning lifecycle state, handoff eligibility, reconciliation blockers, and Project Planning reason/evidence.

The Implementer Report must identify the exact data path from this model to:

- Project Planning top-rail status;
- Project Planning handoff button eligibility;
- Project Planning blocker diagnostics.

### AC3 — Rail state is navigation-independent

For the same unchanged repository state:

```text
Architect Interview workspace
Project Planning workspace
another project-level workspace
```

must all display the same Project Planning rail status because they consume the same authoritative model.

Entering Project Planning must not trigger a different Project Planning state calculation.

### AC4 — Clean reconstruction remains Ready

Using the existing exact reconstruction fixture:

```text
Project Intake      Completed
Architect Interview Completed
Project Planning    Ready
```

and authoritative Project Planning model:

```text
reconciliationMode = reconciliation-required
state = ready-for-handoff
canPrepareHandoff = true
```

The Work Card standard and context-only design documents remain non-gating references.

### AC5 — True blocker is visible before workspace entry

Add a regression case where Project Planning genuinely blocks—for example:

```text
Project Intake declares greenfield
+ substantive source exists
```

The authoritative Project Planning model must report `Needs Attention` with the exact greenfield/source mismatch reason.

The top rail must already show `Needs Attention` before entering Project Planning.

Entering Project Planning must leave that rail state unchanged.

This test is critical: it proves one authority rather than happy-path agreement.

### AC6 — Exact blocker diagnostics are visible

In the true-blocker regression/UI presentation:

- the exact authoritative Project Planning reason is surfaced;
- `Prepare Project Planning Handoff` is disabled;
- no context/historical document is presented as the cause unless it is genuinely part of the authoritative blocker evidence.

### AC7 — Downstream rail dependency still works

Phase Map and later project-level rail states must continue to consume Project Planning completion/readiness correctly.

When authoritative Project Planning is not Completed, Phase Map remains appropriately Not Ready/Needs Attention according to existing semantics.

When authoritative Project Planning becomes Completed, Phase Map readiness behaves as before.

Do not duplicate Project Planning state to preserve downstream rail behavior.

### AC8 — Real Project Planning review remains intact

After valid Project Profile and Project Roadmap outputs are promoted:

- Project Planning output slots remain visible;
- compound review remains synchronized;
- actual Project Planning dispositions still function;
- Approved current Profile + Roadmap produce Project Planning Completed;
- downstream Phase Map progression remains intact.

### AC9 — Parent repair corrections remain intact

Regression coverage must continue proving:

- `contextOnly` documents are reference only;
- historical/unmanaged documents are reference/history only;
- only canonical `gatingReview` / `compoundGatingReview` documents semantically owned by the active review workspace are reviewable;
- no `design_documents` Phase Planning heuristic returns.

### AC10 — No test-based synchronization architecture

Do not retain two Project Planning state engines and add assertions that they match.

Tests must verify:

```text
one authoritative model
→ multiple presentation consumers
```

not:

```text
authority A == authority B
```

## Preserved Behavior

Preserve:

- Project Intake behavior;
- Architect Interview behavior;
- canonical Markdown metadata/disposition model;
- source-revision freshness rules;
- Project Planning repository reconciliation and true-blocker behavior;
- Project Planning atomic Profile/Roadmap promotion;
- compound Project Planning review;
- Phase Map gating;
- Phase, Work Card, Repair, Validation, and Close lifecycle behavior;
- the passed context/history projection fixes from parent repair;
- Agent Harness/MCP/OAuth behavior;
- Codex execution behavior;
- development-environment behavior.

## Forbidden Changes

Do not:

- keep the duplicate Project Planning calculation and merely add equivalence tests;
- rename or wrap the duplicate calculation instead of deleting it;
- add a third Project Planning resolver;
- add a renderer-side cache or persisted Project Planning state authority;
- weaken Project Planning repository preflight or true-blocker checks;
- bypass `getProjectPlanningWorkspaceModel()`;
- hard-code ChampCity A/I reconstruction filenames;
- create placeholder Profile/Roadmap outputs;
- modify Approved Intake/Interview artifacts as a workaround;
- redesign unrelated lifecycle workspaces;
- modify Agent Harness behavior;
- restore removed historical planning;
- perform Git stage/commit/push/branch mutation unless separately authorized by the Operator.

## Required Files / Areas to Inspect

At minimum inspect and modify as required:

- `src/shared/workspaces/projectLifecycleRailStatus.ts`
- `src/main/projectPlanning/projectPlanningService.ts`
- `src/main/projectPlanning/projectPlanningContext.ts`
- `src/main/architectOutputs/architectOutputWorkspaceService.ts`
- `src/renderer/app/App.tsx`
- `src/preload/index.ts` if a direct authoritative model projection is required
- `src/main/main.ts` if a direct authoritative model projection is required
- `src/shared/workspaceContracts.ts` if the read-only renderer contract requires extension
- `test/reconstruction/reconstruction-repair01.test.cjs`
- `test/renderer/project-rail-presentation.test.cjs`
- relevant Architect-output and Project Planning tests.

Do not broaden beyond these areas without a demonstrated dependency.

## Focused Validation

Do not run the entire historical suite by default.

Required:

```text
npm run typecheck
npm run build
node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/renderer/project-rail-presentation.test.cjs test/renderer/document-review-surface-source.test.cjs test/renderer/architect-output-workspace-source.test.cjs test/reconstruction/reconstruction-repair01.test.cjs
```

Add or extend focused tests to prove:

- duplicate Project Planning authority functions are physically absent;
- clean reconstruction Ready path;
- true Project Planning blocker visible before and after workspace navigation;
- exact blocker reason projection;
- downstream Phase Map dependency;
- parent repair context/history behavior.

If implementation changes IPC/preload contracts, add only the directly relevant focused IPC/preload tests.

Full `npm test` is not required unless implementation unexpectedly expands into broad lifecycle logic.

## Required Implementer Report

Write:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR01_delete_duplicate_project_planning_authority.md`

The report must include:

- repository/branch/status verification;
- parent repair behavior preserved;
- exact duplicate Project Planning functions deleted;
- exact imports/helpers deleted as dead code;
- exact authoritative data path from `getProjectPlanningWorkspaceModel()` to rail, handoff eligibility, and diagnostics;
- whether a direct IPC/preload projection was added and why;
- focused test commands and exact results;
- clean reconstruction evidence;
- true-blocker evidence showing the same state before/after navigation;
- exact blocker diagnostic evidence;
- deviations/blockers;
- remaining Operator live validation;
- confirmation that no Git mutation occurred unless separately authorized.

## Required Operator Live Validation

After Architect code review passes:

1. Launch ChampCity A/I against the cleaned reconstruction corpus.
2. Verify Architect Interview is Completed.
3. Verify Project Planning is Ready before entering it.
4. Enter Project Planning.
5. Verify Project Planning remains Ready.
6. Verify no context/history document is treated as the current review artifact.
7. Verify `Prepare Project Planning Handoff` is enabled.
8. Prepare the handoff and verify normal waiting-for-output/copy-handoff behavior.
9. Continue through Profile/Roadmap creation and compound review.
10. Separately validate one genuine Project Planning blocker or focused fixture evidence showing the rail does not change based on workspace entry and the exact reason is visible.

## Return Path

After implementation, return this repair for Architect code review.

If Architect review and Operator validation pass, the Operator may archive/remove the temporary `repair/` artifacts and continue the fresh ChampCity A/I reconstruction into Project Planning and then Harness expansion.

The required architectural end state is simple:

```text
one Project Planning authority
many presentation consumers
no duplicate state engine
```
