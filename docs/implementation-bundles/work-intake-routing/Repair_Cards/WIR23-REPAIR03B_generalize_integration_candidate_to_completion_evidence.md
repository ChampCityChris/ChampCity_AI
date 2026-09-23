# WIR23-REPAIR03B — Generalize IntegrationCandidate to Completion Evidence

**Type:** Repair Work Card  
**Parent:** WIR23-REPAIR03  
**Depends on:** WIR23-REPAIR03A  
**Experiment:** Implementer Reasoning Reduction  
**Implementer target:** GPT-5.6 Luna Medium

## A. Objective

Remove the false architectural assumption that every IntegrationCandidate is identified by a Plan.

Migrate IntegrationCandidate and Integration Repair to the `IntegrationCompletionEvidence` contract established by REPAIR03A while preserving existing completed-Plan behavior byte-for-behavior at the workflow level.

This card does not yet expose Research integration in the routed workflow/UI. Its success criterion is that existing Plan-backed integration operates through generic completion identity with no regression.

## B. Verified Repository Preconditions

REPAIR03A establishes:

`src/shared/integrationCompletionContracts.ts::IntegrationCompletionEvidence`

with:
- `kind: "plan" | "research"`;
- `routeDecisionId`;
- `completionId`;
- `revision`;
- `fingerprint`;
- `sourcePath`.

Current `IntegrationCandidateRecord` instead stores top-level:
- `planId`;
- `planRevision`;
- `planFingerprint`.

Current `createIntegrationCandidateService()`:
- requires `hooks.load()` to return `binding + plan`;
- calls `projectPlanExecution()` itself;
- hashes Plan fields into candidate identity;
- validates candidate freshness by comparing Plan fields.

Current `routedIntegrationService.ts` is the production Plan-backed caller and already owns:
- completed Plan projection;
- exact Plan path/revision/fingerprint;
- exact Work Intake branch binding;
- checkpoint proof.

Current Integration Repair policy/service requires one `plan` source and validates record Plan fields.

## C. Exact Implementation Delta

### 1. Migrate IntegrationCandidateRecord

In `src/shared/integrationCandidateContracts.ts`:

Import `IntegrationCompletionEvidence`.

Replace required top-level:
- `planId`;
- `planRevision`;
- `planFingerprint`

with exactly:

`completion: IntegrationCompletionEvidence`

Do not retain duplicate legacy Plan fields.

All unrelated candidate fields/status/validation/receipt semantics remain unchanged.

### 2. Make candidate hooks consume completed evidence

In `src/main/planExecution/integrationCandidateService.ts`:

Change `IntegrationCandidateHooks.load()` to return:
- current `WorkIntakeBranchBinding`;
- current `IntegrationCompletionEvidence`.

The candidate layer must no longer import or call `projectPlanExecution()`.

Add bounded runtime validation for completion evidence:
- kind is `plan` or `research`;
- all IDs/path are bounded nonempty strings using existing identifier/path conventions;
- revision is safe integer >= 1;
- fingerprint is 64 lowercase hex;
- source path is normalized repository-relative.

Candidate identity/hash must incorporate the completion fields in a fixed order:

`[kind, routeDecisionId, completionId, revision, fingerprint, sourcePath]`

alongside the existing repository/source/target/policy identity fields.

Persist canonical candidate metadata identity using:
- `candidateId`;
- `intakeId`;
- `completionId`;
- `completionKind`;
- `repositoryId`.

Do not call a field `planId` for Research.

`current(record)` must:
1. reload current binding/completion through the trusted application hook;
2. verify the binding as today;
3. require exact equality of the six completion fields with `record.completion`;
4. preserve current clean-checkout and branch/source checks.

Change stale messages from Plan-specific wording to completion wording where the service is now generic.

### 3. Adapt routed Plan integration as the existing completion producer

In `src/main/planExecution/routedIntegrationService.ts`:

Keep the current Plan eligibility/checkpoint logic.

When supplying candidate hooks, construct:

```ts
{
  kind: "plan",
  routeDecisionId: <current plan binding routeDecisionId>,
  completionId: <planId>,
  revision: <planRevision>,
  fingerprint: <projected plan fingerprint>,
  sourcePath: <planPath>
}
```

Return that as `completion` to IntegrationCandidate.

Update candidate filtering/staleness checks to use `record.completion`:
- kind must be `plan`;
- completionId matches Plan ID;
- revision/fingerprint match current Plan evidence.

For this card, `RoutedIntegrationProjection.planFingerprint` and existing public Plan workflow wording may remain unchanged. REPAIR03C will make the routed projection completion-neutral.

Existing Plan integration behavior must remain otherwise unchanged.

### 4. Make Integration Repair consume one generic completion source

In `src/shared/integrationRepairContracts.ts`:

Change source roles from:
`"intake" | "plan" | "architecture" | "contract"`

