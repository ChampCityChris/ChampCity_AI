# Development Environment Resolution / Repair03 Architect Review — 2026-09-30

**Implementation checkpoint:** `453a950946eaec108b805418323e17ca0cb0432e`  
**Parent:** `aa80474de0ae071662601053b6ce9dbaa4a78cca`  
**Disposition:** **BLOCKED — FOLLOW-UP REPAIR REQUIRED BEFORE OPERATOR RETEST**

## Review result

DER-R03 substantially corrects the environment architecture, but it does not yet fully satisfy the application-led ownership contract.

The implementation correctly:

- removes the production Codex/App Server `environment-resolution` execution path;
- adds a neutral `DevelopmentEnvironmentRepairService`;
- uses the same neutral repair service for normal Work Cards and Issue Fix Cards;
- refreshes Windows Machine/User environment state before managed capability probing;
- reuses the validated standalone Node/npm resolver;
- executes npm through the resolved Node + `npm-cli.js` pair rather than raw Windows npm shim execution;
- prevents `winget search npm`;
- groups Node/npm under one provisioning owner;
- preserves DER-R02 `ffmpeg -version` / `ffprobe -version` behavior;
- adds deterministic User PATH repair before reinstall when bounded discovery finds an installed Node/npm pair;
- removes the former environment-resolution IPC/preload/renderer/model path;
- records a real Signal Forge production-path qualification reaching `ready` for Node/npm/ffmpeg/ffprobe without WinGet or App Server invocation on the current host.

Those are material corrections.

Two remaining code defects prevent acceptance.

---

## BLOCKER 1 — first environment preflight is still gated by Codex runtime acquisition

The intended boundary is:

```text
Development Environment ready
-> then acquire/start Codex
```

The current first-run path is still:

```text
Run Codex Implementer
-> CodexImplementerExecutionService.startWithSelection()
-> runtimeManager.acquire(...)
-> startSelected()
-> DevelopmentEnvironmentPreflightService.runPreflight()
-> if ready, launch App Server
```

`startWithSelection()` therefore requires the managed Codex runtime to be ready before the first deterministic environment preflight is allowed to run.

`CodexRuntimeManager.acquire()` explicitly throws when the Codex runtime is not ready.

This is still a real coupling between Codex availability and initial machine preparation.

### Why the new Retry action does not close this gap

On a fresh Work Card with no cached preflight:

`getStatus()` does not execute Development Environment preflight. It returns `readyModel(context)` with:

```text
developmentEnvironmentPreflight = null
canRunAgain = true
```

`DevelopmentEnvironmentStatus` returns nothing when preflight is null, so **Retry Environment Setup** is not rendered.

The only foreground action capable of causing the first preflight is therefore **Run Codex Implementer**.

But the renderer also gates that button through `useCodexModelSelection().canRun`, and the service attempts `runtimeManager.acquire()` before running preflight.

So a fresh Work Card can still reach this state:

```text
Codex runtime unavailable
-> Run Codex Implementer disabled / acquire unavailable
-> no cached environment preflight
-> no Retry Environment Setup control
-> deterministic environment setup never runs
```

That directly contradicts DER-R03's authority rule that ordinary environment setup is application-owned and that Codex begins only after the environment is ready.

### Required correction

Move the first deterministic environment check outside Codex runtime acquisition.

Acceptable implementations include:

1. preferred: load/project a neutral Development Environment preflight when the Implement surface is entered or refreshed; or
2. at minimum: in the Run path, resolve context and execute deterministic preflight before acquiring a Codex runtime lease.

The invariant must be:

```text
resolve exact Work Card
-> deterministic environment preflight/repair eligibility
-> ready/not-required
-> only then acquire Codex runtime/model lease
-> only then launch App Server
```

Codex runtime unavailable must never prevent ChampCity from determining or repairing machine readiness.

Add a permanent proof with a runtime manager whose `acquire()` throws and a fresh/no-cache Work Card. The deterministic environment preflight must still execute and project its result without creating an App Server session.

---

## BLOCKER 2 — persistent PATH repair misses process-only PATH success

The card requires User PATH repair whenever a valid installed Node/npm pair is available but its installation root is absent from persistent Machine/User PATH.

Current preflight does:

```text
refreshWindowsProcessEnvironment()
-> merged PATH = Machine + User + existing process PATH
-> resolveNodePair(false) against merged/current process PATH
-> if pair resolves, no persistent PATH check or repair
```

`mergeWindowsEnvironment()` deliberately preserves process-only PATH additions.

Therefore this case is not repaired:

```text
current ChampCity process PATH contains Node root
Machine PATH does not
User PATH does not
-> pair resolves
-> no User PATH repair
-> current session works
-> future normal launch can lose Node/npm again
```

The current permanent "persistent PATH missing" test sets the pair unavailable from the current PATH as well, so it does not cover this process-only-path case.

### Required correction

After resolving a valid Node/npm pair, compare its validated installation root against **persistent Machine/User PATH**, not only the merged process PATH.

If the root is absent from both persistent scopes:

- append the validated root to User PATH;
- preserve/de-duplicate existing entries;
- refresh ChampCity's process environment;
- verify the pair again.

If the root is already present persistently, do not write PATH.

Add a test where current process PATH contains the valid pair but Machine/User PATH omit it. The result must repair User PATH exactly once and remain ready without reinstall.

---

## Documentation defect — Implementer report is not valid UTF-8

The committed:

`docs/implementation-bundles/development-environment-resolution/Repair03/Reports/DER-R03_IMPLEMENTER_REPORT.md`

cannot be read through the repository text tools because it contains invalid UTF-8 bytes.

Both `read_file` and `inspect_text_file` fail with:

```text
Text projection requires valid UTF-8 input.
```

The Git diff renders replacement characters in the first lines.

This is not the product blocker, but it is a required checkpoint artifact and must be rewritten as valid UTF-8 in the follow-up repair.

---

## Accepted portions that must not regress

The follow-up repair must preserve:

- no production `environment-resolution` Codex execution kind;
- no `startEnvironmentResolution` / `startCodexEnvironmentResolution` path;
- no App Server/model fallback for ordinary environment repair;
- neutral `DevelopmentEnvironmentRepairService`;
- Work Card and Issue Fix Card shared repair machinery;
- first-probe Machine/User environment refresh;
- validated Node/npm pair semantics;
- npm internal execution through Node + `npm-cli.js`;
- no `winget search npm`;
- one Node/npm provisioning owner;
- User-scope PATH writes only, no elevation/Machine PATH mutation;
- DER-R02 FFmpeg/ffprobe probes;
- current Signal Forge real-host preflight proof.

---

## Review classification

**Blocker 1:** Implementer miss against explicit DER-R03 authority sequencing.

**Blocker 2:** Implementer miss against explicit persistent-PATH acceptance requirement.

**UTF-8 report:** implementation artifact defect.

No additional architecture expansion is required. This should be a bounded Repair03/Repair01 correction.

## Next action

Do not Operator-retest Signal Forge yet.

Release one bounded follow-up repair that:

1. executes/projects first preflight before Codex runtime acquisition;
2. repairs persistent User PATH even when the current process alone can already see Node/npm;
3. rewrites the DER-R03 Implementer Report as valid UTF-8;
4. retains the full live Signal Forge qualification and no-App-Server proofs.
