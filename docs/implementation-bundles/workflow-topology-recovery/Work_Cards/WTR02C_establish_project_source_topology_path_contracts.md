# WTR02C — Separate Project Container, Repository, SourceLine, and RepositoryCheckout Path Contracts

**Milestone:** WTR02 — Repository, checkout, MCP, and source ownership contracts  
**Implementer:** GPT 6.0 Luna Medium  
**Depends on:** WTR02B closed at `ed28b322d0ac4f454b75b96db8b7aaf43bd57060`  
**Architecture:** `docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`  
**Operator decisions:** `docs/implementation-bundles/workflow-topology-recovery/OPERATOR_DECISIONS_2026-09-23.md`  
**Plan:** `docs/implementation-bundles/workflow-topology-recovery/WORK_CARD_PLAN.md`  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02C_IMPLEMENTER_REPORT.md`

## 1. Objective

Establish the provider-neutral identity and path contracts that separate:

```text
Project container
Repository
SourceLine
RepositoryCheckout
```

The architecture must no longer require these to mean the same filesystem location.

The target semantic model is:

```text
Project
└── Repository
    ├── SourceLine: main
    │   └── RepositoryCheckout: Main/
    ├── SourceLine: dev
    │   └── RepositoryCheckout: Dev/
    └── Workflow SourceLine
        └── RepositoryCheckout: .champcity/checkouts/<workflow-id>/
```

with shared repository metadata permitted at:

```text
.champcity/repository.git/
```

The Project root is a **container**, not a RepositoryCheckout identity.

This card defines and validates those contracts only.

It does **not** create the physical topology yet.

## 2. Architectural boundary

WTR02C is a contract card.

It must establish:

- semantic Repository identity;
- semantic RepositoryCheckout identity;
- explicit checkout roles;
- Project-relative managed path vocabulary;
- deterministic resolution of the preferred managed topology beneath a Project container;
- path containment/separation invariants.

It must **not**:

- initialize Git;
- move the current repository;
- create `Main/` or `Dev/`;
- create `.champcity/repository.git/`;
- create Workflow worktrees;
- register MCP workspaces/checkouts;
- change Git toolbox targeting;
- migrate existing source-control callers.

Those are later cards.

## 3. Shared Repository contract

Update:

`src/shared/sourceLifecycleContracts.ts`

Add:

```ts
export interface Repository {
  repositoryId: string;
  provider: "git";
}
```

This is semantic identity only.

It must not contain:

- absolute filesystem root;
- Project root;
- checkout path;
- branch name;
- Workflow ID.

A Repository is not a directory contract.

Git is the first provider implementation, not Workflow identity.

## 4. SourceLine remains pathless

Retain the existing `SourceLine` semantic identity:

```ts
export interface SourceLine {
  repositoryId: string;
  sourceLineId: string;
  headRevisionId: string;
  providerBranchName: string;
}
```

Do not add a filesystem path to SourceLine.

Required invariant:

> A SourceLine identifies source history. A RepositoryCheckout identifies a concrete readable/writable working copy.

A SourceLine may exist without a RepositoryCheckout.

That is required for lazy Workflow materialization.

## 5. RepositoryCheckout contract

Add to `src/shared/sourceLifecycleContracts.ts`:

```ts
export type RepositoryCheckoutRole = "main" | "dev" | "workflow";

