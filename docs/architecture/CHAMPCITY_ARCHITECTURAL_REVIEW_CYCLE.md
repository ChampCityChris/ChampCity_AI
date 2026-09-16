# ChampCity A/I Architectural Review Cycle

**Status:** Adopted V2 architectural review pattern — September 14, 2026

**Date:** 2026-09-14

**Applies to:** ChampCity A/I V2 planning and bounded autonomous execution architecture

**Governed by:** `CHAMPCITY_AUTHORITY_AND_DELEGATION_GOVERNANCE.md`, `CHAMPCITY_GOVERNANCE_WITHOUT_BUREAUCRACY_STANDARD.md`, `CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md`

## 1. Purpose

ChampCity A/I should not rely on a single Architect pass when producing planning artifacts or executable implementation contracts. A strong Architect can still misunderstand repository evidence, over-design a solution, omit a downstream consequence, inherit a false assumption, or gradually drift away from the Operator's original intent.

This document defines a bounded three-turn **Architectural Review Cycle** that adds one independent set of technical eyes before implementation without creating an AI committee, an approval maze, or an unbounded debate loop.

The cycle is:

1. the **Architect** drafts the proposed solution or contract;
2. the **Design Reviewer** independently critiques that draft against the same governing intent and evidence; and
3. the **Architect** dispositions every critique, incorporates accepted corrections, and produces the final artifact.

The cycle ends after Turn 3. The Design Reviewer does not receive another rebuttal turn. Consensus is not required.

## 2. Architectural decision

ChampCity A/I SHALL support a bounded adversarial review pattern for material Architect-produced planning and implementation-contract artifacts.

The pattern SHALL use asymmetric roles rather than two co-equal Architects negotiating toward agreement.

The primary Architect remains responsible for architectural synthesis. The Design Reviewer is responsible for challenging the Architect's proposal. The Design Reviewer does not become a second discretionary product-decision principal, does not replace the Architect, and does not own final synthesis.

The standard interaction is:

```text
Operator Intent / Governing Project State
                 |
                 v
            ARCHITECT
              Turn 1
        Draft proposed artifact
                 |
                 v
         DESIGN REVIEWER
              Turn 2
       Produce bounded findings
                 |
                 v
            ARCHITECT
              Turn 3
  Disposition findings + final artifact
                 |
                 v
        IMPLEMENTATION PATH
```

There is no Turn 4 in the normal cycle.

## 3. Why the roles are asymmetric

Two agents with equivalent mandates to "find the best design" can produce an expensive and poorly bounded negotiation. They may repeatedly restate arguments, invent additional scope, converge on the same incorrect assumption, or treat agreement itself as evidence of correctness.

The Architectural Review Cycle instead gives each role a different objective.

### 3.1 Architect objective

The Architect answers:

> Given the established Operator intent, governing architecture, repository evidence, and current bounded objective, what should ChampCity build and how should the work be constrained and proven?

The Architect owns:

- repository and architecture investigation;
- bounded-solution design;
- technical tradeoff resolution within established product intent;
- runtime and state-flow design;
- acceptance-intent definition;
- production/test surface identification;
- creation of the proposed planning artifact or implementation contract; and
- final architectural synthesis after review.

### 3.2 Design Reviewer objective

The Design Reviewer answers:

> What is wrong, missing, unjustified, contradictory, unnecessarily complex, insufficiently proven, or materially risky in the Architect's proposed design?

The Design Reviewer is intentionally adversarial but evidence-bound. It SHOULD attempt to falsify the proposal rather than merely summarize or endorse it.

The Design Reviewer examines whether the Architect:

- actually solved the Operator's stated objective;
- remained within the established scope;
- preserved governing product and architectural decisions;
- relied on verified repository evidence rather than assumption;
- duplicated or bypassed an existing mechanism;
- introduced unnecessary infrastructure, indirection, ceremony, or bureaucracy;
- omitted production layers or downstream consumers needed for a complete solution;
- created incompatible state, persistence, API, runtime, UI, or lifecycle semantics;
- made an Operator-owned product decision without an established basis;
- asked the Operator to decide something that is ordinary architectural judgment;
- defined acceptance criteria that can actually prove the desired behavior;
- omitted important negative, failure, retry, migration, compatibility, or regression behavior;
- allowed the implementation contract to drift from its parent intent; or
- selected a materially inferior approach when a simpler or better-supported path is evident.

