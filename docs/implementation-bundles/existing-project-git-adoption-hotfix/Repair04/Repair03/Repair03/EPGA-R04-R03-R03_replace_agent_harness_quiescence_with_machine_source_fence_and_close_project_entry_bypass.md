
# EPGA-R04-R03-R03 — Replace Agent Harness Quiescence with a Machine-Owned Source Fence and Close Project-Entry Bypass

**Parent:** Existing Project Git Adoption Hotfix / Repair04 / Repair03  
**Current implementation baseline:** `aee844a82ad977243570ed63e70f3fbb8a9f4376`  
**Architect review baseline:** `1ac38a5dbb4341ba444b1e71ace84788b43a43f9`  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** **ACTIVE — SUPERSEDES EPGA-R04-R03-R02**

## Operator correction

The previously released Repair02 still treated Agent Harness as something Source Control had to consult before deterministic Git conversion.

That is the wrong dependency direction.

ChampCity A/I Source Control owns Git and source-topology transitions. Agent Harness/MCP/model access must obey application-owned source state, never authorize it.

This card also closes the independently confirmed UI bypass:

```text
Clear Project
-> sidebar Open Project
-> raw workspace chooser
-> activate Workflow Hub
-> Existing Project migration inspection never runs
```

The controlling rule is:

> A Project enters ChampCity only through application-owned project admission and Source Control. Model-access state and generic workspace selection must not become alternate authority paths.

---

# PART A — MACHINE-OWNED SOURCE-TOPOLOGY FENCE

## 1. Remove Agent Harness quiescence from Git conversion authority

Remove the current pre-conversion dependency:

```text
quiesceConventionalProjectModelAccess(...)
-> Agent Harness registerWorkspace(...)
-> Agent Harness unregisterRepositoryCheckout(...)
-> Source Control conversion
```

Existing Project conversion must not call Agent Harness, MCP, Service Host controls, or model-facing checkout registration in order to decide whether deterministic Git conversion may begin.

Delete or retire `quiesceConventionalProjectModelAccess()` from the Git-conversion path. If it has no legitimate non-Git caller afterward, remove it.

## 2. Introduce a neutral application-owned source-transition coordinator

Add a neutral cross-process coordinator outside `agentHarness/`, for example:

`src/main/core/projectSourceOperationCoordinator.ts`

Exact naming is implementer choice.

Required conceptual behavior:

```ts
interface ProjectSourceOperationLease {
  release(): Promise<void> | void;
}

interface ProjectSourceOperationCoordinator {
  acquireShared(projectRoot: string, owner: string): Promise<ProjectSourceOperationLease>;
  acquireExclusive(projectRoot: string, owner: string): Promise<ProjectSourceOperationLease>;
}
```

Required semantics:

- shared leases may coexist;
- an exclusive transition waits for existing shared leases to drain;
- once exclusive intent is established, no new shared lease may begin;
- acquisition is bounded;
- failure to obtain exclusive ownership happens before source mutation;
- every lease releases in `finally`;
- unrelated Projects do not block one another;
- coordination is deterministic machine state, not model state.

## 3. The coordinator must work across Desktop and detached Service Host processes

An in-memory mutex in Electron main is insufficient.

Use a deterministic cross-process mechanism. A filesystem-backed lease namespace under ChampCity user-data is acceptable, for example:

```text
<userData>/source-operation-leases/<hash(canonical-project-root)>/
```

Do not place the lease state in the Project tree or Git repository.

Do not persist raw project paths when a stable hash is sufficient.

Equivalent OS-level coordination is acceptable if already available.

The chosen mechanism must prove:

1. a new model operation cannot slip in after exclusive transition intent exists;
2. exclusive acquisition waits for already-running model operations;
3. process crash cannot permanently deadlock a Project;
4. stale lease recovery is deterministic and bounded;
5. unrelated Projects remain independent.

Do not add a new third-party dependency solely for locking unless repository policy requires and permits it.

## 4. Model-facing operations obey the application fence

Agent Harness does not own the coordinator. It uses the neutral coordinator as a client.

At the central tool-dispatch boundary, acquire a shared Project lease before executing model-facing operations that can touch Project/source state.

At minimum cover:

- `git_toolbox` inspection and mutation;
- checkout-bound test/release actions that can invoke Git or touch a RepositoryCheckout;
- `repo_toolbox` filesystem mutations against the active Project workspace.

If it is safer and simpler to lease all bounded Project tool calls except pure diagnostics/discovery, that is acceptable.

Do not expose acquire/release as MCP tools.

Models must not reason about the lock.

## 5. Existing Project conversion owns the exclusive lease

For destructive normalization:

```text
Operator accepts conversion
-> application acquires exclusive Project source-transition lease
-> revalidate exact inspected plan
-> deterministic Source Control conversion
-> release exclusive lease
-> downstream model-access projection/reconciliation
```

