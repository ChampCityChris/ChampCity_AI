# ChampCity Client-Service Contract — Desktop Source Mapping

## Purpose

This document maps the current `ChampCity_AI/src` Desktop implementation to the semantic services defined in `CHAMPCITY_CLIENT_SERVICE_CONTRACT.md`.

The objective is not to rename current Electron IPC endpoints one-for-one. It is to determine:

1. which current Desktop behavior already implements useful ChampCity semantics;
2. which behavior should be extracted into Shared Product Core;
3. which current implementation should become a Desktop/infrastructure adapter;
4. which behavior is legacy artifact/Markdown compatibility only;
5. which target service capabilities do not yet exist; and
6. where current ownership is duplicated, overloaded, or incorrectly located.

This is a migration/extraction companion to `SOURCE_EXTRACTION_MAP.md`. The Source Extraction Map classifies the entire source tree against product capabilities. This document narrows the view to the future client-service boundary and maps existing functions/services to the proposed semantic API.

## Audit Basis

Reviewed current source areas include:

- `src/main/main.ts` Electron IPC composition;
- `src/main/sessionActiveWorkspaceSelection.ts` and `workspaceSettings.ts`;
- project intake/planning, phase, Work Card, Issue, validation, Repair, and close services;
- `src/main/documents/**`;
- Architect interview/output services;
- `src/main/agentHarness/repository/**`;
- `src/main/agentHarness/workspace/**`;
- `src/main/agentHarness/tools/toolRegistry.ts`;
- `src/main/agentHarness/runtime/**`;
- `src/main/workCardBuilding/codex*`;
- `src/main/developmentEnvironment/**`;
- shared runtime/document/workspace/environment contracts; and
- renderer service usage/polling behavior.

The source baseline already has useful service seams. The principal migration problem is not absence of logic; it is that product-domain logic is frequently bound directly to repository roots, Markdown files, legacy `workspaceId`, Codex, Windows, Electron, or renderer sequencing.

## Mapping Labels

| Label | Meaning |
| --- | --- |
| **Existing — extract** | Useful semantic behavior exists and should move into Shared Product Core behind the target service contract. |
| **Existing — adapter** | Useful implementation exists but belongs behind a Desktop/infrastructure/provider adapter. |
| **Partial** | Some target behavior exists but the target semantic contract is broader or differently bounded. |
| **Legacy/migration** | Preserve only for migration, import/export, or compatibility; do not make it the new steady-state implementation. |
| **New** | No meaningful current implementation exists; implement against the new contract. |
| **Desktop-only** | Legitimate Desktop shell/product infrastructure that should not become a Server/shared service semantic. |

# Executive Findings

## 1. The service contract is compatible with the existing product; it does not require a rewrite

The current source contains substantial reusable domain semantics for workflows, validation, Operator Decisions/dispositions, repository safety, runtime lifecycle, and environment preflight. The migration should extract those semantics while replacing their infrastructure dependencies.

## 2. WorkflowService has the largest reusable domain body

Current workflow behavior is spread across `currentWorkflow`, Project/Phase services, Work Card services, and the very large `issueResolutionService.ts`. Lifecycle, disposition, evidence, and eligibility behavior should be retained where still applicable, but its direct reconstruction from Markdown/filesystem state must be replaced by `ProjectStateService` queries.

## 3. ProjectStateService is a replacement architecture, not a wrapper around the current document subsystem

Today Project State is reconstructed from repository Markdown through `planningDocumentService`, snapshots, canonical writers, disposition writers, Architect draft paths, workflow-specific artifacts, and source-revision metadata. Those components provide migration knowledge and domain rules, but the new steady state must be the structured Project State model.

## 4. RepositoryService is the strongest existing mechanical service candidate

The Agent Harness already contains bounded path policy, repository reads/search, patch mechanics, Git status/diff/readiness, bounded Git mutation, registered repository roots, image/evidence writes, and fail-closed access/containment checks. These should be consolidated behind `RepositoryService` and re-keyed from legacy `workspaceId` to `repositoryId`/resource identities.

## 5. RuntimeService currently consists of two different concerns that must not be conflated

- `codexRuntimeManager`, `codexAppServerTransport`, and `codexImplementerExecutionService` are the current AI worker runtime/provider path.
- Background Agent/Service Host/MCP lifecycle is Desktop/runtime-host infrastructure that publishes tools and keeps services alive.

The future `RuntimeService` should abstract AI worker execution. Background Agent process/tray/startup behavior remains a Desktop host implementation concern.

## 6. ModelService exists only as a narrow Codex model selector today

Model discovery, supported reasoning effort, saved selection, and selection validation exist. Provider-neutral capability modeling, context budgeting, token/cost accounting, cache telemetry, model routing, and local-provider support are new work.

## 7. MemoryService and SkillsService are deliberately new

Current Desktop has no first-class ChampCity Memory subsystem. `knowledge_toolbox` is status-only. Current Skills support is only observed through Codex runtime capability discovery (`skills/list`); ChampCity does not yet own the canonical registry/versioning/assignment model defined in the Skills architecture.

## 8. The current Electron IPC surface should become a Desktop transport adapter

`main.ts` exposes many feature-specific IPC calls such as `documents:*`, `issueResolution:*`, `currentWorkflow:*`, `codexImplementer:*`, `codexRuntime:*`, and Agent Harness endpoints. These are valuable evidence of existing use cases but should not become the Server API contract.

The future Desktop preload/IPC layer should adapt the shared client contract to local services. The browser client should adapt the same contract to Server transport.

## 9. AI Tools remain model-facing façades, not another client service

`agentHarness/tools/toolRegistry.ts` currently contains the MCP-facing tool catalog and dispatch. Future tool definitions should authorize and invoke `RepositoryService`, `ProjectStateService`, `EnvironmentService`, and other owning services. Tool transport must not duplicate business logic.

## 10. Event semantics need a new shared abstraction

Desktop currently combines a small number of explicit notifications with renderer polling. For example, Background Agent settings are periodically refreshed and Codex execution polling is conditional on the foreground Workspace. Server-backed clients should use scoped semantic events, retaining polling only as compatibility/recovery behavior.

---

