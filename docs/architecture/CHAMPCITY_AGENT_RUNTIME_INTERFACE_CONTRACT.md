# ChampCity Agent Runtime Interface Contract

**Status:** Architecture Contract — V2 implementation baseline v1 — September 14, 2026  
**Scope:** ChampCity V2 shared Product Core, Desktop runtime hosts, Server runtime hosts, and runtime adapters  
**Purpose:** Define the portable semantic contract through which ChampCity executes AI workers without allowing Codex/App Server, another external runtime, or a specific model provider to define ChampCity architecture.

---

## 1. Contract Intent

ChampCity requires an explicit boundary between product orchestration and the low-level runtime that operates an AI worker.

The governing rule is:

> ChampCity Core consumes portable runtime semantics. A runtime adapter translates those semantics into provider-specific behavior.

Codex/App Server becomes the first conformance implementation of this contract. It is not the definition of the contract.

This document supersedes the interface-level design questions in `CHAMPCITY_RUNTIME_ABSTRACTION_INITIATIVE_DESIGN_DISCUSSION.md`. That document remains useful historical design context. This contract is the implementation target.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative.

---

## 2. Architectural Boundary

The Agent Runtime Interface owns **how an AI worker executes**.

It does not own why the worker is running, Operator Decisions, workflow eligibility, durable project memory, source-control policy, or the canonical definition of a skill.

```text
ChampCity Workflows / Governance
        │
        ├── Operator direction, role, scope, lifecycle, governing work
        ↓
Execution Profile + Capability Pack + Skill Bindings
        │
        ↓
ChampCity Agent Runtime Interface
        │
        ├── Codex Runtime Adapter
        ├── ChampCity Native Runtime
        └── Future Runtime Adapter(s)
        │
        ↓
Model / Inference Provider
```

### 2.1 ChampCity Orchestration owns

- why execution is occurring;
- worker role and lifecycle stage;
- Operator Decisions and reserved human decision boundaries;
- governing Project, Work Item, Issue, Decision, Validation, or Bounded Solution;
- which tools are legal for the execution;
- approval policy;
- workflow state transitions; and
- what happens after execution terminates.

### 2.2 The Agent Runtime owns

- runtime and model discovery at the runtime boundary;
- runtime capability advertisement;
- thread and turn mechanics;
- execution event streaming;
- interruption and optional steering;
- tool-loop integration;
- execution-permission suspension and continuation;
- sandbox application;
- runtime-local context handling;
- runtime-local skill delivery;
- usage and execution telemetry exposed by the runtime/provider;
- normalized runtime failures; and
- runtime continuity/recovery to the extent advertised.

### 2.3 AI Tools owns

- semantic tool identities;
- tool schemas;
- tool authorization intent;
- bounded repository, Git, browser, diagnostics, test, and integration operations; and
- tool implementation independent of the model-facing transport.

MCP is a tool-delivery mechanism. It is not itself the portable tool contract.

### 2.4 Skills Engine owns

- skill identity;
- canonical skill content;
- version;
- standards binding;
- assignment;
- applicability;
- capability requirements; and
- skill conformance expectations.

The runtime owns only how an assigned ChampCity skill is delivered to that runtime.

### 2.5 Project State and AI Memory own

- durable project facts;
- findings and root causes;
- bounded solutions;
- decisions;
- implementation results;
- evidence;
- validation history;
- long-lived project memory; and
- lineage/provenance.

A runtime thread MUST NOT become the authoritative project-memory store.

---

## 3. Runtime Semantic Inventory

The portable contract SHALL cover the following semantic families.

| Semantic family | Contract classification | Notes |
| --- | --- | --- |
| Runtime identity/discovery | Core | Every runtime identifies implementation, version, contract version, and advertised capabilities. |
| Model discovery | Core | Model identifiers are opaque runtime/provider references. |
| Capability negotiation | Core | Required capabilities fail closed; no silent downgrade. |
| Thread creation | Core | A thread is execution continuity, not project state. |
| Durable thread persistence | Negotiated | Required only when a workflow declares it. |
| Thread resume/fork/archive | Negotiated | Advertised individually. |
| Turn lifecycle | Core | One active turn per thread in Contract v1. |
| Streaming events | Core | Ordered normalized event stream. |
| Interruption | Engineering profile | Must stop active work without destroying valid completed thread state. |
| Active-turn steering | Negotiated | Not required for basic conformance. |
| Approvals/permissions | Engineering profile | Execution permission only; never an Operator disposition or workflow-eligibility decision. |
| Human input / elicitation | Engineering profile | Portable suspension/request/response semantics. |
| Tool execution | Engineering profile | Supports bounded Capability Packs; host-dispatched and/or runtime-native modes. |
| Sandboxing | Engineering profile | Effective restrictions must be reported; restrictions may not be silently broadened. |
| Context handling | Core | Explicit Context Envelope and Context Receipt. |
| Context compaction | Negotiated | May be ChampCity-owned, runtime-owned, or hybrid by policy. |
| Usage telemetry | Core schema | Availability/quality is negotiated; unavailable metrics remain explicitly unavailable. |
| Skills | Engineering profile | Versioned ChampCity Skill Bindings plus delivery receipts. |
| MCP-native support | Negotiated | Runtime feature, not a workflow dependency. |
| Runtime restart recovery | Negotiated | Must be truthfully advertised and tested. |
| Error normalization | Core | Stable ChampCity error taxonomy with provider details isolated. |
| Provider-specific extensions | Extension | Namespaced and non-normative to portable workflows. |

