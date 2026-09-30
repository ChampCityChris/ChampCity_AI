# WRB02 Architect Bundle Review

**Date:** 2026-09-26  
**Reviewed range:** `57d487e748079665d261d2c36d5fab06bd1c1e52..ee064aaa562cb548bd59ae3642ea39aea5d69650`  
**Disposition:** Core WRB02 architecture accepted; bounded Repair01 required before WRB02 closes.

## Accepted bundle work

- Workflow is now a first-class Current Project application object with exact Workflow-ID navigation.
- Same-type substantive Workflows are genuinely multi-instance.
- Direct substantive start bypasses WIR.
- WIR is a peer routing Workflow and owns no source.
- Architect routing assessment and Operator route disposition are Structured Project State authority.
- Accept/override creates one independent target Workflow in the same Project State transaction as Decision/provenance/WIR closure.
- Direct and routed source-backed targets capture the same exact Dev SourceBaseline + unprepared SourceBinding shape.
- Work Intake Routing no longer continues into WIR-owned target assessment/planning/execution/integration.
- the old Current Project routed-workflow renderer/navigation stack was removed/fenced.
- New Project owns a one-time Project Creation Workflow identity.
- focused bundle qualification passed 74/74 plus the additional 55/55 focused lane; the broad historical affected sweep was not claimed as passed.

## Finding 1 — Architect miss: Start New Project can reopen a completed Greenfield Current Project

WRB01 explicitly closed the prior bug where Start New Project could reopen an already-current managed Project. WRB02-04's wording that Greenfield retries/reopen should return the same Project Creation Workflow was too broad, and the implementation now intentionally accepts a selected Current Project whose description is "Greenfield Project".

That conflates two different operations:

- **retry incomplete New Project initialization** — valid;
- **re-enter an already-established Current Project through Start New Project** — invalid.

The correct behavior is:

- if no Current Project registration exists, New Project may establish/finish Greenfield initialization;
- if a Current Project registration exists but the one-time Project Creation Workflow was never successfully established, a bounded retry may finish that incomplete initialization;
- once the Current Project has its Project Creation Workflow, Start New Project must reject it and direct the user to Open Existing Project;
- reopening Project Creation occurs from the exact Workflow instance in the Hub, not from the Landing New Project action.

This is an Architect specification miss, not a Luna interpretation defect.

## Finding 2 — Implementer defect: closed WIR history immediately redirects to its target

WRB02-04 requires opening a closed WIR row to show a completed routing summary with an explicit Open Target Workflow action.

`StructuredWorkRoutingWorkspace` currently calls `onRouted(targetWorkflowId)` whenever its initial load or refresh sees a target. Therefore opening a closed WIR row immediately navigates away to the target and the completed routing record cannot actually be inspected.

The static renderer test proves that the target button exists in markup but does not execute the component effect, so it misses the navigation defect.

Only the successful accept/override action should automatically open the newly created target. Initial load/refresh of a closed WIR must remain on the completed WIR summary until the Operator chooses Open routed Workflow.

## Finding 3 — WIR Workflow title bypasses the bounded Workflow-title contract

Direct and routed substantive Workflow creation enforce a 1–200 character title. `createWorkIntake()` creates its WIR Workflow directly with the entire Work Intake request as the Workflow title.

Current Work Intake capture allows requests far larger than 200 characters, so a valid intake can create a huge Workflow title and Hub row. The WorkIntake request itself should remain complete; only the derived WIR display title must be bounded deterministically.

This is a local consistency defect in the WIR creation primitive.

## Finding 4 — qualification debt: permanent source lifecycle fixtures remain stale against Current Project registration

WRB02-01/03/04 repeatedly recorded known failures in:

- `test/source-control/workflow-source-materialization.test.cjs`;
- `test/source-control/structured-integration.test.cjs`.

Code review confirms the production materialization service is compatible with WRB02-created SourceBaseline/SourceBinding state. The failures arise because those permanent fixtures still construct pre-WRB01 Project state and do not establish the required Current Project registration.

These are not grounds for another production architecture change, but WRB02 should not close while its own source-backed Workflow contract leaves the permanent materialization/integration proof knowingly red.

Repair the fixtures to the Current Project model and use them to prove the cross-bundle seam:

`WRB02 Workflow creation/handoff → lazy materialization → checkpoint/integration`.

Do not add a new broad test family.

## Repair disposition

Release WRB02-R01 as two sequential repair cards:

1. restore Greenfield entry and closed-WIR/history/title semantics;
2. repair the existing source lifecycle proof fixtures and requalify WRB02.

Luna may execute both sequentially with card-local checkpoints. Stop after R01-02 for final Architect disposition. WRB03 remains unauthorized until WRB02 closes.
