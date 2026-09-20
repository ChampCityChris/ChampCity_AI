# ChampCity Work Intake Routing, Planning, and Source-Control Architecture

**Status:** Adopted architecture — 2026-09-19

## 1. Purpose

ChampCity needs one universal front door for starting a new body of work against a Project. That front door must classify the work before ChampCity selects an Architect discussion, planning contract, plan topology, or execution path.

The current implementation is too greenfield-shaped. Project Intake immediately creates a generic Project Architect Interview prompt, while the Workflow Hub independently exposes Development and Issue Resolution. That structure is weak for deep feature work, architectural refactors, migrations, platform transitions, integrations, infrastructure changes, research/prototype work, and complex issues.

This architecture restores and completes the previously established Work Intake routing design and adds two governing corrections:

1. route-specific planning must be separate from direct/phased execution topology; and
2. Git/source-control mechanics must be application-owned deterministic machinery rather than agent-owned behavior.

## 2. Governing Model

The required lifecycle is:

~~~text
Project selected or created
        ↓
Start Work
        ↓
Application establishes dedicated Work Intake Git branch
        ↓
Universal Work Intake
        ↓
Architect advisory route assessment
        ↓
Operator route decision
        ↓
Route-specific Architect assessment
        ↓
Shared planning kernel using selected profile
        ↓
Architect-recommended Plan topology
        ↓
Operator approves/revises the Plan
        ↓
Generic Plan execution
        ↓
Work Items directly or grouped into Phases
        ↓
Machine-owned Git checkpoints
        ↓
Plan complete
        ↓
Machine-owned integration into target branch
~~~

The three concepts are independent:

- **Route** answers how ChampCity should understand and plan the work.
- **Plan topology** answers how the approved work should be decomposed for execution.
- **Git branch** is the source-control isolation boundary for that Work Intake.

No route owns a private implementation loop.

The Operator is the only product authority for the Work Intake currently being operated. AI may advise on route, architecture, decomposition, implementation, review, or conflict meaning, but AI does not own source-control mechanics or product dispositions.

## 3. Project Versus Work Intake

A **Project** is the durable product being developed.

A **Work Intake** is one intentionally bounded body of change against that Project.

Creating a new Project and starting new work on an existing Project are separate concepts.

For a brand-new Project, Work Intake may route to Greenfield and establish the initial product baseline.

For an existing Project, Work Intake uses the current baseline and describes only the intended change. A feature, refactor, migration, integration, infrastructure change, issue, or prototype does not require the Operator to recreate the Project or regenerate its entire product roadmap.

This allows deliberate sequencing. For example:

~~~text
Work Intake A
Refactor/Migration
→ migrate to a new technology/deployment architecture
→ complete and integrate

Work Intake B
Refactor/Migration
→ enforce new governance/structural rules
→ complete and integrate

Work Intake C
Feature/Capability Change
→ add new functionality
→ complete and integrate
~~~

ChampCity must not combine those future intentions merely because they are all known.

## 4. Application-Owned Git and Branch Isolation

### 4.1 Governing source-control rule

Git is deterministic machine work.



ChampCity application code owns:

- repository status and branch inspection;
- branch creation and switching;
- base/head identity;
- diff and changed-file calculation;
- staging;
- commits;
- optional remote synchronization;
- integration;
- branch cleanup;
- source-control receipts and failure attribution.

AI workers may reason about source changes and may request semantic operations through ChampCity, but they must not become the authority for routine Git mechanics.

The existing bounded Git implementation in agentHarness/repository/gitMutations.ts and boundedGit.ts is proven source material. The feature should promote those mechanics behind an application-owned Repository/Source-Control service rather than recreate Git behavior through prompts or agent shell commands.

### 4.2 One Work Intake, one branch

Every submitted Work Intake must own a dedicated Git branch.

The branch is established before canonical Work Intake artifacts or implementation changes are written.

The Work Intake records at minimum:

~~~text
repository identity
baseBranch
baseCommit
workBranch
current workBranch head
optional configured remote/sync state
~~~

The Work Intake identity remains a ChampCity identity. The Git branch is its source-control isolation boundary, not its durable identity.

Branch naming must be deterministic, valid, collision-safe, and independent of the later route decision because routing has not yet occurred when the branch is created.

### 4.3 Branch creation

