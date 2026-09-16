# ChampCity AI Runtime Abstraction Initiative — Design Discussion

**Status:** Brain Dump / Architecture Discussion — superseded for interface semantics by `CHAMPCITY_AGENT_RUNTIME_INTERFACE_CONTRACT.md`  
**Purpose:** Capture the emerging architecture for separating ChampCity from a mandatory Codex/App Server runtime dependency as the platform moves toward model and runtime agnosticism.

---

## 1. Context

ChampCity AI currently relies heavily on OpenAI Codex and Codex App Server for the low-level coding-agent runtime.

This is useful and should not be discarded casually. Codex already provides mature behavior around the agent loop, persistent threads, tool execution, shell/file access, sandboxing, approvals, MCP, skills, context management, and turn lifecycle.

However, ChampCity's long-term direction is an **agnostic AI platform / agentic engineering harness** capable of using local LLMs and other future providers.

That creates an architectural risk:

> ChampCity may appear model-agnostic while still depending implicitly on Codex/App Server for the agent-runtime behavior that surrounds the model.

The important question is therefore not merely whether a local model can generate code. The question is:

> Which capabilities does ChampCity currently receive implicitly through the Codex/App Server boundary, and what must exist when Codex is no longer the selected runtime?

---

## 2. Terminology

The current conceptual vocabulary should distinguish three separate layers.

### 2.1 Model / Inference Provider

Responsible for model inference.

Conceptually:

> Given context, instructions, tools, and prior messages, what should the model produce next?

Examples may include:

- OpenAI;
- Ollama;
- LM Studio;
- vLLM; and
- future providers.

A local inference server does not by itself provide a complete engineering-agent runtime.

### 2.2 Agent Runtime

Responsible for executing and maintaining the agent process around the model.

Conceptually:

> How are turns executed, tools called, permissions handled, state persisted, context compacted, events streamed, and the agent loop continued?

Today much of this behavior is supplied by the Codex harness and surfaced through Codex App Server.

### 2.3 ChampCity Orchestration / Governance

Responsible for why work is happening and how engineering authority is controlled.

Conceptually:

> Which worker acts, under what contract, against which artifact, with what authority, and what happens after the work completes?

This includes ChampCity-specific behavior such as:

- Operator authority;
- Architect / Implementer semantics;
- workflow transitions;
- Work Cards;
- Fix Cards;
- Repair Cards;
- validation and disposition;
- repository/workspace binding;
- canonical artifact state; and
- engineering lifecycle governance.

These responsibilities should remain above the runtime boundary.

---

## 3. Current Architecture

The current stack can be viewed approximately as:

```text
ChampCity Orchestration / Governance
              │
              ▼
       Codex App Server
              │
              ▼
         Codex Harness
              │
              ▼
        Model Provider
```

Codex can itself use different model providers, including local inference in some configurations. Therefore a topology such as the following may be possible:

```text
ChampCity
    ↓
Codex App Server
    ↓
Codex Harness
    ↓
Local Model Provider
    ↓
Local Model
```

This provides **local inference**, but it does not make ChampCity runtime-agnostic. ChampCity would still depend on the Codex harness to operate the agent.

That distinction is central to this initiative.

---

## 4. Target Architecture

The desired architecture separates runtime selection from model-provider selection.

```text
ChampCity AI Harness
│
├── Orchestration / Governance
│
├── Agent Runtime Interface
│   │
│   ├── Codex Runtime Adapter
│   │      └── Codex App Server / Codex Harness
│   │
│   ├── ChampCity Native Runtime
│   │
│   └── Future Runtime Adapter(s)
│
└── Model Inference Interface
    │
    ├── OpenAI
    ├── Ollama
    ├── LM Studio
    ├── vLLM
    └── future providers
```

This means ChampCity can continue to use Codex where it is advantageous without requiring Codex as the only possible runtime.

---

## 5. Core Principle

The central architecture principle is:

> ChampCity Core must consume portable runtime capabilities rather than directly assuming Codex/App Server semantics.

Application and orchestration code should eventually depend on a ChampCity runtime contract rather than making provider-specific calls throughout the system.

Conceptually, instead of:

```text
appServer.thread.start(...)
```

ChampCity should move toward:

```text
runtime.startThread(...)
```

The selected runtime adapter would then translate that semantic operation into the provider-specific implementation.

---

## 6. Why a Capability Catalog Comes First

The runtime abstraction should not be designed from memory or from a simplified idea of what an agent runtime does.

Before defining the portable interface, ChampCity should catalog the capabilities currently supplied by Codex/App Server and identify which ones ChampCity actually depends on.

A proposed first artifact is:

```text
CODEX_RUNTIME_CAPABILITY_CATALOG.md
```

The title is intentionally broader than `APP_SERVER_CAPABILITIES.md` because some functionality is implemented in Codex Core and merely exposed through App Server. From ChampCity's point of view, it is still behavior currently received through the Codex runtime boundary.

A second required artifact should map current ChampCity dependencies onto that catalog:

```text
CHAMPCITY_CODEX_RUNTIME_DEPENDENCY_MAP.md
```

