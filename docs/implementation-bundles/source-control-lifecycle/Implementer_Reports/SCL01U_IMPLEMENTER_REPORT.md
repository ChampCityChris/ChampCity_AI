# SCL01U Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a workstation path.
- Card: Work Card `SCL01U`, Implement Staged Legacy-to-Structured Importer.
- Predecessor: SCL01T checkpoint `4f3edbde429eedc26558c98584bb9efb5294f362`.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.

## Files

- Created: `src/main/migrations/stagedLegacyImporter.ts`, `test/migration/staged-legacy-importer.test.cjs`, and this report.
- Modified: `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: a live authority switch, a dual-write path, a model-based completion of absent legacy facts, or a new schema/dependency.

## Implementation and evidence

The importer accepts one complete SCL01T snapshot and re-inventories the selected workspace before writing. It rejects stale or altered content, metadata, digests, and conflicts. A deterministic snapshot-derived staging directory under application-owned storage holds an isolated SQLite database and exact copies of historical Markdown. It refuses an existing candidate; a failed build removes only its verified staging directory. It never advances provider generation or writes the current legacy documents.

Opaque UUID-shaped entity, lineage, relationship, and audit identities are derived mechanically from the snapshot digest, source path, and semantic role. The staged graph contains one Project, an Evidence record for every source document, and typed WorkIntake/Workflow, Phase, WorkItem/Repair/Fix, Issue Finding, and fully specified Validation records. Architect/planning and older Validation documents retain their exact historical content as Evidence when the legacy source lacks facts required for a more specific semantic type. Partial Validation facts fail explicitly. Evidence records preserve source path, hash, alias, revision, and a staged raw Markdown payload; record provenance and the returned correlation map bind semantic records to source.

Source-revision provenance becomes `derived_from` relationships between Evidence. The importer builds `supports`, `initiates`, `part_of`, `repairs`, `depends_on`, and explicit `evaluates` relationships where the source identifies their endpoints. Missing, ambiguous, self-referential, or cyclic relationships fail before persistence. SQLite transactions validate each record and relationship and append paired StateChange/outbox rows. No authority generation is recorded.

Synthetic fixtures verify a Project, Intake, Phase, Work, Repair, Issue, and explicit Validation graph; raw Markdown fidelity; deterministic discard/rebuild; audit/outbox pairing; absent authority cutover; stale/tampered snapshot rejection; dangling and self-referential Repair rejection; and rejection of partial Validation facts. This permanent test covers the distinct staged graph and migration-failure boundary, which the existing format migration and SCL01T inventory fixtures do not cover.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows, static/build | Passed during development; final migration and work-item profiles rebuilt final source. |
| `node --test test/migration/staged-legacy-importer.test.cjs` | Normal Windows, focused fixture | Final direct run passed 2/2. |
| `node --test test/validation/capability-map.test.cjs` | Normal Windows, catalog | Passed 5/5. |
| `npm run test:migration` | Normal Windows, migration | Final receipt `67df2b9d-a42a-41d9-b6e0-0c3c8e0602da` passed 7/7 in three selected migration files. |
| `npm run test:affected -- --changes tmp/scl01u-changes.json` | Normal Windows, work-item | Final receipt `3f945741-6976-4410-84db-91bea7e47e8b` passed 110/110 in 21 selected files with stable source and zero failures. |
| `git diff --check` | Read-only source check | Passed. |

The work-item profile supplied final static/build, fast, affected and applicable integration evidence. No real user workspace was migrated and no external integration or release result is claimed. No required check was skipped.

## Git and safety

The Operator directed one checkpoint commit for this card. Its hash is pending at report creation and will be reported after commit. The exact staged diff was inspected. `git diff --cached --check` passed; the added-line secret and concrete local-path scan and generated-artifact path scan found zero hits. No push, merge, rebase, reset, clean, restore, or stash was performed.

## Remaining validation and next task

Staged candidates remain isolated until the later reconciliation and authority-switch cards. Older documents lacking explicit semantic Validation facts remain historical Evidence rather than guessed Validation results. No Operator experiential judgment is required for this card. Continue to SCL01V after this checkpoint.
