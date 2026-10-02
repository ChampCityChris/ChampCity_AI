# RWS06 — Remaining Workspace and Structured-State Completion Bundle

**Status:** IMPLEMENTER_READY  
**Architecture evidence:** `docs/architecture/REMAINING_WORKSPACE_UI_SQL_MIGRATION_AUDIT_2026-10-01.md`  
**Execution mode:** sequential bundle with one checkpoint per card; Architect review after the full bundle.

## Objective

Complete the remaining renderer workspace extraction and Structured Project State migration so every substantive Workflow can run its complete applicable lifecycle without depending on canonical Markdown as live workflow authority.

Target lifecycle:

- Project Creation / Greenfield: Intake → Architect Interview → Project Planning → topology/Phase work → WorkItems → execution → validation/repair → close.
- Feature: Intake → Architect Assessment → Planning → direct/phased WorkItems → execution → validation/repair → close.
- Issue: Intake → RCA → Correction Planning → direct/phased Fix WorkItems → execution → validation/repair → close.
- Refactor/Migration: Intake → Architect Assessment → Planning → direct/phased WorkItems → execution → validation/repair → close.
- Integration/Composition: Intake → Architect Assessment → Planning → direct/phased WorkItems → execution → validation/repair → close.
- Infrastructure/Platform: Intake → Architect Assessment → Planning → direct/phased WorkItems → execution → validation/repair → close.
- Research/Prototype: Intake → Architect Assessment → either close with evidence/no implementation Plan or execute an approved direct/phased Research Plan.

Work Intake Routing is **optional and routing-only**. Direct substantive Workflow creation remains a first-class path. A routed and directly-created Workflow must converge on the same target Workflow contract.

## Architecture rules

1. SQL semantic records are authority.
2. Generated Markdown is a human-readable projection/export only.
3. Generated Markdown never flows backward into current semantic authority.
4. Free-form historical Markdown is preserved as evidence; it is not reparsed into canonical state unless a deterministic typed representation already exists.
5. Exact Workflow identity owns all substantive lifecycle state after direct creation or WIR handoff.
6. WIR ends at target Workflow creation/linkage and never owns planning, execution, source lifecycle, validation, or integration.
7. The Operator remains the only authority for product/scope decisions and final Plan disposition.
8. AI may make semantic recommendations; deterministic application code owns validation, identity, topology derivation mechanics, bounds, lifecycle transitions, and persistence.
9. Do not universalize every Greenfield workspace ID. Phase Interview, Phase Planning, and Work Card Intake remain Greenfield-specific unless a substantive Workflow actually requires the semantic stage.
10. Do not create parallel SQL and Markdown planning systems. Reuse existing Project State entities and relationships.

## Bundle cards

1. **RWS06A** — Structured Plan candidate/review foundation and deterministic topology resolver.
2. **RWS06B** — Exact substantive Workflow Planning adapters and profile-driven prompt convergence.
3. **RWS06C** — Greenfield Project Planning structured migration and shared Plan Review Shell.
4. **RWS06D** — Topology / Work Map shell and Greenfield Phase Map SQL migration.
5. **RWS06E** — Greenfield Phase loop structured migration.
6. **RWS06F** — WorkItem planning/contract convergence and renderer prompt extraction.
7. **RWS06G** — Execution shell convergence and support for all implementation Workflow types.
8. **RWS06H** — Review / Validation / Repair structured convergence.
9. **RWS06I** — Close / advance / integration lifecycle convergence.
10. **RWS06J** — Final App.tsx cleanup, legacy authority retirement, and bundle qualification.

## Sequential execution rule

The Operator is the only authority over whether and when this bundle executes. The cards define implementation sequence only; they do not create an Architect approval gate. Once the Operator directs execution, the Implementer may execute RWS06A through RWS06J sequentially without waiting for Architect review between cards.

Each card must produce:
- its own attributable checkpoint commit;
- its own Implementer Report;
- exact changed-path validation receipts.

Stop early only for:
- an architecture conflict requiring dual authority;
- loss/ambiguity of exact Project/Workflow/Phase/WorkItem identity;
- inability to migrate a required current artifact without guessing from free-form prose;
- an incompatibility between accepted RWS05 Structured Project State and this bundle;
- a directly attributable build/runtime failure that cannot be bounded to the current card.

Do not stop for unrelated pre-existing test failures; report them separately.

## Common validation policy

For each card:
- inspect existing capability-map/test ownership first;
- use planner preview + work-item validation profile with exact changed paths;
- run focused owned tests;
- run `git diff --check`;
- do not run full/release qualification unless the planner requires it.

RWS06J owns the bundle-wide affected-set qualification.

## Final acceptance target

After RWS06J:
- all substantive Workflow types complete their full applicable lifecycle;
- direct-start and WIR-routed Workflows converge after target creation;
- direct/phased topology is derived under the deterministic resolver contract;
- all migrated reviewable workflow state is SQL-backed;
- generated Markdown is projection-only;
- later-stage renderer presentation is outside `App.tsx` except genuine application routing/host mechanics;
- exact execution supports Feature, Issue, Migration, Integration, Infrastructure, and implementation-bearing Research;
- Greenfield retains its required Project/Phase semantics without forcing those legacy stages onto every other Workflow.

Then STOP for one Architect review and one bounded Operator validation pass.