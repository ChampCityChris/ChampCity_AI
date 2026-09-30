# DER-R02 — Register Real FFmpeg/ffprobe Probes and Remove Unsafe Universal --version Assumption

**Parent:** Development Environment Resolution / Repair01  
**Current baseline:** `0f88fcd3c48eaea9a74143caac0f6540b3ccccc6`  
**Reproduced project:** Signal_Forge  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** **ACTIVE — ENVIRONMENT PREFLIGHT BLOCKER**

## Objective

Correct the remaining Development Environment preflight defect exposed by Signal Forge.

DER-R01 correctly changed the order to probe before provider resolution, but the generic probe it moved earlier in the chain assumes every executable supports:

```text
<capability> --version
```

That assumption is false for the Signal Forge media requirements.

Signal Forge's approved Work Card explicitly requires:

```text
ffmpeg -version
ffprobe -version
```

ChampCity currently has no registered capability adapters for `ffmpeg` or `ffprobe`, so both fall into the unsafe generic `--version` probe.

The repair must:

1. register explicit, deterministic FFmpeg and ffprobe probe contracts;
2. verify them with `-version` before provider resolution;
3. re-run the same executable probe after any provisioning;
4. stop using universal `--version` as the fallback for unknown capabilities;
5. keep provider/package inventory as provisioning evidence, not as a substitute for executable verification when a probe contract exists.

Do not modify Signal Forge planning artifacts to work around ChampCity.

---

# Confirmed RCA

Signal Forge declares:

```text
node >=22.0.0
npm
ffmpeg
ffprobe
```

The approved Work Card explicitly requires:

```text
ffmpeg -version
ffprobe -version
```

Current ChampCity registry has no `ffmpeg` or `ffprobe` entries.

Current generic probe:

```ts
function genericProbeEntry(requirement) {
  return {
    kind: "simple",
    capabilityId: requirement.capabilityId,
    probe: {
      command: executableFromCapabilityId(requirement.capabilityId),
      args: ["--version"],
      versionPattern: /(\d+(?:\.\d+){0,3}[^\s]*)/,
    },
    supportedVersionConstraints: ["exact", "minimum"],
  };
}
```

Therefore current runtime behavior is:

```text
ffprobe requirement
-> no registry adapter
-> generic probe
-> ffprobe --version
-> nonzero/unknown
-> provider fallback
-> WinGet search returns multiple plausible packages
-> resolution-required
-> Work Card implementation remains blocked
```

The DER-R01 unit test encoded the same bad assumption:

```js
fakeRunner({
  "ffprobe --version": success("ffprobe version 9.0.2")
})
```

That test is synthetic and does not match the actual executable contract.

---

# 1. Add explicit FFmpeg and ffprobe capability registry entries

Add both capabilities to:

`src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts`

Required contracts:

```text
ffmpeg
  command: ffmpeg
  args: ["-version"]

ffprobe
  command: ffprobe
  args: ["-version"]
```

Use bounded version patterns appropriate to actual FFmpeg-family output, equivalent to:

```regex
/(?:ffmpeg|ffprobe)\s+version\s+([^\s]+)/i
```

or separate explicit patterns if cleaner.

The detected version must remain compatible with the existing exact/minimum comparison logic.

Do not introduce repository-configurable executable names or arguments.

---

# 2. Registered media capabilities probe before provider resolution

With the new registry entries, the preflight sequence for Signal Forge must be:

```text
require ffmpeg
-> registry adapter
-> ffmpeg -version
-> satisfied
-> no provider resolution

require ffprobe
-> registry adapter
-> ffprobe -version
-> satisfied
-> no provider resolution
```

If either command is missing or the requested version is incompatible, provider resolution may proceed.

---

# 3. Actual executable verification is authoritative after provisioning

When a registered executable capability is provisioned, successful package installation/inventory is not sufficient.

Required sequence:

```text
probe missing/incompatible
-> resolve exact package
-> install/provision
-> refresh process environment
-> run the registered executable probe again
-> only then mark SATISFIED
```

For FFmpeg-family capabilities:

```text
install/provision
-> ffmpeg -version / ffprobe -version
-> exit 0 + acceptable version
-> SATISFIED
```

If package inventory says installed but the executable probe still fails:

- requirement remains unresolved/failed;
- Work Card implementation stays blocked;
- diagnostic evidence must identify executable verification failure.

Do not report `VERIFIED` based only on WinGet inventory when a real probe adapter exists.

---

# 4. Remove the universal unknown-capability --version assumption

Do not keep:

```text
unknown capability
-> invent <capability> --version
```

as the general fallback.

Unknown executable capabilities do not share one CLI version syntax.

Refactor the fallback semantics.

## Unknown requirement with no version constraint

A bounded presence check may be used, for example:

```text
where.exe <executable>
```

or an equivalent deterministic PATH-resolution primitive.

This may establish that an executable is present for a presence-only requirement.

Do not invent version syntax.

## Unknown requirement with a version constraint

If no registered semantic probe exists:

- do not fabricate `--version`;
- do not claim the detected executable version;
- proceed to provider resolution / resolution-required using the existing provider contract;
- if exact version verification cannot be established after provisioning, remain unresolved rather than fabricating verification.

The preferred long-term path for recurring capabilities is an explicit registry adapter.

---

# 5. Keep the generic executable name mapping bounded

If the existing `executableFromCapabilityId()` remains for presence checks or provider lookup:

- keep its current bounded normalization;
- do not allow arbitrary shell text;
- do not allow repository-supplied command arguments;
- do not add `shell: true`.

No general command execution surface is authorized.

---

# 6. Fix the DER-R01 ffprobe proof

Replace the incorrect synthetic proof:

```text
ffprobe --version -> success
```

with the real contract:

```text
ffprobe -version -> success
```

