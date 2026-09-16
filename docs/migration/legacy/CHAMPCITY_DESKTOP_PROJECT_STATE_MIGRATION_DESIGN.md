# ChampCity Desktop Project-State Migration Design

> **Vocabulary reconciliation — 2026-09-14:** This optional legacy-import design intentionally preserves older V1 terminology where it describes source artifacts, historical records, or cutover semantics. Under `CCAI-VOCAB-001`, those legacy terms must be translated at the migration boundary into precise V2 concepts such as Operator Decisions/dispositions, canonical source/write ownership, validation basis, workflow eligibility, scope, policy, access, state, evidence, or integrity. Legacy wording in this document does not establish V2 vocabulary.

## 1. Purpose

If ChampCity later provides a V1 legacy-import utility, it must move selected repository-resident project state into the Structured Project State architecture without losing Operator Decisions/dispositions, provenance, history, repair causality, validation evidence, or recoverability.

Any such importer must be deterministic enough to run against copies of existing ChampCity projects before imported state becomes the canonical Project State source.

This design defines a possible conversion boundary from the current Markdown/file-backed model into canonical Project State. It is intentionally persistence-engine-neutral at the domain level. It does not define the normal V2 project-creation path and does not gate Desktop/Server state implementation.

The governing direction is:

```text
Legacy Repository Artifacts
        │
        ▼
Immutable Source Snapshot + Manifest
        │
        ▼
Deterministic Classification and Extraction
        │
        ▼
Migration Plan + Conflict Ledger
        │
        ▼
Canonical Structured Project State
        │
        ├──> Desktop UI/read models
        ├──> agent context
        ├──> Markdown rendered views
        ├──> structured export package
        └──> Server-compatible state architecture
```

After accepted cutover, legacy Markdown is provenance/evidence. It is no longer the canonical workflow-state source.

---

## 2. Governing Architecture

This design is subordinate to:

- `CHAMPCITY_PRODUCT_CAPABILITY_MODEL.md`;
- `CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md`;
- `CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md`; and
- the Product Core / Desktop / Server separation already established for V2.

`../SOURCE_EXTRACTION_MAP.md` is its source-mapping companion. `../../design-notes/history/CHAMPCITY_PROJECT_MEMORY_AND_AUTONOMOUS_WORKBENCH_ARCHITECTURE.md` supplies historical rationale for bounded workers and retrieval, not overriding state, identity, or recovery semantics. The [corpus index](../../architecture/CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md) records document status and outstanding contract gates. This documentation reconciliation does not select a Server database or adopt pending proposals.

The migration therefore inherits these rules:

1. Canonical Project State is structured state, not Markdown.
2. Canonical IDs are opaque application-generated identities.
3. Legacy human IDs such as `ISSUE_007`, `ISSUE_007-FC02`, and `REPAIR01` are aliases or imported references, not canonical keys.
4. Disposition State is derived from effective Decisions.
5. Validation does not independently create an Operator Decision or disposition.
6. Superseded and historical records remain queryable.
7. Evidence relied upon by current Decisions/validation/completion state is immutable.
8. Material historical meaning may not be silently rewritten during import.
9. Markdown is a rendered view/export after migration.
10. Desktop and Server share migration/domain behavior but use deployment-specific adapters.

The migration engine must not recreate the current architecture by placing repository parsing behind a generic filesystem abstraction. The target is semantic Project State.

---

## 3. Scope

The migration includes repository artifacts whose current or historical purpose is to represent mutable project/workflow state, including:

- project-state snapshots;
- project/work intake artifacts;
- issue records;
- planning and resolution artifacts;
- Architect investigations and reviews;
- bounded solutions;
- Work Cards;
- Fix Cards;
- Repair Cards/contracts;
- acceptance criteria;
- Implementer Reports;
- validation records;
- Operator dispositions;
- close records;
- screenshot/log/test evidence;
- planning revision history;
- draft/promoted artifact history where it affects provenance;
- relationships currently encoded in filenames, directories, metadata, or references; and
- legacy `workspaceId` bindings where needed only to identify the historical repository/resource attachment.

This migration does **not** convert documents that are documents by nature rather than live Project State. Architecture, governance, standards, repository guidance, design discussion, and similar durable Markdown remain ordinary source-controlled documents unless a separate feature explicitly imports them as Project Resources.

---

## 4. Non-Goals

The migration does not:

- make Markdown authoritative in the new system;
- derive canonical IDs from filenames, paths, Git hashes, or legacy workspace IDs;
- infer authority from filesystem location;
- use file modification time as lifecycle or decision truth;
- use an LLM to decide conflicts or lifecycle state;
- rewrite or delete original history merely because structured equivalents exist;
- require event sourcing;
- require SQLite-specific domain semantics;
- make Server consume the Desktop repository tree as its database; or
- guarantee byte-for-byte regeneration of historical Markdown formatting.

---

## 5. Migration Determinism

“Deterministic migration” means that the same accepted source snapshot, parser registry version, domain schema version, and explicit conflict dispositions produce the same semantic Project State:

- same entity types;
- same imported legacy aliases;
- same field values;
- same relationships;
- same lineage and supersession conclusions;
- same validation results;
- same effective Decisions;
- same lifecycle conclusions;
- same unresolved/blocking conflicts; and
- equivalent generated views.

Canonical opaque IDs do not need to be mathematically derived from source paths to satisfy this requirement.

Deriving IDs from legacy filenames would make repository layout part of domain identity and would violate the new identity boundary. Instead, a migration run persists a stable mapping from migration-local object keys to application-generated canonical IDs. Resuming or rerunning the same migration snapshot reuses that mapping.

