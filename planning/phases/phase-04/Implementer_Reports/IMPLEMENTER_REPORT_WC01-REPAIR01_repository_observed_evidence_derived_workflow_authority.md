<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/implementer_report/WC01-REPAIR01-repository-observed-evidence-derived-workflow-authority",
  "artifactType": "implementer_report",
  "createdAt": "2026-07-15T21:25:29.137Z",
  "jsonPath": "planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_repository_observed_evidence_derived_workflow_authority.json",
  "markdownPath": "planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_repository_observed_evidence_derived_workflow_authority.md",
  "parentArtifactId": "champcity-ai/phase-04/work_card/WC01",
  "payload": {
    "kind": "implementer_report",
    "title": "Implementer Report: WC01-REPAIR01 Repository-Observed Evidence-Derived Workflow Authority"
  },
  "payloadHash": "sha256:515d8d93d1ddcbef819325c9ce1b0cab6ec84ce953a4ed22181a37cf6565e22c",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-04/architect_review/WC01-REPAIR01"
    ],
    "sources": [
      "champcity-ai/phase-04/work_card/WC01-REPAIR01",
      "champcity-ai/phase-04/architecture_decision/WC01",
      "champcity-ai/phase-04/diagnostic_report/WC01"
    ],
    "supersedes": [
      "champcity-ai/phase-04/implementer_report/WC01-REPAIR01"
    ]
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-15T22:26:09.741Z",
  "workCardId": "WC01-REPAIR01"
}
-->

# Implementer Report: WC01-REPAIR01 Repository-Observed Evidence-Derived Workflow Authority

Status: completed, awaiting Architect review and Operator acceptance
Pass type: numbered repair Work Card implementation
Parent acceptance target: WC01 as completed_via_repair
Repository path inspected: verified approved repo root
Branch: feature/phase-04-wc01-repair01-evidence-derived-workflow
Remote: origin matched the approved public ChampCityChris/ChampCity_AI repository
Intended commit message: Replace snapshot authority with repository evidence projection
Commit created: no
Commit hash: pending until commit is created
Push status: pending final commit

## Implementation summary

ChampCity A/I now derives its routed workflow from synchronized canonical artifact pairs observed in the selected repository. A persistent multi-project workspace registry selects an isolated repository root. One verified artifact graph classifies controlling and historical evidence and reports invalid, incomplete, duplicate, conflicting, project-mismatched, or branch-mismatched authority. One evidence-derived projector combines that graph with the locked process contract, role gates, explicit governed decisions, and repair policy. Startup, focus, project switching, watcher events, manual refresh, external writes, and routed in-app writes all converge on the same refresh/projector path.

The legacy CurrentRequiredAction evaluator, persisted Workflow State runtime store/adapter, independent transition writers, obsolete mounted fixtures, and old evaluator validation scripts were deleted. The old Workflow State pair remains untouched historical evidence and cannot override a repository scan. The durable Artifact Registry remains a synchronized audit/index for canonical app writes but is not required to discover valid external pairs.

## Canonical preflight and governance

- Verified the approved repo root, origin, starting feature branch, exact lineage, and worktree.
- Preserved the expected Architect-authored Diagnostic Report and Architect Review evidence.
- Verified the Diagnostic Report and Architect Review pairs as synchronized.
- Confirmed the rejected predecessor repair pair was unregistered and invalid because its payload hash did not match its content.
- Created and registered the approved architecture decision and replacement WC01-REPAIR01 pair through ArtifactPairService before deleting the rejected pair.
- Preserved the earlier report as historical and gave this replacement report a distinct canonical identity that supersedes it.
- WC01-REPAIR02 was not created.

## Files created

