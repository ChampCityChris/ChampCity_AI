# ChampCity Model-Agnostic Capability Pack Architecture

**Status:** Design discussion / architecture capture  
**Date:** 2026-09-09  
**Related initiative:** `CHAMPCITY_RUNTIME_ABSTRACTION_INITIATIVE_DESIGN_DISCUSSION.md`

**Evidence and precedence:** Experiment figures below are preserved as the original discussion's reported observations, not independently revalidated measurements from this documentation reconciliation. Sample capability profiles, context/cost breakdowns, and conformance PASS counts are illustrative unless linked to an actual retained execution report. They do not establish current provider specifications, prices, universal context floors, or production eligibility. The current [Agent Runtime Interface Contract](../architecture/CHAMPCITY_AGENT_RUNTIME_INTERFACE_CONTRACT.md) controls runtime semantics; this document remains a design discussion. The [corpus index](../architecture/CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md) tracks remaining evidence and enforcement dependencies.

## 1. Purpose

This document captures a refinement to ChampCity's runtime-abstraction direction based on live OpenRouter, Codex Desktop, Codex VS Code, GPT-5.6 Sol, and Kimi K2.7 Code experiments.

The central conclusion is:

> ChampCity should own workflow state/eligibility, context construction, capability selection, and model-facing tool semantics while preserving the Operator's exclusive product-decision role. Models, providers, MCP transports, and external agent runtimes should remain replaceable execution dependencies.

The existing broad toolbox implementation was created primarily as a reliability workaround when OpenAI connector/tool discovery was unstable. That implementation is not an architectural requirement. Now that connector reliability has improved, ChampCity can preserve the useful ideas underneath the toolbox model while replacing broad model-facing toolbox exposure with smaller execution-specific capability packages.

The proposed model is called **Capability Packs** in this discussion. The name is provisional. The important concept is that a worker receives only the tools required by its current role, workflow stage, bounded task scope/constraints, and execution policy.

---

## 2. Empirical Motivation

Recent experiments exposed three independent concerns that a model-agnostic ChampCity runtime must address.

### 2.1 Harness context overhead can dominate the user's prompt

Observed examples during testing:

| Surface / workload | Model | Observed input/context behavior |
|---|---|---:|
| Codex Desktop trivial prompt | GPT-5.6 Sol | ~30K prompt tokens |
| Codex VS Code trivial prompt | Kimi K2.7 Code | ~161K prompt tokens |
| Representative Implementer Repair | GPT-5.6 Sol | ~97K peak visible input context; ~1.82M cumulative tokens |
| Representative Architect interaction | GPT-5.6 Sol | ~129K+ peak visible input context; ~3.25M cumulative tokens |

The Desktop-versus-VS-Code comparison is not fully controlled because different models were used, so the exact overhead ratio is not yet proven to be entirely harness-caused. The magnitude is nevertheless sufficient to establish the architectural problem: an agent runtime can add very large amounts of invisible context before the user's actual task becomes material.

A harness that spends roughly 161K input tokens to process a trivial sentence would consume more than 60% of a 262K-context model before useful repository work begins.

ChampCity should therefore treat **harness-added context as a measurable and governed resource**, not an opaque runtime side effect.

### 2.2 Model tool compatibility is not equivalent to "tool calling supported"

Kimi successfully began repository analysis through Codex but later failed with a server-tool request error. The model had reached relevant production source before the failure. This suggests a runtime/tool-protocol compatibility boundary rather than a demonstrated inability to reason about the Repair.

The important lesson is:

> A model advertising function/tool support does not prove compatibility with every agent runtime's tool representation, native patch mechanism, namespace representation, server-tool schema, or tool-call lifecycle.

Model agnosticism therefore requires explicit tool-protocol adaptation and conformance testing.

### 2.3 Prompt caching materially changes economics

The Sol implementation run accumulated approximately 1.82M tokens while costing roughly $0.70 because repeated context achieved very high cache reuse. The Architect interaction similarly accumulated millions of tokens while remaining comparatively inexpensive.

This establishes that ChampCity's prompt assembler should intentionally preserve stable cacheable prefixes rather than accidentally defeating provider caching through unnecessary prompt variation.

---

## 3. Architectural Problem Statement

The current broad-toolbox approach can become expensive and model-specific if every worker receives every available toolbox/action schema.

A conceptual anti-pattern is:

```text
Worker starts
    ↓
Expose artifact toolbox       many actions
Expose repository toolbox     many actions
Expose Git toolbox            many actions
Expose diagnostics toolbox    many actions
Expose browser/connectors     many actions
    ↓
Serialize all schemas into model context
    ↓
Ask model to obey prose restrictions for actions it should never perform
```

