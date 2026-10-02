# RWS06D — Topology / Work Map Shell and Greenfield Phase Map SQL Migration

**Status:** IMPLEMENTER_READY  
**Sequence:** follows RWS06A–RWS06C checkpoints

## Objective

Create the shared Topology / Work Map presentation and migrate Greenfield Phase Map from canonical Markdown to SQL Phase/relationship authority.

## Architecture

Exact substantive Workflows already have topology from the accepted Planning graph. They must not receive a second Phase Map planning decision.

The shell presents:
- direct WorkItem map when topology is direct;
- Phase → WorkItem map when topology is phased;
- dependency edges;
- current/next executable scope;
- acceptance/readiness status.

## Greenfield Phase Map migration

The current Phase Map contains a deterministic `champcity-phase-map` structure. Use that typed structure to create/query SQL Phase records and relationships.

Map:
- Phase identity/title/purpose/order → Phase;
- `dependsOn` → dependency relationships;
- source references → provenance/evidence references where supported;
- Phase acceptance obligations → Criteria when present in the current semantic source.

Generated Phase Map Markdown becomes projection-only.

Do not preserve canonical completion state in the projection; completion remains live SQL lifecycle state.

## Shell consumers

- Greenfield Project Phase Map;
- exact Workflow direct/phased Work Map;
- Greenfield Work Card selection/map.

Adapters determine terminology; the shell does not impose Greenfield Phase lifecycle on direct workflows.

## Preserve

RWS06A deterministic topology result; existing exact Workflow accepted graphs; current dependency validation; no extra Phase layer for direct plans.

## Focused proof

Prove deterministic Phase Map import, idempotence, dependency preservation, generated projection rebuild, exact direct/phased map rendering, and absence of a second topology decision for exact workflows.

## Report / checkpoint

Report: `.../Implementer_Reports/RWS06D_IMPLEMENTER_REPORT.md`

Commit: `RWS06D migrate phase map and extract work map shell`

Continue to RWS06E.