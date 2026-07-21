# Work Card — Phase 08 WC13 Work Card Validation, Close, and Next-Candidate Return

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: high
Execution authorization: withheld until the Phase 08 Work Card sequence is complete
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC13_work_card_validation_close_and_next_candidate_return.md`

## Purpose

Implement the Work Card / Validation and Work Card / Close workspaces. The Operator receives Architect validation guidance, performs validation, records repository-backed evidence, and either closes the parent Work Card or enters the WC12 repair path.

An Approved `Validation_Record` is the explicit Work Card close evidence. No separate Work Card completion or closeout artifact is created.

## Execution Boundary

WC13 is approved as the thirteenth planned Phase 08 implementation unit, but it is not authorized for execution.

Do not execute WC13 until WC12 is accepted and the Operator explicitly releases WC13.

## Source Design

Read and follow:

- `planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`
- `planning/project/Design_Documents/WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md`
- accepted WC09 candidate-selection rules;
- accepted WC11 report-review contract;
- accepted WC12 repair contract.

Required lifecycle locations:

```text
Work Card / Validation
└── Operator Validation Workspace

Work Card / Close
└── Completion Evidence and Return Workspace
```

## Validation Entry Rule

The parent Work Card may enter validation only when:

1. the Formal Work Card is Approved;
2. the current implementation path has an Approved Implementer Report;
3. every required pre-validation repair has an Approved repair Implementer Report;
4. there is no unresolved `RevisionRequested` or `Rejected` Implementer Report.

When returning from a post-validation repair, the latest repair card must declare `parent_validation` and its Implementer Report must be Approved.

Readiness is derived from repository documents. Do not add a hidden validation-ready flag.

## Required Workspace Experience

The Work Card / Validation workspace should present:

```text
Embedded Architect browser or validation guidance pane
|
├── Approved Formal Work Card acceptance criteria
├── Approved Implementer Report and repair history
└── Operator Validation Record form, evidence, preview, and disposition
```

The workspace must:

1. provide the approved Work Card, current Approved Implementer Report, and repair history to the Architect through MCP;
2. display the Architect's validation steps to the Operator;
3. allow the Operator to record steps performed, results, notes, and evidence references;
4. create the `Validation_Record` only after the Operator begins or completes validation;
5. preview the saved repository-backed record;
6. support `Approved`, `RevisionRequested`, and `Rejected` outcomes;
7. preserve earlier failed validation attempts as durable evidence;
8. contain local evidence, read, parse, and write errors without crashing the application.

The application must not create a passing Validation Record automatically from tests, an Implementer Report, or Architect judgment.

## Validation Record Artifact Contract

Each validation attempt creates a synchronized pair under:

```text
planning/phases/<phase-id>/Validation_Records/VALIDATION_RECORD_<work-card-id>_ATTEMPT<nn>.md
planning/phases/<phase-id>/Validation_Records/VALIDATION_RECORD_<work-card-id>_ATTEMPT<nn>.json
```

Attempt numbering is sequential and derived from existing validation records for the parent Work Card. It must not use a hidden counter or timestamps as authority.

Each Validation Record must identify:

- parent Work Card ID and path;
- validation attempt number;
- current implementation evidence being validated;
- latest applicable repair ID and report, when one exists;
- validation steps provided;
- steps actually performed;
- observed results;
- evidence paths or attachments;
- issues found;
- Operator notes;
- terminal Document Disposition.

A later attempt must not overwrite or rewrite a failed prior attempt.

## Validation Disposition Meaning

```text
Pending
= validation attempt exists but is incomplete

Approved
= Operator validation passed

RevisionRequested
= Operator validation failed and a repair is required