A completely independent migration into an empty database may generate different opaque IDs while still being semantically equivalent. Tests therefore compare a normalized graph and imported aliases rather than raw canonical ID bytes unless the migration is a resume/recovery test.

---

## 6. Core Migration Records

The migration subsystem should maintain explicit administrative records separate from ordinary Project State.

### 6.1 `MigrationRun`

Minimum logical fields:

```text
id
projectId
migrationVersion
parserRegistryVersion
targetSchemaVersion
sourceSnapshotId
status
startedAt
completedAt
cutoverAt
createdBy
conflictCount
blockingConflictCount
manifestHash
planHash
verificationHash
cutoverCheckpointId
```

Suggested states:

```text
discovered
snapshotted
parsed
blocked
planned
staged
verified
awaiting_cutover
cutover
finalized
failed
rolled_back
```

### 6.2 `SourceSnapshot`

Represents the exact repository input presented to the migration engine.

It records repository/resource identity and the immutable manifest used for the run. A dirty working tree is valid input provided the snapshot captures the actual bytes being migrated.

### 6.3 `SourceArtifact`

Represents one captured source file, not one canonical domain entity.

Minimum provenance fields should include:

```text
sourceArtifactId
sourceSnapshotId
physicalRelativePath
normalizedRelativePath
contentSha256
sizeBytes
mediaType
capturedAt
gitTracked
sourceGitHead        optional
sourceGitBlobId      optional
filesystemModifiedAt informational only
embeddedSchemaVersion optional
embeddedArtifactType  optional
embeddedArtifactRevision optional
embeddedLegacyAliases[]
embeddedSourceReferences[]
archiveContext
preservedBlobRef
```

### 6.4 `MigrationObjectKey`

A migration-local semantic key used only while constructing the import graph.

Examples:

```text
legacy-issue:ISSUE_007
legacy-work-item:ISSUE_007-FC02
legacy-validation:ISSUE_007-FC02:attempt-1
legacy-repair:ISSUE_007-FC02-REPAIR01
```

These keys support deterministic planning and deduplication. They are not canonical IDs and must not leak into Product Core as identity authority.

### 6.5 `MigrationEntityMap`

Maps each accepted `MigrationObjectKey` to one opaque canonical ID. This map is persisted with the migration run so interrupted imports can resume idempotently.

### 6.6 `MigrationConflict`

A first-class record for facts the importer cannot safely resolve mechanically.

Minimum fields:

```text
id
migrationRunId
conflictType
severity
affectedSourceArtifactIds[]
affectedMigrationObjectKeys[]
description
candidateValues[]
resolutionStatus
resolution
resolvedBy
resolvedAt
```

---

## 7. Source Snapshot and Manifest Rules

Migration begins by freezing the input, not by parsing live files in place.

### 7.1 Snapshot rules

1. Enumerate every candidate project-state file and referenced evidence object.
2. Capture the exact bytes or a content-addressed immutable copy.
3. Calculate SHA-256 for every captured file.
4. Record the current physical path separately from any embedded historical path.
5. Record Git metadata when available, but do not require a clean repository.
6. Compute a canonical manifest hash after deterministic path ordering.
7. Perform all later parsing against the captured snapshot, not the mutable live repository.

### 7.2 Dirty repositories

A dirty repository is not a migration failure.

The source snapshot represents what actually exists at migration time. Git HEAD is useful provenance but cannot substitute for uncommitted file contents.

### 7.3 Physical path versus legacy reference

These are separate provenance facts.

For example, the recorded ChampCity source corpus contains artifacts physically under:

```text
archive/development-history/issues/ISSUE_007/...
```

while embedded metadata and prose still reference historical locations such as:

```text
issues/ISSUE_007/...
```

The importer must preserve both. It must not rewrite embedded legacy references merely because repository cleanup later moved the file.

### 7.4 Snapshot freshness and the cutover write fence

An immutable snapshot is stable input, not proof that the live Project still matches it. Legacy writes may continue during planning/staging, but those writes can invalidate the verified result.

Before switching authority, the migration operation must acquire an exclusive semantic cutover fence covering all legacy state writers, affected resource/binding changes, and active executions capable of producing late writes. Quiesce or revoke those writers and account for in-flight work before the final comparison. A UI button disabled in one client is not a sufficient fence.

Under that fence, compare the live authority-bearing corpus, relevant evidence, resource bindings, and source generation with the accepted snapshot/manifest. Detect additions, removals, and changed bytes—not only changed Git HEAD or filesystem timestamps. If exclusive control cannot be established or any relevant input differs, do not cut over: retain the staged result as non-authoritative, capture the changed input, and repeat snapshot, planning, verification, and acceptance as required.

Operator acceptance must identify the verified migration result: snapshot/manifest, plan, parser/schema versions, conflict dispositions, verification result, and target binding. Acceptance of an older result does not authorize a newly changed import. The fence need not be held throughout human review; it must be reacquired and the accepted result revalidated immediately before switching, and held through the authoritative switch.

After the switch, old sessions and delayed execution callbacks must be unable to write legacy authority. A provider/generation fence or equivalent mechanism must reject stale writers, even if they were started before cutover. The implementation mechanism is deferred; the exclusion and rejection semantics are required. Uncontrolled external writers must be stopped or isolated, or cutover remains blocked.

---

## 8. Candidate Discovery and Classification

Every candidate source file must receive exactly one migration classification.

Classification priority is deterministic:

1. Valid `CHAMPCITY-METADATA.artifactType` plus supported `schemaVersion`.
2. Registered exact historical format signature.
3. Registered path/filename family plus required structural headings.
4. Explicit non-state document exclusion rule.
5. Unknown/unclassified.

