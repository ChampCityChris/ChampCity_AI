# IRR-R01 — Restore Automatic Implementation Readiness and Decouple Codex Runtime Health from MCP Connection Governance

**Bundle:** Implementation Readiness Recovery  
**Current Dev baseline:** `e477820a8ae132c6b29ca153638b3b5c46ab98a1`  
**Reproduced project:** Signal_Forge  
**Parent repairs:** DER-R03-R01, CRC-R01  
**Implementer:** GPT 6.1 Sol / Luna Medium acceptable  
**Status:** **ACTIVE — IMPLEMENTER STARTUP BLOCKER**

## Objective

Repair two regressions introduced while correcting Development Environment and managed Codex connection ownership:

1. **Development Environment qualification became a manual recurring gate.**  
   A fresh ChampCity process forgets the in-memory preflight and forces the Operator to click `Prepare Environment` even when the machine is already ready.

2. **CRC-R01 connection-governance work can now collapse managed Codex runtime initialization into `unavailable`.**  
   When runtime initialization fails, the model catalog is cleared, the saved model is displayed as unavailable, the selector is locked, and Work Card implementation cannot start.

The target startup sequence is:

```text
Open Work Card Implement
        ↓
ChampCity automatically performs deterministic environment preflight
        ↓
environment ready / not-required
        ↓
managed Codex runtime health is established independently
        ↓
managed MCP connection policy is evaluated separately
        ↓
model catalog available
        ↓
Operator selects model/reasoning if needed
        ↓
Run Codex Implementer
```

No routine environment-preparation click is required.

Optional/unrelated MCP connection problems must never make the Codex runtime/model catalog itself appear unavailable.

---

# Confirmed production symptoms

Signal Forge now shows:

```text
Development Environment
Not checked
[ Prepare Environment ]
```

After environment preparation it correctly reaches:

```text
Development environment ready
4 capability requirement(s) already satisfied.
```

but the managed Codex controls show:

```text
Model: gpt-6.1-sol (unavailable)
Reasoning: Choose reasoning

Codex version pending · unavailable ·
Managed Codex runtime could not be initialized.
Restart to retry the runtime check.

Required Codex connections ready · Optional connection warnings: 0
The selected model is unavailable. Choose an advertised model.
```

The Model and Reasoning selectors are disabled and Run Codex Implementer cannot start.

---

# RCA A — Development Environment preflight is memory-only and manually triggered

`CodexImplementerExecutionService` currently stores preflight results only in:

```ts
private readonly preflightByWorkspaceRoot =
  new Map<string, DevelopmentEnvironmentPreflightResult>();
```

`getStatus()` reads:

```ts
context.developmentEnvironmentPreflight =
  this.preflightByWorkspaceRoot.get(preflightKey(context)) ?? null;
```

It does not run preflight when the exact Work Card has no cached result.

The renderer interprets null as:

```text
Not checked
[ Prepare Environment ]
Development environment preparation must complete first.
```

Therefore every fresh application process can reintroduce a manual environment gate even for a previously-ready workstation.

That is a UX and lifecycle regression.

---

# RCA B — managed runtime health is coupled to connection-governance machinery

CRC-R01 changed production runtime probing so `createCodexRuntimeOperations().probe(runtime)` now includes managed MCP connection machinery.

Current runtime startup/probe responsibilities include:

- verify Codex executable version;
- generate and validate App Server schema;
- inventory configured MCP servers using `codex mcp list --json`;
- generate `mcp_servers` disable overrides;
- launch App Server with those overrides;
- enumerate the model catalog.

A failure anywhere in that combined path can cause the runtime initializer to reject the current/prior runtime.

`initializeManagedCodexRuntime()` then:

1. swallows prior-runtime probe failure;
2. tries latest/staged runtime;
3. may try bundled bootstrap;
4. collapses the final failure to:

```text
Managed Codex runtime could not be initialized. Restart to retry the runtime check.
```

The final state becomes:

```text
runtime = null
version = null
catalog = []
updateState = unavailable
```

That directly locks the model selector.

This violates the intended CRC-R01 boundary:

> managed runtime/model health and optional outbound MCP connection health are separate concerns.

---

# SILO A — Automatic deterministic Development Environment readiness

## 1. Remove routine `Prepare Environment` from the normal first-load path

When an Implement surface opens for a normal Work Card or Issue Fix Card and the exact environment preflight is absent:

