# ChampCity A/I Vocabulary Migration Plan

## Purpose

ChampCity A/I currently uses several terms—particularly `workspace`, `workspaceId`, `workspaceRoot`, and `runtime`—for concepts that will become distinct entities in the shared Product Core and Server architecture.

The migration must not mechanically rename existing symbols. Some current `workspace` references mean Repository, some mean the currently selected project directory, and others correctly describe a task-oriented working station.

The governing rule is:

> Legacy vocabulary may remain behind compatibility boundaries, but new domain models, APIs, persistence schemas, and service contracts must use the canonical vocabulary.

Canonical terms are:

`Project`, `Workspace`, `Repository`, `Host`, `Execution Environment`, `Client`, `Runtime`.

This plan follows [Foundational Architecture Principles §6](../architecture/CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md#6-canonical-domain-vocabulary). It does not supersede those definitions. The reconciliation corrects the earlier working-instance definition of Workspace and service-boundary definition of Host; neither is the canonical meaning. Status and remaining identity questions are recorded in the [corpus index](../architecture/CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md).

---

## 1. Canonical Vocabulary

| Term | Canonical meaning |
|---|---|
| **Project** | The durable logical body of work governed by ChampCity. It owns project state, memory, decisions, findings, work items, validation history, relationships, and configuration. A Project is not a directory and is not a Git repository. |
| **Workspace** | A task-oriented ChampCity working surface or station where a particular type of work is performed. Examples include Intake, Planning, Architect, Implementation, Validation, Issue, and Repair Workspaces. It is not a repository checkout or a mutable instance of a Project. |
| **Repository** | A durable source/code or content repository identity associated with a Project. Repository identity is independent of its current filesystem path, checkout, branch, or Host. |
| **Host** | A physical or virtual machine running one or more ChampCity components or services. A service composition boundary is not itself a Host; an address or hostname is a locator, not canonical Host identity. |
| **Execution Environment** | The bounded environment in which implementation commands, builds, tests, tools, or related engineering execution occur. It is distinct from the Host, Repository, and Runtime; its capabilities and execution policy are explicit. |
| **Client** | A user-facing ChampCity application that presents the product and communicates with ChampCity services. Desktop UI and browser interfaces are Clients. Standalone Desktop can colocate its Client and local services on one Host. |
| **Runtime** | The agent execution system used to run an AI worker through the Agent Runtime Interface. Codex is the first adapter; a future runtime may use hosted or local inference providers. A model-provider connection alone is not an agent Runtime. |

The conceptual relationships are:

```text
Client -> ChampCity services -> Project state and legal workflow actions
Client -> task-oriented Workspace presentation for the selected work
Project -> associated Repository resources and Execution Environments
Host -> runs Client, service, and/or execution components
Runtime -> runs an AI worker using its bounded execution context
```

These are semantic associations, not a package-import graph or a new containment schema. A Workspace presents the task and its resource bindings; it does not become the owner of repository checkouts, task scope, access, or workflow eligibility.

This prevents Project, Repository, working directory, AI runtime, and deployment location from collapsing into one concept.

---

## 2. Critical Decision: Current `workspaceId` Is Usually Not a Workspace ID

The existing Agent Harness/MCP `workspaceId` is effectively a **Repository routing/access compatibility identifier**.

Current evidence includes:

- `RegisteredWorkspaceRegistry` maps `workspaceId` directly to one `canonicalRoot`.
- `AgentHarnessWorkspaceContext` contains `workspaceId`, `root`, `repositoryName`, and Git capabilities.
- repository operations receive `root + workspaceId`.
- `mcpWorkspacePromptContract.ts` derives the ID from the project repository folder name.
- MCP prompts describe both a bound `workspaceId` and a bound Repository.
- repository text cursors persist `workspaceId`.
- tool schemas require `workspaceId` to determine which repository filesystem may be accessed.
- the registry prevents one `workspaceId` from being rebound to another project/repository root.

That is Repository access/binding context, not the task-oriented Workspace concept.

Therefore:

**Legacy `workspaceId` must map to Repository compatibility identity, not to a canonical Workspace type or instance identity.**

This distinction is non-negotiable. Reusing today's MCP `workspaceId` as tomorrow's true Workspace identity would bake the existing semantic error into the new architecture.

---

## 3. Current Vocabulary Classification

| Current construct | What it actually means | Canonical destination |
|---|---|---|
| `AgentHarnessWorkspaceContext` | Repository access/root context | `RepositoryContext` / `RepositoryAccessContext` |
| `RegisteredWorkspaceRegistry` | Registered repository access/registration | `RepositoryRegistry` |
| `StoredRegisteredWorkspace` | Repository registration | `RegisteredRepository` |
| MCP tool `workspaceId` | Legacy repository route ID | compatibility alias for `repositoryId` |
| `McpWorkspaceBinding` | MCP-to-repository binding | `McpRepositoryBinding` |
| `BoundMcpWorkspaceDescriptor` | Repository routing descriptor | `BoundRepositoryDescriptor` |
| `workspaceRoot` inside Agent Harness repository operations | Repository checkout/root path | `repositoryRoot` initially; ultimately a Repository checkout/location |
| `registered-workspaces.json` | Repository registrations | future `registered-repositories` persistence |
| `.champcity/mcp-workspace-binding.json` | Repository MCP binding | future repository-binding schema |
| `WorkspaceSelection` | Current Desktop project/repository directory selection | `ProjectSelection` / `ActiveProjectContext` |
| `SessionActiveWorkspaceSelection` | Session-scoped selected project/repository root | `ActiveProjectSelection` / `ActiveProjectContext` |
| `workspace-settings.json` | Selected Desktop project/repository location | canonical project/repository selection persistence |
| `WorkspaceDefinition` in `shared/workspaces/workspaceRegistry.ts` | Task-oriented workflow station definition | Retain Workspace semantics; distinguish its type/instance identity from repository routing. |
| UI `WorkspaceId` values such as `phase-close` | Task-oriented station type/navigation key | Explicit Workspace type key; not a Repository ID or necessarily a durable Workspace instance ID. |
| renderer `activeWorkspaceId` | Active task-oriented working station | Retain Workspace meaning; qualify type/instance use in the eventual client contract. |
| `Architect...Workspace`, `WorkCard...Workspace` React components | Task-oriented station presentation | Retain legitimate Workspace naming; separate presentation from service state/transition ownership. |
| `projectRoot` / `workspaceRoot` throughout legacy planning services | Current 1:1 Project + repository directory assumption | do not mechanically rename; replace as those services adopt Project State and Repository abstractions |
| `projectRepository: string` | Repository filesystem location | `repositoryId` plus Repository checkout/location |
| `RuntimeActionResult` | Generic workflow/application action result | `WorkflowActionResult` or `ActionResult` |
| “MCP Runtime” | MCP HTTP/service lifecycle | `McpService` / `McpServer` |
| Codex managed runtime | Existing agent-runtime implementation | `CodexRuntimeAdapter` implementing the Agent Runtime Interface |
| `AgentHarnessSettings.host` | HTTP bind address | `bindAddress` / `listenAddress` |
| `DevelopmentEnvironmentContract` | Requirements imposed upon an execution environment | eventually `ExecutionEnvironmentRequirements` |
| Background Agent `ServiceHost` | Specific local supervisor process | Retain as an explicitly qualified process term; do not treat it as canonical machine identity. |

---

## 4. Do Not Turn the Existing Selected Directory Into a Workspace by Renaming It

The Desktop currently treats a selected filesystem root as several things simultaneously:

Project location, repository root, workflow storage location, MCP access/containment boundary, and execution working directory.

The new architecture deliberately separates those responsibilities.

Consequently:

`WorkspaceSelection -> WorkspaceSelectionV2`

would be the wrong migration if it merely preserves the selected-directory aggregate under a new name.

For an imported Desktop project, migration should distinguish the Project, its Repository, the local checkout/location, its Execution Environment, and the Host running components. Task-oriented Workspaces present the Project's work through the shared client. The migration must not manufacture a checkout-bound Workspace aggregate.

The previously unnamed concepts are now explicit:

- **RepositoryCheckout** — one concrete working copy/worktree of a Repository. Repository Management owns its identity and binding to `repositoryId`, Host/Execution Environment, root locator, branch/worktree metadata, and writable/read-only state. Multiple RepositoryCheckouts may exist for one Repository, including isolated writable checkouts for parallel Implementers.
- **ServiceInstance** — one running instance of a ChampCity service/process. Operational hosting/runtime infrastructure owns this identity. A ServiceInstance runs on a Host but is not itself the Host.

Neither concept is a Workspace. Neither changes the canonical meaning of Host. They are introduced only where an implementation needs to identify a concrete checkout or running service instance.

---

## 5. Repository Identity Must Also Be Improved

Today's `workspaceId` is normalized from the repository directory basename. For example, `ChampCity_AI` becomes `champcity_ai`.

That ID is suitable as a legacy routing alias, but it should not become the canonical Repository primary key.

Canonical Repository identity must be:

- stable;
- opaque;
- generated mechanically;
- independent of filesystem path;
- independent of repository display name;
- independent of branch;
- independent of Host;
- preserved if a checkout moves.

During migration, each Repository record should therefore retain something equivalent to:

`repositoryId` — canonical identity

`legacyWorkspaceId` — compatibility alias

`repositoryName` — display metadata

checkout/location data — current filesystem realization

Git/remotes — repository metadata where applicable

The exact legacy `workspaceId` should be preserved rather than regenerated whenever possible.

---

## 6. Compatibility Boundary

The migration should use a strict four-layer model.

### Legacy ingress

Existing interfaces may continue receiving:

`workspaceId`, `workspaceRoot`, `mcpWorkspaceId`, existing MCP schemas, old IPC calls, old persisted JSON, and old prompt contracts.

### Compatibility translation

A dedicated compatibility adapter resolves those values into canonical domain identities.

For example:

`legacy workspaceId "champcity_ai"`

becomes:

`RepositoryRef { repositoryId: ..., legacyWorkspaceId: "champcity_ai" }`

### Canonical core

Product Core, Project State, Repository Management, Runtime contracts, and all new Server APIs use only canonical terminology.

They must not know that the old MCP protocol called repositories “workspaces.”

### Legacy egress

Where compatibility with current Desktop, existing MCP clients, existing cursors, or historical persistence is required, an adapter serializes canonical information back into the legacy shape.

This creates the rule:

**Legacy in -> translate once -> canonical internally -> translate only when legacy output is required.**

Legacy terminology must never travel through the Core merely because the caller used it.

---

## 7. No Dual-Semantic Parameters

New APIs should not use transitional structures such as:

`{ repositoryId?: string, workspaceId?: string }`

when `workspaceId` actually means Repository.

That merely moves ambiguity into every caller.

Compatibility should instead be isolated behind explicitly legacy APIs or adapters.

For example:

`LegacyMcpRepositoryAdapter.resolveWorkspaceId(workspaceId)`

may exist.

A new Repository service should expose only:

`getRepository(repositoryId)`

Likewise, a service such as `getCurrentWorkspace(workflowId)` must unambiguously return a task-oriented station. If Workspace instance APIs are later needed, their identity must be distinct from both a station type key and the legacy Repository route. The exact identity schema remains open; it is not created by this terminology correction.

---

## 8. MCP Migration

MCP is the primary compatibility concern because `workspaceId` is currently part of the public tool contract.

The existing MCP generation should remain functional while the internal implementation moves to canonical Repository concepts.

Existing tool:

`repo_toolbox({ workspaceId: "champcity_ai", ... })`

continues working through the legacy adapter.

Internally it becomes:

legacy `workspaceId`
-> Repository compatibility lookup
-> canonical `repositoryId`
-> Repository service

A future MCP contract generation should expose `repositoryId`.

New MCP APIs must never introduce another `workspaceId` that means Repository.

Old and new contracts can coexist temporarily, but the compatibility behavior belongs in the MCP adapter—not Product Core.

Prompt generation follows the same rule. Existing prompt contracts may continue instructing models to use `workspaceId` while targeting MCP V1. Prompts targeting the canonical contract use `repositoryId`.

---

## 9. Preserve Legitimate Workflow Workspace Vocabulary

`src/shared/workspaces/workspaceRegistry.ts` contains a meaning that is distinct from legacy Repository routing and consistent with the foundational architecture.

IDs such as:

`project-intake-capture`

`architect-interview`

`work-card-building-review`

`phase-validation`

`phase-close`

identify task-oriented workflow stations. They are legitimate Workspace concepts, not repository identities.

Retain the Workspace vocabulary in user-facing copy and shared client/service semantics. Do not perform a blanket rename to `WorkflowSurface`, `WorkflowSurfaceId`, or `...Surface` components. Local view/component names may be chosen for presentation clarity, but that does not replace the product term.

During extraction, distinguish Workspace type/navigation keys from any future instance identity, and separate both from Repository IDs. Characterization tests must preserve lifecycle routing. The migration is about removing semantic overload, not removing every occurrence of the word Workspace.

---

## 10. Runtime Vocabulary Cleanup

`Runtime` should be reserved for the Agent Runtime abstraction being designed separately.

Current terms require three treatments.

`Codex runtime` moves naturally toward `CodexRuntimeAdapter`.

`MCP Runtime` is not an Agent Runtime and should become `MCP Service`, `MCP Server`, or `MCP Service Lifecycle` in new contracts.

`RuntimeActionResult` has nothing specifically to do with an Agent Runtime and should become `WorkflowActionResult` or `ActionResult`.

This prevents the Runtime package from eventually containing both agent execution semantics and unrelated renderer action envelopes.

The [Agent Runtime Interface §4](../architecture/CHAMPCITY_AGENT_RUNTIME_INTERFACE_CONTRACT.md#4-identity-model) distinguishes implementation, instance, execution-session, thread, and turn identities. A generic `RuntimeId` must not collapse them. Product IDs are application-generated; opaque runtime continuity identifiers may be adapter-issued. Models generate neither. Full cross-service identity mapping remains F18, not a settled schema in this plan.

---

## 11. Host and Client Vocabulary

The Desktop/Server split makes these terms particularly important.

A **Host** is the physical or virtual machine running components. ChampCity services own and expose Product Core capabilities; that service/composition boundary must be described explicitly rather than substituted for Host identity.

Standalone Desktop is conceptually:

`Desktop Client + local ChampCity services, colocated on a Host`

Server-backed operation is:

`Desktop/Web Client -> ChampCity Server services running on one or more Hosts`

The existing Background Agent `ServiceHost` is a narrower process implementation. Keep it qualified; it does not define the architectural meaning of Host.

Likewise, networking fields named simply `host` should migrate toward `bindAddress` or `listenAddress` where they mean network configuration rather than machine identity.

Protocol-specific concepts remain qualified:

`OAuthClient`

`ServiceHostClient`

`McpClient`

Bare `Client` is reserved for a ChampCity product client. Source-layout phrases such as Desktop host and Server host describe deployment composition responsibilities; they do not create a second canonical definition of Host.

---

## 12. Execution Environment Migration

The existing `DevelopmentEnvironmentContract` is close to the new concept, but it currently describes capability requirements rather than an environment identity.

Future architecture should distinguish:

**ExecutionEnvironment**
— actual environment instance

from:

**ExecutionEnvironmentRequirements**
— capabilities required of that environment.

The existing `champcity-development-environment` Markdown fence can remain readable as a legacy representation while structured Project State adopts canonical terminology.

A Workspace may display:

“This Work Item executes in Execution Environment X,”

without assuming that the selected repository directory and the machine running Desktop are automatically the execution environment. The governing services resolve that binding; presentation does not create execution scope, access, or eligibility.

---

## 13. Persistence Strategy

Compatibility-format conversion may use **dual-read, canonical-write** for legacy registrations and settings.

Old formats remain readable:

- `registered-workspaces.json`;
- `workspace-settings.json`;
- `.champcity/mcp-workspace-binding.json`;
- historical metadata containing `mcpWorkspaceBinding`;
- cursor/state payloads containing `workspaceId`.

New structured state and newly created records use canonical terminology.

Migration records preserve provenance so a canonical Repository can be traced back to its legacy `workspaceId`.

Do not continuously maintain two equal authoritative schemas. The canonical representation becomes authoritative after conversion; legacy structures become import/export compatibility formats.

This compatibility rule does not authorize fallback to legacy Project State after structured cutover. [Desktop Project-State Migration Design](legacy/CHAMPCITY_DESKTOP_PROJECT_STATE_MIGRATION_DESIGN.md) governs the single authoritative provider, source freshness, writer fencing, and recovery. Legacy state writes remain legal only before that accepted cutover; generated Markdown is output afterward.

---

## 14. Enforcement

Once the canonical contracts exist, terminology should be mechanically enforced.

New Product Core packages should reject ambiguous legacy vocabulary through architecture tests or lint rules, with narrow allowlists for compatibility modules.

Examples of permitted legacy locations:

`compat/legacy-desktop/*`

`compat/mcp-v1/*`

`migration/*`

Repository-as-Workspace identifiers should not appear in new:

- domain entities;
- service interfaces;
- Server APIs;
- client/service protocol contracts;
- Project State schemas;
- Repository Management contracts;
- Runtime interfaces.

Genuine task-oriented Workspace terms remain permitted. The rule is semantic; a blanket ban on the token `workspace` would reject the canonical product vocabulary itself.

This turns vocabulary from documentation guidance into an architectural invariant.

---

## 15. Migration Sequence

1. **Preserve the foundational glossary.** Use the definitions in the Foundational Architecture Principles and prohibit additional meanings without explicit supersession.

2. **Define distinct identity contracts.** Distinguish Project, Repository, Workspace type/instance, Host, Execution Environment, Client, and the runtime identities already specified by the Agent Runtime Interface. Do not alias them into one interchangeable ID. The complete cross-service schema remains a design dependency.

3. **Introduce Repository compatibility translation.** Wrap existing Agent Harness repository access/binding semantics so its public V1 `workspaceId` resolves immediately to canonical Repository identity.

4. **Refactor Agent Harness internals.** Change repository-oriented internals from Workspace terminology to Repository terminology while leaving the existing MCP wire schema intact.

5. **Separate Desktop selection from Workspace.** Replace new use of directory-oriented `WorkspaceSelection` with Project/Repository selection concepts. Do not manufacture a checkout-bound Workspace through a source-code rename.

6. **Preserve task-oriented UI Workspaces.** Clarify station type/navigation identity and remove only its ambiguity with repository routing. Do not rename all workflow Workspaces to WorkflowSurface.

7. **Clean Runtime/Host/Client terminology.** Keep machine identity, service composition, networking locators, and agent execution distinct as affected code is extracted.

8. **Migrate persistence.** Structured Project State records canonical identities and keeps explicit legacy aliases/provenance. Existing JSON remains importable under the approved migration boundary.

9. **Publish canonical MCP/API generation.** New Repository APIs expose `repositoryId`; V1 `workspaceId` support stays behind its adapter for the compatibility period.

10. **Retire legacy vocabulary incrementally.** Remove old names only after their persisted data, callers, prompt contracts, cursors, and external tool contracts have migrated.

---

## 16. Required Characterization and Migration Tests

The migration must preserve existing repository routing, access, containment, and fail-closed behavior.

At minimum, tests must prove that:

- an existing MCP `workspaceId` still routes to exactly the same registered repository;
- unknown legacy IDs continue to fail closed with the frozen V1 `WORKSPACE_ACCESS_DENIED` behavior or its canonically named V2 equivalent;
- repository path containment is unchanged;
- a legacy ID cannot silently rebind to another repository;
- existing Git/non-Git behavior remains unchanged;
- old registrations survive migration without identity loss;
- canonical Repository IDs do not change when display names or locations change;
- a Workspace type or instance identity is never interpreted as a legacy Repository `workspaceId`;
- terminology clarification does not alter task-station lifecycle routing;
- old MCP prompts and cursors remain valid while V1 compatibility is enabled;
- new Server/Product Core contracts contain no repository-as-workspace terminology.

These are required future tests, not an assertion that this documentation revision executed or passed them. Their exact implementation/report traceability remains F21 in the corpus index.

---

## 17. Immediate Implementation Boundary

This migration does not require Server to exist.

Work that can begin against Desktop, through separately authorized bounded work, includes:

- canonical vocabulary/domain-contract design;
- Repository identity and compatibility types;
- the legacy MCP Repository adapter;
- distinction between task-oriented Workspace keys and Repository identity;
- Runtime naming cleanup;
- architecture enforcement tests;
- persistence migration design.

Actual remote checkout and Execution Environment provisioning can wait for its service and execution contracts. No new server-specific Workspace aggregate is required by this plan.

This is preferable to postponing vocabulary clarification because otherwise Desktop extraction risks carrying `workspaceId = repository` directly into the shared Product Core.

---

## Final Architectural Rule

The migration should preserve legacy behavior without preserving legacy semantic overload.

In particular:

> **Today's MCP `workspaceId` is a legacy Repository routing alias. A canonical Workspace is a task-oriented working station, not a repository working instance. Its type or instance identity must never become an alias for Repository identity.**

That distinction should be established before Product Core extraction begins.
