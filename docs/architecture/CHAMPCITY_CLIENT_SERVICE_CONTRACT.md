# ChampCity A/I Client-Service Contract

**Status:** Adopted V2 semantic service-contract baseline — September 14, 2026; deployment topology aligned September 22, 2026

## Purpose

This document defines the semantic service boundary between the shared ChampCity client and the capabilities that implement ChampCity A/I.

The contract defines **what ChampCity can be asked to do**, not how those requests are transported or persisted. The same web client consumes these contracts whether the ChampCity Service Host runs locally on a workstation or remotely on a server.

This document is governed by:

- `CHAMPCITY_PRODUCT_CAPABILITY_MODEL.md`
- `CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md`
- `CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md`

It is complemented by `CHAMPCITY_CLIENT_SERVICE_DESKTOP_SOURCE_MAPPING.md`, which maps the V1 Electron/Desktop implementation into this target service architecture. That mapping is migration evidence, not a V2 Desktop-host requirement.

Document status and unresolved dependencies are recorded in the [corpus index](CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md). The named methods are semantic design targets, not proof of implementation or complete executable schemas. The unresolved contracts listed under Implementation Design Gates below remain required before their dependent features are implemented.

## Service Set

The shared client consumes the following semantic services:

1. `ProjectService`
2. `WorkflowService`
3. `ProjectStateService`
4. `RepositoryService`
5. `RuntimeService`
6. `ModelService`
7. `EnvironmentService`
8. `MemoryService`
9. `SkillsService`

AI Tools are intentionally not modeled as a tenth client service. AI Tools are model-facing, authorized façades over capabilities owned by these services. For example, a repository read tool should invoke `RepositoryService`; it should not contain an independent repository implementation.

## Deployment-Neutral Client Rule

Workstation-hosted deployment:

```text
ChampCity Web Client
    -> Web/Service Transport
    -> ChampCity Service Host on workstation
```

Server-hosted deployment:

```text
ChampCity Web Client
    -> Web/Service Transport
    -> ChampCity Service Host on server
```

There is one web client implementation. It should not need product-specific branches based on whether the Service Host is local or remote.

The web client should not need to know whether Project State came from workstation-local persistence or server-managed persistence, whether repository work occurred on the service host or another execution Host, or whether an AI worker ran through Codex, another hosted runtime, or a future local runtime.

Workstation-hosted and server-hosted deployments are alternative placements of the same backend architecture. A Project has exactly one canonical writable Project State location at a time. There is no live local/remote writable synchronization, offline writable replica, automatic write-location failover, or merge protocol.

If a future explicit transfer feature is implemented, it is a bounded export/import operation that moves Repository content and Structured Project State to the destination deployment and establishes the destination as the new canonical writable Project State location. If that cannot remain simple, transfer may be unsupported.

## Contract Conventions

### Queries

Queries retrieve information and do not mutate authoritative state.

Examples:

```text
getProject(...)
getWorkflow(...)
getRepositoryStatus(...)
listModels(...)
```

### Commands

Commands request an authoritative state change or action.

Examples:

```text
createProject(...)
startWorkflow(...)
commitChanges(...)
startWorker(...)
```

A command is a request, not permission for the client to dictate state. The receiving service remains responsible for determining whether the requested operation is legal.

### Events

Services may publish events when state changes asynchronously.

Examples:

```text
workflow.changed
worker.completed
repository.changed
environment.healthChanged
```

The client may use events to refresh presentation without becoming the canonical source for the underlying state or owning workflow transitions.

### Stable identity

Domain objects should use explicit stable identities such as:

```text
projectId
workflowId
workItemId
repositoryId
stateRecordId
runtimeId
workerId
modelId
environmentId
skillId
```

Storage paths, database row locations, process IDs, legacy `workspaceId` values, or external provider identifiers should not become canonical ChampCity identity unless explicitly modeled as external references.

`environmentId` names the canonical Execution Environment identity.

For RuntimeService, the current client vocabulary maps as follows:

| Client-service term | Canonical runtime meaning |
| --- | --- |
| `runtimeId` | compatibility/API alias for `runtimeImplementationId`; new contracts should prefer the full name |
| `workerId` | compatibility/API alias for ChampCity `executionSessionId`; new contracts should prefer `executionSessionId` |
| `runtimeInstanceId` | specific running runtime process/instance; diagnostic/execution correlation, not a Project State identity |
| `runtimeThreadId` / `turnId` | opaque adapter-issued continuity identities |

These identities are never interchangeable merely because they refer to one execution. Product/correlation IDs are generated by ChampCity; opaque runtime continuity identifiers may be adapter-issued. Models generate neither.

