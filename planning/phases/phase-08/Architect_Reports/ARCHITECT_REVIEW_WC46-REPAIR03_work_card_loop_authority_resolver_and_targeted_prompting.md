<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR03",
    "repairId": "WC46-REPAIR03",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR03_formal_work_card_targeting_and_active_lifecycle_priority.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR03_work_card_loop_authority_resolver_and_targeted_prompting.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review - WC46-REPAIR03 Work Card Loop Authority Resolver and Targeted Prompting",
    "status": "RevisionRequested",
    "reviewedImplementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR03_work_card_loop_authority_resolver_and_targeted_prompting.md",
    "reviewedWorkCardPath": "planning/phases/phase-08/Work_Cards/WC46-REPAIR03_formal_work_card_targeting_and_active_lifecycle_priority.md",
    "gitMutationPerformed": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "WC46-REPAIR03 adds the requested Work Card loop authority service and fixes the live WC02 Build Review path, but review found remaining reachable and duplicated Work Card-loop authority paths outside the resolver. Revision is required before Operator validation.",
    "reviewedAt": "2026-08-04T21:07:00-04:00"
  }
}
CHAMPCITY-METADATA -->

# Architect Review - WC46-REPAIR03 Work Card Loop Authority Resolver and Targeted Prompting

Disposition: RevisionRequested  
Reviewed Work Card: `planning/phases/phase-08/Work_Cards/WC46-REPAIR03_formal_work_card_targeting_and_active_lifecycle_priority.md` revision 2  
Reviewed Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR03_work_card_loop_authority_resolver_and_targeted_prompting.md` revision 1  
Git mutation: none

## Repository Verification

ChampCity MCP diagnostics resolved the application repository workspace as `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. Git status showed a dirty working tree, no staged files, and the expected WC46/WC46-REPAIR work-in-progress paths. No Git mutation was performed during this review.

The review read the governing WC46-REPAIR03 revision 2 card, the Implementer Report, and the changed production/test surfaces relevant to the Work Card loop resolver and prompt-targeting implementation.

## Summary Finding

The implementation moves the system in the correct direction but does not yet satisfy the holistic resolver requirement.

Positive evidence exists:

- `src/main/workCardLoop/workCardLoopAuthorityService.ts` now exists and exports `resolveWorkCardLoopAuthority` plus resolver-backed adapters.
- The resolver covers map-ready, active planning, active build, active review, active repair, active close, all-complete, and conflict states.
- `currentWorkflowService` now has a `workCardLoopAuthorityModel()` adapter that can map the authority projection into the current workspace model.
- `workCardIntakeService.getWorkCardMapProjection()` delegates to `getWorkCardMapProjectionFromAuthority()`.
- `workCardPlanningService.buildFormalWorkCardPreparedInstruction()` now adds selected-project workspace targeting and explicit ChampCity_AI / `champcity_ai` drift-prevention language.
- Automated tests were added for the live failure sequence where stale WC01 Close evidence exists but WC02 Formal Work Card approval routes to WC02 Build Review.

However, the core acceptance standard was not only “fix the WC02 example.” The card required a single Work Card loop authority and prohibited parallel Work Card loop authority paths. Code review found remaining parallel/reachable authority paths.

## Blocking Finding 1 - Current workflow still routes repair before the Work Card loop resolver

### Evidence

`src/main/currentWorkflow/currentWorkflowService.ts` still executes this sequence:

```text
const activeRepairModel = repairModelForRevisionRequestedEvidence(workspaceRoot, document);
if (activeRepairModel) {
  return activeRepairModel;
}
const workCardLoopModel = workCardLoopAuthorityModel(workspaceRoot);
if (workCardLoopModel) {
  return workCardLoopModel;
}
```

That means a Work Card repair decision can still be made before `resolveWorkCardLoopAuthority()` runs.

The helper remains defined in the same file:

```text
repairModelForRevisionRequestedEvidence(...)
→ resolveExactActiveRepairWorkCardContext(...)
→ currentModelFromArchitectOutput("work-card-repair", ...)
```

This is a reachable Work Card-loop route outside the new resolver.

