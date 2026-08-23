<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 3,
  "participationRole": "contextOnly",
  "identity": {},
  "sourceRevisions": [
    {
      "path": "planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC56_project_ground_zero_and_development_environment_authority_contract.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57_deterministic_windows_development_environment_provisioner.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57-REPAIR07_parent_process_environment_refresh_and_resolution_completion_handoff.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC58_autonomous_codex_approval_and_interaction_resolution.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC58-REPAIR02_mcp_elicitation_input_classification_and_same_turn_handling.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC60_agent_harness_core_ingestion_and_ai_owned_mcp_runtime.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC60-05_agent_harness_settings_workspace_and_left_rail_integration.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC60-REPAIR11_legacy_oauth_client_registration_continuity.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC60-REPAIR12_oauth_authorization_scope_compatibility.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "designDocumentId": "FUTURE_APPLICATION_DESIGN",
    "projectId": "champcity-ai",
    "title": "ChampCity A/I Future Application Design",
    "status": "approved_future_design_context",
    "currentStateDate": "2026-08-22",
    "implementationAuthority": false,
    "intendedUse": "Describe the current architectural foundation and future ChampCity A/I design direction without implying a complete historical phase chain. Seed reconstruction and future planning inside ChampCity A/I."
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Operator-directed future application design context. Revision 3 removes Phase 09 identity from the canonical filename and document framing so reconstruction does not infer missing Phases 01-08. The architecture remains the same provider-neutral, multi-workspace, resource-authority, execution, and dogfooding design. This document does not itself authorize implementation.",
    "reviewedAt": "2026-08-22"
  }
}
CHAMPCITY-METADATA -->

# ChampCity A/I Future Application Design

Status: Approved future design context  
Project: ChampCity A/I  
Current-state date: 2026-08-22  
Implementation authority: none; this is architecture and planning context

## 1. Purpose

This document records the current architectural foundation of ChampCity A/I and defines the intended future application design for **ChampCity Agent Harness engineering and dogfooding**.

The immediate objective is not to reconstruct a complete historical development chronology. The objective is to retain a trustworthy description of the application as it exists now, define the next architecture direction, and then use ChampCity A/I itself to perform intake, planning, Work Card creation, implementation, review, repair, and validation.

The transition is deliberate:

```text
Current development model
External Architect conversation
→ externally prepared Work Cards
→ external Codex/Desktop implementation pass
→ ChampCity repository review

Target dogfood model
Approved architecture context inside ChampCity A/I
→ embedded Browser ChatGPT conducts future planning
→ ChampCity creates and owns the Work Cards
→ Browser ChatGPT implements through the Agent Harness
→ Codex App Server is available as a bounded specialist/fallback worker
→ future local models perform low-reasoning mechanical work
→ ChampCity owns evidence, validation, and workflow state
```

Actual future Work Cards should be created after this architecture is ingested and the planning workflow is run inside ChampCity A/I.

This revision includes a critical architecture correction discovered during live WC60 dogfooding: the project currently selected in the desktop UI must not be the generic MCP filesystem/repository authorization boundary. Browser ChatGPT must be able to operate against multiple explicitly authorized repositories and bounded host filesystem roots independently of which project the Operator currently has open in ChampCity A/I.

## 2. Executive Summary

ChampCity A/I has moved beyond being an Electron shell around planning prompts. The current application contains most of the durable workflow and implementation foundations required for an AI-directed software-development system:

- application-owned project, phase, Work Card, repair, validation, and close lifecycle;
- canonical Markdown artifact construction and source-revision tracking;
- deterministic workspace identity and repository authority;
- project-ground-zero semantics that include the local development machine;
- Windows development-environment detection, provisioning, repair, and verification;
- a Codex App Server transport with persistent turns, tool activity, approval routing, user input, MCP elicitation, capability inspection, and lifecycle cleanup;
- an A/I-owned Agent Harness/MCP service ingested from the proven ChampCity_GPT core;
- a Settings workspace for Agent Harness runtime administration and diagnostics;
- live OAuth/DCR continuity with the existing ChatGPT connector after the WC60 repair sequence;
- successful live Browser ChatGPT → ChampCity A/I → MCP repository reads.

The product is therefore ready to shift emphasis from **workflow construction** to **harness engineering**.

Future development should make ChampCity A/I capable of equipping several model providers with the same application-owned tools, skills, context, execution infrastructure, evidence channels, resource-authority contracts, and worker-delegation capabilities.

The target provider hierarchy is:

```text
Browser ChatGPT
Primary orchestrator and high-reasoning Implementer
        │
        ├── performs work directly through ChampCity Harness tools
        ├── delegates bounded difficult local work to Codex
        └── later delegates low-reasoning mechanical work to a local model

Codex App Server
Specialist local coding/debugging worker and fallback Implementer

Local Model
Future low-cost mechanical worker for tightly bounded edits
```

