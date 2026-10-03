# WSF05 Implementer Report

Work Card WSF05, branch dev; no fetch/push/release. Checkpoint pending: `WSF05 recover project phase map shell`.

## Historical source and extraction

Inspected `src/renderer/app/phaseMapPresentation.tsx@965536de265a4d494503f2173daddc5e81982a88` (FigmaPhaseMapWorkspace, PhaseMapDocumentPreview and count presentation) and App.tsx at the same commit (isPhaseMapFigmaWorkspace composition and browser/disposition controls). The surviving phaseMapPresentation file matches that baseline; it remains untouched for other consumers.

Created ProjectPhaseMapShell.tsx with the exact Phase Map workspace column/browser placement, focus/ref and chat-hidden structure. ProjectPhaseMapCards copies the proven card header, Copy/Open controls, compact phase list, expansion/active labels, counts, evidence, errors, empty state, scrolling classes and accessibility. Typed projections/counts replace Markdown metadata derivation. Local expansion is presentation state only. Separately recovered Phase Map browser action placement/order and revision labels; no generic multi-stage shell was introduced.

StructuredPhaseMapWorkspace now renders that shell using current SQL review phases, approved execution-plan WorkItem counts, exact navigation Phase identity mapped to its display key, generated review Markdown for Copy, exact cycle/version disposition and MCP handoff/Refresh. SQL Phase Map and navigation reads are sequential because both acquire SQLite transaction ownership. Candidate entry is exclusively the WSF03A ingress; generic WorkflowPlanningMap/PlanReviewShell and JSON candidate entry are removed from this adapter. Continue remains a supplied callback; WSF20 owns complete navigation composition.

Changed: new ProjectPhaseMapShell.tsx; StructuredPhaseMapWorkspace.tsx; existing test/renderer/phase-map-presentation.test.cjs; reviewed capability-map ownership/build/resource metadata and three primary recovery behaviors; this report. No SQL/domain/schema, other-family renderer, historical deletion or CSS change. Existing historical CSS preserves card/list scrolling and responsive behavior.

## Focused evidence and validation

Normal Windows lane under the previously recorded bundle spawn EPERM policy:

- `npm run build`: exit 0 for initial shell/adapter. Final sequential-read source rebuilt by the canonical focused executor below.
- `node --test test/renderer/phase-map-presentation.test.cjs`: final exit 0, 10/10. Seven historical characterization scenarios retained; three added scenarios cover typed-card exact markup parity (four combinations of active phase/count), expansion/browser layout and real SQL candidate/review/Refresh.
- Initial SQL adapter proof failed with Project State database busy. Increasing a test wait did not fix it; actual error evidence identified concurrent transaction-owning reads. Adapter reads were made sequential; final test verifies no error, approved disposition, exact current Phase and counts.
- Canonical `node tmp/wsf05-focused.cjs`: final exit 0, receipt `d1282d3c-511c-420a-b121-e49fcd680f8d`; owned current production build passed; 10/10 owned tests passed. The test owner now declares requiresBuild, subprocess and isolated temporary SQL fixture resources. Earlier resource metadata attempts were rejected by the strict schema before execution, corrected to bounded-child-process and temp-filesystem-isolated. The earlier no-build focused receipt is not final build evidence.
- `node --test test/validation/capability-map.test.cjs`: exit 0, 5/5, validates exact ownership, sorted vocabulary, primary proof relationships and resource declarations.
- `git diff --check`: exit 0. Exact staged diff plus secret/local-path/generated-artifact scan before checkpoint.

This is card-focused composed proof, not broader work-item/release qualification. WSF03A's failed cross-family affected receipt remains open; it is not relabeled as passing or rerun as unrelated recovery scope.

## Differences and remaining audit

Phase semantics/counts/readiness are SQL projections, not parsed historical Markdown. The generated document display uses PHASE_MAP.md rather than historical repository-specific suffixes. The shell's visible cards/control geometry matches the historical component. Copy supplies the complete SQL-generated map including acceptance direction; no generated text is parsed into authority. Existing legacy source-view characterization remains intact. Native embedded ChatGPT/MCP, visual/responsive/scroll experience and Operator Greenfield acceptance remain WSF20 audit work. Automated preload/hook proof is not an external integration observation.

No WSF05 stop condition remains. Continue immediately to WSF06 after checkpoint.
