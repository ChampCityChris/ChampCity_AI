# Source-Control Lifecycle Implementation Package

**Package ID:** SCL  
**Architecture:** `docs/architecture/CHAMPCITY_AGENT_FREE_SOURCE_CONTROL_LIFECYCLE_ARCHITECTURE.md`  
**Structured-state architecture:** `docs/architecture/CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md` and `docs/architecture/CHAMPCITY_STRUCTURED_PROJECT_STATE_SQLITE_PERSISTENCE_ARCHITECTURE.md`  
**Planning origin:** `architecture/agent-free-source-control-lifecycle` managed worktree  
**Implementation baseline:** current committed `dev` after this architecture/package is integrated

## Objective

Replace the current Markdown/checkout-coupled workflow and Git behavior with:

- canonical Structured Project State backed by SQLite;
- Markdown rendered from machine-owned state rather than acting as workflow memory;
- agent-free RepositoryService source-control mechanics;
- Work Intake persistence independent of repository cleanliness;
- Work Intake SourceLines from exact `dev` revisions;
- Greenfield `main → dev → Work Intake SourceLine`;
- deterministic implementation/disposition checkpoints;
- deterministic integration;
- provider-neutral Source Graph projection and read-only visualization;
- a derived event seam for the later AI Memory system;
- a clean future path to per-Work-Intake worktrees/multi-agent execution without implementing that concurrency now.

## Architecture Sequencing Decision

Structured Project State is part of this package, inserted after the RepositoryService semantic boundary and before Work Intake/source-preparation behavior changes:

```text
SCL01
Repository/source-control semantic boundary
        ↓
SCL01A–SCL01Z
Structured Project State + SQLite + legacy cutover
        ↓
SCL02–SCL10
Work Intake source preparation, checkpoints, integration and Source Graph
```

There is no temporary Work Intake persistence adapter between Markdown and Structured Project State.

The SCL01Z provider and legacy-compatibility baseline is recorded in [Structured Project State qualification](STRUCTURED_STATE_QUALIFICATION.md).

## Execution Baseline Rule

This package is intended to be integrated into `dev` before implementation starts.

The Implementer begins SCL01 from the exact current committed `dev` revision and records that revision in the SCL01 report. If `dev` advances before SCL01 starts, use the newer committed baseline unless the new history introduces an actual architecture conflict.

## Execution Rules

- Execute every card sequentially: SCL01 → SCL01A…SCL01Z → SCL02…SCL10.
- One Implementer Report and one attributable checkpoint commit per card.
- Do not pause for Architect or Operator review between cards.
- After a card meets its acceptance criteria, its bounded validation passes, its report is written, and its checkpoint commit is verified, immediately start the next card.
- Package execution authorization covers the deterministic migration/cutover mechanics in SCL01T–SCL01Z when their gates pass; do not invent a second approval checkpoint.
- Escalate only genuine unresolved product/architecture decisions, unsupported runtime-binding failure, irreducible semantic migration ambiguity, or actions outside the approved package scope.
- Do not skip extension cards because later SCL cards compile; each card establishes state required by the next.
- Use the validation planner/work-item profile with exact changed paths and focused owned proof. Do not make the historical full suite a card-local default.
- Do not modify unrelated WIR UI repair work.
- Do not use agent prompts/shell instructions for routine Git mechanics implemented by this package.
- Do not introduce general multi-agent worktree orchestration.
- Do not create dual canonical authority between Markdown and Structured Project State.
- Existing architecture/governance/design Markdown remains source-controlled documentation and is not migrated into workflow state.

## Card Order

### Repository foundation

1. SCL01 — Establish semantic source-control lifecycle contracts and service boundary.

### Structured Project State insertion

2. SCL01A — Structured Project State domain contracts/type registry.
3. SCL01B — Relationship registry/domain invariants.
4. SCL01C — ProjectStateStore port/in-memory adapter.
5. SCL01D — ProjectStateService semantic boundary.
6. SCL01E — Qualify built-in Node SQLite binding.
7. SCL01F — SQLite schema/migration ledger.
8. SCL01G — SQLite transactions/optimistic concurrency.
9. SCL01H — Revision/history/supersession/lineage.
10. SCL01I — StateChange audit/transactional outbox.
11. SCL01J — Decisions/effective disposition.
12. SCL01K — Evidence/Validation/freshness.
13. SCL01L — Workflow/Phase/WorkItem/ImplementationRecord.
14. SCL01M — WorkIntake/RouteAssessment.
15. SCL01N — SourceBinding/SourceCheckpoint/IntegrationRecord.
16. SCL01O — RegressionObligation/Tester state.
17. SCL01P — Queries/derived current-state views.
18. SCL01Q — Markdown projections/structured export.
19. SCL01R — Authoritative context/Memory event feed.
20. SCL01S — SQLite backup/integrity/recovery.
21. SCL01T — Legacy Markdown authority inventory/snapshot.
22. SCL01U — Staged legacy importer.
23. SCL01V — Equivalence/shadow-read verification.
24. SCL01W — Project/Architect/Planning/WIR state migration.
25. SCL01X — Development/Issue/routed state migration.
26. SCL01Y — Provider-generation fence/atomic cutover.
27. SCL01Z — Retire Markdown authority/qualify structured state.

### Source lifecycle

28. SCL02 — Persist Work Intake before source preparation.
29. SCL03 — Create existing-project Work Intake SourceLines from exact `dev`.
30. SCL04 — Establish Greenfield `main` / `dev` / first Work Intake SourceLine.
31. SCL05 — Deterministic implementation/disposition checkpoint service.
32. SCL06 — Wire checkpoints across workflow boundaries.
33. SCL07 — Deterministic Work Intake integration into `dev`.
34. SCL08 — Provider-neutral Source Graph projection.
35. SCL09 — Read-only Source Control graph workspace.
36. SCL10 — Remove remaining legacy authority gates and qualify end-to-end source lifecycle.

## Completion Outcome

The package is complete when Structured Project State is the canonical machine-owned workflow memory, Markdown workflow artifacts are projections/exports, dirty primary checkout state cannot block Work Intake capture/branch creation, routine Git is agent-free, exact revisions back review/integration, and the Operator can inspect feature/hotfix topology through the Source Control graph.
