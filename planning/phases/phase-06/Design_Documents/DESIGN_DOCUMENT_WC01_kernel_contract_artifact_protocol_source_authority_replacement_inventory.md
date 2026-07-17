<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
  "artifactType": "design_document",
  "schemaVersion": "champcity.artifact.v1",
  "revision": 1,
  "status": "completed",
  "projectId": "champcity-ai",
  "phaseId": "phase-06",
  "workCardId": "WC01",
  "createdAt": "2026-07-17T03:55:00.000Z",
  "updatedAt": "2026-07-17T03:55:00.000Z",
  "jsonPath": "planning/phases/phase-06/Design_Documents/DESIGN_DOCUMENT_WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.json",
  "markdownPath": "planning/phases/phase-06/Design_Documents/DESIGN_DOCUMENT_WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC01",
  "payloadHash": "sha256:48cbc532f419bfd1c1ffe97901198d5143d70a1c130fa73ba173d37a9d743c2c",
  "relationships": {
    "sources": [
      "champcity-ai/phase-06/work_card/WC01",
      "champcity-ai/phase-06/approval/WC01",
      "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
      "champcity-ai/phase-06/phase_planning/Phase_Planning",
      "champcity-ai/phase-05/roadmap_rebaseline/WC03",
      "champcity-ai/project/design_document/artifact_authority_model",
      "champcity-ai/project/architecture/workflow_authority_contract"
    ],
    "expectedOutputs": [],
    "supersedes": [],
    "children": []
  },
  "payload": {
    "kind": "design_document",
    "title": "Design Document: Phase 06 WC01 Kernel Contract and Replacement Inventory"
  }
}
-->

# Design Document: Phase 06 WC01 Kernel Contract and Replacement Inventory

Status: completed
Phase: phase-06 - Workflow Kernel and Artifact Protocol Replacement
Work Card: WC01
Owner: Implementer
Change boundary: documentation and source review only; no source-code changes authorized

## Purpose

This document defines the Phase 06 target workflow kernel contract, artifact-transition protocol, supported artifact types, authority rules, blocker model, and source authority Replacement Inventory required before WC02 through WC05 implementation starts.

The governing decision is that ChampCity A/I must stop treating the old evidence projector, Artifact Registry, Workflow State, renderer state, filename patterns, timestamp order, suffixes, or fallback builders as workflow authority. The target authority is one relationship-driven kernel that evaluates verified repository evidence and explicit human decisions.

## Source Authorities Reviewed

Primary planning and architecture sources reviewed:

- `planning/phases/phase-06/Phase_Activation.{json,md}`
- `planning/phases/phase-06/Phase_Planning.{json,md}`
- `planning/phases/phase-06/Work_Card_Plan.{json,md}`
- `planning/phases/phase-06/Operator_Phase_Approval.{json,md}`
- `planning/phases/phase-06/Work_Cards/WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.{json,md}`
- `planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.{json,md}`
- `planning/phases/phase-05/Roadmap_Rebaseline/ROADMAP_REBASELINE_WC03_release_candidate_roadmap.{json,md}`
- `planning/project/Design_Documents/ARTIFACT_AUTHORITY_MODEL.md`
- `docs/architecture/WORKFLOW_AUTHORITY_CONTRACT.md`

Source-code authority surfaces reviewed:

- `src/main/workflow/`
- `src/shared/workflow/`
- `src/main/workCards/`
- `src/shared/workCards/`
- `src/main/repository/`
- `src/main/projects/`
- relevant IPC, preload, and renderer current-action bindings
- repository gates and tests under `scripts/` and `test/`

## Target Kernel Contract

The Phase 06 kernel is the only runtime component authorized to compute the governed current action. It must be a deterministic resolver over evidence and rules: given a verified artifact graph snapshot, project/workspace context, transition-rule definitions, explicit role gates, and artifact relationships, it returns either one authorized current action or a blocking result.

Required kernel input:

- project identity and planning root
- verified JSON/Markdown artifact pairs and payload hashes
- artifact IDs, artifact types, revisions, status, phase ID, work card ID, paths, and relationships
- explicit source, expected output, supersedes, and child relationships
- human decision artifacts such as approvals, reviews, validations, dispositions, and closeouts
- role gate definitions for Architect, Implementer, and Operator
- transition-rule definitions for the active phase/workflow
- diagnostic cache snapshots only as diagnostics, never as overriding authority

