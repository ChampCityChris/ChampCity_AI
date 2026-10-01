# ChampCity Structured Project State SQLite Persistence Architecture

**Status:** Adopted V2 implementation architecture — 2026-09-23  
**Applies to:** `ProjectStateService` / `ProjectStateStore` implementation  
**Domain owner:** `CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md`

## 1. Decision

ChampCity will implement the first durable Structured Project State store using **SQLite**.

SQLite is an infrastructure adapter. Product Core, WorkflowService, the Web Client and models do not issue SQL or depend on SQLite-specific semantics.

The permanent boundary remains:

```text
WorkflowService / ProjectService / RepositoryService / MemoryService
                         ↓
                 ProjectStateService
                         ↓
                 ProjectStateStore port
                         ↓
                    SQLite adapter
```

A future persistence adapter may replace SQLite without changing canonical domain identities or service contracts.

## 2. Why SQLite Fits ChampCity

ChampCity's governing state rule is one canonical writable Project State deployment at a time.

That means Project State needs:

- strong local transactions;
- durable history;
- deterministic queries;
- simple workstation deployment;
- single-host server deployment;
- backup/export/recovery;
- no external database daemon as a workstation prerequisite.

SQLite directly fits that operating model.

WAL mode permits concurrent readers while a writer is active but still serializes writes, matching the ProjectStateService rule that canonical mutations flow through one service-owned mutation path.

If ChampCity later permits multiple Service Hosts to write the same canonical Project State concurrently across hosts, that is a deployment architecture change and should introduce a different store adapter such as PostgreSQL rather than weakening SQLite ownership rules.

## 3. Runtime Binding

The first adapter should prefer the Node runtime's built-in `node:sqlite` implementation.

This choice is subject to an explicit runtime/package capability proof because the Node 24 API is still release-candidate status.

The capability proof must also query the actual embedded SQLite engine version and require SQLite 3.51.3 or a later build containing the WAL-reset corruption fix before enabling canonical WAL operation.

The implementation card must prove:

- plain Node execution in the supported Node 24 range;
- Electron main/service-host execution in the packaged Electron version;
- packaged Windows artifact loading;
- required SQLite features and pragmas;
- backup/integrity behavior.

Failure of that capability proof blocks the binding choice; it does not reopen the SQLite engine decision or authorize an Implementer to select another dependency autonomously.

The `ProjectStateStore` interface must be asynchronous even if the first adapter uses synchronous SQLite APIs. This prevents the synchronous implementation detail from becoming a permanent service contract.

## 4. Store Layout

The canonical store is Service-Host-owned data, not repository content.

Conceptual host data layout:

```text
<ChampCity data root>/
    project-state/
        project-state.sqlite
        backups/
    memory/
        memory.sqlite          # future, derived/rebuildable
    evidence/
        ...                    # payload/object storage
```

The exact host path belongs to Environment/Service Host configuration and is not persisted as Project identity.

One Service Host may hold multiple Projects in one Project State database. Every Project-scoped table includes canonical `projectId` ownership.

Project transfer uses structured export/import semantics rather than copying a live database file as the product API.

## 5. Canonical vs Derived Stores

`project-state.sqlite` is authoritative.

`memory.sqlite`, FTS indexes, embeddings, caches, read models and generated Markdown are derived.

A MemoryService may subscribe to committed Project State events and construct retrieval indexes. Deleting the Memory database must not destroy canonical product/workflow state.

Memory retrieval cannot mutate Project State except by issuing a normal authorized semantic ProjectStateService command.

## 6. Relational/JSON Storage Strategy

Use a hybrid representation.

### Relational identity/envelope

Keep frequently queried invariants in relational columns:

- canonical ID;
- project ID;
- entity type;
- lineage ID;
- current record version;
- lifecycle state;
- created/updated/closed/superseded timestamps;
- schema version where applicable.

### Immutable version payload

Each semantic record version stores its type-specific body as canonical validated JSON.

The Product Core record-type registry validates the payload before persistence and after hydration.

This provides schema flexibility without turning the database into unvalidated document storage.

### Core logical tables

