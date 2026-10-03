# WSF01 Implementer Report

Verified repository root: `Dev/`, primary checkout, `dev`; starting HEAD `0e9c0620e12eb35358edb6a85b11270ed3825849`. Origin configured; no fetch/push. Work Card WSF01.

Historical evidence: `965536de:src/renderer/app/NestedWorkflowRail.tsx`, its App composition, `ContextLoopBar.tsx`, `styles.css`, and historical rail characterization. Created `NestedWorkflowRailShell.tsx` and `GreenfieldNestedWorkflowRail.tsx` under `src/renderer/app/`; extended existing `test/renderer/project-rail-presentation.test.cjs`; created this report. No files deleted. Intentionally no CSS change: rail CSS survives unchanged; ContextLoopBar is byte-identical to baseline. Bundle inputs remain unstaged.

Copied historical JSX, classes, control order, selection/status display, accessibility and loop placement. Typed presentation props isolate the shell from authority. Adapter preserves historical projection; minimal harness accepts current constrained `getGreenfieldNavigation`, verifies Workflow identity, and binds SQL Phase/WorkItem IDs and required stage. No writes, stage advancement, domain/schema changes, Markdown authority, other-family changes or composition changes. WSF20 owns live composition.

Parity: all 342 historical/current static markup comparisons passed (18 viewed workspaces × 19 required-stage states). Four focused tests cover hierarchy, exact callbacks, current/required distinction, SQL harness identity and supplied disabled actions. No markup difference observed; retained responsive/scroll styles still require final experiential audit.

## Validation

- Restricted Windows `npm run build`: exit 1, Vite/esbuild spawn EPERM after TypeScript passed; recorded once.
- Normal Windows `npm run build`: exit 0, TypeScript/renderer/assets passed.
- Normal Windows `node --test test/renderer/project-rail-presentation.test.cjs`: exit 1, 19/20 passed. Existing Architect source assertion expects inline `expectedRecordVersion: model!.review!.recordVersion`; starting-head code uses ReviewDecisionPanel's typed prop. Left untouched outside WSF01 scope.
- Normal Windows `node --test --test-name-pattern='recovered' test/renderer/project-rail-presentation.test.cjs`: exit 0, 4/4 passed.
- Normal Windows `node tmp/wsf01-parity.cjs`: exit 0, 342 comparisons. Temporary diagnostic corrected for a Module initialization error before passing; not committed.
- Normal Windows `npm run test:affected -- --changes tmp/wsf01-changes.json`: exit 1; run `cb30fe80-c121-40d0-98e2-53ed7b64b79d`. Production build passed; only failed file is the same existing Architect assertion. No broad qualification pass claimed.
- `git diff --check`: exit 0. Exact staged diff and bounded secret/local-path/generated-artifact scans performed before checkpoint; no findings.

Checkpoint required: `WSF01 recover nested lifecycle navigation rail shell`; commit hash pending until commit, recorded externally without amend. No push.

No stop condition encountered. No launch, external integration or visual acceptance claimed. Existing Architect assertion is a residual validation limitation. Next: WSF02 immediately. Operator Greenfield visual/experiential audit remains at WSF20.
