# SCL07 Implementer Report

## Identity and scope

- Approved repository root: verified with `git rev-parse --show-toplevel` as the primary `ChampCity_AI` checkout; no workstation path is recorded here.
- Card: Work Card `SCL07`, Normalize Agent-Free Integration into `dev`.
- Predecessor: SCL06 checkpoint `9e333676df7343c2e09f6f699bcc8be6b904e691`.
- Branch and remote: `dev`, ahead of `origin/dev` by 48 commits before this card commit. No push was directed.

## Files

- Created: `src/main/sourceControl/structuredIntegrationService.ts`, `test/agent-harness/issue-completion-checkpoint.test.cjs`, `test/source-control/structured-integration.test.cjs`, and this report.
- Modified: `src/main/planExecution/integrationCandidateService.ts`, `src/main/planExecution/integrationRepairService.ts`, `src/main/planExecution/lifecycleEvidenceCheckpointService.ts`, `src/main/planExecution/routedIntegrationService.ts`, `src/shared/integrationCandidateContracts.ts`, `test/characterization/routed-integration-focus.test.cjs`, `test/characterization/routed-research-integration-focus.test.cjs`, `test/fixtures/routed-completed/documents/EXECUTION_PLAN.md`, `test/fixtures/routed-completed/documents/INTAKE.md`, `test/support/completed-routed-plan.cjs`, `test/support/integration-semantics.cjs`, `test/support/work-intake-fixtures.cjs`, and `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: a renderer Git command surface, a replacement merge engine, new dependencies or migrations, a remote-hosting requirement, or automatic `main` promotion.

## Implementation and evidence

The existing routed integration action now requires `dev` as the Work Intake target. It constructs its candidate from the exact completed source head and current target, validates in the existing isolated checkout, advances the target with an exact ref precondition, and records the observed resulting target revision. A receipt failure is reconciled against the exact target ref; a different ref remains failed and inspectable. The normal routed workflow continues to call the application integration service rather than the legacy agent `integrate_to_dev` action.

Routed Issue completion now requires a current Issue close record. At integration, the application checkpoints bounded changed Issue Markdown evidence on the same Work Intake source line before creating the candidate. Issue evidence is limited to the exact Issue identity and known correction artifact locations. Unrelated paths, drafts, and another Issue remain outside that checkpoint. Existing Work Item, Phase, research, candidate, validation, and Integration Repair owners remain in use.

For structured authority, the new main-process service reads the completed Work Intake, current Operator route, exact SourceBinding and contiguous committed SourceCheckpoint chain from Project State. It uses the same isolated candidate and exact target advancement mechanics, persists IntegrationRecord state and Validation links, and exposes the resulting target revision. The structured repair adapter derives its editable set from target-owned policy and the retained conflict, carries current semantic Work Intake intent into the bounded repair context, and leaves Git staging, merge continuation, commit, and target advancement with the application. The primary checkout's untracked SQLite state is preserved; any other pending source path blocks integration. This structured service is a main-process integration seam; no new renderer action was introduced by this card.

Focused fixtures observed clean structured integration, a retained mechanical conflict, bounded source repair, rejection of an out-of-scope patch, idempotent retry, exact `dev` advancement, preservation of unrelated pending source, and exact Issue evidence checkpointing. Existing candidate and target-policy fixtures observed stale target rejection, validated advancement, and retained repair behavior.

## Validation

| Command | Execution lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows static/build | Passed on final source. |
| `node --test test/agent-harness/integration-candidate-semantics.test.cjs test/agent-harness/integration-policy-semantics.test.cjs test/source-control/structured-integration.test.cjs` | Normal Windows focused candidate/policy | Passed 20/20 after restoring precise stale-ref failure evidence. |
| `node --test test/source-control/structured-integration.test.cjs test/characterization/routed-integration-focus.test.cjs test/agent-harness/issue-completion-checkpoint.test.cjs` | Normal Windows focused completion/repair | Passed 6/6 on final source. |
| `npm run test:affected -- --changes tmp/scl07-changes.json --preview` | Normal Windows work-item planner | Passed with all changed paths classified. The changes file is ignored temporary validation input. |
| `npm run test:affected -- --changes tmp/scl07-changes.json` | Normal Windows work-item profile | Final receipt `5eea4e7b-8730-43a6-bd79-14decb336a8e` passed 310/310 tests across 53 selected files; source remained stable. |
| `git diff --check` and `git diff --cached --check` | Read-only source/staged checks | Passed before commit. |

The first composed run failed two existing stale-target assertions because the new failure message omitted the source-control `refs changed` reason. The exact source-control reason was restored, focused candidate and policy fixtures passed, and the final composed profile passed. No required validation was skipped. No visual, external remote, or release acceptance is claimed.

## Git and safety

The Operator directed one commit for this card. Its hash is pending at report creation and will be reported after commit. Exact staged diff inspection and the staged whitespace check passed. The staged safety scan found 17 card files, zero generated paths, zero concrete local paths, and zero credential assignments in added lines. No push, merge, rebase, reset, clean, restore, stash, branch creation, or worktree creation was performed in the source repository.

## Remaining validation and next task

The structured service is a main-process seam awaiting the later provider-qualified workflow consumer. Its production validation requires a target-owned integration policy; the direct-check fixture proves candidate mechanics but does not claim repository-specific policy acceptance for an arbitrary selected Project. No additional Operator manual validation is required for this deterministic card. Continue to SCL08 after the checkpoint commit; later workflow qualification must exercise the complete user-facing structured path.
