<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC48"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC47_architect_interview_prompt_regeneration_and_handoff_labeling.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Interview Runtime Finalization Gate",
    "status": "approved_for_implementation",
    "executionMode": "bounded workflow-hardening Work Card, not a repair pass",
    "confirmedDefect": "The regenerated Project Architect Interview Prompt uses the same durable prompt writer as Project Intake submission, but the current runtime ChatGPT handoff exposes a concrete artifact_toolbox.create_markdown_artifact invocation before the conversational interview and Operator confirmation have actually occurred. In live validation, ChatGPT skipped the interview and wrote a draft immediately.",
    "rootCause": "Recent MCP route/binding work made the runtime handoff immediately executable by replacing workspace-resolution placeholders with a literal bound workspaceId and concrete create_markdown_artifact JSON. The Architect Interview runtime handoff currently combines two phases—conduct interview and write final draft—into one copied instruction, leaving the confirmation gate as model-compliance text instead of an application-enforced workflow state.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC48_architect_interview_runtime_finalization_gate.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Workflow hardening: split Architect Interview runtime chat initiation from final draft write-back so create_markdown_artifact is only exposed after an explicit Operator finalization action.",
    "reviewedAt": "2026-08-07"
  }
}
CHAMPCITY-METADATA -->

# WC48 — Architect Interview Runtime Finalization Gate

Status: Approved for Implementer execution  
Phase: `phase-08`  
Work Card type: workflow hardening, not a repair  
Git mutation: prohibited

## Confirmed Defect

The Project Architect Interview durable prompt-regeneration path is not the confirmed cause of the skipped interview.

Confirmed source evidence:

```text
src/main/projectIntake/projectIntakeService.ts
- Project Intake submission calls writeProjectArchitectInterviewPrompt(...).

src/main/architectInterview/architectInterviewService.ts
- regenerateArchitectInterviewPrompt(...) also calls writeProjectArchitectInterviewPrompt(...).

src/main/architectInterview/projectArchitectInterviewPromptWriter.ts
- buildProjectArchitectInterviewPrompt(...) owns the shared durable Project Architect Interview Prompt metadata and body.
```

Therefore, regenerated durable prompts and intake-created durable prompts are intended to use the same writer and same prompt body contract.

The live defect occurred in the runtime copied handoff after regeneration:

```text
Operator regenerated the missing durable Project Architect Interview Prompt.
Operator prepared/copied the Architect Interview handoff.
ChatGPT read the input documents and immediately created the temporary draft through artifact_toolbox.create_markdown_artifact.
ChatGPT did not conduct the conversational interview or ask the Operator to confirm the completion summary before writing.
```

Current runtime handoff evidence:

```text
src/main/architectInterview/architectInterviewDraftPilot.ts
- buildProjectArchitectInterviewPreparedInstruction(...) constructs the copied runtime handoff.
- It now injects the bound MCP workspace block through buildMcpWorkspaceBindingPromptBlock(...).
- It now injects a concrete artifact_toolbox.create_markdown_artifact JSON block through buildCreateMarkdownArtifactJsonBlock(...).
```

Recent MCP route/binding work changed the runtime handoff from a placeholder workflow:

```text
workspaceId: "<resolved workspace ID>"
```

to a concrete executable workflow:

```text
workspaceId: "champcity_pdl"
```

That concrete route is correct for MCP binding, but it also removed the friction that previously made premature draft creation less likely. The app currently relies on the model to obey a conversational/confirmation gate while handing the model an immediately usable write instruction in the same message.

## Root Cause

The Architect Interview runtime handoff combines two distinct workflow phases into one copied prompt:

```text
Phase A: conduct the conversational Project Architect Interview and obtain Operator confirmation.
Phase B: create the temporary body-only Markdown draft through MCP.
```

Because Phase B is present and fully executable in the initial handoff, the application does not enforce the durable prompt's confirmation rule. The confirmation rule is only instruction text, not an application state boundary.

## Objective

Introduce an application-enforced runtime finalization gate for Project Architect Interview.

Required outcome:

```text
Approved Project Intake exists
→ Approved Project Architect Interview Prompt exists, whether intake-created or regenerated
→ Operator starts/copies the Architect Interview chat handoff
→ copied handoff binds the correct MCP workspace and instructs ChatGPT to conduct the interview
→ copied handoff does not expose artifact_toolbox.create_markdown_artifact, temporary draft paths, or write-back JSON
→ ChatGPT must stop after presenting the completion summary and asking for Operator confirmation
→ Operator explicitly prepares/copies a separate Finalize Interview Draft handoff
→ only the finalization handoff exposes the temporary draft path and create_markdown_artifact JSON
→ ChampCity A/I promotes the created draft into the canonical Pending Project Architect Interview as before
```

## Non-Goal

This Work Card does not change Project Intake submission, durable Project Architect Interview Prompt body content, prompt regeneration metadata, MCP workspace ID derivation, repositoryAuthority propagation, compact draft ID hashing, Project Planning, Phase Map, Work Card loops, or Git behavior.

