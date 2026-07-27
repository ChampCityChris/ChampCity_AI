<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-07",
    "workCardId": "WC05"
  },
  "sourceRevisions": [],
  "workflowData": {
    "schemaVersion": "champcity.work-card.v1",
    "workCardId": "WC05",
    "phaseId": "phase-07",
    "title": "Workspace-Integrated Document Review and Disposition",
    "status": "Approved",
    "owner": "Implementer",
    "planOrder": 5,
    "risk": "high",
    "dependencies": [
      "WC04"
    ],
    "continuousExecution": {
      "approved": true,
      "nextWorkCard": "WC06",
      "reportRequiredBeforeNext": true
    },
    "purpose": "Populate the five stage workspaces with planning documents and provide document preview plus Approve, Reject, and Request Revision controls inside the owning workspace.",
    "workspaces": [
      "Project Planning",
      "Phase Planning",
      "Work Card",
      "Operator Validation",
      "Phase Closeout"
    ],
    "requiredOutcomes": [
      "Every discovered logical document appears in exactly one workspace.",
      "Each workspace shows a document list, disposition, preview, native selector, and Apply Disposition button.",
      "Approve writes Approved, Reject writes Rejected, and Request Revision writes RevisionRequested through WC04.",
      "Phase Planning displays Phase Planning and Work Card Plan directly.",
      "Ordinary and repair Work Cards use the same workspace.",
      "Document errors remain local."
    ],
    "prohibitions": [
      "Do not add startup routing or the first-non-approved resolver.",
      "Do not initialize the real corpus.",
      "Do not create separate approval screens, approval artifacts, queues, route bindings, role gates, or maintenance UI.",
      "Do not perform Git operations."
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test",
      "npm run validate:codex:unit",
      "npm run validate:codex:build",
      "npm run validate:codex",
      "non-acceptance launch smoke check"
    ],
    "implementerReportPath": "planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC05_workspace_integrated_document_disposition.md",
    "markdownPath": "planning/phases/phase-07/Work_Cards/WC05_workspace_integrated_document_disposition.md",
    "jsonPath": "planning/phases/phase-07/Work_Cards/WC05_workspace_integrated_document_disposition.json"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 07 WC05 Workspace-Integrated Document Review and Disposition

Status: approved for continuous Implementer execution
Owner: Implementer
Plan order: 5
Dependency: WC04 completed with its Implementer Report
Risk: high
Git mutation: not authorized
Implementer Report: `planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC05_workspace_integrated_document_disposition.md`

## Purpose

Populate the five clean-room workspaces with planning documents and place review and disposition controls directly inside each workspace.

WC05 remains manually navigated. It must not implement the startup resolver or automatically choose the first non-approved document. That belongs to WC06.

## Workspace Ownership

Every discovered logical document must be visible in exactly one workspace. Classification is based only on repository-relative path and filename conventions.

### Project Planning

Include project-level planning records, including:

- Project Intake;
- Project Architect Interview material;
- Project Planning documents;
- Project Roadmap;
- Phase Map and other project-level planning records;
- project-level supporting or system documents that do not belong safely to another workspace.

Project Intake must be visibly identified as the first Project Planning document, but WC05 does not route to it automatically.

### Phase Planning

Include phase-level planning records, including:

- Phase Planning;
- Work Card Plan;
- Phase Intake and phase interview material;
- phase-level supporting and design records that are not Work Cards, validation evidence, or closeout records.

The Phase Planning workspace must display both `Phase_Planning` and `Work_Card_Plan` directly. It must not open or reference a separate Operator Phase Approval screen.

### Work Card

Include:

- ordinary Work Cards;
- repair Work Cards;
- Work Card prompts or bounded implementation instructions that belong directly to a Work Card.

Ordinary and repair Work Cards use the same workspace and controls.

### Operator Validation

Include implementation and review evidence, including:

- Implementer Reports;
- Architect Reviews;
- Validation Reports;
- Operator Validation records;
- Candidate Dispositions and related evidence records.

The workspace reviews the documents themselves. It does not create a separate approval artifact.

### Phase Closeout

Include:

- Closeout Reports;
- Phase Closeout records;
- closeout-specific Roadmap update records;
- phase completion evidence not already owned by Operator Validation.

### Archive and unclassified records

- An archived record is assigned according to its original path or filename category.
- A record that cannot be classified confidently must remain visible under an `Other planning documents` group inside Project Planning.
- No document may disappear because classification is uncertain.

## Required Workspace Layout

Each workspace must contain:

1. a document list;
2. current disposition beside each document;
3. phase or category grouping where useful;
4. selected-document title and repository-relative path;
5. readable Markdown or formatted JSON preview;
6. pair status and synchronization warning;
7. a native disposition selector containing:
   - Approve;
   - Reject;
   - Request Revision;
8. one `Apply Disposition` button;
9. clear success or error feedback.

The selector maps directly to:

```text
Approve          -> Approved
Reject           -> Rejected
Request Revision -> RevisionRequested
```

Do not expose `Pending` as an Operator disposition choice. A revised document returns to `Pending` when the person revising the file writes or restores the required Pending disposition section or field.

## Interaction Rules

- Selecting a document loads its current preview and effective disposition.
- Applying a disposition writes to that same logical document through WC04.
- After a successful write, refresh the list and preview from disk.
- `Rejected` and `RevisionRequested` remain visible and selected.
- A pair mismatch or malformed JSON disables Apply Disposition for that document and shows a local document error.
- Errors in one document do not disable other documents or replace the workspace with a maintenance screen.
- Switching workspaces or documents does not mutate any file.
- Refresh re-reads from disk.

## Direct IPC Only

Renderer actions call the WC04 preload methods directly.

No request or response may contain:

- current action;
- routed action;
- role;
- screen authorization;
- approval artifact ID;
- workflow-state revision;
- target hash;
- route token.

## UI Constraints

- Use the clean-room shell from WC03.
- Do not recreate the prior router shell, process rail, activity log, governance panels, or approval queue.
- Do not create separate Project, Phase, Work Card, Validation, or Closeout approval screens.
- Keep the layout usable at the current minimum window size.
- Use native `<select>` controls.
- Show repository-relative paths, not concrete local machine paths.
- Do not add content editing; preview and disposition are the only document actions in this Work Card.

## Tests

Create or extend tests under:

```text
test/workspaces/
```

Tests must use temporary repositories and prove:

1. every fixture logical document appears in exactly one workspace;
2. Project Intake appears in Project Planning;
3. Phase Planning and Work Card Plan appear in Phase Planning;
4. ordinary and repair Work Cards appear in Work Card;
5. Implementer Report and validation evidence appear in Operator Validation;
6. closeout records appear in Phase Closeout;
7. unclassified records remain visible in Project Planning;
8. archived documents remain visible;
9. document list shows effective disposition;
10. preview loads selected Markdown or JSON;
11. Approve writes `Approved` to the selected document only;
12. Reject writes `Rejected` and keeps the document selected;
13. Request Revision writes `RevisionRequested` and keeps the document selected;
14. pair mismatch and malformed JSON are local errors;
15. one document error does not block another document;
16. no approval artifact or extra file is created;
17. no separate approval destination or legacy governance label exists;
18. direct manual workspace use works without a resolver.

A bounded renderer smoke test may be used. Do not install or use Playwright.

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

Run a non-acceptance launch smoke check and confirm:

- all five workspaces open manually;
- each workspace shows its fixture or selected-repository documents;
- preview and disposition controls are visible;
- no separate approval screen exists.

Do not initialize the real corpus and do not claim startup routing.

## Implementer Report Requirements

Create the WC05 report before reading WC06. Include:

- exact workspace classification rules;
- source and test files changed;
- renderer and IPC evidence;
- screenshots or bounded smoke observations when available;
- every test result;
- confirmation that no real-corpus initialization occurred;
- confirmation that no resolver or automatic startup selection was added;
- confirmation that no Git operation occurred.

## Acceptance Criteria

WC05 passes only when:

1. every discovered logical document is visible in one workspace;
2. all five workspaces show list, status, preview, selector, and Apply Disposition;
3. the three Operator choices write the correct four-value status;
4. writes affect only the selected logical document;
5. pair and malformed-file errors remain local;
6. no separate approval screen, queue, artifact, or governance route exists;
7. manual workspace navigation works without a resolver;
8. the real corpus remains uninitialized;
9. automated validation passes;
10. the WC05 Implementer Report exists.

After the WC05 report is complete, immediately read and implement WC06. Do not wait for another approval.
