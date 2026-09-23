# SCL01Z — Retire Markdown Authority and Qualify Structured Project State

**Depends on:** SCL01Y  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01Z_IMPLEMENTER_REPORT.md`

## Objective

Complete the Structured Project State insertion and establish the baseline required by SCL02.

## Required Changes

1. Disable legacy canonical Markdown writers/state scanners for cut-over Projects.
2. Ensure generated Markdown is projection/export only.
3. Verify ProjectStateService restart persistence, history, current views, Decision/disposition, validation freshness, Work Intake/routing, Development/Issue/routed state, source semantic references and Tester obligations.
4. Verify backup/recovery and provider-generation recovery.
5. Verify authoritative agent context no longer depends on Markdown state scans.
6. Verify Memory event feed can rebuild a derived test index without mutating Project State.
7. Update migration/capability documentation and explicitly identify remaining legacy-only compatibility paths for non-cut-over Projects, if any.

## Constraints

- Do not begin SCL02 behavior early.
- Do not implement vector/semantic AI Memory.
- Do not remove architecture/governance/design Markdown.

## Acceptance Criteria

Structured Project State is the only canonical workflow-state source for the qualified Project; Markdown is projection/evidence; SCL02 can persist Work Intake directly through ProjectStateService.

## Validation

Use the package-appropriate phase/migration qualification profile over exact affected capabilities; avoid unrelated historical full-suite expansion unless the validation planner requires it.

## Post-Implementation

Write report + checkpoint and continue directly to SCL02.
