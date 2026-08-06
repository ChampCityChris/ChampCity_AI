<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR04",
    "repairId": "WC46-REPAIR04",
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
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR03_work_card_loop_authority_resolver_and_targeted_prompting.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Selected Workspace Target Binding and Work Card Loop Drift Hardening",
    "status": "approved_for_implementation",
    "executionMode": "one bounded WC46 repair after WC46-REPAIR03 review",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "WC46-REPAIR03 centralized Work Card loop authority and fixed the observed stale-close-to-build path, but Formal Work Card Architect prompting still relies on prompt-language guardrails instead of an application-owned selected-workspace target binding and contains project-specific repository names. Two remaining Work Card loop authority paths also retain duplicated decision logic that can drift from the resolver, although they are hardening issues rather than proven normal user-path failures.",
    "rootCause": "Formal Work Card prompt generation does not receive or emit a stable application-owned selected-workspace target descriptor, so the embedded Architect session must infer the target from generic workspace discovery. In addition, current workflow repair routing and Work Card Intake context construction still keep local Work Card-loop decision logic outside the central resolver.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR04_selected_workspace_target_binding_and_loop_drift_hardening.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Primary repair is selected-workspace target binding for Formal Work Card Architect prompts. Secondary repair is narrow anti-drift hardening for remaining Work Card loop authority bypass surfaces. Do not rewrite the global project/phase resolver.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR04 — Selected Workspace Target Binding and Work Card Loop Drift Hardening

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Classification

This is a bounded follow-up repair after `WC46-REPAIR03` review.

The live operator failure that motivated WC46-REPAIR03 was:

```text
WC02 Formal Work Card Approved
→ expected WC02 Build Review
→ actual stale WC01 Close / Next
```

WC46-REPAIR03 appears to address that specific live failure by introducing `resolveWorkCardLoopAuthority(...)` and by proving the stale-WC01-close / WC02-build path in tests.

This repair must not reopen that resolver implementation broadly. It fixes one confirmed operational defect and two narrow anti-drift issues.

## Verified Repository Evidence

The relevant review artifact is:

```text
planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR03_work_card_loop_authority_resolver_and_targeted_prompting.md
```

The review disposition was `RevisionRequested`.

Inspected production path and files:

```text
src/main/workCardLoop/workCardLoopAuthorityService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/workCardIntake/workCardIntakeService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/workspaceSettings.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
```

Confirmed source facts:

1. `src/main/workCardLoop/workCardLoopAuthorityService.ts` now exists and exports a central Work Card loop resolver equivalent to `resolveWorkCardLoopAuthority(workspaceRoot, phaseId, options)`.
2. The resolver covers map-ready, active planning, active build, active review, active repair, active close, all-complete, no-plan, not-applicable, and conflict states.
3. `src/main/currentWorkflow/currentWorkflowService.ts` delegates much of the Work Card segment through `workCardLoopAuthorityModel(...)` and `currentModelFromWorkCardLoopAuthority(...)`.
4. `src/main/workCardPlanning/workCardPlanningService.ts` still generates the Formal Work Card Architect prompt from `buildFormalWorkCardPreparedInstruction(...)`.
5. The current prompt includes explicit project-specific wrong-target wording naming `ChampCity_AI / champcity_ai`. That is not acceptable for a general application and is not a durable authority model.
6. The prompt still relies on the embedded ChatGPT session to obey text instructions rather than receiving a stable application-owned selected-workspace target reference.
7. `currentWorkflowService.getCurrentWorkspaceModel()` still calls `repairModelForRevisionRequestedEvidence(...)` before `workCardLoopAuthorityModel(...)` in one branch. This is not a proven normal user-path failure, but it is a structural bypass of the Work Card loop resolver.
8. `workCardIntakeService.resolveWorkCardIntakeContext(...)` still performs local candidate eligibility checks through local `readCandidates(...)`, `explainCandidate(...)`, `dependencySatisfied(...)`, and `candidateCompletionEvidence(...)` logic when a requested candidate differs from the default selected candidate. The normal Work Card Map action path is likely safe because `beginWorkCardPlanningForCandidate(...)` checks active authority first, but the local eligibility branch remains a duplicated authority surface.
9. `workspaceSettings.ts` stores and validates the selected workspace root. That application-owned selected workspace evidence is the correct source for target binding.

## Confirmed Defects

### Defect 1 — Formal Work Card prompt target is not application-bound

The Formal Work Card Architect prompt still makes the embedded Architect session infer the target repository/workspace from generic workspace discovery and prompt instructions. In operator validation this created real friction: the embedded ChatGPT session first reasoned about the ChampCity A/I application repository before resolving the actual selected project workspace.

