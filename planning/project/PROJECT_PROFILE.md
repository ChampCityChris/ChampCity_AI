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
  "payloadHash": "sha256:c9f90a2d8b0312e6a3cc52b648ea45cfa31df52857e020b5b52d0b897d2a6087",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-04/phase_closeout/PHASE_04",
      "champcity-ai/phase-05/operator_approval/WC03-roadmap-rebaseline",
      "champcity-ai/phase-05/project_roadmap/WC03",
      "champcity-ai/phase-05/reconciliation_review/WC01",
      "champcity-ai/phase-05/reconciliation_review/WC02",
      "champcity-ai/project/observation/PROJ-OBS-010"
    ],
    "supersedes": []
  },
  "revision": 3,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-17T01:35:00.000Z"
}
-->

# Project Profile

## Project Name

ChampCity A/I

## Public Brand

ChampCity AI

## Current Stage

Alpha app development after approved Phase 05 roadmap rebaseline.

## Product Thesis

ChampCity A/I is a local Electron workflow application for non-developer or semi-technical Operators who use an Architect and an Implementer to plan, build, validate, repair, close, and advance software development phases through durable repo artifacts.

The product is a governed workflow controller. During the current rebaseline interval, the app is evidence and tooling, not the reliable workflow controller, until the Phase 06 kernel and Phase 08 dogfooding re-entry criteria are met.

## Operating Roles

- Operator: owns priority, approval, credentials, business judgment, validation, and final acceptance.
- Architect: frames work, asks guided questions, creates planning artifacts, reviews Implementer Reports, drafts Work Cards, drafts repair sub-cards, and provides manual validation steps.
- Implementer: coding-focused execution role that performs approved Work Cards and returns Implementer Reports. Codex is the first supported Implementer, while the Implementer contract remains tool-neutral.

## Source of Truth

The source of truth is the local project repository and its durable Markdown/JSON artifacts. Committed planning artifacts should use repo-relative paths or `<PROJECT_REPO>`, not concrete local machine paths.

## Approved Technical Shape

- Target surface: Electron desktop app.
- Language: TypeScript.
- Frontend: React.
- Persistence: file-backed Markdown and JSON planning artifacts.
- Default Architect integration: ChatGPT subscription plus ChampCity MCP.
- Future/final-state model integration: API-backed model integration through secure provider boundaries, not the default Alpha path.
- ChampCity MCP direction: core integrated app component, repo bridge, and future model-harness boundary.
- First supported Implementer: Codex.
- Implementer contract: tool-neutral.
- Public beta candidate target: Windows-first downloadable desktop beta candidate.

## Current Integration Baseline

ChatGPT subscription plus ChampCity MCP is the default Architect integration for Alpha and the release-candidate path. API-backed OpenAI, Anthropic, local Ollama, and generic OpenAI-compatible provider integration remain future/final-state provider work and require secure settings/provider-boundary implementation before use as product defaults.

Manual copy/paste may remain an explicit fallback during Alpha, but it is not the desired primary workflow. Fallbacks must be visible, recorded, and repaired when they block in-app dogfooding.

## Workflow Direction

Phase 06 rebuilds the workflow kernel and artifact protocol. Phase 07 makes Architect Bridge Alpha core. Phase 08 returns ChampCity_AI development to application-led dogfooding. Later phases harden Implementer contracts, validation/evidence, multi-project authority, Git automation, UI usability, provider/security boundaries, and release-candidate packaging.
