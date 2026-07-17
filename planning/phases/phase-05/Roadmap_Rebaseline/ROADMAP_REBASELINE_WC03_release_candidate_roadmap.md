<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-05/project_roadmap/WC03",
  "artifactType": "project_roadmap",
  "createdAt": "2026-07-17T01:15:00.000Z",
  "jsonPath": "planning/phases/phase-05/Roadmap_Rebaseline/ROADMAP_REBASELINE_WC03_release_candidate_roadmap.json",
  "markdownPath": "planning/phases/phase-05/Roadmap_Rebaseline/ROADMAP_REBASELINE_WC03_release_candidate_roadmap.md",
  "parentArtifactId": "champcity-ai/phase-05/work_card/WC03",
  "payload": {
    "kind": "project_roadmap",
    "title": "Roadmap Rebaseline: Public Downloadable Beta Candidate"
  },
  "payloadHash": "sha256:9db3d01522664e0ddd8e6fe73c88c0a3a6d8f0c223c49a5bbbeb5850e0b0ab57",
  "phaseId": "phase-05",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-04/phase_closeout/PHASE_04",
      "champcity-ai/phase-05/operator_approval/WC03",
      "champcity-ai/phase-05/operator_approval/WC03-roadmap-rebaseline",
      "champcity-ai/phase-05/reconciliation_review/WC01",
      "champcity-ai/phase-05/reconciliation_review/WC02",
      "champcity-ai/phase-05/work_card/WC03",
      "champcity-ai/project/observation/PROJ-OBS-010"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-17T01:20:00.000Z",
  "workCardId": "WC03"
}
-->

# Roadmap Rebaseline: Public Downloadable Beta Candidate

Status: approved
Phase: phase-05 — Reconciliation and Roadmap Rebaseline
Work Card: WC03
Owner: Architect

## Executive Decision

ChampCity A/I will continue Alpha development from a rebuilt workflow-kernel foundation, not from another patch pass over the current evidence projector. The target release is a public downloadable beta candidate, beginning with Windows.

This roadmap does not authorize implementation by itself. It defines the approved phase sequence and the required living-document updates after Operator approval.

## Current State

Phase 04 closed as a stabilization bridge. Phase 05 reconciled the planning corpus and approved the current-state and ground-rules baseline. The MVP foundation is historical proof of concept, not current architecture authority. The app must stop preserving wrong runtime paths for compatibility unless a named supported consumer and sunset plan are approved.

Artifact Registry and Workflow State are diagnostic/cache until the workflow kernel is rebuilt. The current roadmap and project-state documents are stale and must be updated after approval. PROJ-OBS-010 must be integrated into the Project Observation Register.

## Public Beta Candidate Definition

The public beta candidate is a Windows desktop build that a non-developer or semi-technical Operator can install and use to run a governed AI-assisted software-development workflow with durable repo artifacts. Minimum scope: reliable project registration, ChatGPT subscription plus ChampCity MCP Architect Bridge, Codex as first supported Implementer, durable workflow kernel, validation/evidence, repair/disposition, Git automation, multi-project dogfooding, usable UI, packaging, onboarding, and documentation.

## Phase 06 — Workflow Kernel and Artifact Protocol Replacement

Purpose: replace the hard-coded evidence projector and prompt-handoff assumptions with an integration-ready workflow kernel. Scope includes one workflow-state kernel, relationship-driven artifact resolution, explicit transition rules, canonical artifact contracts, and old-foundation removal rules. Non-scope: full Architect Bridge UI, provider API execution, and public packaging. Success requires Phase 04 replay without synthetic IDs or filename/timestamp/suffix inference. Exit when the app can compute current action from the kernel for current ChampCity_AI evidence.

Candidate Work Cards: Kernel Contract and Artifact Protocol Baseline; Replace EvidenceDerivedWorkflowProjector with Relationship-Driven Resolver; Real Phase 04 Replay Fixture and No-Fallback Repository Gates; Artifact Registry and Workflow State Diagnostic Boundary; Kernel-to-UI Current Action Adapter; Operator Validation of Kernel-Derived Current Action.

## Phase 07 — Architect Bridge and MCP-First Integration

Purpose: make Architect Bridge Alpha core. Scope includes bounded Architect task packets, ChatGPT subscription plus ChampCity MCP as the default Architect integration, source/target/expected-output visibility, MCP status, and explicit fallback when MCP read/write fails. Non-scope: ChatGPT DOM automation and provider API model execution. Success requires Architect-created artifacts through the bridge and clear Operator visibility into what the Architect is doing. Exit when Architect-created planning/review artifacts can be created and reviewed through the bridge.