Required kernel output:

- `kind: current_action` or `kind: blocked`
- current phase, work card, target artifact, source artifacts, expected output artifact, and role
- exact JSON and Markdown paths for the expected output when an output write is authorized
- route/screen hint for presentation only
- blockers with stable codes and evidence references
- diagnostic evidence summary, including ignored stale caches if relevant
- no synthesized artifact IDs when the expected output is absent

The kernel must not inspect file modification time, directory order, newest-file heuristics, UI state, route aliases, screen state, or cached registry state to choose the current action.

## Artifact Transition Protocol

Every governed transition must be represented by verified artifacts and relationships. A transition rule must name the lifecycle position, role allowed to act, required source artifacts or relationship predicates, required statuses and artifact types, expected output artifact ID/type/path pair, produced status, next candidates, and blockers for missing, stale, superseded, duplicated, ambiguous, or unsynchronized evidence.

Transition execution protocol:

1. Refresh the repository and verify artifact pairs.
2. Build a verified artifact graph from synchronized JSON/Markdown pairs.
3. Evaluate transition rules against explicit relationships and statuses.
4. Apply role gates and blocking conditions.
5. Emit one current action or a blocked result.
6. Route UI/process invocation from the kernel result only.
7. Write governed outputs only through the exact kernel expected-output binding.
8. Recompute after writes; do not advance from local UI state.

## Supported Artifact Types

Phase 06 kernel rules must initially support these artifact types:

- `phase_activation`
- `phase_planning`
- `work_card_plan`
- `work_card`
- `operator_approval`
- `design_document`
- `implementer_report`
- `architect_review`
- `operator_validation`
- `candidate_disposition`
- `repair_work_card`
- `phase_closeout`
- `project_state`
- `project_roadmap`
- `project_observation_register`

Additional artifact types may be added only by explicit transition-rule update and matching validation coverage. Unknown artifact types may be read as evidence, but they must not advance governed workflow unless a rule names them.

## Authority Rules

The kernel is authoritative for current action. Verified artifact pairs are authoritative evidence. Explicit artifact relationships are authoritative links. Role gates are authoritative constraints. Artifact Registry and Workflow State are diagnostic/cache until a later kernel rule gives them a narrower role.

The following are prohibited as current-action authority:

- synthetic artifact ID construction
- filename, slug, suffix, or title inference
- timestamp or directory-order selection
- newest-file defaults
- renderer-selected route state
- reference navigation state
- stale IPC binding cache
- Artifact Registry cache override
- Workflow State override
- compatibility fallback without a named supported consumer and sunset plan

## Blocking And Ambiguity Model

The kernel must block rather than guess when evidence is incomplete or contradictory. Minimum blocker codes:

- `missing_required_source`
- `missing_expected_output_binding`
- `unsynchronized_artifact_pair`
- `payload_hash_mismatch`
- `duplicate_artifact_id`
- `ambiguous_current_action`
- `superseded_candidate`
- `stale_cache_ignored`
- `role_not_authorized`
- `route_binding_mismatch`
- `unknown_transition_rule`
- `manual_validation_required`

A blocked result must include the evidence that caused the block and the role expected to resolve it when known. It must not provide a write-capable expected output unless the output is exactly authorized.

## Replacement Inventory