Rejected
= Operator declines or abandons acceptance; parent Work Card remains unresolved
```

A `RevisionRequested` Validation Record exposes the WC12 post-validation repair action. WC13 must not duplicate the repair generator.

## Work Card Close Rule

A parent Work Card is complete only when repository evidence shows:

1. the Formal Work Card remains Approved;
2. the implementation or latest repair Implementer Report is Approved;
3. the latest applicable validation attempt references that implementation evidence; and
4. that Validation Record is Approved.

The Approved Validation Record is the close evidence.

WC13 must not create:

- a `Work_Card_Closeout` artifact;
- a second approval document;
- a hidden completed flag;
- an execution-run completion record.

## Return to Phase Building

After the close rule is satisfied, the Work Card / Close workspace must show:

- parent Work Card identity;
- Approved validation evidence;
- associated repair history;
- a visible `Return to Phase Building` action.

Returning to Phase Building invokes the WC09 repository-derived selection rules:

```text
Approved Validation Record
→ Work Card / Close
→ Phase / Building
→ next eligible incomplete candidate
```

If WC09 finds no eligible incomplete candidate, WC13 may show that Phase Building has no remaining eligible candidate and expose a visible continuation toward future Phase Validation. WC13 must not implement Phase Validation or Phase Close.

## Registry and Navigation Integration

Register the workspaces through the WC01 registry at:

```text
level: workCard
stage: validation

level: workCard
stage: close
```

Current Work Card identity and close status must be derived from repository evidence.

## Authorized Production Scope

Create or modify only files required for:

- validation-readiness evaluation;
- Architect validation-context handoff;
- Operator Validation Record form and evidence references;
- sequential attempt numbering and immutable prior-attempt preservation;
- Validation Record pair writes and preview;
- validation disposition handling;
- Work Card close-evidence evaluation;
- return to WC09 Phase Building selection;
- registry-backed Validation and Close workspaces;
- local error containment.

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

- validation-entry readiness from Approved report evidence;
- blocking on unresolved report or repair evidence;
- no Validation Record before Operator action;
- sequential attempt numbering;
- prior failed-attempt preservation;
- parent Work Card and current implementation-reference validation;
- disposition meanings;
- RevisionRequested exposure of WC12 repair readiness;
- Approved record close evidence;
- prevention of separate closeout or hidden completed state;
- return to WC09 next-candidate selection;
- no-remaining-candidate message;
- registry entries and unchanged earlier workspace behavior.

## Explicit Non-Goals

Do not implement:

- automatic validation or test-result acceptance;
- Validation Records before Operator action;
- repair generation beyond invoking WC12;
- separate Work Card closeout or approval artifacts;
- hidden completed or validation-ready flags;
- Phase Validation, Phase Close, Project Validation, or Project Close;
- automatic activation of another phase;
- route tokens, execution runs, role gates, or hash gates;
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

Manual validation must include one passing attempt and one failed-attempt-to-repair-to-passing-attempt sequence. Do not use Playwright.

## Acceptance Criteria

WC13 is acceptable only when:

1. registry-backed Work Card / Validation and Work Card / Close workspaces exist;
2. validation entry requires Approved current implementation evidence;
3. no Validation Record is created before Operator validation action;
4. the Operator can record steps, results, notes, issues, and evidence;
5. each attempt receives deterministic sequential numbering;
6. prior failed attempts remain unchanged and reviewable;
7. each record references the parent Work Card and current implementation or repair evidence;
8. Approved means passed and closes the Work Card;
9. RevisionRequested exposes the WC12 post-validation repair path;
10. Rejected leaves the Work Card unresolved;
11. no separate closeout artifact or hidden completed state is created;
12. close evidence is an Approved Validation Record after the latest repair;
13. the workspace returns to WC09 Phase Building selection after close;
14. no-remaining-candidate state is visible without implementing Phase Validation;
15. earlier workspaces remain behaviorally unchanged;
16. typecheck, build, and tests pass;
17. the Implementer Report accurately records evidence;
18. no Git mutation occurs.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- final validation-readiness and Validation Record contracts;
- attempt-numbering and prior-evidence preservation proof;
- disposition and close-evidence proof;
- failed-validation repair return evidence;
- next-candidate return evidence;
- validation commands and results;
- confirmation that no automatic validation, separate closeout artifact, hidden state, dependency, or Git operation was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator should confirm that validation creates a record only when performed, failed attempts remain visible, a repair returns for a new attempt, an Approved attempt closes the Work Card, and the application returns to the next eligible Work Card candidate.

## Document Disposition

Document.Status=Approved
