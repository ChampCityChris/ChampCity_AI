# Architect Review - WC49 Project Planning First-Handoff Enablement

Disposition: Approved for Operator validation  
Review type: Formal Architect review of numbered Work Card implementation  
Work Card: `planning/phases/phase-08/Work_Cards/WC49_project_planning_first_handoff_enablement.md`  
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC49_project_planning_first_handoff_enablement.md`  
Git mutation by Architect: none

## Repository Verification

ChampCity MCP reported the selected workspace as:

```text
workspaceId: champcity_ai
repositoryName: ChampCityChris/ChampCity_AI
branch: feature/phase-04-wc01-repair01-evidence-derived-workflow
```

The worktree was not clean at review time. Relevant changed paths included:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC49_project_planning_first_handoff_enablement.md
src/main/projectPlanning/projectPlanningService.ts
src/renderer/app/App.tsx
test/architect-outputs/architect-output-workspace-repair.test.cjs
test/project-planning/project-planning-service.test.cjs
test/renderer/figma-redesign-shell.test.cjs
test/renderer/project-rail-presentation.test.cjs
```

## Materials Reviewed

I reviewed:

```text
planning/phases/phase-08/Work_Cards/WC49_project_planning_first_handoff_enablement.md
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC49_project_planning_first_handoff_enablement.md
src/main/projectPlanning/projectPlanningService.ts
src/renderer/app/App.tsx
test/project-planning/project-planning-service.test.cjs
test/architect-outputs/architect-output-workspace-repair.test.cjs
test/renderer/figma-redesign-shell.test.cjs
test/renderer/project-rail-presentation.test.cjs
```

I did not run validation commands myself. Implementer-reported command results are treated as reported evidence, not independently executed Architect evidence.

## Summary Finding

WC49 satisfies the bounded workflow-hardening objective.

The implementation fixes the circular first-handoff gate by separating handoff-preparation eligibility from draft-bundle-preparation eligibility. A Project Planning context with Approved Project Intake, Approved Project Architect Interview Prompt, Approved Project Architect Interview, and no Project Planning handoff now reports `ready-for-handoff` with `canPrepareHandoff === true` and `canCopyHandoff === false`. Preparing the handoff still uses the existing controlled path, creates the deterministic Project Planning handoff, and then prepares the atomic Project Planning draft bundle.

## Source Review Findings

### 1. First-handoff gate corrected

`src/main/projectPlanning/projectPlanningService.ts` now computes two separate concepts:

```text
canPrepareDraft = canPrepareDraftBundleForContext(context)
canPrepareHandoff = canPrepareHandoffForContext(context)
```

`getProjectPlanningWorkspaceModel(...)` now exposes `canPrepareHandoff` from the new handoff-specific helper rather than from the draft-bundle helper.

The retained draft-bundle helper still requires a current handoff before temporary draft submission preparation. The new handoff helper allows preparation when no Project Profile and no Project Roadmap exist, which is the first-handoff state. It still blocks when invalid handoff/profile/roadmap evidence is present.

This matches WC49's required separation between first handoff creation and draft-bundle preparation.

### 2. Deterministic handoff creation preserved

`prepareProjectPlanningHandoff(...)` still calls:

```text
generateProjectPlanningHandoff(workspaceRoot)
prepareProjectPlanningDraftBundleSubmission(workspaceRoot)
```

`generateProjectPlanningHandoff(...)` still writes the deterministic handoff target:

```text
planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_<projectSlug>.md
```

The generated handoff metadata remains controlled by `projectPlanningHandoffMetadata(...)` and preserves:

```text
artifactType: generated-handoff
participationRole: nonReviewHandoff
documentDisposition.status: Approved
workflowData.handoffKind: project-planning
workflowData.contractId: project-planning-output-submission-v2
sourceRevisions: Project Intake, Project Architect Interview Prompt, Project Architect Interview
repositoryAuthority: inherited from upstream source revisions
```

### 3. Copy behavior preserved

Before preparation, `canCopyHandoff` remains false because no current handoff or prepared instruction exists. After preparation, the model exposes a copyable handoff instruction through the existing draft-bundle runtime path.

The handoff instruction continues to include temporary body-only draft paths for both Project Profile and Project Roadmap and uses `artifact_toolbox.create_markdown_artifact` with `overwrite:false` under the existing Project Planning bundle contract.

### 4. Renderer labeling corrected

`src/renderer/app/App.tsx` now labels Project Planning actions as:

```text
Prepare Project Planning Handoff
Copy Project Planning Handoff
```

The renderer still gates those buttons through the model-provided `canPrepareHandoff` and `canCopyHandoff` booleans.

## Test Evidence Reviewed

`test/project-planning/project-planning-service.test.cjs` now includes focused coverage for:

```text
- ready upstream evidence with no Project Planning handoff: state ready-for-handoff, railStatus Ready, canPrepareHandoff true, canCopyHandoff false
- prepare first handoff: deterministic handoff path created, state waiting-for-output, canCopyHandoff true, waiting draft bundle submission created
- copied instruction route: literal champcity_pdl route when repositoryAuthority resolves to ChampCity_PDL, temporary Project Profile/Roadmap draft paths, no workspace fallback placeholders
- invalid existing handoff: needs-attention, canPrepareHandoff false, canCopyHandoff false
- synchronized RevisionRequested bundle flow: preparation remains available and revision notes are preserved
```

`test/architect-outputs/architect-output-workspace-repair.test.cjs` includes a product-path regression proving the generic Architect-output workspace reports Project Planning first-handoff preparation before copy and becomes copyable after preparation.

Renderer tests were updated to assert the Project Planning-specific action labels and continued model-based button disablement.

## Implementer-Reported Validation

The Implementer Report states these relevant results:

```text
npx tsc --noEmit: passed
npx tsc: sandbox EPERM, normal Windows rerun passed
node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs: sandbox spawn EPERM, normal Windows rerun passed, 19 tests
node --test --test-concurrency=1 test/architect-outputs/architect-output-prompt-contracts.test.cjs: normal Windows rerun passed, 6 tests
node --test --test-concurrency=1 test/renderer/figma-redesign-shell.test.cjs: normal Windows rerun passed, 8 tests
node --test --test-concurrency=1 test/renderer/project-rail-presentation.test.cjs: normal Windows rerun passed, 25 tests
node --test --test-concurrency=1 test/architect-outputs/architect-output-workspace-repair.test.cjs: normal Windows rerun passed, 23 tests
node --test --test-concurrency=1: normal Windows rerun passed, 321 tests
npx vite build: normal Windows rerun passed
```

The reported sandbox `EPERM` and `spawn EPERM` behavior is consistent with earlier validation-lane limitations. I did not independently rerun these commands.

## Acceptance Criteria Mapping

1. Upstream-approved/no-handoff state reports `ready-for-handoff`, `Ready`, `canPrepareHandoff === true`: satisfied by service source and tests.

2. `canCopyHandoff` remains false before preparation: satisfied.

3. `prepareProjectPlanningHandoff(...)` writes the deterministic handoff Markdown: satisfied by production path and test.

4. Generated handoff metadata contract is preserved: satisfied by source and test assertions.

5. Source revisions include Project Intake, Project Architect Interview Prompt, and Project Architect Interview: satisfied by source and test assertions.

6. `repositoryAuthority` inheritance is preserved: satisfied by source and test assertions.

7. After preparation, copyable Project Planning handoff instruction is exposed: satisfied.

8. Literal bound workspaceId, including `champcity_pdl`, is present in copied instruction: satisfied by test evidence.

9. Both Project Profile and Project Roadmap temporary draft paths are present: satisfied.

10. Workspace inference/search fallback and `<resolved workspace ID>` placeholders remain absent: satisfied by test assertions.

11. Existing handoff-present waiting-for-output behavior remains valid: satisfied by retained flow and product-path test.

12. RevisionRequested behavior remains available only for synchronized RevisionRequested Profile/Roadmap: satisfied by retained helper and test.

13. Invalid handoff/profile/roadmap evidence still blocks prepare and copy: satisfied by source and invalid-handoff test; existing invalid output paths remain guarded by the unchanged invalidReason path.

14. Renderer tests prove Project Planning action labels and model-based enablement/disablement: satisfied by source and renderer test assertions.

15. Non-target workflows remain out of scope: no inspected changes modify Project Intake, Architect Interview finalization, Phase Map, Phase Interview, Phase Planning, Work Card, validation, or repair logic beyond renderer labels and tests tied to Project Planning.

## Residual Risk

The review does not validate live embedded ChatGPT or live MCP write-back. Operator manual validation remains required.

## Manual Validation Required

Operator should validate the WC49 scenario in the built app:

```text
1. Use a project with Approved Project Intake, Approved Project Architect Interview Prompt, and Approved Project Architect Interview.
2. Ensure no Project Planning handoff exists.
3. Open Project Planning.
4. Confirm Prepare Project Planning Handoff is enabled.
5. Click Prepare Project Planning Handoff.
6. Confirm the Project Planning handoff Markdown is created under planning/project/Project_Planning_Documents/.
7. Confirm Copy Project Planning Handoff becomes available.
8. Copy the handoff and confirm it contains champcity_pdl for Pocket Decision Log.
9. Confirm it contains both Project Profile and Project Roadmap temporary draft paths.
10. Confirm Project Planning can proceed without recreating Project Intake or Architect Interview artifacts.
```

## Disposition

Approved for Operator validation.

No additional repair is required from this Architect review.
