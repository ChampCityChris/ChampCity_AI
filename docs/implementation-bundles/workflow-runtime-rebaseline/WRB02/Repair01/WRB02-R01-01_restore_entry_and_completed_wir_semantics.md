# WRB02-R01-01 — Restore Greenfield Entry and Completed WIR Semantics

**Parent:** WRB02  
**Starting checkpoint:** `ee064aaa562cb548bd59ae3642ea39aea5d69650`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Correct three bounded product-semantics defects without changing the accepted WRB02 architecture:

1. distinguish incomplete Greenfield initialization retry from reopening a completed Current Project through Start New Project;
2. make closed WIR instances inspectable history instead of auto-redirecting to their targets;
3. keep WIR Workflow display titles inside the canonical bounded Workflow-title contract.

## 1. Restore Start New Project semantics

WRB01's accepted rule remains authoritative:

> An already-established Current Project is reopened through Open Existing Project / Workflow Hub, not Start New Project.

Current WRB02 behavior permits `project:registerCurrent("greenfield")` whenever the selected Current Project description is `Greenfield Project`. Remove that broad allowance.

Required behavior:

### No Current Project registration

Preserve the established Greenfield sequence:

`managed source baseline → Current Project registration → one Project Creation Workflow`.

### Current Project registration exists, but Project Creation Workflow is absent

This is an incomplete Greenfield initialization and may be retried only when all of the following are true:

- the selected Current Project is the Greenfield Project created by this entry path;
- the managed Greenfield source topology is present and validates;
- there is no current or historical `project-creation` Workflow for that Project.

The retry may call `ensureProjectCreationWorkflow()` to finish the missing one-time Workflow and return its exact ID.

It must not create another Current Project, Repository resource, source baseline, or Project Creation Workflow.

### Current Project already has Project Creation Workflow/history

Start New Project must reject with a bounded message directing the user to Open Existing Project.

Do not return the existing Workflow as a successful Start New Project operation.

Reopening active/completed Project Creation occurs from the exact Workflow instance in Workflow Hub.

### Existing Project

No behavior change: Existing Project opens Current Project/Hub and creates no automatic substantive/WIR Workflow.

## 2. Permanent Greenfield proof

Update `test/project-state/current-project-entry.test.cjs`.

Required proof:

- first New Project creates exactly one Project Creation Workflow;
- a second Start New Project against that completed Current Project is rejected;
- the rejected attempt creates no additional Workflow/Project/resource/source record;
- opening the Project through Existing Project still exposes the same exact Project Creation Workflow in inventory;
- a synthetic incomplete Greenfield Current Project with valid managed source but no Project Creation Workflow can finish exactly once through retry;
- after that completion, another Start New Project attempt is rejected.

Do not weaken the WRB01 source/topology proof.

## 3. Closed WIR is history, not an automatic redirect

Current `StructuredWorkRoutingWorkspace` calls `onRouted()` from initial load/refresh whenever `targetWorkflowId` exists.

Remove that behavior.

Required navigation:

- successful **new** accept/override action may immediately call `onRouted(newTargetWorkflowId)`;
- initial load of a closed WIR stays on the WIR;
- refresh of a closed WIR stays on the WIR;
- opening a closed WIR from Hub stays on the WIR;
- completed WIR displays selected route, exact target identity, and explicit **Open routed Workflow** action;
- no accept/override/request-revision/prepare/copy controls are actionable for closed WIR;
- Back to Workflows returns to Hub.

Do not reopen the old routed assessment/plan/execution pipeline.

If the embedded Architect browser would remain attached/rendered for a closed WIR, suppress it for the completed-history state. A completed WIR is a routing record, not an active Architect workspace.

## 4. Renderer proof must exercise navigation behavior

The current static-markup test proves the target button exists but cannot detect the auto-redirect effect.

Add a bounded testable state/navigation seam or component test that proves:

- loading `{ closed: true, targetWorkflowId: "target-exact" }` does **not** call `onRouted`;
- clicking Open routed Workflow does call it exactly once;
- a successful live decision returning a new target still triggers the immediate handoff once.

Do not add a browser/Electron end-to-end suite merely for this behavior.

## 5. Bound the WIR Workflow title

`ProjectStateService.createWorkIntake()` currently copies the entire Work Intake request into `Workflow.title`.

Keep the full request in the WorkIntake record.

Derive the WIR Workflow display title deterministically:

- trim request;
- maximum 200 characters;
- no random suffix;
- no source/route/type inference;
- exact WorkIntake/Workflow IDs remain identity.

A valid Work Intake request longer than 200 characters must save successfully while its WIR Workflow title is bounded to 200 characters.

Do not reduce the Work Intake request's existing semantic bound merely to satisfy the display title.

## 6. Permanent title proof

Extend existing Work Intake/Project State proof:

- save a request longer than 200 characters;
- WorkIntake retains the complete request;
- initiated WIR Workflow title is the deterministic bounded prefix;
- inventory renders/returns the bounded title;
- exact Workflow identity/provenance remains unchanged.

## Non-scope

Do not change:

- route catalog;
- direct-start Workflow semantics;
- target Workflow creation;
- SourceBaseline/SourceBinding rules;
- source materialization;
- Workflow planning;
- shared execution;
- legacy module retirement beyond the closed-WIR presentation path;
- WRB03.

## Validation

Run:

- build;
- Current Project entry focused test;
- Workflow Hub/routing renderer focused tests;
- structured Work Intake capture test;
- Workflow application service test if touched by title/inventory proof;
- capability-map integrity if metadata changes;
- exact validation-plan preview;
- bounded affected lanes only under the lean-test policy;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB02/Repair01/Reports/WRB02-R01-01_IMPLEMENTER_REPORT.md`

Suggested commit:

`WRB02-R01-01 restore Project entry and completed WIR semantics`

Then proceed directly to R01-02.
