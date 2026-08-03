# Implementer Report: WC41 Domain-Specific Architect Handoff Prompt Contracts

Pass type: numbered Work Card implementation  
Work Card: WC41_domain_specific_architect_handoff_prompt_contracts  
Repository path inspected: verified approved repo root  
Branch: feature/phase-04-wc01-repair01-evidence-derived-workflow  
Remote status: tracking origin/feature/phase-04-wc01-repair01-evidence-derived-workflow observed by read-only status  
Git mutation authorized: no  
Git mutation performed: no

## Implementation Summary

Implemented definition-owned prepared-instruction builders for every active production Architect output definition and added a production catalog assertion that active definitions cannot register without `buildPreparedInstruction`.

The shared runtime now fails fast if a production definition lacks a prepared-instruction builder instead of falling back to a generic prompt.

Workspace copy surfaces now read the runtime-prepared definition instruction for Project Architect Interview, Project Planning, Phase Map, Phase Interview, and Phase Planning. Formal Work Card and Repair Work Card already used definition-owned builders and were preserved.

Prompt contracts now state the exact required H1/H2 lines and fenced block contracts for all seven active definitions and nine output slots.

## Files Created

- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC41_domain_specific_architect_handoff_prompt_contracts.md`

## Files Modified By This Pass

- `src/main/architectOutputs/productionArchitectOutputCatalog.ts`
- `src/main/architectOutputs/architectOutputRuntimeService.ts`
- `src/main/architectInterview/architectInterviewDraftPilot.ts`
- `src/main/architectInterview/architectInterviewService.ts`
- `src/main/projectPlanning/projectPlanningDraftBundle.ts`
- `src/main/projectPlanning/projectPlanningService.ts`
- `src/main/phaseMap/phaseMapDraftOutput.ts`
- `src/main/phaseMap/phaseMapService.ts`
- `src/main/phaseInterview/phaseInterviewDraftOutput.ts`
- `src/main/phaseInterview/phaseInterviewService.ts`
- `src/main/phasePlanning/phasePlanningDraftBundle.ts`
- `src/main/phasePlanning/phasePlanningService.ts`

## Files Intentionally Not Created

- No JSON sidecars.
- No new prompt registry.
- No new renderer, IPC, preload, disposition, promotion, metadata, dependency, or path authority.
- No final Human Validation record.

## Builder Matrix

| Active definition | Slot or slots | Builder |
| --- | --- | --- |
| project-architect-interview | Project Architect Interview | `buildProjectArchitectInterviewPreparedInstruction` |
| project-planning | Project Profile; Project Roadmap | `buildProjectPlanningPreparedInstruction` |
| phase-map | Phase Map | `buildPhaseMapPreparedInstruction` |
| phase-interview | Phase Interview | `buildPhaseInterviewPreparedInstruction` |
| phase-planning-bundle | Phase Planning; Work Card Plan | `buildPhasePlanningPreparedInstruction` |
| formal-work-card | Formal Work Card | `buildFormalWorkCardPreparedInstruction` |
| repair-work-card | Repair Work Card | `buildRepairWorkCardPreparedInstruction` |

## Nine-Slot Prompt-Contract Matrix

| Slot | Exact prompt contract verified |
| --- | --- |
| Project Architect Interview | `# Project Architect Interview` plus all required Project Architect Interview H2 sections |
| Project Profile | `# Project Profile` plus current Project Planning profile validator sections |
| Project Roadmap | `# Project Roadmap` plus current Project Planning roadmap validator sections |
| Phase Map | `# Phase Map` and exactly one `champcity-phase-map` fenced JSON object contract |
| Phase Interview | `# Phase Interview` plus current Phase Interview section contract |
| Phase Planning | `# Phase Planning` plus current Phase Planning section contract |
| Work Card Plan | `# Work Card Plan` and exactly one `champcity-work-card-plan` fenced JSON array contract |
| Formal Work Card | `# <exact-work-card-id> - <candidate-title>` plus current Formal Work Card H2 contract |
| Repair Work Card | `# <exact-repair-id> - <bounded-defect-title>` plus current Repair Work Card H2 contract and return target |

