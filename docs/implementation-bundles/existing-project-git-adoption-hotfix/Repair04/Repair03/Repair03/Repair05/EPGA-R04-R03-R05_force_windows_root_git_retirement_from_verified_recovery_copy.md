# EPGA-R04-R03-R05 — Replace Root .git Rename with Verified Recovery Copy and Forced Windows Retirement

**Parent:** Existing Project Git Adoption Hotfix / Repair04 / Repair03 / Repair03  
**Current baseline:** `ec0d21787d9adb8b9fdc90cf319a88570fed97ad`  
**Failed real qualification migration:** `a880d2a5-4efb-4c0d-807e-2535334e7ac2`  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** **ACTIVE — REAL QUALIFICATION BLOCKED**

## Objective

Fix the actual Windows filesystem cutover failure now exposed by the real ChampCity_AI qualification attempt.

Do not redesign Git architecture, Agent Harness, MCP, checkout projection, Project admission, or the machine source-operation fence.

The defect is narrow:

> Existing Project conversion currently depends on renaming the live root `.git` directory into the migration folder with `fs.renameSync()`. On the real Windows Project this repeatedly returns `EPERM`.

The replacement transaction is:

```text
preserve source
-> prepare candidate managed repository
-> create and verify recovery copy of root .git
-> suspend ChampCity-owned workspace filesystem watchers
-> force-remove root .git on Windows
-> verify root .git is gone
-> create/verify Main + Dev
-> resume watchers
```

If retirement fails after any partial deletion, restore root `.git` from the verified recovery copy and verify conventional Git authority before returning failure.

This is deterministic machine code. No Agent Harness, MCP, or LLM is involved in the cutover decision.

---

## Real failure evidence

The failed real journal is:

`.champcity/migrations/existing-project-git-adoption-v1.json`

with:

- migration ID: `a880d2a5-4efb-4c0d-807e-2535334e7ac2`;
- stage: `failed`;
- failure phase: `root conventional Git cutover`;
- baseline revision: `a156bf41df4385f13702f22e9dbd0c1378e701cc`;
- imported refs: 13;
- baseline parents: 3;
- `originalRootGitAuthoritative: true`;
- no cleanup warnings;
- retained candidate metadata at `rolled-back-candidate-repository.git`.

The exact failing operation was:

```text
rename <Project>/.git
   -> <Project>/.champcity/migrations/<attempt>/legacy-git-entry
EPERM: operation not permitted
```

The current helper retries the same `fs.renameSync()` five times over only about 250 ms.

Do not add more rename retries as the primary fix.

---

# 1. Stop using rename as both cutover and rollback

Current code:

```ts
const moved = await boundedRename(path.join(root, ".git"), legacyGit);
```

must no longer be the root conventional Git retirement strategy on Windows.

The migration already has a dedicated recovery location:

`<migrationRoot>/legacy-git-entry`

Use it as a **verified recovery copy**, not as the result of renaming the live root Git directory.

Required order:

1. copy root `.git` to `legacy-git-entry`;
2. verify the recovery copy;
3. only then retire the live root `.git`;
4. verify the live root `.git` is absent;
5. continue managed worktree creation.

Do not delete or mutate the original `.git` until recovery verification succeeds.

---

# 2. Create a verified recovery copy of conventional Git metadata

On Windows, copy the exact root `.git` tree into:

`<migrationRoot>/legacy-git-entry`

The implementation may use PowerShell `Copy-Item -Recurse -Force` or a bounded Node filesystem copy, but the resulting recovery copy must be verified before retirement.

If PowerShell is used, invoke it with:

- `powershell.exe`;
- `-NoProfile`;
- `-NonInteractive`;
- `-ExecutionPolicy Bypass`;
- `-ErrorAction Stop` inside the fixed script;
- `shell: false`;
- paths passed as arguments, not interpolated into a command string.

Do not use elevation / `RunAs`.

## Minimum recovery verification

Before root `.git` may be retired, prove the copied metadata is usable and represents the same repository.

At minimum compare:

- `HEAD` resolved revision;
- full `refs/heads`, `refs/remotes`, and `refs/tags` inventory and object IDs;
- local Git configuration sufficient to preserve remotes/upstreams;
- object readability for the canonical baseline parents / imported branch tips.

A bounded `git fsck` against the recovery metadata is acceptable if it fits the existing command budget.

If recovery verification fails:

- abort before deleting root `.git`;
- leave conventional Git authoritative;
- record failure as a recovery-copy preparation failure.

---

# 3. Suspend ChampCity-owned filesystem watchers during physical cutover

The selected Project currently has a long-lived `fs.watch()` through:

`src/main/workspaceEvidence/selectedWorkspaceEvidenceNotifier.ts`

ChampCity should not leave its own filesystem watchers active while physically removing the Project's root Git metadata.

Add a narrow pause/resume capability that:

- closes active root/domain watcher handles;
- does **not** clear Current Project identity;
- does **not** change workspace selection;
- does **not** increment or invalidate the active evidence generation merely because conversion is occurring;
- can resume watching the same selected Project after cutover;
- resumes in `finally`.

The Existing Project application coordinator should:

```text
acquire exclusive machine source fence
-> pause selected-workspace evidence watchers
-> run source conversion
-> resume evidence watchers
-> release exclusive machine source fence
```

or equivalently keep the exclusive fence around the same bounded interval.

Do not move watcher logic into Source Control.

Source Control remains unaware of renderer/workspace-notifier infrastructure.

---

# 4. Force-remove the root .git directory on Windows

After the recovery copy is verified, retire the original root `.git` with a direct PowerShell filesystem command equivalent to:

```powershell
Remove-Item -LiteralPath <root\.git> -Recurse -Force -ErrorAction Stop
```

Use a constant script with the target path passed as an argument.

Do not interpolate the Project path into executable PowerShell text.

Do not use a shell wrapper.

Do not use Agent Harness, MCP, Git toolbox, or model execution.

## Bounded retry

One forced removal attempt should normally be enough.

A short bounded retry for transient Windows sharing errors is acceptable, but:

- total retry budget should be measured in seconds, not 250 ms;
- do not loop indefinitely;
- preserve the last bounded PowerShell/OS diagnostic;
- verify `.git` absence after each reported success.

Recommended budget: approximately 2–5 seconds total.

If Windows still refuses the delete after the bounded budget, fail with a precise root-Git-retirement error.

---

# 5. Treat partial Remove-Item failure as destructive and restore from recovery

`Remove-Item -Recurse -Force` can fail after deleting some children.

Therefore the transaction must not assume:

```text
command failed => original .git is untouched
```

Track that retirement was attempted once forced deletion begins.

If the removal command fails or post-removal verification finds any root `.git` residue:

1. remove/quarantine any partial root `.git` residue using the same bounded Windows filesystem primitive;
2. restore `.git` from the verified `legacy-git-entry` recovery copy;
3. verify conventional Git authority;
4. only then return failure.

The rollback must prove at minimum:

- `git rev-parse HEAD` matches the pre-cutover revision;
- expected branch/ref inventory is restored;
- root `.git` is authoritative;
- no Main/Dev topology is accepted as successfully managed.

If exact restore cannot be verified, surface that as a cleanup warning while preserving the original retirement failure as the primary error.

---

# 6. Keep successful recovery evidence

On successful managed conversion, retain the verified legacy Git recovery copy inside the migration attempt directory.

Do not immediately delete it as part of this repair.

The conversion receipt/journal may record its relative path as retained recovery evidence.

A later cleanup/retention policy can remove historical migration recovery artifacts separately.

Do not expand this card into retention-policy design.

---

# 7. Preserve current candidate metadata and rollback behavior

Do not regress the existing candidate repository transaction.

Preserve:

- source snapshot staging;
- fresh managed integration policy generation;
- candidate bare repository creation;
- 13-ref/history import behavior;
- canonical baseline construction;
- managed metadata installation;
- Main/Dev relocation/recovery behavior;
- local-state relocation;
- schema-3 journaling;
- primary-error preservation;
- retained recovery paths.

Only replace the physical root `.git` cutover/restore strategy.

---

# 8. Preserve the machine source-operation fence and model-access architecture

Do not modify the accepted authority model:

```text
Source Control owns Git
neutral machine source fence serializes source topology
Agent Harness/MCP obeys the fence as a downstream consumer
```

No Agent Harness call is permitted before or during deterministic root Git retirement.

Do not restore:

- checkout retirement as Git authority;
- private `list-repository-checkouts` control;
- model-driven Git orchestration.

---

# 9. Windows production owner — real forced retirement

Add a Windows-focused integration owner using an actual temporary conventional Git repository.

The proof must use the real retirement helper, not monkey-patch `fs.renameSync`.

