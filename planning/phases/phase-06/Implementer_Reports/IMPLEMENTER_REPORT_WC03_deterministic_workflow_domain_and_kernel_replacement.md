<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/implementer_report/WC03",
  "artifactType": "implementer_report",
  "createdAt": "2026-07-18T16:00:00.000Z",
  "jsonPath": "planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC03_deterministic_workflow_domain_and_kernel_replacement.json",
  "markdownPath": "planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC03_deterministic_workflow_domain_and_kernel_replacement.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC03",
  "payload": {
    "kind": "implementer_report",
    "title": "Implementer Report: WC03 Deterministic Workflow Domain and Kernel Replacement"
  },
  "payloadHash": "sha256:57630fb431511e4e03e09f1339bff801529f8f75c020794176103d1bae643b08",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/architect_review/WC03"
    ],
    "sources": [
      "champcity-ai/phase-06/work_card/WC03",
      "champcity-ai/phase-06/operator_approval/WC03",
      "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
      "champcity-ai/phase-06/architect_review/WC02-REPAIR03",
      "champcity-ai/phase-06/candidate_disposition/WC02",
      "champcity-ai/phase-06/work_card/WC02-REPAIR04",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR03",
      "champcity-ai/phase-06/diagnostic_report/WC02-full-workflow-resolver-foundation-top-to-bottom-review",
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T16:20:00.000Z",
  "workCardId": "WC03"
}
-->

# Implementer Report: WC03 Deterministic Workflow Domain and Kernel Replacement

Status: complete
Phase: phase-06
Work Card: WC03
Work Card kind: replacement_candidate
Pass type: numbered replacement Work Card implementation

## Repository Verification

- Repository path inspected: verified approved repo root (`<PROJECT_REPO>`).
- Repository remote verified: `https://github.com/ChampCityChris/ChampCity_AI.git`.
- Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Remote status at implementation start: branch was ahead of origin and contained approved Phase 06 planning changes.
- Branch switch, pull, reset, clean, stash, and push performed: no.
- Push authorized: no.

## Governing Artifacts Read

- `docs/handoffs/IMPLEMENTER_HANDOFF_PHASE06_WC03_deterministic_workflow_domain_and_kernel_replacement.md`
- `docs/dev/VALIDATION_COMMAND_LANES.md`
- `planning/phases/phase-06/Work_Cards/WC03_deterministic_workflow_domain_and_kernel_replacement.{json,md}`
- `planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC03_deterministic_workflow_domain_and_kernel_replacement.{json,md}`
- `planning/phases/phase-06/Work_Card_Plan.{json,md}`
- `planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.{json,md}`
- `planning/phases/phase-06/Candidate_Dispositions/CANDIDATE_DISPOSITION_WC02_authorize_full_resolver_foundation_rebuild.{json,md}`
- `planning/phases/phase-06/Work_Cards/WC02-REPAIR04_normalized_domain_single_kernel_authority_repair_route_completion.{json,md}`
- Existing WC01 design, WC02 diagnostic, and WC02-REPAIR03 Implementer Report antecedents under `planning/phases/phase-06/`.

## Scoped Review Before Edits

The WC02-era implementation still contained overlapping workflow authorities: artifact graph scan, relationship resolver projection, process contract runtime action literals, transition helpers, routed IPC variant lookup, and renderer-facing route adapters could each participate in current-action meaning. The live Phase 06 corpus also needed explicit WC03 replacement identity and synchronized planning evidence before WC03 could be proven from exact artifact relationships.

## Implementation Summary

Implemented the approved WC03 replacement foundation as four one-way layers:

1. Verified Artifact Graph remains structural and reports pair, duplicate, ownership, relationship, and status blockers without selecting workflow meaning.
2. Normalized Workflow Domain converts verified records into explicit project, phase, candidate, repair, replacement, approval, artifact, and typed relationship records.
3. Pure Workflow Kernel consumes only normalized domain objects and returns one typed current action or one typed blocker.
4. Thin adapters project the exact kernel result into existing Workflow State, routed screen, IPC, probe, and repository-gate surfaces.

## Architecture After

