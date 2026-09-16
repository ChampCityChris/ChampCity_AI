# ChampCity A/I Authority and Delegation Governance Standard

| Document control | Value |
| --- | --- |
| Standard ID | `CCAI-AUTH-001` |
| Version | `1.0` |
| Status | **Adopted by Operator — September 14, 2026** |
| Intended location | `docs/governance/CHAMPCITY_AUTHORITY_AND_DELEGATION_GOVERNANCE.md` |
| Scope | ChampCity A/I Product Core, Desktop, Server, shared client, Workflows, Agent Runtime, MCP/tools, Repository Management, Project State, Skills, and automation |
| Accountable owner | ChampCity Product Owner / Operator |
| Application | Operator, Architect, Implementer, reviewers, AI workers, deterministic services, runtimes, adapters, MCP/tool surfaces, and future autonomous orchestration |

## 1. Purpose

ChampCity requires governance because AI workers need explicit boundaries, durable intent, and deterministic constraints. Governance must not become a second product whose primary behavior is asking for permission.

This standard defines where authority resides, how execution responsibility and scope are delegated, what infrastructure may enforce, and which events actually require renewed Operator disposition. Canonical terminology is defined by `CCAI-VOCAB-001` (`CHAMPCITY_GOVERNANCE_VOCABULARY.md`) and is normative for this standard.

The governing principle is:

> **The Operator is the authority. The Operator delegates work, not authority; ChampCity constrains execution.**

ChampCity must preserve human product authority while allowing Operator-directed work to proceed without repeated approval of ordinary mechanics.

## 2. Normative language

**MUST / MUST NOT** identify requirements. **SHOULD / SHOULD NOT** identify the preferred approach; departure requires a concrete reason. **MAY** identifies an option.

This standard governs new V2 architecture and should be applied when extracting or rewriting V1 behavior. Existing V1 mechanics that contradict it are migration targets; their existence does not establish architectural precedent.

## 3. Authority model

### AUTH-01 — The Operator is the sole source of product authority

The Operator owns final authority over:

- product intent and desired outcomes;
- scope expansion or material scope reduction;
- material product and architectural choices where alternatives change the intended product;
- acceptance of material residual risk;
- policy exceptions;
- destructive recovery or irreversible loss when judgment is required;
- visual/experiential acceptance where human judgment is actually necessary; and
- release/publication decisions explicitly reserved by product policy.

No AI role, service, runtime, contract, tool, repository, test, or validation result becomes an independent source of product authority.

### AUTH-02 — Delegation transfers work, not authority

The Operator may delegate work through a Work Item, workflow decision, bounded solution, project policy, or equivalent structured state.

Delegation assigns execution responsibility and, where applicable, bounded technical judgment required to achieve the directed outcome within the stated scope and constraints.

Delegation never transfers or creates authority. The Operator remains the authority throughout execution.

### AUTH-03 — Scope and constraints flow downward; authority does not

Once the Operator has directed a Work Item or bounded solution, ChampCity MUST NOT require repeated human approval for actions that are:

1. within that defined scope;
2. consistent with explicit constraints;
3. permitted by repository/environment/runtime policy; and
4. not independently reserved to the Operator by this standard.

The system should continue through legal implementation, deterministic mechanics, evidence capture, automated validation, review, repair, and internal workflow transitions without manufacturing additional approval events.

## 4. Role responsibilities

### AUTH-04 — Operator

The Operator:

- defines product intent;
- decides material scope/product questions;
- may approve, reject, or redirect proposed bounded solutions;
- owns material exceptions and residual-risk acceptance;
- performs human validation only where human judgment is actually required; and
- may override or reopen prior product decisions explicitly.

The Operator is not expected to approve routine mechanics already implied by the directed work and applicable policy.

### AUTH-05 — Architect

The Architect owns advisory technical judgment, including:

- investigation and evidence interpretation;
- root-cause analysis;
- architecture and bounded-solution design;
- technical tradeoff analysis;
- acceptance-intent definition;
- independent implementation review; and
- recommendations to the Operator where product authority is required.

Within established product intent and assigned technical scope, the Architect MAY make ordinary technical design decisions necessary to produce a bounded solution.

The Architect MUST NOT:

- invent a new Operator approval step merely because work is mutating;
- treat its recommendation as Operator authority;
- reserve routine Git, testing, repository, environment, or implementation mechanics to itself;
- create authority for MCP, Runtime, contracts, or tools; or
- convert uncertainty about implementation detail into a human approval gate when the decision is within assigned technical scope.