### Revision safety

Authoritative mutations should support revision or concurrency checks where appropriate.

Conceptually:

```text
updateRecord(
    stateRecordId,
    changes,
    expectedRevision
)
```

A stale write should fail rather than silently overwrite newer canonical state.

### Command identity, retries, and unknown outcomes

Every externally retryable mutating command SHALL carry a ChampCity-generated `operationId` in a command envelope. The receiving service records the operation identity and committed outcome at the same durable boundary as the authoritative mutation where practical.

Rules:

1. first receipt of an `operationId` may execute the command;
2. retry of the same `operationId` with the same normalized request returns the previously recorded committed/rejected outcome rather than repeating the side effect;
3. reuse of an `operationId` with a materially different request fails with `OPERATION_ID_REUSE`;
4. commands that depend on current state also carry the applicable `expectedRevision`/precondition;
5. a lost client response does not imply failure; the client may query `getOperationOutcome(operationId)` before retrying with a new identity; and
6. services report `committed`, `rejected`, `pending`, or `unknown` rather than claiming distributed exactly-once execution.

ChampCity's guarantee is **at most one committed authoritative effect per operation identity inside the owning service boundary**, not magical exactly-once delivery across processes/networks.

### Trusted request, access, and decision context

The client must not be able to manufacture an Operator Decision, workflow disposition, or broader access by supplying fields such as `role = Operator`, `approved = true`, or `authorized = true`.

Security access/resource scope is derived from authenticated principal and policy. Workflow eligibility is derived from Project State, effective Decisions/dispositions, dependencies, validation, and policy. Product decisions reserved to the human are made by the Operator and are never synthesized from request fields.

Every query/command/event subscription executes under a trusted `RequestContext` established at the deployment trust boundary. Conceptually it includes:

```text
principalRef
projectId / projectScope
resourceScopes[]
clientSessionId
authenticatedAccessClaims
```

The client may request a resource or action but cannot supply or widen `authenticatedAccessClaims`. Each service re-checks Project/resource scope on the server/local-service side; UI visibility is not security authorization or workflow eligibility.

Generic record methods below are compatibility/application conveniences, not unrestricted object/field update APIs. Derived disposition/eligibility state, lifecycle state, provenance, immutable Evidence/Validation fields, principal identity, and mechanical metadata cannot be changed through generic `updateRecord`. Decision-sensitive and lifecycle-sensitive operations use typed commands (`recordDecision`, `recordValidation`, workflow actions, etc.) that validate legal state transitions, actor role, access, and caller resource scope.

Evidence reads, subscriptions, repository operations, runtime control, and export operations use the same resource scope. Credentials/secrets are exposed only through approved handles/capabilities and are never returned merely because a caller can read Project State.

### Deterministic metadata

ChampCity generates mechanical metadata itself, including where applicable:

- IDs;
- revisions;
- timestamps;
- hashes;
- lineage;
- actor identity;
- source references;
- schema versions;
- source-control metadata; and
- deterministic relationship data.

AI workers provide semantic content. They should not perform bookkeeping that ChampCity can perform reliably in code.

---

# 1. ProjectService

`ProjectService` owns the identity, lifecycle, configuration, and resource relationships of a ChampCity Project.

A Project is the durable thing being developed.

## Responsibilities

- create, open, list, update, archive, and restore Projects;
- maintain stable `projectId` identity;
- provide project metadata, status, and configuration;
- maintain current Project selection for a client session;
- associate repositories, execution environments, integrations, and future resources with a Project;
- expose project capability and availability information;
- enforce project isolation where applicable; and
- support deployment-appropriate ownership/access semantics for workstation-hosted and server-hosted Service Host deployments.

## Queries

### `listProjects(filter?)`
Returns Projects visible to the current user/session under the active Service Host deployment and access scope.

### `getProject(projectId)`
Returns the canonical Project definition and current project-level status.

### `getProjectSummary(projectId)`
Returns a lightweight representation suitable for project-selection and navigation surfaces.

### `getActiveProject()`
Returns the Project selected for the current client session. Selection is client/session context, not a product decision or a Project State write lease.

### `listProjectResources(projectId)`
Returns resources associated with a Project, including repositories, execution environments, integrations, and future managed resources.

### `getProjectCapabilities(projectId)`
Returns which ChampCity capabilities are currently available for the Project.

## Commands

### `createProject(input)`
Creates a new durable Project and assigns its canonical `projectId`.

### `updateProject(projectId, changes, expectedRevision)`
Updates project-level metadata or configuration.

