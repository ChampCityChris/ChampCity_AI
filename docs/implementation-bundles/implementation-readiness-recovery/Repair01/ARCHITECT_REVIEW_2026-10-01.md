# IRR-R01 Architect Review — 2026-10-01

**Implementation checkpoint:** `ae1ffca2a5c635e7b2890a41ed09489ddc0f49a2`  
**Parent:** `fd52612c3aae17fd0f8ed3d18674ff77e3df509b`  
**Disposition:** **ACCEPTED — SIGNAL FORGE OPERATOR RETEST AUTHORIZED**

## Review result

IRR-R01 corrects both regressions identified in the controlling repair.

The implementation now restores the intended startup sequence:

```text
Implement foreground
-> automatic deterministic Development Environment check
-> environment ready/not-required
-> independently verified managed Codex runtime/model catalog
-> separately evaluated managed connection policy
-> model/reasoning selectable
-> Run Codex Implementer
```

The routine `Prepare Environment` gate is removed, and outbound MCP connection-policy failures no longer erase core Codex runtime/model health.

## Automatic environment readiness accepted

`CodexImplementerExecutionService.getStatus()` now starts `obtainEnvironmentPreflight()` on an exact-key cache miss.

The first call synchronously projects a `checking` preflight before the async provisioner continues, so later renderer polling observes one in-flight check rather than spawning duplicates.

The preflight key retains exact owner/work identity plus formal Work Card path, revision, and SHA. A changed formal contract therefore receives a new check while ordinary renderer/status polling reuses the current one.

`DevelopmentEnvironmentPreflightService` additionally coalesces identical in-flight checks and serializes environment operations within one workspace.

The renderer now shows:

```text
Development Environment
Checking…
```

for a fresh process instead of requiring an Operator `Prepare Environment` click.

Only an actual retryable non-ready result exposes `Retry Environment Setup`.

No Project State/SQL machine-readiness persistence was added; restart behavior is deterministic revalidation rather than stale persisted readiness.

## Deterministic environment ownership preserved

The default Development Environment provisioner now disables WinGet MCP discovery for this application-owned path and retains direct deterministic provider behavior.

Environment preflight does not acquire:

- Codex runtime/model capacity;
- App Server execution;
- Agent Harness;
- MCP inference;
- LLM authority.

The Signal Forge requirement set remains application-owned.

## Core Codex runtime/model health separation accepted

The managed runtime core probe now owns only:

- executable/version verification;
- App Server schema compatibility;
- connection-neutral App Server initialization;
- model catalog enumeration.

It no longer performs ambient MCP inventory or connection-policy reads as part of core health.

The production neutral probe uses a temporary isolated `CODEX_HOME`, carries only the existing file-based model authentication needed on the qualified Windows host, and disables apps/plugins for the probe/runtime isolation boundary.

Connection inventory, approved-connection policy, required/optional readiness, and pre-turn enforcement remain a separate health domain.

A connection-policy/inventory problem can therefore block safe implementation without changing:

```text
runtime version
model catalog
model selection availability
```

into generic runtime-unavailable state.

## Reproduced root cause addressed

The Implementer reproduced the pre-repair failure against the actual managed current runtime:

```text
runtime: 0.159.3
executable/version: passed
schema: passed
MCP inventory: passed
App Server with ambient disable overrides: exited
diagnostic class: invalid MCP transport
```

The repaired connection-neutral 0.159.3 probe enumerated eight models including `gpt-6.1-sol`.

This confirms the original disabled model picker was caused by the CRC connection-isolation path poisoning runtime initialization, not by an unavailable model.

## Dynamic runtime qualification accepted

Qualification was not limited to the bundled fallback.

The report records:

| Runtime | Core probe | Models | Connection preflight | Thread isolation |
| --- | --- | ---: | --- | --- |
| bundled 0.146.0 | pass | 4 | pass | pass |
| actual managed 0.159.3 | pass | 8 | pass | pass |

