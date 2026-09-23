# ChampCity Structured Project State Domain Model

**Status:** Adopted V2 logical domain model — September 14, 2026  
**Scope:** ChampCity A/I Shared Product Core  
**Persistence assumption:** None. This model is intentionally independent of database engine, ORM, filesystem layout, Git provider, workstation/server hosting location, and model provider.

## 1. Purpose

Structured Project State is the canonical representation of what ChampCity knows about a software project and the governed work performed against it.

It replaces repository Markdown as authoritative application state.

Markdown, reports, Work Cards, validation reports, project summaries, and similar human-readable documents become rendered views, imports, exports, or evidence derived from this model. They are no longer themselves the state machine.

The model must support the same logical Project State contract when the ChampCity Service Host is:

- workstation-hosted, with local durable persistence; or
- server-hosted, with server-managed durable persistence.

Both deployments consume the same domain contracts through Product Core. Hosting location does not create a different Project State model.

The model also separates AI reasoning from deterministic application mechanics. Models create or recommend Findings, Root Causes, Bounded Solutions, Decisions, and other semantic content. ChampCity code owns IDs, relationships, revision numbers, lineage, timestamps, schema validation, permissions, hashes, persistence, and state transitions.

## 2. Fundamental Concepts

Three mechanisms must remain distinct.

| Mechanism | Meaning |
|---|---|
| **Revision** | The same domain object was edited or its operational state changed. Identity remains unchanged. |
| **Supersession** | A new domain object intentionally replaces the semantic meaning of an earlier object. New identity; shared lineage. |
| **Disposition / Decision state** | Records the current effective decision/disposition affecting a governed entity. The human Operator is the only authority; records, services, and models carry evidence/state and never become independent discretionary decision principals. |

A fourth concept, **derivation**, is also distinct.

A record derived from another record does not necessarily replace it. For example, a Root Cause can be derived from a Finding while both remain concurrently valid.

## 3. Canonical Identity Model

Every canonical object receives an opaque application-generated identity.

The identifier must have no business meaning.

```text
EntityId
ProjectId
LineageId
RelationshipId
DecisionId
EvidenceId
```

The implementation may eventually choose UUID, UUIDv7, ULID, or another suitable format. That choice is infrastructure, not domain semantics.

Human-facing names such as:

```text
ISSUE_007
ISSUE_007-FC02
REPAIR01
WC03
```

may continue to exist as display identifiers, aliases, or imported legacy references, but they are not canonical keys.

## 4. Common Record Envelope

Most Project State entities share a common logical envelope.

| Field | Purpose |
|---|---|
| `id` | Stable canonical identity |
| `projectId` | Owning Project |
| `entityType` | Canonical entity type |
| `lineageId` | Semantic lineage identity |
| `recordVersion` | Monotonically increasing revision number |
| `schemaVersion` | Domain schema version used to interpret the record |
| `lifecycleState` | Operational existence state |
| `dispositionState` | Current effective disposition/decision state, where applicable |
| `createdAt` | Creation timestamp |
| `createdBy` | Principal responsible for creation |
| `updatedAt` | Last revision timestamp |
| `updatedBy` | Principal responsible for last revision |
| `closedAt` | Optional semantic closure timestamp |
| `supersededAt` | Optional supersession timestamp |
| `provenance` | Origin/import/source information |

`recordVersion` is application-controlled.

`dispositionState` is not freely editable. It is a projection of effective Decisions governing the entity.

## 5. Project

`Project` is the aggregate root for Structured Project State.

A Project represents the enduring product/software project, not a repository checkout, Electron workspace, GitHub repository, session, or model conversation.

### Core fields

| Field | Meaning |
|---|---|
| `id` | Project identity |
| `name` | Human-readable project name |
| `description` | Purpose of the project |
| `lifecycleState` | Active, paused, closed, archived, etc. |
| `createdAt` | Project creation |
| `updatedAt` | Last project-level update |

A Project owns zero or more Findings, Root Causes, Bounded Solutions, Criteria, Work Items, Validations, Evidence objects, Decisions, Relationships, and Project Resources.

## 6. Project Resource

`ProjectResource` binds the logical Project to infrastructure without making infrastructure part of Project identity.

Examples include:

- source repository,
- Git remote,
- local working tree,
- documentation repository,
- deployment target,
- external workspace.

### Core fields

