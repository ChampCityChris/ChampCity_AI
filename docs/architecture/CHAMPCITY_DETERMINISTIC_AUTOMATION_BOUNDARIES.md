# ChampCity Deterministic Automation Boundaries

**Status:** Adopted V2 automation-boundary rulebook — September 14, 2026

## 1. Purpose

This document defines the boundary between work that requires AI judgment and work that ChampCity A/I should perform deterministically through ordinary software.

The objective is not merely to reduce token use. The boundary is a reliability rule:

> If ChampCity can derive the correct result from authoritative state and explicit rules, ChampCity should derive it in code rather than ask a model to reconstruct, calculate, serialize, remember, or enforce it.

AI inference should be purchased for uncertainty reduction: investigation, interpretation, synthesis, design, implementation decisions, semantic review, and other work where judgment has actual value.

Mechanical bookkeeping should not consume model context, model output, tool-call turns, or human review capacity.

This document operationalizes the foundational rule in `CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md` that deterministic mechanics belong to ChampCity and applies it across the Product Capability Model, Structured Project State, Agent Runtime Interface, Repository Management, and future AI Memory architecture.

### Applicability and current obligations

These are target automation boundaries, not a declaration that current V1 reporting and state automation already exists. Until an implemented, approved structured reporting path replaces it, the existing Work Card/Implementer Report requirements remain effective. Workers must still provide the required current report and truthful command/result evidence; they must not invent mechanical facts.

Genuine policy, architecture, standards, and design discussion remain authored source-controlled Markdown. The prohibition on model-maintained canonical workflow state is not a prohibition on this documentation work. Markdown workflow projections are application-generated after cutover; Markdown documents remain documents by nature under the Structured Project State model §28.

The [corpus index](CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md) records status, source-evidence limitations, and unresolved contracts. Named Implementation/receipt/checkpoint representations below describe required information; their complete durable mapping remains F06/F18, not an implicitly approved new entity schema.

---

## 2. Governing Rule

A task belongs to ChampCity mechanics when all of the following are true:

1. the required inputs are available as authoritative machine-readable state;
2. explicit rules determine the valid output or state transition;
3. the result can be reproduced from the same inputs without subjective interpretation; and
4. correctness can be tested with deterministic assertions.

A task belongs to AI judgment when the system must interpret ambiguous evidence, infer meaning, compare competing explanations, synthesize a solution, make a design tradeoff, generate implementation logic, or perform semantic review for which no deterministic rule can establish correctness.

The practical test is:

```text
If two competent models are allowed to disagree, the work may require judgment.
If there is one mechanically correct answer, ChampCity should compute it.
```

A second rule is equally important:

> Authoritative state must never be recreated by inference when ChampCity already possesses it.

A model must not be asked to remember or reproduce an ID, hash, revision, timestamp, relationship, disposition/eligibility state, changed-file set, token count, dependency state, or other fact that ChampCity can retrieve or compute directly.

---

## 3. Four Responsibility Lanes

The architecture should use four responsibility lanes.

### 3.1 Deterministic ChampCity mechanics

ChampCity owns calculation, persistence, state transition, serialization, validation, policy enforcement, accounting, and repeatable infrastructure operations.

These operations should execute without an AI turn.

### 3.2 AI judgment

AI workers own tasks where semantic reasoning is the useful work product: RCA, architecture, planning, code implementation, ambiguous evidence interpretation, semantic validation, design review, and synthesis.

### 3.3 Hybrid: AI proposes, ChampCity enforces

Many useful operations contain a semantic decision followed by mechanical execution.

The model may propose the semantic intent. ChampCity must validate task scope, explicit constraints, access, policy, and transition eligibility; normalize the request; perform the mutation; calculate all resulting metadata; and record an auditable receipt.

Examples:

```text
AI proposes:
"This evidence supports Root Cause RC-4."

ChampCity:
validates entity existence and allowed relationship type,
generates RelationshipId,
records provenance and timestamps,
persists the relationship,
and updates derived views.
```

or:

```text
AI proposes:
"Implementation is complete and these criteria are satisfied by these semantic findings."

ChampCity:
captures the actual changed-file set,
attaches command/test receipts,
calculates fingerprints,
updates the governed implementation-state representation,
and evaluates mechanically satisfiable workflow gates.
```

### 3.4 Operator Decisions

Some decisions are neither AI mechanics nor ChampCity mechanics. They are human Decisions reserved to the Operator.