### AUTH-06 — Implementer

The Implementer owns execution within the current Work Item or bounded solution.

The Implementer MAY make ordinary local implementation decisions necessary to satisfy the directed objective, provided they do not materially expand scope, contradict architecture, violate constraints, or make decisions reserved to the Operator.

The Implementer MUST NOT:

- redesign product intent;
- materially expand current scope without escalation;
- self-approve an Operator-reserved exception;
- fabricate validation/evidence; or
- create new approval gates for ordinary mechanics.

### AUTH-07 — Reviewer and Validator

Reviewers and Validators produce evidence, assessment, and semantic judgment.

A validation result is a fact or assessment. It is not automatically an authority grant.

Routine Work/Repair validation does not require Operator disposition when all applicable criteria can be satisfied through deterministic proof and/or required independent semantic review. Human validation should be requested only where the criterion actually requires human visual, experiential, policy, or product judgment.

Visual confirmation MAY be aggregated and deferred to Phase validation when per-Work-Item visual confirmation provides no meaningful risk reduction.

### AUTH-08 — ChampCity automation

ChampCity owns deterministic mechanics and enforcement, including:

- identity generation;
- hashes and revisions;
- state-machine legality;
- repository containment;
- Git mechanics;
- source freshness;
- schema/type validation;
- dependency/readiness calculation;
- evidence capture;
- operation idempotency;
- runtime/sandbox enforcement;
- usage accounting; and
- other repeatable mechanical checks.

ChampCity may deny an operation that violates a known invariant or explicit constraint. It may not convert mechanical enforcement into an independent approval hierarchy.

## 5. Infrastructure does not own authority

### AUTH-09 — Mediation does not create authority

> **Infrastructure cannot acquire authority merely because it mediates an action.**

The following are mechanisms, not product principals:

- Git;
- RepositoryService;
- MCP;
- Agent Runtime;
- tool brokers;
- Skills;
- schemas;
- contracts;
- sandboxes;
- tests;
- validation engines;
- persistence adapters;
- CI systems; and
- transport layers.

They may enforce scope, policy, capabilities, and invariants. They may not introduce a new approval requirement unless the governing product policy explicitly defines that approval as an Operator-reserved decision.

### AUTH-10 — Contracts record scope and constraints; they do not own authority

A contract may state that an action is required, prohibited, constrained, or within the current scope. That statement records Operator direction, task scope, or product/workflow policy.

A contract MUST NOT be modeled as an authority principal that grants or withholds discretionary permission. It carries instructions and constraints; the Operator remains the authority.

### AUTH-11 — Capability is not authority

Possession of a capability does not place its use inside the current task scope.

Absence of a dedicated capability does not by itself prove an action is forbidden if the governing workflow expects ChampCity to perform the same mechanical effect through another deterministic service.

Effective execution remains bounded by the intersection of:

```text
Operator-directed work scope
∩ explicit constraints
∩ service/resource policy
∩ capability exposure
∩ runtime/sandbox enforcement
```

## 6. Scope and constraints

### AUTH-12 — Explicit constraints bind current work

Examples:

```text
No Git mutation this turn.
Do not modify renderer code.
Only edit files under package X.
Do not create a new schema.
Do not access Repository Y.
```

These are constraints on the current execution.

They do not create a new authority owner for Git, renderer code, schema operations, or Repository access.

### AUTH-13 — Known prohibition denies; missing enumeration does not create a gate

ChampCity MUST fail closed when a known invariant or explicit prohibition would be violated.

Examples:

```text
Requested path escapes authorized Repository -> DENY
Work Item explicitly prohibits Git mutation -> DENY
Required runtime cannot enforce sandbox -> DENY/INELIGIBLE
State transition is illegal -> DENY
```

However:

> **Within Operator-directed scope, the absence of an explicit per-action permission is not itself a reason to invent a new approval gate.**

A system must not require every ordinary implementation mechanic to appear on a positive allowlist merely to avoid an invented human approval step.

## 7. Git and repository mechanics

### AUTH-14 — Git behavior derives from work scope and repository policy

Git is a deterministic repository mechanic.

If governing work explicitly prohibits Git mutation, ChampCity MUST not perform Git mutation for that execution.

Otherwise, normal Git operations required by the current task and applicable workflow/repository policy MAY proceed without a separate Architect, MCP, Runtime, or repeated Operator approval step.

