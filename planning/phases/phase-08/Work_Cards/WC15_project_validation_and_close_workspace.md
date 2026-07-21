# Work Card — Phase 08 WC15 Project Validation and Close Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium
Execution authorization: withheld until the Phase 08 Work Card sequence is released
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC15_project_validation_and_close_workspace.md`

## Purpose

Implement the Project / Validation document-review workspace and the terminal Project / Close completion behavior.

The workspace must collect and organize the governed project document population, allow the Operator to create or revise the `Project_Closeout`, and disposition that closeout document.

An Approved `Project_Closeout` with a `Close` decision completes Project Validation and Project Close. Project Close is terminal. No second approval, terminal-state artifact, or separate project closeout approval is permitted.

## Execution Boundary

This Work Card is approved as the fifteenth and final planned Phase 08 implementation unit, but it is not authorized for execution.

Do not execute WC15 until WC14 is accepted and the Operator explicitly releases WC15.

## Source Design

Read and follow:

- `planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`
- `planning/project/Design_Documents/PHASE_AND_PROJECT_VALIDATION_CLOSE_WORKSPACE_DEFINITION.md`
- accepted WC14 phase population and closeout behavior

The lifecycle locations are:

```text
Project / Validation
└── Project Validation Workspace

Project / Close
└── terminal completion derived from Approved Project_Closeout
```

## Entry Requirements

The Project Validation workspace may begin only when repository evidence shows:

1. `Project_Profile` and `Project_Roadmap` are Approved;
2. the `Phase_Map` is Approved;
3. every required mapped phase has an Approved `Phase_Closeout` with `closureDecision=Close`; and
4. remaining project work is explicitly resolved, deferred, transferred, or documented as a known limitation.

The application must identify incomplete or inconsistent phase records rather than hide them behind a project-ready flag.

## Required Workspace Experience

Implement a registry-backed Project / Validation workspace with:

```text
Project document population browser | Project_Closeout preview and disposition
```

The workspace must:

1. assemble the governed project corpus from repository-backed documents;
2. group the corpus by lifecycle level and artifact purpose;
3. provide navigation, search, filtering, and document preview appropriate for a large project population;
4. display document identity, lifecycle location, artifact type, and disposition;
5. identify missing, unreadable, invalid, duplicated, or disposition-inconsistent records locally;
6. show phase-completion coverage against the Approved Phase Map;
7. allow the Operator to create or revise the project closeout fields;
8. save the paired `Project_Closeout` through main/preload IPC;
9. preview the current repository-backed closeout document;
10. support `Approved`, `Rejected`, and `RevisionRequested` dispositions;
11. refresh after revision without losing the corpus-review context.

An embedded Architect browser is not required as the primary surface. Existing MCP support may assist drafting, but browser chat state must not become closure authority.

## Governed Project Population

The document browser must organize the project corpus at least as follows:

```text
Project Intake
├── Project Intake
├── Architect Interview Prompt
└── Architect Interview

Project Planning
├── Project_Profile
├── Project_Roadmap
└── Phase_Map

Phase records
└── each mapped phase
    ├── Phase_Interview
    ├── Phase_Planning
    ├── Work_Card_Plan
    ├── Formal Work Cards
    ├── Implementer Reports
    ├── Repair Work Cards and reports
    ├── Validation Records
    └── Phase_Closeout