Examples include validation/acceptance explicitly reserved to the Operator, approval of scope expansion, acceptance of residual risk, destructive or policy-sensitive actions, and explicit reopening of previously closed work.

AI may advise. ChampCity may enforce the allowed transition. Neither may silently replace a product Decision reserved to the Operator.

---

## 4. Current-State Audit

The recorded Desktop source audit identifies substantial deterministic machinery, some still exposed to AI workers as context or stepwise tool work. This documentation reconciliation has not rerun that production-source audit. A reproducible source snapshot/dirty-file manifest and test/report traceability remain F21 requirements.

### 4.1 Implementer prompt and report maintenance

The frozen V1 implementation in `src/main/workCardBuilding/codexImplementerExecutionService.ts` supplies application-computed Work Card and Implementer Report revisions and SHA-256 values. The prompt correctly states that ChampCity owns canonical identity, source revisions, repository binding evidence, and disposition metadata; none of those mechanisms is an independent discretionary decision principal.

However, the model is still instructed to maintain the Markdown Implementer Report and manually record exact commands, working directory, exit codes, result summaries, validation mappings, and other evidence that the runtime or execution host can capture directly.

Target boundary:

- AI supplies implementation summary, semantic deviations, blockers, residual risks, and judgment-based criterion evidence.
- ChampCity captures commands, working directory, exit code, duration, changed files, test results, environment evidence, runtime usage, hashes, revisions, and provenance automatically.
- ChampCity persists the resolved structured implementation/Validation/Evidence representations.
- Markdown Implementer Report becomes a rendered view/export rather than a model-maintained source of truth.

### 4.2 Source-control provider exposure

The frozen V1 `src/main/agentHarness/tools/toolRegistry.ts` dispatches bounded Git mutation actions for branch preparation, staging, commit, push, and fast-forward integration through `src/main/agentHarness/repository/gitMutations.ts`. The implementation enforces deterministic preconditions such as repository containment/pathspec validation, valid branch/ref names, clean-tree requirements where applicable, existing staged changes before commit, configured remotes, and fast-forward-only integration.

`src/main/agentHarness/repository/boundedGit.ts` and `gitMutations.ts` demonstrate that underlying Git mechanics can be implemented in bounded deterministic code. V2 should retain those mechanics behind the Git source-control provider and RepositoryService rather than reintroduce an AI permission/command loop or make Git's command vocabulary the permanent workflow contract.

The routine workflow should therefore stop spending model calls deciding or invoking predictable source-control steps one operation at a time once the corresponding governed services exist.

Target boundary:

- AI may inspect diffs or history when those facts are needed for reasoning.
- workflows request semantic outcomes such as isolated work source, RepositoryCheckout provisioning, durable ImplementationRevision capture, synchronization, integration candidate preparation, target advancement, changed-file calculation, and readiness checks;
- RepositoryService translates those outcomes through the configured source-control provider;
- for Git, branch creation, worktree operations, staging/index bookkeeping, commit, fetch/push, merge/integration, dirty-tree checks, and ref movement remain deterministic provider mechanics rather than workflow concepts;
- AI may propose a semantic change summary when useful, but should not perform routine Git bookkeeping;
- ChampCity should produce a source-control receipt and attach it to the work record.

### 4.3 Generic artifact writes

`src/main/agentHarness/tools/toolRegistry.ts` also exposes generic Markdown and JSON artifact writes.

Those tools are appropriate as migration/compatibility capabilities and for genuine repository documentation, but they should not remain the normal future path for Project State.

Target boundary:

- AI returns semantic domain output;
- application services validate it against domain commands;
- Structured Project State persists canonical records;
- serializers/projectors produce JSON, Markdown, reports, cards, timelines, or API representations as required.

### 4.4 Existing deterministic validation is the correct direction

The recorded Issue Resolution and Work Card Validation audit identifies SHA-256 freshness/fingerprint checks in application code. This is the correct architectural pattern.

The future state should generalize that pattern so models consume the result of deterministic validation when relevant rather than calculate or reproduce the validation themselves.

### 4.5 Markdown-derived workflow state

The Source Extraction Map identifies multiple current workflow services that reconstruct current state from Markdown files, paths, revisions, and repository layout.

This is not only a persistence problem. It causes repeated model and application work to recover facts that should exist as explicit state.

