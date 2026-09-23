# ChampCity Agent-Free Source-Control Lifecycle Architecture

**Status:** Adopted architecture — 2026-09-23  
**Operator decision:** Source-control mechanics are deterministic application behavior. Agents do not operate Git as part of normal workflow execution.  
**Migration scope:** Implement the semantic RepositoryService/source-control seam inside the current V1 host before broad web-client cutover. General concurrent multi-agent worktree orchestration remains a later implementation package.

## 1. Purpose

ChampCity needs source control to behave like product infrastructure rather than an additional workflow authority or an agent-operated command surface.

The current Work Intake implementation couples admission of new work to the cleanliness and branch state of the selected primary checkout. That coupling was inherited from the original WIR design: the application required a clean checkout, switched that checkout to the selected base, created the Work Intake branch there, and only then persisted the Intake.

That design is superseded.

A Work Intake is Operator-authored semantic intent. Repository cleanliness, current checkout branch, staged files, untracked files, or unrelated pending work do not determine whether the Operator may capture new work.

## 2. Governing Principles

1. **Agent-free Git:** routine branch, revision, staging, commit, integration, synchronization, and graph inspection mechanics are application-owned deterministic operations.
2. **Operator authority remains semantic:** the Operator owns product/planning dispositions. A Git operation is not a second approval gate.
3. **Save intent first:** Work Intake semantic state is persisted before source preparation is allowed to fail.
4. **Source preparation is explicit state:** source can be unprepared, preparing, ready, or blocked without deleting or rejecting the Work Intake.
5. **Existing projects default to `dev`:** ordinary feature, issue, refactor, integration, infrastructure, and research Work Intakes branch from the exact current `dev` revision unless explicit project policy selects another integration target.
6. **Greenfield establishes `main` and `dev`:** a new Git-backed Project receives a deterministic initial `main` baseline, `dev` is created from it, and the first Work Intake receives its own work branch from `dev`.
7. **Work never normally occurs directly on `main` or `dev`:** those lines are stable/release and integration targets. Work Intakes own work SourceLines.
8. **Machine checkpointing:** implementation completion and workflow disposition boundaries create deterministic application-owned revisions.
9. **Integration is mechanical until semantics are required:** ordinary integration is application-owned. Semantic conflicts may require Architect/Implementer/Operator reasoning, but the application still owns Git mechanics.
10. **Visualization is a projection:** the Source Control page reads topology from RepositoryService and meaning from ChampCity workflow/project state. The graph itself is not an authority.
11. **Worktrees are staged:** the immediate package supports one actively writable checkout and multiple durable work branches. General per-Work-Intake/per-agent checkout provisioning is deferred until concurrent multi-agent implementation is intentionally introduced.
12. **Forward-compatible V1 bridge:** this is V2 RepositoryService behavior pulled forward into the V1 host, not throwaway Electron Git logic.

## 3. Correct Lifecycle

### Existing Project

```text
Operator clicks Save Work Intake
        ↓
persist Work Intake identity + intent
        ↓
resolve exact dev SourceRevision
        ↓
create Work Intake SourceLine from that revision
        ↓
record source-preparation state + branch binding
        ↓
when the Intake becomes the active writable workflow:
attach/switch the current writable checkout to its SourceLine
        ↓
routing / planning / execution
        ↓
machine implementation checkpoint
        ↓
review / validation
        ↓
Operator disposition checkpoints where the workflow requires them
        ↓
machine integration into dev
```

The Save action is not disabled because the primary checkout is dirty.

Creating the SourceLine must use ref-level mechanics that do not borrow the primary checkout's index or working files.

### Greenfield Project

```text
persist new Project + first Work Intake intent
        ↓
initialize Git repository when required
        ↓
create deterministic initial main SourceRevision
        ↓
create dev from main
        ↓
create first Work Intake SourceLine from dev
        ↓
activate that Work Intake for writable work
```

The first implementation does not work directly on `dev`.

## 4. Work Intake Persistence and Source Preparation

The current repository Markdown implementation cannot remain the only authority for newly captured Work Intake state because it forces persistence to depend on a particular checked-out branch.

Before SCL02 is implemented, ChampCity must implement Structured Project State and make ProjectStateService the authoritative state boundary. Work Intake therefore persists directly as a canonical `WorkIntake` record; source readiness persists through its canonical `SourceBinding`/related Project State records.

Conceptual state:

```text
WorkIntakeState
  intakeId
  projectId
  request
  desiredOutcome
  constraints
  evidenceContext
  lifecycleState
  requestedIntegrationTarget

SourcePreparationState
  state: unprepared | preparing | ready | blocked
  repositoryId
  baseSourceRevision
  sourceLineId
  providerBranchName
  currentSourceRevision
  lastFailure?
```

Repository Markdown remains a portable/generated workflow artifact after structured-state cutover. It may be materialized after source preparation is ready, but failure to materialize it must not erase or mutate the canonical Work Intake.

