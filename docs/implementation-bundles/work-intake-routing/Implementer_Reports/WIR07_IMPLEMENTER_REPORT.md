# WIR07 Implementer Report

## Baseline and scope

Work Card **WIR07 — Build Shared Planned-Work Planning Kernel and PlanTopology Contract** passes focused automated acceptance. The checkpoint hash remains pending the single harness commit containing this report and will be recorded in the execution response.

- Verified approved repository root/Git top-level as `<PROJECT_REPO>`; branch `codex/work-intake-routing`, no upstream, `origin` configured. No remote operation performed.
- Starting checkpoint `efd2bae38e509fe38eb0aeb146632ac46f7199e1` (WIR06), exact ten-file set, clean tree/index, passing dependency report.
- Re-read architecture sections covering shared mechanics, profile responsibilities, topology, execution boundaries, and persistence. Hash remains `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`; no contradiction found.
- Inspected existing Project/Phase planning, Phase Map, Work Card Intake, Architect registry/runtime/promotion, candidate domain blocks, canonical review/freshness, relevant test suites, and capability-map entries. No future card loaded.

## Attributable files

Created:

- `src/shared/workPlanningContracts.ts`
- `src/main/workPlanning/workPlanningProfiles.ts`
- `src/main/workPlanning/workPlanStructure.ts`
- `src/main/workPlanning/workPlanningKernel.ts`
- `src/renderer/app/WorkPlanningPanel.tsx`
- `test/support/work-intake-fixtures.cjs`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR07_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/WorkRouteDecisionPanel.tsx`
- `test/project-planning/project-planning-service.test.cjs`

Deleted: none. Intentionally not created: full bespoke profile content, private route execution engines, Development/Issue migration, another topology, Git mutation mechanics, dependencies, sidecars, or service/browser changes.

## Implementation and proof

- A single kernel resolves the explicit Operator-selected route to one profile. Profile data declares evidence, discovery questions, assessment/Plan sections, and topology criteria. Default entries remain minimal contracts for all seven routes; future profile content does not require duplicating orchestration.
- Route-scoped assessment/Plan identities include Project, Intake, selected route, and decision identity. Revisions retain the artifact's assessment/Plan identity. Canonical Markdown records exact source revisions and source digests; path containment and bounded reads apply throughout.
- Shared prepare/copy/status/review use the existing Architect output runtime, registry, canonical writer, promotion, and cleanup. Copy resolves current prepared evidence without promotion. Source/review/profile changes supersede pending submissions. Existing outputs require a revision request or stale-source recovery before replacement.
- Plan drafting requires the current approved assessment. Promoted output starts Pending; explicit approval/revision/rejection checks the presented revision and source freshness. Revision notes enter the next handoff. A route decision with pending reroute/revision or stale Intake cannot start planning.
- `PlanTopology` has only `direct` and `phased`. The reviewed Markdown domain block contains topology rationale, Plan acceptance criteria, and ordered/dependency-aware Work Item candidates. Direct Plans prohibit Phase fields. Phased Plans require explicit nonempty Phases, dependencies, membership, and Phase criteria. Validation rejects unknown dependencies, duplicate IDs, execution-state injection, and cycles across combined Phase barriers and Work Item dependencies.
- Main/preload and a shared planning panel expose assessment/Plan prepare, copy, submitted-draft checks, and explicit review. Topology is visible reviewed Plan content. No route ID selects an implementation loop and no execution workflow is retired.
- The new production IPC lifecycle case uses an Operator override to prove profile resolution, then runs direct and phased Plans through the same kernel, retains Plan identity across revision, requires explicit topology approval, rejects stale review, and verifies unchanged Git HEAD and absence of legacy Phase execution output.

## Validation

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0 |
| `npm run build` | Approved normal Windows | Exit 0 |
| `node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/phase-map/phase-map-service.test.cjs test/phase-planning/phase-planning-service.test.cjs` | Approved normal Windows | Exit 0; 38 passed, none failed/skipped |
| `git diff --check` | Read-only restricted Windows | Exit 0 |

The approved normal Windows process lane follows the known WIR01 restricted `spawn EPERM`; no repeated restricted attempt. Product Git calls use disposable fixtures. Full regression remains with WIR23. No external integration, launch, or visual acceptance is claimed; packaging is outside scope.

Test categories: existing Project Planning, Phase Map, and Phase Planning cases reused unchanged. One permanent lifecycle case extends Project Planning to cover the previously absent common profile/Plan-topology/revision/IPC boundaries. A test-only fixture helper seeds a routed Work Intake through production services and supplies reusable curated baseline evidence. No tests consolidated or retired; capability map unchanged.

## Checkpoint and safety

Intended message: `WIR07: Build Shared Planned-Work Planning Kernel and PlanTopology Contract`. Checkpoint contains exactly the twelve files listed above. Stage/commit use the supplied ChampCity harness; shell Git is read-only. No merge, amendment, push, tag, release, or publication.

No secrets, concrete home paths, generated artifacts, dependency state, or archive imports were introduced. Durable references are repository-relative. Exact staged diff was inspected; `git diff --cached --check` and the bounded staged credential/private-key/home-path scan passed. Harness `pre_commit_scan` succeeded and reported only eight unchanged, unstaged baseline branding PNGs, with no finding attributable to this card. The final report change is re-inspected after staging.

## Remaining work

No automated blocker, scope deviation, or material Operator decision remains. After checkpoint verification, read WIR08 and its dependency reports. Full profile content and execution adapters remain with their owning later cards.
