# EPGA-R04-R03-R02 — Distinguish Model-Access Absence from Live Quiescence Failure

**Parent:** Existing Project Git Adoption Hotfix / Repair04 / Repair03  
**Repair01 checkpoint:** `aee844a82ad977243570ed63e70f3fbb8a9f4376`  
**Architect review:** `../Repair01/EPGA_R04_R03_R01_ARCHITECT_REVIEW_2026-09-29.md`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Tighten the application/model-access quiescence boundary so only genuine Agent Harness absence/unavailability is treated as non-authoritative degraded state.

A live Agent Harness that responds but cannot establish or retire trustworthy model-access authority must block destructive Existing Project Git conversion before Source Control mutation begins.

Do not change the accepted Source Control/model-access dependency direction from Repair01.

## 1. Fix catch-all classification in `quiesceConventionalProjectModelAccess()`

Current invalid behavior catches every error from:

```ts
portFactory()
port.registerWorkspace(projectRoot)
```

and returns:

```ts
{ state: "degraded", ... }
```

Replace this with typed classification.

Only positively identified **absence/unavailability** states may degrade and allow Source Control to proceed.

A live semantic/control failure must throw a pre-cutover `ModelAccessQuiescenceError` or another bounded typed blocker.

## 2. Use typed lifecycle/control evidence

Prefer existing Service Host client error types/codes.

Do not classify with regular expressions or human-readable string matching.

Inspect and reuse the actual error taxonomy from:

- `agentHarnessServiceHostClient.ts`;
- Service Host descriptor/discovery lifecycle;
- background-agent explicit stop state;
- protocol/build-generation errors;
- application/registry errors returned through control operations.

The classification helper should be narrow and explicit.

Equivalent behavior:

```ts
function isModelAccessAuthorityAbsent(error: unknown): boolean {
  return typed code is one of the bounded states that means
    no usable live Service Host/model-access authority is reachable;
}
```

Exact helper name is implementer choice.

## 3. Absence remains non-authoritative

The following class of conditions should remain degraded and allow Source Control to continue when positively typed as absence/unavailable:

- user intentionally stopped Background Agent;
- Service Host endpoint is absent after bounded discovery;
- Service Host cannot be reached/started and no live authority was established;
- equivalent lifecycle state whose contract explicitly means no usable live model-access authority exists.

Preserve the Repair01 principle that application-owned Git can function while Agent Harness/MCP is unavailable.

## 4. Live semantic/control failures block before Git mutation

At minimum, block for live failures including:

- workspace registry conflict;
- workspace/checkout validation conflict;
- invalid response from a live Service Host;
- protocol incompatibility;
- build-generation incompatibility/mismatch;
- any control response proving the Service Host is live but the requested model-access state cannot be trusted;
- checkout retirement/drain failure.

If there is uncertainty whether a returned typed error proves absence versus live failure, fail closed before destructive conversion.

## 5. Preserve the existing busy-checkout blocker

Do not weaken:

`REPOSITORY_CHECKOUT_RETIRING`

behavior.

A live checkout that does not drain within the bounded deadline must still block before Source Control conversion starts.

## 6. Source Control remains independent

Do not reintroduce Agent Harness into Source Control modules.

The correction belongs in the top-level model-access/application coordination layer.

The Source Control call:

`applyExistingProjectGitAdoption(...)`

must remain unaware of MCP/Agent Harness state.

## 7. Product-level proof — absence proceeds

Add focused proof through the actual desktop composition where:

1. Existing Project conventional Git is selected;
2. Agent Harness/Service Host is positively unavailable/absent;
3. quiescence returns degraded;
4. Source Control conversion executes once;
5. managed Main/Dev topology is completed;
6. Current Project registration can proceed;
7. model access remains degraded.

Use a typed absence condition rather than an arbitrary thrown `Error`.

## 8. Product-level proof — live semantic failure blocks

Add focused proof where a live model-access control returns a typed semantic failure during `registerWorkspace()`.

Use at least one registry/control error such as `WORKSPACE_REGISTRY_CONFLICT`.

Prove:

- `applyExistingProjectGitAdoption()` is never called;
- no migration journal is created;
- no candidate repository is created;
- root `.git` remains authoritative;
- error is surfaced as model-access quiescence failure.

## 9. Product-level proof — live protocol/build mismatch blocks

Prove at least one typed Service Host protocol/build incompatibility condition does not become degraded.

Examples:

- `SERVICE_HOST_PROTOCOL_INCOMPATIBLE`;
- `SERVICE_HOST_BUILD_GENERATION_INCOMPATIBLE`;
- `SERVICE_HOST_BUILD_GENERATION_MISMATCH`.

The exact selected fixture should use the real client error type/code.

Again prove no Source Control mutation begins.

## 10. Retry proof

After the synthetic live semantic/protocol condition is removed:

- exact retry quiesces successfully;
- conversion proceeds;
- no stale failed migration evidence was created by the blocked attempt.

## 11. Preserve Repair01 accepted behavior

Do not regress:

- Greenfield bootstrap independence from Agent Harness;
- managed Existing Project reopen independence;
- post-conversion projection failure returning degraded rather than source failure;
- idempotent `project:reconcileModelAccess`;
- Current Project persistence across projection outage;
- Workflow source materialization-before-projection;
- strict projection requirement before model launch;
- neutral Git/error/repository module placement;
- Source Control import guard;
- public MCP checkout discovery;
- private checkout-list control removal;
- Service Host build-generation fencing.

## 12. Sidebar bypass remains separate

Do not expand this card into the sidebar project-entry bypass.

That defect remains separate:

```text
Clear Project
-> sidebar Open Project
-> chooseWorkspace()
-> activateWorkspaceSelection()
-> migration inspection bypassed
```

It will receive its own entry-routing repair after this Source Control qualification blocker closes.

## Validation

Run focused owners only:

- product Current Project/Existing Project entry owner;
- model-access coordinator owner;
- Service Host client lifecycle/protocol owner needed for typed classification;
- Existing Project managed-source owner;
- Source Control boundary owner;
- capability-map integrity if touched;
- production typecheck/build;
- repair validation-plan preview;
- `git diff --check`.

Do not run broad/full regression.

## Report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair03/Repair02/Reports/EPGA-R04-R03-R02_IMPLEMENTER_REPORT.md`

Report must state:

- exact typed absence codes treated as degraded;
- exact live codes treated as blockers;
- proof Source Control was not invoked for live semantic/protocol failure;
- proof absence still permits conversion;
- proof retry succeeds.

## Checkpoint and STOP

Commit:

`EPGA-R04-R03-R02 distinguish absence from live quiescence failure`

Then STOP for Architect review.

Do not retry the real ChampCity_AI conversion until Repair02 is accepted.