This must be corrected in application-owned handoff generation. The prompt must be generated from the selected project workspace authority, not from project-specific warning text.

The generated prompt must not contain developer-specific or project-specific names such as:

```text
ChampCity_AI
champcity_ai
```

The application is intended for more than one operator and more than one project. Wrong-target prevention must be generic and based on selected workspace authority, handoff path, and target path.

### Defect 2 — Repair routing can structurally bypass Work Card loop authority

`currentWorkflowService` still has a branch where a `RevisionRequested` current document can route through `repairModelForRevisionRequestedEvidence(...)` before the Work Card loop resolver runs.

This is not confirmed as a normal real-world failure path. In a correct workflow, a Work Card with active repair evidence should prevent a dependent next Work Card from starting, and the active Work Card lock should prevent concurrent Work Cards. Therefore this is an anti-drift correction, not a demonstrated operator failure.

However, the WC46-REPAIR03 goal was to make the Work Card loop resolver authoritative for Work Card Map / Planning / Build / Review / Repair / Close. Repair routing must therefore be delegated through that resolver or explicitly proven to be outside the Work Card loop.

### Defect 3 — Work Card Intake context keeps local candidate eligibility logic

`resolveWorkCardIntakeContext(...)` is still required because it builds the canonical Work Card Intake context: source revisions, candidate metadata, handoff path, Formal Work Card target path, and downstream report target. It should not be deleted.

The defect is narrower: when a candidate ID is provided and does not equal the default selected candidate, the function performs local candidate eligibility logic rather than consuming resolver-owned candidate authority. That leaves a future drift vector for direct/internal calls to `generateWorkCardIntakeHandoff(workspaceRoot, phaseId, candidateId)`.

This is also an anti-drift correction, not a proven current UI failure. The normal Work Card Map path is expected to continue through `beginWorkCardPlanningForCandidate(...)`.

## Root Cause

WC46-REPAIR03 correctly introduced a central Work Card loop resolver, but some boundary surfaces still rely on either prompt-language governance or local duplicate decision logic:

```text
Formal Work Card prompt target selection
→ governed by text guardrails instead of selected workspace authority

Repair routing
→ can be chosen before Work Card loop authority in one current-workflow branch

Work Card Intake context
→ still owns candidate eligibility in one candidate-ID branch
```

The fix is not another broad resolver redesign. The fix is to bind the prompt target through the app and close the two narrow authority-drift seams.

## Objective

Implement selected-workspace target binding for Formal Work Card Architect prompting, remove project-specific prompt wording, and harden the two remaining Work Card-loop drift seams without replacing the global project/phase workflow resolver.

Required runtime outcome:

```text
Selected project workspace exists in the app
→ Work Card Map selects WC02
→ Formal Work Card Architect handoff is prepared
→ prepared prompt is bound to the selected project workspace by application-owned target reference
→ prompt contains no developer-specific wrong-target project names
→ embedded Architect session is instructed to use only the selected workspace target and abort if unavailable
→ WC02 Formal Work Card draft/promotion remains under the selected workspace authority
```

Secondary required hardening:

```text
Work Card loop repair routing
→ resolved through Work Card loop authority, not pre-resolver current-document repair routing

Work Card Intake context construction
→ builds context only after resolver-owned candidate authority confirms the requested candidate is eligible or active/reusable
```

## Required Changes

### 1. Add selected workspace target binding to Formal Work Card handoff generation

Update the Formal Work Card prompt preparation path so it receives or derives an application-owned selected workspace target descriptor from the selected workspace authority.

Approved implementation approaches include:

- pass a safe selected-workspace target descriptor from the main process workspace selection context into Formal Work Card prompt generation;
- derive a safe selected-workspace descriptor from the validated `workspaceRoot` already used by the active application session;
- include a deterministic selected-workspace fingerprint or display-safe label if already available without exposing unnecessary local details;
- include exact handoff path and Formal Work Card target path as required target-evidence constraints.

The implementation must not require the embedded Architect session to choose among all available workspaces as an open-ended task.

The generated prompt must make the target binding generic. Required prompt meaning:

```text
Use the selected project workspace for this Work Card.
The application has already resolved the target workspace for this handoff.
Before making repository claims, verify that the selected workspace contains the approved Work Card Intake handoff path below and accepts the Formal Work Card target path below.
Do not use any other workspace as the implementation target.
If the selected workspace cannot be verified, abort as incomplete.
```

The exact wording may vary, but the prompt must not include personal, developer-specific, or current-project-specific repository names.

### 2. Remove project-specific wrong-target wording from generated prompts