The Design Reviewer does not rewrite the artifact and does not issue workflow disposition.

## 4. Governing intent chain

The Design Reviewer MUST review against the complete applicable intent chain, not merely the artifact immediately above the draft.

For a Development Work Card, that chain may include:

```text
Operator product intent
        -> Project intent and architecture
        -> Phase intent
        -> Work Card Plan candidate
        -> proposed Formal Work Card
```

For Issue Resolution, it may include:

```text
Observed Issue
        -> established expected behavior
        -> Architect investigation / root cause
        -> Issue Resolution Plan
        -> Fix Card Plan candidate
        -> proposed Fix Card or Repair Card
```

This requirement protects against serial drift where every artifact is locally consistent with its direct parent while the workflow gradually diverges from the Operator's original objective.

ChampCity SHOULD assemble the governing intent and evidence package mechanically so both agents receive the same authoritative context rather than reconstructing different versions of the problem.

## 5. The three-turn protocol

### Turn 1 — Architect draft

The Architect receives the applicable context package and produces one proposed artifact.

The draft SHOULD explicitly distinguish:

- verified repository behavior;
- governing Operator/product intent;
- existing architectural constraints;
- proposed technical decisions;
- assumptions;
- unresolved material product questions, if any; and
- required validation/proof.

The Architect SHOULD resolve ordinary technical design questions itself when they fall within established intent and assigned scope.

The Architect MUST NOT create an Operator escalation merely because a technical decision is uncertain. Repository inspection, governing architecture, established design principles, and normal engineering judgment should be exhausted first.

### Turn 2 — Design Reviewer critique

The Design Reviewer receives:

- the same governing context available to the Architect;
- the exact Architect draft under review; and
- any deterministic context/freshness evidence ChampCity supplies.

The Reviewer produces bounded findings only. It does not produce a replacement architecture document.

Each material finding SHOULD contain:

```text
Finding ID
Severity
Affected requirement / design element
Evidence
Critique
Recommended correction
```

A finding should identify a concrete defect, omission, contradiction, unsupported assumption, risk, or superior alternative. Generic suggestions such as "consider adding more tests" or "consider improving error handling" are not useful findings unless tied to a specific requirement and evidence.

The Reviewer SHOULD also explicitly state when no material findings are established. It MUST NOT manufacture criticism merely to justify its existence.

### Turn 3 — Architect disposition and final artifact

The Architect receives the original context, its original draft, and all Design Reviewer findings.

The Architect MUST disposition every finding using exactly one semantic outcome:

- **ACCEPTED** — the finding is correct or materially improves the solution; the final artifact incorporates the correction.
- **REJECTED** — established evidence or governing architecture shows the critique should not alter the design; the Architect records the reason and supporting evidence.
- **ESCALATED** — the finding exposes a genuine material product/scope decision not resolved by existing Operator intent or governing architecture.

No finding may silently disappear.

The Architect then produces the final artifact incorporating every accepted correction and identifying any unresolved escalations.

A rejected finding is not a failure of the review cycle. The purpose of review is independent challenge, not forced agreement.

## 6. Finding disposition record

The disposition record SHOULD remain durable and auditable even when the final artifact is stored separately.

Example:

```text
DR-01 — ACCEPTED

Finding:
The proposed persistence layer duplicates the established repository-binding
mechanism.

Disposition:
Accepted. Required Changes now reuses the existing repository-binding service.

Evidence:
- governing architecture section ...
- repository implementation ...

DR-02 — REJECTED

Finding:
Add rollback behavior to this Work Card.

Disposition:
Rejected. The approved Work Card Plan assigns rollback/recovery to a later
candidate; adding it here would expand the current card beyond its bounded
objective.

Evidence:
- Work Card Plan WC04 ...

DR-03 — ESCALATED

Finding:
Existing approved intent does not establish whether the feature is enabled by
default for existing projects.

Disposition:
Escalated. Either behavior is technically viable and the choice changes product
behavior for existing users.
```

ChampCity MAY enforce structural completeness mechanically by requiring every emitted finding ID to have one disposition before the cycle can finalize.

That enforcement is artifact completeness, not a discretionary approval gate.

