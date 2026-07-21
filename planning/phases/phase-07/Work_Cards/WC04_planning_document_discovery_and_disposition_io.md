# Work Card — Phase 07 WC04 Planning Document Discovery and Disposition Reader/Writer

Status: approved for continuous Implementer execution
Owner: Implementer
Plan order: 4
Dependency: WC03 completed with its Implementer Report
Risk: high
Git mutation: not authorized
Implementer Report: `planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC04_planning_document_discovery_and_disposition_io.md`

## Purpose

Add the only planning-document discovery and disposition persistence capability used by the clean-room application.

WC04 builds and tests the service against temporary repositories. It must not initialize the real ChampCity_AI planning corpus. Real-corpus initialization is reserved for WC07.

## Required Contract

Allowed statuses are exactly:

```text
Pending
Approved
Rejected
RevisionRequested
```

A missing, malformed, duplicated, or unrecognized disposition is read as effective `Pending` and reported as needing initialization.

### Markdown

A Markdown document carries one terminal section:

```markdown
## Document Disposition

Document.Status=Pending
```

Rules:

- the heading and assignment appear exactly once;
- the section is the final non-whitespace content;
- writing a status replaces an existing valid or invalid disposition section rather than appending a duplicate;
- unrelated Markdown content and line endings are preserved as far as practical;
- standalone Markdown documents are supported.

### JSON

A JSON document carries one root field:

```json
{
  "documentDisposition": {
    "status": "Pending"
  }
}
```

Rules:

- the field appears only at the root;
- writing changes only `documentDisposition` plus necessary formatting;
- unrelated keys and values are preserved;
- standalone JSON documents are supported;
- malformed JSON remains discoverable but cannot be written until corrected.

### Logical documents

- Same directory and same filename stem `.md` plus `.json` form one logical document.
- A standalone `.md` or `.json` file is one logical document.
- Different stems are never merged.
- Every logical document has a stable ID derived only from its repository-relative source path or pair stem.
- The service does not use Artifact Registry identity, old artifact IDs, approval artifacts, filenames as approval evidence, or historical status fields.

## Discovery

Recursively discover regular `.md` and `.json` files under:

```text
<SELECTED_WORKSPACE>/planning/
```

Requirements:

- reject a workspace without `planning/`;
- return repository-relative paths only;
- do not follow symbolic links;
- sort deterministically by normalized relative path;
- include project, phase, system, archive, evidence, and supporting documents;
- do not exclude files because they are malformed, historical, duplicated in meaning, or lack old metadata;
- ignore non-Markdown and non-JSON files;
- do not access paths outside the selected workspace.

Each discovered logical document must expose:

- logical document ID;
- Markdown path, when present;
- JSON path, when present;
- display filename;
- pair status;
- effective disposition;
- stored Markdown disposition, when valid;
- stored JSON disposition, when valid;
- synchronization state;
- initialization-needed flag;
- read error, when applicable.

## Read and Preview

Add constrained operations to:

- list logical documents;
- read one logical document by its logical ID;
- return a readable Markdown preview when Markdown exists;
- otherwise return formatted JSON preview;
- cap preview size for renderer safety while preserving full file content on disk;
- reject unknown IDs and traversal attempts.

## Write Disposition

Add one main-process write operation:

```text
setDocumentDisposition(logicalDocumentId, status)
```

It must:

1. re-read the selected logical document immediately before writing;
2. reject an unknown or stale logical ID;
3. update both files when a pair exists;
4. update the one file when standalone;
5. write pair members as one atomic logical operation with rollback if the second write fails;
6. re-read after writing;
7. confirm both representations contain the selected status;
8. return the updated logical document.

No approval artifact, event log, decision record, reason field, actor field, timestamp field, hash field, or parallel authority value is written.

## Initialization Operation

Add:

```text
previewDispositionInitialization()
applyDispositionInitialization()
```

The preview returns exact counts and affected paths without mutation.

The apply operation:

- preserves every existing valid synchronized disposition;
- initializes missing, invalid, duplicated, or mismatched dispositions to `Pending`;
- never infers `Approved` from any old file, field, report, approval, date, title, or path;
- preflights all targets before the first write;
- supports rollback of every changed file when the initialization run fails;
- is idempotent;
- is tested only on temporary fixture repositories in WC04.

Do not call the apply operation against the real repository in WC04.

## Source Architecture

Create capability-oriented modules such as:

```text
src/shared/documents/documentDisposition.ts
src/shared/documents/planningDocument.ts
src/main/documents/planningDocumentService.ts
src/main/documents/documentDispositionWriter.ts
```

Names may vary slightly, but discovery, parsing, writing, and initialization must remain separate from renderer code.

Add direct IPC and preload methods for:

- list documents;
- read document;
- set disposition;
- preview initialization;
- apply initialization.

No current-action, route-binding, screen authorization, or role authorization parameter is allowed.

## Tests

Create or extend capability tests under:

```text
test/documents/
```

Use temporary repositories to prove:

1. recursive discovery includes paired, Markdown-only, JSON-only, archive, system, malformed, and missing-status files;
2. same-stem pairs are one logical document;
3. different stems remain separate;
4. missing status reads as `Pending`;
5. invalid status reads as `Pending` and needs initialization;
6. valid synchronized status is preserved;
7. Markdown writes one terminal section only;
8. JSON writes one root field only;
9. pair writes stay synchronized;
10. second-file failure rolls back the first file;
11. stale or unknown logical IDs are rejected;
12. containment blocks traversal and symlinks;
13. initialization preview is read-only;
14. initialization apply sets only missing or invalid records to `Pending`;
15. initialization rollback restores all changed fixtures after injected failure;
16. a repeated initialization is byte-stable;
17. no legacy governance, approval, Registry, or workflow authority is consulted.

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

Do not initialize the real corpus and do not claim UI behavior from WC05.

## Implementer Report Requirements

Create the WC04 report before reading WC05. Include:

- exact source and test files changed;
- public contracts and IPC methods;
- fixture counts;
- every test name and result;
- rollback and containment evidence;
- confirmation that the real `planning/` corpus was not modified;
- confirmation that no old governance or approval mechanism was used;
- confirmation that no Git operation occurred.

## Acceptance Criteria

WC04 passes only when:

1. all planning Markdown and JSON files can be discovered without old metadata;
2. same-stem pairs are one logical document;
3. the four-value contract is enforced;
4. missing or invalid disposition is effectively `Pending`;
5. standalone and paired writes work safely;
6. initialization preview and apply exist and pass fixture tests;
7. real-corpus files remain unchanged;
8. no routing or workspace UI behavior is implemented early;
9. automated validation passes;
10. the WC04 Implementer Report exists.

After the WC04 report is complete, immediately read and implement WC05. Do not wait for another approval.

## Document Disposition

Document.Status=Approved
