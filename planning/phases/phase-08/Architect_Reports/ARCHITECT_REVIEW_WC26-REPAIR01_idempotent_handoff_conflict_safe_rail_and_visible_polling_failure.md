<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC26-REPAIR01",
    "repairId": "WC26-REPAIR01"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC26-REPAIR01_idempotent_handoff_conflict_safe_rail_and_visible_polling_failure.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC26-REPAIR01_idempotent_handoff_conflict_safe_rail_and_visible_polling_failure.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC26-REPAIR01 Idempotent Handoff, Conflict-Safe Rail, and Visible Polling Failure",
    "reviewResult": "RevisionRequested",
    "workCardRemainsActive": true,
    "newRepairAuthorized": false,
    "operatorValidationAuthorized": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "Handoff idempotency is corrected and deterministic validation passes, but the rail conflict resolver still filters invalid candidate evidence before authority resolution, polling race behavior is asserted only by source-text tests, and the Implementer Report overstates unperformed Electron behaviors as Proven.",
    "reviewedAt": "2026-07-29"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC26-REPAIR01

Review result: `RevisionRequested`  
Work Card remains active: yes  
New repair card: prohibited  
Operator validation released: no  
Git mutation: none

## Review Basis

Reviewed:

- WC26-REPAIR01;
- the submitted Implementer Report;
- the complete current repository diff and dirty-tree inventory;
- current Project Planning service, context, rail, renderer, and focused tests;
- independent normal-Windows validation.

Independent validation:

```text
npm run typecheck  → passed
npm run build      → passed; 1,610 modules
npm test           → passed; 120/120 tests
```

The repository remained at HEAD `a94e0720afb110ed7a0fc748b14cc9799d923099`. No Git operation occurred.

## Accepted Implementation

### Handoff idempotency

The handoff correction is materially correct:

- expected metadata and body are built before writing;
- artifact revision is excluded from the substantive equality comparison;
- unchanged evidence returns `alreadyPrepared=true` without rewriting bytes;
- one genuine upstream revision permits one new handoff revision;
- subsequent preparation is idempotent again;
- `canPrepareHandoff` is limited to `ready-for-handoff`;
- a valid current handoff remains copyable.

The focused tests prove byte stability and revision behavior.

### Core polling implementation

The renderer now includes the required implementation mechanisms:

- visible Project Planning polling-error state;
- action-bar error wiring;
- request IDs;
- quiet-poll overlap protection;
- stale-result guards around model, inventory, resolver, current-model, and preview updates;
- cleanup invalidation;
- last-readable state preservation.

These changes are plausible and within scope, but their behavioral proof remains incomplete as described below.

### Preserved boundaries

The repair did not implement WC27 reconciliation, did not add `artifact_toolbox.save_project_planning_outputs`, did not restore manual output import, and did not modify ChampCity_GPT, migration, browser security, packaging, or Git behavior.

## Required Correction 1 — Rail Resolution Still Hides Invalid Candidate Evidence

`projectLifecycleRailStatus.ts` now detects multiple valid candidates, but `uniqueCurrentHandoff()` filters candidates before resolving authority:

```text
artifactType=generated-handoff
participationRole=nonReviewHandoff
handoffKind=<kind>
Document.Status=Approved
isReviewable=true
```

A candidate with the expected handoff kind or expected repository location but a wrong role, wrong disposition, unreadable body, malformed canonical metadata, or ambiguous stale/current relationship is discarded before zero/one/conflict resolution.

That can produce a plausible state such as `Ready` or select one valid handoff while invalid active evidence remains present. WC26-REPAIR01 explicitly requires wrong-role, unreadable, stale, and mixed evidence that makes authority ambiguous to produce `Needs Attention`.

The same risk exists when malformed Phase Map or Project Closeout files cannot expose `artifactType`; type-only discovery ignores them rather than reporting the occupied authority family as invalid.

### Required implementation

For each later rail authority family:

1. discover the bounded candidate family before applying validity filters;
2. classify each candidate as current-valid, provably superseded historical/stale, or invalid-active;
3. return `Needs Attention` when any invalid-active candidate occupies the authority family or when more than one current-valid candidate exists;
4. permit one current-valid candidate plus a provably superseded prior candidate only when exact source revisions and identity make supersession deterministic;
5. continue excluding `participationRole=historical` and `planning/archive/` records.

