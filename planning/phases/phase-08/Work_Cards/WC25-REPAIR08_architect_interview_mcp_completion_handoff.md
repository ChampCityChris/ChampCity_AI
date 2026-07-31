<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "repair-work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR08",
    "parentWorkCardId": "WC25"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Validation_Records/VALIDATION_RECORD_WC25-REPAIR07_ATTEMPT01.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Interview MCP Completion Handoff",
    "executionMode": "one continuous bounded task",
    "recommendedReasoning": "medium",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR08_architect_interview_mcp_completion_handoff.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Replace the dead-end manual-output instructions with the live-validated artifact_toolbox.save_architect_interview_output completion path.",
    "reviewedAt": "2026-07-28"
  }
}
CHAMPCITY-METADATA -->

# WC25-REPAIR08 — Architect Interview MCP Completion Handoff

Repository: ChampCity_AI only  
Execution: one continuous bounded task using medium reasoning  
Git mutation: prohibited

## Evidence

Operator observation: after the embedded Architect Interview questions were completed, the model returned only a Markdown snippet and had no valid completion path. The workspace provided no usable output-import control.

Live MCP proof on 2026-07-28:

```text
artifact_toolbox.save_architect_interview_output
workspaceId: revisionary
first call  → saved, revision 1, Pending
same call   → already_saved, revision 1
```

The created document was readable canonical Markdown at:

`planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_revisionary.md`

## Objective

Make the embedded Architect complete the interview by saving the full Interview through ChampCity MCP. The Operator must not copy or paste the completed Interview output.

## Exact Changes

### 1. Generated Interview Prompt

File: `src/main/projectIntake/projectIntakeService.ts`

Replace the completion instructions produced by `architectPromptBody()`.

The prompt must require the Architect to:

1. conduct the interview conversationally until material scope, constraints, risks, decisions, unresolved questions, and planning direction are resolved;
2. synthesize one complete substantive Project Architect Interview Markdown document, not a snippet;
3. resolve the configured workspace ID through `diagnostics_toolbox.list_workspaces` when it is not already known;
4. call `artifact_toolbox` with:

```json
{
  "action": "save_architect_interview_output",
  "workspaceId": "<resolved workspace ID>",
  "params": {
    "markdownBody": "<complete substantive Interview Markdown>"
  }
}
```

5. report completion only after the tool returns `saved` or `already_saved`;
6. report the exact tool failure and remain incomplete if the action is unavailable or denied.

Remove all instructions telling the Operator to paste completed Interview Markdown into an import surface.

### 2. Runtime Architect Handoff

File: `src/main/architectInterview/architectInterviewService.ts`

Update `buildArchitectHandoffInstruction()` to enforce the same MCP completion path for both initial Interview and revision/correction mode.

Required rules:

- chat text is not the durable record;
- do not create placeholder output;
- do not return a snippet as completion;
- do not ask the Operator to copy or paste completed output;
- do not supply target path, metadata, identity, revisions, role, or disposition to the save action;
- call `artifact_toolbox.save_architect_interview_output` with substantive Markdown only;
- after success, respond with a concise saved-and-ready-for-review confirmation;
- after failure, provide the exact failure and remain incomplete.

Correction mode must preserve and revise the complete existing Interview body, then call the same save action. Remove the instruction to return corrected Markdown through an import surface.

### 3. External Save Detection

The existing repository polling/refresh path should detect the MCP-created Interview and change Architect Interview from `Waiting for Output` to `Awaiting Approval`.

Do not alter polling preemptively. During actual Electron validation, if the verified MCP save is not detected without leaving the workspace, correct only the smallest refresh defect in `src/renderer/app/App.tsx` within this same Work Card. Do not create another repair.

## Non-Scope

Do not:

- change ChampCity_GPT or the MCP action;
- add or restore a manual Architect Output import surface;
- change canonical document serialization;
- change Intake, Interview, or disposition authority;
- redesign the embedded browser;
- modify other lifecycle prompts;
- perform Git operations.

## Required Evidence Checklist

Record each item as `Proven` or `NotProven`:

1. Generated Project Architect Interview Prompt names the exact toolbox action and invocation shape.
2. Runtime handoff names the same action for initial and revision flows.
3. No completion instruction tells the Operator to paste Interview output.
4. Prompt requires a complete Interview document and rejects snippet completion.
5. Prompt requires tool-confirmed `saved` or `already_saved` before completion.
6. Tool failure leaves the Interview incomplete with the exact failure reported.
7. In the actual embedded browser, the Architect completes an interview and calls the toolbox action.
8. The Pending Interview appears visibly in the workspace without Operator output copy/paste.
9. Interview disposition controls become usable.

Any `NotProven` item means implementation remains in this Work Card. Do not create REPAIR09.

## Validation

Use actual Electron controls with a controlled project that has an Approved Intake and Prompt but no Interview output:

```text
open Architect Interview
→ send handoff in embedded chat
→ complete interview questions
→ observe Architect call artifact_toolbox.save_architect_interview_output
→ observe saved confirmation
→ observe Pending Interview appear in ChampCity A/I
→ visibly read the Interview
→ confirm disposition controls are usable
```

Source inspection, mocked tool calls, remote-debugging APIs, and unit tests do not replace this walkthrough.

After the product path passes, run once:

- `npm run typecheck`
- `npm run build`
- `npm test`

Tests are supporting diagnostics only.

## Completion

Write the Implementer Report only after all nine evidence items are Proven.

No Git operation. No manual-output fallback. No REPAIR09.
