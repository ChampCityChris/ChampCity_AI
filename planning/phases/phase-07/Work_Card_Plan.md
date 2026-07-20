# Work Card Plan — Phase 07 Operator-Centered Workflow Recovery, Historical Corpus Migration, and Live Development Map

Status: pending Operator approval through ChatGPT
Plan revision: 2
Planning mode: off-application bootstrap phase
Detailed Work Cards authored: none

## Revision 2 Direction

The existing ChampCity_AI planning corpus is the dogfooding workload for the new approval model.

Historical records remain in normal stage-owned routing. They must be inventoried, deduplicated, migrated to the current schema, assigned `pending_operator_disposition`, and presented to the Operator through the application.

Phase 07 is not complete until the application shows a live roadmap-driven development history and starts at:

```text
Project Planning — Operator Approval Required
```

The startup review must use the actual migrated Project Planning bundle.

## Control and Sequencing

This is a plain repository planning record. It is not an application artifact and does not authorize implementation by itself. The Operator will approve the phase and each detailed Work Card through chat.

No Git operation is authorized.

- Execute Work Cards in order unless the Operator explicitly changes the sequence.
- Author one detailed Work Card at a time.
- Do not absorb later scope into an earlier Work Card.
- Revise rejected Work Cards under the same Work Card identity.
- Use the same approval path for ordinary and repair Work Cards.
- Inventory and verify duplicate groups before removing files.
- Hold ambiguous duplicate groups for Operator disposition rather than guessing.
- Use the real repository corpus as the primary fixture.

## Ordered Work Cards

### WC01 — Unified Operator Decision and Disposition Contract

Dependencies: Phase 07 approval through chat.

Purpose: Replace duplicated approval vocabulary with one exact decision and disposition contract for current and historical records.

Required outcomes:

- Bind decisions to one exact record revision or exact stage bundle.
- Support `approved`, `revision_requested`, and `rejected` stage decisions.
- Support historical dispositions including accepted as current, accepted as historical evidence, superseded, merged, deferred, cancelled, invalid, and revision required.
- Define `pending_operator_disposition` for migrated records awaiting new-system review.
- Preserve exact-target finality, idempotent retries, and conflict rejection.
- Preserve legacy decisions as evidence without automatically treating them as current decisions.
- Remove derived authority fields for implementation, source code, progression, route selection, just-in-time creation, push, and execution passes.
- Add focused decision and disposition tests.

Acceptance: One decision model supports both new workflow actions and migrated historical review without a separate historical approval class.

### WC02 — Historical Corpus Inventory and Duplicate Resolution Manifest

Dependencies: WC01 accepted.

Purpose: Create a complete non-destructive inventory and migration manifest.

Required outcomes:

- Inventory every governed planning file and Markdown/JSON pair.
- Record identity, type, project, phase, Work Card, revision, hash, status, relationships, schema, and paths.
- Identify incomplete pairs, malformed metadata, stale schemas, duplicate IDs, duplicate paths, exact duplicates, and semantic duplicates.
- Group duplicates and propose a canonical survivor.
- Identify unique evidence and provenance to preserve.
- Identify inbound references that must be updated.
- Separate safe merges from ambiguous groups requiring Operator review.
- Produce machine-readable and human-readable reports with counts by type, phase, and defect class.
- Make no destructive changes.

Acceptance: The complete migration and cleanup workload is known before corpus mutation begins.

### WC03 — Historical Artifact Migration and Duplicate Cleanup

Dependencies: WC02 accepted.

Purpose: Normalize the corpus and prepare every surviving record for application review.

Required outcomes:

- Migrate surviving artifacts to the WC01 schema.
- Assign correct project, phase, Work Card, stage, relationship, and routing metadata.
- Set every record without a new-system decision to `pending_operator_disposition`.
- Preserve prior approvals and validations as historical evidence.
- Merge approved safe duplicate groups into canonical survivors.
- Preserve unique content, evidence, timestamps, and provenance.
- Update inbound references before obsolete duplicate files are removed.
- Leave ambiguous groups intact and visible for Operator disposition.
- Refresh indexes and derived projections after validation.
- Produce before-and-after counts and migration evidence.
- Prove that no verified evidence was silently discarded.

Acceptance: The surviving corpus is current-schema, traceable, reference-safe, and ready for Operator review.

### WC04 — Project Planning Approval Workspace and Startup Route

Dependencies: WC03 accepted.

Purpose: Implement Project Planning review against the migrated real corpus.

Required outcomes:

- Build the exact bundle from Project Intake, Project Interview documents, Project Roadmap, final Project Planning documents, and required reconciliation evidence.
- Display legacy decisions and migration notes as evidence.
- Allow exact approval, revision request, rejection, and valid dispositions.
- Route approval to Phase Planning.
- Route revision or rejection to the same bundle for revision.
- Replace generic approval-queue ownership with a stage-owned Project Planning workspace.
- Add startup routing capability and real-corpus tests.

Acceptance: The migrated Project Planning bundle can be reviewed through the new Operator decision model.

### WC05 — Phase Planning Approval Routing

Dependencies: WC04 accepted.

Purpose: Implement Phase Planning review for current and historical phase bundles.

Required outcomes:

- Bind approval to exact Phase Planning and Work Card Plan revisions.
- Route approval directly to authoring the first unresolved Work Card.
- Route revision or rejection back to the same phase bundle.
- Remove `justInTimeWorkCardCreationAuthorized`, `phaseProgressionAuthorized`, and equivalent gates.
- Present historical phase bundles in roadmap order through the same workspace.
- Use approved Work Card Plan order to determine the next Work Card.
- Test closed, interrupted, superseded, active, and planned phases from the real corpus.

Acceptance: Phase Planning approval is sufficient to begin Work Card authoring.

### WC06 — Unified Work Card Approval and Revision Loop

Dependencies: WC05 accepted.

Purpose: Use one Work Card approval process for ordinary, repair, current, and historical Work Cards.

Required outcomes:

- Present one exact Work Card revision to the Operator.
- Route approval to Implementer execution.
- Route revision or rejection to a new revision of the same Work Card identity.
- Keep Work Card Plan approval separate from detailed Work Card approval.
- Treat `WCXX-REPAIRXX` as a normal Work Card with parent traceability.
- Remove replacement-candidate handling created solely by rejection.
- Remove `implementationAuthorized` as independent authority.
- Route migrated historical Work Cards through the same workspace.
- Show linked reports, reviews, and legacy decisions as evidence.

Acceptance: Work Card identity survives revision, and repair Work Cards use the normal approval path.

### WC07 — Advisory Architect Review and Operator Validation

Dependencies: WC06 accepted.

Purpose: Restore correct authority after implementation.

Required outcomes:

- Architect Review records findings, risks, omissions, repair recommendations, and recommended visual or manual validation.
- Architect Review cannot approve, reject, complete, or directly route implementation.
- Every completed review routes to Operator Validation.
- Operator outcomes include accepted, repair required, additional evidence required, deferred, cancelled, invalid, or another valid disposition.
- Repair required routes to authoring the next `WCXX-REPAIRXX`.
- Remove Architect Disposition and Candidate Disposition as required stages.
- Preserve reports, reviews, screenshots, validation, and verifier evidence as linked evidence.
- Route migrated historical implementation evidence through the same validation workspace.

Acceptance: Only the Operator determines implementation outcome, and Architect Review clearly guides validation.

### WC08 — Phase Closeout and Roadmap Progression

Dependencies: WC07 accepted.

Purpose: Base closeout eligibility on unresolved Work Card Plan items.

Required outcomes:

- Permit closeout when every planned item has a resolved Operator outcome.
- Keep items awaiting authoring, approval, implementation, review, validation, repair, or disposition unresolved.
- Remove blockers based on Candidate Disposition, Architect Disposition, replacement lineage, repair bookkeeping, or unrelated defects.
- Bind closeout approval to the exact closeout record and updated Roadmap.
- Route approval to the next phase or project completion.
- Route revision or rejection to the same closeout bundle.
- Present migrated historical closeouts through the same workspace.
- Update roadmap status from actual approved outcomes.

Acceptance: Closeout is blocked only by unresolved planned work or a local failure affecting the closeout bundle.

### WC09 — Roadmap-Driven Development State and Operator UI

Dependencies: WC04 through WC08 accepted.

Purpose: Create the live map of development history, current state, pending review, and next action.

Required outcomes:

- Derive state from the Project Roadmap and migrated repository relationships.
- Show Project Planning status and bundle.
- Show phases in roadmap order with completed, active, interrupted, superseded, planned, and pending-disposition states.
- Show each Work Card Plan, ordinary Work Card, repair Work Card, and Operator outcome.
- Show linked Implementer Reports, Architect Reviews, validation evidence, closeouts, and migration notes.
- Show pending disposition counts and locations.
- Show the exact next action, why it is next, and the records affected.
- Provide drill-down from Project to Phase to Work Card to evidence and disposition.
- Keep current action prominent while retaining historical context.
- Derive state from repository records rather than an independently authoritative Workflow State file.
- Localize malformed records without hiding the rest of the project.

Acceptance: The Operator can understand development to date and the next required review without manually reading the repository.

### WC10 — Governance Maintenance Deauthorization and Localized Integrity

Dependencies: WC09 accepted.

Purpose: Prevent maintenance defects from globally suspending unrelated workflow.

Required outcomes:

- Remove Governance Repair as automatic top-level workflow preemption.
- Make malformed, stale, duplicate, or unsynchronized records local blockers.
- Preserve WC02/WC03 migration and historical disposition routes.
- Treat the Artifact Registry as an index and diagnostic aid, not approval authority.
- Preserve identity lookup, duplicate detection, atomic writes, stale-revision protection, containment, and pair synchronization.
- Remove dormant bulk `repairAll()` behavior.
- Retain bounded explicit repair utilities.
- Display unresolved duplicate groups in the development map and normal disposition workflow.
- Prove unrelated defects do not replace the valid current action.

Acceptance: Integrity defects remain visible and actionable without becoming project-wide stop conditions.

### WC11 — Routed IPC, Screen, and Write-Scope De-gating

Dependencies: WC10 accepted.

Purpose: Convert operation checks from parallel authority gates into local safety checks.

Required outcomes:

- Remove coded role labels, screen identity, and IPC policies as substitutes for Operator authority.
- Stop requiring previews and saves to possess independent workflow authorization.
- Retain local stale-view detection and exact output identity where needed.
- Retain bounded output-type checks preventing cross-record corruption.
- Convert renderer mismatch to a local refresh response.
- Make write scope protect the attempted write rather than grant workflow authority.
- Remove obsolete action-catalog authorization labels and dead policy paths.
- Confirm historical review and state-map behavior through the simplified IPC boundary.

Acceptance: Stage screens safely read and write their records without acting as a second approval system.

### WC12 — Execution Run Authority Simplification

Dependencies: WC11 accepted.

Purpose: Make the approved Work Card the execution authority while retaining sequencing and evidence tracking.

Required outcomes:

- Start an Execution Run from one exact approved Work Card.
- Read scope, paths, prohibitions, tests, and outputs from the approved Work Card or direct execution definition.
- Remove approval-level `authorizationGranted`, `sourceCodeChangesAuthorized`, `pushAuthorized`, and `executionPassesAuthorized`.
- Remove duplicated approval metadata where the exact current decision is directly resolvable.
- Remove hard-coded Phase 06 Work Card dependencies from generic production code.
- Keep Execution Run as an evidence and sequencing ledger.
- Keep independent verification as evidence, not Operator acceptance authority.
- Remove or collapse Acceptance Contract and Pass Plan duplication where they only restate the Work Card.
- Preserve useful exact result targeting and ordered pass transitions.

