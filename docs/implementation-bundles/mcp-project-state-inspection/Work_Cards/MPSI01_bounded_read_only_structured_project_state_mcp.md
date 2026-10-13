# MPSI01 — Bounded Read-Only Structured Project State MCP Inspection

**Type:** Work Card — forward capability  
**Starting baseline:** `6ec90dee7216a0653f11a24856f27039a1cde92e` on `Dev` (reverify at start)  
**Governing standards:** `AGENTS.md`; `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`; `docs/architecture/CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md`  
**Implementer Report:** `docs/implementation-bundles/mcp-project-state-inspection/Implementer_Reports/MPSI01_IMPLEMENTER_REPORT.md`

> Preserve the existing dirty `Dev` work, including `toolRegistry.ts` and the untracked Forgejo/WSF documents. Scope this implementation and its commit to attributable files only.

## Verified repository evidence

- `data_toolbox` is published as a reserved public MCP namespace with only `status`; neither it nor `diagnostics_toolbox` exposes registered Project SQL records.
- The selected Current Project's authoritative SQLite store is `<selected Project>/.champcity/project-state.sqlite`. `selectedCurrentProjectId()` already resolves its registration with containment/symlink checks.
- `createSQLiteProjectStateReader()` in `src/main/projectState/sqliteProjectStateStore.ts` is **already a read-only, defensive connection**, without migration or writer initialization. Its `ProjectStateReadPort` exposes `getEntity`, `getEntityVersion`, `listEntities`, `listRelationships`, `listStateChanges`, and `listOutbox`.
- Several list methods on that read port read **entire** collections, so simply calling them and slicing afterward is not acceptable for bounded MCP enumeration.
- The Agent Harness registry in `src/main/agentHarness/tools/toolRegistry.ts` already supports strictly validated `files.read` actions, exact `workspaceId` resolution, and controlled publication of tool contracts.
- `project_toolbox` remains reserved for semantic Project/source operations in the existing SCF04 Forgejo work card. Do **not** move this inspection capability into that namespace or collide with SCF04.
- The defect motivating this capability is concrete: an Architect cannot inspect the current/historical `ImplementationAttempt.layout.sources`, reserved `SourceBinding` entity version, relationships, or state-change chronology in `greenfield_test` through the current MCP interface. `repo_toolbox.read_file` correctly denies large/binary SQLite files; that is not a defect to relax.

## Objective and API ownership

Activate `data_toolbox` as a **typed, bounded, read-only inspector for the already registered Current Project's structured SQL state**. A connected Architect should be able to resolve exact entity IDs, read current and historical record versions, discover bounded records by entity type, and inspect related edges and chronological changes—without paths, raw SQL, application state writes, or manual database exports.

Use `context.root` from the **validated registered MCP workspace**, then derive the one selected `projectId` and canonical contained SQLite database using existing registration/path rules. Caller input must **not** select a Project ID, DB filename, filesystem root, alternate workspace or repository checkout. A Project may remain source-neutral; Git is not required for SQL inspection. Missing registration/store returns a bounded unavailable/not-registered result without creating either.

## Required implementation

### 1. Publish exact read actions on `data_toolbox`

Retain `status`, now reporting implemented availability and whether a registered Current Project SQL store exists. Add these bounded actions (names may be adjusted consistently with existing naming conventions):

- `inspect_entity`: required opaque `entityId`, optional **positive integer** `recordVersion`. Return the exact current or requested historical typed entity envelope, including `body` (notably `ImplementationAttempt.layout.sources` and `SourceBinding` fields), version, lineage, and lifecycle; clearly distinguish not-found versus version-not-found.
- `list_entities`: required validated `entityType`, bounded `limit` (default 20, max 50) and optional opaque continuation. Return ID/type/version/lifecycle/timestamps, not bulk full bodies; enable discoverability of `SourceBinding`, `ImplementationAttempt`, `ImplementationRecord`, `SourceCheckpoint`, etc.
- `list_entity_versions`: required `entityId`, bounded page. Return available version numbers and version/time/state summaries. Exact bodies remain retrieved through `inspect_entity(recordVersion)`.
- `list_entity_relationships`: required `entityId`, optional direction (`inbound`/`outbound`/`both`), optional active/ended selection, bounded page. Include relationship ID/type, endpoints and effective/end timestamps.
- `list_entity_changes`: required `entityId`, bounded chronological page of StateChange records (operation, from/to record version, timestamp, changed field names, reason, principal reference where safe, causation/correlation identifiers).

Every action returns the resolved `workspaceId` and Project identity in its bounded response, to prevent confusion between repositories, Workflows and Project containers. `entityId` and `entityType` are data selectors only, never raw SQL fragments. Unknown entity types, non-integer versions/limits, invalid cursors and unrecognized params fail input validation.

### 2. Keep database access genuinely read-only and bounded

