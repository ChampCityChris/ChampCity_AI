# Phase 07 — Operator-Centered Workflow Recovery, Historical Corpus Migration, and Live Development Map

Status: pending Operator approval through ChatGPT
Planning revision: 2
Planning mode: off-application bootstrap phase
Project: ChampCity A/I
Date revised: 2026-07-20

## Revision 2 Direction

Revision 2 replaces the incorrect assumption that historical records should be excluded from normal workflow routing.

Historical records are the initial dogfooding corpus for the simplified approval system. Phase 07 must normalize, deduplicate, migrate, route, display, and submit those records for Operator disposition through the application.

At Phase 07 completion, ChampCity_AI must open with the current required action:

```text
Operator approval required for Project Planning
```

That Project Planning review must use the migrated repository records rather than synthetic fixtures.

## Off-Application Control Notice

This Phase 07 planning package is intentionally maintained outside the current ChampCity_AI application authority system because that authority system is the subject of the phase.

- `Phase_Planning.md` and `Work_Card_Plan.md` are plain repository Markdown planning records.
- They are not registered application artifacts and do not require the current application to recognize or approve them.
- The Operator will approve this Phase Planning document and the accompanying Work Card Plan through the active ChatGPT conversation.
- After phase approval, one detailed Work Card will be written at a time.
- Each detailed Work Card requires separate Operator approval through chat before Implementer execution.
- The bootstrap exception ends when Phase 07 is complete and the application opens at Project Planning Operator Approval.

No Git staging, commit, push, reset, clean, stash, merge, tag, release, or history rewrite is authorized by this phase plan.

## Phase Goal

Replace the current overlapping authority framework with a small Operator-centered workflow, migrate the existing planning corpus into that workflow, and provide a roadmap-driven live state view of development to date.

The application must:

1. use the Operator as the sole binding approval and validation authority;
2. preserve Architect and Implementer outputs as evidence and guidance rather than independent approval authority;
3. route current and historical records through the same stage-owned approval model;
4. reconcile duplicate historical records without losing provenance;
5. show the Operator where the project has been, what has been completed, what still requires disposition, and what action is next;
6. begin its post-Phase-07 dogfooding cycle at Project Planning Operator Approval.

## Problem Statement

The current application has combined three separate concerns into one authority system:

1. Operator decisions.
2. Workflow sequencing.
3. Technical artifact integrity.

This produced duplicated authorization fields, global maintenance preemption, stage-independent approval queues, synthetic role gates, repeated approval of the same scope, and routing rules that can prevent normal progress.

The historical planning corpus also contains mixed schemas, stale authority assumptions, duplicate files, duplicate semantic identities, superseded records, and unresolved disposition state. Excluding that corpus would avoid the hardest proof of the new workflow. Phase 07 instead uses it as the application’s first real workload.

## Governing Principles

### Operator authority

The Operator is the sole role that makes binding decisions to approve, reject, request revision, accept implementation, require repair, defer, cancel, merge, supersede, archive, or otherwise dispose of a governed record.

### Architect responsibility

The Architect authors planning documents and Work Cards, reviews Implementer evidence, identifies defects and risks, and recommends visual or manual validation. Architect conclusions are advisory. They do not approve, reject, complete, or directly route work without an Operator decision.

### Implementer responsibility

The Implementer executes the exact approved Work Card, reports results and evidence, and performs the bounded historical-corpus migration required by Phase 07. The Implementer does not determine acceptance.

### Exact decision binding

An Operator decision binds the exact current revision of one record or the exact current revisions of a defined stage bundle. The decision does not repeat individual permissions already stated in the approved documents.

### Historical records remain workflow records

Historical status does not remove a record from routing. A historical record must be represented under the current schema, associated with the correct project, phase, Work Card, or stage, and assigned a review state.

Every surviving historical record discovered by the Phase 07 inventory must receive an explicit current-schema disposition state. Records that have not yet been reviewed under the new system must be set to:

```text
pending_operator_disposition
```

The Implementer performs the migration and sets that review state. The Operator performs the actual disposition through the application.

### Duplicate cleanup preserves provenance

Duplicate historical files must not remain as competing workflow records. Phase 07 must identify exact duplicates and semantic duplicates, select or construct the canonical survivor, preserve source provenance, update inbound references, and remove obsolete duplicate files only after the merged result is verifiably complete.

### Normal routing, not a separate historical queue