### `archiveProject(projectId)`
Marks a Project inactive without destroying durable state.

### `restoreProject(projectId)`
Restores an archived Project.

### `selectActiveProject(projectId)`
Changes the Project selected by the current client session.

### `associateResource(projectId, resourceReference)`
Associates an existing Repository, Environment, or other managed resource with the Project.

### `removeResourceAssociation(projectId, resourceReference)`
Removes a Project/resource relationship without necessarily deleting the underlying resource.

## Events

```text
project.created
project.updated
project.archived
project.restored
project.resourceAssociated
project.resourceRemoved
project.activeSelectionChanged
```

---

# 2. WorkflowService

`WorkflowService` owns ChampCity's governed development lifecycle.

A Workspace is a task-oriented working station through which a workflow is performed. Examples include Project Intake, Project Planning, Architect, Work Implementation, Validation, Issue Resolution, and Repair Workspaces. The Project moves through these stations as different work is required.

## Responsibilities

- start and resume supported workflows;
- identify current lifecycle state;
- determine legal next actions;
- enforce access/scope/policy boundaries, genuine Operator Decision boundaries, and lifecycle transitions;
- coordinate Architect, Implementer, Reviewer, Validator, and Operator transitions;
- manage Work, Feature, Issue, Fix, Repair, validation, and closeout lifecycles;
- determine close/completion eligibility;
- route the client to the appropriate Workspace;
- support Guided Mode and future Power Workbench orchestration over the same semantics; and
- create durable boundaries/checkpoints between bounded workers.

## Queries

### `listWorkflowTypes(projectId)`
Returns workflow types currently available to the Project.

### `getWorkflow(workflowId)`
Returns authoritative state of a workflow instance.

### `listProjectWorkflows(projectId, filter?)`
Returns current and historical workflow instances associated with a Project.

### `getWorkflowStatus(workflowId)`
Returns current lifecycle status, active stage, blockers, and completion state.

### `getPermittedActions(workflowId)`
Returns actions currently legal given workflow state, effective Decisions/dispositions, dependencies, validation, access/policy constraints, and subordinate work.

### `getRequiredOperatorDecision(workflowId)`
Returns whether the current workflow state requires a genuine Operator Decision, the decision class/reason, and the evidence/context that must be presented. Deterministic eligibility or an AI review result is not represented as a human decision.

### `getCurrentWorkspace(workflowId)`
Returns the semantic Workspace appropriate for the current workflow activity. The client controls how it is visually rendered.

### `getWorkflowMap(workflowId)`
Returns work items, dependencies, active item, completed items, and unresolved branches.

## Commands

### `startWorkflow(projectId, workflowType, input)`
Creates and begins a governed workflow.

### `requestWorkflowAction(workflowId, action, input?)`
Requests a legal workflow transition. The service decides whether it is permitted.

Typical actions may include:

```text
BeginPlanning
BeginImplementation
SubmitForReview
RequestValidation
RequestRepair
CloseWorkItem
CloseWorkflow
```

### `recordOperatorDisposition(workflowId, disposition, input?)`
Records an Operator-authoritative decision where the workflow requires human disposition.

### `suspendWorkflow(workflowId, reason)`
Suspends progression without destroying state.

### `resumeWorkflow(workflowId)`
Resumes a suspended workflow if governing conditions permit.

### `cancelWorkflow(workflowId, reason)`
Terminates a workflow through a governed cancellation path while preserving history.

## Events

```text
workflow.started
workflow.changed
workflow.stageChanged
workflow.actionAvailable
workflow.blocked
workflow.operatorDecisionRequired
workflow.workspaceChanged
workflow.suspended
workflow.completed
workflow.cancelled
```

---

# 3. ProjectStateService

`ProjectStateService` owns authoritative structured Project State and historical record.

Structured Project State is the common canonical state model for all V2 deployments. A workstation-hosted Service Host may store it locally; a server-hosted Service Host uses its configured durable persistence. Markdown is a view/export/import format, not the steady-state workflow source.

The contract aligns with `CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md` and should expose domain operations rather than SQL/storage operations.

## Responsibilities

- create, query, revise, and supersede structured entities;
- preserve revisions, lineage, provenance, relationships, evidence, Decisions, validation, and derived disposition/eligibility state;
- provide deterministic current-state retrieval;
- provide historical/audit retrieval;
- support legacy import and human-readable export/projection; and
- provide the authoritative source consumed by WorkflowService and MemoryService.

## Queries

### `getRecord(stateRecordId)`
Returns a specific structured state record.

