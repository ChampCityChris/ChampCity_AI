# WSF20-REPAIR07 Implementer Report

Status: implementation checkpoint for Operator audit; live acceptance remains pending.

## Repository and scope

Verified the approved primary <PROJECT_REPO>/Dev checkout using AGENTS.md and Git. Active Repair Card WSF20-REPAIR07. Starting HEAD: 473bfbf7ff14ea984e7578a90c3ed0849ce98fee, matching the card. Branch dev; configured origin is ChampCityChris/ChampCity_AI. Cached remote comparison: 316 ahead, 0 behind before checkpoint. No fetch or push. Read repository code/test boundary and validation command lanes. Preserved all pre-existing untracked card/bundle documents.

## Application boundary correction

App.tsx adds greenfield-workflow-surface to the existing workspace-surface only when view is workflow-instance and the loaded workflowType is project-creation. The surface becomes a grid with one minmax(0, 1fr) row, min-height zero, hidden overflow, zero padding/gap. Its direct GreenfieldWorkspace stretches with height auto.

The mandatory actual-App geometry proof exposed an additional outer boundary defect: the later .app-root rule defines `32px auto minmax(0, 1fr)` despite App rendering only the application strip and app-body. The second child occupied the intrinsic auto row; the remaining-height third row was empty. Adding the surface contract alone still left app-body at bottom 281.14 in a 1000px viewport. A scoped `.app-root:has(> .app-body > .greenfield-workflow-surface)` rule supplies exactly `auto minmax(0, 1fr)`. It applies only to the Project Creation workflow surface and introduces no fixed height or viewport subtraction.

No Phase Map, recovered rail/header, browser lifecycle, SQL, schema, domain, navigation, MCP, prompts or security/session behavior changed.

## Full application geometry evidence

The permanent test bundles and renders the actual App, StructuredWorkflowWorkspace, GreenfieldWorkspace, recovered Phase Map and ApplicationBrowserHost. A test-only esbuild transform seeds App's initial route and synthetic loaded workflow; it does not replace App markup/class selection or descendants. Constrained API stubs supply synthetic SQL projections and acknowledge browser measurements. Production CSS is loaded without fixture layout overrides. A hidden real Electron BrowserWindow and WebContentsView provide geometry and native synthetic interaction.

Measurements in CSS pixels at desktop content size 1440 x 1000 (resize case 1440 x 850):

| State | app-body/surface/Greenfield bottom | shell-host height | Phase Map left/right height | browser host height |
| --- | ---: | ---: | ---: | ---: |
| Baseline contract removed | 281.14 | 138.00 | 106.00 / 106.00 | 1.00 |
| Corrected canonical empty Phase Map | 1000.00 | 856.86 | 824.86 / 824.86 | 683.86 |
| Generated Phase Map candidate | 1000.00 | 856.86 | 824.86 / 824.86 | 683.86 |
| Vertical resize to 850 | 850.00 | 706.86 | 674.86 / 674.86 | 533.86 |
| Completed Planning inspection | 1000.00 | 856.86 | browser column 824.86 | 683.86 |

The application strip is intrinsic at 32px. The navigation reason ends at 143.14; shell-host starts at that boundary and reaches the viewport bottom. Canonical empty and generated Phase Map roots reach the shell-host bottom. Column bottoms retain the recovered 16px interior padding. Candidate generation changes no outer height. Completed Planning was selected through the actual project rail while canonical SQL stayed on Phase Map; data-inspection was true. ApplicationBrowserHost's production ResizeObserver/coordinator measurements match the browser-host geometry in both viewport sizes. A real native synthetic button was clicked successfully; native bounds were applied from the acknowledged host measurements. This is synthetic native interaction evidence, not live ChatGPT acceptance.

The non-Greenfield regression mounts an actual closed Feature workflow through App and StructuredWorkflowWorkspace. The surface class remains exactly workspace-surface, display flex, overflow-y auto. Its prior root/surface layout is preserved. The supporting App semantic test also covers hub routing and an unloaded workflow to prove the class is not applied outside its condition.

## Files and proof ownership

Modified:

- src/renderer/app/App.tsx
- src/renderer/styles.css
- test/renderer/greenfield-shell-composition.test.cjs
- validation/capability-map.json

Created:

- test/renderer/greenfield-application-viewport.test.cjs
- test/fixtures/greenfield-application-viewport/renderer.tsx
- test/fixtures/greenfield-application-viewport/electron.cjs
- docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR07_IMPLEMENTER_REPORT.md