The exclusive lease must be held before creation of:

- migration journal state;
- candidate repository metadata;
- relocated Git metadata;
- Main/Dev worktrees;
- any other conversion mutation.

If the lease cannot be acquired within the bounded deadline:

- no migration journal is created;
- no candidate repository is created;
- root conventional Git remains authoritative;
- return a machine-level "Project source is busy" condition;
- do not describe this as an MCP/Agent Harness failure.

## 6. Agent Harness availability becomes irrelevant to Git authority

With the neutral coordinator:

- Agent Harness running -> tool calls hold shared leases and drain mechanically;
- Agent Harness stopped -> there are no model leases to drain;
- MCP disconnected -> irrelevant to Source Control;
- Service Host incompatible -> irrelevant to Git conversion authority.

Remove Agent Harness availability/error classification from the conversion decision.

Agent Harness availability matters only for downstream model-access projection and later model execution.

## 7. Preserve Repair01 downstream projection semantics

After Source Control succeeds:

```text
Source Control state
-> Current Project/application state
-> attempt model-access projection
```

Projection failure:

- does not roll back Git;
- does not change completed conversion into conversion failure;
- leaves model access degraded;
- remains retryable through the existing reconciliation path.

Preserve the degraded-state UI and Retry Model Access behavior.

## 8. Workflow source materialization remains deterministic

Workflow branch/worktree creation remains Source Control/application work.

Before launching a model into that checkout, exact model-access projection must succeed.

Projection failure blocks model execution only and does not roll back valid Git/worktree state.

## 9. Preserve the neutral repository refactor

Keep:

- `src/main/core/applicationErrors.ts`;
- `src/main/core/gitExecution.ts`;
- `src/main/repository/*`;
- no Source Control production imports into `agentHarness/*`.

The new coordinator belongs with neutral/application mechanics.

---

# PART B — CLOSE THE PROJECT-ENTRY / MIGRATION BYPASS

## 10. Confirmed bypass

The canonical landing flow is:

```text
chooseWorkspaceFolder()
-> inspectExistingProjectGitAdoption()
-> warning when conversion-required
-> Accept/Cancel
-> registerCurrentProject("existing")
-> Workflow Hub
```

The sidebar path currently does:

```text
chooseWorkspace()
-> chooseWorkspaceFolder()
-> activateWorkspaceSelection(..., "workflow-hub", null)
```

It never performs Existing Project adoption inspection or Current Project registration.

`clearWorkspace()` also returns the UI to `workflow-hub`, leaving the sidebar available.

Exact bypass:

```text
Open Project A
-> Clear Project
-> sidebar Open Project
-> choose conventional Git Project B
-> migration warning bypassed
-> raw folder activated in Workflow Hub
```

## 11. Establish one canonical Existing Project admission function

Create/reuse one canonical renderer/application entry function for every UI action meaning:

- Open Project;
- Change Project;
- Open Existing Project from landing;
- Open Existing Project after Clear Project.

Canonical path:

```text
choose folder
-> inspect Existing Project source state
-> conversion-failed / conversion-required / ready decision
-> require consent when needed
-> apply deterministic conversion after consent
-> register Current Project
-> activate Workflow Hub
```

Do not hand-copy the sequence into multiple handlers.

The sidebar must delegate to this exact path.

## 12. Clear Project returns to project selection

After `Clear Project`:

- Current Project is cleared;
- selected workspace is cleared;
- pending migration state is cleared;
- repository-derived UI state is cleared;
- shell returns to landing/project selection;
- Workflow Hub is not shown without a Current Project.

The user must then choose Start New Project or Open Existing Project.

## 13. Workflow Hub requires a Current Project

Strengthen the renderer boundary so a Project UI path cannot call:

```ts
activateWorkspaceSelection(selection, "workflow-hub", null)
```

If destination is `workflow-hub`, require a valid `CurrentProjectRuntimeContext`.

Apply the same rule to other Project-only destinations that assume Current Project identity.

A generic filesystem workspace must not masquerade as an admitted Project.

## 14. Audit every direct folder chooser call

Current renderer has four direct `chooseWorkspaceFolder()` call sites.

Expected end-state:

- Start New Project may select a new Project container;
- canonical Open Existing Project may select a folder;
- sidebar Open/Change Project delegates to canonical Existing Project admission;
- no other call site may switch active Project through raw workspace activation.

### Project Intake repository chooser

`chooseProjectRepository()` currently invokes the generic workspace chooser and activates the selected folder even though a Current Project already exists.

That must not silently change Project identity.

Choose the smallest correct behavior:

- if Project Repository is the Current Project root in V1, bind it to Current Project and remove/disable arbitrary rebinding;
- if changing it is truly supported, route it through full Project admission and explicitly reset/rebind Project state.

