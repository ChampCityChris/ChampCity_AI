# WSF20-REPAIR05 Implementer Report

Date: 2026-10-04. Card type: Repair Card. Scope: WSF20-D15, D16, D17.

## Repository and baseline

Verified the approved repository root with `git rev-parse --show-toplevel`: the `Dev` checkout containing this card, its `AGENTS.md`, package manifest and source. Worked directly on `dev`, starting at R04 checkpoint `9fbd6a9c` (after R03 `4ad54324`). Origin is the existing ChampCityChris/ChampCity_AI repository. Before this checkpoint, local `dev` was 314 commits ahead and zero behind the locally recorded `origin/dev`; no fetch or push was performed. Pre-existing untracked bundle documentation was preserved and excluded from staging.

## D15: inspected browser and mutation boundaries

Greenfield composition now passes its normal browser panel during inspection. Architect Interview, Project Planning and Phase Map explicitly omit the browser companion when `browserVisible` is false, matching the existing Phase Interview, Phase Planning and Work Card Planning behavior. The composition supplies visibility consistently for all six stages. No orphan Browser Actions rows remain for those hidden companions.

The disabled Greenfield fieldset still protects ChampCity form/button mutations. The native browser attachment implementation, session, allow-list, security policy and R03 attachment-generation/recovery code were not changed. Sidebar Resume continues to read the canonical SQL navigation projection. The existing composition owner now exercises three additional inspection/return cycles, verifies the same browser element is supplied, and checks the contextual sidebar action disappears on return.

Synthetic Chromium DOM proof verifies inspection disables the rendered ChampCity controls while retaining a positive browser host rectangle. This is renderer/layout proof, not evidence of a live ChatGPT session. Repeated live inspection/return and same-conversation continuity remain for Operator audit.

## D16: exact shell-fill ownership

`greenfield-shell-host` now contains one explicit `greenfield-shell-content` grid item with a `minmax(0, 1fr)` row. Removed the blanket direct-child flex rule. IntakeWorkspaceShell and ProjectPlanningReviewShell each have one `workspace-shell-frame` presentation root. Only their named workspace bodies grow; the Intake header and Project Planning blocker use intrinsic height. No recovered chrome was copied into GreenfieldWorkspace.

Eight synthetic states were server-rendered from the actual recovered React shells and ApplicationBrowserHost markup with the profile-built production stylesheet, measured and captured in a hidden Electron window at a fixed 1280 x 960 CSS-pixel content viewport. Screenshots were inspected after two animation frames. Assertions verify bottom alignment, available-height fill, positive browser bounds, disabled inspection controls and identical empty/generated Planning geometry.

| State | Fill height | Body height | Intrinsic region | Browser host height |
| --- | ---: | ---: | ---: | ---: |
| Project Intake current | 899.60 | 847.60 | Header 52.00 | N/A |
| Project Intake inspection | 899.60 | 847.60 | Header 52.00 | N/A |
| Architect Interview current | 899.60 | 899.60 | N/A | 724.44 |
| Architect Interview inspection | 899.60 | 899.60 | N/A | 724.44 |
| Project Planning empty | 899.60 | 899.60 | N/A | 724.44 |
| Project Planning blocker | 899.60 | 813.92 | Blocker 85.69 | 638.75 |
| Project Planning generated | 899.60 | 899.60 | N/A | 724.44 |
| Phase Map empty inspection | 899.60 | 899.60 | N/A | 724.44 |

Local, ignored evidence: `tmp/wsf20-r05-visual/receipt.json` and the eight named PNGs in that directory. Temporary render/measurement helpers are `tmp/wsf20-r05-render.cjs` and `tmp/wsf20-r05-geometry.cjs`. No screenshots, Electron profiles or generated HTML were committed. An initial fixture assertion used an absolute height threshold despite variable Windows content sizing; the corrected fixture fixes the content viewport and measures against it. No production correction was needed for that harness issue.

## D17: Approved is transition authority

Each gating adapter follows the same pattern: acquire a synchronous in-flight lock, await the SQL review mutation, update its local projection as applicable, and await its existing parent callback only for Approved. Busy spans persistence and canonical refresh. Failed persistence cannot advance; revision/rejection never advance. Existing identity-generation guards remain in the Phase and Work Card adapters. Parent refresh failures leave selection unchanged and display an error. Greenfield resume now returns its promise so adapters await resolution; destination selection still comes exclusively from `getGreenfieldNavigation`.

