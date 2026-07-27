<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-07",
    "workCardId": "WC08"
  },
  "sourceRevisions": [],
  "workflowData": {
    "schemaVersion": "champcity.work-card.v1",
    "workCardId": "WC08",
    "phaseId": "phase-07",
    "title": "Disposition Write Safety, Local Read Isolation, and Phase Order Repair",
    "status": "Approved",
    "owner": "Implementer",
    "planOrder": 8,
    "risk": "high",
    "dependencies": [
      "WC03",
      "WC04",
      "WC05",
      "WC06",
      "WC07"
    ],
    "purpose": "Repair Markdown disposition preservation, staged pair replacement, per-document read-error isolation, and phase-by-phase resolver ordering without redesigning or reinitializing the clean-room application.",
    "authorizedProductionFiles": [
      "src/main/documents/documentDispositionWriter.ts",
      "src/main/documents/planningDocumentService.ts",
      "src/shared/documents/documentOrder.ts",
      "src/shared/documents/planningDocument.ts"
    ],
    "authorizedTestFiles": [
      "test/documents/planning-document-service.test.cjs",
      "test/resolver/first-non-approved-resolver.test.cjs",
      "test/workspaces/workspace-document-review.test.cjs",
      "test/dogfood/real-corpus-dogfood.test.cjs"
    ],
    "repairs": [
      {
        "repairId": "R01_MARKDOWN_PRESERVATION",
        "requiredOutcome": "Disposition replacement preserves every non-disposition line and character, including content after an existing disposition section, while producing exactly one canonical terminal disposition section."
      },
      {
        "repairId": "R02_STAGED_REPLACEMENT",
        "requiredOutcome": "Standalone and paired disposition writes stage verified sibling temporary files, replace targets, restore original bytes on any partial failure, and leave no temporary or backup files."
      },
      {
        "repairId": "R03_LOCAL_READ_ISOLATION",
        "requiredOutcome": "An individual document metadata or read failure produces one local read-error Pending document while unrelated documents remain discoverable, previewable, writable, and resolvable."
      },
      {
        "repairId": "R04_PHASE_ORDER",
        "requiredOutcome": "Project-level documents come first; numbered phase is compared before stage; each phase completes Phase Planning, Work Card, Operator Validation, and Phase Closeout before the next phase begins."
      },
      {
        "repairId": "R05_DYNAMIC_DOGFOOD_COUNTS",
        "requiredOutcome": "Real-corpus tests independently reconcile current runtime counts and do not hard-code file or logical-document totals."
      }
    ],
    "requiredCrossPhaseAssertions": [
      "Phase 01 Work Card precedes Phase 02 Phase Planning.",
      "Phase 01 Operator Validation precedes Phase 02 Phase Planning.",
      "Phase 01 Phase Closeout precedes Phase 02 Phase Planning.",
      "Phase 02 Phase Planning becomes current only after every earlier Phase 01 document is Approved."
    ],
    "realCorpusBoundary": {
      "reinitializationAuthorized": false,
      "dispositionWritesAuthorized": false,
      "requiredVerification": "Every planning file existing at WC08 start remains byte-identical; the only new planning file may be the WC08 Implementer Report."
    },
    "prohibitions": [
      "No renderer redesign or functional renderer change.",
      "No new preload or IPC behavior.",
      "No workspace-classification redesign.",
      "No new status, workflow model, resolver, queue, artifact, event log, journal, database, or governance compatibility layer.",
      "No dependency or package-script changes.",
      "No bulk planning mutation, reinitialization, reformatting, deletion, move, or rename.",
      "No Git operations."
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test",
      "npm run validate:codex:unit",
      "npm run validate:codex:build",
      "npm run validate:codex",
      "npm start non-acceptance real-repository smoke check"
    ],
    "implementerReportPath": "planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC08_disposition_write_safety_local_read_isolation_phase_order_repair.md",
    "markdownPath": "planning/phases/phase-07/Work_Cards/WC08_disposition_write_safety_local_read_isolation_phase_order_repair.md",
    "jsonPath": "planning/phases/phase-07/Work_Cards/WC08_disposition_write_safety_local_read_isolation_phase_order_repair.json"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 07 WC08 Disposition Write Safety, Local Read Isolation, and Phase Order Repair

Status: approved for Implementer execution
Owner: Implementer
Plan order: 8
Risk: high
Dependencies: WC03 through WC07 completed; Architect review accepted the clean-room foundation and requested this repair
Git mutation: not authorized
Implementer Report: `planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC08_disposition_write_safety_local_read_isolation_phase_order_repair.md`

## Purpose

Correct four bounded defects found during Architect review of WC03 through WC07:

1. Markdown disposition replacement can discard non-disposition content located after an existing disposition section.
2. Disposition writes directly overwrite target files before rollback instead of staging verified replacements.
3. One file-specific metadata or read failure can abort planning-document discovery.
4. The resolver orders all phases by workspace stage instead of completing one phase before moving to the next.

This Work Card repairs those defects only.

The clean-room architecture, five workspaces, four-value disposition contract, initialized real corpus, and first-non-approved workflow remain in place.

## Starting Rules

Before editing:

- verify the approved repository root, expected remote, current branch, and heavily dirty status;
- read `AGENTS.md`, `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`, and `docs/dev/VALIDATION_COMMAND_LANES.md`;
- read this Markdown/JSON Work Card pair;
- treat every existing working-tree change as protected baseline state;
- do not require a Work Card hash, approval artifact, Execution Run, authorization token, or separate approval;
- do not perform any Git mutation.

## Authorized Production Files

Modify only as required:

```text
src/main/documents/documentDispositionWriter.ts
src/main/documents/planningDocumentService.ts
src/shared/documents/documentOrder.ts
src/shared/documents/planningDocument.ts
```

`src/shared/documents/planningDocument.ts` may change only when a narrow contract adjustment is required to represent an isolated file read error. Do not add workflow or authority fields.

No renderer, preload, IPC, workspace-classification, package dependency, or package-script change is authorized unless compilation proves a direct type-only consequence of an approved contract adjustment. If a functional renderer, preload, IPC, or package change appears necessary, stop and report the conflict rather than widening scope.

## Authorized Test Files

Modify only:

```text
test/documents/planning-document-service.test.cjs
test/resolver/first-non-approved-resolver.test.cjs
test/workspaces/workspace-document-review.test.cjs
test/dogfood/real-corpus-dogfood.test.cjs
```

Do not create a new test directory or Work-Card-specific permanent test island.

## Authorized Planning Output

Create only:

```text
planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC08_disposition_write_safety_local_read_isolation_phase_order_repair.md
```

Do not create a JSON report sidecar.

Do not modify any existing planning document or disposition during implementation.

## Repair 1 — Preserve All Non-Disposition Markdown Content

Repair `writeMarkdownDisposition()` so it never truncates or discards non-disposition document content.

### Required behavior

When writing a new status:

- recognize disposition headings only outside fenced code blocks;
- remove or normalize only actual disposition syntax:
  - the unfenced `## Document Disposition` heading;
  - adjacent blank separator lines belonging to that disposition block;
  - `Document.Status=<value>` assignment lines belonging to that disposition block;
- preserve every other line and character of the document, including content after an existing disposition section;
- preserve fenced examples containing `## Document Disposition` or `Document.Status=...`;
- preserve headings, prose, lists, comments, and code that follow an existing disposition section;
- preserve the document's existing line-ending convention where practical;
- append exactly one canonical terminal section:

```markdown
## Repair 2 — Staged Replacement and Pair Rollback

Replace direct target overwrites in production disposition writes with staged sibling-file replacement.

### Required write sequence

For every standalone or paired write:

1. preflight every target as a regular non-symlink file inside the selected workspace;
2. read and retain the original bytes for every target;
3. generate the complete replacement content for every target before the first target mutation;
4. write each replacement to a unique sibling temporary file;
5. flush and close each temporary file;
6. verify the staged Markdown or JSON content parses to the requested disposition;
7. replace the real targets from the staged files;
8. re-read and verify every final target;
9. remove temporary and backup files.

### Failure behavior

If staging, replacement, or final verification fails:

- restore every original target byte-for-byte;
- remove every temporary or backup file created by the attempt;
- throw the original operation as failed;
- do not leave one member of a pair changed;
- do not silently report success.

A same-stem Markdown/JSON pair remains one logical write operation.

### Prohibitions

- Do not use direct `writeFileSync(targetPath, replacementContent)` as the normal production commit operation.
- Do not add a journal, database, event log, approval record, transaction artifact, or recovery queue.
- Do not weaken path containment or symlink rejection.

## Repair 3 — Isolate Individual File Read Failures

Planning discovery must continue when one individual document file cannot be inspected or read.

### Required behavior

For a file-specific `lstat`, metadata, or content-read failure:

- retain a logical document record when its path and stem are known;
- set effective disposition to `Pending`;
- set `initializationNeeded` to `true`;
- set synchronization state to `read-error`;
- include a plain local `readError` message;
- keep all other readable documents available;
- allow the resolver to order and select the error document at its normal position;
- prevent disposition writes to the unreadable document;
- keep disposition writes available for unrelated readable documents.

A file-specific error must not:

- throw away the entire document list;
- replace the application with a maintenance state;
- suppress unrelated workspaces;
- become a separate workflow action.

Failure to read the selected workspace root or the `planning/` directory itself may still fail the overall operation. This repair is limited to individual document entries.

### Deterministic testability

Use a bounded dependency seam or injected failure hook when needed to test file-specific failures consistently across Windows environments. The seam must remain internal to the document service and must not be exposed through renderer IPC or application configuration.

## Repair 4 — Phase-by-Phase Resolver Ordering

Correct the document comparator so project-level documents come first, then each phase completes before the next phase begins.

### Required high-level order

```text
Project-level planning documents
-> Phase 01 documents in stage order
-> Phase 02 documents in stage order
-> Phase 03 documents in stage order
-> ...
-> unnumbered phase-like documents
```

### Project-level order

Preserve the existing project category order:

1. Project Intake;
2. Project Architect Interview;
3. Project Planning;
4. Project Roadmap;
5. Phase Map;
6. other project-level or unclassified documents.

All project-level records precede phase records.

### Phase order

For documents associated with numbered phase folders:

1. compare numeric phase number;
2. within the same phase, compare stage:
   - Phase Planning;
   - Work Card;
   - Operator Validation;
   - Phase Closeout;
3. within the same stage, preserve the existing category, Work Card, repair, evidence, archive, and path tie-breakers.

The required cross-phase behavior is:

```text
phase-01 Phase Planning
phase-01 Work Cards
phase-01 Operator Validation
phase-01 Phase Closeout
phase-02 Phase Planning
phase-02 Work Cards
...
```

### Archive and unparseable records

- Archived phase documents retain their associated phase and stage.
- Within the same phase/category identity, non-archive records precede archive records.
- Unnumbered or unparseable phase-like paths remain visible and sort after numbered phases by normalized path.
- Filename parsing remains ordering input only. It is not identity or approval authority.

### Resolver rule unchanged

The resolver still returns only the first ordered logical document whose effective disposition is not `Approved`.

Do not add another resolver, route table, phase state, phase completion artifact, or workflow index.

## Real-Corpus Protection

The current real planning corpus is already initialized.

WC08 must not call `applyDispositionInitialization()` against the real repository.

Before production edits, make a temporary byte snapshot of all existing files under `planning/`. At completion:

- every file that existed at WC08 start must remain byte-identical;
- the only new planning file may be the WC08 Implementer Report;
- no status may be changed;
- no planning file may be reformatted;
- no planning file may be deleted, renamed, moved, or regenerated.

The temporary snapshot is validation evidence only. It is not approval authority and must not be written into the repository.

## Test Requirements

### Markdown preservation tests

Add tests proving:

- content after a valid disposition section survives exactly;
- content after an invalid disposition section survives exactly;
- duplicate disposition blocks are normalized without deleting intervening content;
- fenced examples remain unchanged;
- LF and CRLF content remain valid;
- repeated writes are idempotent;
- only one canonical terminal disposition section remains.

### Staged write tests

Add tests proving:

- standalone writes use staged replacement and produce the expected status;
- paired writes produce synchronized statuses;
- an injected failure after the first target replacement restores both original pair members byte-for-byte;
- an injected final-verification failure restores all originals;
- no temporary or backup files remain after success or failure;
- path containment and symlink rejection still pass.

### Local read-isolation tests

Add tests proving:

- one injected file-read failure produces one `read-error` document summary;
- readable sibling documents remain listed and previewable;
- another readable document can still receive a disposition write;
- the unreadable document cannot be written;
- the resolver selects the unreadable document only when its normal order position is current;
- a later unreadable document does not preempt an earlier readable Pending document.

### Cross-phase resolver tests

Add tests proving:

1. a pending Phase 01 Work Card precedes a pending Phase 02 Phase Planning document;
2. a pending Phase 01 Operator Validation document precedes Phase 02 Phase Planning;
3. a pending Phase 01 Closeout precedes Phase 02 Phase Planning;
4. once every Phase 01 document is Approved, Phase 02 Phase Planning becomes current;
5. project-level documents still precede every phase;
6. numbered phases still sort numerically;
7. base Work Cards still precede repairs;
8. validation evidence order remains intact;
9. archive and unparseable records remain visible.

### Real-corpus dogfood tests

Replace brittle hard-coded totals with independent runtime reconciliation:

- walk the real `planning/` tree independently;
- calculate current Markdown, JSON, file, pair, standalone, and logical-document counts at test runtime;
- reconcile those counts with the document service;
- assert no logical document needs initialization;
- assert every pair is synchronized;
- assert every effective disposition is one of the four allowed values;
- assert the first resolved real document remains Project Intake while it is Pending;
- do not write any real-corpus disposition.

Do not hard-code totals such as `635` files or `357` logical documents.

## Validation

Use the documented normal Windows lane.

Run:

```text
npm run typecheck
npm run build
npm test
npm run validate:codex:unit
npm run validate:codex:build
npm run validate:codex
```

No failed, skipped, cancelled, bypassed, or todo test is permitted.

Run `npm start` for a non-acceptance smoke check against the real repository and confirm only:

- the application opens;
- Project Planning opens with Project Intake selected while it remains Pending;
- document lists and previews load;
- no legacy governance or approval control appears.

Do not change any disposition during the smoke check.

## Implementer Report Requirements

Create only:

```text
planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC08_disposition_write_safety_local_read_isolation_phase_order_repair.md
```

The report must include:

- repository, remote, branch, and starting dirty-state verification;
- exact production and test files changed;
- Markdown preservation algorithm and edge-case evidence;
- staged replacement and rollback sequence;
- injected failure results and leftover-file checks;
- local read-error isolation evidence;
- exact cross-phase ordered fixture output;
- dynamic real-corpus reconciliation counts;
- proof that every pre-existing planning file remained byte-identical;
- all validation commands, exits, and test counts;
- launch smoke observations;
- confirmation that no real-corpus initialization or disposition write occurred;
- confirmation that no renderer, IPC, workspace, status, workflow, or governance redesign occurred;
- confirmation that no Git mutation occurred;
- remaining Operator manual validation.

## Acceptance Criteria

WC08 is acceptable only when:

1. disposition writing preserves every non-disposition Markdown line before and after existing disposition syntax;
2. fenced examples remain unchanged;
3. exactly one canonical terminal Markdown disposition remains after writing;
4. staged sibling files are used for production writes;
5. pair failure restores both original files byte-for-byte;
6. no temporary or backup files remain after success or failure;
7. path containment and symlink rejection remain enforced;
8. one individual read failure becomes one local `read-error` document;
9. readable documents remain usable when another document fails;
10. the unreadable document cannot be disposition-written;
11. project-level documents remain first;
12. phase number is evaluated before stage order for phase documents;
13. Phase 01 Work Card, validation, and closeout records precede Phase 02 Phase Planning;
14. existing within-phase Work Card, repair, evidence, archive, and path ordering remains correct;
15. real-corpus tests use dynamic count reconciliation;
16. no real planning disposition is changed or reinitialized;
17. every pre-existing planning file remains byte-identical;
18. no new architecture, dependency, IPC, screen, status, queue, artifact, or resolver is introduced;
19. all required validation passes;
20. the WC08 Implementer Report exists and accurately reports the evidence;
21. no Git mutation occurs.

## Manual Validation After Architect Review

The Operator should confirm:

1. the application opens at Project Intake;
2. document lists remain usable;
3. approving a temporary or disposable test document does not remove content following its prior disposition section;
4. phase progression shown after controlled fixture testing is phase-by-phase;
5. no legacy governance or separate approval screen is visible.

The Operator must not change real historical document dispositions solely to test progression.
