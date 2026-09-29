# EPGA-R01-01 — Force Normalize Existing Git into ChampCity Topology

**Parent:** Existing Project Git Adoption Hotfix / Repair01  
**Starting baseline:** `07ad7ccb88a0ea7878529235151870dbb0aeec74`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Replace the current conservative Existing Project Git classifier/application behavior with one deterministic normalization path.

After explicit conversion consent, ChampCity must take the selected Project's current source state and convert it into ChampCity's managed source topology regardless of ordinary Git topology irregularities.

Do not require the incoming repository to be "clean", on `main`/`dev`, single-worktree, non-detached, free of submodules, or otherwise shaped like ChampCity's destination topology.

## Product contract

For an Existing Project containing Git or legacy Git administrative state:

```text
inspect enough to identify Project source + best-effort Git evidence
→ return conversion-required
→ after consent:
    preserve Project source bytes
    preserve/archive old Git administration
    import readable history/refs where practical
    create canonical ChampCity baseline
    create canonical main + dev
    create managed Main/Dev checkouts
    retire root Git authority
→ managed-ready
```

The prior Git topology is import material, not ongoing product authority.

## 1. Replace manual-intervention admission taxonomy

For conventional/foreign Git state, remove `manual-intervention-required` as the normal result for:

- current branch other than main/dev;
- detached HEAD;
- missing main;
- missing dev;
- multiple linked worktrees;
- submodules;
- Git alternates;
- symlinks/indirections inside Git metadata that do not prevent reading Project source;
- active/stale foreign Git layout;
- partial old ChampCity migration residue;
- unreadable or partly malformed Git metadata.

These conditions may reduce how much Git history can be imported.

They do not prevent conversion when Project source bytes can still be preserved.

Keep hard failure only for conditions such as:

- selected Project source directory cannot be safely read;
- source preservation staging cannot be created;
- ChampCity managed repository cannot be written;
- filesystem move/copy failure leaves no provably recoverable source copy;
- destination topology contains unrelated user content that cannot be preserved or relocated safely.

## 2. Simplify inspection result

The product-facing inspection model should converge on:

- `source-neutral`
- `managed-ready`
- `conversion-required`
- `conversion-failed`

Do not expose a taxonomy of Git irregularities as admission states.

For `conversion-required`, return bounded warning facts only:

- prior Git detected;
- current source state will become the ChampCity baseline;
- prior branch/worktree layout may stop functioning;
- readable Git history/refs/remotes will be retained where practical;
- conversion may replace/relocate Git metadata;
- source files are preserved before normalization.

The renderer does not need a Git repair plan.

## 3. Preserve Project source before Git normalization

Before mutating Git administration:

- identify the actual Project source root selected by the Operator;
- create an application-owned recovery/staging area under `.champcity/migrations/`;
- preserve the source tree required to reconstruct the Project;
- exclude the root Git administrative entry itself from the source snapshot;
- do not delete source bytes until the managed destination is verified.

Preserve ignored/untracked working files as working files even when they are not committed into the canonical baseline.

Do not require a clean index or working tree.

## 4. Best-effort readable Git import

Attempt to read and preserve, where available:

- object database/history;
- local branch refs;
- remote refs;
- tags;
- remotes/config useful for later diagnostics/interoperability.

Failure to read one class of Git metadata must not automatically abort conversion.

If the original repository metadata is usable enough to copy/import:

- seed `.champcity/repository.git` from it;
- retain readable refs/tags/remotes;
- continue with canonical baseline creation.

If the old Git metadata is not usable:

- archive/relocate it where filesystem access permits;
- initialize a fresh managed bare Repository;
- continue from the Project source snapshot.

## 5. Canonical baseline commit

The new ChampCity baseline represents the Project as it exists at conversion time.

Create one exact baseline tree from the current Project source:

- tracked source;
- staged/unstaged tracked content;
- non-ignored untracked source content;
- ordinary project metadata/files;
- exclude Git administrative paths;
- respect ignored files for commit content while preserving their bytes locally.

### When readable branch history exists

Collect unique readable local branch tip commits.

Create the canonical baseline commit with:

- the current Project source tree;
- readable unique local branch tips as parents where bounded/practical.

This is an intentional synthetic normalization merge.

