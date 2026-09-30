# EPGA-R04-01 — Decouple Workspace Access from Git Authority and Make Cutover Failure-Safe

**Parent:** Existing Project Git Adoption Hotfix / Repair04  
**Starting implementation baseline:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Architect revision baseline:** `73a260aa8fd9b2f2e9b8620b01101f8634567f93`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Repair the downstream Existing Project normalization failure exposed by the first real ChampCity_AI conversion after Repair03, while correcting the underlying authority model that made the cutover unnecessarily dependent on generic MCP workspace Git state.

Repair03 source preservation is accepted.

The current production failure occurs after source preservation has completed and the adoption journal has entered `normalizing`. The visible UI error is an EPERM / permission-denied failure involving:

`.champcity/repository.git`

The current rollback can throw while cleaning managed metadata, mask the original normalization exception, leave the journal stuck at `normalizing`, and partially remove conversion-created managed repository state.

This card must also establish the intended product boundary:

> A registered Agent Harness workspace is a generic model-access directory. It is not inherently a Git repository and must not gain Git authority merely because a `.git` entry happens to exist at its root.

Git authority belongs to explicit Repository / RepositoryCheckout state owned by ChampCity's source-control/application layer.

Non-Git workspaces must remain first-class model workspaces.

This Operator-approved 2026-09-29 workspace/Git authority decision supersedes the earlier RCO-HF01 rule that authorized Git from the generic workspace root. The historical RCO-HF01 review remains unchanged as evidence of the rule that applied before this later decision.

Do not reopen Repair02 integration-policy semantics or Repair03 source-staging semantics.

## Current demonstrated state

The failed real ChampCity_AI conversion currently proves:

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

Repair04 must make this state recoverable without manual filesystem surgery.

## 1. Make Agent Harness workspace registration Git-neutral

Refactor generic workspace registration so it owns only model-access authority.

A registered workspace must continue to establish:

- exact `workspaceId`;
- canonical workspace root;
- repository/display name metadata;
- filesystem read authority;
- bounded artifact/write authority;
- patch workflow authority;
- availability.

Generic workspace registration must **not**:

- probe the root for `.git` to decide whether the workspace is valid;
- treat `gitBacked` as an authoritative workspace capability;
- grant Git inspection/mutation merely because the selected root is a Git worktree;
- reject a workspace because no Git repository exists.

Remove `gitBacked` / `capabilities.gitInspection` from the generic workspace authority path, or reduce them to non-authoritative diagnostics that cannot grant Git access. Prefer deleting the coupling where practical.

A folder containing only documents, media, assets, research, planning material, or arbitrary project files must remain fully registerable and usable by model-facing non-Git tools.

Do not make Git a prerequisite for:

- `repo_toolbox`;
- artifact/document tools;
- visual/media inspection;
- generic file reads/writes;
- planning/workflow artifacts whose operation does not require source control.

## 2. Route Git capability only through explicit RepositoryCheckout identity

The existing `RepositoryCheckout` abstraction becomes the sole model-facing Git capability boundary.

For Git operations, the tool path must be:

```text
workspaceId
+ exact repositoryCheckoutId
→ registered RepositoryCheckout
→ validated concrete checkout root
→ bounded Git operation
```

It must no longer be:

```text
workspaceId
→ inspect workspace root for .git
→ infer Git capability
→ operate at workspace root
```

Required behavior:

- `git_toolbox.list_repository_checkouts` remains available from a generic workspace;
- every action that actually reads or mutates Git requires an exact registered `repositoryCheckoutId`;
- no implicit fallback to the workspace root;
- no "there is only one checkout, so guess it" behavior;
- an absent checkout produces a bounded typed error such as `REPOSITORY_CHECKOUT_REQUIRED` / existing equivalent;
- the resolved checkout root is validated before every Git operation;
- Git operations use the checkout root, not `AgentHarnessWorkspaceContext.root`, as their filesystem authority.

Refactor the tool registry and action-access checks accordingly.

