# WTR02D Repair01 — Complete RepositoryCheckout Control Path and Resolver Hardening

**Parent card:** WTR02D — Route MCP Git Operations Through Explicit RepositoryCheckout Targets  
**Implementer:** GPT 6.0 Luna Medium  
**Starting implementation checkpoint:** `cd9383b9dd7949685e6d6fd20f52546695c9c89b`  
**Architect finding:** core MCP Git routing is correct, but RepositoryCheckout registration is not reachable through the production Service Host/worker control path, process-level Git proof was weakened to discovery-only, use-time descriptor revalidation is incomplete, and the checkout-root probe bypasses the bounded Git execution layer  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02D_REPAIR01_IMPLEMENTER_REPORT.md`

## 1. Objective

Complete WTR02D without changing its architecture.

Preserve:

```text
workspaceId = Project container
repositoryCheckoutId = explicit Git target
repo_toolbox = Project root
git_toolbox = resolved checkout root
```

Repair four bounded issues:

1. carry RepositoryCheckout registration/unregistration through the actual Service Host → controller → worker → AgentHarnessService path;
2. restore end-to-end process/HTTP proof of an actual checkout-targeted Git action;
3. revalidate the stored RepositoryCheckout descriptor on every checkout resolve/list use;
4. replace the raw synchronous Git probe with the existing bounded Git execution primitive.

No checkout creation/materialization or WTR02E+ behavior belongs here.

## 2. Finding A — checkout registration is not reachable through the production application path

WTR02D added:

`AgentHarnessService.registerRepositoryCheckout()`

and:

`AgentHarnessService.unregisterRepositoryCheckout()`

but the desktop application normally communicates through:

```text
AgentHarnessServiceHostClient
→ AgentHarnessServiceHostServer
→ AgentHarnessController
→ worker process protocol
→ AgentHarnessWorker
→ AgentHarnessService
```

The current Service Host and worker control protocols expose only Project workspace registration/unregistration.

Therefore the application cannot currently register a RepositoryCheckout in the normal production topology.

This also prevents future WTR02F/WTR03C orchestration from registering a newly established checkout without bypassing the Service Host.

## 3. Add worker control operations

Update:

`src/main/agentHarness/runtime/agentHarnessProcessProtocol.ts`

Add control operations equivalent to:

```text
register-repository-checkout
unregister-repository-checkout
```

Request payloads:

```ts
"register-repository-checkout": {
  workspaceId: string;
  checkout: RepositoryCheckout;
};

"unregister-repository-checkout": {
  workspaceId: string;
  repositoryCheckoutId: string;
};
```

Responses:

```ts
"register-repository-checkout":
  AgentHarnessRegisteredRepositoryCheckoutSummary;

"unregister-repository-checkout":
  AgentHarnessRegisteredRepositoryCheckoutSummary[];
```

Requirements:

- import the shared semantic types;
- add operations to the exact operation set/type unions;
- retain current protocol envelope/version behavior;
- do not expose host-local checkout paths;
- malformed semantic descriptors still fail at the service/registry validation boundary.

Add a bounded runtime type guard for:

`AgentHarnessRegisteredRepositoryCheckoutSummary`

and summary arrays if required by controller/client response validation.

The guard must validate all public fields and must not accept an absolute-root field.

## 4. Worker dispatch

Update:

`src/main/agentHarness/runtime/agentHarnessWorker.ts`

Add exact dispatch:

```text
register-repository-checkout
→ AgentHarnessService.registerRepositoryCheckout(...)

unregister-repository-checkout
→ AgentHarnessService.unregisterRepositoryCheckout(...)
```

No direct registry access from the worker.

No Git/materialization behavior.

## 5. AgentHarnessController boundary

Update:

`src/main/agentHarness/runtime/agentHarnessController.ts`

Expose:

```ts
registerRepositoryCheckout(
  workspaceId: string,
  checkout: RepositoryCheckout
): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary>

