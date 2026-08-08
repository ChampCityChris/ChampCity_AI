<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC47"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR17_project_repository_owned_mcp_workspace_route.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR17_project_repository_owned_mcp_workspace_route.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Interview Prompt Regeneration and Handoff Labeling",
    "status": "approved_for_implementation",
    "executionMode": "bounded workflow-hardening Work Card, not a repair pass",
    "confirmedDefect": "The Architect Interview workspace cannot recover when the generated Project Architect Interview Prompt Markdown is deleted after Project Intake approval. Project Intake submission creates the durable prompt, while Prepare Handoff only prepares the ChatGPT execution draft from that existing prompt. When the prompt is missing, the workspace has no regeneration path and the UI label makes the two handoff concepts ambiguous.",
    "rootCause": "The workflow treats the generated Project Architect Interview Prompt as an unrecoverable prerequisite once Project Intake has been submitted. Prompt document generation is coupled to Project Intake submission, while runtime ChatGPT handoff preparation is exposed through a generically named Prepare Handoff action that does not regenerate the missing durable prompt.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC47_architect_interview_prompt_regeneration_and_handoff_labeling.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Workflow hardening: regenerate missing durable Project Architect Interview Prompt from Approved Project Intake and clarify that Prepare Handoff prepares the ChatGPT execution handoff, not the durable prompt document.",
    "reviewedAt": "2026-08-07"
  }
}
CHAMPCITY-METADATA -->

# WC47 — Architect Interview Prompt Regeneration and Handoff Labeling

Status: Approved for Implementer execution  
Phase: `phase-08`  
Work Card type: workflow hardening, not a repair  
Git mutation: prohibited

## Confirmed Defect

After an Approved Project Intake exists, deleting the generated Project Architect Interview Prompt leaves the Architect Interview workspace unable to prepare a new ChatGPT handoff.

Confirmed current repository/runtime evidence:

```text
champcity_pdl currently contains:
- planning/project/Project_Intake/PROJECT_INTAKE_pocket_decision_log.md

champcity_pdl does not currently contain:
- planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_pocket_decision_log.md
```

The remaining Project Intake is valid canonical Markdown and is Approved. Its metadata contains:

```text
artifactType: project-intake
artifactRevision: 1
documentDisposition.status: Approved
workflowData.projectRepository: C:\Users\chapm\Projects\ChampCity_PDL
workflowData.repositoryAuthority.projectRepository: C:\Users\chapm\Projects\ChampCity_PDL
```

Current production path:

```text
src/main/projectIntake/projectIntakeService.ts
- Project Intake submission creates both the Project Intake and Project Architect Interview Prompt.

src/main/architectInterview/architectInterviewContextResolver.ts
- resolveCanonicalArchitectInterviewContext(...) requires an Approved associated project-architect-interview-prompt.
- When the prompt is missing, it returns prerequisites-unavailable.

src/main/architectInterview/architectInterviewService.ts
- prepareArchitectInterviewHandoff(...) prepares a runtime Architect draft submission from an existing prompt.
- It does not regenerate the durable Project Architect Interview Prompt document.

src/renderer/app/App.tsx
- The Browser Actions button label says "Prepare Handoff", which does not distinguish durable prompt-document generation from runtime ChatGPT handoff preparation.
```

Operator-visible failure:

```text
Approved Project Intake remains present.
Project Architect Interview Prompt was deleted as a recovery test.
Architect Interview workspace opens, but shows no selected document and no usable Prepare Handoff path.
The only current recovery path is resubmitting Project Intake, which is unnecessary and too destructive for a missing generated handoff document.
```

## Objective

Add a bounded recovery path for the missing durable Project Architect Interview Prompt and clarify the runtime handoff action label.

Required outcome:

```text
Approved Project Intake exists
→ Project Architect Interview Prompt is missing
→ Architect Interview workspace identifies this as recoverable
→ Operator can regenerate the missing durable prompt from the Approved Intake
→ regenerated prompt is canonical, Approved, source-linked to the current Intake revision, and uses the deterministic prompt target
→ runtime ChatGPT handoff preparation becomes available again
→ the UI label clearly distinguishes prompt regeneration from ChatGPT handoff preparation
```

## Non-Goal

This Work Card does not change the Project Intake questionnaire, Project Intake persistence, MCP workspace routing, compact Architect draft IDs, Project Planning, Phase Map, Work Card loops, validation routing, repair routing, close/next routing, Codex behavior, or Git behavior.

## Required Runtime Sequence

### Missing prompt recovery

```text
Operator has an Approved Project Intake
→ generated Project Architect Interview Prompt Markdown is missing
→ Architect Interview workspace resolves a recoverable missing-prompt state
→ workspace displays the Approved Project Intake as evidence and explains that the prompt document is missing
→ Operator clicks Regenerate Interview Prompt
→ app writes planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<projectSlug>.md
→ prompt metadata references the current Project Intake path and revision
→ prompt workflowData carries projectRepository, repositoryAuthority, projectSlug, and architectOutputTargets
→ prompt documentDisposition is Approved
→ Architect Interview workspace refreshes to waiting-for-output
→ Prepare ChatGPT Handoff is enabled
```

### Existing prompt behavior

```text
Approved Project Intake exists
→ associated Approved Project Architect Interview Prompt exists
→ Regenerate Interview Prompt is not shown as the primary action
→ Prepare ChatGPT Handoff prepares the runtime draft submission and copyable ChatGPT instruction
→ Copy Handoff copies the prepared ChatGPT instruction
```

## Required Changes

### 1. Factor deterministic prompt generation out of Project Intake submission

Extract the current Project Architect Interview Prompt construction logic from `src/main/projectIntake/projectIntakeService.ts` into a reusable helper or service.

The shared helper must construct the same durable prompt document currently created during Project Intake submission:

```text
planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<projectSlug>.md
```

Required prompt metadata:

```text
artifactType: project-architect-interview-prompt
participationRole: nonReviewHandoff
documentDisposition.status: Approved
sourceRevisions: [current Approved Project Intake path/revision]
workflowData.projectRepository: inherited from Project Intake
workflowData.repositoryAuthority.projectRepository: inherited from Project Intake
workflowData.projectSlug: <projectSlug>
workflowData.architectOutputTargets.markdown: planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_<projectSlug>.md
```

The body must remain the current Project Architect Interview Prompt body contract. Do not create a new prompt format unless required by existing tests.

### 2. Add a regeneration action for the Architect Interview workspace

Add a backend action that regenerates the missing Project Architect Interview Prompt when all of the following are true:

```text
- exactly one active canonical Project Intake exists;
- that Project Intake is Approved;
- that Project Intake is readable;
- no current associated Approved Project Architect Interview Prompt exists;
- the deterministic prompt target is absent.
```

The action must not rewrite or revise the Approved Project Intake.

The action must not overwrite an existing prompt document at the deterministic target. If a file exists at the target but is not the expected prompt, return a needs-attention/conflict result requiring Operator intervention.

The action must be idempotent:

```text
- if the prompt is missing, create it once;
- if the prompt already exists and is current, return the existing workspace model without rewriting it;
- if conflicting prompt evidence exists, do not silently choose or overwrite.
```

Approved IPC/API shape may be either:

```text
architectInterview:regeneratePrompt
```

or an existing Architect-output/workspace action extended with an explicit operation, as long as the behavior is clear and tested.

### 3. Update Architect Interview workspace resolution

Update `resolveCanonicalArchitectInterviewContext(...)` and/or `getArchitectInterviewWorkspaceModel(...)` so the missing prompt case is represented as recoverable, not as an opaque unrecoverable prerequisite failure.

Required UI/model behavior when only an Approved Project Intake exists:

