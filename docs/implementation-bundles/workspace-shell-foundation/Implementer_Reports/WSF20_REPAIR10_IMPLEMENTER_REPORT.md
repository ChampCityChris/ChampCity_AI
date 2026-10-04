# WSF20-REPAIR10 Implementer Report

Date: 2026-10-04

## Scope and repository

Operator-approved Repair Card WSF20-REPAIR10, parent WSF20, defect WSF20-D28. Verified the approved primary Git root is `Dev/`, branch `dev`, starting HEAD `1f27c8d6ea4d459586e828985f3097e4b20dfb6f`, matching the card baseline. Remote `origin` is ChampCityChris/ChampCity_AI; before checkpoint local `dev` is 320 commits ahead and zero behind locally recorded `origin/dev`. No fetch or push. Pre-existing untracked bundle/card/audit documents are preserved and excluded from this checkpoint.

## Implementation

`WorkCardMapWorkspace` loads exact Phase Planning and Workflow Execution only. Removed the Phase Validation call and its adapter parameter/type import. No validation exception is caught or ignored to manufacture success. The workspace rejects returned Planning Workflow/Phase identities that differ from the request; the adapter rejects Workflow mismatch, a non-planning stage, or a Phase absent from the execution plan.

The adapter filters execution items by `planning.phase.id`. Completion is exactly `items.length > 0 && items.every(item => item.record.body.workState === "closed")`. An approved current plan becomes `all-complete` only under that condition, exposing Phase Validation navigation. Zero items or any non-closed item remains `ready`; planning-review problems retain `needs-attention`.

Candidate order, execution dependency IDs, Complete/Eligible/Ineligible semantics, active Work Card continuation, and unrelated-candidate blocking remain intact. Begin Planning invokes presentation navigation only. Candidates are never reconstructed from generated Markdown.

The shell now shows a loading/current-state message for a null projection without an error. A load error retains the existing error presentation and suppresses the empty message. The true empty message requires a successfully loaded `ready` projection with zero candidates. No new durable or SQL state was introduced; existing renderer-local projection/error state is sufficient.

Phase Validation services, aggregate evidence/source revision checks, completion eligibility, canonical navigation authority, schemas, and browser/MCP/prompt behavior are unchanged.

## Focused evidence

Extended the existing Work Card Map owner to prove the real workspace effect never invokes a rejecting Phase Validation API, renders candidates from Planning/Execution, guards candidate and Phase Validation navigation, distinguishes pending/failure/successful-empty states, and rejects request identity mismatches. Existing adapter proof preserves peer-Phase exclusion, dependency/status mapping and active continuation; completion now uses actual closed WorkItems. Additional non-closed-state cases and exact Phase/stage rejection are covered. No new test owner was created.

Extended the existing SQL Phase Planning service/navigation owner with a real SQLite source-binding fixture: an active binding in `preparing` state makes production `getPhaseValidationProjection()` reject with `Phase aggregate evidence source candidate is not current.` The exact approved Phase Planning and production execution projection remain readable. The adapter plus actual map shell renders both SQL candidates and remains `ready`, with no false-empty message. This source-binding regression is deterministic integration evidence; it does not claim live-project visual acceptance.

## File inventory

Modified:
- `src/renderer/app/WorkCardMapWorkspace.tsx`
- `src/renderer/app/WorkCardMapShell.tsx`
- `test/renderer/work-card-map-workspace.test.cjs`
- `test/phase-planning/phase-planning-service.test.cjs`

Created: this report at `docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR10_IMPLEMENTER_REPORT.md`.

No files deleted. No dependencies, migrations, domain/schema changes, fake candidates, additional test owners, or unrelated D05-D08 changes. Temporary validation inputs/logs and build output remain ignored and are excluded from the commit.

## Validation receipts