The first schema should cover:

```text
schema_migrations
projects
project_versions
state_entities
state_entity_versions
relationships
state_changes
outbox_events
project_state_authority
```

Additional indexes/projection tables are permitted only when derived from canonical rows and rebuildable.

## 7. Revisions and Immutability

Entity identity and entity version are separate.

A mutable semantic entity receives immutable version rows while its identity row points to the current version.

Immutable entity types such as issued Validation, effective Decision and relied-upon Evidence reject revision operations according to domain policy; correction creates new records/relationships.

Supersession creates a new canonical entity identity sharing the lineage and a `supersedes` relationship.

No UPDATE may silently rewrite historical semantic content.

## 8. Relationships

Relationships are first-class rows with schema-registered predicate/type rules.

Creation validates:

- both endpoints exist;
- Project ownership matches unless a specifically registered cross-project relationship exists;
- relationship predicate permits the endpoint types/direction;
- immutable provenance edges cannot be ended/deleted contrary to policy.

Historical relationships are ended by validity metadata rather than physically erased.

## 9. Transactions and Concurrency

A semantic command executes as one database transaction.

All authoritative mutations include their StateChange audit and outbox events in the same transaction.

Use optimistic concurrency:

```text
expected current version
→ compare inside transaction
→ mutate only if exact
→ otherwise STALE_STATE
```

ProjectStateService owns write serialization.

SQLite lock errors are infrastructure failures, not workflow Decisions.

The adapter uses a bounded busy timeout and returns typed persistence errors; workflow code must not implement retry loops by parsing SQLite error strings.

## 10. SQLite Configuration

At database initialization verify and enforce:

```text
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
```

Use defensive mode when provided by the runtime adapter.

Do not enable arbitrary extension loading in normal Project State operation.

WAL databases must remain on storage local to the Service Host. Do not support an active Project State database over SMB/NFS/network filesystems.

## 11. Search and Memory

Structured Project State queries use canonical indexed fields and type-aware predicates.

FTS is not required to decide workflow state.

A rebuildable FTS5 index may be used for human search, export search or future MemoryService retrieval.

The future Memory store may use FTS5 and later a vector extension/index, but embeddings and semantic-search indexes never become canonical Project State.

## 12. Evidence Payloads

Do not place large binary evidence directly into ordinary state rows.

Evidence records store:

- canonical Evidence identity;
- media/logical type;
- digest;
- size;
- immutable payload reference;
- provenance.

The payload storage adapter owns screenshots, large logs, archives and similar bytes.

Small bounded textual evidence may be stored inline when the Evidence policy explicitly permits it.

## 13. Backup and Recovery

Project State must support application-owned online backups.

Required mechanics include:

- backup creation through the adapter;
- integrity check before qualifying a backup;
- bounded backup retention policy;
- restore into an isolated candidate database;
- integrity/schema verification before selecting a restored store;
- recovery evidence/audit.

Copying only the main SQLite file while live WAL state is unaccounted for is not an approved backup procedure.

Structured export is useful for portability/audit but is not a substitute for an exact persistence backup.

## 14. Schema Migration

Schema changes are application-owned migrations.

Each migration has a stable ID/version and executes transactionally where SQLite permits.

Startup:

1. inspect migration ledger;
2. reject unsupported future schema versions;
3. apply known forward migrations in order;
4. verify expected schema/invariants;
5. open ProjectStateService for normal mutation.

Models do not author or execute migration SQL.

## 15. Legacy Cutover

Legacy Markdown state and Structured Project State must never be simultaneous canonical writers.

Before cutover ChampCity may:

- import to isolated staged SQLite;
- compare projections;
- run shadow reads.

Cutover requires a generation/writer fence.

After cutover:

- ProjectStateService is canonical;
- old-generation writers are rejected;
- repository Markdown may be generated as projection/export;
- filesystem changes to generated Markdown do not mutate state;
- recovery determines canonical provider from durable provider-generation state, not from client assumptions.

## 16. Memory-System Compatibility

The larger Memory system should reuse SQLite as an implementation engine where practical but not the same authority schema.

Recommended split:

```text
ProjectStateService
    project-state.sqlite     authoritative

MemoryService
    memory.sqlite            derived
      FTS5
      context chunks
      summaries
      retrieval metadata
      future embeddings
```

Project State emits committed semantic events. Memory consumes those events idempotently.

This gives Memory fast local retrieval while preserving the rule that deleting/rebuilding Memory cannot change what ChampCity knows canonically about the Project.

## Workflow Intake compatibility (RWS04A)

`WorkflowIntake` and its record-version-scoped Operator review Decisions are canonical SQL state. Generated Markdown is a human-readable projection, and changes to that projection do not change or delete Intake state. Existing entity tables store open-text `entity_type` and validated `body_json`; registering WorkflowIntake and `intake_for` requires no SQLite table or schema migration. Existing-schema reopen proof verifies unchanged schema definitions, migration receipts, and authority rows after storing the new entity.

`project_state_authority=structured` is the final project-wide legacy-writer cutoff. It does not require every domain to remain legacy until final cutover: incremental workspace-family migration may adopt structured entities earlier. RWS04A leaves that fence and all production Intake callers unchanged.


## RWS04C Intake activation

All seven substantive Workflow Intake families use exact WorkflowIntake SQL records and exact-record-version Operator Decisions. First access invokes the bounded RWS04B migration; ambiguous legacy sources remain unchanged with a precise blocker.

`Intake form -> SQL WorkflowIntake -> generated Markdown projection -> Operator review -> SQL Decision`

`Intake right pane = Markdown review projection`

`Architect workspaces right pane = embedded ChatGPT where applicable`

Save/review commits SQL before derived Markdown materialization. Materialization errors are reported separately and never reverse SQL. Generated Intake Markdown is rebuildable review output and excluded from legacy canonical discovery; manual file edits never update SQL. Greenfield preserves the familiar Intake path and form, and Architect preparation consumes approved structured Intake. Unsaved edits or a revised Intake disable continuation until the current revision is approved. The shared top stage rail and generic Intake shell remain unchanged.

Intake authority is independent of `project_state_authority`. The final project-wide structured marker remains deferred until every still-authoritative legacy family migrates; the global legacy writer fence is unchanged.

## RWS05 Architect family cutover - 2026-10-01

The seven substantive Workflow types now use:

`approved SQL WorkflowIntake -> Architect interaction -> semantic SQL records -> ArchitectReviewCycle -> generated Markdown review projection -> exact-version SQL Decision -> next-stage eligibility`

ArchitectReviewCycle holds exact Workflow/type/stage identity and the semantic-member version digest. It is a grouping/version anchor, not a duplicate document entity. Typed model-authored JSON is bounded transport; proposed Findings, RootCauses, BoundedSolutions, Criteria and Evidence persist atomically before Operator disposition. Human Operator Decisions govern an exact current cycle revision. Material semantic or source-Intake changes invalidate prior eligibility.

ArchitectWorkspaceShell frames left review/actions and right embedded ChatGPT. StructuredArchitectWorkspace owns review state; App retains exact-Workflow routing, Greenfield application rail status and browser-host mechanics. It no longer owns Interview recovery, draft promotion, canonical prompt freshness or review composition. Generated Architect Markdown is derived and rematerializable, excluded from canonical discovery and never parsed back into authority. Historical free-form Interview files are preserved and require a fresh structured cycle. Unambiguous accepted legacy Feature/Issue SQL sets adopt without recreating their records; ambiguous sets block.

Project Creation approval enables existing Project Planning; Feature approval enables existing Feature Planning; Issue RCA approval enables existing Correction Planning. Migration, Integration, Infrastructure and Research Planning stays Not Ready after assessment approval. Registered Projects require SQL prerequisites; historical unregistered Planning-document utilities remain in the later-family infrastructure, outside current Architect Workflow authority. The project-wide project_state_authority cutoff and SQLite schema version are unchanged. Planning-family migration starts only after Architect and Operator acceptance of RWS05.

Automated proofs do not establish Operator visual acceptance. The bundle qualification report records deterministic results and the single-pass visual validation target.