This prevents the abstraction from omitting behavior that Codex has been quietly supplying.

---

## 7. Initial Capability Families to Inventory

The catalog should investigate at least the following runtime capability families.

| Runtime capability | Codex currently supplies | Likely portable ChampCity contract |
|---|---:|---:|
| Agent/tool execution loop | Yes | Required |
| Thread creation | Yes | Required |
| Thread persistence | Yes | Required |
| Resume thread | Yes | Required |
| Fork thread | Yes | Probably |
| Archive/thread management | Yes | Optional |
| Turn lifecycle | Yes | Required |
| Streaming events | Yes | Required |
| Interrupt active turn | Yes | Required |
| Steer active turn | Yes | Evaluate / Probably |
| Tool-call representation | Yes | Required |
| Shell execution | Yes | Required for engineering runtimes |
| File operations / patching | Yes | Required for engineering runtimes |
| Sandboxing | Yes | Required |
| Permission / approval flow | Yes | Required |
| MCP connectivity | Yes | Required |
| Skills integration | Yes | Required |
| Context construction | Yes | Required |
| Context compaction | Yes | Required eventually |
| Token/context accounting | Yes | Required |
| Model selection | Yes | Required |
| Model discovery | Yes | Useful |
| Provider configuration | Yes | Required |
| Authentication | Yes | Adapter-specific |
| Diff/event generation | Yes | Required where ChampCity UI depends on it |
| User-input requests | Yes | Required |
| Error normalization | Yes | Required |
| Configuration loading | Yes | Required |
| Usage accounting | Yes | Required |
| Multi-agent runtime primitives | Present/emerging | Evaluate |
| Goal-oriented runtime primitives | Present/emerging | Evaluate |

This is an initial catalog, not a declaration that ChampCity must reproduce every Codex feature.

---

## 8. Do Not Clone Codex Feature-for-Feature

The objective is not to reimplement Codex.

Each capability should be classified according to whether ChampCity depends on the semantic behavior.

```text
Codex Capability
       ↓
Does ChampCity depend on it?
       ↓
YES                         NO
 ↓                           ↓
Portable runtime         Provider-specific or
contract candidate       unnecessary capability
```

For example:

- provider-specific authentication mechanisms do not need to become universal ChampCity runtime features;
- a turn that can request approval for a sensitive operation and wait for resolution probably does need a portable semantic contract;
- a provider-specific UI convenience should not automatically become part of ChampCity Core;
- context persistence and resumability are likely foundational portable runtime behaviors.

The abstraction should preserve required semantics without unnecessarily reproducing implementation details.

---

## 9. Capability-Based Runtime Contract

A future runtime should advertise what it supports.

Conceptually:

```text
RuntimeCapabilities

persistentThreads       true
streamingTurns          true
turnInterruption        true
turnSteering            true
shellExecution          true
filesystemMutation      true
sandboxing              true
approvals               true
mcp                     true
skills                  true
contextCompaction       true
parallelAgents          false
```

ChampCity workflows can then declare their runtime requirements.

For example:

```text
This workflow requires:
- persistentThreads
- filesystemMutation
- shellExecution
- approvals
- skills
- mcp
```

If the selected runtime cannot provide those capabilities, ChampCity should fail explicitly rather than silently running a degraded workflow.

This is particularly important for local models, where provider implementations may vary substantially in tool-use quality and surrounding runtime support.

---

## 10. Capability Catalog Entry Structure

Each catalog entry should document semantics rather than only naming an App Server endpoint.

Example:

```text
Capability: Turn interruption

Current Codex source:
    turn/interrupt or equivalent runtime behavior

Semantic behavior:
    Stop active agent execution without destroying
    the persistent thread or completed state.

ChampCity currently depends on it:
    Yes

Portability classification:
    CORE_RUNTIME

Required behavior:
    - interrupt active execution
    - preserve completed turn items
    - leave thread resumable
    - emit terminal execution state

Codex implementation:
    Codex Runtime Adapter

Native implementation:
    Required

Conformance test:
    Start long-running operation
    → interrupt
    → verify persisted state
    → resume thread
```

This structure makes the catalog useful for both architecture and future implementation.

---

## 11. Runtime Conformance Suite

A runtime abstraction is only credible if different implementations can be tested against the same semantic contract.

ChampCity should eventually maintain a shared **Runtime Conformance Suite**.

Conceptually:

```text
Runtime Conformance Suite
          │
          ├── CodexRuntimeAdapter        PASS
          ├── ChampCityNativeRuntime     PASS
          └── FutureRuntimeAdapter       PASS
```

The suite should test semantics such as:

- thread creation and persistence;
- resume behavior;
- tool-call lifecycle;
- approval suspension and continuation;
- interruption;
- event ordering;
- filesystem mutation reporting;
- error normalization;
- context accounting;
- skill delivery;
- MCP availability; and
- state recovery after runtime restart where supported.

A runtime should not be considered compatible merely because it exposes similarly named methods.

---

## 12. Codex Runtime Adapter