---

## 4. Identity Model

Runtime identities MUST be distinct from Product Core identities.

The interface SHALL use at least these concepts:

| Identity | Owner | Meaning |
| --- | --- | --- |
| `runtimeImplementationId` | Runtime registry | Stable implementation family, for example `codex-app-server`. |
| `runtimeInstanceId` | Runtime host | Specific running runtime instance. |
| `executionSessionId` | ChampCity | ChampCity correlation identity for one governed worker execution session. |
| `runtimeThreadId` | Runtime adapter | Opaque runtime-native continuity identifier. |
| `turnId` | Runtime adapter | Opaque runtime turn identifier. |
| `eventId` | Runtime adapter | Unique normalized event identity. |
| `toolCallId` | Runtime adapter | One tool invocation. |
| `approvalRequestId` | Runtime adapter | One pending execution approval. |
| `inputRequestId` | Runtime adapter | One pending human-input request. |

`projectId`, `workItemId`, `environmentId`, `repositoryId`, and related Product Core identities MAY be supplied as correlation metadata, but the runtime MUST NOT infer task scope, workflow eligibility, or an Operator Decision merely from possession of those identifiers.

The legacy `workspaceId` MUST NOT be part of the new portable runtime contract.

---

## 5. Contract Surface

The exact implementation language is not normative. The semantic surface is equivalent to:

```ts
interface AgentRuntime {
  describe(): Promise<RuntimeDescriptor>;
  discoverModels(request?: ModelDiscoveryRequest): Promise<ModelDescriptor[]>;
  negotiate(request: RuntimeNegotiationRequest): Promise<RuntimeNegotiationResult>;

  createThread(request: CreateThreadRequest): Promise<RuntimeThreadDescriptor>;
  getThread(runtimeThreadId: string): Promise<RuntimeThreadDescriptor>;
  resumeThread(runtimeThreadId: string): Promise<RuntimeThreadDescriptor>;
  forkThread(runtimeThreadId: string, request?: ForkThreadRequest): Promise<RuntimeThreadDescriptor>;
  closeThread(runtimeThreadId: string): Promise<void>;

  startTurn(request: StartTurnRequest): Promise<RuntimeTurnDescriptor>;
  streamEvents(request: StreamRuntimeEventsRequest): AsyncIterable<RuntimeEvent>;
  interruptTurn(request: InterruptTurnRequest): Promise<InterruptReceipt>;
  steerTurn(request: SteerTurnRequest): Promise<SteerReceipt>;

  resolveApproval(request: ApprovalResolution): Promise<void>;
  resolveUserInput(request: UserInputResolution): Promise<void>;
  resolveElicitation(request: ElicitationResolution): Promise<void>;
}
```

A conforming implementation MAY internally use HTTP, JSON-RPC, stdio, IPC, sockets, queues, in-process calls, or another transport. Transport is not part of the Product Core contract.

If an operation is not supported, the runtime MUST return normalized `CAPABILITY_UNSUPPORTED`; it MUST NOT fabricate successful behavior.

---

## 6. Runtime Descriptor and Capability Advertisement

`describe()` MUST return a `RuntimeDescriptor` before governed execution begins.

Conceptually:

```ts
interface RuntimeDescriptor {
  runtimeImplementationId: string;
  runtimeInstanceId: string;
  implementationVersion: string;
  contractVersions: string[];
  capabilities: RuntimeCapabilities;
  extensions?: Record<string, unknown>;
}
```

Capabilities MUST describe semantics, not marketing labels.

A v1 capability description should cover at least:

```text
models.discovery
threads.persistence = session | durable
threads.resume
threads.fork
threads.restartRecovery
turns.streaming
turns.interruption = none | cooperative | preemptive
turns.steering
approvals.supported
approvals.kinds[]
approvals.scopes[]
userInput.supported
tools.deliveryModes[] = host-dispatched | runtime-native
tools.dynamicCapabilityPack
sandbox.filesystemModes[]
sandbox.networkModes[]
context.ownershipModes[] = champcity | runtime | hybrid
context.compaction
context.receipt
context.runtimeAddedContextTelemetry
usage.tokenCounts = exact | estimated | unavailable
usage.cacheCounts = exact | estimated | unavailable
usage.cost = exact | estimated | unavailable
skills.deliveryModes[] = native | context
mcp.native
stream.replay
stream.cursor
```

A runtime MUST NOT advertise a capability that it cannot satisfy under the conformance tests for that capability.

---

## 7. Model Discovery and Selection

