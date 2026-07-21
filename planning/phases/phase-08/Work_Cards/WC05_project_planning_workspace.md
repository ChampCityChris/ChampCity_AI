# Work Card — Phase 08 WC05 Project Planning Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: high
Depends on: WC01, WC02, WC03, WC04
Execution authorization: withheld until the Phase 08 Work Card sequence is complete
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC05_project_planning_workspace.md`

## Purpose

Implement Project / Planning as a complete Operator-facing workspace that hands the approved Project Intake artifacts to the embedded LLM Architect, receives the repository-backed `Project_Profile` and `Project_Roadmap`, allows each document to be reviewed independently, and applies one synchronized planning-bundle disposition to both.

Project Planning advances only when both durable planning documents carry `Approved`.

## Execution Boundary

This Work Card is approved as the fifth planned Phase 08 implementation unit, but it is not currently authorized for execution.

Do not execute it until:

1. WC01 through WC04 have been implemented and accepted;
2. a controlled project has a valid approved Project Architect Interview pair;
3. the Operator explicitly releases WC05 as the active card.

A blocked WC03 or unresolved WC04 prohibits WC05 execution.

## Source Design Decisions

Read and follow:

- `planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`
- `planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/ARCHITECT_INTERVIEW_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/PROJECT_PLANNING_WORKSPACE_DEFINITION.md`

The implemented lifecycle location is:

```text
Project / Planning
└── Project Plan and Roadmap Review
```

## Required Workspace Registration

Add one visible registry-backed workspace:

```text
id: project-planning-review
label: Project Plan and Roadmap Review
location: Project / Planning
```

Do not reuse the provisional clean-room `Project Planning` label as a separate duplicate workspace. Migrate or replace that provisional registry entry so the final navigation contains one Project / Planning workspace for this behavior.

The migration must preserve unrelated workspace definitions and document review behavior.

## Required Inputs

The workspace must resolve and display the current project's required inputs:

```text
Project Intake pair
Architect Interview Prompt pair
Approved Project Architect Interview pair
Project Planning prompt/handoff pair
```

Canonical source paths:

```text
planning/project/Project_Intake/PROJECT_INTAKE_<project-slug>.*
planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<project-slug>.*
planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_<project-slug>.*
```

Project Planning must be unavailable for handoff when the Project Architect Interview Markdown/JSON pair is missing, invalid, mismatched, or not `Approved`.

Repository reconciliation findings are not a separate required artifact. When reconciliation applied, they are carried through the approved interview document and must inform the planning outputs.

## Project Planning Prompt Generation

Generate and save the Project Planning prompt/handoff as a synchronized pair using the established convention:

```text
planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_<project-slug>.md
planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_<project-slug>.json
```

The prompt must be generated from the current approved source artifacts and must instruct the Architect to:

- read the approved Project Intake and Project Architect Interview artifacts through ChampCity MCP;
- treat verified repository findings as the baseline for an existing project;
- create or revise exactly the two canonical planning-document pairs defined below;
- keep Project Profile and Project Roadmap internally consistent;
- distinguish confirmed facts, recommendations, assumptions, risks, and unresolved decisions where relevant;
- avoid recreating abandoned or superseded project architecture as current authority;
- set each new or revised planning document to `Pending` for Operator review;
- respond to a shared revision request by revising either or both documents as consistency requires.

The prompt pair is a generated handoff artifact, not a third planning output and not an independent approval gate.

Regenerating the prompt after an approved interview changes must not silently preserve stale source context.

## Embedded Architect Handoff

Reuse the WC03/WC04 embedded browser, session-security, and MCP handoff components.

The handoff must make available to the Architect chat:

- the Project Planning prompt pair;
- the approved Project Intake pair;
- the approved Project Architect Interview pair;
- repository access through the selected ChampCity MCP workspace.

An explicit Operator confirmation is permitted. Manual prompt retyping or content reconstruction is not the primary workflow.

The application must show browser readiness and handoff readiness separately.

Do not automate remote chat submission through DOM scripting.

## Canonical Planning Outputs

The workspace must load and review these synchronized pairs:

```text
planning/project/PROJECT_PROFILE.md
planning/project/PROJECT_PROFILE.json

planning/project/Project_Roadmap/PROJECT_ROADMAP_<project-slug>.md
planning/project/Project_Roadmap/PROJECT_ROADMAP_<project-slug>.json
```

`PROJECT_PROFILE` is the durable description of what the project is, its users, purpose, verified current state where applicable, constraints, and major architectural/product boundaries.

`PROJECT_ROADMAP_<project-slug>` is the durable ordered project roadmap beginning from the verified current baseline. It must not treat an existing partially built project as greenfield.

This Work Card must not generate Phase Plans or Work Cards from the roadmap.

## Required Workspace Layout

The workspace must provide:

```text
Project Plan and Roadmap Review
├── Embedded Architect chat
└── Planning bundle review
    ├── Project Profile preview
    ├── Project Roadmap preview
    └── Shared bundle disposition controls
