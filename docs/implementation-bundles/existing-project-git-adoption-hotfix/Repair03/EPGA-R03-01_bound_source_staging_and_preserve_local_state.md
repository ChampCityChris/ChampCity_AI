# EPGA-R03-01 — Bound Source Staging and Preserve Local State

**Parent:** Existing Project Git Adoption Hotfix / Repair03  
**Starting implementation baseline:** `2a897f96f60ef8d16606ade4c2b1dfb45fddde5a`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Repair the real-project conversion failure demonstrated when converting the current ChampCity_AI repository through **Accept and Convert**.

The conversion currently fails during pre-normalization source preservation with:

```text
Source preservation staging failed before Git normalization:
ENOTDIR: not a directory, opendir
```

The repair must make source preservation follow Git/source semantics rather than recursively copying every non-reserved filesystem entry in the selected Project root.

This is one bounded Existing Project conversion repair. It does not reopen Repair02 policy design and does not expand into WRB04/WRB05 work.

## Architect RCA

The failure is in `existingProjectGitAdoptionService.ts`.

Current `copySourceContents()` performs a recursive `fs.cpSync(... recursive: true)` for every root entry except:

- `.git`;
- `.champcity`;
- `Main`;
- `Dev`.

That means the pre-normalization source snapshot traverses Git-ignored/local-only state even though the canonical baseline later excludes ignored content from Git history.

For the current ChampCity_AI working tree, ignored classes include dependency trees, build outputs, logs, environment files, editor state, temporary output, and other local artifacts. A real ignored/generated tree can contain Windows filesystem shapes such as links, junctions, reparse points, generated indirections, or transient file/directory states that a recursive copy cannot safely enumerate. The production failure is therefore a source-staging traversal defect, not a Git-history defect.

The current fixture only proves preservation of a simple ignored file (`local.log`). It does not model a real Windows ignored directory tree or a non-traversable local entry.

The exact offending ignored path is not exposed by the current error wrapper. Do not special-case a guessed package, directory name, or ChampCity_AI identity.

## 1. Source snapshot must represent source, not the entire working directory

Replace raw recursive root copying as the normal readable-Git source-preservation path.

The authoritative preservation snapshot must contain the current source state that can become the canonical baseline:

- tracked files at their current working-tree bytes, including dirty tracked files;
- non-ignored untracked files;
- ordinary source metadata;
- no root Git administration;
- no Project-container `.champcity` runtime state;
- no managed `Main` / `Dev` paths;
- the newly generated repository-owned integration policy from Repair02 at the existing provisioning boundary.

Do not traverse ignored dependency/build/cache trees merely to build the canonical source snapshot.

For readable Git, derive a bounded source manifest from Git source semantics rather than from blind filesystem recursion. An implementation may use bounded Git inventory commands already permitted by the source-control service, but it must not execute repository code.

The source snapshot must remain byte-preserving for included working-tree files. Do not route source bytes through clean/smudge filters or any repository executable.

## 2. Keep ignored/local state outside canonical source

Repair01 intentionally required ignored local working state to survive conversion without becoming committed source.

Keep that product behavior, but separate it from canonical source preservation.

Ignored/local state must:

- remain uncommitted;
- not participate in baseline tree construction;
- not be recursively traversed as canonical source;
- survive successful conversion locally;
- remain recoverable if conversion fails after local-state relocation begins.

Do not copy `node_modules`, build output, cache trees, or similar ignored directories into the source snapshot simply because they exist.

The preferred mechanic is bounded relocation of ignored/local entries after canonical source has been preserved and managed checkouts have been proven, rather than deep recursive duplication of ignored trees.

For an ignored directory that can be identified as one local-state root, preserve/relocate that entry as an entry. Do not enumerate its internal dependency graph merely to preserve it.

Nested ignored files/directories inside otherwise source-bearing directories must be preserved without converting them into committed source.

A successful conversion may leave local ignored state in the managed Dev working checkout, consistent with the existing Repair01 contract. It must not remain as authoritative Project-root source.

## 3. Safe handling of links and Windows filesystem indirections

Source/local-state handling must be non-following by default.

For symbolic links, junctions, and other filesystem indirections:

- use `lstat`-style classification;
- do not recursively follow a link target during preservation;
- preserve the entry itself when it belongs to source/local state;
- never follow a link outside the selected Project root as part of source conversion;
- do not turn an ignored reparse-point tree into an admission blocker when its entry can be preserved/relocated safely.

Do not add a new Git-topology/manual-intervention taxonomy.

If an actual source-bearing ordinary file cannot be read or preserved, fail closed before Git normalization with a bounded relative-path diagnostic.

## 4. Readable-Git and unreadable-Git behavior

### Readable Git

Use Git-derived source classification to avoid scanning ignored trees.

The resulting canonical baseline semantics remain:

- tracked current bytes;
- staged/unstaged tracked changes normalized to current working bytes;
- non-ignored untracked source;
- generated current integration policy;
- ignored local state excluded from the commit.

### Partly/unreadable Git

Repair01 still requires conversion when Project source can be read even if old Git administration is partly or fully unreadable.

