<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/diagnostic_report/WC01",
  "artifactType": "diagnostic_report",
  "createdAt": "2026-07-15T20:45:00.000Z",
  "jsonPath": "planning/phases/phase-04/Diagnostic_Reports/DIAGNOSTIC_REPORT_WC01_repository_architecture_and_root_cause_analysis.json",
  "markdownPath": "planning/phases/phase-04/Diagnostic_Reports/DIAGNOSTIC_REPORT_WC01_repository_architecture_and_root_cause_analysis.md",
  "payload": {
    "kind": "diagnostic_report",
    "title": "Diagnostic Report: WC01 Repository Architecture and Root-Cause Analysis"
  },
  "payloadHash": "sha256:0f95d7b9e22df60d0eff26e47026fad6077762f807f8a98700475b1507e664d7",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-03/operator_validation/WC09-REPAIR02",
      "champcity-ai/phase-04/implementer_report/WC01",
      "champcity-ai/phase-04/implementer_report/WC01-REPAIR01",
      "champcity-ai/phase-04/work_card/WC01",
      "champcity-ai/system/artifact_registry",
      "champcity-ai/system/workflow_state"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-15T20:55:00.000Z",
  "workCardId": "WC01"
}
-->

# Diagnostic Report: WC01 Repository Architecture and Root-Cause Analysis

Status: active
Pass classification: diagnostic investigation; not an implementation pass
Repository: verified approved repo root
Branch: feature/phase-04-wc01-root-cause-diagnostic
Investigated commit: 4b381fb5f5934b2b762e0b3006595b98da5829d2
Intended commit message: Document WC01 repository root cause
Production correction implemented: no

## 1. Executive diagnosis

The exact WC01 Implementer Report is a synchronized, authoritative Artifact Registry entry, but its registration did not execute a workflow transition. The primary root cause is not a faulty transition rule. It is a split completion boundary: ArtifactPairService.commitArtifact can make any lifecycle artifact authoritative, while Workflow State advances only when a separate RoutedProcessInvocationService invocation observes an exact expected-output commit and explicitly calls WorkflowStateStore.advanceAfterArtifactCommit.

Production WC01 crossed only the first boundary. No transition command was recorded, no Workflow State revision was written, and no startup consistency service later reconciled the already-satisfied expected output. The missing post-report transition is therefore a symptom of a more fundamental architecture defect: lifecycle artifact authority and lifecycle state authority are separately durable, separately committed, and only conditionally coordinated.

Confidence: high.

## 2. Repository state verified

- Repository path: verified approved repo root.
- Remote: origin matched the approved ChampCityChris/ChampCity_AI repository.
- Starting branch: feature/phase-04-wc01-repair01-report-transition.
- Diagnostic branch: feature/phase-04-wc01-root-cause-diagnostic.
- Starting and investigated commit: 4b381fb5f5934b2b762e0b3006595b98da5829d2.
- Workflow State artifact revision: 8.
- Internal state revision: 6.
- Current stage: build.
- Active phase: phase-04.
- Current action: implementer_execution_required.
- Responsible role: implementer.
- Target: champcity-ai/phase-04/work_card/WC01.
- Sources: champcity-ai/phase-04/phase_activation/phase-04 and champcity-ai/phase-04/operator_approval/Operator_Phase_Approval.
- Expected output: champcity-ai/phase-04/implementer_report/WC01 of type implementer_report.
- Current screen: implementer-execution.
- Transition history count: zero.
- Artifact Registry artifact revision before this report: 32, with 128 entries.
- Exact report entry: revision 2, authoritative yes, synchronized yes, payload hash sha256:98b28d1454ca10ecf2c184d3c71b75fa7cc63478713290c90530a5a9e1d3c293.
- The four supplied untracked Architect files were preserved unchanged. Their pre/post byte hashes were checked.
- No WC01-REPAIR02 exists or was created.

## 3. Git history reviewed

