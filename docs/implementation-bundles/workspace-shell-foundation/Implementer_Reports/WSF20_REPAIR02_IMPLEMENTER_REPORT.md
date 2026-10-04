# WSF20-REPAIR02 Implementer Report

Repair Card: WSF20-REPAIR02 (D09, D10, D11). Approved repository root verified as `Dev/` with its own Git repository and contributor contract before edits. Branch `dev`; starting HEAD `151404c07f44e9c3a3d8a3254946c3421a779a63` matches the card. Origin is the configured ChampCity_AI repository; local `dev` was 311 commits ahead / zero behind the locally recorded `origin/dev`. No fetch or push. Pre-existing untracked bundle documents were preserved and excluded from staging.

## D09: One candidate action implementation

Created presentation-only `WorkflowCandidateBrowserActions`, retaining the existing row classes, order, readiness flags, revision labels, optional contextual actions, Refresh, conditional Retry, and feedback. It has no service, SQL, filesystem, or candidate ownership. Shell-specific names re-export that implementation and its props. Adoption:

- Architect Interview: `ArchitectInterviewShell`.
- Project Planning: `ProjectPlanningReviewShell`.
- Phase Map: `ProjectPhaseMapShell`.
- Phase Interview: `PhaseInterviewShell`.
- Phase Planning: `PhasePlanningShell`.
- Work Card Planning: `WorkCardPlanningShell`.

Removed the Regenerate and Final Draft API slots from all six shells. Removed `finalDraftHandoff` and duplicate callbacks from `GreenfieldArchitectWorkspace`, and `finalHandoff` and duplicate callbacks from `PhaseInterviewWorkspace`. Each adapter keeps one Prepare/Copy path and Refresh. Shell pane geometry and candidate workflow semantics are preserved. Repair/Review action sets were not consolidated.

Extended the existing Architect browser owner to render all six aliases, compare their resulting action markup, verify their shared re-export, and assert exactly one Prepare and Copy action. Structural proof checks no obsolete labels or copied row implementation remain, no second interview handoff state remains, and the primitive has no service imports or calls. Existing shell geometry and exact review-version tests remain in place.

## D11: Semantic schema and MCP delivery

The Greenfield Architect contract now says `Construct a semantic candidate object with exactly the fifteen GREENFIELD_ARCHITECT_SECTIONS keys`, and labels its field example `Semantic schema template (authoritative field names)`. Its field names, limits and validator are unchanged. Non-MCP Architect family delivery contracts retain their existing behavior.

Shared MCP transport now states:

> The semantic candidate is not the chat response. Ask only materially unresolved questions and continue the conversation as needed.

It then requires construction of the exact candidate when sufficient information exists, a call to `workflow_toolbox.submit_stage_candidate`, and `JSON.stringify(candidate)` in the tool's `candidateJson` argument. It prohibits printing the candidate or raw transport JSON in chat, manual Operator transfer, and canonical Markdown emission. After successful tool submission it requires only a short confirmation directing the Operator to Refresh. These instructions are present in the initial handoff and cover the complete interview without a second handoff.

Project Planning, Phase Map and Phase Loop prose now describes object construction and field schemas. Work Card Planning describes execution-contract construction for MCP submission. Work Item advisory describes its semantic object fields rather than telling the model to return them.

The existing `reserved-toolbox-namespace` production ingress test now checks these exact transport phrases and rejects `Return only one JSON object`, `return structured`, `returning structured`, `Submit semantic candidate JSON`, and `Return advisorySummary` across Architect, Project Planning, Phase Map, Phase Interview, Phase Planning, Work Card Planning and Work Item advisory. It still submits real candidates through the registered MCP toolbox, checks SQL review identities and generated documents, and invokes renderer Refresh to expose Architect Review. The workflow service owner's schema-template locator was updated to the intentional new Greenfield label; actual templates still pass existing candidate validation.

