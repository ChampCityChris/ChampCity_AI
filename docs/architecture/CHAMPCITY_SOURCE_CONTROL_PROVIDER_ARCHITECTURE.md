# ChampCity Source-Control Provider Architecture

Status: Adopted V2 architecture decision  
Decision date: 2026-09-20

## Purpose

ChampCity must own the source-control experience used by Operators, workflows, AI workers, and application services.

The product must not make Git's internal interaction model—branches, worktrees, detached HEAD, index/staging, stash, ref movement, merge state, or remote-tracking details—the permanent ChampCity workflow model.

Git remains the first and current source-control provider because it is mature, interoperable, and already deeply supported by the repository ecosystem. It is an infrastructure adapter beneath ChampCity RepositoryService, not the semantic definition of RepositoryService.

This architecture establishes the provider-neutral source-control model that sits above the concurrent RepositoryCheckout architecture and the current bounded Git implementation.

## Architectural Decision

ChampCity will provide a **source-control abstraction owned by RepositoryService**.

Conceptually:

```text
Operator / Workflow / Runtime / MCP
                |
                v
        ChampCity RepositoryService
                |
        ChampCity source-control model
                |
      +---------+----------+----------------+
      |                    |                |
   GitProvider        Future Provider   Future Provider
      |                    |                |
 Git repository        alternative      remote/native
 refs/commits/         VCS adapter       source system
 worktrees/index
```

The rest of ChampCity requests semantic source-control outcomes. The provider translates those outcomes into provider-specific mechanics.

A future provider may use different concepts internally. It must satisfy ChampCity's contracts rather than forcing ChampCity workflows to adopt its terminology.

## Problem Being Solved

The 2026-09-20 concurrent-development incident exposed a broader architectural problem than missing worktree tools.

The workflow wanted a simple semantic result:

> Multiple Work Items may execute independently and concurrently. Each completed implementation becomes a durable revision that can be reviewed and integrated into the current development target.

The implementation leaked Git's mechanics instead:

- a branch was mistaken for a writable checkout;
- a worktree was treated as an incidental runtime directory rather than a managed source resource;
- uncommitted work could be present in one checkout while repository inspection targeted another;
- a named branch could remain unchanged while the actual implementation existed under detached execution state;
- review readiness was described semantically even though no durable implementation revision existed;
- the Operator and Architect had to reason about Git checkout topology to understand where source physically existed.

The correct fix is not to recreate Git. It is to move Git below a stable ChampCity source-control boundary.

## Design Principles

### 1. ChampCity owns the mental model

Operator-facing and workflow-facing concepts must describe engineering intent:

- start isolated work;
- inspect current implementation;
- create a durable implementation revision;
- review that exact revision;
- combine completed work with the current integration target;
- synchronize or publish when required;
- retire disposable execution state safely.

The normal workflow must not require the Operator to perform or understand Git bookkeeping.

### 2. Provider mechanics are deterministic infrastructure

When no semantic judgment is required, source-control mechanics belong to code, not model inference.

Examples include:

- resolving revisions;
- creating provider refs/lines;
- provisioning checkouts;
- calculating changed files and diffs;
- capturing a durable source revision;
- determining ancestry;
- synchronizing remotes;
- constructing a mechanical integration candidate;
- advancing a target ref after proof;
- retiring a safe checkout.

AI may interpret a diff, resolve a semantic conflict, or propose a change. It does not manually operate provider bookkeeping as the ordinary workflow.

### 3. Git is the first adapter, not the contract

Current bounded Git code is valuable implementation material.

The target architecture preserves that implementation behind a provider interface rather than replacing it merely for abstraction purity.

Provider-specific concepts may appear in:

- diagnostics;
- implementation adapters;
- migration/compatibility surfaces;
- advanced power-user views;
- provider capability reporting.

They must not define core workflow state.

### 4. Durable work is revision-centered

A completed implementation is identified by an immutable **SourceRevision**, not by "whatever files currently exist in a checkout."

A writable checkout is execution state. A durable revision is review/integration evidence.

This distinction is mandatory for concurrent work and recovery.

### 5. Checkout state is explicit

RepositoryCheckout is a first-class resource.

The source-control provider owns how a concrete writable view is implemented. For Git this is normally a linked worktree or primary checkout.

The workflow refers to the checkout by ChampCity identity, not by an arbitrary filesystem path.