| Commit | Authority change | Evidence |
| --- | --- | --- |
| 97f642025ed3553dc2da5c8d0ad978442f61a403 | Introduced the durable CurrentRequiredAction repository/status evaluator. | src/shared/workCards/currentRequiredAction.ts and historical work-card file scanning. |
| 7e598ac1a33f0321c80ea78e3d801065e4fbf8a6 | Introduced canonical artifact pairs, Artifact Registry, Workflow State, transition engine, routed invocation, and WC09 migration. | src/shared/workflow, src/main/workflow, src/main/artifacts, scripts/migration/wc09. |
| 26911cee624374b1a1c4f10fcbb7baacecaff4de | Expanded canonical lifecycle and Work Card loop; migration continued to write snapshot state. | transitionEngine.ts, workflow contracts, migration planner. |
| 7a0fd42b4345b7b6026a74da4e97dc59e9cc5e72 | Locked process contract and evidence precedence. | processContract.ts, evidencePrecedence.ts, repository gates. |
| acbdc55946c94266a3a01c66b89d4e3f83374e21 | Added canonical routed-screen adapter and WC01. The commit contains Phase 04 state at Implementer Execution and the already-registered WC01 report. | canonicalRoutedScreenAdapter.ts, mounted WC01 script, Workflow State revision 8/internal 6, report revision 2. |
| 4b381fb5f5934b2b762e0b3006595b98da5829d2 | Added the blocked WC01-REPAIR01 report and registry revision only. Workflow State remained unchanged. | blocked report pair and Artifact Registry pair; no production code or state change. |

Old authority was not fully removed. The legacy evaluator remains compiled and is still exercised by legacy fixture scripts, although production getCurrentRequiredAction no longer calls it. The migration remains available as an explicit CLI and test utility, but no production startup import invokes it.

## 4. Complete architecture map

| Node | File and exported symbol | Caller to callee | Input authority | Output authority | Durable mutation | Production active |
| --- | --- | --- | --- | --- | --- | --- |
| Startup | src/main/main.ts: app.whenReady, registerWorkCardIpc, createMainWindow | Electron to IPC registration and renderer load | Repository root | Running main and renderer | Only tmp Electron runtime directories | yes |
| Runtime composition | src/main/canonicalRuntime.ts: canonicalWorkflowAuthority, routedProcessInvocationService | main.ts to CanonicalWorkflowAuthority and RoutedProcessInvocationService | Fixed repository root | Shared main-process service instances | no | yes |
| Renderer startup | src/renderer/app/App.tsx: App, loadCurrentRequiredAction | React effect to preload API | IPC result | Renderer state and initial routed screen | no | yes |
| Preload binding | src/preload/index.ts: refreshCurrentRequiredAction, invokeProcess | App to IPC; caches currentRoutedActionBinding | Main-process result | Untrusted renderer binding sent back on preview/save | no | yes |
| Current Action IPC | src/main/main.ts: workCards:getCurrentRequiredAction handler | IPC to workCardFileStore.getCurrentRequiredAction | None from renderer | Canonical current-action result | no | yes |
| Current Action projection | src/main/workCards/workCardFileStore.ts: getCurrentRequiredAction | handler to CanonicalWorkflowAuthority.projectCurrentRequiredAction | Canonical Workflow State and Registry | Presentation CurrentRequiredAction and routed screen | no | yes |
| Workflow authority read | src/main/workflow/routedActionService.ts: RoutedActionService.getAuthoritySnapshot | CanonicalWorkflowAuthority and invocation service to WorkflowStateStore.load | Workflow State pair | Exact persisted state/current action | no | yes |
| Workflow state store | src/main/workflow/workflowStateStore.ts: WorkflowStateStore | RoutedActionService and invocation service to artifact port | Verified state pair or transition command | State snapshot and state commit result | yes on initialize/advance | yes |
| Workflow pair adapter | src/main/workflow/workflowStateArtifactPort.ts: WorkflowStateArtifactPort | WorkflowStateStore to ArtifactPairService | WorkflowStateIndex | Canonical Workflow State pair plus Registry entry | yes | yes |
| Routed-screen adapter | src/main/workflow/canonicalRoutedScreenAdapter.ts: CanonicalRoutedScreenAdapter.resolve | Current Action and routed invocation to ArtifactPairService | RoutedActionContract and Registry | Verified target/source/output locations; no new authority | no | yes |
| Artifact reader | src/main/artifacts/artifactRepository.ts: ArtifactRepository | Tests only in current tree | Registry | Verified entry/pair | no | no production caller |
| Process policy | src/main/workflow/processIpcPolicy.ts: processIpcPolicies, resolveTransitionRoute | registerProcessIpc and routed invocation | Channel and payload | Route classification | no | yes |
| Process orchestrator | src/main/workflow/routedProcessInvocationService.ts: RoutedProcessInvocationService.invoke | main.ts registerProcessIpc | Current state, renderer binding, writer result | Optional state transition attached to result | yes via store | yes |
| Routed write scope | src/main/workflow/routedWriteScope.ts: runInRoutedWriteScope, bindRoutedArtifactWrite, recordRoutedArtifactCommit | invocation service and planning writer | Expected output in RoutedActionContract | Captured exact expected-output commit | no itself | yes |
| Planning writer | src/main/workCards/workCardFileStore.ts: saveCanonicalPlanningArtifact | All app save functions | Form data plus optional routed scope | Canonical artifact request | yes via ArtifactPairService | yes |
| Report writer | src/main/workCards/workCardFileStore.ts: saveImplementerReportCapture | report IPC operation | selected Work Card and report text, overridden by routed scope when present | Implementer Report pair | yes | yes |
| Architect special writer | src/main/workCards/canonicalWorkflowAuthority.ts: commitArchitectReview | saveArchitectReviewRecord | Routed Architect authority | Review pair and explicit transition | yes twice | yes |
| Pair and Registry transaction | src/main/artifacts/artifactPairService.ts: ArtifactPairService.commitArtifact | planning writer, state port, context packet service, tests, external diagnostic/implementer tooling | Canonical artifact request | Artifact pair plus Registry revision | yes | yes and publicly callable |
| Pair filesystem transaction | src/main/artifacts/filePairTransaction.ts: FilePairTransaction.writeVerifiedPair | ArtifactPairService | rendered JSON/Markdown | verified fixed pair | yes | yes |
| Transition semantics | src/shared/workflow/transitionEngine.ts: advanceWorkflowState | WorkflowStateStore | state, exact verified evidence, role, route | next WorkflowStateIndex | no by itself | yes |
| Process semantics | src/shared/workflow/processContract.ts: lockedProcessContract | transition catalog and gates | static contract | action templates | no | yes |
| Legacy current-action evaluator | src/shared/workCards/currentRequiredAction.ts: evaluateCurrentRequiredAction | old verification scripts and fixture runner | repository/status projection object | independently selected action/target/source/output | no | test/legacy only |
| Presentation workflow map | src/shared/workCards/workflowVisibility.ts: resolveWorkflowVisibility | WorkflowRouterShell | already-projected Current Action | display-only process positions | no | yes, presentation only |
| Migration planner | scripts/migration/wc09/migrate-artifacts.mjs: buildMigrationPlan and workflow derivation | explicit migrate CLI and migration tests | repository artifacts and prior state | full Workflow State and Registry snapshots | yes only in apply mode | migration only |
| Migration entry point | scripts/migrate-canonical-artifacts.mjs | command line | mode and root | inventory/dry-run/apply/verify | apply only | not startup |
| Context packet compiler | src/main/contextPackets/currentContextPacketCompiler.ts: CurrentContextPacketCompiler | context IPC | canonical state and Registry | supporting context selection | no | yes, non-transitioning |
| Context packet writer | src/main/contextPackets/contextPacketService.ts: ContextPacketService | context export IPC | compiled packet | packet/manifest pairs and Registry | yes | yes, supporting only |
| WC01 mounted substitute | scripts/verify-wc01-mounted-canonical-architect-review.cjs | test:renderer | temp repository and custom IPC map | synthetic Phase 03 Architect Review state | temp only | test only |