```text
state or requiredAction indicates the Project Architect Interview Prompt is missing and can be regenerated;
evidencePaths include the Approved Project Intake path;
selected/readable document should be the Project Intake or a clear recovery placeholder, not an empty "No document selected" state;
canRegeneratePrompt or equivalent action flag is true;
canPrepareHandoff remains false until the durable prompt exists.
```

Do not make runtime ChatGPT handoff preparation create the durable prompt implicitly without surfacing the recovery state. The Operator should be able to understand which artifact is being recreated.

### 4. Clarify the action labels

In `src/renderer/app/App.tsx`, clarify labels in the Architect Interview workspace:

```text
Regenerate Interview Prompt
Prepare ChatGPT Handoff
Copy ChatGPT Handoff
```

Minimum requirement:

```text
- When the durable Project Architect Interview Prompt is missing, show an enabled Regenerate Interview Prompt action.
- When the prompt exists and runtime handoff preparation is available, show Prepare ChatGPT Handoff instead of the ambiguous Prepare Handoff label for the Architect Interview workspace.
- Copy Handoff may remain global if changing all labels is too broad, but Architect Interview should make clear that this copies the prepared ChatGPT handoff, not the durable prompt document.
```

Generic Architect-output workspaces may retain their current label if changing them would broaden scope. Prefer a contextual label for Architect Interview only.

### 5. Preserve runtime handoff semantics

Do not change what runtime handoff preparation does.

`Prepare ChatGPT Handoff` must still:

```text
- create/reuse an active Architect draft submission;
- create a deterministic temporary draft path under planning/Architect_Drafts/...;
- build the copyable ChatGPT instruction;
- include artifact_toolbox.create_markdown_artifact JSON for the temporary body-only draft;
- preserve source revision locking against the current prompt.
```

### 6. Preserve recent route and draft-ID fixes

Do not regress WC46-REPAIR16 or WC46-REPAIR17.

Required preservation:

```text
- MCP workspaceId is computed from Project Intake projectRepository folder basename for normal no-binding flows.
- ChampCity_PDL computes to champcity_pdl.
- no .champcity/mcp-workspace-binding.json is required for normal prompt generation.
- compact Architect draft IDs remain src-<20-hex-sha256-prefix>-r<revision>.
```

## Authorized Surface

Production files authorized:

```text
src/main/projectIntake/projectIntakeService.ts
src/main/architectInterview/architectInterviewContextResolver.ts
src/main/architectInterview/architectInterviewService.ts
src/main/architectInterview/architectInterviewDraftPilot.ts
src/main/integrations/architectMcpHandoffService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
```

A new narrowly named helper file is authorized if it keeps the Project Architect Interview Prompt writer shared and testable, for example:

```text
src/main/architectInterview/projectArchitectInterviewPromptWriter.ts
src/main/projectIntake/projectArchitectInterviewPromptWriter.ts
```

Tests authorized:

```text
test/project-intake/project-intake-service.test.cjs
test/architect-interview/architect-interview-workspace.test.cjs
test/architect-outputs/architect-output-prompt-contracts.test.cjs
test/renderer/figma-redesign-shell.test.cjs
test/workflow/production-service-proof.test.cjs
test/support/canonical-markdown-fixtures.cjs
```

