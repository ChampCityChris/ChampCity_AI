<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "formal-work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-00-baseline-ground-zero",
    "workCardId": "phase-00-wc-01-development-readiness",
    "candidateId": "phase-00-wc-01-development-readiness"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-00-baseline-ground-zero/Phase_Planning.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-00-baseline-ground-zero/Work_Card_Plan.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-00-baseline-ground-zero/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_phase-00-wc-01-development-readiness.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "phaseId": "phase-00-baseline-ground-zero",
    "workCardId": "phase-00-wc-01-development-readiness",
    "candidateId": "phase-00-wc-01-development-readiness",
    "candidate": {
      "candidateId": "phase-00-wc-01-development-readiness",
      "order": 1,
      "title": "Verify and Establish Current-Build Development Readiness",
      "purpose": "Use the existing ChampCity development-environment subsystem to verify Git, Node.js/npm, and every host capability actually required by the current production build; provision and semantically verify managed missing capabilities through that existing path; then establish repository dependency readiness through the existing package.json/package-lock.json npm bootstrap when required. Preserve UAC as a narrow human-interaction boundary rather than transferring managed installation work to the Operator.",
      "dependsOn": [],
      "resolutionStatus": "planned",
      "resolutionReason": "Git is already evidenced as operational, but Node.js/npm, repository dependency state, and any additional current-build capability remain unverified. Phase foundation rules require those managed capabilities to be verified or established before validation work depends on them.",
      "evidencePaths": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
        "planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md",
        "package.json",
        "package-lock.json"
      ],
      "phaseId": "phase-00-baseline-ground-zero"
    },
    "returnToPhasePlanningOnRejected": true,
    "repositoryAuthority": {
      "projectRepository": "C:\\Users\\chapm\\Projects\\ChampCity_AI"
    }
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": "2026-08-23T22:45:47.526Z"
  }
}
CHAMPCITY-METADATA -->

# phase-00-wc-01-development-readiness — Verify and Establish Current-Build Development Readiness

## Verified Repository Evidence

The Approved Work Card Intake handoff exists at `planning/phases/phase-00-baseline-ground-zero/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_phase-00-wc-01-development-readiness.md`, is revision 1, and declares the Formal Work Card target `planning/phases/phase-00-baseline-ground-zero/Work_Cards/phase-00-wc-01-development-readiness_verify_and_establish_current_build_development_readiness.md`. Both paths are bound to the selected `champcity_ai` workspace. The target is an application-owned future canonical target; it is not currently a second existing Formal Work Card.

Approved planning direction is consistent across `planning/phases/phase-00-baseline-ground-zero/Phase_Planning.md`, `planning/phases/phase-00-baseline-ground-zero/Work_Card_Plan.md`, `planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md`, `planning/project/PROJECT_PROFILE.md`, and `planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md`: Git is already evidenced as operational, Node.js/npm and repository dependency installation state remain unverified, managed missing machine capabilities are ChampCity work rather than Operator setup work, UAC is a narrow human boundary, and dependency readiness must use the current repository-native npm/lockfile path.

Current repository evidence establishes the following production path and boundaries:

