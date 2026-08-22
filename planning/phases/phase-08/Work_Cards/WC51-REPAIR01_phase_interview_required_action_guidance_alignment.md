<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC51-REPAIR01"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC51_phase_interview_conversational_finalization_gate.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC51_phase_interview_conversational_finalization_gate.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC51_phase_interview_conversational_finalization_gate.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Phase Interview Required-Action Guidance Alignment",
    "status": "approved_for_implementation",
    "executionMode": "narrow repair",
    "parentWorkCardId": "WC51",
    "confirmedDefect": "WC51 correctly introduced a two-stage Phase Interview conversation/finalization boundary, but Phase Interview required-action guidance still describes the pre-WC51 single-stage workflow and tells the Operator to wait for an MCP-written output immediately after sending the conversation-only handoff.",
    "returnTarget": "architect-review-WC51",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC51-REPAIR01_phase_interview_required_action_guidance_alignment.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Narrow repair only: align Phase Interview required-action text with the WC51 two-stage runtime. No workflow redesign or browser-action changes.",
    "reviewedAt": "2026-08-17"
  }
}
CHAMPCITY-METADATA -->

# WC51-REPAIR01 — Phase Interview Required-Action Guidance Alignment

Status: Approved for Implementer execution  
Parent: `WC51`  
Repair type: narrow guidance/state-text correction  
Git mutation: prohibited

## Confirmed Defect

WC51 correctly changed Phase Interview to:

```text
conversation-only handoff
→ Operator confirms/corrects phase summary
→ explicit Final Draft handoff
→ MCP draft creation and canonical promotion
```

However, `src/main/phaseInterview/phaseInterviewService.ts` still contains pre-WC51 required-action guidance.

Current `waiting-for-output` text says:

```text
Paste and send the copied Phase Interview instruction in embedded ChatGPT, then wait for the MCP-written output.
```

That is now incorrect because the initial Phase Interview handoff intentionally contains no draft path or write instruction. An MCP-written draft cannot occur until the Operator explicitly prepares and sends the Final Draft handoff.

The `revision-requested` guidance should also describe the same two-stage sequence rather than implying that sending the revised conversational handoff alone completes the revision.

## Objective

Align Phase Interview required-action guidance with the WC51 runtime already implemented.

Do not change the runtime architecture.

## Required Changes

1. Update `waiting-for-output` guidance so it tells the Operator to:
   - send the Phase Interview conversational handoff;
   - complete the interview or zero-question confirmation path;
   - confirm or correct the phase-understanding summary;
   - then use the explicit Final Draft action.

2. Update `revision-requested` guidance so it clearly follows:

```text
send revised conversational handoff
→ resolve revision direction
→ confirm/correct summary
→ prepare/copy Final Draft handoff
→ write revised Phase_Interview
```

3. Add focused regression assertions covering both required-action strings/state behavior.

## Preserved Behavior

Do not change:

- WC51 conversation-only Phase Interview handoff;
- Final Draft prepare/copy actions;
- browser/action pane layout or labels;
- Phase Interview prompt wording beyond required-action guidance;
- draft submission or canonical promotion;
- no-questions behavior;
- revision-note propagation;
- freshness, disposition, phase selection, or Phase Intake completion semantics;
- Project Architect Interview behavior.

## Authorized Surface

Expected changes are limited to:

```text
src/main/phaseInterview/phaseInterviewService.ts
focused Phase Interview tests
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC51-REPAIR01_phase_interview_required_action_guidance_alignment.md
```

Do not modify other production files unless a compile/test dependency makes a minimal change strictly necessary and the Implementer Report explains why.

## Acceptance Criteria

1. `waiting-for-output` no longer tells the Operator to wait for MCP output after only the conversational handoff.
2. `waiting-for-output` explicitly directs the Operator through summary confirmation and then the Final Draft action.
3. `revision-requested` explicitly preserves the same conversation → confirmation → Final Draft sequence.
4. No WC51 runtime, UI, MCP, draft-promotion, or prompt-contract behavior changes.
5. Focused regression tests cover the corrected guidance.
6. `npm run typecheck`, `npm run build`, and `npm test` pass.

## Negative Constraints

- No browser/action pane changes.
- No new IPC or preload APIs.
- No Phase Interview prompt redesign.
- No additional Phase Interview sections.
- No Architect-output refactor.
- No unrelated cleanup or repairs.
- No Git mutation.

Keep the implementation and report concise.

## Return Target

Return to Architect review of WC51 after this repair. WC51 remains unresolved until this narrow defect is verified.

## Implementer Report Requirements

Report only:

- files changed;
- exact required-action guidance corrected;
- focused regression evidence;
- typecheck/build/test results;
- any remaining Operator validation.

End with `Document.Status=Pending`.

## Manual Validation

In the Phase Interview workspace, confirm the visible/current required action no longer suggests that MCP output will appear after the first conversational handoff and instead directs the Operator to the Final Draft step after summary confirmation.
