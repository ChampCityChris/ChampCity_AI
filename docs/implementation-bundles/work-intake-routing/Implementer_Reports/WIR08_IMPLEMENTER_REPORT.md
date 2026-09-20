# WIR08 Implementer Report

## Baseline and outcome

Work Card **WIR08 — Implement Greenfield / New Product Planning Profile** passes focused automated acceptance. The checkpoint hash is pending the single harness commit containing this report and will be recorded in the execution response.

- Verified approved repository root/Git top-level as `<PROJECT_REPO>`, branch `codex/work-intake-routing`, no upstream, configured `origin`, no remote operation.
- Starting checkpoint `aabc029e101b1e13a54bdef403b4472181bb5520` (WIR07), exact twelve-file set, clean tree/index, passing dependency report.
- Revisited the adopted Greenfield/shared-kernel/topology architecture and WIR07 contracts. Governing hash remains `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`. No contradiction or unrelated changes found.
- Inspected current Project Architect prompt/interview and Project Planning prompt semantics, profile registry, named tests, and capability-map records. No future card loaded.

## Attributable changes

Created:

- `src/main/workPlanning/profiles/greenfieldProfile.ts`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR08_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/workPlanning/workPlanningProfiles.ts`
- `test/architect-interview/architect-interview-workspace.test.cjs`
- `test/support/work-intake-fixtures.cjs`

Deleted: none. Intentionally not created: separate Greenfield services, Feature/Refactor fallback prompts, execution behavior, Git operations, migrations, dependencies, or sidecars. Existing-product profile content and legacy workflow services remain unchanged.

## Implementation and evidence

- Added Greenfield evidence/discovery/output content as data consumed by WIR07. Registry composition preserves shared sections/topology rules while applying bespoke content only to `greenfield`.
- Discovery covers product/user outcomes, complete capabilities and workflows, architecture/runtime/deployment, data/state lifecycle, external dependencies, non-functional constraints, acceptance, readiness, sequencing, exclusions, and explicit deferrals.
- Existing briefs, adopted architecture, repository source/configuration, and established product intent must be inspected before questions. Repository-known facts are derived; only unresolved material Operator-owned decisions become questions, with zero questions permitted when evidence resolves coverage.
- MVP/POC framing requires explicit approved evidence. The profile prohibits silently reducing intended capability scope or manufacturing foundation work. Both direct and phased delivery remain possible based on actual dependency/acceptance boundaries.
- Shared prepare/copy/draft promotion and explicit assessment/Plan review remain the only workflow path. The profile defines additional assessment and Plan sections without creating a private orchestration stack.
- A curated new-product fixture drives the production shared kernel: Greenfield instructions are checked for required discovery and conditional MVP semantics; a substantive study-planner assessment promotes Pending, explicit review approves it, and Plan handoff includes capability coverage, non-functional acceptance, readiness, and deferral contracts. The test confirms existing-product profiles do not inherit this discovery content.

## Validation

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0 |
| `npm run build` | Approved normal Windows | Exit 0 |
| `node --test --test-concurrency=1 test/architect-interview/architect-interview-workspace.test.cjs test/project-planning/project-planning-service.test.cjs` | Approved normal Windows | Exit 0; 34 passed, none failed/skipped |
| `node --test --test-concurrency=1 --test-name-pattern=Greenfield test/architect-interview/architect-interview-workspace.test.cjs` | Approved normal Windows | Exit 0; 1 passed after final profile-isolation assertion refinement |
| `git diff --check` | Read-only restricted Windows | Exit 0 |

The normal Windows process lane follows the known WIR01 restricted `spawn EPERM`; no redundant retry. Product Git calls are confined to disposable fixtures. Full regression remains with WIR23; no external integration, launch, or visual acceptance is claimed.

Test categories: legacy Architect Interview and Project Planning cases plus WIR07's direct/phased lifecycle reused unchanged. One permanent Greenfield lifecycle case extends the existing interview suite to cover new profile selection/content/promotion boundaries not previously exercised. The fixture helper accepts bounded intent overrides for a representative new-product scenario. No tests consolidated/retired; capability map unchanged.

## Checkpoint and safety

Intended message: `WIR08: Implement Greenfield / New Product Planning Profile`. Exactly the five files above are attributable. Use the supplied ChampCity harness for stage/commit; shell Git remains read-only. No amendment, merge, push, tag, release, or publication.

Durable references are repository-relative; no secrets, home paths, generated artifacts, dependency state, or archive runtime imports were introduced. Exact staged diff was inspected; `git diff --cached --check` and the bounded credential/private-key/home-path content scan passed. Harness `pre_commit_scan` succeeded with only eight unchanged, unstaged baseline branding PNG findings; none applies to this card. The final report is re-inspected after staging.

## Next action

No automated blocker, scope deviation, or material Operator decision remains. After the verified single checkpoint, read WIR09 and required dependency reports.