- `package.json` defines the current build substrate as Node/npm with TypeScript, Vite, Electron, React, MCP SDK, and Codex packages. Its current scripts are `npm run typecheck`, `npm run build`, `npm test`, and `npm start`. `package-lock.json` is present with lockfile version 3. No `package.json` Node engine or other host-tool version constraint is declared, so this Work Card must not invent one.
- `.gitignore` excludes `node_modules/` and generated build output. Repository dependency restoration may therefore change local ignored dependency state without manufacturing tracked baseline changes.
- A read-only repository status check confirms the workspace is Git-backed and Git is operational. The current worktree contains Phase 0 planning artifacts that are not within this Work Card's reconciliation scope; Work Card 02 owns later worktree reconciliation.
- `src/shared/developmentEnvironment/developmentEnvironmentContract.ts` is the shared authority for the fenced `champcity-development-environment` contract. It accepts schema version 1, at most one block, and requirement records containing only `capabilityId`, optional `versionConstraint`, optional `profile`, and `provisioning` of `managed` or `external`.
- `src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts` is the current capability probe registry. The actual entries relevant to this build are `git`, probed with `git --version`, and `nodejs-lts`, probed with `node --version`. The registry also contains CMake, Ninja, Python, .NET, Rust, JDK, and MSVC capabilities, but repository inspection found no current `package.json`, package script, or dependency-graph evidence making those additional host capabilities requirements of the present ChampCity build. A repository search also found no `node-gyp` dependency evidence.
- `src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts` reads the current Formal Work Card from the selected workspace, parses the structured environment contract, returns `not-required` when no requirements are declared, and otherwise delegates the requirements to the Windows provisioner.
- `src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts`, together with `src/main/developmentEnvironment/windowsPackageProviderResolver.ts` and `src/main/developmentEnvironment/windowsEnvironmentRefresh.ts`, is the existing single Windows capability path. Repository inspection confirms capability probing, managed provider resolution/provisioning, UAC/restart interaction states, environment refresh, re-verification, evidence generation, retry semantics, and blocked/resolution-required states are already represented there. This architecture is accepted and is not to be replaced.
- `src/main/developmentEnvironment/repositoryEcosystemProvider.ts` detects `package-lock.json` as npm ecosystem authority, maps its restore command to `npm ci`, and maps its required machine tool to `nodejs-lts`. The production provisioner currently consumes repository-ecosystem discovery evidence during provider resolution; repository inspection did not find production code that automatically executes the provider's `restoreCommand`. Repository-native dependency restoration is instead explicitly treated by the current Implementer execution prompt as implementation work once machine preflight is ready. Therefore machine provisioning and repository dependency restoration are coordinated but separate responsibilities and must not be collapsed into a new competing authority.
- `src/main/workCardBuilding/codexImplementerExecutionService.ts` is the downstream gate. `start()` runs development-environment preflight before starting the Codex App Server/Implementer execution, stores the preflight result in the execution model, refuses to proceed when the result is not `ready` or `not-required`, supports `startEnvironmentResolution()` and retry/resume behavior, refreshes environment state after provisioning, and injects verified environment evidence into the Implementer prompt when ready.
- There is no separate standalone renderer-to-main development-environment IPC authority. The current exposure is intentionally part of Codex Implementer execution: `src/main/main.ts` registers `codexImplementer:getStatus`, `codexImplementer:start`, and `codexImplementer:startEnvironmentResolution`; `src/preload/index.ts` exposes the corresponding `getCodexImplementerExecutionStatus`, `startCodexImplementerExecution`, and `startCodexEnvironmentResolution` methods; `src/shared/workspaceContracts.ts` owns the execution/preflight model; and `src/renderer/app/App.tsx` invokes those preload methods.
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx` is the Operator-visible projection. It renders a Development Environment status surface, blocked/waiting/ready states, requirement-level evidence, and the `Resolve Environment` interaction when resolution is available.
- Development-environment state is not a second durable repository authority. `codexImplementerExecutionService.ts` holds current preflight state in execution/session memory by workspace, while the Formal Work Card remains the requirement authority and the canonical Implementer Report remains the durable implementation/proof record.
- Relevant retained tests include `test/work-card-planning/development-environment-contract.test.cjs`, `test/development-environment/windows-development-environment-provisioner.test.cjs`, `test/development-environment/windows-environment-refresh.test.cjs`, `test/work-card-building/codex-implementer-execution-service.test.cjs`, `test/renderer/work-card-building-review-workspace.test.cjs`, and `test/repository/runtime-wiring-source.test.cjs`. Existing tests cover contract rejection, provisioner outcomes, UAC/restart and retry states, execution gating, environment evidence injection, renderer presentation, and wiring. Source-string wiring tests are supporting evidence only and are not sufficient as primary runtime proof.

Confirmed repository behavior is therefore sufficient to make the Architect-owned decision for this card: declare `git` and `nodejs-lts` as managed machine requirements, retain the current ChampCity preflight/provisioning path, and establish the current repository dependency tree from the existing npm lockfile after that preflight succeeds. No material Operator-owned architectural choice remains. Actual host availability is deliberately left to runtime probing rather than assumed here.

## Objective

Verify repository dependency readiness against the current package.json/package-lock.json authority, restore with npm ci only when semantic verification demonstrates restoration is required, and then prove the resulting dependency/build readiness. Do not broaden this Work Card into baseline reconciliation, guidance cleanup, full baseline validation, or Git baseline creation.

A production source change is not required merely to create a diff. If the existing production path satisfies this contract, the implementation may consist of environment/dependency establishment, focused proof, and the canonical Implementer Report. A source correction is authorized only when execution evidence proves a narrowly adjacent defect in the existing development-readiness path prevents this objective.

## Runtime Sequence

1. The Approved Formal Work Card contains the single structured development-environment contract in this document. That Formal Work Card is the requirement authority.
2. From the Work Card Building review workspace, the authorized application action is `startCodexImplementerExecution()` / `codexImplementer:start`. The main process resolves the selected project root and current Approved Formal Work Card.
3. `CodexImplementerExecutionService.start()` invokes `DevelopmentEnvironmentPreflightService.runPreflight()` before Codex implementation begins.
4. `DevelopmentEnvironmentPreflightService` reads the current Formal Work Card body, parses exactly the managed `git` and `nodejs-lts` requirements, and delegates them to `WindowsDevelopmentEnvironmentProvisioner`.
5. The existing provisioner probes the capabilities. A satisfied capability is recorded with before/after state and detected version. A managed missing or incompatible capability follows the existing provider-resolution/provisioning path. If elevation is genuinely required, ChampCity prepares the managed action and stops only at the Windows UAC boundary. After installation or configuration, the existing process-environment refresh and semantic re-probe must complete before the requirement can become satisfied.
6. If preflight yields `waiting-for-operator`, `resolution-required`, or `blocked`, Codex implementation does not start. The existing execution model and Work Card Building UI surface the reason and retry/resolution state. The Implementer must not replace this behavior with manual installation instructions or a second installer path.
7. Only after preflight is `ready` does Codex implementation proceed.
8. After application-owned machine preflight is `ready`, record `git --version`, `node --version`, and `npm --version`.
9. Record pre-readiness hashes of `package.json` and `package-lock.json`.
10. Run `npm ls --depth=0` as the first repository dependency readiness check.
11. If `npm ls --depth=0` exits 0, classify the dependency tree as already ready and **do not run `npm ci`** merely because dependency state had previously been unverified.
12. If `npm ls --depth=0` proves missing/inconsistent repository dependencies, use `npm ci` as the lockfile-authoritative restore command.
13. If restoration encounters or would require process termination, do not terminate processes autonomously. Use the REPAIR06A execution approval/control boundary. If the conflict is the active ChampCity control plane, leave the Work Card incomplete/blocked for that execution mode rather than terminating ChampCity.
14. After any required `npm ci`, rerun `npm ls --depth=0` and require exit 0.
15. Record post-readiness `package.json` / `package-lock.json` hashes and require byte identity with the pre-readiness hashes.
16. Record `git status --short` and distinguish pre-existing state from Work Card effects.
17. Continue with the existing focused build/test validation only after dependency readiness is proven.
18. The final durable result is the canonical Implementer Report at the exact application-owned target, containing the preflight evidence, dependency-readiness evidence, focused test results, changed-file accounting, any blocked state, and remaining manual validation. The report remains Pending for Architect review.

## Required Changes

The Formal Work Card must contain exactly this one machine-level requirement block:

```champcity-development-environment
{
  "schemaVersion": 1,
  "requirements": [
    {
      "capabilityId": "git",
      "provisioning": "managed"
    },
    {
      "capabilityId": "nodejs-lts",
      "provisioning": "managed"
    }
  ]
}
```

Do not add a version constraint or profile to either requirement. Current repository authority does not declare one. `nodejs-lts` is the existing registry identity for the Node capability and must not be replaced with an invented `node`, `nodejs`, or `npm` machine-capability schema.

After application-owned preflight is `ready`, perform the repository readiness sequence in this exact order from the selected repository root:

1. Record `git --version`, `node --version`, and `npm --version` results after the preflight/refresh path has completed.
2. Record the pre-readiness hashes of `package.json` and `package-lock.json`.
3. Run `npm ls --depth=0` as the first repository dependency readiness check.
4. If `npm ls --depth=0` exits 0, classify the dependency tree as already ready and **do not run `npm ci`** merely because dependency state had previously been unverified.
5. If `npm ls --depth=0` proves missing/inconsistent repository dependencies, use `npm ci` as the lockfile-authoritative restore command. Do not substitute `npm install`, change dependency ranges, update packages, regenerate the lockfile, or add a package manager.
6. If restoration encounters or would require process termination, do not terminate processes autonomously. Use the REPAIR06A execution approval/control boundary. If the conflict is the active ChampCity control plane, leave the Work Card incomplete/blocked for that execution mode rather than terminating ChampCity.
7. After any required `npm ci`, rerun `npm ls --depth=0` and require exit 0.
8. Record the post-readiness hashes of `package.json` and `package-lock.json` and require them to match their pre-readiness hashes.
9. Record `git status --short` after readiness verification and distinguish all pre-existing entries from any Work Card-created entry. Ignored `node_modules/` and build outputs are local execution state, not baseline source changes.
10. Continue with the existing focused build/test validation only after dependency readiness is proven.

After readiness is established, run `npm run build` so the focused tests execute against current compiled production output, then run the directly relevant Node tests:

- `test/work-card-planning/development-environment-contract.test.cjs`
- `test/development-environment/windows-development-environment-provisioner.test.cjs`
- `test/development-environment/windows-environment-refresh.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/renderer/work-card-building-review-workspace.test.cjs`
- `test/repository/runtime-wiring-source.test.cjs`

Add or tighten one focused automated test only if the retained tests do not currently prove that an actual `DevelopmentEnvironmentPreflightService` reads a Formal Work Card containing the exact block above and passes the exact parsed `git` and `nodejs-lts` requirements into the injected provisioner. The preferred bounded test, if needed, is `test/development-environment/development-environment-preflight-service.test.cjs` using a temporary workspace and injected fake provisioner; it must also prove that an environment-free Work Card returns `not-required` without invoking the provisioner. Do not create a parallel test harness or alternate production service to obtain this proof.

If actual execution shows that the retained production path itself is defective, correct only the demonstrated defect through the existing contract, provisioner, environment-refresh, execution-gate, or status-projection path. Preserve existing source-of-authority and retry semantics. Do not make speculative cleanups.

If `npm ci` or the focused current-build path produces concrete evidence that an additional machine-level capability is genuinely required, do not silently install it outside the Work Card contract and do not guess a capability ID. Record the exact evidence, leave this Work Card incomplete/blocked, and return the scope expansion for Architect disposition so the Formal Work Card requirement contract can remain authoritative.

## Preserved Behavior

- The existing Windows development-environment subsystem remains the single machine-capability detection, managed provisioning, UAC, environment-refresh, and semantic-verification authority.
- Formal Work Card structured requirements remain the source of machine-capability demand; provider resolution does not become a second requirement authority.
- The current capability registry and provider-resolution architecture remain in place. Do not hard-code installer commands, package IDs, executable paths, download URLs, registry changes, or machine-specific absolute paths into the Work Card or a new production path.
- Windows UAC and restart remain genuine resumable human/OS boundaries. ChampCity prepares and owns the technical action around them.
- `package.json` and `package-lock.json` remain the repository dependency authority. `npm ci` is restoration of the declared dependency state, not permission to revise that state.
- Current Work Card Building execution gating remains: Codex implementation must not begin until development-environment preflight is `ready` or legitimately `not-required`.
- Current execution/preflight evidence remains exposed through the existing shared `CodexImplementerExecutionModel` and Work Card Building review UI; no duplicate readiness store or renderer-only authority is introduced.
- Existing canonical planning/document lifecycle, workspace ownership, Architect promotion/review authority, and Implementer Report lifecycle are unchanged.
- Existing Phase 0 planning artifacts and current worktree state are preserved. Work Card 02 owns worktree reconciliation; Work Card 03 owns active guidance/prompt drift; Work Card 04 owns fresh full-baseline validation; Work Card 05 owns the Operator-accepted clean Git baseline.

## Authorized Surface

Expected source change surface: none if the existing production path and retained tests satisfy this contract.

Always authorized for execution/proof:

- `package.json` — read/execute current scripts only; no content change.
- `package-lock.json` — read/use as `npm ci` authority only; no content change.
- ignored local `node_modules/` and generated `dist/` state produced by the authorized bootstrap/build.
- relevant existing tests listed in Required Changes.
- the exact canonical Implementer Report target named below.

If and only if a demonstrated production-path defect blocks the objective, a narrowly necessary adjacent correction may touch the smallest applicable subset of:

- `src/shared/developmentEnvironment/developmentEnvironmentContract.ts`
- `src/shared/developmentEnvironmentContracts.ts`
- `src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts`
- `src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts`
- `src/main/developmentEnvironment/repositoryEcosystemProvider.ts`
- `src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts`
- `src/main/developmentEnvironment/windowsPackageProviderResolver.ts`
- `src/main/developmentEnvironment/windowsEnvironmentRefresh.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- the exact corresponding focused test files.