Actions that need Project-level managed topology may resolve the Project root from the owning workspace plus the exact registered checkout association. They still must not infer Git authority from the generic workspace root.

## 3. Support Git-backed conventional folders explicitly, not implicitly

A conventional Git-backed folder may still be exposed to model Git tools before ChampCity conversion, but only through an application/source-control-owned checkout registration.

Do not make the workspace registry detect this automatically as a side effect of registration.

Add or extend an explicit checkout contract suitable for a conventional/external working copy. The exact type design is implementation-owned, but it must satisfy these semantics:

- identifies the repository and concrete working-copy root;
- is explicitly registered under the generic workspace;
- is removable without unregistering the workspace;
- does not imply managed Main/Dev topology;
- can be retired before Existing Project Git normalization;
- cannot be confused with managed Main/Dev/Workflow checkout identity.

If extending `RepositoryCheckoutRole`, a bounded role such as `conventional` / `external` is acceptable when its semantics remain explicit and do not leak into managed SourceLine behavior.

If a cleaner adjacent checkout-access contract is preferable, use it instead.

Do not fake a conventional checkout as `main` or `dev`.

## 4. Non-Git workspaces are a permanent supported state

Permanent product behavior must include a workspace with zero RepositoryCheckouts.

For such a workspace:

- model file/artifact access works normally;
- diagnostics report the workspace available;
- `list_repository_checkouts` returns an empty collection;
- Git inspection/mutation actions fail cleanly because no checkout was supplied/registered;
- no Git initialization is performed merely to make MCP happy;
- no warning or repair flow attempts to "fix" the absence of Git.

This is not a temporary migration state. It is a normal supported workspace class.

## 5. Conversion retires checkout Git authority, not workspace access

Remove the Repair04 concept of a broad "workspace conversion fence."

Existing Project Git adoption should not need to block the model from the entire workspace merely because Git authority is changing.

Instead, before Git-authority mutation:

1. identify the exact conventional RepositoryCheckout, when one is registered;
2. stop accepting new Git operations for that checkout;
3. wait for already-running repository operations using that checkout to drain within a bounded timeout;
4. retire/unregister that checkout identity;
5. leave the generic workspace itself registered and available for non-Git access;
6. perform application-owned conversion;
7. after successful managed topology creation, register exact Main and Dev RepositoryCheckouts;
8. Git tooling thereafter targets those managed checkout identities.

If no conventional RepositoryCheckout was ever exposed to the MCP, conversion has nothing model-facing to retire.

The application/source-control service may continue using its own bounded internal Git operations during conversion. Those operations are not MCP workspace Git authority.

Unrelated workspaces and unrelated RepositoryCheckouts must continue normally.

## 6. Repository-operation draining is checkout-scoped

Add one narrow operation-lifecycle boundary around RepositoryCheckout use.

The system must know when a registered checkout is:

- available;
- retiring;
- retired.

A retiring checkout:

- rejects new Git/test/release operations that require that checkout;
- permits already-started operations to finish or be boundedly cancelled according to existing operation semantics;
- cannot be resolved for new work after retirement begins.

Conversion must not move that checkout's underlying Git authority until active operations for that exact checkout have drained.

Do not:

- stop the Agent Harness service;
- unregister the generic workspace;
- block file reads/writes unrelated to the retiring checkout;
- block another checkout merely because it belongs to the same workspace unless repository-level exclusivity actually requires it.

This is a repository-operation concern, not a generic workspace concern.

## 7. Introduce explicit conversion-owned resource state

Do not use path existence alone as ownership proof during rollback.

Track the resources created or successfully transferred by the current attempt, at minimum:

- whether pre-existing managed metadata was successfully relocated;
- whether the current attempt created a candidate managed repository;
- whether candidate metadata was installed at the final managed path;
- whether root conventional Git was successfully relocated;
- whether Main was created by the attempt;
- whether Dev was created by the attempt;
- which local-state relocations completed;
- which conventional checkout identity was retired;
- whether Main/Dev RepositoryCheckout registration began/completed.

