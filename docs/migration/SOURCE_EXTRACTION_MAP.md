# Source Extraction Map

## Purpose

This document is the migration map from the current `ChampCity_AI/src` implementation to the future ChampCity product architecture. It inventories the current source against the ten Product Capabilities and classifies each meaningful source area by its intended future ownership.

The map exists to prevent two failure modes:

1. treating the current Electron folder topology as the future architecture; and
2. rebuilding Desktop behavior independently inside Server instead of extracting one shared Product Core.

The classification describes the **future architectural ownership of the behavior**, not whether the current file is already portable. A source area classified as Shared Product Core may still require substantial separation from Electron, direct filesystem access, Markdown state, Windows behavior, Codex, or the legacy `workspaceId` model before it can move.

## Source Baseline

- Repository: `ChampCity_AI`
- Scope: `src/**`
- Baseline date: 2026-09-14 frozen V1 reconciliation
- Files inventoried: 185
- Current topology: `src/main`, `src/preload`, `src/renderer`, and `src/shared`
- Future rule: classify by product semantics, not by current Electron process location
- Migration rule: extract shared behavior on contact; do not copy Desktop services into Server

The inventory was refreshed against the frozen ChampCity A/I Desktop V1 working tree after the September 14 governance-vocabulary, bounded Git, Background Agent, packaging, and characterization cleanup. Generated assets are classified but are not treated as behavioral source. This remains a dated architectural inventory rather than a substitute for the exact Git revision/dirty-state evidence each V2 implementation Work Item must capture.

## Governing Architecture

This map is subordinate to:

- `CHAMPCITY_PRODUCT_CAPABILITY_MODEL.md` for the ten capability definitions;
- `CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md` for Shared Product Core, shared client/multiple shells, structured state, deterministic mechanics, runtime independence, canonical vocabulary, and Control Plane/Execution Plane separation;
- `CHAMPCITY_PROJECT_MEMORY_AND_AUTONOMOUS_WORKBENCH_ARCHITECTURE.md` for historical rationale around demand-loaded context, bounded workers, and repository separation, subject to the current Project State/AI Memory canonical-source boundaries in the Foundational Architecture Principles and Structured Project State Domain Model; and
- `CHAMPCITY_MODEL_AGNOSTIC_CAPABILITY_PACK_ARCHITECTURE.md` for ChampCity-owned tool semantics, capability packs, runtime compatibility, context budgeting, and conformance testing.

This document does not redefine those decisions. It maps the current source into them.

## Classification Model

| Classification | Meaning | Default migration treatment |
| --- | --- | --- |
| Shared Product Core | Product rules, Operator Decision semantics, contracts, state transitions, orchestration, validation, eligibility, or policy used by both Desktop and Server | Extract behind platform-neutral ports; preserve intended behavior with characterization tests while explicitly changing V1 behavior where V2 architecture says so |
| Shared Client | Reusable task-oriented Workspace presentation, components, visual assets/tokens, and non-authoritative view state across Desktop and Web shells | Extract to the shared client after removing native/transport coupling; Product Core owns legal transitions, not React presentation |
| Desktop-specific | Electron shell, native desktop UX, tray, preload/IPC, foreground/background process ownership, or packaged Windows desktop behavior | Retain in Desktop client/host; consume Product Core through application services |
| Server-specific future replacement | Current local runtime behavior that will be replaced by a durable server implementation rather than moved intact | Preserve contract and observable behavior; reimplement against server transport, persistence, security, and lifecycle |
| Infrastructure adapter | Filesystem, Git, MCP, HTTP, OAuth, provider runtime, browser, OS package manager, image storage, or other external-system integration | Put behind a Product Core port and select an adapter per deployment |
| Legacy/migration-only | Markdown-canonical V1 workflow state, paired-artifact conversion, repository planning projection, legacy identifier translation, or compatibility bridge | Use only for optional import/export/cutover compatibility; remove from steady-state V2 workflow-state ownership after migration |

Some rows have a primary classification plus a secondary extraction because a current file combines responsibilities.

## Ten Product Capabilities: Current-to-Future Matrix