No changes to candidate contracts, MCP tool schema, SQL/domain schemas, validation limits, or save-service behavior. Existing MCP contract generation and Architect candidate validation owners pass.

## D10: Contextual sidebar Resume

`FigmaSidebar` accepts one optional workflow-context action rendered with `figma-sidebar-action`. App supplies the ephemeral Greenfield action only in the matching Workflow view. `StructuredWorkflowWorkspace` forwards the registration slot; Greenfield registers `Resume current stage` when selection differs from canonical SQL navigation, except the existing actionable manual Work Card Validation and eligible Work Card selection alternatives. Completed terminal inspection also offers Resume when different from canonical navigation.

Registration is cleared on selection/Workflow changes and unmount; mismatched Workflow navigation cannot publish an action. Clicking Resume calls the existing SQL refresh path and restores the canonical selection. There is no persisted navigation field. The local Greenfield header now contains only the Workflow title; Workflows and Resume buttons are removed. The nested rail retains its placement.

The extended Greenfield composition test renders the sidebar action, verifies its styling, proves absence on canonical and manual Validation surfaces, proves presence for read-only inspection and completed alternate presentation, clicks Resume and verifies the exact SQL stage, and checks cleanup and Workflow identity changes. It also checks the local header has neither duplicated action.

## Files and boundaries

Created:

- `src/renderer/app/WorkflowCandidateBrowserActions.tsx`.
- This report.

Modified source:

- Six adopted shell files listed above under `src/renderer/app/`.
- `src/renderer/app/GreenfieldArchitectWorkspace.tsx`, `PhaseInterviewWorkspace.tsx`, `GreenfieldWorkspace.tsx`, `StructuredWorkflowWorkspace.tsx`, `App.tsx`, and `figma/FigmaSidebar.tsx`.
- `src/shared/architectWorkspaceContracts.ts` (handoff wording only).
- `src/main/integrations/workflowCandidateHandoff.ts`.
- Handoff prose in `src/main/projectPlanning/structuredProjectPlanningService.ts`, `phaseMap/structuredPhaseMapService.ts`, `phasePlanning/structuredPhaseLoopService.ts`, `workCardPlanning/structuredWorkItemPlanningService.ts`, and `workCardValidation/structuredWorkItemReviewService.ts`.

Modified tests:

- `test/agent-harness/reserved-toolbox-namespace.test.cjs`.
- `test/renderer/architect-browser-attachment-coordinator.test.cjs`, `greenfield-shell-composition.test.cjs`, and `phase-interview-workspace.test.cjs`.
- `test/workflow/workflow-application-service.test.cjs`.

No source files deleted. No permanent test file, dependency, migration, raw JSON entry UI, persisted navigation state, or other-family rebuild created. Temporary validation scripts, receipts, and build output remain outside the checkpoint. No D05-D08 work.

## Validation receipts

Commands ran from the verified repository root. Source was held stable during each composed run.

