# DER-R03 — Make Environment Setup Application-Led and Repair the Windows Node/npm Toolchain

**Parent:** Development Environment Resolution / Repair02  
**Current baseline:** `6ef37e55825d55560c3077288ab86a02f2142659`  
**Reproduced project:** Signal_Forge  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** **ACTIVE — ENVIRONMENT SETUP ARCHITECTURE REPAIR**

## Objective

Restore the intended ChampCity A/I ownership boundary:

> ChampCity deterministically prepares and verifies the development environment. Codex implements software only after that environment is ready.

The current Work Card flow incorrectly escalates ordinary environment repair into a Codex App Server `environment-resolution` run.

Repair03 must make ordinary environment setup fully application-led and fix the Windows Node/npm path/toolchain handling that still blocks Signal Forge.

For the live Signal Forge case the required outcome is:

```text
node >=22
npm
ffmpeg
ffprobe
-> application refreshes Windows environment
-> application verifies installed Node/npm pair
-> application verifies ffmpeg/ffprobe
-> final preflight = ready
-> no Codex environment-resolution run
-> Run Codex Implementer enabled
```

---

# 1. Governing authority boundary

Development Environment owns:

- Windows Machine/User environment refresh;
- PATH detection and bounded PATH repair;
- capability probing;
- toolchain discovery;
- deterministic provisioning;
- post-provision verification;
- dependency/bootstrap hydration when explicitly part of that subsystem.

Codex/App Server owns none of those operations.

Codex begins only after Development Environment reports `ready` or `not-required`.

No LLM may decide whether Node/npm/ffmpeg/ffprobe is installed, repair PATH, select a normal known toolchain package, or verify machine readiness.

---

# 2. Retire model-driven Environment Resolution from normal Work Card flow

Current production path:

```text
preflight = resolution-required
-> renderer Resolve Environment
-> startCodexEnvironmentResolution()
-> CodexImplementerExecutionService.startEnvironmentResolution()
-> appServerFactory()
-> executionKind = environment-resolution
```

Replace it with a deterministic application action.

Preferred public/UI naming:

```text
Repair Environment
```

or:

```text
Retry Environment Setup
```

The action must invoke the Development Environment service directly.

It must not:

- create a Codex App Server;
- select a model/reasoning effort;
- open a Codex thread;
- depend on Codex availability;
- emit Codex approvals/user-input/MCP elicitation state.

Update both:

- normal Work Card implementation flow;
- Issue Resolution Fix Card flow.

---

# 3. Remove the production Codex environment-resolution path

After deterministic callers are migrated, retire production use of:

- `CodexImplementerExecutionService.startEnvironmentResolution()`;
- `startEnvironmentSelected()`;
- IPC `codexImplementer:startEnvironmentResolution`;
- IPC `issueResolution:startIssueCodexEnvironmentResolution`;
- preload API names that imply Codex owns environment setup;
- renderer helpers named `startCodexEnvironmentResolution` / `startIssueCodexEnvironmentResolution`.

If `CodexImplementerExecutionKind = "environment-resolution"` and its terminal-feedback branches have no remaining legitimate caller, remove them in this repair.

Do not keep a hidden model fallback behind the new application button.

If a future unknown proprietary environment requires semantic assistance, that requires a separate explicitly designed feature. It is not part of ordinary managed environment setup.

---

# 4. Add a neutral application-owned environment repair entrypoint

Provide one application service/API for retrying environment preparation for the selected Work Card/Fix Card.

Equivalent responsibility:

```text
repairDevelopmentEnvironment(current work identity)
-> resolve exact formal Work Card
-> refresh Windows environment
-> run deterministic DevelopmentEnvironmentPreflightService
-> perform deterministic repair/provision actions
-> return current preflight result
-> refresh Work Card execution projection
```

The service belongs under Development Environment/application infrastructure, not Agent Harness and not Codex/App Server.

It may reuse a neutral extracted Work Card context resolver if necessary.

Do not duplicate Work Card identity rules.

---

# 5. Refresh Windows environment before the first probe

