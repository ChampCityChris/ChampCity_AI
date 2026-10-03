# WSF14A-AUDIT — Durable SQL Implementer Report / Attempt Boundary

**Current head:** `31b67e9`  
**Purpose:** establish the missing durable pre-execution Implementer Report identity required by WSF15.

## Confirmed gap

Historical Greenfield Implement behavior:

```text
approved Work Card contract
→ Create Implementer Report
→ durable Pending report exists
→ reopen/reload recovers same report
→ Run Implementer
→ report receives implementation result
→ Review & Validation
```

Current structured execution behavior:

```text
approved SQL WorkItem contract
→ Run Implementer
→ random in-memory executionRef
→ WorkItem becomes in_progress
→ immutable ImplementationRecord created only at completion
```

The current SQL model therefore has no durable pre-execution report/attempt identity.

`beginWorkItemAttempt` is insufficient: it stores only WorkItem `in_progress/startedAt`; the executionRef remains in the in-memory Codex session. A process loss before `ImplementationRecord` leaves no durable attempt identity from which the Implement workspace can reconstruct the Pending report.

## Historical evidence

`WorkCardBuildingReviewWorkspace` and its characterization distinguish:

- report missing → **Create Implementer Report**;
- durable Pending report → **Run Implementer**;
- report identity/revision/readiness shown in workspace;
- idempotent recovery of the same report when already created.

The legacy report file itself must not be restored as authority.

## Architecture decision

Add one typed Project State entity:

`ImplementationAttempt`

It is the durable execution/report envelope. It is not the final Implementer result.

Minimum body:

- `workflowId`
- `workItemId`
- `workItemVersion` — exact approved contract WorkItem revision reserved
- `contractId`
- `contractDigest`
- `attemptState: prepared | running | completed | abandoned`
- `sourceMode: source-backed | source-neutral`
- `layout: { memberIds, sources }` containing exact semantic/source entity revisions used to prepare the attempt
- optional `sourceRevisionId` when known
- optional `implementationRecordId` only after completion

The entity retains one stable opaque ID for the attempt. That ID is the canonical execution reference used by Codex and the final `ImplementationRecord.executionRef`.

## Preparation boundary

`prepareImplementationAttempt(workflowId, workItemId)`:

1. resolves the exact current Workflow/WorkItem;
2. requires the exact current WorkItem planning contract to be approved;
3. requires dependency/Phase eligibility but does not mutate source or start execution;
4. captures exact contract/member/source revisions and deterministic contract digest;
5. creates a new `ImplementationAttempt(state=prepared)`, or idempotently returns the current matching prepared attempt;
6. if a prepared attempt exists but the approved contract changed, revise/supersede it using one deterministic typed rule; never silently reuse stale context;
7. creates no `ImplementationRecord`;
8. leaves WorkItem in `planned/ready`.

For source-backed work, preparation may identify the Workflow `SourceBaseline` and expected baseline revision but must not materialize a checkout merely to create the report.

## Start boundary

Run Implementer:

1. resolves the exact prepared attempt;
2. verifies its contract/member/source snapshot is still current;
3. prepares/materializes source if required by execution;
4. revalidates that prepared source revision matches the attempt reservation;
5. transitions the attempt to `running`;
6. calls the existing WorkItem begin semantics;
7. uses `ImplementationAttempt.id` as executionRef.

No second random execution identity is created.

For current callers that invoke Run without an explicit prior Create action, the application may internally prepare/recover the exact attempt first so shared structured execution remains compatible. Greenfield WSF15 must expose the historical explicit Create step.

## Completion boundary

On terminal Implementer result:

1. create the existing immutable `ImplementationRecord`;
2. its `executionRef` equals the exact `ImplementationAttempt.id`;
3. link result to attempt through a typed relationship;
4. transition attempt to `completed`;
5. preserve the existing WorkItem outcome transition and source checkpoint behavior.

Do not put `Pending` into `ImplementationRecord.outcome`.

## Recovery

- A `prepared` attempt is durable and recoverable after application restart/reopen.
- Repeated Create returns the same current matching prepared attempt.
- A completed attempt remains historical and resolves its immutable result.
- A `running` attempt with no live runtime session must fail closed as interrupted/inspection-required in presentation; do not automatically fabricate completion or silently start a second attempt. Full Codex thread resurrection is not required by this foundation card.

## Relationships

Add explicit relationships such as:

- `implementation_attempt_for: ImplementationAttempt -> WorkItem`
- `attempt_result: ImplementationRecord -> ImplementationAttempt`

Do not overload Tester `records_attempt` semantics.

## SQL document projection

Add one deterministic Implementer Report projection keyed by exact `ImplementationAttempt`.

Prepared projection includes:

- Pending status;
- attempt ID/revision;
- exact Workflow/WorkItem;
- approved execution contract / boundaries;
- criteria and dependencies;
- source mode/readiness/baseline reference;
- no fabricated result.

Completed projection additionally includes the linked immutable `ImplementationRecord`:

- outcome;
- summary;
- deviations;
- blockers;
- residual risks;
- source/checkpoint references when available.

The projection is non-authoritative, may be displayed through the document shell, and is exportable as Markdown. Editing/exporting Markdown never mutates SQL.

## Storage

Current SQLite entity tables accept arbitrary non-Project entity type text. No physical SQLite schema migration should be required.

If implementation proves otherwise, stop before adding a migration.

## Building-block consequence

WSF15 can faithfully recover:

```text
Report missing
→ [Create Implementer Report]

Report Pending
→ exact report context/status
→ [Run Implementer]

Report Running
→ runtime status/interactions

Report Completed
→ final SQL-generated Implementer Report
→ Review & Validation
```

The same foundation applies to ordinary WorkItems and Repair WorkItems.