unregisterRepositoryCheckout(
  workspaceId: string,
  repositoryCheckoutId: string
): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]>
```

These methods:

- ensure the worker;
- send the new worker control request;
- validate the returned summary/array;
- fail with the existing bounded controller invalid-response behavior when malformed.

Do not persist checkout state in the controller.

## 6. Service Host protocol

Update:

`src/main/agentHarness/runtime/agentHarnessServiceHostProtocol.ts`

Add Service Host operations equivalent to:

```text
register-repository-checkout
unregister-repository-checkout
```

with the same semantic request/response payloads.

The Service Host protocol must carry only:

- Project workspace ID;
- RepositoryCheckout semantic descriptor or checkout ID.

It must never carry:

- absolute checkout root;
- Git common directory;
- arbitrary checkout path argument.

## 7. Service Host server

Update:

`src/main/agentHarness/runtime/agentHarnessServiceHostServer.ts`

Dispatch the two new operations to the matching `AgentHarnessController` methods.

No direct filesystem/Git logic belongs in the Service Host server.

## 8. Service Host client — actual application-facing API

Update:

`src/main/agentHarness/runtime/agentHarnessServiceHostClient.ts`

Expose:

```ts
registerRepositoryCheckout(
  workspaceId: string,
  checkout: RepositoryCheckout
): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary>