| # | Product capability | Current source concentration | Current condition | Future owner | Migration decision |
| --- | --- | --- | --- | --- | --- |
| 1 | Workflows & Governance | `currentWorkflow`, `projectIntake`, `projectPlanning`, `phaseMap`, `phaseInterview`, `phasePlanning`, `phaseClose`, `projectClose`, `workCardIntake`, `workCardPlanning`, `workCardBuilding`, `workCardValidation`, `workCardRepair`, `workCardLoop`, `issueResolution`; related shared contracts and renderer orchestration helpers | Strong domain behavior exists, but orchestration reads/writes repository Markdown directly and some correctness-sensitive sequencing remains in renderer helpers | Shared Product Core | Extract lifecycle state machines, commands, policies, eligibility rules, Operator Decision boundaries, Design Reviewer/Validator transitions, and deterministic completion. Replace document-path inputs with structured project/work-item IDs and repositories. |
| 2 | AI Runtime & Execution | `agentHarness/runtime`, `workCardBuilding/codex*`, `browser/architectBrowserService`, `bootstrap`, `main.ts` | Agent Harness has useful service, session, diagnostics, and process contracts; execution is split between MCP runtime, Electron utility/service processes, embedded Browser ChatGPT, and a Codex-specific implementer path | Shared Product Core plus Server-specific future replacement and runtime adapters | Preserve runtime/session/capability semantics. Replace Electron process hosting and Codex app-server assumptions with deployment-neutral runtime and provider ports. Server owns durable remote execution; Desktop may host a local implementation of the same contracts. |
| 3 | AI Tools | `agentHarness/tools/toolRegistry`, `agentHarness/repository`, `agentHarness/workspace`, `agentHarness/core/errors`, MCP publication in `agentHarness/runtime/mcpServer` | ChampCity-owned tool semantics, bounded access/containment, and deterministic Git mutation already exist, but tool calls are keyed by legacy `workspaceId` and repository/Markdown operations are embedded in tool implementations | Shared Product Core plus infrastructure adapters | Retain semantic tool definitions, access/scope policy, bounded operations, diagnostics, Git mechanics, and error taxonomy. Separate product-level tool contracts from MCP transport and filesystem/Git implementations. Re-key resource routing to durable identities. |
| 4 | Project State & History | `documents`, workflow services, `shared/documents`, `workspaceSettings`, `sessionActiveWorkspaceSelection`, repository planning files | Repository Markdown and filesystem layout are both storage and state machine; status is repeatedly reconstructed by scanning files | Shared Product Core plus optional legacy importer/exporter | Define structured entities, Decisions, dispositions, validations, evidence, relationships, and projections. Keep Markdown as optional human-readable export/evidence, never steady-state V2 workflow state. A V1 importer is optional future work rather than a V2 dependency. |
| 5 | AI Memory | No dedicated bounded context/memory subsystem; partial behavior in planning documents, architect outputs, repository snapshots, context builders, and prompts | Memory is implicit in Markdown artifacts and reconstructed context, creating high token cost and weak retrieval boundaries | Shared Product Core; new implementation required | Extract reusable context-selection and provenance rules where present. Build structured project memory, bounded solution records, retrieval policy, and evidence links in the database. Do not migrate Markdown-as-memory intact. |
| 6 | AI Skills | No first-class skill registry; prompts, handoffs, workflow-specific instructions, tool schemas, and environment capability definitions are distributed across services | Skills are encoded as prompt text and workflow code rather than versioned, selectable capability packages | Shared Product Core; new implementation required | Inventory reusable instructions and capability requirements during workflow extraction. Create a versioned skill model with declared tools, runtime requirements, applicability, and provenance. |
| 7 | Model, Context & Usage Management | `CodexModelSelectionControls`, `codexRuntimeContracts`, `workCardBuilding/codex*`, workflow prompt/context builders, Agent Harness settings/diagnostics | Model and reasoning selection exists primarily for Codex implementation. Context construction is workflow-specific. Usage/cost is not a unified product capability | Shared Product Core plus provider adapters | Introduce provider-neutral model profiles, capability negotiation, context envelopes, routing, token/cost telemetry, and cache-aware prompt composition. Treat Codex as one adapter. |
| 8 | Repository & Source Control Management | `agentHarness/repository` including `gitMutations`, `documents/repositoryBinding`, `developmentEnvironment/repositoryEcosystemProvider`, Git actions exposed through tool registry | Useful bounded filesystem, binding, patch, inspection, and mutation mechanics exist, but repository mutation, Markdown artifacts, evidence storage, and workflow state are still partly conflated | Shared Product Core policy plus infrastructure adapters | Retain deterministic containment, binding, path, patch, Git, image-evidence, and validation mechanics. Move routine source-control orchestration and mechanical bookkeeping into RepositoryService. Remove repository documents as V2 workflow-state source. |
| 9 | Project Management | `workflowHubContracts`, workspace registry/presentation, project/phase/work-card/issue services and rails | Project organization exists mainly as repository selection plus lifecycle documents; `workspaceId` often acts as project identity | Shared Product Core | Create durable Project, Workstream/Phase, Work Item, Issue, Decision, Validation, and Dependency models. Separate project identity from execution workspace and repository attachment. |
| 10 | Development Environments | `developmentEnvironment/*`, implementation validation guidance, Codex runtime startup/preflight, repository ecosystem provider | Capability discovery and preflight are reusable; provisioning is Windows-specific and execution-provider-specific | Shared Product Core plus infrastructure adapters | Retain environment requirement/capability contracts and preflight policy. Split Windows/package-manager provisioning, local process execution, containers/VMs, and remote workers into adapters. |

## Source-Area Extraction Matrix

