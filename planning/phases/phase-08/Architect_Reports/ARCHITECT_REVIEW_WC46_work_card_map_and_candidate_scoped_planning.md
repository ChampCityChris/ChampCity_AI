<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46_work_card_map_and_candidate_scoped_planning.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46_work_card_map_and_candidate_scoped_planning.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC46 Work Card Map and Candidate-Scoped Planning",
    "reviewResult": "RevisionRequested",
    "blockingDefects": 1,
    "operatorValidationRequired": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "The implementation adds the Work Card Map surface and candidate-scoped Begin Planning API, but backend planning resolution still falls back to implicit next-candidate selection in key paths. A user can begin planning for an Eligible candidate selected from the map, but current workflow and Architect-output target resolution only honor the candidate returned by selectNextWorkCardCandidate(). This violates candidate-scoped planning when more than one candidate is Eligible.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC46 Work Card Map and Candidate-Scoped Planning

Disposition: `RevisionRequested`  
Git mutation: none performed by this review

## Review Boundary

ChampCity MCP was used for repository inspection. The reviewed workspace was `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. MCP git status reported a dirty working tree, zero staged files, 17 tracked modified files, 3 untracked files, and 2 deleted files at review start. Diagnostics reported the configured remote match as `unknown`; MCP reports repository identity as `ChampCityChris/ChampCity_AI`.

The exact governing Work Card and Implementer Report were inspected first:

- `planning/phases/phase-08/Work_Cards/WC46_work_card_map_and_candidate_scoped_planning.md`, revision 1, sha256 `a441620b35ba42b6f766e8d05a271898b630c30dde72488ab3ae66dcdd269b84`.
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46_work_card_map_and_candidate_scoped_planning.md`, revision 1, sha256 `27025aa80c7565a152ab44b1261c51353f67559cf33813610be89f90585868ff`.

The inspected production and test path included:

- `src/main/workCardIntake/workCardIntakeService.ts`;
- `src/main/currentWorkflow/currentWorkflowService.ts`;
- `src/main/architectOutputs/architectOutputWorkspaceService.ts`;
- `src/main/main.ts`;
- `src/preload/index.ts`;
- `src/shared/workspaceContracts.ts`;
- `src/renderer/app/App.tsx`;
- `src/renderer/app/NestedWorkflowRail.tsx`;
- `src/renderer/app/WorkCardMapWorkspace.tsx`;
- `src/renderer/app/WorkCardCloseWorkspace.tsx`;
- `test/work-card-intake/work-card-intake-service.test.cjs`;
- `test/workflow/current-execution-context.test.cjs`;
- `test/renderer/work-card-map-workspace.test.cjs`;
- `test/renderer/project-rail-presentation.test.cjs`.

This review did not run local commands, launch Electron, or execute tests. Implementer-reported command results are treated as reported evidence only. Source and tests were independently inspected through MCP.

## Accepted Implementation Evidence

The implementation correctly moves the visible `phase-work-card-selection` surface toward the intended Work Card Map model.

`src/renderer/app/NestedWorkflowRail.tsx` now labels the Work Card subflow entry as `Work Card Map`. `src/renderer/app/App.tsx` recognizes `phase-work-card-selection` as a Work Card Map surface, excludes it from the generic action/document workspace path, and renders `WorkCardMapWorkspace`. The dedicated map component renders candidate rows, does not render the generic document selector, and exposes `Begin Planning` only when the projected candidate status is `Eligible`.

`src/main/workCardIntake/workCardIntakeService.ts` adds `getWorkCardMapProjection()`. It reads the current Approved `Work_Card_Plan.md`, projects candidates in plan order, maps internal candidate explanations to only two user-facing candidate statuses, `Complete` and `Eligible`, and leaves non-eligible/non-complete candidates without a named user-facing status.

The implementation adds a candidate-scoped API surface: `beginWorkCardPlanning(phaseId, candidateId)` through shared contract, preload, main IPC, current workflow service, and `beginWorkCardPlanningForCandidate()`. This path verifies that the requested candidate exists and is currently `Eligible` before creating or reusing the normal `work-card-intake-handoff` for that candidate.

