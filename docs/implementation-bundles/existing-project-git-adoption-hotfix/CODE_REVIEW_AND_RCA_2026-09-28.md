# Existing Project Git Adoption Hotfix — Code Review and RCA

**Date:** 2026-09-28  
**Starting repository baseline:** `ac936965242d0c95acb91ffc1062cf5c7a3f8b66`  
**Scope:** Existing Project entry and Git-backed repository adoption into ChampCity managed source topology  
**Disposition:** HOTFIX REQUIRED

## Executive finding

`Open Existing Project` currently behaves as a topology admission test instead of a repository migration operation.

That is architecturally wrong for a desktop product that must open arbitrary existing Git-backed projects and then own their source-control mechanics.

Current code supports only two Git-backed states:

1. a conventional root Git repository with no ChampCity-managed source artifacts;
2. a fully complete ChampCity-managed repository with no root `.git`.

Any mixed or partially migrated state is rejected before Project registration and before the migration service is allowed to inspect/reconcile it.

The resulting failure is visible on the landing page:

`Existing Project has an incomplete managed source topology; no Current Project identity was changed.`

This is not merely an error-message defect.

The product lacks a complete **Existing Git Repository → ChampCity Managed Repository** migration state machine.

## Intended product behavior

`Open Existing Project` means:

```text
select existing project directory
→ inspect repository/source state
→ build deterministic adoption plan
→ automatically perform non-semantic safe migration
→ request Operator consent only when baseline/branch normalization changes source semantics
→ migrate/reconcile into ChampCity topology
→ register Current Project
→ open Workflow Hub
```

ChampCity owns the destination topology:

```text
<Project>/
  Main/
  Dev/
  .champcity/
    repository.git/
    checkouts/
```

The existing repository does **not** need to conform to that layout before it can be opened.

## Adopted source-line policy

### main

`main` is the stable/release baseline.

If a valid local `main` already exists, preserve it exactly.

If `main` does not exist:

1. prefer the repository's declared/default branch when it can be resolved deterministically;
2. otherwise use the current attached branch HEAD;
3. create `main` at that exact revision without deleting or renaming the original branch;
4. require Operator migration consent because ChampCity is choosing the stable baseline.

Do not rewrite existing commit history merely to manufacture `main`.

### dev

`dev` is the default integration target for existing Projects.

If `dev` exists, preserve it.

If it does not exist, create it at `main`.

### other branches

All local/remote branch refs and tags are preserved in the managed Repository.

They are **not automatically merged into main**.

Merging every branch into main would:

- violate the stable/release-line role of main;
- unnecessarily combine stale/experimental branches;
- create avoidable semantic conflicts;
- make repository migration decide product history that the Operator never requested.

### currently active branch

The currently checked-out branch is special because it represents the user's active source state.

If it is neither `main` nor `dev`:

- preserve the branch ref;
- determine whether its HEAD is already reachable from current/proposed `dev`;
- if already represented, no merge is required;
- if it contains committed work not represented by `dev`, the adoption plan proposes integrating the active branch into `dev`;
- this integration requires the migration warning and explicit Accept;
- Cancel leaves the repository untouched so the user may merge manually and retry.

When the histories diverge, migration uses an isolated candidate/normal Git merge.

It must never use a conflict strategy that silently discards one side.

A merge conflict returns manual-intervention-required and leaves the original repository authoritative.

## Uncommitted working state

A user must not have to clean the repository merely to open it.

Inspection records:

- staged tracked changes;
- unstaged tracked changes;
- non-ignored untracked files;
- ignored files;
- current branch/HEAD.

Migration must preserve source bytes.

When working changes cannot be represented by the selected main/dev revision without changing semantics, the warning must state exactly what will happen.

For the bounded hotfix:

- existing committed history remains untouched;
- non-ignored current working changes may be captured into one machine-owned **adoption snapshot** on the migration candidate only after explicit Accept;
- ignored files remain local/untracked and are not forced into Git history;
- staged-vs-unstaged index intent may be normalized by the adoption snapshot, but no source bytes may be lost;
- the warning explicitly tells the user that Accept will capture current non-ignored working changes into the ChampCity adoption baseline;
- Cancel permits manual commit/merge/cleanup before retry.

No working content is silently stashed, reset, cleaned, discarded, or omitted from the migration plan.

## Code review findings

### CRITICAL — landing entry rejects recoverable migration states before migration service runs

`src/main/main.ts` currently preflights:

- root `.git`;
- `.champcity/repository.git`;
- `Main`;
- `Dev`.

If any managed component exists and the entire managed topology is not complete, or conventional Git coexists with managed components, entry throws immediately.

