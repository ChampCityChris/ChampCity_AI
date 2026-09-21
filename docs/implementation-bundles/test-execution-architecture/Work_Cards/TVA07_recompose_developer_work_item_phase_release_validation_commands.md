# TVA07 — Recompose Developer, Work Item, Phase, and Release Validation Commands

**Order:** 7 of 9  
**Depends on:** TVA01–TVA06  
**Governing architecture:** `docs/architecture/CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/test-execution-architecture/Implementer_Reports/TVA07_IMPLEMENTER_REPORT.md`

## Confirmed Migration Defect

The repository still documents and exposes the frozen-V1 monolithic command model:

```text
npm run typecheck
npm run build
npm test
```

while `npm test` rebuilds and runs every test file serially.

This causes Architects/Implementers to copy broad validation into bounded cards even though the adopted governance requires affected proof.

## Objective

Make the public package scripts, development documentation, and implementation guidance reflect the executable lane/profile architecture.

## Required Changes

1. Define canonical public commands for:
   - static/build validation;
   - fast validation;
   - affected-capability validation;
   - integration validation;
   - Desktop platform;
   - packaging;
   - migration;
   - performance/soak;
   - explicit full regression.
2. `npm test` becomes the ordinary bounded developer profile, not an alias for every repository test.
3. Keep an explicit unambiguous full-regression command.
4. Convenience commands must delegate to the shared ValidationPlanner/Executor rather than maintain separate file globs.
5. Preserve advanced/internal built commands only where needed; document that workflows should not call them directly.
6. Update:
   - `docs/dev/VALIDATION_COMMAND_LANES.md`;
   - `docs/development/DEVELOPMENT_GUIDE.md`;
   - Work/Repair Card validation guidance/template text where legacy canonical commands remain;
   - implementation-validation guidance if required.
7. Ordinary Work Card guidance must request static + affected + applicable integration, not full suite.
8. Repair guidance must request failed-scenario regression + affected proof + preserved behavior.
9. Phase close and release qualification explicitly own wider/full profiles.
10. Remove duplicate canonical command sequences that build the same output repeatedly.

## Public Command Semantics

Exact names may differ, but users must be able to distinguish:

```text
ordinary fast feedback
affected Work Item proof
integration/platform proof
performance proof
full phase/release proof
```

without reading implementation scripts.

## Acceptance Criteria

1. `npm test` no longer executes performance/soak, packaging, Desktop platform, and every unrelated integration test by default.
2. An explicit full command still executes all applicable supported-platform regression lanes.
3. No canonical command compiles/builds identical source twice in one profile.
4. Development docs no longer prescribe the old typecheck/build/npm-test duplication.
5. Work/Repair Card guidance is consistent with the adopted governance.
6. Current package/release commands retain their intended packaging behavior.

## Validation

Run every new public command in plan-preview mode where available and execute representative fast, affected, integration, performance, and full profile paths appropriate to this card.

The full profile is run once as migration acceptance, not repeatedly during implementation.

## Implementer Report

Provide old/new command table, workflow/profile mapping, docs changed, one measured example of each primary command, tests/commands/results, and checkpoint commit.

## Post-Implementation

Checkpoint TVA07 only, then read TVA08.