```

The Operator must be able to read each document independently. Tabs, a document selector, or a practical split layout are acceptable. The UI must clearly identify which document is being viewed and the current disposition of both documents.

The embedded chat and review area must remain available in the same workspace so revision discussion does not require leaving Project Planning.

## Independent Review Without Independent Approval

`Project_Profile` and `Project_Roadmap` remain separate documents and separate preview targets.

The workspace must provide a simple in-memory reviewed indication for each currently loaded document version. A document version change resets its reviewed indication.

The reviewed indication is a user-interface safeguard only. It is not persisted as lifecycle authority and is not a substitute for document disposition.

The shared disposition action must remain disabled until:

- both Markdown/JSON pairs are readable and synchronized;
- both current dispositions are compatible with review;
- the Operator has indicated review of the current version of both documents.

The application must not provide an independent Approve action for only one document.

## Shared Bundle Disposition

The Operator makes one decision for the planning bundle:

```text
Approve
Reject
Request Revision
```

The selected disposition must be written to all four output files as one coordinated operation:

```text
PROJECT_PROFILE.md
PROJECT_PROFILE.json
PROJECT_ROADMAP_<project-slug>.md
PROJECT_ROADMAP_<project-slug>.json
```

The operation must:

- stage every resulting file before replacing any target;
- preserve unrelated document content;
- write the same explicit disposition to both document pairs;
- prevent a state where only one planning document is Approved, Rejected, or RevisionRequested;
- roll back already replaced targets when a later replacement fails, or surface a truthful recoverable error if complete rollback cannot be guaranteed;
- reload all four files and verify matching dispositions before reporting success.

Do not create a separate bundle-approval artifact or hidden completion record.

## Shared Revision Request Behavior

Request Revision applies to the planning bundle even when the Operator's concern begins in one document.

The Operator must be able to enter a revision request from the same workspace. The application must save the same revision-request text into both planning document pairs and set both to `RevisionRequested` in the coordinated four-file operation.

Recommended Markdown representation in each document:

```markdown
## Operator Revision Request

<shared Operator text>

## Document Disposition