| Module / code path | Classification | Authority problem | Required action | Owner |
| --- | --- | --- | --- | --- |
| `src/main/workflow/evidenceDerivedWorkflowProjector.ts` | Replace | Old primary current-action authority; uses hard-coded phase/work-card branches and synthetic expected-output IDs. | Replace with the relationship-driven kernel; remove runtime use after WC02. | WC02 |
| `src/shared/workflow/transitionEngine.ts` | Migrate | Useful transition checks are mixed with mutable state advancement and synthetic current-step assumptions. | Preserve blocker concepts; make transition output a kernel result over verified evidence. | WC02 |
| `src/shared/workflow/processContract.ts` | Migrate | Exact output binding is useful, but current terminology can imply registry authority. | Rebase contract on kernel transition rules and exact expected-output bindings. | WC02 |
| `src/main/workflow/routedProcessInvocationService.ts` | Migrate | Strong route/role/screen/output guards currently consume old current-action bindings. | Keep guards; source all bindings from the kernel and reject synthesized routes. | WC02/WC05 |
| `src/main/workflow/routedWriteScope.ts` | Preserve | Write-scope enforcement is useful when caller bindings are authoritative. | Continue requiring exact kernel-provided output binding. | WC02/WC05 |
| `src/main/workflow/processIpcPolicy.ts` | Migrate | Static routed IPC policy can drift from supported kernel transitions. | Verify or derive routed permissions from kernel transitions; keep non-routed exceptions explicit. | WC02/WC05 |
| `src/shared/workflow/workflowContracts.ts` | Migrate | Presentation DTOs can blur UI state with workflow authority. | Make DTOs projections of immutable kernel results with source evidence and blockers. | WC02/WC05 |
| `src/shared/workflow/roleGates.ts` | Preserve | Role gate rules are valid constraints. | Inject role decisions into kernel evaluation and blocker reporting. | WC02/WC05 |
| `src/shared/workflow/evidencePrecedence.ts` | Migrate | Useful precedence rules could become competing authority if read directly. | Move precedence into kernel evidence reduction and ambiguity blocking. | WC02 |
| `src/main/repository/verifiedArtifactGraph.ts` | Migrate | Pair verification and graph semantics are essential evidence, but graph diagnostics must not select routes. | Expose verified graph snapshots to the kernel; keep final route selection in the kernel. | WC02/WC04 |
| `src/main/repository/repositoryRefreshService.ts` | Migrate | Refresh currently bridges repository evidence to the old projector. | Replace projector projection with kernel evaluation over verified graph evidence. | WC02/WC04 |
| `src/main/workflow/canonicalRoutedScreenAdapter.ts` | Replace | Uses Artifact Registry and some slug/title-derived outputs as route authority. | Replace with kernel-to-screen adapter using exact target/source/output IDs. | WC04/WC05 |
| `src/main/workCards/canonicalWorkflowAuthority.ts` | Migrate | App-facing authority surface delegates through old current-action and registry-backed paths. | Turn into a kernel consumer/adapter only; remove action construction. | WC05 |
| `src/main/workCards/workCardFileStore.ts` | Migrate | Canonical pair writes are useful; workflow selection can rely on file discovery, mtimes, or generated IDs. | Keep durable writes; require kernel expected-output binding for governed workflow writes. | WC03/WC05 |
| `src/shared/workCards/currentActionProjection.ts` | Migrate | Legacy projection fields invite reconstruction of action identity. | Map exact kernel DTOs only; remove partial legacy identity construction. | WC05 |
| `src/shared/workCards/currentActionRouteTable.ts` | Migrate | Duplicated route table and aliases can drift from kernel-supported actions. | Generate or validate routes against kernel transitions; aliases cannot authorize obsolete actions. | WC05 |
| `src/shared/workCards/architectReviewRecord.ts` | Migrate | Exact binding checks are useful, but manual fallback can bypass routed lifecycle authority. | Require kernel-routed binding for governed Architect Review lifecycle saves. | WC05 |
| `src/shared/workCards/validationRecord.ts` | Migrate | Operator decisions are data, not route authority by themselves. | Route validation transitions through kernel rules; keep validation IDs as record IDs only. | WC05/Phase 10 |
| `src/shared/workCards/routeReviewRequest.ts` | Preserve | Valid as request evidence, not authority. | Keep non-authoritative; kernel may surface it as blocker or repair evidence. | WC05/Phase 10 |
| `src/preload/index.ts` | Migrate | Cached routed action binding is useful as a stale-write guard but cannot be authority. | Expose kernel result/binding tokens and reject stale or mismatched writes. | WC05 |
| `src/renderer/app/WorkflowRouterShell.tsx and src/renderer/app/App.tsx` | Migrate | Renderer state and reference navigation must not retarget current action. | Render kernel current action and keep reference navigation visibly separate. | WC05 |
| `src/main/projects/projectWorkspaceRegistry.ts and src/main/repository/repositoryObserver.ts` | Preserve | Project isolation and observation are inputs, not route authority. | Continue feeding project context and refresh events into kernel evaluation. | WC04/Phase 11 |
| `src/shared/artifacts/* and src/main/artifacts/*` | Migrate | Pair validation is evidence; registry records are diagnostic/cache until kernel-defined. | Preserve hashes and transactions; block registry cache override of verified graph evidence. | WC04 |
| `planning/system/Workflow_State/WORKFLOW_STATE_INDEX.*` | Defer | Workflow State is diagnostic/cache until the kernel defines a future role. | If emitted, make it derived projection data that cannot override newer verified evidence. | WC04 |
| `scripts/verify-wc09-repository-gates.mjs and related gates` | Replace | Old WC09 scope misses Phase 06 old/new dual-authority risks. | Replace with Phase 06 no-fallback, pair-sync, no-local-path, and stale-cache gates. | WC03 |
| `test/wc01-repair01, test/wc02-repair02, test/wc09, and workflow-related tests` | Migrate | Some tests encode projector fallback behavior. | Rewrite useful scenarios as kernel replay and no-fallback regression coverage. | WC03 |
| `Implementer execution packet and handoff rendering surfaces` | Defer | Useful for later Implementer contract hardening, not Phase 06 route authority. | Do not let packet rendering select current action; later derive packets from kernel results. | Phase 09 |