ChampCity remains authoritative regardless of provider.

A second durable principle joins that provider-neutral model:

```text
Desktop selected project
= current ChampCity UI/workflow context

MCP workspace registry
= repositories Browser ChatGPT may address by explicit workspaceId

Configured filesystem roots
= non-repository host areas that Harness tools may access when explicitly authorized

Execution authority
= independently governed ability to run local processes against authorized resources
```

These responsibilities must not collapse back into one selected-project switch.

## 3. Current Repository and Development State

### 3.1 Repository state at this snapshot

The current WC60-era worktree remains intentionally dirty and uncommitted while the Operator completes review, live validation, documentation cleanup, and baseline reconciliation. It must not be treated as the future implementation baseline until the current work is reconciled into the Operator's normal Git baseline.

The current development branch remains:

```text
feature/phase-04-wc01-repair01-evidence-derived-workflow
```

The historical branch name is repository state only. It does not define the reconstruction sequence and does not imply that missing historical planning artifacts must be recreated.

No future implementation authority is created by this document.

### 3.2 Current application stack

The current application package identifies ChampCity A/I as an alpha Electron desktop application and uses:

```text
Electron 31
React 18
TypeScript 5.5
Vite 6
@modelcontextprotocol/sdk 1.30
@openai/codex 0.146
```

The application currently has standard typecheck, build, focused-test, and full-test lanes. Future Work Cards should continue using focused validation by default and reserve the complete historical suite for integration/release gates where broad regression proof is actually warranted.

### 3.3 Workflow foundation

The current application implements the nested lifecycle:

```text
Project
→ Intake
→ Architect Interview
→ Project Planning
→ Phase Map
→ Project Validation / Close

Phase
→ Phase Interview
→ Phase Planning
→ Work Card Selection
→ Phase Validation / Close

Work Card
→ Intake
→ Planning
→ Implementer Handoff / Report Review
→ Repair when required
→ Operator Validation
→ Close
```

The application owns workspace identity, artifact identity, source revisions, dispositions, freshness/invalidation, and evidence-derived navigation. Models are participants in that lifecycle, not the owners of it.

### 3.4 Development-environment foundation — WC56/WC57

The accepted architecture defines project ground zero as:

```text
selected repository state
+
local development machine state
```

The current production implementation contains:

```text
src/main/developmentEnvironment/
├── developmentEnvironmentCapabilityRegistry.ts
├── developmentEnvironmentPreflightService.ts
├── repositoryEcosystemProvider.ts
├── windowsDevelopmentEnvironmentProvisioner.ts
├── windowsEnvironmentRefresh.ts
└── windowsPackageProviderResolver.ts
```

The environment system provides:

- structured Work Card environment requirements;
- deterministic fast paths for common development capabilities;
- provider-backed Windows package resolution;
- WinGet/WinGet Configuration integration;
- Windows elevation/UAC handling;
- parent-process environment refresh;
- semantic post-install verification;
- recoverable Environment Resolution for long-tail requirements;
- repository-ecosystem detection for native dependency managers.

The architectural rule is:

```text
Known common requirement
→ deterministic recipe

Ordinary unknown software requirement
→ provider-backed discovery and installation

Complex, ambiguous, or vendor-specific requirement
→ agentic Environment Resolution

All paths
→ deterministic verification against the Work Card requirement
```

A missing managed capability must not be casually returned to the nontechnical Operator. Technical responsibility remains within ChampCity unless a genuine human boundary is reached, such as UAC, restart, credentials, purchase/license choice, or physical hardware.

### 3.5 Codex harness foundation — WC58

WC58 replaced the thin `@openai/codex-sdk`/`codex exec` implementation route with the richer Codex App Server transport.

Current production surfaces include:

```text
src/main/workCardBuilding/
├── codexAppServerProtocol.ts
├── codexAppServerTransport.ts
├── codexImplementerExecutionPolicy.ts
├── codexImplementerExecutionService.ts
└── workCardBuildingReviewService.ts
```

The App Server layer provides:

- packaged/local Codex runtime startup;
- full parent-process environment inheritance;
- persistent thread/turn execution;
- streamed command, file-change, MCP, and model events;
- effective runtime and capability inspection;
- native command/file/permission approval handling;
- Operator `request_user_input` handling;
- MCP elicitation as distinct input rather than denial;
- cancellation and child-process cleanup;
- Environment Resolution through the same harness;
- separation of stderr, runtime denial, approval, user input, and MCP input.

WC58 is not expected to remain the primary user-facing Implementer forever. It is the strong local coding worker and fallback provider for the future Harness architecture.

### 3.6 Agent Harness ingestion — WC60

WC60 performed a one-way, snapshot-bound ingestion of the useful ChampCity_GPT MCP core into ChampCity A/I.