This Work Card must not solve the Project Planning first-handoff greyed-out issue. That is owned by WC49.

## Required Runtime Model

### 1. Start/Continue Interview Handoff

The initial Architect Interview runtime handoff must be an interview-execution handoff only.

It must include:

```text
- Bound MCP workspace block using the current project repository route.
- Current Approved Project Architect Interview Prompt path and revision.
- Current Approved Project Intake path and revision.
- Instruction to read the prompt and intake.
- Instruction to conduct the interview conversationally.
- Instruction to ask one primary question at a time.
- Instruction to present the final confirmation summary.
- Instruction to stop and wait for Operator confirmation before any draft creation.
```

It must not include:

```text
- artifact_toolbox.create_markdown_artifact
- create_markdown_artifact
- temporary draft path under planning/Architect_Drafts
- final canonical output path as a writable target
- JSON tool-call block for writing the Interview body
- instruction to create the draft in the same turn
```

The initial handoff may still mention the final canonical identity as informational context, but it must not provide a writable draft path or tool invocation.

### 2. Explicit Operator Finalization Action

Add a separate application state/action for finalizing the Project Architect Interview draft.

The exact UI label may be adjusted to fit the existing shell, but the Operator-visible meaning must be clear. Acceptable labels include:

```text
Finalize Interview Draft
Prepare Final Draft Handoff
Copy Final Draft Handoff
```

The finalization action must represent an explicit Operator assertion that the interview is complete and the confirmation summary has been approved or corrected.

The application does not need to parse the embedded ChatGPT transcript. The boundary is an explicit Operator action in ChampCity A/I.

### 3. Finalization Handoff

Only the finalization handoff may create/reuse the Architect draft submission and expose the write-back route.

The finalization handoff must include:

```text
- Bound MCP workspace block.
- Current Approved Project Architect Interview Prompt path and revision.
- Current Approved Project Intake path and revision.
- Temporary body-only draft path under planning/Architect_Drafts/...
- artifact_toolbox.create_markdown_artifact invocation with literal workspaceId.
- instruction to write only the complete body-only Interview Markdown.
- instruction not to supply canonical metadata or hidden authority fields.
```

The finalization handoff must preserve the existing promoted-output contract:

```text
ChatGPT writes temporary body-only draft
→ ChampCity A/I promotes it
→ final canonical target remains planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_<projectSlug>.md
→ final canonical document is Pending until Operator disposition
```

### 4. RevisionRequested Path

When a Project Architect Interview exists with `RevisionRequested`, the revised-interview workflow must use the same finalization gate.

Required revision behavior:

```text
RevisionRequested Interview exists
→ Start/Continue Interview Handoff includes current Operator revision notes and asks ChatGPT to address them conversationally
→ no write JSON is exposed in the initial revision handoff
→ Operator explicitly prepares/copies the finalization handoff after confirming the revised summary/body direction
→ finalization handoff writes the temporary draft only then
```

## Required Code Areas To Inspect And Adjust

The Implementer must inspect and, where necessary, modify the complete affected path:

```text
src/main/architectInterview/architectInterviewDraftPilot.ts
src/main/architectInterview/architectInterviewService.ts
src/main/architectInterview/architectInterviewContextResolver.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/architectOutputs/architectOutputRuntimeService.ts
src/main/architectOutputs/architectDraftPaths.ts
src/main/integrations/mcpWorkspacePromptContract.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
test/architect-interview/architect-interview-workspace.test.cjs
test/architect-outputs/architect-output-prompt-contracts.test.cjs
test/renderer/figma-redesign-shell.test.cjs
```

If the current generic Architect-output runtime service cannot represent separate start and finalization handoffs cleanly, add the smallest domain-specific extension needed for Architect Interview only. Do not broaden this into all Architect-output domains unless required to keep the code safe and coherent.

## Required Preservation

Preserve all of the following:

```text
- WC47 prompt regeneration behavior.
- Regenerated durable prompt and intake-created durable prompt share the same writer.
- Regeneration does not rewrite the Approved Project Intake.
- Existing prompt conflict protection remains intact.
- REPAIR16 compact draft IDs remain intact.
- REPAIR17 projectRepository-owned workspace route remains intact.
- Bound workspaceId examples remain valid, including ChampCity_PDL → champcity_pdl.
- artifact_toolbox.create_markdown_artifact still uses overwrite:false.
- ChampCity A/I remains owner of canonical metadata and promotion.
```

## Forbidden Changes

The Implementer must not:

```text
- Modify the durable Project Architect Interview Prompt body to solve the runtime handoff defect.
- Create a second durable prompt format for regenerated prompts.
- Reintroduce workspace inference, workspace search, or <PROJECT_REPO> fallback into copied handoffs.
- Reintroduce long source-path encoded draft IDs.
- Allow ChatGPT to write final canonical Interview paths directly.
- Allow the initial interview handoff to include create_markdown_artifact.
- Require Project Intake resubmission for this workflow.
- Add local hidden state as the authority for final canonical Interview content.
- Add external provider SDKs, network services, databases, or Git mutation.
```