The Structured Project State model should eliminate this reconstruction by making relationships, lifecycle, Decisions/dispositions, eligibility, dependencies, validations, supersession, lineage, and derived current-state views queryable directly.

---

## 5. Candidate Boundary Matrix

| Area | Default owner | AI may do | AI must not do |
| --- | --- | --- | --- |
| Source-control operations | Repository & Source Control Management | Inspect diff/history for reasoning; describe semantic change intent or semantic conflict resolution | Routine source-line/checkout/revision/synchronization/integration mechanics; provider-specific branch/worktree/index/commit/push/merge/reset bookkeeping; changed-file calculation |
| Hashes/checksums | ChampCity mechanics | Reason about a reported mismatch if necessary | Calculate, copy-forward, compare, or maintain authoritative hashes |
| Canonical IDs | ChampCity mechanics | Refer to IDs supplied in context | Generate canonical entity IDs, relationship IDs, lineage IDs, revision IDs, submission IDs |
| Human-facing aliases | ChampCity mechanics by policy | Suggest a title/name | Manually increment `WC03`, `REPAIR02`, `FC04`, etc. |
| Metadata | ChampCity mechanics | Supply semantic title, summary, rationale, risk description | Maintain timestamps, revisions, actor IDs, disposition/decision fields, provenance, source digests, lifecycle metadata |
| JSON serialization | ChampCity mechanics | Produce semantic structured output through a typed contract | Hand-author canonical JSON persistence or normalize property ordering/escaping |
| Schema validation | ChampCity mechanics | Explain a validation failure; propose an authorized schema change | Decide whether invalid data should be accepted or claim schema conformance without validation |
| State relationships | Hybrid | Propose semantic relationships requiring judgment | Generate relationship identity, bypass type rules, create invalid links, manually maintain inverse links |
| Dependency calculation | ChampCity mechanics | Identify a new semantic dependency when planning requires judgment | Calculate ready/blocked status from an existing dependency graph |
| Workflow/status calculation | ChampCity mechanics plus Operator Decisions where genuinely reserved | Recommend a semantic disposition where advisory judgment is requested | Advance state, fabricate an Operator Decision, mark approval, or close work outside allowed transition rules |
| Token accounting | Model/Context/Usage Management | None required | Estimate authoritative usage from prose or manually total provider metrics |
| Cost accounting | Model/Context/Usage Management | Compare economic implications once metrics exist | Perform authoritative arithmetic that ChampCity can compute from usage/rate data |
| Context-budget calculation | Model/Context/Usage Management | Judge semantic relevance when algorithmic retrieval is insufficient | Count tokens, enforce hard limits, calculate remaining budget, silently truncate required context |
| Context assembly | ChampCity mechanics / AI Memory | Rank or summarize optional semantic memory when authorized | Recreate authoritative Project State from prose; decide hard-limit compliance |
| Capability/tool selection | ChampCity policy engine | Request an optional capability; classify task semantics if necessary | Grant itself tools/access, widen task scope, bypass constraints, escape the sandbox, or broaden repository scope |
| Runtime/model selection | Hybrid | Recommend among eligible models where quality judgment matters | Bypass compatibility, cost, policy, capability, task-scope, access, or explicit Operator-selection constraints |
| Deterministic validation | ChampCity/Execution Environment | Interpret failures and propose fixes | Re-run arithmetic mentally, substitute claims for test results, declare a command passed without receipt |
| Semantic validation | AI and/or Operator | Review architecture, behavior, UX, requirement meaning, RCA quality | Convert subjective confidence into authoritative pass when workflow reserves disposition elsewhere |
| Evidence capture | ChampCity mechanics | Explain significance of evidence | Invent or substitute model transcription for available command receipts, changed files, timestamps, test exit codes, hashes, or runtime telemetry |
| Evidence interpretation | AI judgment | Determine what evidence means and whether it supports a semantic claim | Alter raw evidence or provenance |
| Revisions/lineage/supersession | ChampCity mechanics | State semantic reason for supersession | Increment revisions, link lineage, or decide effective record by manual bookkeeping |
| Markdown/report rendering | ChampCity mechanics for workflow projections | Supply semantic narrative fields; author genuine policy/design documents within scope | Maintain future canonical workflow state by editing rendered Markdown |
| Environment detection/preflight | Development Environment service | Diagnose why a capability cannot be provisioned when deterministic remediation fails | Guess whether a compiler/runtime/tool exists when ChampCity can probe it |
| Scope/access/policy/Operator-decision checks | ChampCity mechanics | Request an interaction or explain why a genuine human decision is needed | Infer broader scope, access, eligibility, or an Operator Decision merely because a prompt implies it |
| Retry/backoff/timeouts | ChampCity/runtime policy | Explain repeated semantic failure where useful | Invent retry counts, deadlines, or state after deterministic execution |

