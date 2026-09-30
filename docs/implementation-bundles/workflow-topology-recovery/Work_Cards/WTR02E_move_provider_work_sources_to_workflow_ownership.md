# WTR02E — Move Provider Work-Source Ownership and Naming from Work Intake to Workflow

**Milestone:** WTR02 — Repository, checkout, MCP, and source ownership contracts  
**Implementer:** GPT 6.0 Luna Medium  
**Depends on:** WTR02D closed at `52f079e486a33db64f7ada19be351ede39658945`  
**Architecture:** `docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`  
**Operator decisions:** `docs/implementation-bundles/workflow-topology-recovery/OPERATOR_DECISIONS_2026-09-23.md`  
**Architect audit:** `docs/implementation-bundles/workflow-topology-recovery/ARCHITECT_AUDIT_2026-09-23.md`  
**Plan:** `docs/implementation-bundles/workflow-topology-recovery/WORK_CARD_PLAN.md`  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02E_IMPLEMENTER_REPORT.md`

## 1. Objective

Remove the remaining provider-level assumption that a work SourceLine belongs to a Work Intake.

After WTR02E:

```text
substantive Workflow
    ↓
WorkflowSourceOwner
    ↓
RepositoryLifecycleFoundation.createWorkSource(...)
    ↓
Workflow-owned SourceLine
```

WIR is not a valid source owner.

This card changes only:

- the shared provider work-source owner contract;
- deterministic Git source-line naming;
- `SourceControlService.createWorkSource()`;
- permanent provider-boundary proof.

This card does **not** connect Structured Project State `SourceBinding` to provider source creation yet.

That orchestration and RepositoryCheckout provisioning belong to WTR02F.

## 2. Architectural invariant

The source lifecycle owner is the substantive Workflow performing source-changing work.

Required invariant:

> A Work Intake Routing Workflow may provide provenance for a target Workflow, but it never owns the target Workflow's SourceLine.

Directly started and WIR-created substantive Workflows must therefore use the same provider contract:

```text
Workflow ID
→ Workflow source owner
→ deterministic Workflow SourceLine
```

No provider branch/source-line identity may depend on:

- Work Intake ID;
- WIR provenance;
- Workflow title;
- Workflow type;
- Work Item title;
- route label.

Ownership is by exact Workflow identity.

## 3. Shared owner contract — hard cut

Update:

`src/shared/sourceLifecycleContracts.ts`

Remove:

```ts
export interface WorkSourceOwner {
  kind: "work-intake";
  workIntakeId: string;
}
```

Replace with:

```ts
export interface WorkflowSourceOwner {
  kind: "workflow";
  workflowId: string;
}
```

Update:

```ts
export interface CreateWorkSourceInput {
  baseRevision: SourceRevision;
  owner: WorkflowSourceOwner;
}
```

and:

```ts
export interface WorkSourceBinding {
  owner: WorkflowSourceOwner;
  sourceLine: SourceLine;
  baseRevision: SourceRevision;
  repositoryCheckoutId?: string;
}
```

Do not retain:

- a `WorkSourceOwner` compatibility alias;
- a union accepting both Work Intake and Workflow;
- optional `workIntakeId`;
- dual ownership fields.

This is a semantic hard cut at the provider contract.

## 4. Leave later lifecycle contracts unchanged

WTR02E must **not** convert unrelated contracts that are intentionally owned by later cards.

Leave unchanged in `sourceLifecycleContracts.ts`:

- `SourceReadiness.workIntakeId`;
- `ImplementationCheckpointRequest.workIntakeId`;
- `DispositionCheckpointRequest.workIntakeId`;
- `IntegrationCandidateRequest.workIntakeId`;
- `SourceGraph.workIntakeIds`;
- `SourceGraph.workBindings[].workIntakeId`.

Those are transitional seams owned by:

- WTR02F — materialization/readiness convergence;
- WTR02G — checkpoint and IntegrationRecord ownership;
- WTR02H — Source Graph Workflow identity.

Do not widen WTR02E to remove every `workIntakeId` in the source lifecycle file.

## 5. Deterministic Workflow source-line naming

Update:

`src/main/sourceControl/workSourceNaming.ts`

Add:

```ts
export function workflowSourceLineName(workflowId: string): string
```

The exact current Git-provider name is:

```text
workflow/<workflow-id>
```

Example:

```text
workflow/a1b2c3d4-e5f6-4789-8abc-0123456789ab
```

Do not add:

- title slug;
- type slug;
- Work Intake ID;
- random suffix;
- timestamp;
- model-generated text;
- hash when the exact UUID already provides collision-safe identity.

The provider branch name is mechanical metadata derived from stable Workflow identity.

## 6. Workflow ID validation for source naming

`workflowSourceLineName()` must require the same canonical lowercase Workflow identity shape adopted for managed Workflow checkout paths:

```regex
^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

