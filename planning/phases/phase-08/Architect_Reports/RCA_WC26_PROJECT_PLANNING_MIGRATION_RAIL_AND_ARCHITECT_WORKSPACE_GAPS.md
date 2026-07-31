<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC26"
  },
  "sourceRevisions": [
    {
      "path": "planning/project/Design_Documents/PROJECT_PLANNING_WORKSPACE_DEFINITION.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC05_project_planning_workspace.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Project Planning Migration, Rail Status, and Architect Workspace RCA",
    "operatorEvidenceDate": "2026-07-28"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Operator screenshots and repository review confirm that Project Planning is still rendered through the generic lifecycle shell rather than its confirmed dedicated workspace design.",
    "reviewedAt": "2026-07-28"
  }
}
CHAMPCITY-METADATA -->

# RCA — Project Planning Migration, Rail Status, and Architect Workspace Gaps

## Operator observations

The running Revisionary workspace reached Project Planning after an Approved Architect Interview. The Operator observed:

1. a `Workspace Migration Required` panel with unexplained `Preview Migration` and `Migrate Workspace` actions;
2. the Project Planning rail card displaying `OPEN` as a fallback lifecycle label while also displaying a second static `Open` line;
3. no usable embedded ChatGPT Architect workspace for creating the Project Profile and Project Roadmap.

## Finding 1 — The migration panel is a global legacy-maintenance utility

`App.tsx` renders the migration panel in every selected workspace except Architect Interview:

```text
activeWorkspaceId !== architect-interview
AND workspace selected
→ render Workspace Migration Required panel
```

`refreshDocuments()` also runs the migration preview silently.

`Preview Migration` is read-only. It recursively scans the entire selected repository `planning/` tree for noncanonical Markdown files and legacy JSON siblings. It classifies candidate pairs as ready or blocked.

`Migrate Workspace` is repository-mutating. For every ready legacy pair it:

1. converts legacy JSON metadata into canonical Markdown metadata;
2. rewrites the Markdown file at the same path;
3. verifies the rewritten Markdown can be parsed;
4. deletes the legacy JSON sibling.

The operation blocks before writing when the preview contains a known blocked item. It does not provide a workspace-wide rollback if an unexpected runtime failure occurs after earlier items have already been rewritten and their JSON siblings deleted.

This utility is not part of Project Planning and is inconsistent with the current decision to isolate unmanaged historical documents rather than broadly migrate them during normal lifecycle work.

### Decision

Do not click `Migrate Workspace` in Revisionary. Remove the migration panel and automatic migration scan from normal lifecycle workspaces. Opening, refreshing, or using Project Planning must not rewrite or delete repository files through a legacy migration path.

The backend migration module may remain dormant until a separately designed maintenance workflow determines whether it should be retained or deleted. It must not remain a routine product action.

## Finding 2 — Only two project rail cards have evidence-derived status

`NestedWorkflowRail.tsx` supplies explicit lifecycle status only for:

- Project Intake;
- Architect Interview.

`projectRailPresentation.ts` defaults every other top project rail card to `OPEN` unless it is acting as a parent context.

`WorkflowStepButton` then renders:

```text
upper line: OPEN
lower line: Open
```

The upper value is incorrectly being used as lifecycle status. The lower value is a static navigation hint, creating the visible duplicate.

Selection state, required-step state, and lifecycle status are separate concepts. Project Intake and Architect Interview already prove that an evidence-derived lifecycle label can coexist with selection and required-step styling.

### Decision

Create one evidence-derived status projection for all seven top project rail cards:

1. Project Intake;
2. Architect Interview;
3. Project Planning;
4. Phase Map;
5. Phases;
6. Project Validation;
7. Project Close.

Preserve the accepted Project Intake and Architect Interview status rules. Remove the static lower `Open` line. Each card must display one current lifecycle status while selection and required-step styling remain independent.

## Finding 3 — Project Planning is using the generic shell instead of its confirmed design

The confirmed Project Planning design requires:

```text
Embedded Architect browser
+
independent Project Profile and Project Roadmap review views
+
one synchronized bundle disposition
```

The current renderer does not implement that workspace:

- the embedded browser attaches only when `activeWorkspaceId === architect-interview`;
- Project Planning uses the generic `CurrentActionPanel`;
- `Run Current Handoff Action` only writes a local handoff document;
- no copyable Project Planning MCP instruction is presented to the embedded ChatGPT conversation;
- the generic document list is empty before outputs exist;
- generic `LifecycleArchitectOutputImport` textareas expect the Operator to paste both completed Markdown documents manually;
- generic bundle disposition is displayed even when the required Project Profile and Roadmap do not exist;
- no active Project Planning output detection refreshes the workspace when MCP writes the two target documents.

The backend contains useful partial services for generating the handoff, saving two outputs, applying synchronized disposition, and deriving completion. Those services are not assembled into the Operator workflow required by the design.

### Decision

Replace the generic Project Planning shell with a dedicated Project Planning workspace modeled on the accepted Architect Interview interaction boundary:

```text
Approved Project Intake and Architect Interview
→ prepare exact Project Planning handoff
→ copy explicit MCP instruction
→ Operator pastes/sends in embedded ChatGPT
→ ChatGPT Architect writes Pending Project Profile and Roadmap through ChampCity MCP
→ application detects both repository outputs
→ Operator reviews each document
→ one synchronized bundle disposition applies to both
→ Approved bundle advances to Phase Map
```

Browser chat remains a drafting surface. Repository-backed canonical Markdown remains authority.

## Root cause

Phase 08 integrated specialized backend services into one generic renderer before each lifecycle workspace had a dedicated product contract. Project Intake and Architect Interview were subsequently corrected with dedicated models and controls. Project Planning and later project stages still fall through generic migration, rail, handoff, import, and disposition behavior.

## Corrective boundary

WC26 must complete Project Planning and the top project rail status projection in one active implementation card. Mechanical implementation defects remain in WC26 until corrected and proven. Do not create a WC26 repair subcard merely because the first implementation attempt is incomplete.
