<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR01",
    "repairId": "WC46-REPAIR01",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR01_work_card_map_ineligible_and_active_authority.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR01_work_card_map_ineligible_and_active_authority.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46_work_card_map_and_candidate_scoped_planning.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC46-REPAIR01 Work Card Map Ineligible Status and Active Work Card Authority",
    "reviewResult": "RevisionRequested",
    "blockingDefects": 2,
    "operatorValidationRequired": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "WC46-REPAIR01 adds Ineligible, introduces active Work Card authority, and removes implicit next-candidate selection from Formal Work Card preparation. Two blocking defects remain: active authority treats Approved Validation evidence as terminal even while backend is still in Work Card Close, and renderer Begin Planning still hard-codes Work Card Planning rather than routing same-active-candidate reuse to the candidate's current loop workspace.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC46-REPAIR01 Work Card Map Ineligible Status and Active Work Card Authority

Disposition: `RevisionRequested`  
Git mutation: none performed by this review

## Review Boundary

ChampCity MCP was used for repository inspection. The reviewed workspace was `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. MCP git status reported a dirty working tree, zero staged files, 20 tracked modified files, 6 untracked files, and 2 deleted files at review start. Diagnostics reported the configured remote match as `unknown`; MCP reports repository identity as `ChampCityChris/ChampCity_AI`.

The exact governing Repair Card and Implementer Report were inspected first:

- `planning/phases/phase-08/Work_Cards/WC46-REPAIR01_work_card_map_ineligible_and_active_authority.md`, revision 2, sha256 `c14293e87db88b1e579b22752b97994034b96615bf43155e0c967e6d482a3698`.
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR01_work_card_map_ineligible_and_active_authority.md`, revision 1, sha256 `386f8ab8ed1eb9143973815e021ee97c314a2b4961ac70c4f29e9f6019686bbb`.
- Failed parent review evidence: `planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46_work_card_map_and_candidate_scoped_planning.md`, revision 1, sha256 `99f1bd0bfcfbf1a100a13c5c22a582c539490d4bf59712d6f72fcd20c16bcd40`.

The inspected production and test path included:

```text
src/main/workCardIntake/workCardIntakeService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardMapWorkspace.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/app/WorkCardCloseWorkspace.tsx
src/renderer/styles.css
test/work-card-intake/work-card-intake-service.test.cjs
test/work-card-planning/work-card-planning-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-map-workspace.test.cjs
test/repository/runtime-wiring-source.test.cjs
```

This review did not run local commands, launch Electron, or execute tests. Implementer-reported command results are treated as reported evidence only. Source and tests were independently inspected through MCP.

## Accepted Implementation Evidence

The implementation corrects several WC46 defects.

`src/shared/workspaceContracts.ts` extends `WorkCardMapCandidateStatus` to exactly `Complete | Eligible | Ineligible`. `src/main/workCardIntake/workCardIntakeService.ts` maps projected Work Card Plan candidates into those statuses and adds `isActive` on the active candidate. `src/renderer/app/WorkCardMapWorkspace.tsx` renders `Ineligible`, renders `Active Work Card` separately from the status, and continues to avoid the generic document selector surface.

`src/main/workCardIntake/workCardIntakeService.ts` adds `resolveActiveWorkCardAuthority(workspaceRoot, phaseId?)`, returning `none`, `active`, or `conflict`. It derives activity from current Approved `work-card-intake-handoff` evidence, checks that the candidate still exists in the current Approved Work Card Plan, and blocks multiple incomplete active candidates with a visible conflict reason. `beginWorkCardPlanningForCandidate()` now reuses the same active candidate's handoff and rejects different-candidate planning while another candidate is active.

`src/main/workCardPlanning/workCardPlanningService.ts` no longer imports or calls `selectNextWorkCardCandidate()` for Formal Work Card preparation. `resolveCurrentFormalWorkCardSelection()` now consumes `resolveActiveWorkCardPlanningHandoff()` and therefore targets the active selected candidate's handoff. `src/main/architectOutputs/architectOutputWorkspaceService.ts` similarly resolves the Work Card Planning handoff from `resolveActiveWorkCardPlanningHandoff()` instead of implicit next-candidate ordering.

The added tests include a multi-eligible fixture where WC01 and WC02 are both eligible and the later selected candidate WC02 remains active through current workflow and Architect-output Work Card Planning target resolution.