The clean-break architecture is:

```text
ChampCity_GPT
Standalone repository bridge product
        │
        └── one-time donor snapshot
                 ↓
ChampCity A/I
Owns its adapted copy under src/main/agentHarness/
No runtime/build/test dependency on the standalone product
```

Current A/I-owned source exists under:

```text
src/main/agentHarness/
├── core/
├── repository/
├── runtime/
├── tools/
└── workspace/
```

The original WC60 implementation required a substantial bounded repair sequence. By the end of REPAIR12, Architect review and live Operator validation established the following:

- official MCP SDK Streamable HTTP transport is in use;
- action-scoped public tool contracts and strict schemas are exposed;
- OAuth/DCR/PKCE behavior is compatible with the existing ChatGPT connector;
- legacy ChampCity_GPT DCR client registrations can be imported into A/I-owned state without donor token/admin state;
- access and refresh token lifetimes/rotation are bounded;
- MCP sessions enforce their initialized transport scope;
- repository/attachment containment repairs are present;
- Agent Harness Settings are persistent and runtime transactional;
- the public identity `https://mcp.champcity.net` can be served by ChampCity A/I;
- Browser ChatGPT successfully read the REPAIR12 Implementer Report through the A/I-owned MCP runtime.

Live validation also exposed the next architectural limitation: generic MCP repository calls are currently rejected unless their `workspaceId` equals the project selected in the ChampCity desktop UI. That behavior is useful for workflow-specific operations but is too restrictive as the generic Harness resource-authority model. Future Harness work must decouple those responsibilities.

### 3.7 UI state

The current UI has a stable left-rail hierarchy for selected project, phase, and Work Card. WC60-05 added an application-level Settings workspace with an Agent Harness administration surface.

Current Settings responsibilities include:

```text
Settings
└── Agent Harness
    ├── enabled/startup state
    ├── start/stop/restart
    ├── local endpoint
    ├── public base URL
    ├── OAuth/authentication state
    ├── current selected-project routing diagnostics
    ├── tool exposure
    ├── legacy OAuth-client import
    └── diagnostics/activity
```

Future development may extend this area with an explicit **Harness Resource Access** configuration surface for registered MCP workspaces and bounded host filesystem roots. That surface must not become a second project workflow selector. Project selection answers “what project is the application currently working on?” Resource Access answers “what local resources may remote/browser agents address through the Harness?”

## 4. Current Product Definition

ChampCity A/I is best defined as:

> A local-first AI software-development orchestration platform that gives replaceable model workers persistent projects, approved work contracts, prepared development environments, controlled local capabilities, explicit resource authority, durable evidence, and a definition of done.

It is not merely:

- a coding chatbot;
- a prompt manager;
- an MCP server;
- a Codex wrapper;
- a compliance/governance product;
- a generic multi-agent framework.

The emerging product boundary is:

```text
ChampCity A/I
├── Workflow Authority
│   ├── projects
│   ├── phases
│   ├── Work Cards
│   ├── repairs
│   ├── validation
│   └── canonical artifacts
│
└── Agent Harness
    ├── resource authority
    ├── tools
    ├── skills
    ├── context
    ├── local execution
    ├── development environment
    ├── model providers
    ├── worker delegation
    ├── evidence
    └── diagnostics
```

MCP is one transport into the Harness. Codex App Server is another. A future local-model adapter will be another.

## 5. Future Development Goal

Future application development should establish the **provider-neutral ChampCity Agent Harness** and use it to dogfood subsequent development inside ChampCity A/I.

The primary success scenario is:

```text
1. Operator approves a Work Card in ChampCity A/I.
2. Embedded Browser ChatGPT receives the Work Card and current project context.
3. ChampCity grants the session/task explicit repository, filesystem-root, and execution authority.
4. Browser ChatGPT reads/searches/edits the authorized repository through ChampCity tools.
5. Browser ChatGPT runs build/test/debug operations through ChampCity execution tools.
6. The environment service establishes any missing development capabilities.
7. Browser ChatGPT delegates a bounded difficult task to Codex when useful.
8. Browser ChatGPT evaluates worker evidence and continues orchestration.
9. Browser ChatGPT writes the canonical Implementer Report through ChampCity.
10. ChampCity independently determines readiness for review and validation.
```

A second required use case is **remote/mobile Browser ChatGPT access**. The Operator must be able to use ChatGPT away from the development workstation and ask it to inspect or work with any Harness-authorized repository even when a different project happens to be selected in the desktop application.

The first future implementation cards may still require the WC58 Codex worker or an external development pass because the Browser Implementer cannot exist until the resource-authority and execution services are created. The dogfood cutover should occur as soon as the minimum Harness capability set is proven.

## 6. Target Harness Architecture