`src/main/main.ts`, `src/preload/index.ts`, `src/shared/workspaceContracts.ts`, `src/renderer/app/App.tsx`, and `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx` are inspected and verified wiring/projection surfaces, not expected change surfaces. They may be changed only if runtime evidence proves that the existing required IPC/preload/UI path is itself defective and the correction is strictly necessary to satisfy this Work Card; any such adjacent correction must be explicitly identified and proved in the Implementer Report.

No other production, planning, migration, documentation, package-manifest, or lifecycle surface is authorized.

## Risks and Constraints

- Host state is deliberately unverified at drafting time. The Work Card must let the production preflight determine whether Git and Node.js LTS are already satisfied, need managed provisioning, require UAC/restart, or are genuinely blocked.
- Node.js LTS provisioning may change the parent process environment. Capability success is not established until the existing refresh/re-probe path verifies the refreshed environment.
- A repository dependency restore may conflict with a running application that is using the same dependency tree. The Implementer must not resolve that conflict by silently terminating processes. Process-control decisions are governed by the application execution authority and Operator approval boundary.
- A `package.json`/`package-lock.json` inconsistency is a repository defect, not permission to run `npm install` and accept an altered lockfile. Record the exact failure and remain blocked for disposition unless an already-authorized narrow correction clearly covers it.
- A new native-build/toolchain requirement discovered during `npm ci` is material scope evidence. Do not bypass the Formal Work Card environment contract with ad hoc Python/MSVC/CMake/Ninja installation.
- The current worktree is not a clean baseline. Read-only before/after status evidence must distinguish Work Card effects from pre-existing Phase 0 artifacts. This card does not classify, delete, restore, stage, or commit existing repository state.
- Focused `npm run build` and development-environment tests are readiness proof only. Do not report Work Card 04's full validation gate as completed by this card.
- Current active guidance contains known historical/stale material scheduled for later reconciliation. Do not repair unrelated documentation or restore deleted legacy scripts in this Work Card.
- Source-string wiring tests may corroborate main/preload/renderer reachability but cannot be the primary proof that preflight gates execution or that actual host/dependency readiness was established.