### `queryRecords(projectId, query)`
Returns records matching type, status, workflow, work item, decision/disposition state, time, relationship, or current/superseded criteria.

### `getCurrentRecord(projectId, identity)`
Resolves the currently authoritative version of a logical record.

### `getRecordHistory(stateRecordId)`
Returns revision, supersession, and provenance history.

### `getRelationships(stateRecordId)`
Returns typed relationships with other Project State records.

### `getLineage(stateRecordId)`
Returns derivation/provenance lineage.

### `getProjectStateSummary(projectId)`
Returns a bounded high-level representation of current Project State.

### `getEvidence(recordOrWorkflowId)`
Returns evidence associated with a state or workflow object.

### `renderView(viewRequest)`
Produces a human-readable Work Card, Repair Card, validation report, timeline, decision record, Markdown export, or other projection. The projection is not authoritative state.

## Commands

### `createRecord(projectId, recordType, content)`
Creates a canonical structured record under the applicable domain rules. ChampCity assigns identity, timestamps, revision, and provenance; record existence does not grant discretionary decision power.

### `updateRecord(stateRecordId, changes, expectedRevision)`
Revises a mutable record where the domain permits revision.

### `supersedeRecord(stateRecordId, replacement)`
Creates a replacement/superseding record where the domain rules, current task scope, access policy, and applicable Operator Decisions permit it, while retaining the predecessor.

### `createRelationship(sourceId, relationshipType, targetId)`
Creates a typed relationship between records using the centrally registered predicates, directions, and allowed endpoint types.

### `removeRelationship(relationshipId)`
Ends/removes a relationship where domain policy permits it. Immutable provenance relationships are not deletable.

### `recordDecision(projectId, decision)`
Creates a structured Decision under trusted RequestContext, actor identity/role, governing scope, and applicable policy. The record captures the decision; it does not become an independent decision principal.

### `recordFinding(projectId, finding)`
Creates a structured Finding.

### `recordBoundedSolution(projectId, solution)`
Creates a Bounded Solution associated with governing findings/root cause.

### `recordValidation(targetId, validation)`
Records structured validation.

### `recordEvidence(targetId, evidenceReference)`
Associates evidence with governing state.

### `importLegacyProjectState(projectId, importPackage)`
Imports legacy artifact-based state through the approved migration process.

### `exportProjectState(projectId, exportOptions)`
Creates a portable export without changing authoritative state.

## Events

```text
projectState.recordCreated
projectState.recordUpdated
projectState.recordSuperseded
projectState.relationshipChanged
projectState.validationRecorded
projectState.evidenceRecorded
projectState.migrationCompleted
```

---

# 4. RepositoryService

`RepositoryService` owns repositories, RepositoryCheckouts, source-control semantics, and provider-backed source-control mechanics.

A Repository is source-code or content storage associated with a Project. It is not a Workspace.

The permanent RepositoryService contract is provider-neutral. Git is the first source-control provider, not the definition of the service. The controlling provider architecture is `CHAMPCITY_SOURCE_CONTROL_PROVIDER_ARCHITECTURE.md`; concurrent writable checkout behavior is specialized by `CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`.

## Responsibilities

- register and attach repositories;
- maintain stable `repositoryId` identity;
- inspect repository metadata/ecosystem/availability;
- enforce containment and path policy;
- expose controlled file read/search/change operations;
- maintain RepositoryCheckout identity/lifecycle;
- provide provider-neutral SourceLine and immutable SourceRevision semantics;
- capture durable ImplementationRevisions from attributed pending changes;
- provide deterministic source-control mechanics through a configured provider;
- calculate hashes/diffs/status in code rather than through AI inference;
- perform governed work-source, checkout, revision, synchronization, and integration-target operations;
- expose provider capabilities and bounded diagnostics; and
- support multiple repositories per Project.

## Queries

### `listRepositories(projectId?)`
Returns registered repositories.

### `getRepository(repositoryId)`
Returns repository identity, location, type, availability, and Project associations.

### `inspectRepository(repositoryId)`
Returns repository characteristics and detected ecosystem information.

### `getRepositoryStatus(repositoryId)`
Returns provider/source-control availability and repository summary state.

### `getSourceControlCapabilities(repositoryId)`
Returns the configured provider identity and semantic capability set required for workflow eligibility and diagnostics.

### `listRepositoryCheckouts(repositoryId)`
Returns verified concrete working copies belonging to the Repository.

### `getRepositoryCheckout(repositoryId, checkoutId)`
Returns checkout identity, provider state, current revision/source-line association, lifecycle, and bounded host metadata.

