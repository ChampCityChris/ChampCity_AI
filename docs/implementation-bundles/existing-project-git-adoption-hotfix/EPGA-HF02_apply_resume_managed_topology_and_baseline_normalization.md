# EPGA-HF02 — Apply/Resume Managed Topology and Baseline Normalization

**Parent:** Existing Project Git Adoption Hotfix  
**Depends on:** EPGA-HF01 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Apply a previously inspected Existing Project adoption plan and deterministically converge the selected Git-backed repository into ChampCity's managed source topology.

This card owns mutation/recovery only.

It does not own landing-page UX.

## 1. Add one apply operation keyed by planId

Create an application/source-control operation equivalent to:

`applyExistingProjectGitAdoption(projectRoot, planId, consent)`

Preflight must:

- rerun HF01 inspection;
- require exact planId match;
- reject if repository/ref/working/topology state changed;
- require explicit consent when `requiresConsent = true`;
- reject apply for manual-intervention-required.

No mutation before the revalidation succeeds.

## 2. Preserve repository history and identity

Before target topology mutation, capture/verify:

- complete local/remote refs;
- tags;
- remote configuration;
- current HEAD;
- current branch;
- working-state inventory.

Destination managed repository must preserve the same repository object history and refs except for the explicitly planned additions/advancements of:

- main;
- dev;
- the bounded adoption snapshot/integration refs.

Do not delete arbitrary existing branches.

Do not rewrite existing commit objects.

## 3. Establish main baseline

If main exists:

- preserve its exact current revision.

If main is missing and the accepted plan selected a deterministic source ref:

- create main at that exact commit;
- preserve the source branch/ref;
- record this as a migration-created ref.

This is a ref creation, not a history rewrite.

## 4. Establish dev integration target

If dev exists:

- preserve it as the initial migration integration target.

If dev is absent:

- create it at the exact main baseline revision.

If the accepted plan requires active branch integration:

- use the current/proposed dev revision as the merge target;
- never merge active work directly into main by default.

## 5. Capture accepted working-state snapshot when required

If the accepted plan says `captureSnapshotRequired`:

- preserve all source bytes;
- create a bounded machine-owned adoption snapshot representing:
  - tracked staged/unstaged changes;
  - non-ignored untracked files;
- do not force ignored files into Git history;
- leave ignored local files preserved locally after topology conversion;
- clearly identify the snapshot as ChampCity migration evidence.

The snapshot must be created only after Operator consent.

The migration may normalize staged-vs-unstaged index state, but must not lose file content.

Do not include files excluded by normal Git ignore rules unless they were already tracked.

## 6. Integrate active branch into dev when required

If active branch work is already represented by dev:

- no merge.

If dev can be fast-forwarded to the active migration source:

- perform the exact fast-forward after consent when consent was required.

If histories diverge:

- create an isolated migration candidate;
- perform a normal merge of dev + active migration source;
- no conflict-discarding strategy;
- validate merge parents and changed state;
- on success, advance dev to the exact migration candidate.

If merge conflicts:

- abort candidate;
- preserve original repository/managed migration evidence;
- return manual-intervention-required;
- do not partially advance dev/main.

Do not merge unrelated non-active branches.

## 7. Convert repository into managed topology

Reuse/refactor the current adoption mechanics:

- copy/establish the common repository at `.champcity/repository.git`;
- create exact Main worktree on main;
- create exact Dev worktree on dev;
- move/preserve Project source into the correct managed checkout during conventional conversion;
- retire root conventional `.git` only after managed repository/checkouts are proven;
- register exact Main/Dev RepositoryCheckout descriptors.

The Project root ends non-Git.

## 8. Resume known partial migrations

Use the HF01 journal/classification.

For each known migration stage:

- verify all resources already created by ChampCity;
- continue from the last proven stage or safely roll back to a prior stage;
- never overwrite unrelated user content;
- never treat mere path presence as proof of ChampCity ownership.

Required recoverable scenarios include:

1. managed metadata created, no managed checkout yet;
2. one managed checkout created, second missing;
3. both managed checkouts created, root source not fully moved;
4. root Git metadata moved to recovery staging but final verification incomplete;
5. source migration complete but Project registration not yet performed.

## 9. Migration journal semantics

Before first mutation:

- create active journal.

Advance journal after every migration stage.

On successful managed-topology verification:

- record final refs/remotes digest;
- record final main/dev revisions;
- mark complete;
- write a bounded completion receipt.

On recoverable failure:

- journal remains active with precise stage/reason.

On safely rolled-back failure:

- mark rolled-back and leave original repository authoritative.

## 10. Registration boundary

Source migration completes **before** Current Project source Repository registration.

After successful adoption:

- caller may register Current Project with canonical Repository identity.

If later SPS registration fails:

- reopening must classify the already completed managed topology as managed-ready;
- registration retry must not remigrate/rewrite Git.

Preserve existing retry-after-SPS-failure behavior.

## 11. Automatic vs consented migration

Automatic apply is allowed only for non-semantic topology conversion:

- complete managed reopen;
- conventional main/dev mapping with no branch integration/baseline choice/working snapshot;
- exact resumable partial stages whose prior consent/plan remains valid.

Consent is mandatory when:

- creating main from another source ref;
- advancing dev to include active divergent branch work;
- capturing current non-ignored working changes into migration source history.

Do not turn routine migration mechanics into repeated approval steps.

## 12. Manual fallback

Return a typed manual state without destructive mutation when:

- active integration conflicts;
- additional external linked worktrees would be invalidated;
- submodule/alternate topology is unsupported;
- repository identity is divergent/ambiguous;
- reserved Main/Dev paths contain unrelated content;
- journal/resource identity cannot be proven.

The user can Cancel, repair Git manually, and retry Open Existing Project.

## Permanent proof

Prove at minimum:

1. conventional main repo migrates and preserves refs/remotes/history;
2. conventional dev-current repo migrates and preserves work;
3. main missing → accepted plan creates main without deleting original branch;
4. dev missing → creates dev at main;
5. active feature branch already in dev → no merge;
6. active feature branch fast-forwardable → dev advances exactly;
7. active feature branch diverged → clean merge candidate advances dev;
8. merge conflict → manual state, no target advancement;
9. accepted dirty tracked/non-ignored untracked work is preserved in adoption snapshot;
10. ignored files remain uncommitted/preserved;
11. Cancel/stale plan means zero migration mutation;
12. partial metadata-only migration resumes;
13. one-checkout partial migration resumes;
14. root Git recovery-staging partial resumes/rolls back safely;
15. completed managed topology reopens idempotently;
16. refs/remotes digest matches expected preserved state plus explicit main/dev additions;
17. no unrelated branch is merged into main/dev;
18. Project root has no `.git` after successful adoption;
19. Main/Dev exact common-directory verification passes;
20. SPS registration failure after adoption does not require remigration.

## Non-scope

Do not implement:

- Workflow creation;
- Work Intake routing;
- feature/issue UI;
- arbitrary branch consolidation;
- agent-assisted merge conflicts;
- external linked-worktree takeover;
- submodule migration.

## Validation

Run:

- build;
- managed-project-source migration tests;
- partial migration recovery tests;
- branch normalization tests;
- working-state preservation tests;
- Current Project registration retry tests;
- source topology/common-directory tests;
- capability-map integrity;
- migration-profile validation-plan preview;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Reports/EPGA-HF02_IMPLEMENTER_REPORT.md`

Commit:

`EPGA-HF02 apply and resume existing Git adoption`

Then proceed to EPGA-HF03.