### 7.1 Model descriptors

`discoverModels()` MUST return normalized descriptors rather than forcing Product Core to parse provider-specific model names.

A descriptor SHOULD expose, when known:

- opaque `runtimeModelId`;
- provider identity;
- display name and description;
- availability state;
- input modalities;
- output modalities;
- supported reasoning profiles;
- default reasoning profile;
- tool-use support;
- structured-output support where relevant;
- context-window size and source/confidence of that value;
- maximum output size where known; and
- model-specific capability extensions.

Unknown values MUST be represented as unknown/unavailable, not inferred.

### 7.2 Reasoning configuration

ChampCity MUST NOT make OpenAI-specific reasoning-effort names universal contract values.

A model descriptor may advertise opaque `reasoningProfileId` values. ChampCity selects one of the advertised profiles or accepts the advertised default.

### 7.3 Effective selection

When a requested model or reasoning profile is not honored, the runtime MUST either:

1. reject the execution during negotiation; or
2. explicitly return the different effective selection and require ChampCity to accept it before execution.

Silent model substitution is non-conformant.

---

## 8. Capability Negotiation

Capability negotiation occurs before creating or starting governed execution.

The request SHALL contain the resolved execution requirements from ChampCity, including as applicable:

- execution profile identity/version;
- required runtime capabilities;
- optional runtime capabilities;
- selected or required model characteristics;
- minimum context requirements;
- Capability Pack manifest/digest;
- assigned Skill Bindings;
- sandbox requirements;
- required telemetry quality;
- thread-persistence/recovery requirements; and
- execution-target constraints.

The result MUST be one of:

```text
ACCEPTED
  + effective runtime configuration
  + effective model configuration
  + effective sandbox policy
  + tool-delivery mode
  + context strategy
  + skill-delivery strategy
  + telemetry availability
  + unsupported optional capabilities / declared degradations

REJECTED
  + one or more normalized incompatibilities
```

Required capabilities MUST fail closed.

A runtime MUST NOT silently broaden sandbox access, remove a required tool, drop a required context segment, substitute a model, disable an approval boundary, or downgrade required telemetry.

---

## 9. Thread Semantics

A runtime thread is an execution-continuity container for model conversation/runtime state.

It is not:

- a Project;
- a Work Item;
- a durable project-memory record;
- a workflow state machine; or
- a source of an Operator Decision or workflow eligibility by itself.

### 9.1 Contract v1 thread states

```text
OPEN
CLOSED
LOST
```

A runtime MAY expose richer internal states, but these normalize to the portable states above.

### 9.2 Persistence

Thread persistence is negotiated:

- `session` — continuity is guaranteed only for the runtime instance/session;
- `durable` — the runtime guarantees retrieval/resumption across runtime-host restart according to its advertised recovery semantics.

This is an intentional design refinement. Durable project memory belongs to ChampCity structured state. A provider thread is useful execution continuity, but it is not required to carry project memory across workers.

### 9.3 Resume, fork, archive

Resume and fork are separately advertised capabilities.

If unsupported, Product Core MUST use structured Project State / AI Memory to begin a new thread with the required Context Envelope rather than depending on hidden provider history.

### 9.4 Concurrency

Contract v1 permits **one active turn per thread**.

Parallel work uses multiple threads/execution sessions. A future contract version may add portable parallel-turn semantics if a concrete product requirement emerges.

---

## 10. Turn Lifecycle

A turn represents one bounded execution request against one runtime thread.

Normalized turn states are:

```text
CREATED
RUNNING
SUSPENDED
INTERRUPTING
COMPLETED
FAILED
INTERRUPTED
```

`SUSPENDED` includes a declared suspension reason such as:

- approval;
- user input;
- MCP/provider elicitation; or
- external tool completion where the runtime cannot continue until a response arrives.

### 10.1 Lifecycle invariants

A conforming runtime MUST ensure:

1. a turn has exactly one `turnId`;
2. no more than one active turn exists on a thread in Contract v1;
3. a turn emits exactly one terminal semantic outcome: `COMPLETED`, `FAILED`, or `INTERRUPTED`;
4. a terminal turn does not later return to `RUNNING`;
5. pending approval/input identities are correlated to the owning turn;
6. interruption does not implicitly destroy the thread; and
7. completed items/events already emitted remain valid unless an explicit correction event is defined by a later contract version.

---

## 11. Streaming Event Contract

All governed turns MUST expose normalized streaming events.

Each event SHALL contain at least:

```ts
interface RuntimeEventEnvelope {
  eventId: string;
  sequence: number;
  occurredAt: string;
  runtimeInstanceId: string;
  executionSessionId: string;
  runtimeThreadId: string;
  turnId: string;
  type: RuntimeEventType;
  payload: unknown;
}
```

`sequence` MUST be strictly increasing within a turn.

### 11.1 Required event families

The normalized event vocabulary SHALL support at least:

```text
turn.started
turn.suspended
turn.resumed
turn.completed
turn.failed
turn.interrupted

message.delta
message.completed

item.started
item.completed

tool.requested
tool.started
tool.completed
tool.failed

approval.requested
approval.resolved

user_input.requested
user_input.resolved

elicitation.requested
elicitation.resolved

context.receipt
context.compacted

usage.updated
usage.final

sandbox.denied
runtime.warning
runtime.diagnostic
```

A runtime may map many provider-native event types into these portable families.

### 11.2 Hidden reasoning

The portable contract MUST NOT require exposure of private chain-of-thought or provider-hidden reasoning traces.

A runtime MAY stream model-visible answer content, provider-supported reasoning summaries, status summaries, or progress metadata when permitted. Hidden reasoning content is not a ChampCity runtime dependency.

### 11.3 Replay

Live streaming is Core. Event replay/cursor reconnection is negotiated.

If replay is advertised, reconnecting with a valid cursor MUST preserve event order and MUST NOT duplicate an event without preserving the same `eventId`.

---

## 12. Interruption and Steering

### 12.1 Interruption

Engineering runtimes MUST support turn interruption.

`interruptTurn()` MUST be idempotent.

An accepted interruption request does not mean the turn is already stopped. The runtime returns an interruption receipt and subsequently emits the terminal `turn.interrupted` event when execution has actually ceased.

After interruption:

- the runtime thread remains valid unless a separate runtime failure occurred;
- completed prior turn state remains available according to the thread persistence capability; and
- pending approvals/input requests are resolved or invalidated deterministically.

A runtime advertising `preemptive` interruption must be able to stop active tool/model execution at the runtime boundary. A runtime advertising `cooperative` interruption may stop at a defined safe point.

### 12.2 Steering

Active-turn steering is optional in Contract v1.

If not advertised, ChampCity MUST interrupt and/or start a subsequent turn instead of emulating hidden steering semantics.

---

## 13. Approval, Permission, and Human-Input Semantics

Runtime approval is an execution-safety concept.

It MUST NOT be confused with:

- Operator validation;
- work-item disposition;
- approval of an implementation result;
- phase/project closure; or
- any ChampCity Operator disposition or workflow-eligibility decision.

### 13.1 Approval request

A normalized approval request SHALL include where available:

- `approvalRequestId`;
- owning thread and turn;
- related `toolCallId` or runtime item;
- operation kind;
- human-readable action summary;
- requested permission/resource scope;
- impact summary;
- proposed command/change details safe to expose; and
- supported approval scope.

### 13.2 Approval resolution

The minimum portable decision set is:

```text
APPROVE
DENY
```

A runtime MAY support bounded grants such as request-only, turn, thread, or session scope if advertised.

ChampCity approval policy decides whether a request is auto-resolved, surfaced to the Operator, or denied. A runtime adapter MUST NOT invent product approval policy.

Defense-in-depth denials remain permitted. An adapter/runtime may refuse an operation that violates an absolute host safety rule even when ChampCity policy would otherwise permit it. Such refusal MUST be surfaced as a normalized permission/sandbox denial.

### 13.3 User input and elicitation

Human input and provider/MCP elicitation use the same suspension principle:

```text
request emitted
→ turn suspended as necessary
→ ChampCity presents/routes request
→ response correlated by request ID
→ runtime resumes or terminates
```

Unsupported elicitation modes MUST fail explicitly rather than hang the turn.

---

## 14. Tool Execution Contract

The runtime consumes an execution-specific **Capability Pack**, not the global ChampCity tool universe.

The Capability Pack SHALL identify the exact semantic tools available to the worker, including tool identity/version, schema, access/scope/policy metadata, and any execution constraints needed by the tool broker/runtime adapter.

### 14.1 Tool-delivery modes

A runtime may support either or both:

#### Host-dispatched

```text
Model/runtime requests semantic tool
        ↓
ChampCity Tool Broker validates access/scope/policy and executes
        ↓
Normalized tool result returned to runtime
```

This is the preferred long-term mode where practical because tool semantics, access checks, task scope, and policy enforcement remain centralized.

#### Runtime-native

```text
Model requests runtime-native shell/file/MCP operation
        ↓
Runtime performs operation under negotiated policy
        ↓
Adapter emits equivalent normalized tool/approval/sandbox events
```

Codex may continue to use runtime-native execution where that is advantageous.

### 14.2 Tool invariants

A conforming runtime MUST:

- expose only tools in the negotiated Capability Pack unless a provider-native capability was explicitly allowed;
- never silently add a global tool inventory;
- correlate every portable tool invocation with `toolCallId`;
- validate or faithfully preserve declared input schemas;
- return normalized success/failure results;
- surface approval/sandbox suspension when execution requires additional permission; and
- preserve causal ordering between tool events and the owning turn.

Provider-native tool names MUST NOT become Product Core tool identities.

---

## 15. Sandboxing and Execution Policy

Sandboxing is a runtime-enforced execution restriction applied to an already selected execution target. Provisioning the host/container/VM belongs to Development Environments, not the Agent Runtime Interface.