| Current source area | Primary capability | Classification | Shared logic to preserve | Coupling to remove or contain | Future target |
| --- | --- | --- | --- | --- | --- |
| `src/main/currentWorkflow` | Workflows & Governance | Shared Product Core | Current-step resolution and workflow aggregation | Filesystem/Markdown-derived state; Codex-specific execution status | `product-core/workflows/query` over structured state |
| `src/main/projectIntake` | Workflows & Governance; Project Management | Shared Product Core | Intake submission, corpus rules, post-submit state | Direct `fs`, canonical Markdown, repository paths, MCP prompt handoff | Project intake application service plus state repository port |
| `src/main/projectPlanning` | Workflows & Governance | Shared Product Core | Planning preflight, handoff, disposition, bundle policy | Direct `fs`, Markdown bundle, repository assumptions, Codex/Electron file heuristics | Planning command/query services; structured planning records |
| `src/main/phaseMap` | Workflows & Governance; Project Management | Shared Product Core | Phase-map creation and presentation semantics | Direct `fs`, Markdown draft output, Windows path behavior | Structured roadmap/phase model plus optional Markdown exporter |
| `src/main/phaseInterview` | Workflows & Governance | Shared Product Core | Interview readiness, submission, and context rules | Direct `fs`, Markdown draft output and paths | Interview session and answer records in Product Core |
| `src/main/phasePlanning` | Workflows & Governance | Shared Product Core | Phase planning bundle, readiness, disposition | Direct `fs`, Markdown, `workspaceId` in draft bundle | Structured phase-plan service; legacy importer/exporter |
| `src/main/phaseClose` | Workflows & Governance | Shared Product Core | Close eligibility and current Operator validation/acceptance decision boundary | Repository-derived evidence and document state | Phase state-machine command service |
| `src/main/projectClose` | Workflows & Governance | Shared Product Core | Project close eligibility and completion | `fs`, Markdown, `workspaceId` | Project state-machine command service |
| `src/main/workCardIntake` | Workflows & Governance | Shared Product Core | Work-card intake rules and handoff | Direct `fs`, Markdown paths | Work-item intake service |
| `src/main/workCardPlanning` | Workflows & Governance | Shared Product Core | Plan generation, map/order, readiness | Direct `fs`, Markdown artifact state | Work-item planning service and structured plan entities |
| `src/main/workCardBuilding/workCardBuildingReviewService.ts` | Workflows & Governance | Shared Product Core | Implementer-report review and disposition rules | Direct `fs`; provider/result assumptions | Provider-neutral implementation review service |
| `src/main/workCardBuilding/codex*` | AI Runtime & Execution; Model, Context & Usage | Infrastructure adapter | Execution lifecycle, cancellation, event/status semantics, model/reasoning selection | Codex app-server protocol, process environment, filesystem, Electron-as-Node | `runtime-adapters/codex`; generic execution session port in Product Core |
| `src/main/workCardLoop` | Workflows & Governance | Shared Product Core | Effective completion evidence, repair loop, close/next transition, dependency selection | Markdown parsing, repository layout, renderer coordination | Explicit Work Item state machine with transactional structured persistence |
| `src/main/workCardValidation` | Workflows & Governance | Shared Product Core | Validation dispositions, evidence and repair eligibility | Direct `fs`, Markdown validation records | Validation command service and evidence repository |
| `src/main/workCardRepair` | Workflows & Governance | Shared Product Core | Causally subordinate repair semantics | Direct `fs`, Markdown repair cards | Repair work-item subtype/relationship in structured state |
| `src/main/issueResolution` | Workflows & Governance | Shared Product Core | Issue discovery, planning, fix-card, validation and close rules | Direct `fs`, Markdown, Codex status knowledge | Issue aggregate and command/query services |
| `src/main/architectInterview` | Workflows & Governance; AI Memory | Shared Product Core | Context selection, interview state, refresh and draft-submission rules | Direct `fs`, Markdown paths/revisions, `workspaceId` | Structured conversation/work-product context service |
| `src/main/architectOutputs` | AI Memory; Workflows & Governance | Shared Product Core | Output types, draft lifecycle, promotion/submission, catalog rules | Direct `fs`, Markdown, repository draft directories, `workspaceId` | Work-product/decision records with provenance and state |
| `src/main/documents/artifactTransaction.ts` and disposition/resolver behavior | Project State & History | Shared Product Core | Atomic disposition intent, ordering, first-non-approved resolution | Filesystem transaction implementation and Markdown metadata | Database transaction plus domain policies |
| `src/main/documents/canonicalMarkdownDocumentWriter.ts`, `planningDocumentService.ts`, projections and snapshots | Project State & History | Legacy/migration-only | Canonical V1 parsing/export rules needed for compatibility evidence | Direct `fs`; Markdown and repository layout as the V1 workflow-state source | Importer/exporter and read-only compatibility projection |
| `src/shared/documents` | Project State & History | Shared Product Core with legacy types | Disposition, order, freshness, lifecycle semantics | Markdown-centric names, metadata and paths; `workspaceId` in document ordering/lifecycle | Format-neutral domain types; Markdown DTOs isolated in migration adapter |
| `src/main/migrations` | Project State & History | Legacy/migration-only | Existing paired-artifact cutover knowledge | Old repository artifact layouts | Versioned import migration only |
| `src/main/agentHarness/core/errors.ts` | AI Tools | Shared Product Core | Stable error categories and fail-closed semantics | Any transport-shaped error payload assumptions | Product tool/access/scope/policy error model |
| `src/main/agentHarness/tools/toolRegistry.ts` | AI Tools | Shared Product Core with adapter split | Tool catalog, scopes, action dispatch, contract capture | MCP publication shape, repository operations, Markdown actions, `workspaceId` | Product tool registry; MCP/HTTP adapters publish it |
| `src/main/agentHarness/workspace` | AI Tools; Project Management | Shared Product Core with compatibility adapter | Registered-resource access/binding policy and deterministic registry identity | Direct `fs`; repository-root registry; `workspaceId` as legacy public identity | Repository registry/access service keyed by durable IDs; legacy ID resolver at compatibility boundary |
| `src/main/agentHarness/repository/boundedGit.ts`, `gitMutations.ts`, `pathPolicy.ts`, `repositoryOperations.ts`, `patches.ts` | Repository & Source Control | Infrastructure adapter | Bounded paths, safe read/write/patch, deterministic Git inspection and mutation mechanics | Direct `fs`, platform path rules, Markdown-specific operations, legacy `workspaceId` routing | Filesystem and Git adapters behind RepositoryService ports |
| `src/main/agentHarness/repository/attachedImages.ts`, `issueScreenshotEvidence.ts` | Repository & Source Control; Project State & History | Infrastructure adapter | Image validation, bounded evidence attachment, provenance | Direct filesystem and repository-relative evidence location | Evidence/blob storage port with local and server adapters |
| `src/main/agentHarness/repository/controlledMarkdownDrafts.ts`, `textProjection.ts` | Project State & History | Legacy/migration-only | Safe import/export and controlled compatibility writes | Markdown and repository files as the primary artifact system | Migration/import/export adapter; not a Product Core persistence path |
| `src/main/agentHarness/runtime/agentHarnessService.ts`, `httpRuntime.ts`, `mcpServer.ts`, `operationalDiagnostics.ts` | AI Runtime & Execution; AI Tools | Server-specific future replacement plus reusable contracts | Service lifecycle, MCP sessions, tool-contract publication, diagnostics | Local user-data root, in-process registry, HTTP host assumptions, `workspaceId` | Server runtime/application host; local Desktop host implements same service contracts |
| `src/main/agentHarness/runtime/agentHarnessController.ts`, worker/process/service-host protocols and clients | AI Runtime & Execution | Desktop-specific transport | Restart/recovery semantics, heartbeat and process-boundary contracts | Electron utility process, sibling-process launch, local IPC/socket/files | Desktop runtime host adapter; shared lifecycle interfaces extracted first |
| `src/main/agentHarness/runtime/*Tray*`, install/startup/relaunch/lease/installed-scope/Windows observation | AI Runtime & Execution | Desktop-specific | Explicit lifecycle intent and safe maintenance exclusion | Electron app/tray/power APIs, Windows login items/registry/process rules, local files | Windows Desktop host only |
| `src/main/agentHarness/runtime/agentHarnessSettings.ts`, `oauthStore.ts`, build identity/environment | AI Runtime & Execution | Infrastructure adapter | Configuration validation, credential-store intent, build compatibility | Direct `fs`, local user-data layout, legacy OAuth import | Configuration, secrets, and deployment metadata ports |
| `src/main/browser/architectBrowserService.ts` | AI Runtime & Execution | Desktop-specific infrastructure adapter | Browser session/handoff intent | Electron `BrowserWindow` and desktop bounds/lifecycle | Desktop browser adapter; future remote/browser providers implement a common port |
| `src/main/developmentEnvironment` shared registry/preflight/contracts | Development Environments | Shared Product Core | Capability requirements, detection, preflight, repository ecosystem semantics | Direct `fs` and local process/package assumptions | Environment capability service and provider interfaces |
| `src/main/developmentEnvironment/windows*` | Development Environments | Infrastructure adapter | Provisioning flow and refresh semantics | Windows commands, package providers and environment refresh | Windows environment adapter alongside container/VM/remote adapters |
| `src/main/integrations` | AI Tools; Workflows & Governance | Infrastructure adapter | Handoff boundaries and prompt contract intent | MCP transport, repository-root prompts, `workspaceId`, direct `fs` | MCP adapter and legacy prompt/ID compatibility layer |
| `src/main/sessionActiveWorkspaceSelection.ts`, `workspaceSettings.ts`, `workspaceEvidence` | Project Management; Project State & History | Shared selection semantics plus infrastructure adapter | Explicit session selection and evidence-notification semantics | Direct `fs`, local settings, legacy workspace terminology | Project/session selection service with client-local settings adapter |
| `src/main/supportedImageValidation.ts` | Project State & History | Shared Product Core | Supported-image and evidence validation policy | Current storage/path assumptions | Product evidence policy used by all storage adapters |
| `src/main/validation` | Development Environments; Workflows & Governance | Shared Product Core | Validation-scope guidance and relevance policy | Any command/runtime-specific assumptions | Validation planning policy plus executor adapters |
| `src/main/main.ts`, `bootstrap.ts`, `contextMenu` | Desktop shell | Desktop-specific | Desktop use-case composition only | Electron, IPC, native dialogs/clipboard/menu, filesystem, Windows packaging/lifecycle | Thin Desktop composition root; no domain decisions |
| `src/preload/index.ts` | Desktop shell | Desktop-specific | Typed client API boundary | Electron context bridge/IPC and Codex-specific endpoints | Desktop transport adapter generated or mapped from application contracts |
| `src/renderer/app/*.tsx` | Shared client plus Desktop-shell exceptions | Shared Client with Product Core extraction and Desktop adapter seams | Reusable presentation, user intent capture, bounded view state, task-oriented Workspaces and shared interaction patterns | Electron bridge APIs; correctness-sensitive workflow sequencing embedded in some helpers; Markdown-shaped view models; Codex-specific controls; native-only surfaces | `packages/client` for reusable presentation; Product Core for extracted decisions; `apps/desktop` only for Electron/native integration |
| Renderer orchestration helpers (`closeReturn*`, `phaseValidation*`, `evidenceDriven*`, `architectBrowserBounds*`, `rendererPollingPolicy`) | Workflows & Governance | Shared Product Core extraction required from Desktop code | Sequencing, refresh, close-return and evidence rules that affect correctness | Renderer lifecycle, polling, `workspaceId`, browser bounds, Codex state | Move decisions to application services; leave only presentation coordination in renderer |
| `src/shared/architect*`, `issueResolutionContracts`, `lifecycle`, `projectIntake`, `workflowHubContracts`, `workspaces` | Multiple Product Core capabilities | Shared Product Core | Existing cross-process contracts and deterministic presentation policies | Markdown paths/revisions, `workspaceId`, Electron-era workspace concepts | Split into domain, application API DTOs, and compatibility DTOs |
| `src/shared/codexRuntimeContracts.ts` | Model, Context & Usage Management | Infrastructure adapter | Execution-event concepts that generalize | Codex naming and protocol-specific fields | Provider-neutral execution contracts plus Codex translation DTO |
| `src/shared/productIdentity.ts` | Desktop shell | Desktop-specific | Product naming constants | Electron application interface | Desktop branding module |
| `src/renderer/assets*`, `index.html`, `main.tsx`, `styles.css` | Shared client presentation plus shell bootstrap | Shared Client with Desktop-shell exceptions | Reusable design assets/tokens/styles and shared client presentation | Current renderer bootstrap/bundler and Electron delivery assumptions | Shared assets/tokens/client styles move with `packages/client` where reusable; Desktop renderer bootstrap/delivery remains in `apps/desktop` |