Historical records must appear in the stage appropriate to their document type. The system must not create a detached historical-approval bureaucracy. Project Planning records appear in Project Planning review, Phase Planning records in Phase Planning review, Work Cards in Work Card review, implementation evidence in Operator Validation, and closeout records in Phase Closeout review.

### Localized technical integrity

Malformed, stale, conflicting, or unsynchronized files may block the affected record or attempted write. They must not automatically suspend unrelated workflow. Integrity repair is part of corpus migration and local maintenance, not an independent source of approval authority.

### Roadmap-driven state visibility

The Project Roadmap and the relationships among planning records must drive a visible development map. The Operator must be able to see completed phases, interrupted or superseded phases, planned phases, Work Cards, repairs, evidence, unresolved dispositions, and the exact next required action.

## Required Operator Decision Checkpoints

Phase 07 will implement five binding Operator decision checkpoints.

### 1. Project Planning Approval

The decision binds the exact current Project Planning bundle:

- Project Intake;
- Project Interview documents;
- Project Roadmap;
- final Project Planning documentation required by the project-planning stage;
- any reconciliation record required to explain how the current bundle was derived from historical records.

Approval progresses to Phase Planning. Revision requested or rejected returns the same Project Planning bundle for revision.

The final Phase 07 application state must present this checkpoint as the current required action.

### 2. Phase Planning Approval

The decision binds the exact current Phase Planning bundle:

- Phase Planning;
- Work Card Plan.

Approval progresses directly to authoring the first unresolved Work Card from the approved Work Card Plan. No just-in-time Work Card authorization or secondary phase-progression flag is required.

Historical Phase Planning bundles are reviewed through this same checkpoint in roadmap order.

### 3. Work Card Approval

The decision binds one exact Work Card revision.

- Approval progresses to Implementer execution.
- Revision requested or rejected returns the same Work Card identity for a new revision.
- A repair Work Card named `WCXX-REPAIRXX` uses the same approval process as any other Work Card.
- Repair naming and parent references provide traceability; they do not create a separate approval class.
- Historical Work Cards migrate into this same review model and receive explicit Operator disposition.

### 4. Operator Validation Decision

The Operator evaluates:

- the approved Work Card;
- the Implementer Report;
- the Architect Review;
- independent-verification evidence when present;
- visual, manual, or other validation evidence.

The Architect Review recommends what should be tested and may recommend repair. The Operator decides whether the implementation is accepted, requires repair, requires additional evidence, is deferred, is cancelled, or receives another valid disposition.

Historical implementation evidence is routed through this same stage so the Operator can confirm or correct the recorded project history.

### 5. Phase Closeout Approval

Phase Closeout becomes available when no item on the approved Work Card Plan remains unworked or unresolved.

The decision binds:

- the Phase Closeout record;
- the updated Project Roadmap.

Approval progresses to the next phase or project completion. Revision requested or rejected returns the closeout bundle for revision.

Historical closeout records remain part of normal Phase Closeout review and must receive explicit disposition under the new schema.

## Historical Corpus Migration Requirements

Phase 07 must process the complete repository planning corpus, including project-level and phase-level records.

The migration must:

1. inventory all planning artifacts and their Markdown/JSON pairs;
2. classify each record by project, phase, Work Card, artifact type, revision, and relationship;
3. identify incomplete pairs, invalid metadata, stale schema, duplicate IDs, duplicate paths, exact duplicate payloads, and semantic duplicates;
4. define the canonical survivor for each duplicate group;
5. merge unique evidence and provenance into the survivor;
6. update inbound references to the survivor;
7. remove obsolete duplicate files after verification;
8. migrate every surviving record to the current schema required by the simplified approval function;
9. assign every surviving record a routing stage and `pending_operator_disposition` state unless a new Operator decision is created through the application;
10. preserve prior decision evidence as historical evidence without treating old derived authorization fields as current authority;
11. make the migrated corpus queryable by the development-state map;
12. generate a reconciliation report that explains counts, merges, removals, unresolved ambiguities, and records requiring Operator attention.

No record may be silently treated as approved merely because an old approval-like field or legacy status exists.

## Development State Map Requirements

Phase 07 must create UI screens that follow the Project Roadmap and show live repository-derived development state.

The Operator must be able to view:

- Project Planning status and current bundle;
- the ordered roadmap of phases;
- each phase status;
- each phase’s Work Card Plan;
- Work Cards and repair Work Cards in plan order;
- Implementer Reports, Architect Reviews, validation evidence, and closeout records associated with each Work Card;
- duplicate-merge and migration notes where relevant;
- pending Operator dispositions;
- completed, superseded, deferred, cancelled, and unresolved work;
- the exact next required action;
- why that action is next;
- the records that will be affected by the decision.

The map must be a live projection of repository records. It must not require a separately maintained manual workflow-state file to stay accurate.

The UI should provide progressive drill-down:

```text
Project
→ Project Planning
→ Roadmap
→ Phase
→ Work Card Plan
→ Work Card
→ Implementation evidence
→ Operator disposition
```

The current action must remain prominent without hiding the broader project history.

## In Scope

- Replace the current approval payload model with exact Operator decisions that do not duplicate document permissions.
- Define current-schema Operator disposition for active and historical records.
- Inventory the complete historical planning corpus.
- Reconcile duplicate historical records and preserve provenance.
- Migrate surviving historical records to the current approval schema.
- Set migrated records to `pending_operator_disposition` for application review.
- Route historical records through their normal stage-owned workflows.
- Implement Project Planning, Phase Planning, Work Card, Operator Validation, and Phase Closeout decision checkpoints.
- Remove just-in-time Work Card creation authorization.
- Separate Work Card Plan approval from detailed Work Card approval.
- Use one Work Card approval path for ordinary and repair Work Cards.
- Make Architect Review advisory and responsible for recommended visual and manual validation steps.
- Make Operator Validation the binding post-implementation decision.
- Simplify Phase Closeout eligibility to unresolved Work Card Plan items.
- Create a live roadmap and development-history state projection.
- Create UI screens that display project history, current status, pending dispositions, and next action.
- Make Governance Repair a localized migration and maintenance capability rather than global workflow preemption.
- Reclassify the Artifact Registry as an index and diagnostic aid rather than independent workflow authority.
- Remove routed IPC, screen identity, renderer binding, and execution-run fields as parallel approval gates while retaining appropriate freshness and write safety.
- Remove hard-coded Work Card-specific dependency gates from generic production code.
- Update automated tests and real repository fixtures to use the migrated historical corpus.
- End Phase 07 with application startup routed to Project Planning Operator Approval.

## Out of Scope

- ChampCity_GPT shared-core integration.
- ChatGPT browser agent implementation.
- Codex or provider transport implementation.
- New product features unrelated to workflow recovery, migration, or the development-state map.
- Full replacement of the Markdown/JSON artifact-pair storage format unless a bounded Work Card proves it necessary.
- Git automation, release automation, tagging, packaging, or deployment.
- Broad visual redesign unrelated to stage-owned approvals and the roadmap-driven development map.
- Automatic Operator approval of migrated historical records.

## Technical Safeguards That Remain

The simplification must preserve practical engineering protections:

- configured repository and planning paths remain inside the selected workspace;
- writes remain atomic where practical;
- concurrent changes to the same record do not silently overwrite one another;
- malformed files fail locally with an understandable error;
- synchronized Markdown/JSON pairs remain synchronized while that storage format remains in use;
- duplicate identities trigger a bounded merge or correction workflow;
- exact current revision checks prevent stale saves and stale decisions;
- duplicate cleanup updates inbound references before obsolete files are removed;
- migration produces auditable before-and-after counts and provenance.

These safeguards do not independently authorize workflow progression.

## Prohibited Reintroductions

No Phase 07 Work Card may introduce or preserve a second authority source through fields such as:

- `implementationAuthorized`;
- approval-level `sourceCodeChangesAuthorized`;
- approval-level `codeChangesAuthorized`;
- `phaseProgressionAuthorized`;
- `routeSelectionAuthorized`;
- `justInTimeWorkCardCreationAuthorized`;
- `authorizationGranted` for an already approved Work Card;
- `executionPassesAuthorized` as a second approval of Work Card execution;
- approval-level `pushAuthorized`.

Historical review state is not prohibited. It must be represented as a normal pending disposition under the new Operator decision model rather than as a special non-routing historical decision class.

Equivalent renamed authority fields are also prohibited unless the Operator explicitly approves a demonstrated need.

## Implementation Method

