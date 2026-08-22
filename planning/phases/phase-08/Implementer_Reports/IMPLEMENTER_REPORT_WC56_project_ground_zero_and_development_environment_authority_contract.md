<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "implementer-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC56"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC56_project_ground_zero_and_development_environment_authority_contract.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "reportKind": "work-card-implementation",
    "workCardId": "WC56",
    "repositoryVerification": "verified approved repo root",
    "gitMutationAuthorized": false,
    "commitCreated": false,
    "commitHash": "none"
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# IMPLEMENTER REPORT WC56 - Project Ground-Zero and Development Environment Authority Contract

Report type: numbered Work Card implementation  
Repository path inspected: verified approved repo root  
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow` tracking `origin/feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Commit created: No, Git mutation prohibited by WC56  
Commit hash: none

## Files Changed

Files created:

- `src/shared/developmentEnvironment/developmentEnvironmentContract.ts`
- `test/work-card-planning/development-environment-contract.test.cjs`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC56_project_ground_zero_and_development_environment_authority_contract.md`

Files modified for WC56:

- `src/main/projectPlanning/projectPlanningDraftBundle.ts`
- `src/main/projectPlanning/projectPlanningService.ts`
- `src/main/phasePlanning/phasePlanningDraftBundle.ts`
- `src/main/phasePlanning/phasePlanningService.ts`
- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `test/project-planning/project-planning-service.test.cjs`
- `test/phase-planning/phase-planning-service.test.cjs`
- `test/work-card-planning/work-card-planning-service.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`

Several files in the repository were already dirty before this WC56 pass. Those pre-existing changes were preserved.

## Implementation Summary

- Project Planning prompt guidance now defines project ground zero as the selected repository plus the local development machine.
- Project Profile guidance now requires relevant installed, missing, unverified, bootstrap, project-local instruction, and externally managed development capabilities to be distinguished in the existing profile sections.
- Project Roadmap guidance now requires missing development capabilities to be sequenced as project work before dependent implementation work.
- Phase Planning prompt guidance now treats foundation work as host environment plus repository foundation where applicable.
- Phase Planning now distinguishes managed capability, external capability, and human-interaction boundary, and forbids treating absent ordinary tooling as Operator manual installation merely because it is absent.
- Formal Work Card prompt guidance now requires the optional `champcity-development-environment` block when unverified machine-level capability is needed, keeps installation mechanics application-owned, and treats managed setup as authorized implementation work.
- Formal Work Card draft validation now parses the optional environment block during normal promotion.
- Codex Implementer prompt semantics now state that missing managed required capabilities are remediable work, repository-native dependency bootstrap is implementation work, unrelated tool installation is prohibited, and UAC/auth/license/hardware steps are resumable human-interaction boundaries.
- WC56 introduced no installer backend, package installation mechanism, provisioning subsystem, or vendor-specific installation logic.

## Development Environment Contract

The version-1 fenced block is:

````text
```champcity-development-environment
{
  "schemaVersion": 1,
  "requirements": [
    {
      "capabilityId": "<stable-capability-id>",
      "versionConstraint": "<optional-version-constraint>",
      "profile": "<optional-profile>",
      "provisioning": "managed"
    }
  ]
}
```
````

Parser behavior:

- Accepts no block as valid for environment-free Work Cards.
- Accepts exactly one valid `schemaVersion: 1` block.
- Requires `requirements` to be an array.
- Requires each requirement to have a non-empty `capabilityId`.
- Allows only `managed` or `external` for `provisioning`.
- Allows optional string `versionConstraint` and `profile`.
- Rejects duplicate blocks.
- Rejects unknown top-level and requirement fields, including installer-command style fields.
- Rejects malformed JSON before a draft can promote to Formal Work Card authority.

## Prompt Changes

Project Planning:

- Added ground-zero language to both generated handoff content and prepared MCP instruction.
- Existing headings remain unchanged.
- Greenfield guidance now separates no implementation baseline from local development machine readiness.
- Roadmap guidance now sequences missing required development capabilities before dependent work.

Phase Planning:

- Added foundation guidance to both generated handoff content and prepared MCP instruction.
- Work Card Plan candidate guidance now places environment/toolchain establishment at or before dependent candidates.
- Managed, external, and human-interaction classifications are explicitly defined.

Formal Work Card Planning:

- Added the `champcity-development-environment` block requirement when unverified machine-level capabilities are necessary.
- The prompt forbids installer commands, package IDs, download URLs, vendor scripts, registry keys, executable paths, and absolute machine paths inside the Architect-owned block.
- Acceptance guidance requires capability verification before dependent configure/build/test/run/package proof.
- Missing tooling is directed to selected tooling establishment, not alternate architecture.

Codex Implementer:

- Missing managed development capability is no longer by itself a blocker.
- Application-owned provisioning should be used when available, then verified before continuing.
- External requirements block if absent.
- Repository-native dependency install/restore is normal implementation work when required.
- Provisioning authority is bounded by the Approved Work Card and project-local instructions.
- Human interactions are resumable interaction boundaries.

## Regression Tests

Added or updated tests proving:

- Greenfield Project Planning does not imply host machine readiness.
- Project Roadmap prompt guidance schedules missing development capabilities as work.
- Phase Planning treats foundation as machine plus repository readiness.
- Formal Work Card prompt guidance describes the environment block and application-owned installation mechanics.
- The parser accepts valid v1 blocks and environment-free Work Cards.
- The parser rejects duplicate blocks, unknown provisioning modes, empty capability IDs, and malformed fields.
- Formal Work Card promotion rejects malformed environment blocks before final mutation.
- Codex Implementer prompt includes the managed-capability remediation rule, dependency bootstrap rule, bounded provisioning authority, and human-interaction boundary rule.
- Existing Project Planning, Phase Planning, Work Card Planning, Codex execution, retry/cancellation, report, and lifecycle behavior remains green.

## Commands and Results

- `pwd`: passed; verified approved repo root.
- `git status --short --branch`: passed; branch and pre-existing dirty worktree inspected.
- `git remote -v`: passed; remote inspected.
- `Get-Content -LiteralPath docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`: passed; repository boundary read before edits.
- `Get-Content -LiteralPath docs/dev/VALIDATION_COMMAND_LANES.md`: passed; validation lane read before validation.
- `Get-Content -LiteralPath planning/phases/phase-08/Work_Cards/WC56_project_ground_zero_and_development_environment_authority_contract.md`: passed; approved Work Card read.
- `rg` source/test searches: passed; used to locate prompt contracts, validation hooks, and tests.
- `npm run typecheck`: passed in sandbox lane.
- `npm run build`: sandbox lane failed with `TS5033 EPERM` while writing `dist/`; normal Windows lane rerun passed.
- `node --test --test-concurrency=1 test/work-card-planning/development-environment-contract.test.cjs test/project-planning/project-planning-service.test.cjs test/phase-planning/phase-planning-service.test.cjs test/work-card-planning/work-card-planning-service.test.cjs test/work-card-building/codex-implementer-execution-service.test.cjs`: sandbox lane failed with documented `spawn EPERM`; normal Windows lane initially reported 46/47 passing and one prompt wording assertion failure.
- After correcting the prompt wording, `npm run build`: passed in normal Windows lane.
- Focused `node --test --test-concurrency=1 ...`: passed 47/47 in normal Windows lane.
- `npm test`: passed in normal Windows lane; build passed and full suite passed 337/337.
- Bounded touched-file scan for concrete local path markers and secret-like terms: passed. Matches were secret-protection prompt text and test event token-count field names only, not secret values.

## Validation Performed

- Static typecheck: `npm run typecheck` passed.
- Production build: `npm run build` passed in the normal Windows lane after sandbox write EPERM.
- Focused WC56 regression suite: 47/47 passed in the normal Windows lane.
- Full validation: `npm test` passed in the normal Windows lane with 337 tests passed, 0 failed.

Execution lane used:

- Sandbox lane for read-only commands and typecheck.
- Normal Windows lane for build and Node test execution after documented sandbox EPERM and spawn EPERM behavior.

## Validation Skipped

- Operator manual validation was not performed by the Implementer.
- No Electron launch smoke was performed because WC56 changed prompt contracts and validation/parsing behavior, and automated validation covered the production promotion paths.

## Manual Validation Required

Operator should generate representative prompts for:

- A greenfield project whose required development toolchain is unverified.
- An established project whose required toolchain is already verified.

Confirm the greenfield planning chain schedules development-environment establishment as project work and the established project does not manufacture redundant setup work.

Operator should also generate one representative Formal Work Card requiring an unverified managed capability and confirm it contains a valid `champcity-development-environment` block and does not tell the Operator to install the tool manually.

## Files Intentionally Not Created

- No installer backend.
- No Windows package-installation mechanism.
- No provider-specific SDK installation logic.
- No package-download URL catalog.
- No command, registry, executable path, or absolute machine path authority in planning artifacts.
- No JSON sidecar for this report.
- No commit, branch, tag, staging, push, stash, reset, rebase, or other Git mutation.

## Security And Secret-Safety Notes

No secrets, credentials, authentication tokens, API keys, private environment-file contents, or concrete local machine paths were introduced. Renderer filesystem authority was not broadened. The environment contract records capability requirements only and rejects unsupported installer-command fields.

## Git Actions

No Git mutation performed. WC56 explicitly prohibits Git mutation.

Current worktree remains dirty because it already contained unrelated prior Phase 08 changes before this WC56 pass, and this pass added WC56-scoped edits and this report.

## Residual Risks

- Operator-owned manual prompt validation remains.
- WC57 must still implement the deterministic provisioning backend consumed by this contract.
- Existing dirty worktree state means final review should distinguish WC56 changes from prior uncommitted Phase 08 work.

## Blocking Questions

None.

## Recommended Next Implementer Task

WC57 deterministic Windows development environment provisioner.

Document.Status=Pending