# 1. ProjectService Mapping

## Current source reality

There is no durable Project catalog independent of a repository root. Current Project selection is effectively selection of a local repository directory:

- `SessionActiveWorkspaceSelection.currentSelection()` / `activateFromValidation()` / `deactivate()`;
- `workspaceSettings.validateWorkspaceRoot()` / `readSelectedWorkspace()` / `saveSelectedWorkspace()` / `clearSelectedWorkspace()`;
- Electron IPC `workspace:get`, `workspace:choose`, and `workspace:clear`;
- `submitProjectIntakeForRepository()` creates/updates repository-resident Project Intake artifacts; and
- Agent Harness `RegisteredWorkspaceRegistry` registers what are operationally repository roots.

This current behavior is useful migration input but does not yet implement the future Project abstraction.

| Target call | Current Desktop equivalent | Coverage | Migration disposition |
| --- | --- | --- | --- |
| `listProjects(filter?)` | None. Registered workspaces list repository roots, not durable Projects. | **New** | Implement from structured Project records. Do not reinterpret MCP registry as Project catalog. |
| `getProject(projectId)` | Project Intake artifacts plus current selected repository indirectly describe a project. | **Partial / legacy** | Read canonical Project entity from Project State. Legacy intake importer populates it. |
| `getProjectSummary(projectId)` | Landing/current workspace projections provide fragments. | **Partial** | Build from structured Project + lifecycle summary. |
| `getActiveProject()` | `SessionActiveWorkspaceSelection.currentSelection()` | **Partial** | Preserve session-selection semantics but select `projectId`, not repository root. |
| `listProjectResources(projectId)` | Registered workspace/repository information only. | **Partial** | Model explicit `ProjectResource` relationships from the structured domain model. |
| `getProjectCapabilities(projectId)` | Capability information is scattered across Agent Harness status, repository state, runtime status, and environment preflight. | **New aggregation** | Application query composes owning service capability/availability. |
| `createProject(input)` | `submitProjectIntakeForRepository()` begins Project Intake but writes Markdown into an existing repository. | **Partial** | Separate durable Project creation from starting Project Intake workflow and repository attachment. |
| `updateProject(...)` | Project Intake revision/document updates. | **Legacy/partial** | Update structured Project entity with revision checks. |
| `archiveProject(projectId)` | None. | **New** | Structured lifecycle operation. |
| `restoreProject(projectId)` | None. | **New** | Structured lifecycle operation. |
| `selectActiveProject(projectId)` | `workspace:choose` + `SessionActiveWorkspaceSelection.activateFromValidation()` | **Existing semantics — extract** | Keep client-session selection behavior; native folder chooser stays Desktop-only. |
| `associateResource(projectId, resourceReference)` | Repository root is currently implicit in Project Intake and MCP registration. | **New explicit relationship** | Use `ProjectResource` relationship; Repository registration is independent. |
| `removeResourceAssociation(...)` | `unregisterWorkspace` removes registry entry but is not a project-resource relationship operation. | **New** | Separate relationship removal from repository deregistration/deletion. |

### ProjectService conclusion

`ProjectService` is primarily a **new structured application service**. Reuse session-selection behavior, but do not promote current repository/workspace selection into the permanent Project model.

---

# 2. WorkflowService Mapping

## Current source reality

This is the richest existing Shared Product Core candidate.

Important current services/functions include:

- `currentWorkflowService.getCurrentWorkspaceModel()`;
- `generateCurrentHandoff()`;
- `getCurrentWorkCardMapProjection()`;
- `beginWorkCardPlanning()`;
- `applyCurrentDisposition()`;
- `applyOperatorValidationDecisionForCurrentWorkCard()`;
- `createValidationAttemptForCurrentWorkCard()`;
- `createRepairForCurrentFailure()`;
- phase/project closeout queries/actions;
- `projectPlanningService` handoff/review/completion functions;
- `phaseMapService`, `phaseInterviewService`, and `phasePlanningService`;
- `workCardIntakeService` selection/map/state functions;
- `workCardPlanningService` preparation/disposition/eligibility functions;
- `workCardBuildingReviewService` implementation-report review/validation eligibility;
- `workCardValidationService` validation and close projection;
- `workCardRepairService` Repair context/creation/projection;
- `workCardLoop` effective completion and close-return behavior; and
- `issueResolutionService` Issue discovery, planning, Fix Card, validation, Repair, and close lifecycle.

The main defect is not missing lifecycle behavior. It is that the behavior frequently accepts `workspaceRoot`, parses Markdown, resolves paths, and rebuilds state from repository files.

| Target call | Current Desktop equivalent | Coverage | Migration disposition |
| --- | --- | --- | --- |
| `listWorkflowTypes(projectId)` | Workflow Hub/product rules imply Development/Issue paths; Feature is planned. | **Partial** | Define explicit workflow-type registry in Product Core. |
| `getWorkflow(workflowId)` | No generic workflow instance. Workflow-specific projections exist. | **Partial** | Introduce durable workflow identity/aggregate over existing lifecycle semantics. |
| `listProjectWorkflows(projectId, filter?)` | Repository artifact discovery can infer history. | **Legacy/partial** | Query structured workflow/work-item records instead. |
| `getWorkflowStatus(workflowId)` | `getCurrentWorkspaceModel()`, Issue/Work Card/Phase projections. | **Existing — extract** | Consolidate workflow-specific projections behind generic status query plus typed detail queries as needed. |
| `getPermittedActions(workflowId)` | Eligibility/close/blocker logic exists throughout phase/work-card/issue services. | **Existing — extract** | Centralize deterministic action policy; remove renderer-owned transition decisions. |
| `getRequiredOperatorDecision(workflowId)` | Operator validation/disposition boundaries and current deterministic eligibility rules exist across Development and Issue workflows. | **Existing semantics — refactor** | Represent genuine Operator Decision requirements separately from deterministic workflow eligibility. |
| `getCurrentWorkspace(workflowId)` | `CurrentWorkspaceModel`, lifecycle rails, workspace registry/presentation types. | **Existing — extract/rename** | Preserve task-station concept; detach from repository `workspaceId`. |
| `getWorkflowMap(workflowId)` | Work Card Map, Issue Fix Card projection/navigation, phase map/plan. | **Existing — extract** | Project from structured Work Item/dependency relationships. |
| `startWorkflow(...)` | `submitProjectIntake`, Issue creation, Work Card/phase entry paths are workflow-specific entry operations. | **Partial** | Define generic workflow start command delegating to typed workflow factories. |
| `requestWorkflowAction(...)` | Many current methods map directly: begin planning, handoff, review, validation, repair, close. | **Existing — extract** | Replace large IPC action surface with semantic command dispatcher/typed commands. |
| `recordOperatorDisposition(...)` | `applyCurrentDisposition`, `applyOperatorValidationDecision`, Issue validation/close decisions. | **Existing — extract/reshape** | Persist an Operator `Decision`; derive disposition/eligibility state through ProjectStateService. V2 routine Work/Fix validation may no longer require an Operator disposition. |
| `suspendWorkflow(...)` | No general workflow suspension. | **New** | Structured lifecycle state. |
| `resumeWorkflow(...)` | No general workflow resume independent of current file state. | **New** | Structured lifecycle state. |
| `cancelWorkflow(...)` | No general governed cancellation path. | **New** | Structured lifecycle state with audit record. |