| Command | Lane | Result |
| --- | --- | --- |
| `npm run test:repair -- --changes tmp/wsf20-r10-changes.json --preview` | Restricted Windows, plan only | Exit 0; four changed paths plus preserved renderer navigation and workflow application capabilities; 88 files selected. |
| `node --test test/renderer/work-card-map-workspace.test.cjs` | Restricted Windows | Exit 1, `spawn EPERM`; not a source failure or pass. |
| `npm run test:repair -- --changes tmp/wsf20-r10-changes.json` | Restricted Windows | Exit 1; redirected intermediate receipt was replaced by the normal-lane receipt and is not retained. Not counted as a pass; equivalent profile rerun in normal Windows after observed Node sandbox `spawn EPERM`. |
| Same composed repair command | Normal Windows | Exit 1; build and static owners passed; 84/88 files passed. Completed owners reported 649/668 tests passed, 19 failed; one additional owner timed out without final counts. |
| `node --test --test-concurrency=1 test/renderer/work-card-map-workspace.test.cjs test/renderer/greenfield-shell-composition.test.cjs test/renderer/phase-planning-workspace.test.cjs test/phase-planning/phase-planning-service.test.cjs test/workflow/workflow-execution-application-service.test.cjs` | Normal Windows, current profile-owned build | Exit 0; 64/64 passed, 100,607 ms. Started while broader unrelated owners remained active. |
| `node --test test/renderer/work-card-map-workspace.test.cjs` | Normal Windows | Exit 0; 7/7 passed, 271 ms. |
| `git diff --check` | Restricted Windows | Exit 0. |

Authoritative repair receipt: `tmp/wsf20-r10-receipt.json`, run ID `7409452d-ee13-4d49-a36c-7d6aa76d4802`. Profile-owned production build passed exit 0 in 18,246 ms (TypeScript, Vite, assets). Static native product identity and capability catalog owners passed. Source remained stable during execution. Total duration 922,288 ms exceeds the advisory repair budget; repository I/O hardening dominates.

Required owners passed inside the composed receipt as well: map 7/7; Greenfield composition/navigation 10/10; Phase Planning renderer 2/2; Phase Planning service/navigation 10/10; Workflow execution application 35/35.

Broader failures outside the modified surface:
- `test/agent-harness/repository-io-hardening.test.cjs`: ran 900,241 ms; bounded runner timeout after five reported passing subtests; final `execution-failed`, `temporary-resource-cleanup-failed`, no final test counts.
- `test/project-state/execution-completion.test.cjs`: 6 failures; source-neutral deterministic ValidationCatalog proof unavailable.
- `test/source-control/managed-project-source.test.cjs`: 7 failures; candidate repository Git preparation fails and prevents some injected-failure scenarios from reaching their intended branch.
- `test/source-control/workflow-integration-service.test.cjs`: 6 failures; source-backed vertical results are `failed` where fixtures expect `integrated`.

All four owners and their production main/shared services are unchanged from the baseline. Prior repair reporting also recorded failures in the first three owners, but this pass did not independently rerun an untouched baseline; these results are not claimed as independently established pre-existing failures. The overall profile remains red and requires separately scoped investigation. Focused passing proof does not imply release qualification.

Non-failing renderer-loader MaxListeners and Vite bundle-size warnings were observed. No packaging, full/release qualification, Electron launch, external integration acceptance, or live Greenfield interaction was performed; those are not claimed.

## Safety, checkpoint, and Operator audit

Exact attributable diff reviewed. Bounded credential, concrete local-path, generated-artifact and whitespace scans passed; the broad token pattern matched only the existing renderer generation-token comparison, which is not a credential. No secrets or concrete machine paths are persisted.

Checkpoint: `WSF20-R10 decouple Work Card Map from Phase Validation`. Hash pending until commit; deliver actual hash afterward without amending solely for this report's own hash. Stage only the four changed source/test files and this report. No push, merge or release action.

Stop after checkpoint for Operator audit. Remaining acceptance: continue the existing Greenfield project at Work Card Map, verify no `workflow:phaseValidation` error on load, inspect planned candidates/statuses, select the first eligible candidate, and verify Begin Planning becomes actionable. Verify Phase Validation is reached only after all exact Phase WorkItems close. No known blocker in the implemented map repair; broader profile failures remain open. Recommended next task: Operator audit of D28, then separately scoped investigation of the broader failing owners.