---

## 6. Detailed Rulebook

### Rule 1 — Never spend inference on identity

Canonical Product State identities are always application-generated.

This includes:

- ProjectId;
- WorkItemId;
- FindingId;
- RootCauseId;
- BoundedSolutionId;
- CriterionId;
- ValidationId;
- EvidenceId;
- DecisionId;
- RelationshipId;
- LineageId;
- revision identifiers;
- ChampCity execution/correlation identities; and
- source-control operation receipts.

Opaque runtime thread/turn/tool-call identities may be issued by the runtime adapter as defined by the Agent Runtime Interface §4. ChampCity maps and preserves them as distinct execution references; it does not regenerate them as canonical Project identities. Neither application-owned nor adapter-issued IDs are generated by model inference. The complete cross-service identity map remains F18.

Human-facing aliases may be generated deterministically from project/workflow sequence policy.

AI may create the semantic content associated with an entity. It does not create the entity's authoritative identity.

### Rule 2 — Never spend inference on hashes or freshness

Content fingerprints, checksums, source freshness, expected-version comparison, optimistic-concurrency checks, and integrity validation are application functions.

A model should normally receive conclusions such as:

```text
sourceStatus = current
```

or:

```text
sourceStatus = stale
expectedRevision = 12
observedRevision = 14
```

rather than be asked to compare opaque hashes itself.

Hashes should be included in model context only when the hash itself is evidentiary or needed to diagnose an integrity problem.

### Rule 3 — AI supplies semantics; ChampCity supplies the record envelope

For every AI-created domain object, ChampCity owns the record envelope:

```text
id
projectId
createdAt
updatedAt
createdBy
updatedBy
revision
lineage
provenance
disposition state
lifecycle state
source references
schema version
```

AI supplies only the semantic fields that require judgment.

For example, an RCA worker may supply:

```text
finding statement
root-cause explanation
confidence/rationale
bounded-solution narrative
constraints
acceptance intent
```

ChampCity creates and links the actual Finding, Root Cause, Bounded Solution, Criteria, provenance, and revision records.

### Rule 4 — Serialization is not reasoning

AI should not be used as a JSON serializer, workflow-report formatter, schema normalizer, metadata copier, or report templating engine where ChampCity can perform the operation deterministically.

Runtime adapters may use structured model output where useful, but the structured response is an input contract, not the persistence representation.

ChampCity validates the response and serializes canonical state itself.

Rendered Markdown remains useful for people, Git interoperability, export, and historical compatibility. It is a projection. This does not exclude judgment-based authoring of actual architecture, policy, or design documents.

### Rule 5 — Workflow state is calculated, not narrated

Current step, ready/blocked status, next legal action, open repair chain, outstanding criterion count, effective decision, current validation, close eligibility, and other derived workflow facts must come from structured state and state-machine rules.

An AI worker may recommend what should happen next. It does not determine what transitions are legally available.

### Rule 6 — Relationships have two parts: semantic intent and mechanical integrity

Some relationships are mechanically implied by workflow and require no model judgment.

Examples using the Structured Project State model §16 registry:

```text
Repair Work Item -> repairs -> Parent Work Item
Validation -> evaluates -> Criterion
Evidence -> supports -> Validation
```

ChampCity creates these automatically where the governing workflow establishes them. Revision counters and history are maintained mechanically; this example does not invent a `revises` Relationship entity.

Other relationships may require semantic judgment.

Examples:

```text
RootCause -> explains -> Finding
BoundedSolution -> addresses -> RootCause
Evidence -> supports -> Finding
Decision -> supersedes -> prior Decision
```

AI or a human may propose the semantic relation. ChampCity validates cardinality, type, scope, policy, and domain invariants and persists the relationship. A semantic correction to a Decision is distinct from an ordinary later lifecycle Decision.

Use registered predicates and directions, not aliases such as `validates`, `evidence_for`, or `addressed_by`. Contrary evidence or a distinct assessment-basis relationship may require an explicit registry extension; prose mentioning it does not silently register a new `refutes` or `informed_by` edge. Endpoint/cardinality/cycle requirements remain explicit design work under F04.

