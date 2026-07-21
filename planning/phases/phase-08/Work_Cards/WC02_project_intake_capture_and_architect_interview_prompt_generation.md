# Work Card — Phase 08 WC02 Project Intake Capture and Architect Interview Prompt Generation

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium
Depends on: WC01
Execution authorization: withheld until the Phase 08 Work Card sequence is complete
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC02_project_intake_capture_and_architect_interview_prompt_generation.md`

## Purpose

Implement the first complete Project / Intake workspace: a small fixed Operator questionnaire that writes the durable Project Intake artifact and generates the repository-backed Architect Interview Prompt.

This Work Card implements intake capture and prompt generation only. It does not implement the embedded Architect browser, live interview, interview-document review, lifecycle advancement, or Project Planning.

## Execution Boundary

This Work Card is approved as the second planned Phase 08 implementation unit, but it is not currently authorized for execution.

Do not execute it until:

1. WC01 has been implemented and accepted;
2. the Operator explicitly releases the Phase 08 sequence; and
3. WC02 is the active released card.

## Source Design Decision

Read and follow:

- `planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`
- `planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md`

The implemented lifecycle location is:

```text
Project / Intake
└── Project Intake Capture
```

## Required Workspace Registration

Add one visible workspace definition to the WC01 registry:

```text
id: project-intake-capture
label: Project Intake Capture
location: Project / Intake
```

Its order must place it before the later Architect Interview workspace at the same lifecycle location.

Do not hard-code this workspace outside the shared registry.

## Required Intake Form

The workspace must present exactly these standard fields:

| Field | Control | Required |
|---|---|---:|
| Project Name | Short text | Yes |
| Project Purpose | Long text | Yes |
| Desired Outcome | Long text | Yes |
| Project Type | Dropdown | Yes |
| Project Repository | Repository or folder selector | Yes |
| Existing source code or project-planning documents in repository | Yes/No | Yes |
| Known Constraints or Non-Negotiables | Long text | No |

Project Type values:

```text
Desktop application
Web application
Mobile application
CLI or tool
Library or service
Documentation or process
Other
```

When the existing-project answer is Yes, show this additional optional field:

> What should the Architect know before reviewing the existing repository?

The conditional field must be absent or disabled when the answer is No.

## Repository Selection Boundary

Repository selection must use an Electron main/preload-mediated folder selection flow. The renderer must not receive arbitrary filesystem authority.

The selected location must be normalized and displayed to the Operator. The application must reject a missing or inaccessible selection with a local actionable error.

Do not execute Git commands, infer branch authority, modify repository contents outside the approved artifact writes, or perform repository reconciliation in WC02.

## Durable Artifact Outputs

On successful submission, write synchronized Markdown/JSON pairs using the established project artifact naming conventions:

```text
planning/project/Project_Intake/PROJECT_INTAKE_<project-slug>.md
planning/project/Project_Intake/PROJECT_INTAKE_<project-slug>.json

planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<project-slug>.md
planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<project-slug>.json
```

The project slug must be deterministic, filesystem-safe, and identical across both artifact pairs.

The Project Intake pair must contain the submitted values without inventing missing answers.

The prompt pair must be generated deterministically from the intake data and must instruct the Architect to conduct a project interview that produces the durable Project Architect Interview document required by WC04.

## Reconciliation Prompt Behavior

When the existing-project answer is No, the prompt must describe a greenfield interview.

When the answer is Yes, the prompt must require the Architect to:

- inspect the selected repository through ChampCity MCP before finalizing the interview document;
- identify current source code and planning-document state;
- distinguish verified repository facts from Operator statements and Architect recommendations;
- use repository-relative paths for material findings where practical;
- ensure later `Project_Profile` and `Project_Roadmap` outputs begin from the verified current state rather than a greenfield assumption.

The optional Operator reconciliation note must be included as context, not treated as verified repository fact.

Do not generate a standalone reconciliation artifact by default.

## Disposition Behavior

Project Intake Capture is direct Operator-authored capture, not a separate review loop.

Successful submission must produce usable handoff artifacts without adding another Operator approval screen. The generated artifacts must use explicit valid document dispositions compatible with the clean-room document parser and must not create an unresolved prompt-only gate.

The Implementer must document the selected disposition treatment and prove that it does not cause the first-non-approved resolver to trap the application on a generated prompt that has no review surface.

Do not add a new disposition value or hidden completion flag.

## Save and Error Behavior

Artifact writes must:

- use the existing safe main-process write boundary;
- preserve synchronized Markdown/JSON pairs;
- prevent partial pair creation or leave a recoverable local error if rollback is required;
- avoid changing unrelated planning documents;
- show the exact repo-relative output paths after success;
- allow the Operator to reopen and edit the captured intake before the later interview is approved.

Editing an existing intake must regenerate the Architect Interview Prompt from the current saved values. It must not silently preserve stale generated prompt content.

## Authorized Production Scope

Expected production files may include:

```text
src/shared/projectIntake/projectIntake.ts
src/main/projectIntake/projectIntakeArtifactService.ts
src/main/projectIntake/architectInterviewPromptService.ts
src/shared/workspaces/workspaceRegistry.ts
src/preload/index.ts
src/renderer/app/App.tsx
src/renderer/styles.css
```

A narrower implementation is acceptable. Any additional production file must be directly required by the intake form, safe repository selection, artifact serialization, or prompt generation and must be identified in the Implementer Report.

## Authorized Test Scope

Add or extend capability-oriented tests for:

- fixed field definitions and required validation;
- conditional reconciliation field behavior;
- deterministic project slugging;
- Markdown/JSON synchronization;
- greenfield prompt generation;
- reconciliation prompt generation;
- safe overwrite/regeneration behavior;
- local write failures without partial pair corruption;
- registry placement of Project Intake Capture.

Expected test files may include:

```text
test/project-intake/project-intake-capture.test.cjs
test/documents/planning-document-service.test.cjs
test/workspaces/workspace-document-review.test.cjs
test/app-shell/app-shell.test.cjs
```

Do not create a broad Phase-08-specific test island.

## Explicit Non-Goals

Do not implement:

- embedded browser hosting;
- ChatGPT, Claude, or other provider automation;
- MCP prompt attachment or browser handoff;
- live Architect interview behavior;
- Architect Interview document preview or disposition;
- Project Planning prompt generation;
- `Project_Profile` or `Project_Roadmap` generation;
- lifecycle transition, current lifecycle state, or automatic navigation;
- repository scanning or reconciliation execution;
- a separate reconciliation workspace or default reconciliation artifact;
- provider SDKs, API keys, databases, cloud services, or new dependencies;
- Git operations.

## Required Validation

When execution is authorized, run:

```text
npm run typecheck
npm run build
npm test
```

No Playwright is authorized.

A non-acceptance launch smoke may be used to confirm the form renders and the conditional field toggles. Do not modify real project artifacts during smoke testing; use a controlled temporary workspace.

## Acceptance Criteria

WC02 is acceptable only when:

1. `Project Intake Capture` is registry-backed at Project / Intake;
2. all seven standard fields use the approved labels, controls, and required status;
3. the conditional reconciliation note appears only when the existing-project answer is Yes;
4. repository selection is main/preload mediated and renderer filesystem authority is not broadened;
5. form validation blocks incomplete required submissions with local field-level errors;
6. submission writes synchronized Project Intake Markdown/JSON artifacts at the established paths;
7. submission writes synchronized Architect Interview Prompt Markdown/JSON artifacts at the established paths;
8. project slugging and prompt generation are deterministic;
9. a No answer generates a greenfield interview prompt;
10. a Yes answer generates a required repository-review prompt with the approved reconciliation boundaries;
11. editing intake regenerates the prompt and does not leave stale prompt content;
12. pair-write failures do not leave silent partial success;
13. generated artifacts use valid explicit dispositions without creating an unreviewable resolver gate;
14. no browser, MCP handoff, interview-review, Project Planning, lifecycle transition, or Git behavior is introduced;
15. typecheck, build, and tests pass;
16. the Implementer Report accurately records changed files, output examples, validation evidence, and remaining manual validation.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- final intake field contract;
- final artifact paths and slug rule;
- example greenfield and reconciliation prompt structure without fabricating runtime results;
- disposition treatment and resolver evidence;
- safe write and regeneration evidence;
- validation commands and results;
- confirmation that no browser, MCP handoff, lifecycle transition, dependency, or Git scope was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator should validate only:

1. the fixed form is understandable and complete;
2. the reconciliation note appears and disappears correctly;
3. a controlled test intake writes the expected two artifact pairs;
4. the generated prompt accurately reflects the submitted answers;
5. editing and resaving the intake refreshes the prompt.

## Document Disposition

Document.Status=Approved
