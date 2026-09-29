# EPGA-R04-01 — Fence Git Authority Cutover and Make Rollback Failure-Safe

**Parent:** Existing Project Git Adoption Hotfix / Repair04  
**Starting implementation baseline:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Repair the downstream Existing Project normalization failure exposed by the first real ChampCity_AI conversion after Repair03.

Repair03 source preservation is accepted.

The current failure occurs after source preservation has completed and the adoption journal has entered `normalizing`.

The visible UI error is an EPERM / permission-denied failure involving:

`.champcity/repository.git`

The current rollback path can throw while cleaning managed metadata, mask the original normalization exception, leave the journal stuck at `normalizing`, and partially remove the conversion-created managed repository.

This card must make Git-authority cutover exclusive, ownership-safe, recoverable, and diagnostically faithful on Windows.

Do not reopen Repair02 policy semantics or Repair03 source-staging semantics.

## Current demonstrated state

The failed real conversion currently proves:

- source preservation completed;
- generated current integration policy exists in the preserved source snapshot;
- journal stage is `normalizing`;
- `baselineRevision` is still null;
- `failureReason` is null;
- root conventional Git remains authoritative and usable;
- Main and Dev do not exist;
- no `legacy-git-entry` exists;
- `.champcity/repository.git` survives as an empty directory after partial rollback.

The primary normalization failure was lost because rollback itself failed before the journal could record it.

Repair04 must prevent that class of failure permanently.

## 1. Introduce explicit conversion-owned resource state

Do not use path existence alone as ownership proof during rollback.

Track the resources created or successfully transferred by the current attempt, at minimum:

- whether pre-existing managed metadata was successfully relocated;
- whether the current attempt created a candidate managed repository;
- whether candidate metadata was installed at the final managed path;
- whether root conventional Git was successfully relocated;
- whether Main was created by the attempt;
- whether Dev was created by the attempt;
- which local-state relocations completed;
- whether final Project/RepositoryCheckout registration began/completed.

Rollback may remove or move only resources proven to be owned by the current attempt.

If relocation of a pre-existing path fails before ownership transfer, rollback must leave that pre-existing path untouched.

## 2. Build the new managed bare repository in migration staging

Do not initialize the new managed repository directly at:

`.champcity/repository.git`

while conversion is still fallible.

Create the new bare repository first under the current migration directory, for example:

`.champcity/migrations/existing-project-normalization-<id>/candidate-repository.git`

Use that staged repository to:

- initialize bare Git;
- configure current managed Git settings;
- import readable refs/remotes/history;
- construct the canonical baseline;
- establish canonical main/dev refs.

Do not create Main/Dev worktrees against the staged path yet.

Only after the candidate repository and canonical baseline are proven should managed-metadata cutover begin.

This keeps a failed baseline/import operation entirely inside attempt-owned recovery staging.

## 3. Fence Agent Harness access during Git-authority cutover

The current UI path registers the selected Project workspace immediately before destructive Git normalization, leaving the same workspace available to MCP/Git operations while its Git authority is being replaced.

That is unsafe.

Add one narrow conversion fence for the selected Project workspace.

The fence must:

- reject new Git inspection/mutation/test/release operations against the converting workspace with a bounded typed busy/conversion-in-progress failure;
- allow unrelated workspaces to continue normally;
- ensure conversion does not begin Git-authority relocation while an owned repository operation for that workspace is still active;
- release deterministically on success or failure.

A simple persistent unregister without operation draining is insufficient if already-running operations can continue touching the old Git administration.

Do not stop the entire Agent Harness service.

Do not require Operator interaction beyond the existing Accept and Convert consent.

## 4. Perform managed metadata cutover as an explicit ownership transfer

After the staged candidate repository is complete and the workspace conversion fence is active:

1. inspect the final managed metadata path;
2. if pre-existing `.champcity/repository.git` exists, relocate it to the current migration recovery directory;
3. mark pre-existing metadata as relocated only after the relocation succeeds;
4. move the staged candidate repository into the final `.champcity/repository.git` path;
5. mark final managed metadata as attempt-owned only after that move succeeds.

On Windows, bounded retry is required for transient:

- `EPERM`;
- `EACCES`;
- `EBUSY`;
- `ENOTEMPTY`

during conversion-owned rename/remove operations.

Retries must be short and bounded. Do not spin indefinitely.

If pre-existing metadata cannot be relocated after bounded retry:

- fail before root `.git` is moved;
- preserve the source snapshot;
- preserve the pre-existing metadata;
- record the primary failure;
- release the conversion fence;
- leave the conventional repository authoritative.

## 5. Root conventional Git cutover is a separate stage

Only after final managed metadata is installed and verified:

- relocate root `.git` into current migration recovery staging;
- record that ownership transfer immediately;
- create exact Main and Dev worktrees from the final managed repository;
- verify both worktrees and common-directory identity;
- continue Repair03 local-state relocation;
- perform final Project / RepositoryCheckout registration.

The root `.git` relocation must use the same bounded Windows mutation helper as managed metadata cutover.

If root `.git` cannot be relocated:

- roll final managed metadata back to staging/recovery;
- restore any pre-existing managed metadata if it had been relocated;
- leave root `.git` authoritative;
- journal the primary cutover failure.

Do not delete root Git as a fallback.

## 6. Rollback must never mask the primary failure

Refactor the normalization catch path.

The first normalization exception is the **primary failure**.

Every rollback action must be independently guarded.