### Rule 7 — Dependency and readiness graphs are code

Once dependencies exist as structured relationships, readiness is graph calculation.

AI should not repeatedly inspect prose to decide whether prerequisite work is closed.

ChampCity calculates:

- direct and transitive blockers;
- unsatisfied prerequisites;
- cyclic dependencies;
- ready work;
- blocked work;
- eligible next work;
- repair-chain state; and
- close eligibility.

AI is only required when the question is whether a new semantic dependency should exist.

### Rule 8 — Git is a managed service, not an agent chore

Routine source-control lifecycle should be expressed as workflow policy.

For example:

```text
Implementation begins
    -> ensure authorized worktree/branch state

Implementation completes
    -> calculate changed files
    -> run readiness/safety checks
    -> stage authorized changes
    -> create commit from Work Item identity + semantic summary
    -> push/integrate when workflow policy authorizes it
    -> persist SourceControlReceipt
```

The AI worker does not need a sequence of Git tool calls for this path.

AI access to Git inspection remains appropriate when history/diff semantics are part of investigation, RCA, code review, or implementation reasoning. This target does not grant Git mutation to the current documentation task or remove existing authorization requirements.

### Rule 9 — Evidence collection is automatic; evidence meaning may require AI

ChampCity should automatically capture evidence emitted by controlled execution:

- command;
- arguments where safe;
- working directory/execution environment;
- start/end time;
- duration;
- exit status;
- bounded stdout/stderr or durable output reference;
- test counts/results when parseable;
- source revision;
- changed files;
- environment capability state; and
- runtime/tool identity.

AI may explain why that evidence supports or fails an acceptance criterion.

This removes repetitive transcription from Implementer Reports and makes evidence harder to fabricate accidentally.

### Rule 10 — Deterministic validation runs before semantic validation

Validation should be layered.

```text
Layer 1: deterministic proof
    schema validation
    type checking
    builds
    tests
    lint/static checks when required
    file/path existence
    source freshness
    expected state transitions
    repository invariants
    data invariants

Layer 2: semantic AI review
    architecture correctness
    causal adequacy
    requirement interpretation
    code-quality reasoning
    UX/visual review
    residual-risk analysis

Layer 3: Operator judgment/acceptance where the criterion or policy genuinely reserves a human decision
```

A model should never be asked to judge a fact that Layer 1 can establish conclusively.

Conversely, ChampCity must not pretend that a deterministic test proves a subjective property that actually requires semantic review. Validation scope follows the owned change; a documentation-only task does not require an unrelated application build.

### Rule 11 — Context budgets are arithmetic; context relevance may be semantic

ChampCity owns:

- model context limits;
- reserved output budget;
- required segment budget;
- per-segment token estimates;
- cache-stability accounting;
- overflow rules;
- hard rejection when required context cannot fit; and
- the planned Context Envelope/budget and aggregated accounting view.

AI Memory or a reranker may use semantic methods to rank optional historical material.

The final inclusion decision must still obey deterministic priority, scope/policy, and budget constraints.

Required context cannot be silently discarded because a model or runtime decided it was less relevant.

The runtime emits the actual Context Receipt under Agent Runtime Interface §16.4. ChampCity joins that receipt with its plan and usage telemetry; it must not label a planned estimate as observed delivery. Mandatory Skills, tools, model/runtime and environment requirements must be resolved before final context assembly/negotiation. Unknown/opaque overhead retains its measurement-quality label. The full shared schema remains F18.

### Rule 12 — Token and cost telemetry is measured data

Provider/runtime usage telemetry is authoritative when available.

ChampCity may use deterministic tokenizer-based estimation when exact values are unavailable, but the quality must be labeled `exact`, `estimated`, `opaque`, or `unavailable` as required by the Agent Runtime Interface.

Models should not be asked to estimate their own token consumption.

Cost is calculated from usage records and versioned pricing/rate data. AI may analyze the economics after the calculation exists.

### Rule 13 — Capability eligibility is policy

Role, workflow state, task/project scope, explicit constraints, access policy, runtime capability, sandbox policy, and execution-environment constraints determine the legal capability set.

The capability resolver should calculate the minimum legal pack before the model runs.

The model may request an optional capability during execution. ChampCity decides whether the request is legal.

