# RWS03-REPAIR02 — Restore Markdown Intake Authority and Document Review Companion

**Status:** IMPLEMENTER_READY  
**Parent:** RWS03 / RWS03-REPAIR01  
**Type:** Operator-validation repair / intake persistence and UI parity  
**Baseline reviewed:** `dev` at `b5f7619532b07ce074b897bc301b8decf3a4b23e`

## Failed validation evidence

Operator validation of Refactor / Migration Intake established two remaining RWS03 defects:

1. **Save Intake does not create a Markdown intake artifact.** RWS03 instead made Project State `Finding` records the intake persistence path.
2. **The right Intake pane is wrong.** RWS03 places embedded ChatGPT there. The approved Greenfield Intake uses the right pane as the Markdown document viewer; after save, the created Intake Markdown is displayed there.

Operator direction also confirms that the Greenfield **Document Disposition** review is part of the Intake pattern. Saving the form is not equivalent to approving the Intake.

RWS03-REPAIR01 top-rail behavior has passed visual validation and must be preserved.

## Confirmed root cause

Repository review confirms:

- Greenfield Project Intake writes canonical Markdown through `projectIntakeService.ts`, refreshes/selects the created planning document, and renders it with `FigmaDocumentCard`.
- `ProjectIntakeWorkspace.tsx` renders `FigmaDocumentDispositionPanel` after the Intake document exists.
- RWS03 `workflowIntakeService.ts` stores Refactor/Migration, Integration, Infrastructure, and Research intake fields as Workflow-owned SQL `Finding` records.
- Feature and Issue intake services also store their intake fields as SQL `Finding` records.
- `WorkflowIntakeWorkspace.tsx` passes the App-owned embedded browser into `IntakeWorkspaceShell.companion`.
- Feature Assessment and Issue RCA preparation currently consume their existing SQL intake projection.
- The planning document scanner already discovers canonical Markdown recursively under `planning/`.

The RWS03 architecture therefore copied the Greenfield layout geometry but not the Greenfield Intake artifact/review behavior.

## Objective

Restore the approved Intake interaction model for all six existing-project substantive Workflows:

```text
Workflow-specific form
        ↓ Save Intake
exact Workflow Intake Markdown
        ↓
right-hand Markdown viewer
        ↓
Operator Document Disposition
        ↓ Approved
next Architect stage may be prepared where already implemented
```

Workflow identity/lifecycle remains Structured Project State. **Intake semantic content and Intake review are transitional Markdown authority until the planned SQL planning-state cutover.**

## 1. Canonical Workflow Intake Markdown

Create one helper/service responsible for the exact Workflow Intake artifact, e.g.:

`src/main/workflow/workflowIntakeDocumentService.ts`

Use this exact deterministic path:

`planning/workflows/<workflowId>/Intake/WORKFLOW_INTAKE_<workflowType>.md`

Do not derive identity from titles, filenames, branch names, paths outside the exact Workflow ID, or Work Intake routing history.

### Canonical metadata

Each document must use the existing canonical Markdown format:

- `artifactType: "workflow-intake"`
- `participationRole: "gatingReview"`
- `identity.workflowId = exact Workflow ID`
- `identity.workflowType = exact Workflow type`
- `workflowData.workflowId = exact Workflow ID`
- `workflowData.workflowType = exact Workflow type`
- `workflowData.values = trimmed RWS02 intake values`
- `sourceRevisions: []`
- first save: `artifactRevision: 1`
- first save disposition: `Pending`

On a substantive re-save:

- verify existing metadata matches the exact Workflow ID/type;
- increment `artifactRevision` by exactly one;
- keep the same path/identity;
- replace `workflowData.values`;
- reset disposition to `Pending`, empty notes, and `reviewedAt: null`.

Use the existing canonical Markdown writer. Do not create JSON sidecars or a second document format.

Do **not** weaken or bypass the global legacy canonical writer fence. If the existing authority fence prevents this exact transitional Intake artifact from being written, stop and report that architecture conflict rather than writing around it with raw filesystem mutations.

### Markdown body