This creates four problems:

1. **Context waste** — irrelevant schemas consume tokens and context capacity.
2. **Model confusion** — the model must choose among many actions unrelated to its task.
3. **Compatibility risk** — more proprietary or unusual tool schemas increase the chance that a provider/model cannot consume the manifest.
4. **Weak scope/policy enforcement** — prohibited capabilities remain technically callable and are constrained mainly by prose instructions.

The fact that current internal tools are grouped into named toolboxes does not reduce these costs if all individual actions are still projected to the model.

---

## 4. Core Design Principle

The refined principle is:

> Keep tool implementations centralized and reusable, but project only the smallest legal capability set required for the current execution.

ChampCity should distinguish four layers:

```text
ChampCity Workflow / Governance
          ↓
Execution Profile Resolver
          ↓
Capability Pack
          ↓
Model / Runtime Compatibility Adapter
          ↓
Provider-specific tool representation
          ↓
Selected model
```

The workflow determines **why the worker exists, its role, bounded task scope/constraints, and current eligibility**.

The Capability Pack determines **which semantic operations exist for that execution**.

The adapter determines **how those operations are represented to the selected runtime/model/provider**.

The model performs inference within that bounded environment.

---

## 5. Core Tool Registry

ChampCity should retain one canonical implementation of each tool primitive rather than duplicating tool code across workflow-specific packages.

Conceptually:

```text
Core Tool Registry
│
├── repository.read
├── repository.search
├── repository.diff
├── source.edit
├── artifact.read
├── artifact.write
├── validation.run
├── git.status
├── git.diff
├── git.commit
├── browser.navigate
└── ...
```

Each primitive should carry machine-readable metadata describing its semantic capability, mutability, resource scope, access requirements, and policy characteristics.

Illustrative result format only; these pass counts are not conformance evidence unless backed by an actual stored report for the exact runtime/provider/model revision:

```yaml
action: artifact.replace_markdown_body
family: artifact
scope: files.write
mutability: bounded-write
requires_authoritative_target: true
supports_read_only_roles: false
side_effect_class: repository-mutation
model_tool_shape: standard-function
```

This registry is the source of truth. Capability Packs reference registry actions; they do not reimplement them.

---

## 6. Capability Packs

A Capability Pack is a task-facing manifest assembled from the Core Tool Registry.

It should be selected from more than the worker's broad role. The resolver should consider at minimum:

- role;
- workflow;
- current stage;
- governing artifact;
- effective Decisions/dispositions, scope, and constraints;
- allowed mutation class;
- required return path; and
- selected runtime/model capabilities.

This is intentionally more specific than `Architect` or `Implementer` alone.

Example profiles might include:

```text
architect.review
architect.investigation
architect.planning
implementer.work-card
implementer.fix-card
implementer.repair
operator.issue-planning
operator.validation
```

### 6.1 Example: Implementer Repair

A bounded Repair implementation might receive:

```text
repository.search
repository.read
repository.diff
source.edit
artifact.read
artifact.write_implementer_report
validation.run
```

It should ordinarily not receive:

```text
git.commit
git.reset
git.push
issue.create
fix_card.create
planning.promote
workflow.advance
unrelated browser/account tools
```

If a capability is prohibited by task scope, an explicit constraint, access policy, sandbox policy, or workflow policy, the strongest implementation is generally to **omit the capability**, not expose it and spend prompt tokens instructing the model not to use it.

### 6.2 Example: Architect Review

A review profile might expose:

```text
repository.search
repository.read
repository.diff
artifact.read
validation.read_results
architect_investigation.write
repair_draft.write
```

It should not expose implementation-source mutation unless that action is in the current task scope and permitted by applicable policy/constraints.

---

## 7. Capability Packs Are Not Duplicated MCP Servers

This architecture does not require one independent codebase or MCP server for every workflow.

The intended structure is:

```text
                 Core Tool Implementations
                          │
                 Capability Registry
                          │
                 Profile Resolver
               ┌──────────┼──────────┐
               ↓          ↓          ↓
        Architect Review  Implementer Repair  Operator Planning
               │          │          │
               └──── model-facing manifests ──┘
```

Whether those manifests are surfaced as:

- dynamically selected actions from one MCP service;
- separate generated MCP packages;
- runtime-native standard function tools; or
- another transport

is an implementation decision.

The architectural requirement is that **one semantic capability remains implemented once while model exposure remains execution-specific**.

MCP may remain the transport and integration layer without becoming the definition of the model-facing schema.