## 5. Production runtime path

Startup to display:

1. Electron loads dist/main/main.js from package.json.
2. main.ts constructs canonical runtime singletons at module load.
3. app.whenReady registers IPC and creates BrowserWindow.
4. App.tsx mounts and calls preload getCurrentRequiredAction.
5. preload invokes workCards:getCurrentRequiredAction and caches the returned RoutedActionContract.
6. main calls workCardFileStore.getCurrentRequiredAction.
7. CanonicalWorkflowAuthority.projectCurrentRequiredAction calls RoutedActionService.getAuthoritySnapshot.
8. WorkflowStateStore and WorkflowStateArtifactPort verify and load the fixed Workflow State pair.
9. CanonicalRoutedScreenAdapter loads the Registry and verifies target, sources, and the expected output pair.
10. CanonicalWorkflowAuthority projects display copy; WorkflowRouterShell renders it and App aligns the initial support screen.

Routed save to restart:

1. App preview/save calls preload invokeProcess with the cached renderer binding.
2. main registerProcessIpc delegates to RoutedProcessInvocationService.invoke.
3. invoke reloads state and Registry, validates the binding, role, screen, target, sources, and output type.
4. Preview executes without mutation.
5. Save opens a routed write scope and calls the real writer.
6. saveImplementerReportCapture calls saveCanonicalPlanningArtifact.
7. bindRoutedArtifactWrite replaces any selected identity with the exact expected output.
8. ArtifactPairService commits and verifies the pair, then commits the Registry revision.
9. recordRoutedArtifactCommit exposes that exact commit to the invocation scope.
10. RoutedProcessInvocationService resolves success and calls WorkflowStateStore.advanceAfterArtifactCommit.
11. advanceWorkflowState computes the next state; WorkflowStateArtifactPort commits the Workflow State pair through a second ArtifactPairService transaction and another Registry revision.
12. The result carries workflowTransition. Architect Review calls onWorkflowAdvanced and reloads; Implementer Report Capture currently does not call onWorkflowAdvanced, so its mounted renderer can remain stale until manual refresh even when the durable transition succeeds.
13. A true process restart repeats the startup read path and loads the committed state pair. No migration or state recomputation runs.

