# RWS06C — Greenfield Project Planning and Shared Plan Review Shell

**Status:** IMPLEMENTER_READY  
**Depends on:** RWS06A–RWS06B

## Objective

Extract Project Planning presentation from App.tsx into a shared `PlanReviewShell` and migrate Greenfield Project Profile/Roadmap authority from canonical Markdown to Structured Project State.

## Shell

The shared Plan Review Shell owns:
- left generated Plan/review projection;
- exact revision/disposition controls;
- right embedded ChatGPT when Architect interaction is active;
- prepare/copy/refresh feedback;
- revision requested instructions.

It is semantic-neutral. Exact Workflow planning adapters from RWS06B and Greenfield Project Planning use adapters over the same shell.

## Greenfield semantic mapping

Project Profile/Roadmap content must be represented with existing semantic records where possible:
- Findings for verified product/project facts;
- BoundedSolution for governing project/planning direction;
- Criteria for acceptance direction;
- Decisions/Relationships for accepted choices and lineage.

Use a bounded review/version anchor rather than storing the two Markdown bodies as canonical blobs.

Generated Project Profile/Roadmap Markdown may preserve familiar human-readable outputs but is projection-only.

## Legacy migration

Do not broadly parse free-form old Project Profile/Roadmap prose.

Deterministically import only trustworthy typed metadata/known structured blocks. Otherwise preserve old documents as historical evidence and require a fresh current structured Project Planning cycle.

## Preserve

RWS05 approved Architect Interview semantics and direct Greenfield progression. Do not collapse Project Planning, Phase Map and Phase Planning into one stage in this card.

## App.tsx

Remove Project Planning workspace composition and generic Markdown disposition ownership that becomes shell/adapter-owned. Keep application routing and browser-host mechanics only.

## Focused proof

Prove structured Greenfield Project Planning review, generated Profile/Roadmap projections, exact revision review invalidation, manual Markdown isolation, old free-form preservation, and shared shell use without changing exact Workflow Planning semantics.

## Report / checkpoint

Report: `.../Implementer_Reports/RWS06C_IMPLEMENTER_REPORT.md`

Commit: `RWS06C migrate greenfield project planning and extract plan shell`

Continue to RWS06D.