```text
preflight = null
-> automatically start the neutral deterministic Development Environment preflight
-> render Checking / Preparing state
-> project result into the existing execution model
```

The Operator must not have to click `Prepare Environment` merely because ChampCity restarted.

The explicit environment action remains only for an actual retryable failure.

Preferred UI:

```text
Development Environment
Checking…
```

then:

```text
Development Environment
Ready
```

or:

```text
Development Environment
Needs attention
[ Retry Environment Setup ]
```

---

## 2. Auto-preflight must use the neutral application-owned service

Reuse the existing application-owned Development Environment path established by DER-R03:

```text
DevelopmentEnvironmentRepairService
DevelopmentEnvironmentPreflightService
```

Do not invoke:

- Codex;
- App Server;
- Agent Harness;
- MCP;
- model inference.

This remains deterministic machine setup.

---

## 3. Trigger once per exact environment contract identity

Use the existing exact `preflightKey(context)` or a neutral equivalent identity.

Automatic preflight must not rerun because of:

- React rerender;
- 1.5-second Codex status polling;
- unrelated document UI changes;
- model selection changes.

Required behavior:

```text
exact Work Card / exact revision / exact SHA
-> at most one in-flight automatic preflight
-> result cached for process lifetime under exact key
```

If the formal Work Card identity/revision/SHA changes, a new automatic preflight is correct.

---

## 4. No overlapping automatic/explicit environment operations

If automatic preflight is running:

- do not show an enabled Retry action;
- ignore/coalesce duplicate auto triggers;
- do not run a second provisioner instance.

If explicit Retry is running:

- automatic foreground refresh must observe that operation rather than launching another.

---

## 5. Persistence is not required for this repair

Do not add Project State or SQL persistence solely to remember environment readiness.

A deterministic recheck on app restart is acceptable and preferable to stale persisted machine readiness.

The requirement is:

> automatic, fast, deterministic revalidation — not permanent caching.

---

## 6. Environment auto-check proof

Add permanent proof:

```text
fresh process
exact Work Card
no cached preflight
machine requirements already satisfied
-> Implement surface foregrounded
-> automatic deterministic preflight runs
-> no Operator click
-> final preflight ready
-> Prepare Environment never presented as a required step
```

Also prove:

- one automatic run only;
- exact Work Card revision/SHA change causes a fresh check;
- failed retryable preflight exposes Retry Environment Setup;
- no Codex/App Server calls occur during this flow.

---

# SILO B — Managed Codex runtime/model health

## 7. Separate runtime/model verification from outbound connection verification

Define two explicit health domains.

### Runtime/model health

Owns:

- executable exists;
- binary version is valid;
- App Server schema supports ChampCity's execution contract;
- App Server can initialize;
- model catalog can be enumerated.

### Managed connection health

Owns:

- configured MCP inventory;
- ChampCity approval projection;
- required/optional status;
- enable/disable overrides;
- authentication readiness;
- pre-turn connection enforcement.

Connection-governance failure must not erase an otherwise verified runtime/model catalog.

---

## 8. Runtime probe must not require connection policy success

Refactor `createCodexRuntimeOperations().probe(runtime)`.

A runtime may only become `unavailable` because the core runtime/model contract itself cannot be established.

Examples that may make runtime unavailable:

- executable cannot start;
- executable version is invalid;
- required App Server protocol/schema is incompatible;
- App Server initialize fails independently of external MCP workers;
- model catalog cannot be obtained through a connection-neutral supported path.

Examples that must **not** by themselves erase runtime/model health:

- `mcp list --json` failure;
- connection projection read failure;
- optional MCP authentication failure;
- required MCP authentication failure;
- connection status-list failure;
- inability to construct/apply a connection policy override.

Those belong to connection state/blockers.

---

## 9. Use a connection-neutral runtime/model probe

The pinned managed runtime must have one proven way to enumerate models without allowing arbitrary ambient MCP workers to destabilize the probe.

Implementer must determine and prove the supported mechanism against the **actual managed-current/latest runtime**, not merely the bundled fallback package.

Acceptable mechanisms include:

- supported command/config override that disables external MCP loading for the probe;
- an isolated temporary runtime configuration layer that preserves model authentication but excludes MCP servers;
- another pinned-runtime mechanism demonstrated by a production-path test.