## Detailed Inventory Data

### 1. src/main/workflow/evidenceDerivedWorkflowProjector.ts

- Classification: Replace
- Current authority problem: Old primary current-action authority; uses hard-coded phase/work-card branches and synthetic expected-output IDs.
- Named supported consumer: None as old authority.
- Migration requirement: Replace with the relationship-driven kernel; remove runtime use after WC02.
- Deletion/removal requirement: Remove old runtime authority after replacement coverage exists.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC02

### 2. src/shared/workflow/transitionEngine.ts

- Classification: Migrate
- Current authority problem: Useful transition checks are mixed with mutable state advancement and synthetic current-step assumptions.
- Named supported consumer: None as old authority.
- Migration requirement: Preserve blocker concepts; make transition output a kernel result over verified evidence.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC02

### 3. src/shared/workflow/processContract.ts

- Classification: Migrate
- Current authority problem: Exact output binding is useful, but current terminology can imply registry authority.
- Named supported consumer: None as old authority.
- Migration requirement: Rebase contract on kernel transition rules and exact expected-output bindings.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC02

### 4. src/main/workflow/routedProcessInvocationService.ts

- Classification: Migrate
- Current authority problem: Strong route/role/screen/output guards currently consume old current-action bindings.
- Named supported consumer: None as old authority.
- Migration requirement: Keep guards; source all bindings from the kernel and reject synthesized routes.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC02/WC05

### 5. src/main/workflow/routedWriteScope.ts

- Classification: Preserve
- Current authority problem: Write-scope enforcement is useful when caller bindings are authoritative.
- Named supported consumer: Listed current or migrated consumer only.
- Migration requirement: Continue requiring exact kernel-provided output binding.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC02/WC05

### 6. src/main/workflow/processIpcPolicy.ts

- Classification: Migrate
- Current authority problem: Static routed IPC policy can drift from supported kernel transitions.
- Named supported consumer: None as old authority.
- Migration requirement: Verify or derive routed permissions from kernel transitions; keep non-routed exceptions explicit.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC02/WC05

### 7. src/shared/workflow/workflowContracts.ts

- Classification: Migrate
- Current authority problem: Presentation DTOs can blur UI state with workflow authority.
- Named supported consumer: None as old authority.
- Migration requirement: Make DTOs projections of immutable kernel results with source evidence and blockers.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC02/WC05

### 8. src/shared/workflow/roleGates.ts

- Classification: Preserve
- Current authority problem: Role gate rules are valid constraints.
- Named supported consumer: Listed current or migrated consumer only.
- Migration requirement: Inject role decisions into kernel evaluation and blocker reporting.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC02/WC05

### 9. src/shared/workflow/evidencePrecedence.ts

