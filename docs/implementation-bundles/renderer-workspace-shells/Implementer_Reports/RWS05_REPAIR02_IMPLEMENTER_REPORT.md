# RWS05-REPAIR02 Implementer Report

Card: bounded source-level regression repair. Repository root verified as `Dev` through its Git metadata, AGENTS.md and package manifest. Branch: `dev`; configured remote: `origin`, ChampCityChris/ChampCity_AI. Unrelated existing changes remain untouched and outside this checkpoint.

## Root cause and changes

Repair01 incorrectly classified common Project ground-zero/local-development-machine guidance as Greenfield-specific when extracting output-contract prose. Its test then asserted that other workflows must exclude that guidance, preserving the regression.

- `src/shared/architectWorkspaceContracts.ts`: removed only the ground-zero sentence from the Greenfield output-contract branch.
- `src/main/architectOutputs/structuredArchitectWorkspaceService.ts`: restored the identical sentence in common composition, after repository inspection guidance and before approved SQL Intake.
- `test/workflow/workflow-application-service.test.cjs`: corrected the existing seven-workflow assertion to require the complete ground-zero sentence exactly once in every production handoff. Explicitly checks that Project Planning Direction appears if and only if the workflow is Greenfield. All Repair01 contract, template, matching-validator and cross-workflow rejection assertions remain intact.
- Created this report. No files deleted; no new test owner or production surface added.

The existing owner and capability-map ownership were inspected during Repair01 and reused here. All seven workflows (Project Creation, Feature, Issue, Migration, Integration, Infrastructure and Research) receive common ground-zero guidance. Project Planning Direction remains Greenfield-only. Typed output shapes, templates, limits and validator semantics are unchanged. SQL persistence/authority, review cycles, atomicity, decisions, currentness, Evidence, generated Markdown, legacy adoption, renderer/rail/browser behavior and Planning remain unchanged.

## Validation

Temporary `tmp/rws05-r02-changes.json` names exactly the two production files, existing test owner and this report. Inputs, logs, receipts and generated output are uncommitted.

| Command | Execution lane | Result |
| --- | --- | --- |
| `node scripts/validation/cli.cjs preview --profile work-item --changes tmp/rws05-r02-changes.json` | Restricted Windows | Exit 0; 63 test files; production build selected |
| `node scripts/validation/cli.cjs run --profile work-item --changes tmp/rws05-r02-changes.json` | Approved normal Windows | Exit 1 overall; production build exit 0; 487 tests, 466 passed, 21 failed, zero skipped/blocked/unavailable; source stable; 295018 ms, advisory budget exceeded |
| `node --test --test-concurrency=1 test/workflow/workflow-application-service.test.cjs` | Approved normal Windows, profile's fresh build | Exit 0; 28 passed, zero failed/skipped; includes actual production handoffs for all seven workflows and preserved structured Architect workflow behavior |
| `git diff --check` and `git diff --cached --check` | Restricted Windows | Exit 0 |

The normal Windows lane was used because Repair01 established restricted-lane `spawn EPERM` in this same session. No redundant standalone build was needed. After the profile, only indentation of the restored sentence was aligned with adjacent lines; this does not change emitted JavaScript behavior. The focused owner was run separately as requested. No full/release qualification or visual acceptance required.

## Unrelated failures

The broader profile repeats the same failure counts and files observed before Repair02 in Repair01's receipt. They were not repaired under this card. The checkout contains unrelated ongoing changes; these results are not a clean-checkout baseline.

| Test file | Failed count | Diagnostic |
| --- | --- | --- |
| `test/agent-harness/repository-io-hardening.test.cjs` | 1 | Workspace-only Git toolbox status assertion |
| `test/agent-harness/reserved-toolbox-namespace.test.cjs` | 2 | Repository checkout argument and placeholder status assertions |
| `test/project-intake/post-submit-review-state.test.cjs` | 1 | Null projectId during Work Intake capture |
| `test/project-planning/project-planning-service.test.cjs` | 1 | Missing IPC registration workPlanning:status |
| `test/project-state/execution-completion.test.cjs` | 6 | Deterministic ValidationCatalog proof unavailable for source-neutral Workflow; includes parent/subtest counts |
| `test/source-control/managed-project-source.test.cjs` | 8 | Candidate repository preparation Git failure; includes parent/subtest counts |
| `test/source-control/workflow-integration-service.test.cjs` | 2 | Expected integrated, received failed |

## Checkpoint and safety

Exactly the four attributable files were reviewed and staged. Bounded credential, concrete local-path, UTF-8 and generated-artifact checks passed. No dependencies, schema changes, approval gates or unrelated prompt redesign. No deviations from the card.

Required checkpoint message: `RWS05-R02 restore common architect ground-zero guidance`. Hash pending at report creation and returned after commit; no amendment solely to embed its own hash. No push, merge, branch or release mutation. Remaining task: source-code review; wider failures require separate ownership. Focused repair proof passes, while broader qualification remains failed.