## 7. Operator escalation semantics

The Architectural Review Cycle exists partly to reduce unnecessary Operator interruption. Neither agent should manufacture human decisions simply because disagreement exists.

An item SHOULD reach the Operator only when the Architect concludes in Turn 3 that existing authoritative context cannot resolve a material choice that would:

- change product intent;
- materially expand current scope;
- adopt a significant product/architecture tradeoff not already established;
- accept a material residual risk or policy exception;
- contradict an explicit prior Operator decision; or
- require genuine human experiential/product judgment that cannot be established through evidence.

A Design Reviewer finding does not itself create an Operator escalation. The Architect must first determine whether repository evidence, governing architecture, or normal technical judgment resolves the concern.

If it does, the finding is ACCEPTED or REJECTED rather than ESCALATED.

This is consistent with `AUTH-16`, `AUTH-17`, and the default-to-proceed autonomy rules in the Authority and Delegation Governance Standard.

## 8. Relationship to the Validator

The Design Reviewer and Validator are distinct roles operating at different boundaries.

### Design Reviewer

Operates **before implementation**.

Primary question:

> Is this the right bounded design and implementation contract for the established intent?

Typical evidence:

- controlling intent;
- architecture/governance;
- repository evidence;
- planning artifacts;
- proposed Work/Fix/Repair Card;
- proposed acceptance criteria.

### Validator

Operates **after implementation**.

Primary question:

> Did the implementation actually satisfy the final contract, preserve required behavior, and provide sufficient evidence?

Typical evidence:

- final implementation contract;
- changed production/test surface;
- Implementer Report;
- deterministic validation results;
- runtime evidence;
- visual/interactive evidence when applicable;
- repository state and freshness.

The intended topology is:

```text
                    DESIGN REVIEWER
                          |
                          v
Intent -> Architect -> Final Contract
                          |
                          v
                     Implementer
                          |
                          v
                       Validator
```

The Design Reviewer protects against building the wrong solution well. The Validator protects against building the right solution incorrectly.

## 9. Relationship to the Implementer

The Implementer receives the final Architect artifact produced after Turn 3.

The Implementer does not receive unresolved Reviewer debate as an alternate source of requirements. Accepted corrections are incorporated into the final contract. Rejected findings remain review history. Escalated findings must be resolved before implementation when they materially affect the contract.

The Implementer remains responsible for faithful execution, implementation-local decisions within scope, and auditable implementation evidence.

The Implementer does not arbitrate disagreements between Architect and Design Reviewer.

## 10. Cycle limits and anti-bureaucracy rules

The standard cycle is exactly three turns:

```text
Architect Draft -> Design Review -> Architect Finalization
```

ChampCity MUST NOT automatically add:

- Reviewer rebuttal;
- Architect counter-rebuttal;
- consensus voting;
- a second Reviewer approval;
- an Operator approval merely because the Reviewer raised findings; or
- repeated review until all agents agree.

A later independent review cycle may occur only because a new workflow stage independently requires one, or because Operator direction explicitly reopens the design. It is not a continuation of the original three-turn conversation.

The purpose is to increase decision quality with bounded independent scrutiny, not to create an AI committee.

## 11. Applicability

The Architectural Review Cycle SHOULD be used where an Architect is making material technical design choices whose defects could propagate into implementation.

Likely applications include:

- Project or major capability architecture;
- Phase Planning;
- Issue root-cause and resolution planning;
- substantive Formal Work Cards;
- substantive Fix Cards;
- Repair Cards that change or clarify architecture rather than merely restoring an already-defined implementation; and
- migration, runtime, persistence, state-model, integration, or security-boundary design.

The cycle SHOULD NOT be required for purely deterministic mechanics, trivial generated artifacts, mechanical metadata updates, routine close records, or other work where independent semantic review adds negligible assurance.

ChampCity SHOULD eventually support a risk/materiality policy that determines when the cycle is useful rather than indiscriminately running two large-model calls on every artifact.

## 12. Model and runtime independence

The Architectural Review Cycle is role-defined, not provider-defined.

The Architect and Design Reviewer MAY use the same model with different role instructions. Future Agent Runtime Interface support SHOULD also permit different models or providers for the two roles.

Model diversity can reduce correlated blind spots, but it is not a correctness requirement and MUST NOT become an artificial provider gate.