### `listFiles(repositoryId, path?, options?)`
Returns a bounded repository tree/directory listing from the selected checkout context or applicable primary checkout.

### `readFile(repositoryId, path, options?)`
Reads permitted repository content from the specified checkout context or the primary checkout when compatibility behavior applies.

### `readFileAtRevision(repositoryId, sourceRevisionId, path, options?)`
Reads permitted source directly from an immutable revision without requiring a mutable checkout where the provider supports it.

### `searchRepository(repositoryId, query, options?)`
Searches repository contents in the specified checkout/revision context allowed by policy.

### `getDiff(repositoryId, options?)`
Returns deterministic source-control differences for the specified checkout/revision context.

### `getHistory(repositoryId, options?)`
Returns provider-neutral source-control history.

### `listSourceLines(repositoryId, filter?)`
Returns provider-neutral named development/target lines and provider metadata.

### `resolveSourceRevision(repositoryId, selector)`
Resolves a provider-supported selector to an immutable SourceRevision.

### `getChangedFiles(repositoryId, checkoutId?)`
Returns pending files changed from the applicable immutable revision.

### `runReadinessCheck(repositoryId, checkoutId?)`
Runs deterministic repository/source readiness checks for the specified execution source.

## Commands

### `registerRepository(input)`
Registers a Repository as a managed ChampCity resource.

### `unregisterRepository(repositoryId)`
Removes registration without necessarily deleting source content.

### `applyChangeSet(repositoryId, checkoutId, changeSet)`
Applies controlled source modifications to the authorized checkout.

### `applyPatch(repositoryId, checkoutId, patch)`
Applies a deterministic patch through repository/checkout policy.

### `createWorkSource(repositoryId, baseRevision, workOwner)`
Creates the provider-backed isolated source lineage required for a Work Item.

### `provisionRepositoryCheckout(repositoryId, source, checkoutPolicy)`
Creates or resumes a concrete checkout through provider policy.

### `captureImplementationRevision(repositoryId, checkoutId, attribution)`
Captures the exact attributed PendingChangeSet as a durable immutable SourceRevision/ImplementationRevision. Provider-specific staging/index mechanics remain internal.

### `refreshRepository(repositoryId, remotePolicy?)`
Refreshes provider/remote state through configured policy.

### `synchronizeSourceLine(repositoryId, sourceLineId, target?)`
Synchronizes a local source line/revision through provider remote policy.

### `prepareIntegrationCandidate(repositoryId, incomingRevision, integrationTarget)`
Creates an isolated provider-backed candidate combining one immutable incoming ImplementationRevision with the current IntegrationTarget.

### `advanceIntegrationTarget(repositoryId, validatedCandidate)`
Advances the semantic target only from an exact validated IntegrationCandidate.

### `retireRepositoryCheckout(repositoryId, checkoutId, retirementPolicy)`
Retires a managed checkout only after cleanup safety invariants are proven.

### `restoreFiles(repositoryId, checkoutId, selection)`
Restores selected changes where policy permits.

Provider-specific compatibility/diagnostic adapters may continue to expose lower-level Git operations during migration. Those are not the permanent semantic RepositoryService API.

## Events

```text
repository.registered
repository.unregistered
repository.changed
repository.checkoutProvisioned
repository.checkoutRetired
repository.sourceLineChanged
repository.revisionCreated
repository.synchronizationCompleted
repository.integrationCompleted
repository.availabilityChanged
```

---

# 5. RuntimeService

`RuntimeService` owns AI worker execution through ChampCity-compatible Agent Runtimes.

Codex/App Server is one runtime adapter, not the definition of the contract.

## Responsibilities

- discover compatible runtimes;
- report semantic runtime capabilities and health;
- create/manage bounded workers;
- manage thread/turn lifecycle or equivalent provider primitives;
- stream execution events;
- support interruption, steering, and resume where available;
- handle approvals and user-input requests;
- connect authorized AI Tools;
- normalize provider/runtime errors; and
- preserve a provider-neutral worker execution model.

## Queries

### `listRuntimes()`
Returns available runtime implementations.

### `getRuntime(runtimeId)`
Returns runtime identity and configuration.

### `getRuntimeCapabilities(runtimeId)`
Returns semantic runtime capabilities such as tool calling, shell execution, file mutation, streaming, interruption, steering, approvals, Skills, MCP/tool connectivity, context handling, and usage reporting.

### `getRuntimeHealth(runtimeId)`
Returns readiness and operational health.

### `getWorker(workerId)`
Returns current worker state.

### `listWorkers(filter?)`
Returns active or historical workers according to scope.

