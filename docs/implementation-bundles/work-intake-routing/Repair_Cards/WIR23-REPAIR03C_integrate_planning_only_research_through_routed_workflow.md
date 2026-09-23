# WIR23-REPAIR03C — Integrate Planning-Only Research Through the Routed Workflow

**Type:** Repair Work Card  
**Parent:** WIR23-REPAIR03  
**Depends on:** WIR23-REPAIR03A, WIR23-REPAIR03B  
**Experiment:** Implementer Reasoning Reduction  
**Implementer target:** GPT-5.6 Luna Medium

## A. Objective

Connect an approved `research-prototype` outcome of `no-implementation-plan-required` to the same validated IntegrationCandidate/target-advance mechanics used by completed Plan work.

Required runtime path:

Approved current Research Assessment
→ Research completion resolved
→ Research lifecycle evidence checkpointed on the Work Intake branch
→ generic IntegrationCandidate created from Research completion
→ existing target-owned validation runs
→ target advances only after validation
→ routed workflow reports `integration-complete`.

No Plan, Work Item, Phase, routed-development binding, Work Card, or implementation session may be manufactured.

## B. Verified Repository Preconditions

After REPAIR03A:
- `resolveResearchCompletion()` returns current Research `IntegrationCompletionEvidence`;
- `checkpointResearchCompletion()` commits the exact accepted Research source graph through a `kind: "research"` lifecycle receipt.

After REPAIR03B:
- IntegrationCandidate stores `record.completion`;
- candidate hooks load current binding + generic completion;
- Integration Repair uses one generic `completion` governing source;
- current Plan-backed routed integration already supplies `kind: "plan"` completion evidence.

Current routed workflow still assumes a Plan:
- `getRoutedWorkflow()` calls `workPlanningKernel.get(..., "plan")` before any integration summary;
- `runRoutedWorkflow()` validates most actions against `model.execution?.fingerprint`;
- it eagerly creates `createRoutedDevelopmentApplicationService()`, which is not valid for no-Plan Research;
- `WorkPlanningPanel` renders `RoutedExecutionPanel` only for an approved Plan;
- `RoutedExecutionPanel` labels the surface as Plan execution/integration.

## C. Exact Implementation Delta

### 1. Make RoutedIntegrationProjection completion-neutral

In `src/shared/routedIntegrationContracts.ts`:

Replace public `planFingerprint` with:

- `completionKind?: "plan" | "research"`
- `completionFingerprint?: string`

Keep `expectedFingerprint` on requests unchanged; it means the fingerprint currently presented to the Operator.

All current status/candidate/checkpoint fields remain.

Update all routed-integration production/tests that read `planFingerprint` to `completionFingerprint`.

Do not add both fields for compatibility.

### 2. Resolve either Plan or Research completion in routedIntegrationService

In `src/main/planExecution/routedIntegrationService.ts`, refactor the internal state resolver into a completion-oriented union.

#### Research branch

Before attempting Plan execution resolution:

1. call `workPlanningKernel.get(root, intakeId, "assessment")`;
2. when `assessment.researchClosed === true`:
   - call `resolveResearchCompletion(root, intakeId)`;
   - return internal state with:
     - `kind: "research"`;
     - current branch binding;
     - Research completion;
     - no Work Item entries;
     - no execution projection.

Do not call `workPlanningKernel.get(..., "plan")` for this state.

#### Plan branch

When Research is not closed, retain existing Plan/Issue execution resolution and convert its current Plan data into the `kind: "plan"` completion already established by REPAIR03B.

Research outcome `research-plan-required` therefore continues to the existing Plan path.

### 3. Resolve trusted Research checkpoint evidence

For Plan state, retain the current Work Item checkpoint validation.

For Research state, scan the current Work Intake checkpoint chain using existing source-control history + `readApplicationCheckpointReceipt()`.

A Research checkpoint is current only if one lifecycle receipt has:
- `boundary.kind === "research"`;
- boundary routeDecisionId equals completion routeDecisionId;
- boundary assessmentId equals completion completionId;
- boundary assessmentRevision equals completion revision;
- evidence Intake/repository/work branch matches current work;
- its `files` entry for `completion.sourcePath` has SHA-256 equal to `completion.fingerprint`;
- containing commit is a valid single-parent checkpoint whose `beforeHead` equals that parent.

Return that commit as the Research `checkpointCommits` entry.