### 6. Integration is a separate lifecycle from implementation

A Work Item may complete against an older target revision while other work advances the integration target.

The completed implementation revision remains valid. ChampCity combines that immutable incoming revision with the **current** integration target through IntegrationCandidate mechanics.

Ordinary implementation history does not need to be rewritten merely because the target moved.

### 7. Provider-specific UX is optional, not required

Power users may inspect Git branch names, commit IDs, worktree paths, provider status, or raw diffs.

The guided product model should present Work Item, revision, checkout, review, validation, integration, and synchronization state.

## Canonical Source-Control Domain

### Repository

Stable ChampCity identity for a source/content repository.

A Repository has one configured source-control provider when source control is supported.

### RepositoryCheckout

A concrete readable/writable working copy of a Repository.

A checkout is execution infrastructure, not the durable identity of completed work.

See `CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`.

### SourceLine

A movable named line of development when the provider supports that concept.

Typical uses:

- a Work Intake's isolated development line;
- an integration target such as `dev`;
- release or maintenance lines where product policy requires them.

For Git, SourceLine maps to a branch/ref.

ChampCity workflows should normally identify the owning Work Item and semantic role first. The provider branch name is mechanical metadata.

### SourceRevision

An immutable provider-backed source state.

Required properties include:

- Repository identity;
- provider identity/type;
- immutable provider revision identifier;
- creation/provenance metadata available from the provider;
- optional SourceLine association at the time of observation;
- deterministic content/revision evidence as required.

For Git, SourceRevision maps to a commit object ID.

### PendingChangeSet

Uncommitted source differences in a RepositoryCheckout relative to its current SourceRevision.

PendingChangeSet is recoverable execution state, not a completed implementation.

It may be inspected, attributed, validated, checkpointed, or explicitly abandoned. It must not be silently discarded.

For Git, this abstracts working-tree and index state.

### ImplementationRevision

A SourceRevision produced as the durable implementation result of one Work Item or bounded implementation unit.

An ImplementationRevision is eligible for review only after:

- attributable changes are captured;
- required implementation result/report exists;
- the provider successfully creates the durable SourceRevision;
- the resulting immutable revision ID is recorded;
- no completed implementation exists only as PendingChangeSet state.

### IntegrationTarget

The semantic target line/revision into which completed work is intended to land.

For current ChampCity development this is normally the `dev` SourceLine, but the architecture does not hard-code that name.

### IntegrationCandidate

An isolated candidate SourceRevision/state representing the attempted combination of:

- one immutable incoming ImplementationRevision; and
- the current IntegrationTarget revision.

The candidate is validated before the target advances.

This is already the direction of the WIR20/WIR21 integration architecture.

### SourceControlReceipt

Deterministic evidence that a source-control operation occurred.

Receipts should identify semantic operation, Repository, relevant checkout/line/revision identities, before/after provider revisions, outcome, and bounded error evidence.

They must not require an AI model to reconstruct provider state from prose.

## RepositoryService Semantic Operations

The permanent service API should expose semantic operations. Exact method naming may evolve during implementation, but the ownership boundary is normative.

### Inspection

```text
listRepositories(...)
inspectRepository(repositoryId)

listCheckouts(repositoryId)
inspectCheckout(repositoryId, checkoutId)

listSourceLines(repositoryId, filter?)
inspectSourceLine(repositoryId, sourceLineId)

resolveRevision(repositoryId, revisionSelector)
inspectRevision(repositoryId, sourceRevisionId)

getStatus(repositoryId, checkoutId?)
getChangedFiles(repositoryId, checkoutId?)
getDiff(repositoryId, checkoutId?, options?)
readFile(repositoryId, location, path)
readFileAtRevision(repositoryId, sourceRevisionId, path)
getHistory(repositoryId, query)
```

### Work-source lifecycle

```text
createWorkSource(repositoryId, baseRevision, workOwner)
provisionCheckout(repositoryId, sourceLineOrRevision, checkoutPolicy)
resumeCheckout(repositoryId, checkoutId)
retireCheckout(repositoryId, checkoutId, retirementPolicy)
```

A provider may implement `createWorkSource` with a branch, bookmark, change identifier, or another native primitive.

### Durable revision lifecycle

```text
captureImplementationRevision(repositoryId, checkoutId, attribution)
inspectImplementationRevision(...)
```

