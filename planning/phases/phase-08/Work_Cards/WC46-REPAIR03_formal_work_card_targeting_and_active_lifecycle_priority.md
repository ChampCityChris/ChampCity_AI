<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR03",
    "repairId": "WC46-REPAIR03",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR02_close_state_guard_and_active_work_card_resume_routing.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR02_close_state_guard_and_active_work_card_resume_routing.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR02_close_state_guard_and_active_work_card_resume_routing.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Work Card Loop Authority Resolver and Targeted Architect Prompting",
    "status": "approved_for_implementation",
    "executionMode": "one bounded Work Card loop authority repair",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "The Work Card loop still has multiple independent authority paths. Work Card Map, Formal Work Card preparation, Architect-output target resolution, current workflow routing, Build Review, Validation, Repair, and Close can compute current Work Card state independently. This allowed an approved WC02 Formal Work Card to fall through to stale WC01 Close / Next evidence instead of routing to WC02 Build Review. Formal Work Card prompting also leaves target workspace selection ambiguous, so embedded ChatGPT can reason about ChampCity_AI before finding the selected project workspace.",
    "rootCause": "WC46 and its first two repairs added candidate-scoped pieces but did not centralize Work Card loop authority. The global current workflow still mixes legacy first-current-document routing with Work Card-specific lifecycle rules. The Formal Work Card prompt also lacks a selected-project guard, so the embedded Architect session is not forced to treat the selected project workspace as the target repository.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR03_work_card_loop_authority_resolver_and_targeted_prompting.md",
    "revisionNotes": "Revision 2 replaces the narrow ordering repair with a holistic Work Card loop resolver implementation. Scope remains limited to the Work Card loop and does not authorize replacement of the project or phase lifecycle resolver."
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Implement a single authoritative Work Card loop resolver and route all Work Card loop consumers through it. Do not rewrite the global project/phase workflow resolver. Bind Formal Work Card Architect prompts to the selected project workspace. Preserve WC46 map/status behavior and existing project/phase lifecycle behavior.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR03 — Work Card Loop Authority Resolver and Targeted Architect Prompting

Status: Approved for Implementer execution  
Parent: `WC46`  
Revision: 2 — Work Card loop authority scope correction  
Git mutation: prohibited

## Scope Guard

This repair centralizes authority for the **Work Card loop only**.

It does not replace the full project and phase workflow resolver. Existing Project Intake, Architect Interview, Project Planning, Phase Map, Phase Intake, Phase Planning, Phase Validation, Phase Close, and Next Phase behavior must remain under the existing workflow authority unless a Work Card loop boundary explicitly hands control to them.

The bounded scope is:

```text
Work Card Map
→ Work Card Planning
→ Work Card Build
→ Work Card Review & Validation
→ Work Card Repair
→ Work Card Close / Next
→ Work Card Map
```

## Verified Repository Evidence