| Field | Meaning |
|---|---|
| `id` | Resource identity |
| `projectId` | Owning Project |
| `resourceType` | Repository, working tree, deployment, documentation, etc. |
| `provider` | Adapter/provider responsible for the resource |
| `logicalName` | Human-readable name |
| `locator` | Opaque adapter-specific locator |
| `role` | Purpose of the resource within the Project |
| `lifecycleState` | Active, retired, unavailable, etc. |

The Shared Product Core therefore does not depend on the legacy `workspaceId` concept.

A workspace identifier, GitHub repository ID, filesystem path, or similar value belongs inside the relevant infrastructure adapter/resource binding.

## 7. Finding

A `Finding` records an observed condition requiring understanding, attention, or action.

It answers:

> What have we observed?

A Finding is deliberately distinct from its explanation and from its solution.

### Core fields

| Field | Meaning |
|---|---|
| `id` | Finding identity |
| `projectId` | Owning Project |
| `title` | Concise description |
| `statement` | What was observed |
| `category` | Defect, architecture issue, performance concern, requirement gap, etc. |
| `impact` | Consequence of the condition |
| `observedAt` | When the condition was observed |
| `findingState` | Open, resolved, monitoring, closed |
| `confidence` | Optional assessment confidence |

Evidence may support a Finding.

One Finding may have multiple proposed Root Causes.

One Root Cause may explain multiple Findings.

## 8. Root Cause

A `RootCause` represents a causal explanation of one or more Findings.

It answers:

> Why is this happening?

### Core fields

| Field | Meaning |
|---|---|
| `id` | Root Cause identity |
| `projectId` | Owning Project |
| `title` | Concise causal description |
| `statement` | Causal explanation |
| `rationale` | Reasoning supporting the conclusion |
| `confidence` | Confidence in the causal assessment |
| `rootCauseState` | Proposed, supported, disproven, resolved |
| `createdAt` | Creation time |

Root Causes link to Findings through explicit `explains` relationships.

Evidence may support or contradict a Root Cause.

A disproven Root Cause is retained rather than deleted because it remains useful project history.

## 9. Bounded Solution

A `BoundedSolution` defines the agreed technical direction for addressing a problem without becoming an implementation transcript.

It answers:

> What specifically should change, and what should not change?

### Core fields

| Field | Meaning |
|---|---|
| `id` | Solution identity |
| `projectId` | Owning Project |
| `title` | Solution name |
| `objective` | Desired resulting state |
| `scopeIn` | Included responsibility |
| `scopeOut` | Explicit exclusions |
| `constraints` | Technical/product constraints |
| `assumptions` | Assumptions underlying the solution |
| `risks` | Known implementation risks |
| `solutionState` | Proposed, active, completed, abandoned |

A Bounded Solution normally `addresses` one or more Root Causes or Findings.

It may define multiple Acceptance Criteria.

It may be implemented by one or many Work Items.

The Bounded Solution is where the Architect's durable technical reasoning belongs. It does not need to contain Git mechanics, hashes, serialization instructions, artifact filenames, or other deterministic implementation bookkeeping.

## 10. Criterion

An `AcceptanceCriterion` is a first-class object rather than anonymous text buried inside a Work Card.

This is necessary because Evidence and Validation need stable things to reference.

### Core fields

| Field | Meaning |
|---|---|
| `id` | Criterion identity |
| `projectId` | Owning Project |
| `statement` | Observable success condition |
| `criticality` | Required, optional, informational |
| `verificationIntent` | What must be demonstrated |
| `criterionState` | Active, satisfied, waived, retired |

A Bounded Solution or Work Item `defines_criterion`.

A Validation `evaluates` one or more Criteria.

This makes it possible to ask mechanically:

> Which acceptance criteria remain unvalidated?

without asking an LLM to reread a Markdown document.

## 11. Work Item

`WorkItem` is the canonical unit of bounded execution.

Current concepts such as Work Cards, Fix Cards, and Repair Cards become kinds or relationships of Work Item rather than independent storage models.

### Core fields

| Field | Meaning |
|---|---|
| `id` | Work Item identity |
| `projectId` | Owning Project |
| `workItemKind` | Feature, fix, repair, migration, maintenance, etc. |
| `title` | Human-readable objective |
| `objective` | Required implementation outcome |
| `workState` | Planned, ready, in-progress, implemented, blocked, validation-pending, closed, cancelled |
| `dispositionState` | None/proposed/approved/revision-requested/accepted/rejected/revoked/etc. |
| `startedAt` | Work commencement |
| `implementedAt` | Implementation completion |
| `closedAt` | Final closure |

A Work Item may:

- `implement` a Bounded Solution;
- `repair` another Work Item;
- `depend_on` another Work Item;
- be `part_of` another Work Item;
- define or inherit Criteria.

A Repair is therefore not a special artifact architecture.

It is:

```text
WorkItem
    kind = repair
    repairs -> prior WorkItem
    derived_from -> relevant Decision

Decision
    governs -> the affected WorkItem or other governed target
```

This preserves causal ancestry without maintaining a parallel Repair document system.

## 12. Validation

`Validation` records an assessment or test result.

It answers:

> What was evaluated, how was it evaluated, and what happened?

It does **not** answer:

> What are we authorized to do next?

That belongs to Decision.

### Core fields

| Field | Meaning |
|---|---|
| `id` | Validation identity |
| `projectId` | Owning Project |
| `validationType` | Automated test, manual inspection, UI validation, architecture review, etc. |
| `method` | How the validation was performed |
| `outcome` | Pass, fail, blocked, inconclusive |
| `performedBy` | Human, agent, or system principal |
| `performedAt` | Validation timestamp |
| `summary` | Observed result |

Validation records are effectively immutable.

A rerun creates another Validation.

This preserves the factual sequence:

```text
Validation 1 = FAIL
Validation 2 = FAIL
Validation 3 = PASS
```

rather than rewriting history until only the passing result remains.

Validation links to its target through `evaluates`.

Evidence links to Validation through `supports`.

## 13. Evidence

`Evidence` is an immutable record of observable proof.

Examples include:

- test output,
- screenshot,
- rendered UI,
- file diff,
- source excerpt,
- runtime log,
- command output,
- structured measurement,
- external reference,
- before/after state.

### Core fields

| Field | Meaning |
|---|---|
| `id` | Evidence identity |
| `projectId` | Owning Project |
| `evidenceType` | Screenshot, test-result, diff, log, output, document, etc. |
| `description` | What the evidence demonstrates |
| `capturedAt` | Capture time |
| `capturedBy` | Principal/tool producing the evidence |
| `mediaType` | Logical payload type |
| `payloadRef` | Engine-independent content reference |
| `digest` | Application-generated integrity fingerprint |
| `size` | Optional payload size |

The actual payload can later live in:

- database blob storage,
- filesystem object storage,
- server object storage,
- content-addressed storage,
- another approved persistence mechanism.

The domain model only requires a resolvable `payloadRef`.

Once Evidence has been used by an effective Validation or Decision, it must not be silently replaced. New evidence receives a new identity.

## 14. Decision

`Decision` is the canonical record of a discretionary choice or disposition.

It answers:

> Who decided what, within what role/scope, and when?

### Core fields

| Field | Meaning |
|---|---|
| `id` | Decision identity |
| `projectId` | Owning Project |
| `decisionType` | Scope approval, proceed, stop, validation disposition, technical choice, waiver, rejection, etc. |
| `outcome` | Structured decision outcome |
| `rationale` | Reason for the decision |
| `decisionRole` | Role responsible for the decision (for example Operator or delegated Architect technical judgment) |
| `decisionScope` | Project/workflow/scope boundary to which the decision applies |
| `decidedBy` | Principal making the decision |
| `decidedAt` | Decision timestamp |
| `effectiveAt` | Time the decision takes effect |

Decisions are immutable.

If a Decision was recorded incorrectly, a new Decision may `supersede` it.

A later normal lifecycle Decision does **not** supersede the earlier Decision.

For example:

```text
D1: Request Repair
D2: Validate Passed
```

D2 does not erase or supersede D1. D1 remains historically correct: repair really was requested at that point.

Supersession is reserved for semantic replacement or correction.

## 15. Disposition State

Disposition State represents the current effective recorded decision/disposition affecting a governed entity. It does not represent an independent discretionary decision principal.

Suggested common states are:

| State | Meaning |
|---|---|
| `none` | No special disposition applies |
| `advisory` | Informational/recommendation only |
| `proposed` | Awaiting a required decision or review |
| `approved` | Approved disposition is recorded |
| `revision_requested` | Current result cannot be accepted as-is |
| `accepted` | Applicable acceptance disposition is recorded |
| `rejected` | Explicitly rejected |
| `revoked` | Previous disposition has been withdrawn or superseded by a later Decision |

Disposition State should be **derived from effective Decisions**.

It should not be an arbitrary field that an agent writes.

This preserves the ChampCity role model without creating additional discretionary decision principals:

```text
Operator
    owns material product/scope/risk/exception and reserved acceptance decisions

Architect
    advisory reasoning and ordinary delegated technical decisions within established scope

Implementer
    execution responsibility within directed scope and constraints

System
    deterministic enforcement of access, policy, invariants, eligibility, and mechanical state transitions
```

Tests provide evidence; they do not make product decisions.

Models do not gain discretionary decision power because they produced a result.

Evidence supports conclusions; it does not grant discretionary decision power.

Validation outcomes do not independently create Operator Decisions or discretionary decision power.

## 16. Relationship

`Relationship` is a first-class typed edge between Project State entities.

It allows the Project model to represent causality and dependency without embedding every possible relationship into every entity schema.

### Core fields

| Field | Meaning |
|---|---|
| `id` | Relationship identity |
| `projectId` | Owning Project |
| `fromEntityId` | Source object |
| `relationshipType` | Semantic predicate |
| `toEntityId` | Target object |
| `createdAt` | Relationship creation |
| `createdBy` | Creating principal |
| `endedAt` | Optional end of relationship validity |
| `metadata` | Limited relationship-specific metadata |

Canonical relationship vocabulary should include at minimum:

| Relationship | Canonical direction |
|---|---|
| `explains` | RootCause → Finding |
| `addresses` | BoundedSolution → RootCause/Finding |
| `defines_criterion` | BoundedSolution/WorkItem → Criterion |
| `implements` | WorkItem → BoundedSolution |
| `repairs` | WorkItem → WorkItem |
| `part_of` | WorkItem → WorkItem |
| `depends_on` | WorkItem → WorkItem |
| `blocks` | Entity → Entity |
| `evaluates` | Validation → Criterion/WorkItem/Solution |
| `supports` | Evidence → Entity |
| `governs` | Decision → Entity |
| `derived_from` | Entity → Entity |
| `supersedes` | Successor → Predecessor |
| `relates_to` | Entity → Entity |

Relationship types should be centrally registered by the Product Core rather than invented ad hoc by models.

## 17. Revision

Revision represents modification of the same object.

Example:

```text
WorkItem ID: W-123
recordVersion: 1
recordVersion: 2
recordVersion: 3
```

All three are the same Work Item.

Typical revision-worthy changes include:

- correcting wording before execution,
- changing operational status,
- recording implementation completion,
- adding non-semantic metadata.

The application increments `recordVersion`.

The model does not generate revision numbers.

## 18. Supersession

Supersession means:

> This new entity is now the semantic successor to that earlier entity.

Example:

```text
BoundedSolution S2
    supersedes -> BoundedSolution S1
```

S1 remains present and queryable.

S1 receives a terminal superseded lifecycle state.

S2 receives a new `id` but carries the same `lineageId`.

Therefore:

```text
S1.id != S2.id

S1.lineageId == S2.lineageId
```

Supersession should normally occur when an entity already relied upon by downstream Project State requires a material semantic replacement.

Ordinary lifecycle progression is not supersession.

Repair is not automatically supersession.

A new Validation result is not supersession.

A new Decision following a previous Decision is not supersession.

## 19. Lineage

`lineageId` identifies the semantic family to which an entity belongs.

Consider:

```text
SOLUTION-A-v1
    id = A1
    lineageId = L100

SOLUTION-A-v2
    id = A2
    lineageId = L100
    supersedes -> A1
```

By contrast:

```text
WorkItem W2
    derived_from -> Finding F1
```

does not share F1's lineage.

Derivation describes ancestry.

Lineage describes semantic continuity.

This distinction allows ChampCity to answer both:

> Where did this come from?

and:

> What is the current version of this concept?

without model inference.

## 20. Lifecycle State

Lifecycle State describes whether a record currently participates in the active Project State.

Suggested values:

```text
active
closed
archived
superseded
voided
```

Lifecycle State must not be overloaded with workflow status, disposition, or eligibility.

For example:

```text
lifecycleState = active
workState = implemented
dispositionState = revision_requested
```

is a valid state for a Work Item whose implementation exists but has a current `revision_requested` disposition.

## 21. Timestamps

All persisted timestamps represent absolute instants and should be stored in a timezone-independent canonical representation.

Display timezone is a presentation concern.

Common timestamps include:

```text
createdAt
updatedAt
closedAt
supersededAt
```

Domain-specific timestamps include:

```text
Finding.observedAt

WorkItem.startedAt
WorkItem.implementedAt

Evidence.capturedAt

Validation.performedAt

Decision.decidedAt
Decision.effectiveAt
```

`updatedAt` must not be used as a substitute for these semantic timestamps.

