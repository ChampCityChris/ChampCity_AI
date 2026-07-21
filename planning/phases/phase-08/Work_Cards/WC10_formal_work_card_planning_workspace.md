# Work Card — Phase 08 WC10 Formal Work Card Planning Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium
Execution authorization: withheld until the Phase 08 Work Card sequence is complete
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC10_formal_work_card_planning_workspace.md`

## Purpose

Implement the Work Card / Planning workspace that hands the WC09 candidate context to the embedded Architect, produces one complete repository-backed Formal Work Card, and allows the Operator to review, revise, and approve that Work Card before implementation.

The Approved Formal Work Card is the Implementer instruction. WC10 must not create a separate Implementer Execution Packet.

## Execution Boundary

WC10 is approved as the tenth planned Phase 08 implementation unit, but it is not authorized for execution.

Do not execute WC10 until WC09 is accepted and the Operator explicitly releases WC10.

## Source Design

Read and follow:

- `planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`
- `planning/project/Design_Documents/WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md`
- accepted WC03 embedded browser and MCP integration evidence
- accepted WC09 candidate-selection and Intake handoff evidence

Required lifecycle location:

```text
Work Card / Planning
└── Formal Work Card Planning Workspace
```

## Required Workspace Experience

Use the established dual-pane pattern:

```text
Embedded Architect browser | Formal Work Card preview and disposition
```

The workspace must:

1. load the selected candidate and repository-backed WC09 Architect handoff;
2. provide the handoff and approved source documents to the embedded Architect through the accepted MCP path;
3. load the Formal Work Card Markdown/JSON pair written by the Architect;
4. preview the current Formal Work Card without leaving the workspace;
5. refresh after Architect revisions;
6. allow the Operator to apply `Approved`, `Rejected`, or `RevisionRequested` directly to the Formal Work Card;
7. preserve content while replacing only the canonical disposition;
8. contain local read, parse, and write errors without crashing the application.

## Formal Work Card Artifact Contract

Create one synchronized pair under:

```text
planning/phases/<phase-id>/Work_Cards/<work-card-id>_<slug>.md
planning/phases/<phase-id>/Work_Cards/<work-card-id>_<slug>.json
```

The Work Card ID must match the stable candidate ID from the Approved `Work_Card_Plan`.

The pair is one logical document and must use the clean-room disposition contract.

## Required Work Card Content

The Formal Work Card must contain:

1. metadata, Work Card ID, phase ID, title, owner, risk, execution boundary, and report path;
2. purpose and expected outcome;
3. source-candidate and approved-context references;
4. implementation scope;
5. explicit out-of-scope boundary;
6. dependencies, risks, constraints, and protected areas;
7. authorized production scope;
8. authorized test scope;
9. acceptance criteria;
10. validation expectations;
11. Implementer instructions and required validation lane;
12. required Implementer Report format;
13. Manual Validation After Architect Review;
14. terminal Document Disposition section.

The application may validate required structure and show missing-section warnings. It must not fabricate the Architect's substantive implementation design.

## Revision and Approval

A revision request is written directly to the Work Card. The Operator may provide revision notes in the workspace and continue the embedded Architect conversation.

The Architect may revise any affected Work Card section. The refreshed repository document returns for Operator review.

Only `Document.Status=Approved` makes the Formal Work Card eligible for Work Card Building.

`Rejected` does not mark the candidate complete. It leaves the candidate unresolved for later planning disposition.

## Implementer Instruction Boundary

The Approved Formal Work Card is the complete Implementer instruction.

WC10 must not create or require:

- an Implementer Execution Packet;
- a second prompt artifact that overrides the Work Card;
- a hidden release token;
- a hash gate;
- an execution-run record.

The later Building workspace may provide a convenience handoff view, but it must hand off this exact Approved Work Card.

## Registry and Navigation Integration

Register the workspace through the WC01 registry at:

```text
level: workCard
stage: planning
```

The selected Work Card identity must come from WC09 repository evidence. Do not create hidden global active-card state.

## Authorized Production Scope

Create or modify only files required for:

- Formal Work Card structure validation;
- Work Card pair loading and parsing;
- embedded Architect/MCP handoff reuse;
- registry-backed Work Card / Planning workspace UI;
- direct Work Card disposition and revision notes;
- local failure containment.

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

- candidate-ID/path consistency;
- required Work Card section validation;
- preview and refresh behavior;
- disposition replacement without content loss;
- revision-note persistence or delivery;
- Approved-only Building eligibility;
- registry entry;
- local error containment;
- unchanged earlier workspace behavior.

## Explicit Non-Goals

Do not implement:

- source-code implementation;
- Implementer integration or report capture;
- Implementer Report review;
- repair card generation;
- Operator validation or Validation Records;
- Work Card Close or next-candidate progression;
- automatic generation of later Formal Work Cards;
- Implementer Execution Packets;
- hidden release or active-card state;
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

Manual validation must use the real embedded Architect and MCP path accepted in WC03. Do not use Playwright.

## Acceptance Criteria

WC10 is acceptable only when:

1. a registry-backed Work Card / Planning workspace exists;
2. the WC09 candidate context is provided to the embedded Architect;
3. one candidate-scoped Formal Work Card pair can be created and refreshed;
4. the Formal Work Card ID matches the selected approved-plan candidate;
5. required structure is validated without fabricating content;
6. the Operator can preview and disposition the Work Card in the same workspace;
7. revision requests return the document to the Architect and preserve repository history/content;
8. only an Approved Work Card is eligible for Building;
9. the Approved Work Card itself is the Implementer instruction;
10. no separate execution packet, release token, hash gate, or execution run is created;
11. earlier workspaces remain behaviorally unchanged;
12. typecheck, build, and tests pass;
13. the Implementer Report accurately records evidence;
14. no Git mutation occurs.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- final Formal Work Card artifact and structure contract;
- candidate-ID/path validation evidence;
- real MCP handoff and write-back evidence;
- revision and disposition evidence;
- confirmation that the Work Card is the sole Implementer instruction;
- validation commands and results;
- confirmation that no execution packet, hidden state, dependency, or Git operation was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator should confirm that the selected candidate becomes one complete Formal Work Card, revisions occur in the same dual-pane workspace, and approval makes that exact document ready for handoff without creating another packet.

## Document Disposition

Document.Status=Approved