Reject:

- uppercase UUIDs;
- nil UUID;
- invalid version nibble;
- invalid variant nibble;
- whitespace;
- separators/traversal around the UUID;
- arbitrary bounded strings.

Do not normalize a supplied ID into another identity.

The exact canonical application Workflow ID is the source naming input.

## 7. Preserve legacy Work Intake naming for legacy callers only

Current:

`workIntakeBranchName()`

is still used by the legacy `WorkIntakeBranchService` and several retained V1 execution/integration surfaces.

Do not delete or change `workIntakeBranchName()` in WTR02E.

Both functions may temporarily coexist in:

`workSourceNaming.ts`

but their authority is different:

- `workflowSourceLineName()` — current provider work-source naming contract;
- `workIntakeBranchName()` — transitional legacy implementation only.

Do not re-export `workflowSourceLineName()` through:

`workIntakeBranchService.ts`.

Do not make new structured code call the Work Intake naming function.

Legacy retirement occurs in later WTR cards after callers move.

## 8. Provider createWorkSource ownership

Update:

`src/main/sourceControl/sourceControlService.ts`

Current behavior rejects any owner other than:

```text
kind = work-intake
```

and derives the branch from `workIntakeId`.

Change it to require:

```ts
owner: {
  kind: "workflow";
  workflowId: <canonical Workflow ID>;
}
```

The source name must come from:

`workflowSourceLineName(owner.workflowId)`

No Work Intake owner is accepted.

## 9. createWorkSource semantics

For a valid request:

```text
selected Repository
+ exact immutable baseRevision
+ exact Workflow owner
→ atomically create Workflow SourceLine ref from baseRevision
→ return provider-neutral WorkSourceBinding
```

Required result:

```ts
{
  owner: {
    kind: "workflow",
    workflowId
  },
  baseRevision,
  sourceLine: {
    repositoryId,
    sourceLineId: "workflow/<workflow-id>",
    providerBranchName: "workflow/<workflow-id>",
    headRevisionId: baseRevision.revisionId
  }
}
```

`repositoryCheckoutId` remains absent.

WTR02E creates a SourceLine only.

It does not create a writable checkout.

## 10. Exact-base behavior

Retain the existing exact base validation:

- `baseRevision.repositoryId` must equal selected Repository identity;
- `baseRevision.revisionId` must be an exact supported immutable Git commit ID;
- provider branch creation uses that exact revision;
- current selected branch does not define the base;
- dirty/untracked files in the current checkout do not become source input.

Use existing:

`createGitBranchFromRef()`

ref-level mechanics.

Do not switch the current branch as part of `createWorkSource()`.

## 11. One deterministic SourceLine per Workflow identity

Calling `createWorkSource()` twice for the same Workflow identity must not silently reuse or overwrite the existing branch.

Expected behavior:

- first call creates `workflow/<workflow-id>`;
- second call collides visibly through the existing bounded provider failure path;
- existing SourceLine remains at its prior revision;
- no alternate suffix is invented.

Different Workflow IDs created from the same base revision must create distinct SourceLines.

This is required for same-type Workflow multiplicity.

## 12. Work Intake owner must fail closed at runtime

Even though TypeScript no longer permits the old owner shape, JavaScript/MCP/internal runtime payloads may still be malformed.

Permanent proof must call:

```js
service.createWorkSource({
  baseRevision,
  owner: {
    kind: "work-intake",
    workIntakeId: "WI.01"
  }
})
```

and prove:

- result fails;
- error code is `INVALID_INPUT`;
- no `work-intake/*` branch is created;
- no `workflow/*` branch is created from that malformed owner.

Do not accept the old owner as a compatibility path.

## 13. WIR must not receive a provider SourceLine

WTR02E operates on provider owner identity, not Project State lookup, so `createWorkSource()` does not independently load a Workflow record or determine Workflow type.