The fallback path must therefore use a safe non-following filesystem walk/copy implementation rather than the current blind recursive `fs.cpSync` root traversal.

The fallback must:

- exclude reserved application/Git paths;
- never recurse through symlinks/junctions/reparse-point entries;
- preserve ordinary source bytes;
- avoid importing Project-container `.champcity` runtime state;
- continue to generate the current managed-repository policy under Repair02 semantics.

Do not weaken the accepted unreadable-Git conversion behavior solely to avoid this bug.

## 5. Pre-normalization staging failure must not leave active residue

The demonstrated failure occurs after creating:

`.champcity/migrations/existing-project-normalization-<uuid>/`

but before a conversion journal is written.

Current code does not remove that partial migration directory on the source-staging catch path.

Repair this.

If source preservation fails before Git normalization begins:

- remove the conversion-owned partial staging directory that was created by that attempt;
- leave the original root `.git`, source, refs, remotes, Main/Dev absence, and Project authority unchanged;
- do not leave `recoveryStaging=true` solely because a pre-normalization copy attempt failed;
- a fresh inspection of an otherwise unchanged Project must produce the same product classification and a usable fresh plan.

Do not delete unrelated pre-existing migration evidence.

## 6. Failure diagnostics

Improve the preservation failure message enough to identify the failing **relative Project path or preservation phase** without exposing machine-specific absolute paths in durable reports.

A future real-project failure should distinguish at least:

- canonical source manifest/materialization failure;
- local-state preservation/relocation failure;
- generated policy materialization failure.

Keep the UI error bounded. Do not dump full local paths, directory trees, secrets, or ignored-file contents.

## 7. Preserve Repair02 policy semantics

Do not change the accepted managed-repository integration-policy contract.

Existing Project conversion still must:

- ignore incoming Project-container `.champcity` state as source;
- generate a fresh current managed-repository integration policy;
- force-track only the generated repository-owned policy under source `.champcity`;
- choose integration-gate only by current validation-profile capability;
- otherwise generate source-integrity;
- not fabricate project-specific Integration Repair scope;
- not regenerate policy on managed reopen.

## 8. Real ChampCity_AI conversion target

The current ChampCity_AI repository is the real qualification target after focused proof passes.

Its ignored tree is intentionally realistic and may include dependency/build/local development state.

After implementation and Architect review, the UI conversion must be retried.

Expected result:

```text
conventional ChampCity_AI source
→ bounded source manifest/materialization
→ ignored/local state kept outside canonical source
→ current integration policy generated
→ canonical baseline
→ main = baseline
→ dev = baseline
→ local ignored state preserved without being committed
→ managed Main/Dev topology verified
→ Current Project registered
→ Workflow Hub
```

No direct real-project conversion is part of the Implementer card. Stop for Architect review first.

## Permanent proof

At minimum prove:

1. a readable conventional Git repository with a large ignored directory does not recursively import that directory into the canonical source snapshot;
2. ignored local files survive conversion without entering the baseline commit;
3. an ignored directory containing a Windows junction/symlink/reparse-style entry does not cause canonical source staging to traverse/fail on the target;
4. a tracked symbolic-link/source entry is preserved as an entry without following an external target;
5. dirty tracked bytes remain in the canonical baseline;
6. non-ignored untracked source remains in the canonical baseline;
7. ignored files remain absent from the baseline tree;
8. the current Repair02 generated integration policy remains present/loadable at the baseline;
9. incoming Project-container `.champcity` runtime state remains excluded;
10. source-staging failure before normalization removes only that attempt's partial migration directory;
11. after such a failed attempt, root Git/source authority is unchanged and reinspection is not poisoned by stale recovery staging;
12. partially unreadable Git still falls back to safe source preservation without recursive link following;
13. fully unreadable/foreign Git still converts when ordinary source can be safely preserved;
14. successful conversion still yields exact managed Main/Dev common-repository topology;
15. managed reopen remains idempotent.

## Validation

Run focused validation only:

- production build;
- `test/source-control/managed-project-source.test.cjs`;
- source-topology/path-contract tests needed for link/junction behavior;
- Current Project entry tests only if entry behavior changes;
- integration-policy/provider test needed to prove Repair02 baseline policy remains loadable;
- capability-map integrity if ownership changes;
- migration validation-plan preview;
- `git diff --check`.

Do not use broad unrelated regression as the completion gate.

The Implementer report must record normal-Windows evidence for the ignored-directory/link fixture. A restricted runner that cannot create the required Windows filesystem shape is not sufficient evidence by itself.

## Report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair03/Reports/EPGA-R03-01_IMPLEMENTER_REPORT.md`

The report must state:

- the new source-manifest/materialization rule;
- how ignored/local state is preserved without canonical-source traversal;
- Windows link/reparse handling;
- pre-normalization residue cleanup behavior;
- Repair02 policy regression proof;
- focused validation results.

## Checkpoint and STOP

Commit:

`EPGA-R03-01 bound source staging and preserve local state`

Then STOP for Architect review.

Do not retry the real ChampCity_AI UI conversion until this Repair03 implementation is reviewed and accepted.
