# WSF20-REPAIR20 — Restore Operator authority over optional source mutation

**Type:** Architectural Repair Card  
**Supersedes:** WSF20-REPAIR19-R04-R01 — do **not** implement the renderer-only revision-control repair as the solution to this incident  
**Related prior work:** WSF20-R13, R16–R18, R19/R01/R02/R03/R04  
**Starting baseline:** `46b6e13897f582f56899e8f70aaa4f9eeded7428` on `Dev` (reverify before edits)

> The human Operator is the only authority over what the Work Card requires. ChampCity enforces source scope, identity, evidence and safety. It must not convert permission to edit a path into a machine mandate that the path be edited.

## Objective

Correct the source-backed WorkItem contract so:

`affectedPaths` means **authorized mutation scope**, not **required mutation work**.

For a source-backed WorkItem with approved nonempty `affectedPaths`:

- the Implementer receives a writable checkout constrained to those approved paths;
- the Implementer may make an attributable change when the Work Card actually requires one;
- the Implementer may also truthfully conclude that the Work Card is already satisfied and make **zero changes**;
- `implemented + zero source changes` is a valid successful implementation with implementation checkpoint `not-required`;
- `implemented + authorized changes` creates the normal committed implementation SourceCheckpoint;
- unauthorized changes remain rejected/restored;
- independent Tester/Validator and human Operator disposition remain downstream proof/authority.

An empty `affectedPaths=[]` remains a strictly read-only source-backed contract.

This repair must also allow the **existing live blocked Repair** to be explicitly run again under its unchanged approved Work Card after the corrected semantics are deployed. The Operator is not required to revise a Work Card that the Operator says is already correct.

## Source-backed RCA

### R13 introduced the authority inversion

Commit:

`a45a8c32faa017924adefba433172fb6ab06040f — WSF20-R13 support source-backed no-mutation WorkItems`

introduced the binary rule in `workflowExecutionApplicationService.buildWorkItemExecutionContract()`:

`affectedPaths.length > 0 ? sourceMutation="required" : sourceMutation="not-required"`

and regression proof explicitly asserted that a caller could not choose no-mutation when approved paths were nonempty.

That conflates two independent concepts:

1. **authorization:** what source the Operator permits the Implementer to change;
2. **execution outcome:** whether this particular implementation actually needs to change source.

The Operator's Work Card owns the second question through its objective, implementation boundaries and proof intent. The application may constrain the first; it may not infer mandatory work merely from an authorization list.

### The false invariant is enforced in multiple production owners

Current code repeats the R13 rule:

1. **Contract creation** — `workflowExecutionApplicationService.ts`
   - derives `sourceMutation="required"` solely from `affectedPaths.length > 0`.

2. **Implementer prompt** — `codexImplementerExecutionService.ts`
   - tells the model:
     `required means a qualifying attributable source change and application-owned checkpoint are necessary`.

3. **Sandbox/write policy**
   - `sourceMutation="not-required"` means read-only;
   - every nonempty authorized path therefore becomes a mutation-required run.

4. **Finalization/checkpoint**
   - an otherwise successful source-backed result with zero attributable paths is converted to a blocked checkpoint:
     `No attributable source changes were reported; a structured implementation checkpoint cannot be created.`

5. **No-mutation recovery** — `workflowExecutionApplicationService.getCheckpointRecoveryProjection()`
   - defines no-mutation eligibility from `item.body.affectedPaths.length === 0`.

6. **Durable/restart status** — R03
   - reconstructs historical `mutationRequired` from the historical WorkItem's nonempty `affectedPaths`, repeating the same false premise.

7. **Planning handoff**
   - current handoff text says nonempty approved paths require source mutation and a committed checkpoint.

This is a platform invariant, not a Repair-specific defect.

### Live proof

Current `greenfield_test` Repair:

`88f9ee9c-c99d-4272-a721-596eb8196b14`

approved contract includes:

`affectedPaths=["conformance/phase-1/work-card-01.txt"]`

and explicitly instructs:

- inspect the exact artifact;
- **if it already conforms, preserve it unchanged**;
- correct only that file if correction is actually required.

The latest Implementer attempt:

`93ed1646-e2cf-49dc-8134-0ba51ad8fc7f`

read the file, found it correct, made no source/Git change, and returned semantic `blocked` only because the machine contract required a mutation:

> The artifact already conforms and must remain unchanged. The required sourceMutation policy cannot be satisfied without an unauthorized edit.

The Workflow source remains ready and clean at:

`1e3f1530b3d4aaac7bc9411c22edc3a666c35e84`

The Work Card was not wrong. ChampCity overrode its semantics.

## Correct contract model

### A. Separate source access from mutation obligation

Replace the current two-value meaning:

- `required`
- `not-required`

with semantics that describe **permission**, not an obligation.

Preferred contract vocabulary:

- `sourceMutation: "allowed"` — source-backed checkout may be changed, but only within `affectedPaths`; zero changes are valid.
- `sourceMutation: "forbidden"` — source-backed checkout is read-only; `affectedPaths` must be empty.

If a less disruptive internal representation genuinely avoids a public/shared contract migration, the Implementer may use an equivalent explicitly named permission field, but **must not retain the word/value `required` with a new optional meaning**. The type and prompt must communicate the truth.

Source-neutral WorkItems remain source-neutral and cannot mutate source.

Derivation:

- source-backed + nonempty `affectedPaths` → mutation **allowed**
- source-backed + `affectedPaths=[]` → mutation **forbidden**
- source-neutral → source unavailable / mutation forbidden

Do not add another Operator checkbox or approval gate. The approved path list already expresses authorization.

### B. Implementer execution behavior

For source-backed mutation-allowed work:

- working directory remains the exact verified Workflow checkout;
- writable scope remains bounded to the existing execution sandbox plus application-side path attribution;
- Implementer follows the **actual Work Card**;
- it may edit only paths permitted by `affectedPaths`;
- it may make no source edits when the card is already satisfied;
- prompt explicitly says that nonempty paths are permission, not a command to manufacture a change;
- never create a no-op edit/commit merely to satisfy ChampCity.

For source-backed mutation-forbidden work:

- preserve current read-only sandbox / zero writable roots;
- any source mutation remains a violation.

### C. Finalization must classify actual source outcome

After a semantic `implemented` result, reconcile the exact checkout and attributable source delta first.

For a valid source-backed run:

**Zero attributable source changes**

- require exact clean checkout at the reserved source revision;
- require no unauthorized transient changes;
- accept the ImplementationRecord as `implemented`;
- implementation checkpoint = `not-required`;
- WorkItem progresses to the normal `validation_pending` / Review & Validation path;
- Tester receives the unchanged candidate revision.

This is valid whether `affectedPaths` was empty **or nonempty**.

**One or more attributable source changes**

- mutation must have been allowed;
- every changed path must fall within approved `affectedPaths`;
- preserve current scope attribution, exact source identity and checkpoint creation;
- commit the normal implementation SourceCheckpoint;
- advance SourceBinding/candidate revision normally.

**Unauthorized or unprovable changes**

- preserve existing fail-closed restore/inspection behavior;
- do not convert to success.

**Semantic partial/blocked/failed/abandoned**

- preserve semantic meaning and current safety handling;
- no false successful checkpoint.

The presence of `affectedPaths` must never itself decide whether a SourceCheckpoint is mandatory. **Observed validated delta does.**

### D. Durable Project State / recovery semantics

Update R13/R03 helpers so historical no-change success is proven from durable execution evidence, not from `affectedPaths=[]`.

A source-backed implementation is an exact no-change success when all required provenance holds, including at minimum:

- latest owned completed attempt/result;
- result outcome `implemented`;
- historical reserved WorkItem/source identity exact;
- no implementation SourceCheckpoint for that result;
- no attributed source delta in the exact attempt evidence;
- current verified source revision equals the implementation's reserved revision, or a valid later Tester checkpoint chain advances from it;
- managed checkout/common repository/branch identity remains exact;
- no incompatible Tester/Validation/checkpoint ambiguity.

Rename internal concepts such as `noMutationRequired` where needed; this is now **no mutation occurred**, not **no mutation was authorized**.

R03 durable rehydration must reconstruct:

