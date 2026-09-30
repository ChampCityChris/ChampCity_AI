# WIR-UX02 — Rebuild Routing Assessment and Route Decision Workspace

**Status:** IMPLEMENTER_READY  
**Depends on:** WIR-UX01  
**Type:** Routed Architect Workspace repair

## Objective

Replace the bare `WorkRoutingAssessmentPanel` / nested `WorkRouteDecisionPanel` interaction with one usable Routing Workspace that presents the saved Intake, embedded Architect/ChatGPT, routing recommendation, and Operator route decision using established ChampCity patterns.

## Governing invariant

Routing changes the domain data and Architect prompt; it does not invent a new interaction model.

The Operator must never need to leave the Workspace to find the LLM surface or interpret internal submission state.

## Exact implementation

Create:

`src/renderer/app/WorkRoutingWorkspace.tsx`

Use:

- `DocumentChatWorkspaceShell`;
- `FigmaBrowserPanel`;
- existing browser action CSS/pattern;
- `FigmaMarkdownBody` or `FigmaDocumentCard` for Intake/assessment display.

### Left/document column

Before an assessment exists:

- show the saved Work Intake as readable task context;
- explain that the Architect route recommendation is the next step in ordinary language.

After assessment promotion:

- provide document tabs for Work Intake and Routing Assessment;
- show recommended route label, traits, rationale, evidence, and alternate when present;
- technical path/revision may appear in secondary detail only.

### Architect column

Present the embedded ChatGPT surface on the same screen.

Actions:

- Prepare Handoff;
- Copy Handoff;
- Refresh;
- Reload ChatGPT.

Map current service states to human copy. Do not render `not-prepared`, `waiting-for-drafts`, `promoted`, `awaiting-assessment`, or draft paths as primary UI.

### Route decision

After a current assessment exists, show one explicit Operator disposition area:

- recommendation;
- rationale/revision notes;
- Accept Recommendation;
- Override Route using supported route selector;
- Request Revised Assessment.

Accept/revision/override remain backed by `decideWorkRoute`.

A route decision refreshes routed navigation. It must not render Assessment, Issue, or Planning inline.

### Revision request

When the Operator requests a revised assessment:

- the same Routing Workspace remains active;
- Prepare/Copy Handoff becomes available for the revised routing assessment;
- prior recommendation remains inspectable as history;
- no route selection changes until a later Operator decision.

## Remove wrong composition

Retire or reduce to non-rendering helpers:

- `WorkRoutingAssessmentPanel.tsx`;
- `WorkRouteDecisionPanel.tsx`.

No later lifecycle component may be imported by the Routing Workspace.

## App integration

At routed stage `routing`, App supplies:

- current Intake ID;
- embedded browser panel;
- prepare/copy/refresh actions;
- navigation refresh callback.

Use the existing browser host/ref from App. Do not instantiate another browser.

## Bounded continuation

Continue fixing renderer-local state/action wiring inside App and Routing workspace until:

- Prepare enables Copy;
- the embedded browser is visible;
- Refresh promotes a valid MCP-created draft;
- the recommendation becomes reviewable;
- an Operator decision advances navigation.

Do not stop on a stale UI label or minor projection mismatch; fix it within the routing/view boundary.

## Validation

Extend `test/renderer/work-intake-routed-workspaces.test.cjs` to prove:

- Routing Workspace contains the Architect browser slot;
- no nested `WorkPlanningPanel`, `WorkIssuePanel`, or routed execution surface exists;
- internal routing states are not rendered verbatim;
- assessment presence controls the disposition area;
- route decision completion requests navigation refresh.

Update the existing route-decision renderer assertion in `architect-output-workspace-repair.test.cjs` only as needed to target the new controls without preserving obsolete component structure.

## Visual evidence

Exercise in the running app:

1. saved Intake / no handoff;
2. handoff prepared;
3. promoted recommendation;
4. route decision controls;
5. revision-requested state.

At 1280×720 the embedded Architect and the required routing task/action must remain reachable without horizontal scrolling.
