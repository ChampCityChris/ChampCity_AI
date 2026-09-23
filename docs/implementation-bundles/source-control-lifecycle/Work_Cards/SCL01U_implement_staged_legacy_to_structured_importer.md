# SCL01U — Implement Staged Legacy-to-Structured Importer

**Depends on:** SCL01T  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01U_IMPLEMENTER_REPORT.md`

## Objective

Translate one exact legacy snapshot into isolated Structured Project State without making it authoritative yet.

## Required Changes

1. Map legacy Project, Intake, Architect/planning, Work/Repair/Issue/Validation records to canonical entity types/relationships.
2. Preserve legacy path/hash/alias/revision as provenance.
3. Retain original historical Markdown as Evidence where fidelity requires it.
4. Generate opaque canonical IDs mechanically and deterministic import correlation metadata.
5. Import into isolated/staged SQLite storage.
6. Reject dangling/invalid relationships and blocking ambiguity.

## Constraints

- No live cutover.
- No dual-write.
- No model inference to fill missing legacy facts.

## Acceptance Criteria

The staged graph satisfies domain invariants and can be discarded/rebuilt from the same snapshot deterministically.

## Validation

Migration mapping fixtures + migration lane + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01V.