```text
                              ChampCity A/I
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
             Workflow Authority             Agent Harness
                    │                             │
        Approved Work Cards, phases,     resources, tools, skills,
        artifacts, validation state      context, execution, evidence
                    │                             │
                    └──────────────┬──────────────┘
                                   │
                         Provider / Worker Layer
              ┌────────────────────┼────────────────────┐
              │                    │                    │
       Browser ChatGPT       Codex App Server      Local Model
       primary orchestrator  specialist/fallback   mechanical worker
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                    Explicit Harness Resource Grants
                 ┌─────────────────┼─────────────────┐
                 │                 │                 │
        Registered Repositories  Host Roots      Execution
          workspaceId scoped     rootId scoped   task/session scoped
```

### 6.1 Authority ownership

ChampCity owns:

- current desktop-selected project/workflow context;
- the registry of MCP-accessible repositories/workspaces;
- configured non-repository filesystem roots;
- Work Card scope and approval state;
- canonical workflow and artifacts;
- environment requirements and verification;
- repository, filesystem, Git, and execution authority;
- process lifecycle;
- tool availability and OAuth transport scopes;
- task/session resource grants;
- evidence capture;
- validation state;
- agent/worker session identity.

Browser ChatGPT owns:

- high-level reasoning;
- Work Card interpretation;
- implementation strategy;
- task decomposition;
- worker delegation decisions in the first version;
- evaluation of worker output;
- final implementation synthesis;
- Implementer Report content.

Codex owns only the bounded task delegated to its active worker session or, when used as fallback Implementer, the active Approved Work Card.

A future local model owns only tightly bounded low-reasoning work assigned to it.

No model owns workflow authority or resource-policy authority.

### 6.2 Resource-authority model

Future Harness architecture must separate four concerns that WC60 currently partially conflates.

#### A. Desktop selected project

The desktop-selected project is the application’s foreground workflow context. It controls project/phase/Work Card navigation, workflow-specific actions, and which artifacts the Operator is currently manipulating.

It must not be the global allow/deny switch for generic MCP repository tools.

#### B. Registered MCP workspaces

ChampCity maintains a persistent registry of repositories/workspaces exposed to the Agent Harness. Each has a stable `workspaceId` and canonical root.

Generic MCP repository and Git inspection calls identify their target explicitly:

```text
repo_toolbox
workspaceId = champcity_ai

repo_toolbox
workspaceId = fo76_collector
```

A registered workspace may be addressed even when another project is selected in the desktop UI. Unknown/unregistered workspace IDs remain denied.

Workflow-specific capabilities may still require the requested workspace to equal the currently active project when that relationship is semantically necessary.

#### C. Configured host filesystem roots

Coding work sometimes needs resources outside a repository: build/output areas, application `userData`, logs, temporary working directories, imported files, or a parent development directory containing sibling repositories.

ChampCity should therefore support separately configured filesystem roots with stable identifiers and explicit read/write policy. Example categories may include:

```text
Development Projects Root
Application userData Root
Build/Temp Root
Operator-selected auxiliary root
```

This is not blanket whole-machine ownership. Future development should prefer bounded configured roots over unrestricted `C:\` access. Additional roots can be granted when real tasks require them.

#### D. Execution authority

Execution is a separate authority domain. A model having `files.write` OAuth transport scope or repository write access does not automatically authorize arbitrary local process execution.

An execution request must resolve against the active task/session resource grants and its allowed working directory. Git mutation remains independently governed even when execution is allowed.

### 6.3 Authorization layers

The intended layering is:

```text
Layer 1 — OAuth transport authorization
files.read / files.write

Layer 2 — Harness resource authority
registered workspaceIds / filesystem rootIds / execution availability

Layer 3 — future agent/role authority
Architect / Implementer / Verifier / Validator / etc.