## Phase 08 — In-App Dogfooding Re-Entry

Purpose: return ChampCity_AI development to being dogfooded inside ChampCity A/I as the primary workflow controller. This phase is mandatory.

Entry criteria: Phase 06 kernel accepted; Phase 07 Architect Bridge can create/review artifacts; ChampCity_AI project registration and refresh are reliable; manual fallback exists; UI shows current action, source evidence, expected output, and blockers.

Required in-app coverage: create Work Card from active roadmap/phase plan; display Architect task packet; capture or associate Implementer Report; route Architect Review; route Operator Validation; store repo-visible screenshot/evidence; create Candidate Disposition or Repair Work Card; stage/commit governed evidence where available.

Fallback rules: fallback must be explicit, visible, and recorded; it cannot silently replace the in-app path; any failure to use the in-app path creates evidence for repair.

Success criteria: at least one ChampCity_AI Work Card after this phase begins is run through the application, not only external chat/MCP; workflow advances from Work Card to disposition without direct manual artifact surgery; UI usability is Operator-validated; all evidence remains repo-visible. Exit when ChampCity_AI development has returned to application-led dogfooding with manual fallback recorded as exception evidence.

## Phase 09 — Implementer Contract and Codex Loop Hardening

Purpose: make Codex the first supported Implementer while keeping the Implementer contract tool-neutral. Scope includes handoff packet shape, Implementer Report shape, repo identity, branch, validation lane, changed-file summary, commit hash, and blocked-work reporting. Success requires at least two Work Cards executed through Codex with the same contract and Architect review evidence.

## Phase 10 — Validation, Evidence, and Repair Governance

Purpose: repair validation and evidence as first-class workflow systems. Scope includes routed evidence bundles, repo-visible screenshot/evidence folders, structured validation checklist, repair lineage governance, and UI usability as validation dimension. Success requires repaired-parent validation with correct evidence bundle and failed validation to repair route without role confusion.

## Phase 11 — Multi-Project Dogfooding and Workspace Authority

Purpose: use multiple real projects to harden workspace boundaries. Required dogfood projects: ChampCity_AI, ChampCity_GPT / ChampCity MCP, ChampCity_RP_Desktop, and Revisionary. Success requires isolated planning roots, repository roots, artifact graphs, evidence writes, and current actions with no route bleed.

## Phase 12 — Git Automation and Operator Abstraction

Purpose: remove Git as an end-user responsibility before release candidate. Scope includes app-owned or MCP-mediated staging/committing, readiness summaries in product language, branch mismatch warnings, and commit evidence linked to workflow artifacts. Success requires normal governed workflow without raw Git commands.

## Phase 13 — UI Hardening and Workflow Cockpit

Purpose: make the UI a usable workflow cockpit, not a screen picker. Scope includes current action primary UI, left-to-right process rail, context inspector, artifact workspace, evidence/activity log, clear project selector, plain-language error messages, and removal/collapse of duplicative action bars. Success requires Operator walkthroughs and screenshots for major routes.

## Phase 14 — Security, Settings, and Provider Boundary

Purpose: define secure handling for MCP, local repo access, model API keys, and future provider integration. Scope includes separation of subscription workflow from API-backed model workflow, secure local key storage, provider key non-exposure, and MCP as repo bridge plus future model harness boundary.

## Phase 15 — Release Candidate Packaging and Documentation

Purpose: produce the Windows public downloadable beta candidate. Scope includes installer/package, first-run guidance, project setup, MCP setup/status guidance, dogfooding documentation, known limitations, recovery/fallback instructions, release notes, and validation summary. Success requires fresh install, existing project registration, Architect Bridge/MCP setup, end-to-end sample Work Card loop, and release package evidence.

## Required Living-Document Updates After Approval

After Operator approval, update Project Roadmap, Project State, Project Profile, Decisions, Risks, Open Questions, Project Observation Register, and any active workflow/architecture docs that still contradict this roadmap. These updates must be performed as a separate Operator-approved action.

## Old-Foundation Removal Rules

Every future implementation Work Card must state existing implementation classification: Preserve, Migrate, or Replace; runtime compatibility requirements with named supported consumer; migration strategy; deletion/removal plan; tests proving old and new authority paths are not both active; and UI impact when touching Operator workflow. Default for unreleased Alpha is replace wrong foundations with durable-data migration only.

## Approval Boundary

This roadmap has been approved by the Operator. Implementation begins only after next-phase activation through the required phase-planning process.