## Acceptance Criteria

1. **Formal requirement contract is exact.** The Approved Formal Work Card contains exactly one `champcity-development-environment` block, schema version 1, with exactly two managed requirements: `git` and `nodejs-lts`. Parsing succeeds through the production shared parser. No installer details, package IDs, machine paths, invented capability IDs, version constraints, profiles, or second environment block are present.

2. **Production execution gate consumes the Formal Work Card before implementation.** Automated production-service proof demonstrates that Work Card execution resolves the current Formal Work Card, invokes development-environment preflight before Codex App Server/Implementer start, and does not enter the implementation execution path while the preflight state is `waiting-for-operator`, `resolution-required`, or `blocked`. A `ready` result permits the normal existing Implementer path. Main/preload/renderer source-wiring checks may support this criterion but are not the primary proof.

3. **Git is semantically verified through the existing capability path.** Actual Work Card execution evidence includes the `git` requirement's before state, action taken, after state, detected version when available, command summary, retry state, and any provider/UAC evidence. Successful completion requires final `afterState: satisfied`. If Git was already present, no provisioning action is manufactured. If it was missing, only the existing managed provisioner path may establish it.

4. **Node.js LTS is semantically verified through the existing capability path.** Actual Work Card execution evidence includes the `nodejs-lts` requirement's before state, action taken, after state, detected version when available, command summary, retry state, and any provider/UAC/environment-refresh evidence. Successful completion requires final `afterState: satisfied` after any required environment refresh. Direct Operator/manual installation is not an acceptable substitute.