For example, an issued Validation is immutable: correcting a typo in an issued result must not edit that Validation in place or imply that the validation occurred again. If draft Validation state is supported before issuance, draft editing is a separate lifecycle concern. Correction of an issued Validation requires a new/corrective record according to the applicable correction policy; version-bound freshness and completion semantics are defined in §26B.

## 22. Principal Reference

Actions requiring attribution use a `PrincipalRef`.

```text
PrincipalRef
    principalId
    principalType
    role
```

Suggested principal types:

```text
human
agent
system
tool
```

The Project State layer does not need to own sessions, models, OAuth credentials, or runtime processes.

Those belong to Control Plane/runtime capabilities.

A Project State record may retain an optional external execution/session reference for diagnostics without becoming dependent on that execution system.

## 23. State Change Audit

The application should generate an immutable `StateChange` record for canonical mutations.

This is mechanical bookkeeping, not LLM output.

### Minimum fields

```text
StateChange
    id
    projectId
    entityId
    fromRecordVersion
    toRecordVersion
    operation
    principal
    occurredAt
    changedFields
    reason
    causationId
    correlationId
```

This allows reconstruction of who changed Project State and why without requiring the semantic entities themselves to become event-sourced.

Event sourcing is therefore **not** an architectural requirement.

A persistence implementation may use conventional records, event sourcing, temporal tables, or another mechanism provided it satisfies the logical contract.

## 24. Canonical Relationship Flow

The normal problem-to-resolution chain becomes:

```text
Project
  │
  ├── Finding
  │      ▲
  │      │ explains
  │   RootCause
  │      ▲
  │      │ addresses
  │ BoundedSolution
  │      │
  │      ├── defines_criterion ──> Criterion
  │      │
  │      ▲
  │      │ implements
  │   WorkItem
  │      │
  │      ├─────────────┐
  │      │             │
  │      ▼             ▼
  │ Validation <── supports ── Evidence
  │      │
  │      ▼
  │   Decision
  │      │
  │      ├── accepted
  │      │
  │      └── revision_requested
  │                │
  │                ▼
  │          Repair WorkItem
  │            repairs
  │                │
  └────────────────┘
```

The exact relationship objects remain explicit even when UI renders this as a simpler workflow.

## 25. Example: Failed Validation and Repair

Assume Work Item `W1` implements Solution `S1`.

```text
S1 -> defines_criterion -> C1
W1 -> implements -> S1
```

Implementation finishes.

Evidence is captured:

```text
E1 -> supports -> V1
```

Validation:

```text
V1
outcome = fail

V1 -> evaluates -> C1
V1 -> evaluates -> W1
```

The failure itself does not establish a product decision or create repair scope.

The Operator disposition creates:

```text
D1
decisionType = validation_disposition
outcome = revision_requested

D1 -> governs -> W1
```

The current Disposition State of W1 becomes:

```text
revision_requested
```

Repair work is then represented as:

```text
W2
workItemKind = repair

W2 -> repairs -> W1
W2 -> derived_from -> D1
```

After repair:

```text
V2
outcome = pass
```

and the Operator records:

```text
D2
outcome = accepted
```

W1/W2 can then reach the appropriate accepted/closed state.

Nothing was erased.

Nothing required the LLM to infer ancestry from filenames.

The passing validation did not itself grant approval.

## 26. Domain Invariants

The Shared Product Core should enforce these rules mechanically.

1. Every non-Project canonical entity belongs to exactly one Project.
2. Canonical IDs are application generated.
3. Relationship endpoints must exist and belong to the same Project unless an explicitly supported cross-project relationship type exists.
4. Relationship direction and allowed entity types are schema validated.
5. Record revisions are monotonically increasing.
6. Supersession creates a new entity identity.
7. A superseding entity retains the predecessor's `lineageId`.
8. A record may not supersede an unrelated entity type.
9. Superseded records are retained.
10. Evidence relied upon by effective Decisions or current validation/completion state is immutable.
11. Validation records are immutable once issued.
12. Decisions are immutable once effective.
13. A corrected Decision requires a new Decision.
14. Disposition State is derived from Decisions rather than directly granted by model output.
15. Validation outcomes do not automatically create Operator Decisions or dispositions.
16. Material changes to already relied-upon semantic records require explicit supersession rather than silent rewriting.
17. Historical relationships are ended or superseded, not silently deleted.
18. Hard deletion of canonical Project State is prohibited except for explicitly defined administrative recovery operations.
19. Infrastructure identifiers such as Git repositories, paths, and legacy workspace IDs cannot become Project identities.
20. Project State must remain queryable without reconstructing meaning from Markdown prose.