- Added `src/shared/workflow/workflowDomain.ts` for hard project, phase, Work Card, repair, replacement, approval, artifact, typed relationship, current-action, and Implementer assignment identities.
- Added `src/shared/workflow/workflowKernel.ts` with `resolveWorkflowKernel(domain, stateRevision)`, independent of repository, filesystem, Registry, IPC, Electron, renderer, or LLM code.
- Added `src/main/workflow/normalizedWorkflowDomainAdapter.ts` to normalize `VerifiedArtifactGraph` records into the typed domain and reject ambiguity before kernel execution.
- Replaced `src/main/workflow/relationshipDrivenWorkflowResolver.ts` with a thin adapter around normalization plus kernel projection.
- Reduced `src/shared/workflow/processContract.ts` so runtime action views are generated from the single typed action catalog.
- Removed remaining workflow-authority first-match lookups in the kernel, normalizer, resolver projection, routed IPC authorization, routed-screen authority resolution, and transition adapter.

## Hard Identity And Taxonomy

The code-owned Work Card taxonomy is exactly:

- `planned_candidate`
- `repair`
- `replacement_candidate`

Project identity uses explicit project and repository binding fields. Phase identity uses explicit sequence, predecessor/successor, activation, closeout, and status fields. Work Card identity uses explicit Work Card kind, plan order, root candidate, parent when applicable, status, and expected Implementer Report identity. Repair and replacement records require explicit authorizer, trigger/reason, lineage, plan, and expected output identities.

## Typed Relationships

The normalized domain carries typed relationships for project, phase, plan declaration, candidate implementation, repair lineage, validation triggers, review/disposition authorization, replacement lineage, report/review/validation outputs, and superseded artifacts. The kernel consumes those typed records and exact expected output IDs rather than filenames, suffixes, titles, paths, timestamps, or scan order.

## Exact WC03 Implementer Assignment

Before this report existed, the live selected repository probe compiled:

- project: `champcity-ai`
- phase: `phase-06`
- action: `implementer_execution_required`
- screen: `implementer-execution`
- target: `champcity-ai/phase-06/work_card/WC03`
- Work Card kind: `replacement_candidate`
- plan order: 3
- replaced candidate: `champcity-ai/phase-06/work_card/WC02`
- exact approval: `champcity-ai/phase-06/operator_approval/WC03`
- expected output: `champcity-ai/phase-06/implementer_report/WC03`
- blockers: none

Approval for WC02, WC02 repairs, or the phase generally does not authorize WC03 replacement execution.

## Migration Inventory And Result

Minimum Phase 06 corpus migration was applied through the approved planning artifacts already present in the worktree and synchronized as needed:

- WC02 is terminally superseded by WC03 and is not treated as successfully completed.
- WC02-REPAIR04 is superseded before approval and remains non-executable.
- WC03 is declared as `replacement_candidate` with exact replacement, disposition authorizer, plan order, and Implementer Report output fields.
- Repair fixtures and current corpus checks use explicit repair lineage fields instead of parsing `-REPAIR##`.
- Dry-run/idempotence posture: no bulk uncontrolled historical migration was attempted; changes are limited to Phase 04-06 proof and WC03 governance.
- Reversibility: all migrated artifacts are ordinary canonical JSON/Markdown pairs in version control.

## Files Created

- `src/shared/workflow/workflowDomain.ts`
- `src/shared/workflow/workflowKernel.ts`
- `src/main/workflow/normalizedWorkflowDomainAdapter.ts`
- `planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC03_deterministic_workflow_domain_and_kernel_replacement.json`
- `planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC03_deterministic_workflow_domain_and_kernel_replacement.md`

## Files Modified

- `scripts/probe-wc02-repair03-current-action.mjs`
- `scripts/verify-wc02-repair03-workflow-gates.mjs`
- `src/main/workflow/canonicalRoutedScreenAdapter.ts`
- `src/main/workflow/index.ts`
- `src/main/workflow/relationshipDrivenWorkflowResolver.ts`
- `src/main/workflow/routedProcessInvocationService.ts`
- `src/shared/workflow/index.ts`
- `src/shared/workflow/processContract.ts`
- `src/shared/workflow/transitionEngine.ts`
- `test/wc01-repair01/evidence-workflow.test.cjs`
- `test/wc02-repair03/full-workflow-resolver-foundation.test.cjs`
- Approved synchronized Phase 06 planning artifacts for the WC03 replacement bundle.