- no actual source delta → checkpoint `not-required`;
- actual committed source delta → checkpoint `committed`;

using historical evidence, not historical `affectedPaths.length`.

### E. Tester behavior

Tester must be independent of whether implementation had an allowed path list.

For implemented source-backed no-change result:

- Tester can run against the same implementation/source revision;
- implementation checkpoint is not-required;
- `changedPaths=[]`;
- Tester makes its own independent determination/proof decision.

For implemented source-backed changed result:

- Tester sees the committed implementation revision and actual changed paths.

Do not tell Tester that a source change was required merely because the Work Card listed allowed source paths.

### F. Operator retry of the current blocked WorkItem

R04's forced-revision behavior is not the only valid recovery and must not strip Operator choice.

Remove the R04 renderer rule that disables Implement solely because:

`semanticBlocked === true`

For a blocked WorkItem, expose **both** safe Operator choices where applicable:

- **Implement again** under the unchanged approved Work Card;
- **Request Work Card Revision** if the Operator chooses to change the contract.

Explicit Implement click is sufficient Operator authority to retry; no new confirmation gate.

The Start/attempt owner must safely support an unchanged-contract retry when:

- exact active WorkItem is `blocked`;
- latest exact attempt is completed with unsuccessful semantic result;
- current planning review for the same contract is still approved;
- no Tester/Validation/checkpoint/downstream evidence owns the blocked result;
- no current running/prepared competing attempt;
- source remains exact, ready and clean;
- no source delta from the blocked attempt remains;
- WorkItem identity/version/contract are unchanged.

The retry must create a **new** ImplementationAttempt under the same approved WorkItem version/contract and transition execution through the normal lifecycle. Preserve all prior blocked/partial attempts/results.

Do not silently change the WorkItem to `ready` on a status read. The explicit Start action owns the bounded blocked→new-attempt transition.

R04's governed revision path remains available as an **Operator option**, not a mandatory authority gate.

### G. Recover the live test without rewriting history

After this repair is deployed, the existing blocked Repair must be executable **without revising its Work Card**.

Expected live path:

1. restart application;
2. historical blocked result is still shown truthfully;
3. Implement button is enabled because the exact unchanged approved card is safely retryable;
4. Operator clicks Implement;
5. new attempt uses corrected optional-mutation semantics;
6. Implementer reads the already-correct file;
7. makes no edit;
8. returns `implemented`;
9. ChampCity observes zero source delta;
10. implementation checkpoint = `not-required`;
11. WorkItem advances to Review & Validation;
12. Tester independently verifies the result.

No SQL edit, Work Card revision, fake source change or historical result rewrite.

## Required regression coverage

Extend existing owners; do not create a parallel workflow.

### 1. Authorized path with real change

Source-backed WorkItem:

- `affectedPaths=["feature.txt"]`;
- objective requires changing `feature.txt`;
- Implementer changes only that file and returns `implemented`.

Assert:

- contract mutation permission = allowed;
- source is writable;
- exact attributable delta = `feature.txt`;
- committed implementation checkpoint created;
- source revision advances;
- Review/Tester proceed.

### 2. Authorized path, already satisfied

Same nonempty `affectedPaths`, but Work Card explicitly permits preserving an already-correct file.

Implementer reads source, makes zero changes, returns `implemented`.

Assert:

- contract still grants mutation permission;
- no fake edit;
- Git HEAD/status unchanged;
- no implementation SourceCheckpoint entity;
- checkpoint presentation = `not-required`;
- WorkItem = `validation_pending`;
- restart rehydrates terminal completed/not-required;
- Tester is eligible at unchanged revision;
- Review/Validation can continue.

This is the critical regression.

### 3. Empty path read-only

`affectedPaths=[]`:

- contract mutation forbidden;
- checkout read-only;
- zero change `implemented` works exactly as today;
- attempted source mutation fails/restores.

### 4. Unauthorized change

Approved `affectedPaths=["allowed.txt"]`, Implementer changes `other.txt`.

Assert existing scope violation recovery/failure remains exact; no success/no checkpoint fabrication.

### 5. Blocked historical retry

Create the old-policy-equivalent state:

- approved nonempty paths;
- completed semantic blocked result;
- WorkItem blocked;
- no source delta/evidence/checkpoint.

With corrected semantics:

- renderer shows Implement enabled **and** Request Revision available;
- explicit Start creates one new attempt under the unchanged approved contract;
- previous result remains immutable;
- no planning revision is required;
- successful zero-change retry reaches validation_pending.

Negative blocked states (dirty source, blocked SourceBinding, downstream evidence, successful/checkpointed owner, ambiguous result, active attempt, stale contract/CAS) remain non-retryable.

### 6. Durable/restart parity

Service/app restart before and after zero-change success with nonempty authorized paths must preserve:

- terminal completed state;
- checkpoint not-required;
- unchanged implementation/source revision;
- Tester eligibility;
- no false pending/inspection checkpoint.

### 7. Contract semantics tests

Remove/replace R13 tests asserting:

`nonempty affectedPaths => mandatory sourceMutation required`.

Add explicit assertions that:

- nonempty path list grants allowed scope;
- actual delta controls checkpoint requirement;
- caller/model cannot expand scope;
- empty path list forbids mutation.

### 8. Prompt proof

Implementer prompt must state, in substance:

- affectedPaths are the maximum approved mutation scope;
- mutate only when necessary to complete the Work Card;
- zero source changes are a valid `implemented` result when the Work Card is already satisfied;
- never fabricate edits;
- independent Tester/Validator proof remains downstream.

No prompt may say a qualifying source change is necessary merely because paths are nonempty.

## Expected production owners

Primary:

- `src/shared/workflowApplicationContracts.ts`
- `src/main/workflow/workflowExecutionApplicationService.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/shared/projectState/projectStateService.ts`
- `src/main/workCardBuilding/codexTesterExecutionService.ts`
- `src/main/workCardPlanning/structuredWorkItemPlanningService.ts`
- `src/renderer/app/WorkCardImplementWorkspace.tsx`

Inspect/update R03/R04 durable and revision helpers wherever they derive mutation obligation from `affectedPaths.length`.

Tests:

- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/phase-planning/phase-planning-service.test.cjs`
- `test/workflow/workflow-execution-application-service.test.cjs`
- `test/renderer/work-card-implement-workspace.test.cjs`
- Tester/source-checkpoint owners selected by capability impact.

Do not modify source topology, SourceBinding schema, Git ownership, Operator decision authority, SQL schema, LOCALGIT01, Forgejo, or unrelated UI.

## Superseded/retained repairs

- **WSF20-REPAIR19-R04-R01 is superseded by this card and must not be implemented as the primary fix.**
- R04's blocked→revision capability may remain as an optional Operator recovery path.
- Remove only the R04 behavior that makes revision the mandatory path by disabling safe unchanged-contract retry.
- Preserve R03 durable terminal rehydration.
- Preserve R16–R18 checkpoint/source recovery.
- Preserve R13's useful read-only-source capability, but replace its false mandatory-mutation invariant.

## Validation

Use the canonical **repair** validation planner for exact changed paths/capabilities.

Require:

- one production build;
- red proof reproducing old mandatory-mutation behavior;
- focused changed/no-change/unauthorized-change tests;
- blocked unchanged-contract retry;
- restart/durable proof;
- Tester preservation;
- structured checkpoint preservation;
- renderer proof that Implement and Request Revision are both correctly gated choices.

Do not repeatedly execute unrelated broad suites.

## Implementer report and checkpoint

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR20_IMPLEMENTER_REPORT.md`

Report:

- exact R13 authority-gate RCA;
- final shared contract vocabulary;
- every affected consumer of mutation permission;
- red-to-green nonempty-path/zero-change proof;
- blocked same-contract retry proof;
- checkpoint and Tester behavior;
- historical/durable compatibility;
- focused receipts and residual live acceptance.

**Checkpoint:** `WSF20-R20 restore Operator authority over optional source mutation`

Commit only attributable implementation/tests/report files. Preserve unrelated dirty documentation. Stop for Architect review. No live `greenfield_test` execution, manual SQL edit, fake Git change, push, merge or release during implementation.