- Classification: Migrate
- Current authority problem: Useful precedence rules could become competing authority if read directly.
- Named supported consumer: None as old authority.
- Migration requirement: Move precedence into kernel evidence reduction and ambiguity blocking.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC02

### 10. src/main/repository/verifiedArtifactGraph.ts

- Classification: Migrate
- Current authority problem: Pair verification and graph semantics are essential evidence, but graph diagnostics must not select routes.
- Named supported consumer: None as old authority.
- Migration requirement: Expose verified graph snapshots to the kernel; keep final route selection in the kernel.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC02/WC04

### 11. src/main/repository/repositoryRefreshService.ts

- Classification: Migrate
- Current authority problem: Refresh currently bridges repository evidence to the old projector.
- Named supported consumer: None as old authority.
- Migration requirement: Replace projector projection with kernel evaluation over verified graph evidence.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC02/WC04

### 12. src/main/workflow/canonicalRoutedScreenAdapter.ts

- Classification: Replace
- Current authority problem: Uses Artifact Registry and some slug/title-derived outputs as route authority.
- Named supported consumer: None as old authority.
- Migration requirement: Replace with kernel-to-screen adapter using exact target/source/output IDs.
- Deletion/removal requirement: Remove old runtime authority after replacement coverage exists.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC04/WC05

### 13. src/main/workCards/canonicalWorkflowAuthority.ts

- Classification: Migrate
- Current authority problem: App-facing authority surface delegates through old current-action and registry-backed paths.
- Named supported consumer: None as old authority.
- Migration requirement: Turn into a kernel consumer/adapter only; remove action construction.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC05

### 14. src/main/workCards/workCardFileStore.ts

- Classification: Migrate
- Current authority problem: Canonical pair writes are useful; workflow selection can rely on file discovery, mtimes, or generated IDs.
- Named supported consumer: None as old authority.
- Migration requirement: Keep durable writes; require kernel expected-output binding for governed workflow writes.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC03/WC05

### 15. src/shared/workCards/currentActionProjection.ts

- Classification: Migrate
- Current authority problem: Legacy projection fields invite reconstruction of action identity.
- Named supported consumer: None as old authority.
- Migration requirement: Map exact kernel DTOs only; remove partial legacy identity construction.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC05

### 16. src/shared/workCards/currentActionRouteTable.ts

- Classification: Migrate
- Current authority problem: Duplicated route table and aliases can drift from kernel-supported actions.
- Named supported consumer: None as old authority.
- Migration requirement: Generate or validate routes against kernel transitions; aliases cannot authorize obsolete actions.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC05

### 17. src/shared/workCards/architectReviewRecord.ts

- Classification: Migrate
- Current authority problem: Exact binding checks are useful, but manual fallback can bypass routed lifecycle authority.
- Named supported consumer: None as old authority.
- Migration requirement: Require kernel-routed binding for governed Architect Review lifecycle saves.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC05

### 18. src/shared/workCards/validationRecord.ts

- Classification: Migrate
- Current authority problem: Operator decisions are data, not route authority by themselves.
- Named supported consumer: None as old authority.
- Migration requirement: Route validation transitions through kernel rules; keep validation IDs as record IDs only.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC05/Phase 10

### 19. src/shared/workCards/routeReviewRequest.ts

- Classification: Preserve
- Current authority problem: Valid as request evidence, not authority.
- Named supported consumer: Listed current or migrated consumer only.
- Migration requirement: Keep non-authoritative; kernel may surface it as blocker or repair evidence.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC05/Phase 10

### 20. src/preload/index.ts

- Classification: Migrate
- Current authority problem: Cached routed action binding is useful as a stale-write guard but cannot be authority.
- Named supported consumer: None as old authority.
- Migration requirement: Expose kernel result/binding tokens and reject stale or mismatched writes.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC05

### 21. src/renderer/app/WorkflowRouterShell.tsx and src/renderer/app/App.tsx

- Classification: Migrate
- Current authority problem: Renderer state and reference navigation must not retarget current action.
- Named supported consumer: None as old authority.
- Migration requirement: Render kernel current action and keep reference navigation visibly separate.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC05