The first runtime implementation under the abstraction should be an adapter around the existing Codex/App Server integration.

This serves two purposes:

1. preserves the mature runtime currently used by ChampCity; and
2. proves that ChampCity Core can operate through the new runtime contract without directly depending on App Server semantics.

The adapter should translate between:

```text
ChampCity Runtime Contract
            ↕
Codex Runtime Adapter
            ↕
Codex App Server / Harness
```

Provider-specific behavior should remain inside the adapter whenever possible.

---

## 13. ChampCity Native Runtime

A future ChampCity Native Runtime would supply the portable agent-runtime behavior required when Codex is not selected.

This is distinct from a local model provider.

For example:

```text
ChampCity Native Runtime
        │
        ├── agent/tool loop
        ├── thread state
        ├── context management
        ├── tool dispatch
        ├── permissions
        ├── sandbox integration
        ├── MCP integration
        ├── skill delivery
        ├── event stream
        └── runtime persistence
                │
                ▼
        Local Model Provider
                │
                ▼
             Local LLM
```

The native runtime should implement only the semantics ChampCity actually requires, not an arbitrary clone of Codex.

---

## 14. Skills and Runtime Abstraction

The Skills Engine initiative should remain above the provider-specific runtime boundary.

A ChampCity skill is a ChampCity-owned portable engineering capability. The runtime adapter is responsible for delivering that skill into whichever runtime is selected.

Conceptually:

```text
ChampCity Skill
      │
      ▼
Runtime Skill Delivery Contract
      │
      ├── Codex adapter → native Codex skill mechanism
      ├── Native runtime → ChampCity skill loader
      └── Future adapter → provider-specific mechanism
```

This avoids making the Skills Engine dependent on Codex merely because Codex already has a native skills feature.

---

## 15. Model Agnosticism vs. Runtime Agnosticism

These goals must remain separate.

### Model Agnosticism

ChampCity can choose among different inference providers or models.

### Runtime Agnosticism

ChampCity can choose among different agent runtimes that satisfy the required portable capability contract.

A local model running behind Codex may satisfy model-locality goals while still leaving ChampCity runtime-dependent on Codex.

Therefore:

> Local inference is not equivalent to runtime independence.

Full platform agnosticism requires both boundaries to be explicit.

---

## 16. Proposed Initiative Sequence

The current proposed initiative sequence is:

```text
1. Codex Runtime Capability Catalog
2. Current ChampCity → Codex Dependency Map
3. Capability portability classification
4. ChampCity Agent Runtime Provider Contract
5. Codex Runtime Adapter
6. Runtime Conformance Suite
7. ChampCity Native Runtime
8. Local Inference Provider Adapters
9. Additional future runtime adapters as useful
```

The ordering is intentional.

The catalog and dependency map should precede the abstraction contract. Otherwise the runtime interface may be designed around an incomplete understanding of what Codex currently provides.

---

## 17. Architectural Ownership

A useful final ownership model is:

```text
OpenAI / runtime provider owns:
"How does this specific coding-agent runtime operate?"

ChampCity Runtime Contract owns:
"What semantic capabilities must a compatible runtime provide?"

ChampCity Orchestration owns:
"Why is this worker running, what authority does it have,
what artifact governs the work, and what happens next?"

ChampCity Skills Engine owns:
"How should specialized engineering work be performed?"

Model provider owns:
"What model performs inference for this execution?"
```

This allows ChampCity to continue benefiting from strong external runtimes without allowing one external runtime to define the architecture of the harness.

---

## 18. Open Design Questions

The following questions remain intentionally unresolved:

1. What is the minimum semantic runtime contract required for ChampCity's existing workflows?
2. Which current App Server behaviors are directly referenced by application code?
3. Which Codex behaviors are relied upon implicitly rather than explicitly?
4. Which runtime capabilities should be mandatory versus optional?
5. How should capability negotiation work at worker startup?
6. Which capabilities belong in the runtime contract versus the model-provider contract?
7. How should streaming event types be normalized across runtimes?
8. How should tool-call IDs, worker IDs, thread IDs, and turn IDs be represented portably?
9. How much context management should ChampCity own versus delegate to the runtime?
10. How should compaction behavior be normalized across runtimes with different context windows?
11. How should runtime persistence survive application restarts?
12. What security boundary should the ChampCity Native Runtime use for shell and filesystem operations?
13. Which MCP responsibilities belong to the runtime versus ChampCity orchestration?
14. How should runtime adapters expose provider-specific extensions without leaking them into core workflows?
15. What conformance threshold is required before a runtime can be selected for production engineering work?

---

## 19. Current Direction

The current direction is to treat Codex/App Server as the first implementation of a future **ChampCity Agent Runtime Interface**, not as the permanent definition of that interface.

ChampCity should first catalog everything it currently receives from the Codex runtime, map actual dependencies, classify portable semantics, and only then design the abstraction.

The goal is not to replace Codex unnecessarily. The goal is to ensure that Codex remains a selectable runtime rather than an unavoidable architectural dependency.

This document captures design discussion only. It is not an approved implementation contract.