- planning/phases/phase-04/Architecture_Decisions/ARCHITECTURE_DECISION_WC01_repository_observed_evidence_derived_multi_project_workflow.{md,json}
- planning/phases/phase-04/Work_Cards/WC01-REPAIR01_repository_observed_evidence_derived_workflow_authority.{md,json}
- planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_repository_observed_evidence_derived_workflow_authority.{md,json}
- src/shared/projects/index.ts and projectWorkspace.ts
- src/main/projects/index.ts and projectWorkspaceRegistry.ts
- src/main/repository/index.ts, verifiedArtifactGraph.ts, repositoryRefreshService.ts, and repositoryObserver.ts
- src/main/workflow/evidenceDerivedWorkflowProjector.ts
- src/shared/workCards/currentActionProjection.ts
- scripts/verify-wc01-mounted-evidence-workflow.cjs
- test/wc01-repair01/evidence-workflow.test.cjs

## Architect-authored files preserved for this commit

- planning/phases/phase-04/Architect_Reviews/ARCHITECT_REVIEW_WC01_canonical_routed_screen_cutover_and_legacy_projection_retirement.{md,json}

## Files modified

- docs/architecture/ARTIFACT_PAIR_AND_REVISION_STANDARD.md
- docs/architecture/ROLE_GATE_CONTRACT.md
- docs/architecture/ROUTED_ACTION_CONTRACT.md
- docs/architecture/WORKFLOW_AUTHORITY_CONTRACT.md
- package.json
- planning/system/Artifact_Registry/ARTIFACT_REGISTRY.{md,json}
- scripts/verify-wc06-workflow-visibility.mjs
- scripts/verify-wc09-repository-gates.mjs
- src/main/artifacts/artifactPairContracts.ts and artifactPairService.ts
- src/main/canonicalRuntime.ts and src/main/main.ts
- src/main/contextPackets/contextPacketService.ts and currentContextPacketCompiler.ts
- src/main/workCards/canonicalWorkflowAuthority.ts and workCardFileStore.ts
- src/main/workflow/canonicalRoutedScreenAdapter.ts, index.ts, routedActionService.ts, and routedProcessInvocationService.ts
- src/preload/index.ts
- src/renderer/app/App.tsx and WorkflowRouterShell.tsx
- src/renderer/global.d.ts
- src/shared/contextPackets/contextPacket.ts
- src/shared/workCards/artifactReviewWorkspace.ts, currentStepContextInspector.ts, validateImplementerReport.ts, and workflowVisibility.ts
- src/shared/workflow/workflowContracts.ts

## Deletion ledger

| Deleted file or authority | Reason | Replacement | Proof no production consumer remains |
| --- | --- | --- | --- |
| src/shared/workCards/currentRequiredAction.ts evaluator | Snapshot/status/filename authority duplicated repository evidence | EvidenceDerivedWorkflowProjector; presentation-only contracts moved to currentActionProjection.ts | TypeScript build passed; repository gate rejects the legacy import/name in production authority files |
| src/main/workflow/workflowStateStore.ts | Persisted Workflow State was startup/runtime selector authority | RepositoryRefreshService projection provider | TypeScript build and all routed tests passed; production import gate passed |
| src/main/workflow/workflowStateArtifactPort.ts | Runtime adapter gave the snapshot pair controlling authority | VerifiedArtifactGraph plus derived registry view | TypeScript build and stale-cache non-authority test passed |
| RoutedProcessInvocationService independent state transition | In-app writes used a second transition path | Shared refreshAfterWrite callback | Real Electron save advanced only after repository refresh |
| CanonicalWorkflowAuthority Workflow State commit | Architect Review save could bypass repository observation | Canonical pair write followed by shared refresh/projector | Mounted Electron initial and restart proofs passed |
| test/wc09/workflow-authority.test.cjs | Contradictory snapshot-authority fixture | test/wc01-repair01/evidence-workflow.test.cjs | Replacement unit suite passed 37/37 |
| test/wc09/cross-process-routed-invocation.test.cjs | Fixture began after the failed discovery boundary | Real main/preload/renderer Electron verifier | Two independent Electron processes passed |
| scripts/verify-wc01-mounted-canonical-architect-review.cjs | Seeded the removed store directly | verify-wc01-mounted-evidence-workflow.cjs | Full renderer lane passed initial and restart modes |
| scripts/verify-work-card-fixture.mjs | Imported the deleted evaluator | Verified graph/projector unit scenarios | Full unit lane passed |
| scripts/verify-wc08-repair01-route-context-explanation.mjs | Read the deleted selector source as authority | Projector binding metadata and Current Step formatter | Repository gate and build passed |
| scripts/verify-wc08-repair03-pending-repair-validation-routing.mjs | Invoked the deleted selector | Explicit repair/validation graph scenarios | Explicit-decision and repair-limit tests passed |
| scripts/verify-wc08-repair04-controlled-route-recovery.mjs | Invoked the deleted selector | Evidence precedence plus projector tests | WC09 regression and repair-reopen tests passed |
| Rejected unregistered WC01-REPAIR01 pair | Invalid payload hash and superseded scope | Registered replacement Work Card pair | Replacement pair re-read and registry verification passed before deletion |

