# Work Card Plan — Phase 07 Simple Document Disposition and Workspace-Integrated Approval

Status: pending Operator approval through ChatGPT
Plan revision: 3
Planning mode: off-application bootstrap phase
Project: ChampCity A/I

## Revision 3 Direction

Phase 07 now implements one simple rule:

```text
Find the first required document whose Document.Status is not Approved.
Open that document in its existing stage workspace.
Let the Operator approve, reject, or request revision there.
Write the result back to the same document.
Repeat.
```

There is no separate Operator approval screen, approval queue, approval artifact, target-set hash, decision timeline, historical approval class, or corpus-inventory prerequisite.

Every logical document under `planning/` receives one of:

```text
Pending
Approved
Rejected
RevisionRequested
```

A missing status is treated as `Pending`.

## Prior Work Card Disposition

### WC01 — Unified Operator Decision and Disposition Contract

Disposition under Revision 3: transitional implementation, superseded where it conflicts with the simple document-status model.

The WC01 working-tree changes remain protected until an approved cleanup Work Card replaces or removes conflicting architecture. WC01 does not authorize continued expansion of approval artifacts, target hashes, decision timelines, or separate approval workspaces.

### WC02 — Historical Corpus Inventory and Duplicate Resolution Manifest

Disposition: rejected by the Operator.

- No WC02 repair will be authored.
- The WC02 manifest is not a prerequisite for later work.
- No semantic duplicate analysis, survivor selection, or reference inventory is required to build the disposition system.

## Control and Sequencing

- Author and execute one detailed Work Card at a time.
- Do not absorb later scope into an earlier Work Card.
- Each Work Card requires separate Operator approval through chat.
- Use existing stage workspaces; do not add parallel approval screens.
- Keep tests proportional to the four-value document status contract.
- Do not perform Git operations.

## Remaining Ordered Work Cards

### WC03 — Document Disposition Contract and Corpus Initialization

Dependencies: Revision 3 Phase Planning and Work Card Plan approved.

Purpose: Add the four-value disposition field to every logical planning document and provide one production reader/writer for it.

Required outcomes:

- Define exact values: `Pending`, `Approved`, `Rejected`, `RevisionRequested`.
- Add exactly one terminal Markdown section:

  ```markdown
  ## Document Disposition

  Document.Status=Pending
  ```

- Add exactly one root JSON field:

  ```json
  {
    "documentDisposition": {
      "status": "Pending"
    }
  }
  ```

- Treat a same-stem Markdown/JSON pair as one logical document.
- Read missing status as `Pending`.
- Preserve an existing valid status.
- Initialize a missing or invalid status to `Pending`.
- Synchronize Markdown and JSON status writes.
- Apply initialization recursively under `planning/` without approving, merging, moving, renaming, archiving, or deleting files.
- Measure and report the exact file and logical-document counts.
- Do not create approval artifacts or infer approval from legacy metadata.

Focused tests:

- missing status reads as `Pending`;
- initialization adds one status only;
- valid existing status is preserved;
- Markdown/JSON pair stays synchronized;
- standalone Markdown and JSON documents work;
- unrelated content is unchanged;
- invalid status becomes `Pending`;
- initialization is idempotent.

Acceptance: Every logical planning document has one readable status, and no document is approved by migration.

### WC04 — Integrated Disposition Controls in Existing Workspaces

Dependencies: WC03 accepted.

Purpose: Put document review and disposition controls inside the existing stage workspaces.

Required outcomes:

- Add an ordered document list and status indicators to:
  - Project Planning;
  - Phase Planning;
  - Work Card;
  - Operator Validation;
  - Phase Closeout.
- Show a readable preview of the selected document.
- Show the first non-approved document clearly.
- Add one disposition selector with:
  - Approve;
  - Reject;
  - Request Revision.
- Add one Apply Disposition action.
- Write the selected result to the displayed document through the WC03 writer.
- Refresh the current document and next required document immediately after save.
- Keep the Operator in the same workspace.
- Remove navigation to separate Operator approval screens for these actions.

Phase Planning-specific requirement:

The Phase Planning workspace shown in the Operator’s screenshot must display Phase Planning and Work Card Plan directly and include the disposition selector there. It must not route to a separate `Operator Phase Approval` workspace.

Focused tests:

- each stage workspace renders its document list and preview;
- selector writes the correct status to the selected document;
- applying a disposition does not create an approval artifact;
- Phase Planning stays in Phase Planning after save;
- the next document is selected after approval;
- rejected and revision-requested documents remain selected.

Acceptance: The Operator reviews and dispositions documents inside the workspace where the documents already belong.

### WC05 — First Non-Approved Document Resolver

Dependencies: WC04 accepted.

Purpose: Route the application to the first required document whose effective status is not `Approved`.

Required outcomes:

- Use the stage order:

  ```text
  Project Planning
  -> Phase Planning
  -> Work Card
  -> Operator Validation
  -> Phase Closeout
  -> Next Phase
  ```

