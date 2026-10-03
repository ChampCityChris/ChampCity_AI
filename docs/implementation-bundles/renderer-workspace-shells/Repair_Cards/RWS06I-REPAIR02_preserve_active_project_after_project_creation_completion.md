# RWS06I-REPAIR02 — Preserve the Active Project After Project Creation Completion

**Status:** IMPLEMENTER_READY\
**Parent:** RWS06I — Close / Advance / Integration Lifecycle Convergence\
**Originating checkpoint:** `ce5e5c6ec0c96303cc9af498cef79e304db709e0`\
**Failed review checkpoint:** `4f8cf32c0f7c41a717c0153715c0d24be586b520`\
**Repair type:** lifecycle-boundary defect

## Failed review evidence

Architect source review of completed RWS06 confirmed:

- `projectStateService.completeWorkflowExecution()` closes the Project entity when source-neutral `project-creation` closes.
- `projectStateService.closeIntegratedWorkflow()` does the same after source-backed Project Creation integration.
- `test/phase-planning/phase-planning-service.test.cjs` explicitly asserts both the Project Creation Workflow and the Project become `lifecycleState: "closed"`.
- normal Current Project services require an active Project:
  - `selectedCurrentProjectId(root)` excludes closed Projects by default;
  - `workflowApplicationService.withCurrentProject()`, `workflowExecutionApplicationService.withCurrentProject()`, and `structuredWorkRoutingService` require `project.lifecycleState === "active"`.

Current behavior therefore permits:

```text
complete Project Creation
-> close Project Creation Workflow
-> close Project
-> Workflow Hub / Feature / Issue / WIR can no longer resolve the Current Project
```

The same closure can also defeat the durable structured-authority fence because `legacyCanonicalWriteFence` first resolves the ordinary active Current Project.

## Confirmed defect and root cause

RWS06I conflated two lifecycles:

1. the non-repeatable **Project Creation Workflow**; and
2. the persistent ChampCity **Project** that owns all later work.

The helper `closeProjectLifecycle()` is called from both Project Creation completion paths, and structured close projections/tests treat Project closure as proof that Project Creation completed.

Completing Project Creation should close the Workflow, not retire the Project.

## Architecture correction

This card supersedes only RWS06I's defective interpretation of:

> Project Creation closes through its Project lifecycle.

Correct meaning:

- Project Creation Workflow becomes terminal when its required SQL lifecycle is complete.
- The owning Project remains `active` and remains the same Current Project.
- Later Feature, Issue, Migration, Integration, Infrastructure, Research and optional WIR work continues against that Project.
- True Project retirement/archive is a separate future lifecycle concern and is out of scope.

Do not create a replacement status field. The closed Project Creation Workflow already records completion.

## Objective

Correct source-neutral and source-backed Project Creation completion so the exact Project Creation Workflow closes while the Project remains active, current, and under structured authority.

Preserve all existing WorkItem, Phase, Validation, Repair and source-integration semantics.

## Required implementation

### 1. Correct Project Creation completion

For both completion branches:

- close the exact Project Creation Workflow;
- do not set the Project to `lifecycleState: "closed"`;
- do not write Project `closedAt`;
- do not create/reactivate/re-register a replacement Project.

If `closeProjectLifecycle()` becomes unreachable, delete it.

### 2. Correct Close / Advance projections

Remove the assumption that completed Project Creation requires both Project and Workflow to be closed.

A completed Project Creation Workflow must still resolve to Workflow Hub while its Project remains active.

Update structured close/read compatibility projection only as required. Do not restore Markdown closeout authority or invent Project-retirement behavior.

### 3. Preserve Current Project authority

After Project Creation closes:

- normal `selectedCurrentProjectId(root)` resolves the same Project ID;
- Structured Project State remains `authority: "structured"`;
- the existing legacy canonical read/write fence remains effective;
- no historical Markdown becomes workflow authority.

Do not work around the defect with `includeClosed: true` in ordinary Workflow services.

### 4. Prove normal work continues

Exercise the real service boundary after Greenfield completion:

```text
complete Project Creation
-> same Project remains active/current
-> list Current Project Workflows succeeds
-> start Feature / Capability succeeds
-> optional WIR entry still resolves the same Project
```

Do not add redundant post-Greenfield tests for every Workflow type; they share the same Current Project boundary.

## Expected production scope

Inspect first; modify only where required:

- `src/shared/projectState/projectStateService.ts`
- `src/main/workflow/structuredCloseAdvanceService.ts`
- `src/main/workflow/structuredCloseReadProjection.ts`
- `src/main/projectClose/projectCloseService.ts` only if its structured compatibility projection requires correction

Regression consumers should normally remain production-unchanged:

- `src/main/projectState/currentProjectRegistrationService.ts`
- `src/main/workflow/workflowApplicationService.ts`
- `src/main/workflow/workflowExecutionApplicationService.ts`
- `src/main/workflow/structuredWorkRoutingService.ts`
- `src/main/documents/legacyCanonicalWriteFence.ts`
- existing source integration services.

Likely test owners:

- `test/phase-planning/phase-planning-service.test.cjs`
- `test/workflow/workflow-application-service.test.cjs`
- `test/project-state/project-workflow-facade.test.cjs`
- existing source-control/integration owner if needed for source-backed Project Creation proof
- `validation/capability-map.json` only if proof ownership changes.

Prefer extending existing stable test owners. A new permanent test requires a specific uncovered-boundary justification.

## Preserve

- Greenfield Intake through approved Phase Planning;
- shared SQL WorkItem execution after Phase Planning;
- exact Workflow/WorkItem identity and stale-version guards;
- WorkItem contract review / Operator disposition;
- dependency and prior-Phase execution guards;
- Tester, Validation, Repair and Phase close;
- source-neutral completion without fabricated Git;
- source-backed integration safety;
- final Project Creation Workflow closure;
- direct-start and WIR convergence;
- non-repeatability of Project Creation;
- structured authority and strict Markdown fence;
- historical/generated Markdown as non-authoritative evidence/projection.

## Forbidden changes

- no schema or migration change;
- no new Project-completion flag/status;
- no fallback that treats closed Projects as active;
- no close-then-reactivate behavior;
- no new Project-retirement/archive workflow;
- no weakening canonical read/write fences;
- no duplicate Project or Project Creation Workflow;
- no Markdown authority;
- no unrelated UI, Source Control, Agent Harness, or RWS06 cleanup.

The repair is to stop closing the Project, not teach ChampCity to operate on a closed Project.

## Regression proof

Prove:

1. source-neutral Project Creation closes its Workflow but leaves the Project active;
2. source-backed Project Creation integration closes its Workflow but leaves the Project active;
3. Project Creation completion does not add a Project `closedAt` transition;
4. normal `selectedCurrentProjectId(root)` returns the same Project after completion;
5. Workflow inventory reload succeeds after completion;
6. a Feature / Capability Workflow can start on that Project;
7. optional WIR remains available on that Project;
8. structured authority remains selected and the legacy canonical fence still rejects prohibited access;
9. reopening Project Creation shows terminal history rather than restarting it;
10. another Project Creation Workflow cannot be created;
11. existing WorkItem, Phase, Validation, Repair and integration completion behavior remains green;
12. `git diff --check` passes.

The existing test assertion requiring `Project.lifecycleState === "closed"` after Project Creation is defective proof and must be corrected.

## Validation

Follow the Repair Card validation standard.

Before changing tests, inspect `validation/capability-map.json` and existing owners.

When practical, change the existing Greenfield lifecycle expectation first and demonstrate it fails against the current defective implementation. Otherwise preserve the current committed assertion/source review as fail-before evidence and state why.

Run:

- focused Greenfield SQL close/advance lifecycle proof;
- focused Workflow application proof for post-Greenfield inventory and Feature start;
- focused structured-authority fence proof;
- focused source-backed Project Creation integration proof;
- planner preview using the exact changed-path manifest;
- repair profile / affected-capability validation for that manifest;
- `git diff --check`.

Do not run full/release qualification for this bounded repair. Separate unrelated failures.

## Acceptance criteria

RWS06I-REPAIR02 passes when:

1. Project Creation Workflow closes without closing the Project;
2. both source-neutral and source-backed completion obey that boundary;
3. the same Project remains the active Current Project;
4. Workflow Hub inventory reloads after Greenfield completion;
5. Feature / Capability can start immediately afterward;
6. optional routed Work Intake remains available;
7. structured authority and the canonical Markdown fence remain effective;
8. completed Greenfield history remains visible and non-repeatable;
9. no replacement Project identity or compatibility lifecycle is introduced;
10. focused regression and exact changed-path repair validation pass.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06I_REPAIR02_IMPLEMENTER_REPORT.md`

Include:

- confirmed defect/root cause;
- exact production paths changed;
- source-neutral and source-backed before/after behavior;
- same-Project active identity proof;
- Workflow inventory / Feature-start / WIR proof;
- structured-authority fence proof;
- tests reused, modified, or added with any coverage-gap justification;
- planner/repair-profile receipts;
- unrelated failures, deviations, blockers, and remaining genuine human validation.

## Checkpoint and return path

Commit:

`RWS06I-R02 preserve active Project after Project Creation completion`

After the checkpoint, return to the RWS06 final Architect source-review / acceptance path. No new architecture phase or approval gate is created.
