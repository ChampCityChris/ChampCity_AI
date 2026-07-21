# Work Card — Phase 07 WC03 Clean-Room Application Source Reset and Minimal Workspace Shell

Status: approved for continuous Implementer execution
Owner: Implementer
Plan order: 3
Risk: high
Git mutation: not authorized
Implementer Report: `planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC03_clean_room_application_source_reset.md`

## Purpose

Replace the active application implementation with a minimal clean-room Electron and React shell.

This is not a refactor of the old source. The old application source and tests are deleted. New TypeScript and TSX must be written from the requirements in this Work Card without copying, importing, adapting, wrapping, or renaming old implementation code.

WC03 does not discover planning documents, write document dispositions, or resolve the next document. Those capabilities belong to WC04 through WC06.

## Required Starting Verification

Before editing:

- verify the approved repository root and expected remote;
- confirm the current branch and dirty status;
- treat the existing Phase 07 planning changes as protected baseline state;
- read `AGENTS.md`, `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`, and `docs/dev/VALIDATION_COMMAND_LANES.md`;
- do not require a Work Card hash, approval artifact, Execution Run, or additional authorization token.

For this approved continuous pass, this Work Card and the continuous handoff supersede old instructions that require a separate approval, Execution Run, Independent Verifier packet, or approval artifact before moving to WC04.

## Clean-Room Deletion

Delete the active implementation directories completely:

```text
src/
test/
```

Also delete rejected WC02 executable and generated output paths:

```text
scripts/migration/historical-corpus-v1/
planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.json
planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.md
```

Keep the WC02 Work Card and Implementer Report as historical planning evidence.

Do not preserve old source in another directory, archive, compatibility package, disabled feature, commented block, generated file, test fixture, or alternate entrypoint. Git history already preserves it.

## Permitted Reuse

The clean-room implementation may reuse only:

- existing package dependencies already declared in `package.json`;
- `tsconfig.json`, `vite.config.ts`, and build-support scripts when they remain suitable;
- image and branding assets copied byte-for-byte from the prior source tree;
- product names and workspace labels from approved Phase 07 planning.

Old `.ts`, `.tsx`, `.js`, `.cjs`, and source CSS must not be copied or used as a template.

## Minimal Source Architecture

Recreate only the source needed for a minimal shell. The exact filenames may vary when required by the existing build configuration, but the architecture must remain this small:

```text
src/main/main.ts
src/main/workspaceSettings.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/index.html
src/renderer/main.tsx
src/renderer/app/App.tsx
src/renderer/global.d.ts
src/renderer/styles.css
src/renderer/assets/<approved branding images>
```

No other production subsystem is authorized in WC03.

### Main process

Implement:

- Electron application startup;
- one main window titled `ChampCity A/I`;
- constrained folder selection through Electron dialog;
- persistence of the selected workspace root under Electron `userData`;
- validation that a selected root is a directory containing `planning/`;
- IPC to read the selected workspace, choose a workspace, and clear an invalid selection;
- path values returned to the renderer only as required for workspace display.

Do not scan planning files yet.

### Preload

Expose only:

- get selected workspace;
- choose workspace folder;
- clear selected workspace;
- basic app information.

Use context isolation. Do not expose unrestricted filesystem, shell, process, or Electron objects.

### Renderer

Create a clean application shell with:

- ChampCity A/I branding;
- selected workspace display;
- Choose Workspace control;
- five manually selectable workspace labels:
  - Project Planning;
  - Phase Planning;
  - Work Card;
  - Operator Validation;
  - Phase Closeout;
- one neutral content state displaying exactly:

```text
Document workflow not yet implemented
```

The five workspace buttons may switch the visible workspace heading, but each workspace remains an empty shell in WC03.

## Explicitly Prohibited

The new source must contain no implementation or terminology for:

- workflow authority;
- current action;
- workflow state index;
- workflow action catalog;
- Governance Maintenance;
- Governance Repair;
- Governance Approval;
- approval queue;
- approval artifact;
- Operator approval screen;
- routed IPC or renderer binding;
- role gate or screen gate;
- target-set hash;
- decision timeline;
- Execution Run;
- context packet;
- Independent Verifier;
- validator agent;
- `Document.Status`;
- disposition reader, writer, selector, or resolver.

No hidden, disabled, or placeholder implementation of these systems is allowed.

## Package and Build Reset

Update `package.json` only as needed to support the clean source and tests.

Retain:

```text
npm run typecheck
npm run build
npm test
npm run validate:codex:unit
npm run validate:codex:build
npm run validate:codex
npm start
```

Remove scripts that name or execute deleted governance, workflow, approval, migration, Execution Run, or old mounted-renderer tests.

Do not add dependencies.

## Tests

Create a new capability-oriented test suite under:

```text
test/app-shell/
```

The tests must prove:

1. old `src/` implementation paths and rejected WC02 executable paths are absent;
2. no production source contains prohibited governance, approval, workflow-authority, Execution Run, or context-packet identifiers;
3. selected workspace settings validate that `planning/` exists;
4. invalid workspace selection is rejected;
5. workspace settings persist and reload from a temporary user-data root;
6. preload exposes only the approved methods;
7. the renderer contains all five workspace labels;
8. the renderer contains the exact neutral message;
9. no disposition or resolver behavior exists yet.

Tests must use temporary directories and compiled clean-room modules. They must not import old source from Git history, planning records, or generated artifacts.

## Validation

Use the documented normal Windows lane:

```text
npm run typecheck
npm run build
npm test
npm run validate:codex:unit
npm run validate:codex:build
npm run validate:codex
```

Perform a non-acceptance launch smoke check with `npm start` and confirm only:

- the application opens;
- workspace selection is available;
- the five workspace shells are visible;
- the neutral message is visible;
- no removed workflow or approval UI appears.

Do not perform Operator acceptance.

## Implementer Report Requirements

Create the WC03 report before reading WC04. Include:

- repository and branch verification;
- initial and final dirty status;
- deleted source and test path counts;
- every new clean-room source and test file;
- confirmation that no old TypeScript or TSX was copied;
- prohibited-term scan results;
- commands and exits;
- launch smoke observations;
- confirmation that no planning document disposition or resolver was implemented;
- confirmation that no Git operation occurred;
- remaining Operator manual validation.

## Acceptance Criteria

WC03 passes only when:

1. the prior `src/` and `test/` implementations are gone;
2. rejected WC02 executable and generated manifest paths are gone;
3. a minimal clean-room Electron and React application builds and launches;
4. project workspace selection persists safely;
5. all five workspace shells are manually accessible;
6. `Document workflow not yet implemented` is visible;
7. no old governance, approval, workflow authority, routed IPC, Execution Run, or context-packet implementation remains;
8. no disposition or resolver capability has been implemented early;
9. automated validation passes;
10. the WC03 Implementer Report exists.

After the WC03 report is complete, immediately read and implement WC04. Do not wait for another approval.

## Document Disposition

Document.Status=Approved