A portable Sandbox Policy SHOULD describe constraints such as:

```text
filesystem = none | read | bounded-write | unrestricted
writableResourceRoots[]
network = none | allowlist | unrestricted
networkAllowlist[]
processExecution = none | bounded | unrestricted
credentialExposure = none | named-handles | runtime-managed
```

The runtime MAY translate these constraints into provider-native policies such as Codex sandbox modes.

### 15.1 Effective-policy receipt

Before execution, the runtime MUST report the effective sandbox policy.

The runtime MUST NOT silently broaden access beyond the negotiated policy.

If it cannot enforce the requested upper bound, negotiation MUST fail with `SANDBOX_UNSUPPORTED` or `NEGOTIATION_FAILED`.

A runtime may be more restrictive only if that restriction is declared during negotiation and accepted by ChampCity.

Filesystem roots SHOULD use durable ChampCity resource identities at Product Core boundaries. Path resolution belongs to the runtime/environment adapter.

---

## 16. Context Handling Contract

ChampCity owns the portable context request. The runtime owns the mechanics of delivering accepted context to the selected model.

### 16.1 Context Envelope

A `ContextEnvelope` SHALL be composed of explicit segments rather than one opaque prompt blob where the runtime permits it.

A segment SHOULD carry:

- stable segment identity;
- semantic kind;
- content or content reference;
- required/optional priority;
- provenance/source identity;
- content digest where practical;
- cache-stability hint; and
- estimated token/size contribution where available.

Representative kinds include:

```text
instruction
task
project-state
bounded-solution
memory
evidence
conversation
user-content
other
```

### 16.2 Overflow policy

ChampCity SHALL declare the allowed overflow behavior:

```text
REJECT
COMPACT_ALLOWED
DROP_OPTIONAL_ALLOWED
```

Required context MUST NOT be silently truncated.

If the envelope cannot fit and the negotiated policy does not authorize compaction/truncation, the runtime MUST fail with `CONTEXT_LIMIT_EXCEEDED`.

### 16.3 Context ownership

A runtime advertises one or more modes:

- `champcity` — ChampCity provides the effective context and the runtime does not perform semantic compaction without authorization;
- `runtime` — runtime manages conversational history/compaction under negotiated policy;
- `hybrid` — ChampCity supplies governed segments while the runtime manages runtime-local history.

The default architectural preference is ChampCity-owned or hybrid context because Project State and AI Memory are ChampCity capabilities.

### 16.4 Context Receipt

The runtime MUST emit a Context Receipt containing, to the extent observable:

- accepted segment identities/digests;
- rejected optional segments and reason;
- whether compaction occurred;
- effective model context limit if known;
- estimated/actual prompt token usage as available;
- runtime-added context contribution;
- provider-added context contribution where observable; and
- visibility/quality for each metric (`exact`, `estimated`, `opaque`, or `unavailable`).

Runtime/provider-added hidden context does not need to expose proprietary text, but its measurable overhead SHOULD be reported when possible.

Runtime-generated compaction is thread-local execution state. It does not automatically become durable Project Memory.

---

## 17. Usage and Cost Telemetry

Every runtime implements the telemetry schema even when some fields are unavailable.

Missing telemetry MUST be represented as unavailable/null with quality metadata. Zero MUST NOT be used to mean unknown.

A turn-level usage record SHOULD include:

```text
runtimeImplementationId
runtimeInstanceId
providerId
runtimeModelId
reasoningProfileId
inputTokens
outputTokens
reasoningTokens
cachedInputTokens
cacheWriteTokens
totalTokens
contextSegmentTokens / harnessAddedTokens where observable
modelLatencyMs
toolExecutionMs
wallClockMs
toolCallCount
compactionCount
costAmount
costCurrency
costSource = provider-reported | champcity-estimated | unavailable
measurementQuality per metric
```

Streaming `usage.updated` events MAY be cumulative or delta-based, but the mode MUST be declared.

A terminal turn MUST expose a `usage.final` snapshot or explicitly state that final usage is unavailable.

Execution profiles may require specific telemetry quality. For example, a cost-comparison benchmark may require exact provider token and cache counts and therefore reject a runtime that can only estimate them.

---

## 18. Normalized Error Contract

Product Core MUST make workflow decisions from normalized errors, not provider message strings.

A runtime error SHALL include:

```ts
interface RuntimeError {
  code: RuntimeErrorCode;
  message: string;
  origin: "runtime" | "provider" | "transport" | "tool" | "sandbox" | "configuration";
  retryable: boolean;
  runtimeImplementationId: string;
  runtimeThreadId?: string;
  turnId?: string;
  providerCode?: string;
  safeDetails?: Record<string, unknown>;
}
```

Contract v1 SHALL define at least these normalized codes:

