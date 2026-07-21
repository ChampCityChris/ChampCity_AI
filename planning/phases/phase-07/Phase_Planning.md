# Phase 07 — Simple Document Disposition and Workspace-Integrated Approval

Status: pending Operator approval through ChatGPT
Planning revision: 3
Planning mode: off-application bootstrap phase
Project: ChampCity A/I
Date revised: 2026-07-21

## Revision 3 Reset

Revision 3 replaces the historical-corpus inventory, semantic duplicate analysis, decision-artifact, and separate approval-workspace approach.

The required system is intentionally simple:

1. Every logical document under `planning/` has one disposition status.
2. A missing status is treated as `Pending`.
3. The application finds the first required document that is not `Approved`.
4. The existing stage workspace displays that document and includes the disposition control.
5. The Operator selects Approve, Reject, or Request Revision.
6. The application writes the result back to that same document and recalculates the next required document.

WC02 Historical Corpus Inventory and Duplicate Resolution Manifest is rejected. No WC02 repair will be authored. Its generated inventory is not a prerequisite for this phase.

The WC01 implementation and repairs are transitional work. They may remain in the working tree until an approved cleanup Work Card removes or replaces conflicting architecture, but they do not define the final Phase 07 design where they conflict with this revision.

No Git staging, commit, push, reset, clean, stash, merge, tag, release, or history rewrite is authorized by this plan.

## Phase Goal

Create a direct Operator disposition loop for the project’s planning documents.

The final application must:

- store one explicit status on each logical planning document;
- treat Markdown and JSON representations of the same document as one review target;
- place approval controls inside the existing Project Planning, Phase Planning, Work Card, Operator Validation, and Phase Closeout workspaces;
- stop at the first required document whose status is not `Approved`;
- allow the Operator to approve, reject, or request revision without navigating to a separate approval screen;
- persist the selected status to the same document;
- resume at the correct document after refresh or restart.

## Document Disposition Contract

### Allowed statuses

The only document disposition values are:

```text
Pending
Approved
Rejected
RevisionRequested
```

These values are document state, not a separate approval artifact or workflow authority record.

### Markdown representation

Every Markdown document under `planning/` must end with one uniquely named section:

```markdown
## Document Disposition

Document.Status=Pending
```

The section must appear exactly once.

### JSON representation

A JSON representation of the same logical document must contain:

```json
{
  "documentDisposition": {
    "status": "Pending"
  }
}
```

The field must appear exactly once at the document root.

### Pair behavior

A same-stem Markdown/JSON pair is one logical document.

- Both representations carry the same status.
- A status save updates both representations through the existing synchronized pair writer where applicable.
- A mismatch is a local error for that document.
- A mismatch must not create a second approval target.
- A missing field or missing Markdown section is interpreted as `Pending` until initialization writes it.

### Status transitions

The Operator controls these transitions:

```text
Approve          -> Approved
Reject           -> Rejected
Request Revision -> RevisionRequested
```

When a document is revised after `RevisionRequested`, saving the revised content returns the document to `Pending` for another Operator review.

`Rejected` and `RevisionRequested` do not advance workflow. `Approved` advances to the next required document.

No separate reason, decision timeline, target-set hash, approval artifact, authorization Boolean, or historical decision class is required for this phase.

## Planning Corpus Initialization

The initialization pass applies the disposition field to every logical `.md` or `.json` document recursively under:

```text
planning/
```

Rules:

- A same-stem Markdown/JSON pair receives one synchronized status.
- A standalone Markdown or JSON document receives its own status.
- An existing valid disposition is preserved.
- A missing or invalid disposition is initialized to `Pending`.
- Initialization does not approve any document.
- Initialization does not infer approval from old approval records, validation records, status fields, timestamps, filenames, or prior workflow metadata.
- Initialization does not merge, rename, move, archive, or delete files.
- The exact file and logical-document counts are measured during implementation rather than hard-coded.

All current, historical, archived, supporting, evidence, and system documents under `planning/` receive a disposition field. Whether a document blocks a specific stage is determined by the document-order projection, not by inventing a second approval system.

## Workspace-Integrated Disposition

There is no separate Operator review screen.

Each existing stage workspace owns review and disposition for the documents belonging to that stage.

### Required workspace layout

Each stage workspace must provide:

- an ordered document list with current status;
- a readable preview of the selected document;
- clear indication of the first non-approved document;
- a disposition selector with:
  - Approve;
  - Reject;
  - Request Revision;
- one Apply Disposition action;
- immediate refresh of the document status and next required document after save.

The control must write to the document shown in that workspace. It must not open another approval destination or create an approval artifact.

### Project Planning workspace

The Project Planning workspace begins with Project Intake and then presents the remaining Project Planning documents in deterministic order.

If Project Intake is not `Approved`, the application stops there and opens Project Planning with Project Intake selected.

### Phase Planning workspace

The Phase Planning workspace must display the Phase Planning documents directly, including Phase Planning and Work Card Plan.

The workspace shown in the supplied screenshot must be converted from a supporting/reference screen into the place where the Operator reviews the phase documents and selects the disposition. It must not route the Operator to a separate `Operator Phase Approval` screen.

### Work Card workspace

The Work Card workspace displays the exact Work Card and its status. Ordinary and repair Work Cards use the same disposition control.

### Operator Validation workspace

The Operator Validation workspace displays the implementation evidence associated with the Work Card, including the Implementer Report, Architect Review, and other validation evidence. Each document carries its own disposition status.

### Phase Closeout workspace

The Phase Closeout workspace displays the closeout documents and updated Roadmap records that must be approved before progression.

## Deterministic Document Order

The resolver must use repository-derived order, not a manually authoritative workflow-state snapshot.

