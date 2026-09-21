# WIR23-REPAIR01 Implementer Report

## Outcome and repository evidence

Repair Card **WIR23-REPAIR01 — Enforce Route Decision State and Non-Destructive Reroute Retention** is implemented with focused production-path proof. A normal selected route is no longer a legal decision boundary; reroute dispositions that retain the effective route preserve the authoritative selection identity and all route-scoped downstream artifacts. Repository-wide build/test acceptance remains blocked by three pre-existing TypeScript errors in `src/main/planExecution/routedWorkflowService.ts` lines 142-143, outside this Repair Card.

- Verified the approved repository and Git top-level as `<PROJECT_REPO>`.
- Branch: `codex/work-intake-routing-finish`, with no configured upstream shown by status.
- Starting checkpoint: `f43b543b290724d7c34a6b6578aafa0a89e4db09`.
- `origin` is configured. No fetch or remote-freshness claim was made.
- The working tree was clean before this repair.

## Confirmed root cause and resulting rules

The service projected the original assessment as decision evidence after selection and did not enforce decision legality from the durable route state. It also superseded downstream lineage whenever any prior selection existed, regardless of whether the effective route changed. A same-route reroute override additionally produced a new authoritative decision ID, which would disconnect otherwise preserved planning/execution artifacts whose identity is route-decision-scoped.

The resulting state-transition rules are:

1. `decideWorkRoute` accepts decisions only in `awaiting-decision` or `reroute-required`. `selected`, `awaiting-assessment`, `revision-requested`, and `stale` are not legal decision boundaries.
2. Initial Accept/Override establishes an effective selection. A normal selected route rejects later Accept, Override, and Request Revision calls until new reroute advice exists.
3. A pending reroute is identified by its exact recommendation ID and source revision. An exact recorded disposition resolves that recommendation; a later revised recommendation becomes a new `reroute-required` boundary.
4. Accept or Override to a different route changes the effective selection, creates supersession evidence, and historicalizes only explicit downstream lineage.
5. Override to the currently selected route records the Operator disposition and advice in history while retaining the prior authoritative selection/decision ID. It creates no supersession and does not write downstream artifacts.
6. Request Revision records the disposition, keeps the prior selection authoritative, creates no supersession, preserves downstream bytes, and reports `revision-requested` until new advice exists.
7. The renderer presents Accept/Override/Request Revision controls only for the two legal pending states. Service validation remains authoritative.
8. Active reroute freshness checks and existing assessment freshness checks still fail closed before a disposition is written.

## Attributable files

Created:

- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR01_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/workIntake/workRouteDecisionService.ts`
- `src/renderer/app/WorkRouteDecisionPanel.tsx`
- `test/architect-outputs/architect-output-workspace-repair.test.cjs`

Deleted: none.

Intentionally not created or changed: route taxonomy, automatic route selection, renderer-owned authority, dependencies, schema/migration/compatibility paths, JSON sidecars, Intake identity, branch lifecycle, Issue Resolution reframe behavior, packaging, or generated artifacts.

The existing production-path route lifecycle test was extended rather than adding a new permanent test. It already owns the service/IPC/preload/reroute boundary, and the added assertions cover the newly specified state, retention, and renderer regression without creating overlapping ownership.

## Exact proof exercised

- Production main/preload path: initial revision request and revised advice, stale presented assessment rejection, initial Accept, and rejection of a second Accept, valid Override, and Request Revision in ordinary `selected` state.
- Real reroute: Accept changed `feature-change` to `integration-composition`; the explicit downstream assessment/Plan lineage became historical, unrelated evidence and the original Intake remained unchanged, and the Work Intake branch/Git HEAD were preserved.
- Non-destructive reroute: Override selected the already-effective `integration-composition` route; history recorded the exact reroute recommendation and disposition, the prior selection decision ID remained authoritative, supersession count was unchanged, and downstream files remained byte-identical.
- Reroute revision: Request Revision retained the same authoritative selection, wrote `RevisionRequested` on reroute advice, created no supersession, preserved downstream bytes, and rejected another decision until revised advice exists.
- Renderer: server-rendered `WorkRouteDecisionControls` was present for `awaiting-decision` and `reroute-required`, and absent for `selected`, `revision-requested`, and `stale` projections.
- Existing Issue Resolution production service proof passed unchanged, including changed reroute evidence rejection before Accept and successful current-evidence reroute.

## Validation record

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 1; only three pre-existing TS2339 errors in `src/main/planExecution/routedWorkflowService.ts` lines 142-143. No diagnostic referenced an attributable file. |
| `npm run build` | Restricted Windows | Exit 1; generated-output writes were denied with `EPERM`, plus the same three unrelated TS2339 diagnostics. Per lane policy, it was not counted as a source failure or pass. |
| `npm run build` | Approved normal Windows | Exit 1; TypeScript emitted the changed service, then the command stopped on the same three pre-existing TS2339 errors before Vite. Repeated after final service adjustments with the same result. |
| `node --test --test-concurrency=1 test/architect-outputs/architect-output-workspace-repair.test.cjs` | Restricted Windows | Exit 1 with `spawn EPERM`; rerun in the normal Windows lane. |
| `node --test --test-concurrency=1 test/architect-outputs/architect-output-workspace-repair.test.cjs` | Approved normal Windows | Intermediate exit 1: 26 passed and the extended route test exposed a resolved-reroute state defect. That defect was corrected. |
| `node --test --test-concurrency=1 --test-name-pattern="Operator route decisions" test/architect-outputs/architect-output-workspace-repair.test.cjs` | Approved normal Windows | Final exit 0; 1 selected production-path lifecycle passed, none failed/skipped. |
| `node --test --test-concurrency=1 --test-name-pattern="routed defect preserves Intake" test/issue-resolution/issue-architect-planning-service.test.cjs` | Approved normal Windows | Exit 0; 1 selected existing Issue/reroute/stale-evidence lifecycle passed, none failed/skipped. |
| `npm test` | Approved normal Windows | Exit 1 during its build prerequisite on the same three pre-existing TS2339 errors; unit execution was not reached. |
| `node --check test/architect-outputs/architect-output-workspace-repair.test.cjs` | Restricted Windows | Exit 0. |
| `git diff --check` | Restricted Windows | Exit 0. |

No Electron launch smoke, packaging, visual acceptance, external integration, or full post-build regression is claimed. The focused service and renderer proof is passing; the unrelated typecheck baseline is the only validation blocker recorded here.

## Git, safety, deviations, and residual risk

No Git mutation was authorized or performed: no stage, commit, push, merge, rebase, tag, reset, clean, restore, or stash. Commit hash for this repair is therefore not applicable.

No secrets, credentials, concrete local-machine paths, generated output, dependency state, archive runtime imports, or unrestricted renderer filesystem access were introduced. A final bounded diff/safety scan is recorded after this report is written.

Deviation from ideal acceptance: canonical `typecheck`, `build`, and `npm test` cannot pass until the unrelated `routedWorkflowService.ts` union narrowing errors are repaired. This card did not broaden into that source-control/workflow work. Remaining code-level risk is limited to repository-wide interactions not reachable because that baseline blocks the canonical suite; the affected routing and Issue paths were exercised directly from emitted production modules. No manual product judgment is required for the state-machine repair itself.

## Return path

Return to Architect code review of the Work Intake Routing package, carrying the unrelated `routedWorkflowService.ts` validation blocker as separate follow-up work.