- Make Project Intake the first Project Planning document.
- Use Project Roadmap order for phases.
- Place Phase Planning before Work Card Plan.
- Use Work Card Plan order for Work Cards.
- Place implementation evidence after its parent Work Card.
- Place closeout after the phase’s Work Cards.
- Treat effective status as:

  ```text
  missing             -> Pending
  Pending             -> stop
  Rejected            -> stop
  RevisionRequested   -> stop
  Approved            -> continue
  ```

- Open the owning existing workspace with the required document selected.
- Preserve the route after refresh and restart.
- Keep unassociated documents visible rather than dropping them silently.

Focused tests:

- Project Intake is first when pending;
- approving a document advances exactly one step;
- rejected and revision-requested documents do not advance;
- missing status behaves as pending;
- restart returns to the same first non-approved document;
- ordinary and repair Work Cards use the same route;
- no separate approval action is returned.

Acceptance: The current action is always the first required non-approved document in its owning workspace.

### WC06 — Legacy Approval and Governance Gate Removal

Dependencies: WC05 accepted.

Purpose: Remove the obsolete architecture that competes with the simple document status.

Required outcomes:

- Remove or deactivate separate approval-artifact routing.
- Remove the global approval queue as workflow authority.
- Remove separate Project, Phase, Work Card, Validation, and Closeout approval destinations where the owning workspace now contains the control.
- Remove target-set hashes and decision timelines from routing authority.
- Remove parallel authority fields, including:
  - `implementationAuthorized`;
  - `codeChangesAuthorized`;
  - `sourceCodeChangesAuthorized`;
  - `phaseProgressionAuthorized`;
  - `routeSelectionAuthorized`;
  - `justInTimeWorkCardCreationAuthorized`;
  - `authorizationGranted`;
  - `executionPassesAuthorized`;
  - approval-level `pushAuthorized`.
- Remove global Governance Maintenance preemption.
- Keep malformed, stale, or mismatched documents as local document errors.
- Preserve bounded stale-write and pair-synchronization safety.
- Remove or update superseded WC01/WC02 tests and production paths only after their consumers are gone.

Focused tests:

- unrelated malformed document does not replace the valid current action;
- no approval artifact is required for progression;
- no parallel authority Boolean changes routing;
- old separate approval destinations are unreachable from normal workflow;
- local write safety still prevents stale overwrite.

Acceptance: `Document.Status` is the sole binding disposition state and maintenance defects are local.

### WC07 — Real-Corpus Dogfood and Startup Handoff

Dependencies: WC03 through WC06 accepted.

Purpose: Validate the simplified loop against the real ChampCity_AI planning corpus and leave the application at the correct starting point.

Required outcomes:

- Confirm every logical document under `planning/` has one disposition status.
- Confirm no initialization step approved a document.
- Start with Project Intake as the first non-approved document.
- Review Project Intake inside Project Planning.
- Approve and confirm progression to the next Project Planning document.
- Review Phase Planning and Work Card Plan inside Phase Planning.
- Exercise Approve, Reject, and Request Revision.
- Confirm a revised document returns to `Pending`.
- Exercise ordinary and repair Work Cards through the same workspace.
- Exercise implementation evidence inside Operator Validation.
- Exercise closeout inside Phase Closeout.
- Restart and confirm the correct first non-approved document remains current.
- Confirm no global Governance Maintenance action preempts an unrelated valid document.
- Remove obsolete test fixtures, labels, and dead paths left by the prior approval architecture.

Acceptance: The application dogfoods the real planning corpus through the simple document-by-document disposition loop and starts at Project Intake when it is pending.

## Work Card Summary

| Order | Work Card | Primary result |
| ---: | --- | --- |
| Prior | WC01 | Transitional implementation; superseded where conflicting |
| Rejected | WC02 | Inventory approach rejected; no repair |
| 3 | WC03 | Add and initialize `Document.Status` |
| 4 | WC04 | Put disposition controls inside existing workspaces |
| 5 | WC05 | Route to first non-approved document |
| 6 | WC06 | Remove parallel approval and maintenance gates |
| 7 | WC07 | Real-corpus validation and startup handoff |

## Phase Completion Rule

Phase 07 is complete only when:

1. WC03 through WC07 have accepted Operator outcomes.
2. Every logical planning document has one of the four allowed statuses.
3. Missing status behaves as `Pending`.
4. Markdown and JSON status remain synchronized.
5. Existing stage workspaces contain their own disposition controls.
6. No separate approval screen or approval artifact is required.
7. The resolver opens the first required non-approved document.
8. Rejected and revision-requested documents remain current.
9. Approved documents advance in deterministic project, phase, and Work Card order.
10. Global Governance Maintenance no longer preempts unrelated valid work.
11. Restart returns to the correct current document.
12. Operator manual validation passes on the real repository corpus.

## Next Step After Approval

Author only:

```text
planning/phases/phase-07/Work_Cards/WC03_document_disposition_contract_and_corpus_initialization.md
```

Do not author WC04 or later Work Cards until WC03 has been implemented, reviewed, and accepted by the Operator.