- Reuse/extend the existing `createSQLiteProjectStateReader`/its hydration and domain validation logic, or add a narrowly related inspection read port. All database access must use a **read-only defensive SQLite connection**, parameterized fixed queries and guaranteed close/finally behavior.
- For enumerations, apply `LIMIT` and keyset/continuation **at the SQL query**, rather than materializing the entire entity/version/change/relationship corpus and slicing afterward. Use stable ordering and an explicit `hasMore`/`nextCursor`; no unbounded count/list fallback.
- Bound individual response size (target max 64 KiB) as well as row counts. For an oversized exact entity, return a clear bounded-size error/omission marker with a way to request a permitted subset of top-level body fields, rather than silently truncating identity/provenance or returning misleading partial records.
- Apply existing credential/secret redaction principles to returned bodies and diagnostic errors. Identify any redacted/omitted fields explicitly. Preserve exact ordinary SQL values where not redacted. Never return database bytes, absolute host paths, tokens, credentials or arbitrary SQLite internals.
- Reject missing, redirected or malformed `.champcity` paths and database files. No writer connection, migration, transaction that mutates authority, temporary database copy, backup export, WAL cleanup, SQL console or file-size exemption for `repo_toolbox`.
- This is a technical diagnostic capability, **not** a new authority for Operator dispositions, checkpoint repair or direct editing of historical records.

### 3. Preserve MCP registration and publication invariants

Implement the actions as existing `readAction`/`files.read` contracts. Activate `data_toolbox` without changing the stable 35-tool top-level namespace. Update the HOTFIX10 reserved-toolbox list and its contract assertions only to reflect the intentional promotion of `data_toolbox`, not to weaken unrelated status-only namespaces.

Use the current MCP contract publication mechanism so the new actions appear in `diagnostics_toolbox.tool_inventory` and are usable by reconnected authorized clients. `files.write` alone must not authorize read actions; invalid/unregistered `workspaceId` must fail closed. Do not silently fall back to `champcity_ai`, another workspace, or a machine-global SQL store.

## Acceptance / regression proof

Use disposable Git-neutral or Git-backed Current Project fixtures, not the live Greenfield database. Prove at minimum:

1. `data_toolbox.status` advertises the correct project-state capability; without registration it remains read-only and creates no `.champcity` folder or database.
2. An MCP client with only `files.read` selects a registered Project, lists `ImplementationAttempt`/ `SourceBinding` IDs, reads the parent attempt including `layout.sources`, retrieves a specified historical `SourceBinding` version, follows its relationships, and retrieves state changes that establish reservation/materialization ordering.
3. Current and historical records are clearly differentiated; a missing entity, absent version, invalid `entityType`, non-integer limit/version and invalid pagination cursor receive bounded deterministic results/errors.
4. Multi-page listing returns stable ordering without duplicates and never reads or returns all rows before limiting. Large individual bodies are explicitly bounded without silently corrupting returned evidence.
5. A second registered Project with different SQL data cannot be inspected through the first `workspaceId`; unknown workspace IDs, wrong-project entity IDs, redirected DB paths and unauthorized scope are rejected. No path or `projectId` override is accepted.
6. Snapshots of Project records, versions, state changes, outbox and provider generation are identical before/after repeated read actions. No Git state, file content or other Project directory is modified.
7. The remaining 34 public toolbox names, unrelated reserved actions, workflow candidate ingress, git/test/release actions and MCP publish/session contracts continue to behave as before. The top-level tool count stays 35.

Reuse or extend `test/agent-harness/reserved-toolbox-namespace.test.cjs`, `test/agent-harness/mcp-tool-contract-generation.test.cjs`, `test/agent-harness/registered-workspace-registry.test.cjs`, and applicable `test/project-state/sqlite-store-conformance.test.cjs` / `revision-history-lineage.test.cjs` owners. Add a new dedicated test file only for a materially uncovered SQL inspection boundary that these owners cannot reasonably cover; justify any addition in the report.

Use the canonical **work-item** validation planner/profile with the exact changed-path set, relevant MCP/Project-State capability owners and one required production build/static pass. Focused diagnostics first; do not repeatedly run broad unrelated suites or add duplicated standalone builds.

## Boundaries and handoff

**Expected areas:** `src/main/agentHarness/tools/toolRegistry.ts`, a bounded main-process Project State inspection service/read-port adjoining `src/main/projectState/`, and corresponding existing MCP/SQL tests/capability map where necessary. No renderer work, schema migration, source-control flow change, direct runtime SQL repair, Forgejo/bootstrap changes, new dependency, raw query strings, executable SQL argument, or arbitrary filesystem access.

This Work Card must **not** implement R18 or alter the real `greenfield_test` SQL/Git history. After implementation, the Architect should be able to use only ChampCity MCP, scoped to `greenfield_test`, to inspect the historical reservation and diagnose the existing Repair Start failure precisely.

## Implementer Report and checkpoint

Write `Dev/docs/implementation-bundles/mcp-project-state-inspection/Implementer_Reports/MPSI01_IMPLEMENTER_REPORT.md`. Identify files and actions added, existing read-port reuse vs bounded extensions, read-only/containment/redaction/pagination proof, tests reused/extended/new with any coverage-gap justification, planner/build receipts, Git scope, and remaining live (read-only) MCP qualification.

Checkpoint only attributable implementation/test/report files with message:

`MPSI01 expose bounded read-only Project State MCP inspection`

Stop for Architect code review after the checkpoint. No live DB mutation, push, release or unrelated work.