```text
RUNTIME_UNAVAILABLE
RUNTIME_CRASHED
RUNTIME_VERSION_UNSUPPORTED
AUTHENTICATION_REQUIRED
CONFIGURATION_INVALID
MODEL_UNAVAILABLE
MODEL_SELECTION_REJECTED
MODEL_CAPABILITY_MISMATCH
CAPABILITY_UNSUPPORTED
NEGOTIATION_FAILED
THREAD_NOT_FOUND
THREAD_NOT_RESUMABLE
TURN_ALREADY_ACTIVE
TURN_NOT_ACTIVE
CONTEXT_LIMIT_EXCEEDED
TOOL_UNAVAILABLE
TOOL_PROTOCOL_ERROR
TOOL_EXECUTION_FAILED
APPROVAL_DENIED
PERMISSION_DENIED
SANDBOX_UNSUPPORTED
SANDBOX_VIOLATION
NETWORK_DENIED
PROVIDER_RATE_LIMITED
PROVIDER_OVERLOADED
TIMEOUT
INTERRUPTED
STATE_RECOVERY_FAILED
PROTOCOL_ERROR
INTERNAL_ERROR
```

Raw provider/runtime data MAY be retained as safe diagnostic metadata but MUST NOT become the portable semantic code.

Secrets, tokens, credentials, raw environment values, and unsafe command output MUST NOT be copied blindly into user-facing errors.

---

## 19. Skills Contract

ChampCity passes one or more `SkillBinding` records into negotiation/execution.

Conceptually:

```ts
interface SkillBinding {
  skillId: string;
  version: string;
  contentDigest: string;
  mode?: string;
  requiredCapabilities: string[];
}
```

The runtime chooses a negotiated delivery mode:

- `native` — map the ChampCity skill to a native runtime skill mechanism; or
- `context` — inject canonical skill content into the governed Context Envelope.

The runtime MUST return a Skill Delivery Receipt containing:

- skill identity;
- version;
- digest;
- delivery mode; and
- success/failure.

The adapter MUST NOT substitute a provider-owned skill with different semantics merely because the name is similar.

---

## 20. MCP and External Runtime Facilities

MCP-native support is optional and negotiated.

A workflow SHOULD request semantic ChampCity tools/capabilities rather than require `mcp.native` unless use of a specific MCP facility is itself the task requirement.

Where a runtime uses MCP internally:

- MCP tool calls map to the Tool Execution Contract where possible;
- MCP elicitation maps to normalized elicitation events;
- server availability may be exposed as runtime diagnostics/capabilities; and
- MCP server names/transport details remain adapter-specific unless deliberately surfaced as a configured external resource.

The same rule applies to provider-native apps, plugins, connectors, or similar facilities.

---

## 21. Provider-Specific Extensions

The runtime contract SHALL permit namespaced extensions so strong provider features can be used without contaminating portable semantics.

Example:

```text
extensions.codex.*
extensions.futureRuntime.*
```

Portable Product Core workflows MUST NOT depend on an extension key unless the execution profile explicitly declares itself runtime-specific.

An extension cannot weaken a Core invariant such as event identity, capability truthfulness, sandbox restrictions, or terminal turn semantics.

---

## 22. Conformance Profiles

### 22.1 `AGENT_RUNTIME_BASE_V1`

Every conforming runtime MUST pass:

- runtime descriptor/version discovery;
- truthful capability advertisement;
- model discovery;
- capability negotiation;
- thread creation;
- turn creation/lifecycle;
- ordered streaming events;
- exactly-one terminal outcome;
- Context Envelope acceptance/rejection and Context Receipt;
- telemetry schema with explicit availability/quality;
- normalized errors; and
- provider-extension isolation.

### 22.2 `ENGINEERING_RUNTIME_V1`

A runtime eligible for general ChampCity software-engineering workers MUST additionally support:

- interruption;
- bounded tool execution from a Capability Pack;
- approval/permission suspension and resolution;
- user-input suspension and resolution;
- enforceable sandbox policy with effective-policy receipt;
- Skill Binding delivery/receipt;
- model-selection verification; and
- sufficient filesystem/process/tool semantics for the selected engineering execution profile.

Codex Runtime Adapter SHALL target this profile first.

### 22.3 Optional capability profiles

The conformance suite SHOULD expose independent profiles for:

```text
DURABLE_THREADS_V1
THREAD_FORK_V1
TURN_STEERING_V1
STREAM_REPLAY_V1
USAGE_METERING_V1
CONTEXT_COMPACTION_V1
MCP_NATIVE_V1
```

This avoids forcing every runtime to clone every feature of Codex while still allowing workflows to require strong capabilities when needed.

---

## 23. Codex Runtime Adapter — First Conformance Implementation

The existing ChampCity source already contains much of the first adapter implementation, but its semantics are currently Codex-shaped and distributed across multiple files.

### 23.1 Current source mapping

