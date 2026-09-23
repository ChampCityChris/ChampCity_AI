# SCL01 — Establish Semantic Source-Control Lifecycle Contracts

**Depends on:** none  
**Governing architecture:** `docs/architecture/CHAMPCITY_AGENT_FREE_SOURCE_CONTROL_LIFECYCLE_ARCHITECTURE.md`  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01_IMPLEMENTER_REPORT.md`

## Verified Evidence

Current bounded Git mechanics live under `src/main/agentHarness/repository/`; `src/main/sourceControl/sourceControlService.ts` already wraps many mechanics but still exposes provider/Git-shaped operations. Current WIR consumers directly depend on `createWorkIntakeBranchService` and current-checkout verification.

## Objective

Introduce the semantic application boundary required by the package without rewriting working bounded Git primitives.

## Required Changes

1. Define provider-neutral contracts for Work Intake SourceLine preparation, source readiness, implementation/disposition checkpoints, integration target identity, and Source Graph queries.
2. Introduce/extend an application RepositoryService/source-control façade whose workflow-facing operations are semantic rather than command-shaped.
3. Map existing bounded Git operations behind the façade where capabilities already exist.
4. Return deterministic receipts/errors suitable for workflow persistence and recovery.
5. Preserve compatibility APIs for existing callers until later cards migrate them.

## Constraints

- No Work Intake behavior change yet.
- No renderer changes.
- No new approval/permission layer.
- No general worktree orchestration.
- Do not delete low-level Git tools required for diagnostics/MCP compatibility.

## Acceptance Criteria

- Workflow code can request exact revision resolution and SourceLine creation without expressing Git commands.
- Contracts represent source readiness separately from Work Intake semantic state.
- Contracts include optional checkout identity for future concurrency without requiring it now.
- Existing bounded Git behavior remains available.

## Validation

Use validation planner preview/work-item profile for changed paths and focused source-control contract/service tests. Reuse/extend existing tests where they own the behavior; justify any new permanent test.

## Post-Implementation

Write the report, create the single SCL01 checkpoint commit, then continue to SCL01A.
