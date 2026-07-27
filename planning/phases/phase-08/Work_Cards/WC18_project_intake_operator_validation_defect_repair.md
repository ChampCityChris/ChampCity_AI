<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC18"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC18",
    "phaseId": "phase-08",
    "title": "Project Intake Operator Validation Defect Repair",
    "status": "draft_for_operator_review",
    "owner": "Implementer upon Operator approval",
    "risk": "high",
    "dependsOn": [
      "WC17"
    ],
    "executionInstruction": "Upon Operator approval, this Work Card itself is the Implementer instruction. No separate activation artifact or Implementer handoff is required.",
    "gitMutationAuthorized": false,
    "purpose": "Repair only the four defects discovered during Operator validation of the WC17 Project Intake workflow: local editing context menus, reachable disposition controls, substantive Architect Interview Prompt generation, and the missing Architect Interview waiting projection.",
    "operatorValidationDefects": [
      {
        "id": "local-editing-context-menu",
        "observation": "Misspelled words are underlined but cannot be right-clicked for suggestions, and local fields lack Cut, Copy, Paste, Delete, and Select All context-menu actions."
      },
      {
        "id": "unreachable-disposition-controls",
        "observation": "Nested preview scrolling leaves the Disposition controls below the reachable viewport."
      },
      {
        "id": "minimal-architect-interview-prompt",
        "observation": "The generated Project Architect Interview Prompt lacks sufficient role, interview, coverage, repository-review, and output-contract instructions."
      },
      {
        "id": "false-all-approved-projection",
        "observation": "Approved Project Intake plus Approved non-review prompt plus no interview output incorrectly projects all planning documents approved."
      }
    ],
    "requiredRepairs": [
      {
        "id": "native-local-renderer-context-menu",
        "requirements": [
          "Register a native Electron context-menu handler for the local application renderer",
          "Show Electron dictionary suggestions for misspelled editable text",
          "Replace misspellings through supported webContents behavior",
          "Provide Add to Dictionary when supported",
          "Provide applicable Cut, Copy, Paste, Delete, and Select All actions",
          "Provide Copy for selected non-editable local text",
          "Use Electron roles or supported webContents operations",
          "Do not override or automate the embedded remote Architect surface",
          "Do not add a dependency or external spelling service"
        ]
      },
      {
        "id": "reachable-disposition-controls",
        "requirements": [
          "Propagate min-height zero through required grid and flex ancestors",
          "Constrain the document workspace to available viewport height",
          "Make document content the primary internal scroll region",
          "Keep Disposition controls inside the panel and reachable",
          "Do not cover preview content with fixed or sticky controls",
          "Preserve document-list scrolling and the current dark layout",
          "Validate normal, minimum, and reduced supported window heights",
          "Validate short and long documents"
        ]
      },
      {
        "id": "substantive-project-architect-interview-prompt",
        "requiredSourceContext": [
          "Project name",
          "Project purpose",
          "Desired outcome",
          "Project type",
          "Existing source or planning indicator",
          "Known constraints or non-negotiables",
          "Optional repository-review context",
          "Canonical Project Intake source path and revision",
          "Exact Project Architect Interview Markdown and JSON targets",
          "Generated prompt revision"
        ],
        "requiredArchitectBehavior": [
          "Act as project Architect",
          "Use the approved intake without repeating answered questions",
          "Conduct a conversational adaptive interview",
          "Resolve material ambiguity, conflicts, assumptions, dependencies, and risks",
          "Ask relevant follow-up questions until later Project Profile and Project Roadmap planning is supportable",
          "Summarize understanding and correct consequential misunderstandings with the Operator",
          "Write the exact substantive Markdown and JSON output siblings through ChampCity MCP"
        ],
        "requiredCoverage": [
          "Users and stakeholders",
          "Problem and desired outcome",
          "Primary workflows and functional capabilities",
          "Boundaries, non-goals, and deferred scope",
          "Existing project state when applicable",
          "Platform, deployment, technology, environment, and compatibility",
          "Data ownership, retention, and migration",
          "Integrations and external systems",
          "Security, privacy, compliance, accessibility, safety, and operations when applicable",
          "User-experience expectations",
          "Reliability, performance, supportability, maintainability, and observability when applicable",
          "Delivery priorities, dependencies, sequencing, and deadlines",
          "Acceptance, validation, and evidence expectations",
          "Risks, unknowns, assumptions, and decisions"
        ],
        "existingRepositoryRequirements": [
          "Inspect the repository through ChampCity MCP",
          "Distinguish verified facts, Operator statements, assumptions, and Architect recommendations",
          "Cite repository-relative paths where practical",
          "Identify relevant implemented behavior, planning, failures, abandoned attempts, protected areas, and technical debt",
          "Use verified current state as the planning baseline"
        ],
        "promptDisposition": {
          "participationRole": "nonReviewHandoff",
          "status": "Approved"
        },
        "requiredOutputContract": {
          "artifactType": "project-architect-interview",
          "participationRole": "gatingReview",
          "status": "Pending",
          "synchronizedSiblingsRequired": true,
          "applicationPlaceholderProhibited": true
        }
      },
      {
        "id": "architect-interview-waiting-projection",
        "trigger": [
          "Canonical Approved Project Intake exists",
          "Canonical Approved Project Architect Interview Prompt exists as non-review handoff",
          "No canonical Project Architect Interview logical document exists"
        ],
        "projection": {
          "activeWorkspaceId": "architect-interview",
          "state": "waiting-for-project-architect-interview-output",
          "mustDisplayExactOutputTargets": true
        },
        "requirements": [
          "Do not return all-approved or Project Close",
          "Do not create a placeholder interview",
          "Keep the prompt visible as non-review evidence",
          "A Pending canonical interview becomes the current review document",
          "An Approved interview resumes normal downstream resolution",
          "Refresh the current workspace model immediately after Project Intake submission",
          "Approved Intake with missing prompt surfaces an actionable incomplete state",
          "Do not introduce hidden lifecycle state or a universal missing-output engine"
        ]
      }
    ],
    "generatedInterviewMarkdownSections": [
      "Source Revisions",
      "Project Understanding",
      "Intended Users and Stakeholders",
      "Goals and Success Criteria",
      "Functional Scope and Primary Workflows",
      "Boundaries, Non-Goals, and Deferred Scope",
      "Verified Existing State when applicable",
      "Technical and Operational Constraints",
      "Data and Integration Considerations",
      "Security, Privacy, Compliance, and Accessibility",
      "User-Experience Expectations",
      "Delivery Priorities and Dependencies",
      "Risks, Unknowns, Assumptions, and Decisions",
      "Validation and Acceptance Expectations",
      "Planning Implications",
      "Remaining Open Questions when material",
      "Document Disposition"
    ],
    "authorizedFiles": [
      "src/main/main.ts",
      "src/main/projectIntake/projectIntakeService.ts",
      "src/main/currentWorkflow/currentWorkflowService.ts",
      "src/shared/documents/documentOrder.ts",
      "src/shared/workspaceContracts.ts only if required by result contracts",
      "src/renderer/app/App.tsx",
      "src/renderer/styles.css",
      "test/app-shell/app-shell.test.cjs only if context-menu behavior belongs there",
      "test/project-intake/project-intake-service.test.cjs",
      "test/resolver/first-non-approved-resolver.test.cjs",
      "test/lifecycle/evidence-lifecycle-resolver.test.cjs only if needed for regression",
      "A narrowly scoped local-renderer context-menu helper and matching test",
      "A narrowly scoped generated-prompt fixture or test"
    ],
    "nonGoals": [
      "Reopening WC17 repository selection, persistence, or canonical Project Intake classification",
      "Full Architect Interview chat-to-MCP transfer implementation",
      "Application-authored Project Architect Interview output",
      "Placeholder interview pair",
      "Sidebar, workflow rail, or dark-theme redesign",
      "Every-workspace scrolling redesign",
      "Complete lifecycle resolver replacement",
      "Universal missing-artifact framework",
      "Third-party spellchecker, editor, clipboard package, or UI framework",
      "New dependencies",
      "Hidden workflow state, queues, route tokens, approval artifacts, or databases",
      "Provider APIs, DOM automation, or credential access",
      "Git mutation"
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test",
      "Non-acceptance launch smoke",
      "Operator-controlled context-menu, scrolling, generated-prompt, and waiting-state validation"
    ],
    "acceptanceCriteria": [
      "Local editable fields show native spelling suggestions",
      "Selecting a suggestion replaces the misspelled word",
      "Applicable Cut, Copy, Paste, Delete, and Select All actions are available",
      "Selected non-editable local text can be copied",
      "No external spellcheck service or new dependency is introduced",
      "The embedded remote Architect surface is not automated or overridden",
      "Disposition controls remain reachable for short and long documents at supported heights",
      "Preview scrolling does not trap the Operator above controls",
      "The action row does not cover preview content",
      "Generated prompt siblings contain complete intake context, adaptive instructions, required coverage, repository-review behavior, and exact output contract",
      "Generated prompt siblings remain synchronized Approved non-review handoffs",
      "The required Architect-authored output is substantive, synchronized, and Pending",
      "No placeholder interview is created",
      "Approved Intake plus Approved prompt plus no interview projects Architect Interview waiting state",
      "That evidence never projects all-approved or Project Close",
      "The waiting state names exact expected output paths",
      "A Pending interview becomes current",
      "An Approved interview resumes downstream resolution",
      "Current workspace model refreshes immediately after intake submission",
      "Missing prompt evidence produces an actionable incomplete state",
      "Typecheck, build, and tests pass",
      "No unrelated change, dependency, prohibited architecture, or Git mutation is introduced"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC18_project_intake_operator_validation_defect_repair.md"
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC18 Project Intake Operator Validation Defect Repair

Status: draft for Operator review
Owner: Implementer upon Operator approval
Phase: phase-08
Risk: high
Depends on: WC17 Project Intake Repository Selection and Canonical Workspace Repair
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC18_project_intake_operator_validation_defect_repair.md`

Upon Operator approval, this Work Card itself is the Implementer instruction. No separate activation artifact or Implementer handoff is required.

## Purpose

Repair only the four defects discovered during Operator validation of the WC17 Project Intake workflow:

1. local application text fields lack native spelling-correction and editing context menus;
2. document Disposition controls are not reliably reachable within the visible workspace;
3. the generated Project Architect Interview Prompt is too minimal to conduct and document a planning-grade interview;
4. after Project Intake submission, the application incorrectly reports that all planning documents are approved instead of waiting for the required Project Architect Interview output.

This card continues the same bounded Project Intake path. It does not authorize a general UI redesign, broad lifecycle-resolver replacement, or implementation of the full Architect Interview workspace.

## Operator Validation Evidence

The Operator confirmed that WC17 successfully created and displayed the canonical Project Intake pair. During live use, the Operator observed:

- misspelled words are underlined but right-click provides no spelling suggestions;
- right-click provides no Cut, Copy, Paste, Delete, or Select All menu in local application inputs and textareas;
- the document preview can scroll internally while the Disposition row remains below the reachable viewport;
- the generated Architect Interview Prompt contains only minimal generic instructions and does not define a sufficient interview or output contract;
- after the Approved Project Intake and Approved non-review prompt exist, the workspace banner reports `All planning documents approved` even though no Project Architect Interview pair exists.

Architect source review confirmed:

- `src/main/main.ts` does not register a native local-renderer `context-menu` handler;
- `src/renderer/styles.css` combines outer workspace scrolling, an overflow-hidden document panel, and an independently scrolling preview body that can strand the Disposition row below the viewport;
- `src/main/projectIntake/projectIntakeService.ts` generates only a short instruction block and one short JSON instruction string;
- the resolver has a pre-intake projection but no bounded state for an Approved Project Intake followed by a missing Architect Interview output, causing a fallthrough to `all-approved`.

## Required Outcome

```text
Operator enters Project Intake text
→ native right-click editing and spelling suggestions work
→ Project Intake submission creates a substantive Architect Interview Prompt
→ Project Intake document controls remain reachable at supported window sizes
→ Approved Intake plus Approved prompt projects Architect Interview waiting state
→ Architect writes the substantive interview pair through ChampCity MCP
→ Pending interview becomes the current review document
```

## Required Repair 1 — Native Local-Renderer Editing Context Menu

Implement a native Electron context menu for editable and selectable content in the local ChampCity A/I renderer.

### Scope

Apply the menu to the local application window created in `src/main/main.ts`, including ordinary local:

- text inputs;
- textareas;
- selectable document text;
- other editable local renderer controls supported by Electron context-menu parameters.

Do not inject, automate, or override context-menu behavior inside the embedded remote Architect surface.

### Editable-field behavior

When the context-menu event reports editable content, display applicable native actions:

- spelling replacement suggestions from Electron `dictionarySuggestions` when `misspelledWord` is present;
- replace the misspelled word through the supported Electron webContents method;
- Add to Dictionary when supported and a misspelled word is present;
- Cut;
- Copy;
- Paste;
- Delete;
- Select All.

Disable or omit actions that are not valid for the current selection or edit state. Use Electron roles or supported webContents operations rather than custom clipboard or DOM manipulation.

### Non-editable selected text

When local renderer text is selected but not editable, provide:

- Copy;
- Select All when applicable.

Do not show an empty context menu where no action is available.

### Spellcheck boundary

- Ensure spellcheck is enabled for the local renderer using supported Electron configuration.
- Use the operating-system/Electron dictionary and suggestions.
- Do not add a third-party spellchecker or dependency.
- Do not transmit text to an external spelling service.
- Preserve Ctrl+X, Ctrl+C, Ctrl+V, and Ctrl+A behavior.

### Implementation quality

A narrowly scoped helper for building the local context-menu template is authorized when it improves testability. The helper must not expose arbitrary shell, filesystem, navigation, or process actions.

## Required Repair 2 — Reachable Document Disposition Controls

Correct the document workspace sizing and scrolling model so the Disposition controls remain reachable without hiding document content.

### Required panel structure

```text
Document preview panel
├── current-document summary
├── preview header
├── local feedback/error area
├── scrollable document content
└── reachable disposition controls
```

### Requirements

1. Propagate `min-height: 0` through every grid or flex ancestor needed for the panel to shrink inside the available application viewport.
2. Constrain the document workspace to the available workspace height rather than relying only on large minimum heights.
3. Make the preview content region the primary internal scroll area for long document content.
4. Keep the Disposition controls inside the document panel and fully reachable at supported window dimensions.
5. The Disposition row may remain fixed within the panel or use a bounded sticky treatment, but it must not cover preview content.
6. The outer workspace may scroll when the complete workspace truly exceeds available height, but nested scrolling must not trap the Operator above unreachable controls.
7. Preserve document-list scrolling independently where needed.
8. Preserve the existing dark theme and panel arrangement.
9. Do not reduce controls or text to unreadable dimensions to make them fit.
10. Do not change disposition behavior or authority under this repair.

### Supported validation dimensions

Validate at minimum:

- normal maximized desktop window;
- current minimum supported BrowserWindow size;
- a reduced but supported intermediate height;
- short document preview;
- long document preview.

The Operator must be able to reach the Disposition selector and action button through ordinary wheel, scrollbar, keyboard, or tab navigation.

## Required Repair 3 — Substantive Project Architect Interview Prompt

Rewrite the generated Project Architect Interview Prompt as a complete adaptive Architect instruction and output contract.

The prompt remains:

```text
Document.Status=Approved
```

It is generated by the application and is not itself an approval target.

### Required source context

The Markdown and JSON prompt siblings must include or structurally represent:

- project name;
- project purpose;
- desired outcome;
- project type;
- whether existing source code or planning documents are present;
- known constraints or non-negotiables;
- optional repository-review context;
- canonical Project Intake source path and revision;
- exact Project Architect Interview Markdown and JSON output targets;
- generated prompt revision.

Concrete local repository paths must remain redacted where the existing contract requires `<PROJECT_REPO>`.

### Architect role and objective

The prompt must instruct the Architect to:

- act as the project Architect for the selected project;
- use the approved Project Intake as the starting context rather than repeating questions already answered;
- conduct a conversational, adaptive interview focused on unresolved planning information;
- identify material ambiguity, conflicting requirements, assumptions, dependencies, and risks;
- ask follow-up questions until the project is sufficiently understood to support the later Project Profile and Project Roadmap;
- summarize its understanding and resolve consequential misunderstandings with the Operator before finalizing the durable interview document;
- write the exact required Markdown and JSON siblings through ChampCity MCP.

The prompt must not require a rigid interrogation of irrelevant questions. It must direct the Architect to cover relevant subjects and explicitly record when a subject is not applicable.

### Required interview coverage

The Architect must resolve relevant information across:

1. intended users, Operator, stakeholders, and affected parties;
2. the problem being solved and the desired measurable or observable outcome;
3. primary user workflows and functional capabilities;
4. boundaries, explicit non-goals, and deferred capabilities;
5. existing project state when applicable;
6. platform, deployment, technology, environment, and compatibility constraints;
7. data inputs, outputs, ownership, retention, and migration considerations;
8. integrations, external systems, services, files, devices, or repositories;
9. security, privacy, compliance, accessibility, safety, and operational requirements when applicable;
10. user-experience expectations and important interaction patterns;
11. reliability, performance, supportability, maintainability, and observability expectations when applicable;
12. delivery priorities, dependencies, sequencing constraints, and known deadlines;
13. acceptance, validation, and evidence expectations;
14. risks, unknowns, assumptions, and decisions that later planning must address.

The Architect may consolidate overlapping subjects and omit irrelevant follow-up questions, but the final interview document must make the disposition of each materially relevant subject clear.

### Existing-repository behavior

When `hasExistingSourceOrPlanning` is Yes, the prompt must require the Architect to:

- inspect the selected repository through ChampCity MCP before finalizing the interview document;
- distinguish verified repository facts from Operator statements, assumptions, and Architect recommendations;
- cite repository-relative paths where practical;
- identify current implemented behavior, existing planning, known failures, abandoned attempts, protected areas, and material technical debt when relevant;
- use the verified current state as the baseline for later Project Profile and Project Roadmap work.

The optional repository-review context may be blank and must not substitute for repository inspection.

When the answer is No, the prompt should treat the project as greenfield unless repository evidence establishes otherwise.

### Required Project Architect Interview output

The prompt must require the Architect to create synchronized siblings at the exact generated targets.

The Markdown output must include a usable structure covering at least:

```text
# Project Architect Interview — <project name>

## Intended Users and Stakeholders
## Goals and Success Criteria
## Functional Scope and Primary Workflows
## Boundaries, Non-Goals, and Deferred Scope
## Verified Existing State                 [when applicable]
## Technical and Operational Constraints
## Data and Integration Considerations
## Security, Privacy, Compliance, and Accessibility
## User-Experience Expectations
## Delivery Priorities and Dependencies
## Risks, Unknowns, Assumptions, and Decisions
## Validation and Acceptance Expectations
## Planning Implications
## Remaining Open Questions                [only when material questions remain]
## Required Repair 4 — Architect Interview Waiting Projection

Add a narrowly bounded resolver state for the missing required Project Architect Interview output.

### Trigger condition

When the active repository contains:

- a canonical Approved Project Intake; and
- the canonical Approved Project Architect Interview Prompt non-review handoff; and
- no canonical Project Architect Interview logical document pair;

then the application must project:

```text
Current workspace: Architect Interview
Current state: Waiting for Project Architect Interview output
Expected output: the exact Project Architect Interview Markdown/JSON targets
```

It must not project:

- `All planning documents approved`;
- Project Close;
- terminal completion;
- a fabricated or placeholder interview document.

### Resolver and renderer requirements

1. Add the minimum explicit result shape needed to represent this waiting state.
2. Keep the generated prompt visible in the Architect Interview workspace as non-review handoff evidence.
3. Keep the missing Architect Interview output as an honest waiting state, not a Pending fake document.
4. When a canonical Pending Project Architect Interview appears, it becomes the current review document.
5. When the interview becomes Approved, normal downstream lifecycle resolution resumes.
6. Refresh the current workspace model immediately after successful Project Intake submission so the banner cannot retain pre-intake or terminal text.
7. Refreshing the workspace must preserve the same waiting projection until the Architect output exists.
8. Do not introduce hidden lifecycle state, route tokens, queues, or consumed flags.
9. Do not generalize this card into a universal missing-output engine.

### Partial-evidence behavior

If Project Intake is Approved but the required prompt pair is missing because generation failed or the files were removed, surface a local actionable Project Intake error rather than reporting all-approved. Do not silently synthesize an Approved prompt.

## Required Repair 5 — Bounded Automated Tests

Retain existing WC17 tests and add focused behavioral coverage.

### Native context-menu tests

When implemented through a testable helper, verify that:

- editable misspelled text produces spelling suggestions followed by applicable editing actions;
- selecting a suggestion invokes replacement of the misspelled word;
- Add to Dictionary invokes the supported session operation when available;
- ordinary editable text provides Cut, Copy, Paste, Delete, and Select All as applicable;
- selected non-editable text provides Copy;
- no shell, filesystem, process, or arbitrary-navigation actions appear.

Automated tests do not prove the operating-system menu visually appears; Operator validation controls that result.

### Prompt-generation tests

Verify that both generated prompt siblings contain:

- all captured intake context;
- source path and revision;
- exact output targets;
- adaptive interview role and method;
- required planning coverage;
- existing-repository review requirements when applicable;
- greenfield behavior when applicable;
- the required Pending Markdown/JSON output contract;
- Approved non-review handoff disposition.

Do not satisfy this requirement only with isolated source-string assertions. Parse and inspect generated artifacts from a temporary repository.

### Waiting-state tests

Verify:

1. Approved Intake plus Approved prompt plus no interview returns Architect Interview waiting state.
2. The same evidence never returns `all-approved`.
3. A Pending canonical interview becomes the current Architect Interview review document.
4. An Approved interview permits normal downstream resolution.
5. Approved Intake with missing prompt produces a local incomplete/error state rather than all-approved.
6. Project Intake submission followed by current-model refresh projects Architect Interview waiting state.

### Disposition layout validation

No existing automated test stack may falsely claim that CSS/source text proves reachability. Typecheck and build provide regression support. Operator validation remains controlling for scroll and viewport behavior.

No Playwright or new dependency is authorized.

## Authorized Files

Changes are limited to files directly required for these four repairs, expected to include:

```text
src/main/main.ts
src/main/projectIntake/projectIntakeService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/shared/documents/documentOrder.ts
src/shared/workspaceContracts.ts                       [only if required by result contracts]
src/renderer/app/App.tsx
src/renderer/styles.css
test/app-shell/app-shell.test.cjs                     [only if context-menu window behavior belongs here]
test/project-intake/project-intake-service.test.cjs
test/resolver/first-non-approved-resolver.test.cjs
test/lifecycle/evidence-lifecycle-resolver.test.cjs  [only if needed for regression]
```

A narrowly scoped local-renderer context-menu helper and matching test file are authorized.

A narrowly scoped fixture for generated Architect Interview Prompt inspection is authorized.

Do not modify unrelated Phase, Work Card, repair, validation, closeout, browser-integration, or MCP services.

## Explicit Non-Goals

Do not:

- reopen WC17 repository selection, persistence, or canonical Project Intake classification except to preserve regression coverage;
- implement the full Architect Interview chat-to-MCP transfer path;
- write the Project Architect Interview output from application code;
- create a placeholder interview pair;
- redesign the sidebar, workflow rail, or dark theme;
- redesign every workspace's scrolling model;
- replace the complete lifecycle resolver;
- create a universal missing-artifact framework;
- add a third-party spellchecker, editor, clipboard package, or UI framework;
- add dependencies;
- add hidden workflow state, queues, route tokens, approval artifacts, or databases;
- use provider APIs, DOM automation, or credential access;
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
- the Project Intake form remains usable;
- a right-click attempt does not crash the renderer;
- a generated prompt can be created;
- the Architect Interview waiting state renders;
- the Disposition panel renders without a blank workspace.

Automated validation and launch smoke do not establish Operator acceptance.

## Acceptance Criteria

WC18 is acceptable for Operator validation only when:

1. local editable fields show native right-click spelling suggestions for misspelled words;
2. selecting a spelling suggestion replaces the word;
3. local editable fields provide applicable Cut, Copy, Paste, Delete, and Select All actions;
4. selected non-editable local text can be copied through the context menu;
5. no external spelling service or new dependency is introduced;
6. the embedded remote Architect surface is not automated or overridden by the local context-menu repair;
7. Disposition controls remain reachable for short and long documents at supported window heights;
8. preview scrolling does not trap the Operator above the Disposition controls;
9. document content is not covered by a fixed or sticky action row;
10. the generated Architect Interview Prompt includes the complete source context, adaptive interview instructions, coverage requirements, repository-review behavior, and exact output contract;
11. generated prompt Markdown and JSON remain synchronized Approved non-review handoff siblings;
12. the prompt requires the Architect-authored interview siblings to be substantive, synchronized, and Pending;
13. the application does not create a placeholder interview document;
14. Approved Intake plus Approved prompt plus no interview projects Architect Interview waiting state;
15. that evidence does not project `All planning documents approved` or Project Close;
16. the waiting state names the exact expected output pair;
17. a Pending interview becomes the current Architect Interview review document;
18. an Approved interview resumes normal downstream resolution;
19. the current workspace model refreshes immediately after Project Intake submission;
20. missing prompt evidence produces a local actionable incomplete state rather than terminal completion;
21. typecheck, build, and tests pass;
22. no unrelated workspace change, dependency, prohibited architecture, or Git mutation is introduced;
23. the Implementer Report accurately distinguishes automated evidence from remaining Operator visual validation.

## Implementer Report Requirements

Create:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC18_project_intake_operator_validation_defect_repair.md`

The report must include:

- repository, remote, branch, and starting dirty-tree inventory;
- exact files created, modified, and deleted;
- local-renderer context-menu implementation and security boundary;
- spelling-suggestion and editing-action behavior;
- final document-panel sizing and scrolling model;
- generated Architect Interview Prompt Markdown and JSON contract;
- sample generated prompt paths from a temporary test repository;
- final Architect Interview waiting-state trigger and projection;
- current-model refresh behavior after submission;
- automated test inventory and results;
- launch-smoke result and limitations;
- remaining Operator validation;
- final repository status;
- confirmation that no Git operation occurred.

The report must end with:

```markdown
## Manual Validation After Architect Review

The Operator will perform controlling validation after Architect review.

Required human checks will include:

1. right-click a misspelled word in Project Purpose and select a suggested correction;
2. right-click editable text and verify Cut, Copy, Paste, Delete, and Select All availability;
3. right-click selected read-only preview text and verify Copy;
4. confirm ordinary keyboard editing shortcuts still work;
5. inspect a short document and reach the Disposition controls;
6. inspect a long document and reach the Disposition controls using wheel, scrollbar, keyboard, and tab navigation;
7. repeat at normal, minimum, and reduced supported window heights;
8. confirm the action row does not cover preview content;
9. submit a bounded intake and inspect the full generated Architect Interview Prompt Markdown and JSON siblings;
10. confirm the prompt contains intake context, adaptive interview instructions, required coverage, and exact Pending output contract;
11. confirm the workspace projects Architect Interview waiting state rather than all-approved;
12. confirm the expected output paths are displayed;
13. create or supply a Pending Project Architect Interview pair through the intended Architect/MCP path and confirm it becomes current;
14. approve the interview and confirm normal downstream projection resumes.
