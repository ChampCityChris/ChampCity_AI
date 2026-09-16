# ChampCity A/I Governance Without Bureaucracy Standard

| Document control | Value |
| --- | --- |
| Standard ID | `CCAI-GOV-001` |
| Version | `1.0` |
| Status | **Adopted by Operator — September 14, 2026** |
| Intended location | `docs/governance/CHAMPCITY_GOVERNANCE_WITHOUT_BUREAUCRACY_STANDARD.md` |
| Scope | ChampCity A/I workflow design, Project State, Work Items, validation, runtime/tooling, repository mechanics, approvals, automation, and V2 reconstruction |
| Accountable owner | ChampCity Product Owner / Operator |
| Application | Architects, Implementers, reviewers, AI workers, workflow designers, Product Core, service contracts, MCP/tool adapters, runtime adapters, and future autonomous orchestration |

## 1. Purpose

ChampCity governance exists to preserve intent, constrain AI behavior, protect important invariants, create reproducible evidence, and make work recoverable.

It must not create ceremony for its own sake.

The governing distinction is:

> **Governance defines responsibility, scope, constraints, evidence, and genuine Operator decision boundaries. Bureaucracy adds permission steps that do not change Operator intent, reduce meaningful risk, or improve evidence.**

V2 architecture MUST prefer the minimum governance necessary to obtain predictable, safe, inspectable execution.

## 2. Normative language

**MUST / MUST NOT** identify requirements. **SHOULD / SHOULD NOT** identify the preferred approach; departure requires a concrete reason. **MAY** identifies an option.

This standard supplements `CCAI-AUTH-001` and adopts `CCAI-VOCAB-001` (`CHAMPCITY_GOVERNANCE_VOCABULARY.md`) as its normative vocabulary. If a workflow or infrastructure design introduces an approval or disposition step, it must be justified by an actual Operator decision, safety, risk, or evidence requirement rather than implementation convenience.

## 3. Core governance principles

### GOV-01 — Governance must have a purpose

Every mandatory step in a ChampCity workflow MUST serve at least one concrete function:

- capture intent;
- bound scope;
- establish responsibility;
- enforce a deterministic invariant;
- produce required evidence;
- protect a genuine Operator decision boundary;
- enable reliable recovery/resumption; or
- satisfy an explicit product/project policy.

If a mandatory step cannot be tied to one of these functions, it should not exist.

### GOV-02 — Do not invent authority holders

ChampCity MUST NOT create independent approval owners for mechanisms that merely implement already-governed work.

Examples of prohibited authority invention include treating the following as discretionary principals:

- MCP;
- Git;
- RepositoryService;
- Agent Runtime;
- tool broker;
- schema;
- test suite;
- validation engine;
- artifact contract; or
- persistence layer.

These systems enforce or report. They do not acquire sovereignty.

### GOV-03 — Do not reauthorize the same intent

Once the Operator has directed an outcome/scope, downstream workflow steps MUST NOT repeatedly request approval for ordinary consequences of that decision.

Examples:

- implementation scope should normally cover required file edits;
- scoped repository work should normally cover ordinary deterministic Git lifecycle;
- approved Repair execution should normally cover focused regression validation;
- an approved bounded solution should not require a new approval because a deterministic service performs the action rather than an AI worker.

A renewed decision is justified only when the meaning of the work changes or an actual reserved boundary is crossed.

## 4. Minimal-governance workflow design

### GOV-04 — Default workflow shape

The preferred governed lifecycle remains:

```text
Capture -> Frame -> Plan -> Build -> Prove
```

These phases describe semantic responsibilities, not mandatory numbers of clicks, agents, documents, or approvals.

Within a phase, ChampCity SHOULD automate transitions that are mechanically provable and already authorized.

### GOV-05 — Work Items are execution contracts, not forms to be serviced

A Work Item should contain only information needed to execute and prove the bounded objective.

Required content should be limited to things such as:

- objective;
- scope;
- relevant architecture decision;
- explicit constraints/forbidden changes;
- preservation requirements;
- acceptance criteria;
- relevant evidence/context references; and
- return/validation expectation where applicable.

Do not require fields merely because a historical Markdown template had them.

### GOV-06 — Reports should be generated from evidence where possible

ChampCity SHOULD capture deterministic execution facts automatically:

- commands;
- working directory/environment;
- exit status;
- changed files;
- source revisions;
- test results;
- hashes;
- runtime/model identity;
- usage/cost telemetry; and
- timestamps.

AI workers should provide semantic explanation, deviations, blockers, residual risks, and judgment-based assessment.

Future structured reporting SHOULD render human-readable reports from these records rather than requiring models to manually reproduce bookkeeping.

## 5. Approval and validation discipline

### GOV-07 — Human approval is a scarce semantic resource

Human approval SHOULD be requested only when human judgment changes the legitimate outcome.