Do not assume that semantics proven only on bundled `@openai/codex 0.146.0` apply to all dynamically managed versions.

---

## 10. Persist last verified runtime metadata/catalog

A previously verified managed runtime should not become unusable merely because a later connection-governance check fails.

Persist bounded runtime metadata under ChampCity user data alongside `current.json`, equivalent to:

```json
{
  "version": "...",
  "catalog": [...],
  "verifiedAt": "...",
  "executionContractVersion": "..."
}
```

Do not persist credentials or MCP status.

On startup:

```text
load current runtime
-> core runtime verification succeeds
-> current catalog refreshed
```

If a non-core connection-governance operation fails:

```text
runtime remains current/degraded
catalog remains usable
connection status shows needs-attention
```

Do not clear the model catalog.

If the core runtime itself cannot be verified, fail closed normally.

---

## 11. Preserve last-known-good runtime during candidate/update failure

Keep the existing intended behavior:

```text
verified current runtime
+ latest candidate/update fails
-> keep current runtime
-> updateState = degraded
-> current model catalog remains available
```

Extend proof so the same holds when the failure is specifically inside new connection-governance setup.

A connection-policy defect in a newly staged runtime must not replace/delete a verified current runtime.

---

## 12. Initialization failures must retain stage-specific diagnostics

Do not collapse every failure into:

```text
Managed Codex runtime could not be initialized. Restart to retry the runtime check.
```

Project a bounded sanitized failure stage.

Equivalent:

```text
Runtime executable check failed
Runtime schema compatibility check failed
Model catalog check failed
Connection inventory check failed
Connection policy check failed
Runtime update check failed
Bundled fallback check failed
```

Include a bounded sanitized diagnostic message.

Do not expose:

- local credential values;
- tokens;
- authorization headers;
- full raw config;
- arbitrary raw stderr.

---

## 13. Add restartless Retry Codex Runtime

A failed initializer is currently effectively one-shot for the desktop process.

Provide a bounded application action:

```text
[ Retry Codex Runtime ]
```

when `updateState === "unavailable"`.

It must:

1. refuse while a Codex run/selection save is active;
2. shut down/retire the failed initializer worker if needed;
3. create a fresh initializer client/generation;
4. rerun initialization;
5. update runtime status/model catalog in place;
6. not require desktop restart.

Do not mutate model selection unless the saved selection is genuinely absent from the refreshed catalog.

---

## 14. Runtime retry generation safety

The current `CodexRuntimeInitializerClient` memoizes one `initialization` Promise.

A retry must not reuse the failed memoized Promise.

Use a fresh initializer generation/client or explicitly reset the lifecycle safely.

Late responses from an older failed generation must not overwrite newer runtime state.

Add generation/identity protection if necessary.

---

## 15. Model picker behavior after recovery

When runtime recovery succeeds:

- catalog repopulates;
- saved `gpt-6.1-sol` remains selected if advertised;
- Model selector becomes enabled;
- Reasoning selector becomes enabled;
- user may change either normally;
- Run Codex Implementer becomes enabled when all other conditions are ready.

Do not leave `(unavailable)` in the selector after the catalog contains that model.

---

## 16. Connection status must not claim ready while runtime is unavailable

Current empty connection projection produces:

```text
Required Codex connections ready · Optional connection warnings: 0
```

even when:

```text
Codex runtime = unavailable
```

That is misleading.

When runtime health is unavailable/uninitialized:

- connection status should read `Not checked` / `Runtime unavailable`; or
- connection status should be omitted.

Do not say `Required connections ready` without a usable runtime on which to evaluate them.

---

## 17. Preserve CRC-R01 ambient MCP isolation

Do not regress the accepted CRC-R01 safety boundary.

When implementation actually launches:

- ambient user MCP entries remain disabled unless approved;
- project-local ambient entries remain disabled unless approved;
- optional external connections remain unable to crash the Work Card run;
- required connection blockers occur before `turn/start`;
- credential diagnostics remain redacted.

This repair changes health sequencing, not ambient-connection policy.

---

## 18. Qualify against actual dynamic managed runtime

The permanent runtime-isolation proof must exercise:

1. the bundled fallback runtime; and
2. the actual managed current/latest runtime selected by `initializeManagedCodexRuntime()` in the normal Windows lane.

Record:

- runtime version;
- core runtime probe result;
- model catalog count;
- connection isolation mechanism;
- connection preflight result.

