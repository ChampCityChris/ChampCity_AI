# ChampCity Tester Role and Test Lifecycle Architecture

**Status:** Adopted V2 target architecture; implementation deferred until after immediate test-suite recovery  
**Evidence date:** 2026-09-21  
**Scope:** Permanent regression ownership, Implementer-local proof, Tester role, test lifecycle determination, and long-term suite efficiency  
**Related architecture:** `CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`, `CHAMPCITY_ARCHITECTURAL_REVIEW_CYCLE.md`, `CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md`

## 1. Purpose

ChampCity must distinguish evidence used to implement one Work Item from regression evidence that deserves to remain in the product indefinitely.

The existing suite accumulated Work Card acceptance scenarios, characterization paths, integration proofs, platform tests, and durable regressions into one permanent corpus. The September 21, 2026 timing audit demonstrated the consequence: a small number of historical lifecycle scenarios dominate suite cost because they reconstruct complete workflows long after the originating implementation was completed.

This architecture introduces a first-class **Tester** role and a **Test Lifecycle Determination** system.

The core decision is:

> Implementers may create whatever bounded tests and instrumentation they need to prove their work, but Implementer-created proof does not automatically become permanent regression infrastructure.

The Tester owns the judgment of what belongs in the permanent regression corpus.

This architecture complements, rather than replaces, the existing validation execution architecture:

- **Test Lifecycle Architecture** decides what permanent proof should exist.
- **Validation Execution Architecture** decides which existing permanent proof should run for an exact change and workflow boundary.
- **Validator** determines whether the completed implementation satisfies its contract with sufficient evidence.
- **Operator** remains the only authority over product intent, material scope, risk acceptance, and other genuine human decisions.

## 2. Problem Statement

The prior workflow implicitly coupled three different concerns:

1. the Implementer needed proof while building;
2. the Work Item needed acceptance evidence;
3. the repository needed durable regression protection.

Because all three commonly produced files under the permanent `test/` corpus, successful Work Cards tended to increase permanent test count. There was no corresponding lifecycle that routinely removed historical acceptance proof after its durable invariants were captured elsewhere.

This creates predictable failure modes:

- a Work Card-specific end-to-end scenario becomes permanent merely because it was useful once;
- several later Work Cards reconstruct the same full lifecycle to prove different local assertions;
- characterization tests survive after the architecture they characterized is intentionally replaced;
- redundant proof accumulates even when a newer test protects the same behavior at a better boundary;
- expensive fixtures become a permanent execution tax;
- test-count growth is mistaken for increasing safety;
- Implementers naturally preserve their own proof because they are focused on demonstrating their implementation, not governing the long-term corpus.

The permanent suite must represent the **current product's durable regression obligations**, not the historical record of every implementation exercise.

## 3. Governing Principles

### 3.1 Implementation proof is not permanent proof

A test is not entitled to permanent repository residency merely because it helped complete a Work Item.

Implementation-local tests are disposable engineering tools unless the Tester establishes a continuing regression obligation.

### 3.2 Permanent tests protect durable invariants

Permanent regression tests SHOULD prove stable behavior contracts such as:

- state transition rules;
- identity and lineage preservation;
- failure containment;
- source-control safety;
- persistence/freshness semantics;
- user-visible behavior;
- protocol boundaries;
- platform obligations;
- security or recovery invariants.

They SHOULD NOT preserve the historical narrative of a specific Work Card when the same invariant can be proved directly and more cheaply.

### 3.3 No automatic test-count growth

A completed Work Item does not imply a new permanent test.

`NO_PERMANENT_TEST_REQUIRED` is a valid Tester result when existing proof already protects the durable behavior or the implementation introduced no new continuing regression obligation.

### 3.4 Cost is evidence, not deletion authority

A slow test deserves review, but slowness alone does not justify deletion.

Retirement or consolidation requires evidence that the protected behavior is obsolete, superseded, unreachable, redundant, or adequately protected elsewhere.

### 3.5 Historical acceptance remains evidence without remaining executable

