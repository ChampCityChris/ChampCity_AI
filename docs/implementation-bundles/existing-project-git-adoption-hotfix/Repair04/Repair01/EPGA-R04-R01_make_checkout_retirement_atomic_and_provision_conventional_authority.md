# EPGA-R04-R01 — Make Checkout Retirement Atomic and Provision Conventional Authority

**Parent:** Existing Project Git Adoption Hotfix / Repair04  
**Depends on:** Repair04 implementation checkpoint `643ea5ed24552b34b9cafa3592b4965703fdb28c`  
**Architect review:** `../EPGA_R04_ARCHITECT_REVIEW_2026-09-29.md`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Close the two RepositoryCheckout lifecycle defects found in Architect review without reopening the accepted Repair02/Repair03 source-control work.

The repair has two bounded responsibilities:

1. make RepositoryCheckout acquisition/retirement genuinely atomic and failure-recoverable;
2. give the application/source-control layer a real production owner for conventional Git checkout provisioning while keeping generic workspace registration Git-neutral.

The real ChampCity_AI conversion remains blocked until this repair is implemented and reviewed.

## 1. Acquire RepositoryCheckout operation authority before any async yield

Current resolution can:

```text
observe available
→ yield during async validation
→ retirement removes checkout
→ resume and acquire stale operation authority
```

Eliminate this race.

The registry must acquire an operation reservation/lease synchronously while the checkout runtime state is `available`.

Required sequence:

```text
validate workspace/checkpoint identity enough to locate registered checkout
→ synchronously assert runtime state == available
→ synchronously increment/reserve active operation
→ perform asynchronous workspace/root/Git validation
→ return validated checkout context + release
```

If any validation after reservation fails:

- release the operation reservation exactly once;
- preserve the original bounded validation error semantics;
- do not leak `activeOperations`.

Do not perform asynchronous filesystem or Git work between the final availability check and reservation.

## 2. Retirement must close the gate before observing active operations

`unregisterRepositoryCheckout()` must:

1. locate the exact persisted checkout;
2. transition its runtime state from `available` to `retiring`;
3. prevent all new reservations immediately;
4. then observe/wait on the active reservation count;
5. remove the persistent checkout registration only after the count reaches zero;
6. delete runtime state only after persistent removal succeeds.

No operation may begin after the retiring transition.

Use one checkout-runtime state object as the synchronization authority; do not create parallel locks.

## 3. Failed retirement restores prior usable authority

If checkout retirement cannot complete before its bounded drain deadline:

- keep the persistent RepositoryCheckout registration unchanged;
- transition runtime state back to `available`;
- remove the timeout attempt's waiter;
- do not leave stale drain waiters;
- allow immediate new checkout resolution and Git operation;
- permit a later retirement attempt.

If persistent registry removal fails after the checkout drained:

- keep/restore the persisted registration;
- restore runtime state to `available`;
- allow immediate use;
- surface the persistence failure.

A failed retirement is not a half-retired state.

## 4. Conversion failure before successful checkout retirement leaves conventional Git usable

Existing Project normalization currently sets `conventionalCheckoutRetired` only after unregister succeeds.

Preserve that rule.

If retirement times out/fails:

- fail the conversion before managed metadata cutover;
- root conventional `.git` remains authoritative;
- no candidate is installed at the final managed metadata path;
- the conventional checkout remains registered and `available`;
- the failure journal records `conventional checkout retirement` as the primary phase;
- the next model Git operation can use the same conventional checkout without restarting Agent Harness.

Do not attempt a redundant re-registration when unregister never completed.

## 5. Add one application-owned conventional checkout provisioner

The new Git-neutral workspace architecture requires a production owner to create model-facing conventional Git authority.

Add one source-control/application helper equivalent to:

`reconcileWorkspaceRepositoryCheckouts(workspaceRoot, workspaceId, registrationPort)`

The exact name/location is implementation-owned.

It must be outside the generic `RegisteredWorkspaceRegistry.register()` decision boundary.

The helper may use bounded source-control/Git inspection.

### Conventional root behavior

When:

- the exact registered workspace root is a valid conventional Git working-tree root;
- the Project root is not already a valid ChampCity managed topology;

ensure one deterministic conventional RepositoryCheckout exists.

Required semantic shape:

- role: `conventional`;
- projectRelativePath: `.`;
- sourceLineId: `conventional`;
- deterministic bounded checkout identity;
- deterministic bounded repository identity owned by the application/source-control layer;
- no Workflow identity.

Do not infer branch role or call the checkout main/dev.

### Non-Git behavior

When the exact workspace root is not Git-backed:

- register no RepositoryCheckout;
- do not initialize Git;
- do not emit a warning merely because Git is absent;
- generic workspace access remains fully available.

### Managed Project behavior

When the root is already a valid ChampCity managed topology:

- do not create a conventional checkout;
- ensure normal managed Main/Dev registration remains the source-control authority through existing managed-source mechanics;
- do not replace managed identities with a root checkout.

## 6. Wire provisioning into real application lifecycle

The provisioner must be used by production paths, not only tests.

