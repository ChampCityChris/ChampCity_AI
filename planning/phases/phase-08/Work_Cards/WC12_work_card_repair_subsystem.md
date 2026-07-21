# Work Card — Phase 08 WC12 Work Card Repair Subsystem

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: high
Execution authorization: withheld until the Phase 08 Work Card sequence is complete
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC12_work_card_repair_subsystem.md`

## Purpose

Implement the bounded Work Card repair subsystem for defects identified either during Architect review of an Implementer Report or during Operator validation.

Repair cards are durable child implementation artifacts of the original parent Work Card. They do not create another lifecycle level, do not recursively nest, and do not close the parent Work Card.

## Execution Boundary

WC12 is approved as the twelfth planned Phase 08 implementation unit, but it is not authorized for execution.

Do not execute WC12 until WC11 is accepted and the Operator explicitly releases WC12.

## Source Design

Read and follow:

- `planning/project/Design_Documents/WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md`
- accepted WC10 Formal Work Card contract;
- accepted WC11 Implementer handoff and report-review contract.

Required execution location:

```text
Work Card / Building
└── Repair Workspace
```

A repair may originate from Work Card / Building or Work Card / Validation, but repair drafting, handoff, implementation, and report review occur as bounded work under the parent Work Card Building stage.

## Repair Origins

### Pre-validation repair

A pre-validation repair is permitted only when the current parent or repair `Implementer_Report` is `RevisionRequested` before the Operator has performed validation.

```text
RevisionRequested Implementer_Report
→ repair card
→ repair implementation
→ repair Implementer_Report
→ Architect review
→ return to parent Work Card Building review
```

No `Validation_Record` is created for this path.

### Post-validation repair

A post-validation repair is permitted only when a repository-backed `Validation_Record` is `RevisionRequested`.

```text
RevisionRequested Validation_Record
→ repair card
→ repair implementation
→ repair Implementer_Report
→ Architect review
→ return to parent Work Card Validation
```

The failed Validation Record remains durable evidence and must not be overwritten or reclassified as passing.

## Repair Identification and Parentage

Repair IDs use the original parent Work Card ID and a sequential two-digit suffix:

```text
WCxx-REPAIR01
WCxx-REPAIR02
WCxx-REPAIR03
```

The next repair number is derived from existing sibling repair artifacts for the original parent. It must not be derived from timestamps or a hidden counter.

Every repair, including a repair caused by an earlier repair report, references the original parent Work Card. Repairs must not become parents of nested repair lifecycles.

## Repair Artifact Contract

Create synchronized repair pairs under the parent phase:

```text
planning/phases/<phase-id>/Work_Cards/<parent-id>-REPAIR<nn>_<slug>.md
planning/phases/<phase-id>/Work_Cards/<parent-id>-REPAIR<nn>_<slug>.json
```

Each repair card must contain:

- repair ID and original parent Work Card ID;
- repair origin: `pre_validation_report_review` or `post_validation_failure`;
- exact evidence-source path;
- bounded defect statement;
- authorized repair scope;
- explicit non-scope;
- affected acceptance criteria;
- validation or re-review expectations;
- return target: `parent_building_review` or `parent_validation`;
- expected Implementer Report path;
- terminal Document Disposition.

A repair card must not silently broaden the parent Work Card purpose or phase scope.

## Repair Workspace Experience

Use the established review pattern:

```text
Embedded Architect browser | Repair Work Card preview
```

The workspace must:

1. show the parent Work Card and triggering evidence;
2. generate a repair-specific Architect handoff;
3. allow the Architect to write the repair pair through MCP;
4. preview and refresh the repair card;
5. permit correction before handoff;
6. show the Operator the repair scope and return target;
7. make only an Approved repair card eligible for Implementer handoff;
8. reuse the WC11 handoff and report-review contract for the repair;
9. preserve the parent Work Card as open and unchanged except for visible repair association.

The Operator review is visible but is not a second standalone approval-artifact workflow. The repair document's explicit Approved disposition is the handoff condition.

## Repair Implementer Report

Each repair has its own synchronized Implementer Report pair:

```text
planning/phases/<phase-id>/Implementer_Reports/IMPLEMENTER_REPORT_<repair-id>_<slug>.md
planning/phases/<phase-id>/Implementer_Reports/IMPLEMENTER_REPORT_<repair-id>_<slug>.json
```

The report must reference both the repair ID and original parent Work Card ID.

Report review follows WC11:

- `Approved` permits return to the repair card's declared return target;
- `RevisionRequested` creates the next sibling repair card against the original parent;
- `Rejected` leaves the parent unresolved.

## Return Rules

The return target is explicit in the repair card and cannot be inferred from UI navigation.

```text
pre-validation repair accepted
→ parent Work Card Building review

post-validation repair accepted
→ parent Work Card Validation
```

A post-validation repair does not automatically pass validation. The Operator must perform a new validation attempt.

## Authorized Production Scope

Create or modify only files required for:

- repair-origin validation;
- deterministic sibling repair numbering;
- repair context and Architect handoff assembly;
- repair pair creation, loading, preview, and disposition;
- parent/evidence/return-target validation;
- WC11 handoff and report-review reuse;
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

- valid pre-validation and post-validation origins;
- prohibition of a pre-validation Validation Record;
- deterministic sibling repair numbering;
- original-parent references for every repair;
- required evidence and return-target fields;
- repair scope/non-scope structure;
- report references to repair and parent;
- accepted return behavior;
- next sibling repair after a repair-report failure;
- prevention of recursive repair lifecycles;
- unchanged parent and earlier workspace behavior.

## Explicit Non-Goals

Do not implement:

- another lifecycle level for repairs;
- repair-of-repair parent chains;
- automatic approval or dispatch;
- a separate Operator repair-approval artifact;
- a Validation Record for pre-validation repair;
- automatic validation pass after a repair;
- parent Work Card closure;
- Phase Validation or Phase Close;
- hidden counters, repair queues, route tokens, or execution runs;
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

Manual validation must use repository-backed parent, report, validation, repair, and repair-report artifacts. Do not use Playwright.

## Acceptance Criteria

WC12 is acceptable only when:

1. a repair workspace exists under Work Card / Building;
2. repair creation requires a valid RevisionRequested report or Validation Record;
3. pre-validation and post-validation origins remain distinct;
4. pre-validation repair creates no Validation Record;
5. repair IDs use deterministic sequential sibling numbering;
6. every repair references the original parent Work Card and exact evidence source;
7. every repair has bounded scope, non-scope, acceptance criteria, and return target;
8. repairs do not create recursive lifecycle nesting;
9. only Approved repair cards are eligible for the WC11 handoff path;
10. each repair has its own report referencing repair and parent;
11. accepted repairs return to the explicit parent stage;
12. failed repair reports create the next sibling repair rather than a nested child;
13. the parent Work Card remains open;
14. earlier workspaces remain behaviorally unchanged;
15. typecheck, build, and tests pass;
16. the Implementer Report accurately records evidence;
17. no Git mutation occurs.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- final repair artifact contract;
- origin and numbering rules;
- parent/evidence/return-target validation evidence;
- repair handoff and report-review evidence;
- recursive-nesting prevention evidence;
- validation commands and results;
- confirmation that no repair lifecycle, hidden counter, Validation Record before Operator action, dependency, or Git operation was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator should confirm that report-review and validation failures produce correctly numbered sibling repair cards, the triggering evidence and return target are clear, and an accepted repair returns to the parent workflow without closing it or creating recursive nesting.

## Document Disposition

Document.Status=Approved