| Contract semantic | Current Codex source | Current condition | Conformance work |
| --- | --- | --- | --- |
| Runtime/process initialization | `codexRuntimeOperations.ts`, `codexAppServerTransport.ts` | Present | Keep package/process management inside adapter/host; expose only portable descriptor/status. |
| Model discovery | `model/list`, `codexRuntimeContracts.ts`, transport `listModels()` | Present | Map to portable `ModelDescriptor`; keep model ID opaque; expose reasoning profiles without universalizing names. |
| Model-selection verification | `startAppThread()` selected-model check | Present | Preserve as contract invariant. |
| Thread creation | `thread/start` | Present | Map native thread ID to `runtimeThreadId`; stop leaking Codex types. |
| Durable thread persistence/resume/fork | Not exposed by current ChampCity adapter; thread currently starts `ephemeral: true` | Gap / optional | Advertise session persistence until explicitly implemented and tested. |
| Turn start | `turn/start` | Present | Map to normalized turn descriptor. |
| Streaming | thread/turn/item notifications and async queue | Present | Add normalized event IDs, sequence, timestamps, and portable event taxonomy. |
| Interruption | `turn/interrupt`, AbortSignal bridge | Present | Map to idempotent interruption receipt plus terminal `turn.interrupted`. |
| Approvals | command/file/permission approval requests | Protocol present | Move product approval policy out of adapter; current auto-resolution is not the portable policy model. Preserve absolute safety denials as defense in depth. |
| Human input | `item/tool/requestUserInput` | Present | Map to normalized user-input suspension/resolution. |
| MCP elicitation | `mcpServer/elicitation/request` | Present | Map to normalized elicitation request/response. |
| Runtime-native tools | Codex shell/file/MCP behavior | Present | Bind exposure to negotiated Capability Pack and emit normalized tool lifecycle. |
| Sandbox | thread/turn sandbox fields | Present | Map portable policy to Codex policy and return effective-policy receipt; fail on unrepresentable restrictions. |
| Capability inspection | config/MCP/skills/apps/plugins reads | Partial | Replace ad hoc summary as the contract surface with a normalized `RuntimeCapabilities` descriptor; retain raw details as diagnostics/extensions. |
| Context handling | string turn input plus Codex-native input forms | Partial | Introduce Context Envelope/Receipt and explicit overflow behavior. Record runtime-added overhead where observable. |
| Usage telemetry | Not represented in current ChampCity Codex execution path | Gap | Inventory App Server usage events/data, normalize them, and mark unsupported metrics honestly. |
| Error handling | Mostly string `Error` propagation plus runtime-denial events | Partial | Normalize to `RuntimeErrorCode`; preserve raw safe provider details diagnostically. |
| Skills | `skills/list` discovery and Codex skill input support | Partial | Add ChampCity Skill Binding mapping and Skill Delivery Receipt. |
| Event replay/reconnect | In-memory live async queue | Optional gap | Advertise unsupported until implemented; Server runtime may later add replay at the host boundary. |
| Runtime restart recovery | Managed process can restart; turn/thread recovery not portable today | Optional gap | Advertise exact recovery semantics only after conformance tests exist. |

### 23.2 Codex adapter rule

The Codex adapter SHOULD be thin in policy and thick in translation.

It may own:

- Codex package/runtime process management;
- App Server JSON-RPC;
- schema/version probing;
- Codex model and event normalization;
- Codex sandbox translation;
- Codex native tool/approval/input translation;
- provider-specific diagnostics; and
- safe fail-closed compatibility checks.

It MUST NOT own:

- workflow eligibility and Operator Decision semantics;
- Operator disposition;
- which Work Item is eligible;
- global ChampCity tool authorization;
- canonical Skill governance;
- durable project memory;
- provider-independent cost policy; or
- product approval policy.

---

## 24. Runtime Conformance Suite

A runtime is compatible because its behavior passes the semantic suite, not because it exposes similarly named methods.

The first suite SHALL test at least:

1. runtime descriptor is stable and truthful;
2. model catalog normalizes valid advertised models;
3. unavailable requested model fails before execution;
4. required unsupported capability fails negotiation;
5. optional unsupported capability is declared without blocking;
6. thread creation returns opaque stable runtime identity;
7. a turn emits ordered events and exactly one terminal outcome;
8. a second simultaneous turn on the same v1 thread is rejected;
9. interruption terminates active work and leaves the thread valid;
10. approval request suspends appropriately and approve/deny resolutions correlate to the correct request;
11. undeclared tool invocation cannot execute;
12. declared tool invocation emits normalized lifecycle events;
13. sandbox denial cannot be bypassed by provider-native execution;
14. requested sandbox restrictions are not silently broadened;
15. required context is never silently dropped;
16. unauthorized overflow fails with `CONTEXT_LIMIT_EXCEEDED`;
17. authorized compaction emits a Context Receipt/event when supported;
18. Skill Binding delivers the exact requested version/digest;
19. usage metrics are either correctly populated or explicitly unavailable;
20. provider errors normalize to stable `RuntimeErrorCode` values;
21. adapter/process crash produces deterministic terminal/runtime failure behavior;
22. advertised durable thread resume survives runtime restart;
23. advertised replay resumes from a cursor without event identity corruption; and
24. provider-specific extensions do not alter portable Core behavior.

The Codex Runtime Adapter is the reference test target, not a privileged implementation. The same suite must be executable against the ChampCity Native Runtime and future adapters.