When a temporary implementation test helped establish that a Work Item passed, its result remains part of the Work Item's evidence history even if the executable test itself is later discarded.

### 3.6 One broad acceptance sentinel is different from many historical acceptance replays

A small number of deliberate end-to-end sentinels may remain where cross-system composition itself is a durable risk.

Those sentinels belong to explicit wider validation profiles. They are not justification for reproducing the same lifecycle in every capability owner.

## 4. Role Model

### 4.1 Operator

The Operator remains the only human authority.

The Tester does not become an approval principal and does not create a new human gate. The Operator is involved only where a genuine product, risk, policy, visual, experiential, or material scope decision requires human judgment.

### 4.2 Architect

The Architect defines the intended behavior, bounded solution, architectural constraints, and acceptance criteria.

The Architect may identify known regression obligations, but does not prescribe permanent test quantity as a proxy for quality.

### 4.3 Design Reviewer

The Design Reviewer operates before implementation and challenges whether the proposed design and contract correctly satisfy the controlling intent.

It does not design the permanent regression suite.

### 4.4 Implementer

The Implementer owns:

- production implementation;
- implementation-local technical decisions inside the bounded contract;
- temporary tests and instrumentation needed during implementation;
- focused proof that the implementation behaves as claimed;
- semantic implementation reporting.

The Implementer MAY freely create temporary unit tests, integration drivers, fixture builders, one-off scripts, logging, counters, or Work Card-specific acceptance scenarios.

By default, those artifacts are **implementation evidence**, not permanent regression tests.

The Implementer MUST NOT assume that a newly created test belongs in the permanent `test/` corpus.

### 4.5 Tester

The Tester is an independent post-implementation engineering role responsible for permanent regression design.

Primary question:

> What continuing regression obligations does this implementation create or change, and what is the smallest trustworthy permanent proof that protects them?

The Tester receives:

- final implementation contract;
- governing architecture and Operator direction;
- production changes;
- Implementer Report / structured implementation result;
- temporary implementation tests and their results;
- existing ValidationCatalog;
- existing permanent tests mapped to affected capabilities;
- known defects and prior regression evidence;
- measured execution cost and test characteristics where available.

The Tester may modify the permanent test corpus but MUST NOT modify production behavior to make a test pass.

### 4.6 Validator

The Validator remains independent from the Tester.

Primary Validator question:

> Did the completed implementation satisfy the final contract, preserve required behavior, and provide sufficient evidence?

The Tester designs the durable proof corpus. The Validator evaluates conformance using deterministic receipts, permanent regression proof, runtime evidence, and other applicable evidence.

A Tester result is not itself workflow approval.

## 5. Target Workflow

The target topology becomes:

```text
Intent
  |
  v
Architect -> Design Reviewer -> Architect Final Contract
                                      |
                                      v
                                 Implementer
                            production implementation
                           + temporary implementation proof
                                      |
                                      v
                                    Tester
                       permanent regression determination
                   reuse / extend / consolidate / add / retire
                                      |
                                      v
                                   Validator
                         independent final conformance
```

The Tester step does not require that the permanent suite change.

When no permanent test change is required, the Tester emits a bounded `NO_PERMANENT_TEST_REQUIRED` result and the workflow proceeds.

If Tester work exposes a production defect, the finding returns to the applicable implementation/Repair path. The Tester does not repair production code.

## 5.1 Source Revision and Checkout Semantics

The Tester operates against the exact Implementer-produced source revision, not an inferred or moving branch state.

Target source flow:

```text
Implementer SourceRevision A
          |
          v
Tester isolated/bound checkout at A
          |
          +-- no permanent test change
          |       -> validation candidate remains A
          |
          +-- permanent test/catalog change
                  -> test-only SourceRevision B descending from A
                  -> Validator receives exact composite candidate B
```

SourceRevision A remains durable evidence of what the Implementer produced. A later Tester revision does not rewrite that history.

