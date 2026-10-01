# SETTINGS-NAV-R01 Architect Review — 2026-10-01

**Implementation checkpoint:** `0ca2fd61d8cf165486c7c2c508735976389f2d95`  
**Disposition:** **ACCEPTED — OPERATOR RETEST AUTHORIZED**

## Review result

The Settings navigation repair matches the required architecture.

The previous fragmented return state has been removed. Settings now captures one renderer-owned `SettingsReturnContext` containing the exact shell, active workspace step, legacy foreground ID, Workflow type, exact Workflow ID, and Work Intake ID.

Opening Settings no longer performs a workflow transition or clears the selected Workflow state.

## Exact Greenfield return accepted

The reported Greenfield failure is corrected.

For a Project Creation / Greenfield Workflow, the return snapshot preserves:

```text
shellView = workflow
selectedWorkflowId = exact project-creation Workflow
workflowInstance = retained exact instance
activeWorkflowId = null
activeWorkspaceId = exact prior step
```

Return restores those values directly rather than mapping the workflow to the legacy `development` foreground or routing through `transitionToWorkflowStep()`.

The permanent App-level test reproduces a Greenfield Work Card Implement foreground, opens Settings, and restores the exact Workflow ID and `work-card-building-review` workspace without reopening the Project.

## Other foregrounds accepted

The same snapshot/restore mechanism covers:

- workflow-instance;
- workflow-type;
- Workflow Hub;
- Issue Resolution;
- Source Control;
- reachable Work Intake.

Exact Workflow IDs are revalidated through the existing `getWorkflow()` API when a selected Workflow exists.

If the Workflow no longer exists, Return fails closed to the Workflow Hub with a bounded error rather than silently selecting another Workflow.

## Workflows escape hatch accepted

Settings now renders the normal Workflows navigation action whenever a Current Project exists.

Using Workflows:

- exits Settings;
- retains the Current Project;
- cancels the stale return snapshot;
- does not open the Project chooser.

The asynchronous Return revalidation path is guarded so a late completion cannot overwrite a newer Workflows navigation action.

## Scope preservation

The repair changes renderer navigation state only.

It does not change:

- Project State;
- workflow topology;
- Work Card progression;
- Agent Harness lifecycle;
- Codex authentication;
- Git/source-control behavior.

## Validation disposition

The Implementer report records:

- production build: pass on normal Windows;
- focused renderer owners: 65/65 pass;
- repair validation-plan preview: pass;
- `git diff --check`: pass.

Architect review inspected the actual App navigation implementation, sidebar change, exact-workflow revalidation, stale-return cancellation, and the permanent App callback tests.

## Non-blocking observation

The return snapshot revalidates `selectedWorkflowId` whenever one is retained, including foregrounds such as Source Control. This is conservative and does not affect the reproduced Greenfield defect. A future renderer cleanup may narrow revalidation to foregrounds whose identity actually depends on the selected Workflow, but no follow-up is required for this repair.

## Next step

Operator validation is authorized:

```text
Signal Forge
-> Greenfield Project
-> phase-1 / phase-1-c01 / Implement
-> Settings
-> Return
-> same exact Implement foreground
```

Also verify the Settings-side Workflows action returns to the Workflow Hub without reselecting Signal Forge.
