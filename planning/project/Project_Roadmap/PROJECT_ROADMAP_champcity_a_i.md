<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/roadmap/PROJECT_ROADMAP_champcity_a_i",
  "artifactType": "roadmap",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.json",
  "markdownPath": "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
  "payload": {
    "kind": "roadmap",
    "title": "Project Roadmap: ChampCity A/I"
  },
  "payloadHash": "sha256:762215788150a1868d3f3a1fd56375166c9e07d507c2a96f08179f69a58aeb35",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC01",
      "champcity-ai/phase-03/implementer_report/WC01"
    ],
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
  "revision": 3,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-17T01:35:00.000Z"
}
-->

# Project Roadmap: ChampCity A/I

Status: Living master roadmap
Current approved roadmap authority: `champcity-ai/phase-05/roadmap_rebaseline/WC03`
Updated for: Phase 05 approved roadmap rebaseline

## Rebaseline Decision

The Operator approved the Phase 05 release-candidate roadmap rebaseline. ChampCity A/I continues Alpha development from a rebuilt workflow-kernel foundation, not another patch pass over the current evidence projector. The target release is a public downloadable beta candidate, beginning with Windows.

This roadmap is planning authority. It does not authorize source-code implementation by itself. Implementation resumes through the required next-phase planning and Work Card process.

## Current Roadmap Authority

- Approved roadmap: `champcity-ai/phase-05/roadmap_rebaseline/WC03`
- Operator approval: `champcity-ai/phase-05/approval/WC03-roadmap-rebaseline`
- Current-state baseline: `champcity-ai/phase-05/reconciliation_review/WC02`
- Phase 04 closeout: `champcity-ai/phase-04/phase_closeout/PHASE_04`

## Current State

Phase 04 is closed as a stabilization bridge. Phase 05 roadmap rebaseline is approved. The next implementation phase is Phase 06: Workflow Kernel and Artifact Protocol Replacement.

Artifact Registry and Workflow State are diagnostic/cache until the workflow kernel is rebuilt. The app is not currently the reliable workflow controller until Phase 08 re-entry criteria are met.

## Release Candidate Definition

The public beta candidate is a Windows desktop build that a non-developer or semi-technical Operator can install and use to run a governed AI-assisted software-development workflow with durable repo artifacts. Minimum scope includes reliable project registration, ChatGPT subscription plus ChampCity MCP Architect Bridge, Codex as the first supported Implementer, durable workflow kernel, validation/evidence, repair/disposition, Git automation, multi-project dogfooding, usable UI, packaging, onboarding, and documentation.

## Phases

### phase-01: MVP Foundation and Core Work Card Loop

Status: closed

Historical MVP proof of concept; not current architecture authority.

### phase-02: Upstream Project Planning and Corrective Workflow Authority

Status: closed

Historical corrective planning work.

### phase-03: Workflow Router Screen Correction and Guided Current Action UI

Status: interrupted/superseded

Superseded by later stabilization evidence and the Phase 05 roadmap rebaseline.

### phase-04: Stabilization Bridge and Foundation Rebaseline

Status: closed

Closed as stabilization bridge; it exposed the need to replace the old foundation.

### phase-05: Reconciliation and Roadmap Rebaseline

Status: approved

Roadmap rebaseline approved by the Operator; source-code implementation not authorized by WC03 approval.

### phase-06: Workflow Kernel and Artifact Protocol Replacement

Status: next implementation phase

Replace the hard-coded projector with a relationship-driven workflow kernel and canonical artifact protocol.

### phase-07: Architect Bridge and MCP-First Integration

Status: planned

Make ChatGPT subscription plus ChampCity MCP the Alpha-core Architect integration path.

### phase-08: In-App Dogfooding Re-Entry

Status: planned

Return ChampCity_AI development to application-led dogfooding after kernel and bridge criteria are met.

### phase-09: Implementer Contract and Codex Loop Hardening

Status: planned

Support Codex first while keeping the Implementer contract tool-neutral.

### phase-10: Validation, Evidence, and Repair Governance

Status: planned

Make validation, evidence bundles, screenshots, repair lineage, and UI usability first-class workflow systems.

### phase-11: Multi-Project Dogfooding and Workspace Authority

Status: planned

Dogfood ChampCity_AI, ChampCity GPT / ChampCity MCP, ChampCity_RP_Desktop, and Revisionary with isolated workspace authority.

### phase-12: Git Automation and Operator Abstraction

Status: planned

Remove Git as an end-user responsibility before release candidate.

### phase-13: UI Hardening and Workflow Cockpit

Status: planned

Make the UI a usable workflow cockpit rather than a screen picker.

### phase-14: Security, Settings, and Provider Boundary

Status: planned

Define secure boundaries for MCP, local repo access, provider keys, and future API-backed models.

### phase-15: Release Candidate Packaging and Documentation

Status: planned

Produce the Windows-first public downloadable beta candidate with setup, onboarding, evidence, and release documentation.

## First Incomplete Phase

Current first incomplete phase is phase-06.

Current next implementation phase:

```text
phase-06: Workflow Kernel and Artifact Protocol Replacement
```

## Old-Foundation Removal Rules

Every future implementation Work Card must state the existing implementation classification: Preserve, Migrate, or Replace. It must identify runtime compatibility requirements with a named supported consumer, migration strategy, deletion/removal plan, tests proving old and new authority paths are not both active, and UI impact when touching Operator workflow. Default for unreleased Alpha is to replace wrong foundations with durable-data migration only.

## Superseded Assumptions

- Phase 03 is the active implementation phase.
- Phase 04 or Phase 05 should patch the existing evidence projector as the final workflow controller.
- Artifact Registry or Workflow State is current independent runtime authority before the Phase 06 kernel rebuild.
- Implementer Execution Packet is a separate primary artifact overriding Work Card authority.
- UI usability can be deferred as optional polish after data artifacts pass tests.
- Git can remain a normal end-user responsibility for the release candidate.

## Artifact Policy

The roadmap is the living master record for phase sequence and release-candidate scope. It does not create executable Work Cards. Phase planning and Operator approval create Work Card Plans, and full Work Cards are created just in time by the Architect after the relevant approval.