At minimum cover:

- ordinary `workspace:choose` activation;
- `agentHarness:chooseAndRegisterWorkspace`;
- restored/rehydrated registered workspaces after Agent Harness service startup;
- Existing Project entry before conversion when the selected root is conventional Git.

Avoid duplicated Git-detection logic across these call sites.

Prefer one application/source-control reconciliation service invoked by the lifecycle owners.

Generic registry registration remains Git-neutral; orchestration happens after registration.

## 7. Reconcile pre-existing registered workspaces after upgrade

Repair04 changes the public Git authority model for registrations that already exist on disk.

A service restart after upgrade must not silently strip Git capability from every previously registered conventional Git workspace.

During Agent Harness/application initialization:

- enumerate registered workspace roots through an internal application-only registry view;
- run the conventional/managed reconciliation helper;
- persist any newly provisioned conventional checkout descriptors;
- leave non-Git workspaces at zero descriptors;
- preserve already-valid managed checkout descriptors;
- do not expose absolute roots through public MCP responses.

This is current-contract reconciliation, not historical source-layout compatibility.

Do not rewrite or import arbitrary legacy workflow state.

## 8. Do not move Git detection back into generic workspace authority

The following remain prohibited:

- `resolveWorkspaceRootContextAsync()` granting Git capability from `.git`;
- workspace `gitBacked` being used as authorization;
- public Git operations directly falling back to workspace root;
- `RegisteredWorkspaceRegistry.register()` deciding a folder should be a Git repository;
- creating Git in a non-Git folder.

Application-owned checkout provisioning and generic workspace registration remain separate steps.

## 9. Preserve exact-checkout public routing

This repair does not reopen the Repair04 decision that Git/test/release operations use registered RepositoryCheckout authority.

Keep:

- exact checkout containment;
- registered checkout validation;
- `list_repository_checkouts` discovery;
- no arbitrary path selector;
- no Workflow/WorkItem requirement for conventional checkout authority.

Do not restore raw root-`.git` authorization.

## 10. Documentation

Update the active Repair04 documentation to state that the Operator's 2026-09-29 workspace/Git authority decision supersedes the earlier RCO-HF01 workspace-root Git authorization rule.

Do not rewrite the historical RCO-HF01 review.

The historical record may remain as the rule that applied before this explicit later decision.

## Permanent proof

At minimum prove:

1. checkout resolution reserves an active operation before any asynchronous checkout validation can race retirement;
2. retirement started while checkout validation is in flight waits for that reservation;
3. no new resolver can acquire a reservation after runtime state becomes `retiring`;
4. validation failure after reservation releases the operation count exactly once;
5. retirement timeout restores runtime state to `available`;
6. after a timeout the same checkout can immediately execute a Git inspection without service restart;
7. persistent unregister failure restores `available` state and leaves registration usable;
8. a later retirement attempt succeeds after a prior timed-out attempt;
9. conversion checkout-retirement timeout occurs before metadata cutover and leaves root Git + conventional checkout authoritative;
10. a non-Git registered workspace receives zero checkouts and remains usable by non-Git tools;
11. a conventional Git root registered through real production workspace activation receives one deterministic conventional checkout;
12. `agentHarness:chooseAndRegisterWorkspace` provisions the same conventional authority;
13. a managed Project does not receive a conventional root checkout;
14. service/application initialization reconciles an already-persisted conventional Git workspace that has no checkout descriptor;
15. reconciliation is idempotent across restart;
16. Repair04 staged-candidate/Windows rollback proofs remain passing;
17. Repair03 ignored-tree/junction proof remains passing;
18. Repair02 generated integration policy remains loadable;
19. Current Project managed Main/Dev registration remains exact and idempotent.

## Validation

Run focused validation only:

- production build;
- registered workspace/checkout lifecycle owner;
- Agent Harness service initialization/reconciliation owner;
- MCP Git contract/routing owner affected by provisioning;
- Current Project Existing Project entry owner;
- managed-project-source adoption owner;
- Repair04 Windows cutover retry/rollback proof;
- Repair03 ignored-tree/junction proof;
- Repair02 policy load proof;
- capability-map integrity when ownership changes;
- migration/repair validation-plan preview;
- `git diff --check`.

Do not use broad unrelated regression as the completion gate.

The concurrency proof must exercise a real asynchronous overlap, not merely acquire a completed lease before retirement begins.

## Report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair01/Reports/EPGA-R04-R01_IMPLEMENTER_REPORT.md`

The report must state:

- atomic reservation ordering;
- retirement timeout recovery;
- production conventional-checkout provisioning lifecycle;
- persisted-workspace reconciliation behavior;
- non-Git workspace result;
- Existing Project retirement-failure result;
- Repair02/03/04 regression evidence;
- focused validation results.

## Checkpoint and STOP

Commit:

`EPGA-R04-R01 make checkout retirement atomic and provision conventional authority`

Then STOP for Architect review.

Do not retry the real ChampCity_AI conversion until this Repair04 Repair01 checkpoint is reviewed and accepted.