## 26A. Durable Workflow and Execution Coverage

The Project aggregate must cover durable product semantics without turning every runtime detail into Project State.

### Workflow

`Workflow` is the durable instance of a ChampCity lifecycle such as Project Intake, Development, Issue Resolution, Work Item execution, or Repair. It records the workflow type, owning Project, current lifecycle state, current task-oriented Workspace, governing target, and timestamps. Workflow identity is distinct from Workspace identity.

### Phase

`Phase` is a durable Project-scoped grouping/milestone. It may own Work Items and Phase-level Criteria, including deferred visual-validation obligations. A Phase is not merely a heading in Markdown.

### Plan

ChampCity does **not** require a generic canonical `Plan` entity. Planning semantics are represented by the Bounded Solution, Work Items, Criteria, Decisions, dependencies, sequencing relationships, and Phase membership that the plan establishes. A human-readable Plan is a derived view/projection over those records. A future domain-specific plan type may be added only if it owns semantics that cannot be represented by those records.

### ImplementationRecord

`ImplementationRecord` is the durable semantic result of an implementation attempt. It belongs to a Work Item and may reference the execution session that produced it. It records implementation summary, deviations, blockers, residual risk, and completion outcome. Mechanical command/test/source-control facts remain Evidence/receipts linked to the record rather than prose copied into it.

Multiple implementation attempts create multiple ImplementationRecords; they are not overwritten into one report.

### Checkpoints

AI Memory checkpoints and runtime recovery checkpoints are not automatically canonical Project State. They are operational/derived records owned by Memory or Runtime/Orchestration and may be rebuilt or expired according to their contract. Any semantically material fact discovered during a checkpoint must be promoted into the appropriate Project State entity (Finding, Decision, Evidence, ImplementationRecord, etc.) before it can affect governed workflow state or eligibility.

This resolves the durable-home boundary:

| Concept | Durable home |
| --- | --- |
| Workflow instance/state | Project State `Workflow` |
| Phase/milestone | Project State `Phase` |
| Plan | Derived view over BoundedSolution/WorkItem/Criterion/Decision/Relationship/Phase |
| Implementation semantic result | Project State `ImplementationRecord` |
| Validation/Evidence/Decision | Existing Project State entities |
| AI Memory checkpoint | Memory store; derived/non-canonical |
| Runtime execution/recovery checkpoint | Runtime/Orchestration store; operational |

## 26B. Validation Freshness and Completion Semantics

### Version-bound validation

A completion-relevant Validation MUST identify the exact semantic target it evaluated:

```text
targetEntityId
targetRecordVersion
sourceBaselineRef?   // repository/change-set/execution baseline when relevant
```

`targetRecordVersion` changes only for semantic mutation of the target; projection/formatting changes do not invalidate Validation. When implementation/source facts are material to the criterion, `sourceBaselineRef` binds the Validation to the exact source state that was examined.

A Validation remains historical fact forever, but it is **current** only while its target version and required baselines still match. A governing Decision that relies on a Validation governs that validated version/baseline. A later semantic revision does not erase the old Decision; it makes that Decision stale for the new version until the required validation/disposition is satisfied again.

### Validation policy classes

Each Criterion declares the lowest sufficient validation mode that can prove it:

| Mode | Meaning |
| --- | --- |
| `deterministic` | Machine receipt/test/state query is sufficient. |
| `semantic_ai` | Independent semantic review is required but Operator disposition is not. |
| `visual_human` | Human visual confirmation is required for this criterion. |
| `deferred_visual_phase` | Visual confirmation may be deferred and represented as a Phase-level Criterion. |
| `operator_decision` | Product/scope/risk/policy decision is explicitly reserved to the Operator. |

Work Card/Repair validation therefore **does not require an Operator disposition by default**. If all Work Item criteria can be satisfied deterministically and/or through required independent semantic review, ChampCity may close the Work Item automatically once all other completion conditions are met.

Visual confirmation should be requested at the smallest useful frequency, not reflexively after every Work Item. When visual changes can be safely accumulated, the Work Item records the visual obligation as deferred and the governing Phase carries the `deferred_visual_phase` Criterion. Phase closure then requires the aggregate visual validation. A visual defect found at Phase validation creates/links the appropriate Finding and corrective Work Item without pretending the earlier implementation evidence never existed.

### Work Item completion

A Work Item is close-eligible when all of the following are true:

1. an ImplementationRecord reports implementation complete;
2. every non-deferred required Criterion has a current satisfactory Validation in its declared mode;
3. any required independent review is complete;
4. no active Repair/Fix child blocks the Work Item;
5. required dependencies are satisfied; and
6. no effective Decision blocks closure.

If no Criterion or policy reserves an Operator decision, closure is deterministic and does not pause for human approval.

### Repair completion and parent propagation

A Repair Work Item closes under the same rule as any Work Item. Closing a Repair does not automatically rewrite or erase its parent. Instead, the repaired parent becomes eligible for the validations invalidated by the repair to be rerun. Once the parent's required current validations are satisfied, the parent closes automatically unless an explicit Operator-reserved criterion/decision applies.

Nested Repairs use the same recursion. There is no special human approval merely because a repair chain exists.

### Phase completion

A Phase is close-eligible when:

1. all required member Work Items are closed;
2. no unresolved blocking Finding/Repair/Dependency remains;
3. every Phase-level Criterion, including deferred visual Criteria, has a current satisfactory Validation; and
4. no effective Decision blocks Phase closure.

If the Phase has a `visual_human`/deferred visual Criterion, the Operator is asked once at the Phase validation point. If it does not, Phase closure is deterministic.

### Project completion

A Project is close-eligible when all required Phases/Work Items are closed, Project-level Criteria are satisfied, and no unresolved blocking state remains. Publication/release is a separate policy-controlled action and may be reserved to the Operator without making ordinary engineering validation a human gate.

Closed historical Work Items are not normally reopened to correct new defects. A new Finding/Fix/Repair is linked to the affected historical work. Administrative reopening is exceptional and requires an explicit Operator Decision when the governance policy reserves that action to the Operator.

## 27. Derived Project State Views

The canonical model should expose derived read models rather than storing monolithic `project-state.md` documents.

A `CurrentProjectStateView` could mechanically answer:

```text
Current Project
Current active Findings
Supported Root Causes
Current Bounded Solutions
Active Work Items
Blocked Work Items
Outstanding Acceptance Criteria
Latest Validation per Criterion
Current effective disposition
Open Repair chains
Effective Decisions
Available Evidence
Superseded records
Project resource bindings
```

This view can feed:

- ChampCity Web Client,
- agent context,
- Architect context,
- Implementer context,
- Markdown exports,
- reports,
- audit views,
- API responses.

The same canonical records therefore serve both humans and models without forcing either to repeatedly reconstruct state from prose.

## 28. Markdown Artifact Replacement and Projection Model

The existing Markdown artifact system is replaced by canonical structured records plus deterministic rendered views.

The governing rule is:

```text
Canonical Structured Project State
             │
             ├──> UI/read model
             ├──> agent context projection
             ├──> Markdown rendered view
             ├──> Markdown export
             └──> API/structured export
```

The arrows do not run backward during ordinary operation. ChampCity must not render a Work Card to Markdown and later parse that Markdown to rediscover the Work Item. The Work Item remains the record; the Markdown is one presentation of it.

### Major artifact replacement matrix

| Existing Markdown artifact/concept | Canonical replacement | Markdown after migration |
|---|---|---|
| Project-state document | `CurrentProjectStateView` derived from the Project aggregate | Generated project-state snapshot/export |
| Work intake / framed request | Project metadata + Findings + Decisions + Relationships as applicable | Generated intake summary/export |
| Planning document | Findings + Root Causes + Bounded Solutions + Decisions + Relationships | Generated planning/solution view; legacy source retained as provenance when migrated |
| Issue document | `Finding` plus related Evidence, Root Causes, Decisions, and Relationships | Generated issue view |
| RCA document or section | `RootCause` + supporting/contradicting Evidence + `explains` relationships | Generated RCA view |
| Architect review | The Findings, Root Causes, Bounded Solutions, Validations, Evidence, and Decisions actually produced by that review | Generated advisory review view over those records |
| Architect bounded solution | `BoundedSolution` | Generated bounded-solution view |
| Acceptance Criteria embedded in a card | First-class `AcceptanceCriterion` records | Rendered criteria section within relevant views |
| Work Card | `WorkItem` + related Bounded Solution, Criteria, Decisions, Evidence, and Relationships | Generated Work Item view/export |
| Fix Card | `WorkItem` with `workItemKind = fix` | Generated Fix Work Item view/export |
| Repair Card | `WorkItem` with `workItemKind = repair` + `repairs` relationship + authorizing Decision | Generated Repair Work Item view/export |
| Implementer report | Work Item implementation state + associated Evidence + relevant State Changes | Generated implementation report |
| Test or verification report | `Validation` + `Evidence` | Generated validation report |
| Screenshot evidence reference | `Evidence` whose payload points to the captured image | Optional rendered evidence index or attachment reference |
| Operator validation record | `Validation` for the observed result + `Decision` for the Operator disposition | Generated Operator validation/disposition report |
| Validate Passed record | `Decision` carrying the applicable accepted/passed disposition | Rendered decision entry within validation/work-item views |
| Request Repair record | `Decision` with `revision_requested` outcome; subsequent repair is a related Work Item | Rendered disposition and repair-chain view |
| Work/repair ancestry encoded in filenames or folders | Explicit `Relationship` objects such as `repairs`, `derived_from`, `part_of`, and `depends_on` | Human-readable lineage shown in rendered views |
| Artifact front matter and status fields | Canonical entity fields, lifecycle state, derived disposition state, timestamps, and provenance | Generated metadata header when useful to humans |
| Artifact filename or human ID | Canonical opaque entity ID plus optional alias/display ID | Friendly filename permitted, but it carries no canonical identity semantics |
| Archive folder location | Lifecycle state, supersession, lineage, and queryable history | Optional exported archive layout only |