A new focused Architect Interview prompt-regeneration test file is authorized if cleaner.

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC47_architect_interview_prompt_regeneration_and_handoff_labeling.md
```

## Acceptance Criteria

1. The app can regenerate a missing Project Architect Interview Prompt from an Approved Project Intake without resubmitting Project Intake.
2. The regenerated prompt uses deterministic path `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<projectSlug>.md`.
3. The regenerated prompt has artifactType `project-architect-interview-prompt`, participationRole `nonReviewHandoff`, Approved disposition, and sourceRevisions referencing the current Project Intake revision.
4. The regenerated prompt workflowData carries `projectRepository`, `repositoryAuthority.projectRepository`, `projectSlug`, and `architectOutputTargets.markdown`.
5. The regeneration action does not rewrite, revise, or change the Approved Project Intake.
6. The regeneration action does not overwrite an existing nonmatching prompt file at the deterministic target.
7. Architect Interview workspace shows a recoverable missing-prompt state instead of an empty document panel and disabled ambiguous handoff path.
8. Architect Interview workspace exposes an enabled `Regenerate Interview Prompt` action when the prompt is missing and the Approved Intake is available.
9. After regeneration, Architect Interview workspace enables `Prepare ChatGPT Handoff`.
10. `Prepare ChatGPT Handoff` still creates the runtime draft submission and copyable ChatGPT instruction; it does not rewrite the durable prompt.
11. Prepared ChatGPT handoff for `ChampCity_PDL` still contains literal workspaceId `champcity_pdl` and no workspace-inference instruction.
12. Compact Architect draft IDs from WC46-REPAIR16 remain intact for the regenerated prompt path.
13. Tests cover deleting the prompt after Project Intake approval, refreshing/reopening the workspace, regenerating the prompt, preparing the ChatGPT handoff, and verifying Copy Handoff availability.
14. Existing Project Intake initial submission still creates the prompt as before.
15. No legacy document migration is performed.
16. No unrelated Project Planning, Phase Map, Work Card, repair, validation, close, Codex, MCP server, or Git behavior changes are introduced.
17. No Git mutation is performed.

## Negative Constraints

Do not:

- require Project Intake resubmission to recover a missing generated prompt;
- make runtime ChatGPT handoff preparation silently recreate the durable prompt without a clear regeneration state/action;
- overwrite an existing conflicting prompt document;
- create duplicate active Project Architect Interview Prompt documents;
- change the Project Intake body or questionnaire;
- remove `projectRepository` or `repositoryAuthority.projectRepository` metadata;
- reintroduce mandatory `mcpWorkspaceBinding` metadata/config for normal prompt generation;
- ask ChatGPT to resolve or infer workspaceId;
- change compact Architect draft ID construction;
- migrate legacy documents;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Return Target

```text
WC47 implementation complete
→ planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC47_architect_interview_prompt_regeneration_and_handoff_labeling.md
→ Architect review
→ Operator validation
→ continue phase-08 workflow according to existing resolver authority
```

## Implementer Report Requirements

The Implementer Report must include:

- exact files changed;
- RCA confirmation for missing prompt recovery and label ambiguity;
- summary of shared prompt-writer/helper changes;
- before/after behavior when the prompt document is deleted after Project Intake approval;
- proof that Project Intake is not rewritten during regeneration;
- proof that conflicting target files are not overwritten;
- proof that `Prepare ChatGPT Handoff` remains runtime draft-submission preparation only;
- proof that `champcity_pdl` route generation and compact Architect draft IDs still pass;
- validation commands, working directory, exit codes, and result summaries;
- acceptance-criteria mapping;
- skipped validation or residual risk.

The report must remain `Pending` for Architect/Operator review.

## Manual Validation

1. Create or use a project with an Approved Project Intake and an existing Project Architect Interview Prompt.
2. Delete only `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<slug>.md`.
3. Restart or refresh the app.
4. Open Architect Interview.
5. Confirm the workspace shows the missing prompt as recoverable and shows `Regenerate Interview Prompt`.
6. Click `Regenerate Interview Prompt`.
7. Confirm the prompt Markdown is recreated at the deterministic prompt path and the Approved Project Intake file is unchanged.
8. Confirm `Prepare ChatGPT Handoff` becomes available.
9. Click `Prepare ChatGPT Handoff`.
10. Confirm `Copy Handoff` or `Copy ChatGPT Handoff` becomes available.
11. Copy the handoff and confirm it writes to a temporary body-only draft path under `planning/Architect_Drafts/...` and uses workspaceId `champcity_pdl` for a `ChampCity_PDL` project.
12. Confirm no 240-character Architect draft submission ID error occurs.
13. Confirm no legacy documents were migrated solely for this hardening.
