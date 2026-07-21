<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/supporting_document/RISKS",
  "artifactType": "supporting_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/RISKS.json",
  "markdownPath": "planning/project/RISKS.md",
  "payload": {
    "kind": "supporting_document",
    "title": "Risks"
  },
  "payloadHash": "sha256:899e59388f1ca4d30b3202b72d8e244807551f85453e5c338d2e47aaf165c71d",
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

# Risks

## Known Risks And Drift Warnings

- Compatibility/fallback debt risk: Implementers may preserve wrong old runtime paths because they exist. Default Alpha strategy is Replace with migration; runtime fallbacks require a named supported consumer and approved sunset plan.
- Workflow-kernel replacement risk: Phase 06 must replace the old evidence projector and artifact protocol boundary without creating two active authorities. Success requires real evidence replay and gates that reject filename, timestamp, suffix, or synthetic-ID inference.
- Architect Bridge/MCP integration risk: ChatGPT subscription plus ChampCity MCP is Alpha core. The bridge must make source, target, expected output, MCP status, write boundaries, and fallback visible to the Operator.
- Dogfooding re-entry risk: the app is not the reliable workflow controller until Phase 08 criteria are met. Returning too early can create false confidence; returning too late can hide product workflow failures.
- Git exposure risk: raw Git operations are too developer-centric for the target Operator. Git automation and product-language readiness/status are required before release candidate.
- UI acceptance risk: automated validation can pass while the intended Operator workflow remains unusable. UI usability is an acceptance condition for workflow-facing Work Cards.
- Provider/API security boundary risk: API-backed provider integration is future/final-state work. Keys, provider settings, subscription workflow, MCP repo access, and local artifact writes must remain separated and secure.
- Evidence storage risk: screenshots and validation evidence must be repo-visible and app-controlled without leaking local machine paths or hidden external dependencies.
- Multi-project authority risk: future dogfooding across multiple repositories must isolate planning roots, repository roots, artifact graphs, current actions, and evidence writes with no route bleed.

## Risk Handling Notes

- Keep renderer filesystem access mediated through Electron main/preload IPC.
- Do not add provider SDKs, auth, databases, cloud services, MCP, connector integrations, or runtime compatibility layers without a dedicated approved Work Card.
- Operator manual validation remains required for acceptance and closeout decisions.
- Planning artifacts must use repo-relative paths or `<PROJECT_REPO>`, not concrete local machine paths.

## Document Disposition
Document.Status=Pending
