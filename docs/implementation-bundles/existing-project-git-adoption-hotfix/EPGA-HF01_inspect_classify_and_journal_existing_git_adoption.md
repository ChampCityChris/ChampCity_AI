# EPGA-HF01 — Inspect, Classify, and Journal Existing Git Adoption

**Parent:** Existing Project Git Adoption Hotfix  
**Starting baseline:** `ac936965242d0c95acb91ffc1062cf5c7a3f8b66`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Create one source-control-owned inspection boundary that can classify any selected Existing Project before mutation and produce a deterministic adoption plan.

This card must remove the current duplicated landing preflight logic from `main.ts` and replace it with one reusable adoption inspection service.

Do not perform the actual migration in this card beyond non-mutating inspection and migration-journal primitives.

## 1. Add one typed adoption inspection model

Add provider-neutral/shared contracts equivalent to:

```ts
type ExistingProjectGitAdoptionState =
  | "source-neutral"
  | "managed-ready"
  | "conventional-auto"
  | "migration-consent-required"
  | "resumable-partial"
  | "manual-intervention-required";

interface ExistingProjectGitAdoptionPlan {
  planId: string;
  state: ExistingProjectGitAdoptionState;
  repositoryId: string | null;
  currentBranch: string | null;
  currentRevision: string | null;
  mainRevision: string | null;
  devRevision: string | null;
  baselineSourceRef: string | null;
  activeBranchAction: "none" | "already-contained" | "fast-forward-dev" | "merge-into-dev" | "manual";
  workingState: {
    stagedCount: number;
    unstagedCount: number;
    untrackedCount: number;
    ignoredCount: number;
    captureSnapshotRequired: boolean;
  };
  topology: {
    conventionalGit: boolean;
    managedMetadata: boolean;
    mainCheckout: boolean;
    devCheckout: boolean;
    recoveryStaging: boolean;
  };
  preservedRefCount: number;
  preservedRemoteCount: number;
  requiresConsent: boolean;
  warnings: string[];
  manualReason: string | null;
}
```

The exact field names may vary, but the semantic information above must be represented.

No renderer-computed Git state.

## 2. Add non-mutating repository inspection

Create a single service equivalent to:

`inspectExistingProjectGitAdoption(projectRoot, repositoryId)`

It must inspect without mutating:

- root `.git` ownership/type;
- managed metadata path;
- Main/Dev paths;
- migration recovery staging/journal;
- current branch/HEAD;
- local refs;
- remote refs/tags;
- remotes;
- Git operation/lock state;
- worktree inventory;
- main/dev existence;
- default branch when resolvable;
- staged/unstaged/non-ignored-untracked/ignored working state.

Use bounded Git operations.

Do not scan arbitrary filesystem locations outside the selected Project.

## 3. Classify source-neutral

If there is:

- no root Git repository;
- no managed repository metadata;
- no managed Main/Dev topology;

return `source-neutral`.

Do not create placeholder Repository identity.

## 4. Classify managed-ready

If:

- root `.git` is absent;
- managed repository metadata is a valid bare repository;
- Main and Dev are exact managed worktrees of that repository;

return `managed-ready`.

The later apply path should only re-register checkouts.

## 5. Classify conventional repositories

For a valid conventional root repository with no managed residue:

### conventional-auto

Use when migration does not require a semantic source-line choice.

Examples:

- main exists and current work is main/dev;
- dev can be created exactly from main;
- active branch is already reachable from dev;
- no working-state snapshot is required.

### migration-consent-required

Use when migration changes baseline/integration semantics.

Examples:

- main must be created from another branch/ref;
- active non-main/dev branch contains commits not represented by dev;
- current working changes must be captured into the adoption baseline.

Do not reject merely because current branch is not main/dev.

## 6. Baseline derivation

If main exists:

- use exact main revision.

If main is absent:

1. inspect provider/default branch reference;
2. otherwise use current attached branch HEAD;
3. never silently choose detached HEAD;
4. plan creation of main at that exact revision;
5. mark consent required.

Preserve the original branch ref.

If dev is absent:

- plan creation at main unless the active branch integration step will advance it.

## 7. Active branch classification

If current attached branch is neither main nor dev:

- preserve it;
- determine whether its HEAD is already reachable from dev;
- if reachable: activeBranchAction = already-contained;
- if dev can move by fast-forward to include it: plan fast-forward-dev;
- otherwise plan merge-into-dev;
- semantic dev advancement requires consent.

Do not inspect unrelated branches as mandatory merge candidates.

All other refs remain preserved history.

## 8. Working-state inventory

Record counts and bounded path digests for:

- staged changes;
- unstaged tracked changes;
- non-ignored untracked;
- ignored.

Do not expose file content to the renderer.

If non-ignored working state exists:

- mark captureSnapshotRequired;
- consent required.

Ignored files do not become migration snapshot content.

## 9. Partial managed topology classification

Do not reject mixed state generically.

Recognize recoverable patterns such as:

- copied managed metadata + root conventional Git;
- metadata valid + Main exists + Dev missing;
- metadata valid + Dev exists + Main missing;
- complete managed worktrees + root original Git metadata still present;
- known recovery-staging path exists;
- active migration journal identifies the same repository and stage.

Return `resumable-partial` only when exact repository identity/state can be proven.

If conventional and managed copies disagree on refs/object identity or reserved paths contain unrelated user data, return `manual-intervention-required`.

## 10. Genuine manual-intervention cases

Fail classification to manual state for:

- redirected/symlinked Git metadata;
- active Git lock/operation that makes migration unsafe;
- detached HEAD with no deterministic baseline;
- submodules/external object alternates not supported by the adoption transaction;
- external linked worktrees that would be invalidated by moving common metadata;
- conflicting Main/Dev user paths;
- divergent managed/conventional repository identity;
- malformed Git metadata.

Do not mutate.

Return a precise reason.

## 11. Add deterministic plan digest

`planId` must bind the inspected source state.

At minimum digest:

- current branch/HEAD;
- main/dev refs;
- complete refs/remotes digest;
- worktree inventory digest;
- working-state inventory digest;
- managed-topology state;
- migration-journal state.

Apply in HF02 must reject a stale plan.

## 12. Add migration journal contract/helpers

Create application-owned journal storage under:

`.champcity/migrations/existing-project-git-adoption-v1.json`

Journal is source-control recovery state, not Workflow/SPS authority.

Provide bounded helpers to:

- create atomically;
- load/validate;
- advance stage atomically;
- mark complete;
- reject foreign/stale repository identity.

Do not begin migration mutations in HF01.

## 13. Remove duplicated entry rejection

Refactor `project:registerCurrent` so it no longer contains its own boolean topology admission rule.

Do not yet make it apply the migration.

Existing Project registration should be callable only after source adoption returns source-neutral or managed-ready in the final HF03 flow.

## Permanent proof

Prove:

1. non-Git directory → source-neutral;
2. complete managed topology → managed-ready;
3. clean conventional main/dev → conventional-auto;
4. current feature branch ahead/diverged → migration-consent-required, not rejection;
5. missing main derives deterministic baseline and requires consent;
6. missing dev plans exact creation;
7. dirty/staged/untracked state is inventoried without mutation;
8. all refs/tags/remotes contribute to digest but are not merge candidates by default;
9. recoverable partial topology → resumable-partial;
10. conflicting partial topology → manual-intervention-required;
11. extra linked worktrees/submodules/alternates → precise manual state;
12. detached ambiguous HEAD → manual state;
13. inspection changes no Git refs/files/checkouts;
14. planId changes when branch/ref/working state changes;
15. journal validation rejects foreign/stale state;
16. main.ts no longer independently rejects partial topology.

## Validation

Run:

- build;
- managed-project-source inspection tests;
- Current Project entry focused tests;
- source topology safety tests;
- migration-journal tests;
- capability-map integrity;
- migration-profile validation-plan preview;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Reports/EPGA-HF01_IMPLEMENTER_REPORT.md`

Commit:

`EPGA-HF01 inspect and classify existing Git adoption`

Then proceed to EPGA-HF02.