Good reasons include:

- product/scope decision;
- material architecture tradeoff requiring Product Owner choice;
- policy exception;
- material residual-risk acceptance;
- destructive/irreversible recovery choice;
- genuine visual/experiential judgment; or
- release/publication policy explicitly requiring Operator disposition.

Poor reasons include:

- a tool is mutating;
- a Git commit is about to be created;
- a deterministic test completed;
- an agent changed files within authorized scope;
- a Repair passed focused checks;
- a runtime needs to invoke an already-authorized service;
- an internal contract did not enumerate every downstream mechanic.

### GOV-08 — Validation should occur at the lowest useful frequency

Validation MUST be sufficient to protect correctness, but MUST NOT be duplicated simply because the workflow has multiple artifacts.

Rules:

- deterministic checks run as often as needed by technical risk;
- semantic independent review runs where it adds meaningful assurance;
- Work/Repair validation does not require Operator approval by default;
- human visual validation is required only when the criterion truly needs human visual/experiential judgment;
- visual validation MAY be deferred and aggregated at Phase validation when repeated card-level inspection would add little risk reduction; and
- Phase/Project validation should not re-run lower-level checks without a concrete integration/regression reason.

### GOV-09 — Failed validation creates corrective work, not a permission maze

A failed validation should produce the narrowest required corrective path.

If the defect remains within the governing Work Item/bounded solution, ChampCity may create and execute subordinate repair work without asking the Operator to reauthorize the original intent.

Escalate only when the repair requires material scope expansion, changes product intent, crosses policy, or reaches configured autonomy/resource limits.

## 6. Deterministic enforcement without bureaucracy

### GOV-10 — Fail closed on known invariants

Fail-closed behavior is required for real safety boundaries such as:

- repository/path containment;
- stale source/revision checks;
- illegal workflow transitions;
- unsupported sandbox enforcement;
- resource-scope mismatch;
- malformed/invalid structured state; and
- explicit prohibited actions.

The error should identify the concrete rule that failed and, where possible, the deterministic remediation.

### GOV-11 — Fail closed is not “ask a human whenever uncertain”

ChampCity MUST NOT treat uncertainty in a mechanical implementation detail as a reason to create a new approval gate.

If the uncertainty can be resolved by:

- repository inspection;
- deterministic probing;
- runtime capability negotiation;
- schema validation;
- source-state comparison;
- retry/outcome reconciliation; or
- bounded technical judgment already delegated to Architect/Implementer,

then ChampCity should resolve it through that mechanism.

Human escalation is for genuine Operator judgment boundaries, not as a generic fallback for incomplete software design.

### GOV-12 — Error taxonomy must identify the real boundary

Do not collapse unrelated failures into `AUTHORITY_DENIED`.

Use specific categories such as:

```text
SCOPE_VIOLATION
CONSTRAINT_VIOLATION
RESOURCE_SCOPE_VIOLATION
POLICY_VIOLATION
CAPABILITY_UNSUPPORTED
STATE_TRANSITION_INVALID
STALE_SOURCE
OPERATION_OUTCOME_UNKNOWN
OPERATOR_DECISION_REQUIRED
```

Only the final category represents a genuine Operator decision requirement.

## 7. Tooling and Git

### GOV-13 — Tools are implementation surfaces

Tool schemas and runtime capabilities SHOULD be designed around the minimum capabilities needed for the task.

However, capability minimization must not be used to create prose-heavy or approval-heavy workflows around deterministic operations the orchestrator already knows how to perform.

If ChampCity knows when an operation must happen, ChampCity should invoke the owning service directly rather than making the model request permission-like tool calls step by step.

### GOV-14 — Git should be policy-driven and automatic

Routine Git/source-control lifecycle SHOULD be driven by workflow/repository policy.

Examples:

```text
Work begins
  -> prepare authorized branch/worktree if policy requires

Work completes
  -> calculate changed files
  -> run readiness checks
  -> stage authorized changes
  -> create commit if workflow policy requires
  -> push/integrate when applicable
  -> persist source-control receipt
```

A Work Item may explicitly say `No Git mutation this turn`; that constraint MUST be respected.

Otherwise Git should not require a new approval simply because the operation mutates repository metadata/history.

### GOV-15 — Destructive mechanics need stronger deterministic controls, not generic bureaucracy

Reset, destructive restore, force operations, branch deletion, data deletion, rollback across authoritative state, or similar operations may require stricter policy, confirmation, checkpointing, or Operator decision depending on potential loss.

The requirement should be proportional to the destructive risk and stated explicitly. Do not use the existence of destructive Git operations as justification for gating every benign Git operation.

## 8. Architect and Implementer behavior

### GOV-16 — Architect should decide technical questions within delegated scope

An Architect SHOULD resolve technical architecture, RCA, and bounded-solution questions directly when existing Operator intent and governing architecture provide enough direction.

