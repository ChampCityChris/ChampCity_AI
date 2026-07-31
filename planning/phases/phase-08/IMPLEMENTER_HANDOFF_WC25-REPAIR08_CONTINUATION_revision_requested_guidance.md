<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "implementer-handoff",
  "artifactRevision": 1,
  "participationRole": "nonReviewHandoff",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR08",
    "handoffType": "continuation"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC25-REPAIR08_architect_interview_mcp_completion_handoff.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Revision Requested Continuation Guidance",
    "executionMode": "continue existing active repair",
    "recommendedReasoning": "medium",
    "gitMutationAuthorized": false,
    "newRepairAuthorized": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Continue WC25-REPAIR08. Do not create REPAIR09.",
    "reviewedAt": "2026-07-28"
  }
}
CHAMPCITY-METADATA -->

# Implementer Continuation — WC25-REPAIR08

Repository: `C:\Users\chapm\Projects\ChampCity_AI`  
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Execution: continue the existing active REPAIR08 implementation  
Git mutation: prohibited

## Current State

Preserve the existing REPAIR08 changes in:

- `src/main/projectIntake/projectIntakeService.ts`
- `src/main/architectInterview/architectInterviewService.ts`
- `src/renderer/app/App.tsx`
- the three focused test files already modified

Do not revert or replace the MCP-only completion path.

Current source validation has passed. The remaining product defect was observed after the Operator applied `RevisionRequested` to the Revisionary Architect Interview.

Observed UI result:

```text
Architect Interview disposition applied: RevisionRequested.
```

No visible next-step direction followed. The application model already computed the correct continuation, but the Architect Interview workspace did not display it.

## Objective

After `RevisionRequested` is applied, make the next required action explicit and immediately usable:

```text
Request Revision
→ visible next-step guidance
→ Copy Revised Handoff
→ send in embedded ChatGPT
→ Architect revises complete Interview
→ Architect saves through MCP
→ revised Interview returns as Pending
→ review controls are usable again
```

## Exact Changes

### 1. Show the required action

File: `src/renderer/app/App.tsx`

Render `architectInterviewModel.requiredAction` visibly in the Architect Interview action bar or an adjacent persistent status region.

Requirements:

- visible without scrolling through the Interview body;
- shown for waiting, revision-requested, and correction states;
- must not be replaced by the generic disposition-applied toast;
- must update when the Architect Interview model changes.

### 2. Revision-specific primary control

When `architectInterviewModel.state === "revision-requested"`:

- label the handoff control `Copy Revised Handoff`;
- retain `Copy Architect Handoff` for the initial waiting-for-output state;
- use the same existing `copyArchitectHandoff()` action and application-owned handoff text;
- do not create a second clipboard or handoff implementation.

### 3. Explicit post-disposition guidance

After a successful `RevisionRequested` review, replace the generic feedback with explicit guidance equivalent to:

```text
Revision requested. Copy the revised handoff and send it in the embedded ChatGPT pane. The handoff includes your revision instructions. The revised Interview will return here as Pending after the Architect saves it through MCP.
```

After the revised handoff is copied, show feedback equivalent to:

```text
Revised handoff copied. Paste and send it in embedded ChatGPT.
```

Do not imply that copying the handoff completed the revision.

### 4. Preserve review context

After `RevisionRequested` is applied:

- keep the Interview selected;
- keep the Interview body readable;
- keep the Architect Interview workspace active;
- preserve the saved revision instructions in the model and revised handoff;
- do not navigate to another lifecycle workspace.

### 5. Complete the same repair

Do not create another repair or stop after static checks.

The same REPAIR08 remains active until the revision loop is proven in the running Electron product.

## Non-Scope

Do not:

- modify ChampCity_GPT or the MCP action;
- alter canonical Markdown serialization;
- restore a manual Architect Output import surface;
- add a second handoff mechanism;
- change disposition authority;
- redesign the embedded browser;
- modify unrelated lifecycle workspaces;
- stage, commit, push, reset, clean, stash, merge, tag, or package.

## Required Evidence

Record each item as `Proven` or `NotProven`:

1. `architectInterviewModel.requiredAction` is visibly rendered in the Architect Interview workspace.
2. Initial waiting state shows `Copy Architect Handoff`.
3. Revision-requested state shows `Copy Revised Handoff`.
4. Applying `RevisionRequested` displays explicit next-step guidance.
5. Copying the revised handoff displays explicit send guidance.
6. Interview selection and readable body remain in place after requesting revision.
7. Revised handoff includes the Operator revision instructions.
8. In embedded ChatGPT, the Architect receives the revised handoff and revises the complete Interview.
9. The Architect calls `artifact_toolbox.save_architect_interview_output`.
10. The revised Interview appears as a new Pending revision without Operator output copy/paste.
11. Review controls become usable again.

Any `NotProven` item means REPAIR08 remains active. Do not create REPAIR09 and do not create the Implementer Report.

## Validation

Use the running Electron product:

```text
open Revisionary Architect Interview
→ select Request Revision
→ enter substantive revision instructions
→ Apply Interview Review
→ confirm explicit next-step guidance
→ confirm Copy Revised Handoff control
→ copy revised handoff
→ confirm explicit send guidance
→ send handoff in embedded ChatGPT
→ observe complete revision
→ observe artifact_toolbox.save_architect_interview_output
→ observe revised Interview return as Pending
→ confirm disposition controls usable
```

Source inspection, mocked calls, and unit tests do not replace this walkthrough.

After the product path passes, run once in the approved normal Windows lane:

- `npm run typecheck`
- `npm run build`
- `npm test`

## Completion

Create the existing REPAIR08 Implementer Report only after all original REPAIR08 evidence and all continuation evidence above are `Proven`.

No Git operation. No fallback. No REPAIR09.
