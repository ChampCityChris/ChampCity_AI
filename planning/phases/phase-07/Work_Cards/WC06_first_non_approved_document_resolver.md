# Work Card — Phase 07 WC06 First Non-Approved Document Resolver

Status: approved for continuous Implementer execution
Owner: Implementer
Plan order: 6
Dependency: WC05 completed with its Implementer Report
Risk: high
Git mutation: not authorized
Implementer Report: `planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC06_first_non_approved_document_resolver.md`

## Purpose

Add the only startup and progression resolver used by the clean-room application.

The resolver has one decision rule:

```text
Return the first required logical document whose effective disposition is not Approved.
```

No other condition may preempt, override, block, replace, or reinterpret that result.

## Effective Disposition

```text
missing or invalid   -> Pending
Pending              -> stop at document
Rejected             -> stop at document
RevisionRequested    -> stop at document
Approved             -> continue
```

The resolver reads effective disposition through WC04. It does not read old artifact status, approval files, Registry entries, validation outcomes, timestamps, hashes, decision records, or historical workflow state.

## Deterministic Order

Use one transparent comparator based on stage, project/phase position, document category, Work Card number, repair number, and normalized repository-relative path.

### Stage order

```text
Project Planning
-> Phase Planning
-> Work Card
-> Operator Validation
-> Phase Closeout
```

### Project Planning order

Project Intake is always first.

Then order project-level documents by this category sequence:

1. Project Intake;
2. Project Architect Interview;
3. Project Planning;
4. Project Roadmap;
5. Phase Map;
6. other project-level or unclassified planning documents.

Within the same category, use normalized repository-relative path order.

### Phase order

- Numeric phase folders sort by phase number.
- Project-level documents precede phase-level documents.
- Archive records retain their original phase/category association and sort after non-archive records with the same identity category.
- A phase name that cannot be parsed sorts after numbered phases by normalized path.

### Within each phase

1. Phase Planning;
2. Work Card Plan;
3. other Phase Planning workspace documents;
4. Work Cards;
5. Operator Validation documents;
6. Phase Closeout documents.

### Work Card order

- Parse an initial `WC` number only for ordering.
- The base Work Card precedes its repairs.
- Repair numbers sort numerically.
- Records that cannot be parsed remain visible and sort after parsed cards by normalized path.
- Filename parsing is used only for order, never for identity or approval authority.

### Validation evidence order

For the same Work Card, use:

1. Implementer Report;
2. Architect Review;
3. Validation Report or Operator Validation;
4. Candidate Disposition or other evidence.

Use path order as the final tie-breaker.

## Resolver Result

The result contains only:

- logical document ID;
- owning workspace;
- repository-relative source paths;
- display title;
- effective disposition;
- order position;
- total document count.

Do not return a role, approval artifact, expected output artifact, route token, workflow-state revision, success route, repair route, authority label, or maintenance action.

When every required document is `Approved`, return:

```text
All planning documents approved
```

This is a terminal informational state, not a workflow artifact.

## Startup and Refresh

- After workspace selection, discover documents and resolve the first non-approved document.
- Open its owning workspace and select that exact logical document.
- After `Apply Disposition`, recompute from disk.
- `Approved` may advance to the next document.
- `Rejected` and `RevisionRequested` remain selected.
- Refresh recomputes from disk.
- Restart recomputes from disk; no separate route persistence is needed.
- A local unreadable document is treated as effective `Pending` and selected at its proper order position with a local read error.
- An unrelated malformed later document does not preempt an earlier valid pending document.

## UI

Replace the WC03 neutral message with a concise current-document summary when a document is resolved.

The application must show:

- current workspace;
- current document title;
- effective disposition;
- position such as `Document 1 of N`;
- selected document list and preview from WC05.

Do not recreate a current-action side panel, process rail, route explanation, governance mode, activity timeline, or separate Continue button. The owning workspace is the current action.

## Source Architecture

Create a small capability module such as:

```text
src/shared/documents/documentOrder.ts
src/main/documents/firstNonApprovedResolver.ts
```

The comparator and resolver must be pure or directly testable. Renderer code must not implement its own competing order.

Add direct IPC/preload operations only as needed to resolve and refresh the current document.

## Tests

Create or extend tests under:

```text
test/resolver/
```

Use temporary repositories to prove:

1. Project Intake is first when pending;
2. missing disposition behaves as Pending;
3. approving Project Intake advances to the next Project Planning document;
4. Rejected remains current;
5. RevisionRequested remains current;
6. Phase Planning precedes Work Card Plan;
7. numbered phases sort numerically;
8. base Work Card precedes repairs;
9. repair numbers sort numerically;
10. implementation and validation evidence follows its Work Card;
11. closeout follows validation evidence;
12. archives remain ordered and visible;
13. unparseable records remain visible;
14. malformed later records do not preempt earlier pending records;
15. refresh reflects external status changes;
16. restart derives the same current document without route persistence;
17. all-approved returns the terminal informational state;
18. no old governance, approval, maintenance, role, route, Registry, or hash input influences the result.

## Validation

Run through the documented normal Windows lane:

```text
npm run typecheck
npm run build
npm test
npm run validate:codex:unit
npm run validate:codex:build
npm run validate:codex
```

Run a non-acceptance launch smoke check against a temporary repository and confirm startup opens its first pending Project Intake.

Do not initialize the real ChampCity_AI corpus in WC06.

## Implementer Report Requirements

Create the WC06 report before reading WC07. Include:

- exact comparator and category rules;
- source and test files changed;
- fixture order evidence;
- startup, refresh, and restart smoke evidence;
- every validation result;
- confirmation that the real corpus remains uninitialized;
- confirmation that no parallel resolver or legacy authority exists;
- confirmation that no Git operation occurred.

## Acceptance Criteria

WC06 passes only when:

1. one resolver determines startup and progression;
2. the resolver uses only deterministic document order and effective disposition;
3. Project Intake is first when pending;
4. Approved advances and the other three effective states stop;
5. startup, refresh, and restart select the same correct document;
6. every document remains visible even when malformed or unparseable;
7. no old gate or parallel authority can preempt the resolver;
8. the real corpus remains uninitialized;
9. automated validation passes;
10. the WC06 Implementer Report exists.

After the WC06 report is complete, immediately read and implement WC07. Do not wait for another approval.

## Document Disposition

Document.Status=Approved