## Cross-Cutting Coupling Register

The following register identifies direct code references and semantically coupled areas. A filename appearing here is not automatically discarded; it marks a required seam before the behavior can enter Shared Product Core.

### Electron coupling

Direct Electron coupling is concentrated in:

- `src/main/agentHarness/runtime/agentHarnessController.ts`
- `src/main/agentHarness/runtime/agentHarnessInstallLifecycle.ts`
- `src/main/agentHarness/runtime/agentHarnessServiceHost.ts`
- `src/main/agentHarness/runtime/agentHarnessServiceHostStartupRegistration.ts`
- `src/main/agentHarness/runtime/agentHarnessWorker.ts`
- `src/main/agentHarness/runtime/backgroundAgentRelaunch.ts`
- `src/main/agentHarness/runtime/backgroundAgentTray.ts`
- `src/main/bootstrap.ts`
- `src/main/browser/architectBrowserService.ts`
- `src/main/main.ts`
- `src/main/workCardBuilding/codexAppServerTransport.ts`
- `src/preload/index.ts`
- `src/shared/productIdentity.ts`

`projectPlanningPreflight.ts` also knows about `electron-builder.yml`; this is repository/tooling detection, not a reason for planning policy to depend on Electron.

### Direct filesystem coupling

Direct `node:fs` use occurs across 58 files. The required seams are best managed by responsibility rather than by creating 58 arbitrary wrappers:

| Filesystem-coupled family | Files | Required seam |
| --- | ---: | --- |
| Agent Harness repository and workspace access | `controlledMarkdownDrafts`, `issueScreenshotEvidence`, `attachedImages`, `patches`, `pathPolicy`, `repositoryOperations`, `gitMutations`, `textProjection`, `registeredWorkspaceRegistry`, `workspaceAccess` | Repository, Git, blob/evidence, registry, and migration ports |
| Agent Harness runtime/configuration | build identity, service host/descriptor/settings/server, background intent, installed scope, lifecycle lease, settings, OAuth store | Configuration, secret store, deployment identity and Desktop-host adapters |
| Workflow and planning services | architect interview/output services; issue resolution; phase/project/work-card services and draft bundles | Structured aggregate repositories and transaction boundary |
| Document subsystem | artifact transaction, canonical writer, disposition writer, planning service/context/snapshot, repository binding | Structured persistence plus Markdown import/export/projection adapter |
| Development environment and execution | environment preflight/ecosystem/provisioner; Codex runtime/implementer services | Environment/executor ports |
| Shell/settings/evidence | `main.ts`, `workspaceSettings.ts`, `selectedWorkspaceEvidenceNotifier.ts` | Desktop settings, native shell and notification adapters |

The direct filesystem list must be treated as an extraction checklist. Product Core code must not call `node:fs`; filesystem access belongs in adapters selected by Desktop or Server.

### Markdown-state coupling

Markdown coupling appears in the Agent Harness repository tools, the document subsystem, architect interview/output flows, phase/project/work-card lifecycle services, renderer workflow presentations, and shared DTOs. The most consequential locations are:

- `src/main/documents/**`
- `src/shared/documents/**`
- `src/main/agentHarness/repository/controlledMarkdownDrafts.ts`
- `src/main/agentHarness/repository/textProjection.ts`
- `src/main/agentHarness/repository/patches.ts`
- `src/main/agentHarness/repository/repositoryOperations.ts`
- `src/main/architectInterview/**`
- `src/main/architectOutputs/**`
- `src/main/phaseInterview/**`
- `src/main/phasePlanning/**`
- `src/main/projectPlanning/**`
- `src/main/projectClose/projectCloseService.ts`
- `src/main/workCardLoop/**`
- issue/phase validation and close renderer helpers
- shared architect-output, issue-resolution, project-intake, workspace and lifecycle contracts

Future rule: Markdown may be an import, export, prompt payload, evidence rendition, or user-authored document. It may not be the canonical database record or the mechanism used to infer lifecycle state.

### Windows coupling

Windows-specific behavior is legitimate in a Desktop adapter but must not leak into Shared Product Core. Current concentrations are:

- Agent Harness lifecycle/install/service host, startup registration, tray, sibling-process launch, installed-scope/lease, and `windowsRunObservation`
- `agentHarness/repository/boundedGit.ts` and `pathPolicy.ts` platform handling
- `developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts`
- `developmentEnvironment/windowsEnvironmentRefresh.ts`
- `developmentEnvironment/windowsPackageProviderResolver.ts`
- Windows-sensitive path handling in planning repository snapshot/context and selected architect-output paths
- Desktop composition in `main.ts`

### Codex coupling

Codex is currently a first-class implementation path instead of one interchangeable runtime/provider. The coupling surface includes:

- all `src/main/workCardBuilding/codex*` files
- `src/shared/codexRuntimeContracts.ts`
- `src/renderer/app/CodexModelSelectionControls.tsx`
- `src/renderer/app/codexExecutionPresentationOwnership.ts`
- Codex status/selection knowledge in `App.tsx`, `IssueFixCardMapWorkspace.tsx`, `rendererPollingPolicy.ts`, `currentWorkflowService.ts`, `issueResolutionService.ts`, and `main.ts`
- Codex/repository heuristics in `projectPlanningPreflight.ts`
- Codex workspace patch compatibility in `agentHarness/repository/patches.ts`
- Codex endpoints exposed by `preload/index.ts`

Future rule: Product Core requests an execution capability and model profile. A runtime adapter translates that request to Codex, another hosted provider, or a local model. Workflow state must not depend on Codex process state or Codex-specific result formats.

### Legacy `workspaceId` coupling

The current `workspaceId` is simultaneously used as an MCP routing key, registered repository identity, prompt instruction, UI selection key, and proxy for project/repository context. Direct or contract-level coupling occurs in:

- Agent Harness controller/process/service-host protocols, worker, service, MCP server, diagnostics and tool registry
- registered workspace registry and workspace access
- repository operations and text projection
- architect interview draft pilot
- architect output paths, registry, promotion, submission, runtime, workspace service and catalog
- phase-planning draft bundle and project-close service
- renderer phase-validation orchestration and polling policy
- shared workspace registry/presentation/document-workspace contracts
- shared architect-output, document-order/lifecycle and project-intake review contracts
- MCP workspace prompt/handoff integration, even where the literal identifier is rendered as prose