At the beginning of each Windows managed preflight:

```text
refreshWindowsProcessEnvironment()
-> then probe capabilities
```

Use the existing:

`src/main/developmentEnvironment/windowsEnvironmentRefresh.ts`

This refresh already reads Windows Machine and User environment state and merges PATH into the running ChampCity process.

Do not wait until after provisioning or after a model run.

This is required so a tool installed after ChampCity launch is recognized without reinstalling it.

---

# 6. Separate stale process PATH from genuinely missing persistent PATH

For Node/npm use this order:

## Case A — persistent PATH is correct, ChampCity process is stale

```text
initial process cannot see tool
-> refresh Machine/User environment
-> refreshed PATH contains Node install root
-> verify Node/npm
-> READY
```

No persistent PATH write.

No WinGet.

## Case B — Node/npm is installed but install root is absent from persistent PATH

```text
refresh still cannot resolve toolchain
-> bounded trusted Node/npm installation discovery
-> valid pair found outside PATH
-> add exact install root to User PATH
-> refresh ChampCity process environment
-> verify Node/npm
-> READY
```

No reinstall.

## Case C — no valid Node/npm pair exists

Only then:

```text
deterministically provision/repair Node toolchain
-> refresh environment
-> resolve Node/npm pair
-> verify both
```

---

# 7. Reuse the existing Windows npm resolver

Use:

`src/main/core/windowsNpmInvocation.ts`

as the canonical Node/npm pairing proof.

Do not invoke:

```text
spawn("npm", ["--version"], { shell:false })
```

on Windows.

The semantic npm probe must execute the resolved pair equivalent to:

```text
<node.exe> <npm-cli.js> --version
```

The user-visible command evidence may remain:

```text
npm --version
```

Do not expose absolute machine paths merely because the internal runner uses them.

---

# 8. Extend the npm resolver for bounded installed-toolchain discovery

Today `resolveWindowsNpmInvocation()` searches:

- the host executable directory;
- current PATH roots.

Extend/reuse it through one neutral helper so Development Environment can also inspect a bounded trusted candidate set when PATH is missing.

Allowed candidate roots should be derived only from trusted machine state, for example:

- refreshed PATH roots;
- `%ProgramFiles%\nodejs`;
- `%LOCALAPPDATA%\Programs\nodejs` when present;
- explicit Node/version-manager symlink roots already declared in Machine/User environment state.

Do not recursively scan disks.

Do not accept repository-supplied executable paths.

A candidate is valid only if the existing pair validation succeeds:

- real standalone `node.exe`;
- real npm package;
- expected `npm-cli.js`;
- no escape/symlink substitution outside the validated package root.

---

# 9. Add bounded User PATH repair

If a valid standalone Node/npm pair is discovered outside persistent PATH:

- repair **User PATH**, not Machine PATH;
- no elevation;
- preserve all existing User PATH entries;
- append only the exact validated Node install root;
- de-duplicate case-insensitively;
- do not add duplicates;
- do not delete unrelated entries.

Use a fixed application-owned Windows environment API/PowerShell script.

Pass path data as arguments/data, not interpolated executable script text.

After the write:

```text
refreshWindowsProcessEnvironment()
-> verify PATH contains the root
-> verify node
-> verify npm
```

If PATH repair fails, return a precise deterministic blocker.

Do not reinstall as the first response to a PATH-write failure.

---

# 10. Model Node and npm as one provisionable toolchain

npm must not resolve a package independently.

Prohibit:

```text
winget search npm
```

from the Development Environment path.

Registry/provisioning metadata should express equivalent semantics:

```text
node
  toolchain = node-npm
  probe = node --version

npm
  toolchain = node-npm
  probe = validated Node/npm pair
  provisioning owner = node toolchain
```

Exact type names are implementer choice.

If npm is missing after refresh/PATH repair:

- provision/repair the Node toolchain;
- do not search for a standalone npm package.

Do not depend on requirement ordering. An npm-only managed requirement must still repair/provision its owning Node/npm toolchain deterministically.

---

# 11. Use deterministic Node provisioning

