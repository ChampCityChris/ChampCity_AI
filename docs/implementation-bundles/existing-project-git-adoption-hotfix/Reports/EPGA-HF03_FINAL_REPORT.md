# EPGA-HF03 Final Report

## Scope and repository verification

- Card type and identifier: Work Card `EPGA-HF03` — Landing Migration Consent and End-to-End Qualification.
- Approved repository root: verified as the repository root; no concrete machine path is recorded here.
- Branch: `dev`.
- Remote status: `dev` tracked `origin/dev` and was ahead by 174 commits after the HF02 checkpoint; no remote mutation was performed.
- Starting checkpoint: `639e59b` (`EPGA-HF02 apply and resume existing Git adoption`).

## Files

Created:

- `src/renderer/app/existingProjectEntryController.ts`
- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Reports/EPGA-HF03_FINAL_REPORT.md`

Modified:

- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/LandingWorkspace.tsx`
- `src/renderer/styles.css`
- `test/project-state/current-project-entry.test.cjs`
- `test/renderer/workflow-hub-shell.test.cjs`
- `validation/capability-map.json`

Deleted: none.

Intentionally not created:

- No Workflow reconstruction, Work Intake routing, feature/issue flow, schema migration, archive compatibility path, dependency, raw browser confirmation, or renderer filesystem API was added.
- No WRB04 workspace-convergence or WRB05 work was started.

## Product result

The landing path is now:

```text
choose Existing Project
→ main-owned inspection
→ automatic safe apply or bounded warning
→ exact-plan apply
→ one Current Project registration
→ Workflow Hub
```

The renderer can request inspection and submit only the exact 64-character `planId`. It cannot submit a project path, branch/ref, revision, merge strategy, file inventory, or consent details. The main process owns the selected root, workspace registration, source mutation, and checkout registration.

## Migration-state matrix

| Inspected state | Landing behavior | Mutation/registration result |
| --- | --- | --- |
| `source-neutral` | No warning | No source mutation; register without Repository resource; open Hub. |
| `managed-ready` | No warning | Idempotently register exact Main/Dev checkouts, register/reopen Current Project, open Hub. |
| `conventional-auto` | No warning | Apply exact safe plan, then register once and open Hub. |
| `migration-consent-required` | Render bounded warning | Accept applies exact current plan then registers once; Cancel clears the plan/selection and applies neither migration nor registration. |
| `resumable-partial` without new semantic choice | No warning | Resume/rollback application-owned recovery state, converge, register, open Hub. |
| `resumable-partial` with semantic choice | Render bounded warning | Requires Accept for the refreshed exact plan. |
| `manual-intervention-required` | Show exact diagnostic | No source migration and no Current Project registration; selected context is cleared. |

## Warning and consent behavior

- The warning uses the existing landing visual language and is not a browser confirm box.
- It shows current branch, proposed main action/revision, proposed dev action, active-source integration, staged/unstaged/untracked counts, snapshot behavior, preservation statement, and conflict/manual fallback.
- Accept is disabled while pending and applies the exact `planId` before one Current Project registration.
- A stale-plan error triggers re-inspection. A refreshed semantic plan requires a second explicit review/Accept; it is never silently reused.
- Cancel calls neither apply nor registration, clears pending state and the selected workspace, and confirms no mutation/registration in landing feedback.

## Source preservation and normalization

- Existing refs, tags, remotes, and commit objects are preserved; only the planned main/dev changes and bounded adoption snapshot ref are added/advanced.
- Existing main remains exact. Missing main is created at the accepted deterministic source revision without deleting the original branch.
- Missing dev is created at main. Only the active source is considered for dev integration.
- Fast-forwardable active source advances dev exactly; divergent source uses a normal isolated two-parent merge candidate.
- Merge conflict aborts the candidate, leaves dev unchanged, retains conventional authority/journal evidence, and re-inspects as manual intervention.
- Accepted staged, unstaged, and non-ignored untracked bytes are committed in an adoption snapshot; ignored files remain uncommitted and present locally.