Do not add Project State access to `SourceControlService`.

WIR exclusion is enforced architecturally by:

- the caller contract: WTR02F will only materialize substantive Workflow SourceBindings;
- WTR02A/B domain invariants;
- the provider contract no longer accepting Work Intake ownership.

Do not add a Workflow-type lookup or SPS dependency inside the provider adapter in this card.

## 14. WorkIntakeBranchService remains untouched

Do not modify:

- `src/main/workIntake/workIntakeBranchService.ts`;
- `src/shared/workIntakeBranchContracts.ts`;
- existing legacy Work Intake branch verification/checkpoint lineage behavior.

That service is a legacy/V1 execution path, not the provider `createWorkSource()` contract being corrected here.

Its remaining callers will be removed or converted under their owning WTR cards.

Changing it here would mix provider ownership repair with legacy runtime retirement.

## 15. No SourceBinding orchestration yet

Do not modify:

- `ProjectStateService.createWorkflowSourceBinding()`;
- `SourceBinding` Project State schema/body;
- `structuredWorkIntakeService`;
- `semanticCheckpointService`;
- `structuredWorkflowCheckpointService`;
- `structuredIntegrationService`.

WTR02F will orchestrate:

```text
Workflow SourceBaseline
→ provider createWorkSource()
→ RepositoryCheckout materialization
→ SourceBinding ready state
```

WTR02E only makes the provider operation semantically correct before WTR02F calls it.

## 16. No RepositoryCheckout behavior

Do not:

- create worktrees;
- create checkout directories;
- generate `repositoryCheckoutId`;
- register a RepositoryCheckout with Agent Harness;
- modify `.champcity/checkouts/`;
- change MCP checkout routing.

WTR02C/D established contracts/routing.

WTR02F owns lazy checkout materialization.

The WTR02E result must continue to prove:

```ts
workSource.repositoryCheckoutId === undefined
```

## 17. No Project physical-topology changes

Do not modify:

- `projectSourceBootstrap.ts`;
- Main/Dev checkout creation;
- `.champcity/repository.git`;
- Existing Project adoption;
- Greenfield bootstrap.

Those remain WTR03C/D.

WTR02E works against the concrete Git checkout root supplied to the current `SourceControlService`, exactly as the provider adapter does today.

## 18. Permanent provider-boundary proof

Primary owner:

`test/agent-harness/source-control-service-boundary.test.cjs`

Update only the `createWorkSource()` portion of the existing provider boundary test.

Use canonical Workflow IDs, for example:

```text
a1b2c3d4-e5f6-4789-8abc-0123456789ab
b1b2c3d4-e5f6-4789-8abc-0123456789ab
```

Required proof:

1. exact base revision resolves as before;
2. `createWorkSource()` accepts `{kind:"workflow", workflowId}`;
3. returned owner is exactly the Workflow owner;
4. sourceLine ID is exactly `workflow/<workflow-id>`;
5. provider branch name is exactly the same Git ref name;
6. head revision equals exact base revision;
7. `repositoryCheckoutId` is absent;
8. provider branch exists at the exact base commit;
9. current checked-out branch remains unchanged;
10. unrelated dirty/untracked working-copy content remains unchanged;
11. second call for same Workflow identity fails without moving/reusing the branch;
12. second distinct Workflow identity from same base creates a distinct Workflow SourceLine;
13. wrong Repository base fails and creates no branch;
14. old Work Intake owner fails `INVALID_INPUT` and creates no branch.

Do not weaken the rest of this existing provider boundary test.

## 19. Permanent naming proof

In the same test file or a small focused test section, prove:

`workflowSourceLineName()`

returns exactly:

```text
workflow/<canonical-workflow-id>
```

and rejects:

- uppercase ID;
- nil ID;
- invalid UUID version;
- invalid UUID variant;
- traversal/embedded separator;
- whitespace.

Do not create a large new test family for one naming helper.

## 20. Preserve legacy Work Intake branch proof

Run the existing:

`test/agent-harness/work-intake-branch-boundary.test.cjs`

without changing its production owner semantics.

It should continue to prove the retained legacy service behaves as it did before.

If this test fails because WTR02E accidentally changed `workIntakeBranchName()`, fix WTR02E rather than rewriting the legacy test.

## 21. SourceControl operation/receipt remains stable

Keep:

```text
SourceControlOperation = "create-work-source"
```

