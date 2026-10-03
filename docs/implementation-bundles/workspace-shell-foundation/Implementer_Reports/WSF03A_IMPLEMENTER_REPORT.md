# WSF03A Implementer Report

Architecture Foundation Work Card WSF03A. Branch `dev`; no fetch, push, release, migration, or dependency change. Checkpoint: pending, `WSF03A add typed Architect candidate SQL ingress`.

## Implementation

`workflow_toolbox` now advertises `status` under files.read and `submit_stage_candidate` under files.write. Submission accepts exact workflowId (1..128 characters), the six bounded Greenfield stages, optional exact scopeEntityId (1..128), and candidateJson (at most 200,000 UTF-8 bytes). The new workflow-write action is bound to the registered Project container and does not require a RepositoryCheckout. Receipt contains workflow/stage/scope, review identity/version and disposition; it exposes no approval action.

The dedicated dispatcher calls the existing structured saves: Architect Interview, Project Planning, Phase Map, Phase loop Interview/Planning, and WorkItem Planning. Repair uses the same WorkItem route. The application resolves current Workflow, approved Intake, exact Phase/WorkItem, current sources and review revisions. Models supply fifteen-section Architect semantics, planning facts/direction/criteria, Phase Map entries, Phase planning candidates, or execution boundaries/paths/proof intent/criteria. Optional supplied mechanical fields must match current application values. Exact stage, entity scope, lifecycle and phase membership are checked before saving. Existing transactional validators own semantic validation and persistence.

All supported handoffs include the existing MCP workspace binding and submission instruction. Other workflow families retain their handoff behavior. The recovered Architect final-output action uses the same instruction. No candidate textarea, schema, generic watcher, arbitrary SQL, Markdown promotion, approval mutation, Git mutation, or historical transport cleanup was introduced.

Created: src/shared/workflowCandidateContracts.ts; src/main/integrations/workflowCandidateHandoff.ts; src/main/workflow/workflowCandidateIngressService.ts. Modified: registry/workspace action contract; five structured stage handoff builders; GreenfieldArchitectWorkspace final-output instruction; two existing Agent Harness test owners; capability-map source classification. No other production files changed or deleted.

## Focused production evidence

The existing reserved-toolbox owner was extended because no production registry fixture covered typed Greenfield candidate routing. One sequential SQL fixture submits all six stages and a Repair WorkItem. Every route produced its current review projection without changing the Decision snapshot; human fixture review alone advances stages. Read-only OAuth cannot submit. Unsupported/oversized input, invalid semantics, mismatched Workflow, exact Phase alias, stale review/WorkItem version and attempted disposition fields fail closed. A supplementary dispatcher diagnostic rejects malformed JSON, mismatched Workflow and inappropriate scope with an unchanged complete SQL snapshot.

The fixture submits Architect content through the actual registry, invokes the WSF03 recovered adapter's existing Refresh callback through a controlled preload/hook harness, and verifies the resulting SQL review document is selected. This is production-service/renderer-boundary proof, not an observed native ChatGPT session. No candidate JSON renderer entry is required.

Existing registry expectations were corrected for previously adopted mandatory Git checkout targeting and empty source-lease directories. The public MCP contract owner now allows workflowId only for the new semantic submission action, retaining checkout requirements for Git/release/test actions. No new permanent test file or mirrored implementation test was added.

## Validation

All child-process validation used the normal Windows lane after the earlier bundle's recorded restricted spawn EPERM. No repeated restricted build retry.

- `npm run typecheck`: exit 0 before final handoff wording changes; final build also checks TypeScript.
- `npm run build`: exit 0, TypeScript/Vite/assets, current final production source.
- `node --test test/agent-harness/reserved-toolbox-namespace.test.cjs test/renderer/architect-browser-attachment-coordinator.test.cjs`: exit 0, 19/19. Initial registry failures were stale Git schema/empty-directory expectations and an invalid empty acceptance-criteria fixture; corrected and rerun.
- `node --test --test-name-pattern="SQL|structured|Structured|Fresh SQL|Greenfield|shared WorkItem" test/architect-outputs/architect-draft-ingestion.test.cjs test/project-planning/project-planning-service.test.cjs test/phase-map/phase-map-service.test.cjs test/phase-planning/phase-planning-service.test.cjs test/work-card-planning/work-card-planning-service.test.cjs`: exit 0, 11 runner tests, including SQL Planning/Map/Phase/WorkItem/Repair/Close proof. Architect draft ingestion has no matching semantic tests; its wrapper is not Architect semantic evidence.
- `node --test test/architect-interview/architect-interview-workspace.test.cjs`: exit 0, 14/14 current SQL Architect tests.
- `node tmp/wsf03a-negative.cjs`: exit 0, three malformed/mismatched requests rejected, SQL unchanged; temporary diagnostic remains untracked/ignored.
- `npm run test:affected -- --changes tmp/wsf03a-changes.json`: exit 1. Exact affected run `2808dd9f-44a9-4db9-80c3-d81dc35ca67b`, 82 selected files, 1,180,605 ms; production build passed, 676 passed tests reported. Capability-map static proof passed 5/5. The initial planner required reviewed classification of the two new contract paths and sorted sourcePatterns; corrected. The CLI does not support the documented --concurrency argument; that attempt failed before execution, then the supported command above ran.

Affected failures: agent-harness-runtime (old conventional-checkout expectation); mcp-tool-contract-generation (new workflowId assertion); repository-io-hardening (over-budget process terminated, temporary-resource-cleanup-failed); execution-completion (six failures including source-neutral deterministic Criteria); project-rail-presentation (previously observed Architect source-regex assertion); managed-project-source (seven failures); workflow-integration-service (six integration failures). These are not a passing composed receipt. Only the newly affected public MCP contract assertion was corrected in this card. No unrelated domain/source/integration behavior was changed. Not every broader failure has been independently established as pre-existing.

The exact repository-io test process tree was identity/start-time verified before termination after exceeding the documented 300-second review threshold. Desktop lifecycle and Project Planning processes completed before attempted cleanup; identity checks refused termination. No failed or interrupted check is counted as a pass.

- Final correction: `node --test test/agent-harness/mcp-tool-contract-generation.test.cjs test/agent-harness/reserved-toolbox-namespace.test.cjs`: exit 0, 7/7. The earlier broad receipt remains failed; this focused correction does not relabel it.
- `git diff --check`: exit 0. Stage exact attributable files, inspect staged diff and bounded secret/local-path/generated-artifact scan before checkpoint.

## Remaining validation and continuation

External embedded ChatGPT/MCP authorization and the native Operator visual/experiential loop still require observation. WSF20 owns the full Greenfield audit. No release qualification was run. WSF03A removes the prior ingress blocker; resume WSF04 immediately after this checkpoint. Broader failed qualification evidence above remains open and must not be treated as Greenfield acceptance.
