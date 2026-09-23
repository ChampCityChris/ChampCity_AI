# WIR-UX04B — Route Issue Work into Existing Issue Resolution Workspaces

**Status:** IMPLEMENTER_READY  
**Depends on:** WIR-UX02  
**Type:** Workflow consolidation repair

## Objective

Remove the duplicate routed Issue UI and transition an Operator-selected `issue-resolution` Work Intake into the existing Issue Resolution workflow/rail with the routed Issue selected.

## Governing invariant

There is one Issue Resolution user experience.

Work Intake routing may create/bind an Issue and preserve Intake/branch lineage, but RCA, Issue Planning, Fix Cards, validation, and close are presented by the existing Issue Resolution workspaces.

## Verified backend

`workIssueRoutingService.ts` already adapts routed Work Intake evidence into the existing Issue services:

- creates a lightweight Issue Record;
- calls existing Architect Planning preparation/review;
- records routed assessment evidence;
- supports reroute recommendation;
- links correction execution/integration evidence.

Preserve that bridge.

## Exact implementation

### 1. Replace WorkIssuePanel

Remove the duplicate RCA/planning/execution UI in `WorkIssuePanel.tsx`.

Create a minimal route bridge component or App action that:

- queries routed Issue status;
- if no Issue exists, exposes **Open Issue Resolution**;
- calling it executes `runWorkIssueAction(intakeId, "open")`;
- receives the created issueId;
- switches App to `activeWorkflowId = "issue-resolution"`;
- selects that issue;
- opens `architect-planning`.

If the Issue already exists, expose **Continue Issue Resolution** and perform the same transition without creating another Issue.

### 2. Preserve return lineage

Add a read-only projection/API that resolves whether an Issue belongs to a routed Work Intake and returns its intakeId/route decision identity.

Do not rely only on transient React state.

When routed Issue correction reaches its existing close/completion boundary, present a **Return to Work Intake Integration** action that opens the originating Work Intake at Integration.

This is navigation only. Integration eligibility remains owned by routed integration services.

### 3. Reroute

When existing Issue Architect Planning recommends reframe:

- current reroute service behavior remains;
- returning to Work Intake opens Routing with the reroute recommendation;
- no duplicate reroute controls remain inside Issue pages beyond existing recommendation context.

### 4. Remove nested planning/execution

Do not render:

- `WorkPlanningPanel`;
- `RoutedExecutionPanel`;
- routed Phase acceptance controls

inside Issue Resolution.

The existing Issue Planning/Fix Card/Validation/Close workspaces own the user experience.

## Bounded continuation

Continue through any App navigation or projection wiring needed to preserve the routed Issue return path. Do not duplicate another Issue rail because a return callback is inconvenient.

## Validation

Prove:

- selecting Issue route does not render duplicate RCA controls under Work Intake;
- Open Issue Resolution creates exactly one Issue and opens existing Architect Planning;
- Continue reuses the same Issue;
- routed Issue source lineage remains queryable after renderer restart/state reset;
- correction completion offers return to Work Intake Integration;
- reroute recommendation returns to Work Intake route decision without changing route automatically.

Run the existing Issue Resolution renderer owners to prove no regression.