The new test covers a distinct previously untested boundary: actual App viewport composition, including its root track ownership. Existing subtree/source geometry tests could not detect the intrinsic outer App row. Registered as Windows desktop-platform, exclusive-desktop, with isolated temporary files and no network. No deletions, dependencies, migrations, sidecars or generated committed artifacts.

## Validation

| Exact command | Lane | Result |
| --- | --- | --- |
| node tmp/wsf20-r07-geometry-build.cjs | restricted Windows | exit 1, spawn EPERM; not a source failure |
| node tmp/wsf20-r07-geometry-build.cjs | normal Windows | exit 0 |
| node --test test/renderer/greenfield-shell-composition.test.cjs | normal Windows | exit 0, 9/9 tests |
| node tmp/wsf20-r07-geometry-run.cjs | normal Windows | initial exit 1 exposed the extra root row; after scoped root correction exit 0 |
| node --test test/renderer/greenfield-application-viewport.test.cjs | normal Windows desktop | exit 0, 1/1 full-App geometry/native synthetic interaction test |
| npm run test:repair -- --changes tmp/wsf20-r07-changes.json --preview | planner | exit 0 after registering the new behavior, sorted proof metadata and fixture source pattern |
| npm run test:repair -- --changes tmp/wsf20-r07-changes.json | normal Windows | exit 1; owned production build passed, 66/69 owners passed, 468/482 tests passed |
| node --test test/renderer/architect-browser-attachment-coordinator.test.cjs test/browser/architect-browser-handoff.test.cjs | normal Windows | exit 0, 29/29 tests |
| npm run validate:static | normal Windows final metadata | exit 0; final owned build and static checks passed |
| git diff --check; git diff --cached --check | diff safety | exit 0 after trimming three trailing blank lines |
| node tmp/wsf20-r07-safety.cjs | restricted / normal Windows | restricted exit 1, child Git spawn EPERM; normal exit 0, exact staged safety scan passed |

Repair receipt: 19de494a-75d9-4975-8754-3e6c7c7ef42d; 193.003s, source stable, production build 13.562s. Budget review required against the 60s target, dominated by managed-project-source (155.599s) and current-project-entry (89.995s; concurrent, passed). The desktop viewport owner is registered but is not selected by the ordinary repair profile; its explicit named desktop run supplies the mandatory geometry evidence. Final static receipt/details are recorded below. The only change after the broad run was correcting the existing composition owner's test-count metadata from stale 5 to observed 9; final static validation covers that correction.

| Broader failing owner | Failed tests | Boundary |
| --- | ---: | --- |
| test/agent-harness/repository-io-hardening.test.cjs | 1 | Registered-root workspace-only Git status assertion |
| test/project-state/execution-completion.test.cjs | 6 | Execution completion/catalog proof fixtures |
| test/source-control/managed-project-source.test.cjs | 7 | Source preparation/adoption fixture assertions |

These owners and failure counts were recorded by R06. No independent whole-baseline comparison was run, so this report does not claim a newly proven pre-existing classification. No out-of-scope fixes were attempted. No fully passing broad aggregate is claimed. Local ignored receipts/scripts are under tmp/wsf20-r07-*. Vite chunk-size and renderer test MaxListeners advisories did not fail focused proof. The synthetic Electron page's CSP warning is confined to the test fixture; production browser security was unchanged.

Final static receipt: 4b118f3e-a643-413f-a5e0-37eef577631a; 14.346s, source stable, production build and all 3 static owners passed (11/11 tests).


## Safety and checkpoint

Bounded exact-staged-diff review, whitespace check, and secret/concrete-local-path/generated-artifact scan passed. Only the eight attributable source/test/metadata/report files are staged. No secrets, credentials, cookies, .env contents, concrete machine paths, dependency state or generated outputs were accessed or persisted in the checkpoint. Durable paths are repository-relative or <PROJECT_REPO>.

Required checkpoint: `WSF20-R07 bind Greenfield to application viewport`. Hash pending at report creation; report actual hash in the handoff without amending solely to embed its own hash. No push, merge, tag, release or branch/worktree mutation. Stop after checkpoint for Operator audit.

Live acceptance is outstanding. Native application controls are unavailable in this session; the automated fixture does not access the Operator's existing project or live ChatGPT. Operator must verify existing Phase Map fill, interactive embedded ChatGPT, Browser Actions at the recovered column edge, continuous vertical resizing, and candidate refresh height stability. No experiential acceptance or accepted/closed status is claimed.
