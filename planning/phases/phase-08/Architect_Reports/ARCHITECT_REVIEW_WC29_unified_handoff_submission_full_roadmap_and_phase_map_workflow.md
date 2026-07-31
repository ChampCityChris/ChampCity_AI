<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC29"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC29_unified_handoff_submission_full_roadmap_and_phase_map_workflow.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC29_unified_handoff_submission_full_roadmap_and_phase_map_workflow.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review - WC29 Unified Handoff Submission, Full Roadmap, and Phase Map Workflow",
    "disposition": "RepairRequired",
    "repairWorkCardId": "WC29-REPAIR01",
    "relatedMcpWorkCardId": "WC-V1-0202E",
    "operatorValidationAuthorized": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "The application-side prompts and UI migration are incomplete because the generated Project Planning and Phase Map handoffs do not match the current MCP contracts, Phase Map handoff regeneration and idempotency are defective, and Phase Map output detection is not automatic.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC29 Unified Handoff Submission, Full Roadmap, and Phase Map Workflow

## Disposition

`RepairRequired`.

WC29 is not ready for Operator validation. The independent normal Windows validation lane is green, but the implemented application contracts cannot complete the required live MCP workflow.

## Accepted Implementation

The following portions are accepted:

- active Architect Interview, Project Planning, and Phase Map prompt text names `artifact_toolbox.submit_handoff_outputs`;
- retired save-action names are absent from active production prompt generation;
- Phase Map manual output import is removed from renderer, preload, main IPC, and shared API contracts;
- Phase Map disposition controls remain present after a readable output exists;
- the hard-coded default Phase Map entry is removed from application handoff generation;
- Project Roadmap prompt language now requires a complete lifecycle rather than MVP-only planning;
- no generic Markdown writer or local copy/paste persistence fallback was added;
- typecheck, build, and the complete application test suite pass independently.

## Blocking Finding 1 — Project Planning Handoff Is Rejected by the MCP

ChampCity A/I now emits this exact required Roadmap section list:

```text
Baseline Summary
Work-State Classification
MVP Scope
Sequenced Roadmap
Post-MVP Roadmap
Deferred and Conditional Work
Dependencies and Constraints
```

The current ChampCity_GPT `project-planning` contract still requires exactly:

```text
Baseline Summary
Work-State Classification
Sequenced Roadmap
Dependencies and Constraints
```

The MCP compares the handoff array for exact equality and rejects any other section list. Therefore a WC29-generated Project Planning handoff cannot be submitted through `artifact_toolbox.submit_handoff_outputs`.

This is not an Operator-validation uncertainty. It is a deterministic cross-repository contract mismatch.

## Blocking Finding 2 — Phase Map Handoff Is Rejected by the MCP

ChampCity A/I writes Phase Map handoff workflow data with fields including:

```text
outputTarget
requiredHeading
domainBlock
domainBlockRules
projectProfilePath
projectProfileRevision
projectRoadmapPath
projectRoadmapRevision
projectIdentity
```

The current MCP permits only:

```text
handoffKind
contractId
phaseMapTarget
requiredTitle
requiredDomainBlocks
```

The MCP rejects unknown fields before persistence. The shared concepts also use different field names:

```text
A/I outputTarget          != MCP phaseMapTarget
A/I requiredHeading       != MCP requiredTitle
A/I domainBlock           != MCP requiredDomainBlocks
```

The generated Phase Map handoff therefore cannot authorize a Phase Map save.

## Blocking Finding 3 — Phase Map Domain-Block Shape Disagrees

ChampCity A/I instructs the Architect that the fenced JSON block is a top-level array of phase entries and its fallback reader treats the parsed JSON as that array.

The MCP contract requires an object containing a `phases` array:

```json
{
  "phases": []
}
```

A body following the application instruction is rejected by the MCP. A body following the MCP contract is rejected by the application fallback reader when metadata phases are absent.

The application must use the same body contract as the MCP and must not add a compatibility parser for a second shape.

## Blocking Finding 4 — Phase Map Handoff Preparation Is Not Idempotent

`handoffMatchesCurrentEvidence()` builds an existing metadata object without `artifactRevision` and compares it to `expectedMetadata`, which still contains `artifactRevision`.

Those values cannot be equal. An unchanged Phase Map handoff preparation therefore rewrites the handoff and increments its revision instead of returning `alreadyPrepared`.

No focused test proves byte-idempotent Phase Map handoff preparation.

## Blocking Finding 5 — Revised Roadmap Can Leave Phase Map in a Dead End

The Phase Map action bar allows preparation only when no handoff and no output document exists.

After the Project Roadmap is revised:

1. the existing Phase Map handoff becomes stale;
2. the handoff remains present in the document inventory;
3. the Prepare button remains hidden;
4. Copy remains visible;
5. the copy service rejects the stale handoff.

The Operator has no valid UI action to create the new handoff required by WC29.

Preparation eligibility must be based on a current fresh handoff, not mere file existence.

## Blocking Finding 6 — Open Phase Map Workspace Does Not Detect MCP Output Automatically

Architect Interview and Project Planning have three-second polling loops. Phase Map has no corresponding polling loop.

After embedded ChatGPT writes the Phase Map through MCP, the open Phase Map workspace does not automatically refresh, detect, select, or preview the Pending output. The Operator must manually press Refresh, contrary to the required WC29 flow.

## Blocking Finding 7 — Compatibility Consumer Fallback Was Added

`readPhaseMap()` accepts `workflowData.phases`, but when that field is absent it reparses the fenced body block.

The approved MCP implementation now persists the authoritative normalized phase array in `workflowData.phases`. Retaining a second body-only authority path permits incomplete or manually produced metadata to advance and recreates fallback behavior. The application must require the canonical MCP metadata contract and reject missing `workflowData.phases`.

## Implementer Report Accuracy

The report correctly marked the normal build/test lane and Revisionary live validation as unproven. Independent review completed the build/test lane successfully.

However, the report stated there were no app-side blocking questions and treated the Phase Map handoff and current Approved Roadmap references as sufficiently proven. That omitted the cross-repository contract mismatch that makes the workflow non-executable.

## Independent Validation

```text
npm run typecheck: passed
npm run build: passed
npm test: 139/139 passed
HEAD before/after: a94e0720afb110ed7a0fc748b14cc9799d923099
```

Passing application-local tests do not prove compatibility with the separately implemented MCP contract. The current tests duplicate application assumptions instead of testing the shared cross-repository contract.

## Required Correction Structure

Two explicit implementation cards are required:

- `WC29-REPAIR01` — ChampCity A/I contract alignment, Phase Map idempotency, re-preparation, strict consumer authority, and output polling.
- `WC-V1-0202E` — ChampCity_GPT Project Planning full-lifecycle contract revision.

These are explicit paired changes, not hidden gates or fallback paths. The Operator controls implementation and packaging order.

## Operator Validation Decision

Do not begin Revisionary Operator validation until both corrections pass deterministic review and the packaged MCP runtime exposes the revised contract.

No Git operation was performed by this review.
