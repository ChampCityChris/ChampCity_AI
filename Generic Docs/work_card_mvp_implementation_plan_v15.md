# Work Card MVP Implementation Plan — v15

## Recommendation

Build the **Work Card MVP** next.

The goal is not to build the full scaffold-management application first. The goal is to prove the smallest useful loop:

```text
Capture → Frame → Plan → Build → Prove
```

The first software release should help a non-technical user submit a bug or feature, turn that request into a Work Card, generate a bounded Builder prompt, capture the Builder result, guide human validation, and either close or repair the Work Card.

## Product thesis

Non-technical users can usually identify what is wrong, but they often cannot describe the issue in a form an AI Builder will interpret correctly. The product should act as the translation layer.

The user supplies behavior and evidence. The application creates structure.

## MVP scope

The MVP should include:

1. Project setup with basic project memory.
2. New Work Card form.
3. Architect framing action.
4. Work Card review screen.
5. Risk router.
6. Builder prompt generator.
7. Optional no-edit plan capture.
8. Build report capture.
9. Human validation screen.
10. Repair-card generation.
11. Closeout and project-memory update.
12. File-backed Markdown persistence.

## MVP non-goals

Do not build these first:

- Full multi-project dashboard.
- Advanced role permissions.
- MCP or connector integrations.
- Skills marketplace.
- Automated code execution without approval.
- Full v14-style handoff artifact management.
- Complex phase archive UI.
- Production deployment pipeline.

Git/GitHub source-control hygiene is in scope for the MVP foundation; production deployment automation is not.

## Approved technical implementation decisions

The MVP will be implemented with the following approved technical decisions:

- **Language:** TypeScript.
- **Target surface:** Electron desktop application.
- **Package manager:** npm.
- **Persistence:** direct Markdown file writes into the project repository.
- **Primary Work Card path:** `planning/work/[slug]/WORK_CARD.md`.
- **Evidence path:** `planning/work/[slug]/evidence/`.
- **Git policy:** initialize Git if absent, use commits for meaningful work checkpoints, and use tags for MVP release milestones.
- **GitHub policy:** use GitHub for remote commits and release tags when a remote is configured and credentials are available. Do not print or request credentials. If no remote is configured, record the required remote decision as an open question.
- **LLM strategy:** MVP uses manual copy/paste for Architect framing and Builder prompt workflows. The codebase may include provider-neutral hooks/interfaces for future LLM API integration, but no live LLM API calls, provider-specific SDKs, or API keys are required for MVP.
- **Initial scaffold authorization:** the foundation pass may create `AGENTS.md`, `README.md`, `planning/`, source directories, package/tooling files, `.gitignore`, `.env.example`, and a minimal runnable Electron shell.
- **MVP integration limit:** MCP, connector, and external automation integrations remain non-goals for MVP.
- **Deployment limit:** production deployment pipeline remains a non-goal for MVP.

## Recommended architecture

Start with a simple Electron + TypeScript application with file-backed Markdown persistence so the workflow remains visible and easy to debug.

The Electron renderer should own user interaction. The Electron main process should own filesystem access. The renderer must not receive unrestricted Node filesystem access.

Recommended implementation structure:

```text
src/
  main/
    main.ts
    ipc/
      workCardIpc.ts
      projectIpc.ts
    storage/
      fileStore.ts
      artifactWriter.ts
  preload/
    index.ts
  renderer/
    index.html
    renderer.ts
    styles.css
    screens/
      ProjectSetup/
      NewWorkCard/
      WorkCardReview/
      PlanReview/
      BuilderReport/
      HumanValidation/
      RepairOrClose/
      WorkCardIndex/
  shared/
    models/
      Project.ts
      WorkCard.ts
      Phase.ts
      Evidence.ts
      Validation.ts
    services/
      riskRouter.ts
      workCardFramer.ts
      promptComposer.ts
      builderReportIngestor.ts
      validationCapture.ts
      repairTriage.ts
      projectMemoryUpdater.ts
    llm/
      LlmProvider.ts
      ManualCopyPasteProvider.ts
      FutureApiProvider.ts
    markdown/
      workCardMarkdown.ts
      markdownParser.ts
planning/
  project/
  work/
  phases/
```

The application can later swap file-backed storage for a database, but Markdown files should remain exportable.

Filesystem writes must be constrained to approved project-planning paths, especially:

```text
planning/work/[slug]/WORK_CARD.md
planning/work/[slug]/evidence/
planning/project/
planning/phases/
```

The MVP should not require a live LLM API. Prompt composition and response capture may be manual copy/paste first. Provider-neutral LLM interfaces may exist so future API integration can be added without rewriting the workflow.

## Core data model

Use a schema close to this shape:

```ts
type RiskTier = "Quick Fix" | "Standard Change" | "High Risk";
type WorkStatus =
  | "Open"
  | "Framed"
  | "Planned"
  | "Approved"
  | "Built"
  | "Proving"
  | "Repairing"
  | "Closed"
  | "Cancelled";

type WorkType =
  | "Bug"
  | "Feature"
  | "Refactor"
  | "Setup"
  | "Research"
  | "Documentation"
  | "Phase";

interface WorkCard {
  id: string;
  slug: string;
  title: string;
  status: WorkStatus;
  workType: WorkType;
  riskTier: RiskTier;
  userReport: string;
  plainLanguageSummary: string;
  scope: string[];
  outOfScope: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  validationChecklist: ValidationCheck[];
  evidence: EvidenceItem[];
  builderPlan?: BuilderPlan;
  planApproval?: PlanApproval;
  buildReports: BuilderReport[];
  humanValidation?: ValidationRecord;
  repairRecords: RepairRecord[];
  decisions: Decision[];
  risks: Risk[];
  learningUpdates: LearningUpdate[];
  closeout?: CloseoutRecord;
  createdAt: string;
  updatedAt: string;
}
```