When the Operator submits Start Work / Work Intake, ChampCity:

1. inspects the selected Repository;
2. requires a known clean source baseline before branching;
3. resolves the intended integration/base branch and exact commit;
4. creates and selects a new dedicated Work Intake branch;
5. records the branch binding;
6. writes the Work Intake artifacts on that branch.

If branch establishment or initial persistence fails, ChampCity must fail closed and leave the prior branch/source state recoverable. It must not silently continue planning on the wrong branch.

### 4.4 Git is not another approval gate

Source-control mechanics run as workflow mechanics.

Routine branch/status/stage/commit bookkeeping must not create recurring Operator approvals merely because Git is changing state.

Operator authority applies to product/planning/integration decisions, not to typing Git commands that deterministic code can perform safely.

Remote push is deployment/policy dependent. A missing optional remote must not make local ChampCity development impossible.

### 4.5 Work Item checkpoints

The generic Plan executor owns deterministic source-control checkpoints.

At a minimum, when an implementation Work Item reaches its defined successful completion boundary, ChampCity must be able to:

- inspect the exact change set;
- verify the expected Work Intake branch;
- stage the intended bounded changes;
- create a deterministic Work Item-linked commit;
- record the resulting commit/source baseline;
- optionally synchronize the Work Intake branch to a configured remote.

The Implementer does not need to perform or script those Git operations.

Planning/document-only Work Items may also receive deterministic checkpoints when the governing plan requires durable source history.

### 4.6 Plan completion versus integration completion

A Plan becoming complete does not mean its branch has already been integrated.

These are separate states:

~~~text
Plan Complete
= all required planned work and validations are complete on the Work Intake branch

Integration Complete
= the completed Work Intake has been integrated into its target branch and required post-integration proof has succeeded
~~~

Publication/release remains a separate policy-controlled action.

### 4.7 Integration Candidate

After Plan completion, ChampCity creates a temporary integration context from the current target branch rather than mutating the target branch in place.

The machine-owned integration service must:


- inspect/fetch the target when a configured remote is used;
- identify divergence since `baseCommit`;
- preserve the exact base, incoming, and target refs in evidence;
- create an isolated integration branch/check-out context from the current target;
- attempt a non-interactive Git merge mechanically;
- run required post-merge validation against the integration candidate;
- never advance or push the real target while the candidate is conflicted or failing required validation;
- record the successful integration candidate commit when proof passes.

A clean Git merge plus passing required validation may proceed without agent involvement.

The current `integrate_to_dev` fast-forward-only behavior is useful source material but is not sufficient as the permanent integration contract because independently active Work Intake branches may legitimately diverge.

### 4.8 Integration Repair

A Git merge conflict or a post-merge validation failure means the integration candidate requires semantic repair. It does **not** transfer Git ownership to the agent.

ChampCity creates a bounded Integration Repair context containing the evidence needed to reason about both accepted bodies of work, including as applicable:

- merge base;
- target branch/ref and diff;
- incoming Work Intake branch/ref and diff;
- conflicted files/regions;
- governing Work Intake and Plan intent;
- relevant architecture/contracts;
- failed post-merge validation evidence.

The Integration Repair Implementer may edit source or produce a bounded source patch that preserves the intended behavior of both accepted bodies of work. The Implementer must not execute Git state transitions such as merge, add, commit, checkout-ours/theirs, merge-continue, push, or target-branch switching.

After source resolution, ChampCity resumes deterministic ownership:

~~~text
apply/observe source resolution
→ verify conflict markers/unmerged entries are resolved
→ stage mechanically
→ create integration-repair commit mechanically
→ rerun required integration validation
→ repeat repair only when evidence still fails
→ advance target only after a validated integration candidate exists
~~~

If the competing changes cannot be reconciled without changing approved product scope or architecture, Integration Repair stops and returns the material decision to the Operator rather than inventing a semantic winner.

### 4.9 Concurrency


ChampCity does not need a new application-level Work Stream governance concept to support concurrent development.

Concurrency is provided by Git branches and repository checkouts/worktrees/clones.

The Work Intake architecture must therefore avoid Project-global singleton assumptions such as "the one current branch" as durable Project truth. A particular client/session may have one selected Work Intake, but branch identity belongs to the Work Intake.