Future replacement:

| Concern | Durable identity |
| --- | --- |
| Product ownership and history | `projectId` |
| Repository attachment | `repositoryId` |
| Execution boundary | `environmentId` or `executionTargetId` |
| Agent/tool session | `sessionId` |
| Bounded filesystem root | `resourceRootId` |
| User-selected client context | `selectionId` or explicit project/session reference |

During migration, a legacy `workspaceId` resolver may translate existing registrations into these records. New Product Core APIs must not accept `workspaceId` as an all-purpose resource, scope, or decision token.

## Extraction Order

The migration should proceed by dependency direction, not by screen or current folder:

1. **Freeze observable behavior.** Use the existing V1 characterization suite to preserve proven behavior and explicitly label V2-authorized changes such as validator-owned routine card validation, reduced Operator card-loop participation, and structured-state ownership.
2. **Define Product Core identities and persistence ports.** Establish project, repository, execution target, session, work item, decision, validation, evidence, and work-product records before moving services.
3. **Extract workflow state machines.** Move eligibility, Decisions/dispositions, close/next, repair and validation semantics out of filesystem scans and renderer orchestration; introduce the Design Reviewer/Validator boundaries where the V2 architecture requires them.
4. **Replace Markdown as the live workflow-state source.** Implement structured state; retain deterministic Markdown export/evidence views. V1 legacy import remains optional future work.
5. **Separate AI runtime/provider contracts.** Generalize execution session, model profile, capability negotiation, context envelope and usage telemetry; move Codex behind an adapter.
6. **Separate tool semantics from transport.** Product Core owns tool definitions and authorization; MCP and HTTP publish them; filesystem/Git/blob adapters perform the work.
7. **Split deployment hosts.** Keep Electron/preload/tray/Windows behavior in Desktop. Build the Server host against the same Product Core application contracts and server-grade persistence/security.
8. **Retire compatibility layers.** Remove `workspaceId` from Product Core, stop reconstructing state from repository Markdown, and delete migration-only code after supported repositories are converted.

## First Extraction Units

| Priority | Extraction unit | Why first | Completion signal |
| --- | --- | --- | --- |
| 1 | Identity and resource-boundary model | Every other seam is distorted while `workspaceId` means project, repository, root and session | Product Core APIs use explicit durable IDs; legacy ID exists only in an adapter |
| 2 | Workflow state/disposition model | Highest-value shared behavior; currently drives most filesystem and Markdown reads | Current lifecycle/repair/validation characterization tests pass against an in-memory structured repository |
| 3 | Work-product and evidence model | Replaces Markdown-as-memory and enables bounded Architect-to-Implementer handoff | Architect output, bounded solution, implementation report, validation and evidence are structured records with provenance |
| 4 | Provider-neutral execution contract | Prevents Server from inheriting the Codex path as architecture | Same execution request can be served by a Codex adapter and a test/local adapter without workflow changes |
| 5 | Tool/access-policy core | Existing Agent Harness work is a strong seed but currently bound to MCP and repository workspaces | Tool registry, access/scope policy, and contract tests run without MCP, Electron, filesystem or Git |
| 6 | Repository/source-control ports | Mechanical operations should remain deterministic code capabilities | Local filesystem/Git adapter passes conformance tests; workflows depend only on ports |

## Migration Guardrails

- Do not move a service merely because it is under `src/shared`; several shared contracts encode Markdown paths, Codex, or `workspaceId`.
- Do not leave lifecycle/disposition/eligibility decisions in renderer helpers. The client may sequence presentation, but the application service decides whether a transition is valid.
- Do not make Server read the Desktop repository artifact tree as its database.
- Do not replace direct `fs` calls with a generic remote filesystem service and call that Product Core. The core needs semantic repositories, not remotely callable file operations.
- Do not rename `workspaceId` to `projectId` without separating project, repository, environment, session and resource-root identities.
- Do not generalize Codex by wrapping its current protocol in a provider-named interface. Define the ChampCity execution contract first, then adapt Codex to it.
- Preserve fail-closed access/policy/containment, genuine Operator Decision boundaries, validation evidence, repair causality, and deterministic Git mechanics.
- Desktop and Server must share domain and application behavior while keeping independent deployment adapters and persistence configurations.

## Appendix A: Exact Direct-Coupling File Register

These lists are the mechanical search register for the frozen 2026-09-14 V1 source baseline. They record direct symbols/imports or explicit terminology. The source-area matrix adds semantic coupling that may not use the literal search term.

### A.1 Direct Electron references

```text
src/main/agentHarness/runtime/agentHarnessController.ts
src/main/agentHarness/runtime/agentHarnessInstallLifecycle.ts
src/main/agentHarness/runtime/agentHarnessServiceHost.ts
src/main/agentHarness/runtime/agentHarnessServiceHostStartupRegistration.ts
src/main/agentHarness/runtime/agentHarnessWorker.ts
src/main/agentHarness/runtime/backgroundAgentRelaunch.ts
src/main/agentHarness/runtime/backgroundAgentTray.ts
src/main/bootstrap.ts
src/main/browser/architectBrowserService.ts
src/main/main.ts
src/main/projectPlanning/projectPlanningPreflight.ts
src/main/workCardBuilding/codexAppServerTransport.ts
src/preload/index.ts
src/shared/productIdentity.ts
```

### A.2 Direct `node:fs` imports

