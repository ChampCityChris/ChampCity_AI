# WSF20-REPAIR19-R04-R01 — Restore usable Work Card revision request controls

**Type:** Repair Card  
**Parent:** WSF20-REPAIR19-R04  
**Defect:** R19-R04-F09 — governed revision action is logically available but its required reason input/button are effectively unusable in the Implement footer  
**Starting baseline:** `46b6e13897f582f56899e8f70aaa4f9eeded7428` on `Dev` (reverify before edits)

> Keep this renderer-bounded. Do not reopen R04 planning/state-machine logic unless a real failing interaction test proves the typed write/navigation path is broken.

## Objective

Make the existing governed **Request Work Card Revision** action visibly and operably usable from the Implement screen.

The Operator must be able to:

1. see a normal labeled reason field;
2. enter a nonblank revision reason;
3. see the request button disabled while blank and enabled once valid text exists;
4. activate the request;
5. observe the existing typed planning review write and canonical navigation to Repair Planning / Work Card Planning;
6. receive a visible bounded error if the write fails.

No SQL/state-machine semantics change is authorized by this card.

## Verified live RCA

R04 is deployed and the backend path is present:

- current live Repair remains `88f9ee9c-c99d-4272-a721-596eb8196b14@6`, `workState=blocked`;
- latest result is semantic `blocked`;
- R04 correctly renders the blocked-result explanation;
- no revision decision or WorkItem revision has been written yet.

The screen shows **Revision Requested reason** and **Request Work Card Revision**, but the actual textarea is visually collapsed/invisible. The tiny diagonal resize marker visible between the label and button is the browser textarea control.

Source review confirms why:

`WorkCardImplementWorkspace.tsx` renders the revision controls as raw markup:

`<div><label>Revision Requested reason<textarea ... /></label><button ...>Request Work Card Revision</button></div>`

There are no specific classes on this container, label, textarea, or button.

The Implement navigation fragment is mounted by `WorkCardImplementShell.tsx` in:

`<footer className="work-card-implement-footer">`

outside the `.codex-execution-panel`.

Current generic textarea styling is scoped to containers such as:

`.codex-execution-panel textarea`

so it does **not** style this footer textarea.

Likewise, the request button does not use `apply-button` / `codex-command`, so the standard Work Card button presentation does not apply.

The button is correctly reason-gated in logic:

`disabled={!revisionReason.trim()}`

but because the required input is effectively invisible, the Operator cannot reasonably satisfy the gate.

This is a renderer interaction defect, not evidence that the R04 backend planning transition failed.

## Required correction

### A. Add explicit revision-action presentation

In `src/renderer/app/WorkCardImplementWorkspace.tsx`:

- give the revision-action container a dedicated class, e.g. `work-card-revision-request`;
- render the label text in a bounded span/header;
- render the textarea with a dedicated class and visible placeholder such as `Explain why the approved Work Card contract must be revised`;
- use an appropriate finite row count/min-height and existing 4096-character limit;
- give **Request Work Card Revision** the standard `apply-button codex-command` styling;
- preserve `type="button"`;
- preserve blank-reason disablement;
- preserve read-only/busy/exact-identity/canonical-navigation/typed-eligibility gating from R04.

Do not change `requestRevision()` authority or write SQL directly.

### B. Style the footer control explicitly

In `src/renderer/styles.css`, add a bounded layout for `.work-card-revision-request` under the Implement footer:

- clearly separated from Refresh/Continue;
- visible border/background/text for textarea using existing theme variables;
- textarea width fills available content area;
- sensible minimum height (roughly 56–80 px) and vertical resize only;
- button is visibly a button and remains readable in dark/light themes;
- responsive wrap/stacking at narrow widths;
- disabled state remains obvious;
- no overlap with Windows taskbar/footer clipping;
- footer may grow intrinsically and the main Implement row remains bounded/scrollable.

Do not globally style all textareas/buttons to solve this one control.

### C. Interaction regression

Extend `test/renderer/work-card-implement-workspace.test.cjs` and/or its existing shell presentation owner.

Required proof:

1. exact semantic blocked + revisionEligible renders:
   - one visible reason textarea with stable aria-label/placeholder;
   - one standard styled request button;
   - button disabled when reason is blank.
2. Simulate textarea `onChange` to nonblank text:
   - state receives the text;
   - button becomes enabled.
3. Click request:
   - invokes exactly one `reviewStructuredWorkItemPlanning` with:
     - exact workflowId/workItemId;
     - exact current WorkItem record version;
     - `outcome:"revision_requested"`;
     - trimmed reason text;
   - no duplicate calls;
   - successful write performs the existing refresh and calls the canonical navigation callback.
4. Simulated write rejection:
   - error is visibly surfaced;
   - no navigation callback;
   - no local fake state transition.
5. read-only, stale identity, typed eligibility false, busy state and blank reason cannot invoke the write.
6. Existing Refresh and Continue controls retain their current behavior.
7. Static markup/CSS ownership proves the textarea/button use the new classes and are not dependent on `.codex-execution-panel textarea`.

### D. Live acceptance

After implementation/restart on the current `greenfield_test` Repair:

1. blocked result remains visible;
2. a clearly visible revision reason field is present;
3. Request button is disabled while blank;
4. enter e.g. `Approved Repair requires no mutation because the target artifact already conforms`;
5. button enables;
6. click once;
7. SQL records a `revision_requested` planning decision;
8. canonical navigation moves to Repair Planning;
9. historical blocked attempt/result and source Git remain unchanged.

If step 7 or 8 fails with a visibly usable control, stop and capture that exact backend failure. Do not broaden this renderer card preemptively.

## Expected production scope

- `src/renderer/app/WorkCardImplementWorkspace.tsx`
- `src/renderer/styles.css`

Tests:
- `test/renderer/work-card-implement-workspace.test.cjs`
- existing Implement shell/presentation test only if needed for CSS/static ownership

Do not modify:
- `workflowExecutionApplicationService.ts`
- `structuredWorkItemPlanningService.ts`
- `projectStateService.ts`
- SourceBinding/checkpoint logic
- Greenfield navigation
- LOCALGIT01
- live SQL/Git state during implementation

## Validation and handoff

Run focused renderer tests, the canonical repair validation planner for the exact changed paths, and one necessary build/static proof. Do not rerun broad source-control/phase suites unless the planner selects them due to actual changed capability ownership.

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR19_R04_R01_IMPLEMENTER_REPORT.md`

Include before/after markup evidence, interaction proof, exact call payload, CSS classes, focused receipt, and remaining live acceptance.

**Checkpoint:** `WSF20-R19-R04-R01 restore usable revision request controls`

Commit only attributable renderer/test/report changes. Stop for Architect review. No live Greenfield execution, push, release, SQL edit or Git cleanup.
