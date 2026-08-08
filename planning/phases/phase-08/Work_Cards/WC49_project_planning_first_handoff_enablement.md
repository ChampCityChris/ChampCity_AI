<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC49"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC47_architect_interview_prompt_regeneration_and_handoff_labeling.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Project Planning First-Handoff Enablement",
    "status": "approved_for_implementation",
    "executionMode": "bounded workflow-hardening Work Card, not a repair pass",
    "confirmedDefect": "After Project Intake, Project Architect Interview Prompt, and Project Architect Interview are present and Approved, Project Planning advances but the handoff action is greyed out when no Project Planning handoff exists yet. The service currently gates handoff preparation on the existence of the same handoff it is supposed to create.",
    "rootCause": "getProjectPlanningWorkspaceModel derives canPrepareHandoff from canPrepareDraftBundleForContext(context). That helper returns false when context.handoff is missing, even though generateProjectPlanningHandoff(...) and prepareProjectPlanningHandoff(...) are responsible for creating the first Project Planning handoff from the ready Project Planning context.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC49_project_planning_first_handoff_enablement.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Workflow hardening: enable the first Project Planning handoff when upstream Project Intake, Interview Prompt, and Interview are Approved and no Project Planning handoff exists yet.",
    "reviewedAt": "2026-08-07"
  }
}
CHAMPCITY-METADATA -->

# WC49 — Project Planning First-Handoff Enablement

Status: Approved for Implementer execution  
Phase: `phase-08`  
Work Card type: workflow hardening, not a repair  
Git mutation: prohibited

## Confirmed Defect

After an Approved Project Intake, Approved Project Architect Interview Prompt, and Approved Project Architect Interview exist, Project Planning advances but the handoff action remains disabled when the Project Planning handoff has not yet been created.

Confirmed current `champcity_pdl` evidence after Operator validation:

```text
planning/project/Project_Intake/PROJECT_INTAKE_pocket_decision_log.md
planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_pocket_decision_log.md
planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_pocket_decision_log.md
```

No Project Planning handoff exists yet:

```text
planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_pocket_decision_log.md
```

That is supposed to be the ready-to-prepare state, not a disabled state.

Confirmed production path:

```text
src/main/projectPlanning/projectPlanningContext.ts
- resolveProjectPlanningContext(...) requires Approved Project Intake, Approved associated Project Architect Interview Prompt, and Approved current Project Architect Interview.
- It computes the deterministic Project Planning handoff target as:
  planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_<projectSlug>.md
- It returns a ready context even when context.handoff is undefined.

src/main/projectPlanning/projectPlanningService.ts
- deriveWorkspaceState(context) returns ready-for-handoff when !context.handoff.
- generateProjectPlanningHandoff(workspaceRoot) creates the missing Project Planning handoff from the ready context.
- prepareProjectPlanningHandoff(workspaceRoot) calls generateProjectPlanningHandoff(...) and then prepares the Project Planning draft bundle submission.
- getProjectPlanningWorkspaceModel(...) currently sets canPrepareHandoff from canPrepareDraftBundleForContext(context).
- canPrepareDraftBundleForContext(context) currently returns false when !context.handoff.
```

This creates a circular gate:

```text
Prepare handoff is disabled until Project Planning handoff exists.
Project Planning handoff is created by Prepare handoff.
Therefore the first Project Planning handoff cannot be created from the UI.
```

## Objective

Allow the first Project Planning handoff to be prepared when the Project Planning context is ready and no Project Planning handoff exists yet.

Required outcome:

```text
Approved Project Intake exists
+ Approved associated Project Architect Interview Prompt exists
+ Approved current Project Architect Interview exists
+ no Project Planning handoff exists
→ Project Planning workspace state is Ready / ready-for-handoff
→ Prepare Project Planning Handoff is enabled
→ click creates the deterministic Approved Project Planning handoff
→ app prepares the Project Planning draft bundle submission
→ Copy Handoff becomes available
→ copied handoff contains the bound MCP workspaceId and temporary Project Profile/Roadmap draft paths
```