Generated Phase Planning prompt title lines verified before draft writes:

```text
# Phase Planning
# Work Card Plan
```

## Generic Fallback Evidence

- `productionArchitectOutputCatalog` now throws if any active definition lacks `buildPreparedInstruction`.
- `architectOutputRuntimeService` now throws if a resolved production definition has no prepared-instruction builder.
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs` verifies all seven active production definitions have builders and that the prompt matrix covers all nine slots.

## Preserved Behavior Confirmation

No validator, disposition, promotion, renderer, IPC, preload, final path, metadata, dependency, or Git behavior was intentionally changed.

Existing `create_markdown_artifact` temporary draft writes remain `overwrite=false`. Project Planning and Phase Planning remain atomic two-slot bundles.

## Commands Run And Results

| Command | Lane | Result |
| --- | --- | --- |
| `pwd` | read-only orientation | passed |
| `git status --short --branch` | read-only orientation | passed; worktree was already dirty before this pass |
| `npx tsc --noEmit` | direct clean-room sandbox | passed |
| `npx tsc` | direct clean-room sandbox | passed |
| `node --test --test-concurrency=1 test/architect-outputs/architect-output-prompt-contracts.test.cjs` | sandbox | failed with documented `spawn EPERM`; not treated as source failure |
| `node --test --test-concurrency=1 test/architect-outputs/architect-output-prompt-contracts.test.cjs` | normal Windows lane | passed, 2 tests |
| `npx vite build` | sandbox | failed with documented esbuild `spawn EPERM`; not treated as source failure |
| `npx vite build` | normal Windows lane | passed |
| `node --test --test-concurrency=1` | normal Windows lane | initial run failed 8 tests due stable prompt wording expected by existing tests; corrected prompt wording without changing authority |
| `node --test --test-concurrency=1 test/architect-interview/architect-interview-workspace.test.cjs test/documents/single-file-workflow.test.cjs test/phase-map/phase-map-service.test.cjs test/project-planning/project-planning-service.test.cjs test/workflow/production-service-proof.test.cjs test/architect-outputs/architect-output-prompt-contracts.test.cjs` | normal Windows lane | passed, 39 tests |
| `npx vite build` | normal Windows lane after final prompt edits | passed |
| `node --test --test-concurrency=1` | normal Windows lane final | passed, 198 tests |
| `git status --short` | read-only final check | passed; dirty worktree remains with pre-existing changes plus WC41 edits |
| `rg -n "<local-path-or-secret-patterns>" ...` | local safety scan | no concrete local paths or secrets found; one intentional prose occurrence of `tokens` in a negative prompt constraint |

## Validation Performed

- TypeScript typecheck.
- TypeScript compile.
- Vite renderer build.
- Focused production prompt-contract matrix.
- Focused previously failing domain and production workflow suites.
- Complete Node test lane.
- Local safety scan for concrete paths and secret-like strings in WC41-touched files.

## Validation Skipped

- Operator manual validation was not performed. Remaining manual validation is listed below.
- No Electron launch smoke was performed because WC41 changed prompt text and production builder routing only, not renderer reachability or launch integration.

## Manual Validation Required

After Architect approval, the Operator should rerun Phase Planning Prepare and confirm the copied instruction explicitly names:

```text
# Phase Planning
# Work Card Plan
```

The Operator should then verify both temporary drafts promote and appear in the unchanged review workspace.

## Security And Secret-Safety Notes

No secrets, credentials, API keys, `.env` content, or concrete local machine paths were added to WC41 artifacts.

All durable paths in this report are repo-relative or use `<PROJECT_REPO>` terminology.

## Git Actions Performed

Read-only status and diff inspection only. No stage, commit, push, branch switch, merge, rebase, tag, reset, clean, restore, or stash was performed.

Commit hash: not applicable; Git mutation is prohibited for WC41.

## Blocking Questions

None.

## Residual Risks

The worktree contained many pre-existing modified and untracked files before this pass. WC41 validation passed against the current worktree state, but this report does not claim ownership of unrelated pre-existing changes.

## Recommended Next Implementer Task

Run Architect review for WC41, then have the Operator perform the Phase Planning Prepare manual validation described above.