This duplicates repository-state classification outside Repository/Source-Control Management and converts recoverable migration states into fatal admission errors.

The landing handler must delegate classification to one migration/adoption service.

### CRITICAL — migration service recognizes only conventional-only or managed-complete

`establishManagedProjectSource()` currently:

- adopts only when root `.git` exists and **none** of the managed paths exist;
- reopens only when root `.git` is absent and the managed repository/Main/Dev are all complete;
- rejects every mixed/partial state.

That means the service cannot resume its own interrupted migration.

### CRITICAL — current branch is restricted to main or dev

Conventional adoption fails when the active branch is any other branch or detached HEAD.

This is a destination-topology assumption incorrectly applied as an admission rule.

Existing repositories commonly open on feature/hotfix/release branches.

ChampCity must inspect and normalize that state rather than require the user to switch branches before the application can open.

Detached HEAD remains a special case requiring explicit baseline selection/inspection.

### HIGH — no non-mutating adoption inspection/plan exists

The current service combines inspection and mutation.

The product cannot tell the Operator:

- what repository state was detected;
- what main/dev will become;
- whether active work needs integration;
- what dirty working changes exist;
- whether migration is automatic or requires consent;
- what exactly Accept will change.

A warning/Accept/Cancel experience requires a typed inspection plan before mutation.

### HIGH — no TOCTOU protection between inspection and acceptance

Once a migration plan is displayed, repository state may change.

Apply must prove the current:

- refs;
- HEAD/current branch;
- working-tree inventory;
- managed-topology state;

still match the inspected plan.

Otherwise it must reject the stale plan and request refresh.

### CRITICAL — no durable interrupted-migration journal

The current conventional adoption has good in-process rollback, but filesystem/Git migration spans multiple non-atomic operations:

- copy repository metadata;
- configure bare common repository;
- create managed worktrees;
- move project files;
- move original Git metadata;
- verify;
- delete recovery metadata.

A process crash can occur between any of those steps.

The next launch then sees mixed topology and currently rejects it.

A durable application-owned migration journal is required so ChampCity can resume or roll back its own incomplete transaction.

### HIGH — existing managed-residue recovery is unnecessarily coarse

Recoverable examples include:

- managed repository metadata copied but Main/Dev not yet created;
- Main created but Dev missing;
- both managed checkouts valid but original root `.git` not yet retired;
- original Git metadata already moved into ChampCity recovery staging;
- SPS registration failed after source adoption completed.

These must be distinguished from genuine conflicts.

### HIGH — tests codify rejection instead of migration

`current-project-entry.test.cjs` currently groups `invalid managed topology` with malformed/redirected Git candidates and asserts rejection.

That is too broad.

Tests must distinguish:

- **recoverable partial topology created by ChampCity migration**;
- **conflicting/ambiguous user or foreign topology**.

The first is migration input.

The second fails closed.

### HIGH — no real landing-path migration qualification

Existing tests exercise service/harness entry with synthetic clean states.

They do not prove:

```text
launch/landing
→ Open Existing Project
→ migration warning when required
→ Accept
→ source adoption
→ Current Project registration
→ Workflow Hub
→ close/reopen
→ idempotent managed reopen
```

This gap allowed the application to remain unusable at the first screen while downstream Workflow code accumulated substantial qualification.

## Existing mechanics to preserve

The current managed-source service already has valuable, correct mechanics:

- copies the complete Git metadata/object database;
- preserves refs/tags/remotes;
- creates the managed bare/common repository;
- creates exact Main/Dev worktrees;
- preserves dirty tracked and untracked file bytes when current branch is main/dev;
- verifies managed checkout common-directory identity;
- restores source where safe on in-process failure;
- re-registers exact Main/Dev RepositoryCheckout identities;
- Project registration occurs after source establishment so failed source migration does not fabricate a Current Project source binding;
- fully managed reopen is idempotent.

The hotfix extends these mechanics; it does not replace them.

## Migration classification

One source-control service owns classification.

Required states:

### source-neutral

No conventional Git and no managed Git topology.

Result: register Current Project without Repository identity.

### managed-ready

No root conventional Git; managed repository/Main/Dev validate exactly.

Result: register checkouts and open Project.

### conventional-auto

Conventional Git is valid and can be mapped to main/dev without a semantic branch choice.

Examples:

- current main with valid main/dev;
- current dev with valid main/dev;
- missing dev that can be created exactly from main;
- clean active branch already reachable from dev and no baseline choice required.

Result: migrate automatically.

### migration-consent-required

Migration is mechanically safe but changes baseline/integration semantics.

Examples:

- main must be created from another default/current branch;
- active non-main/dev branch contains committed work not in dev;
- non-ignored working changes will be captured into an adoption snapshot;
- dev will advance through an adoption integration candidate.