No production code imports the offline WC09 migration projector. Migration code remains isolated under scripts/migration for explicitly invoked historical migration only.

## Acceptance matrix

| # | Requirement | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Exactly one production workflow authority path | Pass | Runtime composition and repository import gate |
| 2 | Persistent configured-project registry | Pass | Registry persistence/selection unit test |
| 3 | Add, validate, list, select, and switch projects without restart | Pass | IPC/UI implementation and project-switch isolation test |
| 4 | Strict selected-project root isolation | Pass | Two-repository isolation test |
| 5 | Automatic observation with debounced pair writes | Pass | Observer debounce test |
| 6 | Explicit Refresh Repository State | Pass | Main/preload/renderer IPC and mounted Electron proof |
| 7 | Focus, reopen, switch, and branch rescans | Pass | Runtime focus hook, restart/switch/branch tests |
| 8 | Stable complete-pair verification and transaction-file filtering | Pass | Verified graph scanner and pair tests |
| 9 | Visible incomplete, invalid, duplicate, relationship, and branch blockers | Pass | Graph blocker and branch-mismatch tests |
| 10 | External canonical pairs discovered without registry import or mutation | Pass | External WC01 report/review/validation tests |
| 11 | Artifact Registry treated as index/cache, not selector | Pass | Unregistered external report routing test |
| 12 | Deterministic evidence-derived projector with exact bindings | Pass | WC01 exact route and WC09-REPAIR02 regression tests |
| 13 | Explicit governed decisions and repair limits | Pass | Validation disposition and final-repair-limit tests |
| 14 | Persisted Workflow State cannot override newer evidence | Pass | Stale-cache and restart test |
| 15 | Unchanged scan is a no-op | Pass | Repeated fingerprint/projection-revision test |
| 16 | Current Action UI shows project, observer, changes, blockers, and action | Pass | Renderer implementation and real Electron UI refresh proof |
| 17 | Routed in-app and external writes share refresh/projector path | Pass | Runtime composition plus Electron Architect Review save |
| 18 | Reference navigation cannot retarget routed authority | Pass | Exact binding regression coverage and routed adapter boundary |
| 19 | Real relaunch recomputes and reaches Operator Validation after review | Pass | Two-process Electron initial/restart outputs |
| 20 | Parent WC01 revalidated as completed_via_repair candidate | Technically ready | All automated requirements pass; Operator acceptance remains required |

## Production reconstruction results

The focused WC01 scenario begins with the unchanged WC01 Implementer Report present and the expected Architect Review absent. Repository scan and projection produce action architect_review_of_implementer_report_required with target champcity-ai/phase-04/work_card/WC01, source champcity-ai/phase-04/implementer_report/WC01, and expected output champcity-ai/phase-04/architect_review/WC01. No report revision, registry import, or Workflow State edit occurs. External review evidence advances to Operator Validation. Repeated no-change scan preserves the projection revision; restart, switch-away-and-back, watcher rescan, manual refresh, and branch refresh all reconstruct from the selected repository.

