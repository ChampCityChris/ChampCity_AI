# WSF20-REPAIR08-R01 Implementer Report

Date: 2026-10-04

## Scope and repository

- Operator-approved Repair Card WSF20-REPAIR08-R01, parent WSF20-REPAIR08, defect WSF20-D25.
- Verified Git root is the approved `Dev/` primary repository checkout; branch is `dev`.
- Starting HEAD matches the card baseline: `8cf458e5a2cfab1a9ecd1f54c34a6882277a4ead`.
- `origin` is the configured ChampCityChris/ChampCity_AI remote. Local `dev` is 318 commits ahead and zero behind the locally recorded `origin/dev`; no fetch or push performed.
- Pre-existing untracked bundle/card/audit documentation is preserved and excluded from the checkpoint.

## Files and implementation

- Modified `src/renderer/app/GreenfieldWorkspace.tsx`.
- Modified `test/renderer/greenfield-shell-composition.test.cjs` by extending the existing inspection owner; no new permanent test owner or test-count change.
- Created this Implementer Report. Deleted no files.
- No SQL/domain/schema, browser/layout, disposition-panel, prompt/MCP, dependency, or persisted renderer navigation changes.
- Ignored temporary validation input and logs remain under `tmp/`; generated build output is excluded from source control.

`open()` now checks the requested stage against the already-loaded navigation projection before resolving inspected context. When the stage is canonical and no different WorkItem was explicitly requested, it replaces selection with `selectionFromSql(navigation)` and `inspection:false`. Stage, Phase, WorkItem, and Repair identities are copied exactly, including null identities; historical child identities are not merged.

The universal inspected WorkItem default parameter is removed. A non-canonical Work Card surface can retain the selected WorkItem, resolving its Phase and Repair relationship from the loaded projection. Phase inspection retains its selected Phase but clears WorkItem/Repair child context; Project destinations clear lifecycle child context. Explicit map/context WorkItem requests retain the exact requested identity. `isCanonicalSelection()` and Resume's explicit SQL refresh remain unchanged. Rail return introduces no resolver call.

## Semantic proof

The existing Greenfield inspection owner now proves direct transitions without first correcting selectors:

- Canonical Phase A Interview, historical WorkItem in Phase B, canonical Phase Interview rail click: exact Phase A selection, null historical child identities, inspection false.
- Canonical W1 Report Review, historical W2, Report Review rail click: exact W1 selection, inspection false.
- Canonical R1 Repair, historical R2 in another Phase, Repair rail click: exact projected Phase/WorkItem/Repair selection, inspection false.
- Historical Work Card and Repair surfaces retain exact inspected context on non-canonical Work Card navigation; historical Phase navigation remains inspection and clears child identities.
- An explicit historical WorkItem map selection remains exact even when its destination stage matches the canonical stage.
- Canonical Project Phase Map return replaces stale child context with the exact projection.
- Rail/context actions make zero `getGreenfieldNavigation` calls. Existing Resume proof still observes resolver calls.
- The R08 Phase Map disposition regression passes, including enabled selection after return, duplicate-Apply protection, persistence before progression, and exact SQL refresh after approval.

These are renderer semantic tests with mocked preload APIs, not live project acceptance. The composed repair profile also supplies its existing service/integration proof.

## Validation

| Command | Execution lane | Result |
| --- | --- | --- |
| `npm run test:repair -- --changes tmp/wsf20-r08-r01-changes.json --preview` | Restricted Windows, plan only | Exit 0; exact three-path scope and preserved `renderer-navigation-and-presentation` capability. |
| `npm run test:repair -- --changes tmp/wsf20-r08-r01-changes.json` | Restricted Windows | Exit 1; build launch failed with `spawn EPERM`; downstream proof blocked. Recorded once and rerun in normal Windows. |
| `npm run test:repair -- --changes tmp/wsf20-r08-r01-changes.json` | Normal Windows, composed repair profile | Exit 0; 272/272 tests across 47 files passed, zero failed/skipped/cancelled/unavailable/blocked files. |
| `node --test test/renderer/phase-map-presentation.test.cjs` | Normal Windows, named owner after current build | Exit 0; 10/10 passed. |
| `git diff --check` | Restricted Windows | Exit 0. |

Authoritative local receipt: `tmp/wsf20-r08-r01-validation.log`, run ID `04d97a2b-bf0d-4060-939d-ae145887312c`; source stable throughout execution. Total duration 19,875 ms, within the 60-second repair budget. The profile owns one `npm run build`, passed exit 0 in 13,112 ms, covering TypeScript, Vite renderer, and runtime assets. Static owners, all selected fast/affected/integration owners, and the Greenfield composition owner (10/10) passed. Phase Map presentation was run separately because the profile did not select it.

The Greenfield loader emitted a non-failing MaxListeners warning. No duplicate standalone build/typecheck, full suite, packaging, release qualification, Electron launch smoke, or live project disposition was performed; these are outside the bounded repair proof.

## Safety, checkpoint, and Operator audit

Exact attributable staged diff is reviewed before checkpoint. Bounded staged scans cover credential-like additions, concrete local-machine paths, generated/dependency artifacts, and whitespace. No secrets, concrete machine paths, or generated artifacts are included.

Required checkpoint: `WSF20-R08-R01 resolve canonical rail identity from SQL projection`. Commit hash is pending in this report; the actual hash is delivered after commit without a self-referential report amendment. Stage only the two changed source/test files and this report. No push, merge, release, or unrelated Git mutation.

Stop after checkpoint for Operator audit. Recommended next action: in the existing test project, inspect historical Phase B WorkItem/Repair context and click the canonical Phase Interview, Work Card Report Review, and Repair rail destinations; confirm exact current identities, inspection cleared, and Resume removed. Also confirm non-canonical historical navigation stays read-only. No implementation blocker remains; live experiential acceptance belongs to the Operator.
