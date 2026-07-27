<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC17"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC17",
    "phaseId": "phase-08",
    "title": "Project Intake Repository Selection and Canonical Workspace Repair",
    "status": "approved",
    "owner": "Implementer",
    "risk": "high",
    "dependsOn": [
      "Current Phase 08 application shell",
      "Current Project Intake implementation"
    ],
    "executionAuthorizedBy": "approved_work_card_itself",
    "gitMutationAuthorized": false,
    "purpose": "Repair only the Project Intake vertical workflow so one active repository controls selection, discovery, intake submission, refresh, and canonical Project Intake display.",
    "defectEvidence": [
      "New repositories are rejected when planning/ does not already exist",
      "Failed repository switching leaves the previous repository active and reloads its documents",
      "A separate transient Project Intake repository root conflicts with the persisted application workspace",
      "Broad project_intake filename matching misclassifies Implementer Reports, Work Cards, and design documents",
      "The service writes intake and prompt pairs but the running application does not prove write and refresh against one active repository",
      "The visible questionnaire requires validation against the confirmed fixed question contract"
    ],
    "requiredRepairs": [
      {
        "id": "single-active-repository",
        "requirements": [
          "Use one persisted main-process-owned active repository root",
          "Make the global and Project Intake repository choosers update the same selection",
          "Accept any existing readable and writable directory without requiring planning/",
          "Do not create planning/ during selection",
          "Remove transient selectedProjectRepositoryRoot authority",
          "Prevent renderer-submitted paths from controlling writes"
        ]
      },
      {
        "id": "empty-repository-state",
        "requirements": [
          "Treat missing planning/ as a valid pre-intake state",
          "Return an empty document collection or explicit pre-intake projection",
          "Project zero-document repositories to project-intake-capture, not project-close",
          "Keep the Project Intake form usable before planning exists"
        ]
      },
      {
        "id": "repository-switch-clearing",
        "requirements": [
          "Clear prior document, preview, resolver, current model, feedback, errors, and counts before loading the new repository",
          "Reload only from the newly persisted repository",
          "Show the same repository in the selected-workspace display and Project Repository field",
          "Never display repository A documents after repository B is selected"
        ]
      },
      {
        "id": "canonical-project-intake-classification",
        "requirements": [
          "Prefer artifactType=project-intake",
          "Allow only canonical planning/project/Project_Intake/ fallback for incomplete or Markdown-only pairs",
          "Remove filename substring ownership for Project Intake",
          "Exclude reports, Work Cards, reviews, design documents, handoffs, and context records",
          "Classify the Architect Interview Prompt into Architect Interview"
        ]
      },
      {
        "id": "approved-questionnaire",
        "questions": [
          "Project Name",
          "Project Purpose — What are you trying to create, change, or accomplish?",
          "Desired Outcome — What should the finished project allow the user or Operator to do?",
          "Project Type",
          "Project Repository",
          "Does this repository already contain source code or project-planning documents?",
          "Known Constraints or Non-Negotiables",
          "Conditional: What should the Architect know before reviewing the existing repository?"
        ],
        "requirements": [
          "Questions 1 through 6 are required",
          "Known Constraints is optional",
          "Repository review context is optional and shown only when existing source or planning is Yes",
          "Project Repository is read-only display of the active repository",
          "Use the confirmed Project Type values"
        ]
      },
      {
        "id": "integrated-submit-path",
        "outputs": [
          "planning/project/Project_Intake/PROJECT_INTAKE_<project_slug>.md",
          "planning/project/Project_Intake/PROJECT_INTAKE_<project_slug>.json",
          "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<project_slug>.md",
          "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<project_slug>.json"
        ],
        "requirements": [
          "Use the active main-process repository",
          "Initialize only minimal planning directories",
          "Write all four files through the canonical artifact transaction",
          "Preserve Approved Project Intake and Approved non-review prompt dispositions",
          "Refresh from the same repository after success",
          "Display Project Intake in Project Intake Capture and the prompt in Architect Interview"
        ]
      }
    ],
    "authorizedFiles": [
      "src/main/main.ts",
      "src/main/workspaceSettings.ts",
      "src/main/documents/planningDocumentService.ts",
      "src/main/documents/firstNonApprovedResolver.ts",
      "src/main/currentWorkflow/currentWorkflowService.ts",
      "src/main/projectIntake/projectIntakeService.ts",
      "src/preload/index.ts",
      "src/renderer/app/App.tsx",
      "src/shared/workspaceContracts.ts",
      "src/shared/workspaces/documentWorkspace.ts",
      "test/app-shell/app-shell.test.cjs",
      "test/project-intake/project-intake-service.test.cjs",
      "test/workspaces/workspace-document-review.test.cjs",
      "A new narrowly scoped Project Intake integration test or fixture"
    ],
    "nonGoals": [
      "Architect Interview repair",
      "Later Project, Phase, Work Card, validation, repair, or closeout workspace repair",
      "Workflow header or dark-theme redesign",
      "Full classifier redesign",
      "Hidden workflow state, database, or activity ledger",
      "New dependencies",
      "Pre-Phase 07 compatibility",
      "Git mutation"
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test",
      "Non-acceptance launch smoke for empty repository selection, clean repository switching, Project Intake form rendering, and submission without renderer crash",
      "Operator-controlled functional validation after Architect review"
    ],
    "acceptanceCriteria": [
      "One persisted main-process repository controls all Project Intake reads and writes",
      "Renderer paths cannot control the write root",
      "An empty writable repository can be selected without planning/",
      "Selection does not create planning/",
      "Zero documents project Project Intake Capture rather than Project Close",
      "Repository switching removes all prior-repository documents",
      "Selected workspace and Project Repository display the same root",
      "Project Intake Capture contains only canonical Project Intake documents",
      "Filename substring matches do not misclassify unrelated records",
      "The full confirmed questionnaire and conditional field are present",
      "Submit creates the exact four required files in the active repository",
      "The four-file write is atomic and contained",
      "Successful submission refreshes from the same repository",
      "The new Project Intake and prompt appear in their correct workspaces",
      "Typecheck, build, and tests pass",
      "No unrelated workspace change, dependency, prohibited architecture, or Git mutation is introduced"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC17_project_intake_repository_selection_and_canonical_workspace_repair.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC17 Project Intake Repository Selection and Canonical Workspace Repair

Status: approved by Operator
Owner: Implementer
Phase: phase-08
Risk: high
Depends on: current Phase 08 application shell and Project Intake implementation
Execution authorization: this Approved Work Card is the Implementer instruction
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC17_project_intake_repository_selection_and_canonical_workspace_repair.md`

## Purpose

Repair only the Project Intake vertical workflow so the application can select a new or existing repository, display only that repository's Project Intake evidence, capture the approved intake questionnaire, and create the canonical Project Intake and Architect Interview Prompt pairs in that same repository.

This card does not authorize repairs to any later Project, Phase, or Work Card workspace.

## Defect Evidence

The Operator observed:

1. a newly selected repository is rejected when it does not already contain `planning/`;
2. documents from the previously selected ChampCity AI repository remain visible after the attempted repository change;
3. unrelated Implementer Reports, Work Cards, and design documents appear in Project Intake because their filenames contain `project_intake`;
4. the running Submit Project Intake path has not been proven to write and then display the required file pairs in the active selected repository;
5. the visible questionnaire has not been validated against the confirmed Project Intake question contract.

Architect source review confirmed:

- `src/main/workspaceSettings.ts` currently rejects any repository that lacks `planning/`;
- `src/main/main.ts` maintains a persisted application workspace and a separate transient `selectedProjectRepositoryRoot`;
- `documents:list`, document reads, resolver calls, browser calls, and current-workflow calls use the persisted application workspace, while Project Intake submission uses the separate transient repository root;
- failed workspace selection leaves the prior persisted repository active, after which document refresh reloads the prior repository's documents;
- `src/shared/workspaces/documentWorkspace.ts` uses `/project[_ -]?intake/i` across paths and filenames, causing unrelated records to be classified as Project Intake;
- `submitProjectIntake()` can initialize an empty repository and write the Project Intake and Architect Interview Prompt pairs, but the application does not activate and refresh from that repository as one integrated workflow;
- the confirmed question contract is `planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md`.

## Required Outcome

```text
Select any existing writable repository
→ that repository becomes the single active application repository
→ missing planning/ is treated as a valid pre-intake condition
→ documents from the previous repository are cleared
→ Project Intake shows only canonical Project Intake artifacts from the active repository
→ the full approved intake questionnaire is displayed
→ Submit writes the Project Intake and Architect Interview Prompt pairs atomically
→ the application refreshes from the same active repository
→ the new Project Intake appears in Project Intake Capture
→ the new prompt appears in Architect Interview
```

## Required Repair 1 — One Active Repository Selection

Replace the split repository-selection model with one main-process-owned active repository selection.

Requirements:

1. The application has one persisted active repository root.
2. The top-level `Choose Workspace` action and the Project Intake repository selector use the same main-process selection operation and update the same persisted root.
3. Any existing readable and writable directory may be selected even when `planning/` does not exist.
4. Repository selection validates that the selected path exists, is a directory, and is readable and writable.
5. Repository selection does not create `planning/` merely by selecting the directory.
6. A canceled selection leaves the current active repository unchanged.
7. A failed selection leaves the current active repository unchanged and reports the failure separately; the selected-workspace display must continue to show the repository that actually remains active.
8. The active repository persists across application restart.
9. Remove the transient `selectedProjectRepositoryRoot` authority from `src/main/main.ts`.
10. The renderer must not submit a repository path as write authority.

The main process must supply the active repository root to Project Intake submission. The submitted intake answers must not control the write root.

## Required Repair 2 — Valid Empty-Repository State

A selected repository without `planning/` is a valid Project Intake state.

Requirements:

1. Document listing against an active repository with no `planning/` returns an empty document collection rather than rejecting the repository.
2. Document read, disposition, resolver, and later-workspace actions may fail locally when their required planning evidence is absent, but repository selection itself remains valid.
3. An empty repository or a repository with no canonical Project Intake must project Project Intake Capture as the applicable starting workspace.
4. Zero planning documents must not be interpreted as `all-approved` or Project Close.
5. The Project Intake form remains usable before `planning/` exists.
6. No planning directory is created until the Operator submits Project Intake.

Limit resolver changes to the minimum needed to represent the pre-intake state. Do not redesign the full lifecycle resolver under this card.

## Required Repair 3 — Repository Switching and Stale-State Clearing

After a successful repository change, the renderer must immediately stop displaying data from the prior repository.

Requirements:

1. Clear the selected document, document preview, document error, feedback, resolver result, current workspace model, and repository-derived document counts before loading the new repository.
2. Reload documents, current projection, and workspace counts only from the newly persisted active repository.
3. The selected-workspace panel and Project Repository field must display the same active repository.
4. No document from repository A may remain visible after repository B is successfully selected.
5. A repository with no planning records displays an honest empty Project Intake state rather than stale records.
6. Project Intake submission success refreshes from the repository that received the new artifacts.

## Required Repair 4 — Canonical Project Intake Classification

Project Intake Capture must show only canonical Project Intake artifacts.

Required ownership:

```text
artifactType=project-intake
or canonical Markdown-only fallback under planning/project/Project_Intake/
→ project-intake-capture
```

Requirements:

1. Prefer canonical `artifactType` metadata when available.
2. Permit a narrowly bounded canonical-path fallback for Markdown-only or incomplete pairs under `planning/project/Project_Intake/`.
3. Remove filename substring matching as Project Intake ownership authority.
4. The following must not classify into Project Intake merely because their names contain `project_intake`:
   - Implementer Reports;
   - Work Cards;
   - Architect Reviews;
   - design documents;
   - handoffs;
   - general reports or context records.
5. The Architect Interview Prompt belongs to Architect Interview, not Project Intake Capture.
6. Project Intake Capture should display only the durable Project Intake logical document pair for the selected repository.
7. Update workspace document counts from the same corrected classification.

Do not redesign every workspace classifier under this card. Change shared classification only as required to make Project Intake metadata-first and exclusive without regressing existing categories.

## Required Repair 5 — Approved Project Intake Questionnaire

The Project Intake form must implement the confirmed fixed question contract from:

`planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md`

Required visible questions:

1. `Project Name`
2. `Project Purpose — What are you trying to create, change, or accomplish?`
3. `Desired Outcome — What should the finished project allow the user or Operator to do?`
4. `Project Type`
5. `Project Repository`
6. `Does this repository already contain source code or project-planning documents?`
7. `Known Constraints or Non-Negotiables`
8. When question 6 is Yes: `What should the Architect know before reviewing the existing repository?`

Requirements:

- questions 1 through 6 are required;
- question 7 is optional;
- question 8 is optional and displayed only when question 6 is Yes;
- Project Repository is read-only display of the active main-process-selected repository;
- the form may provide a Choose action, but it must invoke the shared active-repository selector;
- preserve the approved Project Type values;
- retain entered answers after a recoverable submission error;
- use the full approved explanatory wording rather than abbreviated labels where the design document provides it.

## Required Repair 6 — Integrated Submit Project Intake Path

The running application must create and then display the required artifacts in the active repository.

On successful submission, create atomically:

```text
planning/project/Project_Intake/PROJECT_INTAKE_<project_slug>.md
planning/project/Project_Intake/PROJECT_INTAKE_<project_slug>.json
planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<project_slug>.md
planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<project_slug>.json
```

Requirements:

1. Use the active main-process-selected repository root.
2. Initialize only the minimal required planning directories.
3. Keep concrete local repository paths redacted from durable artifacts where the current contract requires `<PROJECT_REPO>`.
4. Preserve the Project Intake pair as Operator-authored and Approved on successful submission.
5. Preserve the Architect Interview Prompt pair as an Approved non-review handoff.
6. Include the exact Project Intake source revision and exact Architect Interview output targets in the prompt pair.
7. When existing source or planning is Yes, require Architect repository review in the prompt; the optional context note may be blank.
8. Use the canonical artifact transaction for all four files.
9. Do not report success until all four files exist with expected bytes and synchronized dispositions.
10. After success, refresh documents from the same active repository.
11. Display the new Project Intake in Project Intake Capture.
12. Make the new Architect Interview Prompt available in Architect Interview.
13. Do not create Phase planning or Work Card records.

## Required Repair 7 — Bounded Regression Tests

Replace tests that codify the current defect and add tests for the corrected Project Intake path.

Required automated checks:

1. A readable and writable empty directory is accepted and persisted as the active repository.
2. Selecting a repository does not create `planning/`.
3. Missing `planning/` returns an empty document list or explicit pre-intake projection without Project Close.
4. Switching from repository A to repository B clears repository A documents and loads only repository B documents.
5. Project Intake classification includes a canonical Project Intake pair.
6. Project Intake classification excludes an Implementer Report, Work Card, and design document whose names contain `project_intake`.
7. The renderer cannot submit a path that controls the Project Intake write root.
8. Submission against the active empty repository creates exactly the four required files and minimal directories.
9. Submission refreshes and classifies the Project Intake and Architect Interview Prompt into their correct workspaces.
10. Existing-repository Yes with an empty optional context note remains valid.
11. Invalid Project Type fails before writing files.
12. Active repository selection reloads after restart.

Do not add source-string tests as acceptance evidence for this workflow. Direct service tests may remain as supporting evidence.

No Playwright or new test dependency is authorized.

## Authorized Files

Changes are limited to files directly required for this Project Intake repair, expected to include:

```text
src/main/main.ts
src/main/workspaceSettings.ts
src/main/documents/planningDocumentService.ts
src/main/documents/firstNonApprovedResolver.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/projectIntake/projectIntakeService.ts
src/preload/index.ts
src/renderer/app/App.tsx
src/shared/workspaceContracts.ts
src/shared/workspaces/documentWorkspace.ts
test/app-shell/app-shell.test.cjs
test/project-intake/project-intake-service.test.cjs
test/workspaces/workspace-document-review.test.cjs
```

A new narrowly scoped Project Intake integration test or test fixture is authorized.

Do not modify unrelated Phase, Work Card, browser, MCP, closeout, repair, or validation services.

## Explicit Non-Goals

Do not:

- repair Architect Interview behavior;
- repair Project Planning, Phase, Work Card, validation, repair, or closeout workspaces;
- redesign the workflow header or dark theme;
- redesign the entire document classifier;
- implement new hidden workflow state;
- add a database or activity ledger;
- add dependencies;
- restore pre–Phase 07 compatibility;
- modify Phase 08 historical reviews;
- create an Implementer handoff during this draft pass;
- perform Git operations.

## Validation

Run the normal Windows lane:

```text
npm run typecheck
npm run build
npm test
```

Perform a non-acceptance application launch smoke confirming only that:

- the app launches;
- an empty repository can be selected;
- the Project Intake form renders;
- no stale documents appear after repository switching;
- submission can be attempted without a renderer crash.

Automated checks and launch smoke do not replace Operator validation.

## Acceptance Criteria

WC17 is acceptable for Operator validation only when:

1. one persisted main-process-owned repository selection controls all Project Intake reads and writes;
2. the renderer cannot choose the write root by submitting a path;
3. an empty readable/writable repository can be selected without `planning/`;
4. selecting an empty repository does not create `planning/`;
5. zero documents project Project Intake Capture rather than Project Close;
6. successful repository switching removes all prior-repository documents from the UI;
7. the selected-workspace panel and Project Repository field show the same active repository;
8. Project Intake Capture contains only canonical Project Intake logical documents;
9. filename substring matches do not pull unrelated reports, Work Cards, or design documents into Project Intake;
10. the full confirmed intake questionnaire and conditional question are visible with correct required/optional behavior;
11. Submit creates the exact Project Intake and Architect Interview Prompt Markdown/JSON pairs in the active repository;
12. the four-file write is atomic and repository-contained;
13. successful submission refreshes from the same repository;
14. the new Project Intake appears in Project Intake Capture;
15. the new prompt appears in Architect Interview;
16. typecheck, build, and all tests pass;
17. no unrelated workspace behavior, dependency, prohibited architecture, or Git mutation is introduced;
18. the Implementer Report accurately identifies remaining Operator validation.

## Implementer Report Requirements

Create:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC17_project_intake_repository_selection_and_canonical_workspace_repair.md`

The report must include:

- repository, branch, remote, and starting dirty-tree inventory;
- exact files retained, modified, created, and deleted;
- final single-repository-selection architecture;
- removed split-root behavior;
- empty-repository behavior;
- repository-switch state-clearing behavior;
- final Project Intake classification rule;
- final questionnaire field list and labels;
- exact output paths and transaction result;
- automated test inventory and results;
- launch-smoke result;
- remaining Operator validation;
- final repository status;
- confirmation that no Git operation occurred.

The report must end with:

```markdown
## Manual Validation After Architect Review

The Operator will perform the controlling validation after Architect review.

Required human checks will include:

1. select a new empty repository;
2. confirm the selected path is displayed and no `planning/` directory is created yet;
3. confirm no ChampCity AI documents remain visible;
4. review the complete Project Intake questionnaire;
5. submit a bounded test intake;
6. confirm the four expected files exist in the selected repository;
7. confirm Project Intake displays only the new Project Intake logical document;
8. confirm Architect Interview displays the generated prompt;
9. restart the application and confirm the selected repository persists;
10. select another repository and confirm the first repository's documents disappear.
