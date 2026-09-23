# WIR23-REPAIR03A — Establish Research Completion Identity and Lifecycle Checkpoint

**Type:** Repair Work Card  
**Parent:** WIR23-REPAIR03  
**Experiment:** Implementer Reasoning Reduction  
**Implementer target:** GPT-5.6 Luna Medium

## A. Objective

Create a deterministic, application-owned representation of an approved planning-only Research completion and make it checkpointable through the existing lifecycle-evidence checkpoint mechanism.

This card does **not** integrate the Research branch. It establishes the exact completion evidence that later cards consume.

No Plan, Work Item, Phase, routed-development binding, or acceptance artifact may be created.

## B. Verified Repository Preconditions

`workPlanningKernel.get(root, intakeId, "assessment")` already exposes `researchClosed: true` only when:
- route is `research-prototype`;
- current Assessment exists and is not stale;
- Assessment disposition is `Approved`;
- structured Research outcome is `no-implementation-plan-required`.

The existing Research test in `test/project-planning/project-planning-service.test.cjs` proves:
- structured outcome parsing;
- Operator approval is required;
- no Plan is manufactured;
- routed development activation is rejected.

`LifecycleEvidenceBoundary` and `LifecycleEvidenceCheckpointInput` currently support only Work Item, Phase and Plan.

`lifecycleEvidenceCheckpointReceipt.ts::validBoundary()` assumes every boundary has `planId + planRevision`.

`checkpointLifecycleEvidence()` already owns:
- exact source-control status;
- allowed-path containment;
- canonical evidence verification;
- unrelated-change rejection;
- staging;
- lifecycle checkpoint receipt creation;
- commit;
- optional remote synchronization.

Reuse that mechanism.

## C. Exact Implementation Delta

### 1. Add generic integration completion contract

Create:

`src/shared/integrationCompletionContracts.ts`

Define exactly:

```ts
export type IntegrationCompletionKind = "plan" | "research";

export interface IntegrationCompletionEvidence {
  kind: IntegrationCompletionKind;
  routeDecisionId: string;
  completionId: string;
  revision: number;
  fingerprint: string;
  sourcePath: string;
}
```

This is evidence identity only. Do not add candidate/Git state.

### 2. Add Research completion resolver

Create:

`src/main/planExecution/researchCompletionService.ts`

Export:

- `resolveResearchCompletion(root, intakeId)`
- `checkpointResearchCompletion(root, intakeId, synchronize?)`

`resolveResearchCompletion` must:

1. read the current Work Intake;
2. read current route decision;
3. read current Research assessment through `workPlanningKernel.get(..., "assessment")`;
4. require:
   - route state `selected`;
   - selected route `research-prototype`;
   - `researchClosed === true`;
   - Assessment disposition `Approved`;
   - Assessment non-stale;
   - Assessment identity `intakeId`, `routeDecisionId`, `assessmentId`;
   - route selection decision ID equals Assessment route decision ID;
   - Research outcome exactly `no-implementation-plan-required`;
5. read the exact canonical Assessment bytes from its repository-relative path;
6. compute `fingerprint` as SHA-256 of those exact canonical bytes;
7. return:
   - current Intake branch binding;
   - `IntegrationCompletionEvidence`:
     - `kind: "research"`;
     - `routeDecisionId` from current selection;
     - `completionId` = Assessment ID;
     - `revision` = Assessment artifact revision;
     - `fingerprint` as above;
     - `sourcePath` = Assessment path;
   - Research lifecycle boundary;
   - Research checkpoint artifact paths.

Use repository path containment; do not resolve arbitrary filesystem paths.

### 3. Add Research lifecycle boundary

Extend `src/shared/lifecycleEvidenceCheckpointContracts.ts` with:

```ts
{ kind: "research"; routeDecisionId: string; assessmentId: string; assessmentRevision: number }
```

Add a matching Research input artifact shape containing:
- `assessmentPath`;
- `routeDecisionPath`.

Existing Plan/Phase/Work Item shapes remain unchanged.

### 4. Checkpoint the current accepted Research source graph

In `lifecycleEvidenceCheckpointService.ts`, add Research artifact resolution.

Starting from the approved Research Assessment:
- validate the exact Research boundary/identity/disposition/outcome;
- validate the current route decision selected route and decision ID;
- collect the bounded canonical source graph required to reproduce the accepted Research closure;
- include the Work Intake, current route-decision artifact, current route source evidence, Research Assessment, and any canonical source ancestors reached through their `sourceRevisions`;
- maximum 20 canonical files;
- all files must remain repository-relative, ordinary bounded canonical Markdown;
- all artifacts carrying `identity.intakeId` must match the current Intake;
- no artifact may have `participationRole: "historical"`.

For ordinary source edges, require the recorded source revision to equal the current artifact revision.

