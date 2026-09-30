# EPGA-R04-R03-R07 — Hydrate Regenerable Development Dependencies After Successful Migration

**Parent:** Existing Project Git Adoption Hotfix / Repair04 / Repair03 / Repair03  
**Current managed baseline:** `b1ebbfd40403065045354c53f68451d1a5fe6c77`  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** **ACTIVE — POST-MIGRATION ENVIRONMENT REGRESSION**

## Objective

After a successful Existing Project conversion, restore the new Dev checkout's regenerable development dependencies using the repository's existing ecosystem-provider definitions.

Keep this repair narrow.

For ChampCity_AI the required behavior is:

```text
successful managed migration
-> Dev/package-lock.json detected
-> npm ci executed with cwd = Dev
-> Dev/node_modules restored
```

Do not put package-manager behavior inside Source Control.

Source Control ends when managed Git/source conversion succeeds.

Environment hydration is a downstream application/development-environment step.

## Confirmed regression

Repair06 correctly stopped treating `node_modules` as durable state.

After the real conversion:

- `Dev/package.json` exists;
- `Dev/package-lock.json` exists;
- `Dev/node_modules` does not exist.

Running `npm start` from Dev fails during build because `tsc` is unavailable.

This is expected for a clean checkout until dependencies are restored.

The product regression is that ChampCity completes migration without running the repository-native restore command.

## 1. Reuse the existing ecosystem provider

Use:

`src/main/developmentEnvironment/repositoryEcosystemProvider.ts`

It already defines repository-native restore commands such as:

```text
package-lock.json      -> npm ci
pnpm-lock.yaml         -> pnpm install --frozen-lockfile
yarn.lock              -> yarn install --immutable
uv.lock                -> uv sync
requirements*.txt      -> python -m pip install -r ...
Cargo.lock/Toml        -> cargo fetch
go.mod/go.sum          -> go mod download
dotnet                 -> dotnet restore
...
```

Do not create a second package-manager mapping.

## 2. Add one small post-migration hydration service

Add a development-environment service with a responsibility equivalent to:

```ts
hydrateRepositoryEnvironment(devCheckoutRoot)
  -> detectRepositoryEcosystemProviders(devCheckoutRoot)
  -> execute each provider.restoreCommand in devCheckoutRoot
  -> return ready/degraded result
```

Exact file/type names are implementer choice.

The service belongs under development-environment/application infrastructure, not Source Control and not Agent Harness.

## 3. Scope is top-level repository providers only

For this repair, use the ecosystem detection behavior that exists today.

Do not add:

- recursive monorepo discovery;
- nested workspace/package detection;
- workspace-manager orchestration;
- container/devcontainer setup;
- package-manager lockfile arbitration redesign.

Those can be handled separately later.

This repair only restores what the existing provider already detects at the managed Dev root.

## 4. Hydration runs only after source conversion succeeds

Required ordering:

```text
exclusive source conversion
-> Source Control completes managed topology
-> source lease releases
-> post-migration environment hydration in Dev
-> downstream model-access reconciliation / normal Project entry
```

Hydration must not execute while the destructive source-transition lease is held.

Do not make dependency installation part of the Git transaction.

## 5. Hydration failure must not roll back migration

If a restore command fails because of:

- missing host tool;
- network/registry outage;
- private registry authentication;
- package-manager failure;
- bad project dependency metadata;

then:

```text
source migration = successful
environment hydration = degraded
```

Do not:

- restore old root Git;
- delete Main/Dev;
- re-run migration automatically;
- report the Project as source-conversion failed.

Return a bounded hydration result to the application layer.

A shape equivalent to:

```ts
{
  state: "ready" | "degraded" | "not-applicable",
  providers: [...],
  error: string | null
}
```

is sufficient.

## 6. ChampCity_AI npm path must be Windows-safe

The current generic Node command runner uses direct `spawn(command, args)`, which is not sufficient evidence by itself for Windows npm shim execution.

Reuse the existing proven Windows npm invocation logic already used by validation/release paths, or extract the minimum neutral helper required for environment hydration.

Do not duplicate a new ad-hoc npm shim resolver.

For the ChampCity_AI proof:

```text
Dev/package-lock.json
-> Windows-safe npm invocation
-> npm ci
-> exit 0
-> Dev/node_modules/.bin/tsc exists
```

Do not use `shell: true`.

## 7. Do not auto-provision system runtimes in this repair

Keep this repair simple.

Do not invoke Winget or the broader system-tool provisioner merely because hydration discovers an ecosystem.

If the required host command is unavailable:

- return `degraded`;
- preserve successful migration;
- report which ecosystem restore could not run.

Automatic host-tool provisioning can remain part of the broader Development Environment workflow.

## 8. Multiple top-level providers

If the current detector returns multiple providers at the Dev root, execute their restore commands sequentially and collect bounded results.

One failure should make hydration `degraded`, but must not undo successful providers or source migration.

Do not attempt dependency-graph ordering beyond the provider order already defined.

## 9. Application integration

Wire hydration into the successful Existing Project migration product path.

Run it only when a real conversion was applied.

Do not run `npm ci` every time an already-managed Project is reopened.

Do not run this repair path for `source-neutral` or `managed-ready` no-op admission unless a later explicit environment-repair action requests it.

## 10. Minimal user-visible behavior

The application must distinguish:

```text
Project migrated successfully; environment ready.
```

from:

```text
Project migrated successfully; development environment needs attention.
```

Hydration degradation must be non-blocking for Project admission.

Do not build a new environment-management UI in this repair.

A bounded status/message surfaced through the existing admission result is sufficient.

## Permanent proof

Add focused tests proving:

1. a converted Dev root with `package-lock.json` selects the existing npm provider;
2. hydration executes `npm ci` with `cwd = Dev`;
3. Windows uses the existing proven npm invocation path;
4. successful npm hydration returns `ready`;
5. failed npm hydration returns `degraded` without changing source conversion success;
6. no provider returns `not-applicable`;
7. multiple top-level providers execute sequentially;
8. managed-ready reopen does not automatically rerun hydration;
9. Source Control imports no development-environment hydration implementation;
10. no Agent Harness/MCP dependency is introduced;
11. `git diff --check` passes.

## Validation

Run focused validation only:

- production typecheck/build;
- new repository environment hydration owner;
- Existing Project Current Project/admission owner;
- existing repository ecosystem provider owner;
- Windows npm execution owner;
- Source Control boundary/import guard;
- capability-map integrity if touched;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad/full regression suite.

## Implementer report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair03/Repair03/Repair07/Reports/EPGA-R04-R03-R07_IMPLEMENTER_REPORT.md`

The report must state:

- hydration service location;
- existing ecosystem provider reuse;
- exact ChampCity_AI npm path;
- Windows npm invocation mechanism;
- successful/degraded result semantics;
- confirmation that migration success is never rolled back by hydration failure;
- focused validation results.

## Checkpoint and STOP

Commit:

`EPGA-R04-R03-R07 hydrate Dev environment after migration`

Then STOP for Architect review.
