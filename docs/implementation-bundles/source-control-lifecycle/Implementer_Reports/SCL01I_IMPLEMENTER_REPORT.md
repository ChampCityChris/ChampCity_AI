# SCL01I Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a workstation path.
- Card: Work Card `SCL01I`, Implement StateChange Audit and Transactional Outbox.
- Predecessor: SCL01H checkpoint `19d0a228521b9357d525a5b9d8f0a3229fec405f`.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.

## Files

- Created: `src/shared/projectState/projectStateEventDispatcher.ts`, `test/project-state/state-change-outbox.test.cjs`, and this report.
- Modified: `src/shared/projectState/projectStateService.ts`, `src/shared/projectState/projectStateStore.ts`, `src/shared/projectState/inMemoryProjectStateStore.ts`, `src/main/projectState/sqliteProjectStateStore.ts`, `src/main/projectState/sqliteSchema.ts`, `test/project-state/sqlite-schema-migrations.test.cjs`, `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: event-sourced canonical state, external broker integration, consumer-owned SQL, workflow-specific event handlers, or a repository sidecar.

## Implementation and evidence

Every ProjectStateService semantic mutation now appends a StateChange and an outbox event in its owning store transaction. A shared helper issues the audit/event ID, trusted principal, entity/version/operation, time, sorted changed fields, reason and optional causation/correlation. Event types are defined by ProjectStateService. Create, revise, supersede, relationship create/end and typed Decision/Validation/Evidence commands use that helper. A supersession records its terminal predecessor, successor creation and explicit relationship as three mutation pairs. A failed event append rolls back the canonical record and audit.

SQLite migration `002_outbox_acknowledgments` adds a separate acknowledgment table and its ownership key. StateChange and outbox rows are immutable through UPDATE/DELETE triggers; acknowledgment never edits them. Both store adapters expose ordered pending events and idempotent acknowledgment. The adapter-neutral dispatcher delivers in sequence and acknowledges only after successful delivery. Event IDs are stable replay keys; an external sink must deduplicate by event ID if delivery succeeds but acknowledgment fails.

The focused tests prove nine exact audit/event pairs for a compound command sequence on both adapters, custom reason/causation/correlation, no evidence after forced event-append rollback, ordered replay/acknowledgment, and SQL rejection of audit/outbox edits. The migration test proves a known version-one schema advances to version two exactly once.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows, static/build | Passed; TypeScript and production bundles compile. |
| `node --test test/project-state/state-change-outbox.test.cjs test/project-state/sqlite-schema-migrations.test.cjs test/project-state/sqlite-store-conformance.test.cjs test/project-state/store-conformance.test.cjs` | Normal Windows, focused capability | Passed 24/24 tests. |
| `node --test test/validation/capability-map.test.cjs` | Normal Windows, catalog | Passed 5/5 tests. |
| `npm run test:affected -- --changes tmp/scl01i-changes.json` | Normal Windows, work-item | Passed; receipt `d3af01e1-8baf-40f3-aa70-b062b7e1b0ec`, 239/239 tests across 37 selected files, zero failure evidence. |
| `git diff --check` | Read-only source check | Passed. |

The work-item profile supplied static/build, fast and affected integration evidence. No external sink was connected or claimed as integration evidence.

## Git and safety

The Operator directed one checkpoint commit for this card. Its hash is pending at report creation and will be reported after commit. The exact staged diff was inspected. `git diff --cached --check` passed; the added-line secret and concrete local-path scan and generated-artifact path scan found zero hits. No push, merge, rebase, reset, clean, restore, or stash was performed.

## Remaining validation and next task

ProjectStateService remains the canonical write boundary; low-level store transactions are infrastructure operations and future production wiring must preserve that ownership. The dispatcher provides at-least-once delivery; external consumers must use event IDs for idempotence. SCL01J can continue with the next card. No Operator experiential judgment is required for this card.