### 22. src/main/projects/projectWorkspaceRegistry.ts and src/main/repository/repositoryObserver.ts

- Classification: Preserve
- Current authority problem: Project isolation and observation are inputs, not route authority.
- Named supported consumer: Listed current or migrated consumer only.
- Migration requirement: Continue feeding project context and refresh events into kernel evaluation.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC04/Phase 11

### 23. src/shared/artifacts/* and src/main/artifacts/*

- Classification: Migrate
- Current authority problem: Pair validation is evidence; registry records are diagnostic/cache until kernel-defined.
- Named supported consumer: None as old authority.
- Migration requirement: Preserve hashes and transactions; block registry cache override of verified graph evidence.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC04

### 24. planning/system/Workflow_State/WORKFLOW_STATE_INDEX.*

- Classification: Defer
- Current authority problem: Workflow State is diagnostic/cache until the kernel defines a future role.
- Named supported consumer: Future owner listed in implementation owner.
- Migration requirement: If emitted, make it derived projection data that cannot override newer verified evidence.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC04

### 25. scripts/verify-wc09-repository-gates.mjs and related gates

- Classification: Replace
- Current authority problem: Old WC09 scope misses Phase 06 old/new dual-authority risks.
- Named supported consumer: None as old authority.
- Migration requirement: Replace with Phase 06 no-fallback, pair-sync, no-local-path, and stale-cache gates.
- Deletion/removal requirement: Remove old runtime authority after replacement coverage exists.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC03

### 26. test/wc01-repair01, test/wc02-repair02, test/wc09, and workflow-related tests

- Classification: Migrate
- Current authority problem: Some tests encode projector fallback behavior.
- Named supported consumer: None as old authority.
- Migration requirement: Rewrite useful scenarios as kernel replay and no-fallback regression coverage.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: WC03

### 27. Implementer execution packet and handoff rendering surfaces

- Classification: Defer
- Current authority problem: Useful for later Implementer contract hardening, not Phase 06 route authority.
- Named supported consumer: Future owner listed in implementation owner.
- Migration requirement: Do not let packet rendering select current action; later derive packets from kernel results.
- Deletion/removal requirement: Remove any fallback path that competes with the kernel.
- Tests or gates needed: prove no old/new dual authority, no synthetic ID route, no stale cache override, and exact output binding.
- Implementation owner: Phase 09

## Implementation Ownership Mapping

WC02 owns the relationship-driven kernel, replacement of the evidence projector, transition-rule evaluation, core process contract migration, and resolver-level no-fallback tests.

WC03 owns real Phase 04/05 replay fixtures and repository gates that detect old/new dual authority, synthetic ID generation, fallback route authority, stale registry/workflow-state override, and obsolete WC09 gate assumptions.

WC04 owns the Artifact Registry and Workflow State diagnostic/cache boundary, repository refresh integration, and verified artifact graph integration so diagnostics cannot override newer verified evidence.

WC05 owns kernel-to-UI/current-action adapters, IPC/preload binding enforcement, renderer presentation, reference-navigation separation, and routed write binding at the UI/process boundary.

Later roadmap phases own validation/evidence governance, repair governance, multi-project dogfooding, Implementer packet hardening, and Git automation beyond the Phase 06 kernel boundary.

## Validation And Gate Recommendations

Phase 06 implementation should add or update gates for:

- JSON/Markdown pair synchronization and payload hashes
- duplicate artifact IDs and unsynchronized pairs
- no concrete local paths in durable artifacts
- no secrets, tokens, credentials, or .env artifacts
- no synthetic workflow artifact ID construction in current-action code
- no filename, suffix, timestamp, or directory-order route selection
- no Artifact Registry or Workflow State current-action override
- no renderer/reference-navigation retargeting
- no routed process invocation without exact kernel binding
- real repository replay for Phase 04 closeout, Phase 05 rebaseline, Phase 06 activation, and WC01 completion

## Acceptance Notes

This WC01 output is intentionally architectural. It does not edit source code, delete old code, add tests, or run implementation validation. WC02 through WC05 must use this inventory as a starting authority and record any narrowed, amended, or newly discovered entries in their Implementer Reports.