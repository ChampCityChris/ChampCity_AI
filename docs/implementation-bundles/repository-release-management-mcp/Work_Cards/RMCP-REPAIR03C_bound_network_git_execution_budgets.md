# RMCP-REPAIR03C — Bound Network Git Execution Budgets

**Classification:** MCP Git execution timeout defect  
**Priority:** Blocker  
**Parent:** RMCP project-independent Git and Forgejo tooling  
**Status:** Ready for Implementer  
**Scope:** Internal Git command execution budgets for network-transfer operations only

## Objective

Allow legitimate remote Git operations such as clone, fetch, pull, push, push-tag, prune and remote-ref inspection enough bounded execution time to complete over real networks.

Preserve the short default timeout for ordinary local Git inspection/mutation commands.

Do not expose timeout values to the model, add arbitrary shell execution, weaken cancellation, or redesign provider authentication.

## Verified Defect

RMCP-REPAIR03B fixed the Forgejo transport identity defect.

Live review now confirms:

- Forgejo provider is configured and `ready`;
- the existing Forgejo `origin` can be inspected successfully;
- authenticated remote-ref inspection succeeds;
- the canonical hosted repository identity is correct;
- credentials are no longer falling through to interactive password prompting because of URL parsing.

However, the 03B Implementer report could not satisfy its required disposable live clone acceptance.

The clone reaches bounded Git execution and then fails with:

`GIT_TIMEOUT`

The source-level cause is explicit in `src/main/core/gitExecution.ts`:

`GIT_COMMAND_TIMEOUT_MS = 15_000`

and:

`timeoutMs = min(requestedTimeout, GIT_COMMAND_TIMEOUT_MS, ...)`

Therefore **every Git command is hard-capped at 15 seconds**, including remote transfers.

Even if an internal caller passes a larger `timeoutMs`, the global clamp reduces it back to 15 seconds.

That is suitable for ordinary local metadata commands but not for cloning or transferring a software repository over HTTPS.

## Required Architecture

Introduce **internal operation classes** for Git execution budgets.

The MCP caller must never supply raw timeout values.

Recommended conceptual classes:

- `local-default` — existing short budget, approximately 15 seconds.
- `network-read` — bounded longer budget for remote discovery/fetch/ref inspection.
- `network-write` — bounded longer budget for push/tag/delete-remote operations.
- `network-clone` — bounded longest budget for initial repository transfer.

Exact constant names and durations are implementation decisions, but they must be finite, documented, and tested.

A reasonable starting policy is:

- local-default: 15 seconds
- network-read/write: 120 seconds
- network-clone: 300 seconds

Do not increase every Git command to the longest value.

## Required Repair

### 1. Replace the universal 15-second cap with an internal execution-class cap

Extend `GitExecutionOptions` or the call-scoped Git policy with an internal field equivalent to:

`executionClass: "local-default" | "network-read" | "network-write" | "network-clone"`

or another typed internal design.

The selected class determines the maximum timeout allowed by `runBoundedGit()`.

The caller may still request a shorter internal timeout where appropriate, but may not exceed the selected class cap.

No public MCP schema may contain:

- timeout milliseconds;
- execution class;
- arbitrary process deadline.

### 2. Keep local Git operations on the short budget

Ordinary operations such as:

- status;
- diff;
- rev-parse;
- branch/ref inspection;
- local commit/tag creation;
- staging;
- reset;
- worktree metadata;
- config inspection;

must retain the short default budget unless there is specific evidence that an individual command legitimately requires another bounded class.

Do not mask slow/hung local commands by globally raising their timeout.

### 3. Classify remote Git operations centrally

Network-capable commands must receive the appropriate internal class.

At minimum review and classify:

- `clone`
- `fetch`
- `pull`
- `push`
- push tag / delete remote branch/tag
- `ls-remote`
- remote prune
- any remote verification that contacts the provider

Prefer central command classification in the bounded Git execution layer where safe and unambiguous, rather than manually duplicating timeout values across many call sites.

If central inference is ambiguous, explicit typed internal call-site classification is preferred.

### 4. Preserve overall operation deadlines

Existing higher-level deadlines, cancellation signals and local-access discovery deadlines remain authoritative.

Effective timeout must be the minimum of:

- selected internal execution-class cap;
- any smaller internal requested timeout;
- any remaining higher-level operation deadline.

A longer network class must not allow an operation to escape its parent cancellation/deadline.

### 5. Preserve process termination behavior

On timeout or AbortSignal cancellation:

- terminate the Git child process and descendants using the existing bounded process-tree mechanism;
- return `GIT_TIMEOUT` or the existing bounded cancellation result;
- never leave an interactive credential prompt;
- never expose provider credentials in stderr/stdout.

