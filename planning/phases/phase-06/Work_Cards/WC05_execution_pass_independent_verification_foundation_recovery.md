<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC05",
  "artifactType": "work_card",
  "createdAt": "2026-07-18T18:35:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC05_execution_pass_independent_verification_foundation_recovery.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC05_execution_pass_independent_verification_foundation_recovery.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC05 — Execution Pass and Independent Verification Foundation Recovery"
  },
  "payloadHash": "sha256:cc92eb182babfe635cb297ea36a52e2ef1e230fb90644759e99ccac8561ba8ee",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/implementer_report/WC05"
    ],
    "sources": [
      "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
      "champcity-ai/phase-06/work_card/WC04",
      "champcity-ai/phase-06/work_card/WC03",
      "champcity-ai/project/design_document/CHAMPCITY_AI_RUNNER_ARCHITECTURE_DESIGN",
      "champcity-ai/phase-06/operator_approval/WC05"
    ],
    "supersedes": []
  },
  "revision": 3,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T18:55:00.000Z",
  "workCardId": "WC05"
}
-->

# Work Card: Phase 06 WC05 — Execution Pass and Independent Verification Foundation Recovery

Status: approved_dependency_blocked
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC05
Kind: planned_candidate
Plan order: 5
Owner: Implementer
Risk: critical
Dependency: accepting Architect Review of WC04
Source-code execution authorized: conditionally — `champcity-ai/phase-06/operator_approval/WC05`
Approved Work Card revision: 3
Push authorized: no

## Purpose

Recover the useful Execution Pass and Independent Verification foundation from the frozen prototype while removing premature Codex transport, restoring the Architect–Implementer boundary, and constraining renderer authority.

WC05 prepares the application for later Independent Verifier and Operator Validation Agent Work Cards. It does not implement live agent transport or grant any agent Operator authority.

## Retain

- Acceptance Contract and strict validation.
- Execution Pass Plan and strict validation.
- Pure Execution Run state transitions.
- Bounded Implementer packet compilation.
- Bounded Independent Verifier packet compilation.
- Exact Implementer result binding.
- Same-pass retry after `changes_required_in_current_pass`.
- Stop and human escalation for `governance_contradiction`.
- Canonical Acceptance Contract, Pass Plan, and Run persistence.
- Read-only run status and bounded packet preview.
- Permanent literal-compliance, Execution Pass, and independent-validation governance.

## Remove and Defer

Remove from production:

- `CodexCliAgentDispatchAdapter`;
- process spawning and Codex command construction;
- JSONL parsing;
- runner records and transport logs;
- automatic transport reconciliation;
- runner-specific result generation;
- renderer queue, completion, polling, and transport controls.

Do not leave this code dormant, disabled, feature-flagged, or as fallback. Runner Transport is a later Work Card.

## Required Decomposition

Create clear dedicated boundaries for:

1. shared Execution Run domain and validation;
2. shared pass-packet compilation;
3. main-process canonical persistence;
4. trusted main-process run authority;
5. read-only renderer status and preview.

Do not keep domain, persistence, controller, transport, parsing, and process management in the existing mixed context-packet service.

## Authority Boundary

Renderer/preload must not accept:

- arbitrary Acceptance Contracts or Pass Plans;
- arbitrary Execution Run initialization;
- raw lifecycle events;
- completion callbacks;
- verifier decisions;
- live runner queue requests.

Trusted main-process code may advance a run only after verifying exact synchronized canonical authority and exact canonical result artifacts.

Renderer access is limited to status and bounded packet preview.

## Governance Repair

Retain and finalize:

- `docs/governance/EXECUTION_PASS_PROTOCOL.md`;
- `docs/governance/IMPLEMENTER_LITERAL_COMPLIANCE_PROTOCOL.md`;
- `docs/governance/INDEPENDENT_VALIDATION_PROTOCOL.md`;
- `docs/architecture/EXECUTION_RUN_ORCHESTRATION.md`;
- the concise corresponding `AGENTS.md` mandate.

Mark runner transport as deferred. Restore normal `AGENTS.md` line endings.

## Prototype Cleanup

Remove from the final WC05 change set:

- `docs/handoffs/IMPLEMENTER_HANDOFF_EXECUTION_RUN_CODEX_CLI_TRANSPORT.md`;
- `docs/handoffs/INTEGRATION_CUSTOM_HANDOFF.md`;
- `planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_execution_run_codex_cli_transport.md`.

## Required Tests

Prove:

1. Invalid or unauthorized pass plans block.
2. Exact Work Card, revision, approval, contract, and plan identities must match.
3. Implementer packets contain only current-pass requirements and bounded sources.
4. Verifier packets target the exact recorded Implementer result.
5. Implementer self-report alone cannot advance a pass.
6. `changes_required_in_current_pass` creates another attempt on the same pass.
7. `verified_for_next_pass` advances only to a prerequisite-ready pass.
8. `governance_contradiction` blocks and requires human attention.
9. Canonical Contract, Plan, and Run pairs persist and increment revisions at fixed paths.
10. Renderer IPC cannot submit raw events or verifier decisions.
11. Production contains no Codex transport or runner process code.
12. The panel is read-only.
13. No agent or UI grants Operator acceptance.

Split these into focused domain, packet, persistence, IPC-boundary, and renderer suites.

## Authorized Surface

- `AGENTS.md`;
- the four governance and architecture documents;
- dedicated shared and main-process Execution Run modules;
- constrained IPC/preload/shared types;
- simplified read-only panel;
- focused tests and repository gates;
- removal of prototype transport and temporary records;
- synchronized WC05 Implementer Report pair.

Do not alter unrelated WC03 workflow logic, routing, onboarding, MCP, connectors, authentication, deployment, or providers.

## Validation

WC05 begins only after an accepting WC04 Architect Review exists.

Use the approved normal Windows lane:

- `npm run typecheck`;
- focused domain, packet, persistence, IPC, and renderer tests;
- repository gates proving transport removal;
- `npm test`;
- canonical pair synchronization checks;
- final `git status --short`.

No live Codex dispatch or Operator validation is part of this pass.

## Required Implementer Report

Create:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC05_execution_pass_independent_verification_foundation_recovery.{json,md}`

Artifact ID:

`champcity-ai/phase-06/implementer_report/WC05`

The report must include a retain/remove/defer inventory and map every acceptance criterion to exact production and test evidence.

## Acceptance Criteria

WC05 is complete only when the foundation is cleanly separated; all Codex transport is absent from production; renderer mutation authority is removed; exact canonical authority gates initialization and advancement; bounded Implementer and Verifier packets work; independent verification is required before advancement; same-pass retry and governance contradiction behavior work; canonical pairs persist through the repaired Registry; governance documents are finalized; all tests pass; the synchronized Implementer Report exists; no push occurred; and Operator acceptance was not performed.

## Manual Validation After Implementer

Verify the panel is read-only, shows pass state and bounded packet preview, has no queue or completion controls, cannot advance without independent verification, shows retries and governance blocks, launches no Codex process, and creates no Operator acceptance.

## Deferred Work

- Independent Verifier Agent integration.
- Operator Validation Agent execution and evidence capture.
- Runner Transport adapter.
- retry limits and runner-failure escalation.
- automatic git checkpoints.

## Document Disposition
Document.Status=Pending
