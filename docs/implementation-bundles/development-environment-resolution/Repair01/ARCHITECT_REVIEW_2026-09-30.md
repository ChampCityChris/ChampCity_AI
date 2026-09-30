# Development Environment Resolution / Repair01 Architect Review — 2026-09-30

**Implementation checkpoint:** `7fb736276fcc1f50ed66640c73ea3cb669e860b5`  
**Parent:** `83a0cc617ea22b99f681f9f98b4aafcf53b1e7e8`  
**Disposition:** **ACCEPTED — RUNTIME REPRO RETEST AUTHORIZED**

## Review result

The implementation corrects the reproduced Greenfield environment-resolution blocker.

The repaired deterministic order is now:

```text
generic executable probe
-> if satisfied: requirement satisfied
-> otherwise: provider / WinGet resolution fallback
```

For an unregistered managed executable such as `ffprobe`, ChampCity now actually executes the generic `ffprobe --version` probe that it previously constructed and skipped.

A satisfied probe returns immediately without invoking WinGet/provider discovery.

## Deterministic preflight correction accepted

`resolveProviderBackedRequirement()` now executes:

```ts
const genericEntry = existingEntry ?? genericProbeEntry(requirement);
const before = await this.probe(genericEntry, requirement, workspaceRoot);
```

and returns a satisfied requirement before provider resolution when the detected version meets the requested constraint.

The focused `ffprobe 9.0.2` proof confirms:

- `ffprobe --version` executes;
- version `9.0.2` satisfies `>=9`;
- final preflight is ready;
- WinGet/provider search is not invoked.

Missing and incompatible executable proofs retain the existing provider fallback.

No `ffprobe` special-case adapter was added.

## Environment Resolution state correction accepted

The existing Environment Resolution sequence remains:

```text
model-assisted resolution
-> parent process environment refresh
-> deterministic preflight rerun
```

The deterministic rerun remains authoritative.

When that rerun is `ready`:

- Environment Resolution remains a completed Environment Resolution run;
- `canResolveEnvironment = false`;
- `canRunAgain = true`;
- the Work Card implementation action becomes eligible;
- no Implementer Report update is required from the Environment Resolution run.

When the rerun remains `resolution-required`:

- implementation stays blocked;
- Resolve Environment remains available;
- the run does not fabricate readiness.

## Terminal UX correction accepted

The new shared `codexTerminalFeedback()` removes the prior duplicated/drifting terminal-message policy.

Environment Resolution now renders:

- ready/not-required: success/green;
- still unresolved: warning/amber;
- failed: error/red.

Environment Resolution no longer falls through to:

```text
Codex completed, but the Implementer Report was not updated.
```

The Report Update row is also hidden for Environment Resolution.

Actual Work Card implementation retains its existing Implementer Report enforcement.

## Last Run / action state accepted for the reproduced path

For the reproduced ready-after-resolution path, Last Run now reports:

```text
completed
Ready to run Work Card implementation
```

and the Run Codex Implementer control is enabled when the execution model reports `canRunAgain = true`.

The unresolved path keeps Run disabled and Resolve Environment enabled.

## Focused validation evidence

The Implementer report records:

- production Windows build: pass;
- final provisioner + renderer owner rerun: 40/40 pass;
- broader six-owner run before assertion corrections: 93/95, with the two failures identified as changed-owner expectation drift and corrected;
- validation-plan preview: pass;
- `git diff --check`: pass.

Architect review inspected the production provisioner, execution-state projection, shared terminal-feedback helper, renderer action gating, and the added focused proofs.

## Non-blocking hardening observation

There is one narrow presentation edge worth preserving for a later UI-hardening pass:

if deterministic environment preflight is ready but some *different* execution prerequisite makes `canRunAgain = false`, the current Environment Resolution success copy is derived primarily from preflight readiness and may briefly overstate "implementation can now start" until the next status refresh exposes the separate retry blocker.

That condition is not the reproduced defect, does not alter deterministic execution authority, and is not a blocker to retesting this repair. A future cleanup should make ready copy conditional on both environment readiness and current execution eligibility.

## Working-tree note

The Dev checkout still contains unrelated pre-existing modifications outside this repair. They were not part of checkpoint `7fb7362...` and were not modified during this Architect review.

## Next step

Retest the original Signal_Forge Greenfield Work Card environment flow.

Expected result:

```text
ffprobe already installed
-> deterministic ffprobe --version succeeds
-> preflight ready
-> Resolve Environment disappears
-> Run Codex Implementer becomes enabled
-> no Implementer Report warning is shown for Environment Resolution
```
