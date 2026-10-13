# WSF20-REPAIR07 — Bind Greenfield to the real application viewport

**Type:** Repair Card  
**Parent:** WSF20  
**Defects:** remaining WSF20-D19 / D20, WSF20-D23  
**Starting baseline:** `473bfbf7ff14ea984e7578a90c3ed0849ce98fee`

## Objective

Fix the final vertical-fill defect at the actual application-shell boundary.

R06 proved the Greenfield subtree can fill a definite parent. R07 must make the **real App Project Creation workflow surface** provide that definite parent.

Do not redesign Phase Map, browser attachment, SQL navigation, prompts or inspection behavior.

## Confirmed RCA

The live application hierarchy is:

```text
.app-root
└── .app-body
    └── .workspace-surface          ← missing Greenfield-specific fill contract
        └── StructuredWorkflowWorkspace
            └── GreenfieldWorkspace
                └── greenfield-shell-host
                    └── greenfield-shell-content
                        └── Phase Map / browser
```

R06 tested from `GreenfieldWorkspace` downward.

The actual `App.tsx` `.workspace-surface` remains the generic scrollable flex workspace and Project Creation does not receive a dedicated workflow-instance fill class.

Therefore the inner percentage/stretch chain has no reliable definite remaining-height track in the real application, even though it works in the synthetic subtree fixture.

## Required correction

### 1. Give Project Creation workflow instances an explicit App-level surface class

In `App.tsx`, when:

```text
view === "workflow-instance"
AND
workflow.workflowType === "project-creation"
```

add a dedicated class such as:

```text
greenfield-workflow-surface
```

to the existing `workspace-surface`.

Do not apply this blindly to every workflow family.

### 2. Make that App-level surface a definite one-track viewport owner

The Greenfield-specific application surface must:

- fill the available `.app-body` grid cell;
- have `min-height: 0`;
- hide outer vertical overflow;
- use one definite remaining-height track for `GreenfieldWorkspace`;
- not add application-level padding/gap that competes with Greenfield's own recovered chrome;
- allow Greenfield's internal rail/header/reason rows to remain intrinsic;
- allow `greenfield-shell-host` to receive the remainder.

A suitable contract is equivalent to:

```css
.workspace-surface.greenfield-workflow-surface {
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
  padding: 0;
  gap: 0;
}

.greenfield-workflow-surface > .greenfield-workspace {
  min-height: 0;
  height: auto;
  align-self: stretch;
}
```

Exact selectors may differ, but the ownership must be explicit.

Do not use fixed pixel heights or viewport subtraction calculations.

### 3. Do not repair this inside Phase Map

Do not add:

- Phase Map fixed heights;
- browser-host minimum heights intended to mask the parent failure;
- special `calc(100vh - ...)` rules;
- JavaScript resize hacks;
- extra browser reattachment behavior.

Phase Map and ApplicationBrowserHost already work when their parent supplies correct geometry.

### 4. Preserve other workflow families

The generic `.workspace-surface` behavior is used by other workflow/UI families.

R07 must not globally replace it merely to make Greenfield work.

Project Creation gets the recovered dedicated viewport contract; other workflow types retain their current parent layout unless separately proven defective.

## Required proof

### Full application composition — mandatory

The new geometry test must start from the same outer hierarchy as production:

```text
app-root
→ app-body
→ actual workspace-surface class list
→ StructuredWorkflowWorkspace
→ GreenfieldWorkspace
→ Phase Map
```

Testing only `GreenfieldWorkspace` or `ProjectPhaseMapShell` is insufficient.

At a fixed desktop content viewport prove:

1. `.app-body` reaches the viewport bottom;
2. `.greenfield-workflow-surface` reaches the app-body bottom;
3. `.greenfield-workspace` reaches the surface bottom;
4. `.greenfield-shell-host` owns the remaining height below project rail/reason;
5. canonical empty Phase Map reaches the shell-host bottom;
6. left Phase Map column has substantial usable height;
7. right browser column has the same substantial usable height;
8. native browser host has substantial usable height;
9. generated Phase Map candidate does not change outer height;
10. completed Project Planning inspection still fills correctly under the same App-level surface.

### Regression

Prove at least one non-Greenfield workflow instance retains its prior generic workspace-surface layout and is not forced through the Greenfield contract.

### Browser

Retain R03/R06 browser owners. No new browser lifecycle behavior is required.

## Live Operator acceptance

In the actual Electron application at the existing Greenfield Phase Map:

1. Phase Map left pane fills the available vertical workspace;
2. embedded ChatGPT fills the available right pane;
3. ChatGPT is visibly interactive;
4. Browser Actions remain at the recovered edge of the browser column rather than near the top due to collapse;
5. resizing the application vertically causes both columns/native browser to resize continuously;
6. generating/refreshing the Phase Map document does not change the outer workspace height.

## Forbidden changes

- no SQL/domain/schema changes;
- no Phase Map-specific fixed height;
- no browser security/session changes;
- no MCP changes;
- no prompt changes;
- no renderer-owned canonical navigation;
- no global rewrite of all workflow-instance surfaces;
- no D05–D08 work.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR07_IMPLEMENTER_REPORT.md`

Report:

- exact App-level class/boundary change;
- full-App geometry measurements before/after candidate;
- non-Greenfield regression proof;
- browser focused owners;
- build/static result;
- live acceptance result if executable controls are available.

## Checkpoint

`WSF20-R07 bind Greenfield to application viewport`

After checkpoint, stop for Operator audit.
