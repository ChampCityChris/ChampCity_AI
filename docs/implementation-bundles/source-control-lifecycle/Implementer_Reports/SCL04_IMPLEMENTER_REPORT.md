# SCL04 Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a workstation path.
- Card: Work Card `SCL04`, Establish Greenfield `main`, `dev`, and First Work Source.
- Predecessor: SCL03 checkpoint `fedd41380c4c5c60c81740a3cba861a5d2369fb4`.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.

## Files

- Created: `src/main/sourceControl/projectSourceBootstrap.ts`, `test/work-intake/greenfield-source-bootstrap.test.cjs`, and this report.
- Modified: `src/main/agentHarness/repository/boundedGit.ts`, `src/main/sourceControl/sourceControlService.ts`, `src/main/workIntake/structuredWorkIntakeService.ts`, `src/main/main.ts`, `src/shared/sourceControlContracts.ts`, `src/shared/sourceLifecycleContracts.ts`, and `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: a remote dependency, worktree orchestrator, workflow-facing Git initialization contract, or implementation commit on `main`/`dev`.

## Implementation and evidence

RepositoryService now exposes semantic `bootstrapProjectSource`. It accepts only an empty selected Project root or compatible partial bootstrap, establishes one reproducible empty initial commit on `main`, and creates `dev` at that exact revision. Commit identity uses fixed author/committer metadata; retries reuse the same refs and reject incompatible branches, index state, or selected history. A retry preserves an already selected compatible branch. The operation never checks out files or requires a remote.

A greenfield Work Intake screen can capture a new Project directly in structured Project State. The main-process path persists the Project, its source-repository resource, provider authority, WorkIntake and SourceBinding before source bootstrap/preparation. The bootstrap receipt and topology are recorded as typed Project State Evidence referring to the real initial Git commit and its digest. SourceBinding then records the exact `dev` base/current revision and first deterministic Work Intake source line. A partial or incompatible bootstrap leaves the Intake saved with blocked source state, so retry can resume after source inspection or repair without duplicating compatible refs. Existing-Project preparation from SCL03 continues to use its unchanged `dev` path.

Isolated fixtures verified `main → dev → work-intake/<id>`, a reproducible initial commit across two repositories, one baseline after a missing-`dev` retry, preserved selected branch on retry, durable Project/Intake/Evidence records, and blocked/retry behavior for an incompatible partial `dev` ref.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows, static/build | Passed; final affected profile rebuilt the final source. |
| `node --test test/work-intake/greenfield-source-bootstrap.test.cjs` | Normal Windows, isolated Git/bootstrap | Passed 3/3 on final focused source. |
| `node --test test/validation/capability-map.test.cjs` | Normal Windows, catalog | Passed 5/5. |
| `npm run test:affected -- --changes tmp/scl04-changes.json` | Normal Windows, work-item | Final receipt `99657afd-b670-402f-9c4f-99896b321fb8` passed 364/364 in 53 selected files; source stable. |
| `git diff --check` and `git diff --cached --check` | Read-only source/staged checks | Passed. |

An initial focused bootstrap run failed because the Evidence reference was not an external URI. The Evidence now references the actual initial Git commit and uses its SHA-256 payload digest; the final focused and affected profiles passed. No required check was skipped. The work-item profile includes build, fast, affected, and applicable integration checks. No external remote, visual acceptance, or release result is claimed.

## Git and safety

The Operator directed one checkpoint commit for this card. Its hash is pending at report creation and will be reported after commit. Exact staged diff inspection, whitespace check, and added-line secret, concrete local-path, and generated-artifact scans passed with no findings. No push, merge, rebase, reset, clean, restore, or stash was performed in the source repository.

## Remaining validation and next task

The source repository itself still fails the SCL01Y migration inventory gate; this greenfield path was qualified in isolated repositories. SCL05 owns deterministic implementation and disposition checkpoint semantics. Continue to SCL05 after this checkpoint.
