# MVP Scope

## Product Thesis

Non-technical users can usually identify what is wrong, but they often cannot describe the issue in a form an AI Builder will interpret correctly. The product acts as the translation layer: the user supplies behavior and evidence, and the application creates structure.

## MVP Scope

- Project setup with basic project memory.
- New Work Card form.
- Architect framing action.
- Work Card review screen.
- Risk router.
- Builder prompt generator.
- Optional no-edit plan capture.
- Build report capture.
- Human validation screen.
- Repair-card generation.
- Closeout and project-memory update.
- File-backed Markdown persistence.

## MVP Non-Goals

- Full multi-project dashboard.
- Advanced role permissions.
- MCP or connector integrations.
- Skills marketplace.
- Automated code execution without approval.
- Full v14-style handoff artifact management.
- Complex phase archive UI.
- Production deployment pipeline.

Git/GitHub source-control hygiene is in scope for the MVP foundation; production deployment automation is not.

## Core Screens

- Project Setup.
- New Work Card.
- Work Card Review.
- Builder Plan Review.
- Builder Report.
- Human Validation.
- Repair / Close.
- Work Card Index.

## Core Entities

- Project.
- ProjectMemory.
- WorkCard.
- AcceptanceCriterion.
- EvidenceItem.
- BuilderPlan.
- BuilderRun.
- ValidationRecord.
- RepairRecord.
- Decision.
- Risk.
- Phase.

## Core Services

- RiskRouter.
- WorkCardFramer.
- PromptComposer.
- ArtifactWriter.
- BuilderReportIngestor.
- ValidationChecklistGenerator.
- RepairTriageService.
- ProjectMemoryUpdater.

## MVP Milestones

- `v0.1.0-foundation`: project memory, planning scaffold, Electron + TypeScript shell, and design document updates.
- `v0.2.0-work-card-schema`: Work Card schema, Markdown renderer, and file path rules.
- `v0.3.0-capture-frame-review`: capture form, framing workflow, save, and review.
- `v0.4.0-builder-prompt-flow`: risk router, Builder prompt generator, and plan capture.
- `v0.5.0-validation-repair-closeout`: Builder report capture, validation, repair, closeout, and project-memory update.
- `v1.0.0-mvp`: complete MVP done definition.

## Done Definition

The MVP is done when a non-technical user can report a bug, review the framed Work Card, approve the plan or direct build, paste Builder result, validate the result, repair if needed, and close the card.

## Approved Technical Implementation Decisions

- Language: TypeScript.
- Target surface: Electron desktop application.
- Package manager: npm.
- Persistence: direct Markdown file writes into the project repository.
- Primary Work Card path: `planning/work/[slug]/WORK_CARD.md`.
- Evidence path: `planning/work/[slug]/evidence/`.
- Git policy: initialize Git if absent, use commits for meaningful work checkpoints, and use tags for MVP release milestones.
- GitHub policy: use GitHub for remote commits and release tags when a remote is configured and credentials are available; do not print or request credentials.
- LLM strategy: manual copy/paste for Architect framing and Builder prompt workflows in MVP.
- MVP integration limit: MCP, connector, and external automation integrations remain non-goals.
- Deployment limit: production deployment pipeline remains a non-goal.
