# Work Card — Phase 08 WC11 Work Card Building Implementer Handoff and Report Review Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: high
Execution authorization: withheld until the Phase 08 Work Card sequence is complete
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC11_work_card_building_implementer_handoff_and_report_review_workspace.md`

## Purpose

Implement the Work Card / Building workspace that exposes the exact Approved Formal Work Card as the Implementer instruction, detects and previews the resulting repository-backed `Implementer_Report`, and supports Architect review of that report before Operator validation.

WC11 establishes the normal implementation and report-review path. It does not create repair cards or Validation Records.

## Execution Boundary

WC11 is approved as the eleventh planned Phase 08 implementation unit, but it is not authorized for execution.

Do not execute WC11 until WC10 is accepted and the Operator explicitly releases WC11.

## Source Design

Read and follow:

- `planning/project/Design_Documents/ARTIFACT_AUTHORITY_MODEL.md` only for the retained principle that the Approved Work Card is the Implementer handoff authority;
- `planning/project/Design_Documents/WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md` as the controlling clean-room design;
- accepted WC10 Formal Work Card artifact contract;
- accepted WC03 embedded Architect/MCP evidence for Architect-side review.

Required lifecycle location:

```text
Work Card / Building
└── Implementer Handoff and Report Review Workspace
```

## Implementer Handoff Contract

The workspace must load the exact Approved Formal Work Card pair selected through repository evidence.

It must present:

- Work Card identity and phase;
- Approved disposition;
- repository-relative Work Card path;
- expected Implementer Report path;
- implementation and validation commands from the Work Card;
- a clear indication that the Work Card is ready for the Implementer.

The handoff must not generate a second primary instruction artifact. Convenience actions may expose or copy the repository-relative path, but the Approved Work Card remains authoritative.

WC11 must not claim direct Codex control or execution success unless a supported integration is separately available and evidenced. Repository-backed handoff readiness is sufficient for this card.

## Implementer Report Artifact Contract

The Implementer writes a synchronized report pair under:

```text
planning/phases/<phase-id>/Implementer_Reports/IMPLEMENTER_REPORT_<work-card-id>_<slug>.md
planning/phases/<phase-id>/Implementer_Reports/IMPLEMENTER_REPORT_<work-card-id>_<slug>.json
```

The report must identify:

- parent Work Card ID and path;
- repository, branch, remote, and dirty-state verification;
- exact files changed;
- implementation summary;
- validation commands and results;
- acceptance-criterion evidence;
- blockers or deviations;
- remaining Operator manual validation;
- terminal `Document.Status=Pending` when submitted.

The workspace must verify that the report references the selected Work Card. A mismatched report must not be reviewed as the current report.

## Required Workspace Experience

The workspace should use a three-part review surface without creating a new authority system:

```text
Approved Formal Work Card
|
├── Implementer handoff status
└── Embedded Architect browser | Implementer Report preview and disposition
```

The workspace must:

1. show the Approved Work Card supplied to the Implementer;
2. wait for or refresh the expected Implementer Report pair;
3. preview the report and its declared changed-work evidence;
4. provide the report and relevant repository evidence to the embedded Architect through MCP;
5. allow the Architect review outcome to be written directly to the report disposition;
6. support `Approved`, `RevisionRequested`, and `Rejected` report outcomes;
7. preserve report content while changing only the canonical disposition;
8. contain missing, malformed, or mismatched report failures locally.

## Report Disposition Meaning

```text
Pending
= Implementer submitted report; Architect review not complete

Approved
= Architect determines implementation is ready for Operator validation

RevisionRequested
= Architect identifies a bounded repair requirement before Operator validation

Rejected
= Report or implementation cannot be accepted as a basis for continuation; parent Work Card remains unresolved
```

The report itself is the durable Architect review target. WC11 must not create a separate Architect Review approval artifact.

## Validation Boundary

An Approved Implementer Report enables the later Work Card / Validation workspace.

WC11 must not create a `Validation_Record`, because the Operator has not yet performed validation.

A `RevisionRequested` report enables the WC12 repair subsystem. WC11 must not create the repair card itself.

## Registry and Navigation Integration

Register the workspace through the WC01 registry at:

```text
level: workCard
stage: building
```

The current Work Card must resolve from repository evidence. Do not add hidden active-card or execution-run state.

## Authorized Production Scope

Create or modify only files required for:

- Approved Work Card handoff presentation;
- expected report path derivation;
- Implementer Report pair loading and parent-reference validation;
- embedded Architect/MCP report-review handoff;
- report disposition writes;
- registry-backed Work Card / Building UI;
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

- Approved-only Work Card handoff readiness;
- deterministic report-path derivation;
- report-to-parent Work Card reference validation;
- missing, malformed, and mismatched report handling;
- report preview and refresh;
- report disposition replacement without content loss;
- Approved enables validation readiness;
- RevisionRequested exposes repair readiness without creating a repair;
- registry entry;
- unchanged earlier workspace behavior.

## Explicit Non-Goals

Do not implement:

- source-code execution or direct Codex control;
- a separate Implementer Execution Packet;
- repair card generation or repair execution;
- Operator validation or Validation Records;
- Work Card close or next-candidate selection;
- separate Architect Review artifacts;
- hidden execution state, run records, route tokens, or hash gates;
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

Manual validation should use a real repository-backed Work Card and Implementer Report. Do not use Playwright.

## Acceptance Criteria

WC11 is acceptable only when:

1. a registry-backed Work Card / Building workspace exists;
2. only an Approved Formal Work Card is shown as ready for Implementer handoff;
3. the exact Work Card remains the authoritative instruction;
4. the expected Implementer Report path is derived deterministically;
5. a report must reference the selected parent Work Card before review;
6. the Operator and Architect can preview the repository-backed report in the workspace;
7. the report and relevant evidence can be supplied to the embedded Architect through MCP;
8. Architect review is recorded directly as the report disposition;
9. Approved means ready for Operator validation;
10. RevisionRequested means repair is required before validation;
11. no Validation Record, repair card, execution packet, or separate Architect Review artifact is created;
12. earlier workspaces remain behaviorally unchanged;
13. typecheck, build, and tests pass;
14. the Implementer Report accurately records evidence;
15. no Git mutation occurs.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- final Work Card handoff and report contracts;
- report-parent validation evidence;
- embedded Architect report-review evidence;
- report disposition and error-containment evidence;
- validation commands and results;
- confirmation that no execution packet, repair, Validation Record, hidden state, dependency, or Git operation was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator should confirm that the exact Approved Work Card is presented for handoff, the correct Implementer Report is detected and previewed, and the Architect can mark that report ready for validation or in need of repair without creating a Validation Record.

## Document Disposition

Document.Status=Approved
