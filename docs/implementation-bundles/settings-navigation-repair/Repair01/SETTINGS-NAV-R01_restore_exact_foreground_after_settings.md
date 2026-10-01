# SETTINGS-NAV-R01 — Restore Exact Workflow Foreground After Settings

**Bundle:** Renderer Settings Navigation  
**Current Dev baseline:** `1952604bd24bd3407ff1d6e399d62474cd5f5da4`  
**Reproduced project:** Signal_Forge  
**Implementer:** GPT 6.1 Sol / Luna Medium acceptable  
**Status:** **ACTIVE — SETTINGS NAVIGATION DEFECT**

## Objective

Fix Settings navigation so the Operator can enter Settings from any Current Project workflow and return to the exact foreground they left.

The reported defect occurs from a Greenfield Project Work Card Implement screen:

```text
Signal_Forge
-> Project Creation / Greenfield workflow
-> phase-1
-> work card phase-1-c01
-> Implement
-> Settings
-> Return does not restore the workflow
-> Operator is effectively trapped unless choosing/opening a Project again
```

Settings is an overlay-style application workspace. Entering Settings must not destroy or reconstruct workflow identity.

Required behavior:

```text
workflow foreground
-> Settings
-> Return
-> exact same workflow / workflow instance / work intake / workflow step
```

---

# Confirmed RCA

## 1. Settings stores an incomplete return context

Current `openSettingsWorkspace()` records:

```ts
settingsReturnShellView
settingsReturnWorkflowId
priorWorkflowWorkspaceId
```

For `shellView === "workflow"` it stores `activeWorkflowId`.

Greenfield Project uses a different identity model:

```text
selectedWorkflowId = exact project-creation workflow
workflowInstance = exact project-creation workflow
activeWorkflowId = null
shellView = workflow
activeWorkspaceId = current Greenfield step
```

Therefore Settings saves `settingsReturnWorkflowId = null` for the exact Greenfield workflow.

## 2. Return reconstructs instead of restoring

`returnFromSettingsWorkspace()` attempts to infer the destination from shell fragments and then calls `transitionToWorkflowStep()`.

`transitionToWorkflowStep()` mutates workflow foreground state and may set:

```ts
setActiveWorkflowId("development")
```

instead of restoring the exact workflow identity that existed before Settings.

This is lossy navigation.

## 3. Existing permanent test is insufficient

The current Settings navigation test only verifies the helper preserves:

```text
activeWorkspaceId
priorWorkflowWorkspaceId
```

It does not open Settings from a real:

- project-creation Workflow;
- selected Workflow instance;
- Work Card Implement step;
- Work Intake Routing foreground.

It therefore cannot detect the reported failure.

---

# 1. Replace fragmented Settings-return fields with one exact return snapshot

Create one bounded renderer-owned return context.

Equivalent:

```ts
interface SettingsReturnContext {
  shellView: Exclude<ShellView, "landing" | "settings">;
  activeWorkspaceId: WorkspaceId;
  activeWorkflowId: LegacyWorkflowForegroundId | null;
  selectedWorkflowType: WorkflowType | null;
  selectedWorkflowId: string | null;
  selectedWorkIntakeId: string | null;
}
```

Include any additional renderer identity field only if required to restore a currently-supported foreground exactly.

Do not serialize documents, model output, secrets, or whole runtime objects into this snapshot.

The existing in-memory `workflowInstance` may remain intact while Settings is open; if restoration requires revalidation, reopen the exact `selectedWorkflowId` through the existing workflow API.

---

# 2. Opening Settings must not clear workflow state

`openSettingsWorkspace()` must:

1. capture the exact foreground identity;
2. set Settings foreground;
3. leave workflow selection/state intact.

Do not:

- clear `selectedWorkflowId`;
- clear `workflowInstance`;
- clear `selectedWorkflowType`;
- rewrite `activeWorkflowId`;
- reset current Work Card/Issue/WIR state.

Settings entry is not a workflow transition.

---

# 3. Return restores exact shell foreground

On Return:

## workflow-hub

Restore:

```text
shellView = workflow-hub
```

## workflow-type

Restore:

```text
shellView = workflow-type
selectedWorkflowType = exact prior type
```

## workflow-instance

Restore:

```text
shellView = workflow-instance
selectedWorkflowId = exact prior workflow
workflowInstance = exact prior/revalidated instance
```

## project-creation / Greenfield workflow

Restore:

```text
shellView = workflow
selectedWorkflowId = exact project-creation Workflow ID
workflowInstance = exact project-creation Workflow
activeWorkflowId = null
activeWorkspaceId = exact prior workflow step
```

Do not map this to the legacy `development` foreground.

## legacy issue workflow

Preserve the existing exact Issue Resolution behavior while migrating it into the unified snapshot.

## work-intake

Restore:

```text
shellView = work-intake
selectedWorkIntakeId = exact prior intake
selectedWorkflowId = exact routing workflow
```

if Settings is reachable from that foreground.

---

# 4. Do not use transitionToWorkflowStep() as generic Settings return

`transitionToWorkflowStep()` is a workflow navigation operation. It changes foreground semantics and is not an exact restore primitive.

Settings Return should restore the snapshot directly or through one purpose-built:

```ts
restoreSettingsReturnContext(...)
```

helper.

Do not reuse transition logic that creates a new navigation decision.

---

# 5. Exact workflow identity revalidation

