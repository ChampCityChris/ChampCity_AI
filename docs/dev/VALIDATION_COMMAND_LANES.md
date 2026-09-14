# Validation Command Lanes

Status: current Windows development standard

## Canonical Automated Lane

Run validation from the verified repository root with the installed local toolchain:

```powershell
npm run typecheck
npm run build
npm test
```

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