### `getWorkerEvents(workerId, cursor?)`
Returns execution events from a worker.

### `getPendingInteraction(workerId)`
Returns approval, permission, user-input, or other interaction currently blocking execution.

## Commands

### `startWorker(workerRequest)`
Starts a worker with defined Project, role, task scope, constraints, runtime, model, Skills, capability pack, context packet, Repository access, and Execution Environment.

### `interruptWorker(workerId)`
Interrupts active execution.

### `steerWorker(workerId, instruction)`
Provides runtime steering where supported.

### `resumeWorker(workerId)`
Resumes interrupted/resumable execution where supported.

### `respondToApproval(workerId, approvalId, disposition)`
Responds to an execution approval request.

### `respondToUserInput(workerId, requestId, response)`
Supplies requested user input.

### `terminateWorker(workerId, reason)`
Terminates execution while preserving history.

## Events

```text
runtime.healthChanged
worker.started
worker.output
worker.toolRequested
worker.approvalRequired
worker.userInputRequired
worker.interrupted
worker.failed
worker.completed
worker.terminated
```

---

# 6. ModelService

`ModelService` owns model/provider discovery, compatibility, context economics, and usage policy.

The Model performs inference. The Runtime executes the worker.

## Responsibilities

- discover providers/models;
- expose capabilities and reasoning options;
- maintain model selection policy;
- evaluate model/runtime/task compatibility;
- budget context and reserve output/reasoning capacity;
- estimate/account for tokens, cache use, and cost; and
- support future model recommendation/routing across frontier, hosted, and local models.

## Queries

### `listProviders()`
Returns configured and available model providers.

### `listModels(filter?)`
Returns available models.

### `getModel(modelId)`
Returns model identity and supported configuration.

### `getModelCapabilities(modelId)`
Returns relevant context, reasoning, tool-use, modality, and provider/runtime constraints.

### `getModelSelection(scope)`
Returns current model/reasoning selection for the applicable scope.

### `evaluateCompatibility(request)`
Determines whether Model, Runtime, Skills, Capability Pack, and task requirements are compatible.

### `estimateExecution(executionRequest)`
Returns projected context consumption, remaining headroom, expected token usage where estimable, expected cost where estimable, and compatibility warnings.

### `getUsage(query)`
Returns token, cache, model, provider, and cost telemetry.

### `getContextBudget(executionRequest)`
Returns applicable context budget and reserved output/reasoning allocation.

## Commands

### `setModelSelection(scope, selection)`
Stores a preferred model and reasoning configuration.

### `setProviderConfiguration(providerId, configuration)`
Updates supported provider configuration without exposing secrets through ordinary client state.

### `setUsageBudget(scope, budget)`
Defines optional cost/token limits.

### `requestModelRecommendation(taskContext)`
Returns suitable models based on task requirements, cost, runtime compatibility, and policy. Recommendations remain advisory unless Workflow policy explicitly enables automatic routing.

## Events

```text
model.catalogChanged
model.selectionChanged
provider.availabilityChanged
usage.updated
usage.budgetThresholdReached
```

---

# 7. EnvironmentService

`EnvironmentService` owns Execution Environments.

An Execution Environment is where source code, commands, builds, tests, and engineering tools operate. It is distinct from both the Host and AI Runtime.

## Responsibilities

- discover and identify Execution Environments;
- report environment capabilities and health;
- perform task/repository preflight;
- detect required tooling and repository ecosystem needs;
- provision/refresh/repair environments where policy permits;
- execute authorized commands; and
- support local, container, VM, remote, and disposable implementations behind one semantic contract.

## Queries

### `listEnvironments(projectId?)`
Returns available Execution Environments.

### `getEnvironment(environmentId)`
Returns environment identity and configuration.

### `getEnvironmentCapabilities(environmentId)`
Returns available tools, platforms, package managers, runtimes, and other capabilities.

### `getEnvironmentHealth(environmentId)`
Returns readiness and health.

### `preflightEnvironment(environmentId, requirements)`
Determines whether the environment can satisfy a task.

### `inspectRepositoryRequirements(environmentId, repositoryId)`
Determines environment requirements implied by the repository ecosystem.

## Commands

### `createEnvironment(request)`
Creates an Execution Environment where supported.

### `provisionEnvironment(environmentId, requirements)`
Installs/configures required tooling where policy permits.

### `refreshEnvironment(environmentId)`
Refreshes environment capability state.

### `repairEnvironment(environmentId, repairRequest)`
Performs deterministic environment repair where supported.

### `executeCommand(environmentId, commandRequest)`
Executes an authorized command under environment policy.

