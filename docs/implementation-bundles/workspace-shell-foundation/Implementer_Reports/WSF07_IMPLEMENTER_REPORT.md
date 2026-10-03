# WSF07 Implementer Report

Work Card WSF07; approved Dev root verified, branch dev at WSF06 c397ddc, configured origin retained. No fetch/push/release.

Inspected App.tsx@965536de265a4d494503f2173daddc5e81982a88 project-close FigmaActionWorkspace composition and its controls. Created distinct ProjectCloseShell.tsx and ProjectCloseWorkspace.tsx; no generic consolidation. Preserved information/action/document card geometry, label/control order, bounded scrolling, disposition, Close/Do Not Close, rationale and preview. Three controls add accessible names. Existing CSS suffices. Adapter-supplied SQL evidence, Refresh/export/integration and Return to Workflows occupy typed slots. Viewing performs reads only; creation and exact-version review are independent. Return is enabled only after reviewed closure; owning Project is not mutated by this adapter. No direct close, domain/schema, other-family or global composition changes.

Validation, normal Windows lane after the previously recorded sandbox spawn EPERM:
- node tmp/wsf07-parity.cjs: exit 0, eight exact historical Project Close markup comparisons, normalizing only added accessible names.
- node --test test/renderer/project-close-workspace.test.cjs: exit 0, 2/2. Tests cover geometry/order, supplied disabled controls, exact candidate/review ports, stale/closed/foreign state, no direct close and final return callback. A distinct absent workspace/adapter boundary justified this new file; existing SQL proof from WSF05A supplies underlying lifecycle evidence.
- npm run test:affected -- --changes tmp/wsf07-changes.json: exit 1, receipt 398ea3b3-98dc-444a-9195-cff628dbd4b9, 188162 ms. Owned production build passed, source stable. Only failure: previously documented unchanged StructuredArchitectWorkspace source-expression assertion in project-rail-presentation.test.cjs. New shell/adapter and capability metadata proof pass; no all-green claim.

Created the two renderer files, test/renderer/project-close-workspace.test.cjs and this report; updated validation/capability-map.json. No deletions, dependencies, migrations, generated artifacts or Markdown authority. Unrelated untracked bundle inputs preserved.

Checkpoint pending: WSF07 recover project close shell. Inspect exact staged diff and bounded secrets/local-path/generated-artifact scan before commit. Operator visual/native/scroll/responsive acceptance remains WSF20; no new stop condition. Next WSF08.
