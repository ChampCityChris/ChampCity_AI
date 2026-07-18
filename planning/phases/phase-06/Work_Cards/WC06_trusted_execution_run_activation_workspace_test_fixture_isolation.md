<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC06",
  "artifactType": "work_card",
  "createdAt": "2026-07-18T20:38:31.415Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC06 - Trusted Execution Run Activation Workspace and Test-Fixture Isolation"
  },
  "payloadHash": "sha256:e1c39d7ab394da7f1dee32d49162ec33a6db1a7af9d44f9d822ba014595de4bb",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-06/operator_approval/WC06",
      "champcity-ai/phase-06/implementer_report/WC06"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-06/implementer_report/WC06"
    ],
    "sources": [
      "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
      "champcity-ai/phase-06/architect_review/WC05",
      "docs/handoffs/WC06_APPROVED_AUTHORITY_BOOTSTRAP",
      "docs/handoffs/IMPLEMENTER_HANDOFF_PHASE06_WC06_trusted_execution_run_activation_workspace_test_fixture_isolation"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T20:38:31.415Z",
  "workCardId": "WC06"
}
-->

# Work Card: Phase 06 WC06 - Trusted Execution Run Activation Workspace and Test-Fixture Isolation

Status: approved_for_implementer_execution
Owner: Implementer
Risk: high
Branch: feature/phase-04-wc01-repair01-evidence-derived-workflow
Baseline checkpoint: 8801ac0b60a5ad227bc68ba9397f10be461a6e85
Push authorized: no
Expected output: champcity-ai/phase-06/implementer_report/WC06

## Purpose

Make the recovered Execution Run foundation usable through Supporting Tools without adding runner transport. The Operator can open Execution Runs, select an eligible approved Work Card, start or open the run, review status and the bounded next packet, then restart and reopen the same run.

## Structured Execution Run Definition

Schema version: champcity.execution-run-definition.v1

### Global Invariants

- INV-ROLE-SEPARATION: Architect defines authority; Implementer changes production code; verifier and Operator decisions remain separate.
- INV-TRUSTED-MAIN-AUTHORITY: Renderer intent cannot supply canonical Contract, Plan, lifecycle event, result, or decision data.
- INV-HUMAN-OPERATOR-AUTHORITY: No agent or UI grants final human Operator acceptance.

### Passes

#### P01 - Trusted activation compiler and authority

Compile strict structured WC06 authority into deterministic Acceptance Contract and Execution Pass Plan records, then start or open exact Execution Runs through trusted main-process authority.

Requirements:
- R01-DEFINITION-SCHEMA: Strict structured definitions compile deterministically. Unknown or missing fields block. Parsing Markdown, titles, or filenames is prohibited.
- R02-EXACT-AUTHORITY: Activation resolves exact synchronized Work Card, revision, approval, dependency, project, and phase authority. Artifact existence alone is insufficient.
- R03-IDEMPOTENT-START: Starting the exact same run twice returns the existing run without semantic mutation. A conflicting existing run blocks.

Allowed paths:
- src/shared/executionRuns
- src/main/executionRuns
- src/main/artifacts
- src/main/canonicalRuntime.ts
- test/wc06

Required tests:
- focused WC06 schema/compiler/authority tests
- WC05 execution-run regression tests
- Registry load and synchronization verification

Expected outputs:
- strict execution-definition schema and compiler
- trusted eligible-list operation
- trusted start/open operation
- canonical Acceptance Contract, Execution Pass Plan, and Execution Run pairs

#### P02 - Execution Runs supporting workspace

Expose a Supporting Tools Execution Runs workspace with eligible Work Cards, Start/Open actions, status, blockers, and bounded packet preview while preserving read-only deferred transport boundaries.

Requirements:
- R04-SUPPORTING-WORKSPACE: Supporting Tools provides an Execution Runs workspace with eligible Work Cards, Start/Open actions, status, and bounded packet preview.
- R05-PLAIN-STATES: Empty and blocked states explain the missing exact authority in plain language.
- R06-READ-ONLY-BOUNDARY: No queue, process, raw-event, completion, verifier-decision, or Operator-acceptance controls may exist, including dormant or feature-flagged versions.

Allowed paths:
- src/main/main.ts
- src/preload/index.ts
- src/renderer
- src/shared/executionRuns
- test/wc06

Required tests:
- focused WC06 renderer/preload IPC tests
- mounted Execution Runs visibility validation

Expected outputs:
- Supporting Tools Execution Runs workspace
- eligible approved Work Card listing
- Start/Open controls
- status and bounded packet preview
- plain empty and blocked states

#### P03 - Test-fixture isolation and end-to-end proof

Isolate mounted Electron tests from normal project persistence, purge repository-internal tmp fixture projects, preserve external projects, and prove restart persistence for the Execution Runs workflow.

Requirements:
- R07-TEST-ISOLATION: Mounted Electron tests use isolated project-workspace persistence and clean up their fixture projects.
- R08-CONTAMINATION-REPAIR: Normal startup removes project roots contained under the host ChampCity_AI repository's tmp directory while preserving external user projects. Do not use a hard-coded fixture-name blacklist.
- R09-END-TO-END-PROOF: The normal application demonstrates Start Execution Run, persistent status, and bounded packet preview without transport controls.
- R10-PRESERVE-ROUTING: Existing workflow routing and current-action semantics must remain unchanged.

Allowed paths:
- src/main/projects
- src/main/canonicalRuntime.ts
- src/main/main.ts
- scripts
- test/wc06
- package.json

Required tests:
- mounted test-isolation validation
- normal application activation and restart validation
- existing workflow routing regressions

Expected outputs:
- isolated mounted Electron persistence
- normal registry contamination repair
- visible workflow and restart persistence evidence

## Prohibited Scope

Do not reintroduce Codex CLI or Runner Transport, implement Independent Verifier Agent, implement Operator Validation Agent, broaden unrelated workflow routing, perform Operator acceptance, push, merge, tag, or release.
