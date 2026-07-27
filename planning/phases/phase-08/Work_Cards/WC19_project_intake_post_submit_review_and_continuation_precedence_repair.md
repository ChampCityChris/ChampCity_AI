<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC19"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC19",
    "phaseId": "phase-08",
    "title": "Project Intake Post-Submit Review and Continuation Precedence Repair",
    "status": "draft_for_operator_review",
    "owner": "Implementer upon Operator approval",
    "risk": "high",
    "dependsOn": [
      "WC18"
    ],
    "executionInstruction": "Upon Operator approval, this Work Card itself is the Implementer instruction. No separate activation artifact or Implementer handoff is required.",
    "gitMutationAuthorized": false,
    "purpose": "Repair only three post-WC18 defects: clipped Project Intake review surfaces, lost post-submit confirmation and created-document review state, and incorrect Project Intake continuation precedence when later Pending or stale evidence exists.",
    "rootCauseAnalysis": [
      {
        "defectId": "clipped-project-intake-review-surface",
        "observedImpact": "The Project Intake form occupies the visible workspace while the document list and preview rendered below it are unreachable.",
        "primaryRootCause": "The workspace surface is assigned height 100vh inside app-body, even though app-body occupies only the grid row remaining below the workflow header.",
        "failureChain": [
          "Workflow header consumes the first application grid row",
          "app-body receives only remaining viewport height",
          "workspace-surface independently claims the full viewport height",
          "app-body clips overflow",
          "Project Intake form renders before document-workspace",
          "document-workspace falls below the visible clipped region"
        ],
        "contributingCauses": [
          "Viewport-derived document-workspace maximum heights",
          "Multiple nested scroll owners",
          "Large conditional Project Intake form before the review surface",
          "Launch smoke did not inspect viewport reachability"
        ]
      },
      {
        "defectId": "lost-post-submit-confirmation-and-review-state",
        "observedImpact": "Files are created but no stable confirmation or newly created Project Intake preview is available to the Operator.",
        "primaryRootCause": "Generic action feedback, resolver-required workspace state, and the manually viewed workspace/document are conflated in one renderer state path.",
        "failureChain": [
          "Submission success message is set",
          "Documents and resolver are reloaded",
          "Resolver feedback overwrites success feedback",
          "Resolver synchronization changes activeWorkspaceId",
          "Selected document becomes the prompt or is cleared",
          "Document loading clears generic feedback"
        ],
        "contributingCauses": [
          "No dedicated Project Intake submission-confirmation state",
          "selectResolverResult always performs navigation side effects",
          "Submission result paths are not resolved to the created logical document",
          "No post-submit focus or scroll transition to the review surface"
        ]
      },
      {
        "defectId": "project-intake-continuation-precedence",
        "observedImpact": "Later Pending or stale Project/Phase evidence can bypass missing-prompt or missing-Interview prerequisite states.",
        "primaryRootCause": "resolveProjectIntakeContinuation is evaluated only after general current-document selection finds no gating document.",
        "failureChain": [
          "Canonical Project Intake exists",
          "Resolver searches all gating evidence",
          "Later Pending or stale evidence produces currentIndex",
          "Continuation helper is not called",
          "Later evidence becomes current before required Project Intake continuation is complete"
        ],
        "contributingCauses": [
          "Continuation tests used minimal repositories",
          "No competing later Pending Project fixture",
          "No competing later Pending Phase fixture"
        ]
      }
    ],
    "requiredOutcome": [
      "Successful Project Intake submission produces a stable four-file confirmation",
      "The visible workspace remains Project Intake Capture for review",
      "The created Project Intake logical document is selected and previewed",
      "The document list and preview are visible and reachable",
      "Current required workflow context may show Architect Interview waiting without forcing navigation",
      "Missing prompt or missing Interview states take precedence over later evidence",
      "Normal downstream resolution resumes once a canonical Interview exists"
    ],
    "requiredRepairs": [
      {
        "id": "parent-constrained-workspace-layout",
        "requirements": [
          "Remove height 100vh from workspace-surface",
          "Size workspace-surface from the available app-body grid row",
          "Preserve min-height zero through relevant grid and flex ancestors",
          "Do not allow a child inside app-body to claim the full viewport height",
          "Replace conflicting viewport-derived document-workspace maximum heights",
          "Establish one clear outer vertical scroll owner for form plus review content",
          "Preserve bounded document-list and preview-body internal scrolling",
          "Keep the Project Intake form and document review surface in the same workspace",
          "Bring the created review surface into view after successful submission",
          "Preserve the existing shell, dark theme, sidebar, and workflow header"
        ]
      },
      {
        "id": "post-submit-confirmation-and-created-document-review",
        "requirements": [
          "Create Project Intake-specific confirmation state separate from generic feedback",
          "Display Intake Markdown and JSON paths",
          "Display Architect Interview Prompt Markdown and JSON paths",
          "Preserve confirmation during resolver refresh and document loading",
          "Clear confirmation on repository change",
          "Update confirmation on a later successful submission",
          "Resolve returned Intake paths to the newly loaded logical document",
          "Select and display the created Project Intake document",
          "Keep activeWorkspaceId as project-intake-capture after submission",
          "Do not automatically navigate to Architect Interview",
          "Keep current-required workspace context separate from manually viewed workspace",
          "Scroll or focus the document review surface into view",
          "Never show success confirmation after failed submission"
        ]
      },
      {
        "id": "project-intake-continuation-precedence",
        "requiredResolverOrder": [
          "Order planning documents",
          "Verify canonical Project Intake exists",
          "Evaluate Project Intake continuation prerequisite",
          "Return prerequisite state when present",
          "Otherwise select first current gating document",
          "Otherwise return all-approved"
        ],
        "requirements": [
          "No Intake returns pre-intake",
          "Approved Intake with missing or incomplete prompt returns project-intake-incomplete",
          "Approved Intake plus Approved prompt with no Interview returns waiting-for-architect-interview",
          "Continuation states take precedence over later Pending or stale Project evidence",
          "Continuation states take precedence over later Pending or stale Phase evidence",
          "Any canonical Interview logical document yields to normal current-document resolution",
          "Pending or defective Interview evidence is handled in Architect Interview",
          "Approved Interview permits downstream resolution",
          "No placeholder Interview or hidden state is introduced"
        ]
      }
    ],
    "requiredTests": [
      "Missing prompt plus later Pending Project Roadmap returns project-intake-incomplete",
      "Missing prompt plus later Pending Phase Planning returns project-intake-incomplete",
      "Missing Interview plus later Pending Project Roadmap returns waiting-for-architect-interview",
      "Missing Interview plus later Pending Phase Planning returns waiting-for-architect-interview",
      "Pending canonical Interview becomes current through normal resolution",
      "Approved Interview permits later evidence to become current",
      "Created Intake path resolves to the correct logical document",
      "Post-submit state preserves Project Intake as viewed workspace while current model points to Architect Interview",
      "Successful submission produces a four-path confirmation payload",
      "Repository change clears confirmation"
    ],
    "authorizedFiles": [
      "src/renderer/app/App.tsx",
      "src/renderer/styles.css",
      "src/shared/documents/documentOrder.ts",
      "test/resolver/first-non-approved-resolver.test.cjs",
      "test/lifecycle/evidence-lifecycle-resolver.test.cjs only if needed",
      "A narrowly scoped renderer state helper and matching Node test if required",
      "src/main/currentWorkflow/currentWorkflowService.ts only if consistency requires a minimal update"
    ],
    "prohibitedFilesOrSubsystems": [
      "src/main/contextMenu/localRendererContextMenu.ts",
      "Context-menu tests",
      "Architect Interview Prompt content and generation",
      "Repository selection and workspace settings",
      "Embedded Architect browser services",
      "Preload contracts",
      "Later Phase, Work Card, validation, repair, and closeout services"
    ],
    "nonGoals": [
      "Revising or reopening WC18 or its Implementer Report",
      "Changing native context-menu behavior",
      "Rewriting the Architect Interview Prompt",
      "Changing Project Intake artifact paths or transaction behavior",
      "Changing repository selection, persistence, or canonical classification",
      "Implementing Architect chat-to-MCP transfer",
      "Creating a Project Architect Interview placeholder",
      "Redesigning the workflow rail, sidebar, or dark theme",
      "Redesigning all workspace navigation or scrolling",
      "Creating a universal missing-artifact framework",
      "Adding dependencies",
      "Adding hidden state, queues, route tokens, databases, or approval artifacts",
      "Git mutation"
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test",
      "Non-acceptance Electron launch smoke",
      "Operator-controlled viewport, confirmation, created-document review, and precedence validation"
    ],
    "acceptanceCriteria": [
      "workspace-surface no longer claims full viewport height inside app-body",
      "Application body and workspace use a coherent parent-constrained height model",
      "Project Intake form, document list, and preview are reachable at supported heights",
      "Document review surface is not clipped by app-body",
      "Successful submission displays a stable four-file confirmation",
      "Resolver and document feedback do not overwrite confirmation",
      "Created Project Intake logical document is selected and displayed",
      "Visible workspace remains Project Intake Capture for post-submit review",
      "Review surface is brought into view",
      "Current required workspace can show Architect Interview without forcing visible navigation",
      "Repository change clears old confirmation",
      "Failed submission does not show success confirmation",
      "Missing prompt and missing Interview states take precedence over later evidence",
      "Canonical Interview returns control to normal resolution",
      "Approved Interview permits downstream evidence",
      "No prohibited architecture, dependency, or placeholder is introduced",
      "Typecheck, build, and tests pass",
      "Implementer Report distinguishes automated evidence from Operator validation",
      "No Git mutation occurs"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC19_project_intake_post_submit_review_and_continuation_precedence_repair.md"
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC19 Project Intake Post-Submit Review and Continuation Precedence Repair

Status: draft for Operator review
Owner: Implementer upon Operator approval
Phase: phase-08
Risk: high
Depends on: completed WC18 Project Intake Operator Validation Defect Repair
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC19_project_intake_post_submit_review_and_continuation_precedence_repair.md`

Upon Operator approval, this Work Card itself is the Implementer instruction. No separate activation artifact or Implementer handoff is required.

## Purpose

Repair exactly three defects discovered after completion of WC18:

1. the Project Intake document list and preview are rendered below the form but are clipped or unreachable because the workspace uses viewport-relative sizing inside a smaller parent grid row;
2. successful Project Intake submission does not preserve a confirmation or display the newly created Project Intake document for review because submission feedback, resolver navigation, and selected-document state are conflated;
3. the Project Intake continuation states are evaluated after later gating documents, allowing preexisting Pending or stale Project/Phase evidence to bypass the required missing-prompt or missing-interview state.

This card is a bounded follow-on repair. It does not reopen WC18, alter the completed WC18 Implementer Report, or authorize changes to the native context menu, generated Architect Interview Prompt content, repository selection, embedded Architect browser, or later lifecycle workspaces.

## Controlling Evidence

Operator evidence:

- after submitting Project Intake, the files were created but no stable confirmation or document review surface was available;
- the Project Intake form occupied the visible workspace;
- the document list and preview were not reachable below the form.

Source evidence:

- `src/renderer/styles.css` sets `.workspace-surface { height: 100vh; }` even though `.workspace-surface` is inside `.app-body`, which occupies only the application space below the full-width workflow header;
- `.app-body` uses `overflow: hidden`, so the oversized child can be clipped by its parent;
- `src/renderer/app/App.tsx` renders the complete `ProjectIntakeCapture` form before the shared `document-workspace`;
- `submitProjectIntake()` first sets a success message naming created paths, then replaces it with resolver feedback;
- `selectResolverResult()` changes `activeWorkspaceId` to the resolver-selected required workspace and changes the selected document;
- `loadDocument()` clears generic feedback, so document selection can erase submission confirmation;
- `src/shared/documents/documentOrder.ts` calls `resolveProjectIntakeContinuation()` only when no current gating document was found.

## Root Cause Analysis

### Defect 1 — Project Intake review surface is clipped or unreachable

#### Failure chain

```text
App root = full viewport
→ workflow header consumes the first grid row
→ app-body receives only the remaining height
→ workspace-surface is nevertheless assigned height: 100vh
→ workspace-surface becomes taller than app-body
→ app-body clips overflow
→ full Project Intake form is rendered before document-workspace
→ document-workspace falls below the visible clipped parent region
→ Operator cannot reach the document list, preview, or disposition area
```

#### Primary root cause

The layout mixes viewport-relative sizing with parent-constrained grid sizing. A child inside the second application grid row is incorrectly sized to the full viewport instead of the height available within that row.

#### Contributing causes

- the Project Intake form is a substantial fixed block rendered before the document viewer;
- `document-workspace` also uses viewport-derived `max-height` calculations rather than relying on one coherent parent sizing model;
- multiple nested scroll containers make it unclear which element owns vertical navigation;
- the launch smoke proved only that Electron remained running and did not validate visible reachability.

#### Detection gap

Automated typecheck, build, and source tests cannot establish viewport reachability. The defect required Operator use of the actual renderer.

### Defect 2 — No durable post-submit confirmation or created-document review state

#### Failure chain

```text
Submit succeeds
→ success feedback is set with created paths
→ documents are reloaded
→ resolver is executed
→ resolver feedback overwrites success feedback
→ resolver result changes activeWorkspaceId
→ selected document becomes the prompt or is cleared
→ loadDocument clears generic feedback
→ newly created Intake is not selected for review
→ Operator sees neither stable confirmation nor the created Intake document
```

#### Primary root cause

One generic state path is being used for three different concepts:

- transient action feedback;
- current required lifecycle projection;
- the workspace and document the Operator is manually viewing.

The renderer treats resolver output as a navigation command rather than as contextual workflow information.

#### Contributing causes

- submission confirmation is stored in the same `feedback` state used by refresh and resolver messages;
- `selectResolverResult()` always performs navigation and selection side effects;
- submission does not resolve the returned Intake paths back to the created logical document;
- no dedicated post-submit confirmation state exists;
- no focus or scroll transition moves the Operator to the created artifact review surface.

#### Detection gap

Service tests verified file creation. Resolver tests verified lifecycle projection. Neither proved the integrated human sequence of submitting, remaining in Project Intake, receiving confirmation, and reviewing the created document.

### Defect 3 — Project Intake continuation loses precedence to later artifacts

#### Failure chain

```text
Canonical Project Intake exists
→ resolver searches all gating documents
→ later Pending or stale Project/Phase document is found
→ currentIndex is not -1
→ Project Intake continuation helper is never called
→ later artifact becomes current
→ missing prompt or missing Architect Interview is bypassed
```

#### Primary root cause

Project Intake continuation is implemented as a terminal fallback after general current-document selection. It is actually a prerequisite check that must run before later lifecycle evidence can be selected.

#### Contributing causes

- initial tests used minimal repositories without later Pending evidence;
- later-lifecycle fixtures were completed to satisfy terminal tests rather than testing prerequisite precedence;
- the resolver result shapes were correct, but their evaluation order was not tested against existing-project corpora.

#### Detection gap

Tests proved each continuation state in isolation. They did not include later Pending Project or Phase records that compete for current-document selection.

## Required Outcome

```text
Operator submits Project Intake
→ explicit confirmation names the created Intake and prompt pairs
→ active visible workspace remains Project Intake Capture
→ newly created Project Intake logical document is selected
→ document list and preview are visible and reachable
→ current required workflow context may show Architect Interview waiting
→ manual view is not replaced by resolver navigation
→ missing prompt or missing Interview always takes precedence over later evidence
→ once a canonical Interview exists, normal downstream resolution resumes
```

## Required Repair 1 — Parent-Constrained Workspace and Review Layout

Correct the vertical sizing and overflow chain for the application body and Project Intake review surface.

### Requirements

1. Remove `height: 100vh` from `.workspace-surface`.
2. Size `.workspace-surface` from the available `.app-body` grid row using parent-constrained grid/flex sizing such as `height: 100%`, `min-height: 0`, and an explicit flex basis where appropriate.
3. Preserve the full-width workflow header as the first application row.
4. Preserve the sidebar and workspace below that header.
5. Do not make any child inside `.app-body` independently claim the full viewport height.
6. Remove or replace viewport-derived `document-workspace` maximum-height rules when they conflict with the parent-constrained sizing model.
7. Establish one clear vertical scroll owner for the complete workspace when the form plus review surface exceed the available height.
8. Preserve internal document-list and preview-body scrolling only for their bounded content regions.
9. Keep `min-height: 0` through every relevant grid and flex ancestor.
10. Keep the Project Intake form and document review surface in the same workspace.
11. Before submission, the empty document review surface may remain below the form, but it must be reachable.
12. After submission, the created document review surface must be brought into view through a bounded scroll/focus transition.
13. Do not hide, remove, or replace the document list or preview.
14. Preserve the dark theme, workflow header, sidebar, and existing document panel structure.

### Supported visual dimensions

Operator validation must cover:

- maximized desktop window;
- current BrowserWindow minimum size;
- an intermediate reduced height;
- Project Intake with the conditional repository-review question hidden;
- Project Intake with the conditional repository-review question shown;
- short document preview;
- long document preview.

At each supported dimension, the Operator must be able to reach:

- the Project Intake form;
- Submit Project Intake;
- the document list;
- the selected document preview;
- the document action or disposition area where applicable.

## Required Repair 2 — Dedicated Post-Submit Confirmation and Review State

Create a Project Intake-specific post-submit state that is separate from generic feedback and resolver navigation.

### Confirmation requirements

After successful submission, display a durable confirmation within Project Intake Capture containing:

- Project Intake Markdown path;
- Project Intake JSON path;
- Architect Interview Prompt Markdown path;
- Architect Interview Prompt JSON path;
- a concise statement that all four files were created successfully in the active repository.

The confirmation must:

- remain visible while the Operator reviews the created Intake;
- not be overwritten by resolver feedback, document loading, or ordinary refresh;
- clear when a different repository is selected;
- replace or update when Project Intake is submitted again;
- be dismissible only if a dismiss action is implemented intentionally.

Do not use the generic `feedback` state as the sole storage for this confirmation.

### Created-document selection requirements

After writing and reloading documents:

1. Match the submission result’s Project Intake Markdown or JSON path to the newly loaded logical document.
2. Set that logical document as `selectedDocumentId`.
3. Load and display its preview.
4. Keep `activeWorkspaceId` equal to `project-intake-capture` for the post-submit review.
5. Scroll or focus the Project Intake document review surface into view after selection.
6. Do not automatically switch the visible workspace to Architect Interview.
7. Keep the generated Architect Interview Prompt available in Architect Interview for later manual navigation.

### Required-workspace versus viewed-workspace separation

The renderer must distinguish:

```text
Current required lifecycle workspace
≠
Workspace currently viewed by the Operator
```

For this bounded repair:

- the current model and workflow context may report `architect-interview` as required;
- the Operator may remain in `project-intake-capture` to review the created Intake;
- resolver synchronization during Project Intake submission must update resolver/model context without forcing visible navigation;
- manual navigation through the rail or sidebar remains view-only.

A narrowly scoped option or helper that applies resolver state without navigation is authorized. Do not redesign the complete navigation architecture under WC19.

### Feedback behavior

- generic resolver feedback may be displayed separately from the submission confirmation;
- `loadDocument()` must not erase the Project Intake submission confirmation;
- a recoverable preview error must not falsely erase the successful file-creation confirmation;
- a failed submission must not display a success confirmation.

## Required Repair 3 — Project Intake Continuation Precedence

Move the bounded Project Intake continuation check to the correct position in lifecycle resolution.

### Required resolver order

```text
Order planning documents
→ verify canonical Project Intake exists
→ evaluate Project Intake continuation prerequisite
→ if continuation returns a state, return it
→ otherwise select the first current gating document
→ otherwise return all-approved
```

### Continuation behavior

1. No canonical Project Intake returns `pre-intake` as currently designed.
2. Approved canonical Project Intake plus missing, incomplete, unsynchronized, or non-Approved canonical Architect Interview Prompt returns `project-intake-incomplete`.
3. Approved canonical Project Intake plus synchronized Approved prompt plus no canonical Project Architect Interview logical document returns `waiting-for-architect-interview`.
4. Those states take precedence over any later Pending or stale Project, Phase, Work Card, validation, or closeout evidence.
5. When any canonical Project Architect Interview logical document exists, the continuation helper returns no prerequisite state and normal document resolution evaluates that Interview and later evidence.
6. A Pending, RevisionRequested, Rejected, stale, incomplete-pair, or unreadable canonical Interview must be handled by normal current-document logic in Architect Interview.
7. An Approved semantically complete Interview permits downstream evidence to become current.
8. Do not create placeholder Interview artifacts.
9. Do not introduce hidden state, queues, route tokens, or a general missing-output framework.

## Required Repair 4 — Focused Behavioral Tests

Retain completed WC18 tests and add only tests needed to prove these three repairs.

### Resolver precedence tests

Add behavioral fixtures proving:

1. Approved Intake with missing prompt and a later Pending Project Roadmap returns `project-intake-incomplete`.
2. Approved Intake with missing prompt and later Pending Phase Planning returns `project-intake-incomplete`.
3. Approved Intake plus Approved prompt with no Interview and later Pending Project Roadmap returns `waiting-for-architect-interview`.
4. Approved Intake plus Approved prompt with no Interview and later Pending Phase Planning returns `waiting-for-architect-interview`.
5. A Pending canonical Interview takes precedence through normal current-document resolution after the continuation helper yields.
6. An Approved Interview allows the later Pending record to become current.

### Post-submit state tests

The existing stack does not authorize a new renderer-testing dependency. Extract a narrowly scoped pure helper only when necessary to prove:

- created Intake path resolves to the correct logical document;
- post-submit synchronization can preserve `project-intake-capture` as the viewed workspace while the current model points to Architect Interview;
- the four-path confirmation payload is created from a successful submission result;
- repository change clears the confirmation state.

Do not substitute source-string assertions for state-transition behavior.

### Layout evidence boundary

Automated tests may verify pure sizing helpers only if such helpers are introduced for a legitimate production reason. CSS text assertions do not prove reachability and must not be reported as visual acceptance.

Operator validation remains controlling for:

- viewer visibility;
- scrolling;
- focus transition;
- confirmation placement;
- supported window heights.

No Playwright or new dependency is authorized.

## Authorized Files

Changes are limited to files directly required for these repairs, expected to include:

```text
src/renderer/app/App.tsx
src/renderer/styles.css
src/shared/documents/documentOrder.ts
test/resolver/first-non-approved-resolver.test.cjs
test/lifecycle/evidence-lifecycle-resolver.test.cjs     [only if needed]
```

A narrowly scoped renderer state helper and matching Node test are authorized if needed to test created-document selection and post-submit state without adding dependencies.

A minimal update to `src/main/currentWorkflow/currentWorkflowService.ts` is authorized only if the resolver-order correction requires no-shape-change consistency updates.

Do not modify:

- `src/main/contextMenu/localRendererContextMenu.ts`;
- context-menu tests;
- `src/main/projectIntake/projectIntakeService.ts` prompt content or artifact generation;
- repository selection or workspace settings;
- embedded Architect browser services;
- preload contracts;
- later Phase, Work Card, validation, repair, or closeout services.

## Explicit Non-Goals

Do not:

- revise or reopen WC18 or its Implementer Report;
- change native context-menu behavior;
- rewrite the Architect Interview Prompt;
- change Project Intake artifact paths or transaction behavior;
- change repository selection, persistence, or canonical classification;
- implement Architect chat-to-MCP transfer;
- create a Project Architect Interview placeholder;
- redesign the workflow rail, sidebar, or dark theme;
- redesign all workspace navigation;
- redesign all workspace scrolling;
- create a universal continuation or missing-artifact engine;
- add dependencies;
- add hidden workflow state, queues, route tokens, databases, or approval artifacts;
- perform Git operations.

## Validation

Run the normal Windows lane:

```text
npm run typecheck
npm run build
npm test
```

Perform a non-acceptance launch smoke confirming only that:

- the app launches;
- Project Intake Capture renders;
- submission does not crash;
- a created Intake can be selected programmatically through the production renderer path;
- the renderer remains on Project Intake Capture after successful submission;
- the current required model can report Architect Interview while Project Intake remains visible.

Launch smoke and automated checks do not establish viewport acceptance.

## Acceptance Criteria

WC19 is acceptable for Operator validation only when:

1. `.workspace-surface` no longer claims the full viewport inside `.app-body`;
2. the application body and workspace use one coherent parent-constrained height model;
3. the Project Intake form, document list, and preview are all reachable at supported window heights;
4. the document review surface is not clipped by `.app-body`;
5. internal preview scrolling does not prevent outer workspace navigation;
6. successful submission displays a stable confirmation naming all four created files;
7. resolver or document feedback does not overwrite the submission confirmation;
8. the newly created Project Intake logical document is selected and displayed;
9. the renderer remains visibly in Project Intake Capture for post-submit review;
10. the review surface is scrolled or focused into view after submission;
11. current required workspace context may show Architect Interview without forcing visible navigation;
12. repository change clears prior submission confirmation;
13. failed submission never displays success confirmation;
14. missing or incomplete prompt states take precedence over later Pending or stale evidence;
15. missing Interview waiting state takes precedence over later Pending or stale evidence;
16. a canonical Interview returns control to normal current-document resolution;
17. an Approved Interview allows downstream evidence to become current;
18. no placeholder Interview, hidden state, dependency, or prohibited architecture is introduced;
19. typecheck, build, and all tests pass;
20. the Implementer Report accurately distinguishes automated evidence from Operator visual validation;
21. no Git mutation occurs.

## Implementer Report Requirements

Create:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC19_project_intake_post_submit_review_and_continuation_precedence_repair.md`

The report must include:

- repository, remote, branch, and starting dirty-tree inventory;
- exact files created, modified, and deleted;
- final parent-constrained viewport and overflow model;
- final Project Intake form-to-review layout behavior;
- post-submit confirmation state and clearing rules;
- created logical-document selection behavior;
- viewed-workspace versus current-required-workspace behavior;
- final resolver evaluation order;
- precedence tests containing later Pending Project and Phase evidence;
- automated test results;
- launch-smoke result and limitations;
- remaining Operator validation;
- final repository status;
- confirmation that no Git operation occurred.

The report must end with:

```markdown
## Manual Validation After Architect Review

The Operator will perform controlling validation after Architect review.

Required human checks:

1. select a clean test repository and complete Project Intake;
2. confirm a success panel names all four created files;
3. confirm the visible workspace remains Project Intake Capture;
4. confirm the newly created Project Intake document is selected;
5. confirm its preview is visible without changing workspaces;
6. confirm the document list and preview are reachable by ordinary scrolling;
7. confirm the current-required banner reports Architect Interview waiting while the viewed workspace remains Project Intake;
8. confirm navigating to Architect Interview shows the generated prompt;
9. return to Project Intake and confirm the creation confirmation remains available;
10. repeat with the conditional repository-review field visible;
11. repeat at maximized, minimum, and intermediate supported window heights;
12. verify a long preview and its lower controls remain reachable;
13. select another repository and confirm the old confirmation is cleared;
14. use an existing-project fixture containing later Pending evidence and confirm missing prompt or missing Interview remains the required state;
15. add a Pending Interview and confirm it becomes current;
16. approve the Interview and confirm downstream evidence then becomes current.