For the Research Assessment's direct edge to the current route-decision path only, treat that edge as route provenance: permit the route-decision document revision to have advanced **only when** current `routeDecisionId + selectedRouteId` still match the Assessment identity/current Research route. Recurse from the **current** route-decision document after making that check.

This matches the retained-route freshness architecture; do not generalize provenance exceptions to other paths.

The checkpoint must fail if any changed/untracked file exists outside the exact collected Research source graph.

Use existing lifecycle checkpoint commit/receipt mechanics.

### 5. Extend lifecycle receipt validation

In `lifecycleEvidenceCheckpointReceipt.ts`:
- accept the Research boundary with only its exact fields;
- validate identifiers/revision bounds;
- use `assessmentId` as the lifecycle checkpoint subject label for Research;
- preserve all existing Work Item/Phase/Plan receipt validation.

No change is required to `applicationCheckpointReceipt.ts` beyond what is mechanically necessary for the extended lifecycle union; its lifecycle parsing remains the same mechanism.

### 6. Wire the Research helper to checkpoint service

`checkpointResearchCompletion()` must:
- call `resolveResearchCompletion()`;
- call `checkpointLifecycleEvidence()` with the resolved binding, Research boundary and exact Research artifact roots;
- return the completion evidence plus checkpoint result;
- not integrate or create an IntegrationCandidate.

## D. Expected Change Boundary

Expected production:
- new `src/shared/integrationCompletionContracts.ts`
- new `src/main/planExecution/researchCompletionService.ts`
- `src/shared/lifecycleEvidenceCheckpointContracts.ts`
- `src/main/planExecution/lifecycleEvidenceCheckpointService.ts`
- `src/main/planExecution/lifecycleEvidenceCheckpointReceipt.ts`

Expected tests:
- `test/agent-harness/source-checkpoint-boundary.test.cjs`
- `test/project-planning/project-planning-service.test.cjs`

Expected additional artifact:
- Implementer Report

Do not modify IntegrationCandidate, routed integration/workflow, renderer, Integration Repair, or validation profiles in this card.

## E. Architectural Decisions Already Made

1. Research completion is real completion evidence, not a fake Plan.
2. Research fingerprint is SHA-256 of exact approved canonical Assessment bytes.
3. Research checkpoint commits accepted canonical workflow evidence only.
4. Current route history is included in checkpoint provenance.
5. Same-route route-history revision drift is the only provenance exception.
6. Integration remains a later card.
7. Research outcome `research-plan-required` is not eligible for this completion path.

## F. Test and Validation Contract

### Source checkpoint owner

Extend `test/agent-harness/source-checkpoint-boundary.test.cjs` with one top-level test:

`research lifecycle checkpoint commits approved no-plan evidence without manufacturing a Plan`

Prove:
- exact collected Research evidence is committed;
- receipt parses as lifecycle kind Research;
- boundary fields match Assessment identity/revision;
- checkpoint file inventory is deterministic/sorted;
- unrelated changed file blocks checkpoint;
- historical/wrong-identity Research Assessment blocks checkpoint;
- Research outcome requiring a Plan blocks completion;
- no Plan artifact is created.

### Research planning owner

Extend the existing Research closure test to:
- resolve Research completion after approval;
- assert completion kind/ID/revision/path/fingerprint;
- call `checkpointResearchCompletion`;
- assert checkpoint is committed and HEAD advances from the prior head;
- continue to prove no Plan/development binding exists.

When that test later requests Assessment revision, update only assertions that previously assumed HEAD never advanced; do not remove its proof that revision request reopens Research closure.

Run:
1. `npm run typecheck`
2. `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="research lifecycle checkpoint commits approved no-plan evidence" test/agent-harness/source-checkpoint-boundary.test.cjs`
3. `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="research closes durably on reviewed evidence" test/project-planning/project-planning-service.test.cjs`

No full suite.

## G. Forbidden Changes

Do not:
- create a Plan or execution binding;
- integrate the target;
- create candidate records;
- automatically approve Research;
- checkpoint `research-plan-required`;
- stage arbitrary `planning/**` files;
- weaken unrelated-change rejection;
- accept historical canonical evidence;
- add shell/Git command strings outside existing source-control service mechanics.

## H. Mismatch Policy

Implementer-local:
- helper/function names;
- internal queue implementation for bounded graph traversal;
- assertion wording.

Stop with `CARD_REPOSITORY_MISMATCH` if:
- current Research Assessment shape lacks the verified identity/outcome fields;
- canonical Research source graph requires non-canonical or unbounded external files;
- lifecycle checkpoint mechanics cannot commit the exact source graph without changing unrelated source-control policy;
- route provenance cannot be distinguished by current stable selection identity.

## I. Completion Evidence

Report:
- files changed/created;
- exact Research completion shape;
- fingerprint derivation;
- checkpoint graph rules and actual files in the test fixture;
- proof no Plan/Work Item/Phase is created;
- proof unrelated changes fail closed;
- exact three validation commands/results;
- local corrections/deviations/mismatch.
