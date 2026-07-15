<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/supporting_document/MVP_SCOPE",
  "artifactType": "supporting_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/MVP_SCOPE.json",
  "markdownPath": "planning/project/MVP_SCOPE.md",
  "payload": {
    "kind": "supporting_document",
    "title": "Historical MVP Scope"
  },
  "payloadHash": "sha256:3c38e1b274070a75b1709d62db561ba32586ab1320ed3ad5b2891cfde23438d2",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 3,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Historical MVP Scope

This file is retained as a historical MVP scope record. The MVP foundation is complete; active work is now Alpha app development. See `planning/project/PROJECT_STATE.md` for current state.

## Product Thesis

Non-technical users can usually identify what is wrong, but they often cannot describe the issue in a form an AI Implementer will interpret correctly. The product acts as the translation layer: the user supplies behavior and evidence, and the application creates structure.

## MVP Scope

- Project setup with basic project memory.
- New Work Card form.
- Architect framing action.
- Work Card review screen.
- Risk router.
- Implementer execution packet generator.
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
- Implementer Plan Review.
- Implementer Report.
- Human Validation.
- Repair / Close.
- Work Card Index.

## Core Entities

- Project.
- ProjectMemory.
- WorkCard.
- AcceptanceCriterion.
- EvidenceItem.
- ImplementerPlan.
- ImplementerRun.
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
- ImplementerReportIngestor.
- ValidationChecklistGenerator.
- RepairTriageService.
- ProjectMemoryUpdater.

## MVP Milestones

- `v0.1.0-foundation`: project memory, planning scaffold, Electron + TypeScript shell, and design document updates.
- `v0.2.0-work-card-schema`: Work Card schema, Markdown renderer, and file path rules.
- `v0.3.0-capture-frame-review`: capture form, framing workflow, save, and review.
- `v0.4.0-implementer-prompt-flow`: risk router, Implementer execution packet generator, and plan capture.
- `v0.5.0-validation-repair-closeout`: Implementer report capture, validation, repair, closeout, and project-memory update.
- `v1.0.0-mvp`: complete MVP done definition.

## Done Definition

The MVP is done when a non-technical user can report a bug, review the framed Work Card, approve the plan or direct build, paste Implementer result, validate the result, repair if needed, and close the card.

## Approved Technical Implementation Decisions

- Language: TypeScript.
- Target surface: Electron desktop application.
- Package manager: npm.
- Persistence: direct Markdown file writes into the project repository.
- Primary Work Card path: `planning/work/[slug]/WORK_CARD.md`.
- Evidence path: `planning/work/[slug]/evidence/`.
- Git policy: initialize Git if absent, use commits for meaningful work checkpoints, and use tags for MVP release milestones.
- GitHub policy: use GitHub for remote commits and release tags when a remote is configured and credentials are available; do not print or request credentials.
- LLM strategy: manual copy/paste for Architect framing and Implementer execution packet workflows in MVP.
- MVP integration limit: MCP, connector, and external automation integrations remain non-goals.
- Deployment limit: production deployment pipeline remains a non-goal.
