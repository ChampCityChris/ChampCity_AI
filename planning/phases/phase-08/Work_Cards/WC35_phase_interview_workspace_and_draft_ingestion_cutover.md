<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC35"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC34_phase_map_single_output_draft_ingestion_cutover.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC34-REPAIR01_phase_map_polling_and_operator_review_presentation.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Phase Interview Workspace and Draft-Ingestion Cutover",
    "status": "approved_for_implementation",
    "executionMode": "one bounded production cutover",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC35_phase_interview_workspace_and_draft_ingestion_cutover.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Cut over only the selected phase interview workflow to the validated temporary-draft path and replace the generic manual-import surface with a phase-specific embedded Architect workspace.",
    "reviewedAt": "2026-07-31"
  }
}
CHAMPCITY-METADATA -->

# WC35 — Phase Interview Workspace and Draft-Ingestion Cutover

Status: Approved for Implementer execution  
Git mutation: prohibited

## Verified Defect

The current Phase Intake step is implemented as a generic lifecycle workspace with a manual Architect Output textarea and direct `savePhaseInterviewOutput()` persistence. It does not present the selected phase context or provide the embedded Architect interview workflow used by the validated project-level cutovers.

## Objective

```text
Approved Phase Map selects the first incomplete phase
→ application presents that phase and its evidence
→ Operator prepares/copies one Phase Interview handoff
→ embedded Architect conducts a bounded phase interview
→ ChatGPT creates one body-only temporary draft through create_markdown_artifact
→ application validates and promotes one Pending canonical Phase_Interview.md
→ Operator reviews and approves it
→ Phase Planning becomes ready
```

The Phase Interview resolves phase scope, non-scope, inherited constraints, dependencies, unknowns, risks, assumptions, acceptance direction, and planning inputs. It must not pre-author Work Cards or replace Phase Planning.

## Required Changes

### 1. Phase-specific dual-pane workspace

Replace the generic Phase Intake surface with a dedicated embedded Architect workspace comparable to Architect Interview:

- selected phase ID, title, order, purpose, dependencies, and source references;
- current Profile, Roadmap, Phase Map, and applicable dependency closeouts as evidence;
- Prepare/Copy Phase Interview Handoff;
- embedded ChatGPT pane;
- automatic polling, output selection, visible failure state, and review controls;
- no manual Architect Output textarea or direct-save control.

Do not redesign the global rails or left navigation in this card.

### 2. One WC30 single-output definition

Add exactly one production definition:

```text
outputKind: phase-interview
owningWorkspaceId: phase-interview
bundleMode: single-output
slot: phase-interview.md
```

Use the current Approved Phase Interview handoff as authority for phase identity, final path, and source revisions. Use the shared deterministic submission identity and process-owned explicit request ordinal.

### 3. Exact Phase Interview handoff method

The generated instruction must require the Architect to:

- read the approved Profile, Roadmap, Phase Map, selected phase entry, dependency closeouts, and current handoff;
- ask one primary question at a time in plain language;
- avoid asking for information already resolved by project evidence;
- make Architect-owned technical recommendations rather than transferring design work to the Operator;
- provide a recommended answer first when a material choice exists;
- allow `use your recommendation` and `unsure`;
- aim for approximately 5–10 substantive questions as a soft range;
- summarize decisions and remaining issues before final output;
- confirm the final phase understanding before creating the document unless the Operator directs immediate completion.

The final Phase Interview body must cover:

```text
Phase Understanding
Phase Objective
Scope
Non-Scope
Inherited Constraints
Dependencies and Prior-Phase Evidence
Material Decisions
Architect Recommendations
Risks and Unknowns
Assumptions
Acceptance Direction
Inputs Required for Phase Planning
Deferred Items
Unresolved Questions
```

The handoff must contain one exact generic call:

```json
{
  "action": "create_markdown_artifact",
  "workspaceId": "<resolved workspace ID>",
  "params": {
    "relativePath": "<exact temporary Phase Interview draft path>",
    "content": "<complete body-only Phase Interview Markdown>",
    "overwrite": false
  }
}
```

No active domain save action, direct final path write, fallback, manual import, or file-copy route may remain.

### 4. Creation, revision, and retry

- No existing output: promote as revision 1, `artifactType=phase-interview`, `participationRole=gatingReview`, current phase identity and source revisions, Pending disposition.
- Existing eligible output: allow same-path substantive revision only when the current Phase Interview is readable, fresh, identity-matching, and `RevisionRequested`; increment once and reset to Pending with cleared notes and `reviewedAt`.
- Ineligible target: preserve final bytes, retain draft, and surface Needs Attention.
- Polling must invoke the promotion-capable status path before evidence fingerprint comparison.
- Polling must not create submissions.
- Explicit retry must create one new absent draft path and preserve the failed draft.

### 5. Remove only the retired Phase Interview path

Remove active use of:

```text
savePhaseInterviewOutput()
manual Phase Interview Markdown textarea
manual Save Architect Output control
any direct final-body write route for Phase Interview
```

Preserve Phase Map selection, dependency closeout evidence, Phase Interview review disposition, Phase Intake completion, and Phase Planning readiness.

## Authorized Surface

```text
src/main/phaseInterview/phaseInterviewService.ts
one adjacent Phase Interview draft orchestration/definition module
src/main/currentWorkflow/currentWorkflowService.ts only for phase-specific status/polling exposure
src/shared/workspaceContracts.ts only for Phase Interview model/status fields
src/renderer/app/App.tsx
one or more adjacent Phase Interview renderer modules
src/renderer/styles.css
focused Phase Interview, renderer production-path, and runtime-wiring tests
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC35_phase_interview_workspace_and_draft_ingestion_cutover.md
```

Do not alter WC30 algorithms, Phase Map authority, Phase Planning content, Project Planning, Architect Interview, MCP implementation, or global dashboard structure.

## Required Proof

1. Exactly four production Architect output definitions exist: Architect Interview, Project Planning, Phase Map, and Phase Interview.
2. Phase Interview uses one WC30 single-output temporary draft.
3. The handoff contains one executable action/workspace/params call with `overwrite:false`.
4. The handoff follows the approved interview method and final document structure.
5. The selected phase and required evidence are visible in the workspace.
6. The generic manual textarea and direct-save Phase Interview route are absent.
7. A valid draft promotes automatically without manual refresh.
8. A malformed draft creates no final output, remains visible, and surfaces failure.
9. An eligible `RevisionRequested` Phase Interview revises once and resets to Pending.
10. Ineligible existing targets remain byte-identical.
11. Explicit retry uses a fresh path and preserves the failed draft.
12. Approval completes Phase Intake and makes Phase Planning ready.
13. Existing Project Intake, Project Planning, Phase Map, and later lifecycle behavior remain unchanged.
14. Typecheck, build, and complete tests pass in the normal Windows lane.
15. Operator running-product validation remains pending.

## Non-Scope

Do not create Work Cards, define the Phase Planning bundle, add persistent interview state, add question counters, redesign global navigation, add a context dashboard, migrate documents, add dependencies, or perform Git operations.

## Completion

Create the Implementer Report only after proof items 1–14 pass. Do not claim Operator running-product validation.
