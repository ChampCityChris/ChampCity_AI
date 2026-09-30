# WRB02-R02-01 — Reframe Workflow Hub as a Stable Workflow Launcher

**Parent:** Workflow Runtime Rebaseline / WRB02  
**Supersedes:** the Hub presentation and inline-instance requirements of `WRB02-02_multi_instance_workflow_hub.md`  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** **ACTIVE — UI/UX ARCHITECTURE REPAIR**

## Objective

Repair the Current Project **Workflows** screen so it behaves as a stable workflow launcher/dashboard rather than a growing registry of Workflow instances.

The Workflow Hub must answer one question:

> Which workflow should the Operator enter for the work they want to do?

It must not become the long-term list of every Feature, Issue, Research item, migration, or other Workflow instance in the Project.

Workflow instances remain durable Project State. Their creation, listing, history, and navigation move into the corresponding workflow-type intake surface.

This card intentionally corrects the earlier WRB02-02 decision to render multi-instance collections and inline start forms directly on the Hub.

---

## Confirmed current defects

Current `WorkflowHubWorkspace.tsx`:

- sorts direct-start Workflow types first and appends Work Intake Routing last;
- renders Project Creation only when a Project Creation instance exists;
- renders instance counts and every Workflow instance directly inside each Hub card;
- expands an inline `Workflow title` form directly on the Hub;
- uses type cards as both navigation and instance-management surfaces;
- provides no concise purpose statement explaining when each workflow should be used.

This produces an unstable and increasingly dense Hub as Project history grows.

The current shared registry also places:

```text
Project Creation / Greenfield = hubOrder 0
Feature / Capability          = hubOrder 1
...
Work Intake Routing           = hubOrder 7
```

That order is not the desired Operator workflow hierarchy.

---

# 1. Governing Hub rule

The Workflows screen is a **workflow catalog/launcher**.

Each card uses the same reusable presentation structure:

```text
Workflow name
Purpose statement
Applicability / concise status
Primary action
```

The Hub must not contain:

- inline Workflow-title creation forms;
- lists of Workflow instances;
- one row per completed/active Workflow;
- expanding history;
- per-instance Open buttons;
- arbitrary instance counts that grow the card vertically.

The grid height should remain essentially stable whether the Project has 0, 5, or 500 historical Workflow instances.

---

# 2. Exact card order and layout

Use this stable eight-card order:

## Row 1

1. **Work Intake Routing**
2. **Greenfield Project**
3. **Feature / Capability**

## Row 2

4. **Refactor / Migration**
5. **Integration / Composition**
6. **Issue Resolution**

## Row 3

7. **Infrastructure / Platform**
8. **Research / Prototype**

The third row may contain the normal unused third grid cell; do not invent another workflow solely to fill it.

Work Intake Routing is intentionally first because it is the general "help me determine the correct route" entry.

Greenfield Project is intentionally second and remains present in every Project.

Do not make card ordering depend on instance existence.

---

# 3. Centralize workflow-card presentation metadata

Extend the canonical `WORKFLOW_TYPE_REGISTRY` or another single canonical presentation seam so the Hub does not maintain a second hand-coded catalog.

At minimum provide stable presentation metadata equivalent to:

```ts
{
  label,
  purpose,
  hubOrder,
  entryWorkspace,
  repeatable
}
```

Use the registry for the eight-card order and purpose statements.

Do not create a second renderer-only workflow-type registry.

Update labels where necessary so the Hub displays **Greenfield Project**, not `Project Creation / Greenfield`.

The internal Workflow type remains `project-creation`.

---

# 4. Exact purpose statements

Use concise Operator-facing purpose text equivalent to the following.

### Work Intake Routing
**Use when you are not yet sure which workflow should handle the work.**

### Greenfield Project
**Use to create and guide a brand-new project from initial intake through first project setup.**

### Feature / Capability
**Use for adding or improving product functionality in an existing project.**

### Refactor / Migration
**Use for structural changes, internal redesigns, upgrades, or migrations.**

### Integration / Composition
**Use when combining systems, tools, services, or components into a coordinated solution.**

### Issue Resolution
**Use to diagnose, repair, and validate defects, regressions, or broken behavior.**

### Infrastructure / Platform
**Use for environment, platform, deployment, hosting, tooling, or operational foundation work.**

### Research / Prototype
**Use to explore ideas, test feasibility, or develop proofs of concept before committed implementation.**

Minor copy edits are acceptable only if they preserve the same meaning and brevity.

---

# 5. Greenfield Project card is always visible

The Greenfield Project card must render for every Current Project.

## Greenfield-origin Project

If authoritative Project State contains a `project-creation` Workflow for the Current Project:

- card is enabled;
- card shows a concise status such as `In progress` or `Completed`;
- completed Project Creation remains visible permanently as historical Project provenance;
- primary action opens the exact Project Creation Workflow/history.