---

## 8. Model and Runtime Compatibility Adapters

ChampCity should not assume that one tool representation is portable merely because multiple providers advertise OpenAI compatibility.

A model/runtime adapter should translate portable ChampCity semantic capabilities into the representation actually supported by the selected execution path.

Conceptually:

```text
ChampCity semantic capability
          │
          ├── Codex adapter     → Codex-native representation
          ├── OpenAI adapter    → Responses/function representation
          ├── Kimi adapter      → supported standard-function representation
          ├── Ollama adapter    → supported local tool representation
          └── future adapter    → provider/runtime-specific representation
```

The workflow must never need to know whether `source.edit` is represented as a native patch operation, a standard JSON function, or another supported protocol.

Provider/runtime-specific behavior belongs below the portable capability boundary.

---

## 9. Capability Negotiation

Each selectable model/runtime/provider combination should advertise a capability profile.

Example:

```yaml
runtime: champcity-native
provider: openrouter
model: moonshotai/kimi-k2.7-code
context_window: 262144
max_output: 16384
reasoning_control: supported
tool_protocols:
  - standard-function
parallel_tool_calls: conditional
prompt_cache: supported
native_patch: false
vision: false
```

A workflow/Capability Pack should likewise declare requirements.

Example:

```yaml
profile: implementer.repair
minimum_context: 131072
preferred_context: 262144
required_capabilities:
  - repository-read
  - bounded-source-edit
  - shell-validation
  - artifact-report-write
```

Selection then becomes deterministic:

```text
Execution Profile requirements
            ↓
Selected runtime/model capability profile
            ↓
Compatible?
   YES → construct bounded manifest and execute
   NO  → MODEL_RUNTIME_INELIGIBLE
```

ChampCity should fail before inference rather than discover halfway through a work card that the selected model cannot consume a required tool protocol.

---

## 10. Context Budgeting

Every inference request should have an explicit context budget owned by ChampCity.

Conceptual accounting:

```text
Model context window               262K

Runtime contract                     6K
Role / governance                    4K
Capability Pack schemas              6K
Stable project context              12K
Repair Card                           5K
Retrieved repository evidence       38K
Current execution state              8K
Reserved reasoning/output           24K
----------------------------------------
Projected use                       103K
Remaining headroom                 159K
```

The runtime should be able to prevent execution when the projected request exceeds a safe threshold.

Potential policy:

```text
if projected_context + reserved_output > safe_model_budget:
    compact, retrieve more selectively, or reject model selection
```

The exact threshold should be determined empirically rather than fixed prematurely.

### 10.1 Current empirical context requirement

Initial ChampCity tests suggest:

- 32K is demonstrably unusable for normal development-agent work;
- 64K is likely insufficient for representative implementation work;
- 128K was exceeded by a normal Architect interaction;
- 256K was therefore a practical target for the observed serious ChampCity development workloads under the tested harnesses;
- larger windows remain useful headroom but are not yet proven mandatory.

These are historical observed workload/harness requirements, not universal model requirements or a fixed production eligibility floor. Model eligibility must be evaluated per execution profile against the current measured context budget and runtime overhead; future lower-overhead context construction may make smaller windows fully eligible.

---

## 11. Cache-Stable Prompt Construction

Because repeated context can be dramatically cheaper when provider caching applies, ChampCity should deliberately structure prompts around a stable prefix.

Preferred conceptual ordering:

```text
[stable runtime contract]
[stable role / governance]
[stable project context]
[stable Capability Pack schemas]
---------------- CACHEABLE PREFIX ----------------
[current Work/Fix/Repair Card]
[current evidence]
[current execution state]
[current tool result]
```

The runtime should avoid unnecessary reordering, rewording, or regeneration of stable prompt sections when doing so would invalidate provider cache reuse.

Cache behavior should be modeled as a first-class runtime capability because providers differ in:

- cache support;
- minimum cacheable prefix;
- cache write/read prices;
- expiration;
- routing behavior; and
- whether cache state survives provider changes.

---

## 12. Harness Context Telemetry

ChampCity should be able to explain its own context overhead.

Every inference request should emit structured accounting similar to:

```text
Request 018
Runtime: ChampCity Native
Provider: OpenRouter
Model: Kimi K2.7 Code
Profile: implementer.repair

Prompt tokens:               87,441
  Runtime contract:           6,220
  Role/governance:            4,812
  Capability schemas:         5,104
  Stable project context:     9,721
  Governing Repair Card:      4,032
  Repository evidence:       46,308
  Execution state:           11,244

Fresh input:                 11,741
Cache write:                 12,500
Cache read:                  63,200
Output/reasoning:             2,813
Context utilization:          33.4%
Estimated/request cost:      $0.031
```