Also add the sibling FFmpeg proof:

```text
ffmpeg -version -> success
```

For both prove:

- registered adapter selected;
- exact command/args executed;
- detected version parsed;
- requirement marked satisfied;
- provider resolver not called;
- WinGet not called.

---

# 7. Missing media executable fallback proof

Add focused tests:

### ffprobe missing

```text
ffprobe -version -> ENOENT
-> provider resolver invoked
```

### ffmpeg missing

```text
ffmpeg -version -> ENOENT
-> provider resolver invoked
```

Do not fall back to `--version`.

---

# 8. Incompatible media version proof

Add a version-constrained fixture such as:

```text
ffprobe requirement >=9
ffprobe -version -> "ffprobe version 6.0.0"
```

Prove:

- beforeState = incompatible;
- provider resolution is invoked;
- after successful provisioning, `ffprobe -version` is re-run;
- SATISFIED only after the real probe returns a compatible version.

---

# 9. Package inventory must not substitute for registered executable verification

Add a test that deliberately returns:

```text
WinGet inventory: package installed
ffprobe -version after refresh: fails
```

Expected:

- requirement is not satisfied;
- blocker identifies failed executable verification;
- preflight is not ready.

This guards against the current weaker unregistered path becoming the verification model for registered media tools.

---

# 10. Signal Forge requirement-set regression

Add a focused preflight test with the actual logical Signal Forge set:

```json
[
  { "capabilityId": "node", "versionConstraint": ">=22.0.0", "provisioning": "managed" },
  { "capabilityId": "npm", "provisioning": "managed" },
  { "capabilityId": "ffmpeg", "provisioning": "managed" },
  { "capabilityId": "ffprobe", "provisioning": "managed" }
]
```

Use deterministic fake command evidence representing an already-ready workstation.

Prove final preflight:

```text
state = ready
ffmpeg afterState = satisfied
ffprobe afterState = satisfied
provider resolution not used for either media capability
```

This is the product-level regression that DER-R01 was missing.

---

# 11. Preserve Environment Resolution authority

Do not change the accepted DER-R01 authority model:

```text
deterministic preflight
-> provider fallback only when needed
-> optional model-assisted resolution only for genuinely unresolved environment
-> parent environment refresh
-> deterministic preflight rerun is authoritative
```

If `ffmpeg` and `ffprobe` already satisfy their real probes, Environment Resolution should never be offered for those requirements.

---

# 12. Preserve terminal UX from DER-R01

Do not regress:

- ready state enables Work Card implementation;
- unresolved state remains amber/warning;
- failure remains red;
- Environment Resolution never requires an Implementer Report;
- actual Work Card implementation report enforcement remains unchanged.

This repair is probe semantics, not another renderer redesign.

---

# 13. Do not special-case Signal Forge in application flow

The application may register `ffmpeg` and `ffprobe` because they are reusable machine capabilities.

Do not add:

- Signal Forge project-name checks;
- Signal Forge path checks;
- Work Card ID checks;
- product-specific environment exceptions.

The same capability adapters must work for any Project that declares FFmpeg/ffprobe.

---

# 14. Live Windows qualification

After focused automated proof, perform a bounded live Windows qualification on a host where FFmpeg/ffprobe are already installed.

Run the same production command runner path and prove:

```text
ffmpeg -version -> exit 0
ffprobe -version -> exit 0
```

Do not use a hand-run shell command as the only proof; exercise the application-owned provisioner/command-runner path where practical.

Record only bounded version/probe evidence. Do not dump PATH or environment variables.

---

# 15. Non-scope

Do not:

- redesign WinGet package search;
- hard-code a specific FFmpeg package ID unless a separate provider-resolution repair requires it;
- change Signal Forge Work Card requirements;
- add arbitrary executable/argument configuration;
- change Git/source-control behavior;
- change Agent Harness/MCP contracts;
- redesign the Work Card Implement screen;
- add another model decision to choose probe syntax.

---

# Permanent acceptance proof

At minimum prove:

1. `ffmpeg` has a registered `ffmpeg -version` adapter;
2. `ffprobe` has a registered `ffprobe -version` adapter;
3. the old `ffprobe --version` synthetic proof is removed;
4. satisfied media probes bypass provider resolution;
5. missing media probes fall through to provider resolution;
6. incompatible versions fall through to provider resolution;
7. post-provision verification re-runs the real registered executable probe;
8. package inventory alone cannot mark a registered media capability satisfied;
9. unknown capabilities no longer universally invent `--version`;
10. unknown version-constrained capabilities fail closed into provider/resolution semantics without fabricated version evidence;
11. Signal Forge's full declared requirement set can reach `ready` when the real tools are present;
12. DER-R01 renderer/terminal behavior remains passing;
13. `git diff --check` passes.

---

# Validation

Run focused validation only:

- production typecheck/build;
- `test/development-environment/windows-development-environment-provisioner.test.cjs`;
- Development Environment preflight owner;
- Windows package-provider owner only where affected;
- Codex Implementer Environment Resolution owner as a regression check;
- Work Card renderer owner only to confirm DER-R01 behavior remains intact;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad/full regression suite.

---

# Implementer report

Write:

`docs/implementation-bundles/development-environment-resolution/Repair02/Reports/DER-R02_IMPLEMENTER_REPORT.md`

The report must explicitly state:

- previous invalid generic probe behavior;
- exact new ffmpeg/ffprobe registry entries;
- exact commands executed;
- version parsing behavior;
- unknown-capability fallback semantics;
- post-provision executable-verification behavior;
- Signal Forge requirement-set proof;
- live Windows qualification result;
- focused validation results.

---

# Checkpoint and STOP

Commit:

`DER-R02 register FFmpeg probes and remove universal version assumption`

Then STOP for Architect review.