ChampCity MCP inspection verified the application workspace as `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. The working tree was dirty and no files were staged. No Git mutation was performed.

The relevant production path was inspected across the Work Card loop:

```text
src/main/currentWorkflow/currentWorkflowService.ts
src/main/workCardIntake/workCardIntakeService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/workCardValidation/workCardValidationService.ts
src/main/workCardRepair/workCardRepairService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardMapWorkspace.tsx
src/renderer/app/WorkCardCloseWorkspace.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/main/workspaceSettings.ts
```

The observed live failure was produced after the Operator selected `MVP-01-WC02` from the Work Card Map, entered Work Card Planning, generated the Formal Work Card through embedded ChatGPT, and applied `Approved` disposition to that Formal Work Card.

A project-workspace artifact inspection under `revisionary` confirmed that the generated `MVP-01-WC02` Formal Work Card body recorded target-resolution confusion. The artifact exists at:

```text
planning/phases/MVP-01/Work_Cards/MVP-01-WC02_monorepo_skeleton_and_boundary_enforcement.md
```

Its body states that the requested intake file was absent from `champcity_ai` and present under `revisionary`, so the session pivoted to the `revisionary` workspace. That confirms the prompt targeting defect: embedded ChatGPT first considered the ChampCity A/I application repository before resolving the selected project workspace.

Confirmed source facts:

1. `workCardPlanningService.buildFormalWorkCardPreparedInstruction()` still emits a generic prompt beginning with `Use ChampCity MCP with repository reference <PROJECT_REPO>` and tells ChatGPT to resolve a workspace through diagnostics. It does not explicitly bind `<PROJECT_REPO>` to the selected project workspace that owns the active Work Card Intake handoff.
2. `currentWorkflowService.getCurrentWorkspaceModel()` still contains a mixed resolver chain where Work Card-specific active authority competes with legacy current-document / pending-artifact routing.
3. `currentWorkflowService.modelForPendingReportWithValidationDecision()` can still route a prior Work Card's Pending Implementer Report plus Approved Validation Record to `work-card-close`.
4. `currentWorkflowService.missingImplementerReportModel()` can produce the correct Build Review state for an Approved Formal Work Card, but it is not the single authoritative Work Card loop resolver and can be bypassed by stale close evidence.
5. `workCardIntakeService.resolveActiveWorkCardAuthority()` and `getWorkCardMapProjection()` contain Work Card loop logic, but downstream consumers still own separate routing decisions.
6. `workCardPlanningService`, `architectOutputWorkspaceService`, current workflow routing, renderer transition logic, and the Work Card rail each consume or infer Work Card state independently.
7. Existing WC46-REPAIR01 and WC46-REPAIR02 improvements — `Complete` / `Eligible` / `Ineligible`, active marker, close-pending guard, and same-active-candidate continuation — are valid but are not yet consolidated into one Work Card loop authority.

## Confirmed Defect

The application does not yet have one canonical Work Card loop authority projection.

The failed production sequence is:

```text
WC01 completed and reached Close / Next evidence
→ Operator selects WC02 from Work Card Map
→ WC02 Work Card Intake handoff is created/reused
→ WC02 Formal Work Card is generated and approved
→ expected current workspace: WC02 Build Review
→ actual current workspace: stale WC01 Close / Next
```

This is not just an ordering bug. Ordering is the symptom. The root defect is that the Work Card loop still allows multiple services to decide independently which Work Card and which Work Card loop step is current.

The prompt-targeting issue is related. The Formal Work Card prompt does not force the embedded Architect session to treat the selected project workspace as the target implementation repository. That lets the session waste time reasoning about `champcity_ai` / ChampCity A/I application source before finding the actual project workspace.

## Root Cause

WC46 changed the Operator-facing selection model but did not fully retire legacy Work Card-loop authority paths.

The old model asks:

```text
Which planning document or current artifact is unresolved?
```

The Work Card Map model requires the loop to ask:

```text
For the current phase, what is the authoritative Work Card loop state?
```

Until one Work Card-loop projection answers that question for every Work Card loop consumer, stale evidence from a previous candidate can still win after a later candidate becomes active.

## Objective

Implement one repository-derived Work Card loop authority resolver and require Work Card loop consumers to use it.

The resolver must be bounded to the Work Card loop and must not replace the project or phase lifecycle resolver.

Required runtime outcome:

```text
Current phase is in Work Cards
→ resolveWorkCardLoopAuthority(workspaceRoot, phaseId)
→ exactly one Work Card loop state is returned
→ all Work Card loop consumers use that state
→ WC02 Formal Work Card Approved routes to WC02 Build Review
→ stale WC01 Close / Next cannot override WC02 active lifecycle
```

Formal Work Card Architect prompting must also be target-bound:

```text
Active Work Card belongs to selected project workspace
→ Formal Work Card prompt instructs embedded ChatGPT to use that selected project workspace as target
→ prompt must not let ChampCity_AI / champcity_ai become the target unless it is the selected project workspace
```

## Required Changes

### 1. Introduce one Work Card loop authority resolver

Create a single main-process authority service for the Work Card loop. Preferred new file:

```text
src/main/workCardLoop/workCardLoopAuthorityService.ts
```

The service must expose a typed resolver equivalent to:

```text
resolveWorkCardLoopAuthority(workspaceRoot, phaseId)
```

It must return one authoritative projection for the current phase's Work Card loop. The projection must include at minimum:

```text
status: no-plan | map-ready | active | all-complete | conflict | not-applicable
phaseId
workspaceId
workCardId, when active
candidateId, when active
loopStep: Map | Planning | Build | ReviewAndValidation | Repair | Close
sourceEvidence[]
requiredAction
blocker, when conflict or not-ready
formalWorkCardPath, when relevant
implementerReportPath, when relevant
repairId / parentWorkCardId, when relevant
```

The resolver must derive from existing repository evidence only. It must not use renderer state, hidden selected-candidate files, route tokens, close acknowledgements, sidecars, or disposition mutation.

### 2. Define Work Card loop precedence inside the resolver

The resolver must evaluate Work Card loop state in candidate scope, not global latest-file scope.

Required precedence:

1. If phase planning or Work Card Plan is missing or stale, return no Work Card loop authority and let the existing phase lifecycle handle Phase Planning.
2. If multiple active incomplete Work Cards exist in the same phase, return a visible conflict with all evidence paths.
3. If an active repair exists for a Work Card, route that Work Card to `work-card-repair` and preserve parent Work Card identity.
4. If an active candidate has Approved validation evidence and backend close authority still resolves `work-card-close`, route to `work-card-close` for that candidate until visible Close / Next returns to Work Card Map.
5. If an active candidate has an Approved Formal Work Card and missing Implementer Report, route to `work-card-building-review` for that same candidate.
6. If an active candidate has a Pending Implementer Report without Approved validation, route to `work-card-report-review` / Review & Validation for that same candidate.
7. If an active candidate has an intake handoff but no approved Formal Work Card, route to `work-card-planning` for that same candidate.
8. If no candidate is active and planned candidates remain, route to `phase-work-card-selection` / Work Card Map.
9. If all planned candidates are complete, route Work Card Map to Phase Validation, not Phase Intake.

The resolver must never allow stale evidence for a previously completed Work Card to outrank an active later Work Card.

### 3. Route all Work Card loop consumers through the resolver

The following consumers must use the Work Card loop authority projection or a direct typed adapter around it. They must not independently recompute Work Card loop state.

```text
currentWorkflowService Work Card branch
workCardIntakeService Work Card Map projection and Begin/Continue action
workCardPlanningService Formal Work Card preparation
architectOutputWorkspaceService work-card-planning target resolution
workCardBuildingReviewService Build Review/report targeting, if candidate targeting is currently inferred there
workCardValidationService validation/close target resolution, if candidate targeting is currently inferred there
workCardRepairService repair parent/current target resolution, if candidate targeting is currently inferred there
App.tsx Work Card Map transition logic
NestedWorkflowRail Work Card loop context
WorkCardCloseWorkspace close-return target text/action, if it infers candidate or next state
```

Existing helper functions may remain only as private implementation details behind the authority resolver. They must not remain parallel authority paths.

### 4. Bind Formal Work Card Architect prompts to the selected project workspace

Update `workCardPlanningService.buildFormalWorkCardPreparedInstruction()` so the prepared prompt makes the selected project workspace the implementation target.

The prompt must not leave `<PROJECT_REPO>` ambiguous.

The prompt must require the embedded Architect session to resolve the target by the current Work Card Intake handoff and selected project workspace, not by ambient ChatGPT project context.

At minimum, it must include instructions equivalent to:

```text
The target project is the selected application workspace that owns this Work Card Intake handoff.
Do not use the ChampCity_AI / champcity_ai application repository as the target unless that repository contains the exact Work Card Intake handoff path and Formal Work Card target below.
If diagnostics resolves to ChampCity_AI but the handoff path is absent there, switch to the workspace that contains the handoff or abort as incomplete.
All repository claims must be made against the selected project workspace, not the ChampCity A/I application source.
```

If the application can provide a selected workspace label, root, or repository reference safely, include it. If it cannot, the prompt must still include enough evidence-path constraints to force correct target resolution.

### 5. Preserve current project and phase lifecycle behavior

Do not rewrite the global resolver. `currentWorkflowService.getCurrentWorkspaceModel()` may delegate the Work Card segment to the new Work Card loop authority resolver, but project and phase lifecycle routing outside Work Cards must remain unchanged.

The boundary must be explicit:

```text
Project/phase lifecycle determines whether the current phase is in Work Cards.
Work Card loop authority determines only the Work Card Map / Planning / Build / Review / Repair / Close segment.
```

### 6. Preserve WC46 map and active-candidate behavior

Preserve these accepted WC46 behaviors:

- Work Card Map remains the Operator selection surface.
- User-facing statuses remain exactly `Complete`, `Eligible`, and `Ineligible`.
- Multiple eligible candidates are allowed when dependencies permit.
- Starting one candidate locks the Work Card loop to that candidate until completion/repair/close return.
- Close / Next returns to Work Card Map.
- All-complete routes to Phase Validation, not Phase Intake.
- No hidden selected-candidate persistence, route token, close acknowledgement, map sidecar, closeout document, or disposition mutation is added.

## Runtime Sequence To Prove

Required proof sequence:

```text
WC01 completed / stale close evidence exists
→ Work Card Map shows WC02 Eligible
→ Operator begins WC02
→ WC02 intake handoff is created/reused
→ Work Card Planning opens for WC02
→ Formal Work Card prompt targets selected project workspace, not ChampCity_AI
→ WC02 Formal Work Card is approved
→ Work Card loop authority returns WC02 Build Review
→ current workflow returns WC02 Build Review
→ renderer follows WC02 Build Review
→ stale WC01 Close / Next does not appear
```

Also prove close and map behavior:

```text
WC02 Build / Review / Validate Passed
→ WC02 Close / Next
→ Return to Work Card Map
→ WC02 Complete
→ remaining candidates recalculate Eligible/Ineligible
```

## Preserved Behavior

Preserve unchanged:

- existing project and phase lifecycle resolver behavior outside Work Cards;
- `Complete`, `Eligible`, and `Ineligible` as the only Work Card Map statuses;
- Approved Validation Record as durable Work Card completion evidence;
- Implementer Report as implementation evidence only;
- Work Card Intake handoff artifact type and path convention;
- Formal Work Card target path convention;
- Work Card Repair parent identity and RevisionRequested routing;
- Work Card Close not being a generic handoff-producing workspace;
- Phase Validation and Phase Close behavior;
- Codex execution behavior;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/workCardLoop/workCardLoopAuthorityService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/workCardIntake/workCardIntakeService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/workCardValidation/workCardValidationService.ts
src/main/workCardRepair/workCardRepairService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardMapWorkspace.tsx
src/renderer/app/WorkCardCloseWorkspace.tsx
src/renderer/app/NestedWorkflowRail.tsx
```