Exact provider telemetry will vary, but ChampCity should at minimum know what **ChampCity itself added** even when the provider cannot return perfect token accounting.

This creates a measurable engineering target:

> Harness overhead must remain bounded, attributable, and regression-testable.

A future feature that increases fixed context from 20K to 60K should be detectable as a runtime regression rather than discovered through unexpectedly high bills or context exhaustion.

---

## 13. Scope and Policy Enforcement Through Capability Absence

Capability Packs can reduce both token cost and governance risk.

Current Work/Repair Cards often require lengthy Forbidden Changes sections because an external agent runtime may expose actions the worker must not use.

Some semantic prohibitions will always require prose. However, mechanical enforcement should move into deterministic capability resolution and owning services where possible.

Instead of:

```text
Tool exposed: git.reset
Prompt instruction: DO NOT RESET
```

prefer:

```text
Tool not exposed: git.reset
```

Instead of:

```text
Tool exposed: issue.create
Prompt instruction: this Repair must not create an Issue
```

prefer:

```text
Capability Pack does not include issue.create for this execution
```

This preserves the Operator/Architect/Implementer governance model while reducing dependence on model obedience for mechanically enforceable boundaries.

---

## 14. Conformance Testing

The existing Runtime Conformance Suite concept should be extended with **Model/Provider/Tool Conformance**.

A provider claiming tool support is insufficient evidence.

Each runtime/model/provider combination should be tested against a small shared battery such as:

```text
CONFORMANCE01  basic response
CONFORMANCE02  structured output
CONFORMANCE03  repository read
CONFORMANCE04  artifact read
CONFORMANCE05  bounded source edit
CONFORMANCE06  validation execution
CONFORMANCE07  multi-step tool sequence
CONFORMANCE08  tool error recovery
CONFORMANCE09  large-context operation
CONFORMANCE10  cache continuity/accounting
CONFORMANCE11  spawned-agent behavior where supported
CONFORMANCE12  bounded implementation + report
```

Results should be stored by exact runtime/provider/model revision where practical.

Example:

```text
Codex / OpenAI / GPT-5.6 Sol        PASS 12/12
Native / OpenRouter / Kimi K2.7    PASS 11/12
Native / Ollama / Qwen             PASS 9/12
```

A model should only be selectable for a production execution profile if it passes the conformance requirements that profile depends on.

---

## 15. Relationship to the Existing Toolbox Model

The current toolbox implementation should be treated as **replaceable infrastructure**, not a preserved V2 architectural constraint.

What should be retained:

- centralized semantic tool implementations;
- explicit file-read/file-write and mutation capability/access policy;
- workspace scoping;
- deterministic action contracts;
- fail-closed behavior; and
- application-owned governance.

What should be reconsidered:

- broad toolbox exposure to every worker;
- toolbox-level capability assumptions;
- exposing actions merely because they exist in the global registry;
- coupling model-facing tool shapes to one provider/runtime; and
- spending prompt tokens describing prohibited actions that can instead be omitted.

A migration can therefore evolve from:

```text
Broad toolboxes
     ↓
Toolbox actions + metadata
     ↓
Central capability registry
     ↓
Execution-specific Capability Packs
```

without requiring wholesale duplication of existing tool implementations.

---

## 16. Relationship to Runtime Abstraction

This architecture refines, rather than replaces, the existing Runtime Abstraction Initiative.

The earlier initiative established:

> ChampCity Core must consume portable runtime capabilities rather than directly assuming Codex/App Server semantics.

This document adds a more specific rule:

> The portable runtime must also consume a bounded, execution-specific capability projection rather than a global tool universe.

The combined target becomes:

```text
ChampCity Orchestration / Governance
             │
             ├── determines role, stage, scope/constraints, governing Work Item
             ↓
Execution Profile Resolver
             ↓
Capability Pack
             ↓
ChampCity Agent Runtime Interface
             │
             ├── Codex Runtime Adapter
             ├── ChampCity Native Runtime
             └── future runtime adapters
             ↓
Model / Provider Adapter
             │
             ├── OpenAI
             ├── OpenRouter
             ├── Ollama
             ├── vLLM
             └── future providers
             ↓
Selected Model
```

This permits Codex to remain a high-quality execution backend without allowing Codex's context construction or proprietary tool semantics to define ChampCity itself.

---

## 17. V2 Design Direction

The current proposed direction for ChampCity V2 is:

1. Treat the existing toolboxes as an implementation source to inventory, not a permanent model-facing contract.
2. Define a Core Capability Registry with machine-readable scope/access/policy metadata.
3. Define execution profiles from actual ChampCity workflow/role boundaries.
4. Resolve each execution profile into the minimum legal Capability Pack.
5. Add runtime/model capability negotiation before worker start.
6. Build model/provider adapters that translate portable semantic tools into supported wire representations.
7. Own context construction and context-budget enforcement in ChampCity where the selected runtime permits it.
8. Preserve stable cacheable prompt prefixes deliberately.
9. Record harness-added context, provider usage, cache behavior, and cost as first-class telemetry.
10. Extend runtime conformance into model/provider/tool conformance.
11. Keep Codex as a selectable runtime rather than the architectural definition of an agent worker.

---

## 18. Design Decisions Captured Here

The following are current design decisions/directions from this discussion:

- The broad toolbox implementation is not sacred and may be retired or substantially refactored.
- Tool implementations should remain centralized rather than copied into role-specific packages.
- Model-facing tool exposure should be execution-specific and minimal.
- Role alone is not sufficient; workflow, stage, bounded scope/constraints, task, access, and policy must participate in capability selection.
- Mechanically forbidden operations should generally be absent rather than merely prohibited in prose.
- Tool compatibility must be tested by actual semantic behavior, not provider marketing labels.
- 256K was a practical target for the historical observed workloads under the tested harnesses; production eligibility is execution-profile- and budget-specific, subject to current measurement and further benchmark evidence.
- Prompt caching is economically significant enough to influence prompt architecture.
- Harness-added context must become measurable and governable.
- Codex-specific tool and context semantics must not leak into the portable ChampCity workflow contract.

---

## 19. Open Questions

The following remain intentionally unresolved:

1. Should Capability Packs be dynamically projected from one MCP service or published as separate generated MCP packages?
2. What is the smallest useful primitive tool registry without creating excessively granular tool-call sequences?
3. How should effective scope/access/sandbox/workflow policy be partitioned mechanically between exposure in the Capability Pack resolver and defense-in-depth enforcement in owning services/tool broker/sandbox adapters, while guaranteeing that no alternate enabled route bypasses the effective restriction?
4. What context-utilization threshold should trigger compaction, selective retrieval, or model rejection?
5. How should provider cache semantics be normalized when routing can move between upstream providers?
6. Which project context belongs in a stable cacheable prefix versus retrieval-on-demand?
7. How should ChampCity measure token contribution by prompt section across tokenizers that differ by model?
8. Should model eligibility require a minimum effective context window above the workflow's observed maximum rather than merely matching it?
9. How should optional provider-specific capabilities be surfaced without contaminating the portable workflow contract?
10. What telemetry should be persisted as durable project evidence versus short-lived runtime diagnostics?
11. How much of Codex's current agent loop should remain delegated to the Codex adapter versus recreated in a ChampCity Native Runtime?
12. How should Capability Packs interact with the Skills Engine so skill instructions do not unnecessarily duplicate runtime/tool instructions?

---

## 20. Immediate Follow-Up Artifacts

The following artifacts would make this architecture actionable:

```text
CHAMPCITY_CORE_CAPABILITY_REGISTRY.md
CHAMPCITY_EXECUTION_PROFILE_CATALOG.md
CHAMPCITY_MODEL_RUNTIME_CAPABILITY_SCHEMA.md
CHAMPCITY_CONTEXT_BUDGET_AND_TELEMETRY_STANDARD.md
CHAMPCITY_MODEL_PROVIDER_CONFORMANCE_SUITE.md
```

The existing `CODEX_RUNTIME_CAPABILITY_CATALOG.md` and `CHAMPCITY_CODEX_RUNTIME_DEPENDENCY_MAP.md` proposed by the Runtime Abstraction Initiative remain prerequisites for understanding which current behavior ChampCity is receiving implicitly from Codex.

---

## 21. Current Direction

ChampCity should move toward an architecture where:

> workflows carry Operator direction and compute lifecycle/eligibility; Capability Packs own exposed semantic operations for one bounded execution; runtime/model adapters own protocol translation; and providers/models supply inference.

The goal is not to minimize tool count for its own sake. The goal is to make every model invocation receive the smallest capability and context envelope necessary to perform the governed task reliably.

This reduces context overhead, improves model compatibility, strengthens deterministic scope/access/policy enforcement, preserves cache economics, and prevents any one external runtime from defining ChampCity's architecture.

This document captures design discussion only. It is not an approved implementation contract.