5. **npm is usable only after machine preflight is ready.** The Implementer records successful post-preflight `node --version` and `npm --version` results from the refreshed execution environment before repository dependency restoration begins. No dependent bootstrap/build/test command is counted as valid proof if it was attempted before the required managed machine capabilities were verified.

6. **Repository dependency readiness is established from the current lockfile without authority drift.** Repository dependency readiness is semantically established from the current lockfile authority. `npm ls --depth=0` is run first. If it succeeds, no restore is performed. If it fails because repository dependencies are missing/inconsistent, `npm ci` is used once as the authorized restore and `npm ls --depth=0` then succeeds. `package.json` and `package-lock.json` remain byte-identical in either path. No `npm install`, package upgrade, dependency-range change, lockfile regeneration, alternate package manager, or manual package import is used.

7. **Failure and retry behavior is safe and auditable.** Focused automated tests prove at least: already-satisfied managed requirements do not provision unnecessarily; managed missing requirements follow the retained provider/provisioning path; UAC/restart states remain resumable human boundaries; failed or ambiguous provider resolution produces the existing non-ready state and does not start Codex; retryable failures remain retryable; and an environment-free Work Card remains `not-required`. If `npm ci` fails, the exact command, exit result, stdout/stderr summary, package-file hashes, and classification are reported, and no fallback command that changes dependency authority is attempted. A dependency restore must not silently terminate a running process and must obey the REPAIR06A execution approval/protected-process boundary.