Ignore unrelated older lifecycle/source checkpoints while scanning, but reject malformed checkpoint-chain entries exactly as current code does.

### 4. Research query is eligible for the integration action even before its first checkpoint

`query()` behavior:

For current completed Plan:
- preserve existing requirement that all required source checkpoints already exist.

For current Research completion:
- if a matching Research checkpoint already exists, use it;
- if none exists and there is no candidate, return `status: "ready"` with:
  - `completionKind: "research"`;
  - current `completionFingerprint`;
  - empty `checkpointCommits`;
  - a bounded reason indicating accepted Research will be checkpointed before candidate construction.

Do not construct a candidate during query.

Candidate lookup/filtering must match the exact current `record.completion`, not merely Intake ID.

Aborted-candidate identity checks use completion fingerprint + source/target identities exactly as the Plan path currently does.

### 5. Checkpoint Research immediately before first candidate construction

In `integrate(request)`:

1. run current eligibility/fingerprint checks;
2. if current completion is Research, no current candidate exists, and no current Research checkpoint exists:
   - call `checkpointResearchCompletion(root, intakeId)`;
   - require a committed/current matching Research checkpoint after refresh;
   - require the Research completion fingerprint to remain unchanged after checkpoint;
3. refresh current integration projection;
4. only then call `candidate.create()`;
5. retain existing validate/advance behavior.

If checkpointing finds unrelated changes or changed Research evidence, integration must stop; do not create a candidate.

The target must never advance before candidate validation.

### 6. Make routed workflow resolve Research before Plan

In `src/main/planExecution/routedWorkflowService.ts::getRoutedWorkflow()`:

Before current Plan resolution:
1. get current Assessment;
2. if `assessment.researchClosed`:
   - set `model.route` from Assessment route;
   - do not set `planPath` or `execution`;
   - add a concise reason that approved Research is complete and awaiting/under integration;
   - call existing `integrationSummary()`;
   - return the model.

Otherwise continue current Plan/Issue/Development behavior unchanged.

### 7. Decouple integration actions from routed-development application construction

In `runRoutedWorkflow()`:

Compute the presented fingerprint as:

`model.execution?.fingerprint ?? model.integration?.completionFingerprint`

Use it for the existing stale-presentation guard.

Do **not** eagerly instantiate `createRoutedDevelopmentApplicationService()` before deciding the action.

For all integration-family actions:
- `integrate`
- `prepare-integration-repair`
- `apply-integration-repair`
- `complete-integration-repair`
- `integration-decision`
- `retry-integration-validation`
- `abort-integration`

use `createRoutedIntegrationService(root, intakeId)` directly.

Instantiate `createRoutedDevelopmentApplicationService()` only for Plan execution actions that actually require it.

Existing Plan integration must still use the same routed integration service and remain behaviorally unchanged.

### 8. Expose Research integration in WorkPlanningPanel

In `src/renderer/app/WorkPlanningPanel.tsx`:

When:
- `stage === "assessment"`; and
- `model.researchClosed === true`;

render `RoutedExecutionPanel` for the Intake.

Keep Work Plan disabled and do not render Work Item decomposition.

Existing approved-Plan rendering remains unchanged.

### 9. Make RoutedExecutionPanel valid without an execution projection

In `src/renderer/app/RoutedExecutionPanel.tsx`:

Support a model that has:
- `integration`;
- no `execution`.

For that state:
- heading/summary must identify **Research completion**, not Plan execution;
- do not render “Begin approved Plan”, Work Item, Phase, acceptance, implementer, or Plan-specific controls;
- render current integration status/reasons/checkpoint/candidate evidence;
- when `integrate` is available, label the action `Integrate completed research`.

For Plan state, preserve existing Plan execution UI and use `Integrate completed Plan` or equivalent Plan-specific wording.

All integration repair/abort/retry controls remain shared.

## D. Expected Change Boundary

Expected production:
- `src/shared/routedIntegrationContracts.ts`
- `src/main/planExecution/routedIntegrationService.ts`
- `src/main/planExecution/routedWorkflowService.ts`
- `src/renderer/app/WorkPlanningPanel.tsx`
- `src/renderer/app/RoutedExecutionPanel.tsx`

Expected tests:
- `test/characterization/routed-integration-focus.test.cjs`
- `test/project-planning/project-planning-service.test.cjs`
- one existing renderer test owner if a suitable owner can be reused; otherwise one new narrowly named renderer test file is allowed **only** for the new no-execution Research integration rendering gap and must be added to the ValidationCatalog with an explicit coverage-gap justification.