unregisterRepositoryCheckout(
  workspaceId: string,
  repositoryCheckoutId: string
): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]>
```

Validate the response with the same bounded summary guards used by the controller.

This is the production application-facing registration path that later WTR02F/WTR03C orchestration will call.

Do **not** add renderer/UI IPC in this repair. No user-facing manual checkout-registration UI is required.

## 9. Do not add public MCP checkout registration

The model-facing MCP contract remains unchanged:

- `git_toolbox.list_repository_checkouts` discovers;
- actual Git actions select `repositoryCheckoutId`;
- no MCP action registers/unregisters a checkout;
- no MCP path argument is introduced.

Registration is application-owned through the Service Host control path.

## 10. Finding B — stored checkout contract is not revalidated on every use

WTR02D explicitly requires every checkout resolution to revalidate:

- Project workspace;
- stored RepositoryCheckout descriptor;
- derived path;
- redirect safety;
- exact Git root.

Current:

`resolveRepositoryCheckoutContext()`

revalidates Project/path/Git state but does not call:

`validateRepositoryCheckoutContract(checkout)`

for the stored descriptor.

`listRepositoryCheckoutSummaries()`

also assumes the stored descriptor remains valid.

### Required correction

Before deriving or using a registered checkout in either method:

```ts
const valid = validateRepositoryCheckoutContract(checkout);
```

If invalid:

- resolution fails closed with the chosen checkout-unavailable error;
- listing keeps the registration visible with `availability: "unavailable"`;
- no path/Git operation is attempted from the invalid descriptor.

Do not silently normalize or repair it.

### Required focused proof

After a valid registration, corrupt the in-memory stored descriptor in a bounded registry unit fixture or use another deterministic fixture mechanism that can simulate descriptor drift without changing production API.

Prove:

- discovery reports the registration unavailable;
- direct resolution/Git use fails closed;
- no alternate path/root is used.

Do not add a public mutation API merely to make this test possible.

## 11. Finding C — checkout-root validation bypasses bounded Git

Current WTR02D introduced the only raw:

```ts
execFileSync("git", ...)
```

under `src/main/agentHarness` for checkout-root validation.

This bypasses the established bounded Git execution layer used by the Agent Harness repository implementation.

### Required correction

Remove the direct `node:child_process` Git execution.

Use:

`runBoundedGit()`

from the existing bounded Git implementation, or an existing bounded helper that provides the same exact-root proof.

Required semantic check remains:

```text
git rev-parse --show-toplevel
→ exact canonical checkout root
```

The probe:

- is inspection only;
- uses the standard timeout/output bounds;
- is non-interactive through the established bounded runner;
- returns no raw local path evidence to MCP callers.

Because bounded Git is async, make checkout-root validation async and update callers accordingly.

Do not create a second Git execution wrapper.

## 12. Checkout selector bound

WTR02C defines `repositoryCheckoutId` with the bounded opaque identity vocabulary capped at 128 characters.

Change centralized Git-tool schema injection from:

```text
maxLength: 160
```

to:

```text
maxLength: 128
```

This keeps the public selector syntax consistent with the registered semantic contract.

Do not change top-level MCP `workspaceId` bounds.

## 13. Restore actual HTTP runtime Git proof

The WTR02D implementation changed:

`test/agent-harness/agent-harness-runtime.test.cjs`

from an actual Git status call to checkout discovery only.

Repair it so this runtime test proves the new architecture end to end:

1. fixture Project container is non-Git;
2. fixture has an existing valid `Dev` Git checkout created by test setup;
3. register the Project;
4. call `AgentHarnessService.registerRepositoryCheckout(...)`;
5. start/connect MCP runtime;
6. `repo_toolbox` still reads/writes Project-container files;
7. `git_toolbox.status` with the exact `repositoryCheckoutId` succeeds through MCP;
8. status reflects the Dev checkout, not Project root;
9. missing checkout selector is rejected.

The test may still call `list_repository_checkouts`, but discovery cannot replace the actual Git action proof.

## 14. Restore actual utility-process / Service Host Git proof

The WTR02D implementation also changed the utility-process boundary from actual Git mutation/status to checkout discovery.

Repair:

- `test/agent-harness/agent-harness-process-boundary.test.cjs`;
- `test/agent-harness/fixtures/electron-agent-harness-process-boundary.cjs`;

and any directly coupled process-control fixture.

Required proof through the **production control path**:

1. create non-Git Project container;
2. create a valid existing `Dev` Git checkout in test setup;
3. register Project workspace through the normal Service Host/control path;
4. register the RepositoryCheckout through the new Service Host/control operation;
5. call an actual `git_toolbox` action through public MCP with `repositoryCheckoutId`;
6. at minimum `status` must succeed;
7. preferably restore the prior bounded `stage_changes` process proof if it remains straightforward;
8. prove the resulting Git evidence/mutation occurs in `Dev`, not Project root;
9. preserve existing worker-restart/process isolation assertions.

Do not bypass the production control path by editing the registry file directly in this process-boundary proof.

## 15. Service Host control-path proof

Update existing process/service-host protocol tests selected by these files so the new operations are included in:

- operation inventories;
- request/response validation;
- client/controller forwarding;
- malformed-response rejection where existing tests own that behavior.

Do not create a separate control protocol family.

## 16. Registry error behavior remains unchanged

Preserve current WTR02D public error semantics:

- missing `repositoryCheckoutId` → `INVALID_INPUT`;
- unknown checkout ID → `WORKSPACE_ACCESS_DENIED`;
- stale/invalid registered checkout → `GIT_CAPABILITY_UNAVAILABLE`;
- unknown Project workspace → `WORKSPACE_ACCESS_DENIED`.

Do not expose raw path/Git errors from the new bounded validation probe.

## 17. Expected production scope

Expected:

- `src/main/agentHarness/workspace/registeredWorkspaceRegistry.ts`
- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/agentHarness/runtime/agentHarnessProcessProtocol.ts`
- `src/main/agentHarness/runtime/agentHarnessWorker.ts`
- `src/main/agentHarness/runtime/agentHarnessController.ts`
- `src/main/agentHarness/runtime/agentHarnessServiceHostProtocol.ts`
- `src/main/agentHarness/runtime/agentHarnessServiceHostServer.ts`
- `src/main/agentHarness/runtime/agentHarnessServiceHostClient.ts`

Expected shared type imports only:

- `src/shared/sourceLifecycleContracts.ts`
- `src/shared/workspaceContracts.ts`

