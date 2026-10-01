# Development Environment Resolution / Repair03 Architect RCA — 2026-09-30

**Current baseline:** `6ef37e55825d55560c3077288ab86a02f2142659`  
**Reproduced project:** Signal_Forge  
**Disposition:** **ARCHITECTURE DEFECT CONFIRMED — REPAIR03 REQUIRED**

## Executive finding

Signal Forge is still blocked after DER-R02 because ordinary development-environment setup is split across two incompatible mechanisms:

1. an application-owned deterministic preflight/provisioner; and
2. a Codex App Server "Environment Resolution" execution path.

The deterministic preflight is the correct authority. The Codex path is being invoked whenever preflight returns `resolution-required`, including ordinary machine/toolchain problems that ChampCity itself should repair.

The remaining live blocker is the Node/npm toolchain.

## Code-review findings

### 1. Initial Work Card environment setup is application-owned

`CodexImplementerExecutionService.start()` runs `DevelopmentEnvironmentPreflightService.runPreflight()` before it creates a Codex App Server session.

This is correct.

If preflight reaches `ready` or `not-required`, only then does the application create the Codex implementation session.

### 2. The "Resolve Environment" button crosses into Codex

When preflight returns `resolution-required`, the renderer shows **Resolve Environment**.

That action calls:

```text
App.startCodexEnvironmentResolution()
-> preload codexImplementer:startEnvironmentResolution
-> CodexImplementerExecutionService.startEnvironmentResolution()
-> startEnvironmentSelected()
-> appServerFactory()
-> executionKind = environment-resolution
-> executeWithAppServer()
```

The Issue Resolution path does the same through `startIssueCodexEnvironmentResolution()`.

This means ordinary environment repair is model-driven once deterministic preflight does not finish cleanly.

That is the wrong ownership boundary.

### 3. Codex availability is therefore incorrectly coupled to machine setup

Because "Environment Resolution" is a Codex execution kind, the Work Card UI exposes model selection, Codex availability, runtime state, and Codex execution telemetry during what should be deterministic workstation setup.

A missing/unavailable Codex runtime can therefore interfere with environment remediation even though the application already owns the relevant machine operations.

### 4. Windows environment refresh exists but runs too late

`refreshWindowsProcessEnvironment()` already reads current Windows Machine and User environment state and rebuilds the ChampCity process environment, including PATH.

However, the initial preflight does not refresh that environment before probing tools.

Environment refresh currently occurs:

- after a provisioning action; or
- after a Codex Environment Resolution run completes.

Therefore a perfectly installed toolchain can be reported missing if ChampCity launched before the PATH change or if the current process environment is stale.

### 5. npm is incorrectly probed as an ordinary executable

DER-R02 registered:

```text
npm -> npm --version
```

The Development Environment command runner executes fixed commands with Node `spawn(..., shell:false)`.

On Windows, npm is normally a command shim. ChampCity already has a dedicated safe resolver for the actual standalone Node/npm pair:

`src/main/core/windowsNpmInvocation.ts`

It resolves:

```text
node.exe
+
node_modules/npm/bin/npm-cli.js
```

and avoids invoking the .cmd shim.

The repository hydration service already uses this helper correctly.

The Development Environment provisioner does not.

### 6. npm is incorrectly treated as an independently provisionable package

When the npm probe is unsatisfied, the current package resolver queries the provider using the requirement capability ID.

For npm that becomes:

```text
winget search npm
```

The live Signal Forge screen shows the resulting ambiguous-package blocker.

npm is part of the Node/npm toolchain. It should not be independently resolved from WinGet.

### 7. Existing Windows npm tests prove the required building block already exists

The repository already has permanent proof that `resolveWindowsNpmInvocation()`:

- rejects Electron/ChampCity as the npm runtime;
- resolves a real standalone `node.exe`;
- validates the paired npm package and `npm-cli.js`;
- fails closed when no standalone Node/npm pair exists.

The Development Environment subsystem is simply not using this proven building block.

### 8. Current synthetic Signal Forge proof hides the Windows npm defect

DER-R02's Signal Forge requirement-set test uses a fake runner entry:

```text
npm --version -> success
```

That bypasses the real Windows npm invocation problem.

The live qualification also tested only ffmpeg/ffprobe, not the full Signal Forge requirement set through the production provisioner.

## Correct ownership model

The target architecture is:

```text
Formal Work Card environment contract
        ↓
ChampCity Development Environment service
        ↓
refresh Windows Machine/User environment
        ↓
deterministic capability/toolchain probes
        ↓
installed but stale/missing PATH?
        ├─ yes -> repair/refresh PATH -> verify
        └─ no
        ↓
toolchain genuinely absent?
        ├─ yes -> deterministic provision -> refresh -> verify
        └─ no
        ↓
READY
        ↓
Codex Implementer may start
```

Codex does not participate in ordinary environment detection, PATH repair, installation, or verification.

## Node/npm-specific target

```text
Node/npm requirement
-> refresh Windows environment
-> resolve standalone Node/npm pair
-> verify node with node.exe --version
-> verify npm with node.exe npm-cli.js --version

if pair exists but install root is absent from persistent PATH:
-> add only that trusted install root to User PATH
-> refresh process environment
-> verify again

if no valid pair exists:
-> provision/repair the Node toolchain
-> refresh
-> resolve pair again
-> verify node and npm
```

There must be no `winget search npm` path.

## Scope conclusion

This is not a Signal Forge defect.

It is a ChampCity Development Environment architecture defect caused by:

- late PATH refresh;
- a duplicate/incorrect npm execution path;
- npm being modeled independently from its Node toolchain;
- model-assisted environment resolution being used for ordinary deterministic machine repair.

Repair03 should correct the ownership boundary, not add another npm special case.