Concurrent checkout/worktree provisioning is Repository/Source-Control implementation detail and may evolve separately; it does not create a new planning workflow or authority model.

## 5. Routing Model

### 5.1 Route families

ChampCity supports these major Work Intake routes:

| Route ID | Route | Use when |
| --- | --- | --- |
| greenfield | Greenfield / New Product | A new product or materially new standalone product is being created without an existing product baseline that owns the requested behavior. |
| feature-change | Feature / Capability Change | An existing product is gaining or materially changing a bounded user/product capability. |
| refactor-migration | Refactor / Migration / Platform Transition | Existing behavior or architecture is being reorganized, replaced, migrated, extracted, or moved across platform/deployment boundaries while preserving or deliberately superseding selected behavior. |
| integration-composition | Integration / Composition | The outcome depends materially on integrating existing external components, services, packages, platforms, plugins, or third-party systems. |
| infrastructure-platform | Infrastructure / Platform Change | The work primarily changes deployment, hosting, development/runtime environment, operational infrastructure, packaging, networking, or platform mechanics. |
| research-prototype | Research / Prototype | The immediate objective is to answer an architectural/product question, prove feasibility, compare approaches, or create a disposable/conditional prototype before product commitment. |
| issue-resolution | Issue Resolution | There is an observed product defect, failure, regression, or incorrect current behavior that requires investigation/root-cause analysis and bounded correction. |

These are planning profiles, not seven implementation engines.

### 5.2 Maintenance and remediation

Routine maintenance is classified by objective:

- observed defect/regression → issue-resolution;
- planned debt reduction/structural cleanup → refactor-migration;
- host/deployment/toolchain maintenance → infrastructure-platform;
- bounded capability improvement → feature-change.

Do not create a vague catch-all maintenance route.

### 5.3 Composable traits

A route may carry secondary traits such as:

- existing source;
- existing approved architecture;
- UI-affecting;
- data/state migration;
- security-sensitive;
- external-service dependency;
- multi-repository;
- deployment-affecting;
- compatibility required;
- experimental.

Traits refine context and validation. They do not replace the primary route.


## 6. Work Intake Capture

Work Intake is concise. Its purpose is to capture enough intent and evidence to route the work, not to make the Operator perform the Architect's discovery.

Minimum substantive intake:

- Project identity;
- concise work request/problem/change;
- desired outcome;
- known non-negotiable constraints;
- materially relevant existing source/planning/architecture indicator;
- optional evidence/repository review context.

The intake should not require technical implementation decisions that the Architect can derive from repository evidence.

The existing Project Type field describes product form. It is not a Work Route.

## 7. Architect Advisory Route Assessment

After Work Intake capture, ChampCity prepares a bounded Architect routing assessment.

The Architect must:

1. inspect the Work Intake;
2. inspect materially relevant current Project/repository evidence;
3. identify the recommended route;
4. identify important secondary traits;
5. explain the evidence supporting the recommendation;
6. identify an alternate only when genuine ambiguity remains;
7. avoid performing the full route-specific architecture discussion during routing.


The routing assessment is advisory evidence. It cannot activate a route by itself.

## 8. Operator Route Decision and Rerouting

ChampCity presents the recommendation to the Operator.

The Operator may:

- accept it;
- select another supported route;
- request a revised routing assessment.

The selected route becomes explicit durable workflow evidence.

A route-specific Architect may later discover that the selected route is wrong. In that case:

1. the Architect records a reroute recommendation;
2. ChampCity returns the decision to the Operator;
3. the Operator accepts or overrides;
4. the original Work Intake remains authoritative source evidence;
5. downstream artifacts belonging to the superseded route become stale/superseded;
6. a fresh route-specific assessment starts from the same intake and current branch evidence.

Issue Resolution's existing Reframe to Development/Feature mechanism should converge on this general reroute model.

## 9. Shared Planning Kernel

Planned-work routes share one planning kernel for common mechanics:

- source revision/freshness handling;
- Architect handoff preparation/copy;
- temporary draft submission/promotion;
- revision-request mechanics;
- current V1 review/disposition mechanics where still required;
- canonical artifact identity and lineage;
- plan topology and Work Item sequencing;
- Implementer Report ownership;
- bounded validation guidance;
- route/profile resolution.

The kernel contains common mechanics, not generic architecture questions.

Route-specific profiles provide:

- required evidence;
- Architect discovery priorities;
- required architectural decisions;
- required plan sections;
- preservation/cutover/rollout semantics;
- risk and acceptance concepts.

## 10. Route-Specific Architect Profiles

### 10.1 Greenfield / New Product

Focus on product/user outcome, capabilities, architecture/deployment model, data/state model, dependencies, non-functional constraints, and delivery sequencing.

Do not assume an MVP unless the Work Intake establishes one.

### 10.2 Feature / Capability Change

Focus on current product behavior/architecture, requested capability delta, preserved behavior, affected services/state/UI/contracts, integration points, compatibility/rollout, regression boundaries, and whether delivery should be direct or phased.

The plan describes the delta, not the entire product.

### 10.3 Refactor / Migration / Platform Transition


Establish current architecture/baseline, target architecture, preserved behavior, explicitly replaced/superseded behavior, new behavior, architectural delta, ownership boundaries that move, migration seams/vertical slices, temporary compatibility, data/state/code transition, rollback/recovery, cutover criteria, retirement conditions, and sequencing.

A refactor plan is a transformation plan, not a regenerated greenfield roadmap.

### 10.4 Integration / Composition

Focus on build-versus-integrate disposition, external contracts/ownership, authentication/access, data/control flow, failure/lifecycle/health, adapter boundaries, upgrade/version risk, characterize-first proof, and demonstrated gaps requiring custom code.

### 10.5 Infrastructure / Platform Change

Focus on current/target topology, operational outcome, platform constraints, install/provision/update/rollback, networking/access, observability/recovery, environment ownership, and compatibility with existing behavior.

### 10.6 Research / Prototype

Focus on question/hypothesis, decision enabled, alternatives, bounded prototype, evidence, success/failure criteria, disposable versus promotable output, and expiration/closure.

Prototype output is not silently promoted to production architecture.

### 10.7 Issue Resolution

Issue Resolution remains RCA-first: observed failure, reproduction/evidence, expected versus actual behavior, root cause, current architecture/lifecycle, correction boundary, and regression protection.

After RCA, the correction may use either direct or phased Plan execution. Complex issues are not forced into one Fix Card merely because their route is Issue Resolution.

## 11. Plan Topology

Route and topology are independent.

After route-specific assessment, the Architect recommends the smallest topology that safely represents the work:

- **direct** — ordered/dependency-aware Work Items without a Phase layer;
- **phased** — meaningful Phases that own Work Items and any Phase-level Criteria.


The Operator approves or revises the Plan and therefore controls the scope/topology.

A small refactor may be direct. A large issue may be phased. A feature may be either.

Planning must not manufacture Phases to satisfy a template, and it must not compress multi-stage work into one oversized Work Item merely to avoid Phases.

## 12. Generic Plan Execution

The target execution model is:

~~~text
Plan
├── Work Items
└── optional Phases
      └── Work Items
~~~

Every implementation Work Item uses the same lifecycle:

~~~text
Ready
→ Implement
→ Review / Validate
→ Repair when required
→ Complete
~~~

When the Plan is direct, progress derives from Work Items and Plan-level Criteria.

When phased, Phase progression derives from Phase membership, dependencies, Work Item completion, Phase-level Criteria, and blocking state.

The route-specific workflow owns discovery/planning semantics, not a bespoke implementation engine.

The current Development Phase/Work Card loop and Issue Fix/Repair loop are source material for this shared execution model and should be adapted/consolidated rather than copied.

Research/Prototype may legitimately terminate in evidence and an Operator Decision without creating an implementation Plan.

## 13. Formal Work Card Decomposition Safety Valve

Initial Work Card Planning is not assumed perfect.

When the Formal Work Card Architect performs detailed repository inspection, it evaluates whether the candidate remains one bounded executable unit.

If detailed inspection exposes independently useful outcomes, separable acceptance groups, materially different ownership, sequential prerequisites, excessive unrelated context, or genuine milestone/cutover boundaries, the Architect stops drafting and proposes decomposition.

The Operator may accept or revise the decomposition.

Accepted decomposition may replace the candidate with ordered sibling Work Items or introduce a Phase boundary when the evidence demonstrates that the direct topology was wrong.

The original candidate is superseded-by-decomposition. The governing Work Intake and route remain intact unless the discovery also proves the route itself wrong.

