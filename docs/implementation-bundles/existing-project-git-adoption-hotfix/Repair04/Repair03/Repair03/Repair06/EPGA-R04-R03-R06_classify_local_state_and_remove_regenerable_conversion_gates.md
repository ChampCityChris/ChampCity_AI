# EPGA-R04-R03-R06 — Classify Local State and Remove Regenerable Filesystem State from Conversion Authority

**Parent:** Existing Project Git Adoption Hotfix / Repair04 / Repair03 / Repair03  
**Current baseline:** `e345019bb6d1b4cdfdd30c06006a2a4ac8e958dd`  
**Failed real qualification migration:** `349232e8-fce9-4300-bbf2-8a19fca53d56`  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** **ACTIVE — REAL QUALIFICATION BLOCKED**

## Objective

Fix the remaining architectural defect in Existing Project conversion by separating canonical source, durable ignored/local state, and regenerable ignored state.

The current implementation treats every Git-ignored path as durable local state and attempts to relocate it into Dev with `fs.renameSync()`.

The real ChampCity_AI conversion now reaches managed worktree creation successfully and then fails on:

```text
local-state preservation/relocation failed at 'node_modules'
```

`node_modules` is not authoritative user state. Conversion must not depend on preserving or relocating reproducible dependencies, caches, build output, temporary output, or other known regenerable state.

This is a classification and transaction correction, not a `node_modules` special-case.

## Real failure evidence

The latest failed real migration journal records:

- migration ID: `349232e8-fce9-4300-bbf2-8a19fca53d56`;
- stage: `failed`;
- failure phase: `managed worktree creation`;
- failure reason: `local-state preservation/relocation failed at 'node_modules'.`;
- baseline revision: `89679526e9ffaed1774762e4ce03b037bd440765`;
- imported refs: 13;
- baseline parents: 3;
- `originalRootGitAuthoritative: true`;
- cleanup warnings: none;
- verified root Git recovery retained;
- failed Main/Dev and rolled-back candidate metadata retained.

Repair05 worked as intended. Repair06 addresses the next bad assumption in the transaction.

## 1. Replace the two-bucket inventory with three semantic classes

Current:

```ts
interface SourceInventory {
  sourcePaths: string[];
  localStatePaths: string[];
}
```

Replace with a shape equivalent to:

```ts
interface SourceInventory {
  sourcePaths: string[];
  durableLocalStatePaths: string[];
  regenerableStatePaths: string[];
}
```

The invariant is:

```text
Git ignored != automatically durable
```

Classification occurs only after Git has already identified the entry as ignored.

Do not classify a tracked or non-ignored untracked path as disposable merely because its name resembles a generated directory.

## 2. Canonical source semantics remain unchanged

Canonical source continues to include tracked current working bytes, staged/unstaged tracked changes normalized to current bytes, non-ignored untracked source, and the current generated ChampCity integration policy.

Canonical source continues to exclude root `.git`, root `.champcity`, pre-existing Main/Dev topology, and Git-ignored local state.

Do not alter the accepted baseline/history/ref semantics.

## 3. Define a narrow built-in regenerable-state classifier

A path may be classified as regenerable only when:

1. Git reports it ignored; and
2. it matches a bounded built-in generated/dependency/cache rule.

Initial conservative generated/dependency/cache roots should include at least:

```text
node_modules
dist
build
out
release
coverage
tmp
temp
.cache
.parcel-cache
.vite
.turbo
.next
.pytest_cache
.mypy_cache
.ruff_cache
__pycache__
```

Matching may apply to an ignored root whose basename is one of these values, including nested ignored roots.

Do not include broad ambiguous names such as `vendor`, `data`, `assets`, `archive`, `planning`, `issues`, `repair`, `work_cards`, `logs`, `.env`, or other environment files.

Unknown ignored paths default to **durable local state**.

## 4. Do not preserve regenerable state into Dev

Regenerable ignored state is not part of the canonical baseline, is not copied into the canonical snapshot, is not copied into durable-local recovery, is not relocated into Dev, and is not required for successful conversion.

For the real ChampCity_AI repository this means conversion must not attempt to move or copy `node_modules` into `Dev/node_modules`.

The same rule applies to other known generated roots such as `release` and `tmp` when Git-ignored.

## 5. Stage durable local state before destructive Git cutover

Do not continue using post-cutover rename as the first preservation action for durable ignored state.

Before root `.git` retirement, create a separate attempt-local durable-state recovery area, for example:

```text
<attempt>/local-state-snapshot/
```

Only `durableLocalStatePaths` go there.

