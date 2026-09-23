# Structured Project State Architecture Audit — 2026-09-23

**Scope:** Reconcile the September 14 Structured Project State model with Work Intake Routing, Tester/Test Lifecycle, agent-free source control, and the September 22 V2 web/service topology before implementation.

## Executive Finding

The September 14 Structured Project State architecture remains the correct foundation and does **not** need a redesign.

It is already strong on:

- canonical application-generated identity;
- revision vs supersession vs derivation;
- immutable Decisions, Validations, Evidence and history;
- explicit typed Relationships;
- Work Items, Criteria, Findings, Root Causes and Bounded Solutions;
- Workflow, Phase and ImplementationRecord durability;
- validation freshness and deterministic completion;
- Markdown-as-projection rather than Markdown-as-state;
- ProjectStateService as the semantic boundary.

The implementation gap is real: there is no ProjectStateService implementation under `src/**`.

The architecture also predates several adopted post-September-14 concepts and needs a bounded domain uplift before persistence is implemented.

## Gaps Found

### 1. Work Intake is not first-class

The current domain model mentions Work Intake only in the Markdown replacement matrix and maps it loosely to Project metadata + Findings + Decisions + Relationships.

That is no longer sufficient.

WIR made Work Intake a durable body of work with identity, intent, routing history, source ownership, lifecycle and later integration state. It needs a canonical `WorkIntake` record.

### 2. Route assessment is not represented

The model has no durable home for the Architect's advisory route recommendation, traits and evidence.

The Operator route choice remains a `Decision`; the advisory assessment needs a distinct historical record so rerouting does not overwrite prior advice.

### 3. Source-control semantic references are underspecified

The source-control architecture now distinguishes Repository, SourceLine, SourceRevision, RepositoryCheckout, ImplementationRevision and IntegrationCandidate.

Those provider-owned objects remain RepositoryService-owned, but Project State needs durable semantic references that answer:

- which source line belongs to a Work Intake;
- which immutable revision was its base;
- which checkout is attached while executing;
- which ImplementationRevision backs review;
- which source checkpoint corresponds to a workflow boundary;
- what integration attempt/result moved the IntegrationTarget.

### 4. Tester architecture was adopted later

The Tester architecture defines durable semantic concepts including RegressionObligation, TestLifecycleAssessment, ImplementationProof and PermanentTestReference.

The canonical model should not create redundant types where existing types already fit:

- `RegressionObligation` becomes first-class Project State;
- TestLifecycleAssessment maps to `Validation` with a lifecycle-assessment type;
- ImplementationProof maps to immutable `Evidence`;
- PermanentTestReference maps to a typed `ProjectResource` or typed source reference linked to RegressionObligation.

### 5. Memory boundary needs explicit implementation guidance

AI Memory is not canonical Project State.

Memory retrieves, ranks and constructs context from Project State plus permitted external sources. Memory checkpoints and embeddings remain derived/rebuildable.

Project State events must therefore be consumable by a future MemoryService without allowing the Memory store to become a second write authority.

### 6. Physical persistence was intentionally deferred

The domain model intentionally did not select a database.

That decision can now be made without changing the domain model.

## Database Recommendation

Use **SQLite** as the first ProjectStateStore persistence engine.

Reasons:

1. ChampCity already requires one canonical writable Project State deployment at a time.
2. SQLite is embedded and deploys identically with a workstation-hosted or single-host server Service Host.
3. WAL mode allows readers to continue while the single writer appends transactions, which matches a ProjectStateService-owned write path.
4. The state corpus is relational/transactional and modest in volume compared with source repositories or media.
5. SQLite supports FTS5 for the later Memory/search system, while allowing Memory to remain a separate derived store.
6. SQLite keeps workstation deployment operational without requiring a database server.
7. The ProjectStateStore port preserves a future PostgreSQL adapter if ChampCity later needs multi-host concurrent writers or horizontal Service Host scaling.