A worker cannot widen its task scope, resource access, or workflow eligibility because it can describe why a capability would be useful. Capability omission minimizes exposure; owning services and execution policy must also enforce equivalent effects through native shell/file/tool routes. The complete enforcement and revocation matrix remains F15, not a claim that hiding a named tool alone prevents its effect.

### Rule 14 — Model/runtime routing is constrained optimization

ChampCity should first deterministically filter to runtimes/models that satisfy mandatory requirements:

- required context size;
- tool support;
- structured-output support where required;
- sandbox/approval semantics;
- provider/project policy;
- execution profile;
- availability; and
- explicit Operator selections.

Among eligible choices, a policy, heuristic, benchmark score, or optional recommendation model may rank candidates.

AI-assisted routing may recommend. It may not make an ineligible model eligible.

### Rule 15 — Project State is queried, not reconstructed

Agents should receive bounded authoritative state views assembled from Structured Project State.

They should not repeatedly parse a corpus of cards and reports merely to answer:

- what work is active;
- which repair is current;
- what was validated;
- which decision is effective;
- what criteria remain open;
- what evidence exists; or
- what revision is authoritative.

Historical prose may still be retrieved when its semantics are relevant to the current task.

### Rule 16 — Mechanical output should not occupy the model's completion budget

The final model response should not be burdened with information ChampCity can produce itself.

For an Implementer, a future typed semantic result might contain only:

```text
implementationSummary
semanticChanges[]
deviations[]
blockers[]
residualRisks[]
criterionAssessments[]
recommendedFollowUp
```

ChampCity appends:

```text
execution identity
files changed
commands executed
validation results
exit codes
evidence references
source revisions
hashes
Git receipt
usage/cost telemetry
runtime/model identity
timestamps
```

The UI or Markdown projection combines both for human review. This target result shape does not supersede current report requirements before the corresponding implementation exists.

---

## 7. Canonical Turn Pattern

The preferred AI execution pattern is:

```text
1. ChampCity derives canonical task state.
2. ChampCity resolves task scope/constraints, access/policy, capabilities, runtime eligibility, and context budget.
3. ChampCity assembles the bounded Context Envelope.
4. AI performs only the semantic/reasoning work.
5. Tool execution produces machine receipts automatically.
6. AI returns a typed semantic result.
7. ChampCity validates the result contract.
8. ChampCity performs in-scope deterministic state/repository mechanics permitted by policy and access controls.
9. ChampCity records IDs, revisions, relationships, evidence, telemetry, and provenance.
10. ChampCity calculates derived workflow state.
11. UI/Markdown/API projections are rendered from canonical state.
12. An Operator Decision is requested only where product intent, material scope/risk, policy, or a human-acceptance criterion actually requires it.
```

This is preferable to:

```text
Prompt AI
-> ask AI to rediscover state
-> ask AI to calculate metadata
-> ask AI to call Git
-> ask AI to update Markdown
-> ask AI to restate command results
-> parse AI prose to discover what happened
```

---

## 8. Worked Examples

### 8.1 Architect RCA

AI judgment:

- inspect relevant source/evidence;
- identify Finding;
- determine Root Cause;
- formulate Bounded Solution;
- identify semantic constraints and acceptance intent.

ChampCity mechanics:

- generate entity identities;
- attach project/work-item identity;
- record source provenance;
- create legal relationships;
- record timestamps/revisions/lineage;
- supersede prior records when the domain rules, task scope, and applicable Decisions make that transition eligible;
- calculate effective current state;
- render the human-readable RCA view.

### 8.2 Implementer completion

AI judgment:

- modify code;
- make local implementation decisions inside the directed bounded contract;
- explain what changed;
- identify deviations, blockers, and residual risks;
- assess semantic criteria that cannot be proven mechanically.

ChampCity mechanics:

- capture source baseline;
- record tool/command executions;
- calculate changed files;
- run/record required deterministic validation;
- calculate hashes and revisions;
- bind evidence to execution;
- execute source-control policy;
- calculate usage and cost;
- persist the resolved implementation/Validation/Evidence representations;
- render the Implementer Report.

### 8.3 Validation

ChampCity first evaluates every criterion with an available deterministic validator.

Examples:

```text
build completed = exit code / build receipt
specific test passed = test runner result
file removed = repository query
schema valid = schema validator
expected state transition legal = state machine
source unchanged since evidence = revision/fingerprint comparison
```

Only criteria requiring interpretation are sent to an AI reviewer or Operator.