An LLM is not part of classification.

### 8.1 Metadata precedence

Valid embedded metadata is preferred over filename inference.

However, a material identity disagreement between metadata and filename/path is not silently resolved. It creates a conflict because the file may have been copied, renamed incorrectly, or partially corrupted.

### 8.2 Archive folders

Folder location such as `archive/` is source context only.

It does not by itself decide the canonical entity’s lifecycle or authority state. ChampCity cleanup moved large parts of development history into an archive hierarchy; using folder location as lifecycle truth would therefore destroy semantic accuracy.

### 8.3 Draft folders

Draft artifacts are classified separately from promoted/accepted artifacts.

A draft may create proposed/advisory records or legacy Evidence, but it may not override a promoted artifact or effective Decision merely because its timestamp is newer.

---

## 9. Parser Registry

Migration uses a versioned parser registry. Each supported legacy artifact family has an explicit parser contract.

A parser may read:

- embedded JSON metadata;
- exact headings;
- exact structured tables;
- explicit identifiers;
- explicit revision/attempt numbers;
- explicit source references; and
- verbatim body sections assigned by the parser contract.

A parser may not invent missing facts by semantic interpretation.

If an old artifact does not contain enough structure to deterministically populate a canonical field, the original source remains Evidence and the field remains absent/unknown. If the missing fact is necessary to establish authority or current lifecycle, a blocking conflict is created.

### 9.1 Parser versioning

Every migration run records the parser registry version. Parser changes that alter semantic output require a new migration version and new golden-corpus expectations.

---

## 10. Legacy Artifact to Canonical State Rules

The following rules define the default conversion model. Exact legacy parser versions may add format-specific detail but may not contradict these semantics.

| Legacy artifact | Canonical conversion |
|---|---|
| Project-state Markdown | Input to Project metadata/current-view reconstruction; original retained as legacy Evidence; never becomes a monolithic canonical state record |
| Work/project intake | Project metadata, Findings, Decisions, Relationships where deterministically encoded; original retained as Evidence |
| Issue record | `Finding`; screenshot/log references become related Evidence candidates |
| Architect investigation | Deterministically recognized Findings, Root Causes, Bounded Solutions and Evidence; unstructured remainder retained verbatim as advisory Evidence |
| Architect review | Advisory Validation/Evidence and any explicitly recorded Decision; review prose itself retained as Evidence |
| Issue resolution/planning document | Bounded Solutions, Criteria, candidate Work Items and Relationships only where the legacy format explicitly encodes them |
| Fix Card plan | Candidate `WorkItem(kind=fix)` records and `depends_on`/ordering relationships where explicitly encoded |
| Work Card | `WorkItem`; embedded acceptance criteria become first-class Criterion records |
| Fix Card | `WorkItem(kind=fix)`; source plan links and criteria become Relationships/Criteria |
| Repair Card/repair contract | `WorkItem(kind=repair)` plus `repairs` relationship to the exact immediate parent; authority must come from the governing Decision |
| Implementer Report | Implementation Evidence plus deterministic Work Item implementation-state changes supported by the format |
| Validation record | `Validation` plus supporting Evidence; Operator disposition is imported separately as a `Decision` when explicitly encoded |
| Validate Passed disposition | Effective `Decision` carrying accepted/passed authority for the governed target |
| Request Repair disposition | Effective `Decision` carrying `revision_requested`; subsequent repair remains a separate related Work Item |
| Close record | Mechanical closure evidence/state transition tied to the governing accepted validation/Decision; must not invent a second contradictory authority decision |
| Planning history revision | Historical source Evidence and, where explicitly represented, prior record revision/supersession provenance |
| Screenshot/image | Immutable `Evidence` payload with media type, hash, source path and capture provenance |
| Test/log output | Immutable `Evidence` when referenced by migrated authoritative state |
| Architect draft | Proposed/advisory source; deduplicated against promoted copy when identity/content prove equivalence |
| Repository architecture/governance Markdown | Excluded from mutable Project State unless separately imported as Project Resource |

The complete durable representation of Workflow/Phase/Plan, implementation semantic results, and checkpoints remains a design dependency (F06). This table must be reconciled with that coverage matrix before dependent parsers or lossless-export claims are finalized; it does not authorize arbitrary metadata to fill missing model semantics.

---

## 11. Identity, Alias, Revision, and Lineage Rules

### 11.1 Canonical identity

Canonical IDs are generated by the target Project State service.

Legacy values such as:

```text
ISSUE_007
ISSUE_007-FC02
ISSUE_007-FC02-REPAIR01
ATTEMPT01
```

are stored as typed legacy aliases and provenance references.

### 11.2 Idempotency

Before creating an entity, the importer checks the `MigrationEntityMap` for the current migration snapshot.

A resumed migration must reuse the previously allocated canonical ID rather than create a duplicate.

### 11.3 Artifact revision versus entity revision

Legacy `artifactRevision` does not automatically mean semantic supersession.

If multiple artifacts represent edits to the same not-yet-relied-upon object, they may map to revisions of one canonical entity.

If a later source represents a materially different semantic successor to an already relied-upon record, the migration plan must create a new entity with the same `lineageId` and an explicit `supersedes` relationship.

When the source does not provide enough evidence to distinguish revision from supersession, the importer must not guess. The earlier material is retained as Evidence and the case enters the conflict ledger if the distinction affects current state.

### 11.4 Repair genealogy

Repair identity is never reconstructed merely from directory nesting.