8. **The focused readiness build/test lane passes after readiness is established.** `npm run build` succeeds only after Criteria 3-6 are satisfied, and the directly relevant development-environment, execution-service, renderer-status, and runtime-wiring tests listed in Required Changes pass. If an additional focused preflight-service integration test is required to close a proof gap, it is added and passes. These results are explicitly described as Work Card 01 readiness proof, not the Phase 0 full-baseline validation gate.

9. **Repository state is preserved outside authorized local/bootstrap effects.** Read-only `git status --short` evidence captured before and after bootstrap/testing shows no Work Card-created tracked or untracked repository changes except the canonical Implementer Report and any explicitly documented, narrowly authorized source/test correction required by a demonstrated defect. Pre-existing Phase 0 planning state is neither reconciled nor altered. `node_modules/` and generated build output remain ignored local state.

10. **No undisclosed host requirement is bypassed.** If the current `npm ci`, build, or focused test path proves that an additional machine capability is actually required, the Implementer records the exact evidence and stops this Work Card as incomplete/blocked rather than performing an ad hoc installation or silently broadening the capability contract. In the absence of such evidence, Git plus Node.js LTS remain the complete declared current-build machine requirement set for this card.

11. **Operator-visible state matches execution authority.** The running product projects the current development-environment preflight through the existing Work Card Building review surface. A non-ready preflight visibly prevents implementation start and exposes the existing resolution/retry interaction when applicable; a ready preflight is visibly distinct from blocked/waiting states. Manual visual confirmation is recorded separately under Manual Validation and is not inferred from source-string tests.

12. **Canonical proof is complete and Pending for review.** The exact application-owned Implementer Report is updated with evidence mapped to Criteria 1-11, remains Pending for Architect review, and contains no claim of Architect approval, Operator acceptance, Phase completion, full baseline validation, or clean-Git-baseline completion.

## Negative Constraints

- Do not create a second development-environment service, installer abstraction, package-manager abstraction, capability registry, environment schema, readiness store, or renderer-only authority.
- Do not bypass `DevelopmentEnvironmentPreflightService` / `WindowsDevelopmentEnvironmentProvisioner` with direct Implementer-run `winget`, vendor installers, download scripts, registry edits, hard-coded executable paths, or manual Operator installation instructions for Git or Node.js.
- Do not place installer commands, package IDs, URLs, registry keys, executable paths, or absolute machine paths in the `champcity-development-environment` block.
- Do not invent an `npm` machine capability. npm readiness is proved after `nodejs-lts` readiness through the repository-native bootstrap sequence.
- Do not use `npm install`, `npm update`, `npm audit fix`, alternate package managers, dependency upgrades, package-range edits, or lockfile regeneration to make the bootstrap pass.
- Do not add CMake, Ninja, Python, .NET, Rust, JDK, MSVC, or another host requirement without concrete current-build evidence and Architect disposition of the changed requirement contract.
- Do not modify `package.json` or `package-lock.json` in this Work Card.
- Do not restore deleted legacy scripts, planning history, governance files, or historical validation helpers.
- Do not reconcile or clean the current worktree; do not perform Work Card 02 work early.
- Do not repair unrelated active documentation/prompt drift; do not perform Work Card 03 work early.
- Do not claim or substitute the focused readiness tests for Work Card 04 full baseline validation.
- Do not stage, commit, push, merge, rebase, reset, clean, restore, stash, tag, or otherwise mutate Git state.
- Do not inspect, modify, or fall back to another MCP workspace or repository.
- Do not add compatibility wrappers, fallbacks, manual imports, migrations, or duplicate schemas unless a demonstrated production defect makes the smallest adjacent correction unavoidable and the correction preserves the existing architecture.
- Do not treat source-string presence alone as proof of production readiness.

