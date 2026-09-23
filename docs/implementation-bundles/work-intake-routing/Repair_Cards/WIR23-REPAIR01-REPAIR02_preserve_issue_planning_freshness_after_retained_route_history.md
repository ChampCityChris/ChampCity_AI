# WIR23-REPAIR01-REPAIR02 — Preserve Issue Planning Freshness After Retained Route History

**Type:** Repair Work Card  
**Parent:** WIR23-REPAIR01 / WIR23-REPAIR01-REPAIR01  
**Finding:** AR-WIR-R1  
**Experiment:** Implementer Reasoning Reduction

## A. Objective

Prevent the bespoke routed Issue adapter from rewriting a valid route-specific Issue Assessment when the only changed input is mutable route-decision history and the effective Issue route selection is unchanged.

After this repair, a same-route reroute disposition may advance the canonical route-decision document revision/digest without changing:

- the existing Issue handoff;
- the existing approved/current Issue Assessment;
- the existing Issue Plan;
- Assessment/Plan artifact revisions or bytes.

A genuine Issue/RCA evidence change must still revise the Assessment and stale dependent Plan evidence normally.

A genuine route change must still invalidate/historicalize the old Issue route lineage.

## B. Verified Repository Preconditions

### Generic planning freshness is already correct

`src/main/workPlanning/workPlanningKernel.ts` now:

- persists full route-decision provenance;
- treats `route.relativePath` as provenance-only when checking an already-promoted artifact;
- keeps all non-route sources semantically exact;
- leaves draft preparation/promotion strict.

Do not modify this implementation unless a direct compile-only adaptation is required.

### Bespoke Issue adapter remains coupled to mutable route history

`src/main/workPlanning/workIssueRoutingService.ts::runWorkIssueAction()` currently creates:

```ts
const sources = [
  { path: intake.relativePath, revision: intake.artifactRevision },
  { path: route.relativePath, revision: route.artifactRevision },
];
```

When readable RCA evidence exists it builds the Issue route Assessment with:

- `sourceRevisions = [...sources, context.source]`;
- `workflowData.sourceDigests = sourceDigests(root, sourceRevisions) + issue evidence digests`.

The existing write predicate compares full `workflowData`.

Therefore a history-only route revision/digest difference causes the service to rewrite the Assessment even when:

- `decisionId` is unchanged;
- selected route remains `issue-resolution`;
- Work Intake is unchanged;
- Issue handoff is unchanged;
- Issue/RCA evidence is unchanged;
- Operator RCA disposition/recommendation is unchanged;
- generated Assessment body is unchanged.

That new Assessment revision makes an existing Plan stale because the Plan correctly treats the Assessment as semantic evidence.

### Existing proof owner

Use:

`test/issue-resolution/issue-architect-planning-service.test.cjs`

The top-level routed defect test already owns:
- Issue handoff;
- RCA review;
- Issue route Assessment;
- phased correction Plan;
- stale RCA evidence;
- reroute;
- real route-change invalidation.

Do not create a new permanent test file.

## C. Exact Implementation Delta

Modify only the write-decision logic for the generated Issue route Assessment in:

`src/main/workPlanning/workIssueRoutingService.ts`.

### 1. Preserve full route provenance when an Assessment is actually written

When a new/revised Assessment must be written, continue using the current:

- Work Intake source revision;
- route-decision source revision;
- Issue handoff source revision;
- source digests;
- Issue evidence digests.

Do not remove the route source from persisted `sourceRevisions` or `sourceDigests`.

### 2. Make the rewrite predicate semantic

Before deciding to rewrite an existing `prior` Issue Assessment, compare the proposed Assessment with the existing Assessment while treating exactly `route.relativePath` as provenance-only.

The Assessment requires a rewrite when any of the following changes:

- body Markdown;
- document disposition status;
- document disposition notes;
- Work Intake source revision/digest;
- Issue handoff source revision/digest;
- Issue record/investigation/review digest;
- `issueId`;
- reviewed investigation digest/evidence;
- Architect recommendation;
- any other non-route workflowData field.

It does **not** require a rewrite when the only difference is:

- the route source's recorded revision; and/or
- the route source's digest

and the existing Assessment identity still has the current:

- `intakeId`;
- `routeDecisionId`;
- `routeId === "issue-resolution"`.

Implementation structure:

- create a small internal comparison helper in `workIssueRoutingService.ts`;
- compare `prior.metadata.sourceRevisions` against proposed source revisions after removing the exact route path from both;
- compare `workflowData.sourceDigests` after removing the exact route path from both;
- compare the remaining workflowData fields exactly;
- compare body/disposition exactly.

If semantic content is unchanged, do not call `writeCanonicalMarkdownDocument()`. This preserves the prior Assessment's old route provenance bytes rather than rewriting them.

If any semantic content changed, write the proposed Assessment normally with current route provenance.

### 3. Do not special-case action names

The semantic write rule applies consistently to `status`, `prepare`, `copy`, `review`, and the other existing routed Issue actions.

A real review/evidence/body change still writes even if route history also changed.

Do not suppress a legitimate semantic Assessment revision merely because a reroute is pending.

## D. Expected Change Boundary

Expected modified production:
- `src/main/workPlanning/workIssueRoutingService.ts`

Expected modified test:
- `test/issue-resolution/issue-architect-planning-service.test.cjs`

Expected additional artifact:
- Implementer Report

Expected unchanged:
- `workPlanningKernel.ts`
- `workRouteDecisionService.ts`
- `workIssueContext.ts`
- shared contracts
- Research/integration services
- validation catalog unless existing governance mechanically requires measured metadata refresh.

## E. Architectural Decisions Already Made

1. Effective route selection identity is stable across a same-route disposition.
2. Route-decision history remains canonical, revisioned provenance.
3. The Issue Assessment must not roll its revision merely to follow that mutable provenance.
4. Assessment semantic evidence remains exact.
5. A later real Issue/RCA change writes a new Assessment using the then-current route provenance.
6. A real route change remains destructive to the old Issue route lineage.

## F. Test and Validation Contract

Extend the existing top-level test:

`routed defect preserves Intake and branch through RCA, phased correction, stale evidence, and general reroute`

Use its existing production path.

After the Issue Assessment exists and its correction Plan has been promoted, but before deliberately changing RCA evidence:

1. approve/currently establish the Plan as needed by the existing fixture;
2. capture complete Assessment bytes, Assessment revision, Plan bytes and Plan revision;
3. capture the current Issue route selection;
4. call `recommendWorkRouteReroute()` with a distinct replacement route and current bounded Issue/Assessment evidence;
5. dispose the reroute with `override` back to `issue-resolution`;
6. prove the effective selection `decisionId` and route remain unchanged;
7. call `runWorkIssueAction(..., "status")`;
8. prove:
   - same Issue ID/handoff remains current;
   - Assessment bytes and revision are unchanged;
   - Plan bytes and revision are unchanged;
   - `workPlanningKernel.get(..., "assessment").artifact.stale === false`;
   - `workPlanningKernel.get(..., "plan").artifact.stale === false`.

Then continue the existing test's deliberate RCA-evidence mutation and prove that genuine semantic evidence change still causes the expected stale/review behavior.

Keep the existing final real route change to Feature as the negative control; old Issue handoff/lineage must still become historical/unusable.

Required validation:

1. `npm run typecheck`
2. `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="routed defect preserves Intake and branch" test/issue-resolution/issue-architect-planning-service.test.cjs`
3. `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="Operator route decisions preserve authority" test/architect-outputs/architect-output-workspace-repair.test.cjs`

Do not run the full suite.

## G. Forbidden Changes

Do not:
- suppress route-decision artifact revisions;
- remove route provenance from the Issue Assessment;
- rewrite the Assessment solely to refresh route metadata;
- weaken Issue/RCA digest freshness;
- change route decision authority;
- change real-route supersession behavior;
- add a new test file;
- touch Research/integration behavior.

## H. Mismatch Policy

Implementer-local:
- helper naming;
- exact object-normalization syntax;
- assertion wording.

Stop with `CARD_REPOSITORY_MISMATCH` if:
- the existing Issue Assessment does not contain the verified route/source workflowData;
- preserving Assessment bytes requires changing route selection identity;
- a non-route semantic source must be ignored;
- real route-change behavior would need weakening.

## I. Completion Evidence

Report:
- exact files changed;
- exact semantic comparison rule;
- confirmation route provenance remains persisted;
- Assessment/Plan byte and revision preservation after same-route disposition + Issue status;
- confirmation deliberate RCA change still stales/revises correctly;
- confirmation real route change remains destructive;
- exact three validation results;
- deviations/mismatch.