Required sequence:

1. create a real conventional Git repo;
2. include branches/refs/remotes representative of the conversion fixture;
3. create/verify legacy Git recovery copy;
4. force-remove the live root `.git`;
5. verify root `.git` is gone;
6. verify recovery metadata resolves the same HEAD/refs/config;
7. complete managed conversion;
8. verify Main/Dev and managed bare metadata.

This test should exercise the same PowerShell command path used in production on Windows.

---

# 10. Windows production owner — watcher active

Add a focused application-level proof with the selected-workspace evidence notifier active.

Required sequence:

```text
select conventional Project
-> evidence watcher active
-> accept conversion
-> watcher pauses
-> root .git forced retirement succeeds
-> managed topology completes
-> watcher resumes
```

Prove:

- Current Project/workspace selection is not lost;
- evidence generation remains coherent;
- no stale watcher remains attached to the retired topology.

Do not fake success by disabling the watcher feature for the entire application.

---

# 11. Forced-removal failure and exact restore proof

Add a deterministic failure owner for partial retirement.

It may use an injected bounded process runner around the Windows retirement helper.

Simulate:

1. recovery copy succeeds and verifies;
2. retirement begins;
3. command reports failure after partial root `.git` destruction;
4. rollback restores from recovery;
5. root conventional Git passes exact verification;
6. migration journal records failure phase `root conventional Git cutover`;
7. `originalRootGitAuthoritative === true`;
8. no accepted Main/Dev topology remains.

Do not rely only on monkey-patching `fs.renameSync`; rename is no longer the production mechanism being qualified.

---

# 12. Persistent Windows lock behavior

If forced removal still fails after the bounded retry budget:

- error text must clearly identify root conventional Git retirement;
- preserve the bounded PowerShell/OS failure detail;
- do not claim conversion succeeded;
- rollback/restore conventional Git from recovery;
- leave the Project retryable without manual cleanup.

Do not ask the Operator to manually delete `.git` as the normal resolution path.

---

# 13. Existing migration residue remains retryable

The current real failed journal must remain retryable.

Do not require the Operator to manually delete:

- the failed journal;
- prior migration directories;
- `rolled-back-candidate-repository.git`;
- any previous recovery evidence.

A new conversion attempt must create a new migration attempt and operate from the still-authoritative root conventional Git state.

---

# Permanent acceptance proof

At minimum prove:

1. root `.git` retirement no longer uses `fs.renameSync()` on Windows;
2. a verified recovery copy exists before live root Git deletion;
3. production Windows path uses forced `Remove-Item -LiteralPath ... -Recurse -Force -ErrorAction Stop`;
4. Project paths are passed as arguments, not interpolated shell text;
5. selected-workspace watchers are paused/resumed around physical cutover;
6. actual Windows conventional fixture converts successfully;
7. partial forced-removal failure restores exact conventional Git from recovery;
8. persistent removal failure leaves root conventional Git authoritative and retryable;
9. source snapshot/history/ref preservation still passes;
10. Main/Dev managed topology verification still passes;
11. schema-3 journal/receipt semantics remain correct;
12. Agent Harness/MCP architecture remains unchanged;
13. current real failed state remains inspectable/retryable;
14. `git diff --check` passes.

---

# Validation

Run focused validation only:

- production typecheck/build;
- Existing Project managed-source owner;
- new Windows root-Git retirement owner;
- selected-workspace evidence notifier owner;
- Current Project entry/product coordinator owner;
- source-control boundary/import guard;
- existing source-preservation/history owner;
- machine source-fence owner;
- capability-map integrity if touched;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad/full regression suite.

Do not retry the real ChampCity_AI conversion during implementation.

---

# Implementer report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair03/Repair03/Repair05/Reports/EPGA-R04-R03-R05_IMPLEMENTER_REPORT.md`

The report must state:

- exact old rename operation removed;
- recovery-copy mechanism;
- recovery verification performed;
- exact PowerShell retirement command shape;
- retry budget;
- watcher pause/resume design;
- partial-delete rollback behavior;
- real Windows focused proof results;
- confirmation that Agent Harness/MCP were not added to the cutover path.

---

# Checkpoint and STOP

Commit:

`EPGA-R04-R03-R05 force Windows root Git retirement from verified recovery copy`

Then STOP for Architect review.

Do not retry the real ChampCity_AI conversion until this Repair05 checkpoint is accepted.
