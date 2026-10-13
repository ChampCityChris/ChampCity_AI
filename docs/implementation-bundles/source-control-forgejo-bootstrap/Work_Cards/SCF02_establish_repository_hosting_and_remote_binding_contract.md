# SCF02 — Establish Repository Hosting and Remote Binding Contract

**Order:** 2 of 4  
**Depends on:** SCF01  
**Governing architecture:** `docs/architecture/CHAMPCITY_SOURCE_CONTROL_PROVIDER_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/source-control-forgejo-bootstrap/Implementer_Reports/SCF02_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Current `git_toolbox` can inspect configured remotes and perform fetch/push/upstream operations, but it cannot add, replace, or remove a remote.
- `gitMutations.ts` already verifies configured remote names and requires a single matching fetch/push destination for sensitive remote operations.
- The V2 domain model explicitly permits Git remotes as ProjectResources while keeping infrastructure outside logical Project identity.
- The Product Capability Model places future remote repository management inside Repository & Source Control Management.
- The source-control architecture states that remote synchronization is separate from local durable revision creation and optional remote failure must not invalidate local work.

Re-verify these facts at execution start.

## Objective

Create the provider-neutral repository-hosting and remote-binding boundary that lets trusted ChampCity application code attach a managed Repository to a configured hosting provider without exposing arbitrary remote URL mutation to an agent.

This card owns contracts and deterministic local Git remote mechanics only. It does not implement Forgejo HTTP calls.

## Required Changes

### 1. Define repository-hosting semantics

Add provider-neutral contracts equivalent to:

```ts
interface RepositoryHostingProvider {
  providerId: string;
  status(): Promise<RepositoryHostingProviderStatus>;
  inspectRepository(locator: HostedRepositoryLocator): Promise<HostedRepository | null>;
  createRepository(request: CreateHostedRepositoryRequest): Promise<HostedRepository>;
  resolveGitRemote(repository: HostedRepository): Promise<ProviderOwnedRemote>;
}
```

Exact names may vary.

The semantic model must separate:

- local Repository identity;
- hosting provider identity;
- hosted owner/namespace + repository identity;
- Git transport/remote binding;
- provider API credentials.

Do not make Forgejo-specific fields mandatory in the provider-neutral contract.

### 2. Add a typed hosted-remote binding

Represent the local-to-hosted association as application-owned infrastructure metadata.

At minimum preserve:

- Repository identity;
- provider ID;
- provider-owned opaque repository locator;
- local remote name, normally `origin`;
- transport kind;
- bounded/sanitized remote identity suitable for diagnostics;
- lifecycle state.

Where persisted as ProjectResource, the opaque provider locator belongs in the resource locator/provider fields. Raw credentials never do.

### 3. Add trusted Git remote configuration mechanics

Add deterministic internal Git-provider operations for:

- inspect exact remote configuration;
- add one remote when absent;
- replace one remote only when the caller supplies the expected current provider-owned destination/binding;
- remove one remote only when the caller supplies the expected current binding;
- verify fetch and push destinations are exactly the intended non-mirroring destination after mutation.

These mechanics may internally invoke `git remote add`, `git remote set-url`, and `git remote remove`, but they are trusted provider primitives.

Do not publish an MCP action that accepts an arbitrary URL.

### 4. Enforce provider ownership of destinations

The application-level binding operation accepts a `ProviderOwnedRemote` produced by a registered hosting provider.

The model/user-facing semantic request may choose:

- configured provider ID;
- bounded repository name/identity;
- bounded remote role/name where policy permits.

It must not provide:

- an arbitrary hostname;
- arbitrary SSH/HTTPS URL;
- embedded username/password/token;
- arbitrary Git config keys.

Provider mismatch or unconfigured provider must fail visibly.

### 5. Shared repository config semantics

The managed Main and Dev worktrees share one Repository.

Remote binding must therefore be established once against the common Git repository and be visible consistently from both checkouts.

Do not create divergent per-worktree `origin` definitions.

### 6. Remote failure isolation

Binding failure must:

- leave local managed source valid;
- not delete Main/Dev;
- not rewrite source revisions;
- return a bounded failure that makes it clear local source is still usable.

Replacing/removing a stale binding must fail before mutation.

## Architecture Constraints

- Repository hosting is not a second source-control provider.
- No Forgejo implementation in this card.
- No External MCP Provider Gateway dependency.
- No arbitrary URL accepted from MCP/model input.
- No credentials in Git remote URLs.
- No broad `git config` action.
- No hidden fallback to shell/browser operations.
- Existing `git_toolbox.inspect_remotes`, fetch, push, and upstream behavior must remain compatible.
- Use exact-current-state / compare-and-swap semantics for replace/remove.

## Primary Surface to Inspect

- `src/main/repository/gitMutations.ts`
- `src/main/sourceControl/sourceControlService.ts`
- shared source-control / ProjectResource contracts
- Current Project state services
- `src/main/agentHarness/tools/toolRegistry.ts` for contract awareness only; do not publish the new semantic MCP surface until SCF04
- `docs/architecture/CHAMPCITY_SOURCE_CONTROL_PROVIDER_ARCHITECTURE.md`
- `docs/architecture/CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md`

## Acceptance Criteria

1. Trusted application code can add `origin` from a provider-produced remote identity.
2. The resulting fetch/push URL is exactly one matching destination and is non-mirroring.
3. Main and Dev observe the same configured remote.
4. Replace succeeds only when expected current binding matches.
5. Remove succeeds only when expected current binding matches.
6. Stale expected state rejects without mutation.
7. No public MCP contract accepts an arbitrary remote URL after this card.
8. Credential-bearing URLs are rejected.
9. A failed bind leaves local managed source intact and usable.
10. Existing Git remote inspection/fetch/push tests remain green.

## Validation

Minimum:

- `npm run typecheck`
- focused Git mutation-boundary tests using a disposable local bare remote;
- add/replace/remove CAS tests;
- reject embedded-credential URL test;
- shared Main/Dev remote visibility test;
- regression coverage for existing inspect/fetch/push behavior.

Prefer extending `test/agent-harness/git-mutation-boundary.test.cjs` or the current equivalent rather than creating redundant broad suites.

## Implementer Report

Record the contract shape, trusted/provider boundary, exact Git primitives added, stale-binding rules, ProjectResource representation, focused tests, commands/results, deviations/blockers, and checkpoint commit.

## Post-Implementation

Checkpoint SCF02 only. Then read SCF03.
