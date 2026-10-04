# WSF20-REPAIR08 Implementer Report

Date: 2026-10-04

## Scope and repository

- Operator-approved Repair Card: WSF20-REPAIR08, defect WSF20-D24.
- Verified Git root is the approved `Dev/` primary repository checkout; implementation ran there on `dev`.
- Starting HEAD matches the card baseline: `387a6120b32ae48f0ee35b3212955a7cabefda93`.
- `origin` remains the configured ChampCityChris/ChampCity_AI remote. Local `dev` was 317 commits ahead and zero behind the locally recorded `origin/dev`; no fetch or push was performed.
- Pre-existing untracked bundle/card/audit documentation was preserved and excluded from this checkpoint.

## Changed files

- Modified `src/renderer/app/GreenfieldWorkspace.tsx`.
- Modified `test/renderer/greenfield-shell-composition.test.cjs`.
- Created this Implementer Report.
- Deleted no files. Created no SQL/domain/schema, layout, browser, prompt, MCP, dependency, or disposition-panel changes; no permanent renderer current-stage store or workflow sidecars.
- Ignored temporary validation input and receipt log remain under `tmp/`; generated build output is excluded from the checkpoint.

## Canonical selection rule

`isCanonicalSelection` compares the resolved selection to the current `GreenfieldNavigationProjection`:

1. Stage must equal `navigation.currentWorkspace`.
2. Phase and Work Card stages must also match `navigation.currentPhaseId`.
3. Work Card stages must also match `navigation.currentWorkItemId`.
4. The Repair stage must additionally match `navigation.currentRepairId`.
5. Project stages need only exact stage equality; retained historical Phase/WorkItem presentation context does not change project-stage identity.

Stage-family checks determine which identity fields are relevant; SQL projection values determine canonicity. No rail labels, ordered stage comparisons, or fixed entity IDs determine the result.

`open()` resolves the requested destination using existing SQL-projected context, then clears ephemeral inspection only when this predicate succeeds. A non-canonical destination preserves active inspection. The same predicate supplies the rendered canonical/read-only decision. Existing alternate review/validation routing and eligible Work Card routing remain intact. Resume retains its sidebar action and rereads SQL through the existing resolver.

## Focused proof

The existing inspection/navigation owner now rejects its former sticky-canonical expectation and proves:

- Initial canonical selection is actionable; prior stage selection enters inspection.
- Project Planning inspection followed by Architect Interview remains inspection; returning to canonical Phase Map clears it and removes Resume.
- Exact canonical Phase and WorkItem contexts clear inspection; same-stage historical identities remain read-only.
- A mismatched Repair identity remains inspection and an exact Repair identity clears it.
- Project-stage equality clears inspection even with retained historical lifecycle context.
- Rail/context selection performs no SQL reads or writes; only Resume and existing action callbacks invoke the resolver.
- Existing Resume, workflow/unmount cleanup, terminal SQL gating, and alternate validation behavior remain covered.

Added a regression inside the same renderer test owner because the previous separate navigation and gating-adapter proofs did not connect canonical rail return to the actual disposition select. It exercises `GreenfieldWorkspace`, composed `StructuredPhaseMapWorkspace`, and the unchanged `FigmaDocumentDispositionPanel` with a ready synthetic review:

- Inspect completed Project Planning and rail-select canonical Phase Map.
- Composed Phase Map receives `readOnly=false`; Resume disappears.
- The actual disposition select is enabled; Apply remains disabled without a selection.
- Request Revision, Reject, and Approved can each be selected and enable Apply under existing readiness rules.
- During approval persistence the select and Apply are disabled; duplicate Apply invokes persistence once.
- Approval sends exact Workflow/cycle/version/outcome/notes to the existing API, waits for persistence, then calls the canonical SQL resolver once and selects its returned Phase identity/stage.

This is semantic renderer action proof with mocked preload APIs, not live Operator acceptance or a claim that this focused harness itself writes a real SQL database. Existing service/integration proof ran in the repair profile.

## Validation receipts

| Command | Execution lane | Result |
| --- | --- | --- |
| `npm run test:repair -- --changes tmp/wsf20-r08-changes.json --preview` | Restricted Windows, plan only | Exit 0; selected repair scope and preserved `renderer-navigation-and-presentation` capability. |
| `node --test test/renderer/greenfield-shell-composition.test.cjs` | Restricted Windows | Exit 1, `spawn EPERM`; recorded once and rerun in normal Windows. |
| `node --test test/renderer/greenfield-shell-composition.test.cjs` | Normal Windows | Initial exit 1: 9/10 passed; corrected the new test harness setter to retain its component's state array across async resolution. |
| `npm run test:repair -- --changes tmp/wsf20-r08-changes.json` | Normal Windows, composed repair profile | Exit 0, passed, 272/272 tests across 47 files; zero failures, skips, blocked or unavailable files. |
| `git diff --check` | Restricted Windows, static Git check | Exit 0. |

Authoritative local receipt: `tmp/wsf20-r08-validation.log`; run ID `34e8a663-9713-4ec4-a369-edffc9692e0c`. Source stayed stable during validation. Total duration: 20,308 ms, within the repair budget.

The composed profile owned one `npm run build` (TypeScript, Vite renderer, runtime assets): passed, exit 0, 13,107 ms. No duplicate typecheck/build was prepended. Lane results: static 9/9 tests in 2 files; fast 81/81 in 13; affected capability 135/135 in 20; integration 47/47 in 12. The focused Greenfield owner passed 10/10, including the corrected navigation test and new Phase Map regression.

Non-failing output included Vite's chunk-size advisory and a renderer test loader MaxListeners warning. Neither produced failed or incomplete proof. Packaging, release qualification, and launch smoke were not run because they are outside this repair's bounded proof.

## Safety, checkpoint, and remaining acceptance

Exact attributable staged diff is reviewed before checkpoint. Bounded scans cover credential-like content, concrete local-machine paths, generated/dependency artifacts, and whitespace errors. No secrets, concrete machine paths, or generated artifacts are included in the checkpoint.

Required checkpoint message: `WSF20-R08 exit inspection on canonical rail selection`. Commit hash is pending at report creation; the actual hash is delivered after commit without amending this report solely to insert its own hash. No push, merge, release, or unrelated Git changes are performed.

Stop after checkpoint for Operator audit. Remaining live acceptance on the existing test project: inspect Project Planning or Architect Interview, click Phase Map, verify Resume disappears, open disposition, choose Request Revision or Approved as appropriate, and confirm Apply follows review readiness. No live project approval was performed by the implementer. There are no implementation blockers; experiential acceptance remains with the Operator.