Project governance context
├── Observations
├── Risks
├── Decisions
├── unresolved or deferred matters
└── relevant evidence and release records
```

The browser must reference the existing durable documents. It must not generate a duplicate corpus snapshot and treat that snapshot as authority.

## Project Closeout Artifact Contract

Create or update the canonical pair:

```text
planning/project/Project_Closeouts/PROJECT_CLOSEOUT_<project-slug>.md
planning/project/Project_Closeouts/PROJECT_CLOSEOUT_<project-slug>.json
```

The closeout must contain at least:

- project identity, purpose, and intended outcome;
- closure decision: `Close` or `DoNotClose`;
- Operator closure rationale;
- phase completion summary;
- delivered capabilities or completed project outcomes;
- known limitations;
- unresolved, deferred, transferred, or abandoned work;
- observation, risk, and decision reconciliation;
- release, completion, or terminal status when applicable;
- Operator approval statement;
- explicit `Document.Status`.

The application may provide structured fields for these values, but the Markdown/JSON pair remains the durable project-close record.

## Disposition and Revision Rules

- `RevisionRequested` returns the Project Closeout for correction while preserving the full corpus-review context.
- `Rejected` records that the current closeout is not acceptable and does not close the project.
- `Approved` does not close the project unless `closureDecision` is `Close`.
- `Approved` with `DoNotClose` records an approved decision to keep the project open.
- A new revision after an Approved closeout must return the closeout disposition to `Pending` before further approval.

Do not create `Operator_Project_Closeout_Approval`, terminal approval, or release approval artifacts unless a future separately approved design defines a distinct non-duplicative business need.

## Project Close Completion Rule

Project Close completes only when:

```text
Project_Closeout.Document.Status = Approved
AND
Project_Closeout.closureDecision = Close
```

Project Close is terminal within the nested lifecycle:

```text
Project / Close
→ terminal
```

The application may display a completed-project summary and retain access to the corpus. It must not route to another project, create a hidden terminal-state record, or automatically start a new Project Intake.

## Phase Coverage and Consistency Checks

Before allowing an Approved Close decision, the workspace must show:

- every required Phase Map entry;
- the corresponding Approved Phase Closeout;
- any phase absent from the repository;
- any phase closeout that is Pending, Rejected, RevisionRequested, or `DoNotClose`;
- any unresolved required Work Card or failed final Validation Record;
- any remaining project-level unresolved matter requiring explicit treatment.

The application should block the final `Approved` + `Close` action when required evidence is absent or contradictory. It must explain the blocking records in plain language.

## Registry and Navigation Integration

Register the Project Validation workspace at:

```text
level: project
stage: validation
```

Project / Close may be represented as a terminal completion view derived from the Approved `Project_Closeout`; it must not require another disposition workspace.

## Authorized Production Scope

Create or modify only the files needed for:

- governed project-corpus discovery, classification, grouping, filtering, and navigation;
- Phase Map coverage and closeout consistency checks;
- Project Closeout creation, editing, loading, and paired writes;
- registry-backed Project / Validation workspace registration;
- document browser, closeout preview, and disposition UI;
- derived terminal Project Close behavior;
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

- Project Validation entry eligibility;
- deterministic project-corpus grouping;
- large-population navigation and filtering contracts;
- Phase Map coverage and closeout consistency diagnostics;
- missing, duplicate, invalid, and mixed-disposition records;
- Project Closeout pair creation and loading;
- closure decision and disposition interaction;
- blocking final close when required evidence is incomplete;
- Approved Close terminal completion;
- Approved DoNotClose non-completion;
- revision behavior;
- registry entry and local error containment.

## Explicit Non-Goals

Do not implement:

- repeated phase or Work Card acceptance testing;
- a second Project Close approval;
- `Operator_Project_Closeout_Approval` artifacts;
- release approval or deployment workflow;
- automatic new-project creation or routing;
- duplicate project-corpus snapshots;
- hidden project-complete or terminal-state persistence;
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

WC15 is acceptable only when:

1. a registry-backed Project / Validation workspace exists;
2. entry eligibility is derived from Approved project, Phase Map, and Phase Closeout documents;
3. the governed project corpus is grouped, searchable, filterable, and navigable;
4. phase completion coverage is visible against the Approved Phase Map;
5. missing, invalid, duplicated, or contradictory records are visible and locally contained;
6. the Operator can create or revise the paired Project Closeout;
7. required closeout fields are captured;
8. the closeout can be previewed and dispositioned in the same workspace;
9. RevisionRequested preserves corpus-review context and returns the document for correction;
10. final Approved Close is blocked when required evidence is incomplete or contradictory;
11. Approved Close completes Project Validation and terminal Project Close without another approval;
12. Approved DoNotClose does not close the project;
13. no separate project closeout approval, corpus snapshot, or hidden terminal state is created;
14. the completed project remains reviewable after closure;
15. earlier workspaces remain behaviorally unchanged;
16. typecheck, build, and tests pass;
17. the Implementer Report accurately records the evidence;
18. no Git mutation occurs.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- final Project Validation eligibility rules;
- project-corpus grouping and navigation contract;
- Phase Map coverage and blocking-diagnostic behavior;
- Project Closeout artifact schema and paths;
- disposition and closure-decision behavior;
- terminal Project Close evidence;
- validation commands and results;
- confirmation that no second approval, hidden terminal state, corpus snapshot, dependency, or Git operation was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator should confirm that the entire governed project population can be reviewed efficiently, incomplete phase evidence is clearly identified, closure reasons and remaining limitations can be recorded, revision remains possible, and Approved Close produces a terminal but still reviewable project.

## Document Disposition

Document.Status=Approved