## 6. Authority producers, consumers, and counts

There are three workflow-state selection models in the repository: the production transition/persisted-state model, the migration snapshot projector, and the legacy CurrentRequiredAction evaluator. Only the first is active in normal production runtime. workflowVisibility is a fourth representation, but presentation-only and not an authority producer.

| Capability | Independent components | Count | Production authority |
| --- | --- | ---: | --- |
| Select current action | transitionEngine plus persisted Workflow State; WC09 migration derivation; legacy evaluateCurrentRequiredAction | 3 | transition/persisted state only |
| Select target artifact | transition/action catalog rebinding; migration derivation; legacy evaluator; renderer manual/reference selectors | 4 | transition/persisted state only; adapter merely resolves the selected ID |
| Select source artifacts | transition/action catalog rebinding; migration derivation; legacy evaluator; manual/reference selectors | 4 | transition/persisted state only |
| Compute expected output | transition/action catalog; migration derivation; legacy evaluator | 3 | transition/persisted state only |
| Update Workflow State | WorkflowStateStore; migration apply | 2 | WorkflowStateStore in normal runtime |
| Update Artifact Registry | ArtifactPairService; migration apply | 2 | ArtifactPairService in normal runtime |
| Infer workflow state from repository artifacts | migration planner; legacy evaluator | 2 | neither during normal startup |

The canonical adapter, preload binding, and renderer are consumers/adapters. They do not independently choose workflow authority in production.

## 7. Reproduction steps and result

1. Check out commit 4b381fb5 on the diagnostic branch without modifying the four supplied untracked pairs.
2. Read the fixed Workflow State and Registry pairs.
3. Run the approved build lane.
4. Launch the built Electron app against the actual repository.
5. Observe the Current Action panel and routed workspace.

Observed: the visible app showed phase-04, WC01, implementer_execution_required, and Implementer Report Capture. The stored state and rendered state matched. The Registry simultaneously contained the exact expected report as synchronized and authoritative. Restart/load did not advance or overwrite anything.

## 8. Instrumentation used

A temporary structured diagnostic probe wrapped production read-only loads and isolated temporary-root commits. Events recorded application_startup, workflow_state_load/write, artifact_registry_load, artifact_pair_commit, routed_action_resolution, expected-output match, transition invocation/rejection, migration and reconciliation non-invocation, renderer hydration, and new-authority-instance restart. Fields included operation ID, timestamp, state/registry revisions, action/process/screen, target, sources, expected output, committed artifact, caller, result, blocker, and exception where applicable.

No production files were instrumented. All write experiments used temporary repositories. The temporary probe was removed before the final full validation suite.

## 9. Controlled experiments

