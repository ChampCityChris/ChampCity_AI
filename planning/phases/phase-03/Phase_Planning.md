<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/phase_planning/Phase_Planning",
  "artifactType": "phase_planning",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Phase_Planning.json",
  "markdownPath": "planning/phases/phase-03/Phase_Planning.md",
  "payload": {
    "kind": "phase_planning",
    "title": "Phase Planning: phase-03"
  },
  "payloadHash": "sha256:47943a29d406a39d7a1c64bbf96942d68ffc0f7a2140269eacf4c635f0257c85",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC09",
      "champcity-ai/phase-03/implementer_report/WC01"
    ],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Phase Planning: phase-03

Status: Approved / Current Phase 03 planning authority
Project: ChampCity A/I
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Phase type: Corrective workflow-router implementation phase
Revision note: Revised after Operator review to explicitly include actual UI shell implementation from the Figma source-code bundle.
Executable Work Cards: Not created in this artifact

## Source Authority

Primary authority:

- `docs/workflow/PROCESS_BASELINE.md`
- `docs/workflow/PROCESS_MAP.drawio`
- `planning/project/PROJECT_PROFILE.md`
- `planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md`
- `planning/project/REBASELINE_WORKFLOW_ROUTER_MODEL.md`
- `planning/phases/phase-02/Closeout_Reports/CLOSEOUT_REPORT_phase-02_phase_2_closeout.md`

Design and UI implementation input:

- Uploaded Figma source-code bundle: `Design Dark UI for ChampCity.zip`
- Figma-generated `src/app/App.tsx`
- Figma-generated style files under `src/styles/`
- Figma-generated supporting UI components under `src/app/components/ui/`
- Figma import notes under `src/imports/`

The locked workflow baseline remains process authority. The Figma source code is now explicit Phase 03 design input and implementation reference for the UI shell, but it is not workflow authority.

## Figma Source Review Summary

The uploaded Figma bundle is a standalone Vite/React prototype. It is useful because it already models the UI shape Phase 03 needs:

- top status strip
- horizontal process rail
- current required action panel
- artifact review workspace
- right context inspector
- secondary navigation drawer
- bottom activity/evidence log
- compact dark desktop layout

The prototype should not be copied wholesale without adaptation. It currently uses demo/static workflow state, demo artifact content, demo navigation controls, and stale labels from earlier workflow concepts. Those must be replaced with live durable-state routing and the locked Phase 03 terminology.

Specific adaptation requirements:

- Replace demo `workflowState` switching with the durable current required action model.
- Replace static `CRA`, `ARTIFACTS`, `PROJECT`, and activity data with repo-derived project state where available.
- Remove or rename demo-only controls such as “Demo States.”
- Correct stale example labels such as old Phase 02 / WC02 examples and any “Implementer Execution Packet” phrasing that conflicts with the corrected Work Card-as-Implementer-handoff model.
- Preserve the Figma shell pattern: top status strip, left-to-right process rail, current required action panel, artifact workspace, context inspector, and activity log.
- Treat the Figma component and style structure as a reference. The Implementer must adapt it to the existing Electron/React app structure rather than blindly replacing the app.
- Do not add unnecessary dependency sprawl unless the existing app already supports the dependency pattern or the Work Card explicitly approves it.

## Phase Purpose

Correct the ChampCity A/I application screens so they follow the rebaselined workflow-router model and visibly implement the guided UI experience.

The app must compute the current actionable step from durable project state and guide the Operator to that step. The primary UI must stop behaving like a generic screen picker where the Operator chooses among many screens without knowing what the correct next action is.

Phase 03 is therefore both structural and visible. It must install the routing model and update the application UI so the Operator can actually use that model.

## Product Correction

ChampCity A/I is a workflow router, not a screen picker.

The UI must answer these questions before asking the Operator to choose a screen:

1. What is the current required action?
2. Why is this action next?
3. Which durable artifacts or records are being used as evidence?
4. What artifact, record, or state change will be created next?
5. What approval, validation, or review is required?
6. What happens after success?
7. What happens after failure or repair?
8. What manual fallback exists if MCP/direct write is unavailable?

## Locked Workflow

```text
Project Intake -> Project Interview -> Reconciliation Review -> Project Mapping -> Operator Project Approval -> Phase Mapping -> Operator Phase Approval -> Work Card Loop -> Phase Closeout -> Operator Phase Closeout Approval -> Roadmap Update -> Next Phase Activation -> Repeat Phase Mapping / Work Card Loop
```

Phase 03 must implement UI behavior that routes the Operator through this workflow. Secondary navigation may remain, but it cannot be the primary mental model.

## Current Phase Boundary

Phase 02 has been closed by the Operator. Phase 03 is active manually because the current Phase Mapping screen is not reliable enough to perform this transition.

Phase 03 begins from this state:

- Phase 02 closeout record exists.
- The Roadmap has been rebaselined around `phase-03: Workflow Router Screen Correction and Guided Current Action UI`.
- Existing older Phase 03 artifacts for “Repository Reconciliation and Phase Planning Documents” are superseded.
- The app itself may still contain screen-picker assumptions that must be corrected.
- The Figma source-code bundle exists and should be used as UI design input for the Phase 03 shell.

## In Scope

Phase 03 includes:

- Current required action routing.
- Durable-state based current action calculation.
- Actual application UI shell update using the Figma source-code bundle as implementation input.
- Replacement of screen-picker navigation with workflow-router behavior as the primary UI path.
- Top status strip showing project, repo/MCP status, active phase, active Work Card, workflow state, and write status where available.
- Left-to-right workflow visibility where useful.
- Current action panel.
- Artifact review workspace.
- Context inspector tied to the current workflow step.
- Bottom activity/evidence log for artifact writes, approvals, validation records, repair creation, MCP/write events, and fallback events.
- Work Card as Implementer handoff.
- Architect review of Implementer Reports.
- Operator validation record creation.
- REPAIR sub-card routing.
- Phase Closeout routing.
- Roadmap Update routing.
- Next Phase Activation routing.
- Manual fallback paths where MCP/direct write is unavailable.
- State labeling and stale/superseded artifact warnings where the current repo contains conflicting old artifacts.

## Out of Scope

Phase 03 does not include:

- Treating Figma output as process authority.
- Blindly replacing the current app with the Figma prototype.
- Full broad visual polish beyond the workflow-router shell needed for Phase 03.
- Public release packaging.
- Subscription-surface automation.
- Browser automation.
- API model integration.
- New cloud/backend persistence.
- Replacing the Architect role with full automation.
- Creating executable Work Cards during Phase Mapping.
- Reopening the locked workflow baseline.

## Affected Screens / Surfaces

The exact file/component names may be determined during Work Card creation, but the affected product surfaces are expected to include:

- Primary landing and current project screen.
- Application shell.
- Navigation shell/sidebar/drawer.
- Top status strip.
- Horizontal workflow rail/process map.
- Current required action panel.
- Artifact preview/review workspace.
- Context inspector.
- Bottom activity/evidence log.
- Project Intake and Project Interview routes.
- Reconciliation Review route.
- Project Mapping and Operator Project Approval route.
- Phase Mapping route.
- Phase Approval route.
- Work Card candidate queue and Work Card detail route.
- Implementer Report capture/review route.
- Operator Validation route.
- Repair sub-card route.
- Phase Closeout route.
- Roadmap Update / Next Phase Activation route.
- MCP or repo write status indicators.

## Required State Model Behavior

The app should compute a `currentRequiredAction` or equivalent model from durable state. The model should not depend on which screen the Operator last clicked.

At minimum, the router should be able to represent:

- current workflow step
- current phase ID and title
- current Work Card candidate or active Work Card, if applicable
- required role: Operator, Architect, Implementer, or App/System
- evidence/source artifacts
- missing artifact or missing approval
- expected output artifact or record
- next success route
- failure/repair route
- manual fallback route
- stale/superseded artifact warning, if applicable