The generated Formal Work Card prompt must not include hard-coded references to the application repository or the operator's current project names.

Forbidden prompt substrings include:

```text
ChampCity_AI
champcity_ai
```

The prompt may refer generically to:

```text
selected project workspace
application source repository
alternate workspace
wrong workspace
```

It may not name a specific repository as the wrong target.

### 3. Enforce selected workspace target on promotion/readback where practical

Prompt text alone is not sufficient. The app must keep application-owned authority over the Formal Work Card draft and promotion path.

At minimum, the existing Formal Work Card promotion path must continue to verify:

- the current active Work Card Intake handoff is from the selected workspace root;
- the draft target path matches the expected active Work Card target path;
- the promoted Formal Work Card metadata phase ID, Work Card ID, candidate ID, source revisions, and target path match the active Work Card context;
- a draft produced outside the selected workspace/expected draft path cannot be accepted silently.

If this is already enforced, add or update tests proving it. If not, implement the missing check in the bounded Formal Work Card preparation/promotion path.

### 4. Route Work Card repair routing through Work Card loop authority

Revise `currentWorkflowService.getCurrentWorkspaceModel()` so Work Card repair routing for the Work Card loop does not bypass `resolveWorkCardLoopAuthority(...)`.

Accepted implementation options:

- move `workCardLoopAuthorityModel(...)` ahead of `repairModelForRevisionRequestedEvidence(...)` when the current phase is in the Work Card loop;
- make `repairModelForRevisionRequestedEvidence(...)` a typed adapter around `resolveWorkCardLoopAuthority(...)` for Work Card repair documents;
- restrict `repairModelForRevisionRequestedEvidence(...)` so it cannot handle Work Card-loop repair evidence before the Work Card loop authority has had first right of refusal.

Preserve non-Work-Card project/phase revision routing. Do not replace the global project/phase resolver.

### 5. Make Work Card Intake context consume resolver-owned candidate authority

Keep `resolveWorkCardIntakeContext(...)`, but remove its independent candidate eligibility decision branch.

When a specific `candidateId` is requested, the function must build context only after the Work Card loop authority or a typed resolver adapter confirms that the candidate is currently allowed for intake generation.

Required behavior:

```text
No active Work Card + requested candidate is Eligible under Work Card loop authority
→ build intake context

Requested candidate is active and reusable
→ build/reuse context for same candidate

Different Work Card is active
→ reject using resolver-owned active Work Card reason/evidence

Requested candidate is Complete/Ineligible/conflict
→ reject using resolver-owned reason/evidence
```

Local helpers may remain for formatting, metadata construction, and reading candidate records, but they must not be the authoritative eligibility decision for a requested candidate.

## Preserved Behavior

Preserve unchanged:

- `resolveWorkCardLoopAuthority(...)` as the central Work Card loop resolver introduced by WC46-REPAIR03;
- project and phase lifecycle resolver behavior outside the Work Card loop;
- Work Card Map user-facing statuses exactly `Complete`, `Eligible`, and `Ineligible`;
- multiple Eligible candidates before one is active;
- active candidate lock after one candidate begins;
- same-active-candidate continuation;
- close-pending active behavior before Close / Next return;
- Close / Next returning to Work Card Map;
- all-complete routing to Phase Validation;
- Repair routing for legitimate Work Card repairs;
- Formal Work Card canonical metadata and target path conventions;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardIntake/workCardIntakeService.ts
src/main/workCardLoop/workCardLoopAuthorityService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/workspaceSettings.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
```

Renderer files authorized only if required to display a selected-workspace target descriptor or to pass an already selected workspace reference through an existing IPC path:

```text
src/renderer/app/App.tsx
src/renderer/app/WorkCardMapWorkspace.tsx
```

Tests authorized:

```text
test/work-card-planning/work-card-planning-service.test.cjs
test/work-card-intake/work-card-intake-service.test.cjs
test/work-card-loop/work-card-loop-authority-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/repository/runtime-wiring-source.test.cjs
test/app-shell/app-shell.test.cjs
```

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR04_selected_workspace_target_binding_and_loop_drift_hardening.md
```

Adjacent test helper changes under `test/` are allowed only if explained in the Implementer Report.

## Acceptance Criteria

