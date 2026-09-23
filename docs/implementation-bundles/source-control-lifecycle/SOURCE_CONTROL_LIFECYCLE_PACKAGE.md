# Source-Control Lifecycle Implementation Package

**Package ID:** SCL  
**Architecture:** `docs/architecture/CHAMPCITY_AGENT_FREE_SOURCE_CONTROL_LIFECYCLE_ARCHITECTURE.md`  
**Baseline:** `dev` at `4d2b2575362e0a81a975d82da104014ed016c237`  
**Planning branch:** `architecture/agent-free-source-control-lifecycle`  
**Planning checkout:** managed worktree `source-control-lifecycle`

## Objective

Replace the current Work Intake/checkout-coupled Git behavior with an agent-free application source-control lifecycle that:

- saves Operator Work Intake intent independently of repository cleanliness;
- creates Work Intake branches from exact `dev` revisions without switching the primary checkout;
- initializes `main` + `dev` + first Work Intake branch for greenfield Git projects;
- captures implementation and Operator-disposition checkpoints deterministically;
- integrates completed Work Intakes through application-owned mechanics;
- provides a provider-neutral source graph and read-only Source Control visualization;
- preserves a clean future path to per-Work-Intake worktrees/multi-agent execution without implementing that concurrency in this package.

## Execution Rules

- Execute cards sequentially unless an explicit dependency permits otherwise.
- One Implementer Report and one attributable checkpoint commit per card.
- Do not run the historical full test suite as a card-local default. Use the repository validation planner/work-item profile with exact changed paths plus focused tests owned by the card.
- Do not modify unrelated WIR UI repair work.
- Do not merge this package branch into `dev` while the separate WIR UI repair is still being actively modified there. Final integration is an Operator-directed package step after both lines are reviewable.
- Do not use agent prompts to perform routine Git operations implemented by this package.
- Do not introduce general multi-agent worktree orchestration in this package.
- Existing managed-worktree code may be reused as implementation evidence or bounded infrastructure where already required by existing integration mechanics, but product-facing Work Intake concurrency remains deferred.

## Card Order

1. SCL01 — Establish semantic source-control lifecycle contracts and service boundary.
2. SCL02 — Persist Work Intake intent independently from source preparation.
3. SCL03 — Create existing-project Work Intake SourceLines from exact `dev` revisions.
4. SCL04 — Establish greenfield `main` / `dev` / first Work Intake source lifecycle.
5. SCL05 — Implement deterministic implementation and disposition checkpoint service.
6. SCL06 — Wire lifecycle checkpoints across routed and legacy workflow disposition boundaries.
7. SCL07 — Normalize completed Work Intake integration into `dev` through application mechanics.
8. SCL08 — Implement provider-neutral Source Graph projection and semantic enrichment.
9. SCL09 — Build read-only Source Control graph workspace.
10. SCL10 — Remove legacy authority gates and qualify the end-to-end source lifecycle.

## Completion Outcome

The package is complete when a dirty primary checkout does not prevent intake capture/branch creation, normal workflows no longer require agents to operate Git, workflow checkpoints produce exact durable revisions, completed work integrates deterministically, and the Operator can inspect concurrent feature/hotfix branch topology through the Source Control graph.
