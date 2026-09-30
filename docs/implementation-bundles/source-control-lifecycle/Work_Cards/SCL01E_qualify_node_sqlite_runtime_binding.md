# SCL01E — Qualify the Node SQLite Runtime Binding

**Depends on:** SCL01D  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01E_IMPLEMENTER_REPORT.md`

## Objective

Prove the selected SQLite engine can be accessed through the preferred built-in `node:sqlite` binding in ChampCity's supported runtime/package environments before production persistence is built on it.

## Required Changes

1. Add a bounded capability probe using `node:sqlite`.
2. Prove file-backed DB creation, transaction rollback/commit, prepared statements, foreign keys, WAL, defensive mode where exposed, backup API and integrity query.
3. Query and record the actual SQLite engine version in both Node and Electron; require SQLite 3.51.3 or a later build containing the WAL-reset corruption fix before canonical WAL use.
4. Run the probe in normal Node validation and Electron main/service-host runtime.
5. Include packaged Windows proof through the applicable packaging/desktop lane without expanding into full release qualification.
6. Record binding/runtime/SQLite version evidence.

## Constraints

- SQLite engine choice is already adopted.
- If `node:sqlite` fails required supported-runtime proof, stop with a blocker; do not select a third-party driver autonomously.
- No domain persistence implementation in this card.

## Acceptance Criteria

Required SQLite capabilities work in supported Node/Electron/package contexts with no native npm SQLite addon.

## Validation

Focused capability test plus applicable desktop/packaging validation lanes.

## Post-Implementation

Report + checkpoint; continue to SCL01F.
