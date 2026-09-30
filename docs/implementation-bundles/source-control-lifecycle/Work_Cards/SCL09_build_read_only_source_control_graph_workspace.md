# SCL09 — Build Read-Only Source Control Graph Workspace

**Depends on:** SCL08  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL09_IMPLEMENTER_REPORT.md`

## Objective

Add a first-class Source Control workspace/page that visualizes Git-provider topology as a ChampCity source graph rather than a raw Git console.

## Required Changes

1. Add normal product navigation to a Source Control workspace.
2. Render `main`, `dev`, active/completed Work Intake SourceLines, revisions, and integration relationships as a legible branch/commit graph.
3. Prefer semantic labels such as Work Intake title/type/status; expose branch name/hash/provider details in a details/diagnostic panel.
4. Allow selection of a branch/Work Intake/revision and show bounded details: base revision, current revision, checkpoints, integration state, changed-file summary where available.
5. Visually distinguish active, completed/integrated, and target lines without encoding authority in color alone.
6. Support horizontal/local graph scrolling or responsive reflow without making the application page globally unusable.
7. Follow `CCAI-UI-001` and existing ChampCity UI patterns.

## Constraints

- Read-only graph.
- No drag-to-merge, force/reset/rebase, staging, arbitrary branch creation/deletion, or worktree controls.
- Do not duplicate Git parsing in renderer.
- Do not redesign WIR routed workflow screens owned by the separate UI repair package.

## Acceptance Criteria

- Operator can visually understand one feature plus two hotfix branches against `dev`.
- Integrated branches visibly rejoin/terminate at the target chronology.
- Semantic labels are primary; raw Git detail remains inspectable.
- Keyboard/touch selection and responsive layout are usable.

## Validation

Focused renderer/component contract tests, UI governance checks, and bounded running-UI/screenshot inspection at supported desktop sizes plus planner work-item validation. Operator dogfooding may occur after the package, but it is not a prerequisite to continue to SCL10.

## Post-Implementation

Report + checkpoint commit; continue to SCL10.
