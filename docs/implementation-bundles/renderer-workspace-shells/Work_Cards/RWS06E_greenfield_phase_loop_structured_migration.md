# RWS06E — Greenfield Phase Loop Structured Migration

**Status:** IMPLEMENTER_READY  
**Sequence:** follows RWS06D checkpoint

## Objective

Move the remaining Greenfield Phase-specific lifecycle from canonical Markdown to SQL while preserving its intentional Phase Interview → Phase Planning → Work Map behavior.

## Phase Interview

Reuse the RWS05 Architect Workspace Shell.

Phase Interview semantic output is persisted as structured Findings / BoundedSolution / Criteria / Evidence / Decisions as appropriate and grouped by an exact review revision.

Generated Phase Interview Markdown is projection-only.

Free-form historical Phase Interview Markdown is preserved as historical evidence and is not reparsed into authority.

## Phase Planning

Migrate the current `phase-planning` + `work-card-plan` bundle to SQL:
- Phase planning direction → BoundedSolution / Phase semantics;
- typed Work Card candidates → WorkItem candidates/records;
- acceptance obligations → Criteria;
- dependencies → relationships.

Existing machine-readable candidate metadata is deterministic migration input when exact Project/Phase identity is unambiguous.

Generated Phase Planning / Work Card Plan Markdown is projection-only.

## Work Card Map and Intake

Work Card Map reads SQL WorkItems.

`work-card-intake` becomes a derived preparation/handoff state from the selected WorkItem and current Phase/Plan context. It must not remain a canonical Markdown authority or create a duplicate WorkItem identity.

## Applicability

This card is Greenfield-specific. Do not add Phase Interview, Phase Planning or Work Card Intake to every other Workflow merely for symmetry.

## Focused proof

Prove Phase Interview structured review, Phase Planning typed migration, WorkItem candidate persistence, SQL-driven Work Card Map, derived Work Card Intake, and no Markdown back-read authority.

## Report / checkpoint

Report: `.../Implementer_Reports/RWS06E_IMPLEMENTER_REPORT.md`

Commit: `RWS06E migrate greenfield phase loop to structured state`

Continue to RWS06F.