## Recovery, registration, and reopen

- Metadata-only interrupted migration is journal-proven, safely rolled back to conventional authority, and resumed to complete managed topology.
- SPS registration occurs only after source adoption. A synthetic SPS failure after adoption leaves managed topology authoritative; retry reopens without remigration and creates one Repository resource.
- Non-Git Existing Project registration remains source-neutral and does not reconstruct historical Workflow records.
- Managed reopen returns the same Project/Repository and deterministic Main/Dev checkout identities without rewriting Git.

## Validation evidence

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | approved normal Windows build | PASS, exit 0; TypeScript, Vite production bundle (1,666 modules), and branding copy completed. Existing chunk-size warning only. |
| `node --test test/project-state/current-project-entry.test.cjs test/renderer/workflow-hub-shell.test.cjs` | approved normal Windows product-path qualification | Initial post-wiring run exposed four expected old-harness assumptions; fixtures were updated to the new inspect/apply boundary. Second run exposed one obsolete exact-dev-ref assertion and was corrected to permit the planned dev advancement. |
| `node --test test/project-state/current-project-entry.test.cjs test/renderer/workflow-hub-shell.test.cjs test/app-shell/app-shell.test.cjs test/validation/capability-map.test.cjs` | approved normal Windows IPC/preload/controller/rendered-Hub/catalog | PASS, exit 0; 51/51 passed. |
| `node --test test/source-control/managed-project-source.test.cjs test/source-control/source-topology-path-contracts.test.cjs` | approved normal Windows migration/recovery/topology | PASS, exit 0; 25/25 passed. |
| `node --test test/project-state/current-project-entry.test.cjs test/validation/capability-map.test.cjs` | approved normal Windows constrained IPC/catalog | PASS, exit 0; 18/18 passed after adding exact digest/root-authority proof. |
| `npm run test:migration -- --preview` | migration validation-plan preview | PASS, exit 0; supported migration lane and build step resolved. |
| `npm run test:desktop -- --preview` | desktop-platform availability preview | Preview completed; the broad desktop lane contains 11 unrelated platform tests and reported missing `git-cli` capability for two entries, so it was not a supported complete acceptance lane for this card. |
| `git diff --check` | static diff hygiene | PASS, exit 0. |

The card-authorized fallback was used: renderer/controller plus actual preload/main IPC and real source/registration services were exercised deterministically. No live Electron-window automation was claimed. Operator visual review of the warning remains the only manual UI limitation.

## Git actions

- HF01 checkpoint: `c17e335` (`EPGA-HF01 inspect and classify existing Git adoption`).
- HF02 checkpoint: `639e59b` (`EPGA-HF02 apply and resume existing Git adoption`).
- Required HF03 checkpoint: `EPGA-HF03 complete Existing Project Git adoption hotfix`.
- HF03 hash in this committed artifact: pending by repository rule; the actual hash is reported after creation.
- No push, rebase, release-branch mutation, tag, reset, clean, restore, or stash was performed on this source repository.

## Security and local-path safety

- Durable artifacts contain repository-relative paths only.
- Renderer contracts expose bounded facts/counts and a digest, not user paths or file identities.
- Main-process authority resolves the selected root and owns every repository write.
- No secrets, credentials, tokens, cookies, private keys, `.env` contents, concrete local-machine paths, generated output, or dependency state are included.

## Remaining manual validation and residual risks

- Operator visual validation: confirm the inline warning’s wording, spacing, and light/dark presentation in a live Electron window.
- Unsupported external linked worktrees, submodules/alternates, redirected metadata, ambiguous detached HEAD, and unproven foreign residue continue to fail closed by design.
- Recovery beyond journal-proven owned resources remains manual by design; the application does not take over ambiguous user content.

Recommended next task: Architect review of the completed EPGA hotfix. Do not begin WRB04 workspace convergence or WRB05 from this checkpoint.