| Experiment | Hypothesis and method | Exact command or input | Observation | Conclusion | Confidence |
| --- | --- | --- | --- | --- | --- |
| A | Direct commit/register of exact expected report might invoke a transition. Initialize exact-shape temp state, call ArtifactPairService.commitArtifact. | node scripts/diagnostics/wc01-root-cause-probe.cjs, direct-registration scenario | Registry advanced and report existed; state revision/action did not change; no transition invocation. | Registration alone never transitions. | high |
| B | Routed transition might occur but disappear after restart. Use RoutedProcessInvocationService, then construct a new authority instance. | same probe, routed-registration scenario | State advanced 1 to 2 and reloaded as Architect Review. | Transition persistence works; restart loss is not causal. | high |
| C | Startup hydration might overwrite stored state. Hash/read state before and after real startup and trace imports. | built Electron launch plus read-only probe | Workflow pair unchanged; startup contains no state writer or migration call. | Startup does not recompute or overwrite state. | high |
| D | WC09 migration might run during startup, validation, or report registration. Inspect call graph and run verify. | node scripts/migrate-canonical-artifacts.mjs --mode verify --idempotence | Only CLI/tests import migration; verify proposed zero writes and preserved post-migration state. | Migration is not the runtime overwrite source. | high |
| E | Renderer might display a legacy state representation. Compare real app display with loaded canonical state. | actual Electron reproduction | Both showed Implementer Execution for WC01. | Renderer is faithful to canonical state; it is not selecting a different authority. | high |
| F | Mounted Electron might use production repository/main/startup. Audit script. | npm run test:renderer:built and source inspection | Temp root, custom IPC handlers, hidden window, direct state initialization, Phase 03 fixture, same-process second window. | It is a mounted renderer integration fixture, not production-state reproduction. | high |
| G | Same exact production state might satisfy mounted test assumptions. Load current production and launch real app. | actual Electron reproduction | Production begins at Implementer Execution; mounted test begins at Architect Review. | The passing mounted scenario cannot reproduce the failure. | high |
| H | Registered expected output might be noticed eventually. Repeated state loads/projection after direct registration. | direct-registration scenario plus real restart | State remained unchanged while expected output materialization was existing_authority. | The inconsistency can persist indefinitely. | high |
| I | Multiple legitimate registration paths might differ. Compare direct ArtifactPairService and routed IPC orchestration. | both probe scenarios | Direct path did not transition; routed path did. | Behavior depends on caller path, not artifact identity. | high |
| J | Reference navigation or legacy evaluator might still decide production route. Static caller audit and real UI reference state. | rg caller audit and app reproduction | Legacy evaluator has no production caller; reference state is excluded; workflowVisibility is display-only. | Neither explains this production divergence. | high |

## 10. Competing hypotheses

1. Transition-engine defect. Supporting evidence: state failed to advance. Contradicting evidence: isolated routed report completion advanced correctly and persisted. Result: rejected as primary cause; confidence high.
2. Startup migration/hydration rollback. Supporting evidence: migration historically derives snapshots. Contradicting evidence: no runtime import/call, unchanged pair hash, and new-instance reload preserved a valid transition. Result: rejected; confidence high.
3. Renderer projection defect. Supporting evidence: visible app was wrong relative to intended lifecycle. Contradicting evidence: visible app exactly matched canonical stored state. Result: rejected as primary cause; confidence high.
4. Split lifecycle-completion boundary. Supporting evidence: direct report registration reproduces exact divergence; routed save advances; public pair service has no callback; no consistency gate exists. Contradicting evidence: none found. Result: accepted primary hypothesis; confidence high.

## 11. Primary root cause

Lifecycle completion is not enforced as one application-level invariant. ArtifactPairService atomically coordinates only an artifact pair and the Registry. WorkflowStateStore is invoked later and only by selected routed callers. The system therefore permits this valid-looking but incoherent durable state: expected output authoritative in Registry, prior action still current in Workflow State.

The exact divergence boundary in WC01 is after the report pair and Registry commit and before any call to WorkflowStateStore.advanceAfterArtifactCommit. No evidence shows that such a call occurred. The missing transition is a symptom of the split boundary and absent recovery, not the deepest defect itself.

## 12. Contributing causes and enabling defects

- Artifact pair/Registry and Workflow State are separate transactions. State failure after artifact success is explicitly possible in WorkflowStateStore error text.
- ArtifactPairService is a public general writer and has no concept of lifecycle completion.
- External Implementer/report creation commonly occurs outside the app save IPC, but the architecture assumes routed IPC orchestration.
- No startup or explicit consistency gate detects when the exact expected output already exists.
- No durable operation ID, completion record, or event journal correlates artifact commit with transition.
- Current production state is a migration-generated snapshot with state revision 6 and empty transition history, weakening auditability.
- CanonicalRoutedScreenAdapter treats an already-existing expected output as existing_authority and ready; it neither blocks nor advances.
- ImplementerReportCapture does not refresh Current Action after the routed save result, creating a separate transient stale-renderer risk.
- Documents describe output pair, Registry, and Workflow State as one transition rule, but code implements two commit boundaries.

## 13. Why previous repairs and process passes failed

Phase 03 WC09 proved individual primitives, migration, and synthetic orchestration but did not make lifecycle registration impossible outside the orchestrator. Phase 04 WC01 focused on routed-screen target/source correctness and Architect Review binding; its mounted test started after the missing boundary. The proposed WC01-REPAIR01 named report-plus-transition atomicity but asserted a root cause before a repository-wide diagnosis and then could not start because its own canonical payload hash was invalid.

