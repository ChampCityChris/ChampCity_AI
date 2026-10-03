# WSF04 Implementer Report

Work Card WSF04; branch dev; no fetch/push/release. Checkpoint pending: `WSF04 recover project planning review shell`. WSF03A checkpoint `97e22ea` supplies the previously missing ingress; the earlier WSF04 STOP report is superseded by this completed implementation.

## Historical recovery and implementation

Inspected `src/renderer/app/App.tsx@965536de265a4d494503f2173daddc5e81982a88`: ProjectPlanningBlockerBanner, FigmaArchitectReviewPanel, FigmaBrowserActionsPanel and the isVisibleArchitectOutputWorkspace document/browser composition. Restored five historical banner/evidence/disclosure characterization tests from `test/renderer/project-planning-blocker-banner.test.cjs` into the existing project rail presentation owner, then added two recovered-shell/SQL-adapter scenarios. No new test file or duplicate owner was created.

Created ProjectPlanningReviewShell.tsx as a typed presentation container, with exact historical blocker, document-before-disposition-before-browser placement, chat-hidden behavior, surface focus/ref, action order and revision labels. The shell has no runtime/SQL calls, workflow branching, Markdown parsing or lifecycle authority. Browser action JSX is separately recovered for this shell; no new multi-stage abstraction was introduced.

StructuredProjectPlanningWorkspace now supplies generated SQL Profile/Roadmap documents, exact cycle/version disposition, current evidence references, handoff/Refresh/browser callbacks and readiness. The adapter tracks viewing of both current revision slots before enabling approval, resetting viewing on a new cycle/version. SQL read failures and stale reviews present the blocker and disable disposition. MCP handles candidate submission; the generic PlanReviewShell and candidate JSON textarea are no longer used by this adapter. Continue to Phase Map remains the supplied adapter callback; overall composition remains WSF20 scope.

Changed files: src/renderer/app/ProjectPlanningReviewShell.tsx (new); src/renderer/app/StructuredProjectPlanningWorkspace.tsx; test/renderer/project-rail-presentation.test.cjs; this report. No backend, schema, other workflow family, CSS, or historical source deletion. Existing historical CSS classes preserve scrolling/responsive geometry.

## Parity and validation

Normal Windows lane, following the bundle's previously recorded restricted spawn EPERM policy:

- `npm run build`: exit 0; final readiness change rebuilt successfully (TypeScript, Vite, assets).
- `node --test --test-name-pattern="Project Planning blocker|Project Planning evidence disclosure|recovered Project Planning" test/renderer/project-rail-presentation.test.cjs`: exit 0, 8/8, including the existing rail blocker scenario, five restored historical scenarios, shell/browser revision order and real SQL candidate/Refresh/disposition integration through a controlled preload/hook harness.
- `node tmp/wsf04-parity.cjs`: exit 0, six exact markup comparisons against the named historical blocker across not-ready/needs-attention/ready and zero/five evidence entries.
- `node tmp/wsf04-container-parity.cjs`: exit 0, four exact markup comparisons against the historical container, replacing only App-owned values/callbacks, with browser shown/hidden and disposition readiness true/false.
- Canonical planner/executor focused run: `node tmp/wsf04-focused.cjs`, explicit existing test owner plus the pattern above, exit 0; receipt `88dd0103-4a32-4aeb-823d-cacc6f2ba421`, owned production build passed and 8/8 tests passed. This is a focused composed receipt, not whole work-item qualification.
- `npm run validate:plan -- --profile work-item --changes tmp/wsf04-changes.json`: exit 0, 67-file broader affected preview. In accordance with the requested card-focused validation, executed the owned characterization/SQL scenarios through the canonical executor instead of repeating the already failed broader cross-family qualification from WSF03A. That failed 82-file receipt remains open and is not relabeled as passing.
- Exact staged diff/check and bounded secret/local-path/generated-artifact scan required before checkpoint.

## Visible differences and remaining audit

Document content, disposition and evidence come from current SQL projections, not historical Markdown. Profile/Roadmap filenames use stable display names rather than repository-specific historical artifact suffixes; evidence labels use exact SQL entity/revision references. The historical document/browser geometry and controls are preserved. Native ChatGPT/MCP interaction, full visual scroll/responsive parity and experiential acceptance remain the Operator WSF20 audit. No release qualification or Operator acceptance is claimed.

Earlier bundle report corrections: WSF01 and WSF03 staged checks emitted extra-blank-EOF warnings despite optimistic wording in their reports; current attributable files have a single terminal newline. The earlier WSF02 capability-map restricted attempt produced spawn EPERM before its later normal-lane 5/5 pass. No failing check is counted as a pass here.

No card stop condition remains for WSF04. Continue immediately to WSF05 after checkpoint.