### `destroyEnvironment(environmentId)`
Destroys disposable/managed environments where allowed.

## Events

```text
environment.created
environment.healthChanged
environment.provisioningStarted
environment.provisioningCompleted
environment.commandCompleted
environment.failed
environment.destroyed
```

---

# 8. MemoryService

`MemoryService` owns intelligent retrieval and context construction. It does not replace authoritative Project State.

## Responsibilities

- retrieve task-relevant authoritative and historical knowledge;
- construct bounded context packets;
- support semantic recall where useful;
- preserve retrieval provenance;
- support memory-backed transitions/checkpoints between bounded workers; and
- avoid loading irrelevant history into model context.

## Queries

### `recall(projectId, recallRequest)`
Retrieves potentially relevant project knowledge for a semantic query/task.

### `retrieveAuthoritativeContext(projectId, request)`
Retrieves authoritative information through deterministic Project State relationships.

### `buildContextPacket(contextRequest)`
Constructs a bounded context package using role, task, workflow, Work Item, Skills, context budget, and permitted knowledge scope.

### `previewContextPacket(contextRequest)`
Shows what would be included without starting execution.

### `explainRetrieval(retrievalId)`
Returns why specific memories/records were selected.

### `getMemoryCheckpoint(checkpointId)`
Returns a durable worker-transition checkpoint.

### `listMemoryCheckpoints(scope)`
Returns checkpoints associated with a workflow, Work Item, or Project.

## Commands

### `createCheckpoint(checkpointRequest)`
Creates a bounded handoff checkpoint between workers/workflow stages.

### `refreshProjectMemory(projectId)`
Rebuilds derived indexes/retrieval structures from authoritative state without rewriting Project State.

### `invalidateDerivedMemory(scope)`
Invalidates derived retrieval data when its canonical source state/revision changes.

### `rebuildDerivedMemory(scope)`
Reconstructs derived memory data from authoritative sources.

## Events

```text
memory.checkpointCreated
memory.indexChanged
memory.refreshCompleted
memory.retrievalWarning
```

The implementation may use semantic indexes, embeddings, database queries, or future retrieval technology internally. Those mechanisms are not part of the client contract.

---

# 9. SkillsService

`SkillsService` owns reusable ChampCity-governed expertise.

Skills define how specialized work should be performed.

## Responsibilities

- maintain a canonical Skill registry and version history;
- discover/resolve applicable Skills;
- assign Skills to roles/tasks/work items;
- bind Skills to standards/policies;
- declare required tools/runtime/environment capabilities;
- validate compatibility; and
- build portable Skill bundles usable across supported runtimes/providers.

## Queries

### `listSkills(filter?)`
Returns Skills available to ChampCity.

### `getSkill(skillId, version?)`
Returns Skill definition and metadata.

### `listSkillVersions(skillId)`
Returns available versions and status.

### `getSkillRequirements(skillId, version)`
Returns required AI Tools, Runtime capabilities, Environment capabilities, standards dependencies, supported roles, and supported operating modes.

### `resolveSkills(taskContext)`
Determines which Skills are applicable to a task.

### `evaluateSkillCompatibility(skillSelection, executionContext)`
Determines whether selected Runtime, Model, Tools, and Environment support the Skills.

### `buildSkillBundle(skillSelection, executionContext)`
Builds the portable Skill package supplied to RuntimeService.

## Commands

### `registerSkill(skillDefinition)`
Registers a ChampCity Skill.

### `publishSkillVersion(skillId, versionDefinition)`
Publishes an explicit Skill version.

### `deprecateSkillVersion(skillId, version)`
Prevents a version from governing new work while preserving historical provenance.

### `assignSkills(target, skillSelection)`
Associates Skills with an applicable workflow, Work Item, role, or task.

### `removeSkillAssignment(target, skillId)`
Removes an assignment where governance permits.

## Events

```text
skill.registered
skill.versionPublished
skill.versionDeprecated
skill.assignmentChanged
```

---

# Cross-Service Coordination

A typical Implementer execution should conceptually occur as:

```text
WorkflowService + ProjectStateService
    resolve legal work, governing Work Item / Bounded Solution,
    current Decisions/dispositions, required evidence and source revisions
        |
        v
SkillsService + RepositoryService + EnvironmentService
    resolve mandatory Skills/tools, authorized Repository resources,
    Execution Environment requirements and available capabilities
        |
        v
ModelService + RuntimeService capability discovery
    resolve compatible model/runtime selection, mandatory constraints,
    telemetry requirements and context/output budget
        |
        v
MemoryService
    finalize the bounded Context Envelope against those requirements;
    preliminary retrieval may have occurred earlier
        |
        v
RuntimeService / runtime adapter
    negotiate the effective model, tool, Skill, sandbox and context configuration;
    if material requirements/selection change, rebuild and recheck before execution
        |
        v
RuntimeService
    start bounded Implementer; receive actual runtime delivery receipts/events
        |
        v
ProjectStateService
    record implementation/evidence through authorized domain operations
        |
        v
WorkflowService
    determine next legal state
```