## Commands run and results

- Repo/remote/branch/lineage/worktree inspection: passed.
- Canonical pair verification and Artifact Registry checks: passed.
- npm run validate:codex:unit, approved normal Windows lane: passed; build passed and 37/37 tests passed.
- npm run validate:codex, approved normal Windows lane: passed end to end.
- Full-lane build: passed (TypeScript plus Vite production build).
- Full-lane unit suite: 37 passed, 0 failed, 0 skipped.
- Repository gates: 12 passed, including canonical pairs, single evidence projection authority, secrets, concrete local paths, generated junk, dependency scope, and changed-file scope.
- Real Electron initial process: passed; Architect Review save refreshed to operator_validation_required.
- Real Electron second process: passed; clean restart recomputed operator_validation_required from mounted repository evidence.
- git diff --check: passed.

Execution lane: all child-process-capable validation used the approved normal Windows lane defined in docs/dev/VALIDATION_COMMAND_LANES.md. No sandbox-only validation failure was used as evidence. An earlier sandbox directory-creation EPERM during canonical preflight was rerun successfully in the approved lane.

## Validation skipped and reason

- Operator manual acceptance, visual/usability judgment, final Human Validation, and parent Work Card acceptance were not performed because Implementer authority does not include Operator acceptance.
- No release tag was created because this feature-branch Work Card does not authorize a tag.
- No merge to dev or master was performed because Architect/Operator review is required first.

## Manual validation required

The Operator must select and switch real configured projects, confirm the displayed safe repository root and observer health, visually inspect changes/blockers/current-action guidance, exercise manual refresh after an external canonical pair write, confirm Architect Review and Operator Validation usability, and decide whether parent WC01 is accepted as completed_via_repair.

## Residual risks

- Recursive filesystem observation depends on platform watcher behavior; the supported Windows lane passed, while other platforms need later compatibility validation.
- A configured external repository must remain readable and writable for routed app writes; permission failures surface as blockers/errors but were not tested against every filesystem provider.
- Electron emitted a non-fatal GPU command-buffer warning while the test windows closed; both processes exited successfully with the required assertions.
- Operator visual and workflow acceptance remains outstanding.

## Security and secret safety

No secrets, tokens, credentials, API keys, .env files, provider SDKs, cloud services, authentication, databases, connectors, or MCP integrations were added. Renderer access remains mediated by constrained preload/main IPC. Durable artifacts contain repo-relative paths or <PROJECT_REPO> only. Repository safety gates passed.

## Files intentionally not created

- WC01-REPAIR02
- Operator acceptance or final Human Validation record
- Workflow State replacement snapshot
- Release tag, merge commit, authentication, database, cloud, connector, MCP, or provider SDK files

## Git actions performed

The required feature branch is active. Commit and push are intentionally pending until this synchronized final report revision is included. The report records Commit hash: pending in accordance with the same-commit hash rule. dev and master are not merge targets for this pass.

## Dirty files before commit

All remaining changed and untracked files are the intended Work Card implementation, planning authority, synchronized report/registry updates, tests, or preserved Architect Review evidence. Generated dist output is ignored and no unrelated dirty files were found.

## Blocking questions

None.

## Parent WC01 readiness conclusion

The automated implementation and non-acceptance smoke evidence support treating WC01 as technically ready for completed_via_repair through WC01-REPAIR01. This is an Implementer readiness conclusion, not Operator acceptance. Architect review and Operator manual validation remain required.

## Recommended next Implementer task

No additional Implementer repair is recommended. Present this feature branch and report for Architect review, then let the Operator complete manual validation and the parent-WC01 acceptance decision.
