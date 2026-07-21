# Work Card — Phase 07 WC07 Real-Corpus Initialization and Dogfood Validation

Status: approved for continuous Implementer execution
Owner: Implementer
Plan order: 7
Dependency: WC06 completed with its Implementer Report
Risk: high
Git mutation: not authorized
Implementer Report: `planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC07_real_corpus_initialization_and_dogfood_validation.md`

## Purpose

Apply the clean-room disposition initializer to the real ChampCity_AI planning corpus, validate the complete application against that corpus, and leave the application opening at the first required non-approved document.

WC07 is the only card in this sequence authorized to bulk-modify existing planning documents.

## Protected Approved Records

The initializer must preserve valid existing dispositions, including `Approved` on:

- Phase 07 Phase Planning;
- Phase 07 Work Card Plan;
- WC03 through WC07 Markdown and JSON Work Card pairs;
- the continuous Implementer handoff;
- any other document that already contains a valid synchronized disposition.

Do not infer approval from old `status`, Operator Approval records, Implementer Reports, validation results, filenames, dates, revision numbers, artifact metadata, or Git history.

## Preflight

Before the first corpus write:

1. verify the selected workspace is the approved repository root;
2. discover every regular `.md` and `.json` file under `planning/`;
3. group same-stem pairs;
4. read every file fully;
5. identify all valid, missing, invalid, duplicated, mismatched, malformed, and unreadable dispositions;
6. confirm every target path is inside `planning/`;
7. produce exact preflight counts;
8. abort without mutation when any planned write cannot be safely represented.

The Operator's prior estimate is approximately 667 files. Do not hard-code that number. Report the exact observed file and logical-document counts.

## Initialization

Run the WC04 initialization operation against the real corpus.

Rules:

- preserve valid synchronized dispositions;
- initialize missing, invalid, duplicated, or mismatched dispositions to `Pending`;
- update both members of a same-stem pair;
- update standalone Markdown or JSON independently;
- do not merge, rename, move, archive, delete, or reclassify documents;
- do not modify non-disposition content except JSON formatting required to write the root field;
- malformed JSON remains a failed target and must cause preflight failure unless the service can safely preserve it without pretending it has a JSON disposition;
- no document is automatically approved;
- no approval artifact or event record is created.

The bulk operation must restore every file changed during the run if any write or post-write verification fails.

## Post-Initialization Verification

After the write completes, independently rediscover and verify the real corpus:

- every logical document has effective status in the four-value set;
- every writable Markdown document contains exactly one terminal disposition section;
- every parseable JSON document contains exactly one root `documentDisposition.status`;
- every pair is synchronized;
- every pre-existing valid disposition was preserved;
- every initialized document is `Pending`;
- no extra planning file was created other than the five Implementer Reports already authorized by the continuous pass;
- no old governance, approval, maintenance, workflow-authority, Execution Run, context-packet, or rejected migration source exists.

Report exact counts by:

- files;
- logical documents;
- complete pairs;
- Markdown-only;
- JSON-only;
- preserved Approved;
- preserved Pending;
- preserved Rejected;
- preserved RevisionRequested;
- initialized to Pending;
- local read or write errors.

## Real-Corpus Startup Result

Launch the clean-room application with the real repository selected.

The resolver must open:

- Project Planning workspace;
- Project Intake selected;
- Project Intake shown as the first document when its effective disposition is not `Approved`.

If more than one Project Intake exists, the deterministic order from WC06 selects the first and all others remain visible. Do not create duplicate reconciliation or a governance detour.

## Dogfood Scenarios

Use the real corpus for non-acceptance smoke validation. Do not make final Operator decisions on the corpus beyond the already approved planning and Work Card records.

Prove safely, using a temporary copy of representative real documents when mutation would alter actual Operator decisions:

1. Pending remains current;
2. Approve advances to the next document;
3. Reject remains current;
4. Request Revision remains current;
5. a document revised with `Pending` becomes current again;
6. Phase Planning displays Phase Planning and Work Card Plan in the same workspace;
7. ordinary and repair Work Cards use the same workspace;
8. Implementer Reports and review evidence appear in Operator Validation;
9. closeout records appear in Phase Closeout;
10. refresh and restart return to the same first non-approved document;
11. a malformed later document does not replace an earlier valid pending document;
12. no separate approval, governance, or maintenance screen appears.

Do not approve historical documents on behalf of the Operator merely to advance the live corpus.

## Residual Clean-Room Inspection

Inspect active production and test files and remove any residual source created or retained from the old architecture, including renamed equivalents.

The final active source must contain no runtime implementation of:

- Governance Maintenance, Repair, or Approval;
- current-action or workflow-authority models;
- approval queues or approval artifacts;
- target hashes or decision timelines;
- routed IPC, role gates, or screen gates;
- Execution Runs;
- workflow-derived context packets;
- rejected WC02 migration logic;
- old router shell or separate approval destinations.

Do not delete historical planning records documenting those prior attempts.

## Tests

Add real-corpus-safe verification under:

```text
test/dogfood/
```

Tests must:

- read the real planning corpus after initialization without changing Operator dispositions;
- assert exact count reconciliation;
- assert every logical document has a valid effective disposition;
- assert pair synchronization;
- assert the resolver returns Project Intake first when it is not Approved;
- use temporary copies for disposition transition tests;
- assert prohibited old architecture is absent;
- assert all five Implementer Reports exist at the end of the continuous pass.

Do not use Playwright.

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

Run `npm start` for a non-acceptance smoke check against the real repository.

The Implementer may confirm visibility, selection, persistence, and absence of old controls. The Implementer must not claim final usability acceptance or approve documents for the Operator.

## Implementer Report Requirements

Create the WC07 report before ending the continuous pass. Include:

- exact preflight and post-write corpus counts;
- every real planning path changed, or a machine-readable changed-path appendix when the list is large;
- preserved-status and initialized-status counts;
- rollback design and result;
- pair synchronization results;
- exact first resolved document and owning workspace;
- all automated validation results;
- launch smoke observations;
- prohibited-architecture inspection results;
- confirmation that all five Implementer Reports exist;
- confirmation that no Git operation occurred;
- remaining Operator manual validation steps.

## Acceptance Criteria

WC07 passes only when:

1. the real planning corpus was fully preflighted;
2. every safely writable logical document has one valid disposition;
3. valid existing dispositions were preserved;
4. missing or invalid dispositions were initialized to Pending;
5. no approval was inferred from old records;
6. every pair is synchronized;
7. exact counts reconcile;
8. startup opens Project Planning with Project Intake selected when it is first non-approved;
9. all five workspaces operate against the real corpus;
10. refresh and restart preserve the correct derived current document;
11. no old governance or approval architecture remains;
12. no historical planning evidence was deleted;
13. automated validation passes;
14. the WC03, WC04, WC05, WC06, and WC07 Implementer Reports all exist;
15. the WC07 Implementer Report is complete.

After WC07, stop. Do not perform Git operations, phase closeout, or Operator acceptance.

## Document Disposition

Document.Status=Approved
