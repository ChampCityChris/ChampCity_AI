# SCL01R — Implement Authoritative Context and Memory Event Feed

**Depends on:** SCL01Q  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01R_IMPLEMENTER_REPORT.md`

## Objective

Provide deterministic bounded Project State context for agents and a clean event seam for the future AI Memory system without implementing vector memory.

## Required Changes

1. Implement bounded authoritative context projections by Project/Workflow/WorkItem/Intake.
2. Include exact canonical IDs/versions/source refs/Decisions/validations needed by consumers.
3. Expose committed Project State events from the outbox through a MemoryService-consumable feed.
4. Define idempotent event cursor/checkpoint semantics for derived consumers.
5. Keep future Memory indexes in a separate derived store boundary.
6. Do not make memory summaries or embeddings writable Project State.

## Acceptance Criteria

Agents/services can obtain current authoritative context without repository Markdown scans; a derived consumer can rebuild from committed state events.

## Validation

Context-bound/event-feed tests + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01S.