`src/main/workCardLoop/workCardLoopAuthorityService.ts` is preferred for the centralized authority. If the Implementer places the resolver elsewhere, the Implementer Report must explain why that location prevents circular imports while preserving a single Work Card loop authority.

Tests authorized:

```text
test/work-card-loop/work-card-loop-authority-service.test.cjs
test/work-card-intake/work-card-intake-service.test.cjs
test/work-card-planning/work-card-planning-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-map-workspace.test.cjs
test/renderer/work-card-close-workspace.test.cjs
test/renderer/project-rail-presentation.test.cjs
test/repository/runtime-wiring-source.test.cjs
test/app-shell/app-shell.test.cjs
```

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR03_work_card_loop_authority_resolver_and_targeted_prompting.md
```

Adjacent test helper changes under `test/` are allowed only if explained in the Implementer Report.

## Acceptance Criteria

1. One Work Card loop authority resolver exists and is named in the Implementer Report.
2. Current workflow delegates the Work Card Map / Planning / Build / Review & Validation / Repair / Close segment to the Work Card loop authority resolver.
3. Work Card Map projection uses the Work Card loop authority resolver and does not independently decide active candidate, conflict, or all-complete state.
4. Formal Work Card preparation uses the Work Card loop authority resolver for selected candidate and handoff target.
5. Architect-output `work-card-planning` target resolution uses the Work Card loop authority resolver.
6. Build Review/report routing for an Approved Formal Work Card uses the active candidate from Work Card loop authority and cannot be bypassed by stale close evidence.
7. Validation / repair / close routing preserves active candidate identity from Work Card loop authority.
8. Nested Work Card rail reflects the same Work Card loop authority projection as the current workspace.
9. After WC02 Formal Work Card is Approved, current workflow resolves `work-card-building-review` for WC02 even if stale WC01 Close / Next evidence exists.
10. Stale WC01 Close / Next evidence cannot override WC02 active lifecycle after WC02 has begun.
11. Formal Work Card Architect prompt is bound to the selected project workspace and explicitly prevents using ChampCity_AI / `champcity_ai` as target unless it owns the exact intake handoff and target path.
12. The prompt includes the selected Work Card Intake handoff path, Formal Work Card target path, candidate ID, phase ID, and instructions to abort rather than proceed against the wrong repository.
13. Work Card Map still allows multiple `Eligible` candidates before one is active.
14. Starting one candidate still blocks starting other candidates until completion/repair/close return.
15. Close / Next still returns to Work Card Map.
16. After Close / Next return, the completed candidate displays `Complete` and remaining candidates recalculate `Eligible` / `Ineligible`.
17. All-complete Work Card Map still routes toward Phase Validation, not Phase Intake.
18. Multiple active incomplete candidates still produce a visible conflict and no silent selection.
19. No hidden selected-candidate state, route token, close acknowledgement, map sidecar, closeout document, validation mutation, Implementer Report mutation, or alternate persistence is created.
20. Existing project and phase lifecycle tests continue to pass; the repair does not rewrite the non-Work-Card workflow.
21. Automated tests prove the full live-failure sequence from stale WC01 Close through WC02 Formal approval to WC02 Build Review.
22. Automated tests prove the Work Card loop authority resolver directly for map-ready, active planning, active build, active review, active repair, active close, all-complete, and conflict states.
23. Automated tests prove prompt targeting no longer allows ambiguous ChampCity_AI-first behavior.
24. Typecheck, build, focused tests, and full test lane pass in the approved normal Windows environment.
25. No dependency is added.
26. No Git operation occurs.

## Negative Constraints

Do not:

- replace the full project/phase workflow resolver;
- add user-facing Work Card Map statuses beyond `Complete`, `Eligible`, and `Ineligible`;
- add Architect approval, validation, or policy gates for candidate selection;
- use renderer state as Work Card loop authority;
- leave parallel Work Card loop authority paths in current workflow, Work Card Map, Formal Work Card preparation, Build Review, Validation, Repair, Close, or rail logic;
- route WC02 Formal approval to stale WC01 Close / Next;
- allow embedded ChatGPT to treat ChampCity_AI / `champcity_ai` as the target project unless it is the selected project workspace owning the intake handoff;
- create hidden selected-candidate state, route tokens, sidecar files, or close acknowledgement persistence;
- mutate validation records, Implementer Reports, phase closeouts, or project closeouts;
- route all-complete Work Cards to Phase Intake;
- reintroduce generic `generateCurrentHandoff()` for Work Card Map candidate actions;
- silently select among multiple active incomplete candidates;
- alter Codex execution or unrelated Review & Validation behavior;
- add dependencies;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR03_work_card_loop_authority_resolver_and_targeted_prompting.md
```