Acceptance: An exact approved Work Card can begin execution without duplicated authorization.

### WC13 — End-to-End Dogfood Reconciliation and Startup Handoff

Dependencies: WC01 through WC12 accepted.

Purpose: Prove the migrated workflow and leave the application at the intended post-phase starting point.

Required outcomes:

- Remove obsolete fields, types, labels, branches, services, tests, and generic queue UI after consumers are gone.
- Reconcile the Project Roadmap so it records the actual Phase 07 scope rather than the deleted prior Architect Bridge plan.
- Confirm every surviving historical record is represented in the new schema and state map.
- Confirm every undisposed record is reachable through a normal stage-owned workspace.
- Confirm safe duplicate groups are merged and unresolved groups remain visible.
- Run complete real-corpus routing and projection tests, typecheck, build, focused tests, and full tests.
- Produce and execute a bounded Operator manual-validation checklist.
- Do not approve the migrated Project Planning bundle during Phase 07 validation.
- Configure or derive application startup so restart opens at:

```text
Project Planning — Operator Approval Required
```

- Display the actual migrated Project Planning bundle with pending disposition state.

Acceptance: The application uses ChampCity_AI’s migrated history as proof of the new workflow and hands control back to the Operator at Project Planning approval.

## Work Card Summary

| Order | Work Card | Primary subsystem |
| ---: | --- | --- |
| 1 | WC01 — Unified Operator Decision and Disposition Contract | Decision model |
| 2 | WC02 — Historical Corpus Inventory and Duplicate Resolution Manifest | Corpus analysis |
| 3 | WC03 — Historical Artifact Migration and Duplicate Cleanup | Data migration |
| 4 | WC04 — Project Planning Approval Workspace and Startup Route | Project Planning workflow |
| 5 | WC05 — Phase Planning Approval Routing | Phase Planning workflow |
| 6 | WC06 — Unified Work Card Approval and Revision Loop | Work Card workflow |
| 7 | WC07 — Advisory Architect Review and Operator Validation | Review and validation |
| 8 | WC08 — Phase Closeout and Roadmap Progression | Closeout and roadmap |
| 9 | WC09 — Roadmap-Driven Development State and Operator UI | State projection and UI |
| 10 | WC10 — Governance Maintenance Deauthorization and Localized Integrity | Maintenance and Registry |
| 11 | WC11 — Routed IPC, Screen, and Write-Scope De-gating | Process invocation and writers |
| 12 | WC12 — Execution Run Authority Simplification | Execution Runs |
| 13 | WC13 — End-to-End Dogfood Reconciliation and Startup Handoff | Integrated validation and startup |

## Phase Completion Rule

Phase 07 is ready for closeout only when:

1. WC01 through WC13 have resolved Operator outcomes.
2. The full historical corpus has been inventoried.
3. Safe duplicate groups are merged, obsolete files removed, and references updated.
4. Every surviving historical record uses the new schema and has a disposition state.
5. Every undisposed record is `pending_operator_disposition` and reachable through normal routing.
6. The five Operator checkpoints are active.
7. The roadmap-driven development map accurately displays repository history and current state.
8. Obsolete authority fields and routes have no production consumers.
9. Full automated and Operator manual validation pass.
10. Application restart opens at `Project Planning — Operator Approval Required` with the migrated Project Planning bundle.

## Next Step After Chat Approval

Author only:

`planning/phases/phase-07/Work_Cards/WC01_unified_operator_decision_and_disposition_contract.md`

Do not author WC02 or later Work Cards until WC01 has been implemented, reviewed, and accepted by the Operator.
