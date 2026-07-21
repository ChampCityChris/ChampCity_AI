# Work Card — Phase 08 WC14 Phase Validation and Close Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium
Execution authorization: withheld until the Phase 08 Work Card sequence is released
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC14_phase_validation_and_close_workspace.md`

## Purpose

Implement the Phase / Validation document-review workspace and the Phase / Close completion behavior.

The workspace must collect and organize the selected phase's durable document population, allow the Operator to create or revise the `Phase_Closeout`, and disposition that closeout document.

An Approved `Phase_Closeout` with a `Close` decision completes both the Phase Validation decision and the Phase Close stage. No second approval or separate closeout-approval artifact is permitted.

## Execution Boundary

This Work Card is approved as the fourteenth planned Phase 08 implementation unit, but it is not authorized for execution.

Do not execute WC14 until WC13 is accepted and the Operator explicitly releases WC14.

## Source Design

Read and follow:

- `planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`
- `planning/project/Design_Documents/WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/PHASE_AND_PROJECT_VALIDATION_CLOSE_WORKSPACE_DEFINITION.md`

The lifecycle locations are:

```text
Phase / Validation
└── Phase Validation Workspace

Phase / Close
└── completion derived from Approved Phase_Closeout
```

## Entry Requirements

The Phase Validation workspace may begin only when repository evidence shows:

1. the selected phase has an Approved `Phase_Interview`;
2. `Phase_Planning` and `Work_Card_Plan` are both Approved;
3. every required Formal Work Card candidate has an Approved `Validation_Record`; and
4. every other candidate is explicitly recorded as deferred, superseded, already satisfied, carried forward, or otherwise resolved.

Do not use a hidden active-phase or completion flag to satisfy these requirements.

## Required Workspace Experience

Implement a registry-backed Phase / Validation workspace with:

```text
Phase document population browser | Phase_Closeout preview and disposition
```

The workspace must:

1. derive the selected phase from the approved Phase Map and document evidence;
2. assemble a deterministic, grouped review index of the phase population;
3. display document identity, type, disposition, and readable content;
4. permit navigation among the source documents without leaving the workspace;
5. identify missing, unreadable, invalid, or disposition-inconsistent records locally;
6. allow the Operator to create or revise the phase closeout fields;
7. save the paired `Phase_Closeout` document through main/preload IPC;
8. preview the current repository-backed closeout document;
9. support `Approved`, `Rejected`, and `RevisionRequested` dispositions;
10. refresh after revision without losing the population review context.

An embedded Architect browser is not required as the primary surface. Existing MCP support may be used to assist drafting, but browser chat state must not become closure authority.

## Phase Review Population

The population browser must include and organize, when present:

```text
Phase foundation
├── Phase_Interview
├── Phase_Planning
└── Work_Card_Plan

Work Card records
├── Formal Work Cards
├── Implementer Reports
├── Architect report dispositions
├── Repair Work Cards and repair reports
└── Validation Records