The implementation preserves important negative constraints: no closeout document, hidden selected-candidate state, route token, alternate map persistence, validation mutation, Implementer Report disposition mutation, dependency addition, or Git mutation is reported or observed in the inspected source.

## Blocking Finding

### Candidate-scoped planning is not preserved after the selected handoff is created

WC46 changed the flow specifically to make Work Card Map selection explicit:

```text
Operator expands an Eligible candidate
→ Operator clicks Begin Planning
→ backend verifies that exact candidateId
→ normal intake handoff is created/reused for that exact candidate
→ Work Card Planning opens for that same candidate
```

The implementation satisfies the first half of this sequence. `beginWorkCardPlanningForCandidate()` accepts `phaseId` and `candidateId`, verifies the selected candidate is `Eligible`, and calls `generateWorkCardIntakeHandoff(workspaceRoot, phaseId, candidateId)`.

The implementation does not preserve candidate scope in the downstream resolver path. Two production paths still reintroduce implicit next-candidate authority:

```text
currentWorkflowService.approvedWorkCardIntakeWithoutApprovedFormalModel()
→ selectNextWorkCardCandidate(workspaceRoot, phaseId)
→ candidateId = selection.selectedCandidate.candidateId
→ only that candidate's handoff can make work-card-planning current
```

and:

```text
architectOutputWorkspaceService.exactWorkCardPlanningHandoff()
→ selectNextWorkCardCandidate(workspaceRoot, phaseId)
→ require selection.selectedCandidate.candidateId === handoff.workCardId
→ otherwise skip that approved handoff
```

This means Work Card Map can display more than one `Eligible` candidate and can allow the Operator to click `Begin Planning` on any `Eligible` candidate, but current workflow and Architect-output target resolution will only follow whichever candidate `selectNextWorkCardCandidate()` chooses implicitly.

Concrete failure case from the inspected logic:

```text
Approved Work_Card_Plan contains WC01 and WC02 with no predecessor dependency between them
→ both are incomplete and therefore both project as Eligible
→ Operator clicks Begin Planning on WC02
→ beginWorkCardPlanningForCandidate() creates/reuses the WC02 intake handoff
→ approvedWorkCardIntakeWithoutApprovedFormalModel() recomputes selectNextWorkCardCandidate(), which selects WC01 by plan order
→ refreshed current model does not resolve work-card-planning for WC02
→ renderer blocks or remains context-confused instead of opening WC02 Work Card Planning
```

That violates the core WC46 objective. The map is explicitly an Operator selection surface. After an `Eligible` candidate is selected, planning authority must follow the selected candidate, not a recomputed implicit next candidate.

Affected acceptance criteria: 5, 8, 10, 11, 12, 13, and 18.

## Test Coverage Finding

The added tests prove the happy path where only one next candidate is effectively eligible because later candidates depend on earlier candidates. They do not prove the candidate-scoped requirement when multiple candidates satisfy the authorized `Eligible` rule.

`test/work-card-intake/work-card-intake-service.test.cjs` seeds WC02 depending on WC01 and WC03 depending on WC02. `test/workflow/current-execution-context.test.cjs` similarly validates a sequential WC01 → WC02 flow. This test shape does not catch the downstream reversion to `selectNextWorkCardCandidate()` because the explicit candidate and implicit next candidate are the same candidate in the test fixtures.

A required regression test must create at least two simultaneously `Eligible` planned candidates, begin planning for the later candidate, and prove:

```text
beginWorkCardPlanning(phaseId, selectedCandidateId)
→ getCurrentWorkspaceModel().currentWorkCardId === selectedCandidateId
→ work-card-planning target path comes from the selected candidate handoff
→ no older or earlier eligible candidate is substituted
```

## Acceptance Criteria Assessment

