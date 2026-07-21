# Work Card — Phase 08 WC07 Phase Interview Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium
Execution authorization: withheld until the Phase 08 Work Card sequence is complete
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC07_phase_interview_workspace.md`

## Purpose

Implement the Phase / Intake Phase Interview workspace for the first incomplete phase selected from the Approved Phase Map.

The workspace allows the embedded Architect to review the complete phase context, conduct guided clarification with the Operator when needed, and create the durable repository-backed `Phase_Interview` document that completes Phase Intake after Operator approval.

## Execution Boundary

This Work Card is approved as the seventh planned Phase 08 implementation unit, but it is not authorized for execution.

Do not execute WC07 until WC06 is accepted and the Operator explicitly releases WC07.

## Source Design

Read and follow:

- `planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`
- `planning/project/Design_Documents/PHASE_MAP_PHASE_INTAKE_AND_PHASE_PLANNING_WORKSPACE_DEFINITION.md`
- accepted WC03 embedded browser and MCP integration evidence

The required lifecycle location is:

```text
Phase / Intake
└── Phase Interview Workspace
```

## Required Phase Context

The workspace must use the selected phase record derived by WC06 and repository-backed sources:

- Approved `Project_Profile`.
- Approved `Project_Roadmap`.
- Approved `Phase_Map` and selected phase record.
- Approved prior phase closeout, when the selected phase has a predecessor.
- Relevant project risks, constraints, decisions, and repository evidence.
- A generated Phase Interview Architect handoff saved in the repository.

The source bundle must use repository-relative paths and must not rely on hidden browser conversation history.

## Required Workspace Experience

Implement a dual-pane Phase / Intake workspace:

```text
Embedded Architect browser | Phase_Interview preview and disposition
```

The workspace must:

1. generate or refresh a phase-specific Architect handoff from the selected phase context;
2. use the embedded browser and MCP handoff capability accepted in WC03;
3. show the current repository-backed `Phase_Interview` Markdown document;
4. refresh the preview after the Architect writes or revises the artifact pair;
5. support `Approved`, `Rejected`, and `RevisionRequested` dispositions;
6. allow Operator revision notes from the same workspace;
7. preserve the paired Markdown/JSON artifact contract;
8. display local read or parse errors without crashing the complete application.

## Phase Interview Artifact Contract

The canonical output for the selected phase is:

```text
planning/phases/<phase-id>/Phase_Interview.md
planning/phases/<phase-id>/Phase_Interview.json
```

The pair represents one logical document and must remain disposition-synchronized.

The final interview document must record:

- selected phase identity and title;
- project and Phase Map sources reviewed;
- prior phase closeout context when applicable;
- Operator clarification questions and answers when questions were required;
- Architect recommendations or assumptions accepted during the interview;
- phase-specific constraints, dependencies, risks, and expected outcome;
- repository-relative evidence references where useful;
- whether additional clarification was required.

## No-Questions Path

`Phase_Interview` always exists.

When the Architect determines that the available context is sufficient and no Operator questions are required, the Architect must still write the interview document. It must state that the required context was reviewed and no additional clarification was necessary.

The application must not skip Phase Intake merely because no questions were asked.

## Review and Revision

When the Architect indicates that the interview document is ready:

- the Operator reviews the repository document from the preview pane;
- the Operator may approve, reject, or request revision;
- a revision request returns the issue to the same embedded Architect session or a resumed supported session;
- the Architect revises the repository-backed artifact pair;
- the Operator refreshes and reviews the new version.

The chat session does not carry approval authority. The final disposition on `Phase_Interview` is the durable evidence.

## Completion Rule

Phase Intake is complete only when:

1. the selected phase came from an Approved Phase Map;
2. the Phase Interview handoff was generated;
3. the Architect reviewed the required phase context;
4. the paired `Phase_Interview` artifact exists and is readable;
5. the Operator marked the interview `Approved`.

After approval, the workspace may expose a visible `Continue to Phase Planning` action. WC07 must not implement the Phase Planning document bundle itself.

## Registry and Navigation Integration

Register the workspace through the WC01 extensible registry at:

```text
level: phase
stage: intake
```

The workspace must receive the selected phase identity explicitly from the approved Phase Map derivation. It must not use a global hidden active-phase variable.

## Authorized Production Scope

Create or modify only the files needed for:

- phase-context assembly;
- Phase Interview handoff generation;
- Phase Interview loading and parsing;
- registry-backed Phase / Intake workspace registration;
- dual-pane renderer UI;
- safe disposition and revision-note writes through main/preload IPC.

Expected areas may include:

```text
src/shared/workspaces/
src/shared/documents/
src/main/documents/
src/main/main.ts
src/preload/index.ts
src/renderer/app/App.tsx
```

A narrower implementation is acceptable. Do not restore legacy workflow router or context-packet authority.

## Authorized Test Scope

Add or modify capability-oriented tests for:

- selected-phase context assembly;
- required source validation;
- no-questions interview behavior;
- paired artifact loading and disposition;
- revision request and refresh behavior;
- registry entry;
- local error containment;
- unchanged Project and Phase Map workspace behavior.

## Explicit Non-Goals

Do not implement:

- Phase Planning document generation;
- Work Card Plan generation;
- Formal Work Card creation;
- Work Card lifecycle behavior;
- Phase Building, Validation, or Close;
- Project Validation or Close;
- a separate Phase Intake approval artifact;
- hidden active-phase or current-stage state;
- route tokens, role gates, approval queues, hashes, or execution runs;
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

WC07 is acceptable only when:

1. a registry-backed Phase / Intake Phase Interview workspace exists;
2. the selected phase is supplied from the Approved Phase Map derivation;
3. the phase-specific Architect handoff is saved in the repository;
4. the handoff includes the required project, map, prior-closeout, risk, constraint, decision, and repository context that exists;
5. the accepted embedded Architect/MCP path can receive the handoff;
6. the Architect can write or revise the paired Phase Interview artifacts;
7. the Operator can preview and disposition the document in the same workspace;
8. the no-questions path still creates a complete Phase Interview document;
9. Phase Intake completes only when the interview is Approved;
10. no hidden active-phase state or separate approval artifact is introduced;
11. no Phase Planning or Work Card implementation is included;
12. earlier workspaces remain behaviorally unchanged;
13. typecheck, build, and tests pass;
14. the Implementer Report accurately records the evidence;
15. no Git mutation occurs.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- final selected-phase context contract;
- handoff artifact path and contents summary;
- Phase Interview artifact contract;
- no-questions-path evidence;
- real MCP handoff and write-back evidence;
- disposition and revision evidence;
- validation commands and results;
- confirmation that no Phase Planning, hidden state, approval artifact, dependency, or Git operation was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator should confirm that the selected phase context reaches the embedded Architect, the interview can be conducted or explicitly waived by the Architect, the saved interview can be revised and approved, and Phase Intake does not complete before approval.

## Document Disposition

Document.Status=Approved