No hidden selected-candidate sidecar, route token, close acknowledgement file, closeout artifact, validation mutation, Implementer Report disposition mutation, new dependency, or Git mutation was reported or found in the inspected source.

## Blocking Finding 1 — Active authority terminates before Work Card Close is returned to the map

The repair card explicitly required active Work Card authority to include:

```text
Approved Validation Record for candidate while backend current workflow is still work-card-close
```

and required:

```text
Close / Next returns to Work Card Map and the completed candidate displays Complete after return.
```

The implementation does not preserve that boundary. In `resolveActiveWorkCardAuthority()`, active candidates are filtered out immediately when `candidateCompletionEvidence()` finds Approved validation evidence:

```text
approved work-card-intake-handoff candidates
→ plannedCandidateExists(...)
→ filter out candidates with candidateCompletionEvidence(...)
```

That makes Approved Validation evidence immediately terminal for active-authority purposes, regardless of whether the backend current workflow is still `work-card-close` and before the Operator has used the Close / Next return to the Work Card Map.

This leaves a gap in the single-active-Work-Card rule:

```text
WC02 has Approved Validation Record
backend current workflow is work-card-close for WC02
Operator manually opens Work Card Map before using Close / Next
resolveActiveWorkCardAuthority() returns none because WC02 has validation evidence
Work Card Map may show other dependency-satisfied candidates as Eligible
Begin Planning can create/reuse a new candidate handoff before WC02 Close / Next is completed
```

That violates the repair's stated active-evidence model and the intended loop sequence:

```text
Planning / Build / Review & Validation / Repair / Close bind to active candidate
→ Close / Next returns to Work Card Map
→ map recalculates statuses
```

Affected acceptance criteria: 5, 6, 8, 9, 13, 14, and 17.

Required correction: active authority must remain able to identify the candidate currently held in `work-card-close` until the user completes the Close / Next return path, without adding hidden close acknowledgements or route-token persistence. If this cannot be represented with current repository evidence alone, the repair must surface a bounded visible conflict/blocker rather than permitting a new candidate to begin before close return.

## Blocking Finding 2 — Renderer re-entry does not route the active candidate to its current loop workspace

The repair card required same-candidate re-entry to route to the candidate's current loop workspace:

```text
if the same candidate is already active, reuse its existing candidate-specific handoff and route to that candidate's current loop workspace
```

The backend `beginWorkCardPlanning()` returns a payload containing the refreshed `currentWorkspace`, which may be `work-card-planning`, `work-card-building-review`, `work-card-report-review`, `work-card-repair`, or `work-card-close` depending on active candidate maturity.

The renderer does not honor that current loop workspace. `App.tsx` still requires the refreshed model to be exactly `work-card-planning` after `beginWorkCardPlanning()`:

```text
beginMappedWorkCardPlanningAndTransition(candidateId)
→ beginWorkCardPlanning(phaseId, candidateId)
→ refreshCurrentModel()
→ if activeWorkspaceId !== "work-card-planning" then show error and return
→ otherwise transitionToWorkflowStep("work-card-planning")
```

Therefore, if the Operator opens Work Card Map while WC02 is already active in Build, Review & Validation, Repair, or Close and clicks the active candidate's `Begin Planning`, the backend may correctly reuse the same candidate's handoff, but the renderer blocks because the current workspace is not `work-card-planning`.

That violates the same-candidate reuse/routing requirement. It also means the automated proof is incomplete: tests show service-level reuse and initial Planning, but they do not prove re-entry routes to the active candidate's current loop workspace after the candidate has progressed past Planning.

Affected acceptance criteria: 5, 6, 7, 9, 17, and 18.

Required correction: the renderer should route to the refreshed active candidate workspace returned by repository-derived current workflow authority, not hard-code `work-card-planning`. It must still reject if the refreshed model belongs to another Work Card or if repository evidence is conflicted.

## Scope Compliance Finding

`src/renderer/styles.css` is listed in the Implementer Report as modified, but it is not included in WC46-REPAIR01 revision 2's authorized production surface. The repair did permit Work Card Map status and active-candidate indication, but the file-level authorized surface omitted stylesheet changes.

Because this review already requires revision for runtime defects, the next pass should either:

```text
- remove style changes from src/renderer/styles.css, or
- request/record an Architect scope correction authorizing the exact stylesheet change needed for Work Card Map status/active-candidate presentation.
```

Do not expand styling beyond the Work Card Map status and active-candidate indication.

## Acceptance Criteria Assessment

| AC | Result | Assessment |
|---:|---|---|
| 1 | Pass | `Complete`, `Eligible`, and `Ineligible` are the only typed Work Card Map statuses. |
| 2 | Pass | Complete candidates render without an enabled Begin Planning path. |
| 3 | Partial | Eligible candidates expose Begin Planning when no active Work Card exists; active-close boundary gap remains. |
| 4 | Pass | Incomplete-dependency candidates are projected as `Ineligible`. |
| 5 | Partial / Fail | Begin Planning establishes active authority, but active authority drops when Approved validation exists before Close / Next return. |
| 6 | Partial / Fail | The map identifies active candidates, but Begin Planning re-entry does not route current non-planning loop workspace. |
| 7 | Partial / Fail | Same-candidate backend reuse exists; renderer only accepts `work-card-planning`, not the current loop workspace. |
| 8 | Partial | Different-candidate rejection works while active authority exists; the active-close boundary can return none too early. |
| 9 | Partial / Fail | Planning target is active-candidate scoped; active close and renderer re-entry remain incorrect. |
| 10 | Pass | Architect-output Work Card Planning target resolution uses active handoff authority. |
| 11 | Pass | Formal Work Card preparation uses active handoff authority. |
| 12 | Partial | Multi-eligible later-candidate Planning target is tested; non-planning loop re-entry is not tested. |
| 13 | Pass | Multiple active incomplete candidates surface conflict instead of silent selection. |
| 14 | Partial / Fail | Close / Next returns to map, but active authority does not hold through pre-return close state. |
| 15 | Pass | All-complete routes toward Phase Validation, not Phase Intake. |
| 16 | Pass | No hidden state or alternate persistence found. |
| 17 | Partial / Fail | Multi-eligible and conflict tests exist; active close boundary and same-active non-planning re-entry are missing. |
| 18 | Reported only | Implementer reported typecheck, build, focused tests, and full test lane passing; this review did not run commands. |
| 19 | Pass | No dependency addition found in inspected source. |
| 20 | Reported / observed no staged files | Implementer reported no Git mutation; MCP status shows no staged files. |
| 21 | Pass | No Git mutation was performed by this review. |

## Required Revision

Revise WC46-REPAIR01 implementation to preserve active Work Card authority through the full loop.

Required correction 1:

```text
Approved Validation Record while current workflow is work-card-close
→ candidate remains protected from starting another candidate until Close / Next return is completed or a visible blocker prevents map Begin Planning
```

No hidden close acknowledgement, route token, sidecar, or disposition mutation may be added.

Required correction 2:

```text
same active candidate selected from Work Card Map
→ backend reuses same candidate handoff
→ renderer routes to refreshed current loop workspace for that candidate
→ current workspace may be Planning, Build, Review & Validation, Repair, or Close
→ renderer rejects only if refreshed model belongs to another candidate or conflict state
```

Required proof:

1. active candidate reaches Work Card Close after Approved validation;
2. direct Work Card Map access before Close / Next cannot start another candidate;
3. Close / Next return then lets Work Card Map mark the candidate Complete and recalculate remaining eligibility;
4. same active candidate re-entry routes to its current loop workspace after the candidate has progressed beyond Planning;
5. renderer tests/source assertions prove `beginMappedWorkCardPlanningAndTransition()` no longer hard-codes success to `work-card-planning` only;
6. no hidden state or alternate persistence is introduced.

## Command Evidence

The Implementer reported:

- `npx tsc --noEmit`: passed.
- `npx tsc`: passed.
- focused repair tests: normal Windows lane passed 48 tests after correction.
- `npx vite build`: normal Windows lane passed.
- full `node --test --test-concurrency=1`: normal Windows lane passed 274 tests after correction.

These are reported results only. This review did not independently execute commands.

## Manual Validation

Manual Operator validation should not be started for WC46-REPAIR01 as implemented. Request revision first, because the implementation can still allow active loop ambiguity before Close / Next return and cannot route same-active-candidate map re-entry to non-planning current loop workspaces.
