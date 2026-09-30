# DER-R01 — Probe Installed Capabilities Before Provider Resolution and Fix Environment-Resolution Terminal UX

**Bundle:** Development Environment Resolution  
**Current baseline:** `9f8fa65760ed970cfc24fbfda816e29636438dde`  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** **ACTIVE — GREENFIELD ENVIRONMENT RESOLUTION BLOCKER**

## Objective

Fix a deterministic Development Environment defect that can leave a Greenfield Work Card blocked even after the required executable is already installed and callable.

The repair has two bounded parts:

1. **Probe before provider resolution.**  
   For managed executable requirements without a specialized registry adapter, ChampCity must run its own deterministic generic executable probe before asking WinGet/provider resolution to identify a package.

2. **Execution-kind-aware terminal feedback.**  
   Environment Resolution is not Work Card implementation and must never report "Implementer Report was not updated." Its terminal state and color must reflect environment readiness, not report readiness.

Do not redesign Development Environments, Work Card execution, provider resolution, or Greenfield workflow structure.

---

# Confirmed production defect

The observed Greenfield phase Work Card required tools including `ffprobe`.

The screen showed:

```text
ffprobe
STATE: UNKNOWN -> UNKNOWN
LAST STAGE: RESOLUTION
RESOLVE ENVIRONMENT AVAILABLE
WinGet search returned multiple materially plausible package candidates; exact package identity is required.
```

The Environment Resolution model then produced evidence that:

```text
ffprobe --version
-> 9.0.2

where.exe ffprobe
-> installed and callable
```

The parent process refreshed its Windows environment and reran deterministic preflight, but the preflight returned `resolution-required` again.

The screen therefore remained blocked.

The same run then displayed a green message:

```text
Codex completed, but the Implementer Report was not updated.
```

That message is also wrong because Environment Resolution is not supposed to update the Implementer Report.

---

# 1. Root cause — generic executable probe is constructed but skipped

Current `resolveProviderBackedRequirement()` does this:

```ts
const genericEntry = existingEntry ?? genericProbeEntry(requirement);

const before = existingEntry
  ? await this.probe(genericEntry, requirement, workspaceRoot)
  : unresolvedProviderIdentityProbe(requirement);
```

For an unregistered executable capability such as `ffprobe`:

1. `genericProbeEntry(requirement)` correctly creates a probe equivalent to:
   `<capability> --version`;
2. the code then deliberately does **not execute that probe** because `existingEntry` is absent;
3. the requirement is marked unknown;
4. the provider resolver is invoked;
5. WinGet ambiguity forces `resolution-required` even though the executable is already usable.

That violates the deterministic automation boundary:

> Environment detection/preflight belongs to the Development Environment service. A model must not guess whether a compiler/runtime/tool exists when ChampCity can probe it.

---

# 2. Required deterministic order

For managed executable requirements using the generic probe path, use this order:

```text
construct generic probe
-> execute deterministic <capability> --version
-> evaluate version constraint
   |
   +-- satisfied
   |    -> requirement satisfied
   |    -> no WinGet/provider resolution
   |
   +-- missing / unknown / incompatible
        -> provider resolution may proceed
```

Provider resolution is fallback provisioning logic, not first-line existence detection.

---

# 3. Execute generic probes for unregistered capabilities

Change `resolveProviderBackedRequirement()` so the generic probe is executed even when no specialized registry entry exists.

Equivalent:

```ts
const probeEntry = existingEntry ?? genericProbeEntry(requirement);
const before = await this.probe(probeEntry, requirement, workspaceRoot);
```

Preserve specialized-adapter behavior when `existingEntry` exists.

Do not create a special `ffprobe` registry entry merely to make this case pass.

The fix must apply to any valid managed executable capability that can be probed generically.

---

# 4. Satisfied generic probe stops provider resolution

If the generic deterministic probe returns:

```text
state = satisfied
```

return a satisfied requirement immediately.

Required effects:

- no WinGet repair/install path;
- no provider search;
- no ambiguous-package blocker;
- no Environment Resolution model run;
- no package identity inference;
- command evidence records the actual generic probe.

For the reproduced case:

```text
ffprobe --version
-> exit 0
-> detected version satisfies requirement
-> preflight ready
```

must be sufficient.

---

# 5. Missing/incompatible generic probes may still use provider resolution