Use explicit metadata/contract identity first. A repair must resolve to its exact immediate parent Work Item and to the Decision that authorized revision. Missing parent or authority is a blocking conflict for current-state import.

---

## 12. Relationship Reconstruction Rules

Relationships are created only from registered deterministic signals.

Examples include:

- explicit `dependsOn` arrays → `depends_on`;
- repair immediate parent → `repairs`;
- source plan/card references → `derived_from` or the specific registered relationship;
- Work Item to Bounded Solution → `implements` where the legacy format explicitly establishes the association;
- criteria embedded in a card → `defines_criterion`;
- validation target → `evaluates`;
- evidence reference → `supports`;
- explicit replacement → `supersedes`;
- Decision target → `governs`.

Embedded path references are resolved through a legacy-reference resolver that understands both historical paths and current physical archive paths.

Unresolved references are retained in provenance. They become blocking only when required to establish authority, repair causality, lifecycle, or another domain invariant.

---

## 13. Authority Migration Rules

Authority is the highest-risk part of the migration and uses stricter rules than descriptive content.

### 13.1 Allowed authority sources

Authority may be imported only from an artifact format that explicitly records a recognized Decision/disposition and its governed target.

Examples include explicit Operator validation disposition, approved contract disposition, or another registered historical authority record.

### 13.2 Disallowed authority inference

The importer must not infer authority from:

- directory location;
- filename suffix;
- most recent filesystem modification time;
- existence of an Implementer Report;
- test success;
- Architect recommendation alone;
- a close file without its governing validation/Decision context;
- draft status; or
- an LLM interpretation of prose.

### 13.3 Validation and Decision separation

A legacy validation document that contains both technical/advisory assessment and Operator disposition is split into:

```text
Validation
    evaluates -> target

Decision
    governs -> target
```

Record the explicit source trace linking the Decision to its observed assessment. If that source establishes derivation, the registered `Decision -> derived_from -> Validation` relation may express it; do not invent an `informed_by` predicate. A distinct assessment-basis relation, if needed beyond derivation/provenance, requires an explicit registry extension with defined endpoints and remains open under F04.

The Decision drives derived Authority State. A Validation result alone does not grant authority.

### 13.4 Ordering

Decision ordering uses explicit semantic data first:

1. explicit effective/decided timestamp;
2. explicit attempt/revision sequence where the format defines it;
3. explicit supersession/replacement relation;
4. otherwise conflict.

Filesystem modification time is never used to choose the effective Decision. The complete version-bound authority reduction and stale-validation contract remains F07; these legacy parser priorities do not settle it.

---

## 14. Timestamp Rules

Migration distinguishes canonical-record creation from historical semantic occurrence.

- `createdAt` on the new canonical record may reflect import creation when no reliable historical creation instant exists.
- Domain timestamps such as `observedAt`, `performedAt`, `decidedAt`, and `implementedAt` are populated only from reliable legacy fields registered by the parser.
- Git author/commit timestamps may be retained as provenance but are not semantic timestamps unless a specific legacy contract defined them that way.
- Filesystem modification time is informational provenance only.
- Missing historical time remains unknown; migration must not synthesize false precision.

This avoids turning repository housekeeping or archive moves into false project history.

---

## 15. Conflict Handling

Conflicts are expected migration outputs, not exceptional crashes.

### 15.1 Conflict severities

```text
informational
warning
blocking
```

A blocking conflict prevents cutover for the affected project until explicitly resolved.

### 15.2 Deterministic conflict classes

| Conflict | Default behavior |
|---|---|
| Same legacy identity, same content | Deduplicate canonical semantics; preserve every source path in provenance |
| Same legacy identity, different content, explicit ordered revisions | Import according to registered revision semantics |
| Same legacy identity, different content, no reliable ordering | Blocking conflict if current state/authority is affected; otherwise preserve both as historical Evidence with warning |
| Metadata identity conflicts with filename/path identity | Blocking for authority-bearing/current artifacts; warning/evidence-only for non-authoritative history |
| Malformed `CHAMPCITY-METADATA` | Fall back only to a registered historical parser; if authority-bearing meaning depends on malformed metadata, block |
| Referenced artifact missing | Preserve unresolved reference; block if required for authority, repair genealogy, or lifecycle invariant |
| Multiple files satisfy one embedded legacy path | Resolve only with exact identity/hash rules; otherwise conflict |
| Draft and promoted copy are byte-identical | One semantic record, multiple provenance sources |
| Draft and promoted copy differ | Promoted artifact controls only if promotion/authority is explicitly established; retain draft as history |
| Validation says `RequestRepair`, later repair/validation exists | Import as a sequence, not a conflict, when target and attempt lineage are explicit |
| Two effective Decisions claim incompatible authority for same target with no ordering | Blocking conflict |
| Close record exists but governing accepted Decision is absent | Blocking for current closed-state assertion; close record retained as Evidence |
| Legacy workspace/repository mapping ambiguous | Blocking project-resource binding conflict; never guess `projectId` |
| Unknown artifact type | Preserve in source archive; warning unless referenced by authoritative state, then block until classified |
| Live authority-bearing source or resource binding differs from verified snapshot | Block cutover; preserve changes; re-snapshot, re-plan, re-verify, and obtain acceptance of the changed result |
| Legacy writers cannot be fenced or quiesced | Block cutover; do not assert exclusive authority from a UI-only lock |
| Acceptance references a different snapshot/plan/verification result | Reject stale acceptance for this cutover; do not silently transfer it |

### 15.3 Resolution

Conflict resolution is an explicit administrative migration action.

The resolution records:

- chosen interpretation;
- affected sources;
- resolver principal;
- timestamp;
- reason; and
- resulting migration plan change.

