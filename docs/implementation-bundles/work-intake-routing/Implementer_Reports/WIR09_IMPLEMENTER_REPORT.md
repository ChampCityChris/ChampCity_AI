# WIR09 Implementer Report

## Baseline and scope

Work Card **WIR09 — Implement Feature / Capability Change Planning Profile** passes focused automated acceptance. The checkpoint hash remains pending the single harness commit containing this report and will be recorded in the execution response.

- Verified approved repository root/Git top-level as `<PROJECT_REPO>`; branch `codex/work-intake-routing`, no upstream, `origin` configured, no remote operation.
- Starting checkpoint `91fbfec6b390e1be2ac60a5c4049873d8e386270` (WIR08), exact five-file set, clean tree/index. Required WIR07 dependency report and implementation remain present and passing.
- Revisited Feature/shared-kernel/topology architecture. Governing SHA-256 remains `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`; no contradiction or unrelated change found.
- Inspected registry/kernel, existing Project Planning composition/handoffs, required tests, and capability-map entries. No future card loaded.

## Attributable files

Created:

- `src/main/workPlanning/profiles/featureProfile.ts`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR09_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/workPlanning/workPlanningProfiles.ts`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`

Deleted: none. Intentionally not created: a new Project for the feature, whole-product roadmap replacement, forced Phases, private orchestration/execution code, Git operations, dependencies, migrations, or sidecars.

## Implementation and evidence

- Registered Feature content with the shared kernel, leaving Greenfield and other route content unchanged.
- Evidence/discovery centers on the existing product baseline, requested capability delta, preserved behavior/contracts, affected services/state/UI, integration points, compatibility/rollout/recovery, and regression boundaries.
- Unrelated known roadmap improvements remain outside the Intake unless demonstrated hard dependencies; the profile requires their evidence and minimal prerequisite scope. Work Item/Phase candidates must trace to the delta or those prerequisites. Existing-product work must not recreate Project Intake or regenerate the whole roadmap.
- Both direct and phased topology remain available based on actual dependencies, rollout milestones, and acceptance boundaries, with explicit Operator Plan review through the existing kernel.
- Required assessment and Plan sections enforce baseline/delta/preservation, affected architecture, rollout/regression proof, excluded work, and candidate traceability. The production test rejects an otherwise valid generic assessment missing Feature baseline coverage, then promotes a bounded export assessment and a one-item direct export Plan. Existing roadmap bytes remain unchanged.
- Kernel freshness, review, identity, draft/promotion, and execution boundaries are reused. No current execution behavior changed.

## Validation

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0 |
| `npm run build` | Approved normal Windows | Exit 0 |
| `node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/architect-outputs/architect-output-prompt-contracts.test.cjs` | Approved normal Windows | Exit 0; 31 passed, none failed/skipped |
| `git diff --check` | Read-only restricted Windows | Exit 0 |

Process-heavy commands use the approved normal Windows lane following the observed WIR01 restricted `spawn EPERM`. Product Git calls use disposable fixtures. Full regression remains with WIR23; no external integration, launch, or visual acceptance claimed.

Test categories: existing Project Planning/shared direct-phased lifecycle and Architect prompt contracts reused unchanged. One permanent Feature case extends the existing prompt suite to cover profile-specific required sections, failed generic output, bounded candidate promotion, and preserved roadmap bytes. No consolidation/retirement; capability map unchanged.

## Checkpoint and safety

Intended message: `WIR09: Implement Feature / Capability Change Planning Profile`. Exactly the four files above are attributable. Stage/commit through the supplied ChampCity harness; shell Git read-only. No amendment, merge, push, tag, release, or publication.

Durable references are relative. No secrets, local home paths, generated/dependency artifacts, or archive runtime imports were added. Exact staged diff was inspected; `git diff --cached --check` and the bounded credential/private-key/home-path content scan passed. Harness `pre_commit_scan` succeeded with only eight unchanged, unstaged baseline branding PNG findings; none is attributable to this card. The final report change is re-inspected after staging.

## Next action

No automated blocker, scope deviation, or material Operator decision remains. After verifying the single checkpoint, read WIR10 and its dependency reports.
