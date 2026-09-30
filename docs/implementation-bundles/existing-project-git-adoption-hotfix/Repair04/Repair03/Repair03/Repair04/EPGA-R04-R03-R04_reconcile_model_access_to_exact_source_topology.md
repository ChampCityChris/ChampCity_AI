# EPGA-R04-R03-R04 — Reconcile Model Access to Exact Application Source Topology

**Parent:** Existing Project Git Adoption Hotfix / Repair04 / Repair03 / Repair03  
**Implementation baseline:** `b1d4942e2c149417157fea76a9809a76d684cc80`  
**Architect review:** `../EPGA_R04_R03_R03_ARCHITECT_REVIEW_2026-09-30.md`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Complete downstream model-access reconciliation after machine-owned Existing Project conversion.

Do not reintroduce Agent Harness quiescence into Source Control.

The application owns source topology. Agent Harness/model access consumes that topology and must reconcile its projected RepositoryCheckout set to the current application-owned state after the machine source fence releases.

## 1. Preserve the machine-owned authority direction

Keep:

```text
application exclusive source fence
-> deterministic Source Control transition
-> release exclusive fence
-> downstream Agent Harness/model-access reconciliation
```

Never restore:

```text
Agent Harness state
-> authorizes Source Control conversion
```

Source Control must remain free of Agent Harness/MCP runtime imports and callbacks.

## 2. Fix stale conventional RepositoryCheckout projection

The real application selection path registers an Existing Project workspace with Agent Harness before conversion inspection.

For conventional Git, this legitimately projects:

```text
role: conventional
projectRelativePath: .
```

After successful conversion the root conventional Git checkout no longer exists.

Downstream reconciliation must remove that obsolete projection.

Required managed-state result:

```text
main  -> Main
dev   -> Dev
```

No stale `conventional` checkout may remain.

The cleanup must be idempotent.

Do not restore the removed private `list-repository-checkouts` Service Host operation.

The conventional checkout identity is deterministic and may be revoked directly when the application-owned topology is now managed.

## 3. Make Agent Harness checkout-topology reconciliation obey the neutral source fence

`AgentHarnessService.initializeWorkspaceRegistry()` and `registerWorkspaceRoot()` call:

`reconcileWorkspaceRepositoryCheckouts(...)`

That function inspects Git topology and changes model-access checkout projection.

This is model-access work and must acquire the neutral **shared** Project source-operation lease before inspecting/reconciling checkout state.

Use the same neutral coordinator namespace and user-data root as public tool dispatch and Desktop conversion.

Required ordering:

```text
Agent Harness workspace/source reconciliation
-> acquire shared Project source lease
-> inspect exact application source topology
-> update model-access projection
-> release shared lease in finally
```

When Desktop owns exclusive conversion:

- startup reconciliation waits/fails boundedly;
- workspace registration reconciliation waits/fails boundedly;
- neither reads an in-transition Git topology;
- neither mutates checkout projection during the conversion transaction.

Do not expose this lease through MCP.

## 4. Reconcile conventional projection when root is no longer conventional Git

Update model-access reconciliation semantics so:

### Exact conventional root

- deterministic `conventional` descriptor is present;
- Main/Dev are not fabricated solely from model-access inspection.

### Non-conventional root

If a deterministic conventional checkout is registered but the Project root is no longer an exact conventional Git working tree:

- revoke that conventional registration idempotently;
- do not mutate Git/source state;
- continue with downstream projection of application-provided Main/Dev descriptors where applicable.

This behavior belongs to the model-access projection layer, not Source Control.

## 5. Downstream managed projection must be exact enough to report ready truthfully

After successful Existing Project conversion:

1. Source Control returns managed Main/Dev descriptors.
2. downstream reconciliation registers/reconciles Agent Harness workspace under shared source lease;
3. obsolete conventional access is removed;
4. Main/Dev descriptors are published;
5. model-access status may return `ready`.

If obsolete conventional access cannot be removed or exact Main/Dev cannot be projected:

- Source Control remains successful;
- Current Project remains valid;
- model access is `degraded`;
- Retry Model Access can repeat reconciliation without rerunning Git conversion.

## 6. Preserve projection outage semantics

Do not roll back or invalidate:

- managed repository metadata;
- Main/Dev worktrees;
- completed conversion receipt;
- Current Project registration

because downstream Agent Harness reconciliation fails.