A conflict resolution never edits the legacy file in place.

---

## 16. Provenance Preservation

Every migrated canonical record must be traceable back to the source material that created or informed it.

Minimum provenance should support:

```text
migrationRunId
sourceSnapshotId
sourceArtifactIds[]
physicalSourcePaths[]
legacyReferencedPaths[]
sourceContentHashes[]
legacyAliases[]
legacySchemaVersion
legacyArtifactRevision
parserId
parserVersion
importedAt
```

Where a canonical field came from a particular source section or metadata field, the importer should retain a field-level extraction trace when practical.

Example:

```text
Decision.outcome
  sourceArtifactId: SA-193
  sourceSelector: CHAMPCITY-METADATA.workflowData.decision
  sourceValue: RequestRepair
```

This makes migration auditable without requiring future models to reread every source file.

---

## 17. Archived Historical Artifacts

Original legacy artifacts remain preserved even after their semantics are extracted.

### 17.1 Preservation package

Desktop should create a content-addressed migration source archive containing:

- manifest;
- raw Markdown bytes;
- images and other evidence bytes required by the migrated state;
- original physical paths;
- content hashes;
- Git provenance when available; and
- migration metadata.

The archive may be implemented as a managed evidence directory, content-addressed blob store, database BLOB store, or packaged backup format. That storage decision is an adapter concern.

### 17.2 Repository archive is not sufficient by itself

The existing repository `archive/` tree is valuable, but the structured-state migration must not assume it will remain forever at the same path. Migration therefore captures or content-addresses the source bytes it depends on.

### 17.3 Historical lifecycle

Historical source artifacts may be marked archived within migration provenance, but canonical entity lifecycle is derived from explicit project-state facts, not from the fact that the file happened to live below `archive/`.

---

## 18. Round-Trip and Export Expectations

Two different export contracts are required.

### 18.1 Human-readable Markdown projection

Markdown views are deterministic renderings of canonical state for humans, Git snapshots, Guided Mode, reports, or portability.

They should include projection metadata such as:

```text
projectionType
projectionVersion
projectId
sourceEntityIds[]
generatedAt
```

Formatting is not authoritative.

A Markdown projection is not required to reproduce the original legacy artifact byte-for-byte. Historical source fidelity is provided by preserved legacy Evidence.

### 18.2 Lossless structured export

Disaster recovery and true round-trip portability require a structured export package containing at minimum:

- Project records;
- canonical entities and record versions;
- Relationships;
- Decisions;
- Validations;
- Criteria;
- StateChange audit;
- lineage and supersession information;
- Project Resource bindings;
- provenance;
- evidence manifest and hashes;
- referenced evidence payloads or resolvable package references;
- schema versions; and
- export manifest/hash.

Importing this package into a compatible Project State store must reproduce the same semantic graph and authority state.

The final export manifest must account for every durable concept in the resolved F06 coverage matrix. Authoritative state and required evidence must not be omitted. Operational history and derived/rebuildable indexes require explicit inclusion/exclusion and reconstruction rules; an unspecified omission is not losslessness. This remaining completeness contract is F10 and must be resolved before implementation claims full portability.

### 18.3 Markdown re-import

If a user intentionally edits a generated Markdown export and asks ChampCity to apply it, the file is treated as an explicit change request.

The application computes proposed semantic changes, validates them through normal domain operations, and records new State Changes/Decisions as required. The edited Markdown file never directly overwrites canonical state.

### 18.4 Migration verification round trip

Migration tests should verify:

```text
legacy snapshot
    -> structured state
    -> generated Markdown views
```

for human-readable equivalence, and:

```text
structured state
    -> structured export package
    -> empty compatible state store
```

for semantic losslessness.

---

## 19. Migration Execution Phases

### Phase 0 — Project binding

Establish the target `projectId` and explicit repository/resource binding.

A legacy `workspaceId` may help a compatibility resolver find the repository, but it must not become the Project identity.

### Phase 1 — Snapshot

Capture immutable source bytes and produce the manifest hash.

No canonical state is mutated. Later legacy mutations invalidate this snapshot's suitability for cutover until rechecked under §7.4.

### Phase 2 — Inventory and classify

Classify every candidate file and identify non-state exclusions, unknown artifacts, evidence objects, and parser versions.

Output: classification report.

### Phase 3 — Parse and build migration graph

Create migration-local objects, aliases, candidate relationships, authority candidates, and provenance traces.

No target canonical state is yet authoritative.

### Phase 4 — Conflict detection and resolution

Run domain-invariant checks and produce the conflict ledger.

Blocking conflicts stop progression.

### Phase 5 — Build migration plan

Sort planned writes deterministically by dependency class and stable migration-local key.

Suggested order:

1. Project/Project Resource bindings;
2. Findings and Evidence;
3. Root Causes;
4. Bounded Solutions;
5. Criteria;
6. Work Items;
7. Validations;
8. Decisions;
9. Relationships, after their endpoints exist;
10. lifecycle/closure projections;
11. StateChange import/audit records;
12. migration completion metadata.

This is an entity-before-relationship plan, not permission to expose partially populated state. Stage the complete graph and enforce all required endpoint, type, authority, and provenance invariants before publication. An adapter may use deferred transaction-level checks instead of this physical write order only if no dangling or invalid graph becomes authoritative. The plan must also include any additional durable representations resolved by F06.

### Phase 6 — Stage

Write the migration into an isolated target store or isolated transaction boundary.

For a Desktop SQLite implementation, a separate staging database file or equivalent isolated database transaction is preferred; it is not yet used by the application.

