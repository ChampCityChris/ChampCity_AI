# DER-R02 Implementer Report

Status: implemented; checkpoint pending at report creation; STOP for Architect review.

## Scope and repository

Operator request: work DER-R02. Verified Git repository root is the primary Dev checkout containing the card, AGENTS.md, package.json and production src/. Branch: dev. Remote: origin; local tracking comparison before checkpoint was 222 ahead / 0 behind origin/dev (no fetch performed). Unrelated existing working-tree changes were preserved and excluded from staging. No push, release, Signal Forge artifact changes, renderer redesign, or dependency changes.

## Implementation

Previously unknown executables inherited an invented --version command, including ffprobe; provider package inventory could then substitute for executable verification.

Registry now contains ffmpeg -> command ffmpeg, args [-version], pattern /ffmpeg\s+version\s+([^\s]+)/i; ffprobe -> command ffprobe, args [-version], pattern /ffprobe\s+version\s+([^\s]+)/i. Both support exact and minimum constraints through existing numeric comparison. The entire bounded version token is preserved, including distribution suffixes. Explicit node --version and npm --version adapters support the card's literal four-capability requirement set after removing generic version inference.

Unknown managed capabilities use where.exe with one executable argument derived from the existing bounded capability normalization. Presence-only requirements can be satisfied by exit 0. Version-constrained unknown capabilities record no detected executable version and remain unknown / resolution-required even when PATH lookup succeeds and provider installation succeeds. Provider candidate versions remain provisioning evidence only. No shell execution, repository arguments, configurable probes, or model syntax selection were added.

Registered capabilities probe before provider resolution and bypass WinGet when satisfied. After provisioning, the parent environment refresh runs and the same registered executable probe runs again. Failed reprobes carry verification-failure and explicit executable-verification diagnostics. Removed the unused package-inventory verification method and parsers; inventory cannot mark these requirements satisfied. Provider resolution and terminal authority remain unchanged.

Files modified:
- src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts
- src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts
- test/development-environment/windows-development-environment-provisioner.test.cjs
- validation/capability-map.json (updated existing behavior description/proof locator)

File created: this report. No runtime files deleted; no generated output committed. No Signal Forge planning artifacts created or modified.

## Permanent proof

Extended the existing provisioner owner rather than adding a test file. Previously uncovered regressions now exercise both registered media commands, missing-command provider fallback, incompatible ffprobe provisioning and successful/failed reprobe, installed-inventory non-authority, unknown presence-only success, constrained unknown failure without version evidence, and Signal Forge's literal node >=22.0.0 / npm / ffmpeg / ffprobe set reaching ready. The incorrect ffprobe --version success fixture was replaced with ffprobe -version. Existing provider discovery, MCP, exact package install, refresh, permission/restart, and terminal proofs were retained.

The media inventory guard makes installed inventory available in the fake runner, fails the executable reprobe, and asserts inventory is never queried as a substitute. The successful media path asserts two real probes and a refresh. Provider fallback evidence is the production resolver's WinGet search invocation; ready evidence contains only the executable probes.

## Validation

All commands ran from the verified repository root.

- Restricted lane: npm run build failed exit 1 with spawn EPERM in Vite/esbuild. Restricted node --test for the four focused owners failed exit 1 with spawn EPERM before tests executed. Restricted live NodeCommandRunner invocation also failed spawn EPERM. These are execution restrictions, not passes or source defects.
- Normal Windows lane: npm run build passed exit 0, including TypeScript, Vite and assets. Repeated after final cleanup and diagnostic adjustment: passed exit 0. Existing bundle-size advisory only.
- Normal Windows lane: node --test test/development-environment/windows-development-environment-provisioner.test.cjs test/development-environment/development-environment-preflight-service.test.cjs test/work-card-building/codex-implementer-execution-service.test.cjs test/renderer/work-card-building-review-workspace.test.cjs passed exit 0: 86 passed, zero failures/skips. Includes Windows package-provider proofs within the provisioner owner and DER-R01 terminal/report enforcement regressions.
- Normal Windows lane, final rebuilt source: node --test test/development-environment/windows-development-environment-provisioner.test.cjs test/development-environment/development-environment-preflight-service.test.cjs passed exit 0: 45 passed, zero failures/skips. Final presence-success constrained fixture additionally passed the provisioner owner: 43 tests, zero failures/skips. Only these affected owners were repeated after final probe-state/diagnostic cleanup; untouched Implementer and renderer owners were already passing.
- npm run validate:plan -- --profile repair --changes tmp/der-r02-changes.json passed exit 0. Temporary input lists the four modified source/test/catalog paths and preserved development-environment-provisioning, codex-implementation-runtime, and work-card-workflow capabilities. Initial preview rejected an incorrect capability name; corrected using the canonical catalog. Preview is selection evidence only. The broader selected suite was not run, as the card expressly requires focused validation.
- git diff --check passed exit 0 (line-ending advisory messages only).

## Live Windows qualification

An inline Node script loaded built production NodeCommandRunner and the capability registry, ran each registered command with its exact args, parsed output with its production version pattern and printed bounded evidence only:

- ffmpeg -version: exit 0; version 9.0.2-full_build-www.gyan.dev.
- ffprobe -version: exit 0; version 9.0.2-full_build-www.gyan.dev.

Normal Windows lane script exit 0. No environment variables or PATH dump recorded. No installation was performed for live qualification.

## Safety, checkpoint and remaining review

Attributable staged diff reviewed before commit; bounded secrets, concrete local paths and generated-artifact scan passed with no findings. Report uses repository-relative paths only. Unrelated files are excluded. Required checkpoint message: DER-R02 register FFmpeg probes and remove universal version assumption. Hash pending at creation; actual hash reported in chat after commit without amending this report solely for its hash.

No implementation blocker remains. Architect review is next. Operator visual/release acceptance was not performed or claimed; no renderer changes were made. Unknown version-constrained tools intentionally require a future explicit semantic adapter before executable version satisfaction can be established.