| Approved transition | Adapter callback | Automated evidence |
| --- | --- | --- |
| Architect Interview to Project Planning | onApproved or onNext | Delayed mutation/resolver matrix and existing Architect owner |
| Project Planning to Phase Map | onNext | Matrix plus actual SQL-service fixture and canonical resolver |
| Phase Map to Phase Interview | onNext | Matrix plus actual SQL-service fixture and canonical resolver |
| Phase Interview to Phase Planning | onNext | Matrix and existing Phase owner |
| Phase Planning to canonical Work Card stage | onNext | Matrix and existing Phase owner |
| Work Card Planning to Implement | onNext | Matrix and existing Work Card owner |
| Repair Planning to canonical Repair execution | onImplement | Matrix and existing Repair owner |

Removed Continue to Project Planning, Phase Map, next Phase, Phase Planning, Work Card Map and Work Card Implement. Repair's former post-approval Continue to Repair Implement is replaced with Resume Repair Implement, enabled only for an already in-progress execution; it cannot authorize planning progression. Preserved Repair Review & Validation and Return to Parent because they represent different later actions. Project Intake's existing approval progression is unchanged.

The extended Greenfield owner tests all seven adapters against Approved, RevisionRequested, Rejected, persistence failure and resolver failure. It verifies same-tick duplicate clicks and clicks during pending resolution produce exactly one persistence and one eligible advance. Hidden-browser and absent redundant-Continue assertions are included in this matrix. No new permanent test file was needed: these regressions belong to the existing composition owner.

## Changed files

Production (12): `src/renderer/app/GreenfieldWorkspace.tsx`, `GreenfieldStageComposition.tsx`, `GreenfieldArchitectWorkspace.tsx`, `IntakeWorkspaceShell.tsx`, `ProjectPlanningReviewShell.tsx`, `StructuredProjectPlanningWorkspace.tsx`, `StructuredPhaseMapWorkspace.tsx`, `PhaseInterviewWorkspace.tsx`, `PhasePlanningWorkspace.tsx`, `WorkCardPlanningWorkspace.tsx`, `WorkCardRepairWorkspace.tsx` (all subsequent TSX names under the same app directory), and `src/renderer/styles.css`.

Tests (6): `test/renderer/greenfield-shell-composition.test.cjs`, `project-rail-presentation.test.cjs`, `phase-map-presentation.test.cjs`, `architect-browser-attachment-coordinator.test.cjs`, `work-card-repair-workspace.test.cjs` (all subsequent names under test/renderer), plus `test/agent-harness/reserved-toolbox-namespace.test.cjs`. Hook fixtures in the existing owners now provide useRef for the synchronous action guard. The retired-Architect source-text assertion is replaced with behavior through the current Greenfield composition. Planning and Phase Map fixtures verify canonical SQL destinations after persistence. Created this report. No files deleted.

Intentionally not created/changed: SQL/domain/schema/migrations, persisted renderer navigation, hard-coded destination state, model handoffs/prompts, browser lifecycle/session/security, D05-D08, dependencies, new permanent test files, or release artifacts.

## Validation receipts

| Command / check | Lane | Result |
| --- | --- | --- |
| `node --test test/renderer/greenfield-shell-composition.test.cjs` | Restricted Windows | Exit 1: `spawn EPERM`; not a source failure or pass. |
| Same focused command | Normal Windows | First diagnostic 7/8 passed; updated the existing host assertion for the explicit fill wrapper. Final exit 0, 8/8 passed. |
| `npm run test:repair -- --changes tmp/wsf20-r05-changes.json --preview` | Restricted Windows | Exit 0; 94 files selected, including explicit preserved `architect-browser`. |
| `npm run test:repair -- --changes tmp/wsf20-r05-changes.json` | Normal Windows | Exit 1; 89/94 files passed, 750 tests: 729 pass, 21 fail, zero skipped. Duration 601,356 ms; source remained stable for the run. |
| Profile-owned `npm run build` | Normal Windows | Exit 0; TypeScript, Vite and branding passed in 13,074 ms. Existing bundle-size advisory only. |
| Profile static owners | Normal Windows | Native product identity 4/4 and capability map 5/5 passed. |
| Focused command below after the test correction | Normal Windows, current production build | Exit 0; 128/128 passed, zero failed/skipped, 70,140 ms. |
| `node tmp/wsf20-r05-render.cjs` and `electron tmp/wsf20-r05-geometry.cjs` | Normal Windows, hidden synthetic Electron | Exit 0; all eight geometry/inspection states passed; eight screenshots reviewed. |
| `git diff --check` | Restricted Windows | Exit 0. |