The workflow repeatedly favored preservation and compatibility: the legacy evaluator remained, migration snapshot semantics remained, a new routed wrapper was added, and special-case Architect Review handling remained. Each layer was locally defensible, but responsibility for one lifecycle completion was spread across pair service, write scope, invocation service, state store, special writers, and renderer refresh.

Process failures included tests written to the intended contract rather than the actual failing state, no mandatory production-state preflight, no gate for expected-output/state divergence, no runtime trace correlation, inaccurate use of production-path language, and no machine validation of Architect-authored pair hashes before handoff.

## 14. Why tests gave false confidence

| Validation | Classification | Real filesystem/Registry/State | IPC/renderer/startup | Restart/migration | Can pass while production is broken |
| --- | --- | --- | --- | --- | --- |
| process-contract and evidence-precedence tests | unit | synthetic/in-memory | none | none | yes |
| artifact-authority tests | integration | temporary real filesystem and Registry | none | no | yes; Workflow State is outside scope |
| migration tests | integration | temporary migrated repository | none | migration yes, production startup no | yes |
| workflow-authority tests | mixed unit/integration | mostly temp; one read-only actual-repo assertion | no real IPC/renderer | reload service only | yes; the actual-repo test explicitly asserts Implementer Execution and registered report together |
| cross-process-routed-invocation tests | service integration | temporary real services | no real main IPC or real report writer; synthetic operation callback | no process restart | yes; proves wrapper works only when used |
| repository gates | static/live read-only | actual tree and registered pairs | none | migration boundary static | yes; coherence between state and expected-output presence is not a gate |
| WC08 mounted renderer | mounted renderer fixture | synthetic objects/custom handlers | production renderer/preload, mocked main | second window, no process restart | yes |
| WC01 mounted canonical test | mounted renderer integration | temp Phase 03 repo; direct seeded state | custom IPC map; skips main.ts | second hidden window; no migration | yes; begins at Architect Review and tests only review to validation |
| actual Electron reproduction | actual production-state reproduction | actual repository, Registry, State | real main, preload, renderer, IPC | real process startup | no; reproduced failure |

The full suite passed 61 unit/integration tests, repository gates, and mounted tests because none asserts the required invariant against the actual WC01 completion path. Test success is real within each scope but overclaimed at the system level.

## 15. Architectural alternatives

### Alternative A: one transactional/recoverable lifecycle completion service

Scope: replace split orchestration with a CompleteRoutedAction application service that owns output validation, pair staging, Registry commit, transition calculation, Workflow State commit, and idempotent recovery. Restrict lifecycle artifact registration outside this service or require an explicit non-transitioning classification. Add a read-only consistency gate at startup and repository validation.

Preserve: canonical artifact schema, pair verification, FilePairTransaction, transitionEngine, processContract, role gates, canonical routed-screen adapter, Registry identities, and current production artifacts.

Modify: routedProcessInvocationService.ts, workflowStateStore.ts, workflowStateArtifactPort.ts, artifactPairService.ts, routedWriteScope.ts, workCardFileStore.ts, canonicalRuntime.ts, main.ts, App.tsx, relevant contracts/docs/tests. Add one bounded completion service and recovery record or prepared transaction abstraction.

Migration: one governed reconciliation command for the already-registered WC01 report; no normal-runtime migration replay.

Risk: cross-pair rollback across Registry and Workflow State is more complex; crash recovery must be explicit and idempotent. Complexity: medium. Likely failure mode: partial completion record not finalized. Validation: failure injection at every stage, actual-state clone, main/preload/renderer save, full process restart.

### Alternative B: append-only workflow event journal and state projector

Scope: treat artifact registration/completion as a durable event, project Workflow State from ordered events, and treat the current state pair as a verified projection/cache. The Registry remains artifact authority; the journal becomes transition authority. Startup verifies or rebuilds the projection, without scanning arbitrary repository artifacts.

Preserve: artifact schema/pair service, process contract, transition semantics, routed adapter, and artifacts. Replace WorkflowStateStore persistence semantics and migration snapshot authority; add event identity, sequence, causation, and projection checkpoints.

Migration: create a baseline event from the existing canonical state, then a governed completion event for WC01 if authorized. Complexity: high. Risks: event ordering, duplicate events, schema evolution, projection drift. Validation: deterministic replay, crash/failure injection, duplicate/idempotence, snapshot equivalence, process restart.