The Tester may mutate only test-owned surfaces inside the bounded task, such as permanent test files, test fixtures/support, ValidationCatalog test metadata, and test-only runner/configuration required by the regression proof.

The Tester does not modify production behavior. If a required regression test cannot pass without a production correction, ChampCity records the finding and returns the work to the applicable Implementer/Repair path.

Concurrent implementations may use the existing RepositoryCheckout/SourceRevision architecture. Tester work must bind to an exact implementation revision and preserve normal integration/checkout containment; it must not depend on whichever checkout happens to be active.

## 6. Test Retention Classes

Every executable proof artifact must have a retention purpose.

### 6.1 Implementation-local

Purpose: help one Implementer build and prove one bounded Work Item.

Characteristics:

- may be highly specific to the Work Item;
- may reconstruct unusual scenarios;
- may contain temporary instrumentation;
- may use expensive setup when useful during implementation;
- is not automatically selected by normal repository validation;
- is not permanent unless explicitly promoted by Tester judgment.

### 6.2 Durable regression

Purpose: protect one or more continuing product invariants against future regressions.

Characteristics:

- permanent repository-owned proof;
- capability/behavior ownership recorded in the ValidationCatalog;
- uses the narrowest trustworthy proof boundary;
- expected to survive unrelated implementation refactors.

### 6.3 Integration sentinel

Purpose: protect a materially important cross-component composition boundary that cannot be established adequately through narrower tests.

Characteristics:

- deliberately small population;
- wider and potentially more expensive;
- explicitly mapped to integration/phase/release profiles;
- must not be copied into multiple capability owners merely to reach local assertions.

### 6.4 Characterization

Purpose: freeze observed legacy behavior during extraction or refactor.

Characterization is temporary by nature. It MUST eventually be dispositioned:

- preserve as a durable regression;
- rewrite at the new boundary;
- migrate;
- supersede;
- or retire.

### 6.5 Platform / packaging / migration / performance-soak

These protect specialized obligations and remain explicit validation lanes.

Their cost is intentional when selected at the correct workflow boundary. They must not contaminate routine developer feedback merely because they are permanent tests.

## 7. Implementer Test Mechanics

### 7.1 Temporary by default

Implementation-local tests should execute from the Work Item's Execution Environment or ignored evidence area rather than being committed directly into the permanent test corpus.

During the current V1-to-V2 transition an ignored repository-local path may be used. The V2 target is Project State plus execution-environment evidence receipts rather than permanent Markdown or source files.

### 7.2 Evidence retained, executable discarded

ChampCity records:

- test/driver identity;
- source revision;
- execution result;
- duration;
- relevant bounded output;
- relationship to the Work Item and acceptance criterion.

The temporary executable itself may be discarded after the Work Item completes.

### 7.3 Explicit promotion only

A temporary test may enter the permanent corpus only through Tester disposition.

Promotion may reuse the implementation test unchanged, but that should be uncommon. The Tester is expected to extract the durable invariant and choose the best long-term boundary rather than preserve Work Card history by default.

## 8. Tester Permanent-Suite Dispositions

The Tester uses explicit semantic outcomes.

### REUSE

Existing permanent tests already protect the durable obligation. No new permanent test is added.

### EXTEND

An existing permanent test owns the correct behavior boundary and can be extended without creating duplicated proof.

### PROMOTE

An implementation-local test already represents an appropriate durable regression boundary and may enter the permanent corpus substantially unchanged.

### REWRITE

The implementation test captures a useful invariant but is too Work Card-specific, implementation-coupled, or expensive. The Tester creates a smaller permanent regression proof.

### SPLIT

One existing permanent test combines materially different behaviors, lanes, or resource classes. It is separated so each proof can be selected and scheduled appropriately.

### CONSOLIDATE

Multiple permanent tests protect materially overlapping obligations. Unique assertions are retained at the best boundary and redundant executable proof is removed.

### MIGRATE

The proof remains required but belongs with a different capability, adapter, platform lane, or package.

### QUARANTINE

