# Work Card — Phase 08 WC09 Phase Building Work Card Candidate Selection and Intake Context

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium
Execution authorization: withheld until the Phase 08 Work Card sequence is complete
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC09_phase_building_work_card_candidate_selection_and_intake_context.md`

## Purpose

Implement the Phase / Building workspace that reads an Approved `Work_Card_Plan`, derives the first eligible incomplete candidate from repository evidence, and assembles the repository-backed Architect handoff for Work Card Intake.

WC09 does not create a Formal Work Card or authorize implementation.

## Execution Boundary

WC09 is approved as the ninth planned Phase 08 implementation unit, but it is not authorized for execution.

Do not execute WC09 until WC08 is accepted and the Operator explicitly releases WC09.

## Source Design

Read and follow:

- `planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`
- `planning/project/Design_Documents/PHASE_MAP_PHASE_INTAKE_AND_PHASE_PLANNING_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md`

Required lifecycle locations:

```text
Phase / Building
└── Work Card Candidate Selection

Work Card / Intake
└── Architect context and handoff generation
```

## Candidate Source and Ordering

The only normal source of candidate order is the Approved phase `Work_Card_Plan`.

The workspace must parse candidate entries with stable IDs, order, title, purpose, dependencies, and any explicit planning disposition such as deferred, superseded, or already satisfied.

The application must not generate every Formal Work Card in advance.

## Candidate Completion Rule

A candidate is complete only when repository evidence shows:

1. a corresponding Formal Work Card exists and is Approved;
2. the latest required Implementer Report review is Approved; and
3. an Approved `Validation_Record` exists after the latest repair associated with the parent Work Card.

A candidate is eligible when:

- it is not complete;
- it is not explicitly deferred, superseded, or satisfied;
- every declared predecessor candidate is complete.

The first eligible candidate in the approved plan order is selected.

If no candidate is eligible, the workspace must show a local explanatory state identifying whether:

- all candidates are complete;
- dependencies are incomplete;
- the plan is invalid or unreadable; or
- remaining candidates are deferred, superseded, or satisfied.

No hidden candidate queue, active-card database field, route token, execution run, or timestamp ordering may determine selection.

## Required Intake Context

For the selected candidate, assemble a bounded Architect handoff from:

- selected candidate ID, title, purpose, order, dependencies, and expected outcome;
- Approved `Project_Profile`;
- Approved `Project_Roadmap`;
- Approved `Phase_Map` and selected phase record;
- Approved `Phase_Interview`;
- Approved `Phase_Planning`;
- Approved `Work_Card_Plan`;
- applicable prior Work Card validation and repair evidence;
- repository-relative facts, constraints, risks, decisions, and protected boundaries relevant to the candidate.

The handoff must instruct the Architect to create one complete Formal Work Card rather than implementation code.

## Architect Handoff Artifact

Save a synchronized repository-backed Architect handoff pair using a deterministic candidate-scoped name under the selected phase planning corpus.

The exact final filename may follow the existing project artifact naming helper, but it must be visibly associated with:

```text
phase ID
candidate Work Card ID
Work Card Intake
```

The handoff must remain `Pending` until consumed or explicitly dispositioned by the later Work Card Planning workflow.

## Required Workspace Experience

Register a Phase / Building workspace through the WC01 workspace registry.

The workspace must show:

- selected phase identity;
- Approved Work Card Plan source;
- candidate list in approved order;
- completion or blocking evidence for each candidate;
- first eligible candidate;
- generated Work Card Intake handoff preview;
- a visible action to continue to Work Card / Planning.

The Operator must be able to understand why a candidate was selected without reading raw JSON.

## Authorized Production Scope

Create or modify only the files required for:

- Work Card Plan candidate parsing;
- repository-evidence completion evaluation;
- dependency evaluation;
- candidate selection;
- Work Card Intake context assembly and handoff writes;
- registry-backed Phase / Building workspace UI;
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

- deterministic candidate ordering;
- completed-candidate detection from Approved Validation Records;
- dependency blocking;
- deferred, superseded, and satisfied candidate exclusion;
- first eligible candidate selection;
- no-eligible-candidate explanations;
- handoff content and deterministic path;
- registry entry and unchanged earlier workspace behavior;
- malformed document error containment.

## Explicit Non-Goals

Do not implement:

- Formal Work Card creation or disposition;
- Implementer handoff;
- Implementer Report capture or review;
- repair card generation;
- Operator validation;
- Work Card close or Phase Validation;
- hidden active-card state or current-action routing;
- automatic materialization of all Work Cards;
- separate candidate queue artifacts;
- provider APIs, browser DOM automation, or credential extraction;
- dependency changes;
- Git operations.

## Required Validation

When execution is authorized, run:

```text
npm run typecheck
npm run build
npm test
```

Do not use Playwright.

## Acceptance Criteria

WC09 is acceptable only when:

1. a registry-backed Phase / Building candidate-selection workspace exists;
2. candidate order comes only from an Approved `Work_Card_Plan`;
3. completion is derived from explicit Formal Work Card, Implementer Report, and Approved Validation Record evidence;
4. dependencies are evaluated deterministically;
5. deferred, superseded, and satisfied candidates are excluded;
6. the first eligible candidate is selected without hidden state;
7. the Operator can see why each candidate is complete, blocked, or eligible;
8. the selected candidate context is assembled from approved project and phase documents;
9. one repository-backed Work Card Intake handoff pair is created;
10. no Formal Work Card or implementation authority is created;
11. earlier workspaces remain behaviorally unchanged;
12. typecheck, build, and tests pass;
13. the Implementer Report accurately records evidence;
14. no Git mutation occurs.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- final candidate parser and completion rules;
- dependency and selection evidence;
- handoff contract and example repository-relative output path;
- error-containment evidence;
- validation commands and results;
- confirmation that no Formal Work Card, hidden state, dependency, or Git operation was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator should confirm that the approved Work Card Plan is shown in order, the correct first eligible candidate is explained and selected, and the generated handoff contains the expected approved context without creating a Formal Work Card.

## Document Disposition

Document.Status=Approved