### Workflow decomposition requirement

`issueResolutionService.ts` is currently approximately 342 KB and spans Issue discovery through final closure. Its behavior belongs to the Workflow capability, but the implementation should be decomposed around Issue aggregate/application commands rather than copied wholesale into Product Core.

Similarly, `currentWorkflowService` is a useful aggregation seam but should become a query/application façade over explicit workflow state rather than a repository scanner.

---

# 3. ProjectStateService Mapping

## Current source reality

Current Project State is distributed across:

- `planningDocumentService`;
- `planningRepositorySnapshot` and projection contexts;
- canonical Markdown writers;
- document disposition writers and rollback transactions;
- first-non-approved resolution;
- repository-binding and source-revision metadata;
- Architect draft/output submission and promotion;
- workflow-specific Markdown artifacts;
- validation records;
- close records;
- Repair cards;
- Issue records; and
- source revision/invalidation metadata.

The existing subsystem contains important semantics, but **Markdown + filesystem layout is the persistence model**. Per the Structured Project State design, most of this becomes migration/import/export or domain-policy input rather than the new state store.

| Target call | Current Desktop equivalent | Coverage | Migration disposition |
| --- | --- | --- | --- |
| `getRecord(stateRecordId)` | `readPlanningDocument(logicalDocumentId)` and workflow-specific artifact reads. | **Legacy/partial** | Replace with structured entity retrieval. |
| `queryRecords(projectId, query)` | `listPlanningDocuments`, repository snapshots, Issue inventory and workflow-specific scans. | **Legacy/partial** | Database/state-store query. |
| `getCurrentRecord(projectId, identity)` | artifact revision/current-path resolution; `resolveFirstNonApprovedDocument` for one specific concept. | **Partial** | Generic current-record resolution using revision/supersession and disposition rules. |
| `getRecordHistory(stateRecordId)` | `savePlanningDocumentRevision`, archive/revision files and source revision metadata. | **Partial / migration source** | Structured revisions and State Change Audit. |
| `getRelationships(stateRecordId)` | Relationships encoded implicitly through IDs, paths, metadata and source revisions. | **Partial** | Explicit `Relationship` records. |
| `getLineage(stateRecordId)` | `sourceRevisions`, artifact revision, invalidation/promotion lineage. | **Existing concepts — extract** | Move into canonical Lineage/Revision/Supersession model. |
| `getProjectStateSummary(projectId)` | `CurrentWorkspaceModel`, lifecycle rails, planning projections. | **Partial** | Derived structured-state projection. |
| `getEvidence(target)` | screenshot evidence, Implementer reports, validation records, artifact paths. | **Partial** | Explicit Evidence entity/blob references. |
| `renderView(viewRequest)` | Current V1 Markdown artifacts are human-readable canonical workflow records for V1, not V2 projections. | **New direction using legacy render knowledge** | Build deterministic projections from structured state; reuse formatting rules where worthwhile. |
| `createRecord(...)` | `writeCanonicalMarkdownDocument`, artifact transactions, workflow-specific writers. | **Legacy implementation** | Structured entity creation transaction. |
| `updateRecord(...)` | disposition writers, body replacement, document revision updates. | **Legacy implementation + reusable revision policy** | Structured optimistic/revision-safe mutation. |
| `supersedeRecord(...)` | artifact revision, invalidation and replacement patterns. | **Existing concepts — extract** | Explicit Supersession records. |
| `createRelationship(...)` | Mostly implicit/manual metadata construction. | **New** | First-class relationship operation. |
| `removeRelationship(...)` | No generic equivalent. | **New** | End relationship according to domain invariant. |
| `recordDecision(...)` | Operator dispositions/close decisions stored in documents. | **Existing semantics — extract** | Structured Decision + derived disposition/eligibility state. |
| `recordFinding(...)` | Findings live in Architect/Issue artifacts. | **Existing semantic content, no generic service** | First-class Finding entity. |
| `recordBoundedSolution(...)` | Plans/Repair/Fix/Architect outputs contain bounded solutions in Markdown. | **Existing semantic content, no generic service** | First-class Bounded Solution entity. |
| `recordValidation(...)` | `workCardValidationService`, Issue validation, validation-record Markdown. | **Existing semantics — extract** | Structured Validation entity + criteria/evidence links. |
| `recordEvidence(...)` | screenshot/attachment writes and evidence paths. | **Partial** | Evidence entity references blob/Repository evidence through storage adapter. |
| `importLegacyProjectState(...)` | existing paired-artifact-to-canonical migration plus new Desktop migration design. | **Legacy/migration** | Build versioned artifact-to-structured-state importer. |
| `exportProjectState(...)` | Repository Markdown is currently already materialized, but no structured export exists. | **New** | Structured export + optional Markdown views. |

### ProjectStateService conclusion

Do **not** place a service wrapper around `planningDocumentService` and call that Project State. The transition requires the canonical-state inversion already defined in the domain model:

```text
Current: Markdown -> interpreted state
Future:  Structured state -> projections/exports
```

---

# 4. RepositoryService Mapping

## Current source reality

This service has the most directly reusable deterministic mechanics.

Current implementations include:

- `RegisteredWorkspaceRegistry` and Agent Harness register/unregister operations;
- `workspaceAccess` bounded registered-repository access and root resolution;
- `repositoryBinding` compatibility/binding evidence;
- `pathPolicy` safe relative/root resolution;
- `listRepositoryFiles()`;
- `readRepositoryFile()` and bounded text projections;
- `searchRepositoryFiles()`;
- `writeTextArtifact()`;
- patch proposal/hash/application functions;
- `gitStatus()`;
- `gitDiff()`;
- `preCommitSafetyScan()`;
- `boundedGit` execution;
- repository ecosystem detection; and
- image/evidence write validation.

Frozen V1 now implements branch/stage/commit/push/integrate through `gitMutationAction()` dispatch into `agentHarness/repository/gitMutations.ts`. Those operations are bounded deterministic mechanics with explicit preconditions. This is proven source material for the future RepositoryService rather than a deferred placeholder.

| Target call | Current Desktop equivalent | Coverage | Migration disposition |
| --- | --- | --- | --- |
| `listRepositories(projectId?)` | `listRegisteredWorkspaces()` / `RegisteredWorkspaceRegistry` | **Existing — adapter/rename** | Re-key registered repository resources as `repositoryId`; Project association becomes explicit. |
| `getRepository(repositoryId)` | registry summaries contain repository name/root/Git-backed availability. | **Partial** | Promote to repository entity/resource metadata. |
| `inspectRepository(repositoryId)` | `gitStatus`, `isGitBacked`, repository ecosystem detection, file inspection. | **Existing — consolidate** | Shared policy + filesystem/Git adapter. |
| `getRepositoryStatus(repositoryId)` | `gitStatus()` | **Existing — adapter** | Keep bounded Git implementation behind interface. |
| `listFiles(...)` | `listRepositoryFiles()` | **Existing — adapter** | Re-key from root/workspace to `repositoryId`. |
| `readFile(...)` | `readRepositoryFile`, text chunk/line/Markdown section helpers. | **Existing — adapter** | Preserve bounded reads; remove Markdown-specific API from core contract. |
| `searchRepository(...)` | `searchRepositoryFiles()` | **Existing — adapter** | Preserve bounded search. |
| `getDiff(...)` | `gitDiff()` | **Existing — adapter** | Preserve deterministic Git diff. |
| `getHistory(...)` | Tool contract currently returns a deferred placeholder. | **New/partial** | Implement bounded history provider. |
| `listSourceLines(...)` | Branch inspection exists through bounded Git mechanics; no provider-neutral service API. | **Partial/New semantic adapter** | Map provider branches/refs to SourceLine behind RepositoryService. |
| `getChangedFiles(...)` | Can be derived from Git status/diff; no explicit semantic service. | **Partial** | Implement code-owned query. |
| `runReadinessCheck(...)` | `preCommitSafetyScan()` / `readiness_summary` | **Existing — adapter** | Preserve deterministic scanning. |
| `registerRepository(...)` | `registerWorkspaceRoot()` / Agent Harness `registerWorkspace`. | **Existing behavior — rename/re-key** | Repository registry, not Workspace registry. |
| `unregisterRepository(...)` | `unregisterWorkspace()` | **Existing behavior — rename/re-key** | Preserve registration semantics. |
| `applyChangeSet(...)` | direct artifact writes plus patches; implementation workers also modify files through runtime. | **Partial** | Define one governed source mutation contract. |
| `applyPatch(...)` | `registerPatchProposal`, `sha256Patch`, `applyApprovedPatch` | **Existing — adapter** | ChampCity owns proposal/hash/authorization mechanics. |
| `createWorkSource(...)` | `prepareGitBranch()` through `git_toolbox.prepare_branch`. | **Existing provider mechanic / new semantic adapter** | GitProvider maps Work Item source lineage to branch/ref creation while preserving deterministic preconditions. |
| `provisionRepositoryCheckout(...)` | Integration code has bounded Git worktree creation/ownership checks; general Work Item checkout lifecycle is not yet exposed. | **Partial** | Generalize behind RepositoryCheckout mechanics; do not expose arbitrary worktree shell commands. |
| `captureImplementationRevision(...)` | `stageGitChanges()` + `commitGitChanges()` and current machine-owned Work Item checkpoint service. | **Existing mechanics / semantic consolidation** | Hide Git index/staging behind durable ImplementationRevision capture and receipt generation. |
| `refreshRepository(...)` / `synchronizeSourceLine(...)` | bounded fetch/push operations. | **Existing provider mechanics / semantic adapter** | Retain configured-remote/ref validation behind provider-neutral synchronization semantics. |
| `prepareIntegrationCandidate(...)` / `advanceIntegrationTarget(...)` | current integration-candidate services plus bounded integration Git mechanics. | **Existing/partial semantic implementation** | Preserve exact incoming/current-target semantics and target-owned validation while moving Git merge/ref mechanics under GitProvider. |
| `restoreFiles(...)` | no consolidated target operation. | **New** | Add explicit safe restore semantics. |

### RepositoryService conclusion

This is a high-value early extraction. It directly implements the architectural rule that mechanical repository/source-control work should be deterministic code rather than inference-token work.

The bounded Git functions above are **GitProvider implementation assets**, not the permanent RepositoryService vocabulary. `CHAMPCITY_SOURCE_CONTROL_PROVIDER_ARCHITECTURE.md` controls the provider-neutral target model; `CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md` controls concurrent checkout semantics.

---

# 5. RuntimeService Mapping

## Current source reality

The current AI worker implementation is Codex-specific:

- `CodexRuntimeManager` manages runtime installation/version, model catalog, selection, locking and launch;
- `createCodexRuntimeOperations()` provides filesystem/process implementation;
- `JsonlCodexAppServerTransport` adapts Codex App Server;
- `CodexImplementerExecutionService` exposes `getStatus`, `start`, environment resolution, user-input/approval/MCP responses, cancellation and shutdown;
- current execution is Work Card/Issue-oriented rather than a generic `workerId` service.