## 16. Recommended correction

Choose Alternative A now. The architecture is coherent enough to preserve the transition engine, contracts, Registry, pair verifier, and routed adapter, but the lifecycle-completion subsystem requires deliberate replacement with one recoverable application boundary. An event journal is a credible later evolution if audit/replay requirements grow; it is not required to correct this MVP defect safely.

Confidence: medium-high because implementation details require design review, but the boundary to replace is well evidenced.

## 17. Exact implementation boundary

The future repair should begin at RoutedProcessInvocationService.invoke and ArtifactPairService.commitArtifact, not in the transition table and not in the renderer target/source adapter. It should define one API that accepts the authorized routed action and typed output, commits all durable effects or leaves an explicit recoverable record, and returns the next canonical state. Direct lifecycle-artifact commits must be rejected, classified as non-transitioning, or detected by a consistency gate.

No state reconciliation should occur merely because any similarly named file exists. It must match exact artifact ID/type, verified synchronized pair, authoritative Registry entry, current expected output, state revision, actor/authorization rules, and an idempotency key.

## 18. Files and code to preserve

- src/shared/artifacts canonical envelope, JSON, Markdown, pair verification, and Registry validators.
- src/main/artifacts/filePairTransaction.ts.
- src/shared/workflow/processContract.ts, roleGates.ts, workflowValidation.ts, and most of transitionEngine.ts.
- src/main/workflow/canonicalRoutedScreenAdapter.ts and RoutedActionService read path.
- The current WC01 Work Card and Implementer Report pairs.
- The current Workflow State pair unchanged until a governed repair is authorized.
- The four supplied Architect-authored files unchanged during this diagnostic.

## 19. Files likely to modify in the correction

- src/main/workflow/routedProcessInvocationService.ts.
- src/main/workflow/workflowStateStore.ts.
- src/main/workflow/workflowStateArtifactPort.ts.
- src/main/workflow/routedWriteScope.ts.
- src/main/artifacts/artifactPairService.ts and possibly filePairTransaction.ts for prepared multi-pair commit/recovery.
- src/main/workCards/workCardFileStore.ts.
- src/main/workCards/canonicalWorkflowAuthority.ts to remove special completion behavior after the common service exists.
- src/main/canonicalRuntime.ts and src/main/main.ts.
- src/renderer/app/App.tsx to refresh after Implementer Report completion.
- docs/architecture contracts and the repository gate script.

## 20. Files to delete or retire

No file should be deleted in the diagnostic branch. In the correction, rewrite or replace scripts/verify-wc01-mounted-canonical-architect-review.cjs. After all callers are migrated, retire the authority-producing portion of src/shared/workCards/currentRequiredAction.ts and legacy fixture scripts that validate it as authority. Do not delete historical planning artifacts or the WC09 migration utility; mark migration as offline-only and keep it for verification/rollback evidence.

## 21. Tests to retain

- Pair synchronization, revision, and rollback tests in artifact-authority.test.cjs.
- Process contract, role gate, evidence precedence, and transition-semantic tests.
- Canonical routed-screen exact target/source and tamper-blocking tests.
- Reference-navigation non-authority tests.
- Migration verification/idempotence tests as offline migration coverage.

## 22. Tests to rewrite

- Rewrite the persisted production-state test so registered exact expected output plus prior action is a failure, not an expected passing state.
- Rewrite the WC01 mounted test to start from a clone of the exact Phase 04 failing state, invoke the real Implementer Report save IPC and real main handler, then assert Architect Review.
- Rename mounted tests so production-path is reserved for actual main/startup/repository topology.
- Replace same-process second-window reload claims with a real process restart test.

## 23. New tests required

- Actual WC01 repository-state clone in a temp root with identical state and Registry entries.
- Real main.ts IPC registration plus preload/renderer Implementer Report save.
- Direct lifecycle artifact registration rejected or detected.
- Crash/failure injection after pair stage, pair commit, Registry commit, transition calculation, state pair commit, and finalization.
- Idempotent retry after every partial stage.
- Startup consistency gate for expected output already authoritative while prior action remains current.
- Real Electron process exit/relaunch and state reload.
- Renderer refresh assertion after Implementer Report save.
- Mandatory production snapshot metadata in every test claiming production-path simulation.

## 24. Permanent observability recommendations