## Non-Goal

This Work Card does not change the Architect Interview runtime finalization gate. That is owned by WC48.

This Work Card does not change Project Intake, Project Architect Interview Prompt generation/regeneration, Project Architect Interview promotion, Phase Map, Phase Interview, Phase Planning, Work Card loops, Codex behavior, or Git behavior.

## Required Runtime Sequence

### First Project Planning handoff

```text
Project Planning upstream evidence is complete:
- Approved Project Intake
- Approved Project Architect Interview Prompt
- Approved Project Architect Interview

No Project Planning handoff exists:
- context.handoff is undefined

Application behavior:
→ Project Planning model reports state ready-for-handoff
→ canPrepareHandoff is true
→ canCopyHandoff is false until preparation creates/prepares the handoff instruction
→ Operator clicks Prepare Project Planning Handoff
→ generateProjectPlanningHandoff(...) writes the deterministic handoff Markdown
→ prepareProjectPlanningDraftBundleSubmission(...) creates/reuses the temporary bundle draft submission
→ model refreshes to waiting-for-output or equivalent copy-ready state
→ Copy Handoff is enabled
```

### Existing Project Planning handoff

```text
A current Approved Project Planning handoff already exists
+ Project Profile and Project Roadmap outputs are not present
→ Project Planning remains waiting-for-output
→ Copy Handoff remains available or can be re-prepared without rewriting equivalent current evidence
```

### RevisionRequested Project Planning bundle

```text
Project Profile and Project Roadmap exist, are synchronized, and both have RevisionRequested disposition
→ Project Planning revision handoff preparation remains available
→ copied instruction includes the current shared revision notes
```

### Invalid evidence

```text
Invalid handoff/profile/roadmap evidence exists
→ preparation remains blocked
→ model reports Needs Attention with the existing invalid reason
```

## Required Changes

### 1. Separate first-handoff preparation from draft-bundle preparation gating

The implementation must stop using a helper that requires `context.handoff` to decide whether the first Project Planning handoff can be prepared.

The model must distinguish at least these cases:

```text
Case A: no context.handoff and no invalid Project Planning evidence
- canPrepareHandoff: true
- canCopyHandoff: false until preparation occurs
- state: ready-for-handoff

Case B: context.handoff exists and no Profile/Roadmap outputs exist
- canPrepareHandoff: true or idempotent re-prepare allowed
- canCopyHandoff: true when prepared instruction exists or can be generated
- state: waiting-for-output

Case C: context.profile/context.roadmap are synchronized RevisionRequested
- canPrepareHandoff: true for revision handoff
- canCopyHandoff: true after preparation

Case D: invalid handoff/profile/roadmap evidence exists
- canPrepareHandoff: false
- canCopyHandoff: false
- state: needs-attention
```

The exact helper names are up to the Implementer, but the service-level behavior must be deterministic and covered by tests.

### 2. Preserve deterministic handoff creation

The first Project Planning handoff must still be created through the existing controlled path:

```text
generateProjectPlanningHandoff(workspaceRoot)
```

Required handoff target:

```text
planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_<projectSlug>.md
```

Required handoff metadata must remain aligned with current architecture:

```text
artifactType: generated-handoff
participationRole: nonReviewHandoff
documentDisposition.status: Approved
workflowData.handoffKind: project-planning
workflowData.contractId: project-planning-output-submission-v2
workflowData.projectProfileTarget: planning/project/PROJECT_PROFILE.md or current configured target
workflowData.projectRoadmapTarget: planning/project/Project_Roadmap/PROJECT_ROADMAP_<projectSlug>.md or current configured target
workflowData.repositoryAuthority.projectRepository: inherited from upstream source revisions
sourceRevisions: current Project Intake, Project Architect Interview Prompt, and Project Architect Interview revisions
```

### 3. Preserve Project Planning draft bundle behavior

After first handoff creation, preparation must still create/reuse the atomic Project Planning draft bundle submission for:

```text
Project Profile temporary draft
Project Roadmap temporary draft
```