- Execute one approved Work Card at a time.
- Do not combine multiple planned Work Cards into a single implementation pass.
- Use the actual ChampCity_AI planning corpus as the primary migration and routing fixture.
- Do not create replacement candidates when a Work Card needs revision.
- Use `WCXX-REPAIRXX` only after the Operator decides that implemented work requires a bounded repair.
- Each Work Card must define a bounded production-file surface, data-migration surface, focused tests, and explicit deletion or retirement targets.
- Migration Work Cards must produce dry-run or inventory evidence before destructive duplicate cleanup.
- Duplicate removal must be exact and reference-safe; uncertain groups remain pending Operator disposition.
- Each Work Card must leave the full repository test lane green unless the Work Card documents a pre-existing failure accepted by the Operator before implementation.
- Do not add compatibility fallback paths merely to preserve the existing authority model.
- Do not create application approval artifacts for this bootstrap phase.

## Phase Acceptance Criteria

Phase 07 is complete when all of the following are true:

1. The application exposes the five Operator decision checkpoints defined in this plan.
2. One decision and disposition schema applies to current and historical records.
3. The full planning corpus has been inventoried and classified.
4. Duplicate historical records have been merged or explicitly held for Operator disposition; verified obsolete duplicates have been removed and inbound references updated.
5. Every surviving historical record has current-schema routing metadata and a disposition state.
6. Historical records awaiting review are set to `pending_operator_disposition` and appear in their normal stage-owned workflow.
7. Project Planning Approval binds Project Intake, Project Interview documents, Project Roadmap, final Project Planning documentation, and the required reconciliation record.
8. Phase Planning Approval binds Phase Planning and Work Card Plan and routes directly to Work Card authoring.
9. Work Card approval applies identically to ordinary and repair Work Cards.
10. Work Card rejection or revision request produces a new revision of the same Work Card identity.
11. Architect Review is advisory and supplies recommended validation steps without binding approval authority.
12. Operator Validation is the binding post-implementation decision.
13. Phase Closeout is blocked only by unresolved Work Card Plan items or a local inability to read or save the closeout bundle being acted upon.
14. Historical Project Planning, Phase Planning, Work Card, validation, and closeout records can be reviewed and disposed through normal workflow screens.
15. The roadmap-driven development map shows project history, current phase state, Work Card state, pending dispositions, and the next required action.
16. The development map is derived from repository records rather than a manually authoritative workflow-state snapshot.
17. Governance and integrity defects do not globally preempt unrelated valid work.
18. An approved Work Card is sufficient authority to begin execution.
19. Approval artifacts no longer repeat source-code, push, execution-pass, progression, or route-selection permissions.
20. Hard-coded Phase 06 Work Card dependency checks are removed from generic production execution code.
21. Automated tests use real migrated corpus fixtures for approval, revision, duplicate reconciliation, historical routing, validation, closeout, and state-map behavior.
22. Operator manual validation confirms the complete migrated workflow.
23. After final validation, the application starts at `Project Planning — Operator Approval Required` using the migrated ChampCity_AI Project Planning bundle.

## Validation Strategy

Validation will be incremental rather than deferred to one large final pass.

Each Work Card must include:

- focused unit or service tests for its changed behavior;
- contradiction tests proving removed authority fields no longer control routing;
- migration dry-run or fixture evidence when data is changed;
- regression tests for the immediately preceding workflow stage;
- typecheck and build;
- the full repository test lane before acceptance.

Final manual validation will cover:

1. Opening the roadmap-driven development map.
2. Inspecting historical phases, Work Cards, evidence, and pending dispositions.
3. Confirming duplicate groups were merged without evidence loss.
4. Confirming historical records route through normal stage workspaces.
5. Project Planning bundle approval and revision behavior.
6. Phase Planning bundle approval and direct Work Card authoring.
7. Work Card rejection followed by revision of the same Work Card.
8. Normal and repair Work Card approval through the same path.
9. Architect Review recommendations displayed to the Operator.
10. Operator Validation pass and repair decisions.
11. Local artifact defect behavior without unrelated global preemption.
12. Phase Closeout with all Work Card Plan items resolved.
13. Updated Roadmap approval and next-phase progression.
14. Restarting the application and confirming the current action is Project Planning Operator Approval for the migrated repository bundle.

## Phase Exit Condition

Phase 07 exits only after the Operator confirms that ChampCity_AI uses its own historical project corpus to demonstrate the simplified workflow.

The application must provide a readable roadmap-based account of development to date, place each surviving historical record into the correct stage-owned review path, and open with Project Planning Operator Approval as the next required action.