The provider handles staging/index mechanics internally when required.

The semantic request is to capture the exact attributed change set as a durable revision—not "run git add and git commit."

### Synchronization

```text
refreshRepository(repositoryId, remotePolicy?)
synchronizeSourceLine(repositoryId, sourceLineId, target?)
```

Remote synchronization is separate from local durable revision creation.

A local implementation may be reviewable even when optional remote synchronization fails, according to workflow policy.

### Integration

```text
prepareIntegrationCandidate(repositoryId, incomingRevision, integrationTarget)
inspectIntegrationCandidate(...)
advanceIntegrationTarget(repositoryId, validatedCandidate)
retireIntegrationCandidate(...)
```

Semantic conflict resolution remains an AI/human judgment path when required. Provider-specific merge mechanics remain deterministic.

### Recovery

```text
inspectPendingChanges(repositoryId, checkoutId)
recoverCheckout(repositoryId, checkoutId)
abandonPendingChanges(repositoryId, checkoutId, explicitPolicy)
```

Destructive recovery must be explicit, policy-bounded, and evidenced. No normal workflow should rely on implicit reset/clean/stash behavior.

## Source-Control Provider Contract

A provider adapter implements only the mechanics supported by its backend and reports capabilities explicitly.

Conceptual capability groups:

- immutable revisions;
- named development lines;
- concurrent writable checkouts;
- changed-file/diff inspection;
- durable revision creation;
- ancestry/merge-base semantics;
- isolated integration;
- remote synchronization;
- labels/tags where applicable;
- exact revision file reads;
- cleanup/recovery.

RepositoryService evaluates workflow requirements against provider capabilities before execution.

Unsupported capability must fail visibly. ChampCity must not emulate provider semantics through hidden lossy behavior merely to preserve a generic interface.

## GitProvider Mapping

The first provider maps ChampCity semantics to Git approximately as follows:

| ChampCity concept | Git implementation |
| --- | --- |
| Repository | Git repository/common object database |
| SourceLine | branch/ref |
| SourceRevision | commit object ID |
| RepositoryCheckout | primary checkout or linked worktree |
| PendingChangeSet | working tree + index differences |
| ImplementationRevision | attributed commit/checkpoint commit |
| IntegrationTarget | target branch/ref, currently usually `dev` |
| IntegrationCandidate | isolated checkout/ref plus mechanical merge result |
| refreshRepository | fetch |
| synchronizeSourceLine | push |
| retireCheckout | validated worktree removal |
| revision history/ancestry | commit graph / merge-base operations |

The mapping is adapter documentation. It is not permission for higher layers to depend directly on Git commands.

## Git Concepts Hidden by the Adapter

### Staging/index

ChampCity asks to capture an attributed PendingChangeSet as an ImplementationRevision.

GitProvider may stage exact paths internally. The workflow does not need a "staged" lifecycle state except in low-level diagnostics/recovery.

### Detached HEAD

A detached Git checkout is represented as a RepositoryCheckout attached directly to a SourceRevision rather than a SourceLine.

This is valid provider state, not an application error by definition.

Before completed work becomes a durable Work Item result, RepositoryService must ensure the resulting ImplementationRevision is durably associated with the Work Item's source lineage according to policy.

### Stash

Stash is not a normal ChampCity workflow primitive.

ChampCity should preserve explicit PendingChangeSet/checkpoint/recovery state rather than routinely moving work into an opaque stash stack.

### Reset/clean

Destructive reset/clean behavior is not a routine semantic operation.

Recovery or abandonment uses explicit bounded operations with receipts and must never silently destroy the only copy of source work.

### Worktree

"Worktree" is a GitProvider implementation term.

The canonical ChampCity concept is RepositoryCheckout.

### Branch

"Branch" remains useful diagnostics and compatibility terminology, but workflow ownership should use SourceLine/Work Item semantics.

## Provider-Neutral Runtime Boundary

RuntimeService must not require a Git-aware worker.

An Implementer receives:

- Repository identity;
- RepositoryCheckout identity;
- checkout root/cwd supplied by RepositoryService;
- current immutable base revision;
- bounded source-write capability;
- task scope and constraints.

The Runtime adapter may know filesystem paths because it must execute tools. It must not become the authority for creating source lines, changing checkout ownership, or deciding integration mechanics.