Layer 4 — task and workflow/state authority
what this role/session may do for this Work Card right now
```

OAuth is intentionally coarse. Future subagent permissioning belongs above OAuth, where ChampCity understands role, task, resource, and workflow state.

## 7. Harness Capability Kernel

Future development should introduce one application-owned capability registry rather than separate tool catalogs for every model provider.

Conceptually:

```text
HarnessCapabilityRegistry
├── repo.*
├── filesystem.*
├── git.*
├── execution.*
├── environment.*
├── artifact.*
├── browser.*
├── research.*
├── knowledge.*
├── diagnostics.*
└── worker.*
```

Each capability contract should identify:

- stable capability/action ID;
- input schema;
- result schema;
- read/write/mutation classification;
- required transport scope;
- applicable workspace/root/task authority;
- timeout/cancellation behavior;
- evidence emitted;
- availability/health state.

Provider adapters expose the same underlying capability through their native mechanism:

```text
Browser ChatGPT → MCP
Codex App Server → native tools plus MCP where appropriate
Local model → function/tool adapter
```

The service implementation remains application-owned and shared.

## 8. Local Execution Service

The highest-priority functional future capability is a generic local execution service. Browser ChatGPT cannot become a real Implementer without it. Resource-authority decoupling must be established before broad execution is exposed.

The execution layer should not be a hard-coded npm/CMake/Python command catalog. It should run structured local development operations selected by the active model under ChampCity authority.

### 8.1 Core operations

```text
execution.capabilities
execution.start
execution.status
execution.read_output
execution.send_input
execution.cancel
```

Optional convenience wrappers may exist later, but the authority is a generic program-plus-arguments execution record.

### 8.2 Execution request

A run should include at minimum:

```text
runId
workspaceId when repository-bound
filesystemRootId when non-repository resources are required
program
arguments[]
workingDirectory
environment additions/overrides
timeout
input mode
requested elevation state
parent agent session
parent Work Card / worker task
resource grant / task authority identity
```

The working directory must resolve inside an authorized workspace/root unless a separately approved host-level execution capability explicitly allows otherwise.

### 8.3 Execution result and lifecycle

```text
queued
starting
running
waiting-for-input
completed
failed
cancelled
timed-out
```

Evidence should include:

- exact executable and structured arguments;
- selected cwd and resolved resource authority;
- start/end time;
- exit code/signal;
- stdout and stderr with bounded cursors;
- timeout/cancellation reason;
- environment refresh or elevation events;
- process-tree cleanup status.

### 8.4 Required behavior

The service must support:

- short-lived commands;
- long-running development servers;
- streaming output;
- bounded output retrieval;
- stdin when required;
- timeout;
- cancellation;
- child-process-tree termination;
- refreshed environment inheritance;
- UAC escalation through the existing Windows boundary;
- application-shutdown cleanup;
- execution against the explicitly authorized repository/root rather than only the desktop-selected project;
- durable evidence for Implementer Reports and diagnostics.

UAC remains a genuine Operator/OS boundary. ChampCity should not attempt to automate the Windows secure-desktop confirmation.

## 9. Repository, Filesystem, and Git Services

WC60 provides most of the initial repository service, but its current authority provider resolves only the desktop-selected project. Future development must replace that generic restriction with the registered-workspace authority described above.

### 9.1 Repository service

Required model-facing repository behavior includes:

```text
workspace inventory
list/tree
search
bounded read
line/chunk read
hash
write/create
delete/move when authorized
propose patch
apply approved patch
atomic multi-file patch set
diff
```

Generic repository calls must resolve the explicit `workspaceId` against the Harness workspace registry rather than requiring equality with the desktop UI selection.

The Harness repository service should become the preferred browser-model edit route rather than relying on provider-internal patch functions.

### 9.2 Host filesystem service

A separate filesystem provider should serve authorized non-repository roots. Initial operations should remain deliberately small:

```text
filesystem.roots
filesystem.list
filesystem.read
filesystem.read_chunk
filesystem.write when authorized
filesystem.stat/hash
```

A call should identify `rootId` plus a root-relative path. Realpath/reparse containment must be enforced at the configured root boundary. Arbitrary absolute paths supplied by the model should not silently create new authority.

This service exists to support real development work, not to expose the entire workstation by default.

### 9.3 Git service

Git behavior should include inspection and Work-Card-authorized mutation through A/I-owned services:

```text
status
diff
branch/history inspection
stage
commit
restore
conflict inspection
push/pull when explicitly authorized
```

Git mutation must never become implied merely because the tool exists, because process execution is available, or because OAuth includes `files.write`.

## 10. Environment Service

The existing environment system becomes a first-class Harness capability:

```text
environment.inspect
environment.ensure
environment.resolve
environment.status
```

A model encountering a missing compiler, SDK, package manager, or tool should invoke the same application-owned environment path rather than independently creating another provisioning system.

The deterministic/provider/agentic hierarchy remains authoritative. Environment work may inspect machine-level state when necessary, but installation/elevation remains an explicitly modeled capability rather than a side effect of generic filesystem access.

## 11. Context and Skills Service

The Harness must supply models with bounded, relevant, reusable context rather than dumping the complete application history into every turn.

### 11.1 Context packs

Potential packs include:

```text
Project Context
- Project Intake/Profile/Roadmap/Phase Map

Phase Context
- current phase planning and prior close evidence

Work Card Context
- Approved Work Card
- parent/repair identity
- acceptance criteria
- authorized and forbidden scope

Repository Context
- AGENTS.md
- README/build/validation instructions
- current relevant source excerpts

Resource Context
- authorized workspaceIds
- authorized filesystem rootIds
- execution authority
- Git-mutation authority