It preserves branch histories as ancestors without attempting file-level conflict resolution among historical branch trees.

Do not perform ordinary merges of each branch and do not let conflicts block normalization.

If parent count exceeds a reasonable bounded implementation limit:

- preserve all refs in the repository;
- use a bounded subset of distinct tips for baseline ancestry;
- report this only as migration evidence, not a blocker.

### When no readable commit history exists

Create a normal root baseline commit from the current Project source tree.

## 6. Force canonical main and dev

After baseline creation:

- force/update `refs/heads/main` to the new canonical baseline;
- force/update `refs/heads/dev` to the same baseline;
- preserve other readable branch refs under their existing names where possible;
- do not require their old relationship to main/dev to remain meaningful.

This is the normalization operation covered by the warning.

From this point onward:

- `main` = stable baseline;
- `dev` = integration line;
- ChampCity owns future Workflow SourceLines/checkouts.

## 7. Managed topology conversion

Produce:

```text
<Project>/
  Main/
  Dev/
  .champcity/
    repository.git/
    checkouts/
    migrations/
```

Requirements:

- Project root itself is not a Git checkout after conversion;
- `Main` is exact worktree/checkout of canonical main;
- `Dev` is exact worktree/checkout of canonical dev;
- both share `.champcity/repository.git`;
- exact RepositoryCheckout descriptors register successfully;
- Project source is present in the appropriate managed checkout;
- ignored/local working files are preserved without becoming mandatory committed source.

## 8. Legacy Git backup and interrupted conversion recovery

Retain one bounded migration backup/receipt sufficient to recover from an interrupted conversion.

The backup may include relocated old Git administration and source staging.

After successful managed verification:

- do not restore old root Git authority;
- mark conversion complete;
- retain or retire migration backup according to existing migration-retention policy, but never before source/topology verification.

A subsequent Open Existing Project must classify the Project as `managed-ready`.

## 9. Remove old conservative blockers

Delete/supersede code whose only purpose is to refuse conversion because Git is unusual.

In particular review and remove the current behavior around:

- recursive `.git` symlink rejection as a generic admission blocker;
- exact-root-owned-`.git` prerequisite;
- extra linked-worktree rejection;
- detached-HEAD rejection;
- submodule/alternate rejection;
- current branch main/dev restriction;
- "malformed or could not be inspected" catch-all routing to manual intervention.

Keep filesystem containment and source-preservation checks.

## 10. No new governance

This conversion is application-owned source-control mechanics after one explicit Operator consent.

Do not create:

- Workflow records;
- WorkItems;
- Architect approval;
- Validator/Tester work;
- multiple Git approval prompts;
- per-branch decisions.

## Permanent proof

At minimum prove:

1. current ChampCity_AI-style repo on dev converts successfully;
2. repo on arbitrary feature branch converts successfully;
3. detached HEAD converts successfully;
4. repo with no main converts successfully;
5. repo with no dev converts successfully;
6. repo with multiple local branches produces one canonical baseline and preserves readable history/refs;
7. divergent branches do not create merge-conflict blockers;
8. repo with extra linked worktree metadata still converts the selected Project;
9. repo with submodule/alternate metadata does not fail admission solely for that reason;
10. dirty tracked state is preserved in baseline tree;
11. non-ignored untracked source is preserved in baseline tree;
12. ignored local files survive conversion without being forced into baseline commit;
13. partially unreadable Git metadata falls back to fresh managed history while preserving Project source;
14. fully unreadable/foreign Git administration does not block if source tree is readable;
15. source-preservation failure aborts before destructive conversion;
16. successful conversion yields exact managed Main/Dev checkouts;
17. repeated reopen is managed-ready and idempotent;
18. no root `.git` remains authoritative after success.

## Validation

Run only focused validation:

- build;
- managed-project-source/adoption tests;
- source-preservation/recovery tests;
- Current Project entry tests affected by classification;
- topology/common-directory tests;
- capability-map integrity;
- migration validation-plan preview;
- `git diff --check`.

Do not use unrelated broad regression as the completion gate.

## Report/checkpoint

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair01/Reports/EPGA-R01-01_IMPLEMENTER_REPORT.md`

Commit:

`EPGA-R01-01 force normalize existing Git into ChampCity topology`

Then proceed directly to EPGA-R01-02.