## Implementer Report Requirements

The application-owned canonical Implementer Report target is exactly:

`planning/phases/phase-00-baseline-ground-zero/Implementer_Reports/IMPLEMENTER_REPORT_phase-00-wc-01-development-readiness_verify_and_establish_current_build_development_readiness.md`

Update that existing canonical report target. Do not create an alternate report, sibling proof document, ad hoc log artifact, or replacement report path. Implementation is incomplete until that exact report contains the complete auditable evidence below and remains Pending for Architect review.

The report must:

- identify the Approved Formal Work Card path and revision used for execution;
- map Acceptance Criteria 1-12 individually to concrete evidence and result;
- include the application-produced development-environment preflight evidence for both `git` and `nodejs-lts`, including before state, action, after state, detected versions, command summaries, provider attempts, retry status, blocker/human-interaction details where applicable, and final preflight state;
- record whether managed provisioning occurred, whether UAC or restart was required, what the application did before the human boundary, and what verification resumed afterward;
- record exact post-preflight `git --version`, `node --version`, and `npm --version` results used as host/tool evidence;
- record pre/post SHA-256 values for `package.json` and `package-lock.json`;
- record the initial `npm ls --depth=0` result;
- state whether restore was required and why;
- if restore was not required, explicitly record `npm ci: not run — existing dependency tree verified ready`;
- if restore was required, record the exact `npm ci` command/result and post-restore `npm ls --depth=0` result;
- record any runtime/process conflict and resulting Operator approval/denial/blocker evidence;
- record the exact `npm run build` and focused test command(s), execution lane, exit results, test counts where applicable, failures, corrections, and reruns;
- identify which evidence is actual runtime/service proof and which evidence is only supporting source-wiring proof;
- include before/after `git status --short` evidence and explicitly distinguish pre-existing entries from Work Card-created changes;
- list every changed file. If there were no production source changes, say so explicitly. If a narrowly adjacent source/test correction was necessary, name the demonstrated defect, every changed file, why each file was within Authorized Surface, and the tests proving the correction;
- identify the exact production paths exercised: Formal Work Card parser, preflight service, Windows provisioner/provider/refresh path as applicable, Codex execution gate, shared execution model, and renderer projection where actually exercised;
- identify any additional current-build host capability discovered and, if found, show that the Work Card stopped for Architect disposition rather than bypassing the structured requirement authority;
- list all Operator/manual validation remaining, with result recorded as Passed, Failed, Blocked, or Not performed; do not infer an Operator-observed result;
- disclose any scope expansion, blocked state, skipped proof, retry, residual risk, or environment-specific limitation;
- state explicitly that Work Card 02 worktree reconciliation, Work Card 03 guidance/prompt reconciliation, Work Card 04 full baseline validation, and Work Card 05 clean Git baseline establishment were not claimed as completed by this Work Card;
- remain Pending for Architect review. The Implementer must not mark the Work Card approved, accepted, validated, closed, or complete on behalf of the Architect or Operator.

## Manual Validation

Using the running ChampCity A/I desktop application with this Work Card as the current Approved Formal Work Card:

- Open the Work Card Building review workspace and invoke the normal Run Codex action. Confirm the Development Environment surface visibly enters the preparation/checking path before Implementer execution starts.
- If the host is already ready, confirm the surface reaches a clear ready state and the Implementer execution begins only after that state.
- If managed provisioning is required, confirm the UI remains in the development-environment path while ChampCity performs the technical work. If Windows elevation is genuinely required, confirm the only Operator action is the UAC secure-desktop confirmation and that ChampCity resumes verification afterward rather than instructing the Operator to perform the installation manually.
- If the production path reaches `resolution-required`, confirm `Resolve Environment` is visible/callable and that implementation remains blocked until a subsequent preflight becomes ready.
- If the production path reaches `waiting-for-operator` or `blocked`, confirm the displayed reason corresponds to the application-produced preflight state and that Codex implementation does not start.
- After a ready transition, confirm the Development Environment projection remains consistent with the execution status and does not present a second conflicting readiness authority.

Record each performed check exactly as Passed, Failed, Blocked, or Not performed in the canonical Implementer Report. These checks are visual/interactive confirmation only and do not replace the automated proof above.