Document the chosen behavior in the Implementer report.

## 15. Keep generic workspace APIs generic

`workspace:choose` may remain a generic filesystem-workspace capability for legitimate non-Project surfaces.

Do not move Project business logic into the generic workspace API.

The rule is:

> Project UI routes may not treat generic workspace selection as successful Project admission.

---

# PERMANENT PROOF

## 16. Cross-process source fence proof

Prove:

1. model-facing operation A acquires shared lease;
2. Existing Project conversion requests exclusive lease;
3. new model-facing operation B cannot begin;
4. conversion waits for A to release;
5. conversion then acquires exclusive lease and proceeds;
6. Agent Harness was never queried for Git authority;
7. unrelated Project C remains usable concurrently.

## 17. Agent Harness completely unavailable proof

Through the actual product path:

1. Agent Harness/Service Host is unavailable;
2. conventional Existing Project conversion is accepted;
3. exclusive machine source lease is acquired;
4. Source Control conversion succeeds;
5. Current Project registration succeeds;
6. model access is degraded afterward;
7. no Agent Harness control was required before Git mutation.

## 18. Crash/stale lease proof

Prove the cross-process mechanism cannot permanently strand a Project after an owning process disappears.

Use deterministic synthetic stale state or a terminated child fixture.

Do not require a long wall-clock TTL in tests.

## 19. Exact sidebar bypass regression

Permanent UI/controller proof:

```text
open Project A
-> Clear Project
-> UI returns to landing/project selection
-> Open Existing Project
-> choose conventional Git Project B
-> conversion warning appears
-> Workflow Hub is NOT activated before consent
```

Then:

- Cancel -> no Current Project selected;
- Accept -> conversion runs once, Current Project registers once, Hub activates.

## 20. Change Project regression

While Project A is active:

```text
sidebar Change Project
-> choose conventional Git Project B
-> same canonical Existing Project inspection
-> conversion warning required
```

No raw `activateWorkspaceSelection(..., "workflow-hub", null)` path is permitted.

## 21. Source-neutral / managed-ready regression

Canonical Open/Change Project must still handle:

- source-neutral Existing Project;
- managed-ready Existing Project;
- conversion-failed Existing Project.

No unnecessary warning for source-neutral or managed-ready state.

## 22. Greenfield regression

Start New Project remains:

```text
choose empty Project container
-> deterministic source bootstrap
-> Current Project registration
-> Project Creation flow
```

It must not be routed through Existing Project conversion warning.

## 23. Project Intake repository chooser regression

Prove the Project Intake repository control cannot switch the application to an unadmitted arbitrary folder.

---

# DO NOT REGRESS

Preserve:

- Repair03 Source Control independence from Agent Harness;
- Repair01 neutral Git/error/repository module placement;
- post-conversion degraded model-access semantics;
- Retry Model Access;
- Workflow source materialization before model projection;
- public MCP `git_toolbox.list_repository_checkouts`;
- private checkout-list control removal;
- Service Host build-generation fencing;
- source-preservation staging;
- schema-3 migration journaling/recovery;
- Main/Dev managed topology;
- non-Git generic workspaces as a legitimate MCP/model-access capability.

Do not reintroduce Agent Harness or MCP imports into Source Control.

Do not add model reasoning to Git orchestration.

---

# VALIDATION

Run focused validation only:

- production typecheck/build;
- machine source-operation coordinator owner;
- cross-process coordinator owner;
- Existing Project managed-source owner;
- Current Project entry/controller owner;
- renderer project-entry regression owner;
- Greenfield bootstrap owner;
- Workflow source materialization/model-launch owner;
- Agent Harness public MCP/tool-dispatch owner for shared lease integration;
- Source Control boundary/import guard;
- Service Host lifecycle/build-generation owner only if touched;
- capability-map integrity if touched;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad/full regression suite.

# IMPLEMENTER REPORT

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair03/Repair03/Reports/EPGA-R04-R03-R03_IMPLEMENTER_REPORT.md`

The report must explicitly state:

- old Agent Harness quiescence calls removed;
- machine-owned coordinator location and mechanism;
- cross-process atomicity/stale-lease strategy;
- model tool surfaces acquiring shared leases;
- Source Control/topology operation acquiring exclusive lease;
- proof Agent Harness absence is irrelevant to Git authority;
- canonical Project-entry path after repair;
- sidebar Clear/Open/Change behavior after repair;
- Project Intake repository chooser decision;
- focused test/build results.

# CHECKPOINT AND STOP

Commit:

`EPGA-R04-R03-R03 use machine source fence and close project entry bypass`

Then STOP for Architect review.

Do not retry the real ChampCity_AI conversion before Architect acceptance.