Do not claim dynamic-runtime compatibility based solely on `@openai/codex 0.146.0`.

---

# Combined startup acceptance scenario

Add one end-to-end focused test/qualification matching Signal Forge:

```text
fresh ChampCity process
Signal Forge Work Card phase-1-c01
environment preflight cache empty
managed runtime current pointer exists
ambient user MCP entries include invalid-token Cloudflare/GitHub
```

Expected:

```text
1. Implement screen opens.
2. Environment automatically checks.
3. node/npm/ffmpeg/ffprobe -> ready.
4. No Prepare Environment click required.
5. Core managed Codex runtime initializes.
6. Model catalog includes the advertised current model.
7. Ambient Cloudflare/GitHub MCPs are excluded.
8. Connection status does not poison runtime/model readiness.
9. Model and Reasoning selectors are usable.
10. Run Codex Implementer becomes enabled.
11. Implementation turn may start.
```

---

# Failure-path acceptance scenarios

## Connection inventory failure

```text
core runtime healthy
model catalog available
connection inventory fails
```

Expected:

- runtime remains usable/current or degraded;
- model catalog remains;
- model selector remains usable;
- connection status shows needs-attention;
- if safe isolation cannot be proven for an implementation launch, Run may be blocked by a **connection blocker**, not by `Codex runtime unavailable`.

## Core runtime failure

```text
executable/schema/model catalog genuinely unavailable
```

Expected:

- runtime unavailable;
- model selector disabled;
- actual bounded failure stage displayed;
- Retry Codex Runtime visible.

## Retry success

```text
runtime unavailable
-> Retry Codex Runtime
-> fresh initializer succeeds
```

Expected:

- version/catalog restored in-place;
- saved valid model restored;
- no desktop restart.

---

# Non-scope

Do not:

- reintroduce model-driven Development Environment setup;
- weaken CRC-R01 ambient MCP isolation;
- implement generic third-party OAuth;
- change Agent Harness OAuth;
- modify Git/source-control behavior;
- change Signal Forge Work Card requirements;
- persist machine readiness into Project State/SQL;
- redesign model selection UI beyond readiness/retry state.

---

# Permanent acceptance proof

At minimum prove:

1. fresh Implement foreground automatically runs deterministic environment preflight;
2. routine `Prepare Environment` click is no longer required;
3. automatic environment preflight runs once per exact contract identity;
4. environment check invokes zero Codex/App Server operations;
5. core runtime/model health is independent from connection-governance health;
6. `mcp list`/connection-policy failure cannot clear a verified runtime/model catalog;
7. candidate/update connection-policy failure preserves last verified runtime;
8. initialization reports bounded stage-specific failure;
9. unavailable runtime can be retried without desktop restart;
10. retry uses a fresh initializer generation;
11. successful retry restores advertised model selection controls;
12. connection status does not report "ready" while runtime is unavailable;
13. CRC-R01 ambient invalid-token workers remain excluded from implementation;
14. required connection failures remain pre-turn blockers;
15. actual managed-current/latest runtime is qualified, not only bundled 0.146.0;
16. Signal Forge combined startup reaches environment-ready + model-selectable state;
17. production build passes;
18. `git diff --check` passes.

---

# Validation

Run focused validation only:

- Development Environment preflight/repair owner;
- Work Card renderer readiness owner;
- Issue Fix Card readiness owner;
- `codex-runtime-manager.test.cjs`;
- runtime initializer client/process-boundary owner;
- `codex-managed-connections.test.cjs`;
- App Server transport owner;
- Work Card Codex execution owner;
- model selection renderer owner;
- capability-map integrity if touched;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad/full regression suite.

---

# Implementer report

Write:

`docs/implementation-bundles/implementation-readiness-recovery/Repair01/Reports/IRR-R01_IMPLEMENTER_REPORT.md`

The report must explicitly state:

- automatic environment-preflight trigger and deduplication mechanism;
- exact core-runtime vs connection-health separation;
- actual root failure stage observed on the current machine before repair, if reproducible;
- last-known-good runtime/catalog persistence behavior;
- restartless runtime retry mechanism;
- actual managed-current/latest runtime version qualified;
- Signal Forge combined startup proof;
- focused validation results.

---

# Checkpoint and STOP

Commit:

`IRR-R01 restore automatic readiness and decouple Codex runtime health`

Then STOP for Architect review.