- Structured operation IDs propagated renderer to IPC to pair transaction to Registry to state commit.
- Events for startup, state/Registry load/write, route resolution, expected-output match, transition attempt/result/rejection, migration/reconciliation, renderer hydration/refresh, and restart.
- Correlation fields used in this investigation, with no artifact bodies or secrets.
- A read-only consistency command and repository gate that lists state/Registry invariant violations.
- A bounded recovery record for partial lifecycle completion.
- A read-only diagnostics screen showing state revision, Registry revision, last completion operation, and blockers.
- Persistent transition history created by runtime transitions and explicit baseline provenance for migration snapshots.

## 25. Application-generated handoff rules

1. Validate synchronized pair hashes before a Work Card can be offered to an Implementer.
2. Block handoff when the exact expected output is already authoritative but Workflow State still expects it.
3. Require every lifecycle artifact to declare whether it advances workflow; enforce the allowed writer service by artifact type.
4. Generate tests from the exact current state/Registry snapshot and label mock/temp substitutions.
5. Prohibit production-path claims unless real main registration, preload, renderer, IPC, services, state, Registry, save, and restart are exercised.
6. Require a mandatory diagnostic gate before creating a numbered repair for a cross-subsystem inconsistency.
7. Enforce report-pair creation and Registry registration as one canonical operation, while keeping Workflow State unchanged unless the completion service authorizes it.
8. Validate repair-chain limits and forbid automatic creation of a second repair.
9. Record exact skipped checks, manual Operator steps, branch, and intended commit before handoff.
10. Reject invalid Architect-authored pairs before branch creation or implementation authorization.

## 26. Open questions requiring Operator or Architect judgment

- Should external Implementer tooling be permitted to complete workflow directly, or must reports be imported through the application?
- Is automatic idempotent reconciliation acceptable when exact evidence and role authorization are already present, or must the Operator approve every recovery?
- Is an event journal justified now, or should it remain a later architecture option?
- Should the legacy CurrentRequiredAction evaluator be removed in the correction or in a separately governed cleanup?
- What retention period and UI exposure should structured diagnostic events have?

## 27. Confidence levels for major conclusions

| Conclusion | Confidence |
| --- | --- |
| Direct report registration did not invoke a transition | high |
| Transition engine and state persistence work when routed orchestration is used | high |
| Startup/migration did not overwrite a valid WC01 transition | high |
| Renderer displayed canonical stored state, not legacy authority | high |
| Missing transition is a symptom of a split completion boundary | high |
| Implementer Report renderer refresh is a separate contributing defect | high |
| Three workflow-selection models remain in the repository | high |
| Alternative A is the best near-term correction | medium-high |
| Event journal should be deferred | medium; product audit requirements may change the decision |

## 28. Validation and explicit no-correction statement

Commands and results:

- Repository/branch/remote/status/history inspection: passed.
- Approved normal-Windows npm run validate:codex:build: passed.
- Actual built Electron application startup against the real repository: reproduced visible Implementer Execution for WC01.
- Temporary structured diagnostic probe: direct-registration, routed-registration, persistence, and stale-transition experiments passed; probe removed before final validation.
- node scripts/migrate-canonical-artifacts.mjs --mode verify --idempotence: passed with 128 entries, zero proposed writes, and post-migration state preserved.
- Approved normal-Windows npm run validate:codex:unit: passed, 61 of 61 tests.
- Approved normal-Windows npm run test:renderer:built: passed.
- Explicit WC01-named mounted Electron invocation: exit code zero.
- Approved normal-Windows npm run validate:codex: passed: build, 61 tests, repository gates, and mounted renderer lane.
- One standalone repository-gate run in the sandbox produced the documented git spawn EPERM false failure; the same command passed in the approved normal-Windows lane. The approved full validation lane had no sandbox-only failure.
- Pair verification, Registry verification, safety scans, diff checks, staged checks, commit, and push are recorded in the final response after completion.

Manual validation required: the Operator may independently confirm the visible Current Action if desired; no acceptance or state-changing manual validation is authorized or required for this diagnostic conclusion.

Residual risks: the exact external mechanism that produced WC01 report revision 2 is evidenced by repository history and the absence of a transition, but there is no durable operation log to identify the original caller. This does not affect the proven architectural boundary. The recommended correction requires design review before implementation.

No production correction, workflow transition, state reconciliation, UI fix, migration apply, Work Card correction, repair creation, or feature implementation was performed. Production Workflow State remained unchanged throughout the investigation.

## Document Disposition
Document.Status=Pending
