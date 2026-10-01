# DER-R03-R01 — Complete Environment Authority Decoupling and Persistent Node/npm PATH Repair

**Parent:** Development Environment Resolution / Repair03  
**Blocked implementation:** `453a950946eaec108b805418323e17ca0cb0432e`  
**Architect review:** `../DER_R03_ARCHITECT_REVIEW_2026-09-30.md`  
**Current Dev baseline:** `cace333a57178ea15d61572596b618e9673d35a6`  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** **ACTIVE — BLOCKING FOLLOW-UP REPAIR**

## Objective

Finish the DER-R03 ownership correction without reopening the architecture.

DER-R03 successfully removed model-driven Environment Resolution and established an application-owned Development Environment repair service. Two implementation defects remain:

1. the **first** deterministic environment preflight is still downstream of Codex runtime acquisition / model readiness;
2. Node/npm persistent PATH repair is skipped when the current ChampCity process can see the Node root but persistent Machine/User PATH cannot.

This repair must close those two gaps and rewrite the DER-R03 Implementer Report as valid UTF-8.

The governing rule is:

```text
ChampCity Development Environment
-> determine / repair machine readiness
-> READY
-> only then Codex runtime/model selection matters
```

Codex availability must never prevent ChampCity from checking or repairing the development environment.

---

# 1. Preserve the accepted DER-R03 architecture

Do not undo any accepted DER-R03 behavior.

Preserve:

- no production `environment-resolution` Codex execution kind;
- no `startEnvironmentResolution()`;
- no `startCodexEnvironmentResolution()`;
- no model/App Server fallback for ordinary environment repair;
- neutral `DevelopmentEnvironmentRepairService`;
- shared deterministic repair path for Work Cards and Issue Fix Cards;
- Windows Machine/User environment refresh before capability probing;
- safe standalone Node/npm pair resolution;
- npm execution through validated Node + `npm-cli.js`;
- no `winget search npm`;
- one Node/npm provisioning owner;
- User PATH only for PATH repair;
- no elevation/Machine PATH mutation for Node PATH repair;
- `ffmpeg -version` / `ffprobe -version`;
- post-provision executable verification.

This is a sequencing and persistence repair, not another environment redesign.

---

# 2. First environment check must not require Codex runtime acquisition

Current service order is still effectively:

```text
start()
-> startWithSelection()
-> runtimeManager.acquire(...)
-> startSelected()
-> deterministic preflight
-> App Server launch
```

That is incorrect.

The service-level invariant must become:

```text
resolve exact Work Card / Fix Card context
-> obtain current deterministic environment preflight
-> if no current preflight: run application-owned preflight
-> if not ready: return/project environment state
-> ONLY IF ready/not-required:
     acquire Codex runtime/model lease
     launch implementation App Server
```

No direct API call may acquire a Codex lease before deterministic environment readiness is known.

This rule must hold even if the renderer is bypassed.

---

# 3. Fresh Work Card must expose environment setup independently of model controls

A fresh Work Card currently has:

```text
developmentEnvironmentPreflight = null
```

and `DevelopmentEnvironmentStatus` returns nothing.

That leaves no environment action when Codex model/runtime controls are unavailable.

Change the Work Card surface so a fresh environment state is explicit.

Required equivalent presentation:

```text
Development Environment
Not checked

[ Prepare Environment ]
```

The label may be `Prepare Environment`, `Check Environment`, or `Prepare Development Environment`; choose one and use it consistently.

The action:

- calls the neutral application-owned environment repair/preflight API;
- does not depend on model selection;
- does not depend on Codex runtime status;
- does not acquire a Codex lease;
- does not create an App Server.

After the first result:

- `ready/not-required` -> environment control disappears and Codex implementation may become eligible;
- retryable failure -> show `Retry Environment Setup`;
- human-action blocker -> show exact operator/restart requirement;
- hard blocker -> show blocked state.

---

# 4. Model/reasoning controls must not gate the environment action

The Development Environment action must remain outside `CodexExecutionActions` and outside `useCodexModelSelection().canRun`.

Required separation:

```text
DevelopmentEnvironmentStatus
  -> Prepare / Retry Environment

CodexExecutionActions
  -> Model
  -> Reasoning
  -> Run Codex Implementer
```

If Codex runtime is unavailable:

- environment preparation still works;
- environment status can still reach `ready`;
- only `Run Codex Implementer` remains unavailable.

Do not render Codex availability as the reason environment setup cannot run.

---

# 5. Null preflight must not imply implementation-ready

Current `readyModel(context)` can expose:

```text
developmentEnvironmentPreflight = null
canRunAgain = true
```

for a fresh Work Card.

That is too permissive for a Work Card that declares/has not yet evaluated its environment contract.

Correct the projection so implementation eligibility requires one of:

```text
preflight.state = ready
preflight.state = not-required
```

A null/uncomputed preflight is **not** implementation-ready.

Do not use null as an implicit success state.

---

# 6. Direct Run action must enforce preflight-before-Codex defensively

