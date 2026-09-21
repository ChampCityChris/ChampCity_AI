# WIR22 Implementer Report

## Outcome and authority

Work Card **WIR22 — Make Start Work the Canonical Workflow Hub Entry** is implemented. Its former missing production dependency is repaired. **This final implementation is NOT TESTED and runtime acceptance is not established.** The Operator explicitly directed “do no more testing this entire run”; that later direction supersedes the card's prescribed validation. Continue to WIR23 with this limitation, then merge the completed sequence directly into `dev` as separately directed. No routine approval stop is required.

## Repository and dependency evidence

- Verified current directory and Git top-level as `<PROJECT_REPO>`, on `codex/work-intake-routing-finish`, configured `origin`, without an upstream. No fetch or remote freshness claim.
- Immediate baseline: `89e5cf6`, including separately authored test-governance documentation. Independent commits and files were preserved.
- Dependency checkpoints: WIR22-REPAIR06B `87cc8c9687806c9ff52bfd281f1635dc69e012be`; WIR22-REPAIR06 `32e6f793d0c6a38459931ad0cedfbf484cb89c19`; WIR04-REPAIR01 `2bc43c4f2c59588ef73f32a7ee8ad2abb1b01184`.
- Necessary additional WIR22-REPAIR07, checkpoint `a0214f987fd72135a48ad9653e235d08078ed499`, connects current Issue completion and checkpoint evidence to the existing shared integration service. Its card/report document the inspected gap and narrow repair.
- Read the current WIR22 card, governing architecture, earlier blocked report, necessary WIR16 evidence and current repaired service contracts. WIR23 was not preloaded.

## Implementation and source evidence

| Requirement | Implemented source and behavior |
| --- | --- |
| Canonical Start Work | `WorkflowHubWorkspace.tsx` exposes Start Work after project selection; `App.tsx` opens existing Work Intake without choosing a route. Existing workflow entries remain accessible under legacy recovery. |
| Actual routed execution | Approved non-Issue Plans mount `RoutedExecutionPanel`; main-process `routedWorkflowService.ts` delegates binding, Work Card drafting/review, Codex execution, report review, validation, Repair, close, and Phase/Plan acceptance to existing owners. |
| Issue continuation | Intake routing passes the current Issue identifier to the existing Issue workspace. The routed Issue panel presents generic execution evidence and uses the same candidate/Integration Repair service after completion. |
| Service-owned progression | The model exposes route, direct/phased topology, actual branches, Plan, Work Item/Repair identity, real Phase when present, checkpoints, integration validation and Repair state. Main-process action availability and existing services enforce current fingerprints, revisions and ownership. |
| Existing runtime | Existing Codex model picker, environment status, console and approval/input/elicitation UI are reused. The session owner exposes its exact running routed session so cancel and runtime responses remain available when governing evidence becomes stale. |
| Integration Repair | Existing candidate and policy owners prepare the bounded handoff, validate/apply patches, complete Repair, run configured candidate validation, advance the target, or retain an explicit Operator-decision result. The UI copies the existing handoff and accepts its bounded patch response. |
| Constrained boundary | `routedWorkflow:action` resolves the selected repository in main and uses a typed preload API. Current canonical contract/report reads use owner-derived exact paths and a size bound. |

Candidate validation controls describe implemented product behavior; none were exercised during this pass. Direct Plans do not acquire synthetic Phases. Renderer state contains presentation and unsaved form input, not durable workflow authority. Project selection and legacy services remain in place.

## Attributable files

Created:

- `src/main/planExecution/routedWorkflowService.ts`
- `src/shared/routedWorkflowContracts.ts`
- `src/renderer/app/RoutedExecutionPanel.tsx`

Modified:

- `src/main/main.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkflowHubWorkspace.tsx`
- `src/renderer/app/WorkIntakeWorkspace.tsx`
- `src/renderer/app/WorkRoutingAssessmentPanel.tsx`
- `src/renderer/app/WorkRouteDecisionPanel.tsx`
- `src/renderer/app/WorkPlanningPanel.tsx`
- `src/renderer/app/WorkIssuePanel.tsx`
- `src/renderer/styles.css`
- This report, replacing the superseded dependency-blocked report.

Deleted: none. Intentionally not created: another execution engine, alternate workflow state, synthetic Phases, JSON workflow sidecars, dependencies, generated outputs, screenshots or permanent tests.

## Inspection, skipped validation and safety

Read-only restricted Windows inspection used `Get-Location`, `Get-Content`, `rg`, `git rev-parse --show-toplevel`, `git remote`, `git branch --show-current`, `git status --short`, `git log -5 --oneline`, and scoped `git diff -- <paths>`. Source inspection traced the IPC/preload/UI call chain and concrete service signatures. Two lookups used nonexistent guessed source paths and were corrected with `rg`; those reads are not validation evidence.

The following card commands were **not run**; lane and exit result are **not applicable**, because the Operator prohibited all further testing:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/renderer/workflow-hub-shell.test.cjs test/renderer/figma-redesign-shell.test.cjs test/characterization/desktop-development-lifecycle.test.cjs test/characterization/desktop-issue-lifecycle.test.cjs`

No launch smoke, visual capture, external integration exercise, full regression or replacement validation was performed. Earlier repair results belong to their own reports and do not establish WIR22 acceptance. Existing tests preserved unchanged; modified, consolidated, retired and new permanent tests: none.

The exact attributable staged diff was inspected. The bounded staged secret, concrete-local-path and generated-artifact scan completed in the restricted Windows lane, exit 0, with no flags. This source-control safety inspection is not product testing. Only the attributable files above are included.

## Checkpoint and remaining acceptance

Operator-directed checkpoint message: `WIR22: Make Start Work the Canonical Workflow Hub Entry`. Hash pending at report write; record it in the next card's ledger without amending solely for the hash. No push, tag, release, merge or history rewrite during this card. Final `dev` merge follows WIR23 under separate Operator direction.

Remaining manual Operator validation: actual Intake layout and keyboard/scroll behavior; Start Work and legacy recovery; direct/phased execution through validation/Repair and close; Issue continuation and resolution; real source checkpoint and clean/conflicted integration with Integration Repair. Compilation and automated regression after the final changes are also unverified. No product or architecture decision blocker was discovered. Next card: **WIR23**.