Render a readable body from `WORKFLOW_INTAKE_DEFINITIONS` in exact field order:

```markdown
# <Workflow label> Intake: <Workflow title>

## <Field label>
<Operator value>
```

Render every defined field. For an omitted optional field, render `Not provided.`.

Machine reconstruction uses canonical `workflowData.values`; do not scrape the Markdown body to recover state.

## 2. Markdown is the Intake authority

Extend `WorkflowIntakeProjection` to include the exact current Intake document as a `PlanningDocumentDetail | null`.

After this repair:

- if the canonical Workflow Intake Markdown exists, `getWorkflowIntake` reads values from its canonical metadata and returns that document;
- the Markdown values/disposition are authoritative for Intake;
- the four RWS03 generic `workflow-intake:<workflowType>:<fieldKey>` Findings are no longer created or updated.

### Bounded recovery of RWS03-entered data

The Operator already entered Refactor / Migration Intake under defective RWS03. Preserve that work without making it permanent architecture:

- only when no Workflow Intake Markdown exists, `getWorkflowIntake` may project the exact RWS03 SQL intake values as a temporary fallback;
- return `document: null` in that state;
- do not mutate on read;
- the next explicit **Save Intake** creates the canonical Markdown from the displayed values;
- once Markdown exists, ignore the RWS03 fallback Findings for Intake authority.

This fallback is limited to data created by RWS03 and must not become a general dual-authority mechanism.

## 3. Feature / Issue compatibility boundary

Feature and Issue currently require their existing Intake Findings for later Assessment/RCA implementation.

Until those later workspace families are rebuilt:

- generic Workflow Intake Save writes the canonical Markdown **first**;
- Feature/Issue may then call their existing intake save service as a compatibility mirror;
- those Findings are not Intake authority;
- the other four Workflow types must not create SQL Intake Findings.

If Feature/Issue compatibility mirroring fails after Markdown write, the Markdown remains `Pending`; report the save/sync failure and do not allow Architect-stage preparation from that state.

Update Feature Assessment and Issue RCA preparation so they require the exact Workflow Intake Markdown to exist and have disposition `Approved`.

Their prepared Architect instructions must identify the approved Markdown path/revision as the Intake authority. Remove wording that calls SPS/SQL Intake the authoritative Intake.

Do not otherwise redesign Feature Assessment or Issue RCA.

## 4. Workflow Intake review API

Add one exact-Workflow review operation, e.g.:

`reviewWorkflowIntake(workflowId, { status, notes })`

Supported dispositions:

- `Approved`
- `RevisionRequested`
- `Rejected`

Requirements:

- resolve the exact Workflow;
- resolve only its deterministic Intake Markdown path;
- verify canonical metadata identity/type;
- require non-empty notes for `RevisionRequested`;
- update canonical document disposition using the existing controlled disposition writer;
- return the refreshed `WorkflowIntakeProjection`.

Do not use the renderer's global selected-document identity as authority.

Expose this through the existing Workflow application IPC/preload boundary with strict argument validation.

## 5. Restore the Greenfield Intake companion behavior

Change `WorkflowIntakeWorkspace.tsx`:

### Right pane

Replace the embedded browser companion with `FigmaDocumentCard`.

Before first Markdown save:

- show the standard empty document state;
- neutral message: **Save Intake to create the Workflow Intake Markdown.**

After Save:

- immediately display the exact created/revised Intake document;
- show its filename, repository-relative path, Markdown body, disposition, and Copy action through `FigmaDocumentCard`.

The Workflow Intake renderer should receive the document from its own projection. Do not depend on App's global selected-document state.

### Left pane review

After the Intake document exists, render the shared `FigmaDocumentDispositionPanel` below the form, matching the Greenfield pattern.

Use:

- current document = Intake document filename;
- effective disposition = document disposition;
- workflow step = `Intake Review`;
- review notes initialized from canonical disposition notes;
- Apply Review -> `reviewWorkflowIntake`.

Save and Review are separate actions.

A substantive Save after an Approved/Rejected/RevisionRequested document creates the next artifact revision and resets it to Pending.

### Feature / Issue continuation