Model-access repair remains a retryable integration concern.

## 7. Add a real pre-conversion workspace-registration regression

The previous test bypassed the actual registration sequence by providing a synthetic chooser that returned the Project path directly.

Add a focused proof that performs the real semantic sequence:

```text
conventional Git Project
-> Agent Harness registerWorkspaceRoot(Project)
-> conventional checkout is projected
-> inspect Existing Project
-> accept conversion under exclusive source fence
-> downstream managed projection
-> query Agent Harness checkout summaries
```

Final assertion:

```text
roles == ["dev", "main"]
conventional == absent
```

Also prove public `git_toolbox.list_repository_checkouts` exposes only the current managed checkouts.

## 8. Reopen proof

After the above conversion:

- re-register/reopen the same managed Project;
- reconciliation remains idempotent;
- no conventional checkout reappears;
- Main/Dev IDs remain stable;
- public discovery remains exact.

## 9. Failed conversion proof

Prove a conversion failure that restores root conventional Git does not leave model access permanently missing.

Required sequence:

1. conventional projection exists;
2. exclusive conversion begins;
3. conversion fails and root `.git` remains/restores authoritative;
4. exclusive lease releases;
5. later model-access reconciliation under shared lease observes conventional topology;
6. deterministic conventional projection is present again.

Do not make Source Control responsible for restoring it.

## 10. Conversion/reconciliation race proof

Add focused cross-process or process-boundary proof:

1. Desktop holds exclusive source-transition lease;
2. Agent Harness workspace/source reconciliation is requested;
3. reconciliation does not inspect or mutate topology while exclusive is held;
4. exclusive releases;
5. reconciliation proceeds against final topology.

This proof should exercise the Agent Harness reconciliation path, not only public tool dispatch.

## 11. Keep project-entry fixes accepted

Do not change unless required by compilation:

- canonical `admitExistingProject()` route;
- sidebar Open/Change Project delegation;
- Clear Project -> landing;
- Cancel -> landing;
- Workflow Hub requiring Current Project;
- Project Intake repository bound to Current Project root.

Those portions of Repair03 are accepted.

## 12. Keep neutral fence implementation accepted

Do not redesign the cross-process coordinator unless a direct defect is discovered while adding the reconciliation client.

Preserve:

- filesystem-backed per-Project namespace;
- shared/exclusive semantics;
- bounded acquisition;
- exclusive intent preventing new shared work;
- crash/stale-owner recovery;
- unrelated-Project independence;
- public model tool dispatch shared leases.

## Permanent proof

At minimum prove:

1. real pre-conversion Agent Harness workspace registration creates conventional projection;
2. successful managed conversion removes conventional projection;
3. Main/Dev are the only managed checkout roles after conversion;
4. public MCP checkout discovery returns only current managed checkouts;
5. managed reopen does not resurrect conventional;
6. failed conversion can later reconcile conventional again;
7. Agent Harness source-topology reconciliation obeys shared machine fence;
8. Agent Harness reconciliation cannot run through Desktop exclusive conversion;
9. Source Control still imports no Agent Harness/MCP implementation;
10. projection failure remains degraded and retryable;
11. project-entry bypass regression remains passing;
12. `git diff --check` passes.

## Validation

Run focused validation only:

- production typecheck/build;
- Current Project/Existing Project entry owner;
- Agent Harness registry/model-access reconciliation owner;
- machine source-operation coordinator owner;
- public MCP Git contract/discovery owner;
- Existing Project managed-source owner;
- Source Control boundary/import guard;
- project-entry regression owner;
- capability-map integrity if touched;
- repair validation-plan preview;
- `git diff --check`.

Do not run broad/full regression.

## Implementer report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair03/Repair03/Repair04/Reports/EPGA-R04-R03-R04_IMPLEMENTER_REPORT.md`

The report must state:

- where shared fencing was added to Agent Harness checkout reconciliation;
- how obsolete conventional projection is retired;
- proof the private checkout-list control remains absent;
- exact post-conversion checkout roles;
- public MCP discovery result;
- failed-conversion restoration/reconciliation behavior;
- focused validation results.

## Checkpoint and STOP

Commit:

`EPGA-R04-R03-R04 reconcile model access to exact source topology`

Then STOP for Architect review.

Do not retry the real ChampCity_AI conversion until Repair04 is accepted.