Reuse the existing application-owned Node package resolution/provisioning behavior.

A Node/npm toolchain repair may resolve/provision the Node LTS package through the existing trusted WinGet path.

Do not create a second installer stack.

After provisioning:

1. refresh Windows environment;
2. resolve the paired standalone Node/npm installation;
3. verify Node version constraint;
4. verify npm execution;
5. only then mark the corresponding requirements satisfied.

---

# 12. ffmpeg/ffprobe remain as accepted in DER-R02

Do not regress:

```text
ffmpeg  -> ffmpeg -version
ffprobe -> ffprobe -version
```

Already-installed FFmpeg-family capabilities must bypass provider resolution.

Post-provision executable verification remains mandatory.

---

# 13. Work Card UI must separate Environment controls from Codex controls

The Development Environment panel owns the environment repair action.

When preflight is not ready and deterministic retry/repair is available, show an explicit application action such as:

```text
[ Retry Environment Setup ]
```

or:

```text
[ Repair Environment ]
```

Do not place this action inside model/reasoning controls as though it were a Codex run.

Codex availability must be irrelevant to whether this button is enabled.

The model and reasoning selectors apply only to actual implementation/test/repair inference runs.

---

# 14. Current preflight state, not historical Environment Resolution, controls the screen

Past `environment-resolution` run history may exist in old Project/runtime state.

Do not let historical run type or old warning text control current readiness.

The foreground must derive from the current deterministic preflight:

```text
ready/not-required
-> environment ready
-> no repair button
-> Run Codex Implementer eligible

retryable deterministic environment issue
-> repair/retry button
-> implementation disabled

operator/restart blocker
-> exact human-action message

unsupported hard blocker
-> blocked message
```

---

# 15. Reuse one deterministic flow for Work Cards and Issue Fix Cards

Do not maintain two environment architectures.

Normal Work Card and Issue Resolution Fix Card should both call the same application-owned repair service with their exact Work identity.

Only context resolution differs.

The Development Environment machinery must be shared.

---

# 16. Full Signal Forge production-path qualification

The previous DER-R02 live qualification checked only ffmpeg/ffprobe.

Repair03 must qualify the **complete actual Signal Forge contract** through the production Development Environment path on normal Windows:

```text
node >=22.0.0
npm
ffmpeg
ffprobe
```

Required evidence:

- Windows environment refresh executed first;
- Node verified;
- npm verified through the standalone Node/npm resolver;
- ffmpeg verified with `-version`;
- ffprobe verified with `-version`;
- final preflight = `ready`;
- provider resolution count for already-installed tools = 0;
- Codex App Server factory/invocation count = 0.

Do not substitute a fake-runner-only proof for this acceptance owner.

---

# 17. Stale-process-PATH proof

Create a Windows-focused proof where:

- current process PATH omits the valid Node root;
- Machine/User environment PATH contains it;
- valid Node/npm pair exists.

Expected:

```text
preflight refreshes Windows environment
-> pair resolves
-> Node/npm satisfied
-> no PATH write
-> no WinGet
-> no Codex
```

This is the first recovery path.

---

# 18. Persistent-PATH-repair proof

Create a Windows-focused proof where:

- current process PATH omits Node root;
- Machine/User PATH also omits it;
- a valid Node/npm pair exists in one bounded trusted install root.

Expected:

```text
bounded discovery finds valid pair
-> User PATH repaired
-> process environment refreshed
-> Node/npm verify
-> no reinstall
-> final preflight ready
```

Prove unrelated PATH entries are preserved and no duplicate is introduced.

---

# 19. Truly-absent toolchain proof

Create a proof where no valid Node/npm pair exists.

Expected:

```text
refresh
-> discovery
-> no pair
-> Node toolchain provisioning
-> refresh
-> valid pair resolves
-> node verifies
-> npm verifies
-> ready
```

Assert:

- no `winget search npm`;
- no standalone npm package install;
- one Node toolchain provisioning path;
- no Codex invocation.

---

# 20. npm semantic-probe proof

Replace the current synthetic assumption:

```text
npm --version -> fake success
```

with proof of the semantic adapter.

On Windows assert the internal launch is equivalent to:

```text
<resolved node.exe> <resolved npm-cli.js> --version
```

and public evidence is bounded as:

```text
npm --version
```

The probe must reject an Electron/ChampCity executable as Node, preserving the existing resolver safety invariant.

---

# 21. No-model environment repair proof

Inject an App Server factory that throws if called.

Exercise:

- stale PATH repair;
- persistent PATH repair;
- missing Node toolchain provisioning;
- retry environment action.

All must succeed/fail deterministically without touching the App Server factory.

Search-based permanent proof should also show no production renderer/IPC environment-repair action routes to `startEnvironmentResolution()`.

---

# 22. Retire misleading renderer state

Remove or update UI concepts that imply environment setup is a Codex run:

- "Run Type: Environment Resolution";
- "Codex Availability" as environment-repair status;
- model/reasoning controls governing environment repair;
- Codex terminal feedback for environment-repair completion.

Development Environment status should present its own deterministic evidence.

Keep Codex execution history for actual implementation/integration repair only.

---

# 23. Contract changes

Prefer a neutral application result for environment repair, based on `DevelopmentEnvironmentPreflightResult`.

Do not force deterministic machine repair into `CodexImplementerExecutionModel` solely because that model currently happens to carry preflight state.

If a small compatibility projection is temporarily required for the Work Card screen, keep authority in the neutral Development Environment result and document the adapter.

---

# 24. Non-scope

Do not:

- change Signal Forge Work Card requirements;
- install npm as an independent package;
- use an LLM to discover PATH;
- use Agent Harness/MCP for environment setup;
- modify Git/source-control behavior;
- recursively search the entire filesystem for Node;
- rewrite arbitrary Machine PATH;
- require elevation for User PATH repair;
- redesign repository dependency hydration.

---

# Permanent acceptance proof

At minimum prove:

1. initial Windows preflight refreshes Machine/User environment before probing;
2. stale process PATH is corrected without reinstall;
3. valid Node/npm pair is resolved with the existing safe resolver;
4. npm is executed through Node + npm-cli.js, not raw `spawn("npm")`;
5. installed Node/npm outside persistent PATH triggers User PATH repair before install;
6. User PATH repair preserves existing entries and is idempotent;
7. genuinely absent Node/npm triggers Node toolchain provisioning;
8. `winget search npm` cannot occur;
9. npm never provisions independently of Node;
10. full Signal Forge requirement set reaches `ready` on the real Windows host;
11. no Codex App Server is invoked during environment setup or retry;
12. Work Card and Issue Fix Card use the same deterministic repair service;
13. Codex availability does not gate environment repair;
14. DER-R02 ffmpeg/ffprobe semantics remain passing;
15. implementation starts only after current deterministic preflight is ready;
16. `git diff --check` passes.

---

# Validation

Run focused validation only:

- production typecheck/build;
- Windows environment refresh owner;
- Windows npm invocation owner;
- Windows Development Environment provisioner owner;
- Development Environment preflight owner;
- Work Card application/renderer owner;
- Issue Fix Card application/renderer owner;
- Codex Implementer owner only as a negative-boundary proof that environment repair no longer creates Codex sessions;
- capability-map integrity if touched;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad/full regression suite.

---

# Implementer report

Write:

`docs/implementation-bundles/development-environment-resolution/Repair03/Reports/DER-R03_IMPLEMENTER_REPORT.md`

The report must explicitly state:

- old model-driven environment path removed/retired;
- new application-owned repair entrypoint;
- first-probe environment refresh behavior;
- Node/npm semantic adapter design;
- PATH discovery and User PATH repair behavior;
- Node/npm provisioning ownership;
- proof that `winget search npm` is absent;
- full live Signal Forge qualification;
- proof that no Codex App Server was invoked;
- focused validation results.

---

# Checkpoint and STOP

Commit:

`DER-R03 make environment setup application-led and repair Node/npm PATH`

Then STOP for Architect review.