The temporary V1 host-local Work Intake persistence adapter previously contemplated by this architecture is rejected. The Source-Control Lifecycle implementation package inserts SCL01A–SCL01Z between SCL01 and SCL02 to establish ProjectStateService first.

## 5. Branch / SourceLine Policy

### Existing projects

Default integration target: `dev`.

Default Work Intake branch naming remains deterministic and collision-safe. Human-readable diagnostics may include route/work identity, but durable ownership is by Work Intake identity, not branch name alone.

A normal branch creation operation:

- resolves `dev` to an exact immutable SourceRevision;
- atomically creates the Work Intake SourceLine from that revision;
- does not switch the primary checkout;
- does not require the primary checkout to be clean;
- does not overwrite or silently reuse an existing incompatible branch;
- emits a deterministic receipt.

### Greenfield projects

Repository bootstrap establishes:

- `main` as the initial stable/release SourceLine;
- `dev` as the integration SourceLine;
- first Work Intake branch from the exact initial `dev` revision.

The Git provider may implement the initial baseline with bounded provider mechanics. The higher workflow requests the semantic result; it does not script Git commands.

## 6. Single-Checkout Transitional Model

This package does not yet introduce general multi-agent worktree execution.

During the transitional implementation:

- many Work Intake SourceLines may exist concurrently;
- only one normal writable checkout is active for implementation at a time;
- switching that checkout is a RepositoryService operation;
- checkout cleanliness may constrain **checkout reassignment**, because changing the filesystem view can endanger pending work;
- checkout cleanliness does **not** constrain Work Intake creation or SourceLine creation;
- unexplained pending changes remain visible and inspectable; ChampCity never silently stash/reset/clean/discard them.

The semantic model still includes optional `repositoryCheckoutId` so future worktree provisioning can be added without changing workflow ownership.

## 7. Deterministic Checkpoints

ChampCity owns two checkpoint classes.

### 7.1 Implementation Revision

When an Implementer completes bounded implementation work, the application:

1. verifies the expected Work Intake SourceLine/current writable checkout;
2. calculates attributable changed paths;
3. stages exactly those paths through the provider;
4. creates an ImplementationRevision with deterministic receipt metadata;
5. records the immutable resulting revision;
6. presents that exact revision to Architect/Validator review.

This requires no Operator Git approval. It records what was implemented; it does not approve the product result.

### 7.2 Disposition Revision

When an Operator applies a workflow disposition that changes durable workflow/project artifacts, ChampCity creates a deterministic lifecycle checkpoint on the current Work Intake SourceLine.

Examples include:

- route decision approved/revised;
- Architect/planning output approved/revision requested/rejected where the current workflow has an Operator disposition;
- Plan approval/revision;
- Work/Repair disposition where V1 currently requires it;
- Phase or Intake completion decisions where a human disposition is genuinely required.

The application writes the disposition, captures the attributable changed state/artifacts, and commits the resulting checkpoint.

If a lifecycle checkpoint intentionally has no changed repository artifact but the workflow requires durable source chronology, the provider may create an evidenced empty lifecycle revision. The receipt must distinguish an empty lifecycle checkpoint from a source-change checkpoint.

Commit subjects/messages are generated from structured workflow identity and checkpoint evidence, not model prose.

## 8. Checkpoint Transaction and Recovery

A disposition must not be reported as durably checkpointed until the corresponding source operation succeeds.

Required outcome states:

- `not-required`
- `pending`
- `committed`
- `blocked`
- `inspection-required`

A failed Git checkpoint does not silently roll back an Operator product decision if that decision is already durably stored outside Git. It records checkpoint failure and prevents downstream operations that require the immutable revision until recovery succeeds.

No retry may double-apply the semantic disposition. Checkpoint operations are idempotent by workflow boundary identity and expected prior revision.

## 9. Integration Lifecycle

Completed Work Intake revisions integrate into the configured IntegrationTarget, normally `dev`.

Normal path:

```text
exact completed Work Intake revision
        +
current dev revision
        ↓
prepare IntegrationCandidate
        ↓
mechanical merge/composition
        ↓
required validation
        ↓
advance dev from exact validated candidate
```

The application owns all provider mechanics.

A clean mechanical merge does not require an agent.

When source conflicts require semantic reconciliation:

- ChampCity creates/retains an Integration Repair context;
- an agent may reason about and edit the bounded conflicting source;
- the application owns staging, repair commit, revalidation, and target advancement;
- only a genuine product/architecture decision returns to the Operator.

No legacy `integrate_to_dev` checkout-switching path should define the permanent workflow.

## 10. Source-Control Visualization

ChampCity will expose a read-only Source Control workspace/page that visualizes source topology as a branch/commit graph enriched with workflow meaning.

### 10.1 Principle

> GitProvider supplies topology; ChampCity supplies meaning.

RepositoryService supplies mechanical graph facts:

- SourceLines / provider branches;
- SourceRevisions / commits;
- parent relationships;
- branch heads;
- merge/integration relationships;
- integration target;
- optional checkout attachment state;
- optional tag/release markers.

Project/workflow state supplies semantic overlays:

- Work Intake identity and title;
- route/type (feature, issue/hotfix, refactor, etc.);
- lifecycle state;
- Plan/Work Item identity;
- implementation checkpoint;
- disposition checkpoint type;
- integration state;
- current active workflow;
- later, RepositoryCheckout and active worker identity.

### 10.2 Example

```text
main
 ● release baseline
 │
dev
 ● D10──────────────────────● D14
 │\                        /│
 │ ● Feature: Work Intake UI │
 │ ● implementation          │
 │ ● plan approved───────────┘
 │
 ├──● Hotfix: MCP Session Admission
 │  ● implementation
 │  ● review approved
 │
 └────● Hotfix: OAuth Refresh
      ● planning approved
```

The graph must show human workflow labels by default. Raw branch names, commit hashes, provider checkout paths, and receipt details belong in an expandable diagnostics/details surface.

### 10.3 Source Graph Contract

RepositoryService must expose a provider-neutral graph projection equivalent to:

```text
getSourceGraph(repositoryId, options?)
```

Conceptual response:

```text
SourceGraph
  repositoryId
  integrationTargets[]
  sourceLines[]
  revisions[]
    revisionId
    parents[]
    sourceLine associations
    timestamp / provider metadata
    checkpoint metadata?
  workBindings[]
    workIntakeId
    sourceLineId
    title
    route
    lifecycleState
    integrationState
```

The client does not execute `git log --graph`, parse command output, or reconstruct workflow meaning itself.

### 10.4 Initial UI Scope

Initial Source Control page is read-only.

Required interactions:

- inspect active and completed branches/source lines;
- select a Work Intake/branch and see semantic details;
- inspect checkpoint chronology;
- distinguish `main`, `dev`, active Work Intake branches, integrated/completed branches;
- show ahead/behind or revision-distance information where meaningful;
- expose raw Git/provider details on demand.

Out of scope for this package:

- drag-to-merge;
- arbitrary branch mutation from the graph;
- force/reset/rebase controls;
- manual staging UI;
- general worktree management;
- multi-agent worker controls.

## 11. RepositoryService Bridge

The immediate implementation should compose existing bounded Git mechanics behind semantic operations.

Existing useful implementation material includes:

- `createGitBranchFromRef()` for ref-level branch creation without borrowing checkout state;
- bounded revision/history/diff/status inspection;
- machine-owned commit mechanics;
- lifecycle/source checkpoint receipt formats;
- IntegrationCandidate mechanics;
- managed worktree code reserved for later generalized concurrency.

Required semantic operations include:

```text
resolveSourceRevision(repositoryId, selector)
createWorkSource(repositoryId, baseRevision, workOwner)
activateWorkSource(repositoryId, sourceLineId)
captureImplementationRevision(repositoryId, attribution)
captureDispositionRevision(repositoryId, checkpoint)
prepareIntegrationCandidate(repositoryId, incomingRevision, target)
advanceIntegrationTarget(repositoryId, candidate)
getSourceGraph(repositoryId, options?)
```

New workflow code calls these semantics rather than low-level Git vocabulary.

## 12. Deconstruction of Current WIR Gate

The implementation must remove/supersede:

1. `getWorkIntakeProjection()` using primary-checkout cleanliness as a Save blocker.
2. Renderer disabling `Save Work Intake` because the primary checkout is dirty.
3. `workIntakeBranchService.establish()` requiring global `status.clean` before intake admission.
4. Intake persistence occurring only inside branch-establishment success.
5. Normal Work Intake establishment switching the primary checkout before the Intake exists.
6. Verification that equates Work Intake ownership with the process-selected current branch.
7. Downstream services that infer Work Intake identity exclusively from the current checkout.

Cleanliness checks remain valid when an operation actually risks a mutable checkout, such as reassigning/removing a dirty checkout or destructive recovery.

## 13. Migration Order

This work precedes broad web-client cutover because it establishes backend semantics the web client should consume.

Implementation order:

1. semantic source-control contracts/state;
2. Work Intake persistence/source-preparation separation;
3. existing-project branch policy;
4. greenfield repository baseline policy;
5. deterministic checkpoint engine;
6. workflow checkpoint wiring;
7. deterministic integration lifecycle;
8. source graph projection;
9. Source Control visualization;
10. bounded qualification and old-gate retirement.

This is a V2 backend extraction seam running in the current host. When the Service Host/web client replace Electron transport, these semantics should move without redesign.

## 14. Required Safety Invariants

- No Work Intake admission gate based on unrelated dirty checkout state.
- No silent reset, clean, stash, discard, or forced branch movement.
- Exact immutable base revision for every Work Intake SourceLine.
- No silent branch collision reuse.
- No AI-owned Git sequencing in normal workflow.
- Exact revision evidence for review and integration.
- Idempotent checkpoint/retry behavior.
- No target advancement without exact validated candidate evidence.
- Source graph is read-only projection in this package.
- Provider-specific details remain below RepositoryService except diagnostics.
- Worktree/general concurrent checkout orchestration remains deferred without preventing the data model from representing it later.
