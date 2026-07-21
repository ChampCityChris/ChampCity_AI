# Work Card — Phase 08 WC04 Architect Interview Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium-high
Depends on: WC01, WC02, WC03
Execution authorization: withheld until the Phase 08 Work Card sequence is complete
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC04_architect_interview_workspace.md`

## Purpose

Complete the Project / Intake Architect Interview workspace by combining the validated WC03 embedded Architect browser and MCP handoff with a repository-backed interview-document preview, revision loop, and Operator disposition controls.

The chat conducts the interview. The durable Project Architect Interview document is the reviewable record and the source of Project Intake completion.

## Execution Boundary

This Work Card is approved as the fourth planned Phase 08 implementation unit, but it is not currently authorized for execution.

Do not execute it until:

1. WC01, WC02, and WC03 have been implemented and accepted;
2. WC03 has proved a real embedded Architect surface and real MCP write-back;
3. the Operator explicitly releases WC04 as the active card.

A blocked or unresolved WC03 prohibits WC04 execution.

## Source Design Decisions

Read and follow:

- `planning/project/Design_Documents/ARCHITECT_INTERVIEW_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md`

The completed workspace remains the WC03 registry entry:

```text
id: architect-interview
label: Architect Interview
location: Project / Intake
order: after Project Intake Capture
```

Do not add a separate interview-review or interview-approval workspace.

## Required Dual-Pane Layout

The workspace must present:

```text
Architect Interview Workspace
├── Embedded Architect chat
└── Project Architect Interview document preview and disposition
```

The panes must be usable simultaneously on the supported desktop viewport. A resize control or practical responsive behavior is permitted, but the default layout must not require the Operator to leave the workspace to alternate between chat and document review.

### Architect Chat Pane

Reuse the browser, session, navigation, and MCP handoff foundation accepted in WC03.

The pane must provide visible controls or status for:

- Architect surface readiness;
- current Project Intake and prompt handoff availability;
- initiating or repeating the approved handoff;
- opening the source artifact locations in the application where supported;
- focusing the chat after an Operator revision request.

Do not add DOM automation or automatic message submission.

### Interview Document Pane

The pane must load the canonical synchronized pair:

```text
planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_<project-slug>.md
planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_<project-slug>.json
```

The project slug must match WC02.

The pane must show distinct local states:

```text
Waiting for Architect document
Loading
Ready for review
Revision requested
Approved
Rejected
Read or synchronization error
```

A missing interview document is a normal waiting state, not a fatal application error.

## Architect Prompt Contract

The WC02 Architect Interview Prompt must direct the Architect to write the canonical interview pair at the path above.

The final interview content must be sufficient for later Project Planning and should distinguish:

- confirmed Operator facts;
- verified repository findings when reconciliation applies;
- Architect recommendations;
- unresolved questions or assumptions that must remain visible.

The Work Card does not prescribe a long mandatory interview template. The prompt and resulting document must remain appropriate to the project type and Operator answers.

Each Architect-created or revised interview pair must use a valid explicit clean-room disposition. A new or revised draft returns as `Pending` until the Operator dispositions it.

## Repository-Backed Refresh

The preview must refresh when the Architect creates or revises the interview pair through ChampCity MCP.

The implementation may use a bounded file-change notification, polling, or document-service refresh mechanism compatible with the current architecture. It must also provide an explicit manual Refresh action as a reliable fallback.

Refresh behavior must:

- reload both siblings together;
- surface sibling mismatch or parse failure locally;
- avoid replacing the last readable preview with an empty view on transient read failure;
- reset any in-memory reviewed indicator when the underlying document version changes;
- avoid broad recursive filesystem watching outside the selected project artifact scope.

## Operator Review Actions

The document pane must support the existing four dispositions:

```text
Pending
Approved
Rejected
RevisionRequested
```

Operator actions:

- Approve;
- Reject;
- Request Revision.

The disposition must be written to the interview Markdown/JSON pair through the existing safe pair-write boundary. The application must not create a separate approval artifact or hidden approval record.

Approval and rejection require an explicit confirmation action.

## Revision Request Behavior

Request Revision must be available from the same dual-pane workspace.

The Operator must be able to enter a concise revision request. The application must write that request into the same interview artifact pair as durable review context and set both siblings to `RevisionRequested` in one coordinated operation.

Recommended representation:

```markdown
## Operator Revision Request

<Operator text>

## Document Disposition

