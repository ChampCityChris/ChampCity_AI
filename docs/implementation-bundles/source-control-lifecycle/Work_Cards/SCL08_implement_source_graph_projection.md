# SCL08 — Implement Provider-Neutral Source Graph Projection

**Depends on:** SCL07  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL08_IMPLEMENTER_REPORT.md`

## Objective

Expose repository topology and ChampCity workflow meaning through one read-only semantic graph query for the future/current client.

## Required Changes

1. Add `getSourceGraph(repositoryId, options?)` (or equivalent) to the RepositoryService/client contract boundary.
2. Return bounded SourceLines, SourceRevisions, parent relationships, branch heads, integration targets, and provider diagnostics needed for rendering.
3. Enrich graph nodes/lines with Work Intake/workflow metadata: title, route/type, lifecycle state, checkpoint kind, integration state.
4. Include stable identifiers; do not make display labels or raw branch names primary keys.
5. Bound history depth/result size and provide deterministic truncation metadata.
6. Keep graph assembly in backend/service code; renderer must not parse Git command output.

## Constraints

- Read-only.
- No branch mutation API added for visualization.
- No requirement for active worktrees.
- Provider-specific raw fields remain optional diagnostics.

## Acceptance Criteria

- A repository with `main`, `dev`, one feature branch, and two hotfix branches produces a coherent graph with semantic bindings.
- Merged/integrated history is represented correctly.
- Missing workflow metadata does not invalidate mechanical topology.
- Result bounds/truncation are explicit.

## Validation

Graph contract/service fixtures covering branching and merge ancestry plus planner work-item validation.

## Post-Implementation

Report + checkpoint commit; continue to SCL09.