### Phase 7 — Verify

Run structural, authority, provenance, and projection verification. Bind the result to the exact snapshot, plan, parser/schema versions, conflict resolutions, and target binding.

### Phase 8 — Await cutover

Present that identified migration result to the Operator. Legacy state remains authoritative until cutover is explicitly accepted. Acceptance is for this verified result, not an unlimited authorization to import later source changes.

### Phase 9 — Atomic cutover

Acquire the §7.4 writer/execution fence; establish quiescence and compare live authority-bearing source and bindings with the accepted result under that fence. On a mismatch, do not switch. Re-snapshot and re-verify the changed result and obtain applicable acceptance.

When the accepted result is still current and all gates pass, switch the Project's state provider and effective write generation from legacy state to Structured Project State through one application-controlled atomic cutover. Hold exclusion through the switch and reject old-generation writers afterward. There is no dual-write period.

### Phase 10 — Finalize

Mark legacy repository artifacts as provenance-only for this project, retain the source archive, create the post-cutover recovery checkpoint, and stop repository scanning from influencing current state. Resume work only through the confirmed current provider. Finalization failure must not silently reactivate legacy writers; follow §22 recovery.

---

## 20. Why There Is No Dual-Write Period

Dual-writing Markdown and structured state would create two competing authorities and make divergence inevitable.

ChampCity may use **shadow read comparison** before cutover:

```text
legacy repository read model
          compared with
structured staged read model
```

but mutation continues through only the currently authoritative provider.

Before cutover that provider is legacy state, subject to the temporary cutover fence.

After cutover that provider is Structured Project State.

Generated Markdown after cutover is output only. A delayed worker, reconnecting client, old process, or settings-compatibility reader cannot restore legacy write authority.

---

## 21. Verification and Acceptance Gates

Cutover is prohibited until all required gates pass.

### 21.1 Coverage gate

Every candidate source artifact is:

- migrated;
- preserved as Evidence/history;
- explicitly excluded; or
- represented by a resolved conflict disposition.

No candidate silently disappears.

### 21.2 Referential-integrity gate

All required relationship endpoints exist and satisfy the Structured Project State domain invariants. A staged graph with dangling links cannot be published.

### 21.3 Authority-equivalence gate

For each governed current object, the staged structured model must produce the same effective Operator authority/disposition that can be established from the accepted legacy source.

No migration parser may make a previously advisory record authoritative.

### 21.4 Lifecycle-equivalence gate

Current/open/closed/revision-requested/repair chains must match the accepted legacy semantics.

### 21.5 Repair-causality gate

Every current Repair Work Item must have its exact immediate parent and governing revision-request Decision.

### 21.6 Evidence gate

All evidence required by authoritative current state is present, hash-verified, and immutable in the staged model.

### 21.7 Provenance gate

Every migrated canonical record has at least one valid source trace or an explicitly administrative creation reason.

### 21.8 Projection gate

Representative generated views must carry the same material human-readable state as the accepted legacy artifacts, allowing for formatting differences and normalized terminology.

### 21.9 Store-integrity gate

The target persistence store passes its adapter-specific integrity checks and a backup/recovery checkpoint is successfully produced before cutover.

### 21.10 Freshness, exclusion, and acceptance gate

All relevant writers and in-flight executions are fenced; the live corpus, evidence, and bindings still match the accepted verified result; stale acceptance is rejected; and the provider switch cannot admit a late legacy write. If any of these facts cannot be established, cutover remains blocked.

---

## 22. Rollback and Recovery

Rollback semantics depend on whether cutover has occurred and whether new structured mutations exist.

### 22.1 Before cutover

Rollback is straightforward:

- discard or retain the staging store for diagnosis;
- retain the migration report if useful;
- leave legacy authority unchanged;
- release the temporary fence only after confirming that the provider switch did not commit and legacy authority remains the sole writer.

A crash while holding the fence does not authorize a new process to guess the active provider. Recover the cutover outcome from the durable checkpoint/configuration before admitting writes. If the outcome is unknown, keep mutation blocked pending reconciliation.

### 22.2 Cutover transaction failure

The authoritative provider/generation switch must be atomic.

If it fails before commit, the Project remains on the legacy provider and the structured store stays staged/non-authoritative. Required pre-switch checkpoints must already exist.

If a failure occurs after the switch has committed, treat it as post-cutover recovery rather than assuming the transaction never happened. In particular, failure to acknowledge the switch or complete the final checkpoint must not reactivate old writers. Determine the committed provider from durable state and retain write exclusion until that outcome is known.

### 22.3 Immediate post-cutover rollback with no structured mutations

If cutover completed but no new canonical Project State mutations have occurred, an administrative rollback may restore the provider pointer to the frozen legacy snapshot.

The structured store is retained for diagnosis. It is not deleted. The rollback itself must fence writers and advance the effective write authority so stale pre-cutover sessions do not become valid again merely because the provider type is legacy.

### 22.4 Post-cutover after structured mutations

Once new Structured Project State mutations exist, simply turning legacy Markdown back into authority would discard valid new history.

At that point recovery must target the structured store:

- restore the latest known-good database/store backup;
- verify integrity;
- restore evidence/blob references;
- replay any persistence-layer recovery mechanism supported by the adapter; and
- reconcile against immutable StateChange/provenance records as an audit aid.

`StateChange` is not assumed to be a complete event-sourcing log and therefore is not the sole database reconstruction mechanism.

Returning to legacy authority after post-cutover mutations requires an explicit administrative de-migration/recovery procedure and must be treated as a potentially lossy exceptional operation, not ordinary rollback.

### 22.5 Corruption detection