Separately, `agentHarness/runtime/**` owns the Background Agent, service-host process, MCP HTTP/runtime sessions, OAuth, diagnostics, startup and Desktop lifecycle. Those are runtime-host/platform concerns rather than the generic AI worker contract.

| Target call | Current Desktop equivalent | Coverage | Migration disposition |
| --- | --- | --- | --- |
| `listRuntimes()` | One implicit managed Codex runtime. | **New abstraction** | Add runtime registry; Codex adapter becomes first implementation. |
| `getRuntime(runtimeId)` | `CodexRuntimeManager.getStatus()` exposes current managed runtime/version. | **Partial** | Provider-neutral runtime descriptor. |
| `getRuntimeCapabilities(runtimeId)` | Codex transport reads capability states including MCP/Skills/apps/plugins; schema probing validates required methods. | **Partial / extract semantics** | Normalize to ChampCity runtime capability model. |
| `getRuntimeHealth(runtimeId)` | Codex managed status plus Agent Harness operational diagnostics. | **Partial** | Separate AI runtime health from Desktop Background Agent host health. |
| `getWorker(workerId)` | `CodexImplementerExecutionService.getStatus(workspaceRoot, selector?)` | **Existing semantics — extract** | Replace workspace/Issue selector identity with durable `workerId`. |
| `listWorkers(filter?)` | No generic worker inventory. | **New** | Runtime session registry/history. |
| `getWorkerEvents(workerId, cursor?)` | Transport streams/internal execution model events; not exposed as generic history API. | **Partial** | Normalize/store bounded event stream. |
| `getPendingInteraction(workerId)` | execution model tracks pending user input, approvals, and MCP elicitation. | **Existing semantics — extract** | Provider-neutral interaction union. |
| `startWorker(workerRequest)` | `CodexImplementerExecutionService.start(...)` | **Existing semantics — extract** | Generic execution request -> runtime adapter. |
| `interruptWorker(workerId)` | `cancel()` terminates current execution; transport supports turn interrupt. | **Partial** | Distinguish interrupt from terminate. |
| `steerWorker(workerId, instruction)` | No current ChampCity semantic. | **New** | Optional runtime capability. |
| `resumeWorker(workerId)` | No generic ChampCity semantic. | **New/adapter-dependent** | Optional runtime capability. |
| `respondToApproval(...)` | `respondToApproval()` | **Existing — extract** | Normalize provider decision types. |
| `respondToUserInput(...)` | `respondToUserInput()` | **Existing — extract** | Normalize request/response shape. |
| `terminateWorker(...)` | `cancel()` and `shutdownActiveExecutions()` | **Existing semantics — extract** | Durable termination reason/history. |

### Runtime host separation

The following should **not** become generic `RuntimeService` semantics:

- tray presentation;
- Windows login startup;
- installed-scope metadata;
- Desktop lifecycle lease;
- Electron utility process mechanics;
- sibling executable launch details; and
- Background Agent relaunch behavior.

Those stay in Desktop host infrastructure while implementing/hosting the same higher-level services.

---

# 6. ModelService Mapping

## Current source reality

`src/shared/codexRuntimeContracts.ts` currently defines:

- `CodexModelSelection`;
- `CodexModelCatalogEntry`;
- supported/default reasoning efforts; and
- `selectionBlocker()` validation.

`CodexRuntimeManager` loads/probes the catalog, persists selection, validates availability, and locks selection while execution is active.

The existing model contract does **not** expose provider-neutral context window data, token/cost telemetry, cache accounting, or routing.

| Target call | Current Desktop equivalent | Coverage | Migration disposition |
| --- | --- | --- | --- |
| `listProviders()` | Codex/provider is implicit. | **New** | Provider registry/configuration. |
| `listModels(filter?)` | Codex `model/list` -> `CodexModelCatalogEntry[]` | **Existing — adapter** | Normalize provider model catalog. |
| `getModel(modelId)` | Catalog lookup performed inside selection validation. | **Partial** | Provider-neutral model descriptor. |
| `getModelCapabilities(modelId)` | Supported reasoning efforts only; runtime capabilities observed separately. | **Partial** | Add context/tool/modality/runtime constraints. |
| `getModelSelection(scope)` | `CodexRuntimeManager.getStatus().selection` | **Existing — extract** | Make scope/provider-neutral. |
| `evaluateCompatibility(request)` | `selectionBlocker()` plus Codex schema/capability probes. | **Partial** | Combine Model + Runtime + Skill + Tool requirements. |
| `estimateExecution(...)` | None. | **New** | Context/token/cost estimator. |
| `getUsage(query)` | No unified product usage/cost service. | **New** | Capture runtime/provider usage telemetry. |
| `getContextBudget(...)` | None. | **New** | Implement explicit context budgets per capability-pack architecture. |
| `setModelSelection(...)` | `CodexRuntimeManager.setSelection()` | **Existing — extract** | Provider-neutral selection persistence. |
| `setProviderConfiguration(...)` | Agent Harness settings/OAuth exist for MCP, not general inference providers. | **New** | Secrets/config port. |
| `setUsageBudget(...)` | None. | **New** | Optional policy. |
| `requestModelRecommendation(...)` | None. | **New future capability** | Routing/recommendation policy. |

---

# 7. EnvironmentService Mapping

## Current source reality

Current development-environment support includes:

- `developmentEnvironmentCapabilityRegistry`;
- `DevelopmentEnvironmentPreflightService.runPreflight()`;
- `detectRepositoryEcosystemProviders()`;
- repository ecosystem -> managed requirements;
- `WindowsDevelopmentEnvironmentProvisioner.preflight()`;
- Windows package-provider resolution;
- Windows environment refresh; and
- `NodeCommandRunner.run()` / `runElevated()`.

The current preflight service reads a formal Work Card Markdown file and parses environment requirements from it. That is exactly the coupling to remove: requirements should come from structured Work Item/Skill/Environment requirements, not artifact parsing.