A completed Greenfield Project must not lose the card merely because initialization has finished.

## Migrated / Existing Project

If the Current Project has no Project Creation Workflow because it originated as an Existing/migrated Project:

- card remains in the exact same top-middle position;
- card is visually greyed/disabled;
- status states that Greenfield Project is not applicable to this migrated/existing Project;
- no Project Creation Workflow is synthesized;
- no Start action is offered.

Do not use the transient renderer entry mode alone as provenance. A previously-created Greenfield Project may later be reopened through Open Existing Project.

Authoritative Project Creation Workflow existence/history is the primary applicability signal.

---

# 6. Hub cards do not directly create Workflow instances

Remove the current Hub inline start interaction:

```text
+ Start Feature
-> Workflow title form inside Hub card
-> start Workflow
```

and equivalent direct-start behavior for all repeatable types.

Hub actions become navigation actions.

Preferred labels:

- Work Intake Routing: **Open Work Intake Routing**
- Greenfield Project: **View Greenfield Project** when applicable
- Feature / Capability: **Open Feature / Capability**
- Refactor / Migration: **Open Refactor / Migration**
- Integration / Composition: **Open Integration / Composition**
- Issue Resolution: **Open Issue Resolution**
- Infrastructure / Platform: **Open Infrastructure / Platform**
- Research / Prototype: **Open Research / Prototype**

Do not create a Workflow instance simply because the user clicks a Hub card.

---

# 7. Add one reusable Workflow-type intake/list shell

Move the instance-management behavior out of the Hub into a reusable workflow-type surface.

Add a component equivalent to:

```text
WorkflowTypeWorkspace
  -> workflow type title
  -> purpose statement
  -> Start New action when allowed
  -> existing Workflow instance list/history for that type
  -> exact instance Open action
  -> Back to Workflows
```

This is the reusable building block the Hub should have routed to originally.

The generic shell should use the existing:

- Workflow inventory;
- exact Workflow IDs;
- `startWorkflow({ workflowType, title })` API;
- `getWorkflow(workflowId)` / exact navigation behavior.

Do not create parallel persistence or a new workflow-instance model.

---

# 8. Creation belongs inside the workflow-type intake surface

For repeatable substantive types, the workflow-type surface owns:

- `Start New`;
- bounded Workflow title input;
- instance creation;
- current/history instance list;
- exact instance selection.

On successful creation:

1. refresh that type's inventory;
2. open the exact returned Workflow;
3. enter its existing workflow-specific intake/planning foreground.

Do not return to the Hub merely to expose the newly-created row.

The Hub remains unchanged in size.

---

# 9. Existing workflow-specific intake/planning surfaces remain authoritative

Do not replace the existing Feature, Issue, WIR, Project Creation, or other workflow-specific execution/intake logic.

This repair is navigation/composition.

After an exact instance is selected:

- Feature continues into its current Feature intake/planning surface;
- Issue continues into its current Issue intake/planning surface;
- WIR continues into the current Work Intake Routing intake;
- Project Creation continues into its Project Intake/Project Creation surface;
- other Workflow types continue into their currently-supported workflow instance/intake shell.

The new type-level surface sits **before** an exact instance is selected.

---

# 10. Work Intake Routing behavior

Work Intake Routing is the first Hub card.

Clicking it enters the Work Intake Routing intake/list surface.

That surface owns:

- starting a new Work Intake;
- any current/historical Work Intake Routing entries appropriate to the current runtime;
- exact navigation into a saved WIR Workflow/intake.

Do not create a WIR Workflow merely by opening the Hub card.

Preserve the current rule that WIR identity is created according to the existing Work Intake save/routing contract.

---

# 11. Greenfield Project does not use the repeatable type-list shell

`project-creation` is non-repeatable Project provenance.

For an applicable Greenfield Project card:

- open the exact authoritative Project Creation Workflow directly;
- show its current/completed state through the existing Project Creation surface;
- do not offer `Start New`;
- do not allow a second Project Creation Workflow.

For a migrated Existing Project:

- disabled card only;
- no navigation;
- no synthesized history.

---

# 12. Concise Hub status only

The Hub may display a small bounded status line, but not instance listings.

Acceptable examples:

```text
Work Intake Routing
Available

Feature / Capability
3 active · 12 completed

Greenfield Project
Completed
```

Counts are optional.

If counts are shown:

- keep them to one concise line;
- do not enumerate titles;
- do not make the card height depend on count;
- do not imply an exact instance selection.

The implementation may omit counts entirely if that keeps the screen clearer.

---

# 13. Remove obsolete Hub state and props

`WorkflowHubWorkspace` should no longer need instance-selection or start-form state solely to render the Hub.

Remove Hub-local state such as:

- `starting`;
- `title`;
- `busy`;
- per-card start-form errors;

when those move into the workflow-type surface.

