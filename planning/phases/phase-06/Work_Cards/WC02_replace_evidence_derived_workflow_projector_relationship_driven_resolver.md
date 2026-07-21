<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC02",
  "artifactType": "work_card",
  "createdAt": "2026-07-17T03:50:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC02_replace_evidence_derived_workflow_projector_relationship_driven_resolver.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC02_replace_evidence_derived_workflow_projector_relationship_driven_resolver.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC02 — Replace EvidenceDerivedWorkflowProjector with Relationship-Driven Resolver"
  },
  "payloadHash": "sha256:e1723b9e63999d800f12bff3922726d1c74f692c3e908c92e1de4bbd78a6d8a4",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/implementer_report/WC02"
    ],
    "sources": [
      "champcity-ai/phase-05/project_roadmap/WC03",
      "champcity-ai/phase-06/candidate_disposition/WC01",
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/phase-06/operator_approval/WC02",
      "champcity-ai/phase-06/work_card_plan/Work_Card_Plan"
    ],
    "supersedes": []
  },
  "revision": 4,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-17T13:40:00.000Z",
  "workCardId": "WC02"
}
-->

# Work Card: Phase 06 WC02 ? Replace EvidenceDerivedWorkflowProjector with Relationship-Driven Resolver

Status: approved_for_implementer_execution
Phase: phase-06 ? Workflow Kernel and Artifact Protocol Replacement
Work Card: WC02
Owner: Implementer
Risk: critical
Change strategy: Implementation; replacement of old workflow authority with relationship-driven kernel/resolver

Approval note: WC02 is approved for Implementer execution by `champcity-ai/phase-06/approval/WC02`. Source-code changes are authorized only within the boundaries of this Work Card.

## Purpose

Replace the hard-coded evidence-derived current-action projector with a relationship-driven workflow resolver that consumes verified artifact graph evidence, explicit artifact relationships, transition rules, role gates, and the repaired WC01 Replacement Inventory.

WC02 is the first source-code implementation Work Card in Phase 06. It must remove the old projector as workflow authority and prevent old/new dual authority.

## Dependencies

WC02 depends on accepted WC01 completion via WC01-REPAIR01.

Controlling sources:

- `champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory`
- `champcity-ai/phase-06/candidate_disposition/WC01`
- `champcity-ai/phase-06/work_card_plan/Work_Card_Plan`
- `champcity-ai/phase-05/roadmap_rebaseline/WC03`

## Required Scoped Code-Review Checkpoint

Before editing source code, inspect the WC01 Replacement Inventory and confirm the exact WC02-owned or WC02-shared modules to be edited, migrated, preserved, replaced, or left untouched.

At minimum, review:

- `src/main/workflow/evidenceDerivedWorkflowProjector.ts`
- `src/shared/workflow/transitionEngine.ts`
- `src/shared/workflow/processContract.ts`
- `src/shared/workflow/evidencePrecedence.ts`
- `src/main/repository/verifiedArtifactGraph.ts`
- `src/main/repository/repositoryRefreshService.ts`
- `src/main/workflow/routedProcessInvocationService.ts`
- `src/main/workflow/routedWriteScope.ts`
- `src/main/workflow/processIpcPolicy.ts`
- `src/shared/workflow/workflowContracts.ts`
- `src/shared/workflow/roleGates.ts`

The Implementer Report must list the scoped review findings before implementation findings. Any additional workflow-authority path discovered during implementation must be recorded.

## Required Implementation

Implement a relationship-driven workflow resolver/kernel path that:

1. consumes verified artifact graph evidence rather than filename, timestamp, suffix, or route heuristics;
2. resolves current action from explicit artifact relationships and transition rules;
3. emits either one authorized current action or a blocked result;
4. returns exact expected output artifact ID, artifact type, JSON path, Markdown path, role, source artifacts, blockers, and route/screen hints where applicable;
5. blocks on missing, ambiguous, duplicate, superseded, stale, or unsynchronized evidence;
6. rejects synthetic artifact ID construction as a way to satisfy expected outputs;
7. treats Artifact Registry and Workflow State as diagnostic/cache only unless explicitly consumed as non-authoritative diagnostics;
8. makes repository refresh consume the resolver result instead of old projector authority;
9. prevents old/new dual current-action authority.

## Required Old-Authority Removal ? Remove Only

The old evidence-derived projector authority must be removed. Disabling, bypassing, hiding, feature-flagging, leaving dormant code, or retaining a fallback path is not acceptable.

Required removal means:

1. `evidenceDerivedWorkflowProjector.ts` must not remain in any production runtime current-action path.
2. Production code must not import, call, wrap, branch to, or retain the old projector as a disabled or fallback authority.
3. Repository refresh must be rewired to the new relationship-driven resolver and must not preserve any alternate projector-derived current-action route.
4. Current-action selection logic that depends on hard-coded phase/work-card branches, synthesized expected-output IDs, filename inference, suffix inference, timestamp order, directory order, route aliases, renderer state, registry cache, or Workflow State cache must be removed from runtime authority code.
5. Tests that require the old projector authority must be removed or rewritten to assert the new resolver behavior.
6. Any pure utility worth preserving must be extracted into a clearly named non-authoritative module before the old projector file is removed. The old projector file itself must not remain as a disabled source module.
7. Historical references may remain only in durable planning or review artifacts. They may not remain as executable production authority.

Permitted outcomes:

- delete the old projector file after migrating any legitimate non-authoritative utility;
- replace all production imports and calls with the new relationship-driven resolver;
- move pure helper logic into a new target-state utility module only if it cannot select current action and cannot synthesize expected output authority.

Not permitted:

- disabling the old projector while leaving it in production source;
- leaving the old projector behind a feature flag, environment flag, guard branch, dead code path, compatibility wrapper, fallback resolver, or deprecated runtime adapter;
- keeping the old projector as a backup when the new resolver blocks;
- constructing synthetic expected output IDs;
- selecting current action from filename, suffix, timestamp, directory order, route alias, renderer state, registry cache, or Workflow State cache;
- silently preserving old authority because tests still depend on it.

The Implementer Report must include a specific Old-Authority Removal section listing every removed import, call site, file, test dependency, branch, fallback, or adapter related to the old projector.

## Required Tests

Add or update focused resolver-level tests proving:

- relationship-driven evidence resolves the correct current action;
- missing expected output binding blocks;
- ambiguous candidate evidence blocks;
- duplicate artifact IDs block;
- unsynchronized JSON/Markdown pairs block;
- synthetic artifact ID construction is not accepted;
- old projector fallback is not used;
- Artifact Registry and Workflow State cannot override verified graph evidence;
- repository refresh uses the new resolver result;
- old projector production imports and runtime call sites are absent.

WC03 will own broad Phase 04/05 replay fixtures and repository gates. WC02 must still include enough focused coverage to prove the resolver replacement and old-authority removal are real.

## Required Implementer Report

Create a synchronized Implementer Report pair:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02_replace_evidence_derived_projector_relationship_driven_resolver.{json,md}`

Canonical artifact ID:

`champcity-ai/phase-06/implementer_report/WC02`

The report must include:

- repo, branch, and remote verification;
- Work Card and approval artifacts read;
- WC01 Replacement Inventory reviewed;
- scoped code-review checkpoint findings;
- files changed;
- implementation summary;
- Old-Authority Removal section listing removed imports, call sites, files, tests, branches, fallbacks, or adapters;
- tests added/updated;
- validation commands and results;
- skipped validation and reasons;
- remaining risks;
- final git status;
- commit hash.

## Acceptance Criteria

- The old projector is removed from runtime current-action authority, not merely disabled.
- No production source imports, invokes, wraps, branches to, feature-flags, or falls back to the old projector as current-action authority.
- The new resolver computes current action from verified artifact graph evidence and explicit relationships.
- Missing or ambiguous evidence blocks visibly instead of guessing.
- No synthetic artifact ID construction satisfies an expected output.
- Artifact Registry and Workflow State cannot override verified graph evidence.
- Repository refresh uses the new resolver result.
- Tests cover resolver success, blocker cases, repository refresh integration, and old-projector absence from production authority paths.
- No compatibility fallback remains.
- Implementer Report documents all changed files and validation.

## Manual Validation After Implementer

After implementation and Architect Review, Operator validation should include:

1. Launch or refresh the ChampCity_AI workspace.
2. Confirm the app shows a kernel-derived current action rather than a stale projector-derived action.
3. Confirm the current action names source artifacts and expected output clearly.
4. Confirm ambiguous or missing evidence produces a visible blocker rather than a guessed action.
5. Confirm reference navigation does not retarget the current action.
6. Confirm no old projector fallback is presented as an available authority path.
7. Confirm automated validation results are recorded in the Implementer Report.

## Remaining Passes After WC02

- WC03 ? Real Phase 04/05 Replay Fixture and No-Fallback Repository Gates.
- WC04 ? Artifact Registry and Workflow State Diagnostic Boundary.
- WC05 ? Kernel-to-UI Current Action Adapter.
- WC06 ? Operator Validation of Kernel-Derived Current Action and Phase Closeout Readiness.

## Document Disposition
Document.Status=Pending