| Target call | Current Desktop equivalent | Coverage | Migration disposition |
| --- | --- | --- | --- |
| `listEnvironments(projectId?)` | Current workstation/environment is implicit; no environment inventory. | **New abstraction** | Add environment registry. |
| `getEnvironment(environmentId)` | No durable environment identity. | **New** | Explicit environment descriptor. |
| `getEnvironmentCapabilities(environmentId)` | capability registry and preflight probes. | **Existing semantics — extract** | Shared capability model. |
| `getEnvironmentHealth(environmentId)` | Preflight result approximates readiness for a task. | **Partial** | Separate general health from task preflight. |
| `preflightEnvironment(...)` | `DevelopmentEnvironmentPreflightService.runPreflight()` / provisioner preflight. | **Existing — extract** | Accept structured requirements rather than Work Card Markdown path. |
| `inspectRepositoryRequirements(...)` | `detectRepositoryEcosystemProviders()` and managed requirements. | **Existing — extract** | Repository ID + adapter access. |
| `createEnvironment(...)` | None; Desktop uses existing machine. | **New** | Server containers/VMs/remote workers later. |
| `provisionEnvironment(...)` | Windows provisioner/package resolver. | **Existing — adapter** | Windows Desktop adapter; Server gets its own adapters. |
| `refreshEnvironment(...)` | `refreshWindowsProcessEnvironment()` and repeated preflight. | **Partial / adapter** | Provider-neutral refresh contract. |
| `repairEnvironment(...)` | Provisioning can resolve missing requirements, but no general repair service. | **Partial** | Formalize deterministic repair operation. |
| `executeCommand(...)` | `NodeCommandRunner.run()` / runtime shell execution. | **Existing implementation — adapter** | Centralize environment command execution policy; avoid competing shell owners. |
| `destroyEnvironment(...)` | None. | **New** | Applies to disposable Server environments. |

---

# 8. MemoryService Mapping

## Current source reality

There is no first-class Memory service.

Memory-like behavior is currently achieved by:

- reading planning/Issue/Repair Markdown;
- Architect context resolvers;
- prompt builders;
- planning repository snapshots;
- handoff documents;
- current workflow context construction; and
- manual/implicit model rereading of project history.

The Agent Harness `knowledge_toolbox` is currently a status-only compatibility surface.

| Target call | Current Desktop equivalent | Coverage | Migration disposition |
| --- | --- | --- | --- |
| `recall(...)` | Repository/document search and human/model reading. | **New** | Build derived semantic recall over structured state. |
| `retrieveAuthoritativeContext(...)` | Context resolvers read authoritative artifacts directly. | **Existing intent — new implementation** | Deterministic ProjectStateService queries. |
| `buildContextPacket(...)` | Workflow-specific prompt/handoff/context builders. | **Partial semantics — extract** | Central context builder with explicit budgets/provenance. |
| `previewContextPacket(...)` | None. | **New** | Required for diagnostics/token transparency. |
| `explainRetrieval(...)` | Evidence paths/source revisions provide limited provenance. | **Partial concept** | Explicit retrieval provenance/explanation. |
| `getMemoryCheckpoint(...)` | Work Cards, Repair Cards, Implementer Reports act as manual checkpoints. | **Legacy semantic analogue** | Structured checkpoint records. |
| `listMemoryCheckpoints(...)` | Artifact directories/history. | **Legacy analogue** | Query structured checkpoints. |
| `createCheckpoint(...)` | Handoff/report artifact creation. | **Legacy analogue** | Create bounded structured state checkpoint. |
| `refreshProjectMemory(...)` | No derived memory index. | **New** | Rebuild derived retrieval state. |
| `invalidateDerivedMemory(...)` | Artifact invalidation/freshness exists, but not memory indexes. | **New with reusable freshness concepts** | Derived-state invalidation. |
| `rebuildDerivedMemory(...)` | None. | **New** | Derived-state rebuild. |

### MemoryService conclusion

Do not migrate “all Markdown into a vector store” and call it Memory. Memory should consume authoritative structured Project State and build bounded retrieval/context products from it.

---

# 9. SkillsService Mapping

## Current source reality

ChampCity does not yet own a first-class Skills Engine in Desktop source.

Current relevant behavior is limited to:

- Codex App Server capability discovery of `skills/list`;
- runtime capability presentation in Work Card execution UI;
- workflow-specific prompt instructions; and
- development-environment capability requirements.

The Brain Dump Skills Engine design, not current Desktop behavior, is therefore the primary source of truth for this service.

| Target call | Current Desktop equivalent | Coverage | Migration disposition |
| --- | --- | --- | --- |
| `listSkills(filter?)` | Codex runtime can report provider-native Skills; no ChampCity registry. | **New** | ChampCity canonical registry. |
| `getSkill(...)` | None. | **New** | Structured/versioned Skill definition. |
| `listSkillVersions(...)` | None. | **New** | Version history. |
| `getSkillRequirements(...)` | Environment/runtime requirements exist separately, not Skill-owned. | **New with reusable capability types** | Declarative Skill requirements. |
| `resolveSkills(taskContext)` | None. | **New** | Role/task/lifecycle resolver. |
| `evaluateSkillCompatibility(...)` | Runtime capability checks exist, but not Skill compatibility. | **Partial foundation** | Combine Skill requirements with Runtime/Model/Environment. |
| `buildSkillBundle(...)` | Runtime/provider-specific Skills mechanism only. | **New** | Adapter-neutral Skill package. |
| `registerSkill(...)` | None. | **New** | Registry command. |
| `publishSkillVersion(...)` | None. | **New** | Versioned governance. |
| `deprecateSkillVersion(...)` | None. | **New** | Preserve provenance while stopping new assignment. |
| `assignSkills(...)` | None. | **New** | Workflow/role/task assignment. |
| `removeSkillAssignment(...)` | None. | **New** | Governed removal. |

---

# Current Desktop Source That Does Not Belong in the Nine Semantic Services

Not every current function should be forced into the shared client-service contract.

## Desktop shell / host infrastructure

Keep Desktop-specific:

- `main.ts` Electron composition after domain calls are removed;
- `bootstrap.ts`;
- preload/context bridge transport;
- native folder/file dialogs;
- clipboard operations;
- local context menu;
- tray UI;
- Windows startup registration;
- installed-scope logic;
- Desktop lifecycle lease;
- relaunch/single-instance behavior; and
- native browser-window bounds/lifecycle.

