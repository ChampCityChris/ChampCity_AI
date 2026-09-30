# Development Environment Resolution / Repair02 Architect Review — 2026-09-30

**Implementation checkpoint:** `aadbe64d681e839cc5cae2132fb320713b7253d5`  
**Parent:** `b636ca770998b376212fb0e8bca3363169497f27`  
**Disposition:** **ACCEPTED — SIGNAL FORGE RUNTIME RETEST AUTHORIZED**

## Review result

DER-R02 corrects the deterministic probe defect exposed by Signal Forge.

The prior unsafe fallback:

```text
unknown executable capability
-> invent <capability> --version
```

is removed.

FFmpeg-family capabilities now have explicit reusable semantic probes:

```text
ffmpeg  -> ffmpeg -version
ffprobe -> ffprobe -version
```

The implementation also closes the weaker post-provision verification path: registered executable capabilities must pass their real executable probe after provisioning before ChampCity can mark them satisfied.

## Registered capability contracts accepted

The canonical Development Environment capability registry now contains explicit entries for:

- `ffmpeg`;
- `ffprobe`;
- `node`;
- `npm`.

The FFmpeg-family version patterns parse the actual command output form:

```text
ffmpeg version <version>
ffprobe version <version>
```

and retain the existing exact/minimum version-comparison behavior.

For the reproduced Signal Forge requirement set, a ready workstation now follows:

```text
node --version
npm --version
ffmpeg -version
ffprobe -version
-> all satisfied
-> no provider resolution for already-present media tools
-> preflight ready
```

## Unsafe generic --version assumption removed

Unregistered capabilities no longer inherit a fabricated version command.

Presence-only unknown capabilities use bounded executable lookup:

```text
where.exe <normalized executable>
```

A version-constrained unknown capability without a semantic adapter cannot fabricate version authority. It may use provider resolution for provisioning, but remains unresolved if executable version semantics cannot be verified.

This is the correct fail-closed behavior.

## Post-provision executable verification accepted

For registered capabilities:

```text
probe missing/incompatible
-> resolve provider package
-> provision
-> refresh Windows process environment
-> rerun the same registered executable probe
-> satisfy only if the executable itself verifies
```

WinGet package inventory is no longer used as a substitute for executable verification in this path.

A package may therefore be installed while the requirement remains blocked if the expected executable still cannot be invoked. That is correct.

## Signal Forge proof accepted

The permanent provisioner owner now covers the exact logical Signal Forge requirement set:

```text
node >=22.0.0
npm
ffmpeg
ffprobe
```

and proves the set reaches `ready` using the registered command contracts.

The prior incorrect synthetic fixture:

```text
ffprobe --version
```

has been removed.

The implementation also adds missing/incompatible media fallback and successful/failed post-provision re-probe cases.

## Live Windows qualification

The Implementer report records live qualification through the built production command-runner/capability-registry path on Windows:

```text
ffmpeg -version
-> exit 0
-> 9.0.2-full_build-www.gyan.dev

ffprobe -version
-> exit 0
-> 9.0.2-full_build-www.gyan.dev
```

This directly verifies the real host condition that previously sent Signal Forge into ambiguous provider resolution.

## Validation disposition

The Implementer report records:

- production Windows build: pass;
- four focused DER/Work Card owners: 86 passed, 0 failed/skipped;
- final provisioner + preflight rerun: 45 passed;
- final provisioner owner: 43 passed;
- repair validation-plan preview: pass;
- `git diff --check`: pass.

Architect review additionally inspected the registry entries, provider fallback, presence-only unknown semantics, post-provision re-probe path, and Signal Forge requirement-set proof.

## Scope preservation

DER-R02 does not:

- modify Signal Forge planning artifacts;
- add Signal Forge-specific project logic;
- change Work Card workflow semantics;
- change Git/source-control behavior;
- change Agent Harness/MCP contracts;
- add model authority to environment verification.

The application-owned deterministic Development Environment service remains authoritative.

## Working-tree note

The Dev checkout contains unrelated pre-existing modifications and one unrelated untracked WIR repair card. None are part of DER-R02 or this acceptance and they were not staged or modified during this review.

## Next step

Retest the original Signal Forge Work Card Implement screen.

Expected result on the current host:

```text
node -> satisfied
npm -> satisfied
ffmpeg -version -> satisfied
ffprobe -version -> satisfied
development environment preflight -> ready
Resolve Environment -> absent
Run Codex Implementer -> enabled
```

If Signal Forge still reports environment resolution required, preserve the exact capability card/evidence and runtime state for another RCA rather than running model-assisted resolution repeatedly.