The proof remains potentially valuable but cannot currently provide trustworthy deterministic evidence. Quarantine remains visible and owned and requires later repair or retirement.

### RETIRE

The executable proof no longer provides a unique continuing obligation because:

- the product behavior was intentionally removed or superseded;
- the tested path is no longer production-reachable;
- equivalent or better permanent proof already exists;
- the test only preserves historical implementation detail;
- a characterization obligation has ended.

### NO_PERMANENT_TEST_REQUIRED

The Work Item creates no uncovered continuing regression obligation.

This is a first-class successful outcome.

Tester disposition is scoped to the affected capabilities and proof relationships of the current Work Item. Discovery of broad unrelated corpus debt should create lifecycle-audit evidence for later bounded maintenance rather than turning one Work Item into a repository-wide cleanup.

## 9. Test Lifecycle Determination Engine

The Determination Engine is a repository-owned analysis system that provides structured evidence to the Tester.

It does not autonomously decide product intent and does not delete tests solely from a score.

### 9.1 Inputs

The engine should consume:

- ValidationCatalog capability and behavior ownership;
- source/capability mappings;
- permanent test metadata;
- test retention class;
- test origin / originating Work Item when known;
- proof role: primary, complementary, sentinel, characterization, support;
- measured duration;
- lane and resource requirements;
- known flake/environment sensitivity;
- supersession relationships;
- production reachability evidence where deterministically available;
- prior Tester lifecycle dispositions;
- execution frequency and failures caught;
- future token/model/human cost telemetry once implemented.

### 9.2 Determinations

For each permanent test, the engine should establish or flag:

- current behavior still exists;
- behavior remains contractually required;
- production path remains reachable;
- proof is unique or overlapping;
- stronger/preferred proof exists;
- test is coupled to incidental implementation shape;
- test reconstructs historical Work Item acceptance rather than a durable invariant;
- retention class is appropriate;
- lane/resource classification is appropriate;
- execution cost is disproportionate to the unique signal produced;
- lifecycle review is required.

### 9.3 Output

The engine produces a typed `TestLifecycleAssessment`, not a deletion command.

Recommended statuses:

- `PRESERVE`
- `REWRITE_CANDIDATE`
- `SPLIT_CANDIDATE`
- `CONSOLIDATE_CANDIDATE`
- `MIGRATE_CANDIDATE`
- `RETIRE_CANDIDATE`
- `QUARANTINE_CANDIDATE`
- `NEEDS_TESTER_REVIEW`

The Tester applies semantic judgment and owns the resulting permanent-suite change.

## 10. Periodic Lifecycle Review

Permanent tests must be reviewed as a living product asset rather than an append-only archive.

Lifecycle analysis should be event-driven and bounded, not another universal approval ritual.

Useful triggers include:

- Phase close;
- release qualification;
- capability extraction/refactor;
- intentional architecture replacement;
- significant test-duration regression;
- repeated duplicate proof detected by the catalog;
- a material change in product reachability;
- explicit Operator/Architect request.

Routine Work Items do not require a complete repository lifecycle audit.

## 11. Permanent Test Metadata

The ValidationCatalog should evolve to record enough information for lifecycle management.

Target metadata includes:

- stable test/proof identity;
- retention class;
- capability ownership;
- behavior/invariant identifiers;
- proof role;
- originating Work Item or migration source where known;
- preferred proof relationship;
- supersedes / superseded-by relationship;
- execution lane;
- resource/scheduling requirements;
- measured duration;
- last lifecycle assessment;
- current Tester disposition.

This remains deterministic repository state. Models provide semantic findings; ChampCity owns IDs, schema validation, relationships, timestamps, and persistence.

## 12. Relationship to Validation Execution

The Test Lifecycle Determination system operates **upstream** of the Validation Planner.

```text
Implementation history / current product
                |
                v
     Test Lifecycle Determination
                |
                v
       Permanent Regression Corpus
                |
                v
          ValidationCatalog
                |
                v
        Validation Planner
                |
                v
      Resource-aware execution
```