`Prepare Feature Assessment` and `Prepare Issue RCA` are enabled only when:

- the current saved Intake document exists;
- its effective disposition is `Approved`;
- there are no unsaved form edits;
- no save/review action is in progress.

Do not add progression buttons for Refactor/Migration, Integration, Infrastructure, or Research in this repair.

## 6. Intake must not own embedded ChatGPT

Remove `browserPanel` from `WorkflowIntakeWorkspace`.

Update App/Architect attachment eligibility so the embedded ChatGPT surface is **not attached for the Intake surface**.

Preserve embedded ChatGPT for the existing later Feature Assessment / Issue RCA / execution surfaces that currently use it.

The shared two-column `IntakeWorkspaceShell` remains unchanged: its companion slot is generic; Intake now supplies the Markdown document card, exactly as intended by the Greenfield reference.

## 7. Architecture documentation correction

Update:

`docs/architecture/RENDERER_WORKSPACE_UI_UX_REBASELINE_2026-09-30.md`

Clarify the approved shell rule:

- Intake workspace: questions/form left, Intake Markdown viewer right;
- Architect Assessment/RCA workspace: Architect work/review left, embedded ChatGPT right where applicable;
- the shell's right side is a generic companion slot, not permanently an Architect/browser slot.

Do not rewrite unrelated architecture guidance.

## Expected production areas

Create:

- `src/main/workflow/workflowIntakeDocumentService.ts`

Modify as required:

- `src/main/workflow/workflowIntakeService.ts`
- `src/shared/workflowIntakeContracts.ts`
- `src/shared/workspaceContracts.ts`
- `src/main/workflow/workflowApplicationIpc.ts`
- `src/preload/index.ts`
- `src/renderer/app/WorkflowIntakeWorkspace.tsx`
- `src/renderer/app/App.tsx`
- `src/renderer/app/architectSurfaceEligibility.ts`
- `src/main/featurePlanning/featurePlanningService.ts`
- `src/main/issuePlanning/issuePlanningService.ts`
- `docs/architecture/RENDERER_WORKSPACE_UI_UX_REBASELINE_2026-09-30.md`

Modify CSS only if a narrowly required existing Greenfield document/disposition style does not already apply.

No database schema, Workflow type registry, Git/source-control, routing, top-rail, or Intake-question change is authorized.

## Preserve

Preserve all previously validated RWS03/R01 behavior:

- six shared Intake forms and exact RWS02 questions;
- RWS03 4,096 character / UTF-8 bounds;
- exact Workflow identity;
- shared `IntakeWorkspaceShell`;
- validated shared top rail;
- Back to Workflows;
- responsive two-column geometry;
- Feature/Issue later-stage behavior except for requiring approved Markdown Intake;
- routed/direct provenance and SourceBaseline behavior.

## Forbidden changes

Do not:

- make Save Intake equal approval;
- keep ChatGPT as the Intake companion;
- create/update generic RWS03 SQL Intake Findings for Migration/Integration/Infrastructure/Research;
- parse the rendered Markdown body as machine state;
- key Intake documents by title or Work Intake ID;
- create one global Intake file shared across Workflow instances;
- auto-approve a new or revised Intake;
- auto-advance Workflow workspace on Save or Approve;
- loosen canonical Markdown containment/write-fence protections;
- create a new database table/entity type;
- migrate Assessment/RCA/Planning UI in this repair;
- alter RWS03-R01 top-rail composition.

## Focused regression proof

### Workflow Intake service

Extend `test/workflow/workflow-application-service.test.cjs` to prove for all six substantive types:

1. initial projection has no document;
2. Save creates exactly:
   `planning/workflows/<workflowId>/Intake/WORKFLOW_INTAKE_<workflowType>.md`;
3. metadata has exact Workflow ID/type, `artifactType=workflow-intake`, `gatingReview`, revision 1, Pending disposition, and exact values;
4. body contains ordered RWS02 labels/values;
5. optional omitted values render `Not provided.`;
6. second Save uses the same path, increments revision once, and resets disposition to Pending;
7. Review Approved/RevisionRequested/Rejected changes disposition without changing artifact revision;
8. RevisionRequested without notes fails;
9. wrong Workflow identity/type/path metadata fails closed;
10. Save does not advance `currentWorkspace`;
11. the four non-Feature/Issue types create no new `workflow-intake:*` Findings;
12. an RWS03 Finding-only Intake is recoverable in the form and becomes Markdown only on explicit Save.

