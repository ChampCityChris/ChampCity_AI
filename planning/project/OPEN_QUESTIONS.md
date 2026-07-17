<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/supporting_document/OPEN_QUESTIONS",
  "artifactType": "supporting_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/OPEN_QUESTIONS.json",
  "markdownPath": "planning/project/OPEN_QUESTIONS.md",
  "payload": {
    "kind": "supporting_document",
    "title": "Open Questions"
  },
  "payloadHash": "sha256:fb36fd7736364a454ced79d95d4986952264b6496acbafa9e1a4461d420ed6f6",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-04/phase_closeout/PHASE_04",
      "champcity-ai/phase-05/approval/WC03-roadmap-rebaseline",
      "champcity-ai/phase-05/reconciliation_review/WC01",
      "champcity-ai/phase-05/reconciliation_review/WC02",
      "champcity-ai/phase-05/roadmap_rebaseline/WC03",
      "champcity-ai/project/observation/PROJ-OBS-010"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-17T01:35:00.000Z"
}
-->

# Open Questions

## Answered By Phase 05 WC01/WC02/WC03

- Default Architect integration: ChatGPT subscription plus ChampCity MCP.
- Implementer model: Codex is the first supported Implementer, and the Implementer contract remains tool-neutral.
- Public beta target: Windows-first downloadable public beta candidate.
- Evidence/screenshots: repo-visible app-controlled evidence storage under planning/evidence-style project structure.
- Git automation: required before release candidate; raw Git must not remain a normal Operator responsibility.

## Remaining Open Questions

- What exact Operator-facing setup, status, and repair UI should ChampCity A/I provide for ChampCity MCP connection failures?
- What explicit fallback design should exist when MCP read/write fails during Alpha, and what evidence should that fallback create for repair?
- Which secure local storage mechanism and settings UX should be used for future API-backed provider keys?
- After the Windows-first beta candidate is proven, what timing and scope should Mac/Linux support have?

## Owner

The Operator owns final answers. The Architect may frame options before implementation, and future Work Cards should resolve only the questions needed for their approved phase scope.
