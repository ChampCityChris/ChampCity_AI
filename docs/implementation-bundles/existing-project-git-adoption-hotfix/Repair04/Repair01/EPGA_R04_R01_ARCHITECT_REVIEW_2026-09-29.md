# EPGA Repair04 / Repair01 Architect Review — 2026-09-29

**Reviewed checkpoint:** `f59d5d779f8192d14f47c1175d3a33b871b0c2e4`  
**Disposition:** **ACCEPTED — REAL CHAMPCITY_AI QUALIFICATION RETRY AUTHORIZED**

## Review scope

This review evaluates the Repair04 / Repair01 blockers identified at checkpoint `643ea5ed24552b34b9cafa3592b4965703fdb28c`:

1. RepositoryCheckout acquisition could race retirement because the active-operation reservation occurred after asynchronous validation.
2. A retirement timeout could leave a still-persisted checkout stranded in `retiring`.
3. Conventional Git checkout provisioning existed only in fixtures and had no production application/source-control owner.

The accepted Repair02 integration-policy and Repair03 source-preservation contracts are not reopened.

## PASS — checkout acquisition is atomic with retirement

`RegisteredWorkspaceRegistry.resolveRepositoryCheckoutContext()` now performs the critical state transition synchronously:

```text
locate persisted checkout
→ obtain single runtime state object
→ require state == available
→ increment activeOperations
→ create idempotent release
→ only then perform asynchronous workspace/Git validation
```

There is no asynchronous yield between the final availability check and reservation.

If validation later fails, the same idempotent release path decrements the reservation before the bounded `GIT_CAPABILITY_UNAVAILABLE` result is surfaced.

This closes the race identified in the prior Architect review.

## PASS — retirement closes the gate before draining

`unregisterRepositoryCheckout()` now:

1. requires the exact persisted checkout;
2. transitions its runtime state to `retiring`;
3. rejects a concurrent second retirement;
4. observes the already-reserved active-operation count;
5. waits for that count to drain;
6. re-reads the current persisted entry before removal;
7. removes the descriptor only if it still matches the checkout being retired.

No new checkout operation can reserve authority after the `retiring` transition.

The new overlap proof correctly starts retirement while checkout validation is still suspended, rather than after lease acquisition. That is the missing concurrency case from the first Repair04 implementation.

## PASS — failed retirement restores usable authority

Drain timeout now:

- removes its own waiter;
- restores runtime state to `available`;
- leaves the persisted checkout descriptor untouched;
- permits immediate reuse;
- permits a later retirement attempt.

Persistent unregister failure follows the same authority-restoration rule.

This closes the prior half-retired state where root Git remained authoritative but MCP Git could remain unusable until restart.

## PASS — conventional Git authority has a production owner

`repositoryCheckoutReconciliationService.ts` introduces the application/source-control-owned reconciliation boundary required by the revised architecture.

The helper:

- performs bounded exact-root Git inspection;
- does not initialize Git;
- provisions a deterministic `conventional` RepositoryCheckout only for an exact Git working-tree root;
- leaves non-Git workspaces with zero checkouts;
- does not move Git detection back into generic workspace authorization.

`AgentHarnessService` invokes reconciliation:

- after production workspace registration; and
- after persisted workspace registry initialization.

That means both desktop workspace-selection paths reach the same application-owned provisioning lifecycle through the service client, while `RegisteredWorkspaceRegistry.register()` itself remains Git-neutral.

## PASS — persisted conventional workspaces reconcile after upgrade

The service initialization path rehydrates generic workspace contexts first and then reconciles available Project roots.

A previously persisted conventional Git workspace with no RepositoryCheckout receives one deterministic conventional descriptor.

A second service initialization leaves the same descriptor identity unchanged.

Public workspace summaries still do not expose absolute roots; the new root enumeration is application-internal.

## PASS — non-Git workspaces remain first-class

The generic workspace registry still accepts readable/writable non-Git directories.

Reconciliation is a no-op when the workspace root is not an exact Git worktree.

No Git repository is initialized and no Git repair state is fabricated.

Non-Git repo/artifact access remains independent of RepositoryCheckout authority.

## PASS — managed Project authority remains Main/Dev, not root Git

A successfully managed Project does not receive a conventional root checkout.

The Current Project proof confirms the registered managed authorities remain exactly Main and Dev.

This preserves the intended model:

```text
generic workspace
    +
zero or more explicit RepositoryCheckouts
```

rather than treating the workspace root itself as Git authority.

## PASS — Existing Project retirement failure occurs before cutover

The conversion now recognizes the exposed conventional checkout by its semantic conventional role/root path rather than requiring its pre-conversion Repository identity to equal the eventual managed Repository identity.

The focused failure proof establishes that a retirement timeout:

- fails in phase `conventional checkout retirement`;
- occurs before final managed metadata installation;
- occurs before root `.git` relocation;
- leaves root conventional Git authoritative;
- does not attempt redundant conventional checkout re-registration because unregister never completed.

Combined with the registry timeout behavior, the pre-conversion checkout remains immediately usable.

## PASS — Repair04 cutover and recovery mechanics remain intact

No regression was found in the previously accepted Repair04 mechanics:

- candidate bare repository preparation under migration staging;
- managed metadata cutover separate from root-Git cutover;
- bounded Windows mutation retries;
- attempt-owned recovery paths;
- primary failure retained ahead of cleanup diagnostics;
- failed journal truthfulness;
- recovery of the current interrupted-normalization residue;
- Main/Dev registration after successful topology creation.

The current real ChampCity_AI folder still contains the known prior schema-2 `normalizing` journal, no valid final managed repository, and no Main/Dev checkout. That is the exact recovery class covered by Repair04's interrupted-normalization proof.

## Validation review

The Implementer recorded normal-Windows passes for:

- production build;
- 14/14 registered-workspace/checkout tests;
- 17/17 managed-project-source tests;
- 12/12 application-shell tests;
- 13/13 Current Project entry tests;
- 3/3 MCP tool-contract tests;
- 5/5 capability-map tests;
- Repair validation-plan preview;
- staged and unstaged `git diff --check`.

The restricted-runner `spawn EPERM` failures are execution-lane limitations and were rerun successfully in the normal Windows lane.

No broad unrelated regression run is required by this Repair Card.

## Non-blocking documentation note

The Implementer report records an incorrect long-form starting HEAD after the `c5c45450` prefix. Repository history confirms the actual parent of the implementation checkpoint is:

`c5c45450b0e2b5e9c9d337f8a88fa7f6da3072ad`

This is a report transcription error only. The actual commit parentage and reviewed diff are unambiguous, so no implementation repair is required.

## Authority-model note

The Operator-approved 2026-09-29 rule remains controlling:

- generic workspaces are Git-neutral;
- non-Git workspaces are permanently valid;
- application/source-control logic owns Git discovery and checkout provisioning;
- model-facing Git/test/release operations use explicit RepositoryCheckout authority.

This supersedes the older RCO-HF01 workspace-root Git authorization rule. The historical RCO-HF01 artifact remains unchanged.

## Disposition

Repair04 / Repair01 is **ACCEPTED**.

The Existing Project Git adoption hotfix is now ready for the real ChampCity_AI qualification retry.

The next action is to run the current code/build, reopen the ChampCity_AI Project through **Open Existing Project**, and perform **Accept and Convert** against the existing interrupted-normalization state.

If that real conversion fails again, preserve the exact resulting state and error for another production qualification review rather than manually deleting migration evidence.
