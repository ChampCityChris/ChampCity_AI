# SCF01 — Promote Source-Neutral Existing Project to Managed Source

**Order:** 1 of 4  
**Depends on:** latest accepted Existing Project Git adoption / managed-source baseline  
**Governing architecture:** `docs/architecture/CHAMPCITY_SOURCE_CONTROL_PROVIDER_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/source-control-forgejo-bootstrap/Implementer_Reports/SCF01_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- `inspectExistingProjectGitAdoption()` currently returns `source-neutral` when no conventional or managed Git topology exists.
- `applyExistingProjectGitAdoption()` intentionally no-ops for `source-neutral`.
- `projectSourceBootstrap.bootstrapProjectSource()` creates the correct managed topology, but explicitly requires an empty selected Project root and is therefore Greenfield-only.
- Existing Project normalization already owns snapshotting, journaling, rollback/recovery, managed bare-repository creation, Main/Dev materialization, integration-policy generation, and verification.
- The existing Git-backed source inventory can distinguish tracked source, ignored durable local state, and known ignored regenerable state. A truly source-neutral directory has no Git ignore authority, so it needs an explicit admission policy rather than the current whole-tree fallback.
- `registerCurrentProject(..., { sourceRepositoryId })` can attach the canonical `source-repository` ProjectResource to an already registered Current Project.
- `reconcileProjectModelAccess()` can publish Main/Dev RepositoryCheckout descriptors immediately after source establishment.

Re-verify these facts at execution start.

## Objective

Add one explicit semantic transition that promotes a registered source-neutral Existing Project into ChampCity's managed source topology without first creating a conventional root Git repository.

The transition must preserve ordinary project source, refuse stale plans, keep sensitive/local-only state out of the canonical baseline, and make the resulting Main/Dev checkouts immediately available to MCP.

Source-neutral must remain a valid steady state when no promotion is requested.

## Required Changes

### 1. Add a read-only source-enablement inspection contract

Create a typed plan for source-neutral Existing Project promotion. Exact names may vary, but it must provide enough bounded evidence to prove the exact filesystem state being promoted.

Include at minimum:

- stable `planId` derived from bounded source facts;
- Current Project / Repository identity;
- current source state = `source-neutral`;
- source-path count + digest;
- durable-local-state count + digest;
- regenerable-state count + digest;
- sensitive/local-only path count + digest without exposing secret contents;
- reserved-path/topology facts for `.champcity`, `Main`, `Dev`, and root `.git`;
- warnings / blockers;
- whether apply is currently eligible.

Inspection must not mutate source or create placeholder Repository identity.

### 2. Add a source-neutral filesystem admission policy

Do not reuse the current "copy the whole readable tree" fallback for this path.

Create deterministic source-neutral inventory rules that do not depend on a pre-existing Git index or `.gitignore`.

At minimum:

- exclude ChampCity-owned `.champcity` and managed `Main` / `Dev` paths;
- classify known dependency/build/cache roots such as `node_modules`, `dist`, `build`, `out`, `release`, `coverage`, temp/cache directories, Python cache directories, and equivalent currently known regenerable roots as regenerable state rather than canonical source;
- classify obvious credential/local-environment paths such as `.env` variants, private-key material, credential/token/secret paths, and other existing repository-policy sensitive patterns as local-only state and never canonical baseline source;
- preserve ordinary project files, including an existing user-authored `.gitignore`;
- fail closed on unreadable, redirected, escaped, or ambiguous filesystem state rather than silently omitting it;
- return bounded path metadata/digests, not file contents, in renderer/MCP-facing inspection.

Do not delete excluded state during inspection.

### 3. Reuse the Existing Project normalization transaction

The apply operation must require the exact current `planId` and re-inspect before mutation.

Reuse/refactor the existing normalization transaction rather than creating a second ad hoc migration engine.

The source-neutral apply path must:

1. acquire the existing exclusive Project source-operation lease;
2. stage a recoverable source snapshot;
3. separately preserve durable/sensitive local-only state;
4. create the application-owned bare repository at `.champcity/repository.git`;
5. create one canonical initial source baseline from admitted source plus required ChampCity-managed integration policy;
6. create managed `Main` and `Dev` worktrees at that exact baseline;
7. materialize preserved local-only state into the appropriate development checkout without committing it;
8. verify topology and baseline identity;
9. only then remove/move the old Project-root source material covered by the verified transaction;
10. retain/record recovery evidence according to the existing normalization policy.

The selected Project root must finish outside Git.

### 4. Initial baseline requirements

The first managed baseline must:

- represent the user's admitted existing source, not an empty Greenfield commit;
- include the managed integration policy required by the existing source lifecycle;
- establish `main` and `dev` at the same exact initial revision;
- avoid committing regenerable or credential/local-only state;
- preserve a user-authored `.gitignore` if one exists;
- add only the minimum safe ChampCity ignore/exclude policy needed for managed/generated state without replacing user policy.

Do not manufacture prior Git history for a Project that genuinely had none.

### 5. Complete Current Project source registration

After successful source establishment:

- ensure exactly one active `source-repository` ProjectResource exists for the Current Project;
- use the canonical current Project repository identity;
- call the existing model-access reconciliation boundary with both managed checkout descriptors;
- verify Main and Dev are immediately registered as usable RepositoryCheckouts without application restart or manual workspace re-registration.

A failure to publish model access may be reported as degraded, but must not corrupt or silently roll back a verified local Repository.

### 6. Preserve source-neutral semantics when not requested

Do not change Current Project registration so every source-neutral Existing Project is automatically promoted.

Do not make source control a prerequisite for source-neutral workflow types.

This card creates a capability, not a new mandatory admission rule.

## Architecture Constraints

- No root-level conventional `.git` as the final topology.
- No generic shell escape or raw `git init` exposed to agents.
- No remote/Forgejo work in this card.
- No browser work.
- No Project-State storage of absolute host paths beyond established resource/runtime rules.
- No secret content in plans, receipts, logs, or reports.
- Stale source facts must reject apply before destructive mutation.
- Recovery behavior must be at least as strong as the existing Existing Project normalization transaction.
- Do not special-case `Retrobovine_Media` paths or filenames.

## Primary Surface to Inspect

- `src/main/sourceControl/existingProjectGitAdoptionService.ts`
- `src/main/sourceControl/projectSourceBootstrap.ts`
- `src/main/sourceControl/managedProjectSourceService.ts` or current equivalent
- `src/main/sourceControl/sourceControlService.ts`
- `src/main/projectState/currentProjectRegistrationService.ts`
- `src/main/modelAccess/projectModelAccessCoordinator.ts`
- `src/main/agentHarness/modelAccess/repositoryCheckoutAccessProjectionService.ts`
- shared source lifecycle / source-control contracts
- existing sensitive-path and pre-commit policies

## Acceptance Criteria

1. A registered Existing Project with ordinary files and no Git metadata remains `source-neutral` until explicit source enablement is requested.
2. Read-only inspection returns a stable exact plan and does not mutate the Project.
3. Changing an admitted source file after inspection makes the previous plan stale and prevents apply.
4. Apply produces `.champcity/repository.git`, managed `Main`, and managed `Dev`; the Project root has no authoritative `.git`.
5. Main and Dev point to the same initial baseline revision.
6. Ordinary source is present in the baseline.
7. Fixture `__pycache__`, `node_modules`, build/cache output, and similar known regenerable state are not committed.
8. Fixture `.env` / private-key / credential-like local state is not committed and is preserved without exposing its contents.
9. Existing user `.gitignore` content survives.
10. The Current Project gains exactly one compatible source-repository ProjectResource.
11. Both RepositoryCheckouts are published to model access immediately.
12. Existing conventional-Git adoption and Greenfield bootstrap behavior remain unchanged.
13. A forced mid-transaction failure leaves the original source recoverable and produces bounded recovery evidence.

## Validation

Use focused lanes first.

Minimum:

- `npm run typecheck`
- relevant source-control build/transpile prerequisite
- extend `test/source-control/managed-project-source.test.cjs`
- extend `test/project-state/current-project-entry.test.cjs`
- focused model-access projection test covering immediate Main/Dev publication
- disposable source-neutral fixture containing source + `.env` + `__pycache__` + `node_modules` + an existing `.gitignore`
- stale-plan and injected-failure recovery tests

Do not run the full repository suite merely because this card finished unless the capability map requires it.

## Implementer Report

Record:

- exact starting commit / checkout;
- inspected/refactored services;
- source-neutral inventory policy;
- how local-only/sensitive state is preserved;
- plan fingerprint/stale-plan behavior;
- recovery/rollback behavior;
- ProjectResource/model-access reconciliation;
- tests reused/extended/new and why;
- commands/results;
- deviations/blockers;
- checkpoint commit.

## Post-Implementation

Checkpoint SCF01 only. Do not begin Forgejo work in the same commit. Then read SCF02.