and existing attributable receipt semantics.

Do not rename the operation to a Git-specific or Workflow-specific public operation in this card.

RepositoryService callers still request semantic work-source creation.

Only the owner identity changes.

## 22. Expected production files

Expected:

- `src/shared/sourceLifecycleContracts.ts`
- `src/main/sourceControl/workSourceNaming.ts`
- `src/main/sourceControl/sourceControlService.ts`

Expected test:

- `test/agent-harness/source-control-service-boundary.test.cjs`

Normally unchanged but explicitly run:

- `test/agent-harness/work-intake-branch-boundary.test.cjs`

`validation/capability-map.json` may change only if the provider-boundary behavior metadata/count requires an accurate update.

Any additional production file requires explicit compile necessity in the Implementer Report.

## 23. Explicit non-scope

Do **not** in WTR02E:

- modify WorkIntakeBranchService;
- modify WorkIntakeBranchBinding contracts;
- delete legacy Work Intake naming;
- wire Project State SourceBinding to provider source creation;
- create RepositoryCheckouts/worktrees;
- generate checkout IDs;
- register checkout targets with MCP;
- change SourceReadiness ownership;
- change checkpoint request ownership;
- change IntegrationCandidate request ownership;
- change SourceCheckpoint/IntegrationRecord Project State ownership;
- change Source Graph identity;
- alter WIR routing;
- add Workflow-type lookups to SourceControlService;
- change Project topology/bootstrap;
- implement WTR02F+.

## 24. Acceptance criteria

WTR02E is complete only when:

1. provider work-source owner is Workflow, not Work Intake;
2. old Work Intake owner contract is removed rather than retained as an alias/union;
3. Workflow SourceLine naming derives only from exact Workflow ID;
4. current Git provider uses exact `workflow/<workflow-id>`;
5. Work Intake owner is rejected at runtime;
6. exact-base SourceLine creation remains ref-level and branch-switch-free;
7. two different Workflow identities can own independent SourceLines from the same base;
8. repeated creation for one Workflow does not overwrite/reuse;
9. no RepositoryCheckout is created;
10. legacy WorkIntakeBranchService remains unchanged;
11. SourceReadiness/checkpoint/integration/graph Work Intake fields remain deferred to F/G/H;
12. focused provider proof passes.

## 25. Validation

Required:

1. `npm run build`;
2. `node --test test/agent-harness/source-control-service-boundary.test.cjs`;
3. `node --test test/agent-harness/work-intake-branch-boundary.test.cjs`;
4. validation planner preview for the exact final changed-path manifest using the work-item profile;
5. `npm run test:affected -- --changes <exact-changed-path manifest>`;
6. `git diff --check`.

Do not run the historical full suite unless selected by the exact affected plan.

Affected failures belonging solely to deferred WTR02F/G/H or WTR03C source-materialization/topology behavior may remain classified as deferred.

The WTR02E provider-boundary proof itself must pass.

## 26. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02E_IMPLEMENTER_REPORT.md`

Include:

- starting SHA;
- exact files changed;
- old owner contract removed;
- new `WorkflowSourceOwner` shape;
- exact source-line naming rule;
- canonical Workflow ID validation;
- `createWorkSource()` ownership behavior;
- same-Workflow collision behavior;
- two-Workflow same-base proof;
- old Work Intake owner rejection proof;
- confirmation that current checkout/working-copy state is not switched;
- confirmation that `repositoryCheckoutId` remains absent;
- focused validation results;
- affected failures classified by later owning card;
- explicit confirmation that WorkIntakeBranchService, SourceBinding orchestration, checkout materialization, checkpoints/integration, Source Graph, MCP routing, and Project topology were not modified.

Do not edit the committed report afterward solely to add its own checkpoint hash.

## 27. Git checkpoint and stop boundary

The Operator has already authorized routine card-local Git mechanics for WTR.

After implementation, validation, report, exact staged-diff review, and safety scan, create exactly one attributable checkpoint commit.

Suggested subject:

`WTR02E move provider work sources to Workflow ownership`

No additional Operator Git approval is required.

Do not push, merge, tag, release, reset, clean, restore unrelated files, or perform Git actions outside this card.

Then **STOP**.

Do not begin WTR02F.

The Architect will review WTR02E before lazy Workflow SourceLine/RepositoryCheckout materialization is released.