This is a safety valve, not another mandatory approval layer.

## 14. Current Persistence Boundary

This feature is implemented in the current ChampCity application before the service/browser refactor.

Current ChampCity may continue to persist workflow evidence as canonical Markdown.

At minimum it preserves identities/lineage for:

- Work Intake;
- base/work Git refs;
- Architect route assessment;
- Operator route decision;
- route-specific Architect assessment;

- Plan;
- Phase/Work Item candidates where used;
- implementation/validation evidence;
- reroute/decomposition/supersession relationships;
- source-control checkpoints and integration receipt.

Do not encode routing, topology, or branch ownership solely in renderer state or infer them later from filenames.

Future Structured Project State migrates these semantics into durable records.

## 15. Workflow Hub and Entry Experience

The Workflow Hub should present **Start Work** as the normal front door.

The Operator should not need to know whether the request belongs to Development, Issue Resolution, Refactor, Feature, or another route before intake.

Existing direct entries may remain temporarily for recovery/compatibility, but the canonical new-work path is:

~~~text
Project
→ Start Work
→ Work Intake branch
→ Work Intake
→ routing
→ planning
→ generic Plan execution
~~~

A selected existing Project is not forced back through Greenfield Project Intake.

## 16. Required Architectural Properties

The implementation must satisfy all of these:


1. every submitted Work Intake owns a dedicated Git branch;
2. source-control mechanics are application-owned deterministic operations, not agent-owned behavior;
3. route recommendation is advisory and Operator route selection is authoritative;
4. routing evidence is durable and inspectable;
5. route profiles share one planning kernel instead of duplicating orchestration stacks;
6. existing Project baselines are reused for existing-product work;
7. change plans describe their delta rather than regenerate the whole product;
8. route and Plan topology are independent;
9. the Architect recommends topology and the Operator approves/revises the Plan;
10. implementation routes converge on shared Plan/Work Item execution semantics;
11. Issue Resolution may produce direct or phased correction work;
12. Work Card decomposition may introduce sibling Work Items or genuine Phase boundaries;
13. completed Work Items can receive machine-owned Git checkpoints;
14. Plan completion and integration completion are separate;
15. integration mechanics are deterministic and operate in an isolated integration candidate before the real target advances;
16. Git conflicts or post-merge validation failures create bounded Integration Repair for semantic source resolution while ChampCity retains Git ownership;
17. remote Git hosting is optional and does not define the local product workflow;
18. no route assumes MVP semantics;
19. no route/topology/source-control authority is represented only by renderer conditionals;
20. ChampCity does not invent a second collaboration/governance layer when Git branches/checkouts already provide source isolation.

## 17. Non-Scope

This feature does not:

- implement the service/browser ChampCity refactor;
- replace canonical Markdown with Structured Project State;
- implement a full multi-user authorization system;
- invent a ChampCity-specific branch/merge system separate from Git;
- give an AI worker ownership of Git state transitions;
- automatically choose a product/architecture winner when conflicting accepted changes require a new Operator decision;
- perform the future ChampCity Electron-to-service/browser refactor itself;
- delete the current ChampCity planning corpus during implementation;
- create autonomous AI routing, topology, Git, or integration authority.

## 18. Acceptance Outcome

The feature is complete when an Operator can:

1. start a new body of work against an existing or new Project;
2. have ChampCity create/bind a dedicated Work Intake branch;
3. receive an evidence-based route recommendation and override it;
4. enter the selected bespoke Architect/planning profile;
5. approve/revise a direct or phased Plan;
6. execute that Plan through shared Work Item lifecycle semantics;
7. decompose an oversized candidate without restarting planning;
8. have ChampCity perform deterministic Git checkpoints;
9. complete the Plan independently from integration;
10. integrate a clean completed Work Intake through machine-owned source-control mechanics;
11. route Git conflicts or post-merge validation failures through bounded Integration Repair while ChampCity retains Git ownership.

A Refactor/Migration intake against ChampCity must produce a transformation discussion centered on current architecture, target architecture, preservation, seams, cutover, and retirement.

A complex Issue must be able to produce a phased correction Plan after RCA.

The Operator must be able to intentionally perform a technology/platform cutover as one Work Intake, then later open separate Work Intakes for governance refactors and feature expansion instead of ChampCity forcing all known future work into one roadmap.