Even after the renderer gets an explicit Prepare Environment action, `CodexImplementerExecutionService.start()` must remain safe when called directly.

Before `runtimeManager.acquire()`:

1. resolve exact Work Card context;
2. check cached/current deterministic preflight;
3. if absent/stale for the exact contract, run `DevelopmentEnvironmentPreflightService.runPreflight()`;
4. project/cache that result;
5. if result is not `ready` or `not-required`, return an unavailable model containing the environment state;
6. only then acquire Codex runtime/model capacity.

A blocked or retryable environment must never call:

- `runtimeManager.acquire()`;
- `runtimeManager.acquireConcurrentExact()`;
- `appServerFactory()`.

Keep exact Workflow WorkItem behavior unchanged unless it also declares this Development Environment contract path; do not broaden scope accidentally.

---

# 7. Codex-unavailable first-preflight proof

Add a permanent service test for the exact authority boundary.

Fixture:

- fresh normal Work Card;
- no cached preflight;
- deterministic preflight returns `resolution-required` or `blocked`;
- runtime manager `acquire()` throws if called;
- App Server factory throws if called.

Expected:

```text
start()
-> deterministic preflight executes
-> environment result projected
-> canRunAgain = false
-> environment repair eligibility truthful
-> runtime acquire count = 0
-> App Server count = 0
```

Then add a second proof:

- deterministic preflight returns `ready`;
- only after that does the service attempt Codex acquisition.

The call order must be asserted.

---

# 8. Renderer fresh-state proof

Add focused renderer proof:

```text
developmentEnvironmentPreflight = null
Codex runtime unavailable
```

Expected:

- Development Environment section is visible;
- status says not checked / preparation required;
- Prepare Environment is enabled;
- environment button does not depend on model/reasoning controls;
- Run Codex Implementer is not eligible until a ready/not-required preflight exists.

After the neutral action returns `ready`:

- environment status shows ready;
- no Retry/Prepare environment action remains;
- Run Codex eligibility is then determined by actual Codex/model readiness.

---

# 9. Expose persistent Windows PATH separately from merged process PATH

The Node/npm repair decision must distinguish:

1. current process PATH;
2. persistent Machine PATH;
3. persistent User PATH.

Today `refreshWindowsProcessEnvironment()` reads Machine/User state but returns only the merged environment.

Extend the neutral Windows environment result or add a bounded helper so the provisioner can determine whether a validated installation root exists in persistent Machine/User PATH.

Equivalent data is sufficient:

```ts
{
  env: mergedProcessEnvironment,
  machinePath: "...",
  userPath: "..."
}
```

Do not expose unrelated environment values merely for this decision.

Do not treat current-process-only PATH as persistent authority.

---

# 10. Persistent PATH reconciliation must occur even when pair resolution already succeeds

After the initial Windows environment refresh, when a valid Node/npm pair resolves from the merged/current process PATH:

```text
pair = validated node.exe + npm-cli.js
root = dirname(pair.executable)
```

check that `root` appears in either persistent:

- Machine PATH; or
- User PATH.

If yes:

- do not write PATH.

If no:

```text
validated pair already works in current process
-> append exact root to User PATH
-> refresh Windows process environment
-> verify persistent User/Machine PATH now contains root
-> resolve pair again
-> run semantic Node/npm probes
```

Do not reinstall.

This case is distinct from stale process PATH.

---

# 11. Required Node/npm PATH cases

The implementation must now support all three installed-toolchain states correctly.

## A. Persistent PATH contains Node root, process was stale

```text
Machine/User PATH contains validated root
current process initially stale
-> refresh
-> pair resolves
-> no PATH write
-> no install
-> ready
```

## B. Current process sees Node root, persistent PATH does not

```text
process-only PATH contains validated root
Machine/User PATH omit root
-> pair resolves
-> detect nonpersistent exposure
-> write exact validated root to User PATH
-> refresh
-> verify
-> no install
-> ready
```

## C. Pair not on PATH but found in bounded trusted install root

```text
pair not resolvable from refreshed PATH
-> bounded trusted discovery finds pair
-> write root to User PATH
-> refresh
-> verify
-> no install
-> ready
```

Only when no valid pair can be found through A/B/C may deterministic Node toolchain provisioning occur.

---

# 12. PATH matching rules

Use the same bounded Windows path normalization semantics already used by the repair.

Required:

- case-insensitive;
- trim surrounding quotes;
- normalize separators;
- ignore trailing separators;
- compare complete path entries, not substring matches.

Do not modify Machine PATH.

Do not remove/reorder unrelated User PATH entries.

Do not add duplicates.

---

# 13. User PATH repair verification

After `repairWindowsNodeUserPath(root)` succeeds:

1. reread persistent User/Machine environment state;
2. verify the exact normalized root is now persistent;
3. refresh ChampCity process environment;
4. resolve the standalone Node/npm pair again;
5. execute semantic Node/npm probes.

If persistent verification fails:

- return a retryable deterministic verification blocker;
- do not reinstall automatically.

---

# 14. Process-only PATH permanent proof

Add the missing permanent test:

Fixture:

- current process PATH contains the validated Node root;
- persistent Machine PATH omits it;
- persistent User PATH omits it;
- pair is valid;
- Node/npm probes succeed.

Expected:

- initial refresh occurs;
- pair resolves;
- User PATH writer called exactly once;
- no WinGet/provider resolution;
- no reinstall;
- refresh after write;
- final preflight `ready`;
- second execution is idempotent and performs no second PATH write.

This is the specific gap in DER-R03.

---

# 15. Persistent PATH already-correct proof

Fixture:

- persistent Machine or User PATH already contains validated Node root;
- current process may or may not initially be stale.

Expected:

- environment refresh;
- pair resolves;
- User PATH writer count = 0;
- no install;
- ready.

Test both Machine and User persistent ownership if inexpensive; at minimum prove one and the normalization helper separately.

---

# 16. Preserve absent-toolchain provisioning proof

Keep the accepted DER-R03 case:

```text
no valid Node/npm pair
-> fixed Node toolchain provisioning
-> refresh
-> pair resolution
-> node verify
-> npm verify
-> ready
```

Continue asserting:

- no `winget search npm`;
- no independent npm installation;
- no App Server/LLM call.

---

# 17. Rewrite DER-R03 Implementer Report as valid UTF-8

The committed report:

`docs/implementation-bundles/development-environment-resolution/Repair03/Reports/DER-R03_IMPLEMENTER_REPORT.md`

currently fails repository text projection with:

```text
Text projection requires valid UTF-8 input.
```

Rewrite the report as valid UTF-8.

Preserve its substantive implementation/validation evidence, correcting any statements superseded by this repair.

Do not merely delete the report.

After rewrite, prove:

- `repo_toolbox.read_file` equivalent text tooling can read it;
- no replacement/control corruption remains in headings/status lines.

The Repair01 Implementer report is separate and must also be valid UTF-8.

---

# 18. Repair01 Implementer report

Write:

`docs/implementation-bundles/development-environment-resolution/Repair03/Repair01/Reports/DER-R03-R01_IMPLEMENTER_REPORT.md`

The report must state:

- exact preflight-before-Codex sequencing change;
- fresh/null-preflight renderer behavior;
- proof Codex unavailable does not block environment preparation;
- persistent Machine/User PATH representation;
- process-only PATH repair behavior;
- idempotence proof;
- preserved absent-toolchain provisioning behavior;
- rewritten parent DER-R03 report UTF-8 proof;
- focused validation results.

---

# 19. Live Signal Forge requalification

After focused tests, rerun the complete real Signal Forge Development Environment contract through the application-owned production preflight path:

```text
node >=22.0.0
npm
ffmpeg
ffprobe
```

Record:

- final preflight state;
- detected versions;
- whether persistent PATH write was required;
- provider/WinGet calls;
- App Server calls.

Expected on the current known host:

```text
final state = ready
App Server calls = 0
```

If persistent PATH is already correct by qualification time, that is acceptable; the process-only persistent repair path is proven by the permanent test.

---

# 20. Non-scope

Do not:

- reintroduce Codex Environment Resolution;
- change Signal Forge requirements;
- add Agent Harness/MCP environment setup;
- modify Git/source-control behavior;
- redesign WinGet package resolution broadly;
- recursively scan disks for Node;
- mutate Machine PATH;
- install npm independently;
- redesign repository dependency hydration;
- rewrite unrelated renderer workspace work currently landing on Dev.

---

# Permanent acceptance proof

At minimum prove:

1. fresh environment state is not treated as implementation-ready;
2. Prepare Environment is available with null preflight independently of Codex;
3. deterministic preflight executes before Codex runtime acquisition;
4. blocked/retryable environment causes zero runtime acquire/App Server calls;
5. ready environment is the only state that proceeds to Codex acquisition;
6. stale process PATH with persistent Node root requires no PATH write;
7. process-only Node PATH causes User PATH persistence repair;
8. bounded off-PATH trusted Node discovery still causes User PATH repair;
9. persistent PATH repair is idempotent;
10. PATH repair failure does not trigger reinstall;
11. absent Node/npm pair still provisions one Node toolchain;
12. `winget search npm` remains impossible;
13. npm still uses Node + `npm-cli.js`;
14. ffmpeg/ffprobe DER-R02 behavior remains passing;
15. normal Work Card and Issue Fix Card still share neutral repair;
16. parent DER-R03 Implementer Report is readable valid UTF-8;
17. full real Signal Forge qualification reaches `ready`;
18. `git diff --check` passes.

---

# Validation

Run focused validation only:

- production typecheck/build;
- Windows environment refresh owner;
- Windows npm invocation owner;
- Windows Development Environment provisioner owner;
- Development Environment preflight owner;
- Work Card Codex execution owner for sequencing boundary;
- Work Card renderer owner;
- Issue Fix Card renderer/application owner as regression;
- capability-map integrity if touched;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad/full regression suite.

---

# Checkpoint and STOP

Commit:

`DER-R03-R01 complete preflight authority and persist Node PATH`

Then STOP for Architect review.
