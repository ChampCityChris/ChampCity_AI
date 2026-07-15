<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/supporting_document/PROJECT_PROFILE",
  "artifactType": "supporting_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/PROJECT_PROFILE.json",
  "markdownPath": "planning/project/PROJECT_PROFILE.md",
  "payload": {
    "kind": "supporting_document",
    "title": "Project Profile"
  },
  "payloadHash": "sha256:9d449c220bc26fc7743cab7e096855b46d185ab65952dae361cf5dc04e1ea02b",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Project Profile

## Project Name

ChampCity A/I

## Public Brand

ChampCity AI

## Current Stage

Alpha app development.

## Product Thesis

ChampCity A/I is a local Electron workflow application for non-developer or semi-technical Operators who use an Architect and an Implementer to plan, build, validate, repair, close, and advance software development phases through durable repo artifacts.

The corrected product model is that ChampCity A/I is a workflow router, not a screen picker. The application should compute the current actionable step from durable project state and guide the Operator to the correct next action.

## Mental Model

Capture -> Frame -> Plan -> Build -> Prove remains a useful explanatory mental model, but it is not the application workflow.

The actual locked workflow is:

```text
Project Intake -> Project Interview -> Reconciliation Review -> Project Mapping -> Operator Project Approval -> Phase Mapping -> Operator Phase Approval -> Work Card Loop -> Phase Closeout -> Operator Phase Closeout Approval -> Roadmap Update -> Next Phase Activation -> Repeat Phase Mapping / Work Card Loop
```

## Primary Users

Non-developer and semi-technical Operators. They may be technically comfortable, but they should not be expected to know coding languages, software architecture, implementation planning, or formal validation practices.

## Operating Roles

- Operator: owns priority, approval, credentials, business judgment, validation, and final acceptance.
- Architect: frames work, asks guided questions, creates planning artifacts, reviews Implementer Reports, drafts Work Cards, drafts repair sub-cards, and provides manual validation steps.
- Implementer: coding-focused LLM that executes approved Work Cards and returns Implementer Reports.

## Source of Truth

`%USERPROFILE%\Projects\ChampCity_AI`

The source of truth is the local project repo and its durable Markdown/JSON artifacts.

## Approved Technical Shape

- Target surface: Electron desktop app.
- Language: TypeScript.
- Frontend: React.
- Persistence: file-backed Markdown and JSON planning artifacts.
- Repo bridge: ChampCity MCP.
- Implementer: Codex or another coding-focused LLM acting in the Implementer role.
- Manual copy/paste remains a fallback path, not the primary desired workflow.

## Corrected Workflow Authority

- Project Intake writes `Project_Intake.md` and creates or binds the local workspace path.
- Project Interview is always required and writes `Project_Interview.md`.
- Reconciliation Review runs when repo detection finds prior project content and reconstructs completed phases and completed Work Cards only.
- Project Mapping creates `Project_Profile.md` and `Roadmap.md`, approved as a bundle.
- `Roadmap.md` is the living master record.
- Phase Mapping is performed one phase at a time for the first incomplete phase.
- Phase Mapping creates `Phase_Interview.md`, `Phase_Planning.md`, and `Work_Card_Plan.md`.
- `Work_Card_Plan.md` contains mapped Work Card candidates only: IDs, titles, summaries, order, dependencies, and purpose.
- The Architect creates each full Work Card just in time.
- The Work Card is also the Implementer execution packet.
- Implementer Reports are reviewed by the Architect, not by the Operator for validation design.
- The Architect provides manual validation steps.
- Operator validation creates Validation Records.
- Repair sub-cards use `WCxx-REPAIRxx` naming and are informally reviewed by the Operator.
- Phase Closeout accounts for every mapped candidate and authorizes Roadmap update and Next Phase Activation after Operator closeout approval.

## UI Product Direction

The UI must not be primarily a list of screens. It should provide:

- current required action
- why that action is next
- source artifacts being used
- artifact or record that will be written
- approval or validation required
- success path
- failure or repair path

Secondary navigation may exist, but the primary experience should route the Operator through the locked workflow.

## Current Rebaseline

A Project Mapping Rebaseline was created to supersede prior screen-picker and split phase-planning assumptions.

Related artifacts:

- `docs/workflow/PROCESS_BASELINE.md`
- `planning/project/REBASELINE_WORKFLOW_ROUTER_MODEL.md`
- `planning/project/OPERATOR_PROJECT_REBASELINE_APPROVAL_PENDING.md`

## Safe Assumptions

- ChampCity MCP is available and configured for the project workspace during Alpha development.
- API-backed integration remains optional future functionality for users who supply API keys.
- ChatGPT subscription surface plus MCP-mediated repo access is the preferred Alpha planning model.
- The Operator remains responsible for approval, validation, and movement between workflow states.
- The app should expose MCP status and artifact-write status in plain language.

## Superseded Assumptions

The following assumptions are superseded by the workflow-router rebaseline:

- The app is mainly a screen picker.
- Phase Planning is a separate top-level workflow concept from Phase Mapping.
- Implementer Execution Packet is a separate primary artifact from the Work Card.
- The Operator should manually select among many workflow screens to determine what to do next.