The final disposition follows the applicable workflow rules and effective Decisions. An AI semantic pass does not automatically become an Operator Decision.

### 8.4 Context construction

ChampCity:

- resolves mandatory execution requirements and the compatible model/context budget;
- retrieves required current-state records;
- retrieves candidate memories;
- measures/estimates segment size;
- reserves output capacity;
- enforces required/optional priority;
- applies the negotiated overflow policy;
- records the planned Context Envelope/budget.

The runtime emits a delivery Context Receipt to the extent observable. ChampCity records and aggregates it with measured/estimated usage while preserving quality labels. AI Memory may rank which historical decisions or evidence are semantically relevant. It does not perform token arithmetic or override mandatory context.

---

## 9. What Must Remain AI Work

The deterministic-mechanics principle must not turn into false automation.

The following normally remain judgment tasks:

- determining root cause from incomplete or conflicting evidence;
- deciding whether a proposed architecture is sound;
- translating Operator intent into a bounded technical solution;
- determining whether two apparently similar defects have the same cause;
- selecting an implementation strategy where multiple valid designs exist;
- writing or modifying nontrivial code;
- assessing whether a solution actually addresses the semantic requirement;
- evaluating maintainability, clarity, and architectural fit;
- assessing UX or visual behavior not reducible to machine assertions;
- determining relevance of historical knowledge where deterministic retrieval is insufficient;
- synthesizing residual risk;
- recommending whether scope should change; and
- reviewing ambiguous evidence.

When these judgments produce an action, ChampCity should still own the mechanical execution and recordkeeping.

---

## 10. Prompt and Tooling Rules

Future ChampCity prompts and capability packs should follow these restrictions.

### A standard worker prompt SHOULD NOT ask a model to:

- generate canonical IDs;
- calculate or copy hashes;
- increment revisions;
- produce timestamps;
- maintain disposition/decision/access metadata;
- calculate current workflow state;
- determine graph readiness from structured dependencies;
- count tokens;
- total cost;
- hand-serialize canonical JSON;
- format canonical workflow-state projections where deterministic rendering exists;
- transcribe available command receipts;
- enumerate changed files when repository services can do so;
- perform routine Git lifecycle;
- grant itself capabilities;
- infer an Operator Decision, task scope, or workflow eligibility from filesystem access; or
- claim deterministic validation without execution evidence.

### A standard worker prompt MAY ask a model to:

- investigate;
- reason;
- classify ambiguous semantics;
- propose relationships;
- design;
- implement;
- explain failures;
- interpret evidence;
- make bounded recommendations;
- perform semantic review; and
- produce the semantic fields of a typed domain result.

### Tool exposure rule

A mechanical capability does not automatically belong in the model's tool inventory merely because ChampCity implements it as a tool.

If workflow orchestration knows when and how the operation should occur, the orchestrator should call the service directly rather than expose the operation to the model.

This reduces both schema-token overhead and unnecessary tool-call turns.

---

## 11. Architecture Consequences

### 11.1 Project State services become the canonical bookkeeping source

Structured Project State should own canonical IDs, revisions, lineage, relationships, metadata, Decision/disposition state, lifecycle state, and derived state views.

AI writes semantic changes through commands, not raw persistence records.

### 11.2 Repository Service becomes an orchestration dependency

Git/source-control mechanics should move out of routine agent behavior and into deterministic workflow hooks backed by Repository & Source Control Management.

The AI tool surface can retain bounded inspection capabilities for reasoning and exceptional mutation capabilities for advanced workflows where those operations are in scope and permitted by access/policy/constraints.

### 11.3 Implementer Reports become projections

The report should be built from:

- AI semantic result;
- execution receipts;
- validation receipts;
- repository diff/change receipt;
- environment evidence;
- Project State metadata; and
- runtime usage telemetry.

The model should no longer be responsible for correctly reproducing all of those facts in prose once the structured reporting implementation exists.

### 11.4 Capability packs become smaller

Removing routine Git, artifact bookkeeping, hash handling, raw metadata manipulation, and other deterministic operations from model-visible tools reduces tool schema overhead and makes scope, access, policy, and Operator Decision boundaries easier to reason about.

### 11.5 AI Memory retrieves meaning, not bookkeeping

Memory should be optimized for semantically relevant knowledge. It should not be used as a substitute for querying current lifecycle state, relationships, revisions, Decisions/dispositions, dependencies, eligibility, or other deterministic Project State.

