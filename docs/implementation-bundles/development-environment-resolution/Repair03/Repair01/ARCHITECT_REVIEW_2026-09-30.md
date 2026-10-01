# DER-R03 / Repair01 Architect Review — 2026-09-30

**Implementation checkpoint:** `8390ff07449bca200ef9bca6311db0b57ff54189`  
**Parent repair:** DER-R03  
**Disposition:** **ACCEPTED — SIGNAL FORGE OPERATOR RETEST AUTHORIZED**

## Review result

Repair01 closes both blockers from the DER-R03 Architect review.

The environment path is now application-led from first check through repair/provisioning, and Node/npm persistence no longer depends on the current ChampCity process PATH alone.

## First-preflight authority accepted

For ordinary Work Cards and Issue Fix Cards, `CodexImplementerExecutionService.startWithSelection()` now performs deterministic environment preflight before acquiring Codex runtime capacity.

The effective order is:

```text
resolve exact Work Card / Fix Card context
-> obtain deterministic Development Environment preflight
-> if nonready: return/project environment state
-> if ready/not-required: recheck exact context identity
-> acquire Codex runtime/model lease
-> launch implementation App Server
```

A blocked or retryable environment does not call runtime acquisition or the App Server.

If Codex acquisition fails after environment readiness, the returned projection retains the ready environment state rather than losing it behind a Codex failure.

Exact Workflow WorkItem behavior remains outside this legacy Work Card preflight change as required by the repair scope.

## Fresh/null environment state accepted

A fresh Work Card no longer treats null preflight as implementation-ready.

`readyModel()` now requires `ready` or `not-required` before `canRunAgain` is true for ordinary Work Card owners.

The renderer also independently requires a ready/not-required preflight before enabling Run Codex Implementer.

With no preflight, the Development Environment section now renders:

```text
Development Environment
Not checked

[ Prepare Environment ]
```

That action lives in the Development Environment panel, not inside model/reasoning eligibility.

Codex runtime availability can therefore be unavailable while Prepare Environment remains usable.

## Defensive direct-run sequencing accepted

The direct service Run path is no longer dependent on renderer discipline.

For a fresh ordinary Work Card, `start()` obtains/caches the deterministic preflight before `runtimeManager.acquire()`.

Nonready cached evidence continues to block direct Run until the neutral repair path projects a new result.

Preflight cache identity includes the exact owner/work identity plus formal Work Card path, revision, and SHA, preventing an old environment result from silently authorizing a changed contract.

## Persistent PATH correction accepted

`WindowsEnvironmentRefreshResult` now preserves bounded persistent-path evidence separately:

- `machinePath`;
- `userPath`;
- merged process `env`.

A validated Node/npm pair is checked against persistent Machine/User PATH even if it already resolves from the current process PATH.

The accepted behavior is now:

```text
pair resolves from current process
+ root absent from Machine/User PATH
-> append validated root to User PATH
-> reread/refresh Windows environment
-> verify root is persistent
-> resolve pair again
-> run semantic Node/npm probes
```

No reinstall occurs for this state.

Persistent Machine/User ownership skips the write.

Bounded off-PATH discovery continues to use the same User PATH repair path.

## PATH normalization and safety accepted

Persistent matching is:

- case-insensitive;
- complete-entry based;
- quote-trimmed;
- slash-normalized;
- trailing-separator tolerant.

User PATH repair remains:

- User-scope only;
- non-elevated;
- preserving unrelated entries;
- idempotent;
- based only on the validated Node install root.

A successful write with failed persistent readback becomes a retryable verification failure and does not trigger reinstall.

## Node/npm ownership remains correct

Repair01 preserves the accepted DER-R03 model:

```text
node + npm = one node-npm toolchain
npm probe = validated node.exe + npm-cli.js --version
npm is never independently provisioned
winget search npm is not used
```

A genuinely absent pair still uses the one Node toolchain provisioning path and verifies the pair after refresh.

DER-R02 FFmpeg/ffprobe semantics remain unchanged.

## No model-driven environment setup

Current production source contains no:

- `environment-resolution` execution kind;
- `startEnvironmentResolution`;
- `startCodexEnvironmentResolution`;
- `startIssueCodexEnvironmentResolution`.

The neutral repair APIs remain:

- normal Work Card: `developmentEnvironment:repair`;
- Issue Fix Card: `issueResolution:repairIssueDevelopmentEnvironment`.

The repair service returns `DevelopmentEnvironmentPreflightResult`; its compatibility projection updates the existing execution screen without acquiring a model runtime or creating an App Server.

## Permanent proof reviewed

The implementation adds/updates proof for:

- fresh nonready environment before unavailable Codex: zero runtime acquire/App Server calls;
- ready/not-required call order: preflight before runtime acquisition;
- null preflight cannot enable implementation;
- Prepare Environment remains available independent of Codex;
- process-only Node PATH persists to User PATH exactly once;
- Machine/User persistent ownership avoids writes;
- bounded off-PATH Node discovery still repairs PATH without reinstall;
- PATH write/readback failure blocks without reinstall;
- absent Node/npm still provisions one owning toolchain;
- npm remains semantic paired execution;
- Work Card and Issue Fix Card retain the neutral environment repair path.

## Implementer report repair accepted

The parent DER-R03 Implementer Report is now valid UTF-8 and readable through repository text tooling.

The separate Repair01 Implementer Report is also valid UTF-8 and records the superseding sequencing/PATH corrections.

## Live Signal Forge qualification

The Implementer reran the real unchanged Signal Forge Work Card through the production Development Environment preflight path after the final build.

Recorded result:

```text
node >=22.0.0 -> 24.18.1 satisfied
npm           -> 11.16.0 satisfied
ffmpeg        -> 9.0.2 satisfied
ffprobe       -> 9.0.2 satisfied

final preflight = ready
initial Windows refresh = 1 before probes
persistent PATH writes = 0 on this host (already persistent)
provider / WinGet calls = 0
App Server calls = 0
```

This is the exact qualification needed for the Signal Forge Operator retry.

## Validation disposition

The Implementer report records:

- final production build: pass on normal Windows;
- focused environment/renderer/Issue owners: 111/111 pass after final build;
- selected Work Card sequencing boundary cases: 7/7 pass;
- full focused run earlier in the repair: 144/144 pass;
- repair validation-plan preview: pass;
- `git diff --check`: pass.

Architect review inspected the implementation paths, cache identity, first-preflight sequencing, renderer eligibility, persistent-path reconciliation, Node/npm ownership, and both UTF-8 reports.

## Shared checkout note

A later unrelated checkpoint, `650c314397910fdab8e44500c805b028a154149c` (RWS03), is now on Dev. Its changed-file set does not modify the DER-R03-R01 implementation owners reviewed here. Current source still contains the accepted DER behavior.

The existing unrelated dirty files remain outside this repair.

## Next step

Operator retest Signal Forge.

Expected first-load behavior is now one of:

```text
Development Environment / Not checked
-> Prepare Environment
-> deterministic setup
-> Development environment ready
```

or, if the current projection already has a freshly qualified preflight:

```text
Development environment ready
```

Once ready, Run Codex Implementer is governed only by actual Codex/model readiness.

The old model-driven Resolve Environment flow must not appear.
