# SCL06 — Wire Checkpoints Across Workflow Disposition Boundaries

**Depends on:** SCL05  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL06_IMPLEMENTER_REPORT.md`

## Objective

Connect the deterministic checkpoint service to the actual lifecycle boundaries used by routed Work Intake and still-supported legacy workflows.

## Required Changes

1. Inventory current Operator disposition mutation surfaces in Work Intake routing, route-specific Architect/planning, Development/Work/Repair review, Issue Resolution, Phase/Plan completion, and other active workflow paths.
2. Classify each boundary as:
   - no source checkpoint required;
   - implementation checkpoint;
   - Operator disposition checkpoint;
   - integration-owned checkpoint.
3. Wire checkpoint creation after the semantic state/artifact mutation and before downstream workflow state assumes an immutable revision exists.
4. Record checkpoint outcome/revision in workflow projection/state.
5. Ensure revision-request loops continue on the same Work Intake SourceLine.
6. Preserve V2 governance rules where routine machine/Validator disposition does not require an invented Operator decision.

## Constraints

- Do not create new Operator disposition gates.
- Do not alter unrelated UI currently being repaired by the WIR UI package.
- Do not commit unrelated changed paths.
- No direct Git calls from renderer code.

## Acceptance Criteria

- Every active workflow boundary has an explicit checkpoint classification.
- Operator-approved dispositions that require durable source chronology receive application-owned commits.
- Implementation-ready-for-review states reference exact immutable revisions.
- Revision loops do not create new Work Intake branches.

## Validation

Focused affected workflow tests; update capability map only where behavior ownership changes; planner work-item validation.

## Post-Implementation

Report + checkpoint commit; continue to SCL07.
