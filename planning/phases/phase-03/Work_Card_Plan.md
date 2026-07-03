# Work Card Plan: phase-03

Status: Approved / Current Phase 03 Work Card candidate plan
Project: ChampCity A/I
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Revision note: Revised after Operator review to explicitly slot Figma source-code UI shell implementation into Phase 03.
Executable Work Cards: WC01 created just in time; later candidates not created

## Boundary

This Work Card Plan contains mapped Work Card candidates only. It is not a set of executable Work Cards. It intentionally includes only Work Card ID, title, summary, order, dependencies, and purpose.

Formal Work Cards must be created later by the Architect, just in time, after Operator Phase Approval.

## Figma Source Placement Decision

The Figma source-code UI update belongs immediately after the durable current required action model and before route-specific screen corrections.

Reason: the application must first compute the current required action from durable project state. Once that state exists, the Figma-guided UI shell can display it through the top status strip, process rail, current action panel, artifact workspace, context inspector, and activity log. Route-specific screens should then be wired into that shell.

The Figma source code should be treated as implementation input and visual/layout reference, not process authority. Demo state, stale labels, static artifacts, and prototype-only controls must be replaced or adapted.

## Work Card Candidates

### WC01 — Superseded Phase 03 Artifact and Roadmap State Reconciliation

Order: 1

Dependencies: Phase 02 closeout record; locked workflow baseline; current Roadmap; existing obsolete Phase 03 artifacts.

Purpose: Prevent stale Phase 03 planning artifacts from being treated as current authority and align app-visible state with the manually activated workflow-router phase.

Summary: Map the state correction needed so the app and repo recognize Phase 03 as “Workflow Router Screen Correction and Guided Current Action UI,” while preserving older Phase 03 artifacts as superseded historical records.

### WC02 — Durable Current Required Action Model

Order: 2

Dependencies: WC01; locked workflow baseline; Project Profile; Roadmap; phase/work-card/validation/closeout artifact structure.

Purpose: Create the state model that determines the Operator’s current required action from durable project evidence.

Summary: Map the current-action computation layer, including current workflow step, responsible role, required evidence, expected output artifact, success route, failure route, manual fallback route, and stale-state warnings.

### WC03 — Figma Workflow Router UI Shell Integration

Order: 3

Dependencies: WC02; uploaded Figma source-code bundle; existing Electron/React app shell.

Purpose: Actually update the application UI so the workflow-router model is visible and usable, rather than only structurally represented in state.

Summary: Map adaptation of the Figma source-code shell into the real app, including top status strip, horizontal process rail, current required action area, artifact workspace, context inspector, subordinate navigation drawer, and bottom activity/evidence log. The implementation must replace demo/static Figma state with live durable-state routing and must remove stale labels or prototype-only controls.

### WC04 — Primary Current Action Panel

Order: 4

Dependencies: WC02; WC03.

Purpose: Replace screen-picker behavior with a primary guided action surface.

Summary: Map the UI panel that tells the Operator what to do now, why it is next, what artifact or record will be created, what inputs are being used, and what happens after success or failure.

### WC05 — Subordinate Navigation and Manual Fallback Preservation

Order: 5

Dependencies: WC02; WC03; WC04.

Purpose: Keep the Operator from being trapped by imperfect router state while making the router the primary path.

Summary: Map the navigation correction so secondary screens remain reachable as fallback/supporting views, but no longer function as the primary workflow model.

### WC06 — Left-to-Right Workflow Visibility

Order: 6

Dependencies: WC02; WC03; WC04.

Purpose: Give the Operator a readable process map that follows the locked workflow and highlights the current step.

Summary: Map a left-to-right workflow strip or process rail showing the main workflow, current step, blocked/completed states, and major loops including project approval revision, phase approval revision, Work Card revision, repair, closeout revision, and next-phase repeat.

### WC07 — Artifact Review Workspace

Order: 7

Dependencies: WC02; WC03; WC04.

Purpose: Tie artifact review and artifact creation to the current workflow step instead of separate manual screen selection.