```text
src/main/agentHarness/repository/attachedImages.ts
src/main/agentHarness/repository/controlledMarkdownDrafts.ts
src/main/agentHarness/repository/issueScreenshotEvidence.ts
src/main/agentHarness/repository/patches.ts
src/main/agentHarness/repository/pathPolicy.ts
src/main/agentHarness/repository/repositoryOperations.ts
src/main/agentHarness/repository/textProjection.ts
src/main/agentHarness/runtime/agentHarnessBuildIdentity.ts
src/main/agentHarness/runtime/agentHarnessServiceHost.ts
src/main/agentHarness/runtime/agentHarnessServiceHostDescriptor.ts
src/main/agentHarness/runtime/agentHarnessServiceHostLifecycleSettings.ts
src/main/agentHarness/runtime/agentHarnessServiceHostServer.ts
src/main/agentHarness/runtime/agentHarnessSettings.ts
src/main/agentHarness/runtime/backgroundAgentIntent.ts
src/main/agentHarness/runtime/champCityInstalledScope.ts
src/main/agentHarness/runtime/desktopLifecycleLease.ts
src/main/agentHarness/runtime/oauthStore.ts
src/main/agentHarness/workspace/registeredWorkspaceRegistry.ts
src/main/agentHarness/workspace/workspaceAccess.ts
src/main/architectInterview/architectInterviewDraftPilot.ts
src/main/architectInterview/architectInterviewService.ts
src/main/architectOutputs/architectDraftPromotionService.ts
src/main/architectOutputs/architectDraftSubmissionService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts
src/main/developmentEnvironment/repositoryEcosystemProvider.ts
src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts
src/main/documents/artifactTransaction.ts
src/main/documents/canonicalMarkdownDocumentWriter.ts
src/main/documents/documentDispositionWriter.ts
src/main/documents/planningDocumentService.ts
src/main/documents/planningProjectionContext.ts
src/main/documents/planningRepositorySnapshot.ts
src/main/documents/repositoryBinding.ts
src/main/integrations/mcpWorkspacePromptContract.ts
src/main/issueResolution/issueResolutionService.ts
src/main/main.ts
src/main/migrations/pairedArtifactsToCanonicalMarkdownV1.ts
src/main/phaseInterview/phaseInterviewDraftOutput.ts
src/main/phaseInterview/phaseInterviewService.ts
src/main/phaseMap/phaseMapDraftOutput.ts
src/main/phaseMap/phaseMapService.ts
src/main/phasePlanning/phasePlanningDraftBundle.ts
src/main/phasePlanning/phasePlanningService.ts
src/main/projectIntake/projectIntakeService.ts
src/main/projectPlanning/projectPlanningDraftBundle.ts
src/main/projectPlanning/projectPlanningPreflight.ts
src/main/projectPlanning/projectPlanningService.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/main/workCardBuilding/codexRuntimeOperations.ts
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/workCardLoop/workCardCloseReturnLifecycle.ts
src/main/workCardLoop/workCardLoopStateService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardRepair/workCardRepairService.ts
src/main/workCardValidation/workCardValidationService.ts
src/main/workspaceEvidence/selectedWorkspaceEvidenceNotifier.ts
src/main/workspaceSettings.ts
```

### A.3 Direct Markdown terminology/contracts

```text
src/main/agentHarness/repository/controlledMarkdownDrafts.ts
src/main/agentHarness/repository/patches.ts
src/main/agentHarness/repository/repositoryOperations.ts
src/main/agentHarness/repository/textProjection.ts
src/main/agentHarness/tools/toolRegistry.ts
src/main/architectInterview/architectInterviewContextResolver.ts
src/main/architectInterview/architectInterviewDraftPilot.ts
src/main/architectInterview/architectInterviewService.ts
src/main/architectInterview/projectArchitectInterviewPromptWriter.ts
src/main/architectOutputs/architectDraftPaths.ts
src/main/architectOutputs/architectDraftPromotionService.ts
src/main/architectOutputs/architectDraftSubmissionService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/architectOutputs/productionArchitectOutputCatalog.ts
src/main/documents/canonicalMarkdownDocumentWriter.ts
src/main/documents/developmentPostMutationProjection.ts
src/main/documents/documentDispositionWriter.ts
src/main/documents/planningDocumentService.ts
src/main/documents/planningRepositorySnapshot.ts
src/main/documents/repositoryBinding.ts
src/main/phaseInterview/phaseInterviewDraftOutput.ts
src/main/phaseInterview/phaseInterviewService.ts
src/main/phasePlanning/phasePlanningDraftBundle.ts
src/main/phasePlanning/phasePlanningService.ts
src/main/projectClose/projectCloseService.ts
src/main/workCardLoop/effectiveWorkCardCompletion.ts
src/main/workCardLoop/workCardCloseReturnLifecycle.ts
src/renderer/app/IssueCloseWorkspace.tsx
src/renderer/app/IssueFixCardMapWorkspace.tsx
src/renderer/app/IssuePlanningWorkspace.tsx
src/renderer/app/IssueValidationWorkspace.tsx
src/renderer/app/closeReturnRendererOrchestration.ts
src/renderer/app/phaseValidationRendererOrchestration.ts
src/shared/architectInterview/architectInterviewRefreshState.ts
src/shared/architectOutputs/architectOutputContracts.ts
src/shared/developmentEnvironment/developmentEnvironmentContract.ts
src/shared/documents/canonicalMarkdown.ts
src/shared/documents/documentOrder.ts
src/shared/documents/lifecycleArtifact.ts
src/shared/documents/planningDocument.ts
src/shared/documents/sourceFreshness.ts
src/shared/issueResolutionContracts.ts
src/shared/projectIntake/postSubmitReviewState.ts
src/shared/projectIntake/projectIntakeCorpus.ts
src/shared/workspaceContracts.ts
src/shared/workspaces/documentWorkspace.ts
src/shared/workspaces/projectLifecycleRailStatus.ts
```