to:
`"intake" | "completion" | "architecture" | "contract"`

Do not retain both `plan` and `completion` roles.

In `integrationRepairPolicyProvider.ts`:
- update its trusted load contract to return current binding + current completion + intake path;
- require exact equality between current completion and `record.completion`;
- provide exactly one `completion` source at `completion.sourcePath`.

Validate completion source by kind:

For `plan`:
- artifact type `work-planning-plan`;
- identity `planId === completion.completionId`;
- identity routeDecisionId matches completion;
- artifact revision matches completion revision;
- disposition `Approved`.

For `research`:
- artifact type `work-planning-assessment`;
- identity `assessmentId === completion.completionId`;
- identity routeDecisionId matches completion;
- identity routeId is `research-prototype`;
- artifact revision matches completion revision;
- disposition `Approved`;
- `workflowData.researchOutcome.outcome === "no-implementation-plan-required"`.

For both:
- participationRole must not be historical;
- Intake identity must match record Intake.

In `integrationRepairService.ts::sourceContext()`:
- require exactly one `intake` and one `completion` source;
- accept only the new role vocabulary;
- apply the same Plan/Research completion-source validation against `record.completion`;
- update generic error/prompt wording from “Plan” to “completion evidence” where appropriate.

Repair editable-path policy remains unchanged. Completion evidence remains protected governing intent, not an editable repair path.

### 5. Update fixtures/tests to the new record contract

Migrate existing candidate/repair fixtures from Plan fields to `completion`.

Do not change their intended behavior or reduce their assertions.

## D. Expected Change Boundary

Expected production:
- `src/shared/integrationCandidateContracts.ts`
- `src/main/planExecution/integrationCandidateService.ts`
- `src/main/planExecution/routedIntegrationService.ts`
- `src/shared/integrationRepairContracts.ts`
- `src/main/planExecution/integrationRepairPolicyProvider.ts`
- `src/main/planExecution/integrationRepairService.ts`

Expected tests/support only where current fixtures use Plan-specific candidate fields:
- `test/agent-harness/integration-candidate-semantics.test.cjs`
- `test/agent-harness/integration-repair-provider.test.cjs`
- `test/agent-harness/integration-repair-controller.test.cjs`
- `test/characterization/routed-integration-focus.test.cjs`
- `test/support/integration-scenarios.cjs`
- `test/support/integration-semantics.cjs` only if its candidate fixture requires the contract migration

No renderer or Research routed-workflow changes in this card.

## E. Architectural Decisions Already Made

1. Candidate identity binds to completion evidence, not Plan terminology.
2. Plan and Research use one candidate path after completion has been established.
3. The candidate service does not decide whether work is complete; the trusted application hook supplies validated completion evidence.
4. Candidate freshness requires exact completion equality plus exact source/target state.
5. Integration Repair has exactly one generic completion governing source.
6. No compatibility duplicate Plan fields are retained.

## F. Test and Validation Contract

Reuse existing owners; no new permanent test file.

Run:
1. `npm run typecheck`
2. `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/integration-candidate-semantics.test.cjs`
3. `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/integration-repair-provider.test.cjs`
4. `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/integration-repair-controller.test.cjs`
5. `node --test --test-reporter=tap --test-concurrency=1 test/characterization/routed-integration-focus.test.cjs`

Required proof:
- existing Plan candidate creation/validation/advance still succeeds;
- source/target movement still fails closed;
- completion revision/fingerprint mismatch fails closed;
- Integration Repair still requires current approved Plan completion for Plan candidates;
- routed Plan integration still completes through the same target advancement semantics;
- no `record.planId/planRevision/planFingerprint` contract remains in IntegrationCandidate/Repair production code.

Do not run full suite.

## G. Forbidden Changes

Do not:
- add optional legacy Plan fields to candidate record;
- fabricate Plan fields for Research;
- weaken target policy or validation;
- move completion determination into IntegrationCandidate;
- change repair editable roots;
- expose Research UI/workflow yet;
- change lifecycle checkpoint mechanics;
- modify validation profiles.

## H. Mismatch Policy

Implementer-local:
- exact helper names for completion validation/comparison;
- mechanical fixture shape migration;
- generic error wording.

Stop with `CARD_REPOSITORY_MISMATCH` if:
- a production consumer outside the listed integration surfaces materially depends on top-level candidate Plan fields;
- generic completion requires changing target-validation policy semantics;
- preserving Plan behavior requires compatibility duplicate fields;
- completion source cannot be validated from current canonical metadata.

## I. Completion Evidence

Report:
- all production/test files changed;
- final candidate record shape;
- candidate hash tuple;
- Plan completion object produced by routedIntegrationService;
- Integration Repair source-role migration;
- search evidence that production candidate/repair code no longer uses top-level `planId/planRevision/planFingerprint`;
- exact five validation command results;
- deviations/mismatch.
