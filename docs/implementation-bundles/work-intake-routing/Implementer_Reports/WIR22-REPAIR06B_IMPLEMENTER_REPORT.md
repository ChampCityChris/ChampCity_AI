# WIR22-REPAIR06B Implementer Report

Repair Card: **WIR22-REPAIR06B — Establish Integration Repair Scope Policy**.

**Implementation and required validation passed.**

## Repository and scope

Verified the current directory and Git top-level as the approved `<PROJECT_REPO>`. Starting HEAD was `bd771d3` on `dev`, tracking `origin/dev` with 33 local commits ahead; no fetch or remote freshness claim. REPAIR06A production code is present in the existing `50f5059` consolidation checkpoint and its report in `08ca9f3`. The historical report's pending-checkpoint wording does not imply missing runtime code. Existing unrelated architecture, migration and repository-checkout bundle edits were preserved, including concurrent documentation edits observed during this pass.

Current Operator direction authorizes completing the repair chain with bounded checkpoints and then merging the completed sequence into `dev`. Created `codex/work-intake-routing-finish` for these checkpoints. Subsequent read-only history verification established that an independent MCP hotfix merge had advanced `dev` to `2b07d4f` before branch creation; that was the actual branch base. An independent documentation pass then committed the previously visible architecture edits as `84cc171` on this branch. These changes do not overlap this repair's files and were preserved. A later independent untracked validation-architecture document also remains outside this checkpoint. No history rewrite, cleanup, push, tag, release or publication was performed by this pass. The current direction supersedes the card's old instruction to stop between chats.

## Confirmed defect and correction

The Integration Repair controller accepted fixture-only policy callbacks; production had no Repository-owned resolver for governing sources or editable files. The version-1 integration policy now supports a strict optional `repair` section. Existing validation-only policies remain valid, but production repair requires explicit repair policy.

The production provider verifies current Intake branch binding and completed approved Plan against the failed candidate, reads policy at the immutable target commit, and requires unchanged policy text in incoming/candidate checkouts, allowing only CRLF/LF checkout conversion. It supplies exactly one canonical Intake and one approved Plan from the application loader. Supplemental Markdown evidence must be ordinary, contained, nonredirected, bounded and current against both the target and candidate under the same line-ending comparison.

Editable paths derive from mechanical conflicts plus incoming changed files since the common merge base. A source-control read adapter returns exact rename endpoints without shell or model commands. Allowed/protected boundaries filter the set; any out-of-policy conflict, empty set or more than 32 editable files fails closed with an Operator/replanning diagnostic. Policy/Git administration, governing sources, dependency/generated output and configured protected paths cannot be edited. Source policy is re-resolved before patch application and commit; existing hashes, index guards, intent digests, retry ownership and target isolation remain enforced.

ChampCity permits `src`, `test`, `scripts`, `assets` and `packaging`; protects `docs`, `planning`, `validation`, `package.json` and `package-lock.json`; and supplies the Work Intake Routing architecture plus `PROJECT_INTEGRATION_VALIDATION_POLICY.md` as supplemental evidence. This pass does not wire routed Development.

## Files

Created:

- `src/main/planExecution/integrationRepairPolicyProvider.ts`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR06B_IMPLEMENTER_REPORT.md`

Modified:

- `.champcity/integration-policy.json`
- `docs/architecture/PROJECT_INTEGRATION_VALIDATION_POLICY.md`
- `src/shared/integrationPolicyContracts.ts`
- `src/shared/integrationRepairContracts.ts`
- `src/main/planExecution/integrationCandidateService.ts`
- `src/main/planExecution/integrationRepairService.ts`
- `src/main/planExecution/integrationPolicyProvider.ts`
- `src/main/agentHarness/repository/integrationRepairGit.ts`
- `src/main/sourceControl/sourceControlService.ts`
- `test/agent-harness/git-mutation-boundary.test.cjs`

Deleted: none. Intentionally not created: alternate repair engine, renderer scope selection, workflow sidecars, dependency changes, migrations, routed orchestration or a separate permanent suite.

## Validation

Inspected the existing suite and capability-map ownership before extending proof. Existing policy-transition, target-isolation, checkpoint and mutation-boundary scenarios are reused. Existing conflict, semantic validation failure, retry, worker-index and Operator-decision scenarios now exercise the production repair provider. Added malformed repair-schema assertions, protected/out-of-policy conflict and stale/missing evidence cases, and generated excessive/empty-set scenarios in the same family. These close the previously uncovered production scope-resolution boundary. No tests were consolidated or retired.

| Exact command | Lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows, static | First exit 1: TypeScript did not narrow after an inferred throwing arrow helper. Converted it to an explicitly typed function declaration; rerun exit 0. |
| `npm run build` | Restricted Windows, static/build | Exit 1, Vite/esbuild `spawn EPERM`; recorded once as infrastructure restriction. |
| `npm run build` | Normal Windows, static/build | Exit 0; 1658 renderer modules transformed. |
| `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs` | Normal Windows, first integration/capability run | Exit 1; 48 tests, 41 passed, seven failed (six provider scenarios plus parent), none skipped; 713697.712 ms. |
| `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs` | Normal Windows, corrected integration/capability run | Exit 0; all 48 tests passed, no failures/skips/cancellations; 1117388.0724 ms. |
| `git diff --check` | Restricted Windows, hygiene | Exit 0. |

Full suite is deliberately excluded by this card. No Electron launch, visual acceptance, packaging or external provider integration is claimed. Git/npm regression operations use disposable local fixture repositories. Required routed production workflow proof remains downstream.

The first regression run exposed a production comparison defect: Git's Windows `core.autocrlf` checkout converted the unchanged governing document from LF to CRLF, which strict blob/worktree equality rejected. Direct inspection confirmed differing line endings with identical normalized content. Policy and governing-document freshness now permit CRLF/LF conversion only, preserving target-blob receipt identity and rejection of all other whitespace/content changes. The repaired scenarios explicitly enable this Git conversion. Final typecheck and normal-lane rebuild both exited 0 after this correction; the preserved WIR21 source/index hash guards were not relaxed.

## Safety and checkpoint

Bounded changed-file scan found no credential-shaped values, concrete user/temp paths or generated artifacts. An initial path expression falsely matched the existing prose `user/home/temp`; the corrected boundary-aware scan passed. All runtime changes remain under `src`, tests under `test`, and durable documentation uses repository-relative paths. Unrelated working-tree edits remain outside the checkpoint.

Required validation is complete. The single checkpoint is `WIR22-REPAIR06B: Establish Integration Repair Scope Policy`; commit hash is pending at report write time and will be reported after the exact staged-diff/safety review and commit, without amending this report solely to insert that hash.

Remaining manual Operator validation: none for this provider-only correction. Visual workflow acceptance and complete routed integration proof belong to later cards. Next card after passing validation/checkpoint: **WIR22-REPAIR06**.
