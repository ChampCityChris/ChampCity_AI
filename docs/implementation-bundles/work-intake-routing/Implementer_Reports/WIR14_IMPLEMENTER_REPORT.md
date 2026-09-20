# WIR14 Implementer Report

## Baseline and scope

Work Card **WIR14 — Integrate Issue Resolution with Universal Work Intake Routing** passes focused automated acceptance. Checkpoint hash is pending the single harness commit containing this report and will be reported after verification.

- Verified approved repository/Git root as `<PROJECT_REPO>`; branch `codex/work-intake-routing`, no upstream, `origin` configured. No remote operation.
- Starting checkpoint `da77ae8555a00a890b5f59064f5543acf60ce5ef` (WIR13), exact seven-file set, clean tree/index. Required WIR06 and WIR07 reports/contracts remain passing and consistent.
- Revisited governing Issue/RCA, general reroute, shared planning, source identity, and topology requirements; architecture SHA-256 remains `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`. No contradiction or unrelated changes. No future card loaded.
- Inspected current Issue discovery/evidence/RCA, review and planning projections, renderer workspaces, WIR routing/kernel, required suites, desktop close characterization, and capability-map entries.

## Attributable files

Created:

- `src/main/workPlanning/workIssueContext.ts`
- `src/main/workPlanning/workIssueRoutingService.ts`
- `src/main/workPlanning/profiles/issueResolutionProfile.ts`
- `src/renderer/app/WorkIssuePanel.tsx`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR14_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/issueResolution/issueResolutionService.ts`
- `src/main/workIntake/workRouteDecisionService.ts`
- `src/main/workPlanning/workPlanningKernel.ts`
- `src/main/workPlanning/workPlanningProfiles.ts`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/issueResolutionContracts.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/WorkPlanningPanel.tsx`
- `src/renderer/app/WorkRouteDecisionPanel.tsx`
- `test/issue-resolution/issue-architect-planning-service.test.cjs`

Deleted: none. Intentionally not created: generic correction executor, copied Issue implementation loop, mandatory Phases, host provisioning, dependencies, migrations, JSON sidecars, or product Git mutation.

## Implementation and acceptance evidence

- A main-owned routed Issue adapter verifies the selected Intake branch/route and creates an existing-format Issue record plus canonical handoff preserving Project/Intake/decision identity, source revisions, evidence, and branch binding. Creation reuses the existing screenshot validation/persistence and cleanup mechanism; canonical handoff failure rolls back the newly created Issue. Repeated open reuses the linked Issue.
- RCA preparation, temporary-draft validation/promotion, investigation/history, and explicit review reuse current Issue services. Record hashes prevent stale handoff copy/promotion. Routed review additionally requires the exact presented evidence digest; changed Issue/RCA/review content cannot be approved through an outdated UI projection.
- The adapter projects reviewed original RCA into the common canonical route assessment with explicit lineage and digests of Issue record, investigation, and review. Only a current Approved Proceed review enables correction planning. Generic assessment drafting/review cannot bypass RCA, and later RCA/review edits invalidate the Plan source. No second Operator approval layer is added.
- The Issue profile plans bounded root-cause correction, preservation/regression proof, and acceptance through the common Plan contract. Direct represents a simple correction; phased represents genuine root-cause milestones/dependencies. Routed RCA does not manufacture the legacy Fix Card Plan. Actual generic execution remains with WIR18.
- Existing Reframe recommendations generate WIR06 advisory `feature-change` reroutes. The Operator may accept or override; selected route/branch remain unchanged until the explicit route decision. Canonical RCA content freshness is checked before reroute acceptance. Existing lineage supersession marks the routed handoff, assessment, and downstream Plan historical while preserving original Issue files.
- Main/preload expose a bounded Intake-based action API. Shared route UI opens RCA, copies/checks handoffs, reviews evidence, exposes general rerouting, and enters shared correction Plan review. Existing Issue screenshot, validation, close, and recovery workspaces remain available.
- Production IPC/service proof exercises creation rollback/idempotency, branch lineage, RCA gating, phased correction, changed-source/presented-evidence rejection, advisory reframe, explicit Operator selection, and supersession with unchanged original Issue record and Git HEAD. Existing screenshot and close/validation characterization is reused.

## Validation

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0; repeated after final changes |
| `npm run build` | Approved normal Windows | Exit 0; repeated after final changes |
| `node --test --test-concurrency=1 test/issue-resolution/issue-resolution-service.test.cjs test/issue-resolution/issue-architect-planning-service.test.cjs test/characterization/desktop-issue-lifecycle.test.cjs` | Approved normal Windows | Final exit 0; 26 passed, none failed/skipped |
| `node --test --test-concurrency=1 --test-name-pattern="Operator route decisions" test/architect-outputs/architect-output-workspace-repair.test.cjs` | Approved normal Windows | Exit 0; 1 selected existing lifecycle passed |
| `node --test --test-concurrency=1 --test-name-pattern="shared planning kernel" test/project-planning/project-planning-service.test.cjs` | Approved normal Windows | Exit 0; 1 selected existing lifecycle passed |
| `git diff --check` | Read-only restricted Windows | Exit 0 |

The initial required suite passed 26 tests. After extending reroute freshness proof, one intermediate run exited 1 (25 passed, 1 failed) solely because its assertion expected the word `stale` rather than the actual `Route evidence content changed` error; the operation correctly blocked. Corrected the assertion and added the final presented-evidence review guard before rerunning. Normal process execution follows the WIR01 restricted `spawn EPERM`; disposable Git fixtures only. Full regression remains WIR23. No external integration, launch, visual acceptance, or packaging claimed; no card-local manual validation required.

Test categories: Issue evidence/screenshots, legacy RCA review/history, and desktop close cases reused. Existing handoff case extended for stale record copy/promotion. One new permanent routed lifecycle case covers the previously absent universal Intake/RCA/shared planning/reroute boundary. Existing WIR06 route and WIR07 direct/phased kernel lifecycles selected as additional regressions because source-digest checking and kernel source assembly changed. No consolidation or retirement; capability map unchanged.

## Checkpoint and safety

Intended message: `WIR14: Integrate Issue Resolution with Universal Work Intake Routing`. Exactly the sixteen files above are attributable. Harness owns staging/commit; shell Git is read-only. No amendment, merge, push, tag, release, or publication.

Exact staged diff inspected; `git diff --cached --check` and bounded credential/private-key/home-path scan passed. Harness `pre_commit_scan` succeeded with only eight unchanged, unstaged baseline branding PNG warnings, none attributable to this card. Final report edit re-inspected after staging. Durable references are relative; no secrets, concrete local paths, generated/dependency artifacts, or archive runtime imports introduced.

## Next action

After passing focused validation and verifying the checkpoint, read WIR15 and required dependency reports. No scope deviation or material Operator decision identified.
