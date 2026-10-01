# DER-R03-R01 Implementer Report

Card: Repair Card DER-R03-R01 - complete preflight authority and persist Node PATH.
Status: IMPLEMENTED AND VALIDATED - checkpoint pending; STOP for Architect review.
Date: 2026-09-30 (Operator timezone).

## Repository and authority

Verified the approved Dev repository root and branch `dev`. Starting HEAD: `42ff4ecc055c684f53b1dfcff2395ba8ee165cb1`; origin remains configured. The active card authorizes the bounded checkpoint. Unrelated documentation, Agent Harness, source-control, and renderer/workflow edits in the shared checkout were preserved and excluded. No branch topology change, push, merge, dependency change, or selected-project write was performed.

## Implementation and permanent proof

`CodexImplementerExecutionService.startWithSelection` now resolves the exact ordinary Work Card or Issue Fix Card and obtains deterministic preflight before `runtimeManager.acquire`. Cache identity includes contract path, revision, SHA, and owner identity. Absent/current-contract-stale results run application-owned `DevelopmentEnvironmentPreflightService`; progress and final results are cached. Cached nonready results return truthful environment state without acquiring a runtime or creating an App Server. Neutral Prepare/Retry owns repair of cached failures. Only ready/not-required proceeds, after rechecking exact contract identity. Runtime acquisition failure preserves environment readiness. Exact Workflow WorkItem sequencing is unchanged.

Fresh status polling remains side-effect free. Null preflight projects canRunAgain=false and preparation eligibility. The renderer shows Development Environment / Not checked / Prepare Environment outside model/reasoning controls. The neutral API retains the shared Work Card/Issue Fix Card application resolver and repair service. Readiness removes Prepare/Retry; retryable failures and operator/restart requirements retain typed presentation. Run also directly requires ready/not-required in the renderer, preventing an obsolete true eligibility flag from enabling null preflight. Actual Codex/model readiness still matters after environment readiness.

WindowsEnvironmentRefreshResult now exposes only persistent machinePath/userPath alongside the existing merged process environment. Complete entries compare case-insensitively after trimming quotes, normalizing separators, and ignoring trailing separators. The append helper and fixed PowerShell writer preserve unrelated User PATH entries and avoid duplicates; root data travels in the child environment. No Machine PATH write or elevation was added.

After initial Windows refresh, a validated Node/npm pair is checked against persistent Machine/User PATH even when process resolution succeeds. Process-only exposure and bounded trusted off-PATH discovery append the exact root to User PATH, reread/refresh, verify persistent readback, resolve again, and run semantic Node/npm probes. Write/readback failure yields a retryable verification blocker without reinstall. Existing persistent Machine/User ownership skips the write.

Absent pairs retain one fixed Node provisioning owner, including npm-first contracts and Node version constraints. npm executes through validated Node plus npm-cli.js. No npm search, independent npm install, model fallback, or App Server environment execution exists. FFmpeg/FFprobe retain -version and post-provision verification.

Extended existing owners; no new permanent test file or capability-map change was needed:

- Fresh resolution-required/blocked preflight executes before unavailable Codex, projects canRunAgain=false and truthful repair eligibility, and makes zero acquire/concurrent-acquire/App Server calls. Cached nonready results continue blocking direct Run.
- Ready/not-required call order is preflight then runtime acquisition; environment readiness survives Codex acquisition failure.
- Fresh renderer exposes enabled Prepare with unavailable Codex and no model dependency; neutral readiness removes the action while unavailable model controls still disable Run. Null preflight remains disabled even with a stale true eligibility flag.
- Process-only Node exposure writes User PATH exactly once, refreshes/resolves before semantic probes, invokes no provider/installer, reaches ready, and makes no second write on another execution.
- Machine and User persistent ownership, normalization, stale process recovery, bounded off-PATH discovery, failed writes/readback, and absent-toolchain provisioning pass.
- Existing Windows npm resolver, Work Card/Issue Fix Card neutral application/IPC, ffmpeg/ffprobe, and exact Workflow WorkItem lifecycle regression proof passes.

The parent DER-R03 report was decoded from original Windows-1252 bytes and rewritten as UTF-8, preserving implementation/validation evidence. Authority and PATH statements identify this correction; its old no-known-blocker claim is qualified by Architect findings. Fatal UTF-8 decode and replacement/control-character scans pass for both reports, including headings and status lines.

## Live Signal Forge requalification

Ran the actual unchanged Signal Forge Work Card through production DevelopmentEnvironmentPreflightService and WindowsDevelopmentEnvironmentProvisioner with the real Windows runner and persistent refresh. Repeated after the successful final build.