## Figma UI Shell Requirements

The Figma shell should be slotted after the durable state model exists. That placement is intentional: the UI shell should display the computed current action, not own or invent workflow state.

The UI update should adapt the following Figma source-code concepts into the real app:

- `TopStatusStrip`: project name, repo path, MCP/direct-write status, active phase, active Work Card, current workflow state, write status, and Git/branch status where available.
- `ProcessRail`: left-to-right locked workflow visibility with current step, completed steps, future steps, and loop awareness.
- `CurrentRequiredAction`: primary guided action card with why/inputs/output/success/failure.
- `ArtifactWorkspace`: focused artifact preview and review surface.
- `ContextInspector`: step-specific source artifacts, dependencies, blockers, next artifact, approval requirements, validation requirements, and related evidence.
- `ActivityLog`: compact bottom evidence trail.
- `SecondaryNavDrawer`: subordinate fallback navigation, not the primary workflow driver.

## Current Action Panel Requirements

The current action panel should be the primary UI element. It should show:

- action title
- short plain-language explanation
- role responsible for the action
- why the app selected this action
- required inputs/evidence
- artifact or record to be created
- primary action button
- secondary/manual fallback action
- next step after completion
- failure or repair path

## Workflow Visibility Requirements

A left-to-right workflow strip or process rail should show the locked workflow in human-readable order. It should highlight:

- completed steps
- current step
- blocked steps
- next step
- loop paths: project approval revision, phase approval revision, Work Card revision, repair, closeout revision, and next-phase repeat

This visibility is explanatory. It is not the source of truth.

## Artifact Review Workspace Requirements

When the current action involves reviewing or producing artifacts, the UI should provide a focused workspace showing:

- artifact being reviewed or generated
- source artifacts used
- generated draft or existing record
- pending decision
- approve/revise/carry-forward/defer/cancel options where applicable
- manual copy/paste fallback if direct write is unavailable

## Context Inspector Requirements

The context inspector should be tied to the current step. It should not be a generic file browser first.

The inspector should show:

- current project and phase state
- relevant artifact paths
- relevant status records
- stale or superseded artifacts
- MCP/read/write availability
- missing artifacts or approvals
- the reason the current step is blocked or available

## Work Card Loop Requirements

Phase 03 must preserve the corrected Work Card authority model:

- `Work_Card_Plan.md` contains mapped candidate Work Cards only.
- The Architect creates each full Work Card just in time after Operator Phase Approval.
- The Work Card is also the Implementer handoff.
- Do not route the Operator to a separate primary “Implementer Execution Packet” artifact.
- Implementer Reports route to Architect review.
- Architect review either creates validation steps or routes to a repair sub-card.
- Operator validation creates a Validation Record.
- Failed validation routes to `WCxx-REPAIRxx`.

## Closeout / Next Phase Requirements

The router must not treat phase closeout as a disconnected admin screen.

It must route closeout only when every mapped candidate is one of:

- completed
- completed via repair
- carried forward
- deferred
- cancelled

After closeout, the router should guide the Operator through:

1. Operator Phase Closeout Approval.
2. Roadmap Update.
3. Next Phase Activation.
4. Return to Phase Mapping for the first incomplete phase.

## Manual Fallback Requirements

Manual fallback is required in Alpha.

If MCP/direct write is unavailable, the UI should clearly state:

- what operation could not be completed directly
- which artifact path is affected
- what content should be copied or saved manually
- how the Operator can confirm the manual action was completed
- whether the workflow can continue in degraded/manual mode

The app must not silently continue after a failed write.

## Dependencies

- Phase 02 closeout record must remain the transition evidence.
- The locked process baseline must remain the process authority.
- Roadmap and Project Profile must remain durable state inputs.
- Existing obsolete Phase 03 artifacts must be treated as superseded, not active authority.
- Figma source code must be available to the Implementer as design/reference input.
- Secondary navigation must remain available until router correctness is validated.