The report must include:

- repository path, branch, remote, and working status verification;
- all changed files;
- confirmation that no Git mutation occurred;
- exact Work Card loop authority resolver path and exported function/type names;
- proof that all Work Card loop consumers listed in this card use the resolver or a typed adapter around it;
- proof that project/phase lifecycle behavior outside Work Cards was not rewritten;
- proof that WC02 Formal Work Card approval routes to WC02 Build Review despite stale WC01 Close evidence;
- proof that Formal Work Card prompt targeting binds to the selected project workspace and prevents ChampCity_AI-first target drift;
- proof that Work Card Map statuses and active-candidate behavior are preserved;
- proof that close return, all-complete Phase Validation routing, repair routing, and conflict handling are preserved;
- proof that no hidden state or alternate persistence was created;
- commands run and results;
- validation skipped and reason;
- residual risks and Operator manual validation remaining.

End with:

```text
Document.Status=Pending
```

## Manual Validation

After Architect review of the Implementer Report, the Operator must validate in the running application:

1. Complete or use a fixture where WC01 has stale Close / Next evidence.
2. Open Work Card Map and select WC02.
3. Begin WC02 Planning.
4. Confirm embedded Formal Work Card Architect prompt targets the selected project workspace and does not begin with ChampCity_AI as target.
5. Generate and approve the WC02 Formal Work Card.
6. Confirm the app routes to WC02 Build Review, not WC01 Close / Next.
7. Continue WC02 through Build / Review & Validation / Close.
8. Click Close / Next and confirm Work Card Map shows WC02 Complete.
9. Confirm remaining candidates recalculate `Eligible` / `Ineligible`.
10. Confirm all-complete routes to Phase Validation, not Phase Intake.
11. Confirm `Request Repair` still routes to Work Card Repair.