Desktop persistence must provide:

- database integrity checks;
- automatic local backups;
- pre-migration backup;
- pre-cutover checkpoint;
- post-cutover checkpoint;
- export package generation; and
- evidence hash verification.

A local persistence implementation, including SQLite if selected, must not become an opaque single point of failure.

---

## 23. Current ChampCity Corpus as the First Golden Migration Fixture

The recorded ChampCity repository corpus is suitable for migration characterization because it contains multiple generations of the artifact model and archive cleanup.

The first golden corpus should be a byte-for-byte copy of the repository state, not the active working tree itself. This documentation revision does not create or claim to have tested that corpus; F21 requires an actual reproducible snapshot and test/report traceability.

Required fixture scenarios should include at least:

1. An Issue record with referenced screenshots.
2. An approved Fix Card containing `CHAMPCITY-METADATA`, explicit source revisions, dependencies, evidence paths, artifact revision, and document disposition.
3. A Validation record that contains both advisory validation content and an explicit Operator `RequestRepair` decision.
4. A Repair contract tied to the exact immediate parent and validation authority.
5. A subsequent validation/close chain.
6. Historical planning revisions.
7. Architect draft versus promoted artifact handling.
8. Files physically moved under `archive/development-history` while retaining embedded historical `issues/...` references.
9. Duplicate/copy artifacts with identical hashes.
10. Missing or stale embedded path references that can be resolved through legacy alias mapping.

`ISSUE_007` is a particularly useful end-to-end fixture because the recorded archived corpus contains:

```text
ISSUE_RECORD
Architect Investigation
Architect Review
Fix Card plan
Fix Cards
Implementer Reports
Validation Records
Repair contract/repair implementation lineage
Close Records
Screenshot evidence references
```

and includes a Validation record whose explicit Operator decision is `RequestRepair`, making it a strong test of Validation-versus-Decision separation and repair genealogy.

---

## 24. Migration Test Suite

The migration engine should be testable without Electron and without a live Server. All scenarios in this section are design requirements, not test executions or passing results from this documentation work.

### 24.1 Parser fixture tests

Each registered legacy artifact version receives fixed input/output tests.

### 24.2 Corpus census test

Run candidate discovery over a frozen ChampCity repository copy and assert that every candidate file receives one and only one classification.

### 24.3 Normalized graph golden test

Migrate the frozen corpus and serialize a normalized semantic graph that replaces canonical IDs with stable test-local symbolic references.

Compare:

- entity types;
- aliases;
- relationships;
- lineage;
- lifecycle;
- validation outcomes;
- effective Decisions;
- authority state;
- evidence hashes; and
- conflict ledger.

### 24.4 Idempotency test

Interrupt after partial staging, resume the same `MigrationRun`, and prove no duplicate entities, relationships, Validations, or Decisions are created.

### 24.5 Duplicate-path test

Copy a source artifact to a second path without changing bytes. Verify one semantic import with two provenance sources where the artifact contract indicates the same legacy identity.

### 24.6 Archive-relocation test

Move the physical source tree while keeping embedded legacy references unchanged. Verify semantic output is unchanged and both path histories are preserved.

### 24.7 Authority-conflict test

Inject two incompatible unordered effective Decisions for the same target. Migration must block rather than pick one by modification time.

### 24.8 Broken-repair test

Remove the governing `RequestRepair` validation/Decision or immediate parent reference. Repair import must become blocked/unresolved rather than silently authorized.

### 24.9 Export test

Verify generated Work Item, Issue, Validation, and project-state Markdown views contain the expected material state and projection metadata.

### 24.10 Structured round-trip test

Export the migrated project to the lossless structured package, import into an empty compatible store, and compare normalized semantic graphs. Cover every durable representation in the resolved F06/F10 manifest; test declared rebuilding of any intentionally excluded derived data separately.

### 24.11 Rollback test

Exercise:

- pre-cutover discard;
- failed atomic cutover;
- immediate rollback before new mutation; and
- recovery from a backup after post-cutover structured mutations.

### 24.12 Cutover freshness and publication scenarios

| Scenario | Required expected outcome |
| --- | --- |
| Edit an authority-bearing artifact after snapshot but before acceptance | Old staged result cannot cut over; preserve the edit and re-snapshot/re-verify. |
| Add/remove relevant evidence or change a resource binding after verification | Final comparison detects the mismatch; no provider switch. |
| Supply acceptance for an earlier snapshot/plan/verification result | Reject stale acceptance; require acceptance of the changed verified result. |
| A legacy worker remains in flight when the fence is requested | Quiesce/revoke and account for its work, or remain blocked; do not switch while it can still write. |
| A pre-cutover callback or client attempts a late legacy write after switching | Reject the stale writer; structured authority remains the only writer. |
| A writer races between comparison and publication | Exclusive control prevents the write, or the generation/freshness check rejects publication; no unchecked gap is permitted. |
| An unmanaged writer cannot be excluded | Block cutover rather than claim a successful fence. |
| Crash/failure after fencing but before comparison or switch | Confirm the switch did not commit before restoring legacy writes; preserve actual source changes. |
| Crash/failure while the atomic switch is in progress | Durable outcome resolves to exactly one provider; unknown outcome keeps writes blocked until reconciled. |
| Switch committed but acknowledgment/finalization/checkpoint response failed | Recover the structured provider; do not infer rollback from a missing response or resume old writers. |
| Stage a relationship before a required Validation/Decision endpoint exists | Keep it non-authoritative; materialize endpoints or fail validation before publication. |
| Attempt publication with any dangling or invalid required relationship | Reject publication; no invalid graph becomes authoritative. |
| Administrative immediate rollback with no new structured mutations | Fence the rollback and reject obsolete sessions under the new effective authority. |

