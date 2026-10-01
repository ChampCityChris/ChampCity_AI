# RWS04B Implementer Report

Status: implemented; awaiting Architect review. Wider affected validation is non-passing; see retained failures below.

## Scope and baseline

Implemented Operator-requested Work Card RWS04B (Intake persistence cutover / bounded legacy import). Verified `Dev` as the approved repository root, branch `dev`, remote `origin` configured, with no upstream tracking branch. No fetch or push was performed; live remote synchronization was not verified. Started from `ee5313c` (RWS04A structured Workflow Intake domain). Preserved unrelated pre-existing worktree changes and untracked card files. No push, release, or branch topology changes.

## Implementation

- Added Project Creation to the shared Intake contract with the existing Greenfield questions, boolean semantics and approved ProjectType values; preserved the other six definitions.
- Replaced the generic Finding-backed facade with SQL WorkflowIntake get/save/revise/review/projection operations. Saves retain identity, return recordVersion/current disposition, and never advance the Workflow workspace.
- Added exact per-Workflow preview, atomic apply, and lazy ensure. Preview does not mutate. Ensure imports only ready sources and validates current structured records before returning them. Import and its optional legacy review run in one serialized Project transaction.
- Added a structured Greenfield save adapter that binds projectRepository to the selected canonical writable root and requires the exact current Project Creation Workflow. It writes no Intake Markdown.
- Feature Assessment and Issue RCA preparation use ensured SQL values and identify the authoritative WorkflowIntake ID and recordVersion. Feature acceptance validates structured Intake. Issue Evidence supports structured Intake; RCA may cite that Evidence without requiring invented Intake Findings, while retaining exact ownership validation for any Findings it cites.
- Architect Interview context, chat/finalization instructions and prompt regeneration obtain current structured Greenfield Intake. Repository binding is rebuilt for the current selected root. Later-stage prompt/interview Markdown identity, promotion, and disposition remain on their existing paths.
- Shared contract typing guards explicitly preserve the old Greenfield renderer route. No RWS04C activation, generated Intake projection writer, SQL schema migration, top rail, Git/source-control product changes, or later-stage state migration was added.

## Migration matrix

| Family | Supported source | Mapping and result |
| --- | --- | --- |
| Project Creation | One current canonical Project Intake Markdown | Canonical workflowData fields; exact path provenance; Pending produces no Decision; Approved/RevisionRequested/Rejected produce an exact-version approved/revision_requested/rejected Decision, retaining notes and reviewedAt |
| Feature | Exact Workflow-owned feature-intake Findings | Existing field titles map to preserved Feature keys |
| Issue | Exact Workflow-owned issue-intake Findings | Existing field titles map to preserved Issue keys |
| Refactor / Migration | Exact workflow-intake:refactor-migration:fieldKey Findings | Current statements imported; omitted optional fields excluded |
| Integration / Composition | Exact workflow-intake:integration-composition:fieldKey Findings | Same bounded current/omitted mapping |
| Infrastructure / Platform | Exact workflow-intake:infrastructure-platform:fieldKey Findings | Same bounded current/omitted mapping |
| Research / Prototype | Exact workflow-intake:research-prototype:fieldKey Findings | Same bounded current/omitted mapping |

Optional blank legacy values are omitted to respect SQL scalar-map validation. Existing valid SQL Intake is a validated no-op, even if historical sources subsequently change. Missing legacy data reports not-needed and ensure returns an empty projection. Historical Markdown and Findings are never deleted or synchronized.

## Blocked conditions and compatibility

Blocked: multiple active structured records, invalid structured payload or exact ownership, duplicate legacy field sources (including identical duplicates), unknown legacy fields, conflicting Finding ownership/state, missing required fields, multiple canonical Greenfield documents, unreadable or conflicting canonical identities, ambiguous current Project Creation Workflow, invalid legacy review timestamps/notes, or RevisionRequested without instructions. A blocker affects only its exact Workflow and preserves evidence.

Pre-registration Greenfield Markdown commonly has no SQL Workflow ID. Import permits association only with the unique exact current Project Creation Workflow; any explicit Project/Workflow identifiers must agree. An existing canonical artifact key is required. No project-wide startup migration occurs.

Greenfield renderer capture and later-stage document discovery remain compatibility surfaces until RWS04C. Semantic preparation uses SQL authority; historical document paths/revisions continue to anchor the existing prompt/interview output contract. Newly registered projects must establish their current Project Creation Workflow before structured preparation. Full renderer replacement and generated Intake projections remain RWS04C work.

## Proof and validation

Focused proof extends existing owners and fixtures, including a newly registered Project whose Greenfield Markdown existed before registration and RWS03 Finding-backed Refactor Intake. It proves all seven families, duplicate blockers, source preservation, idempotence, exact-version reviews, all four Greenfield dispositions, unchanged Workflow records, unchanged sqlite_master schema, downstream authority instructions, and RCA using structured Intake Evidence without new Intake Findings.