## Files Intentionally Not Created

- No WC02 repair Work Card was created.
- No Operator Validation or acceptance record was created.
- No provider SDK, authentication, database, cloud, connector, MCP, or deployment artifact was created.
- No full historical-corpus migration was created; that remains separately governed after WC03 acceptance.

## Independent Tests And Gates

Coverage now verifies hard identity, explicit phase succession, Work Card taxonomy and plan order, repair lineage, replacement lineage, no implicit child Work Cards, exact Implementer assignment, graph-to-domain normalization, pure-kernel routing, one executable catalog authority, no regex/suffix/first-match/synthetic-output authority in workflow modules, exact approval isolation, unknown-action blockers, Registry and Workflow State non-authority, project isolation, WC02 supersession, WC02-REPAIR04 non-execution, WC03 routing before report, WC03 routing after report, refresh parity, and mounted routed-screen parity.

## Validation Commands And Results

- `npm run typecheck` (normal Windows lane): passed.
- `npm run build` (normal Windows lane): passed.
- `npm run test:unit:built` (normal Windows lane): passed, 63 tests passed before report materialization.
- `node scripts/verify-wc02-repair03-workflow-gates.mjs` (normal Windows lane): passed.
- `node scripts/probe-wc02-repair03-current-action.mjs --expect-final` before this report existed (normal Windows lane): passed, routed to WC03 Implementer execution with expected report `champcity-ai/phase-06/implementer_report/WC03`.
- `node scripts/probe-wc02-repair03-current-action.mjs --expect-final` after this report existed (normal Windows lane): passed, routed to `architect_review_of_implementer_report_required`, screen `architect-review`, expected output `champcity-ai/phase-06/architect_review/WC03`, blockers none.
- `npm run test:renderer:built` after mounted fixture update (normal Windows lane): passed mounted evidence workflow initial save, mounted restart, Architect Bridge mounted check, and transition authority mounted check.
- `npm test` after report materialization (normal Windows lane): passed build, 63/63 unit tests, repository gates, and mounted Electron routed-screen checks.
- Final safety scan before staging: passed for intended WC03 source, script, test, handoff, Work Card, approval, and Implementer Report files; no credential or concrete local path findings were introduced.
- Final status before staging: intended WC03 implementation and approved Phase 06 planning files changed; unrelated superseded stub `docs/handoffs/INTEGRATION_CUSTOM_HANDOFF.md` left untracked.

## Validation Skipped

- Operator acceptance and Human Validation: skipped because Implementer is not authorized to perform Operator acceptance.
- Push: skipped because WC03 explicitly does not authorize push.

## Manual Validation Required

1. Launch ChampCity A/I against the approved repository.
2. Confirm project `champcity-ai`, phase `phase-06`, and WC03 are explicit in the current action.
3. Confirm that before this report existed the routed screen was Implementer execution for WC03.
4. Confirm that after this report exists the routed screen is Architect Review for WC03.
5. Confirm no WC02 repair or Ad Hoc Work Card Capture screen is selected as the normal route.
6. Restart and refresh the app and confirm the same route.
7. Switch configured projects and confirm no evidence or route bleed.
8. Review migrated Phase 06 evidence and confirm historical outcomes were preserved.

## Security And Secret Safety

No secrets, credentials, tokens, API keys, `.env` files, large archives, screenshots, build outputs, or concrete local machine paths are intentionally included in committed artifacts. Durable artifacts use `<PROJECT_REPO>` and repo-relative paths.

## Residual Risks

- `transitionEngine.ts` remains as a generated/presentation compatibility adapter for existing DTO consumers, but no exported mutable parallel transition engine is present and repository gates reject first-match authority in it.
- Full historical corpus migration is intentionally deferred to a separately governed task after WC03 acceptance.
- The report cannot contain its own final same-commit hash; the final response must report the actual commit hash after commit creation.

## Git Actions

- Intended commit message: `Implement Phase 06 WC03 deterministic workflow kernel`.
- Commit created: pending until final validation and staging complete.
- Commit hash: pending until commit is created, when this report is part of the same commit.
- Push performed: no.

## Recommended Next Implementer Task

Architect Review of `champcity-ai/phase-06/implementer_report/WC03`.

## Document Disposition
Document.Status=Pending
