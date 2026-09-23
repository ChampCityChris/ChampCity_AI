# SCL01H Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a workstation path.
- Card: Work Card `SCL01H`, Implement Revision, History, Supersession, and Lineage.
- Predecessor: SCL01G checkpoint `3f8447c0a2920f1d6c1356e09176726dd4f6c578`.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.

## Files

- Created: `test/project-state/revision-history-lineage.test.cjs` and this report.
- Modified: `src/shared/projectState/projectStateService.ts`, `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: Markdown revision files, workflow-specific SQL, data migration, a typed correction command for issued records, or new schema tables.

## Implementation and evidence

Record history now follows the explicit `supersedes` relationship chain from root to current successor and reads each identity's immutable versions in numeric order. It rejects branching, cycles, missing edges or versions, cross-lineage edges, and multiple current heads. Current-record resolution uses the same chain. This gives deterministic results when predecessor and successor timestamps match or their IDs sort in the opposite order.

Supersession now requires the unique current active or closed record in its lineage. A predecessor already terminal cannot be superseded again. Generic supersession of issued Decision, Validation and Evidence is rejected until a typed correction policy is defined; ordinary revisions of those records remain prohibited. Revision retains identity and version history, while supersession creates a new identity, shares lineage, and leaves a terminal predecessor and explicit edge. No historical row is rewritten.

The SQLite fixtures exercise multiple revisions and two replacements, confirm history and current resolution after store reopen, prove same-timestamp ordering follows the edge, and verify immutable issued-record behavior. A regular revision produces no supersession edge. A later Decision receives its own lineage, as the adopted domain model requires.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows, static/build | Passed; TypeScript and production bundles compile. |
| `node --test test/project-state/revision-history-lineage.test.cjs test/project-state/service-boundary.test.cjs test/validation/capability-map.test.cjs` | Normal Windows, focused capability/catalog | Passed 11/11 tests. |
| `npm run test:affected -- --changes tmp/scl01h-changes.json` | Normal Windows, work-item | Passed; receipt `8ecd5692-caa2-4f73-8860-dc6d9f565641`, 70/70 tests across 13 selected files, zero failure evidence. |
| `git diff --check` | Read-only source check | Passed. |

The work-item profile supplied static/build, fast and affected integration evidence. No renderer launch or external integration belongs to this domain-history card.

## Git and safety

The Operator directed one checkpoint commit for this card. Its hash is pending at report creation and will be reported after commit. The exact four-file staged diff was inspected; `git diff --cached --check` passed. The staged scan found zero secret hits, zero concrete local-path hits, and zero generated-artifact paths. No push, merge, rebase, reset, clean, restore, or stash was performed.

## Remaining validation and next task

Issued-record correction remains a separate typed policy decision; SCL01H prevents generic mutation until that policy is specified. SCL01I can continue with relationship semantics. No Operator experiential judgment is required for this card.