The Validation Planner must not select discarded implementation-local tests.

The lifecycle engine must not weaken a ValidationProfile simply because a required test is expensive. It may identify the proof as a rewrite/consolidation candidate; until that change is implemented, the existing required proof remains required.

The Validator receives the exact post-Tester source revision plus the Tester's `RegressionDesignResult`. This lets final conformance distinguish production changes authored by the Implementer, permanent regression changes authored by the Tester, implementation-local proof intentionally not promoted, permanent tests reused unchanged, and retired/consolidated proof with its replacement obligation mapping.

The Validator does not repeat the Tester's suite-design judgment unless the evidence is internally inconsistent or the final source revision diverges from the Tester's recorded result.

## 13. Relationship to Structured Project State

V2 Project State should represent semantic testing results without turning executable files into workflow state.

Target logical records include:

### RegressionObligation

Describes a continuing product behavior requiring permanent proof.

Fields include:

- owning capability;
- invariant statement;
- source Work Item/finding where applicable;
- risk category;
- lifecycle state.

### TestLifecycleAssessment

Records the evidence and Tester disposition for a permanent proof artifact.

### ImplementationProof

Records Work Item-local execution evidence without requiring the temporary executable to remain permanently.

### PermanentTestReference

Binds a repository test/proof identity to one or more RegressionObligations.

These records follow normal Structured Project State rules for identity, revision, relationship, and provenance.

## 14. Cost and Efficiency

The architecture must eventually optimize for more than elapsed time.

Long-term test efficiency should consider:

- wall-clock runtime;
- CPU/process/storage cost;
- model/token cost required to create, inspect, diagnose, and maintain tests;
- human intervention/friction;
- execution frequency;
- unique regressions caught;
- failure attribution quality.

However, **cost-based efficiency scoring and automated budget policy are dependent on the ChampCity token-cost telemetry system**.

Until token/model cost telemetry exists, the Determination Engine may use factual runtime and duplication evidence but must not pretend wall-clock time is a complete economic measure.

Cost never becomes an independent reason to discard unique critical regression protection.

## 15. Anti-Bureaucracy Rules

This architecture must not create a new approval stack.

Specifically:

- Tester does not require Operator approval merely to reuse, rewrite, consolidate, or retire proof inside already directed technical scope;
- Validator does not re-perform Tester's regression-design analysis;
- Implementer does not need permission to create temporary proof;
- every Work Item does not require a new permanent test;
- every Work Item does not trigger a repository-wide lifecycle audit;
- passing tests do not override adopted architecture or Operator direction;
- an old test does not veto intentional product change.

## 16. Transition from the Current Suite

Implementation of this architecture is deliberately separate from the immediate 2026-09-21 Test Suite Recovery initiative.

The immediate recovery may manually consolidate or retire proven redundant historical acceptance tests to restore development throughput.

The later architecture initiative will then:

1. add Tester as a first-class Agent Runtime/workflow role;
2. define implementation-local proof storage and receipts;
3. prevent Implementer-created tests from entering the permanent corpus automatically;
4. implement Tester regression-design results;
5. extend ValidationCatalog lifecycle metadata;
6. implement Test Lifecycle Determination;
7. add event-driven lifecycle review;
8. integrate permanent-suite changes into Validator evidence;
9. integrate token/model cost telemetry when that system is available;
10. migrate the existing permanent corpus into explicit retention classes.

Existing Work Card and Repair Card governance remains operational until this target workflow is implemented. This document defines the successor architecture rather than pretending the current V1/manual path already has a Tester.

## 17. Architectural Boundary

Session 2 owns the workflow and lifecycle redesign defined here.

It does **not** own the immediate cleanup of the current 2026-09-21 pathological suite. That work is the separate Test Suite Recovery implementation bundle.

The recovery bundle answers:

> How do we make today's suite trustworthy and usable again?

This architecture answers:

> How does ChampCity prevent the permanent regression corpus from becoming an append-only record of every future Work Item?