The Architect SHOULD ask the Operator a focused question when different answers would materially change product behavior, scope, risk tolerance, human experience, or another Operator-owned concern.

The Architect MUST NOT preserve every uncertainty as an “open design dependency” merely to avoid making a technical decision.

### GOV-17 — Implementer should implement, not administrate the workflow

An Implementer should spend its effort on source changes, focused diagnostics, tests, and semantic reporting.

It SHOULD NOT be required to:

- manually maintain derived scope/state/decision metadata;
- generate IDs/hashes/timestamps;
- reconstruct workflow state from prose;
- manually perform routine source-control bookkeeping;
- duplicate evidence already captured by ChampCity; or
- seek additional approval for ordinary local implementation decisions inside the bounded solution.

### GOV-18 — Scope drift is different from local implementation judgment

Implementers and Architects must stop/escalate for material scope expansion.

They do not need to stop for every small implementation choice that was not literally enumerated in the Work Item.

A useful test is:

> Does this choice change the Operator-directed product outcome, architecture boundary, risk profile, or affected subsystem in a material way?

If no, it is generally assigned technical judgment within scope.

## 9. Automation and autonomy

### GOV-19 — Autonomous progression is normal inside bounded scope

ChampCity SHOULD automatically continue through legal actions, role transitions, repairs, and validation when all of the following are true:

- work remains within Operator-directed scope;
- no Operator-reserved decision is reached;
- deterministic invariants pass;
- runtime/environment policy can enforce constraints; and
- configured attempt/cost/time budgets remain available.

### GOV-20 — Budgets stop runaway work, not create recurring approvals

Autonomy budgets may limit:

- repair attempts;
- elapsed execution time;
- token/cost consumption;
- repeated identical failures; and
- defect genealogy depth.

Crossing a configured limit stops/escalates work. Being below the limit does not require repeated Operator consent.

## 10. Governance design review test

Any proposed V2 workflow, service, tool, policy, or contract that adds a required step should answer:

1. What concrete risk, Operator decision boundary, evidence need, or invariant does this step protect?
2. Is the step performing judgment, or merely repeating information ChampCity already knows?
3. Can deterministic code enforce the requirement without human interruption?
4. Has the Operator already directed the underlying intent and scope?
5. Does this step invent an authority holder for a mechanism that should only enforce policy?
6. Would removing the step materially increase risk or reduce evidence quality?
7. Could the same protection be obtained with a clearer error, receipt, state check, or automatic transition?

If the step has no strong answer, remove it.

## 11. Prohibited bureaucracy patterns

The following patterns MUST NOT become V2 defaults:

- approval because an operation is mutating;
- Architect approval of routine Implementer mechanics;
- Implementer approval of system mechanics;
- MCP/Runtime/contract-generated approval or permission gates;
- positive per-action permission enumeration for every normal implementation step;
- manual Git ceremony when repository policy can automate it;
- repeated human validation of the same evidence without a new semantic question;
- card/report documents whose main purpose is copying deterministic metadata;
- multiple disposition layers where only one role actually owns the decision;
- global blocking because an unrelated validation lane failed;
- treating every architecture uncertainty as an Operator decision; and
- making users reconfirm already-directed work after reconnect/retry when operation identity/outcome can be reconciled mechanically.

## 12. Acceptable governance patterns

ChampCity SHOULD prefer:

- one explicit decision-responsible role per discretionary decision while the Operator remains the sole product authority;
- bounded delegation;
- minimum legal capability exposure;
- deterministic containment and policy enforcement;
- typed state transitions;
- operation receipts and idempotency;
- automatic evidence capture;
- independent semantic review where it meaningfully improves correctness;
- aggregated human validation where repeated validation adds little value;
- specific errors with deterministic remediation; and
- autonomous continuation until a genuine Operator Decision/risk boundary is reached.

## 13. Acceptance criteria

V2 governance conforms to this standard when:

1. every mandatory workflow gate has a stated semantic purpose;
2. infrastructure does not become an approval principal;
3. Operator-directed implementation does not require repeated approvals for ordinary mechanics;
4. non-visual Work/Repair validation can complete without Operator disposition;
5. visual confirmation can be aggregated at Phase level when appropriate;
6. Git/repository mechanics are policy-driven and deterministic;
7. errors distinguish `OPERATOR_DECISION_REQUIRED` from scope, constraint, capability, access, state, and technical failures;
8. Architects resolve delegated technical decisions rather than escalating reflexively;
9. Implementers are not burdened with deterministic bookkeeping;
10. autonomous execution proceeds until a real Operator Decision boundary, blocker, or configured resource guardrail; and
11. removing a gate is treated as an improvement when its risk/evidence purpose can be preserved mechanically.

## 14. Final rule

> **Use governance to bound AI, preserve intent, and prove outcomes. Do not use governance to make already-directed work ask for permission again.**