## First coding milestone

Milestone 1 should be: **Create, frame, save, and review a Work Card.**

Acceptance criteria:

- A user can submit a bug or feature in plain language.
- The app creates a structured Work Card draft.
- The app assigns work type and risk tier.
- The app creates observable acceptance criteria.
- The app creates a validation checklist.
- The user can approve or edit the framed Work Card.
- The Work Card is saved as Markdown at `planning/work/[slug]/WORK_CARD.md`.
- Evidence files or evidence notes can be attached to the Work Card folder.

## Second coding milestone

Milestone 2 should be: **Generate a Builder plan or build prompt.**

Acceptance criteria:

- Quick Fix cards can generate a direct build prompt.
- Standard Change and High Risk cards generate a no-edit Builder plan prompt.
- The generated prompt includes project memory, scope, out-of-scope rules, acceptance criteria, validation limits, and final-report requirements.
- The app records whether the plan was skipped, required, approved, rejected, or split.
- The user can approve the plan without seeing legacy prompt IDs.

## Third coding milestone

Milestone 3 should be: **Capture Builder output and guide validation.**

Acceptance criteria:

- A Builder report can be pasted or imported.
- The app extracts files changed, summary, checks run, checks skipped, manual validation, and residual risks.
- The app updates the Work Card Build Report section.
- The app creates a user-friendly validation checklist from acceptance criteria.
- The user can mark each criterion Passed, Failed, Unclear, or Deferred.

## Fourth coding milestone

Milestone 4 should be: **Repair or close.**

Acceptance criteria:

- Failed validation creates a narrow repair objective.
- Repair prompts are scoped to failed acceptance criteria.
- Passed validation closes the Work Card.
- Durable learnings can be promoted to project memory.
- One-off notes are not promoted to AGENTS.md.
- The app recommends the next Work Card or phase.

## Release and source-control policy

Use Git for local history and GitHub for remote source control when available.

Recommended MVP tags:

- `v0.1.0-foundation` — project memory, planning scaffold, Electron + TypeScript shell, and design document updates.
- `v0.2.0-work-card-schema` — Work Card schema, Markdown renderer, and file path rules.
- `v0.3.0-capture-frame-review` — capture form, framing workflow, save, and review.
- `v0.4.0-builder-prompt-flow` — risk router, Builder prompt generator, and plan capture.
- `v0.5.0-validation-repair-closeout` — Builder report capture, validation, repair, closeout, and project-memory update.
- `v1.0.0-mvp` — complete MVP done definition.

Do not push to GitHub or create remote releases unless a remote is configured and the operator has authorized the operation. Do not print credentials.

## Initial Work Cards for building the application

Use these as the first development backlog.

### Work Card 1 — Define Work Card schema and Markdown renderer

Scope:

- Define WorkCard model.
- Define Markdown serialization.
- Define Markdown parsing or import behavior if needed.
- Define file path rules.

Acceptance criteria:

- A WorkCard object can be saved as `WORK_CARD.md`.
- Saved Markdown includes all required sections.
- Missing optional sections render clearly as empty or not started.

### Work Card 2 — Build New Work Card capture form

Scope:

- Bug capture fields.
- Feature capture fields.
- Evidence notes.
- Severity or priority field.

Acceptance criteria:

- User can submit a bug without knowing code details.
- User can attach or describe evidence.
- App stores raw user report.

### Work Card 3 — Add Architect framing prompt composer

Scope:

- Compose Action 6 prompt from user capture and project memory.
- Store returned structured Work Card.
- Allow user review.

Acceptance criteria:

- Prompt includes scope, out-of-scope, acceptance criteria, risk tier, and validation checklist requirements.
- User can approve or revise framed card.

### Work Card 4 — Add risk router

Scope:

- Quick Fix, Standard Change, High Risk classification.
- Planning requirement decision.
- Escalation rules.

Acceptance criteria:

- Auth, payments, data deletion, migrations, secrets, production, and compliance are classified High Risk.
- Small copy or cosmetic updates can be classified Quick Fix.
- Standard behavior changes require a plan.

### Work Card 5 — Generate Builder prompt

Scope:

- Direct build prompt for Quick Fix.
- No-edit plan prompt for Standard and High Risk.
- Approved implementation prompt after plan approval.

Acceptance criteria:

- Prompt includes AGENTS.md/project memory reference.
- Prompt includes Work Card scope and out-of-scope rules.
- Prompt includes final report requirements.

### Work Card 6 — Capture Builder report

Scope:

- Paste/import Builder report.
- Extract changed files, summary, checks, skipped checks, manual validation, residual risks.
- Update Work Card.

Acceptance criteria:

- Builder report is no longer trapped in chat.
- User gets a plain-language validation checklist.

### Work Card 7 — Human validation and repair loop

Scope:

- Validation UI.
- Passed/Failed/Unclear/Deferred status.
- Repair triage prompt generator.

Acceptance criteria:

- Failed validation creates a narrow repair objective.
- User is asked for evidence, not code diagnosis.
- Passed validation can close the Work Card.

## Validation strategy for the MVP

Use layered validation:

- Unit-test schema and serialization.
- Test prompt composition with fixed example cards.
- Test risk-router examples.
- Manually validate end-to-end flow with one bug and one feature.
- Confirm Markdown files are readable outside the app.
- Confirm no secrets are written to Work Cards or AGENTS.md.

## Done definition for MVP

The MVP is done when a non-technical user can complete this without knowing prompt IDs:

```text
Report a bug.
Review the framed Work Card.
Approve the plan or direct build.
Paste Builder result.
Validate the result.
Repair if needed.
Close the card.
```
