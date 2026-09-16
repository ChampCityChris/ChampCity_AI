# ChampCity Project Memory and Autonomous Workbench Architecture

## Document status and topic-specific successors

**Status:** Historical architecture discussion; not an approved implementation contract. The original proposal below is retained for rationale. Its historical use of “project memory” includes concepts now separated into authoritative Project State and derived AI Memory. It must not override the newer contracts listed here.

| Topic in this historical proposal | Current interpretation / successor |
| --- | --- |
| Memory as authoritative structured state (§§1, 3, 14, 23) | [Foundational Architecture Principles §3](../../architecture/CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md#3-structured-project-state-is-the-common-state-architecture) and the [Structured Project State domain model](../../architecture/CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md) govern: Project State owns truth/history; AI Memory retrieves and constructs context. |
| Record IDs, revisions, supersession, lineage, relationship diagrams (§§6, 8) | The state model §§3–4, 16–19 governs. Material supersession creates a new opaque entity ID in the same lineage; it is not an in-place update under the same canonical ID. Historical labels such as RCA-14 v1/v2 are illustrative display aliases, not a canonical schema. Informal graph predicates below are historical illustrations, not additions to the registered relationship vocabulary. |
| SQLite (§§4, 14, 19) | A local implementation candidate, not a universal Project State requirement and not a Server database decision. The logical model remains engine-neutral. |
| Backup, export, recovery, and migration (§§19, 24–25) | [Desktop Project-State Migration Design](../../migration/legacy/CHAMPCITY_DESKTOP_PROJECT_STATE_MIGRATION_DESIGN.md), especially §§18, 22, governs. Lossless recovery uses structured export/backup plus required evidence, not Markdown reparsing. Human-readable exports supplement recovery; they are not complete database backups. |
| Runtime, context delivery, and telemetry (§§13, 15–17) | [Agent Runtime Interface Contract](../../architecture/CHAMPCITY_AGENT_RUNTIME_INTERFACE_CONTRACT.md) supplies the current runtime semantics. Planned context, runtime delivery receipts, and aggregate accounting are distinct. Numeric examples below are illustrative unless explicitly supported by retained experiment evidence; they are not verified telemetry or model-selection thresholds. |
| Autonomous handoffs, repair loops, concurrent workers (§§11–12, 20–22) | Retained product direction, not permission to bypass workflow authority. Exact completion, command recovery, resource isolation, and attempt/cost/time budgets remain open design dependencies. |

The [corpus index](../../architecture/CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md) records document precedence, unresolved adoption, and F01–F22 disposition. Questions below already answered by the state/migration/runtime contracts should link to those answers, not be reopened as competing decisions. In particular, artifact replacement, revision versus supersession, authoritative versus advisory state, and legacy import/recovery direction have successors above. Their remaining detailed coverage/freshness/implementation contracts are still open where the index says so.

**All following sections preserve the historical proposal's framing. They are not a second normative state, storage, relationship, or recovery contract.**

---

## 1. Purpose

This document captures a proposed evolution of ChampCity A/I from repository-resident workflow artifacts toward a project-memory architecture that preserves the reliability of the current governed workflow while enabling a faster Power Workbench and longer-horizon autonomous development.

The proposal is additive to, and should be evaluated alongside:

- `CHAMPCITY_RUNTIME_ABSTRACTION_INITIATIVE_DESIGN_DISCUSSION.md`
- `CHAMPCITY_MODEL_AGNOSTIC_CAPABILITY_PACK_ARCHITECTURE.md`

The central idea is to separate **durable project knowledge** from **human-readable workflow documents**.

Today, Work Cards, Repair Cards, Architect investigations, Implementer Reports, validation records, and related Markdown artifacts serve several roles simultaneously:

1. durable memory;
2. transport between Architect, Implementer, and Operator;
3. authority and lifecycle evidence;
4. audit history;
5. context offloading from model threads; and
6. human-readable workflow UI.

That design has been effective for a non-technical Operator because it makes every handoff explicit and inspectable. It also prevents a long-running model thread from becoming the sole holder of project state.

However, once ChampCity owns its runtime, model routing, capability exposure, context accounting, and project memory, those responsibilities no longer need to be bound to Markdown files committed inside the software repository.

The proposed direction is:

> Treat structured project memory as the authoritative durable state. Treat Markdown cards and reports as views or exports of that state when useful.

---

## 2. Current Artifact-Centric Model

The current workflow is approximately:

```text
Architect reasoning
      ↓
Architect Investigation / RCA.md
      ↓
Work Card / Repair Card.md
      ↓
Operator/Application handoff
      ↓
Implementer reads card
      ↓
Implementation
      ↓
Implementer Report.md
      ↓
Architect review
      ↓
Validation / Repair / Close artifacts
```

The file system is therefore being used as an inter-agent message bus and durable state store.

This has several advantages:

- repository-visible evidence;
- simple persistence;
- easy human inspection;
- strong provenance when files are immutable or versioned;
- deterministic handoff boundaries;
- no dependency on hidden conversational context; and
- easy recovery after runtime or thread failure.

It also has costs:

- repetitive natural-language governance;
- large cards whose purpose is partly to recreate context for the next model;
- manual or application-driven transfer between roles;
- repository clutter from process artifacts;
- artifact format becoming entangled with domain semantics;
- unnecessary token consumption when the same constraints are restated repeatedly; and
- friction for experienced users who no longer need every lifecycle step surfaced explicitly.

The current artifacts should therefore be understood as a successful implementation of **externalized project memory**, not necessarily as the permanent storage architecture.

---

## 3. Proposed Inversion: Memory First, Documents Second

The proposed architecture inverts the relationship:

```text
Today

Markdown Artifact
      ↓
Parsed / interpreted as project state

Future

Structured Project State
      ↓
Rendered as Markdown / card / timeline / report when needed
```

A Repair Card, for example, would no longer need to be the authoritative object itself.

The authoritative state could instead be composed from records such as:

```text
Finding
RootCause
BoundedSolution
AuthorityConstraint
EvidenceSet
Relationship
```

ChampCity may render those records as a familiar Repair Card for Guided mode, export them to Markdown, or feed a compact task packet directly to an Implementer.

The storage format stops defining the domain model.

---

## 4. SQLite as the Local Project-Memory Substrate

SQLite is a strong candidate for the initial project-memory implementation because it provides:

- local ownership;
- transactional writes;
- deterministic queries;
- low operational overhead;
- a single portable database file;
- mature tooling;
- relational integrity;
- indexing and full-text search support;
- straightforward backup and migration; and
- no requirement for a separate database service.

The goal is not to dump complete chat histories into SQLite.

The database should represent **structured durable project knowledge**.

A conceptual schema could include:

```text
projects
threads
executions
work_units
findings
root_causes
bounded_solutions
decisions
authority_constraints
implementation_records
validation_records
reviews
evidence
relationships
memory_entries
context_snapshots
model_runs
usage_records
```

This is illustrative rather than prescriptive. The final schema should be derived from the domain semantics ChampCity actually requires.

---

## 5. Project Memory Is Not Chat History

A critical design rule is:

> Project memory must not become an indiscriminate transcript store that is automatically reloaded into every model context.

Conversation is execution detail. Durable memory should capture project facts that remain useful after a thread ends.

Examples include:

- accepted architectural decisions;
- confirmed defects;
- root causes;
- bounded proposed solutions;
- implementation outcomes;
- validation evidence;
- failed hypotheses;
- unresolved risks;
- relationships between repairs and parent work;
- affected subsystems;
- model/runtime compatibility findings;
- current authority state; and
- Operator decisions.

The system may preserve raw transcripts for audit or debugging, but those transcripts should not be the primary retrieval substrate for future workers.

---

## 6. Structured Bounded Solutions

A key example is the current Repair Card.

Instead of persisting only a large Markdown document, the durable object could resemble:

```text
BoundedSolution

id:                 BS-00482
project:            ChampCity_AI
originThread:       THR-00918
originRole:         architect
problem:            Corrective authority lost after prepare
rootCauseId:        RCA-00144
objective:          Preserve aggregate authority through prepared state
scope:              issueResolutionService + focused tests
forbiddenScope:     renderer-local state, schema changes, Git mutation
requiredEvidence:   [EV-1201, EV-1207]
status:              ready-for-implementation
createdAt:           ...
revision:            1
```

The user may still see this as:

```text
Repair Card — Post-Prepare Corrective Authority Preservation
```

but the model does not necessarily need the entire rendered document.

The runtime can supply only the fields necessary for the current execution.

---

## 7. Demand-Loaded Context

The project-memory system should enable **demand-loaded context**.

Today an Implementer often receives an entire Work Card or Repair Card plus supporting evidence because the document is the transfer mechanism.

Future Workbench execution can instead begin with a compact packet:

```text
ROLE
Implementer

OBJECTIVE
Preserve aggregate Issue Validation authority after handoff preparation.

ROOT CAUSE
The active-submission projection returns before the aggregate authority decorator is applied.

AUTHORIZED SURFACES
- issueResolutionService.ts
- focused service/renderer tests

REQUIRED OUTCOME
Prepared, copy, and waiting-for-drafts projections retain aggregate authority.

PROHIBITED CAPABILITIES
- Git mutation
- workflow authority mutation
- unrelated renderer redesign

EVIDENCE REFERENCES
- RCA-00144
- EV-1201
- EV-1207
```

If the worker needs deeper history, it can explicitly request:

```text
recall(RCA-00144)
recall(EV-1207)
```

This changes project memory from **always-loaded context** into **retrievable context**.

The architecture therefore supports long-running projects without requiring long-running context windows.

---

## 8. Provenance and Append-Only History

Moving process state out of Markdown must not sacrifice one of the strongest properties of the current system: provenance.

A hidden mutable database that silently rewrites history would be a regression.

Important project-memory records should therefore use append-oriented, versioned semantics.

For example:

```text
RCA-14 v1
status: superseded
root cause: X

RCA-14 v2
status: current
root cause: Y
supersedes: RCA-14 v1
reason: new evidence
```

The system should not simply execute:

```sql
UPDATE root_causes SET cause = 'Y' WHERE id = 'RCA-14';
```

for authority-bearing records without preserving the previous state.

Relationships should likewise be explicit:

```text
RCA-14
  ↓ supports
BS-32
  ↓ implemented-by
IMPL-71
  ↓ reviewed-by
REV-18
  ↓ discovered
FIND-93
  ↓ corrected-by
BS-33
```

This creates a deterministic project knowledge graph using relational records rather than requiring a dedicated graph database.

---

## 9. Deterministic Authority vs. Semantic Recall

Project memory should support two different retrieval mechanisms.

### 9.1 Deterministic authoritative retrieval

Questions such as:

> What bounded solution currently governs this implementation?

must be answered through deterministic relationships and current-state queries.

This is an SQL/domain-state problem, not a vector-search problem.

### 9.2 Semantic historical recall

Questions such as:

> What have we previously learned about phase synchronization defects?

may benefit from semantic search, embeddings, full-text search, or a secondary vector index.

Semantic retrieval should help discover potentially relevant history. It should not decide lifecycle authority.

The principle is:

> Similarity may find evidence. It must not manufacture authority.

---

## 10. Guided Mode and Workbench Share the Same Memory Core

The proposed Guided Workflow and Power Workbench should not have separate project-state systems.

They should be different interaction models over the same durable memory substrate.

### Guided Mode

The current lifecycle remains explicit:

```text
Capture → Frame → Plan → Build → Prove
```

The user sees named stages, explicit disposition surfaces, governed handoffs, and familiar cards/reports.

Project-memory records are rendered into structured workflow surfaces.

The human operates the workflow explicitly.

### Power Workbench

The user may simply say:

> Investigate why this projection loses authority.

ChampCity invokes the Architect role, records the RCA and bounded solution into project memory, and returns the result conversationally.

Later, in a clean thread, the user can say:

> Implement the bounded solution.

ChampCity resolves the current governing bounded solution from project memory and starts an Implementer with the appropriate capability pack and compact context packet.

The user does not manually pass a Repair Card between roles.

The workflow still exists internally, but ChampCity operates it on behalf of the user.

This suggests a useful distinction:

> **Guided Mode governs the work explicitly. Workbench governs the execution while preserving the same durable project semantics in the background.**

---

## 11. Memory-Backed Role Transitions

The current manual handoff:

```text
Architect
  ↓ writes card
Operator copies/selects card
  ↓
Implementer
```

can become:

```text
Architect
  ↓
Persist RCA + BoundedSolution
  ↓
Execution reaches ready-for-implementation
  ↓
New Implementer thread
  ↓
Runtime retrieves governing BoundedSolution
  ↓
Implementer executes
```

The important property is that each role can run in a fresh model thread.

The next role receives durable project knowledge rather than depending on the previous role's conversational context.

This preserves role separation while removing document-transfer friction.

---

## 12. Longer-Horizon Autonomy Through Bounded Workers

The same architecture enables autonomous development without requiring one giant long-running agent.

A user could request:

> Fix Issue 007 and get it ready for my live validation.

ChampCity can internally orchestrate:

```text
Architect
    ↓
RCA + bounded solution
    ↓
MEMORY CHECKPOINT
    ↓
Implementer
    ↓
implementation + focused validation
    ↓
MEMORY CHECKPOINT
    ↓
Independent Architect Review
    │
    ├── PASS ──────────────────┐
    │                          ↓
    │                    ready-for-operator
    │
    └── DEFECT
          ↓
       finding + RCA
          ↓
       bounded subordinate solution
          ↓
       MEMORY CHECKPOINT
          ↓
       Implementer
          ↓
       review
          ↓
       ...
```

This provides **long-horizon behavior without long-horizon context**.

Each worker is bounded.
Each worker can start with a clean context.
Each worker receives only relevant memory.
Each transition creates a durable checkpoint.
Each failure leaves recoverable evidence.
Different models can execute different roles.
The process can stop at any boundary requiring Operator authority.

This is materially safer and more context-efficient than allowing one autonomous thread to accumulate hundreds of thousands of tokens indefinitely.

---

## 13. Memory as an Enabler of Model Routing

Once persistent intelligence belongs to ChampCity rather than to a single model thread, model selection can become task-specific.

Examples:

```text
Task type: Implementation
Bounded solution confidence: High
Affected files: 2
Expected context: 70K

→ Route to lower-cost coding model
```

```text
Task type: RCA
Prior implementation failures: 2
Cross-subsystem evidence: Yes
Expected context: 180K

→ Route to stronger reasoning model
```

```text
Task type: Validation summary
Deterministic test evidence: Yes
Expected context: 20K

→ Route to small/cheap/local model
```

The role contract and memory packet remain ChampCity-owned.
The inference model becomes replaceable.

This aligns directly with the Runtime Abstraction and Capability Pack initiatives.

---

## 14. Artifact Reinterpretation

The term `artifact` should be reconsidered.

A future architecture may distinguish three concepts:

### 14.1 Memory Records

Authoritative structured project knowledge stored in SQLite.

Examples:

- Finding
- RootCause
- BoundedSolution
- Decision
- ImplementationRecord
- ValidationRecord
- Review
- AuthorityConstraint

### 14.2 Evidence Objects

External or repository-resident evidence referenced by memory records.

Examples:

- source files;
- source excerpts;
- diffs;
- test output;
- screenshots;
- logs;
- commits;
- external documents; and
- runtime telemetry.

### 14.3 Views / Exports

Human-readable representations derived from memory.

Examples:

- Work Card;
- Repair Card;
- Architect Investigation;
- Implementer Report;
- Validation Record;
- chronological project timeline;
- issue summary; and
- Markdown export.

The existing Markdown artifacts remain useful as views, portability/export formats, and Guided Mode surfaces.

They cease being the only canonical representation of project state.

---

## 15. Interaction with Capability Packs

The project-memory architecture should work with execution-specific Capability Packs.

A future execution can be resolved from:

```text
Role
+ Workflow / Work Type
+ Current Authority
+ Current Project Memory
+ Selected Runtime
+ Selected Model
        ↓
Execution Profile
        ↓
Minimal Capability Pack
        ↓
Compact Context Packet
        ↓
Inference
```

This allows ChampCity to encode many restrictions mechanically instead of restating them repeatedly in prose.

For example, an Implementer Repair execution may receive:

```text
✓ repository.search
✓ repository.read
✓ source.edit
✓ validation.run
✓ implementation_record.write

✗ git.commit
✗ git.reset
✗ workflow.advance
✗ issue.create
✗ planning-authority.mutate
```

This is both safer and more token-efficient.

The Repair Card view may still state important semantic prohibitions, but the runtime does not need natural-language prohibitions to enforce capabilities the worker simply does not possess.

---

## 16. Context Construction and Memory Retrieval

ChampCity should explicitly own the context envelope.

A model invocation should be assembled from identifiable components:

```text
Stable runtime contract
Stable role contract
Stable project governance
Stable capability schemas
-------------------------------- cacheable prefix
Current task packet
Retrieved memory
Retrieved evidence
Current execution state
Recent tool results
```

This provides three benefits:

1. token transparency;
2. cache stability; and
3. deterministic context budgeting.

The runtime should be able to report:

```text
Model: Kimi K2.7 Code
Context limit:             262K

Runtime contract:            5K
Role contract:               3K
Capability schemas:          5K
Project memory packet:      10K
Current bounded solution:    2K
Retrieved evidence:         42K
Execution state:             8K
Reserved output/reasoning:  24K
--------------------------------
Projected utilization:      99K
Remaining headroom:        163K
```

Memory retrieval should therefore be a budgeted operation rather than an unlimited accumulation mechanism.

---

## 17. Token and Cost Telemetry

The Workbench should expose the economic effect of context and memory directly.

A useful runtime record could include:

```text
Request 018
Role: Implementer
Model: Kimi K2.7 Code
Provider: OpenRouter

Prompt tokens:             87,441
  Runtime:                  6,220
  Role/governance:           4,812
  Capability schemas:       5,104
  Project memory:           9,721
  Current task:             4,032
  Repository evidence:     46,308
  Execution state:         11,244

Cached input:              63,200
Fresh input:               24,241
Output:                     2,813
Cost:                       $0.031
Context utilization:       33.4%
```

This telemetry should be retained per model run and available for aggregate project analysis.

The Operator should be able to distinguish:

- useful project context;
- harness overhead;
- tool-schema overhead;
- repeated cached material;
- retrieved evidence; and
- model-generated output/reasoning.

This makes context efficiency an engineered property rather than an opaque provider side effect.

---

## 18. Repository Separation

A major benefit of the proposed architecture is cleaner repository ownership.

The software repository primarily contains:

> **What the software is.**

ChampCity project memory contains:

> **Why the software became what it is, what was attempted, what evidence exists, what remains unresolved, and what currently governs future work.**

Process artifacts no longer need to proliferate throughout the application repository merely to make agent state durable.

That does not prohibit Markdown exports from being committed when a project requires repository-resident governance or external portability.

Repository-resident artifacts become a deliberate policy choice rather than the default persistence mechanism.

---

## 19. Portability, Backup, and Failure Recovery

Moving authority into SQLite introduces requirements that Markdown files previously satisfied automatically through Git.

The project-memory system therefore needs explicit protections:

- deterministic schema migrations;
- automatic local backups;
- export/import capability;
- corruption detection;
- append-only or versioned authority records;
- timestamps and actor/model provenance;
- evidence hashes where appropriate;
- project/repository identity binding;
- recoverable execution checkpoints;
- human-readable export for disaster recovery; and
- optional Git-tracked snapshot/export policy where useful.

SQLite should not become a single opaque point of failure.

The architecture should make memory inspectable and portable independently of the running ChampCity application.

---

## 20. Human Authority and Autonomous Boundaries

Longer-horizon autonomy should not erase Operator authority.

The orchestration layer should know which state transitions may proceed autonomously and which require explicit human disposition.

Example:

```text
Architect RCA
→ autonomous

Bounded solution creation
→ autonomous if within governed scope

Implementation
→ autonomous if capability profile permits

Focused validation
→ autonomous

Independent Architect review
→ autonomous

Operator live validation
→ PAUSE FOR HUMAN only when a criterion actually requires visual/human confirmation or another Operator-reserved decision

Git publication / release
→ policy-dependent human authority
```

Routine Work Card/Repair validation is not an Operator gate when deterministic evidence and/or required independent semantic review can prove the criteria. Visual confirmation may be deferred to the governing Phase when individual changes can be accumulated safely; the Phase then owns the aggregate visual criterion.

The exact boundaries remain configurable by workflow and project policy, but the default is **autonomy until a real authority boundary**, not a human pause after every engineering step.

### Autonomous-loop limits

Autonomous Architect -> Implementer -> review/repair loops continue while work remains inside the authorized scope and policy. ChampCity stops/escalates when any configured guardrail is reached:

- maximum repair/attempt count;
- cost budget;
- elapsed-time budget;
- explicit scope/architecture expansion;
- unrecoverable execution/environment failure; or
- an Operator-reserved decision/visual criterion.

These limits are Project/workflow policy, not prompts the worker may waive. Defaults may be conservative and adjustable by the Operator.

### Parallel worker source ownership

At most one writable execution owns a given checkout/worktree at a time. Each concurrently active Implementer receives its own writable Git worktree/checkout or equivalent isolated source realization. Architect/reviewer workers may share read-only access.

ChampCity owns leases/claims for writable execution resources and owns integration of completed changes. Cancellation/revocation invalidates the lease so a stale worker cannot continue writing through it. Multiple workers are never allowed to race writes in the same working tree.

Power users may choose fewer pauses than Guided users, but the same underlying project state and provenance model can support both.

---

## 21. Relationship to the Existing Guided Workflow

The current rigorous workflow should not be discarded.

It provides proven concepts that become internal orchestration primitives:

- role separation;
- explicit authority;
- bounded work;
- evidence-based transitions;
- independent review;
- validation before closure;
- causal repair genealogy;
- durable checkpoints; and
- Operator disposition boundaries.

The proposed architecture changes **how visibly the user must operate those mechanics**, not whether the mechanics exist.

For a novice user, ChampCity may continue to surface every stage and artifact explicitly.

For a power user, ChampCity may execute the same principles behind a conversational Workbench interface.

---

## 22. Example: Workbench Repair Lifecycle

A power-user interaction could look like:

```text
USER
"Why does corrective authority disappear after Prepare?"

ARCHITECT
- inspects evidence
- establishes root cause
- proposes bounded correction

PROJECT MEMORY
FIND-93 created
RCA-14 created
BS-33 created
BS-33 status = ready-for-implementation

USER
"Implement the fix."

CHAMPCITY
- resolves current BS-33
- starts fresh Implementer thread
- loads implementer.repair capability pack
- retrieves only necessary memory/evidence

IMPLEMENTER
- edits source
- runs focused validation

PROJECT MEMORY
IMPL-72 created
VAL-51 created
BS-33 status = implemented-awaiting-review

CHAMPCITY
- starts fresh independent Architect review

ARCHITECT
- reviews implementation against BS-33 + evidence

PROJECT MEMORY
REV-19 created

IF PASS
→ ready-for-operator

IF DEFECT
→ new finding / RCA / subordinate bounded solution
→ autonomous repair loop continues
```

No user-authored Repair Card is required for transport.

A Repair Card view can still be generated at any point for inspection or export.

---

## 23. Architectural Principles

The proposal establishes the following principles:

1. **Project memory is structured state, not accumulated chat history.**
2. **Authority must be deterministic and relational, not inferred from semantic similarity.**
3. **Important project-memory records preserve provenance and history rather than being silently overwritten.**
4. **Markdown artifacts become views/exports over domain state when possible.**
5. **Guided Mode and Workbench share one project-memory substrate.**
6. **Fresh role threads should recover required knowledge from memory rather than prior conversational context.**
7. **Long-horizon autonomy is composed from bounded workers and durable checkpoints rather than one indefinitely growing agent thread.**
8. **Context is demand-loaded and budgeted.**
9. **Model routing is separated from durable project intelligence.**
10. **Capability Packs enforce execution authority mechanically where possible.**
11. **Token/context/cost telemetry is a first-class runtime concern.**
12. **Repository process artifacts become optional policy outputs rather than mandatory transport infrastructure.**
13. **The database must remain inspectable, portable, backed up, and recoverable.**
14. **Operator authority remains explicit at designated autonomous boundaries.**

---

## 24. Open Design Questions

The following list is retained from the historical proposal. Questions already resolved by later governing architecture are annotated rather than treated as active gates:

1. Which current Markdown artifacts should become structured records first?
2. Which records must be strictly append-only versus versioned-current?
3. Which records are authoritative versus advisory memory?
4. How should repository commits/SHA evidence be linked to memory records?
5. Should each project use a separate SQLite database or share a ChampCity-wide database with project partitioning?
6. What backup and restore policy is sufficient for project authority?
7. Which memory records should be exportable to Git automatically?
8. How should semantic search be implemented without allowing similarity search to become authority?
9. How should memory confidence, supersession, contradiction, and staleness be represented?
10. How should the runtime decide what memory enters context automatically versus only on model request?
11. How should memory retrieval affect context budgets and hard cost limits?
12. How should Guided workflow stages map onto shared memory records?
13. **Resolved:** autonomous transitions pause only for real Operator-reserved decisions/visual criteria; ordinary Work/Repair validation is autonomous when its declared validation modes are satisfied.
14. **Resolved architecturally:** repair/autonomous loops use configurable attempt, cost, and elapsed-time guardrails plus scope/architecture/unrecoverable-failure escalation.
15. **Resolved architecturally:** each active Implementer receives an isolated writable worktree/checkout under a ChampCity lease; stale/revoked workers cannot continue writing and ChampCity owns integration.
16. How should external evidence be retained when source URLs/files disappear?
17. What minimum human-readable disaster-recovery export should exist independently of SQLite?
18. **Resolved product scope:** V2 does not require a V1 Markdown upgrade path. Any future importer is optional and governed by the retained migration design.

---

## 25. Proposed Initiative Direction

This concept should be treated as an extension of the broader ChampCity V2 runtime work rather than an isolated storage refactor.

A reasonable investigation sequence is:

```text
1. Inventory current artifact semantics
2. Separate artifact domain data from Markdown rendering
3. Define project-memory record types and lineage rules
4. Define authority and supersession semantics
5. Prototype SQLite project-memory store
6. Build deterministic retrieval APIs
7. Add optional semantic/historical retrieval
8. Render one existing artifact type from structured memory
9. Integrate memory-backed context packets into Workbench
10. Integrate Guided Mode over the same memory core
11. Add autonomous role transitions and checkpoints
12. Add model-routing and cost-budget integration
13. Add export/backup/disaster-recovery mechanisms
```

The architecture should be proven incrementally rather than attempting to migrate the entire current artifact system at once.

---

## 26. Current Direction

The current design direction is:

> ChampCity should own durable project intelligence independently of individual model threads, inference providers, agent runtimes, and Markdown transport artifacts.

The existing governed workflow remains valuable, but its explicit document handoffs can become one user-facing representation of a deeper project-memory and orchestration system.

For Guided users, ChampCity continues to expose structured stages and explicit artifacts.

For Power Workbench users, ChampCity can persist RCA, bounded solutions, implementation evidence, reviews, and decisions in the background while allowing concise conversational interaction.

For autonomous operation, ChampCity can chain fresh bounded Architect and Implementer workers through durable memory checkpoints, preserving the reliability principles of the current workflow without requiring one long-running context or manual artifact transfer.

The intended end state is not simply an AI-enabled IDE and not simply a workflow application. It is a **model-agnostic engineering environment whose durable project memory, execution authority, and orchestration survive individual agents and model sessions**.

This document captures architecture discussion only. It is not an approved implementation contract.