Do not weaken provisioning.

If the generic probe is:

- missing;
- unknown;
- incompatible with the requested version constraint;

then the existing provider-resolution/install path may continue.

Examples:

```text
ffprobe missing
-> WinGet/provider discovery allowed

ffprobe 6.x installed
requirement minimum >= 9.x
-> provider discovery allowed
```

Preserve existing exact/minimum version semantics.

---

# 6. Do not spend inference when deterministic probe can decide

Environment Resolution model execution remains a fallback only when deterministic provisioning genuinely cannot resolve the environment.

The model may:

- diagnose ambiguous package identity;
- explain failed provisioning;
- assist with genuinely semantic environment resolution.

The model must not be invoked merely to discover whether `ffprobe.exe`, `clang.exe`, `cmake.exe`, or another generically-probeable executable is already available.

No model output may override deterministic preflight authority.

---

# 7. Post-resolution rerun must become authoritative

Preserve the current sequence:

```text
Environment Resolution model completes
-> refresh parent process environment
-> rerun deterministic preflight
```

The rerun result is authoritative.

If all requirements are then satisfied:

```text
developmentEnvironmentPreflight.state = ready
canResolveEnvironment = false
canRunAgain = true
```

The Work Card Implement action must become enabled without requiring navigation away from the screen.

Do not add a separate Continue button solely to work around stale execution state.

---

# 8. Fix terminal feedback dispatch in App.tsx

Current `refreshBuildReviewAfterCodex()` uses a generic terminal message:

```ts
status.failureReason ??
(status.reportUpdated
  ? "Codex execution finished. Review the existing Implementer Report."
  : "Codex completed, but the Implementer Report was not updated.")
```

This is invalid for `executionKind === "environment-resolution"`.

Make terminal feedback execution-kind aware.

Prefer one shared pure message helper used by both:

- `refreshBuildReviewAfterCodex()`;
- `terminalPostRunMessage()`.

Do not maintain two drifting message policies.

---

# 9. Required Environment Resolution terminal messages

When `executionKind === "environment-resolution"`:

## Ready / not-required

Show a success/informational message equivalent to:

```text
Environment Resolution completed. Development environment is ready. Work Card implementation can now start.
```

Do not mention the Implementer Report.

## Still resolution-required / blocked / waiting

Show a blocker/warning message equivalent to:

```text
Environment Resolution completed, but development environment preparation is still incomplete: <summary>
```

Do not imply success.

## Environment Resolution execution failed

Show the actual execution failure as an error.

Do not fall through to Implementer Report messaging.

---

# 10. Color semantics must match state

Current base `.codex-execution-message` styling is green.

That is acceptable only for actual success/informational-ready states.

Add or use semantic variants so:

- environment ready → success/green;
- environment still unresolved / operator action required → warning/amber;
- execution failure → error/red.

Do not show a blocker in green.

Do not rely on prose alone to convey blocked versus ready state.

---

# 11. Last Run summary must not say "Waiting for Codex preflight" after a ready rerun

The current `LastRunSummary` falls back to:

```text
Waiting for Codex preflight.
```

whenever `canRunAgain` is false and no retry blocker is present.

After Environment Resolution has completed and deterministic preflight is ready, the summary must instead reflect actionable readiness.

Required ready state:

```text
Last Run: completed
Ready to run Work Card implementation
```

or equivalent.

If preflight remains unresolved, show the actual deterministic preflight summary/blocker.

Do not display an internally contradictory combination such as:

```text
completed
Waiting for Codex preflight
Development environment ready
```

---

# 12. Run button state must follow deterministic preflight

After the post-resolution preflight reaches `ready` or `not-required`:

- `Run Codex Implementer` is enabled if all other execution prerequisites are satisfied;
- `Resolve Environment` is no longer shown;
- no report-update gate applies to Environment Resolution.

If preflight remains `resolution-required`:

- `Run Codex Implementer` remains disabled;
- `Resolve Environment` remains available when the existing policy permits it;
- blocker status is visually amber/warning.

---

# 13. Preserve Implementer Report enforcement for actual implementation runs

Do not weaken the existing Work Card rule:

```text
executionKind === "work-card-implementation"
+ terminal completed
+ Implementer Report not updated
-> "Codex completed, but the Implementer Report was not updated."
```

That rule remains valid for actual Work Card implementation.

