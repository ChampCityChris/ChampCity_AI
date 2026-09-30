# EPGA-R04-R03-R05 Implementer Report

## Scope and repository verification

- Approved repository root: verified as `<PROJECT_REPO>` before mutation.
- Card type and identifier: Repair Card `EPGA-R04-R03-R05`.
- Branch: `dev`.
- Remote status before checkpoint: `dev` tracked `origin/dev` and was ahead by 202 commits; `origin` fetch/push was configured. No fetch, pull, or push was performed.
- The active Repair Card baseline `ec0d21787d9adb8b9fdc90cf319a88570fed97ad` was verified as an ancestor of the starting `HEAD` (`16428cfcd7cc95908f15d897fb1b7e12c3c3ab49`), which released Repair05.

## Files changed

Modified:

- `src/main/sourceControl/existingProjectGitAdoptionService.ts`
- `src/main/workspaceEvidence/selectedWorkspaceEvidenceNotifier.ts`
- `src/main/main.ts`
- `test/source-control/managed-project-source.test.cjs`
- `test/workspace-evidence/selected-workspace-evidence-notifier.test.cjs`
- `test/project-state/current-project-entry.test.cjs`
- `validation/capability-map.json`

Created:

- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair03/Repair03/Repair05/Reports/EPGA-R04-R03-R05_IMPLEMENTER_REPORT.md`

Deleted: none.

Intentionally not created: no dependency, migration/schema revision, Agent Harness/MCP integration, new runtime package, compatibility path, JSON workflow sidecar, or recovery-retention policy.

## Implementation

### Root Git recovery and retirement

Removed this root cutover operation:

```ts
const moved = await boundedRename(path.join(root, ".git"), legacyGit);
```

The migration now copies the ordinary root `.git` directory to the attempt-local `legacy-git-entry` with bounded Node filesystem copy semantics before any live root Git deletion. It verifies:

- exact metadata-tree content digest;
- resolved `HEAD` when readable;
- the complete readable `refs/heads`, `refs/remotes`, and `refs/tags` inventory and object IDs;
- local Git configuration, including remotes/upstream configuration;
- object readability for readable `HEAD` and every readable imported ref tip.

Already-irregular legacy metadata remains convertible: when legacy Git itself cannot resolve a particular authority fact, the copied tree must preserve the same unavailable result and exact metadata bytes. Healthy conventional repositories receive all strong Git-level checks above. The successful migration journal and receipt retain the recovery-copy path.

On Windows the retirement command shape is:

```text
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command <fixed-script> <base64-encoded-target-argument>
```

The fixed script decodes the separately supplied UTF-8 path argument, sets `$ErrorActionPreference = 'Stop'`, and executes:

```powershell
Remove-Item -LiteralPath $Target -Recurse -Force -ErrorAction Stop
```

The project path is never interpolated into executable PowerShell text. The process uses `shell: false`, a hidden window, bounded stdout/stderr, and no elevation. The retirement budget is one forced attempt with a 4,000 ms process deadline. A reported failure is treated as potentially destructive rather than blindly repeated; rollback separately uses the same bounded forced-removal primitive only when partial residue must be cleared.

If retirement fails, rollback first accepts the live `.git` only when exact authority verification still passes. Otherwise it force-removes partial residue, copies the verified recovery tree back, and verifies exact conventional authority. Journal `originalRootGitAuthoritative` is true only when this final exact proof succeeds; failed restoration remains a cleanup warning while the original retirement diagnostic stays primary.

### Watcher coordination

`SelectedWorkspaceEvidenceNotifier` now provides idempotent `pause()` and `resume()` operations. Pause closes root/domain watcher handles and cancels pending hints without clearing the selected root or incrementing evidence generation. Resume creates fresh handles for the same selected root and generation.

The Existing Project application coordinator now performs:

```text
exclusive machine source lease
-> pause selected-workspace evidence watchers
-> deterministic source conversion
-> resume watchers in finally
-> release exclusive lease in nested finally
```

Source Control remains unaware of the notifier. Agent Harness/MCP was not added before, during, or inside root Git retirement.

## Validation evidence

### Static/build

- `npm run typecheck` — restricted repository lane — exit 0.
- `npm run build` — restricted lane — exit 1 with the documented `spawn EPERM` from esbuild; recorded once and not treated as a source failure.
- `npm run build` — approved normal Windows lane — exit 0. Final run completed TypeScript, Vite (1,666 modules), and branding asset copy; only the existing Vite chunk-size warning remained.

### Focused capability and production-path owners

The initial restricted `node --test` attempts produced the documented test-runner `spawn EPERM`; each was rerun in the normal Windows lane.

- `node --test test/source-control/managed-project-source.test.cjs` — normal Windows integration lane — exit 0, 19/19. Includes the actual PowerShell retirement path on a conventional repository whose path contains spaces, retained recovery HEAD/refs/config/fsck proof, source/history preservation, partial-delete exact restore, persistent-lock retryability, schema-3 journal behavior, managed Main/Dev verification, and Source Control import guard.
- `node --test test/project-state/current-project-entry.test.cjs` — normal Windows integration/application lane — exit 0, 20/20. Includes active watcher pause/resume, unchanged selection/generation, exclusive machine source fence, managed conversion, Current Project registration, and degraded model-access independence.
- `node --test test/workspace-evidence/selected-workspace-evidence-notifier.test.cjs` — normal Windows integration lane — exit 0, 3/3.
- `node --test test/agent-harness/source-control-service-boundary.test.cjs` — normal Windows production-path lane — exit 0, 2/2; no MCP Git authority was introduced.
- `node --test test/validation/capability-map.test.cjs` — normal Windows static lane — exit 0, 5/5 after correcting lexical source-pattern order.
- `node --test --test-name-pattern="partial forced root Git retirement|persistent forced-removal" test/source-control/managed-project-source.test.cjs` — final fresh-build Windows diagnostic — exit 0, 2/2.
- `npm run test:repair -- --changes tmp/epga-r04-r03-r05-changes.json --preview` — repair planning preview — exit 0; selected the changed paths and the explicit current-project, managed-source, and workspace-evidence capabilities plus declared dependencies. The temporary change set is ignored and is not a committed artifact.
- `git diff --check` — repository lane — exit 0 before report creation; repeated during checkpoint safety checks.

Skipped as required:

- broad/full regression suite: prohibited by the Repair Card's focused-validation scope;
- real ChampCity_AI conversion retry: explicitly prohibited until Architect acceptance;
- packaging, release, migration, and visual acceptance: outside this Repair Card.

## Git and safety

- Git actions before checkpoint: read-only status, log, ancestry, diff, and ignore checks only.
- Required checkpoint commit: `EPGA-R04-R03-R05 force Windows root Git retirement from verified recovery copy`.
- Commit hash in this committed artifact: pending by design; the actual hash is reported after commit.
- No push was performed.
- Security review: no secrets, credentials, tokens, cookies, private keys, `.env` contents, or unrestricted renderer filesystem access were introduced.
- Local-path review: durable changed artifacts use repository-relative paths or `<PROJECT_REPO>`; no concrete local-machine path is recorded.
- Generated-artifact review: `dist/`, temporary validation input, dependency state, screenshots, and other generated/local artifacts are not staged.

## Remaining review and risk

- Remaining Operator/Architect action: review and accept the checkpoint before any real ChampCity_AI conversion retry.
- Blockers: none.
- Residual risk: external non-ChampCity processes can still hold Windows Git files beyond the 4-second bounded attempt. The transaction now preserves the exact diagnostic, proves or restores conventional authority, retains recovery evidence, and leaves a failed project retryable.
- Recommended next task: Architect review of Repair05, followed only after acceptance by the separately authorized real qualification retry.
