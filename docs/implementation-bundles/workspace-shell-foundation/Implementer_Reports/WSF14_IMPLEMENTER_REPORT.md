# WSF14 Implementer Report

Work Card WSF14. Verified approved Dev root; dev at WSF13 887e61c, configured origin retained. No fetch/push/release.

Inspected App.tsx@965536de265a4d494503f2173daddc5e81982a88 work-card-planning Architect document/review/browser branch and retained workCardPlanPresentation.tsx. Created distinct WorkCardPlanningShell.tsx with historical pane geometry, focus target, browser-hidden class, review/disposition, handoff/revision actions and control order. Existing primitives and CSS suffice; Formal Work Card content uses FigmaDocumentCard, with generated artifact type preventing legacy metadata interpretation. No shared generic workspace substituted.

WorkCardPlanningWorkspace.tsx binds getStructuredWorkItemPlanning/reviewStructuredWorkItemPlanning to exact Project Creation Workflow and WorkItem identities. Generated SQL Formal Work Card projection includes contract and Criteria. Current WorkItem recordVersion is sent for review; contractRevision identifies projected content. New revisions reset pending disposition selection. Foreign identities/workflow types and missing contracts disable review. Prepare/Refresh read typed model output; WSF03A workflow_toolbox ingress supplies candidates. No raw JSON editor, authoritative Markdown import, or decomposition redesign. Browser export is an explicit adapter callback. Continue is a supplied navigation action.

Added two tests for the previously absent distinct Work Card Planning shell/adapter. They compare recovered document/review/browser wrapper markup with visible/hidden browser, preserve handoff order, and prove repeated exact WorkItems, current review version, Refresh exposing new output, reset disposition and foreign-context rejection. Registered capability ownership. Existing work-card-plan-presentation tests remain unchanged and are selected by affected validation.

Validation, normal Windows lane after recorded sandbox spawn EPERM:
- node --test test/renderer/work-card-planning-workspace.test.cjs: exit 0, 2/2.
- npm run test:affected -- --changes tmp/wsf14-changes.json: exit 1, receipt 46ded6ce-0824-4398-9ab4-e570d1500db1, 189156 ms; build passed, source stable, 334 pass/1 fail. Sole failure remains the previously documented unchanged StructuredArchitectWorkspace source-expression assertion in project-rail-presentation.test.cjs. New and retained owned proof passes; no all-green claim.

Created two renderer sources, test and this report; modified capability map. No deletion, domain/schema/dependency change, other workflow work, or global composition edit. Generated project-state references replace historical paths. Unrelated inputs preserved. Checkpoint pending: WSF14 recover work card planning shell. Exact staged diff, whitespace and bounded safety scan precede commit. Native visual/scroll/responsive acceptance remains WSF20. No stop condition within WSF14; next WSF15.