Expected support changes only if needed to seed the Research integration fixture:
- existing Work Intake/Research fixture helper files.

Do not change IntegrationCandidate/Repair contracts in this card except for mechanical call-site fallout from the already-approved REPAIR03B contract.

## E. Architectural Decisions Already Made

1. Research is integrated through the same candidate/validation/advance mechanism as Plan completion.
2. Research checkpoint occurs immediately before first candidate creation, never during read-only query.
3. Research query may expose `ready` before checkpoint because `integrate` owns that deterministic checkpoint transition.
4. Research has no execution projection.
5. Routed integration public identity is completion-neutral.
6. No fake Plan or Development application service is created for Research.
7. Plan-required Research continues through the normal Plan path.
8. Integration Repair remains available for Research candidates through generic completion evidence established in REPAIR03B.

## F. Test and Validation Contract

### Routed integration owner

Extend `test/characterization/routed-integration-focus.test.cjs` with a Research subcase or sibling top-level test in the same file.

Use a real temporary repository/Work Intake branch and target.

Prove:
1. approved no-plan Research has no Plan artifact;
2. integration query returns `ready`, `completionKind: "research"`, current completion fingerprint, and no candidate;
3. before integrate, target is unchanged;
4. integrate checkpoints Research first;
5. candidate completion kind/id/revision/fingerprint match the approved Assessment;
6. target advances only after candidate validation passes;
7. final query is `integration-complete`;
8. current work branch remains selected/clean after target advancement;
9. no Plan/Work Item/Phase/routed-development binding was created.

Preserve existing clean/conflicted Plan integration proof unchanged.

### Research planning owner

Keep/extend the existing Research closure test only as needed to prove the new routed workflow is reachable after approval and no Plan appears.

### Renderer proof

Reuse an existing renderer owner if one naturally owns route-planning presentation. Otherwise create one bounded renderer test for:
- Research-closed WorkPlanningPanel renders shared routed integration surface;
- Research integration surface does not render Plan execution controls;
- action wording is `Integrate completed research`;
- Plan projection still renders Plan wording.

If a new permanent test file is necessary, update `validation/capability-map.json` only for that test with:
- existing relevant capability ownership;
- `proofCharacteristics: ["behavioral"]`;
- appropriate renderer lane/resource metadata copied from the nearest current renderer owner;
- report the specific coverage gap.

### Required validation

Run:
1. `npm run typecheck`
2. `node --test --test-reporter=tap --test-concurrency=1 test/characterization/routed-integration-focus.test.cjs`
3. `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="research closes durably on reviewed evidence" test/project-planning/project-planning-service.test.cjs`
4. the exact renderer test file modified/created by this card
5. if ValidationCatalog changed: `node --test --test-reporter=tap --test-concurrency=1 test/validation/capability-map.test.cjs`

No full suite.

## G. Forbidden Changes

Do not:
- manufacture a Plan, Work Item, Phase, Work Card or execution binding;
- checkpoint during read-only query;
- bypass IntegrationCandidate validation;
- advance target directly from Research approval/checkpoint;
- auto-integrate on Research approval;
- create a second Research-specific Git merge path;
- weaken candidate repair/validation;
- instantiate routed-development application service for Research;
- preserve `planFingerprint` as a compatibility duplicate.

## H. Mismatch Policy

Implementer-local:
- exact internal union/helper names;
- renderer conditional wording around status details;
- placement of a narrowly justified renderer test.

Stop with `CARD_REPOSITORY_MISMATCH` if:
- REPAIR03A does not expose the stated Research completion/checkpoint API;
- REPAIR03B candidate records do not expose generic completion evidence;
- Research candidate validation requires a separate candidate provider;
- Plan integration cannot be preserved while replacing public `planFingerprint`;
- routed workflow IPC/contracts outside the listed shared model require a new architectural decision.

## I. Completion Evidence

Report:
- production/test files changed;
- Research state-resolution sequence;
- checkpoint-before-candidate proof;
- exact candidate completion evidence;
- proof target advances only after validation;
- proof no Plan/Work Item/Phase/binding is created;
- proof existing Plan integration still passes;
- renderer proof and whether a new permanent test/catalog record was required;
- exact validation command results;
- deviations/mismatch.