---

## 12. Migration Priorities

### Priority 0 — Establish the boundary contracts

1. Define typed semantic outputs for Architect, Implementer, Reviewer, and Validator roles.
2. Define the application-owned record envelope.
3. Define deterministic action/validation receipts.
4. Mark fields as `AI_SUPPLIED`, `CHAMPCITY_DERIVED`, or `OPERATOR_DECISION` in domain/application contracts where ambiguity exists.

### Priority 1 — Remove obvious bookkeeping from model turns

1. Stop asking models to calculate/copy IDs, hashes, revisions, timestamps, or Decision/disposition/access metadata once the corresponding code-owned path exists.
2. Auto-capture command execution and validation evidence.
3. Auto-calculate changed files and repository state.
4. Render Implementer/Validation reports from structured data.

### Priority 2 — Move Git lifecycle into Repository Management

1. Define source-control policy per workflow state.
2. Implement deterministic prepare/stage/commit/push/integrate operations with receipts.
3. Remove routine Git mutation tools from normal capability packs.
4. Retain read-only diff/history inspection for reasoning roles.

### Priority 3 — Make workflow state fully derived

1. Move readiness/blocking/next-step/close eligibility to structured-state queries.
2. Move repair lineage and supersession to explicit relationships.
3. Eliminate prompt-time reconstruction of current state from Markdown.

### Priority 4 — Make model/context economics deterministic

1. Centralize token estimation/measurement.
2. Enforce context envelopes and hard budgets.
3. Calculate cost from telemetry and versioned rate data.
4. Resolve capability packs and eligible runtime/model sets before execution.

---

## 13. Boundary Acceptance Criteria

The deterministic-automation boundary is operating correctly when all of the following are true:

1. Routine AI prompts contain no instruction to generate canonical IDs, timestamps, revisions, hashes, or application-owned canonical metadata.
2. Routine AI prompts contain no instruction to perform source-control bookkeeping that workflow policy can perform directly.
3. AI-generated domain output is semantic and typed; ChampCity supplies the canonical record envelope.
4. Canonical structured persistence is application-generated; Markdown workflow reports are generated projections, not canonical Markdown persistence. Genuine repository documents remain authorable.
5. Dependency, readiness, current-state, and legal-transition queries return reproducible answers from structured state.
6. Deterministic validation produces machine receipts before semantic validation is requested.
7. Command, test, changed-file, source revision, and runtime telemetry evidence is captured without model transcription.
8. Token/context calculations are reproducible for the same model/context inputs.
9. Capability packs cannot be expanded by model assertion.
10. Runtime/model selection cannot bypass mandatory compatibility/policy constraints.
11. Operator-reserved dispositions remain impossible for AI or mechanics to self-approve.
12. Human-readable reports can be regenerated from canonical structured records without re-running an AI worker.
13. The same canonical state and deterministic rules produce the same derived workflow state without dependence on model choice.

These criteria define the target implementation boundary; documentation changes alone do not prove they are operating in the product.

---

## 14. Architectural Test for New Features

Every new ChampCity feature should answer these questions before adding an AI call or model-visible tool:

```text
1. What part of this operation actually requires judgment?
2. Which inputs are already canonical structured data?
3. Which outputs can be calculated exactly?
4. Can ChampCity execute the mechanical portion before or after one bounded AI judgment?
5. Is the model being asked to reproduce data the application already knows?
6. Is a tool exposed because the model truly needs discretion, or merely because it was convenient to expose the underlying service?
7. Can the result be validated deterministically?
8. Is any Operator Decision being accidentally converted into a model decision or infrastructure permission gate?
```

If the only justification for an AI step is that a model *can* perform it, the operation does not meet the boundary.

---

## 15. Final Rule

ChampCity should not use AI as glue code.

The durable architecture is:

```text
AI
    discovers meaning
    reasons about ambiguity
    designs
    implements
    reviews semantics
    recommends

ChampCity
    knows identity
    knows canonical state and effective Decisions/dispositions
    calculates eligibility
    calculates relationships and dependencies
    measures usage
    enforces budgets
    executes policy
    validates deterministic facts
    performs repository mechanics
    records provenance
    persists state
    renders projections

Operator
    makes only the human Decisions genuinely reserved to the Operator
```

The target is not the fewest possible AI calls at any cost. The target is that every AI call buys judgment that ordinary software cannot provide more cheaply, reliably, and reproducibly.