Do not replace timeouts with unattended hanging processes.

### 6. Preserve credential projection

The repaired Forgejo/GitHub call-scoped authentication path must remain unchanged in authority.

Longer transfer budgets must not:

- persist credentials in Git config;
- put tokens/passwords in argv;
- enable interactive credential helpers;
- expose Basic auth material in results/logs.

### 7. Clone-specific behavior

`LocalGitRepositoryAccessService.clone()` must use the bounded network-clone class.

Successful clone still requires:

- destination absent at start;
- trusted parent directory;
- no nesting beneath an existing checkout;
- provider-owned destination where applicable;
- selected branch validation;
- post-clone repository verification.

Do not weaken destination containment to make the live qualification pass.

### 8. Partial clone failure evidence

Do not silently report success if a timeout leaves a partial destination.

Retain or improve the existing explicit failure result.

If the implementation adds cleanup, it may only remove a destination that:

- was absent at operation start;
- was created by that exact failed clone attempt;
- remains inside the trusted root;
- can be safely proven to be the same created directory.

Cleanup is optional for this repair; successful bounded network execution is the primary objective.

## Required Tests

### Unit / bounded execution

Verify:

- local-default command over its short cap times out;
- network-read command may exceed 15 seconds but remains below its longer cap;
- network-clone may exceed 15 seconds but remains bounded by its class maximum;
- shorter parent deadline still wins;
- AbortSignal cancellation wins immediately;
- public MCP schema contains no timeout/execution-class parameter.

### Controlled Git fixture

Use a test HTTP Git fixture that deliberately delays transfer beyond 15 seconds but completes within the network budget.

Prove:

- `ls-remote` / fetch completes when classified network-read;
- clone completes when classified network-clone;
- push completes when classified network-write;
- the same delayed command still fails when deliberately executed under local-default in a direct internal test;
- credentials remain absent from argv/config/results.

### Regression

Keep green:

- ordinary local Git timeout tests;
- Forgejo transport identity normalization;
- provider-owned remote CAS;
- portable repository context;
- cancellation/process cleanup;
- GitHub provider path;
- no arbitrary shell or public timeout parameter.

## Live Qualification

After automated tests pass, use the currently configured Forgejo provider.

Read-only checks first:

1. `provider_status(forgejo)` → ready.
2. inspect hosted repository.
3. inspect existing canonical remote.
4. authenticated `inspect_remote_refs`.

Then perform exactly one disposable live clone to a new trusted destination.

Requirements:

- no workflow Project registration;
- no `repositoryCheckoutId`;
- project-independent `integration_toolbox.clone_hosted_repository`;
- selected expected branch;
- clone duration may exceed 15 seconds but must finish within the new bounded network-clone budget;
- resulting checkout HEAD/branch verified;
- remote URL contains no credential;
- token/password absent from MCP result and Git config.

Do **not** push real branches/tags/releases as part of acceptance.

## Acceptance Criteria

1. Local Git default timeout remains short and bounded.
2. Network Git operations are no longer universally capped at 15 seconds.
3. No MCP caller can choose or extend a timeout.
4. `clone_hosted_repository` can run longer than 15 seconds while remaining bounded.
5. Live disposable Forgejo clone succeeds.
6. Cloned branch and HEAD verify against hosted refs.
7. Existing canonical Forgejo remote inspection remains green.
8. Authenticated remote-ref inspection remains green.
9. Fetch/push/tag fixture operations receive bounded network budgets.
10. Cancellation and higher-level deadlines override longer network budgets.
11. No credential appears in argv, Git config, stdout/stderr results, logs or MCP output.
12. Ordinary local Git commands do not inherit the long clone timeout.
13. Existing Forgejo/GitHub/provider-owned remote tests remain green.
14. No workflow/project registration or release orchestration is introduced.
15. JSON/Zod/public MCP schemas do not expose execution budget controls.

## Non-Goals

Do not:

- publish any real branch/tag/release/feed;
- change repository release policy;
- add model-supplied timeouts;
- add raw Git arguments;
- add shell access;
- weaken provider credential controls;
- increase all Git operations to a single large timeout;
- change trusted-root semantics.

## Implementer Report

Return:

- exact timeout architecture before/after;
- execution classes and maximum budgets;
- commands mapped to each network class;
- files changed;
- focused test results;
- live disposable clone duration/result;
- proof credentials remained private;
- checkpoint commit.

The report must distinguish successful automated fixture proof from successful live clone proof.

## Stop Condition

Checkpoint this repair only and return for Architect review.
