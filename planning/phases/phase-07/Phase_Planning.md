# Phase 07 — Clean-Room Document Disposition Rebuild

Status: approved by Operator through ChatGPT
Planning revision: 6
Project: ChampCity A/I
Execution mode: clean-room rebuild, bounded correctness repair, Operator validation, baseline establishment, and closeout
Git mutation: not authorized except through a separately approved WC10 execution pass

## Phase Purpose

Phase 07 replaces the unusable prior application architecture with a small, inspectable document-disposition application and establishes that application as the durable development baseline.

The clean-room implementation provides:

- selected-repository workspace persistence;
- recursive planning-document discovery;
- the four-value document disposition contract;
- workspace-integrated document review and disposition;
- first-non-approved document resolution;
- real-corpus initialization;
- phase-by-phase progression after WC08 repair.

WC01 is superseded. WC02 is rejected. WC03 through WC07 completed their Implementer passes. WC08 is the current bounded correctness repair. WC09 through WC11 complete validation, baseline establishment, and Phase 07 closeout.

## Required Product Behavior

Every logical document under `planning/` has one disposition:

```text
Pending
Approved
Rejected
RevisionRequested
```

A missing or invalid disposition is treated as `Pending`.

Markdown representation:

```markdown
## Document Disposition

Document.Status=Pending
```

JSON representation:

```json
{
  "documentDisposition": {
    "status": "Pending"
  }
}
```

A same-stem Markdown and JSON pair is one logical document. Both representations carry the same status.

The application provides five workspaces:

1. Project Planning
2. Phase Planning
3. Work Card
4. Operator Validation
5. Phase Closeout

Each workspace contains its own document list, preview, disposition selector, and Apply Disposition action. There is no separate Operator approval screen.

The workflow rule is:

```text
Find the first required logical document whose effective status is not Approved.
Open its owning workspace with that document selected.
```

`Pending`, `Rejected`, and `RevisionRequested` stop progression. `Approved` advances.

## Clean-Room Boundary

The active source must not contain:

- workflow action catalogs;
- Governance Maintenance, Repair, or Approval;
- approval queues or approval artifacts;
- target hashes or decision timelines;
- current-action authority records;
- routed IPC tokens;
- role or screen gates;
- execution-run authority;
- workflow-derived context packets;
- fallback resolvers;
- compatibility readers for the rejected architecture.

## Architect Review Outcome for WC03 Through WC07

Accepted foundation:

- WC03 clean-room source reset;
- the four-value disposition model;
- five workspace surfaces;
- real-corpus initialization;
- removal of the prior governance architecture.

WC08 repair scope:

- preserve non-disposition Markdown content during status replacement;
- use staged replacement and rollback for disposition writes;
- isolate individual document read failures;
- order phase work phase-by-phase rather than grouping all phases by workspace type.

The initialized corpus must not be rolled back or bulk-reinitialized.

## Ordered Work Cards

- WC03 — Clean-Room Application Source Reset and Minimal Workspace Shell
- WC04 — Planning Document Discovery and Disposition Reader/Writer
- WC05 — Workspace-Integrated Document Review and Disposition
- WC06 — First Non-Approved Document Resolver
- WC07 — Real-Corpus Initialization and Dogfood Validation
- WC08 — Disposition Write Safety, Local Read Isolation, and Phase Order Repair
- WC09 — Operator Validation of the Clean-Room Workflow
- WC10 — Durable Clean-Room Baseline and Development-Branch Integration
- WC11 — Phase 07 Closeout and Project Roadmap Rebaseline

## WC08 — Current Repair

WC08 is a narrow correctness repair. It may modify only the clean-room document writer, document discovery/read service, deterministic document order, directly related tests, and its Implementer Report.

WC08 may not redesign the application or mutate existing corpus dispositions.

## WC09 — Operator Validation of the Clean-Room Workflow

Purpose: perform the human acceptance checks that the Implementer was not authorized to claim.

Required validation:

- launch the application against the real ChampCity_AI repository;
- confirm startup opens Project Planning with Project Intake selected while it remains `Pending`;
- confirm all five workspaces are usable;
- confirm document list, preview, status, selector, and Apply Disposition controls are understandable;
- confirm Markdown content remains intact after a controlled disposition change on a temporary or disposable test document;
- confirm one document-local error does not disable unrelated documents;
- confirm phase progression is phase-by-phase using controlled fixtures;
- confirm refresh and restart return to the correct first non-approved document;
- confirm no legacy governance, approval, maintenance, execution-run, or separate approval screen appears.

WC09 does not authorize source changes. A failed check must be recorded and returned to the Architect for a separate bounded repair decision.

Expected result: Operator approval, rejection, or revision request for the clean-room workflow.

## WC10 — Durable Clean-Room Baseline and Development-Branch Integration

Purpose: establish the accepted clean-room application and initialized planning corpus as the durable repository baseline.

Dependencies:

- WC08 accepted by the Architect;
- WC09 approved by the Operator;
- final automated validation passes;
- explicit Operator authorization for the Git operations named in the detailed WC10 Work Card.

Required outcomes:

- review the complete intended diff;
- verify only the clean-room source, clean-room tests, initialized planning corpus, Phase 07 records, and accepted reports are included;
- exclude generated build output, temporary files, screenshots, local runtime state, and unrelated junk;
- stage the approved baseline deliberately;
- create a plain baseline commit;
- push the approved current feature branch;
- integrate the accepted baseline into `dev` through the repository's approved Git tooling;
- verify the resulting `dev` state and remote status;
- preserve Git history of the removed architecture without retaining it in active source.

WC10 must not merge to `master`, tag, release, or package the application unless the Operator separately authorizes those actions.

## WC11 — Phase 07 Closeout and Project Roadmap Rebaseline

Purpose: close Phase 07 from current reality and prepare Phase 08 planning authority.

Required outcomes:

- create the Phase 07 closeout record;
- record the accepted clean-room architecture and the removal of the failed governance architecture;
- record the final disposition and result of WC03 through WC10;
- reconcile Phase 07 Phase Planning and Work Card Plan;
- update the living Project Roadmap so Phase 07 is described as the clean-room document-disposition rebuild rather than Architect Bridge and MCP-first integration;
- update or replace stale Phase Map statements that identify Phase 03 as active or describe the obsolete phase sequence;
- identify Phase 08 as the next planned phase:

```text
Phase 08 — Operational Dogfooding, Required-Document Scope, and Revision Workflow
```

- preserve historical records as historical evidence;
- do not infer approval for Phase 08 implementation from Phase 07 closeout.

WC11 is planning and closeout work. It does not authorize Phase 08 source implementation.

## Phase Acceptance

Phase 07 is complete only when:

- WC08 passes its acceptance criteria;
- the clean-room application launches;
- every logical planning document has one valid disposition;
- Markdown and JSON pair statuses remain synchronized;
- disposition replacement preserves all non-disposition document content;
- paired writes cannot remain partially applied after an injected failure;
- one unreadable document remains a local error and does not suppress other documents;
- project-level documents precede phase work;
- each numbered phase completes Phase Planning, Work Cards, Operator Validation, and Phase Closeout before the next numbered phase begins;
- startup opens the first required non-approved document;
- no old governance, approval, maintenance, routing, or execution authority exists;
- WC09 Operator validation is approved;
- WC10 establishes the accepted baseline on `dev` under explicit Git authorization;
- WC11 closes Phase 07 and rebaselines the Project Roadmap and Phase Map;
- Phase 08 remains planned and requires separate Operator approval before execution.

## Document Disposition

Document.Status=Approved