---

## 25. Migration Path from Current Codex Coupling

The migration SHOULD proceed without rewriting Codex integration all at once.

### Phase 1 — Freeze current observable behavior

Characterize current Codex model selection, thread/turn execution, streaming, interruption, approvals, sandbox behavior, user input, elicitation, and failure handling with tests.

### Phase 2 — Introduce portable contracts

Add runtime-neutral identities, descriptors, capability schema, events, errors, context, usage, tools, skills, and sandbox types in Shared Product Core.

Do not expose `workspaceId` through these new contracts.

### Phase 3 — Wrap Codex behind `CodexRuntimeAdapter`

The new adapter calls the existing Codex transport/runtime manager internally while returning only portable contract types to Product Core.

### Phase 4 — Move policy upward

Move runtime-approval policy, execution eligibility, Work Item scope/constraints, and capability-pack resolution out of the Codex service path and into Product Core orchestration.

### Phase 5 — Normalize context and telemetry

Introduce Context Envelope/Receipt, runtime-added-context measurement, token/cache/cost telemetry, and normalized error handling.

### Phase 6 — Run conformance suite

Codex must pass `AGENT_RUNTIME_BASE_V1` and `ENGINEERING_RUNTIME_V1` before Product Core Codex-specific dependencies are considered removable.

### Phase 7 — Remove direct Codex knowledge from Product Core/UI

Product Core and general renderer surfaces consume runtime-neutral execution models. Codex-specific diagnostics or settings remain only in adapter-specific administration surfaces.

---

## 26. Explicit Non-Goals

This contract does not:

- reimplement Codex;
- define a model-provider HTTP protocol;
- define Project State persistence;
- define the Capability Registry itself;
- define the Skill Registry itself;
- define Git/source-control mechanics;
- provision containers, VMs, or operating systems;
- require every runtime to support every optional feature;
- make persistent provider threads the project-memory system; or
- standardize hidden model reasoning.

---

## 27. Design Decisions Resolved by This Contract

The following design questions from the original Runtime Abstraction discussion are resolved here:

1. **Minimum interface:** runtime/model discovery, negotiation, thread/turn lifecycle, streaming, context receipt, telemetry schema, and normalized errors are Core.
2. **Engineering minimum:** interruption, approvals, bounded tools, sandboxing, user input, and skill delivery are required by `ENGINEERING_RUNTIME_V1`.
3. **Persistent threads:** negotiated, not universal; Project State remains canonical and AI Memory remains derived/contextual rather than a replacement for Project State.
4. **Capability negotiation:** required capabilities fail closed before worker execution.
5. **Streaming normalization:** portable event envelope with per-turn sequence and exactly-one terminal outcome.
6. **Identity:** provider IDs are opaque and distinct from Product Core IDs; legacy `workspaceId` is excluded.
7. **Context:** ChampCity supplies a governed Context Envelope and receives a Context Receipt; silent required-context loss is prohibited.
8. **Compaction:** negotiated and observable; runtime-generated compaction is not automatically Project Memory.
9. **Sandboxing:** requested restrictions may not be silently broadened; effective policy must be reported.
10. **MCP:** optional runtime/tool-delivery mechanism, not a universal workflow dependency.
11. **Skills:** ChampCity owns semantics/version; runtime owns delivery mechanics and receipt.
12. **Provider extensions:** allowed only as namespaced extensions and may not redefine Core semantics.
13. **Conformance:** semantic test suite determines compatibility.
14. **Codex:** first adapter/reference conformance target, not the architecture-defining source.

---

## 28. Immediate Follow-Up Artifacts

This contract makes the following artifacts directly actionable:

```text
CHAMPCITY_RUNTIME_CAPABILITY_SCHEMA.md
CHAMPCITY_RUNTIME_EVENT_SCHEMA.md
CHAMPCITY_RUNTIME_ERROR_TAXONOMY.md
CHAMPCITY_CONTEXT_BUDGET_AND_TELEMETRY_STANDARD.md
CODEX_RUNTIME_CONFORMANCE_PROFILE.md
CHAMPCITY_RUNTIME_CONFORMANCE_SUITE.md
```

The existing `SOURCE_EXTRACTION_MAP.md`, `CHAMPCITY_PRODUCT_CAPABILITY_MODEL.md`, `CHAMPCITY_MODEL_AGNOSTIC_CAPABILITY_PACK_ARCHITECTURE.md`, `CHAMPCITY_SKILLS_ENGINE_DESIGN_DISCUSSION.md`, and structured Project State architecture remain upstream architectural context.

---

## 29. Final Architecture Rule

The stable dependency direction is:

> Workflows decide **why** the worker may act. Capability Packs decide **what** operations the worker may see. Skills define **how** specialized work should be performed. The Agent Runtime Interface defines **how execution proceeds**. Runtime adapters translate those semantics. Model providers perform inference.

Codex therefore becomes one conforming implementation behind ChampCity-owned semantics rather than the architecture that ChampCity must conform to.