Use non-following filesystem semantics. Ordinary files are copied byte-for-byte. Ordinary directories are copied recursively without following symlinks/junctions. Links preserve the entry itself. Never follow a target outside the selected Project. Execute no repository code.

The durable-state snapshot is separate from canonical source and must never participate in baseline construction.

If durable local state cannot be safely preserved, fail before root Git retirement.

Regenerable state must not cause this phase to fail.

## 6. Verify durable local-state preservation

Before destructive cutover, verify the durable-state snapshot against the original durable roots.

At minimum verify relative path identity, entry kind, ordinary file bytes, link target text, and directory tree membership.

A reusable non-following tree digest is acceptable.

Do not use volatile timestamps as authority unless the implementation already preserves them exactly.

## 7. Materialize durable local state into Dev after managed worktrees are proven

After Main/Dev worktrees and baseline revisions are verified:

```text
local-state-snapshot -> Dev
```

Materialize only durable local state.

Do not use `fs.renameSync(original, Dev)` as the preservation primitive.

Preferred behavior:

1. copy from verified attempt-local durable-state snapshot into Dev;
2. verify the Dev copy;
3. leave the attempt-local durable snapshot available as recovery evidence until conversion completes.

Durable state remains uncommitted.

## 8. Remove the current relocate/restore transaction

Retire or substantially replace:

```ts
relocateLocalState(...)
restoreRelocatedLocalState(...)
```

as the authority mechanism.

The current model of ignored path -> raw rename into Dev -> reverse rename on rollback must not remain the only preservation path.

## 9. Make root cleanup category-aware

Replace blind cleanup of every ordinary Project-root entry with a category-aware cleanup manifest.

### Canonical source originals

After source is proven in Dev, remove original canonical source files/links from the Project root. This cleanup remains authoritative.

Use bounded robust filesystem removal rather than assuming one raw rename/delete is sufficient.

### Durable local originals

After the durable copy is proven in Dev, remove original durable-local entries.

If an original durable entry cannot be removed but the exact Dev copy and attempt-local recovery are both verified:

- do not lose preserved state;
- record a bounded cleanup warning/residue entry;
- do not roll back a correct Git/source conversion solely because a duplicate non-authoritative local-state entry remains at the Project container root.

### Regenerable originals

Attempt bounded best-effort cleanup.

A locked or undeletable regenerable path must not fail source conversion.

Record bounded residue/warning information and continue.

Key invariant:

> Failure to delete `node_modules`, build output, cache state, or other known regenerable state is not a Git/source-authority failure.

## 10. Cleanup must work for mixed source directories

Do not fix only top-level ignored directories.

For a source-bearing tree such as:

```text
src/
  app.ts
  local-notes/
  .cache/
```

cleanup must remove authoritative old source without allowing a locked regenerable subtree to fail conversion.

Use the precomputed source/durable/regenerable manifest. Remove authoritative source paths and verified durable originals specifically, then prune empty directories. Regenerable residue may remain non-authoritative if bounded deletion fails.

Do not blindly recurse-delete a mixed source root and thereby make disposable cache state authoritative over conversion.

## 11. Residual root state is explicitly non-authoritative

Managed-ready authority continues to derive from absence of root conventional Git plus valid managed bare metadata, Main, and Dev.

If best-effort cleanup leaves regenerable or already-preserved durable residue at the Project container root:

- Source Control remains managed-ready;
- Main/Dev remain canonical;
- root residue is non-authoritative;
- journal/receipt records bounded cleanup warnings/residue;
- later cleanup may remove it idempotently.

Do not treat residual generated state as source.

## 12. Preserve sensitive durable local state without committing it

Ignored environment/configuration files are not regenerable by default.

Examples such as `.env`, `.env.local`, operator-specific config, unknown ignored files/directories, `planning/`, `issues/`, and `work_cards/` default to durable unless another explicit application contract says otherwise.

They must survive conversion, remain outside the baseline commit, be present in Dev when appropriate, and never have their bytes logged.

Do not inspect secret values.

## 13. Real ChampCity_AI inventory regression

Add a focused fixture modeled on the actual failing state with ignored:

```text
node_modules/
release/
tmp/
planning/
work_cards/
.env.local
```

Expected classification:

```text
node_modules -> regenerable
release      -> regenerable
tmp          -> regenerable
planning     -> durable
work_cards   -> durable
.env.local   -> durable
```

Prove regenerable paths do not enter baseline or Dev preservation; durable paths do not enter baseline but do appear in Dev; source remains canonical.

## 14. Locked node_modules must not block conversion

Add a Windows-focused owner for the exact real failure class.

Make `node_modules` a Git-ignored regenerable root and inject or create a condition where moving/deleting it would fail.