The copied handoff must still instruct ChatGPT to create both temporary body-only drafts and must preserve:

```text
- literal bound MCP workspaceId, including champcity_pdl for ChampCity_PDL
- no workspace inference/search fallback
- no final canonical writes by ChatGPT
- ChampCity A/I promotion ownership
- overwrite:false for artifact_toolbox.create_markdown_artifact
```

### 4. Renderer behavior

The Project Planning workspace UI must not show the first Project Planning handoff action as disabled merely because no Project Planning handoff exists.

The Operator-visible action label should clearly refer to Project Planning, such as:

```text
Prepare Project Planning Handoff
Copy Project Planning Handoff
```

The exact label may fit existing shell patterns, but it must not obscure that this action creates/prepares the first Project Planning handoff from the approved upstream planning evidence.

## Required Code Areas To Inspect And Adjust

The Implementer must inspect and, where necessary, modify the complete affected path:

```text
src/main/projectPlanning/projectPlanningContext.ts
src/main/projectPlanning/projectPlanningService.ts
src/main/projectPlanning/projectPlanningDraftBundle.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/architectOutputs/architectOutputRuntimeService.ts
src/main/integrations/mcpWorkspacePromptContract.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
test/project-planning/project-planning-service.test.cjs
test/architect-outputs/architect-output-prompt-contracts.test.cjs
test/renderer/figma-redesign-shell.test.cjs
test/renderer/project-rail-presentation.test.cjs
```

If the generic Architect-output model already supports the required state, prefer a small service-level correction over a broad renderer rewrite.

## Required Preservation

Preserve all of the following:

```text
- Project Planning context readiness rules for Approved Intake, Prompt, and Interview.
- Project Planning handoff deterministic path.
- Project Planning handoff metadata contract and sourceRevisions.
- Project Profile and Project Roadmap target calculation.
- Project Planning atomic draft bundle promotion.
- RevisionRequested bundle flow when both Profile and Roadmap are synchronized.
- Invalid evidence blocking behavior.
- REPAIR17 workspace route computation.
- WC47 prompt regeneration behavior.
- WC48 Architect Interview finalization gate once implemented.
```

## Forbidden Changes

The Implementer must not:

```text
- Make Project Planning ready before the Architect Interview is Approved.
- Create Project Profile or Project Roadmap directly during handoff preparation.
- Skip generation of the Project Planning handoff Markdown.
- Use hidden local state as substitute authority for upstream source revisions.
- Treat a missing handoff as needs-attention when upstream evidence is otherwise valid.
- Allow Project Planning copy to proceed with invalid handoff/profile/roadmap evidence.
- Reintroduce workspace inference, workspace search, or <PROJECT_REPO> fallback into copied handoffs.
- Add external services, provider SDKs, databases, authentication, or Git mutation.
```

## Acceptance Criteria

The implementation passes only if all criteria below are satisfied.

1. With Approved Project Intake, Approved Project Architect Interview Prompt, and Approved Project Architect Interview present, and no Project Planning handoff present, `getProjectPlanningWorkspaceModel(...)` reports a ready-for-handoff/Ready state and `canPrepareHandoff === true`.

2. In that same state, `canCopyHandoff` is false until preparation creates/reuses a prepared instruction, unless the existing architecture intentionally auto-prepares on copy; either behavior must be deterministic and tested.

3. Calling `prepareProjectPlanningHandoff(...)` in the first-handoff state writes the deterministic Project Planning handoff Markdown.

4. The generated handoff has `artifactType=generated-handoff`, `participationRole=nonReviewHandoff`, `documentDisposition.status=Approved`, `workflowData.handoffKind=project-planning`, and `contractId=project-planning-output-submission-v2`.

5. The generated handoff sourceRevisions include the current Project Intake, Project Architect Interview Prompt, and Project Architect Interview revisions.

6. The generated handoff workflowData preserves repositoryAuthority inherited from upstream planning documents.

7. After preparation, the model exposes a copyable Project Planning handoff instruction.

