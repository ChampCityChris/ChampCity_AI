# ChampCity Concurrent Repository Checkout Architecture

Status: Adopted implementation architecture  
Evidence date: 2026-09-20

## Purpose

ChampCity must support multiple engineering agents working concurrently on independent Work Items in the same Repository without creating a serialized development queue, mixing uncommitted source, or requiring the Operator to reason about Git plumbing.

This document specializes both `CHAMPCITY_SOURCE_CONTROL_PROVIDER_ARCHITECTURE.md` and the concurrency decision already adopted by `CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`. ChampCity's canonical concept is `RepositoryCheckout`; Git linked worktrees are the preferred first-provider mechanism for efficient local concurrency. Work Intake remains the workflow owner and Repository/Source-Control Management owns the mechanics.

## Failure Evidence and RCA

The 2026-09-20 WIR22/HOTFIX20 incident exposed three interacting gaps:

1. Git branch identity and filesystem checkout identity were treated as if they were the same thing.
2. ChampCity MCP repository reads were bound to one registered root, while a concurrent Codex execution could modify a different Git worktree belonging to the same Repository.
3. "Ready for Architect review" could be reported while implementation bytes were still only uncommitted in an execution checkout and had not become a durable branch revision.

The result was contradictory inspection: Git correctly showed the named hotfix branch had not advanced, while repository reads correctly showed the primary checkout. Neither surface could identify and read the concurrent execution checkout that held the uncommitted implementation.

The root cause is not a new workflow requirement. It is incomplete RepositoryCheckout mechanics and tooling.

## Canonical Model

### Repository

A durable source/content repository identity. Git object history belongs to the Repository.

### SourceLine / Git branch

A SourceLine is ChampCity's provider-neutral movable line of development. In the Git provider it maps to a branch/ref. SourceLine identity belongs to the Work Intake or Work Item that owns the source line.

A SourceLine/branch does not itself provide a writable filesystem surface.

### RepositoryCheckout

A concrete working copy of a Repository. For Git, the preferred local concurrency implementation is a linked Git worktree.

A RepositoryCheckout has stable runtime identity independent of its absolute host path. Host-local path is resource metadata, not durable Project State.

Minimum checkout facts:

- `checkoutId`
- `repositoryId`
- checkout kind/provider
- host-local root
- current HEAD commit
- attached branch ref or detached state
- dirty/clean state
- owning Work Intake/Work Item when managed by ChampCity
- lifecycle state
- whether it is primary, managed, external/adopted, integration-only, or disposable

### Execution Environment

The bounded environment in which an Implementer runs. For source-changing engineering work it references one RepositoryCheckout. Runtime workers receive that checkout as their working directory and writable repository root.

## Why Branch + Checkout Are Both Required

One filesystem directory can represent only one checked-out source state at a time. Five concurrent agents editing five independent branches therefore require five independently writable checkout views.

Git worktrees are preferred because they share the Repository's Git object database. They duplicate the checked-out tracked files and per-checkout metadata, not the full Git history. Generated/dependency state such as `node_modules`, `dist`, `build`, and caches remains outside the source baseline and must not be blindly duplicated by ChampCity.

A branch may exist without an active checkout. A checkout may temporarily be detached while a runtime is working. ChampCity must model both facts explicitly instead of inferring one from the other.

## Primary Checkout Rule

The Repository's normal registered checkout is the **primary checkout**.

For ChampCity development, the primary checkout should normally remain on the integration target branch (`dev`) and should not be used as the writable execution surface for concurrent Implementers.

Its intended roles are:

- integration target inspection;
- final integrated validation;
- release preparation when applicable;
- Operator/local foreground work;
- recovery and diagnostics.

Concurrent source-changing Work Items execute in managed RepositoryCheckouts instead.

## Managed Checkout Root

ChampCity must support a configurable host-local managed-checkout root outside any managed Repository, for example:

`C:\Users\<USER>\Projects\Worktrees\`

The product must not persist a concrete user path in portable architecture/Project State. The configured Host owns that path.

Managed checkout paths should be derived from stable Repository/Work Item identities rather than arbitrary agent-generated names.

## Work Intake Concurrency Lifecycle

For a source-changing Work Intake:

```text
current integration baseline
→ create/bind dedicated work branch
→ provision dedicated RepositoryCheckout
→ bind Runtime execution to that checkout
→ implement/test/report in isolation
→ create machine-owned source checkpoint commit
→ mark exact commit review-ready
→ Architect/Validator inspect exact checkout/commit evidence
→ build integration candidate against current dev
→ deterministic validation / Integration Repair if needed
→ advance dev after candidate passes
→ retire completed execution checkout
→ retain/delete branch according to repository policy
```

Multiple Work Intakes may occupy the execution portion concurrently. Integration target advancement remains deterministic and serialized because one target ref cannot advance to two different commits simultaneously.

## Review-Ready Invariant

A Work Item is not review-ready merely because a runtime says it is finished.

For source-changing work, review-ready requires:

- an implementation result/report;
- all attributable source changes captured;
- a successful machine-owned checkpoint commit on the Work Item's branch;
- the exact resulting commit recorded;
- no implementation bytes existing only as uncommitted execution-checkout state;
- deterministic identification of the RepositoryCheckout/commit reviewed.

Architect review must read the exact implementation revision or its verified checkout, not an unrelated primary checkout.

## Checkout Discovery and Adoption

RepositoryService must deterministically enumerate Git-owned worktrees using Git metadata (for Git, `git worktree list --porcelain -z`) rather than scanning arbitrary directories.

An external/runtime-managed checkout may be adopted for inspection only after RepositoryService verifies:

- its top-level path;
- its common Git directory belongs to the selected Repository;
- its HEAD/branch state;
- its containment/path safety;
- its lifecycle classification.

Adoption must not silently grant deletion authority. External checkout cleanup remains owned by its provider unless explicitly transferred to ChampCity.

## Checkout-Aware Repository Operations

Repository and MCP file/source-control operations must be keyed by Repository identity plus optional `checkoutId`.

If no checkout is specified, existing compatibility behavior may target the registered primary checkout.

When a checkout is specified, the service must verify it belongs to the same bound Repository before reading or mutating it. A caller bound to `champcity_ai` must never escape into a checkout belonging to another Repository merely because both exist under a common worktree root.

Required checkout-aware capabilities include:

- list/inspect RepositoryCheckouts;
- status/diff/changed files;
- bounded file read/list/search;
- branch/HEAD inspection;
- managed checkout creation;
- managed checkout retirement/removal;
- exact commit reads where a working checkout is unnecessary.

## Runtime Binding

RuntimeService receives a RepositoryCheckout identity from the Work Item execution plan.

The Runtime adapter must:

- use the checkout root as `cwd`;
- restrict repository writes to that checkout;
- not switch branches or create arbitrary worktrees during implementation;
- emit file-change evidence relative to the checkout;
- preserve the branch/checkout binding supplied by ChampCity.

Codex worktrees are therefore an adapter detail, not the source-of-truth model. ChampCity may use its own managed Git worktree and launch Codex in it.

## Integration and Moving dev

A concurrent Work Item may begin from dev commit A while other work advances dev to B.

The Work Item's completed commit remains valid evidence of its own implementation. It does not need to rewrite history simply because dev moved.

Integration uses the existing machine-owned integration-candidate model:

```text
incoming Work Item commit
+ current target dev commit
→ isolated integration candidate checkout
→ mechanical merge
→ required validation
→ Integration Repair when semantic conflict/failure requires it
→ advance dev only from validated candidate
```

This keeps ordinary implementation concurrency separate from target integration.

## Cleanup Safety

ChampCity must never delete a checkout containing the only copy of source changes.

Managed checkout removal requires deterministic proof that:

- no uncommitted attributable source remains, or the work was explicitly abandoned;
- the review/integration revision is durably committed when the work completed;
- the checkout is not executing a worker;
- the checkout is not the primary checkout;
- the checkout still belongs to the expected Repository.

Cleanup failures leave the checkout intact and visible.

## Operator Experience

The Operator should see concurrent engineering work as a team/work dashboard, not Git plumbing.

At minimum show:

- Work Item;
- branch;
- checkout status;
- worker/runtime;
- implementation state;
- dirty/checkpointed/review-ready state;
- integration state;
- actionable blocker.

Raw filesystem paths may be available in diagnostics but are not the primary mental model.

## Disk-Space Policy

Git worktrees share repository object history but contain their own checked-out files.

ChampCity must not automatically duplicate ignored dependency/build directories into every checkout. Environment setup should be explicit and adapter/project-specific. Cleanup diagnostics should expose managed checkout disk use and lifecycle state before deletion.

## MCP Boundary

MCP is a controlled façade over RepositoryService. It must expose enough checkout context for an Architect or worker to inspect the correct concurrent source state without exposing arbitrary filesystem traversal.

The MCP must not make a registered Repository root synonymous with every RepositoryCheckout.

## Current Interim Procedure

Until this architecture is implemented:

1. concurrent Codex work may execute in Codex-managed worktrees;
2. when implementation is complete, use Codex **Create branch here** and commit the work;
3. use Codex **Handoff to Local** when Architect review requires the current single-root MCP to inspect it;
4. review/integrate one completed branch at a time while other agents continue in their worktrees;
5. never delete a worktree containing uncommitted work.

This procedure is temporary compatibility behavior, not the target architecture.

## Explicit Non-Goals

This architecture does not:

- add a new Work Stream governance layer;
- grant AI agents source-control authority;
- require GitHub or pull requests;
- require every Repository provider to use Git worktrees;
- require multiple copies of dependency/build output;
- change Operator authority;
- replace Integration Repair with automatic semantic conflict resolution.
