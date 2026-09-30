# WRB02-02 — Replace Workflow Hub with Multi-Instance Inventory and Direct-Start UX

**Depends on:** WRB02-01 checkpoint
**Implementer:** GPT 6.0 Luna Medium

## Objective

Make the Current Project Hub represent the approved multi-instance Workflow model instead of one generic Start Work card or the obsolete Development/Issue registry.

Operators must see exact Workflow instances grouped by canonical type, start repeatable substantive Workflows directly, open an exact instance, optionally start WIR, and keep Source Control as shared Project infrastructure.

## 1. Production IPC/preload boundary

Expose the WRB02-01 application service through bounded Current Project APIs equivalent to:
- `listWorkflows()`;
- `startWorkflow({ workflowType, title })`;
- `getWorkflow(workflowId)`.

Do not expose generic Project State mutation or allow renderer-supplied currentWorkspace/source seed.

Exact Workflow ID is required for `get/open`.

## 2. Replace obsolete Hub contracts

`src/shared/workflowHubContracts.ts` must no longer define `development | issue-resolution` as the Workflow identity model.

Either retire it in favor of `workflowApplicationContracts.ts` or redefine it only as renderer presentation metadata derived from the canonical Workflow type registry.

No parallel workflow-type registry is allowed.

## 3. Hub layout and multiplicity

Update `WorkflowHubWorkspace` to render canonical type collections.

Required visible groups/actions:
- Feature / Capability — `+ Start Feature`;
- Refactor / Migration — `+ Start Migration`;
- Integration / Composition — `+ Start Integration`;
- Infrastructure / Platform — `+ Start Infrastructure Work`;
- Research / Prototype — `+ Start Research`;
- Issue Resolution — `+ New Issue`;
- Work Intake Routing — `+ Help Me Route New Work`.

Project Creation/Greenfield is not startable from an Existing Project Hub. If a Project Creation Workflow exists, it may appear as a non-startable instance/history group.

Each group shows independent instance rows. Each row must display at least:
- title;
- state/status;
- current workspace label/identifier;
- exact instance selection affordance.

Completed instances remain visible but visually distinguishable from active instances.

Do not collapse same-type instances into one status card. Two Features and ten Issues must remain ten/two exact durable instances.

## 4. Direct-start interaction

Starting a substantive Workflow requires a bounded human title. Use a small inline/modal start form appropriate to the existing Hub style; do not create a generic wizard.

On successful start:
- refresh inventory;
- select/open the exact returned Workflow ID;
- do not enter WIR;
- do not create Work Intake;
- do not materialize source.

`+ Help Me Route New Work` continues to open the source-neutral Work Intake capture workspace. WIR Workflow identity is created only when the intake is saved, as established by Project State.

## 5. Exact instance foreground

Add a bounded `WorkflowInstanceWorkspace` (or equivalent) used until WRB03 supplies the bespoke planning front halves.

It must show:
- exact title/type;
- current Workflow state;
- current workspace;
- routed/direct provenance when present;
- Back to Workflows.

It must not invent planning fields or reuse legacy Development/Issue execution screens.

For an active WIR instance with an initiating WorkIntake, opening the instance should enter the Work Intake/WIR foreground for that exact intake rather than the generic substantive instance shell.

For substantive Workflow instances, open the exact generic instance shell. WRB03 will replace the type-specific intake/planning body while retaining exact Workflow identity.

## 6. Renderer state

Add `selectedWorkflowId` as the exact Current Project Workflow selection. Do not reuse the legacy `activeWorkflowId` type alias (`development | issue-resolution`) as canonical identity.

Hub refresh must preserve selection only while the exact Workflow ID still exists.

Returning from an instance returns to Hub without destroying the instance.

## 7. Remove Current Hub reachability to legacy workflow stacks

Direct Issue start must not call the old Issue inventory/create APIs. Feature/Refactor/etc. must not enter routed planning/execution.

Legacy renderer/backend modules may remain until later retirement if still referenced by non-current fallback tests, but no new Hub action may enter them.

## 8. Permanent proof

Update/replace `workflow-hub-shell.test.cjs` and add focused renderer/application boundary proof for:
- exact seven Hub groups/actions above;
- no Development legacy registry/cards;
- no direct Project Creation start action;
- two Feature rows render independently;
- multiple Issue rows render independently;
- completed row remains visible;
- direct start sends exact type/title and opens returned Workflow ID;
- WIR action opens Work Intake rather than creating a substantive Workflow;
- exact instance row opens exact Workflow ID;
- WIR instance row opens its initiating intake;
- Source Control remains capability-gated by WRB01 optional source backing;
- no legacy Issue/Development foreground is entered by new Hub actions.

## UI constraint

Reuse the established ChampCity Hub visual language. This card is a functional multi-instance Hub, not a placeholder list of raw IDs or developer buttons.

## Non-scope

Do not implement bespoke Feature/Issue/Refactor/etc. intake/planning, WIR Architect assessment conversion, route handoff, shared execution, or final legacy module deletion.

## Validation

Run build, Workflow application tests, Workflow Hub renderer tests, Current Project entry regression, focused preload/IPC tests, validation-plan preview, bounded affected lanes if reasonable, and `git diff --check`.

## Report/checkpoint

Write `docs/implementation-bundles/workflow-runtime-rebaseline/WRB02/Reports/WRB02-02_IMPLEMENTER_REPORT.md`.

Suggested commit: `WRB02-02 establish multi-instance Workflow Hub`.

Then proceed directly to WRB02-03.