8. The copied Project Planning handoff instruction includes the literal bound workspaceId for the selected project, including `champcity_pdl` for `ChampCity_PDL`.

9. The copied Project Planning handoff instruction includes temporary body-only draft paths for both Project Profile and Project Roadmap.

10. The copied Project Planning handoff instruction does not include workspace inference/search fallback or `<resolved workspace ID>` placeholders.

11. Existing handoff-present waiting-for-output behavior remains valid.

12. RevisionRequested behavior remains available only when Project Profile and Project Roadmap are synchronized and both require revision.

13. Invalid Project Planning handoff, invalid Project Profile, or invalid Project Roadmap evidence still blocks preparation and copy.

14. Renderer tests prove the first Project Planning handoff action is enabled in the upstream-approved/no-handoff state.

15. Project Intake, Architect Interview, Phase Map, Phase Interview, Phase Planning, Work Card, validation, and repair flows remain unaffected.

## Required Tests

Add or update focused tests that prove at least these scenarios:

```text
Scenario A — first Project Planning handoff
Given Approved Project Intake, Approved Project Architect Interview Prompt, and Approved Project Architect Interview
And no Project Planning handoff exists
When Project Planning model is loaded
Then canPrepareHandoff is true
And state is ready-for-handoff.

Scenario B — prepare first handoff
Given Scenario A
When prepareProjectPlanningHandoff(...) is called
Then the deterministic Project Planning handoff Markdown is created
And the draft bundle instruction becomes copyable.

Scenario C — instruction route
Given a ChampCity_PDL project repository authority
When the Project Planning handoff instruction is copied
Then it contains workspaceId champcity_pdl
And it contains both temporary draft paths.

Scenario D — invalid evidence remains blocking
Given an invalid existing Project Planning handoff or invalid output document
When Project Planning model is loaded
Then canPrepareHandoff and canCopyHandoff are false
And Needs Attention explains the invalid evidence.

Scenario E — revision flow preservation
Given synchronized RevisionRequested Project Profile and Roadmap
When Project Planning model is loaded
Then revision handoff preparation remains available and includes shared revision notes.
```

## Validation Commands

The Implementer must run the applicable validation lanes and report exact commands/results:

```text
npx tsc --noEmit
npx tsc
node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs
node --test --test-concurrency=1 test/architect-outputs/architect-output-prompt-contracts.test.cjs
node --test --test-concurrency=1 test/renderer/figma-redesign-shell.test.cjs
node --test --test-concurrency=1 test/renderer/project-rail-presentation.test.cjs
node --test --test-concurrency=1
npx vite build
```

If sandbox execution hits known `EPERM` or `spawn EPERM` behavior, rerun in the normal Windows lane and report both attempts exactly.

## Manual Validation After Codex

After implementation and Architect review, the Operator must verify in the built app:

```text
1. Use a project with Approved Project Intake, Approved Project Architect Interview Prompt, and Approved Project Architect Interview.
2. Ensure no Project Planning handoff exists.
3. Open Project Planning.
4. Confirm the Prepare Project Planning Handoff action is enabled.
5. Click Prepare Project Planning Handoff.
6. Confirm the Project Planning handoff Markdown is created under planning/project/Project_Planning_Documents/.
7. Confirm Copy Handoff becomes available.
8. Copy the handoff and confirm it contains champcity_pdl for the Pocket Decision Log project.
9. Confirm it contains both Project Profile and Project Roadmap temporary draft paths.
10. Confirm Project Planning can proceed to draft creation without recreating Project Intake or Architect Interview artifacts.
```

## Implementer Report Requirement

Create the Implementer Report at:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC49_project_planning_first_handoff_enablement.md
```

The report must include:

```text
- repository verification
- files changed
- implementation summary
- before/after first-handoff behavior
- generated handoff metadata proof
- copied handoff route proof
- test commands and results
- any deviations
- remaining Operator validation steps
```

## Remaining Passes For Phase

After WC49, return to Operator validation of the Pocket Decision Log workflow unless new evidence identifies a separate bounded workflow-hardening card.