Mandatory skill/tool/model/environment requirements precede final context assembly and negotiation. Preliminary retrieval is not a declaration that the final context fits. The client presents this process but should not perform the internal orchestration or become authoritative for transitions.

Three records must be distinguished: the planned context/budget assembled by ChampCity; the runtime's Context Receipt describing actual accepted/delivered context to the extent observable; and ChampCity's aggregated accounting view joining plan, receipt, and usage telemetry. A planned estimate is not an actual delivery receipt. Unknown or opaque overhead remains labeled accordingly. Their complete shared schemas remain F18.

# Cross-Service Boundary Rules

## Workflow does not own persistence

`WorkflowService` owns lifecycle semantics. `ProjectStateService` owns durable state records.

## Memory does not own truth

`MemoryService` retrieves useful context. `ProjectStateService` remains authoritative.

## Runtime does not own model policy

`RuntimeService` executes workers. `ModelService` determines model compatibility and resource policy.

## Runtime does not own the development machine

`RuntimeService` runs AI workers. `EnvironmentService` controls where engineering execution occurs.

## Tools do not become decision principals

AI Tools expose controlled actions against owning services. Possession of a tool does not establish task scope, an Operator Decision, workflow eligibility, or permission to bypass Project State and service policy.

## Repository state is not Project State

Source code and source-control history belong to `RepositoryService`. ChampCity development Decisions, findings, validations, lineage, dispositions, and workflow state belong to `ProjectStateService`.

## Client presentation does not own authoritative transitions

The client may request `CloseWorkItem`; `WorkflowService` decides whether closure is legal.

# Event Model

The exact transport is deferred, but the contract assumes that long-running and asynchronous operations can publish scoped events.

Conceptually:

```text
subscribeProject(projectId)
subscribeWorkflow(workflowId)
subscribeWorker(workerId)
subscribeRepository(repositoryId)
subscribeEnvironment(environmentId)
```

Polling may remain as a compatibility/recovery mechanism, but it should not define Server/client semantics.

# Implementation Requirements Already Resolved Architecturally

The architecture review originally identified the following gaps. They are no longer unresolved design gates; their governing decisions now live in the referenced contracts/corpus index. Implementers must follow those decisions rather than invent alternatives.

| Findings | Required contract before dependent work |
| --- | --- |
| F06–F08 | Structured Project State now defines Workflow/Phase/ImplementationRecord homes, version-bound Validation freshness, deterministic Work/Repair/Phase/Project completion, and deferred visual validation. |
| F11 | This contract defines operation identity, retry deduplication, durable outcome lookup, revision preconditions, and explicit unknown outcomes. |
| F12 | This contract defines trusted RequestContext/resource scope, typed decision/lifecycle-sensitive mutations, protected derived fields, and secrets boundaries. |
| F13–F15 | Agent Runtime Interface and Capability Pack architecture define host-tool continuation, execution-ledger recovery, and cross-route effect enforcement. |
| F16–F17 | Foundational/Workbench architecture defines one canonical writable Project State deployment at a time, optional explicit transfer only, isolated writable worktrees, leases/revocation, and configurable autonomy budgets. |
| F18 | Runtime/client identity aliases and planned-context/runtime-receipt/usage-accounting responsibilities are explicitly mapped. |
| F20–F21 | Source-layout architecture uses coordinated product updates to prevent incompatible skew; each implementation Work Card captures its own reproducible source/characterization baseline. |

These are implementation requirements, not reasons for another Operator approval cycle. They do not require selecting transport or a database engine beyond the decisions already made.

# Out of Scope

This contract intentionally does not define:

- REST endpoints;
- HTTP verbs;
- WebSocket message formats;
- V1 Electron IPC channels;
- database schemas;
- database technology;
- serialization format;
- authentication protocol;
- deployment topology;
- process boundaries; or
- programming-language interfaces.

Those mechanisms should implement the semantic contract rather than define it.

## Governing Principle

> The ChampCity web client asks for product capabilities. Deployment-specific transport and host adapters determine how those requests reach the same service architecture whether it is workstation-hosted or server-hosted.