## SQLite Authority Boundary

Use two logical databases when Memory is added:

```text
project-state.sqlite
    canonical Structured Project State
    Decisions / Workflows / Work Items / Evidence metadata / history / relationships
    authoritative writes only through ProjectStateService

memory.sqlite
    derived retrieval/index state
    FTS5
    summaries/chunks
    future embeddings/vector indexes
    rebuildable from authoritative sources
```

Do not put the authoritative Project State database inside the Git repository.

Do not place an active WAL-mode Project State database on a network filesystem.

Evidence payloads such as screenshots, large logs and binaries remain external/object/file storage referenced by immutable Evidence records; the authoritative DB stores identity, metadata, digest and payload reference.

## SQLite Runtime Recommendation

The current product requires Node 24 and Electron 44. Electron 44 carries Node 24.x. Node's built-in `node:sqlite` API is available in Node 24 and Electron fixed built-in SQLite support in the Electron 36 line.

Use the built-in `node:sqlite` adapter as the first implementation **only after a package/runtime capability card proves it in ChampCity's supported Electron and plain Node validation environments**.

The SQLite engine decision is adopted independently from that binding. `node:sqlite` remains behind `ProjectStateStore`, so a later driver replacement does not affect Product Core.

## Persistence Model Recommendation

Use a hybrid relational + validated JSON model rather than a table per domain type or an opaque document database.

Core tables should include conceptually:

- schema migration ledger;
- Project identity/current-version records;
- entity identity/current-version records;
- immutable entity-version payloads;
- typed Relationships;
- immutable StateChange audit;
- transactional outbox/events;
- state-provider generation/cutover metadata;
- optional rebuildable search indexes.

Common query fields remain relational/indexed: project, entity type, lineage, lifecycle, version and timestamps.

Type-specific semantic bodies are stored as canonical JSON validated by the Product Core type registry. This avoids a schema migration for every new domain field while preserving deterministic domain validation.

## Transaction Model

Every semantic command is one ProjectStateService transaction:

```text
validate command + expected revisions
→ apply entity/version changes
→ apply relationship changes
→ append StateChange records
→ append outbox event(s)
→ COMMIT
```

No observer may see a disposition without its Decision, or a new version without its audit record.

Use optimistic expected-version checks at the service boundary.

The Service Host owns one serialized mutation path. The DB may have multiple readers, but workflow code does not compete as independent SQLite writers.

## Durability Settings

For canonical Project State:

- foreign keys enabled;
- WAL mode;
- synchronous FULL;
- defensive mode;
- bounded busy timeout;
- integrity checks and application-owned backups;
- explicit schema migration versioning.

Performance optimization must not silently reduce authoritative-state durability.

## Migration Decision

Do not dual-write Markdown and Structured Project State as co-authorities.

Migration sequence:

1. inventory and snapshot legacy authoritative artifacts;
2. deterministically import into isolated/staged Structured Project State;
3. compare legacy projections and structured projections;
4. migrate workflow readers/writers to ProjectStateService behind compatibility façades;
5. shadow-read for mismatch detection;
6. acquire the legacy writer/execution fence;
7. recheck freshness;
8. atomically advance the Project's state-provider generation;
9. reject stale legacy writers;
10. render Markdown only as projection/export after cutover.

This reuses the existing migration design rather than introducing a second transition strategy.

## Placement in Source-Control Lifecycle Package

Structured Project State implementation is a dependency of SCL02 and later source-control workflow work.

The package order becomes:

```text
SCL01 — Repository/source-control semantic contracts
↓
SCL01A … SCL01Z — Structured Project State + SQLite + migration/cutover
↓
SCL02 — Save Work Intake first / source preparation second
↓
SCL03 … SCL10
```

SCL02 must use ProjectStateService directly. The temporary V1 Work Intake persistence adapter previously proposed by the source-control architecture is retired before implementation.