- `npx tsc --noEmit -p tsconfig.json`: restricted Windows lane, exit 0 (diagnostic during implementation).
- `npm run build`: normal Windows lane, exit 0 for the final production source; earlier diagnostic runs exposed and corrected type errors. Standard existing Vite chunk-size advisory remains.
- `node --test test/workflow/workflow-application-service.test.cjs test/project-state/workflow-type-registry.test.cjs test/architect-interview/architect-interview-workspace.test.cjs test/workflow/production-service-proof.test.cjs test/documents/single-file-workflow.test.cjs`: normal Windows lane, exit 0, 40 passed, 0 failed. Earlier focused failures were corrected (Finding authority assumptions, optional blanks and asynchronous fixture calls).
- `npm run validate:plan -- --profile work-item --changes tmp/rws04b-changes.json`: final normal Windows run exit 0; initial classification/sorting gaps were corrected in existing capability owners.
- `npm run test:affected -- --changes tmp/rws04b-changes.json`: restricted Windows lane failed once with spawn EPERM before tests. Normal Windows diagnostic profiles were interrupted to correct failures found by focused proof and complete source-boundary audit. A complete stable-source normal-lane run passed build and 93/105 files (869 tests: 805 passed, 63 failed, 1 skipped; 443.48 seconds). Its card-related synchronous dispatcher regressions were corrected; expanded compatibility proof now passes. Final normal-lane rerun: exit 1, production build passed, sourceStable=true, 97/105 files passed; 869 tests, 846 passed, 22 failed, 1 skipped; 422.205 seconds. The 60-second affected budget is advisory and exceeded.
- `git diff --check`: exit 0; repeated before the checkpoint.

- Expanded normal-lane compatibility proof: `node --test` over the five focused owners plus Architect output repair, Formal Work Card, Repair Work Card, current execution context and Workflow integration owners: exit 0, 113 passed, 0 failed, 64.668 seconds. The dispatcher preserves synchronous non-Interview APIs.

No full/release qualification, visual acceptance, launch smoke or external integration was run. Architect review is the required next acceptance step. Validation receipts/logs and the explicit change set remain temporary under tmp and are not committed.

## Retained affected-profile failures

| Owner | Observed failure |
| --- | --- |
| agent-harness/repository-io-hardening | Workspace-only toolbox status assertion |
| agent-harness/reserved-toolbox-namespace | Stable namespace / registered Workspace status assertions |
| project-intake/post-submit-review-state | Work Intake capture reads projectId from null |
| project-planning/project-planning-service | Missing workPlanning:status IPC registration in an existing kernel proof |
| project-state/execution-completion | Existing source-neutral fixtures request unavailable deterministic ValidationCatalog proof |
| repository/runtime-wiring-source | Codex preload mock-call arguments include additional scope arguments |
| source-control/managed-project-source | Synthetic managed-source candidate Git preparation fails |
| source-control/workflow-integration-service | Both isolated-profile qualification cases return failed instead of integrated; both pass in the direct normal-lane compatibility run |

These failures are not hidden or counted as passes. The non-Intake failures are outside the card's changed behavior; the isolated-profile Workflow integration discrepancy remains unresolved. No broader repair, validation-policy exception, test disabling, source-control change, or release qualification was attempted. Validation ran against the preserved dirty Dev checkout; unrelated pre-existing source/test changes remain present. Architect review must assess this evidence and determine any separate repair scope.

## Files and safety

Created: `src/main/workflow/workflowIntakeMigration.ts` and this report.

Modified files:
- `src/main/architectInterview/architectInterviewContextResolver.ts`
- `src/main/architectInterview/architectInterviewDraftPilot.ts`
- `src/main/architectInterview/architectInterviewService.ts`
- `src/main/architectInterview/projectArchitectInterviewPromptWriter.ts`
- `src/main/architectOutputs/architectOutputWorkspaceService.ts`
- `src/main/featurePlanning/featurePlanningService.ts`
- `src/main/integrations/architectMcpHandoffService.ts`
- `src/main/issuePlanning/issuePlanningService.ts`
- `src/main/main.ts`
- `src/main/workflow/workflowApplicationIpc.ts`
- `src/main/workflow/workflowIntakeService.ts`
- `src/renderer/app/WorkflowIntakeWorkspace.tsx`
- `src/renderer/app/workflowPlanningDispatch.ts`
- `src/shared/projectState/projectStateService.ts`
- `src/shared/workflowIntakeContracts.ts`
- `test/architect-interview/architect-interview-workspace.test.cjs`
- `test/documents/single-file-workflow.test.cjs`
- `test/project-state/workflow-type-registry.test.cjs`
- `test/renderer/workflow-hub-shell.test.cjs`
- `test/support/canonical-markdown-fixtures.cjs`
- `test/workflow/production-service-proof.test.cjs`
- `test/workflow/workflow-application-service.test.cjs`
- `validation/capability-map.json`

- `test/source-control/workflow-integration-service.test.cjs`: only the Issue Intake citation fixture is attributable to RWS04B; pre-existing unrelated edits are preserved and excluded from the checkpoint.

Deleted: none. Intentionally not created: SQL migrations, Intake Markdown, projection files, renderer activation or new permanent test files.

The capability map adds ownership for the existing MCP Architect handoff service and shared canonical document fixtures. Production imports stay within src; proof remains within existing test owners. A bounded scan of attributable added lines/new files found no secrets, fixed machine paths, or generated artifacts. Exact staged diff review and the final staged safety check precede the checkpoint. No credentials or concrete machine paths were introduced in durable artifacts.

## Checkpoint

Required commit: `RWS04B migrate workflow intake to structured state`. Hash pending at report authoring; actual hash will be reported in chat after commit. Stop for Architect review; recommended next task is RWS04C only after acceptance.