1. Formal Work Card prompt generation uses an application-owned selected workspace target binding, not an open-ended workspace search.
2. The generated prompt contains a generic selected-workspace target instruction and an abort rule when the selected workspace cannot be verified.
3. The generated prompt includes exact phase ID, Work Card ID, candidate ID, Work Card Intake handoff path, Formal Work Card target path, Implementer Report target path, and temporary draft path.
4. The generated prompt does not contain `ChampCity_AI`, `champcity_ai`, or any other project-specific wrong-target repository name.
5. The Formal Work Card draft/promotion path rejects or cannot silently accept a draft that does not match the selected workspace's active Work Card handoff and expected target path.
6. Existing successful Formal Work Card preparation and promotion behavior remains intact for a valid selected project workspace.
7. Work Card-loop repair routing goes through `resolveWorkCardLoopAuthority(...)` or an explicitly typed adapter around it before current-document repair routing can select a Work Card repair workspace.
8. Non-Work-Card project/phase revision routing remains unchanged.
9. `resolveWorkCardIntakeContext(...)` remains responsible for context construction but no longer owns the authoritative requested-candidate eligibility decision.
10. Requested-candidate intake generation is allowed only when resolver-owned authority marks the candidate eligible, active/reusable, or otherwise explicitly permitted.
11. Requested-candidate intake generation rejects different-active, Complete, Ineligible, and conflict states using resolver-owned reason/evidence.
12. Normal Work Card Map Begin Planning flow still works for WC02 and routes to Work Card Planning.
13. Same-active-candidate continuation still works.
14. WC02 Formal Work Card Approved still routes to WC02 Build Review despite stale WC01 Close evidence.
15. Work Card Repair routing from `Request Repair` still routes to the correct repair workspace with parent Work Card identity preserved.
16. Close / Next and all-complete Phase Validation routing remain unchanged.
17. No hidden selected-candidate state, route token, close acknowledgement, map sidecar, closeout document, validation mutation, Implementer Report mutation, or alternate persistence is created.
18. Typecheck, build, focused tests, and full test lane pass in the approved normal Windows environment.
19. No dependency is added.
20. No Git operation occurs.

## Negative Constraints

Do not:

- replace the full project/phase workflow resolver;
- reopen the WC46 Work Card Map status model;
- add user-facing Work Card Map statuses beyond `Complete`, `Eligible`, and `Ineligible`;
- use renderer state as Work Card authority;
- treat prompt text as the only target-binding enforcement;
- hard-code developer-specific repository names into generated prompts;
- mention `ChampCity_AI` or `champcity_ai` in generated Formal Work Card Architect prompts;
- force all users through this operator's current project names or repositories;
- delete `resolveWorkCardIntakeContext(...)` if it is still needed for canonical context construction;
- allow local candidate eligibility logic to override Work Card loop authority;
- create hidden selected-candidate state, route tokens, sidecar files, or close acknowledgement persistence;
- mutate validation records, Implementer Reports, phase closeouts, or project closeouts;
- route all-complete Work Cards to Phase Intake;
- silently select among multiple active incomplete candidates;
- add dependencies;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR04_selected_workspace_target_binding_and_loop_drift_hardening.md
```

The report must include:

- repository path, branch, remote, and working status verification;
- all changed files;
- confirmation that no Git mutation occurred;
- exact selected-workspace target binding design;
- exact generated-prompt wording or representative output proving generic target binding;
- proof that generated prompts no longer contain `ChampCity_AI`, `champcity_ai`, or project-specific wrong-target names;
- proof that Formal Work Card promotion/readback remains selected-workspace and active-target constrained;
- proof that Work Card repair routing goes through Work Card loop authority or a typed adapter before current-document repair routing can select a Work Card repair workspace;
- proof that `resolveWorkCardIntakeContext(...)` keeps context construction but no longer owns requested-candidate eligibility authority;
- proof that normal Work Card Map Begin Planning, same-active continuation, stale-WC01-close/WC02-build routing, repair routing, close return, and all-complete routing still pass;
- proof that project/phase lifecycle behavior outside the Work Card loop was not rewritten;
- commands run and results;
- validation skipped and reason;
- residual risks and Operator manual validation remaining.

End with:

```text
Document.Status=Pending
```

## Manual Validation

After Architect review of the Implementer Report, the Operator must validate in the running application:

1. Open a selected project workspace that is not the ChampCity A/I application source.
2. Select an Eligible Work Card from Work Card Map.
3. Prepare the Formal Work Card Architect prompt.
4. Confirm the prompt refers generically to the selected project workspace and does not name this application repository or any operator-specific wrong-target repository.
5. Confirm embedded ChatGPT begins against the selected project workspace without first reasoning through the application source repository.
6. Generate and approve the Formal Work Card.
7. Confirm the app routes to that same Work Card's Build Review.
8. Confirm `Request Repair` still routes to the correct Repair Work Card path and preserves parent Work Card identity.
9. Confirm Close / Next returns to Work Card Map and all-complete still routes to Phase Validation.