Resolution and context
├── Deferred, superseded, already-satisfied, or carried-forward candidates
├── Phase observations
├── Applicable project observations
├── Risks and decisions
└── Relevant validation evidence
```

The index references the existing durable documents. It must not copy the complete phase corpus into a new authority artifact.

## Phase Closeout Artifact Contract

Create or update the canonical pair under:

```text
planning/phases/<phase-id>/Phase_Closeouts/PHASE_<phase-number>_CLOSEOUT_<slug>.md
planning/phases/<phase-id>/Phase_Closeouts/PHASE_<phase-number>_CLOSEOUT_<slug>.json
```

The closeout must contain at least:

- phase ID, title, and intended outcome;
- closure decision: `Close` or `DoNotClose`;
- Operator closure rationale;
- completed Work Card and validation summary;
- known limitations;
- unresolved, deferred, superseded, or carried-forward matters;
- observation, risk, and decision reconciliation;
- Phase Map or Project Roadmap impact when applicable;
- Operator approval statement;
- explicit `Document.Status`.

The application may provide structured fields for these values, but the Markdown/JSON pair remains the durable record.

## Disposition and Revision Rules

- `RevisionRequested` returns the Phase Closeout for correction while preserving access to the reviewed population.
- `Rejected` records that the current closeout is not acceptable and does not close the phase.
- `Approved` does not close the phase unless `closureDecision` is `Close`.
- `Approved` with `DoNotClose` records an approved decision to keep the phase open.
- A new revision after an Approved closeout must return the closeout disposition to `Pending` before further approval.

Do not create `Operator_Phase_Closeout_Approval` or another approval document.

## Phase Close Completion Rule

Phase Close completes only when:

```text
Phase_Closeout.Document.Status = Approved
AND
Phase_Closeout.closureDecision = Close
```

After close:

```text
Phase / Close
→ Project / Building
→ approved Phase_Map selects the next incomplete phase
```

WC14 must reuse the existing document-evidence rules. It must not add a next-phase activation artifact or hidden current-phase state.

When no incomplete mapped phase remains, the workspace may expose a visible `Continue to Project Validation` action. It must not implement the Project Validation workspace.

## Registry and Navigation Integration

Register the Phase Validation workspace at:

```text
level: phase
stage: validation
```

Phase / Close may be represented as a completion view or derived status associated with the Approved `Phase_Closeout`; it must not require another disposition workspace.

## Authorized Production Scope

Create or modify only the files needed for:

- phase population assembly and grouping;
- closeout eligibility diagnostics;
- Phase Closeout creation, editing, loading, and paired writes;
- registry-backed Phase / Validation workspace registration;
- document viewer, closeout preview, and disposition UI;
- derived Phase Close completion and return-to-Project-Building behavior;
- local read, parse, and write error containment.

Expected areas may include:

```text
src/shared/workspaces/
src/shared/documents/
src/main/documents/
src/main/main.ts
src/preload/index.ts
src/renderer/app/App.tsx
```

A narrower implementation is acceptable.

## Authorized Test Scope

Add or modify capability-oriented tests for:

- Phase Validation entry eligibility;
- deterministic phase population grouping;
- missing and inconsistent document diagnostics;
- Phase Closeout pair creation and loading;
- closure decision and disposition interaction;
- Approved Close completion;
- Approved DoNotClose non-completion;
- revision behavior;
- return to Project Building and next-phase derivation;
- no-incomplete-phase signal for Project Validation;
- registry entry and local error containment.

## Explicit Non-Goals

Do not implement:

- repeated Work Card validation testing;
- Project Validation or Project Close;
- a second Phase Close approval;
- `Operator_Phase_Closeout_Approval` artifacts;
- next-phase activation artifacts;
- duplicate phase-corpus snapshots;
- hidden active-phase, validation-complete, or close-complete state;
- route tokens, role gates, approval queues, hashes, execution runs, or decision timelines;
- provider APIs, DOM automation, or credential extraction;
- dependency changes;
- Git operations.

## Required Validation

When execution is authorized, run:

```text
npm run typecheck
npm run build
npm test
```

Do not use Playwright. Operator manual review remains required.

## Acceptance Criteria

WC14 is acceptable only when:

1. a registry-backed Phase / Validation workspace exists;
2. entry eligibility is derived from approved phase and Work Card documents;
3. the complete pertinent phase population is grouped and navigable;
4. document errors are visible and locally contained;
5. the Operator can create or revise the paired Phase Closeout;
6. required closeout fields are captured;
7. the closeout can be previewed and dispositioned in the same workspace;
8. RevisionRequested preserves review context and returns the document for correction;
9. Approved Close completes Phase Validation and Phase Close without another approval;
10. Approved DoNotClose does not close the phase;
11. no separate phase closeout approval or activation artifact is created;
12. after closure, the next phase is derived from Phase Map order and Approved Phase Closeouts;
13. no hidden completion or active-phase state is introduced;
14. earlier workspaces remain behaviorally unchanged;
15. typecheck, build, and tests pass;
16. the Implementer Report accurately records the evidence;
17. no Git mutation occurs.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- final Phase Validation eligibility rules;
- phase population grouping contract;
- Phase Closeout artifact schema and paths;
- disposition and closure-decision behavior;
- derived Phase Close and next-phase evidence;
- validation commands and results;
- confirmation that no second approval, hidden state, activation artifact, dependency, or Git operation was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator should confirm that the phase document population is complete and usable, closure reasons can be recorded, revision remains possible, Approved Close completes the phase, and the application returns to the correct next phase or Project Validation boundary.

## Document Disposition

Document.Status=Approved
