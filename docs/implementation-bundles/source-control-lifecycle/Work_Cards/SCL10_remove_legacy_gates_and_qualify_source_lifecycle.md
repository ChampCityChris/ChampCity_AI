# SCL10 — Remove Legacy Gates and Qualify the Source Lifecycle

**Depends on:** SCL09  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL10_IMPLEMENTER_REPORT.md`

## Objective

Complete migration of the package-owned behavior, remove obsolete authority-gate paths, and prove the bounded end-to-end source lifecycle.

## Required Changes

1. Audit for remaining Work Intake admission checks tied to global checkout cleanliness/current branch.
2. Remove/deprecate package-owned legacy paths now superseded by semantic RepositoryService operations.
3. Verify no renderer performs direct Git/source-control mutation.
4. Verify normal workflow Git mechanics do not require agent participation.
5. Exercise end-to-end scenarios:
   - dirty primary checkout + new existing-project intake;
   - feature + two hotfix Work Intake branches;
   - implementation checkpoint before review;
   - Operator disposition checkpoint;
   - revision-request loop on same Work Intake line;
   - clean integration to `dev`;
   - conflict routed to Integration Repair;
   - Source Control graph showing the topology.
6. Record explicitly deferred general worktree/multi-agent execution scope.

## Constraints

- Do not add deferred worktree orchestration during qualification.
- Do not broaden into web-client/Service Host cutover.
- Do not make unrelated test debt a package failure; route unrelated failures to their owners.

## Acceptance Criteria

- No dirty-tree admission authority gate remains in Work Intake.
- No normal workflow requires an agent to operate Git.
- Exact revisions back implementation/review/integration.
- Source graph accurately reflects package scenarios.
- Deferred multi-agent/worktree scope is documented and no hidden dependency on it remains.

## Validation

Use phase/package-appropriate validation planner profile for the exact package changed paths and affected capabilities. Run only explicitly justified broader qualification lanes. Record unrelated/pre-existing failures separately.

## Post-Implementation

Write the final report and package checkpoint. Stop only after SCL10 is complete and return the complete package for final Architect/Operator review. There is no per-card review requirement. If implementation was executed directly on `dev`, no additional branch-integration action is implied by this final review; if executed on another SourceLine, do not advance `dev` until the final package disposition.