These are mechanisms used by the Electron shell, not product-domain services.

## Background Agent host infrastructure

The Background Agent remains valuable for Desktop, but these details are not generic `RuntimeService` API semantics:

- Service Host descriptor files;
- Electron utility/sibling process launch;
- Windows startup registration;
- local lifecycle intent files;
- local OAuth-store file layout;
- tray lifecycle; and
- Desktop process fencing.

Extract reusable health/lifecycle interfaces where useful, but keep host implementation in Desktop.

## Architect embedded browser

`architectBrowserService.ts` primarily implements an Electron-hosted browser surface and sign-in/presentation lifecycle. It should remain a Desktop/browser-shell adapter.

Future model-facing browser tools belong under AI Tools and should invoke a browser capability provider. They are not the same thing as the current embedded ChatGPT presentation surface.

## Legacy Markdown compatibility

The following should not survive as steady-state Shared Product Core persistence:

- `canonicalMarkdownDocumentWriter` as the V1 canonical workflow-record writer;
- `planningDocumentService` as the primary state repository;
- `controlledMarkdownDrafts` as a workflow-state mechanism;
- Markdown disposition files as state transitions;
- repository planning paths as identity; and
- canonical-Markdown migration code after supported repositories are converted.

Retain import/export/projection functionality as required by the Desktop migration design.

---

# Current IPC to Future Service Mapping

The existing Electron IPC surface should be treated as a compatibility source, not the future semantic contract.

| Current IPC family | Future owner | Notes |
| --- | --- | --- |
| `workspace:get/choose/clear` | `ProjectService` + Desktop shell + `RepositoryService` | Native folder choice stays Desktop; active selection becomes Project selection; repository registration is separate. |
| `agentHarness:listRegisteredWorkspaces`, register/unregister | `RepositoryService` | These “workspaces” are registered repository roots. Rename during migration. |
| `agentHarness:status/start/stop/restart`, Background Agent lifecycle/settings | Desktop host infrastructure | Not generic AI worker runtime semantics. |
| `documents:list/read/setDisposition/resolveCurrent` | `ProjectStateService` + `WorkflowService` | Current document APIs become structured queries/commands/projections. |
| `workspaceMigration:*` | Project State migration adapter | Legacy-only after structured-state conversion. |
| `projectIntake:submit` | `ProjectService` + `WorkflowService` + `ProjectStateService` | Create/open Project and start Project Intake are separate semantic operations. |
| `projectPlanning:*`, `architectOutput:*`, `architectInterview:*`, `phaseInterview:*` | `WorkflowService` + `ProjectStateService` + future `MemoryService` | Clipboard handoff is shell presentation, not domain API. |
| `currentWorkflow:*` | `WorkflowService` | Strong candidate to become application façade, but state source must change. |
| `issueResolution:*` | `WorkflowService` + `ProjectStateService` | Decompose monolithic Issue service into commands/queries over structured Issue aggregate. |
| `codexRuntime:getStatus/setSelection` | `RuntimeService` + `ModelService` | Split runtime health/identity from model selection. |
| `codexImplementer:*` and Issue Codex execution endpoints | `RuntimeService` | Replace Codex/Work Card-specific methods with generic worker operations. |
| `architectBrowser:*` | Desktop shell/browser adapter | Presentation-specific. |

---

# AI Tool Registry Mapping

The existing `AgentHarnessToolRegistry` already provides useful concepts:

- public tool catalog;
- read/write scopes;
- action contracts;
- schema generation;
- fail-closed access/containment/policy checks;
- bounded errors;
- runtime contract fingerprints; and
- dispatch separation by tool/action.

Those concepts should be retained, but target dispatch should become:

```text
AI Tool
   -> capability + task-scope/access/policy check
   -> owning semantic service
   -> infrastructure adapter if required
```

Examples:

```text
repo_toolbox.read_file
   -> RepositoryService.readFile(...)

git_toolbox.diff
   -> RepositoryService.getDiff(...)

future project-state tool
   -> ProjectStateService.queryRecords(...)

future environment tool
   -> EnvironmentService.preflightEnvironment(...)
```

The model-facing schema may still be published through MCP, but MCP must remain transport rather than ownership.

The legacy tool argument named `workspaceId` should be replaced by explicit resource identity according to the action: usually `repositoryId`, `projectId`, `environmentId`, or worker/session identity.

---

# Duplicate and Overloaded Ownership to Resolve

## 1. Repository identity vs Project identity

Current repository root / MCP `workspaceId` / selected workspace frequently serves as all three:

- selected project;
- authorized repository;
- tool routing key.

Target architecture must split these identities.

## 2. Workflow state vs document state

Workflow eligibility is frequently inferred from document existence/disposition/freshness. `WorkflowService` should consume structured lifecycle, Decision/disposition, validation, dependency, and eligibility state rather than parse persistence representation.

## 3. Model selection vs runtime management

`CodexRuntimeManager` currently owns both managed runtime lifecycle and model catalog/selection. Future architecture splits:

- Runtime adapter/runtime health -> `RuntimeService`;
- provider/model catalog and model selection -> `ModelService`.

The Codex adapter may implement both behind the boundary, but Product Core semantics remain separate.

## 4. Environment command execution vs runtime shell execution

Windows environment provisioning has its own command runner while Codex runtime also performs shell execution. Future `EnvironmentService` should own the execution-environment boundary and policy; RuntimeService receives access appropriate to the selected worker rather than defining the machine itself.

## 5. Renderer sequencing vs Workflow state/eligibility

Renderer helpers currently contain some correctness-sensitive refresh/close/validation sequencing. Those decisions should move to Workflow/application services. Renderer code should retain only presentation coordination.

## 6. Artifact tools vs Project State

`artifact_toolbox` currently modifies Markdown artifacts. Once structured state is canonical, semantic Project State mutations should not be implemented as generic Markdown writes. Markdown write tools remain for genuine repository documents/export surfaces, not for changing workflow state or dispositions.

---

# Event Migration

Current Desktop behavior includes both explicit notifications and polling.

