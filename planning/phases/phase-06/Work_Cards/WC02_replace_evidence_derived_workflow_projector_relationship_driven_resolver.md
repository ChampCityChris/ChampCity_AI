# Work Card: Phase 06 WC02 — Replace EvidenceDerivedWorkflowProjector with Relationship-Driven Resolver

Status: draft_for_operator_review
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC02
Owner: Implementer
Risk: critical
Change strategy: Implementation; replacement of old workflow authority with relationship-driven kernel/resolver

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

## Required Old-Authority Removal

Remove or disable runtime use of `evidenceDerivedWorkflowProjector.ts` as current-action authority. Do not leave it as a fallback resolver.

Permitted outcomes:

- delete the old projector if no needed non-authoritative utilities remain;
- split out reusable pure utilities only if they do not select current action;
- leave a non-runtime historical reference only if no production path imports or invokes it.

Not permitted:

- keeping the old projector as fallback;
- constructing synthetic expected output IDs;
- selecting current action from filename, suffix, timestamp, directory order, route alias, renderer state, registry cache, or Workflow State cache;
- silently preserving old authority because tests still depend on it.

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
- repository refresh uses the new resolver result.

WC03 will own broad Phase 04/05 replay fixtures and repository gates. WC02 must still include enough focused coverage to prove the resolver replacement is real.

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
- old-authority removal explanation;
- tests added/updated;
- validation commands and results;
- skipped validation and reasons;
- remaining risks;
- final git status;
- commit hash.

## Acceptance Criteria

- The old projector no longer controls runtime current-action authority.
- The new resolver computes current action from verified artifact graph evidence and explicit relationships.
- Missing or ambiguous evidence blocks visibly instead of guessing.
- No synthetic artifact ID construction satisfies an expected output.
- Artifact Registry and Workflow State cannot override verified graph evidence.
- Repository refresh uses the new resolver result.
- Tests cover resolver success and blocker cases.
- No compatibility fallback remains without named supported consumer, explicit approval, and removal plan.
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

- WC03 — Real Phase 04/05 Replay Fixture and No-Fallback Repository Gates.
- WC04 — Artifact Registry and Workflow State Diagnostic Boundary.
- WC05 — Kernel-to-UI Current Action Adapter.
- WC06 — Operator Validation of Kernel-Derived Current Action and Phase Closeout Readiness.
