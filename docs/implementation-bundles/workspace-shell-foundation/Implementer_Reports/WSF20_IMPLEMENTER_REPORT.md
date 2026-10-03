# WSF20 Implementer Report

Approved Dev repository root and primary dev checkout verified. Origin retained; no fetch, push, release or Main changes. Active Operator-approved Work Card WSF20 executed sequentially under the remaining-boundary audit. Checkpoint hash pending creation.

GreenfieldWorkspace now consumes WSF19A as the sole required-stage resolver and composes recovered adapters through GreenfieldStageComposition. No workspace chrome is copied into orchestration. Nested SQL Project/Phase/Work Card context and required/completed rail facts remain visible throughout. Selection, manual Validation and immediate terminal screens are ephemeral presentation only; Resume/reopen uses SQL. Inspector controls enumerate exact SQL Phases/WorkItems without fixed loop counts, suppress browser interaction and disable action controls while inspecting a non-current surface. Work Card Intake/Planning candidate navigation preserves domain eligibility. Repair uses the exact WSF16A projection and the shared Implement/Review/Validation adapters; parent-ready return is resolved from SQL. Closed Greenfield dispatch remains on the SQL resolver; other family terminal routing is preserved. Project Validation retains its source integration and Closeout commands. Additive host CSS supplies sizing without altering recovered shell geometry. No shell was changed, no schema or new workflow framework was introduced, and no other-family rebuilding started.

## Recovered adapter / shell mapping

| Destination | Existing/recovered adapter | Shell |
| --- | --- | --- |
| Project Intake | ProjectIntakeWorkspace | ProjectIntakeShell |
| Architect Interview | StructuredArchitectWorkspace | ArchitectWorkspaceShell |
| Project Planning | StructuredProjectPlanningWorkspace | ProjectPlanningReviewShell |
| Project Phase Map | StructuredPhaseMapWorkspace | ProjectPhaseMapShell |
| Phase Interview | PhaseInterviewWorkspace | PhaseInterviewShell |
| Phase Planning | PhasePlanningWorkspace | PhasePlanningShell |
| Work Card Map | WorkCardMapWorkspace | WorkCardMapShell |
| Work Card Intake | WorkCardIntakeWorkspace | WorkCardIntakeShell |
| Work Card Planning | WorkCardPlanningWorkspace | WorkCardPlanningShell |
| Implement | WorkCardImplementWorkspace | WorkCardImplementShell |
| Review & Validation | WorkCardReviewValidationWorkspace | WorkCardReviewValidationShell |
| Manual Validation | WorkCardValidationWorkspace | WorkCardValidationShell |
| Repair | WorkCardRepairWorkspace | WorkCardRepairShell |
| Work Card Close | WorkCardCloseWorkspace | WorkCardCloseShell |
| Phase Validation | PhaseValidationWorkspace | PhaseValidationShell |
| Phase Close | PhaseCloseWorkspace | PhaseCloseShell |
| Project Validation | ProjectValidationWorkspace | ProjectValidationShell |
| Project Close | ProjectCloseWorkspace | ProjectCloseShell |

Nested rail: GreenfieldNestedWorkflowRail -> NestedWorkflowRailShell; all identities/status facts from WSF19A. Workflow Hub remains the later canonical closed-Workflow destination.

## Focused automated evidence

Normal Windows commands: npx tsc --noEmit; node --test test/renderer/greenfield-shell-composition.test.cjs. Both exit 0. Five checks pass: all eighteen adapter mappings; repeated exact identities; shared manual review/Repair/terminal callbacks; SQL-only resume plus safe ephemeral inspection; all recovered shells free of service calls; no copied shell chrome; closed Greenfield dispatch with preserved other-family terminal behavior. Existing WSF19A multi-Phase SQL and source-backed integration fixtures are reused against the final build; final results appended below. No live Codex/ChatGPT browser round-trip, Electron launch, packaging, release, push or Operator visual acceptance claimed.

## Operator Greenfield audit gate

WSF20 is checkpointed implementation, not Operator acceptance. Broader failed/incomplete qualification must be reviewed using the receipts below. Run the real application on an appropriate controlled SQL Project Creation workflow and audit:

- [ ] Project Intake field/layout/disposition controls and exact resume.
- [ ] Architect Interview document/browser geometry, structured handoff and review.
- [ ] Project Planning review controls, source evidence and next-stage behavior.
- [ ] Phase Map ordering, evidence, scrolling and nested navigation.
- [ ] Phase Interview and Phase Planning for more than one SQL Phase.
- [ ] Work Card Map candidate status, dependencies, Begin Planning and read-only inspection.
- [ ] Work Card Intake and Planning, exact MCP candidate/revision review and source mode.
- [ ] Implement model/runtime selection, execution controls, approval/input handling, report and source-checkpoint status.
- [ ] Review & Validation documents, advisory, independent Tester and each applicable criterion policy.
- [ ] Direct manual Work Card Validation with Create Current Validation Attempt; no mandatory additional hop.
- [ ] Validate Passed with current proof -> terminal Work Card Close -> Map/next card.
- [ ] Controlled Request Repair with defect text, exact failure/parent context, planning, shared Implement/Review, fresh parent proof and repeated Repair when a controlled fixture is available.
- [ ] Phase Validation/Close, reviewed Closeout, next Phase and SQL reopen.
- [ ] Project Validation source integration where applicable, Project Closeout/Close, later reopen at Hub.
- [ ] Nested Project/Phase/Work Card rails throughout, alternate Validation under Review & Validation, browser hiding, keyboard/accessibility, scroll and responsive parity against 965536de.

Any material visual/workflow mismatch returns to its owning shell card. No other workflow-family rebuild follows this checkpoint without separate Operator direction.


Final normal Windows production-path command: node --test --test-name-pattern='Greenfield full SQL navigation|SQL Close Advance traverses' test/phase-planning/phase-planning-service.test.cjs; exit 0, 2/2 passed, 78356 ms. Source-backed integration/Closeout fixture passed in 57482 ms; multi-Phase repeated Repair/navigation fixture passed in 20609 ms.

Independent final catalog receipt: node tmp/wsf20-focused-receipt.cjs; explicit existing catalog owners for composition, recovered Review, Repair, manual Validation and terminal Close (not a substitute for the composed affected run). Receipt 8a675221-f9fe-485b-811d-792c058e3681; passed; sourceStable=True; counts {'tests': 16, 'pass': 16, 'fail': 0, 'skipped': 0, 'cancelled': 0, 'unavailableFiles': 0, 'blockedFiles': 0, 'unknownCountFiles': 0}; exit 0.

The broader composed receipt reports sourceStable=false and source-changed-during-validation in addition to five wider failed/incomplete owners. Renderer test harness modules appeared under its generated temporary directories during execution; no production edit was performed during that run. Four verified task-generated module files and their empty directories were removed using literal native paths without recursive cleanup. The stable independent receipt above confirms final focused evidence; the composed run remains failed/incomplete, with no full qualification claim.


## Files

- src/renderer/app/GreenfieldStageComposition.tsx
- src/renderer/app/GreenfieldWorkspace.tsx
- src/renderer/app/StructuredWorkflowWorkspace.tsx
- src/renderer/styles.css
- test/renderer/greenfield-shell-composition.test.cjs
- validation/capability-map.json

Retained active supplied card and wrote this report. Deleted nothing. Pre-existing untracked bundle inputs preserved. No new dependency, Markdown authority, schema migration, other-family renderer work or generated artifact committed.

## Validation

Normal Windows composed work-item profile: node tmp/wsf-validate.cjs tmp/wsf20-changes.json tmp/wsf20-receipt.json; per-file timeout 60000 ms. Exit 1; receipt c1a7ac7c-1f09-4d14-9f5a-cd84da821b0e; status failed; 159915 ms. Build steps: [('production-build', 'passed')].

- test/agent-harness/repository-io-hardening.test.cjs: execution-failed (timeout); {'tests': None, 'pass': None, 'fail': None, 'skipped': None, 'cancelled': None}
- test/project-state/current-project-entry.test.cjs: execution-failed (timeout); {'tests': None, 'pass': None, 'fail': None, 'skipped': None, 'cancelled': None}
- test/project-state/execution-completion.test.cjs: failed; {'tests': 25, 'pass': 19, 'fail': 6, 'skipped': 0, 'cancelled': 0}
- test/renderer/project-rail-presentation.test.cjs: failed; {'tests': 27, 'pass': 26, 'fail': 1, 'skipped': 0, 'cancelled': 0}
- test/source-control/managed-project-source.test.cjs: execution-failed (timeout); {'tests': None, 'pass': None, 'fail': None, 'skipped': None, 'cancelled': None}

Machine receipt retained locally; incomplete/failed proof is not counted as green qualification. Existing wider-suite failures are disclosed rather than fixed outside this card.

Exact staged diff reviewed; bounded secret, concrete-local-path and generated-artifact scan performed before checkpoint. No external integration, Electron launch or Operator visual acceptance claimed. Remaining Operator visual/experiential audit belongs to WSF20; no other workflow-family rebuilding authorized.