Examples include:

- `SelectedWorkspaceEvidenceNotifier` notifications;
- Architect browser foundation-status subscription; and
- `rendererPollingPolicy` polling Background Agent/Codex execution state according to foreground Workspace.

Target architecture should introduce service-scoped event subscriptions. The Desktop local adapter may initially translate events into current renderer refresh mechanisms while Server transports them over the selected remote event channel.

Migration rule:

> Define semantic events first. Choose IPC/WebSocket/other delivery separately.

---

# Recommended Extraction Sequence from the Service View

This sequence is consistent with `SOURCE_EXTRACTION_MAP.md` but expressed in terms of the client-service contract.

## 1. Establish identities and service DTOs

Define stable:

- `projectId`;
- `repositoryId`;
- `workflowId`;
- `workItemId`;
- `environmentId`;
- `runtimeId`;
- `workerId`; and
- Project State record identities.

Stop introducing new Product Core APIs that accept legacy `workspaceId` as an all-purpose resource/routing key.

## 2. Implement ProjectStateService port with an in-memory/test implementation

Use the existing Structured Project State domain model. This allows workflow extraction before final database technology is selected.

## 3. Extract WorkflowService decisions against structured state

Start with high-value deterministic rules:

- eligibility;
- current stage;
- required Operator Decision, if any;
- Operator disposition;
- validation outcome;
- Repair creation relationship;
- completion/close eligibility; and
- close/next behavior.

Characterization tests should prove parity with current Desktop behavior.

## 4. Consolidate RepositoryService

Move registered-repository identity, bounded path policy, file reads/search, patch mechanics, Git status/diff/readiness, and new mechanical Git mutation operations behind one semantic service.

## 5. Split Codex implementation into RuntimeService and ModelService adapters

Preserve current working Codex execution while making workflow logic consume provider-neutral execution/model contracts.

## 6. Refactor EnvironmentService preflight inputs

Replace “read environment requirements from Work Card Markdown path” with structured Work Item/Skill requirements. Keep Windows provisioning as a Desktop adapter.

## 7. Introduce MemoryService

Build retrieval/context packets over structured Project State. Do not wait for semantic/vector retrieval to implement deterministic authoritative retrieval.

## 8. Introduce SkillsService

Use UI Engineering as the proving Skill, as already defined in the Skills Engine design. Runtime-native Skills support becomes an adapter capability, not the canonical registry.

## 9. Adapt Desktop IPC to the semantic service boundary

Do not rewrite the UI simultaneously with every core extraction. A Desktop adapter can preserve current `window.champcity` calls temporarily while progressively routing them through the semantic services.

Once shared client calls are stable, collapse the compatibility API and make the renderer consume the shared client-service interfaces directly.

## 10. Implement Server against the same contracts

Server is then a second host over the Product Core rather than a fork of Desktop source.

---

# What Can Be Reused Directly vs Reimplemented

| Area | Direction |
| --- | --- |
| Lifecycle/Decision/disposition/eligibility rules | **Extract and share, then apply explicit V2 behavioral changes** |
| Validation/Repair/close semantics | **Extract and share** |
| Project State domain semantics | **Use new structured model; migrate current artifact semantics** |
| Markdown readers/writers | **Legacy importer/exporter/projection only** |
| Repository path safety/read/search/patch mechanics | **Retain behind adapters** |
| Git mechanical operations | **Consolidate/complete in RepositoryService** |
| MCP tool catalog/access/containment principles | **Retain; dispatch through owning services** |
| Codex worker behavior | **Retain as first Runtime adapter** |
| Codex model selection | **Retain as first Model/provider adapter** |
| Windows environment provisioner | **Retain as Desktop Environment adapter** |
| Electron main/preload/tray/startup | **Desktop-only** |
| Project catalog/Project resources | **New structured implementation** |
| Memory | **New implementation over structured state** |
| Skills Engine | **New ChampCity-owned implementation** |
| Context/token/cost management | **New/expanded ModelService capability** |
| Server event delivery | **New transport over semantic events** |

---

# Contract Gaps Exposed by the Audit

The proposed service set is broadly sufficient. The audit does **not** justify adding a generic `ToolService`, `GitService`, `DocumentService`, or `BrowserService` to the client contract at this time.

However, implementation design must explicitly account for the following supporting interfaces beneath the service layer:

1. **Principal/Auth context** — services need trusted caller identity/access claims and role context without accepting caller-manufactured Operator status or widened resource scope.
2. **Transaction boundary / Unit of Work** — Workflow and Project State commands will frequently require atomic multi-record changes.
3. **Blob/Evidence storage port** — screenshots and binary evidence should not be forced through repository files or database rows.
4. **Secrets/configuration port** — model/provider/runtime credentials must remain separate from ordinary project state.
5. **Event publisher/subscriber abstraction** — shared semantic events need local Desktop and remote Server implementations.
6. **Clock/ID/hash providers** — deterministic mechanics should be code-owned and testable rather than generated by agents.

These are supporting architectural ports, not additional product capabilities or user-facing services.

# Final Assessment

The current Desktop implementation should be treated as a **proven behavioral source and selective code donor**, not as the Server codebase.

The client-service contract gives us the extraction boundary:

```text
Current Desktop source
        |
        | extract domain behavior
        v
Shared Product Core + semantic services
        |
        +---------------------+
        |                     |
        v                     v
Desktop adapters         Server adapters
Electron/Windows         network/server host
local state DB           server state DB
local repository/env     remote/local execution resources
Codex adapter            Codex/local/future runtime adapters
```

The highest-risk migration is Project State because current V1 workflow state, dispositions, freshness, and completion are deeply coupled to Markdown/filesystem layout. The highest-value reusable body is Workflow/Governance. The strongest existing infrastructure foundation is Repository/AI Tool safety, now including bounded Git mutation. Runtime/Model can be evolved from the current Codex path. Memory and Skills should be implemented directly against the new architecture rather than reverse-engineered from legacy artifacts.

This mapping should be used together with `SOURCE_EXTRACTION_MAP.md` when drafting extraction Work Cards. The Source Extraction Map answers **where current code belongs**; this document answers **which future service contract that behavior must satisfy**.