## Risks

### R1. State-router overreach

A fully deterministic router could become brittle if it assumes every artifact is perfectly shaped. Phase 03 should begin with clear current-action states and safe fallbacks, not an overcomplicated workflow engine.

### R2. Operator lockout

If secondary navigation is removed too aggressively, incorrect state detection could trap the Operator. Preserve fallback/manual paths.

### R3. Artifact drift

The repo currently contains older Phase 03 artifacts with obsolete purpose. The router must surface stale/superseded artifacts instead of treating them as current authority.

### R4. Visual/process authority confusion

Figma and draw.io assets are useful, but implementation must follow the locked process baseline.

### R5. Terminology density

The UI must preserve precise artifact authority while explaining the current action in plain language for non-developer Operators.

### R6. Figma prototype mismatch

The Figma source code is a standalone prototype with demo state and may not match the existing Electron app structure. The Implementer must adapt the shell and components, not overwrite working app behavior or add unnecessary dependency complexity.

## Acceptance Goals

Phase 03 is successful when:

1. The app shows a computed current required action as the primary Operator path.
2. The current action is derived from durable project state, not screen selection.
3. The Operator can see why the action is next.
4. The Operator can see the source artifacts and expected output record.
5. The visible UI shell reflects the Figma-guided workflow cockpit structure: top status strip, process rail, current action panel, artifact workspace, context inspector, and activity log.
6. Secondary navigation is available but subordinate.
7. Phase Mapping is represented as one phase at a time.
8. Phase Planning is represented as an artifact created during Phase Mapping.
9. Work Card is represented as the Implementer handoff.
10. Implementer Reports route to Architect review.
11. Operator validation creates Validation Records.
12. Failed validation routes to `WCxx-REPAIRxx` repair sub-cards.
13. Phase Closeout, Roadmap Update, and Next Phase Activation follow the locked workflow.
14. MCP/direct-write failures present a clear manual fallback instead of silent failure.
15. Obsolete Phase 03 artifacts are not treated as active authority.
16. Stale Figma demo labels and demo data are removed or replaced with live/repo-derived state.

## Validation Expectations

Validation for Phase 03 should include manual UI walkthroughs against specific durable-state scenarios:

- New project requires Project Intake.
- Intake exists, Project Interview missing.
- Project mapping exists, Operator Project Approval missing.
- Phase Mapping bundle exists, Operator Phase Approval missing.
- Phase Approval exists, next mapped Work Card candidate needs a full Work Card.
- Work Card approved, Implementer Report missing.
- Implementer Report exists, Architect review needed.
- Architect review exists, Operator validation needed.
- Validation failed, repair sub-card needed.
- All Work Card candidates resolved, Phase Closeout needed.
- Closeout approved, Roadmap Update and Next Phase Activation needed.
- MCP/direct write unavailable, manual fallback visible.
- Figma shell displays the current state without relying on demo state switching.
- Secondary navigation remains available but visually subordinate to the current action.

## Recommended Implementation Strategy

Implement Phase 03 in small, testable slices:

1. Reconcile superseded Phase 03 artifacts and state labels.
2. Establish the durable-state current-action model.
3. Integrate the Figma-guided workflow-router UI shell around the current-action model.
4. Wire the current action panel and subordinate secondary navigation.
5. Add workflow visibility and current-step highlighting.
6. Add artifact review workspace and context inspector.
7. Route Phase Mapping and Operator Phase Approval through the shell.
8. Route Work Card, Implementer Report, validation, and repair states through the shell.
9. Route closeout, roadmap update, and next phase activation states through the shell.
10. Add manual fallback and stale-artifact warnings.
11. Validate against fixture states before broad UI polish.

## Phase Mapping Boundary

This document is Phase Mapping output only. It does not authorize implementation by itself. Formal executable Work Cards must be created later, one at a time, after Operator Phase Approval.