export interface RepositoryCheckout {
  repositoryCheckoutId: string;
  repositoryId: string;
  sourceLineId: string;
  role: RepositoryCheckoutRole;
  projectRelativePath: string;
  workflowId?: string;
}
```

Semantics:

- `repositoryCheckoutId` = application-owned checkout identity;
- `repositoryId` = owning Repository;
- `sourceLineId` = checked-out semantic SourceLine;
- `role` = durable main, durable dev, or Workflow checkout;
- `projectRelativePath` = path from Project container root;
- `workflowId` exists only for role `workflow`.

Absolute paths must not enter this shared/persistable contract.

Do not add provider branch name to RepositoryCheckout. That remains SourceLine/provider data.

## 6. Managed Project source path vocabulary

Add a shared relative-path contract in `src/shared/sourceLifecycleContracts.ts`:

```ts
export interface ManagedProjectSourcePaths {
  repositoryMetadataRelativePath: string;
  mainCheckoutRelativePath: string;
  devCheckoutRelativePath: string;
  workflowCheckoutRootRelativePath: string;
}
```

Export one reviewed constant:

```ts
MANAGED_PROJECT_SOURCE_PATHS
```

with exact values:

```text
repositoryMetadataRelativePath = ".champcity/repository.git"
mainCheckoutRelativePath       = "Main"
devCheckoutRelativePath        = "Dev"
workflowCheckoutRootRelativePath = ".champcity/checkouts"
```

These are Project-container-relative paths.

Do not use machine-specific separators in the shared constant. Use canonical forward-slash relative paths.

## 7. Main-process topology resolver

Create:

`src/main/sourceControl/projectSourceTopology.ts`

This module owns conversion from shared Project-relative contracts into main-process absolute filesystem paths.

Export a bounded resolver equivalent to:

```ts
resolveManagedProjectSourceTopology(projectContainerRoot: string): {
  projectContainerRoot: string;
  repositoryMetadataRoot: string;
  mainCheckoutRoot: string;
  devCheckoutRoot: string;
  workflowCheckoutRoot: string;
}
```

and:

```ts
resolveManagedWorkflowCheckoutPath(
  projectContainerRoot: string,
  workflowId: string,
): {
  projectContainerRoot: string;
  workflowCheckoutRoot: string;
  checkoutRoot: string;
  projectRelativePath: string;
}
```

Exact exported names may vary modestly if local naming requires it, but the semantic split must remain explicit.

## 8. Resolver invariants

The resolver must:

1. require an existing Project container directory;
2. canonicalize the Project root through the filesystem;
3. **not** require the Project root to be Git-backed;
4. **not** run Git;
5. **not** create directories;
6. resolve the managed target locations beneath the canonical Project root;
7. guarantee all managed locations remain inside the Project container;
8. keep these path roles distinct:
   - Project container root;
   - repository metadata root;
   - Main checkout root;
   - Dev checkout root;
   - Workflow checkout root;
9. reject redirection by an existing symbolic-link/reparse-style leaf or ancestor for any managed topology location;
10. accept missing managed topology descendants because WTR03C/WTR02F will create them later.

The resolver is topology validation, not topology materialization.

## 9. Workflow checkout path

`resolveManagedWorkflowCheckoutPath()` must produce exactly:

```text
.champcity/checkouts/<workflow-id>
```

relative to the Project container.

Workflow ID rules:

- exact canonical application Workflow identity;
- lowercase UUID form;
- one path segment only;
- no normalization into a different identity;
- traversal, separators, whitespace, alternate drive syntax, reserved path syntax, and malformed IDs reject.

Do not derive checkout paths from:

- Workflow title;
- Workflow type;
- Work Intake ID;
- branch name;
- display label.

## 10. RepositoryCheckout contract validator

In `projectSourceTopology.ts`, add a pure/bounded validator for `RepositoryCheckout` against the managed Project path contract.

Required role invariants:

### main

```text
role = main
sourceLineId = main
projectRelativePath = Main
workflowId absent
```

### dev

```text
role = dev
sourceLineId = dev
projectRelativePath = Dev
workflowId absent
```

### workflow

```text
role = workflow
workflowId required
projectRelativePath = .champcity/checkouts/<workflow-id>
sourceLineId must be non-empty opaque source identity
```

All roles:

- `repositoryCheckoutId`, `repositoryId`, and `sourceLineId` must satisfy the existing bounded opaque identity vocabulary;
- path must be canonical Project-relative forward-slash form;
- no absolute path;
- no `..`;
- no `.` aliasing;
- no trailing separator;
- no alternate path that merely resolves to the same location.

The validator does not inspect Git state.

## 11. Path separation invariants

Permanent proof must establish:

```text
Project root != Repository metadata root
Project root != Main checkout
Project root != Dev checkout
Main checkout != Dev checkout
Repository metadata root != any checkout root
Workflow checkout root is beneath .champcity/checkouts/
Workflow checkout != Main
Workflow checkout != Dev
Workflow checkout != repository metadata root
```

No RepositoryCheckout may use:

```text
"."
".champcity"
".champcity/repository.git"
".champcity/checkouts"
```

as its own checkout path.

## 12. Existing managed-worktree implementation is not the new contract

Current:

`src/main/agentHarness/repository/managedWorktrees.ts`

uses:

```text
<git-common-dir>/champcity-mcp-worktrees/<checkout-name>
```

That is an existing MCP-managed worktree mechanism.

WTR02C must **not** retrofit or delete it.

It is not the adopted Project source topology:

```text
<Project>/.champcity/checkouts/<workflow-id>
```

WTR02D and WTR02F will decide how MCP/runtime mechanics consume the new contract.

Do not make WTR02C depend on `managedWorkspaceId()`, `managedCheckoutPath()`, or current MCP worktree registration.

## 13. Current sourceControlService remains checkout-root bound

Current:

`createSourceControlService({ repositoryId, repositoryRoot })`

expects a concrete Git working tree and operates Git there.

WTR02C must not change that signature or its callers.

Treat current `repositoryRoot` naming as transitional implementation terminology.

Later cards will route it an explicit RepositoryCheckout root.

Do not mass-rename `repositoryRoot` in this card.

## 14. Current projectSourceBootstrap remains transitional

Do not modify:

`src/main/sourceControl/projectSourceBootstrap.ts`

It currently initializes Git directly in the selected Project root.

That is incompatible with the adopted final topology, but WTR03C/WTR03D own physical Greenfield bootstrap and `.gitignore` behavior.

WTR02C only provides the path contract those cards will use.

Its existing behavior is not acceptance evidence for WTR02C.

## 15. No Structured Project State schema changes

Do not add new Project State entity types in WTR02C.

Existing semantic references remain:

- `ProjectResource` for current repository resource identity;
- `SourceBaseline.repositoryId`;
- `SourceBinding.repositoryCheckoutId?`.

WTR02C introduces shared source-lifecycle contracts, not new persistence tables/entities.

Do not add:

- Repository Project State entity;
- RepositoryCheckout Project State entity;
- ProjectContainer Project State entity;
- SQLite migration.

Persistence/materialization policy is owned by later cards.

## 16. Existing repository adoption remains unresolved

Do not invent a policy for moving or converting an already-existing conventional Git checkout.

The adopted architecture explicitly leaves existing-repository physical adoption/normalization to WTR03C.

WTR02C defines the target managed topology contract only.

Do not:

- move existing source;
- clone/copy source;
- create linked worktrees;
- relocate Git metadata;
- assume every existing repository can be silently normalized.

## 17. MCP remains out of scope

WTR02D owns:

- registering a non-Git Project container as MCP workspace;
- explicit RepositoryCheckout selection for Git tools;
- separating `repo_toolbox` filesystem access from `git_toolbox` checkout access.

WTR02C must not modify:

- `workspaceAccess.ts`;
- `registeredWorkspaceRegistry.ts`;
- tool registry Git gating;
- workspace contracts;
- MCP prompts.

Existing partial non-Git registry support is not to be expanded here.

## 18. Permanent proof

Create one focused permanent contract test:

`test/source-control/source-topology-path-contracts.test.cjs`

A new test file is appropriate because no existing permanent test owns Project-container topology contracts.

Required proof:

### Shared managed paths

1. exact canonical relative strings are exported;
2. forward slashes are used;
3. no absolute path is exposed.

### Non-Git Project container

4. an ordinary temporary directory with no `.git` resolves successfully;
5. resolver performs no filesystem creation;
6. resolver performs no Git operation.

### Exact managed topology

7. Repository metadata resolves to `.champcity/repository.git`;
8. Main resolves to `Main`;
9. Dev resolves to `Dev`;
10. Workflow checkout root resolves to `.champcity/checkouts`;
11. Workflow UUID resolves to `.champcity/checkouts/<workflow-id>`;
12. all absolute resolved locations remain inside Project root;
13. all roles are distinct.

### Workflow identity safety

14. canonical lowercase UUID succeeds;
15. malformed UUID rejects;
16. uppercase/noncanonical UUID rejects;
17. path traversal rejects;
18. embedded separator rejects;
19. whitespace rejects.

### RepositoryCheckout validation

20. valid main checkout contract passes;
21. valid dev checkout contract passes;
22. valid Workflow checkout contract passes;
23. main/dev reject `workflowId`;
24. Workflow role requires `workflowId`;
25. role/path mismatch rejects;
26. role/SourceLine mismatch for main/dev rejects;
27. absolute/noncanonical/traversal path rejects;
28. repository metadata path cannot be a checkout path.

### Redirect safety

29. if a managed topology ancestor/leaf already exists as a symbolic link or equivalent redirect supported by the fixture platform, resolver rejects it;
30. if the platform cannot create the redirect fixture without privilege, skip only that platform-specific case with an explicit reason; do not weaken production validation.

## 19. Existing source-control boundary proof

Do not rewrite the large existing source-control boundary suite.

If needed, add only a small assertion to:

`test/agent-harness/source-control-service-boundary.test.cjs`

showing current `createSourceControlService()` still operates on the explicitly supplied Git checkout root and does not infer the Project container.

Prefer no modification if WTR02C can be fully proved by the new topology contract test.

## 20. Expected production files

Expected:

- `src/shared/sourceLifecycleContracts.ts`
- new `src/main/sourceControl/projectSourceTopology.ts`

Optional only if directly required for shared commentary/type clarity:

- `src/shared/sourceControlContracts.ts`

Expected tests:

- new `test/source-control/source-topology-path-contracts.test.cjs`
- optionally the existing source-control boundary test under §19.

`validation/capability-map.json` may change only if required to register the new permanent test accurately.

Any additional production file requires explicit compile necessity in the Implementer Report.

## 21. Explicit non-scope

Do **not** in WTR02C:

- create/move/delete Git repositories;
- initialize Git;
- modify `projectSourceBootstrap.ts`;
- create Main/Dev checkouts;
- create Workflow checkouts/worktrees;
- create RepositoryCheckout IDs automatically;
- change SourceBinding materialization;
- change `WorkSourceOwner`;
- change source naming;
- modify checkpoint/integration ownership;
- modify Source Graph identity;
- modify MCP workspace/Git behavior;
- modify Agent Harness managed-worktree behavior;
- migrate existing repositories;
- add Project State entity types/tables;
- implement Existing Project Registration;
- implement Greenfield bootstrap;
- begin WTR02D+ or WTR03C.

## 22. Acceptance criteria

WTR02C is complete only when:

1. Repository has an explicit shared semantic identity contract;
2. RepositoryCheckout has an explicit shared semantic identity contract;
3. SourceLine remains pathless;
4. RepositoryCheckout owns the Project-relative checkout path;
5. managed Project source paths are explicit and canonical;
6. non-Git Project root resolves successfully;
7. resolver never performs Git or filesystem materialization;
8. Main/Dev/repository metadata/Workflow checkout roles cannot alias;
9. Workflow checkout path derives only from exact Workflow ID;
10. RepositoryCheckout role/path invariants are validated;
11. absolute filesystem roots remain main-process-only;
12. current source-control/MCP/bootstrap behavior is not migrated in this card;
13. focused permanent tests pass.

## 23. Validation

Required:

1. `npm run build`;
2. `node --test test/source-control/source-topology-path-contracts.test.cjs`;
3. if modified, run `test/agent-harness/source-control-service-boundary.test.cjs` explicitly;
4. validation planner preview for exact final changed paths using the work-item profile;
5. `npm run test:affected -- --changes <exact-changed-path manifest>`;
6. `git diff --check`.

Do not run the broad historical full suite unless selected by the exact changed-path plan.

If affected validation selects deferred WTR02E/F/G/H tests, classify only genuinely deferred failures; do not widen WTR02C to restore obsolete Work Intake source behavior.

## 24. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02C_IMPLEMENTER_REPORT.md`

Include:

- starting SHA;
- files created/modified;
- exact Repository contract;
- exact RepositoryCheckout contract;
- exact managed relative-path vocabulary;
- resolver behavior and redirect-safety behavior;
- confirmation that Project root need not be Git-backed;
- confirmation that SourceLine remains pathless;
- permanent test count impact;
- exact validation results;
- affected failures classified if any;
- explicit confirmation that no Git topology, MCP, SourceLine creation, checkout materialization, bootstrap, or persistence migration was implemented.

Do not edit the committed report afterward solely to insert its own checkpoint hash.

## 25. Git checkpoint authority and stop boundary

The Operator has already authorized routine card-local Git mechanics for WTR.

After implementation, focused validation, and the Implementer Report:

1. inspect the exact attributable staged diff;
2. run the repository safety scan;
3. create exactly one WTR02C checkpoint commit.

Suggested subject:

`WTR02C establish Project source topology path contracts`

No additional Operator Git approval is required.

Do not push, merge, tag, release, reset, clean, restore unrelated files, or perform Git actions outside this card.

Then **STOP**.

Do not begin WTR02D.

The Architect will review WTR02C before the MCP non-Git-root / explicit-checkout targeting card is released.
