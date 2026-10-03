# WSF10 Implementer Report

Work Card WSF10; approved Dev root verified, dev branch at WSF09 9a1eadf, configured origin retained. No fetch/push/release.

Inspected WorkCardMapWorkspace.tsx and test/renderer/work-card-map-workspace.test.cjs at 965536de265a4d494503f2173daddc5e81982a88. Restored the exact dual-pane candidate list/document viewer composition as WorkCardMapShell.tsx. Removed model authority, readiness calculation and clipboard side effect from the shell into typed props/callbacks. Selection remains presentation state. Historical classes, labels, active badge, action order, line rendering, metadata/footer, empty/error/complete states, disabled Open and scrolling are retained. Candidate display keys remain separate from canonical SQL callback identities. Existing CSS survives unchanged.

WorkCardMapWorkspace.tsx reads the approved SQL Phase Planning review, execution projection and exact Phase validation. It filters by canonical Phase, projects dependency/readiness/active state, and uses SQL workItemsClosed for Phase Validation navigation. Prepare/Continue are guarded supplied navigation callbacks, never direct lifecycle mutations. Async generation and request identity prevent stale Phase reuse. Generated project-state references replace filesystem authority; readable Work Card summaries come from typed SQL records.

Restored five deleted historical renderer scenarios unchanged in intent with fixture-supplied readiness, and added one exact SQL adapter scenario covering current dependencies, active continuation, peer exclusion, stale planning, identity rejection, completion and guarded navigation. This recovers the missing stable proof boundary; no redundant service tests added. Registered all six in validation/capability-map.json.

Validation, normal Windows lane after the previously recorded restricted spawn EPERM:
- node --test test/renderer/work-card-map-workspace.test.cjs: exit 0, 6/6.
- npm run test:affected -- --changes tmp/wsf10-changes.json: exit 1, receipt 360e7fb6-a589-401b-a11d-13d5f1c3aea0; owned build passed, source stable, 324 pass/1 fail. Sole failure remains the previously documented unchanged StructuredArchitectWorkspace source-expression assertion in project-rail-presentation.test.cjs. Map and static metadata proof pass; no all-green claim.
- Compared exact shell extraction diff against historical source; changes are typed ports, supplied readiness/action labels, display/canonical ID separation and clipboard callback.

Files created: two renderer files, restored renderer test and this report. Modified capability map. No deletion, SQL/domain/schema change, dependency, global composition change or other workflow-family work. Unrelated bundle inputs preserved.

Checkpoint pending: WSF10 recover work card map shell. Exact staged diff/whitespace and bounded secrets/local-path/generated-artifact scan precede commit. Native visual/scroll/responsive acceptance remains WSF20. No explicit stop condition; continue WSF11.
