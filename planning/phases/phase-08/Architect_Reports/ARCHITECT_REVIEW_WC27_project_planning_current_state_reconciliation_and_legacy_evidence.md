<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC27"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC27_project_planning_current_state_reconciliation_and_legacy_evidence.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC27_project_planning_current_state_reconciliation_and_legacy_evidence.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC27 Project Planning Current-State Reconciliation and Legacy Evidence",
    "reviewResult": "RepairRequired",
    "repairWorkCardId": "WC27-REPAIR01"
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "Deterministic implementation is substantially correct, but the live Revisionary path is blocked by a pre-WC27 handoff that the application treats as current although the MCP action rejects it. Repository preflight is also recomputed during ordinary model polling, contrary to the approved no-hidden-inventory-invalidation rule.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC27 Project Planning Current-State Reconciliation and Legacy Evidence

Disposition: `RepairRequired`  
Repair: `WC27-REPAIR01`  
Git mutation: none

## Accepted Implementation

The following WC27 behavior is accepted:

- repository classification separates source/config evidence, legacy planning, malformed planning, and exact output-target collisions;
- greenfield, reconciliation-required, and needs-attention states are represented;
- legacy planning files are preserved unchanged;
- the generated WC27 handoff contains the approved submission-contract fields and required document headings;
- the copied Architect instruction calls `artifact_toolbox.save_project_planning_outputs` with only the two Markdown bodies;
- the local Project Planning manual-output save IPC/preload/API path is removed;
- source-revision freshness, synchronized bundle review, and WC26 workspace detection remain present;
- typecheck, build, and all 126 tests pass independently.

Independent validation:

```text
npm run typecheck → passed
npm run build     → passed
npm test          → 126/126 passed
```

## Blocking Defect 1 — Existing Pre-WC27 Handoff Cannot Be Upgraded

The configured `revisionary` workspace contains an Approved Project Planning handoff at:

```text
planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_revisionary.md
```

It has `handoffKind=project-planning` but lacks the WC27 submission contract fields, including `contractId`, reconciliation mode, evidence paths, and required section lists.

WC27 currently treats that pre-contract handoff as current. The workspace becomes `waiting-for-output`, disables Prepare, and permits Copy. The MCP action correctly rejects it because no current Approved contract handoff exists.

A live non-writing call against Revisionary returned:

```text
INVALID_INPUT
Expected exactly one current Approved Project Planning handoff.
count: 0
```

Required correction:

- validate the complete WC27 contract when deciding whether a handoff is current;
- treat a readable Approved pre-contract handoff at the exact target as previous handoff evidence;
- present `Ready`, `canPrepareHandoff=true`, and `canCopyHandoff=false`;
- Prepare replaces the same target with artifact revision 2 containing the approved contract;
- repeated Prepare remains byte-idempotent;
- malformed, unmanaged, wrong-type, wrong-role, or unsafe content remains `Needs Attention` and is not overwritten.

## Blocking Defect 2 — Repository Inventory Becomes Hidden Runtime Authority

WC27 states that a changed general repository inventory must not create hidden workflow invalidation. The current implementation runs `preflightProjectPlanningRepository()` during every workspace-model read, and the open workspace reads the model every three seconds.

This can silently change reconciliation state after an Approved handoff already exists, make the UI disagree with the handoff used by the MCP action, and repeatedly perform a synchronous recursive repository traversal. The traversal also has no entry or returned-evidence cap.

Required correction:

- before a current contract handoff exists, derive preflight from the filesystem;
- after a current contract handoff exists, use its reconciliation projection for ordinary refresh and output review;
- do not reclassify general repository inventory during polling;
- upstream Intake, Prompt, or Interview revision still invalidates the handoff and starts a new explicit preflight/preparation cycle;
- bound the explicit preflight traversal and fail visibly when its limit is exceeded.

## Report Correction

`artifact_toolbox.current_action_context` is not a prerequisite for `save_project_planning_outputs`. The report misidentified the live blocker. The actual blocker is the pre-contract Revisionary handoff.

## Disposition

WC27 is not ready for Operator live validation. Correct only these two defects through WC27-REPAIR01, rerun deterministic validation, and then execute the real Revisionary MCP write-back flow.