Result: return typed plan to landing page; no mutation yet.

### resumable-partial

Filesystem/Git state matches a known ChampCity migration journal or can be proven to be an exact partial result of the same Repository.

Result: resume/rollback automatically to one complete state before Project registration.

If resumption will also perform a consent-required branch normalization, surface that plan before semantic target advancement.

### manual-intervention-required

Automatic migration cannot prove a unique safe result.

Examples:

- managed repository and conventional repository have divergent/ref-conflicting identities;
- reserved Main/Dev paths contain unrelated user content;
- redirected Git metadata;
- unresolved Git operation/lock;
- external object alternates/submodule topology not supported by the migration transaction;
- multiple external linked worktrees that would be invalidated by moving common metadata;
- merge conflict in the proposed active-branch → dev migration candidate;
- detached HEAD with no deterministic baseline choice.

Result: mutate nothing further, provide exact diagnostic, Cancel/manual repair/retry.

## Migration journal

Use application-owned runtime state under a bounded path such as:

`.champcity/migrations/existing-project-git-adoption-v1.json`

It is not Workflow or Project authority.

Minimum contents:

- schema version;
- migration ID;
- repository ID;
- inspected state digest;
- source Git metadata fingerprint;
- original current branch/HEAD;
- original refs/remotes digest;
- main/dev plan;
- active branch integration plan;
- working-state inventory digest;
- current migration stage;
- resources created/moved by ChampCity;
- recovery staging identity.

Write atomically before the first mutation and after every irreversible stage.

On completion:

- verify managed topology;
- verify refs/remotes/history preservation;
- verify working-source preservation/adoption result;
- mark completed or remove the active journal after writing a bounded receipt.

Do not persist absolute user paths in durable documentation.

## Migration warning UX

The warning appears **only** when source normalization requires Operator consent.

It is not a routine Git approval gate.

Show:

- repository/current branch;
- main baseline action;
- dev action;
- active branch action;
- dirty/staged/untracked summary;
- whether current working changes will be captured in an adoption snapshot;
- preserved refs/remotes/history statement;
- exact branches that will be integrated;
- conflict/manual fallback statement.

Actions:

### Accept Migration

Revalidate plan digest, then run the application-owned migration transaction.

### Cancel

Perform no migration mutation.

Return to landing page.

The user may manually commit/merge/normalize the repository and choose Open Existing Project again.

There is no third “open without migration” path for a Git-backed Project because that would create two incompatible source-control models inside one Current Project.

## Why not merge every branch into main

The Operator suggestion correctly identifies the need for a deterministic baseline and explicit warning before branch normalization.

The default implementation should not literally merge every branch into main.

All branch refs are already preserved by copying the Repository.

Only the active source state must be reconciled into the ChampCity baseline/integration model.

The default automatic/consented target is `dev`, because adopted architecture defines:

- `main` = stable/release;
- `dev` = existing-project integration target.

Merging arbitrary feature/history branches into main would violate that model.

A future explicit repository-consolidation tool could merge selected branches if desired; it is not required to open an existing Project.

## Root Cause Analysis

### Primary root cause — destination invariants became admission prerequisites

The source topology was designed correctly as a ChampCity-managed destination.

WRB01 then used those destination invariants to decide whether an existing repository was allowed to enter the application.

This inverted migration responsibility.

### Secondary root cause — failure prevention replaced migration recovery

The implementation concentrated on proving that it would not mutate an ambiguous repository.

That is necessary, but the easiest implementation was to reject every partial/mixed state.

Recoverable interrupted states were never modeled separately.

### Secondary root cause — test fixtures represented pristine states, not long-lived projects

Qualification focused on:

- clean conventional repositories;
- complete managed repositories;
- deliberately malformed fixtures.

It did not model a real project that had lived through previous ChampCity versions or an interrupted adoption.

### Secondary root cause — no entry-level dogfood acceptance

The bundle did not require Electron/product proof that the actual application could:

- launch;
- open its own existing repository;
- migrate it;
- reach the Hub;
- close/reopen.

Downstream architecture was therefore able to pass while the first user action remained broken.

## Hotfix disposition

Release a three-card Existing Project Git Adoption hotfix.

1. **EPGA-HF01 — Inspect, Classify, and Journal Existing Git Adoption**
2. **EPGA-HF02 — Apply/Resume Managed Topology and Baseline Normalization**
3. **EPGA-HF03 — Landing Migration Consent and End-to-End Qualification**

The cards are sequential.

This hotfix is source-control/application infrastructure.

It must not add Workflow, Architect, Tester, Validator, or Operator product-governance authority beyond the explicit migration consent described above.