Document.Status=RevisionRequested
```

Each JSON sibling must carry the same revision-request text in a clear field.

The Architect may revise either or both documents. After revision:

- both documents must return as `Pending` before the next Operator disposition;
- previews refresh to the current repo-backed versions;
- reviewed indications reset for changed versions;
- the Operator reviews both documents again before another shared decision.

If only one revised document returns to Pending while the other remains RevisionRequested or Approved, the workspace must show an inconsistent bundle and keep shared disposition disabled until the Architect restores a coherent reviewable pair.

Do not automatically submit revision instructions to the remote chat through DOM scripting.

## Preview and Refresh Behavior

Each planning preview must support:

- missing-document waiting state;
- loading state;
- readable current content;
- explicit disposition display;
- local parse, sibling, or read errors;
- refresh after MCP writes;
- manual Refresh fallback;
- preservation of the last readable version on transient failure.

Refresh must be scoped to the canonical planning output paths rather than broad recursive repository watching.

A failure in one preview must not destroy the other readable preview or the embedded Architect session.

## Project Planning Completion Derivation

Project Planning is complete only when:

1. both canonical Markdown/JSON pairs exist and are valid;
2. each Markdown disposition matches its JSON sibling;
3. `Project_Profile` and `Project_Roadmap` both equal `Approved`;
4. no unresolved synchronized-write error is present.

The workspace must display this as a derived completion/readiness result.

Do not persist a second planning-completion flag, current lifecycle state, route token, or approval record. Do not automatically enter Project Building in WC05.

## Generated Prompt Disposition Boundary

The generated Project Planning prompt pair must use valid explicit dispositions compatible with the clean-room parser and must not become an unreviewable first-non-approved gate.

The Implementer must document and test how generated non-review handoff artifacts are treated without adding a new disposition value or hidden approval system.

## Authorized Production Scope

Expected production files may include:

```text
src/shared/projectPlanning/projectPlanning.ts
src/main/projectPlanning/projectPlanningPromptService.ts
src/main/projectPlanning/projectPlanningBundleService.ts
src/main/documents/documentDispositionWriter.ts
src/main/documents/planningDocumentService.ts
src/shared/workspaces/workspaceRegistry.ts
src/shared/documents/documentOrder.ts
src/preload/index.ts
src/renderer/app/App.tsx
src/renderer/styles.css
```

WC03/WC04 browser files may be modified only as needed to reuse the accepted Architect browser and handoff components in Project Planning.

A narrower implementation is acceptable. Any additional file must be directly required by prompt generation, canonical planning-document loading, coordinated bundle writes, or the approved review layout and must be identified in the Implementer Report.

No new dependency is authorized.

## Authorized Test Scope

Add or extend capability-oriented tests for:

- workspace-registry migration from provisional Project Planning to Project Plan and Roadmap Review;
- required-input eligibility and approved-interview gating;
- deterministic Project Planning prompt generation and regeneration;
- canonical Project Profile and Roadmap path resolution;
- separate preview behavior and local errors;
- per-version in-memory reviewed indicators;
- shared disposition disabled until both current versions are reviewed;
- successful coordinated four-file approval, rejection, and revision writes;
- rollback or recoverable error after a later-file failure;
- prevention and detection of mixed planning dispositions;
- shared revision-note synchronization;
- Project Planning completion derivation;
- generated prompt disposition treatment without resolver trapping;
- unchanged browser security and MCP handoff behavior.

Expected test files may include:

```text
test/project-planning/project-planning-workspace.test.cjs
test/documents/planning-document-service.test.cjs
test/resolver/first-non-approved-resolver.test.cjs
test/workspaces/workspace-document-review.test.cjs
test/app-shell/app-shell.test.cjs
```

Do not create a broad Phase-08-specific test island.

## Explicit Non-Goals

Do not implement:

- Phase Intake, Phase Planning, Phase Roadmap, or Phase Plan generation;
- Work Card generation or implementation handoff;
- Project Building, Validation, or Close workspaces;
- lifecycle transition engine, current lifecycle persistence, automatic routing, or hidden completion state;
- independent approval of Project Profile or Project Roadmap;
- a separate bundle-approval or reconciliation artifact;
- raw Architect chat transcript persistence;
- provider API integration, DOM automation, credential handling, or new dependencies;
- Git operations.

## Required Validation

Run:

```text
npm run typecheck
npm run build
npm test
```

No Playwright is authorized.

Perform a controlled manual Project Planning lane using the accepted embedded-browser/MCP integration and a test project whose interview pair is Approved.

## Acceptance Criteria

WC05 is acceptable only when:

1. one registry-backed `Project Plan and Roadmap Review` workspace exists at Project / Planning;
2. the provisional Project Planning registry entry is migrated or replaced without duplicate visible workspaces;
3. planning handoff is blocked until the canonical Project Architect Interview pair is valid and Approved;
4. the Project Planning prompt pair is generated deterministically from current approved source artifacts;
5. the prompt instructs the Architect to create the canonical Project Profile and Roadmap pairs and maintain consistency;
6. the accepted embedded browser and MCP handoff are reused without weakening WC03 security boundaries;
7. Project Profile and Project Roadmap are independently readable and clearly identified;
8. reviewed indications apply to current document versions only and reset after change;
9. no independent single-document approval action exists;
10. one shared decision writes the same disposition to all four output files through a coordinated staged operation;
11. partial or mixed bundle dispositions are prevented or surfaced as an inconsistent non-advancing state;
12. shared revision text is written to both document pairs and the Architect may revise either or both;
13. both revised documents must return to a coherent Pending review state before another decision;
14. Project Planning completion is derived only when both synchronized pairs equal Approved;
15. the generated prompt pair does not create an unreviewable resolver gate;
16. no Phase Planning, Work Card generation, lifecycle transition, separate approval artifact, provider API, DOM automation, dependency, or Git behavior is introduced;
17. typecheck, build, and tests pass;
18. the Implementer Report accurately records all changed files, bundle-write evidence, integration evidence, limitations, and remaining Operator validation.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- final workspace registry mapping and migration result;
- input eligibility and approved-interview gating;
- final Project Planning prompt path and generation rules;
- canonical Project Profile and Roadmap paths;
- reviewed-indicator behavior;
- coordinated four-file disposition algorithm and rollback evidence;
- mixed-state prevention/detection evidence;
- shared revision-note representation;
- Project Planning completion derivation;
- generated prompt disposition and resolver evidence;
- automated validation results;
- real controlled browser/MCP planning-lane evidence;
- confirmation that no later lifecycle, dependency, provider API, DOM automation, or Git scope was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator should validate:

1. Project Planning remains unavailable until the interview is approved;
2. the generated planning prompt and approved source artifacts reach the correct embedded Architect chat;
3. the Architect writes both canonical planning documents through MCP;
4. each document can be reviewed independently without leaving the workspace;
5. one revision request can result in updates to either or both documents;
6. mixed dispositions cannot advance or appear as complete;
7. one approval updates both document pairs and shows Project Planning complete;
8. no automatic lifecycle transition or hidden approval record is created.

## Document Disposition

Document.Status=Approved
