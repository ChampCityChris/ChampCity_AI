# WIR15 Implementer Report

## Baseline and scope

Work Card **WIR15 — Add Formal Work Card Decomposition and Topology Correction Safety Valve** passes focused automated acceptance. Checkpoint hash is pending the single harness commit containing this report and will be reported after verification.

- Verified approved repository/Git root as `<PROJECT_REPO>`; branch `codex/work-intake-routing`, no upstream, `origin` configured. No remote operation.
- Starting checkpoint `3805827871e8b2a0cb95bf43860b26cab4ebac2f` (WIR14), clean tree/index before this card. Required WIR07 report and current shared planning contracts verified.
- Revisited governing boundedness, decomposition, Operator authority, identity/history, and topology requirements. Architecture SHA-256 remains `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`. No contradiction or unrelated changes. No future card loaded.
- Inspected Formal Work Card planning/intake, shared Architect draft/promotion services, Plan contracts/presentation, required suites, and capability-map entries.

## Attributable files

Created:

- `src/shared/workItemDecompositionContracts.ts`
- `src/main/workCardPlanning/workItemDecomposition.ts`
- `src/main/workCardPlanning/workItemDecompositionService.ts`
- `src/renderer/app/WorkItemDecompositionPanel.tsx`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR15_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/WorkPlanningPanel.tsx`
- `src/renderer/app/workCardPlanPresentation.tsx`
- `test/work-card-planning/work-card-planning-service.test.cjs`
- `test/renderer/work-card-plan-presentation.test.cjs`

Deleted: none. Intentionally not created: replacement Formal Work Cards/implementation, a second execution engine, mandatory decomposition gate, automatic size threshold, dependencies, migrations, JSON sidecars, or product Git mutation.

## Implementation and acceptance evidence

- Formal Work Card guidance tells the Architect to stop on evidenced independent outcomes, acceptance groups, ownership/prerequisites, unrelated context, or real milestone boundaries. Bounded candidates keep the existing path. A decomposition block cannot be promoted as a Formal Work Card or implementation disposition.
- The optional approved Work Plan handoff produces a distinct canonical decomposition proposal through the existing Architect preparation, temporary draft, validation, and promotion mechanics. Application-owned identity, Plan revision/content fingerprint, strict domain payload, explicit Pending/RevisionRequested/Approved review, and main-owned repository access remain enforced.
- Sibling decomposition inserts ordered new identities, inherits original prerequisites and Phase membership, and rewires downstream dependencies to terminal replacements. Shared Plan validation rejects unknown references, cycles, malformed candidates, or invalid Phase boundaries. Superseded identities cannot be reused.
- Direct-to-phased correction requires rationale, meaningful Phase contracts, explicit assignments of all unchanged candidates, and an acyclic combined dependency graph. It preserves Plan acceptance criteria and unrelated candidate content. Resume selection follows replacement and transitive Phase dependencies rather than simply selecting the first array entry.
- Explicit Operator acceptance atomically archives the previous Plan as historical canonical Markdown, approves the proposal, and revises the existing approved Plan. It records `superseded-by-decomposition`, the full original candidate, proposal/Plan revisions, replacement identities, and resume identity. Intake, route, Plan identity, and prior Formal Work Cards remain intact. Revision requests leave the Plan unchanged. Stale presented revisions/content fail closed.
- Constrained IPC/preload and the optional Plan panel expose prepare/copy/check, readable evidence/dependencies/Phase acceptance, explicit accept/revise, and selection of the first eligible replacement after its prerequisites. Subsequent generic execution consumes the revised Plan; this card does not implement replacements.

## Validation

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0; repeated after final changes |
| `npm run build` | Approved normal Windows | Exit 0; repeated after final changes |
| `node --test --test-concurrency=1 test/work-card-planning/work-card-planning-service.test.cjs test/work-card-intake/work-card-intake-service.test.cjs test/renderer/work-card-plan-presentation.test.cjs` | Approved normal Windows | Final exit 0; 24 passed, none failed/skipped |
| `node --test --test-concurrency=1 test/renderer/work-card-plan-presentation.test.cjs` | Approved normal Windows | Exit 0; 4 passed after adding complete resulting Plan review, including downstream dependencies and acceptance criteria |
| `git diff --check` | Read-only restricted Windows | Exit 0 |

An intermediate required run exited 1 (23 passed, 1 failed): new decomposition guidance interrupted the existing exact validation-guidance prompt section. Moved the guidance before that preserved section and rebuilt before rerunning. The decomposition lifecycle itself passed that run. Normal process execution follows the WIR01 restricted `spawn EPERM`; disposable Git fixtures only. Full regression remains WIR23. No external integration, launch, visual acceptance, or packaging claimed; no card-local manual validation required.

Test categories: existing Formal Work Card promotion/revision/identity and Work Card Intake selection/dependency/close behavior reused. Existing successful bounded-card case extended with decomposition guidance assertions; existing invalid-draft case extended to prove proposals cannot become Formal Work Cards. Two new permanent cases cover previously absent boundaries: production IPC/service decomposition review, rollback, freshness, lineage, dependency rewiring and topology correction; readable decomposition presentation. No consolidation or retirement; capability map unchanged.

## Checkpoint and safety

Intended message: `WIR15: Add Formal Work Card Decomposition and Topology Correction Safety Valve`. Exactly the thirteen files above are attributable. Harness owns staging/commit; shell Git is read-only. No amendment, merge, push, tag, release, or publication.

Exact staged diff inspected; `git diff --cached --check` and bounded credential/private-key/home-path scan passed. Harness `pre_commit_scan` succeeded with only eight unchanged, unstaged baseline branding PNG warnings, none attributable to this card. Final report edit re-inspected after staging. Durable references are relative; no secrets, concrete local paths, generated/dependency artifacts, or archive runtime imports introduced.

## Next action

After passing focused validation and verifying the checkpoint, read WIR16 and required dependency reports. No scope deviation or material Operator decision identified.
