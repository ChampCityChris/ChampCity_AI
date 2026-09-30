# EPGA Repair04 Architect Review — 2026-09-29

**Reviewed checkpoint:** `643ea5ed24552b34b9cafa3592b4965703fdb28c`  
**Disposition:** **NO-GO FOR REAL CHAMPCITY_AI CONVERSION RETRY**  
**Repair scope:** two defects in the new RepositoryCheckout authority boundary

## Review conclusion

Repair04 is directionally correct and closes the major architectural mistake identified before implementation:

- generic Agent Harness workspaces are now Git-neutral;
- Git/test/release operations are routed through explicit RepositoryCheckout authority;
- non-Git workspaces remain valid model workspaces;
- Existing Project normalization now prepares candidate repository metadata in migration staging;
- managed metadata and root Git cutover are separate;
- Windows cutover mutations are bounded/retried;
- rollback preserves the primary failure and journals cleanup evidence;
- the current interrupted-normalization residue has focused recovery proof.

Those portions are accepted.

Two blocking defects remain before the destructive real-project retry.

## PASS — generic workspace registration is Git-neutral

`resolveWorkspaceRootContextAsync()` no longer probes Git.

Generic workspace contexts carry no authoritative Git capability.

The tool dispatcher only enables a Git-capable context after RepositoryCheckout resolution.

A workspace with zero checkouts remains usable through non-Git tools.

This matches the Operator decision that workspace access and source-control authority are separate concepts.

## PASS — Git tooling is checkout-routed

Git, test-execution, and release actions now carry RepositoryCheckout targeting.

The dispatcher resolves the registered checkout, substitutes its validated root for the operation, and releases the checkout lease after dispatch.

`list_repository_checkouts` remains callable without a Git checkout so a model can discover available authorities.

No arbitrary path targeting was introduced.

## PASS — normalization cutover/rollback structure is materially safer

The new candidate bare repository is created under the current migration directory.

Only after baseline preparation does conversion:

1. retire an exposed conventional checkout when present;
2. relocate pre-existing managed metadata;
3. install candidate managed metadata;
4. relocate root conventional Git;
5. create Main/Dev;
6. verify topology;
7. relocate local state;
8. register managed checkouts.

Rollback now keeps the first failure as primary evidence and separately records cleanup warnings.

This directly addresses the prior EPERM masking defect.

## Blocking defect 1 — checkout acquisition and retirement are not atomic

`RegisteredWorkspaceRegistry.resolveRepositoryCheckoutContext()` currently performs this order:

```text
check runtime.state == available
→ await workspace resolution
→ await checkout Git-root validation
→ increment activeOperations
→ return lease
```

`unregisterRepositoryCheckout()` performs:

```text
runtime.state = retiring
→ inspect activeOperations
→ if zero, remove registration
```

That creates a race.

A checkout resolution can pass the `available` check and then yield during async workspace/Git validation. While it is yielded, retirement can set `retiring`, observe `activeOperations === 0`, remove the registration, and return. The original resolver can then resume, increment the stale runtime object, and dispatch a Git operation against a checkout that has already been retired.

That defeats the exact safety boundary Repair04 was intended to establish and can reintroduce filesystem access during Git-authority cutover.

### Required correction

Checkout operation acquisition must become atomic with retirement:

- reserve/increment the active operation synchronously while runtime state is known to be `available`;
- only then perform asynchronous workspace/checkout validation;
- release the reservation on any validation failure;
- retirement sets `retiring` before reading the active count;
- once `retiring`, no resolver can acquire a new lease;
- retirement waits for every already-reserved operation.

Permanent proof must create a real overlap where resolution/validation is still in flight while retirement starts.

The current test only begins retirement after a lease has already been fully acquired, so it does not cover this race.

## Blocking defect 2 — failed retirement can permanently poison a still-registered checkout

When `unregisterRepositoryCheckout()` reaches its bounded drain deadline it throws:

`REPOSITORY_CHECKOUT_RETIRING`

but leaves:

`runtime.state = "retiring"`

The persisted RepositoryCheckout registration remains present.

In Existing Project conversion, `conventionalCheckoutRetired` is set only after unregister returns successfully. Therefore a drain timeout takes the conversion failure path with:

- the original checkout still registered;
- runtime state still `retiring`;
- `conventionalCheckoutRetired === false`;
- rollback skipping conventional checkout re-registration.

The Project remains conventional and its root Git can remain authoritative, but subsequent Git operations are rejected indefinitely by the in-memory retiring state until another successful retirement attempt or service restart.

That violates the Repair04 requirement that a failed cutover restore prior usable authority.

### Required correction

If retirement aborts before registration removal:

- restore runtime state to `available`;
- remove only the retirement waiter's own waiter/timer state;
- keep the persisted checkout contract unchanged;
- allow immediate Git reuse;
- make a later retirement attempt valid and idempotent.

The same restoration rule applies if registry persistence fails while removing the registration.

Permanent proof must cover a timeout/exhausted drain and verify the original checkout is immediately usable afterward.

## Product completion gap — conventional Git checkout provisioning has no production owner

This is not the immediate concurrency defect, but it must be closed in the same repair because the new public contract makes RepositoryCheckout authority mandatory.

Production call sites currently register generic workspaces through:

- `workspace:choose`;
- `agentHarness:chooseAndRegisterWorkspace`;
- Existing Project entry.

None of those production paths provisions a `role: "conventional"` RepositoryCheckout for an ordinary root Git repository.

The only conventional-checkout creation found in the checkpoint is test fixture code.

Consequently, after the new Agent Harness version is activated, a conventional Git workspace can be successfully registered yet expose zero RepositoryCheckouts. Its non-Git MCP tools work, but `git_toolbox`, `test_toolbox`, and `release_toolbox` cannot be used because the application never created the authority they now require.

That does not satisfy the intended boundary “the application deals with Git.” It moves Git authority out of the workspace registry but does not assign a production application owner to provision it.

### Required correction

Add one application/source-control-owned reconciliation boundary outside `RegisteredWorkspaceRegistry.register()`.

It must:

- inspect the registered root through the source-control layer, not generic workspace authority;
- register one deterministic conventional checkout when the exact workspace root is a conventional Git worktree and no managed topology applies;
- leave non-Git workspaces at zero checkouts;
- never fabricate Git or initialize a repository;
- avoid registering conventional authority for already-managed Project roots;
- persist the descriptor through the existing checkout registry;
- reconcile existing registered conventional workspaces on service/application startup so an upgrade does not silently remove their Git capability;
- remain independent of Workflow/WorkItem state.

This is application-owned Git discovery/provisioning, not workspace-registry Git inference.

## Validation review

The Implementer recorded:

- normal-Windows production build PASS;
- 71 focused tests PASS;
- Repair04 migration-plan preview PASS;
- `git diff --check` PASS;
- one unrelated pre-existing static-lane expectation failure.

The focused evidence is credible for the behaviors it covers.

The two blocking retirement cases above are absent from the current proof.

The conventional-checkout proof directly calls the registry/service from a fixture; it does not prove a production registration path provisions that authority.

## Defect attribution

The atomic-retirement and timeout-state issues are **Implementer defects** in the new Repair04 checkout lifecycle.

The missing production conventional-checkout provisioning is primarily an **Architect scope miss**. The card established the application-owned authority rule but did not identify the production reconciliation lifecycle precisely enough.

## Disposition

Do not retry the real ChampCity_AI conversion at `643ea5ed...`.

Proceed with one bounded Repair04 repair:

`Repair01/EPGA-R04-R01_make_checkout_retirement_atomic_and_provision_conventional_authority.md`

No Repair02/Repair03 behavior is reopened.
