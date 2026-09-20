# WIR01 Implementer Report

## Outcome

Work Card **WIR01 — Establish Work Route Contracts and Registry** is implemented and its focused acceptance checks pass. No Operator manual validation is required for this contract-only card. Checkpoint hash is pending the single harness-managed commit containing this report; the execution response records the resulting hash without amending this report.

## Baseline and dependencies

- Verified the selected working directory and Git top-level are the approved `ChampCity_AI` repository (`<PROJECT_REPO>`).
- All 23 indexed Work Card paths existed before implementation. Only WIR01 was read; no future card was loaded.
- Initial branch: `dev`, at `fcb50885a9487226e2cb4f8c2a913fb0a33c31f4` (`Establish Work Intake routing and validation governance baseline`). The working tree and index were clean. WC02/governance material was already committed in that baseline and was preserved.
- `origin` was configured. Local `dev` was one commit ahead and zero behind the locally recorded `origin/dev`. No fetch or remote synchronization was performed; this is local tracking evidence.
- The ChampCity execution harness independently returned the same repository head and branch. Its `git_toolbox.prepare_branch` created and selected `codex/work-intake-routing` at that exact head. This implementation branch has no upstream.
- Governing architecture SHA-256 matched WIR01: `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`. No material contradiction was found.
- WIR01 has no dependency cards or reports. Current Workflow Hub and Project Intake contracts matched the card's starting evidence.
- Read the repository contract, code/test/migration boundary, validation lanes, and Work/Repair Card creation standard before implementation and validation.

## Attributable files

Created:

- `src/shared/workIntakeRoutingContracts.ts`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR01_IMPLEMENTER_REPORT.md`

Modified:

- `test/renderer/workflow-hub-shell.test.cjs`

Deleted: none.

Intentionally not created or changed: persistence, IPC/preload APIs, renderer navigation, planning orchestration, product Git mechanics, topology implementation, dependencies, migrations, capability-map metadata, and the existing Workflow Hub/Project Intake production contracts. Build output remains ignored and is excluded from the checkpoint.

## Implementation and acceptance evidence

- A dependency-free runtime registry exposes exactly the seven canonical Work Route IDs in stable order, with immutable labels, descriptions, and assessment-kind metadata. Issue Resolution is explicitly RCA-first. Unknown values, maintenance, Workflow IDs, topology names, and inherited object-property names receive no profile or inferred fallback.
- Composable trait IDs match the adopted architecture. Traits do not choose the primary route or topology.
- Architect advice and Operator route decisions have different discriminants and payloads. A request for revision cannot contain a selected route. Selected routing state requires an Operator selection.
- Reroute recommendation and supersession contracts retain the same Intake identity, reference prior/replacement routes and decisions, and identify downstream artifact revisions. Recommendations retain the current selection until an Operator decision; this card implements no state-transition machinery.
- Evidence uses the existing shared `SourceRevision` contract via a type-only import. The module has no Electron, filesystem, Workflow Hub, or runtime planning dependency.
- The existing registry proof now exercises all seven routes, deterministic ordering, immutability, strict lookup, and independence from existing Workflow Hub entries. Existing shell and Project Intake assertions remain intact.
- An in-memory TypeScript consumer probe accepted a same-Intake reroute and rejected advisory-as-selection, revision-with-selection, and route-as-WorkflowId assignments. No probe file was persisted.

## Validation commands and lanes

| Command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows shell, installed local toolchain | Exit 0 |
| `npm run build` | Restricted Windows shell | Exit 1: Vite/esbuild `spawn EPERM`; environmental failure, not a source failure or pass |
| `npm run build` | Approved normal Windows shell | Exit 0; TypeScript, Vite renderer, and branding copy completed |
| `node --test --test-concurrency=1 test/renderer/workflow-hub-shell.test.cjs test/project-intake/project-intake-service.test.cjs` | Approved normal Windows shell | Exit 0; 12 passed, 0 failed, 0 skipped |
| In-memory TypeScript consumer probe (`@'…'@ \| node`, source below) | Restricted Windows shell | Exit 0; all expected type rejections observed |
| `git diff --check` | Read-only restricted Windows shell | Exit 0 |

Static/build evidence and focused capability/service/renderer evidence are separate. No launch smoke or external integration proof is claimed. Full regression was skipped as directed: WIR23 owns that run. Packaging was out of scope.

Test categories:

- Reused unchanged: Project Intake service suite and all existing shell/renderer behavior assertions.
- Modified/extended: the existing Workflow Hub registry test at the shared registry boundary; added Work Route independence and strict lookup assertions without adding a test case.
- Consolidated: none.
- Retired: none.
- New permanent tests: none. Inspected both existing suites and their `validation/capability-map.json` entries before choosing extension. The map was not changed or broadened.

## Source control and safety

Intended checkpoint message: `WIR01: Establish Work Route Contracts and Registry`.

The attributable checkpoint set is exactly the three files listed above. Source-control mutations use only the supplied ChampCity `git_toolbox`: branch preparation, bounded staging, and the single checkpoint commit. Shell Git commands are read-only inspection. No merge, rebase, push, tag, release, publication, or rewrite is performed.

The exact staged diff was inspected and `git diff --cached --check` passed. The authored changes contain no secrets, concrete local-machine paths, generated artifacts, dependency state, or archive imports. Durable paths are repository-relative or use `<PROJECT_REPO>`. The harness `git_toolbox.pre_commit_scan` succeeded and reported only eight existing branding PNGs under `assets/branding/png/`; none is changed or staged by WIR01. No finding applies to this card's staged set. The final staged report is re-inspected before committing.

## Residual risks and next action

No remaining WIR01 blocker or manual acceptance. Contracts establish representation only; future cards own persistence, freshness enforcement, route-transition validation, planning, UI, and Git lifecycle behavior. No such behavior is claimed by this report.

Next action: verify the single WIR01 harness checkpoint and a clean working tree, then read WIR02 and this dependency report. Do not begin the service/browser refactor.

## In-memory compiler probe

The following JavaScript was passed directly to `node` using a PowerShell single-quoted here-string; it created no filesystem artifact:

```javascript
const ts = require('typescript');
const path = require('node:path');
const file = path.resolve('src/shared/__wir01_contract_probe.ts');
const source = `
import type { ArchitectRouteAssessment, OperatorRouteDecision, OperatorRouteSelection, WorkRouteRerouteRecommendation, WorkRouteState, WorkRouteId } from './workIntakeRoutingContracts';
import type { WorkflowId } from './workflowHubContracts';
declare const advisory: ArchitectRouteAssessment;
declare const selection: OperatorRouteSelection;
const selected: WorkRouteState = { state: 'selected', selection };
// @ts-expect-error Architect advice cannot activate a route.
const invalidSelection: OperatorRouteSelection = advisory;
// @ts-expect-error A revision request cannot select a route.
const invalidRevision: OperatorRouteDecision = { kind: 'operator-route-decision', decisionId: 'decision-1', intakeId: 'intake-1', assessmentId: 'assessment-1', sourceAssessment: { path: 'routing/assessment.md', revision: 1 }, rationale: 'Review evidence', disposition: 'request-revision', selectedRouteId: 'feature-change' };
// @ts-expect-error Work routes are not execution WorkflowIds.
const invalidWorkflow: WorkflowId = 'refactor-migration' as WorkRouteId;
const reroute: WorkRouteRerouteRecommendation = { kind: 'architect-reroute-recommendation', recommendationId: 'reroute-1', intakeId: selection.intakeId, sourceIntake: { path: 'routing/intake.md', revision: 1 }, sourceEvidence: [], priorDecisionId: selection.decisionId, priorRouteId: selection.selectedRouteId, replacementRouteId: 'refactor-migration', rationale: 'Current evidence shows a transformation.' };
const pending: WorkRouteState = { state: 'reroute-recommended', selection, recommendation: reroute };
`;
const options = { strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS };
const host = ts.createCompilerHost(options);
const getSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (name, languageVersion, onError) => path.resolve(name) === file ? ts.createSourceFile(name, source, languageVersion, true) : getSourceFile(name, languageVersion, onError);
const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([file], options, host));
if (diagnostics.length) { console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host)); process.exitCode = 1; }
else console.log('WIR01 type probe passed: advice/decision separation, revision without selection, route/workflow independence, stable Intake reroute.');
```