The workflow contract should therefore identify required capabilities, context, and outputs rather than hard-code a particular model.

## 13. Structured state requirements

V2 Structured Project State SHOULD represent the review cycle as first-class bounded evidence rather than relying on an unstructured agent conversation transcript.

At minimum, the state model should be capable of representing:

- review-cycle identity;
- subject artifact identity and revision;
- governing source revisions;
- Architect draft revision;
- Design Reviewer findings;
- finding IDs and severity;
- Architect disposition for every finding;
- disposition rationale/evidence;
- final Architect artifact revision;
- unresolved escalations, if any;
- model/runtime provenance when telemetry policy permits; and
- timestamps and freshness relationships needed to establish that the review applied to the exact draft finalized.

A review against an older draft must not silently validate a newer Architect artifact.

## 14. Deterministic ChampCity responsibilities

ChampCity mechanics, rather than either agent, SHOULD own repeatable workflow facts including:

- exact artifact identity;
- revision/freshness checks;
- context package assembly;
- finding ID allocation;
- required finding-field/schema validation;
- one-to-one finding/disposition accounting;
- cycle turn count;
- prevention of an automatic fourth turn;
- durable review-state persistence;
- routing of genuine escalations; and
- transition to the Implementer only when the final artifact is structurally complete and no unresolved material escalation prevents execution.

This is deterministic orchestration, not discretionary product decision-making.

## 15. Failure and inconclusive behavior

The cycle should fail explicitly rather than manufacture confidence.

Examples include:

- required governing context is unreadable or stale;
- the Design Reviewer cannot inspect repository evidence required to substantiate a finding;
- the Architect fails to disposition every finding;
- the final artifact does not correspond to the reviewed draft/revision lineage;
- a material ESCALATED finding remains unresolved; or
- runtime/tool failure prevents a required review operation.

Mechanical failures should be retried or repaired mechanically where possible. A technical tool/runtime failure is not automatically an Operator decision.

## 16. Current Desktop relationship and V2 migration direction

Current ChampCity Desktop already contains fragments of this future topology:

- the Architect creates bounded planning artifacts and Work/Fix/Repair contracts;
- the Implementer is required to produce validation and acceptance evidence;
- current post-implementation Architect review independently inspects implementation evidence; and
- Operator validation currently creates individual Work/Fix Card validation disposition.

V2 should separate these concerns more cleanly:

1. move independent pre-implementation design challenge into the Design Reviewer role defined here;
2. move independent post-implementation conformance review into the Validator role;
3. preserve the Architect as final technical synthesizer of planning and contracts;
4. preserve the Implementer as execution owner; and
5. reserve Operator intervention for actual Operator Decision boundaries and meaningful human acceptance, rather than routine card-level engineering review.

This document does not require a literal port of the current Desktop workflow. It defines the target review semantics for V2.

## 17. Architectural invariants

Any implementation of this cycle MUST preserve the following invariants:

1. The human Operator is the only authority.
2. The Architect remains responsible for final architectural synthesis.
3. The Design Reviewer provides independent critique but does not own Operator disposition or workflow transition eligibility.
4. The cycle is bounded to three turns under normal operation.
5. Every Reviewer finding receives an explicit Architect disposition.
6. Consensus is not required.
7. Rejected findings require evidence-grounded rationale.
8. Escalation is reserved for genuine unresolved product/scope decisions.
9. Implementers receive one final governing contract, not competing agent opinions.
10. Post-implementation validation remains independent of pre-implementation design review.
11. ChampCity owns deterministic orchestration and evidence relationships.
12. Review must preserve exact artifact revision/freshness semantics.
13. Independent review must not become a new discretionary decision owner or approval hierarchy.
14. The cycle should run only where its assurance value justifies its inference cost.

## 18. Target outcome

The Architectural Review Cycle should allow ChampCity A/I to gain the benefits of multi-agent architectural reasoning without inheriting the failure modes of open-ended multi-agent debate.

The intended outcome is:

```text
one Architect responsible for synthesis
+ one independent adversarial review
+ one final evidence-grounded disposition pass
= stronger bounded design before implementation
```

The system should challenge its own architecture before spending implementation effort, while keeping the Operator's decision role, workflow responsibility, and escalation boundaries explicit.