Exact final focused command:

```text
node --test test/renderer/greenfield-shell-composition.test.cjs test/renderer/project-rail-presentation.test.cjs test/renderer/phase-map-presentation.test.cjs test/renderer/phase-interview-workspace.test.cjs test/renderer/phase-planning-workspace.test.cjs test/renderer/work-card-planning-workspace.test.cjs test/renderer/work-card-repair-workspace.test.cjs test/renderer/architect-browser-attachment-coordinator.test.cjs test/browser/architect-browser-handoff.test.cjs test/phase-planning/phase-planning-service.test.cjs test/workflow/workflow-application-service.test.cjs test/agent-harness/reserved-toolbox-namespace.test.cjs test/validation/capability-map.test.cjs
```

Focused receipts: composition 8, Project Planning/rail 27, Phase Map 10, Phase Interview 2, Phase Planning renderer 2, Work Card Planning 2, Repair renderer 3, Architect attachment 19, native-browser service 10, Phase Planning/navigation service 10, Workflow application 27, candidate ingress 3 and static capability map 5. R03 generation/reattachment/session-reuse tests passed. Profile receipt: `tmp/wsf20-r05-receipt.json`, run `b3205754-c866-49bc-a1c8-cfe9d3194382`. Final focused output: `tmp/wsf20-r05-focused.log`.

The initial profile found an obsolete raw-source assertion in the Project Planning/rail owner that read retired StructuredArchitectWorkspace and expected a literal serialization spelling. Replaced that assertion in its existing test with a semantic check that the actually composed GreenfieldArchitectWorkspace submits the exact SQL review version before canonical refresh. The final focused command passes that entire owner. This test-only correction does not require a new production build; the failed broader profile is not reclassified as passed.

Four broader failing files remain outside this renderer repair and match categories already documented in the R04 report:

- `test/agent-harness/repository-io-hardening.test.cjs`: 1 failure; workspace-only Git status returns false instead of true.
- `test/project-state/execution-completion.test.cjs`: 6 failures; unavailable deterministic ValidationCatalog proof for source-neutral workflows.
- `test/source-control/managed-project-source.test.cjs`: 7 failures; candidate Git preparation and related expected-error mismatches.
- `test/source-control/workflow-integration-service.test.cjs`: 6 failures; integration results are failed instead of integrated.

No runtime/domain/source-control changes were made to address those failures. R04 records representative baseline diagnostics; this pass does not claim a new full diagnosis or a clean broader qualification. A separate scoped follow-up remains appropriate.

A temporary change-set helper using Node to spawn Git also encountered restricted `spawnSync git EPERM`; generated the change set with PowerShell instead. Restricted process inventory was denied; normal Windows inspection succeeded. Neither diagnostic was counted as a pass. Temporary output and harness files remain ignored. No packaging/release qualification or live Operator acceptance was claimed.

## Checkpoint and Operator audit

Required checkpoint: `WSF20-R05 stabilize inspection shells and approval progression`. Hash pending creation; the final response records the actual hash without amending solely to insert it into this report. No push.

Exact staged implementation/report review and bounded added-line scans cover credential/private-key signatures, concrete machine/home paths and generated/dependency artifacts. Only the 18 attributable source/test files and this report are eligible for the checkpoint; no pre-existing untracked documentation or temporary evidence is included. Final exact 19-file staged-scope check, bounded secret/local-path/generated-artifact scan and `git diff --cached --check` all passed.

Remaining Operator audit: continue the existing live Greenfield project without rebuilding its SQL state. Approve current Project Planning and confirm actionable Phase Map opens immediately; inspect Architect Interview and Project Intake; verify the same embedded ChatGPT conversation and positive bounds; repeat inspection/Resume at least three times; confirm Resume returns to Phase Map; approve Phase Map and confirm Phase Interview. Synthetic geometry and service tests do not substitute for live visual/session acceptance. The live project and browser were not restarted or mutated by the validation harness. Stop after checkpoint for this audit as directed by the card.
