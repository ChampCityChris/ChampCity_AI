# EPGA Repair04 / Repair03 / Repair05 Architect Review — 2026-09-30

**Implementation checkpoint:** `831d0a116d97d402433964c8128105571e002947`  
**Parent:** `16428cfcd7cc95908f15d897fb1b7e12c3c3ab49`  
**Disposition:** **ACCEPTED — REAL CHAMPCITY_AI QUALIFICATION RETRY AUTHORIZED**

## Review result

Repair05 correctly replaces the failing Windows root-`.git` rename transaction.

The prior production operation:

```ts
fs.renameSync(<Project>/.git, <migration>/legacy-git-entry)
```

is no longer used for Windows root Git retirement.

The new transaction is:

```text
preserve source
-> prepare candidate managed repository
-> copy root .git to migration recovery
-> verify recovery authority
-> force-remove live root .git
-> verify absence
-> create/verify Main and Dev
-> retain recovery evidence
```

This is deterministic Source Control behavior and does not involve Agent Harness/MCP/model authority.

## Windows retirement path accepted

Architect inspection confirms the production Windows path invokes:

```text
powershell.exe
  -NoProfile
  -NonInteractive
  -ExecutionPolicy Bypass
  -Command <fixed script>
  <base64 path argument>
```

The fixed script decodes the path argument and executes:

```powershell
Remove-Item -LiteralPath $Target -Recurse -Force -ErrorAction Stop
```

The Project path is not interpolated into executable PowerShell source.

The process is spawned with `shell: false`, hidden-window semantics, bounded output, and a 4-second process deadline. No elevation is introduced.

## Recovery-copy verification accepted

Before the live root Git directory is retired, Repair05 copies it to the attempt-local `legacy-git-entry` and verifies:

- metadata-tree content digest;
- resolved HEAD where readable;
- heads/remotes/tags identities;
- local Git configuration;
- object readability for readable authority refs.

The live root `.git` is untouched if recovery preparation fails.

## Partial deletion rollback accepted

A failed forced removal is treated as potentially destructive.

Rollback:

1. verifies whether the remaining live root `.git` is still exact;
2. if not, force-removes partial residue;
3. copies the verified recovery metadata back;
4. verifies conventional Git authority;
5. records `originalRootGitAuthoritative` truthfully.

The original retirement error remains the primary failure and restoration problems become cleanup warnings.

## Watcher handling accepted

The application now pauses the selected-workspace evidence notifier while holding the exclusive machine source-operation lease and resumes it in `finally`.

Pause/resume:

- closes ChampCity-owned watcher handles;
- preserves selected root;
- preserves evidence generation;
- does not move watcher concerns into Source Control.

The machine source fence remains the authority for topology concurrency.

## Focused Windows evidence

The Implementer report records passing normal-Windows owners including:

- managed source: 19/19;
- Current Project/application path: 20/20;
- selected workspace evidence notifier: 3/3;
- Source Control boundary: 2/2;
- capability map: 5/5;
- fresh focused partial/persistent forced-removal proof: 2/2;
- production build: pass;
- `git diff --check`: pass.

The managed-source owner exercises the real PowerShell retirement path on a temporary conventional Git repository with a path containing spaces.

## Architecture verification

No Repair05 change introduces:

- Agent Harness/MCP authority over Git;
- private checkout-list control;
- model reasoning in Git orchestration;
- Source Control imports from Agent Harness implementation.

Previously accepted source fence, project admission, and model-access projection architecture remain intact.

## Qualification state

At final Architect review closeout, the live ChampCity_AI Git status is clean.

Repair05 is accepted and the real ChampCity_AI **Open Existing Project -> Accept and Convert** qualification retry is authorized.

Do not manually clean historical failed migration evidence before retry.