---

## 25. Desktop Implementation Boundary

The reusable migration application layer should depend on ports such as:

```text
LegacyArtifactSource
ProjectStateRepository
EvidenceStore
MigrationStore
ProjectResourceRepository
TransactionBoundary
ProjectionRenderer
BackupProvider
IntegrityChecker
```

Desktop adapters provide:

- local repository/file snapshotting;
- local Project State persistence, with SQLite an initial candidate;
- local evidence/blob storage;
- local backups;
- Desktop project/provider selection; and
- atomic local cutover configuration with effective writer fencing.

Server may provide different adapters while reusing the same:

- classification registry;
- parser registry;
- migration graph rules;
- conflict semantics;
- authority rules;
- verification rules; and
- export contract.

This is how Desktop and Server converge on one state architecture without sharing deployment assumptions.

---

## 26. Suggested Product-Core/Application Components

Names are illustrative, but responsibility boundaries should remain explicit.

```text
LegacyArtifactInventoryService
LegacyArtifactClassifierRegistry
LegacyArtifactParserRegistry
LegacyReferenceResolver
MigrationPlanBuilder
MigrationConflictService
ProjectStateImportService
MigrationVerificationService
ProjectionEquivalenceVerifier
MigrationCutoverService
MigrationRecoveryService
StructuredExportService
```

None of these services should depend directly on Electron, renderer state, Codex, or a legacy all-purpose `workspaceId`.

---

## 27. Required Migration Invariants

The migration implementation must mechanically enforce at least these invariants:

1. The live repository is never mutated as part of parsing/conversion.
2. Every migrated entity belongs to the explicitly selected Project.
3. Canonical IDs are not legacy filenames, paths, workspace IDs, or Git identifiers.
4. Every canonical import is traceable to source provenance.
5. Every authority-bearing import has an explicit recognized Decision source.
6. Validation and Decision remain separate concepts.
7. Repairs cannot be authorized without their governing revision-request Decision.
8. Repair immediate-parent genealogy must be explicit and resolvable.
9. Superseded/historical records are retained.
10. Evidence used by authoritative state is immutable and hash-verifiable.
11. File modification time never determines semantic ordering.
12. Archive directory location never independently determines canonical lifecycle.
13. Unknown or ambiguous authority does not fail open.
14. A repeated/resumed migration cannot duplicate canonical state.
15. Cutover cannot occur while blocking conflicts remain.
16. Cutover is atomic and switches exactly one authority provider.
17. No dual-write authority exists.
18. After cutover, repository Markdown cannot mutate Project State through ordinary filesystem edits.
19. Human-readable Markdown projections remain regenerable from canonical state.
20. Lossless disaster recovery uses structured export/backup, not Markdown reparsing.
21. Cutover rechecks live source and bindings under an effective writer fence against the exact accepted verified result.
22. Stale acceptance and late legacy writes cannot cross the authority switch.
23. No required relationship is published before all its endpoints and graph invariants are valid.
24. Unknown cutover outcomes keep writes blocked until durable provider authority is reconciled.

---

## 28. Cutover Result

A successfully migrated Desktop project should end in this condition:

```text
Project
  canonical Project State       -> authoritative
  structured persistence        -> authoritative storage
  Project Resource bindings     -> explicit
  Decisions/Authority State     -> structured and queryable
  Work/Repair lineage           -> explicit relationships
  Validation/Evidence           -> structured and provenance-backed
  legacy repository artifacts   -> immutable provenance/history
  generated Markdown            -> view/export only
```

The application no longer asks:

> Which Markdown file currently represents the project state?

It asks deterministic domain queries such as:

> What is the current effective Bounded Solution?

> Which Work Items remain active?

> What Decision currently governs this implementation?

> Which Validation informed the Decision that authorized this Repair?

> What Evidence supports this Finding?

> Which historical source artifacts produced these records?

That is the migration boundary required for Desktop and Server to share the same Project State architecture.

---

## 29. Design Decisions Fixed by This Document

This design fixes the following migration decisions so implementation does not need to rediscover them:

1. Migration operates from an immutable snapshot and manifest.
2. The converter is deterministic code; LLM interpretation is not a migration authority mechanism.
3. Canonical IDs remain opaque and are mapped, not derived from legacy paths.
4. Existing human IDs remain aliases.
5. Current physical archive paths and embedded historical paths are both preserved.
6. Authority migration requires explicit Decision evidence.
7. Validation and Operator disposition are split into separate canonical records.
8. Archive location is not lifecycle authority.
9. Unknown authority fails closed through a blocking conflict.
10. Raw historical artifacts are preserved as immutable migration evidence.
11. Shadow comparison is permitted; dual-write authority is not.
12. Markdown exports are deterministic human-readable projections, not lossless database backups.
13. Structured export is the lossless portability/disaster-recovery contract.
14. Ordinary rollback to legacy authority ends once post-cutover structured mutations exist.
15. Desktop and Server reuse the same migration semantics through different persistence/source adapters.
16. The ChampCity repository should become the first golden migration corpus before production cutover support is enabled.
17. Acceptance binds the exact verified migration result, and final source/binding freshness is checked under an effective cutover fence.
18. The switch rejects stale writers and publishes only a referentially valid graph; an unknown outcome never permits competing authorities.

These safety clarifications do not resolve the still-open durable-model coverage, authority reduction, parent-completion truth tables, export-completeness schema, or production characterization evidence. F06–F08/F10/F21 in the corpus index remain gates for the dependent implementation work.