1. Restricted `node --test test/renderer/greenfield-shell-composition.test.cjs test/renderer/phase-interview-workspace.test.cjs test/renderer/architect-browser-attachment-coordinator.test.cjs`: exit 1, `spawn EPERM`. Recorded once and rerun in normal Windows. Initial normal result: 25/26 passed; a test compared separately bundled function identities. Corrected to behavioral markup plus shared re-export checks. Subsequent normal run: exit 0, 26/26 passed.
2. `npm run test:repair -- --changes tmp/wsf20-r02-changes.json --preview`: exit 0, 95 files selected. Temporary change set contains the attributable implementation/test paths, including the new primitive.
3. Normal Windows `npm run test:repair -- --changes tmp/wsf20-r02-changes.json`: interrupted after broader owners stalled; exit 1. Stopped only this invocation's identified CLI process tree. Not counted as passing proof.
4. Normal Windows `node tmp/wsf20-r02-bounded.cjs`: same repository repair planner/executor selection, with 60000 ms per-file timeout following the preceding bundle repair's bounds. Exit 1; run `ed54e131-388d-41a5-9d39-05880b7fbbd7`, 263946 ms. Its run-owned `npm run build` passed, exit 0 (TypeScript, Vite, branding assets). Of 95 files, 83 passed, four failed assertions and eight timed out. Available final counts: 637 tests, 628 passed, nine failed; timeout files have incomplete counts. Receipt: `tmp/wsf20-r02-bounded-receipt.json`.
5. Final normal Windows focused command (below): exit 0, 91/91 passed in 15133 ms. Receipt: `tmp/wsf20-r02-focused.log`.
6. Normal Windows `node --test test/workflow/workflow-application-service.test.cjs`: after correcting the schema-template locator, exit 0, 27/27 passed in 30062 ms. Receipt: `tmp/wsf20-r02-workflow-focused.log`.
7. Normal Windows `node --test --test-name-pattern='recovered Project Planning' test/renderer/project-rail-presentation.test.cjs`: exit 0, both recovered Project Planning shell/adapter scenarios passed. Receipt: `tmp/wsf20-r02-project-planning-focused.log`.
8. `git diff --check`: exit 0 after removing an added EOF blank line. Exact staged safety review is performed before checkpoint.

Final focused command:

```powershell
node --test test/agent-harness/reserved-toolbox-namespace.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs test/architect-outputs/architect-draft-ingestion.test.cjs test/renderer/architect-browser-attachment-coordinator.test.cjs test/renderer/phase-interview-workspace.test.cjs test/renderer/phase-planning-workspace.test.cjs test/renderer/phase-map-presentation.test.cjs test/renderer/work-card-planning-workspace.test.cjs test/renderer/greenfield-shell-composition.test.cjs test/renderer/workflow-hub-shell.test.cjs
```

### Broader limits

The composed receipt is failed, not green. Assertion failures occurred in `repository-io-hardening`, `execution-completion`, `project-rail-presentation`, and `workflow-application-service`. The last was the intentionally renamed schema-template locator and is corrected with a passing full-owner rerun. The first three also appear in the preceding repair report; no out-of-scope correction was attempted.

Timeout owners: `architect-output-prompt-contracts`, `desktop-development-lifecycle`, `phase-planning-service`, `project-planning-service`, `current-project-entry`, `managed-project-source`, `workflow-integration-service`, and `work-card-intake-service`. Some produced partial successes or assertions before timeout; none is counted as passing. Several overlap prior bundle limits, but this pass does not independently establish every remaining failure as pre-existing.

The bounded receipt reports `sourceStable=false` / `source-changed-during-validation`. No tracked implementation source changed during that run. One generated renderer test module remained after interrupted child cleanup; its exact repository-contained directory was verified and removed. Pre-existing generated test directories were preserved. Independent final focused checks were rerun after cleanup. Their passes do not relabel the composed receipt. No new test-module residue remained after the final checks. The renderer loader's exit-listener warning is diagnostic only; focused assertions passed.

## Safety, checkpoint and Operator audit

Task scope preserves browser security, SQL authority, candidate transport schemas, exact review versions and validators. No secrets or concrete machine paths are intentionally included. Exact staged diff reviewed across all 26 attributable source/test/report files. Staged additions passed the bounded secret-material and concrete-machine-path scan; staged filenames contain no generated/dependency artifacts. `git diff --cached --check` passed.

Required checkpoint: `WSF20-R02 simplify candidate handoff and contextual resume`. Commit hash pending at report creation; actual hash is supplied after committing. No push. All pre-existing untracked bundle material remains excluded.

No live ChatGPT interview/MCP or visual acceptance is claimed. Operator audit remains: simple action row on all six surfaces; initial Architect/Phase handoff conducts the interview and calls MCP without printing JSON; Refresh reveals generated Review; Resume absent on current/actionable alternate surfaces, visible in sidebar on inspection, and returns to SQL current stage. Also assess the recorded broader qualification limits. After checkpoint, stop for Operator audit as directed by the card.
