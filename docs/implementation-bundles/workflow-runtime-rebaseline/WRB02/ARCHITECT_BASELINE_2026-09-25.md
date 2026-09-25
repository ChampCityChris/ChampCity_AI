# WRB02 Architect Baseline — Workflow Application, Inventory, and Routing

**Date:** 2026-09-25
**Starting checkpoint:** `76ecb4f97ca8aa52b46fdfc95f25e186af20bc4b`
**Parent re-baseline:** `docs/implementation-bundles/workflow-runtime-rebaseline/REBASELINE_2026-09-24.md`

## Accepted product model

- Workflow is a first-class Project-owned multi-instance domain object.
- Canonical types remain: Project Creation/Greenfield, Feature/Capability, Refactor/Migration, Integration/Composition, Infrastructure/Platform, Research/Prototype, Issue Resolution, and Work Intake Routing.
- Project Creation is one-time per Project and entered through New Project creation; it is not a repeatable Existing-Project Hub action.
- All other substantive types support concurrent independent instances.
- WIR is an optional routing Workflow. Direct substantive entry bypasses WIR.
- WIR owns no SourceLine. It captures/assesses/routes, creates the independent target Workflow, links `routes_to`, closes immediately, and opens the target.
- Direct-start and WIR-routed substantive Workflows converge on the same Workflow creation/source-baseline service.
- A source-backed substantive Workflow captures its exact immutable Dev SourceBaseline at Workflow creation. Writable SourceLine/RepositoryCheckout materialization remains lazy and is not triggered by WRB02.
- Structured Project State is authoritative. Markdown may remain generated projection/evidence; it is not routing or Workflow state authority.

## Current repository findings

1. `workflowTypeRegistry.ts` already contains the correct eight canonical Workflow types and repeatability, but it does not own entry-workspace/direct-start/Hub metadata.
2. Project State already supports multiple Workflow instances, WIR `initiates`, RouteAssessment, Operator route Decisions, immutable `routes_to`, SourceBaseline, and SourceBinding.
3. There is no production Workflow application service that creates/lists/opens exact Workflow instances for the Current Project.
4. `workflowHubContracts.ts` still describes the obsolete two-entry Development/Issue model. The Current Hub only exposes Start Work and Source Control; it has no Workflow instance inventory or direct-start actions.
5. Structured Work Intake capture creates the correct WorkIntake + WIR Workflow, but the renderer deliberately stops navigation because the old downstream routing stack is legacy.
6. `workRoutingAssessmentService.ts`, `workRouteDecisionService.ts`, and `workIntakeNavigationService.ts` remain Markdown/legacy-branch based. They assume Work Intake owns source and/or that the Project root is a Git checkout, so they cannot be the Current Project WIR authority.
7. Existing `WorkRoutingWorkspace` already has the approved two-column Architect UX: saved context/recommendation on the left, embedded ChatGPT browser on the right, Prepare/Copy/Refresh handoff controls, and Operator accept/override/request-revision controls. WRB02 should reuse that UX rather than invent another routing screen.
8. Old routed planning/execution and legacy Issue stacks remain in the renderer. WRB02 must make them unreachable from the Current Project WIR/Hub; WRB03/04 own their replacements and final retirement.

## WIR route catalog for the Current Project

WIR routes only among repeatable substantive Existing-Project workflows:

| WIR route | Target Workflow type |
| --- | --- |
| `feature-change` | `feature-capability` |
| `refactor-migration` | `refactor-migration` |
| `integration-composition` | `integration-composition` |
| `infrastructure-platform` | `infrastructure-platform` |
| `research-prototype` | `research-prototype` |
| `issue-resolution` | `issue-resolution` |

`greenfield` remains a planning/profile identity for Project Creation but is not selectable by Existing-Project WIR. Greenfield starts through New Project creation.

## WRB02 bundle outcome

At bundle completion:
- the Hub groups exact Workflow instances by canonical type and exposes the approved `+ Start …` actions;
- direct starts create independent SPS Workflow instances and open the exact instance;
- active/completed WIR instances are visible as peer instances;
- `+ Help Me Route New Work` opens source-neutral Work Intake;
- saved WIR opens the established Architect routing workspace with embedded ChatGPT;
- Architect advice is promoted into SPS RouteAssessment state; Markdown is projection/evidence only;
- Operator accept/override creates the target Workflow through the same application service used by direct start, records route provenance, closes WIR immediately, and opens the target;
- request revision keeps WIR open and prepares another Architect assessment cycle;
- no Current Project WIR proceeds into the old WIR-owned assessment/plan/execution/integration pipeline.

WRB03 begins from the exact target Workflow identity and implements the first normalized bespoke planning front halves.