The fix is to prevent Environment Resolution from being evaluated through that presentation path.

---

# 14. Focused deterministic probe proof

Add tests for a previously-unregistered managed executable capability.

Fixture:

```text
capabilityId: ffprobe
provisioning: managed
version constraint satisfied by 9.0.2
```

Mock deterministic runner:

```text
ffprobe --version -> exit 0, "ffprobe version 9.0.2"
```

Prove:

1. generic probe executes;
2. requirement becomes satisfied;
3. provider resolver is never called;
4. WinGet is never called;
5. final preflight is ready.

The product code must remain generic; the test may use `ffprobe` because it reproduces the real defect.

---

# 15. Missing/incompatible fallback proof

Add focused tests proving:

### Missing

```text
generic probe -> spawn failure / missing
provider resolver -> invoked
```

### Incompatible

```text
generic probe -> executable found but version does not satisfy constraint
provider resolver -> invoked
```

This prevents the repair from bypassing legitimate provisioning.

---

# 16. Post-resolution ready-state proof

Add a focused Environment Resolution execution test:

1. initial preflight = `resolution-required`;
2. Environment Resolution run completes;
3. parent environment refresh completes;
4. deterministic rerun = `ready`;
5. returned status has:
   - `executionKind = environment-resolution`;
   - `state = completed`;
   - `developmentEnvironmentPreflight.state = ready`;
   - `canResolveEnvironment = false`;
   - `canRunAgain = true`;
   - no report-update failure.

Then prove the renderer enables `Run Codex Implementer`.

---

# 17. Still-unresolved proof

Add a focused test where Environment Resolution completes but deterministic rerun remains `resolution-required`.

Prove:

- `canRunAgain = false`;
- `canResolveEnvironment = true`;
- Run Implementer remains disabled;
- Resolve Environment remains available;
- terminal feedback is warning/amber;
- no Implementer Report message appears.

---

# 18. Renderer message proof

Add focused renderer tests proving:

1. Environment Resolution + ready → success message, no report language;
2. Environment Resolution + unresolved → warning message, no report language;
3. Environment Resolution failed → red/error message;
4. Work Card implementation completed without report → existing report-warning behavior remains;
5. blocker text never uses success/green styling.

---

# 19. Non-scope

Do not:

- add an `ffprobe` special-case adapter;
- redesign the package provider resolver;
- redesign WinGet discovery;
- add hidden/extra progression buttons;
- modify workflow phase state;
- alter Git/source-control behavior;
- change Agent Harness/MCP contracts;
- remove Implementer Report requirements from implementation runs;
- expand into general Development Environment UI redesign.

---

# Permanent acceptance proof

At minimum prove:

1. generic probe runs before provider resolution for unregistered managed executables;
2. satisfied generic probe bypasses provider resolution;
3. missing generic probe falls through to provider resolution;
4. incompatible generic probe falls through to provider resolution;
5. post-resolution deterministic rerun is authoritative;
6. ready rerun enables Work Card implementation;
7. unresolved rerun keeps implementation blocked and Resolve Environment available;
8. Environment Resolution never requires Implementer Report mutation;
9. Environment Resolution never emits the generic report-not-updated message;
10. warning/error/success colors match terminal semantics;
11. actual Work Card implementation report enforcement is unchanged;
12. `git diff --check` passes.

---

# Validation

Run focused validation only:

- production typecheck/build;
- Windows Development Environment provisioner owner;
- Development Environment preflight owner;
- Codex Implementer Environment Resolution owner;
- Work Card Building Review renderer owner;
- focused app-shell/controller owner for terminal feedback;
- existing Windows environment refresh owner;
- capability-map integrity if touched;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad/full regression suite.

---

# Implementer report

Write:

`docs/implementation-bundles/development-environment-resolution/Repair01/Reports/DER-R01_IMPLEMENTER_REPORT.md`

The report must explicitly state:

- old probe/provider order;
- new probe/provider order;
- generic satisfied-probe proof;
- missing/incompatible fallback proof;
- post-resolution ready-state proof;
- exact terminal feedback behavior;
- color/state mapping;
- confirmation that Work Card Implementer Report enforcement remains unchanged.

---

# Checkpoint and STOP

Commit:

`DER-R01 probe before provider resolution and repair environment terminal UX`

Then STOP for Architect review.