The actual managed-runtime qualification includes synthetic ambient invalid-token MCP entries and project-local MCP configuration and verifies that those workers do not initialize in the managed implementation boundary.

This satisfies the key CRC/IRR compatibility requirement.

## Last-known-good/update behavior accepted

A verified current runtime remains authoritative when a newer candidate fails its connection-isolation qualification.

Candidate connection-policy failure:

```text
-> no promotion
-> current pointer retained
-> current catalog retained
-> updateState = degraded
```

Core candidate/runtime failure likewise does not overwrite a verified current runtime.

`verified.json` stores bounded model/runtime verification metadata only; startup still performs a fresh core probe and does not use cached metadata to bypass real runtime failure.

## Restartless runtime retry accepted

The desktop now supplies a fresh `CodexRuntimeInitializerClient` factory to `CodexRuntimeManager`.

When runtime state is `unavailable`, `Retry Codex Runtime`:

1. refuses while execution/selection work is active;
2. retires the previous initializer;
3. invalidates the old generation;
4. creates a new initializer client;
5. reruns initialization;
6. adopts only the current generation result.

The failed initializer's memoized Promise is not reused.

When the saved model remains advertised, retry restores the catalog/selection and re-enables Model and Reasoning without a desktop restart.

## Connection status projection accepted

Connection readiness is omitted until core runtime health exists and connection checking has actually occurred.

The prior contradictory state:

```text
Runtime unavailable
Required Codex connections ready
```

can no longer be projected.

Connection failures now remain explicit connection blockers instead of masquerading as model/runtime failures.

## CRC-R01 isolation preserved

The follow-up does not reopen ambient MCP access.

For ordinary implementation with no required approved external connections:

- a neutral isolated runtime is used;
- ambient user MCP configuration is not copied;
- project-local MCP definitions are read before `thread/start` and explicitly disabled;
- apps/plugins are disabled in the managed isolation boundary.

Required governed connections retain pre-turn readiness checks and fail closed when unavailable/authentication-required.

## Signal Forge combined proof accepted

The permanent combined fixture covers the target state:

```text
fresh environment cache
node/npm/ffmpeg/ffprobe declared
saved gpt-6.1-sol
-> automatic environment check
-> ready
-> one environment check
-> zero foreground App Server starts
-> model advertised
-> Model enabled
-> Reasoning enabled
-> Run Codex Implementer enabled
```

This directly owns the two Operator-visible regressions that triggered IRR-R01.

## Validation disposition

The Implementer report records:

- production Windows build: pass;
- card-scoped focused validation: 168 passed, 0 failed/skipped;
- final affected rerun after UTF-8 status correction: 51 passed, 0 failed/skipped;
- actual bundled and managed-current runtime qualification repeated successfully;
- repair validation-plan preview: pass;
- `git diff --check`: pass.

Architect review inspected the production automatic-preflight path, exact preflight identity, neutral runtime probe, connection-policy separation, candidate preservation, retry generation logic, model-picker recovery, and dynamic-runtime qualification evidence.

## Working-tree note

The Dev checkout contains unrelated pre-existing/uncommitted renderer, Agent Harness, Tester, source-control, and documentation work. Those files are outside IRR-R01 and are not part of this acceptance.

## Next step

Operator retest Signal Forge from a fresh desktop launch.

Expected behavior:

```text
Open phase-1-c01 Implement
-> Development Environment briefly shows Checking…
-> automatically becomes Ready
-> no Prepare Environment click

Codex runtime
-> current/updated/degraded usable state
-> gpt-6.1-sol advertised
-> Model/Reasoning selectable
-> no ambient Cloudflare/GitHub invalid-token worker failure
-> Run Codex Implementer enabled
```

If the runtime genuinely fails its core probe, the UI should now identify the bounded failing stage and expose `Retry Codex Runtime` without requiring a desktop restart.