| AC | Result | Assessment |
|---:|---|---|
| 1 | Pass | The visible subflow label is now `Work Card Map`. |
| 2 | Pass | `phase-work-card-selection` renders a dedicated Work Card Map component. |
| 3 | Pass | Projection returns candidates from `Work_Card_Plan.md` in plan order. |
| 4 | Pass | Complete candidates display `Complete` and no enabled Begin Planning action. |
| 5 | Partial / Fail | Eligible candidates display `Eligible` and expose Begin Planning, but downstream planning authority does not honor every eligible selected candidate. |
| 6 | Pass | Inspected map candidate statuses are limited to `Complete` and `Eligible`; other candidates have no named status. |
| 7 | Pass | Dedicated map path excludes generic document selector and generic empty document UI. |
| 8 | Partial / Fail | Begin Planning passes candidateId to the backend, but downstream current workflow reverts to implicit selection. |
| 9 | Pass | Backend rejects candidates that are not projected as Eligible. |
| 10 | Partial / Fail | Handoff creation is candidate-scoped, but downstream current workflow may not use the selected candidate's handoff. |
| 11 | Fail | `getCurrentWorkspaceModel()` resolves the selected candidate only when selected candidate equals implicit next candidate. |
| 12 | Fail | Work Card Planning can still resolve target evidence from implicit next-candidate logic rather than the selected candidate. |
| 13 | Fail | Multiple handoffs/candidates can still be affected by implicit selection and target resolver ordering. |
| 14 | Pass | Close / Next returns the renderer to Work Card Map. |
| 15 | Pass for map UI | All-complete map displays a transition toward Phase Validation and not Phase Intake. |
| 16 | Pass | No hidden state or alternate persistence was found. |
| 17 | Pass | RevisionRequested repair routing is preserved in inspected current-workflow tests/source. |
| 18 | Fail | Tests do not prove explicit selected-candidate planning where implicit next candidate differs from selected candidate. |
| 19 | Reported only | Implementer reported typecheck, build, focused tests, and full test lane passing; this review did not run commands. |
| 20 | Pass | No dependency addition was reported or observed in inspected files. |
| 21 | Reported / observed no staged files | Implementer reported no Git mutation; MCP status shows no staged files. |
| 22 | Pass | No Git mutation was performed by this review. |

## Required Revision

Revise WC46 so candidate scope remains authoritative after `Begin Planning`.

The repair must keep the Work Card Map user-facing status set limited to `Complete` and `Eligible`. It must not add new candidate statuses or Architect gates.

Required behavior:

```text
Work Card Map projects multiple candidates as Eligible
→ Operator selects any Eligible candidate
→ Begin Planning verifies that exact candidateId
→ creates/reuses that candidate's normal Work Card Intake handoff
→ current workflow resolves work-card-planning for that exact candidateId
→ Architect-output target resolution uses that exact candidate's handoff/formal target
→ an earlier eligible candidate is not substituted by implicit next-candidate ordering
```

Acceptable implementation direction: make the resolver identify the active Work Card Planning handoff from exact Approved intake handoff evidence for unresolved Formal Work Card targets, with explicit candidate identity, instead of filtering handoffs through `selectNextWorkCardCandidate()`. If multiple unresolved approved intake handoffs exist, the service must choose deterministically from repository evidence or block with a visible conflict reason; it must not silently select a different candidate than the one just begun.

Required new proof:

1. a fixture with at least two simultaneously `Eligible` candidates;
2. `beginWorkCardPlanning(phaseId, laterEligibleCandidateId)` succeeds;
3. `getCurrentWorkspaceModel()` resolves `work-card-planning` for that later candidate;
4. `getArchitectOutputWorkspaceModel("work-card-planning")` targets that later candidate's formal Work Card path;
5. the earlier eligible candidate is not substituted;
6. non-eligible candidates remain blocked;
7. no hidden state, route token, closeout, or disposition mutation is introduced.

## Command Evidence

The Implementer reported:

- `npx tsc --noEmit`: passed.
- `npx tsc`: passed.
- focused Node tests: sandbox failed with `spawn EPERM`; normal Windows lane passed 60 tests.
- `npx vite build`: sandbox failed with esbuild `spawn EPERM`; normal Windows lane passed.
- full `node --test --test-concurrency=1`: normal Windows lane passed 269 tests.

These are reported results only. This review did not independently execute commands.

## Manual Validation

Manual Operator validation should not be started for WC46 as implemented. Request revision first, because the current code can still fail the core explicit-candidate selection contract when map selection differs from implicit next-candidate ordering.