At minimum apply this to:

- Project Planning handoff;
- Phase Map handoff;
- Phase Map output;
- phase closeouts by mapped `phaseId`;
- Project Closeout.

Do not use first/last/newest/path-sort selection.

### Required tests

Add focused tests proving:

- one wrong-role Phase Map handoff produces `Needs Attention` rather than `Ready`;
- one unreadable or malformed candidate in the Phase Map authority family produces `Needs Attention`;
- one valid plus one invalid-active handoff produces `Needs Attention`;
- one valid current handoff plus one exact, provably superseded prior handoff does not create a false conflict;
- wrong-role or malformed Project Closeout evidence produces `Needs Attention`;
- archived/historical invalid records remain excluded.

## Required Correction 2 — Polling Evidence Is Source-Text Presence, Not Behavioral Proof

`test/renderer/project-planning-polling-source.test.cjs` verifies only that certain identifiers and source strings exist. It does not execute the asynchronous ordering behavior claimed by evidence items 13–16.

The current test cannot prove that:

- an older delayed request cannot replace a newer model;
- cleanup invalidates a pending request;
- a failed poll preserves the last readable state;
- later success clears the actual visible error state;
- manual refresh supersedes an older background request and recovers.

### Required implementation/evidence

Extract only the minimum request-order/in-flight/error transition logic into one pure, bounded Project Planning refresh coordinator or equivalent testable helper. Do not add a renderer-testing dependency.

Deterministic tests must execute deferred promises or equivalent controlled requests and prove:

1. request 1 starts;
2. request 2 supersedes request 1;
3. request 2 completes and becomes current;
4. request 1 completes later and is ignored;
5. cleanup invalidates pending completion;
6. a failed current request records an error without clearing the last accepted model;
7. a later successful request clears that error;
8. quiet interval overlap is rejected while manual refresh may supersede.

The visible Electron behavior still requires Operator validation after Architect acceptance.

Authorized additional production surface, only if needed:

```text
src/shared/projectPlanning/<one refresh-coordinator helper>.ts
```

No broader renderer refactor is authorized.

## Required Correction 3 — Implementer Report Evidence Is Overstated

The report marks all twenty evidence items `Proven` while also stating:

```text
Operator manual acceptance was not performed.
Live Electron visual validation was not performed.
```

Those statements cannot coexist with `Proven` claims for running-product items 12–17 and 19.

In particular:

- item 12 requires a visibly reported background polling failure;
- item 13 requires visible recovery;
- item 16 requires manual Refresh failure and recovery;
- item 17 requires detection by the open workspace, not only a service-model call;
- item 19 requires non-regressed live embedded browser behavior.

### Required report correction

Revise the evidence table to distinguish:

```text
DeterministicallyProven
OperatorValidationPending
NotProven
```

At minimum, items 12, 13, 16, 17, and 19 remain `OperatorValidationPending` until the Operator performs them in Electron. Item 14 and the sequencing portions of item 15 require the executable coordinator tests above before they may be `DeterministicallyProven`.

The report may remain the implementation report while Operator evidence is pending, but it must not claim final repair completion. WC26-REPAIR01 remains active until Architect review and Operator validation are both complete.

## Required Continuation Boundary

Continue under WC26-REPAIR01. Do not create WC26-REPAIR02 and do not modify WC27.

Authorized changes are limited to:

```text
src/shared/workspaces/projectLifecycleRailStatus.ts
src/renderer/app/App.tsx                                  [only if needed for coordinator integration]
src/shared/projectPlanning/<one refresh helper>.ts        [optional, bounded]
test/renderer/project-rail-presentation.test.cjs
test/renderer/project-planning-polling*.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC26-REPAIR01_idempotent_handoff_conflict_safe_rail_and_visible_polling_failure.md
```

Do not reopen handoff idempotency unless a new focused test exposes a regression.

## Return Conditions

Return for Architect review only after:

1. invalid-active rail candidates are conflict-safe;
2. polling ordering and recovery are behaviorally tested, not merely source-matched;
3. all typecheck, build, and tests pass once in the normal Windows lane;
4. the Implementer Report uses accurate evidence classifications;
5. no Git operation, migration, WC27 change, or ChampCity_GPT change occurs.

Operator Electron validation remains after the next Architect review.