This literal list is supplemented by all workflow services that infer state from Markdown filenames, directory existence, dispositions, or repository projections even when the word “Markdown” is absent.

### A.4 Direct legacy `workspaceId` references

```text
src/main/agentHarness/repository/repositoryOperations.ts
src/main/agentHarness/repository/textProjection.ts
src/main/agentHarness/runtime/agentHarnessController.ts
src/main/agentHarness/runtime/agentHarnessProcessProtocol.ts
src/main/agentHarness/runtime/agentHarnessService.ts
src/main/agentHarness/runtime/agentHarnessServiceHostClient.ts
src/main/agentHarness/runtime/agentHarnessServiceHostProtocol.ts
src/main/agentHarness/runtime/agentHarnessServiceHostServer.ts
src/main/agentHarness/runtime/agentHarnessWorker.ts
src/main/agentHarness/runtime/mcpServer.ts
src/main/agentHarness/runtime/operationalDiagnostics.ts
src/main/agentHarness/tools/toolRegistry.ts
src/main/agentHarness/workspace/registeredWorkspaceRegistry.ts
src/main/agentHarness/workspace/workspaceAccess.ts
src/main/architectInterview/architectInterviewDraftPilot.ts
src/main/architectOutputs/architectDraftPaths.ts
src/main/architectOutputs/architectDraftPromotionService.ts
src/main/architectOutputs/architectDraftSubmissionService.ts
src/main/architectOutputs/architectOutputRegistry.ts
src/main/architectOutputs/architectOutputRuntimeService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/architectOutputs/productionArchitectOutputCatalog.ts
src/main/phasePlanning/phasePlanningDraftBundle.ts
src/main/projectClose/projectCloseService.ts
src/renderer/app/phaseValidationRendererOrchestration.ts
src/renderer/app/rendererPollingPolicy.ts
src/shared/architectOutputs/architectOutputContracts.ts
src/shared/documents/documentOrder.ts
src/shared/documents/lifecycleArtifact.ts
src/shared/projectIntake/postSubmitReviewState.ts
src/shared/workspaceContracts.ts
src/shared/workspaces/documentWorkspace.ts
src/shared/workspaces/projectLifecycleRailStatus.ts
src/shared/workspaces/projectRailPresentation.ts
src/shared/workspaces/workspaceRegistry.ts
```

### A.5 Windows-specific references or behavior

```text
src/main/agentHarness/repository/boundedGit.ts
src/main/agentHarness/repository/pathPolicy.ts
src/main/agentHarness/runtime/agentHarnessInstallLifecycle.ts
src/main/agentHarness/runtime/agentHarnessServiceHost.ts
src/main/agentHarness/runtime/agentHarnessServiceHostDescriptor.ts
src/main/agentHarness/runtime/agentHarnessServiceHostServer.ts
src/main/agentHarness/runtime/agentHarnessServiceHostStartupRegistration.ts
src/main/agentHarness/runtime/backgroundAgentTray.ts
src/main/agentHarness/runtime/champCitySiblingProcessLaunch.ts
src/main/agentHarness/runtime/desktopLifecycleLease.ts
src/main/agentHarness/runtime/windowsRunObservation.ts
src/main/agentHarness/workspace/registeredWorkspaceRegistry.ts
src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts
src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts
src/main/developmentEnvironment/windowsEnvironmentRefresh.ts
src/main/developmentEnvironment/windowsPackageProviderResolver.ts
src/main/documents/planningProjectionContext.ts
src/main/documents/planningRepositorySnapshot.ts
src/main/main.ts
```

### A.6 Codex-specific references or behavior

```text
src/main/agentHarness/repository/patches.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/issueResolution/issueResolutionService.ts
src/main/main.ts
src/main/projectPlanning/projectPlanningPreflight.ts
src/main/workCardBuilding/codexAppServerProtocol.ts
src/main/workCardBuilding/codexAppServerTransport.ts
src/main/workCardBuilding/codexImplementerExecutionPolicy.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/main/workCardBuilding/codexRuntimeManager.ts
src/main/workCardBuilding/codexRuntimeOperations.ts
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/preload/index.ts
src/renderer/app/App.tsx
src/renderer/app/CodexModelSelectionControls.tsx
src/renderer/app/IssueFixCardMapWorkspace.tsx
src/renderer/app/codexExecutionPresentationOwnership.ts
src/renderer/app/rendererPollingPolicy.ts
src/shared/codexRuntimeContracts.ts
src/shared/workspaceContracts.ts
```

## Appendix B: Classification Coverage

All 185 inventoried frozen-V1 `src/**` files are covered by either an exact row or a directory/family row in the Source-Area Extraction Matrix:

- all `src/main/**` behavior is mapped by service/domain family;
- all `src/preload/**` behavior is Desktop-specific transport;
- all `src/renderer/**` behavior is classified as a candidate for Shared Client presentation, Product Core extraction where it currently owns correctness-sensitive lifecycle/sequencing, or Desktop-only shell/bridge behavior; current Electron location does not decide future ownership;
- all `src/shared/**` behavior is reviewed as candidate Product Core rather than assumed portable; and
- renderer assets are classified individually: reusable branding/design-system/client assets may belong to the Shared Client, while Electron/native-delivery assets remain Desktop-specific.

Future source added after the baseline date must be classified when introduced rather than silently inheriting its current folder's classification.

## Definition of Done for the Migration Map

This map is complete enough to drive implementation planning when:

- every new V2 work card names a row or extraction unit from this document;
- each extracted behavior has a declared Product Capability owner;
- every Electron, filesystem, Markdown, Windows, Codex, and legacy `workspaceId` dependency is either removed from Product Core or assigned to a named adapter/compatibility layer;
- Server work consumes shared contracts instead of porting Desktop services wholesale; and
- the remaining V1-only source can be identified without re-evaluating the architecture by intuition.