Rollback may remove or move only resources proven to be owned by the current attempt.

If relocation of a pre-existing path fails before ownership transfer, rollback must leave that pre-existing path untouched.

## 8. Build the new managed bare repository in migration staging

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

A baseline/import failure must remain entirely inside attempt-owned recovery staging.

## 9. Perform managed metadata cutover as an explicit ownership transfer

After the staged candidate repository is complete and any exposed conventional RepositoryCheckout has been retired/drained:

1. inspect the final managed metadata path;
2. if pre-existing `.champcity/repository.git` exists, relocate it to the current migration recovery directory;
3. mark pre-existing metadata as relocated only after that relocation succeeds;
4. move the staged candidate repository into the final `.champcity/repository.git` path;
5. mark final managed metadata as attempt-owned only after that move succeeds.

On Windows, bounded retry is required for transient:

- `EPERM`;
- `EACCES`;
- `EBUSY`;
- `ENOTEMPTY`.

Retries must be short and bounded. Do not spin indefinitely.

If pre-existing metadata cannot be relocated after bounded retry:

- fail before root `.git` is moved;
- preserve the source snapshot;
- preserve the pre-existing metadata;
- record the primary failure;
- leave the conventional repository authoritative;
- re-enable/re-register the prior conventional checkout when it was retired and remains valid.

## 10. Root conventional Git cutover is a separate stage

Only after final managed metadata is installed and verified:

- relocate root `.git` into current migration recovery staging;
- record that ownership transfer immediately;
- create exact Main and Dev worktrees from the final managed repository;
- verify both worktrees and common-directory identity;
- continue Repair03 local-state relocation;
- perform final Project registration;
- register exact Main and Dev RepositoryCheckouts.

The root `.git` relocation must use the same bounded Windows mutation helper as managed metadata cutover.

If root `.git` cannot be relocated:

- roll final managed metadata back to staging/recovery;
- restore any pre-existing managed metadata if it had been relocated;
- leave root `.git` authoritative;
- restore/re-register the prior conventional checkout if still valid;
- journal the primary cutover failure.

Do not delete root Git as a fallback.

## 11. Rollback must never mask the primary failure

Refactor the normalization catch path.

The first normalization exception is the **primary failure**.

Every rollback action must be independently guarded.

Rollback may collect bounded cleanup/recovery diagnostics, but a cleanup exception must never replace the primary failure.

Required behavior:

```text
primary normalization failure
→ attempt bounded rollback steps
→ restore prior RepositoryCheckout exposure when valid
→ record cleanup warnings
→ write failed journal state
→ surface primary failure + bounded cleanup summary
```

The failed journal must be written even when one or more cleanup steps cannot complete.

Do not leave `stage: "normalizing"` merely because rollback cleanup encountered EPERM.

The UI error must identify the primary phase first.

## 12. Windows-safe cleanup of attempt-owned metadata

For conversion-owned directories, add one bounded helper for rename/remove operations.

It must:

- retry transient Windows sharing/permission failures;
- never recurse through unrelated paths;
- operate only on paths proven to belong to the current migration attempt;
- return a bounded cleanup result rather than throwing through the entire rollback;
- preserve any path that cannot be safely removed after the retry budget.

If an attempt-owned candidate cannot be removed, leave it under migration recovery evidence and journal that fact.

Do not partially delete a path and then represent rollback as complete.

## 13. Recover the current known failed normalization state

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
- treat only journal/migration paths provably belonging to the failed conversion as recoverable residue;
- retire or relocate the empty attempt-owned final metadata residue safely;
- do not reuse the old source snapshot as current source;
- create a fresh inspected plan from current source;
- if a conventional checkout is exposed, retire/drain it through the checkout lifecycle;
- proceed through the new Repair04 cutover.

Do not add generic compatibility for arbitrary historical ChampCity formats.

This is recovery of the current migration contract's own interrupted attempt.

## 14. Keep journal state truthful

Before each authority-changing stage, the journal must contain enough current-attempt state to distinguish:

- source preserved;
- candidate repository prepared;
- conventional checkout retired, when applicable;
- managed metadata cutover;
- root Git relocated;
- managed worktrees created;
- Main/Dev checkout registration;
- verified;
- completed;
- failed.

The exact schema representation may be revised, but do not preserve obsolete historical variants merely for compatibility.

A failed journal must retain:

- the primary failure phase/reason;
- whether original root Git remains authoritative;
- bounded cleanup warnings;
- any attempt-owned recovery paths intentionally retained;
- whether the prior conventional RepositoryCheckout was restored.

A completion receipt is still written only after final managed topology and registration succeed.

## 15. Preserve accepted Repair02 and Repair03 behavior

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

1. a generic non-Git workspace registers and remains fully usable by non-Git tools;
2. a non-Git workspace reports zero RepositoryCheckouts and no Git capability is inferred from workspace registration;
3. Git actions without an exact registered RepositoryCheckout fail with a bounded typed error;
4. a conventional Git folder can receive an explicit conventional/external RepositoryCheckout without changing generic workspace semantics;
5. Git actions operate against the exact registered checkout root rather than the generic workspace root;
6. retiring a conventional checkout blocks new Git operations for that checkout but leaves generic workspace file access available;
7. checkout retirement drains already-running operations before Git authority is moved;
8. unrelated workspaces and unrelated checkouts remain usable during conversion;
9. candidate managed repository is built under migration staging, not the final managed metadata path;
10. baseline/import failure before cutover leaves final managed metadata untouched;
11. pre-existing managed metadata relocation failure does not delete or modify that pre-existing metadata;
12. transient Windows EPERM/EACCES during attempt-owned rename/remove is retried within a bounded budget;
13. exhausted cleanup retry records a cleanup warning without masking the primary failure;
14. primary failure is persisted in the journal even when rollback cleanup fails;
15. root conventional Git remains authoritative after any failure before root-Git ownership transfer;
16. root `.git` relocation failure restores/retains prior authority and restores the prior conventional checkout when valid;
17. Main/Dev are created only after final managed metadata cutover;
18. successful conversion registers exact Main and Dev RepositoryCheckouts and does not make the Project root itself a Git checkout;
19. the current known `normalizing` + empty managed-metadata residue state is recoverable without manual deletion;
20. Repair03 large ignored-tree/junction proof remains passing;
21. Repair02 generated integration policy remains loadable from the successful baseline;
22. successful conversion reopens as managed-ready and idempotent.

## Validation

Run focused validation only:

- production build;
- Existing Project managed-source/adoption owner;
- Agent Harness workspace registration/access tests proving Git-neutral workspace behavior;
- RepositoryCheckout registration/resolution tests;
- `git_toolbox` routing tests proving exact checkout targeting;
- repository-operation lifecycle tests for checkout retirement/draining;
- Repair03 Windows junction/ignored-tree proof;
- Repair02 integration-policy baseline proof;
- Current Project entry tests affected by registration sequencing;
- capability-map integrity when ownership changes;
- migration validation-plan preview;
- `git diff --check`.

Do not use broad unrelated regression as the completion gate.

The Windows EPERM retry/rollback proof must run in the normal Windows lane.

## Report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Reports/EPGA-R04-01_IMPLEMENTER_REPORT.md`

The report must state:

- Git-neutral generic workspace behavior;
- explicit RepositoryCheckout Git routing;
- conventional checkout registration/retirement behavior;
- checkout-scoped operation draining;
- staged candidate-repository mechanics;
- explicit resource-ownership tracking;
- primary-failure preservation behavior;
- Windows bounded retry behavior;
- current failed-state recovery result;
- Repair02/Repair03 regression evidence;
- focused validation results.

## Checkpoint and STOP

Commit:

`EPGA-R04-01 decouple workspace Git authority and make cutover failure-safe`

Then STOP for Architect review.

Do not retry the real ChampCity_AI UI conversion until Repair04 is reviewed and accepted.