Rollback may collect bounded cleanup/recovery diagnostics, but a cleanup exception must never replace the primary failure.

Required behavior:

```text
primary normalization failure
→ attempt bounded rollback steps
→ record any cleanup warnings
→ write failed journal state
→ surface primary failure + bounded cleanup summary
```

The failed journal must be written even when one or more cleanup steps cannot complete.

Do not leave `stage: "normalizing"` merely because rollback cleanup encountered EPERM.

The UI error must identify the primary phase first.

## 7. Windows-safe cleanup of attempt-owned metadata

For conversion-owned directories, add one bounded helper for rename/remove operations.

It must:

- retry transient Windows sharing/permission failures;
- never recurse through unrelated paths;
- operate only on paths proven to belong to the current migration attempt;
- return a bounded cleanup result rather than throwing through the entire rollback;
- preserve any path that cannot be safely removed after the retry budget.

If an attempt-owned candidate cannot be removed, leave it under migration recovery evidence and journal that fact.

Do not partially delete a path and then represent rollback as complete.

## 8. Recover the current known failed normalization state

The current real ChampCity_AI Project must be retryable without manual File Explorer surgery.

Support the current product-owned failed state:

- root conventional `.git` is authoritative;
- no Main/Dev managed checkouts exist;
- current journal says `normalizing`;
- the prior migration source snapshot exists;
- the final managed metadata path may be an empty partial attempt directory;
- a prior empty/pre-existing metadata residue may exist in the migration directory.

On fresh inspection/apply:

- verify root conventional Git and current source are still authoritative;
- treat only journal/migration paths that can be proven to belong to the failed conversion as recoverable residue;
- retire or relocate the empty attempt-owned final metadata residue safely;
- do not reuse the old source snapshot as current source;
- create a fresh inspected plan from current source;
- proceed through the new Repair04 cutover.

Do not add generic compatibility for arbitrary historical ChampCity formats.

This is recovery of the current migration contract's own interrupted attempt.

## 9. Keep journal state truthful

Before each authority-changing stage, the journal must contain enough current-attempt state to distinguish:

- source preserved;
- candidate repository prepared;
- managed metadata cutover;
- root Git relocated;
- managed worktrees created;
- verified;
- completed;
- failed.

The exact schema representation may be revised, but do not preserve obsolete historical variants merely for compatibility.

A failed journal must retain:

- the primary failure phase/reason;
- whether original root Git remains authoritative;
- bounded cleanup warnings;
- any attempt-owned recovery paths intentionally retained.

A completion receipt is still written only after final managed topology and registration succeed.

## 10. Preserve accepted Repair02 and Repair03 behavior

Do not change:

- current managed integration-policy generation;
- validation-profile capability detection;
- generic source-integrity fallback;
- no fabricated Integration Repair scope;
- bounded source manifest/materialization;
- ignored/local-state separation;
- non-following link/junction handling;
- canonical baseline semantics;
- forced canonical main/dev result;
- managed reopen idempotence.

## Permanent proof

At minimum prove:

1. candidate managed repository is built under migration staging, not the final managed metadata path;
2. baseline/import failure before cutover leaves final managed metadata untouched;
3. pre-existing managed metadata relocation failure does not delete or modify that pre-existing metadata;
4. transient Windows EPERM/EACCES during attempt-owned rename/remove is retried within a bounded budget;
5. exhausted cleanup retry records a cleanup warning without masking the primary failure;
6. primary failure is persisted in the journal even when rollback cleanup fails;
7. root conventional Git remains authoritative after any failure before root-Git ownership transfer;
8. root `.git` relocation failure restores/retains prior authority and rolls back final managed metadata safely;
9. Main/Dev are created only after final managed metadata cutover;
10. conversion fence rejects same-workspace Git operations during authority cutover;
11. unrelated registered workspaces remain usable during the fence;
12. fence release restores conventional workspace access after failed conversion;
13. successful conversion releases the fence and registers managed Main/Dev RepositoryCheckouts;
14. the current known `normalizing` + empty managed-metadata residue state is recoverable without manual deletion;
15. Repair03 large ignored-tree/junction proof remains passing;
16. Repair02 generated integration policy remains loadable from the successful baseline;
17. successful conversion still reopens as managed-ready and idempotent.

## Validation

Run focused validation only:

- production build;
- Existing Project managed-source/adoption owner;
- Agent Harness workspace/registry tests needed for conversion fencing;
- bounded Git / repository-operation lifecycle tests affected by fencing;
- Repair03 Windows junction/ignored-tree proof;
- Repair02 integration-policy baseline proof;
- Current Project entry tests affected by registration/fence sequencing;
- capability-map integrity when ownership changes;
- migration validation-plan preview;
- `git diff --check`.

Do not use broad unrelated regression as the completion gate.

The Windows EPERM retry/rollback proof must run in the normal Windows lane.

## Report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Reports/EPGA-R04-01_IMPLEMENTER_REPORT.md`

The report must state:

- staged candidate-repository mechanics;
- workspace conversion-fence mechanics;
- explicit resource-ownership tracking;
- primary-failure preservation behavior;
- Windows bounded retry behavior;
- current failed-state recovery result;
- Repair02/Repair03 regression evidence;
- focused validation results.

## Checkpoint and STOP

Commit:

`EPGA-R04-01 fence Git authority cutover and make rollback failure-safe`

Then STOP for Architect review.

Do not retry the real ChampCity_AI UI conversion until Repair04 is reviewed and accepted.