| Fact | Observed |
| --- | --- |
| Final preflight | ready |
| Node | 24.18.1; satisfies >=22.0.0 |
| npm | 11.16.0 |
| ffmpeg | 9.0.2-full_build-www.gyan.dev |
| ffprobe | 9.0.2-full_build-www.gyan.dev |
| Initial refresh | 1, before probes |
| Persistent PATH writes | 0; already persistent |
| Provider/WinGet calls | 0 |
| App Server calls | 0 |

Launches used node.exe --version, node.exe npm-cli.js --version, ffmpeg -version, and ffprobe -version. Permanent injected tests prove process-only persistence/idempotence without registry mutation or reinstall on the real workstation.

## Commands and validation

Commands ran from the verified repository root. Direct named tests are focused proof; preview is selection evidence, not an executed composed-profile receipt.

1. `npm run build` initially failed in restricted Windows with unrelated TS2352 in WorkflowIntakeWorkspace.tsx. That shared-checkout work was corrected independently; this card did not edit it.
2. `node --test test/development-environment/windows-environment-refresh.test.cjs test/agent-harness/windows-npm-execution.test.cjs test/development-environment/windows-development-environment-provisioner.test.cjs test/development-environment/development-environment-preflight-service.test.cjs test/work-card-building/codex-implementer-execution-service.test.cjs test/renderer/work-card-building-review-workspace.test.cjs test/renderer/issue-fix-card-workspaces.test.cjs test/issue-resolution/issue-fix-card-service.test.cjs`: restricted Windows spawn EPERM; normal Windows equivalent exit 0, 144/144. Initial diagnostic used emitted main output; final-build proof follows.
3. Final `npm run build`: restricted Windows TypeScript passed but Vite spawn EPERM; normal Windows equivalent exit 0, production TypeScript/renderer/assets passed. Existing bundle-size advisory only.
4. `node --test test/development-environment/windows-environment-refresh.test.cjs test/agent-harness/windows-npm-execution.test.cjs test/development-environment/windows-development-environment-provisioner.test.cjs test/development-environment/development-environment-preflight-service.test.cjs test/renderer/work-card-building-review-workspace.test.cjs test/renderer/issue-fix-card-workspaces.test.cjs test/issue-resolution/issue-fix-card-service.test.cjs test/validation/capability-map.test.cjs`: normal Windows against final build, exit 0, 111/111.
5. `node --test --test-name-pattern 'fresh Work Card|requires neutral repair|idle status polling|constructs App Server transport' test/work-card-building/codex-implementer-execution-service.test.cjs`: normal Windows against final build, exit 0, 7/7 selected boundary cases. The final changed-test projection avoids a private-service test dependency.
6. `node tmp/der-r03-r01-live.cjs <PROJECT_REPO> planning/phases/phase-1/Work_Cards/phase-1-c01_establish_the_managed_phase_1_development_foundation.md`: normal Windows, exit 0; real four-requirement contract ready, counts above.
7. `node scripts/validation/cli.cjs preview --profile repair --changes tmp/der-r03-r01-changes.json`: restricted Windows exit 0; repair plan resolves changed source/test/doc paths.
8. Fatal UTF-8 decode and corruption scan of both reports: restricted Windows Node text tooling equivalent, exit 0.
9. `git diff --check` and staged equivalent: exit 0.

No broad/full regression, packaging, release, or visual Operator acceptance was run; those are outside this card. The final build includes ongoing shared-checkout work; only attributable changes are checkpointed.

## Files, safety, checkpoint

Modified:

- src/main/developmentEnvironment/windowsEnvironmentRefresh.ts
- src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts
- src/main/workCardBuilding/codexImplementerExecutionService.ts
- src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
- test/development-environment/windows-environment-refresh.test.cjs
- test/development-environment/windows-development-environment-provisioner.test.cjs
- test/work-card-building/codex-implementer-execution-service.test.cjs
- test/renderer/work-card-building-review-workspace.test.cjs
- docs/implementation-bundles/development-environment-resolution/Repair03/Reports/DER-R03_IMPLEMENTER_REPORT.md

Created this Repair01 report. No deleted files, dependencies, permanent test files, capability metadata changes, workflow sidecars, selected-project changes, or generated artifacts are included. Temporary scripts/logs/change inputs remain ignored under tmp/.

Exact staged diff inspection and bounded credential/concrete-home-path/generated-artifact scans passed before checkpoint. Hash is pending in this artifact to avoid amending solely to add its own hash; actual hash is reported in chat. Required commit: `DER-R03-R01 complete preflight authority and persist Node PATH`.

No implementation blocker is known. Automated renderer proof is not visual acceptance. The live host needed no PATH write or install; injected tests cover those cases. Next action: STOP for Architect review; no push, merge, or additional card execution.