## Acceptance Criteria

The implementation passes only if all criteria below are satisfied.

1. Project Intake submission and prompt regeneration still use the same durable Project Architect Interview Prompt writer.

2. Deleting the durable Project Architect Interview Prompt after Approved Project Intake still produces the WC47 recoverable missing-prompt state.

3. Regenerating the prompt still recreates the deterministic prompt path with Approved disposition, current Intake source revision, `projectRepository`, `repositoryAuthority.projectRepository`, `projectSlug`, and `architectOutputTargets.markdown`.

4. Preparing/copying the initial Architect Interview handoff after normal Project Intake submission does not include `artifact_toolbox.create_markdown_artifact`, `create_markdown_artifact`, `planning/Architect_Drafts`, or a temporary draft path.

5. Preparing/copying the initial Architect Interview handoff after WC47 prompt regeneration has the same no-write property.

6. The initial handoff includes a clear instruction to conduct the interview conversationally, present a confirmation summary, and stop for Operator confirmation before draft creation.

7. The finalization action is not the same action as the initial interview handoff. It must be separately visible or separately invoked by the Operator.

8. Only the finalization handoff includes the temporary draft path and `artifact_toolbox.create_markdown_artifact` JSON block.

9. The finalization handoff uses the literal computed MCP workspaceId for the selected project, including `champcity_pdl` for a `ChampCity_PDL` project.

10. The finalization handoff does not include `diagnostics_toolbox.list_workspaces`, workspace inference, workspace search, or `<resolved workspace ID>` placeholders.

11. The finalization handoff keeps compact deterministic draft IDs and remains below the existing path/ID length limits.

12. RevisionRequested Architect Interview flow uses the same two-step gate and includes Operator revision notes in the interview/chat phase without exposing the write JSON until finalization.

13. Existing tests for WC47 prompt regeneration continue to pass.

14. Renderer tests prove the initial Interview handoff and finalization handoff are distinguishable by labels, enabled state, and copied instruction content.

15. Existing Project Planning, Phase Map, Phase Interview, Phase Planning, Work Card, and validation workflows remain unaffected unless they have their own explicit Work Card.

## Required Tests

Add or update focused tests that prove at least these scenarios:

```text
Scenario A — intake-created prompt
Given an Approved Project Intake and intake-created Approved Project Architect Interview Prompt
When the Operator prepares/copies the initial Architect Interview handoff
Then the copied instruction contains no create_markdown_artifact and no temporary draft path
And it tells ChatGPT to conduct the interview and stop for Operator confirmation.

Scenario B — regenerated prompt
Given an Approved Project Intake and a regenerated Approved Project Architect Interview Prompt
When the Operator prepares/copies the initial Architect Interview handoff
Then the copied instruction is governed by the same no-write finalization gate.

Scenario C — finalization
Given the Operator invokes the separate finalization action
When the finalization handoff is copied
Then it contains the temporary draft path and literal artifact_toolbox.create_markdown_artifact JSON
And it uses the literal bound workspaceId.

Scenario D — revision
Given an existing RevisionRequested Project Architect Interview
When the initial revision handoff is copied
Then revision notes are present and no write JSON is present
And finalization is a separate handoff.
```

## Validation Commands

The Implementer must run the applicable validation lanes and report exact commands/results:

```text
npx tsc --noEmit
npx tsc
node --test --test-concurrency=1 test/architect-interview/architect-interview-workspace.test.cjs
node --test --test-concurrency=1 test/architect-outputs/architect-output-prompt-contracts.test.cjs
node --test --test-concurrency=1 test/renderer/figma-redesign-shell.test.cjs
node --test --test-concurrency=1
npx vite build
```

If sandbox execution hits known `EPERM` or `spawn EPERM` behavior, rerun in the normal Windows lane and report both attempts exactly.

## Manual Validation After Codex

After implementation and Architect review, the Operator must verify in the built app:

```text
1. Create or use a project with Approved Project Intake and Approved Project Architect Interview Prompt.
2. Prepare/copy the initial Architect Interview handoff.
3. Confirm the copied text does not contain create_markdown_artifact or a temporary draft path.
4. Send the handoff in embedded ChatGPT and confirm it asks interview questions instead of creating a draft.
5. After approving the interview summary, use the separate finalization action.
6. Confirm the finalization handoff contains the expected temporary draft path and create_markdown_artifact JSON.
7. Confirm the final draft can be written, promoted, and reviewed as Pending/Approved through the existing flow.
8. Repeat the same check after deleting and regenerating the durable prompt through WC47.
```

## Implementer Report Requirement

Create the Implementer Report at:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC48_architect_interview_runtime_finalization_gate.md
```

The report must include:

```text
- repository verification
- files changed
- implementation summary
- explicit confirmation that regenerated and intake-created prompts still share the same writer
- before/after handoff behavior
- test commands and results
- any deviations
- remaining Operator validation steps
```

## Remaining Passes For Phase

After WC48, execute WC49 separately unless the Operator explicitly authorizes a combined implementation pass.