Review whether Hub props such as `selectedWorkflowId`, `onOpenWorkflow`, and `onStartWorkflow` remain necessary at the Hub level.

Do not remove application capabilities still needed by the new workflow-type surface.

---

# 14. Navigation state must distinguish type selection from instance selection

Add a bounded renderer state/seam equivalent to:

```ts
selectedWorkflowType: WorkflowType | null
selectedWorkflowId: string | null
```

Hub card click selects a Workflow type.

Type-surface instance click selects an exact Workflow ID.

Back behavior:

```text
exact Workflow -> workflow-type surface -> Workflows Hub
```

Do not overload an exact Workflow ID to represent a workflow family.

---

# 15. Preserve Source Control action

The Source Control action remains a Project-level Hub action.

It is not a Workflow card and does not move into a workflow-type intake surface.

Preserve existing capability gating.

---

# 16. Do not alter workflow persistence semantics

This card does not change:

- Workflow multiplicity rules;
- Project State schema;
- Work Route mapping;
- SourceBaseline/SourceBinding ownership;
- Workflow branch/materialization semantics;
- integration semantics;
- Work Intake routing decisions;
- Agent Harness/MCP;
- Git orchestration.

This is a renderer/application navigation and presentation repair using existing workflow state.

---

# 17. Supersede the obsolete part of WRB02-02 explicitly

WRB02-02 required the Hub itself to:

- render all independent instance rows;
- keep completed rows visible;
- host direct-start inline forms.

Those presentation requirements are superseded by this card.

The underlying durable multi-instance Workflow model remains correct.

The new rule is:

```text
Hub = stable workflow catalog
Type intake surface = multi-instance inventory + creation
Exact workflow surface = workflow-specific work
```

Document this supersession in the Implementer report so future repairs do not restore instance sprawl to the Hub.

---

# Permanent proof

Update/add focused renderer tests proving:

1. Hub renders exactly eight stable workflow cards.
2. Work Intake Routing is first/top-left.
3. Greenfield Project is second/top-middle.
4. Feature / Capability is third/top-right.
5. Remaining cards follow the required row order.
6. Every card renders the required concise purpose statement.
7. Hub renders no `Workflow title` form.
8. Hub renders no Workflow instance list/rows.
9. 50 Issue instances do not produce 50 Hub rows or expand the Hub.
10. Clicking Feature selects/opens the Feature workflow-type surface without creating an instance.
11. Feature type surface lists existing Feature instances and owns `Start New`.
12. Creating a Feature from that surface opens the exact returned Feature Workflow.
13. Same reusable type surface behavior works for Refactor, Integration, Infrastructure, Research, and Issue.
14. WIR card enters WIR intake/list behavior without immediately creating a Workflow.
15. Greenfield-origin Project always shows enabled Greenfield card, including after Project Creation completes.
16. Reopened completed Greenfield Project remains enabled based on Project Creation history, not transient entry mode.
17. Migrated Existing Project shows Greenfield card disabled/greyed in the same position.
18. Migrated Existing Project does not synthesize a Project Creation Workflow.
19. Greenfield card never offers a second Project Creation Workflow.
20. Source Control action remains present/capability-gated.
21. Back navigation follows exact Workflow -> type surface -> Hub.
22. `git diff --check` passes.

---

# Visual acceptance

At standard desktop width the Workflows screen should visually read as a stable 3-column launcher:

```text
[ Work Intake Routing ] [ Greenfield Project ]      [ Feature / Capability ]
[ Refactor / Migration] [ Integration / Composition] [ Issue Resolution     ]
[ Infrastructure       ] [ Research / Prototype ]    [                      ]
```

Cards should use a consistent height and structure.

A migrated Existing Project still shows all eight positions, with Greenfield visually disabled rather than absent.

No inline title form or instance row should appear on the Hub.

---

# Validation

Run focused validation only:

- production typecheck/build;
- Workflow Hub renderer owner;
- workflow application/navigation owner;
- Current Project entry regression;
- Greenfield Project Creation identity/history owner;
- Work Intake Routing navigation owner;
- Feature/Issue exact-navigation owners needed by the type-surface handoff;
- capability-map integrity if touched;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad/full regression suite.

---

# Implementer report

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB02/Repair02/Reports/WRB02-R02-01_IMPLEMENTER_REPORT.md`

The report must explicitly state:

- exact Hub card order;
- registry/presentation metadata changes;
- purpose statements;
- reusable workflow-type intake/list shell;
- inline Hub creation/list removal;
- Greenfield applicability/provenance rule;
- migrated-project disabled Greenfield behavior;
- completed Greenfield history behavior;
- WIR navigation behavior;
- focused visual/renderer validation results.

---

# Checkpoint and STOP

Commit:

`WRB02-R02-01 reframe Workflow Hub as stable launcher`

Then STOP for Architect review.
