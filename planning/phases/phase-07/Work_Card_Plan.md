# Work Card Plan — Phase 07 Clean-Room Document Disposition Rebuild

Status: approved by Operator through ChatGPT
Plan revision: 7
Project: ChampCity A/I
Git mutation: not authorized except through a separately approved WC10 execution pass

## Approved Direction

Phase 07 replaced the unusable prior application source with a clean-room document-disposition application.

The application workflow remains:

```text
Discover planning documents.
Read Document.Status.
Open the first required document not marked Approved.
Let the Operator approve, reject, or request revision in that document's workspace.
Write the result to the same document.
Repeat.
```

Allowed dispositions are exactly:

```text
Pending
Approved
Rejected
RevisionRequested
```

There is no approval artifact, current-action governance object, target hash, decision timeline, role gate, routed IPC token, Governance Maintenance route, or compatibility layer.

## Prior Work Disposition

- WC01: superseded.
- WC02: rejected.
- Prior WC03 removal-in-place draft: rejected and replaced.
- WC03 through WC07: Implementer passes completed and reviewed.
- WC08: approved narrow correctness repair.

The clean-room foundation, workspace-integrated disposition controls, real-corpus initialization, and removal of the legacy governance architecture remain in place.

## Completed Work Cards

### WC03 — Clean-Room Application Source Reset and Minimal Workspace Shell

Result: clean Electron and React shell with selected-workspace persistence and no legacy workflow authority.

### WC04 — Planning Document Discovery and Disposition Reader/Writer

Result: four-value disposition contract, recursive discovery, same-stem logical pairing, preview, write, and initialization services.

### WC05 — Workspace-Integrated Document Review and Disposition

Result: Project Planning, Phase Planning, Work Card, Operator Validation, and Phase Closeout own their document review and disposition controls.

### WC06 — First Non-Approved Document Resolver

Result: one resolver derives the first non-approved document. Cross-phase ordering is corrected by WC08.

### WC07 — Real-Corpus Initialization and Dogfood Validation

Result: real corpus initialized without inferred approvals. The corpus must remain initialized.

## Current Work Card

### WC08 — Disposition Write Safety, Local Read Isolation, and Phase Order Repair

Purpose: correct the four specific defects found during Architect review without redesigning the clean-room application.

Required outcomes:

- preserve all non-disposition Markdown content when replacing or normalizing a disposition section;
- stage disposition writes in sibling temporary files, verify them, replace targets, and restore original pair members on partial failure;
- convert a file-specific metadata/read failure into a local `readError` document record while continuing to discover and use other documents;
- order project-level documents first, then numbered phases, then stage order within each phase;
- prove Phase 01 Work Card, validation, and closeout records precede Phase 02 Phase Planning;
- replace hard-coded real-corpus totals in tests with independent runtime reconciliation;
- verify the real corpus read-only after repair;
- create one WC08 Implementer Report.

Report:

`planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC08_disposition_write_safety_local_read_isolation_phase_order_repair.md`

## Remaining Ordered Work Cards

### WC09 — Operator Validation of the Clean-Room Workflow

Owner: Operator, with Architect review of the recorded result.

Dependency: WC08 Implementer Report reviewed and WC08 accepted for Operator validation.

Purpose: perform the human acceptance validation that the Implementer could not claim.

Required outcomes:

- validate startup against the real repository;
- confirm Project Intake is selected first while pending;
- confirm all five workspaces are usable;
- confirm list, preview, disposition selector, and Apply Disposition behavior;
- confirm a controlled disposition write preserves content after prior disposition syntax;
- confirm a local document error does not suppress unrelated documents;
- confirm phase-by-phase progression through controlled fixtures;
- confirm refresh and restart return to the correct document;
- confirm no legacy governance or separate approval screen appears;
- record Operator approval, rejection, or revision request.

Scope boundary:

- no source-code changes;
- no broad real-corpus disposition changes solely for testing;
- no Git operations;
- failed validation returns to the Architect for a separately authorized bounded repair.

Expected output:

`planning/phases/phase-07/Validation_Reports/VALIDATION_REPORT_WC09_clean_room_workflow_operator_validation.md`

### WC10 — Durable Clean-Room Baseline and Development-Branch Integration

Owner: Implementer under explicit Operator Git authorization.

Dependencies:

- WC08 accepted;
- WC09 approved;
- final automated validation passes;
- Operator explicitly authorizes the detailed Git actions in WC10.

Purpose: establish the accepted clean-room application and initialized corpus as the durable repository baseline.

Required outcomes:

- inspect the complete intended working-tree diff;
- include only the accepted clean-room source, tests, initialized planning corpus, Phase 07 planning records, and accepted evidence;
- exclude build output, temporary files, runtime state, unapproved screenshots, and generated junk;
- perform secret and local-path safety scanning;
- stage the intended baseline deliberately;
- create one plain baseline commit;
- push the approved feature branch;
- integrate the accepted baseline into `dev` using the approved Git tooling;
- verify final branch, remote, validation, and working status;
- create a WC10 Implementer Report.

Explicit exclusions:

- no merge to `master`;
- no release tag;
- no package or publication;
- no unrelated cleanup or history rewriting;
- no Git operation before the Operator grants explicit WC10 authorization.

Expected report:

`planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC10_clean_room_baseline_and_dev_integration.md`

### WC11 — Phase 07 Closeout and Project Roadmap Rebaseline

Owner: Architect for review and planning records; Operator retains closeout approval.

Dependencies:

- WC09 approved;
- WC10 baseline integrated into `dev`;
- final repository state verified.

Purpose: close Phase 07 based on the architecture actually delivered and prepare Phase 08 planning authority.

Required outcomes:

- create the Phase 07 closeout record;
- record WC03 through WC10 outcomes accurately;
- record the clean-room source reset, disposition contract, workspace review, resolver, initialized corpus, and WC08 correctness repair;
- reconcile Phase 07 Phase Planning and Work Card Plan;
- update the living Project Roadmap so Phase 07 is no longer described as Architect Bridge and MCP-first integration;
- update or replace stale Phase Map statements that identify Phase 03 as active or preserve the obsolete phase sequence;
- identify the next planned phase as:

```text
Phase 08 — Operational Dogfooding, Required-Document Scope, and Revision Workflow
```

- preserve prior roadmap and phase records as historical evidence;
- record that Phase 08 implementation still requires separate Operator approval.

Expected outputs:

```text
planning/phases/phase-07/Phase_Closeouts/PHASE_07_CLOSEOUT_clean_room_document_disposition_rebuild.md
planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md
planning/project/Phase_Map/PHASE_MAP_champcity_a_i.md
```

JSON sidecars should be updated only when those living documents continue to require synchronized pairs at execution time.

## Sequencing Rules

- Complete and review WC08 before drafting WC09 in executable detail.
- WC09 must pass before WC10 Git integration.
- WC10 requires explicit Operator authorization for the named Git operations.
- WC11 follows successful baseline integration.
- Phase 08 remains planned and inactive until WC11 closeout and separate Operator approval.
- Do not absorb Phase 08 product scope into WC09, WC10, or WC11.

## Global Constraints

- Protect the current heavily dirty working tree.
- Do not perform Git mutation outside an explicitly approved WC10 pass.
- Do not bulk-reinitialize the planning corpus.
- Do not resurrect governance, approval artifacts, queues, route tokens, execution runs, or compatibility layers.
- Do not use Playwright.
- Use the documented normal Windows validation lane.
- Do not claim Operator acceptance without the Operator's actual result.

## Completion Rule

Phase 07 is complete only when:

1. WC08 passes and is accepted;
2. WC09 Operator validation is approved;
3. WC10 establishes the accepted baseline on `dev` under explicit Git authorization;
4. WC11 closes Phase 07 and rebaselines the living Project Roadmap and Phase Map;
5. Phase 08 remains a separately approved next phase rather than being implemented early.

## Document Disposition

Document.Status=Approved
