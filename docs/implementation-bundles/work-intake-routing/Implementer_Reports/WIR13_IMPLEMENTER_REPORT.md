# WIR13 Implementer Report

## Baseline and scope

Work Card **WIR13 — Implement Research / Prototype Planning Profile** passes focused automated acceptance. Checkpoint hash is pending the single harness commit containing this report and will be reported after verification.

- Verified approved repository/Git root as `<PROJECT_REPO>`; branch `codex/work-intake-routing`, no upstream, `origin` configured. No remote operation.
- Starting checkpoint `cd4edec554b6c73351974a259cc721c9875d5826` (WIR12), exact four-file set, clean tree/index. WIR07 dependency implementation/report remain passing and consistent.
- Revisited governing research, kernel, topology, and evidence-only completion requirements; architecture SHA-256 remains `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`. No contradiction or unrelated changes; no future card loaded.
- Inspected kernel/profile registry, planning/domain contracts, canonical review/writer semantics, renderer planning controls, required suites, and capability-map entries.

## Attributable files

Created:

- `src/main/workPlanning/profiles/researchPrototypeProfile.ts`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR13_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/workPlanning/workPlanningProfiles.ts`
- `src/main/workPlanning/workPlanningKernel.ts`
- `src/shared/workPlanningContracts.ts`
- `src/renderer/app/WorkPlanningPanel.tsx`
- `test/project-planning/project-planning-service.test.cjs`

Deleted: none. Intentionally not created: production prototype promotion, mandatory Plan/Phase/Work Item, bespoke execution engine, extra approval layer, new dependencies, sidecars, or product Git mutations.

## Implementation and acceptance evidence

- Research-specific discovery covers the question/hypothesis, decision enabled, alternatives, bounded experiment/prototype, evidence, success/failure and inconclusive results, output classification, timebox, and closure. Delivery-oriented Feature/Greenfield assumptions are explicitly excluded.
- A bounded `champcity-research-outcome` block lives in the canonical assessment body and is projected into application-owned workflow metadata. It requires findings/evidence, decision enabled, closure condition, disposable/candidate-for-later-work classification, and an explicit no-Plan or bounded-research-Plan recommendation. Unknown fields, invalid choices, empty evidence, duplicate blocks, or implicit candidate promotion fail closed.
- The shared kernel's existing review is the Operator decision. Fresh, Approved evidence with `no-implementation-plan-required` produces durable research closure; pending AI output cannot close it. Revision requests or stale sources remove closure. No additional mandatory decision artifact/approval layer is invented.
- Approved no-Plan outcomes block Plan creation at the main-service boundary. A candidate for later work requires `new-work-intake-required`; any production follow-up needs explicit new planning. Remaining experiments may use the common direct/phased research Plan path without authorizing production.
- Shared UI displays closure, output classification, and required follow-up; approval is labeled as approval of the research outcome. Closed research disables Plan selection. The service remains authoritative.
- Production lifecycle proof rejects missing structured outcome, promotes evidence, verifies Pending cannot close, approves closure, reloads closure from canonical state, refuses Plan creation, creates no fake candidates, and reopens review on revision request. Parser proof covers both output classifications, explicit later-work requirements, remaining research, and invalid production promotion. Fixture HEAD is unchanged.

## Validation

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0 |
| `npm run build` | Approved normal Windows | Exit 0 |
| `node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/documents/canonical-markdown-document.test.cjs` | Approved normal Windows | Exit 0; 31 passed, none failed/skipped |
| `git diff --check` | Read-only restricted Windows | Exit 0 |

Normal Windows execution follows the known WIR01 restricted `spawn EPERM`. Git fixture checks are disposable. Full regression remains with WIR23. No launch, visual acceptance, external integration, or packaging claimed; no manual validation required by this card.

Test categories: existing canonical and prior planning cases reused unchanged. One new permanent lifecycle case covers the previously absent evidence-only closure/Operator authority and prototype promotion boundary; invalid-domain cases are included in that same capability case. No consolidation or retirement; capability map unchanged.

## Checkpoint and safety

Intended message: `WIR13: Implement Research / Prototype Planning Profile`. Exactly the seven files above are attributable. Stage/commit use the supplied harness; shell Git is read-only. No amendment, merge, push, tag, release, or publication.

Exact staged diff inspected; `git diff --cached --check` and bounded credential/private-key/home-path scan passed. Harness `pre_commit_scan` succeeded with only eight unchanged, unstaged baseline branding PNG warnings, none attributable to this card. Final report edit re-inspected after staging. Durable references are relative; no secrets, local paths, generated/dependency artifacts, or archive runtime imports introduced.

## Next action

After focused validation and the verified checkpoint, read WIR14 and its dependency reports. No scope deviation or material Operator decision identified.
