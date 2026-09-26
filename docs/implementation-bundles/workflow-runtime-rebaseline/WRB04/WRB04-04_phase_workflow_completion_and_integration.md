# WRB04-04 — Normalize Phase/Workflow Completion and Exact-Workflow Integration

**Depends on:** WRB04-03 checkpoint  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Carry the shared kernel from closed WorkItems through Phase/Workflow execution completion and into exact-Workflow integration.

This card also owns the mandatory linked-worktree/common-directory integration repair discovered during WRB02.

## 1. Phase completion

Use exact Workflow-scoped state.

For phased Workflows:
- Phase projection contains only member WorkItems/Criteria;
- Phase eligibility uses typed SPS completion rules;
- deferred visual Criteria are evaluated at the Phase boundary;
- unresolved Repairs/Fixes or blocked dependencies prevent close;
- successful deterministic Phase closure requires no extra human gate.

Use typed `completePhase`; do not mutate Phase state generically.

Direct-topology Workflows skip artificial Phase creation.

## 2. Workflow execution completion

Add a typed Workflow execution-completion operation/read model if absent.

Preconditions:
- exact current Feature/Issue Workflow;
- accepted canonical plan exists;
- all canonical WorkItems are closed;
- all required Phases are closed when phased;
- no active same-Workflow Repair/Fix blocks completion;
- required solution/Workflow-level Criteria are satisfied;
- Tester/Validator obligations are complete;
- source checkpoint chain is current when source-backed.

Execution completion must be represented canonically without conflating it with final source integration.

Choose a bounded Workflow state/workspace transition consistent with existing domain vocabulary, such as `integration` workspace while the Workflow remains active until integration completes.

For valid non-source/source-neutral Workflows, completion may transition directly to closed once no integration target exists.

## 3. Refactor structured integration to exact Workflow identity

Create the Current Project integration application service keyed by:
- Project root;
- exact Workflow ID.

Do not require WorkIntake ID.

The service derives:
- exact Workflow;
- SourceBaseline;
- current ready SourceBinding;
- checkpoint chain;
- exact incoming revision;
- target SourceLine `dev`;
- completion/validation evidence;
- IntegrationRecord.

Direct and WIR-routed Workflows use the same service.

WIR provenance may appear in human context but cannot gate or identify integration.

The old WorkIntake-keyed structured integration service may remain only for historical/unreachable callers until WRB04-05 fencing. Do not wrap the new service around a synthetic WorkIntake.

## 4. Repair integrationGit common-directory identity

Fix the candidate repository boundary.

Required:
- accept conventional or linked checkout as operation root;
- resolve exact `git rev-parse --git-common-dir` through bounded Git mechanics;
- canonicalize/realpath and validate common directory ownership;
- reject redirected/symlinked/unrelated repository identity;
- place `champcity-integration/<candidate-id>` under machine-owned storage associated with the exact common repository;
- verify candidate worktree's common directory equals the selected repository common directory;
- preserve ordinary primary-checkout behavior;
- never assume `root/.git` is a directory.

For managed Current Project topology, expected common repository is the managed repository under `.champcity/repository.git`, reached from `Dev/` as a linked checkout.

Do not use the non-Git Project container as a Git operation root.

## 5. Candidate construction and validation

From the exact Workflow:
- construct candidate against current Dev target;
- verify incoming/target descend from required baseline policy;
- run target-owned candidate validation;
- record exact candidate revision and Validation evidence in IntegrationRecord;
- retain candidate on conflict/failure for repair;
- block stale target/incoming refs.

Do not advance Dev on failed/inconclusive validation.

## 6. Integration Repair

Reuse the existing integration candidate/policy/repair engine where compatible.

Required Current Project semantics:
- exact Workflow is owner;
- exact IntegrationRecord is canonical integration state;
- repair context uses accepted Workflow plan/implementation/validation evidence, not WorkIntake Markdown;
- repair edits only policy-approved candidate paths;
- agent cannot perform Git merge/commit/target-advance mechanics directly;
- material product/scope conflict returns a Decision requirement, not an invented merge winner;
- repaired candidate is revalidated under the same target policy.

If integration repair uses a canonical Repair WorkItem, link it to the IntegrationRecord through the typed source/integration command and execute through the shared Implementer/Tester/Validator mechanics where practical. Do not attach repair work to a superseded Workflow.

## 7. Final target advance and Workflow closure

Only an exact validated ready candidate may advance Dev.

On success:
- atomically/freshly verify target/incoming/candidate refs;
- advance Dev through application-owned Git;
- update IntegrationRecord to integrated with exact result revision;
- close/finalize the exact Workflow through a typed command;
- retain SourceBaseline, SourceBinding, SourceCheckpoint, IntegrationRecord, ImplementationRecord and Validation history;
- do not delete Workflow checkout/history merely to simplify UI.

No push/release action is implied by Dev integration.

## 8. Permanent proof

Prove:
- direct and phased Workflow completion;
- Phase deferred visual policy behavior;
- no Phase gate for direct topology;
- exact Workflow integration works without WorkIntake;
- direct and WIR-routed target integration use same service;
- managed linked-worktree Dev constructs candidate successfully;
- conventional checkout regression still passes;
- candidate common-directory ownership rejects an unrelated repository;
- conflict/validation failure retains candidate and creates repair context;
- repaired candidate revalidates;
- stale target blocks advance;
- successful candidate advances Dev and records exact result;
- exact Workflow closes only after successful integration;
- no new repair attaches to a superseded Workflow.

## Non-scope

Push/release/publication and remaining Workflow family front halves are WRB05/later.

## Validation

Run build; Phase/Workflow completion tests; exact Workflow integration tests; integration candidate/policy/repair focused suites; managed linked-worktree integration proof; conventional checkout regression; stale source-semantic repair fixture after modernization; validation-plan preview; `git diff --check`.

Do not run broad route-owned integration suites solely to preserve replaced WorkIntake authority.

## Report/checkpoint

Write `docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-04_IMPLEMENTER_REPORT.md`.

Suggested commit: `WRB04-04 normalize Workflow completion and integration`.

Then proceed directly to WRB04-05.