Document.Status=RevisionRequested
```

The synchronized JSON must carry the same revision-request text in a clear field.

After the write succeeds:

- the preview shows the RevisionRequested state and note;
- the Architect chat pane is focused or made prominent so the Operator may continue the conversation;
- the Architect may revise the interview document through MCP;
- the revised pair returns with `Document.Status=Pending` and refreshed content;
- the Operator may repeat the loop until approval.

Do not automatically submit the revision text into the remote chat through DOM scripting.

## Project Intake Completion Derivation

The workspace must display Project Intake as complete only when:

1. the WC02 Project Intake pair exists and is valid;
2. the WC02 Architect Interview Prompt pair exists and is valid;
3. the canonical Project Architect Interview pair exists and is valid;
4. the interview Markdown and JSON dispositions both equal `Approved`.

This is a derived display condition, not a new persisted lifecycle state.

Do not automatically transition, persist a current lifecycle location, or silently navigate to Project Planning in WC04.

## Safe Document Behavior

Disposition and revision writes must:

- stage both sibling updates before commit;
- preserve unrelated interview content;
- avoid partial pair success;
- roll back or surface an explicit recoverable error when the second write fails;
- prevent approval when Markdown/JSON content or disposition is inconsistent;
- keep errors local to the interview document pane.

The browser session must remain usable if the interview document is missing or unreadable.

## Authorized Production Scope

Expected production files may include:

```text
src/main/documents/documentDispositionWriter.ts
src/main/documents/planningDocumentService.ts
src/main/projectIntake/architectInterviewDocumentService.ts
src/shared/documents/planningDocument.ts
src/shared/workspaces/workspaceRegistry.ts
src/preload/index.ts
src/renderer/app/App.tsx
src/renderer/styles.css
```

WC03 browser files may be modified only as needed to integrate the accepted browser/handoff component into the completed dual-pane workspace.

A narrower implementation is acceptable. Any additional file must be directly required by canonical interview loading, synchronized revision/disposition writes, or dual-pane presentation and must be identified in the Implementer Report.

## Authorized Test Scope

Add or extend tests for:

- canonical interview artifact path resolution;
- missing-document waiting state;
- synchronized pair load and refresh;
- local sibling mismatch and read errors;
- approval, rejection, and revision-request pair writes;
- durable revision-request text synchronization;
- rollback on second-sibling write failure;
- in-memory reviewed-state reset after document version change;
- Project Intake completion derivation;
- unchanged WC03 browser security and handoff behavior.

Expected test files may include:

```text
test/project-intake/architect-interview-workspace.test.cjs
test/documents/planning-document-service.test.cjs
test/workspaces/workspace-document-review.test.cjs
test/app-shell/app-shell.test.cjs
```

Do not use mocked external-browser content as proof that WC03 integration still works. Reuse the accepted WC03 manual validation lane for external capability.

## Explicit Non-Goals

Do not implement:

- Project Planning prompt generation or planning-document review;
- `Project_Profile` or `Project_Roadmap` generation;
- synchronized disposition across multiple planning documents;
- lifecycle transition engine, current lifecycle storage, automatic routing, or persisted stage completion;
- a separate approval or revision artifact;
- raw chat transcript persistence;
- automatic remote-chat message submission;
- provider API integration or new dependencies;
- Git operations.

## Required Validation

Run:

```text
npm run typecheck
npm run build
npm test
```

No Playwright is authorized.

Perform a controlled manual dual-pane validation using a test project and the accepted WC03 integration path.

## Acceptance Criteria

WC04 is acceptable only when:

1. the existing registry-backed `Architect Interview` workspace is completed rather than duplicated;
2. the embedded Architect chat and interview preview are visible and usable in one workspace;
3. the workspace loads the canonical Project Architect Interview Markdown/JSON pair using the WC02 slug;
4. a missing interview document produces a clear waiting state;
5. the preview refreshes after MCP create/revision and includes an explicit manual Refresh fallback;
6. transient document errors remain local and do not destroy the last readable preview or browser session;
7. Approve, Reject, and Request Revision write synchronized dispositions through the safe pair boundary;
8. Request Revision saves the Operator note in both siblings without a separate artifact;
9. revised Architect output returns as Pending and can be reviewed repeatedly;
10. mismatched or partially unreadable siblings cannot be approved;
11. Project Intake completion is derived only from valid required artifacts and Approved interview siblings;
12. no hidden lifecycle state, automatic transition, separate approval artifact, chat transcript store, DOM automation, API integration, dependency, or Git behavior is introduced;
13. typecheck, build, and tests pass;
14. the Implementer Report records changed files, canonical paths, pair-write evidence, error behavior, and remaining Operator manual validation.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- final dual-pane layout and component boundaries;
- canonical interview artifact paths;
- preview refresh mechanism and fallback;
- revision-note Markdown/JSON representation;
- pair-write, rollback, and mismatch evidence;
- Project Intake completion derivation;
- automated validation results;
- confirmation that WC03 security boundaries remain intact;
- confirmation that no Project Planning, lifecycle transition, dependency, or Git scope was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator should validate:

1. the chat and document preview can be used side by side;
2. a real MCP-written interview document appears and refreshes;
3. revision text is saved, visible, and usable by the Architect;
4. an Architect revision returns for another review cycle;
5. approval updates both siblings and displays Project Intake as complete;
6. no automatic navigation or hidden workflow decision occurs.

## Document Disposition

Document.Status=Approved