### Why this fails the card

WC46-REPAIR03 acceptance required the current workflow Work Card branch to delegate the Work Card Map / Planning / Build / Review & Validation / Repair / Close segment to the Work Card loop authority resolver. It also required validation / repair / close routing to preserve active candidate identity from Work Card loop authority.

Repair is explicitly part of the Work Card loop. A pre-authority repair route means the current workflow can still choose a Work Card-loop workspace without first asking the Work Card loop authority projection.

This leaves the same class of drift in place. The live observed issue was stale WC01 Close overriding WC02 Build. This remaining path leaves a structurally similar risk for RevisionRequested repair evidence overriding a later active candidate before the loop resolver gets control.

### Required correction

Move Work Card repair routing behind `resolveWorkCardLoopAuthority()`.

`repairModelForRevisionRequestedEvidence()` may be removed, or it may become a private implementation detail used only by `workCardLoopAuthorityService`, but it must not remain a pre-resolver branch in `getCurrentWorkspaceModel()`.

Current workflow should follow this shape for the Work Card segment:

```text
current non-Work-Card project/phase lifecycle logic
→ when current phase is in Work Cards, call resolveWorkCardLoopAuthority(workspaceRoot, phaseId)
→ map the returned projection to CurrentWorkspaceModel
→ do not route Work Card Planning / Build / Review / Repair / Close from independent current-document evidence first
```

## Blocking Finding 2 - Work Card Intake still contains an independent candidate eligibility path

### Evidence

`src/main/workCardIntake/workCardIntakeService.ts` now imports resolver-backed adapters, which is correct. But `resolveWorkCardIntakeContext()` still performs independent candidate eligibility logic when a requested candidate differs from the default selected candidate:

```text
const candidates = readCandidates(workspaceRoot, phaseId);
const requested = candidates.find((candidate) => candidate.candidateId === candidateId);
const explained = explainCandidate(workspaceRoot, phaseId, requested, candidates);
if (explained.state !== "eligible") {
  throw new Error(...);
}
return buildWorkCardIntakeContext(...);
```

That file still retains local `explainCandidate`, `dependencySatisfied`, and `candidateCompletionEvidence` implementations. Those duplicate Work Card candidate authority logic that now also exists in `workCardLoopAuthorityService.ts`.

### Why this fails the card

The card required Work Card Map projection and Begin/Continue action to use the Work Card loop authority resolver or a typed adapter around it. It also prohibited leaving parallel Work Card loop authority paths.

The public `beginWorkCardPlanningForCandidate()` path does call resolver-backed authority first, but it ultimately calls `generateWorkCardIntakeHandoff()`, which calls `resolveWorkCardIntakeContext()`. `generateWorkCardIntakeHandoff()` remains exported and can still invoke the local eligibility path directly.

This is not as immediately visible as the WC01/WC02 failure, but it is the same architectural drift: two places can decide whether a candidate is eligible.

### Required correction

Make `resolveWorkCardIntakeContext()` consume a resolver-backed candidate projection or a typed authority adapter. Do not recompute candidate eligibility locally in `workCardIntakeService`.

Acceptable implementation shapes:

```text
resolveWorkCardLoopAuthority(...)
→ find candidate projection by candidateId
→ require candidate.status === Eligible and no incompatible active Work Card
→ build intake context from resolver-owned target/evidence
```

or:

```text
workCardLoopAuthorityService exposes a typed intake-context adapter
→ workCardIntakeService uses that adapter
```

The local duplicated `explainCandidate`, `dependencySatisfied`, and `candidateCompletionEvidence` logic in `workCardIntakeService` must not remain an authority path. It may be removed, or retained only if unreachable and covered by a source-contract test proving it is not used for Work Card loop decisions.

## Non-Blocking Observation - Legacy private helpers remain in currentWorkflowService

`currentWorkflowService.ts` still contains legacy private helper definitions including:

```text
approvedWorkCardIntakeWithoutApprovedFormalModel
missingImplementerReportModel
missingRepairWorkCardModel
workCardMapCompletionModel
```