## MCP Boundary

MCP exposes controlled RepositoryService capabilities.

It should provide model-facing semantic tools such as:

- inspect Repository/checkout/revision;
- read source from a selected checkout or exact revision;
- inspect diff/history;
- request bounded source lifecycle operations when the calling workflow permits them.

MCP should not require models to orchestrate a long sequence of provider-specific commands to accomplish routine mechanics.

Low-level provider diagnostics may remain available in a dedicated advanced/diagnostic action surface.

## Project State Boundary

Source code/history remains RepositoryService/provider-owned.

Structured Project State stores semantic references and evidence such as:

- Work Item → SourceLine;
- Work Item → RepositoryCheckout while executing;
- Work Item → ImplementationRevision;
- Validation → exact SourceRevision;
- IntegrationCandidate relationship;
- resulting IntegrationTarget revision;
- SourceControlReceipts/evidence references.

Project State must not duplicate the VCS object database or persist arbitrary checkout file content.

## Operator Experience

The normal Operator experience should read like a development team, for example:

```text
HOTFIX20
Implementer: Astra
Status: Ready for Architect Review
Implementation Revision: captured
Integration: pending

WIR22
Implementer: Astra
Status: Executing

Git MCP Expansion
Implementer: Astra
Status: Validation
```

A diagnostic drawer may additionally show:

```text
Provider: Git
Source line: hotfix/mcp-session-admission-stream-liveness
Revision: <commit>
Checkout: <checkoutId>
Provider checkout path: C:\...
```

The diagnostic representation must not become the required workflow model.

## Concurrency Model

Multiple Work Items may have independent SourceLines and RepositoryCheckouts concurrently.

Only operations against the same movable IntegrationTarget require serialization.

This yields the team model:

```text
Repository
   |
   +-- Work Item A -> SourceLine A -> Checkout A -> ImplementationRevision A
   +-- Work Item B -> SourceLine B -> Checkout B -> ImplementationRevision B
   +-- Work Item C -> SourceLine C -> Checkout C -> ImplementationRevision C
   |
   +-- IntegrationTarget
          ^
          |
       validated candidates advance this target one at a time
```

Concurrent execution is not a queue. Target advancement is a short serialized critical section.

## Portability and Future Providers

ChampCity must not assume every future provider has:

- a Git-style index;
- branches with Git semantics;
- worktrees;
- merge commits;
- Git remotes;
- SHA commit IDs.

The source-control provider contract should use capability negotiation and semantic identities.

A future provider is viable if it can satisfy the source lifecycle required by a Work Item. It does not need to mimic unused Git features.

## Failure and Safety Invariants

1. No completed source work may exist only in disposable runtime state when marked review-ready.
2. RepositoryCheckout identity must never be inferred solely from current process cwd.
3. A checkout must be proven to belong to the selected Repository before access.
4. Destructive cleanup may not destroy the only copy of pending work.
5. Integration may advance a target only from an exact validated candidate.
6. Provider failures must preserve inspectable source state whenever practical.
7. Provider-specific state changes must produce deterministic receipts.
8. AI tools may not silently widen Repository/checkout/source-line scope.
9. A provider capability mismatch fails visibly instead of falling back to arbitrary shell behavior.
10. Source-control implementation detail must not create a new approval hierarchy.

## Current Implementation Direction

Current bounded Git mechanics under `src/main/agentHarness/repository/` are the first GitProvider implementation source.

The RepositoryCheckout Orchestration bundle implements the concurrency/checkouts portion of this architecture.

During migration, compatibility APIs such as `git_toolbox.prepare_branch`, `stage_changes`, `commit`, and `switch_branch` may remain available. They are transitional/provider-facing tools, not the target workflow API.

New V2 workflow code should prefer RepositoryService semantic operations and SourceRevision/RepositoryCheckout identity.

## Explicit Non-Goals

This architecture does not require:

- writing a new version-control storage engine;
- abandoning Git interoperability;
- removing Git diagnostics or power-user capabilities;
- replacing GitHub;
- emulating every Git command;
- choosing a second source-control provider now;
- hiding meaningful source conflicts from the Operator;
- allowing AI workers to become source-control authorities.

The goal is to own the **ChampCity source-control experience**, while treating Git or any future VCS as replaceable infrastructure beneath it.