If the prior return context references a `selectedWorkflowId`:

- preserve it in memory;
- on Return, optionally call the existing `getWorkflow(workflowId)` if exact revalidation is needed;
- verify the returned workflow ID matches;
- restore the correct foreground.

If the Workflow was genuinely deleted/unavailable while Settings was open:

- fall back to Workflow Hub;
- show a bounded navigation error.

Do not silently switch to another workflow.

---

# 6. Preserve exact Work Card step

For Greenfield Project and any legacy staged workflow, `activeWorkspaceId` must be restored exactly.

The reported acceptance case is:

```text
before Settings:
  project = Signal_Forge
  workflow = exact project-creation workflow
  phase = phase-1
  work card = phase-1-c01
  activeWorkspaceId = work-card-building-review

after Return:
  same project
  same workflow ID
  same phase
  same work card
  activeWorkspaceId = work-card-building-review
```

No Project picker is involved.

---

# 7. Settings Return button must always be actionable

The visible `Return` button in the Settings header must:

- have a valid return target whenever Settings was opened from a Current Project foreground;
- not require a project re-selection;
- not be disabled by Agent Harness Settings busy state unless returning would destroy an active settings transaction that genuinely requires blocking.

Current lifecycle/settings actions should not normally trap navigation.

If a save is in-flight and Return is permitted, preserve the save operation independently.

---

# 8. Add a secondary Workflows escape hatch

While Settings is foregrounded and a Current Project exists, the application sidebar/navigation must still provide a reliable way to go to:

```text
Workflows
```

without choosing the Project again.

This is secondary recovery, not a substitute for Return.

Using Workflows may intentionally abandon the exact previous foreground and go to the Workflow Hub.

Do not require `Change Project` or `Clear Project` merely to escape Settings.

---

# 9. Settings state remains application-global

Do not couple Settings ownership to a particular workflow.

Settings can still manage Agent Harness, Codex Connections, theme, and future global application settings.

The return snapshot is renderer navigation state only.

Do not persist it into Project State.

---

# 10. Greenfield regression proof

Add a renderer/application test that reproduces the exact failure:

1. load a Current Project with exact `projectCreationWorkflowId`;
2. open that Workflow;
3. foreground `work-card-building-review`;
4. capture exact `selectedWorkflowId` / `workflowInstance`;
5. click Settings;
6. click Return.

Prove:

- `shellView === "workflow"`;
- exact `selectedWorkflowId` restored;
- exact project-creation workflow remains selected;
- `activeWorkflowId === null`;
- `activeWorkspaceId === "work-card-building-review"`;
- no Project open/select action is called.

Do not test only pure helper strings.

---

# 11. Workflow-instance regression proof

Add a second proof:

```text
Feature/Refactor/etc exact workflow-instance
-> Settings
-> Return
-> exact same workflow-instance
```

Assert exact Workflow ID.

---

# 12. Work Intake regression proof

If Settings can be entered while Work Intake is foregrounded, prove:

```text
exact WIR intake/workflow
-> Settings
-> Return
-> same intake/workflow foreground
```

If current UI intentionally does not expose Settings there, document that fact rather than inventing a path.

---

# 13. Workflows escape-hatch proof

While Settings is open with a Current Project:

- Workflows navigation remains visible/actionable;
- selecting it goes to Workflow Hub;
- Current Project remains selected;
- no project chooser is invoked.

---

# 14. Remove obsolete fragmented return state

After the exact snapshot is in place, remove or collapse obsolete fields such as:

- `settingsReturnShellView`;
- `settingsReturnWorkflowId`;

if they are no longer independently required.

Avoid keeping two competing restoration systems.

---

# 15. Non-scope

Do not:

- redesign workflow topology;
- change Project State;
- change Work Card progression;
- change Settings content;
- change Agent Harness lifecycle;
- change Codex runtime authentication;
- change Git/source control;
- add browser-history routing.

This repair is renderer navigation state only.

---

# Permanent acceptance proof

At minimum prove:

1. Settings captures exact foreground context;
2. Greenfield Work Card Implement returns exactly;
3. exact project-creation Workflow ID is preserved;
4. workflow-instance return preserves exact Workflow ID;
5. Workflow Hub/type return still works;
6. Issue Resolution return still works;
7. Work Intake return works if Settings is reachable there;
8. Return never requires Project re-selection;
9. Workflows escape hatch exits Settings without clearing Current Project;
10. Settings does not mutate workflow state merely by opening;
11. production build passes;
12. `git diff --check` passes.

---

# Validation

Run focused validation only:

- `test/renderer/agent-harness-settings-workspace.test.cjs`;
- renderer App navigation owner;
- Workflow Hub shell owner;
- Greenfield/project-creation foreground owner;
- Work Intake renderer owner if applicable;
- Issue Resolution navigation owner;
- repair validation-plan preview;
- `git diff --check`.

Do not run broad/full regression.

---

# Implementer report

Write:

`docs/implementation-bundles/settings-navigation-repair/Repair01/Reports/SETTINGS-NAV-R01_IMPLEMENTER_REPORT.md`

The report must state:

- old lossy return fields;
- new exact return snapshot;
- Greenfield exact-ID restoration proof;
- workflow-instance restoration proof;
- Workflows escape-hatch behavior;
- focused validation results.

---

# Checkpoint and STOP

Commit:

`SETTINGS-NAV-R01 restore exact foreground after Settings`

Then STOP for Architect review.