MCP search did not show these helpers being called after the new `workCardLoopAuthorityModel()` insertion. Because they appear unreachable, this is not the primary blocking defect. It is still a cleanup risk because the purpose of WC46-REPAIR03 is to prevent future authority drift. The next pass should either remove unreachable Work Card-loop helper bodies or add a narrow source-contract test proving they are not called by `getCurrentWorkspaceModel()`.

## Positive Code Review Evidence

The new resolver implements the intended loop states:

```text
resolveWorkCardLoopAuthority(...)
→ no-plan / map-ready / active / all-complete / conflict / not-applicable
→ loopStep: Map / Planning / Build / ReviewAndValidation / Repair / Close
```

The resolver correctly maps an active candidate with an Approved Formal Work Card and missing Implementer Report to:

```text
workspaceId: work-card-building-review
loopStep: Build
workCardId: active candidate
implementerReportPath: active candidate report target
```

The added test `current workflow routes WC02 approved Formal Work Card to Build Review despite stale WC01 close evidence` directly proves the observed live failure path for stale WC01 Close evidence versus WC02 Build Review.

The Formal Work Card prompt now includes the necessary anti-drift language:

```text
selected project workspace only
Do not use the ChampCity_AI / champcity_ai application repository as the target unless...
If diagnostics resolves to ChampCity_AI / champcity_ai but the handoff path is absent there, switch...
```

That is sufficient for the prompt-targeting portion of the repair, subject to Operator manual validation in the embedded browser.

## Acceptance Criteria Mapping

Pass / partially pass:

- AC1: Resolver exists and is named in the report — pass.
- AC3: Work Card Map projection uses resolver — pass.
- AC4/AC5: Formal Work Card preparation and Architect-output target resolution use resolver-backed active handoff adapter — pass.
- AC6/AC9/AC10: WC02 Formal Work Card approval routes to WC02 Build despite stale WC01 Close evidence — pass by source and test evidence.
- AC11/AC12: Prompt targeting guard exists — pass by source and test evidence.
- AC13/AC14/AC15/AC16/AC17/AC18: Map statuses, active lock, Close / Next, all-complete, and conflict behavior preserved — pass by reported and inspected test evidence.

Fail / requires revision:

- AC2: Current workflow delegates the full Work Card Map / Planning / Build / Review / Repair / Close segment to the resolver — fail because repair still routes through `repairModelForRevisionRequestedEvidence()` before `workCardLoopAuthorityModel()`.
- AC7: Validation / repair / close routing preserves active candidate identity from Work Card loop authority — fail for repair because repair routing can still happen before authority.
- Negative constraint: do not leave parallel Work Card loop authority paths — fail due the current workflow pre-authority repair route and Work Card Intake local candidate-eligibility recomputation.

## Command Evidence

I did not run local commands during this Architect review. Implementer-reported command results are treated as reported evidence only:

```text
npx tsc --noEmit - reported pass
npx tsc - reported pass
npx vite build - reported pass in normal Windows lane
node --test --test-concurrency=1 - reported pass, 280 tests
focused Work Card tests - reported pass after corrections
```

## Required Revision Scope

The next implementation pass should be narrow. Do not redesign the whole workflow. Do not add hidden state.

Required changes:

1. Route Work Card repair through `resolveWorkCardLoopAuthority()` before current workflow can display `work-card-repair`.
2. Remove or demote `repairModelForRevisionRequestedEvidence()` so it cannot preempt the Work Card loop resolver.
3. Make `workCardIntakeService.resolveWorkCardIntakeContext()` consume resolver-owned candidate eligibility instead of local duplicated `explainCandidate` logic.
4. Remove unreachable legacy Work Card-loop helper bodies in `currentWorkflowService` or add a source-contract test proving they are unreachable from `getCurrentWorkspaceModel()`.
5. Add focused tests for stale RevisionRequested/repair evidence versus a later active candidate, mirroring the stale WC01 Close versus WC02 Build test.

## Manual Validation Status

Manual validation should not proceed yet. The live WC02 Build issue appears fixed in tests, but the holistic authority guarantee is incomplete until the remaining pre-resolver repair route and duplicated intake candidate authority are corrected.