Execution Context
- environment state
- previous commands/results
- current failure evidence
```

### 11.2 Skills

Skills should be first-class Harness resources, not provider-specific prompt fragments.

Initial skills should include:

```text
implement-work-card
diagnose-build-failure
resolve-development-environment
write-implementer-report
review-implementation-evidence
perform-bounded-repair
validate-work-card
```

Each skill should declare:

- purpose;
- required context;
- permitted capabilities;
- resource authority needed;
- expected evidence;
- completion conditions;
- return contract.

Skills must remain project/domain neutral. Do not infer banking, compliance, regulatory, security, or organizational requirements from the Operator's occupation or unrelated context.

## 12. Agent Session Service

ChampCity should track provider sessions independently of the providers themselves.

A session record should include:

```text
agentSessionId
provider
providerThreadId
currentWorkflowWorkspaceId
registered/authorized workspaceIds
filesystemRootIds
execution authority
future role identity
project/phase/Work Card identity
workerTaskId when delegated
startedAt / updatedAt
state
pending input
active tool runs
last evidence
completion status
```

This enables:

- resumable Browser ChatGPT work;
- remote/mobile access independent of the desktop-selected project;
- Codex thread continuity;
- exact pending-input routing;
- cancellation;
- crash/restart recovery;
- evidence correlation;
- provider substitution without losing workflow state.

## 13. Worker Delegation

The initial orchestration model should be simple: Browser ChatGPT chooses when to delegate.

Potential worker actions:

```text
worker.delegate_codex
worker.delegate_local
worker.status
worker.result
worker.cancel
```

A worker request should contain:

```text
parent Work Card
bounded task
reason for delegation
authorized workspaceIds / rootIds
authorized paths
execution authority
preservation constraints
forbidden changes
required validation
required return evidence
```

Codex should be reserved for work where its local coding/debugging harness provides material value, such as difficult process debugging, broad repository edits, native build failures, or operations unavailable through the browser harness.

A future local model should receive low-entropy tasks such as:

- exact renames;
- import propagation;
- schema-field propagation;
- repetitive test additions from an existing pattern;
- bounded formatting or metadata updates;
- mechanical refactors with deterministic tests.

Worker output is evidence, not authority. Browser ChatGPT evaluates it and remains responsible for the parent Work Card.

## 14. Browser and UI Validation

Future development should use Playwright as the first browser/UI validation backend.

Required capabilities include:

```text
navigate
inspect DOM
interact with forms
capture screenshot
read console errors
read failed network requests
validate Electron renderer behavior
```

Do not block Browser Implementer on a general native-computer-use clone. Native Windows UI Automation can be added later if field use demonstrates the need.

## 15. MCP Federation

The Agent Harness should be able to consume external MCP servers and expose their availability consistently to model providers.

The MCP manager should eventually support:

```text
register
start
stop
health
list tools
call tool
timeout
stderr/status
authentication state
```

Initial likely services include Playwright and GitHub. Project-specific MCPs may be added later.

ChampCity native capabilities remain application-owned. External MCPs extend the Harness; they do not replace resource, workflow, artifact, or execution authority.

## 16. Human Input and Approval Boundaries

The Harness must distinguish:

```text
Native model/tool approval
Genuine missing information
MCP elicitation
Runtime denial
Windows UAC
```

The intended authority model is:

```text
Approved Work Card
→ implementation authority within its granted resources

Owned Codex native approval request
→ automatic ChampCity approval when already covered by the Work Card/task authority

Genuine missing factual/product decision
→ Operator input routed to the exact session/request

MCP elicitation
→ distinct bounded input route

Windows UAC
→ Operator approves through Windows

