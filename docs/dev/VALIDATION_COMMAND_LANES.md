# Validation Command Lanes

Status: current Windows development standard

## Canonical Automated Lane

Run validation from the verified repository root with the installed local toolchain. Choose one composed profile for the scope; do not prepend typecheck and build to a profile that already owns its build.

| Command | Owned proof |
| --- | --- |
| `npm test` (also `test:unit`) | `implementation-fast`: one build, static catalog and fast tests |
| `npm run validate:static` | Static proof plus one TypeScript check or build, as selected proof requires |
| `npm run build` | Production TypeScript, renderer and assets only |
| `npm run test:fast` | Fast lane; build only if selected proof needs it |
| `npm run test:affected -- --changes tmp/changes.json` | Work Item: static/build, all fast, affected and applicable integration |
| `npm run test:repair -- --changes tmp/changes.json` | Repair scope plus explicitly declared preserved capabilities |
| `npm run test:integration -- --changes tmp/changes.json` | Affected integration-gate; application integration supplies exact candidate context |
| `npm run test:phase -- --changes tmp/changes.json` | Wider phase scope and explicit capability scope |
| `npm run test:desktop` | Desktop platform lane |
| `npm run test:packaging` | Packaging proof lane |
| `npm run test:migration` | Migration lane |
| `npm run test:performance` | Performance/soak lane |
| `npm run test:release` | All release qualification lanes |
| `npm run test:full` | Explicit full supported-platform regression |

Append `-- --preview` to any validation command (`npm test -- --preview` for the default), or use `npm run validate:plan -- --profile work-item --changes tmp/changes.json`. Preview lists every selected test, owner, reason, required environment, scheduling cohort and build step without launching proof. Concurrency defaults to two for explicitly safe files and is bounded to one through four with `--concurrency`.

Affected execution requires an explicit repository-relative JSON change set, for example `{"changedPaths":["src/shared/developmentEnvironment/developmentEnvironmentContract.ts"],"capabilityIds":[]}`. Include all changed paths; additional capability IDs broaden proof. Unknown paths fail with classification guidance. This input is temporary caller scope, not a governed workflow sidecar. Full/release commands reject narrowed change sets. Unavailable requirements produce an incomplete nonzero result, never a pass.

Ordinary Work Cards require static/build + affected + applicable integration through the work-item profile. Repairs also name the failed scenario and preserved behavior; add preserved capability IDs and any focused scenario proof missing from the profile. Phase close owns wider phase scope; use an explicit full profile only when the phase owns whole-repository acceptance. Release qualification owns all supported-platform lanes. A normal `npm test` result is developer feedback, not release acceptance.

Use the additional package lane when packaging is in scope:

```powershell
npm run package:win:dir
```

If a canonical Windows installer artifact already exists, validate its generated metadata with:

```powershell
npm run validate:package:win
```

Do not download packages or change dependencies merely to run validation.

## Sandbox `spawn EPERM` Handling

Vite, esbuild, Electron, Electron Builder, and other child-process-heavy tools may fail in a restricted execution sandbox with `spawn EPERM`.

When that exact condition occurs:

1. record the sandbox command and result once;
2. do not repeatedly retry the same sandbox command;
3. rerun the equivalent command in the approved normal Windows execution lane;
4. report the normal Windows result separately.

A sandbox failure is neither a source failure nor a pass. Other failures—type errors, assertion failures, missing files, module resolution errors, and crashes—must be investigated as repository defects.

## Validation Layers

- Static/build validation covers TypeScript, Electron main/preload/shared output, the Vite renderer bundle, and required runtime assets.
- Capability tests cover bounded domain and failure behavior.
- Production-path tests exercise main IPC, constrained preload exposure, renderer actions, production services, repository containment, and durable results where practical.
- A non-acceptance Electron launch smoke may establish only that the app starts and the changed path is reachable. It is not Operator acceptance.

Use curated or synthetic workspaces for Issue, planning, and repository tests. Do not make tests depend on local ignored `archive/` history or on this source repository's historical workflow corpus.

## Reporting

For every command, record the exact command, execution lane, exit result, relevant test count, failures/corrections, and any skipped check with its reason. Distinguish static/build checks, direct service tests, production-path tests, launch smoke, external integration evidence, and remaining Operator validation.

Validation does not permit staging, committing, pushing, merging, rebasing, tagging, resetting, cleaning, restoring, or stashing. The Operator is the only authority; the executing agent must follow the current task's Git scope and every explicit prohibition.

## Build ownership

A ValidationExecutor run owns one production build when its plan requires built output. The build already runs TypeScript; do not prepend an equivalent no-emit typecheck. A source-only profile may declare a standalone typecheck. Each run receipt identifies its build step and attaches the same run identity to dependent test results. Build failure blocks all downstream proof; no previous dist output is accepted as fresh. This is run-scoped ownership, not a persistent cache or a repository hashing pass. Keep source stable for the duration of a run.

The old raw test:unit:built aggregate has been removed. Workflows use the shared planner/executor commands above. Direct named Node tests remain useful for a card-specific diagnostic after a known current build, but are not a composed profile receipt. Production build and packaging output remain unchanged. During an active bundle, its explicit broken-suite quarantine takes precedence over wider qualification commands.

## Validation receipts and budgets

Every execution returns a bounded JSON receipt with selected files/reasons/capabilities/lanes, cohort and concurrency facts, build identity/duration, per-file duration and counts, total duration, slowest files and bounded failure evidence. CLI exits nonzero for failed or incomplete proof. Skips and unavailable requirements remain incomplete. Git runs record exact HEAD plus a digest of status and changed-file bytes, checked before and after execution; committed candidate receipts also retain frozen target/incoming/candidate context. Unversioned fixture runs are explicitly labeled. No persistent build cache or full-repository content hashing is used. Keep source stable during the run.

Budgets are static <30 seconds, fast <30 seconds (temporary ceiling 60), ordinary affected <60 seconds, and ordinary integration <180 seconds with review required at 300. Budget outcomes are advisory evidence independent of assertion status; a miss reports slowest contributors and never drops proof or invents an approval gate. Per-lane file durations are sums of actual processes, not wall time under parallel scheduling. The whole-run duration includes build, probes and source checks.

The machine receipt is authoritative; reports summarize it. Catalog durations are measurements or explicitly labeled estimates and may be refreshed from successful supported-workstation receipts. Integration persists only bounded structured summary telemetry inside its existing Markdown evidence. Full/regression qualification must be requested explicitly; preview alone is not execution acceptance.