The high-level stage order is:

```text
Project Planning
-> Phase Planning
-> Work Card
-> Operator Validation
-> Phase Closeout
-> Next Phase
```

Within that order:

- Project Intake is the first Project Planning document.
- Project Planning documents follow the existing project planning and roadmap relationships.
- Phases follow Project Roadmap order.
- Phase Planning precedes Work Card Plan.
- Work Cards follow Work Card Plan order.
- Implementation evidence follows its parent Work Card.
- Phase Closeout follows resolution of the phase’s planned Work Cards.
- A document that cannot be associated safely remains visible as `Pending` in the nearest applicable workspace rather than disappearing.

The resolver returns the first required logical document whose effective status is not `Approved`.

Effective status rules:

```text
missing status       -> Pending
Pending              -> stop at document
Rejected             -> stop at document
RevisionRequested    -> stop at document
Approved             -> continue
```

## Authority and Simplification Rules

The Operator’s document disposition is the only binding approval state introduced by this phase.

Phase 07 must not depend on:

- separate Operator approval artifacts;
- approval target hashes;
- decision timelines;
- a global approval queue;
- `implementationAuthorized`;
- `codeChangesAuthorized`;
- `sourceCodeChangesAuthorized`;
- `phaseProgressionAuthorized`;
- `routeSelectionAuthorized`;
- `justInTimeWorkCardCreationAuthorized`;
- `authorizationGranted`;
- `executionPassesAuthorized`;
- approval-level `pushAuthorized`;
- a special historical approval class;
- global Governance Maintenance preemption.

Technical failures remain local:

- an unreadable current document blocks review of that document;
- a stale write requires refresh of that document;
- a pair mismatch requires repair of that document;
- an unrelated defect does not replace the valid current action with a project-wide governance repair action.

## Historical and Duplicate Documents

Historical documents use the same four status values and the same stage workspaces.

No duplicate inventory or semantic merge analysis is required before the disposition system operates.

- Each existing logical document receives a status.
- Exact or apparent duplicates remain separate documents unless a later specific cleanup action is approved.
- The Operator may approve, reject, or request revision for each document presented.
- A duplicate problem is handled locally when it prevents deterministic ordering or safe writing.

## In Scope

- Add the document disposition contract to planning documents.
- Initialize missing statuses to `Pending` without approving anything.
- Read and write synchronized Markdown/JSON disposition values.
- Add disposition controls to the existing stage workspaces.
- Route to the first non-approved document.
- Preserve the same document identity through revision.
- Remove or bypass separate approval screens and approval-artifact routing.
- Remove global Governance Maintenance preemption.
- Use the real ChampCity_AI planning corpus for validation.
- Restart at Project Intake when it is the first non-approved document.

## Out of Scope

- Semantic duplicate analysis.
- Canonical survivor selection.
- Bulk duplicate deletion or archival.
- Historical approval reconstruction.
- Decision event timelines.
- Separate approval records.
- New provider, ChatGPT browser-agent, Codex transport, or MCP features.
- Git, release, packaging, tagging, or deployment automation.
- Broad visual redesign unrelated to workspace-integrated disposition.

## Implementation Method

- Execute one approved Work Card at a time.
- Use the existing workspaces rather than adding parallel review screens.
- Keep the implementation proportional to the four-value status contract.
- Do not introduce a generalized policy engine.
- Do not create a separate migration database or manifest prerequisite.
- Tests must exercise real production readers, writers, workspaces, and resolver behavior.
- Do not replace simple document status with derived authority fields.

## Phase Acceptance Criteria

Phase 07 is complete when:

1. Every logical planning document has one readable disposition status.
2. Missing status is treated as `Pending`.
3. Markdown and JSON pair status remains synchronized.
4. The existing stage workspace displays the documents it owns.
5. Each stage workspace contains its own disposition selector and save action.
6. No separate Operator approval screen is required.
7. Approve writes `Approved` to the selected document.
8. Reject writes `Rejected` to the selected document.
9. Request Revision writes `RevisionRequested` to the selected document.
10. Revising a requested document returns it to `Pending`.
11. The resolver stops at the first required non-approved document.
12. Approved documents are skipped on the next resolution pass.
13. Rejected and revision-requested documents remain the current action.
14. Project Intake is the first Project Planning review target.
15. Phase Planning and Work Card Plan are reviewed inside Phase Planning.
16. Ordinary and repair Work Cards use the same Work Card workspace.
17. Implementation evidence is reviewed inside Operator Validation.
18. Closeout documents are reviewed inside Phase Closeout.
19. No approval artifact, target hash, decision timeline, or parallel authority Boolean controls routing.
20. Governance repair defects do not globally replace unrelated valid work.
21. Restart preserves status and returns to the correct first non-approved document.
22. Full automated and Operator manual validation pass using the real repository corpus.

## Manual Validation

Final Operator validation must prove:

1. Start the application with Project Intake set to `Pending`.
2. Confirm the application opens Project Planning with Project Intake selected.
3. Approve Project Intake inside Project Planning.
4. Confirm the next non-approved Project Planning document is selected.
5. Open Phase Planning and review Phase Planning and Work Card Plan without navigating to a separate approval screen.
6. Reject a document and confirm workflow remains on it.
7. Request revision and confirm workflow remains on it.
8. Revise the document and confirm it returns to `Pending`.
9. Approve the revised document and confirm progression.
10. Restart and confirm the correct first non-approved document remains current.
11. Confirm an unrelated malformed document does not force a global Governance Maintenance action.

## Phase Exit Condition

Phase 07 exits when the application uses the real ChampCity_AI planning corpus to perform this simple document-by-document Operator disposition loop and starts at the first non-approved document, beginning with Project Intake.
