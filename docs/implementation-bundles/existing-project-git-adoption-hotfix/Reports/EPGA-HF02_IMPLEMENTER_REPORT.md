# EPGA-HF02 Implementer Report

## Scope and repository verification

- Card type and identifier: Work Card `EPGA-HF02` — Apply/Resume Managed Topology and Baseline Normalization.
- Approved repository root: verified as the repository root; no concrete machine path is recorded here.
- Branch: `dev`.
- Remote status: `dev` tracked `origin/dev` and was ahead by 173 commits after the HF01 checkpoint; no remote mutation was performed.
- Starting checkpoint: `c17e335` (`EPGA-HF01 inspect and classify existing Git adoption`).

## Files

Created:

- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Reports/EPGA-HF02_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/sourceControl/existingProjectGitAdoptionService.ts`
- `test/source-control/managed-project-source.test.cjs`
- `validation/capability-map.json`

Deleted: none.

Intentionally not created:

- No renderer, preload, or landing warning was added; those belong to EPGA-HF03.
- No Workflow, Work Intake, schema, archive, compatibility sidecar, dependency, or external integration was added.
- No arbitrary branch consolidation or conflict-resolution strategy was added.

## Implementation

- Added `applyExistingProjectGitAdoption`, keyed by the exact inspected `planId`. It re-inspects before mutation, rejects stale/manual plans, and requires consent only for baseline choice, active-source integration, or working-state snapshot capture.
- Added atomic active-journal creation before mutation and completion-receipt creation after verified managed topology.
- Preserved an existing `main` exactly; when missing, created it at the accepted deterministic source revision without deleting the original branch. Created missing `dev` at the exact main baseline.
- Integrated only the active source into `dev`: no-op when contained, exact ref advance when fast-forwardable, or a normal isolated two-parent merge candidate when divergent. Merge conflicts abort the candidate, do not advance `dev`, and produce a precise manual state.
- Captured staged, unstaged, and non-ignored untracked bytes in a machine-owned adoption snapshot commit after consent. Staged-versus-unstaged intent is normalized only after snapshot verification. Ignored files remain uncommitted and are preserved locally in managed Dev.
- Reused the existing proven physical topology conversion and exact RepositoryCheckout registration mechanics after branch/snapshot normalization.
- Added journal-proven recovery for metadata-only interrupted migration: application-owned residue is safely removed, the conventional authority is retained, and the accepted migration is retried to one complete managed state.
- Added bounded completed receipts and managed reopen idempotency through the same apply boundary.

## Validation evidence

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | approved normal Windows build | Initial run found one TypeScript control-flow return error; corrected before validation. |
| `npm run build` | approved normal Windows build | Intermediate run found one TypeScript narrowing error; corrected before validation. |
| `npm run build` | approved normal Windows build | PASS, exit 0; TypeScript, Vite production bundle (1,665 modules), and branding copy completed. Existing chunk-size warning only. |
| `node --test test/source-control/managed-project-source.test.cjs` | approved normal Windows focused migration/recovery | Initial result: 16/17 passed; the only failure was LF versus CRLF in a byte-content assertion. The assertion was made platform-neutral. |
| `node --test test/source-control/managed-project-source.test.cjs` | approved normal Windows focused migration/recovery | PASS, exit 0; 17/17 passed before the recovery fixture was added. |
| `node --test --test-name-pattern="metadata-only interrupted migration" test/source-control/managed-project-source.test.cjs` | approved normal Windows focused recovery | PASS, exit 0; 1/1 passed. |
| `node --test test/source-control/managed-project-source.test.cjs test/project-state/current-project-entry.test.cjs test/source-control/source-topology-path-contracts.test.cjs test/validation/capability-map.test.cjs` | approved normal Windows capability/integration/production-path | PASS, exit 0; 42/42 passed, including all 18 managed-source scenarios and Current Project retry/idempotency proof. |
| `npm run test:migration -- --preview` | validation-plan preview | PASS, exit 0; migration lane resolved its supported test and production build step without execution. |
| `git diff --check` | static diff hygiene | PASS, exit 0. |

Skipped checks: no Electron launch or visual acceptance was required by HF02. Broad unrelated full regression was excluded by the card. External provider/network evidence was not applicable.

## Git actions

- Task-scope checkpoint commit required by the approved card: `EPGA-HF02 apply and resume existing Git adoption`.
- Commit hash in this committed artifact: pending by repository rule; the actual hash is reported after creation.
- No push, merge, rebase, tag, reset, clean, restore, or stash was performed on this source repository. Git mutations in tests occurred only in isolated temporary fixtures.

## Security and local-path safety

- Renderer-visible plans contain counts and bounded facts, never paths or working-file names.
- Migration candidate paths and journal resource identifiers are repository-contained and pattern-bounded.
- Git operations are bounded and non-interactive; conflict candidates are removed without selecting a conflict-discarding strategy.
- Durable artifacts contain repository-relative paths only.
- No secrets, credentials, tokens, `.env` contents, concrete local-machine paths, generated output, or dependency state are included.

## Remaining work and risk

- EPGA-HF03 must expose the constrained inspection/apply actions, replace direct landing registration, render consent/manual states, and prove the actual renderer/controller → IPC → service → registration → Hub path.
- Recovery deliberately fails closed when application ownership or an authoritative conventional/managed state cannot be proven.
- Operator visual validation remains for the HF03 warning surface; no visual surface changed here.

Recommended next task: execute `EPGA-HF03` from this passing checkpoint.