Do not alter their WTR02C/WTR02D contract shapes unless direct compile necessity is found.

No change to `AgentHarnessService` registration semantics should be necessary except direct typing/compatibility.

## 18. Expected test scope

Expected:

- `test/agent-harness/registered-workspace-registry.test.cjs`
- `test/agent-harness/agent-harness-runtime.test.cjs`
- `test/agent-harness/agent-harness-process-boundary.test.cjs`
- `test/agent-harness/fixtures/electron-agent-harness-process-boundary.cjs`

Also modify existing protocol/controller/service-host tests if directly selected by the production protocol changes.

Public schema tests need change only for the 128-character selector bound if they own that proof.

Do not modify source lifecycle tests to make deferred WTR02E/F/G/H fixtures pass.

`validation/capability-map.json` may change only if exact test ownership metadata requires it.

## 19. Explicit non-scope

Do not:

- create Main/Dev/Workflow checkouts in production;
- initialize Git in production registration;
- materialize SourceLines;
- generate RepositoryCheckout IDs;
- change checkout path contracts;
- change Project State;
- change SourceBinding;
- change WorkSourceOwner/source naming;
- change checkpoint/integration ownership;
- change Source Graph;
- modify release_toolbox routing;
- expose checkout registration through MCP;
- add renderer UI/manual checkout registration;
- remove legacy managed-worktree machinery;
- begin WTR02E+.

## 20. Acceptance criteria

Repair01 is complete only when:

1. RepositoryCheckout registration/unregistration crosses the production Service Host/worker control path;
2. ServiceHostClient exposes the application-facing semantic methods;
3. no host-local checkout path crosses either control protocol;
4. stored checkout descriptor is revalidated on every list/resolve use;
5. invalid descriptor drift fails closed;
6. checkout-root Git validation uses bounded Git, not raw child-process Git;
7. Git-tool selector max length matches the 128-character semantic checkout ID contract;
8. HTTP MCP runtime proves an actual checkout-targeted Git action;
9. utility-process/Service Host boundary proves an actual checkout-targeted Git action;
10. Project root remains non-Git in the primary new proof;
11. no Project-root Git fallback returns;
12. no WTR02E+ behavior is implemented.

## 21. Validation

Required:

1. `npm run build`;
2. `node --test test/agent-harness/registered-workspace-registry.test.cjs`;
3. `node --test test/agent-harness/agent-harness-runtime.test.cjs`;
4. `node --test test/agent-harness/agent-harness-process-boundary.test.cjs`;
5. run directly modified protocol/controller/service-host test owners explicitly;
6. run public schema test if modified;
7. validation planner preview for exact final changed-path manifest;
8. `npm run test:affected -- --changes <exact-changed-path manifest>`;
9. `git diff --check`.

Repair01-owned control-path/routing tests must pass.

Affected failures solely belonging to the already-deferred WTR02E/F/G/H or WTR03C fixtures may remain classified as deferred.

## 22. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02D_REPAIR01_IMPLEMENTER_REPORT.md`

Include:

- starting SHA;
- files changed;
- worker protocol operations added;
- Service Host protocol operations added;
- controller/client methods added;
- confirmation that payloads contain semantic identities only, no host-local checkout root;
- use-time descriptor revalidation behavior;
- bounded Git exact-root validation implementation;
- 128-character selector bound;
- HTTP runtime actual Git evidence;
- utility-process actual Git evidence;
- focused validation results;
- affected failures classified by later owning card;
- explicit confirmation that no checkout materialization, Project State, source naming, release-toolbox, or WTR02E+ behavior was implemented.

Do not edit the committed report afterward solely to add its checkpoint hash.

## 23. Git checkpoint and stop boundary

After implementation, focused validation, report, exact diff review, and safety scan, create exactly one attributable checkpoint commit.

Suggested subject:

`WTR02D Repair01 complete checkout routing control path`

No additional Operator Git approval is required.

Then stop.

Do not begin WTR02E.