Prove:

- conversion does not attempt durable relocation for `node_modules`;
- managed Main/Dev conversion completes;
- root `.git` is retired;
- journal/receipt complete;
- undeletable `node_modules` residue is reported as non-authoritative cleanup residue rather than conversion failure.

Do not satisfy this with a one-off `if (path === "node_modules") continue` inside the old relocation loop. The three-class inventory must drive behavior.

## 15. Mixed source/durable/cache regression

Add a fixture:

```text
src/
  app.ts          canonical source
  local-notes/    ignored durable
  .cache/         ignored regenerable
```

Prove:

- `src/app.ts` is canonical;
- `src/local-notes` is preserved into Dev uncommitted;
- `src/.cache` is not preserved;
- locked cache cleanup cannot invalidate the conversion;
- any residue is non-authoritative.

## 16. Unknown ignored directory defaults durable

Add an ignored path such as:

```text
operator-scratch/
```

Prove it is preserved as durable local state and not committed.

Do not discard unknown ignored state.

## 17. Tracked generated-name regression

Add a tracked path such as:

```text
build/important-source.txt
```

It remains canonical source even though the basename matches the regenerable classifier.

Likewise, non-ignored untracked `build/` remains source under the existing inventory contract.

The regenerable classifier applies only to paths already identified as ignored.

## 18. Rollback proof after durable materialization

Add a failure after durable state has been copied into Dev but before conversion completion.

Prove:

- original conventional Git authority is restored;
- original durable root state remains available or is recoverable from attempt-local snapshot;
- no durable bytes are lost;
- regenerable state is not required for rollback;
- failed Main/Dev/candidate evidence remains bounded.

## 19. Successful receipt reports cleanup truthfully

Do not invent a new journal schema version unless required.

Use existing receipt/journal fields when possible.

On successful conversion:

- `stage = completed`;
- `originalRootGitAuthoritative = false`;
- retained recovery paths include required recovery evidence;
- `cleanupWarnings` may contain bounded non-authoritative residue warnings.

If a new residue field is materially cleaner, stop and report the schema implication before changing schema.

## 20. Preserve Repair05 and earlier accepted architecture

Do not regress verified root Git recovery, forced Windows root Git retirement, partial-delete exact restore, watcher pause/resume, neutral machine source fence, Source Control independence from Agent Harness/MCP, exact model-access topology reconciliation, canonical Existing Project admission, sidebar entry fixes, or schema-3 retryability.

No Agent Harness/MCP/model behavior belongs in this repair.

# Permanent acceptance proof

At minimum prove:

1. inventory has source / durable-local / regenerable classes;
2. classification occurs only after Git ignore semantics;
3. `node_modules` is regenerable, not durable;
4. tracked or non-ignored `build/` remains source;
5. unknown ignored state defaults durable;
6. durable local state is preserved before destructive cutover;
7. durable state materializes into Dev uncommitted;
8. regenerable state never enters baseline;
9. regenerable state never becomes required Dev local state;
10. locked regenerable state cannot fail a correct conversion;
11. nested mixed source/durable/cache directories convert correctly;
12. raw local-state `fs.renameSync()` is no longer the sole preservation transaction;
13. rollback preserves conventional Git and durable local bytes;
14. Repair05 forced root-Git retirement remains passing;
15. current failed real state remains retryable without manual cleanup;
16. `git diff --check` passes.

# Validation

Run focused validation only:

- production typecheck/build;
- Existing Project managed-source owner;
- local-state classification owner;
- Windows locked-regenerable-state owner;
- nested mixed-state owner;
- durable rollback owner;
- Repair05 root-Git retirement owner;
- Current Project entry owner;
- source-control boundary/import guard;
- capability-map integrity if touched;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad/full regression suite.

Do not retry the real ChampCity_AI conversion during implementation.

# Implementer report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair03/Repair03/Repair06/Reports/EPGA-R04-R03-R06_IMPLEMENTER_REPORT.md`

The report must explicitly state:

- the three inventory classes;
- exact built-in regenerable classifier;
- how unknown ignored state is preserved;
- how durable state is staged and verified;
- how durable state is materialized into Dev;
- how regenerable cleanup failure is made non-authoritative;
- whether `relocateLocalState/restoreRelocatedLocalState` were removed;
- Windows locked-`node_modules` proof;
- nested mixed-state proof;
- focused validation results.

# Checkpoint and STOP

Commit:

`EPGA-R04-R03-R06 classify local state and remove regenerable conversion gates`

Then STOP for Architect review.

Do not retry the real ChampCity_AI conversion until Repair06 is accepted.