### Artifact projection contract

A rendered Markdown artifact should identify enough projection metadata to establish what it represents without becoming authoritative itself. A projection may include:

```text
projectionType
projectionVersion
projectId
sourceEntityIds[]
generatedAt
```

These values describe the rendering. They do not replace the canonical record envelope.

The renderer may choose filenames, headings, tables, prose summaries, or formatting appropriate to the audience. A formatting or projection change does not create a semantic Project State revision.

### Mutation rule

Ordinary state changes must occur through domain operations such as `createEntity`, `reviseEntity`, `supersedeEntity`, `recordEvidence`, `recordValidation`, `recordDecision`, and `createRelationship`.

They must not occur through generic Markdown writes followed by reparsing.

If a user intentionally edits an exported Markdown document and wants those edits applied, ChampCity must treat that as an explicit import/change request. The application validates the proposed semantic changes and translates them into normal domain operations. The Markdown file itself never becomes a canonical write source for Project State.

### Documents that remain Markdown

This migration does not mean every Markdown document belongs in structured Project State.

Documents whose primary purpose is durable human-readable policy, architecture, governance, standards, design discussion, or repository guidance may remain conventional source-controlled Markdown. They are documents by nature rather than live Project State.

Such documents may influence application behavior through explicit configuration or product implementation, but their mere presence in a repository must not be interpreted as mutable Project State.

### Migration rule

During migration, legacy Markdown is an input source, not the destination model.

For each migrated artifact ChampCity should:

1. extract its semantic contents into the appropriate canonical entities and relationships;
2. retain the original source identifier/path and migration provenance;
3. retain the original Markdown as legacy Evidence where historical fidelity matters;
4. verify that the structured state can render an equivalent human-readable view; and
5. stop using the legacy Markdown as the canonical workflow-state source once that migration boundary is accepted.

Migration must not destroy the original historical source merely because its semantic contents have been extracted.

## 29. Logical Aggregate

At the highest level:

```text
Project
│
├── ProjectResource[]
├── Finding[]
├── RootCause[]
├── BoundedSolution[]
├── AcceptanceCriterion[]
├── WorkItem[]
├── Validation[]
├── Evidence[]
├── Decision[]
├── Relationship[]
└── StateChange[]
```

This is the canonical Project State domain.

Sessions, agents, model routing, tool invocation, execution workers, OAuth, MCP transport, Git commands, filesystem implementations, queues, service health, and similar runtime concerns remain outside this aggregate.

They can act upon Project State, but they do not define its semantics.

## 30. Architectural Boundary

The eventual Shared Product Core should expose something conceptually equivalent to:

```text
ProjectStateStore

getProject(...)
queryEntities(...)
getEntity(...)
createEntity(...)
reviseEntity(...)
supersedeEntity(...)
createRelationship(...)
endRelationship(...)
recordEvidence(...)
recordValidation(...)
recordDecision(...)
getCurrentDispositionState(...)
getLineage(...)
getCurrentProjectState(...)
```

The interface expresses domain operations rather than SQL operations.

A workstation-hosted Service Host could use:

```text
LocalProjectStateStore
```

while a server-hosted Service Host could use:

```text
ServerProjectStateStore
```

without changing the Project State domain itself or the web client.

That is the boundary that allows us to choose persistence technology later rather than letting today's database choice define the product architecture.