Summary: Map a workspace that presents the relevant draft, source artifacts, pending decision, expected output record, and approve/revise/defer/carry-forward/cancel actions where applicable.

### WC08 — Current Step Context Inspector

Order: 8

Dependencies: WC02; WC03; WC07.

Purpose: Let the Operator see the durable-state evidence behind the routed current action.

Summary: Map a context inspector that shows current project/phase state, relevant artifact paths, missing records, stale/superseded artifacts, MCP/write availability, and why the current step is available or blocked.

### WC09 — Phase Mapping and Operator Phase Approval Route Correction

Order: 9

Dependencies: WC02; WC03; WC04; WC07; WC08.

Purpose: Correct the Phase Mapping screen/route so it supports one-phase-at-a-time mapping and phase approval rather than unreliable phase selection or Phase Planning screen drift.

Summary: Map the corrected route for Phase_Interview.md, Phase_Planning.md, Work_Card_Plan.md, and Operator_Phase_Approval handling inside the workflow-router UI shell.

### WC10 — Work Card as Implementer Handoff Route

Order: 10

Dependencies: WC02; WC03; WC04; WC09.

Purpose: Preserve the corrected authority model that the Work Card is the Implementer handoff.

Summary: Map the Work Card Loop route from mapped Work Card candidate to just-in-time full Work Card creation, Operator Work Card review, Implementer handoff, and Implementer Report expectation without creating a separate primary Implementer Prompt artifact.

### WC11 — Implementer Report to Architect Review Route

Order: 11

Dependencies: WC10.

Purpose: Route Implementer Reports to Architect review before Operator validation.

Summary: Map the report intake/review path where the Architect reviews the Implementer Report, determines whether repair is needed before validation, and provides validation steps only when the implementation is ready for Operator validation.

### WC12 — Operator Validation Record and REPAIR Sub-Card Route

Order: 12

Dependencies: WC10; WC11.

Purpose: Ensure validation and repair follow the locked Work Card Loop.

Summary: Map the route where Operator validation creates a Validation Record, failed validation routes to `WCxx-REPAIRxx`, and repair sub-cards return to the Implementer path with parent Work Card rollup status.

### WC13 — Phase Closeout, Roadmap Update, and Next Phase Activation Route

Order: 13

Dependencies: WC02; WC03; WC10; WC11; WC12.

Purpose: Connect the end of the Work Card Loop to phase closeout and next-phase routing.

Summary: Map closeout eligibility, Operator Phase Closeout Approval, Roadmap Update, Next Phase Activation, and return to Phase Mapping for the first incomplete phase.

### WC14 — MCP/Direct Write Status and Manual Artifact Fallbacks

Order: 14

Dependencies: WC03; WC04; WC07; WC08; WC09; WC10; WC12; WC13.

Purpose: Preserve Alpha usability when MCP or direct file write is unavailable.

Summary: Map visible degraded-mode handling that tells the Operator what write/read action failed, which artifact path is affected, what content must be copied/saved manually, and how to confirm continuation.

### WC15 — Router UI Fixture Validation and Regression Scenarios

Order: 15

Dependencies: WC02 through WC14.

Purpose: Validate that the workflow-router model and visible UI behave correctly across the locked workflow states.

Summary: Map fixture-driven and manual validation scenarios for each major durable-state condition: missing intake, missing interview, missing approvals, pending Work Card, pending report, pending Architect review, pending validation, failed validation/repair, closeout readiness, roadmap update, next phase activation, stale artifacts, MCP fallback, and Figma-shell UI state display without demo-state dependency.

## Candidate Ordering Rationale

The phase begins with state authority and stale artifact reconciliation because the current repo contains obsolete Phase 03 artifacts. It then establishes the current-action model. The Figma workflow-router UI shell is slotted immediately after that model because the shell needs state to display and the remaining route-specific work should plug into the shell rather than recreate separate screens. Work Card, validation, repair, and closeout routes are mapped after the core router and UI workspace because those loops depend on accurate current-action state and a visible workflow surface.

## Not Created In This Plan

No executable Work Cards are created here. No implementation instructions are included. No Implementer prompts are created. No code changes are authorized by this file alone.