Examples of normal deterministic mechanics include:

- status/diff inspection;
- branch/worktree preparation;
- staging scoped changes;
- commit creation;
- integration;
- push when project/release policy permits; and
- source-control receipts.

A workflow may reserve publication/release to the Operator without turning every earlier Git action into an approval event.

### AUTH-15 — Repository containment is enforcement, not bureaucracy

Repository identity, path containment, worktree leases, branch policy, and destructive-operation safeguards MUST be enforced mechanically.

Failure of a containment or safety invariant should produce a clear error describing the violated rule. It should not produce a vague discretionary `AUTHORITY_DENIED` when no human authority decision is actually involved.

## 8. Operator decision boundaries

### AUTH-16 — Events that may require Operator disposition

Operator disposition is appropriate when an action would:

- materially change product intent;
- expand scope beyond the current bounded solution;
- adopt a material architecture/product tradeoff not already established by Operator direction or governing design;
- accept material residual risk or policy exception;
- perform destructive recovery with meaningful loss or ambiguity;
- require genuine human visual/experiential judgment that cannot be proven otherwise; or
- publish/release where project policy explicitly reserves publication to the Operator.

### AUTH-17 — Events that do not inherently require Operator disposition

The following do not, by themselves, require an Operator decision:

- a file is writable;
- a tool is mutating;
- a Git operation is needed;
- a test passes or fails;
- an automated validation completes;
- an Implementer finishes a Work Item;
- a Repair passes its criteria;
- an Architect review passes;
- an internal worker transition occurs;
- an environment is provisioned within approved requirements;
- a runtime retries/reconnects within approved policy;
- evidence is captured; or
- a deterministic state transition becomes eligible.

## 9. Autonomous execution

### AUTH-18 — Default to proceed within bounded scope

Within Operator-directed scope, ChampCity SHOULD proceed autonomously through legal deterministic and assigned actions until it reaches:

- an actual Operator-reserved decision;
- material scope expansion;
- an unrecoverable blocker;
- a configured attempt/cost/time guardrail; or
- a runtime/environment condition that makes safe execution impossible.

Configurable autonomy budgets are safety/resource controls, not recurring approval requirements.

### AUTH-19 — Repair loops inherit scope and constraints

A repair derived from failed validation remains subordinate to the governing Work Item and bounded solution.

When the defect and corrective scope remain within that boundary, ChampCity may create/execute/review/validate repairs autonomously according to configured limits.

A repair requires renewed Operator disposition only when correction would require a genuine Operator decision defined in this standard.

## 10. Error taxonomy

### AUTH-20 — Errors must identify the real boundary

ChampCity should distinguish at least:

- `SCOPE_VIOLATION` — requested work exceeds current scope;
- `CONSTRAINT_VIOLATION` — explicit task/project prohibition would be violated;
- `RESOURCE_SCOPE_VIOLATION` — Project/Repository/Environment containment failure;
- `POLICY_VIOLATION` — deterministic policy forbids the operation;
- `CAPABILITY_UNSUPPORTED` — required capability cannot be provided;
- `STATE_TRANSITION_INVALID` — workflow/state-machine rule rejects the transition;
- `OPERATOR_DECISION_REQUIRED` — a genuine reserved human decision is required.

`AUTHORITY_DENIED` SHOULD NOT be used as a catch-all for unrelated technical, scope, capability, or policy failures.

## 11. Architectural acceptance criteria

The authority model is correctly implemented when:

1. the Operator is the only authority;
2. delegated work proceeds without repeated reauthorization of ordinary mechanics;
3. Architect and Implementer responsibilities are explicit but do not become competing approval authorities;
4. infrastructure mediates/enforces but never becomes an authority principal;
5. constraints are enforced without being converted into approval ownership;
6. Git follows current work scope and repository policy rather than a separate authority subsystem;
7. routine non-visual Work/Repair validation can complete autonomously;
8. human visual validation can be aggregated at Phase level where appropriate;
9. fail-closed behavior protects known invariants without treating missing permission enumeration as a new gate;
10. error messages identify the actual violated boundary; and
11. Operator intervention occurs only at semantically meaningful product/risk/human-judgment boundaries.

## 12. Final rule

> **One authority: the Operator. Bounded scope. Deterministic enforcement. No infrastructure-created authority.**

ChampCity governance exists to make AI work safely and predictably. It must not turn already-authorized work into a sequence of redundant permission requests.