For Feature and Issue prove:

- Markdown is created and returned as authority;
- their compatibility intake projection remains available after Save;
- Prepare Assessment/RCA fails while Markdown is Pending/Rejected/RevisionRequested;
- Prepare succeeds only after Approved;
- prepared instructions cite the exact approved Markdown path/revision and do not call SQL/SPS Intake authoritative.

### IPC/preload

Extend the existing Workflow Intake IPC proof for the review operation and strict surplus/missing argument rejection.

### Renderer

Extend `test/renderer/workflow-hub-shell.test.cjs` or the existing document-review owner to prove:

- `WorkflowIntakeWorkspace` still uses `IntakeWorkspaceShell`;
- it uses `FigmaDocumentCard`, not the browser companion;
- no document -> standard empty state;
- document -> Markdown body/path/status appears;
- `FigmaDocumentDispositionPanel` appears only when a document exists;
- Prepare Feature Assessment / Issue RCA is unavailable until Approved;
- local edits after approval make continuation unavailable until re-save/re-review;
- App does not attach embedded ChatGPT for the Intake surface;
- RWS03-R01 WorkflowStageRail remains outside the Intake shell.

Reuse existing `document-review-surface-source.test.cjs`, Greenfield Intake proof, and RWS03-R01 rail proof unchanged where they already cover the behavior.

Do not add a new permanent test file unless existing owners cannot express a materially distinct boundary; justify any new file in the report.

## Validation

Use the repair profile with exact changed paths:

- `npm run validate:plan -- --profile repair --changes tmp/rws03-r02-changes.json`
- `npm run test:affected -- --changes tmp/rws03-r02-changes.json`
- focused Workflow Intake / renderer / document proof after the composed build when needed;
- `git diff --check`.

Do not run full/release qualification.

Operator visual validation must repeat Refactor / Migration Intake:

1. open Intake;
2. confirm right pane initially shows no document;
3. Save Intake;
4. confirm Markdown appears immediately in the right viewer;
5. apply a Document Disposition;
6. edit/save again and confirm the new revision returns to Pending.

## Acceptance criteria

1. All six substantive Intake workspaces persist exact canonical Workflow Intake Markdown.
2. Refactor / Migration data entered under RWS03 is not lost before the Operator can explicitly Save it into Markdown.
3. The right Intake pane is `FigmaDocumentCard`, not embedded ChatGPT.
4. The Greenfield-style Document Disposition panel appears after Save.
5. Save and approval are separate actions.
6. Feature/Issue Architect continuation requires current Approved Intake Markdown.
7. Migration/Integration/Infrastructure/Research no longer create SQL Intake Findings.
8. Feature/Issue SQL Intake Findings, if retained, are compatibility mirrors only; prepared prompts identify Markdown as authority.
9. Re-save increments the Intake artifact revision and returns disposition to Pending.
10. Intake does not auto-advance the Workflow.
11. RWS03-R01 top rail and RWS01 shell geometry remain unchanged.
12. Focused owned proof passes; unrelated broader failures are reported and not repaired opportunistically.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS03_REPAIR02_IMPLEMENTER_REPORT.md`

Report:

- verified baseline/root;
- confirmed defect/root cause;
- exact Markdown path/metadata contract;
- RWS03 fallback-data handling;
- Feature/Issue compatibility mirror boundary;
- document review/disposition behavior;
- browser detachment from Intake;
- files changed;
- tests reused/extended/new with any coverage-gap justification;
- exact validation commands/results;
- deviations/blockers;
- remaining Operator visual validation.

## Checkpoint and STOP

Create one attributable checkpoint commit:

`RWS03-R02 restore Markdown intake review workflow`

Then STOP for Architect review and Operator validation. Do not begin Architect Assessment/RCA shell extraction.