Hard provider/runtime denial
→ truthful explicit failure evidence
```

Do not add a second risk-review model, compliance classifier, semantic permission reviewer, or generic governance engine.

## 17. Observability and Evidence

ChampCity should be more observable than any individual model harness.

Every agent session should expose a chronological trace containing, where available:

- provider/model/reasoning mode;
- thread/turn/session identity;
- effective tools, skills, MCPs, and capabilities;
- desktop workflow context separately from resource grants;
- authorized workspaceIds/filesystem rootIds/execution authority;
- repository/filesystem reads/searches/writes/patches;
- process commands and outputs;
- approvals and Operator inputs;
- worker delegations and returns;
- token/duration metrics when providers expose them;
- final failure or completion reason.

Example:

```text
14:12:03 repo.read workspace=champcity_ai CMakeLists.txt
14:12:09 repo.search workspace=champcity_ai src/**
14:12:22 execution.start workspace=champcity_ai cmake --preset msvc-x64
14:12:29 execution.failed exit=1
14:12:33 execution.read_output stderr
14:13:04 repo.apply_patch workspace=champcity_ai src/foo.cpp
14:13:10 execution.start cmake --build ...
14:13:31 execution.completed exit=0
14:13:35 execution.start ctest ...
14:13:49 execution.completed exit=0
```

A bounded diagnostic export should eventually include application/runtime version, OS, workflow state, provider state, Harness capability inventory, resource-authority state, environment state, recent trace, and errors. Repository source should not be included unless explicitly selected.

## 18. Dogfooding Transition Plan

### Stage 0 — close current foundation and establish cleanup baseline

Before future implementation begins:

- complete WC60 integrated review/live validation;
- reconcile the current dirty worktree into a clean Operator-approved Git baseline;
- retain the working A/I-owned MCP cutover configuration and imported OAuth client continuity;
- retain this future-design document alongside the current application baseline;
- start reconstruction/intake/planning inside the application.

### Stage 1 — decouple resource authority and bootstrap the Harness kernel

The first future Harness work should establish:

```text
desktop selected project ≠ generic MCP workspace authority

persistent registered workspace inventory
explicit workspaceId routing
bounded configured host filesystem roots
provider-neutral capability/session contracts
```

This is foundational. Do not expose broad Browser coding execution while the generic Harness still assumes the desktop-selected project is the only permissible resource.

### Stage 2 — implement local execution

Build and prove the generic execution service against explicit resource grants. This is the minimum functional capability that turns Browser ChatGPT from repository editor into coding Implementer.

### Stage 3 — Browser Implementer pilot

Use Browser ChatGPT to implement a small, real, noncritical ChampCity Work Card through:

```text
repo/filesystem tools
+ execution tools
+ environment tools
+ canonical report write
```

Do not delegate during the first proof. Establish direct Browser Implementer viability first.

The pilot must also prove that changing the desktop-selected project does not silently change the authorized repository for an already-bound Browser task/session.

### Stage 4 — Codex worker delegation

Expose the accepted WC58 App Server functionality as a bounded worker service. Require Browser ChatGPT to delegate one narrowly defined task, consume the returned evidence, and continue the parent Work Card.

### Stage 5 — dogfood cutover

Once Browser ChatGPT has successfully completed several Work Cards and Codex fallback is proven:

- make Browser ChatGPT the primary Implementer provider for new work;
- retain Codex as specialist/fallback;
- continue using the application to create all future Work Cards and repairs;
- use the same A/I-owned MCP for remote/mobile repository work where useful.

### Stage 6 — local-model worker

Add a local-model provider only after the worker contract and delegation evidence are stable. Begin with mechanical edits and deterministic verification.

### Stage 7 — routing intelligence

Do not begin with a large automatic router. Progress through:

```text
V1 Browser ChatGPT explicitly chooses worker
V2 ChampCity recommends worker
V3 ChampCity automatically routes proven low-risk mechanical tasks
V4 cost/latency/capability-aware orchestration
```

## 19. Candidate Future Work Streams

These are planning candidates, not approved Work Cards:

1. Multi-workspace and host-filesystem resource-authority foundation.
2. Agent Harness capability kernel and provider/session contracts.
3. Generic local execution service and MCP toolbox.
4. Context-pack and skill service.
5. Embedded Browser Implementer provider.
6. Browser Implementer end-to-end proof.
7. Codex worker extraction/delegation adapter.
8. Worker evidence and parent-session integration.
9. Harness observability and diagnostic export.
10. Local-model worker foundation.
11. Provider parity and routing experiments.

The application should split these into concise Work Cards using the repository-retained Work Card standard. Do not combine the entire future architecture into one giant implementation assignment.

The resource-authority foundation should precede generic Browser execution because later role/session/task permissioning depends on it.

## 20. Future Application Acceptance Direction

The target future architecture should not be considered complete until the integrated system proves:

1. Browser ChatGPT can receive an Approved Work Card and the correct project/workflow context inside ChampCity A/I.
2. Browser ChatGPT can inventory and address any Harness-registered repository by explicit `workspaceId` even when another project is selected in the desktop UI.
3. Unknown/unregistered workspace IDs and paths outside configured roots are denied deterministically.
4. Browser ChatGPT can list/read/search/write/patch an authorized repository through A/I-owned tools.
5. Browser ChatGPT can access a separately configured non-repository filesystem root through a root-scoped provider without receiving blanket filesystem authority.
6. Browser ChatGPT can start, monitor, inspect, and cancel local development processes through the execution service against authorized resources.
7. Execution cannot silently escape the task/session resource grant merely because OAuth has `files.write`.
8. The environment service can establish a missing managed development capability encountered during Browser implementation.
9. Browser ChatGPT can complete build/test/debug cycles and preserve command evidence.
10. Browser ChatGPT can write the canonical Implementer Report through A/I-owned artifact authority.
11. ChampCity can project the completed report into the existing review/validation workflow.
12. Browser ChatGPT can delegate one bounded task to the WC58 Codex worker and receive correlated evidence.
13. Worker output cannot mutate parent workflow authority, broaden its own resource grants, or bypass Git-mutation constraints.
14. Genuine Operator questions, MCP input, UAC, runtime denial, and model/tool approval remain distinct.
15. Application shutdown cancels or preserves/reconciles active sessions and kills owned child processes deterministically.
16. One real ChampCity feature after the bootstrap cards is planned, implemented, reviewed, repaired if necessary, and validated entirely through the dogfooded application workflow.
17. Remote/mobile Browser ChatGPT can inspect an authorized repository without requiring the Operator to first select that project in the desktop application.
18. Existing workflow, environment, Codex, and Agent Harness regressions remain green.

A local-model worker is desirable but may be deferred if Browser ChatGPT and Codex worker dogfooding are complete and stable.

## 21. Explicit Non-Goals

Future development should not include by default:

- cloud execution or hosted worker infrastructure;
- team/multi-user collaboration;
- automatic billing/cost optimization;
- an enterprise/compliance governance layer;
- inference from the Operator's occupation or unrelated projects;
- unrestricted whole-drive or whole-user-profile filesystem access merely because browser coding needs local tools;
- a full native Windows computer-use clone;
- broad Office/PDF/slides/spreadsheet authoring tools;
- automatic synchronization with ChampCity_GPT after the completed migration/cutover work;
- a shared Agent Harness npm package before duplicated maintenance proves the need;
- an autonomous architecture-authority model;
- removal of the WC58 Codex fallback before Browser Implementer is proven.

## 22. Key Risks and Mitigations

### External provider drift

Risk: ChatGPT, Codex App Server, MCP, or external providers change behavior.

Mitigation: provider-neutral contracts, capability inspection, pinned compatibility adapters, and fallback providers.

### Resource-authority overreach

Risk: solving multi-workspace/browser execution by granting the model unrestricted workstation access creates a needlessly large blast radius for mistakes, prompt injection, incorrect paths, or task drift.

Mitigation: explicit registered workspace IDs, separately configured filesystem root IDs, realpath containment, task/session grants, and independent execution/Git authority. Expand roots when evidence shows a real development need rather than granting the entire machine preemptively.

### Selected-project coupling

Risk: keeping generic MCP authority bound to the desktop-selected project breaks remote/mobile use and causes Browser sessions to fail or target the wrong workflow context when the Operator changes projects.

Mitigation: desktop selection is workflow context only; generic repository routing uses the persistent Harness workspace registry and explicit workspace IDs. Workflow-specific operations may retain selected-project equality where semantically required.

### Execution-service danger and complexity

Risk: process execution can leak outside authorized resources, orphan processes, or obscure failures.

Mitigation: explicit workspace/root/task authority, structured program/args, process-tree ownership, bounded output, timeout/cancel, explicit elevation, and durable evidence.

### Context overload

Risk: models receive too much workflow/repository history and waste tokens or drift.

Mitigation: skills and context packs scoped to the active task.

### Worker drift

Risk: delegated workers broaden scope or return unverified claims.

Mitigation: bounded worker tasks, explicit resource grants, deterministic validation, and parent-agent review.

### UI complexity

Risk: agent/session/tool/resource detail overwhelms the Operator.

Mitigation: show the current action and state first; keep raw trace and diagnostics progressively disclosed. Keep project selection separate from Harness Resource Access rather than merging both concepts into one control.

### Premature automatic routing

Risk: a complex router adds governance and unpredictable model choice before evidence exists.

Mitigation: Browser ChatGPT chooses workers first; automate only after observed delegation history supports rules.

## 23. Immediate Next Steps

After the completed WC60 repair sequence and live connector proof:

1. Perform the repository/worktree and documentation cleanup needed to establish a clean ChampCity_AI baseline without losing the accepted current implementation.
2. Retain `CURRENT_APPLICATION_BASELINE.md` and this `FUTURE_APPLICATION_DESIGN.md` as the primary reconstruction inputs.
3. Move ChampCity A/I development back into the ChampCity A/I application workflow.
4. Conduct fresh intake/planning from those current-state and future-design documents inside the application.
5. Make resource-authority decoupling/multi-workspace access the first foundational future planning concern.
6. Create concise Work Cards inside the application.
7. Bootstrap the minimum resource/capability kernel and execution service externally/WC58 only where necessary.
8. Cut future implementation over to Browser ChatGPT as soon as the direct Browser Implementer proof passes.

## 24. Final Architecture Principle

The durable principle for the future Harness architecture is:

```text
ChampCity owns the workflow, resource grants, environment, tools, execution, evidence, and definition of done.

The desktop-selected project is workflow context, not the universal MCP authorization boundary.

Models address only explicit Harness-authorized repositories, filesystem roots, and execution capabilities.

Models provide replaceable reasoning and implementation labor.

Browser ChatGPT orchestrates.
Codex handles difficult local specialist work.
A future local model handles cheap mechanical work.

OAuth remains a coarse transport boundary.
Future role/task/workflow authority belongs to ChampCity above OAuth.

No model is the system of record.
```
