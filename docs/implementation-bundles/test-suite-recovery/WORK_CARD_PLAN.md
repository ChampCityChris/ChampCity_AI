# Test Suite Recovery — Work Card Plan

**Status:** Ready for implementation  
**Scope:** Immediate operational recovery only  
**Governing evidence:** `TEST_SUITE_TIMING_AUDIT_2026-09-21.md`  
**Future architecture explicitly out of scope:** `docs/architecture/CHAMPCITY_TESTER_AND_TEST_LIFECYCLE_ARCHITECTURE.md`

## Objective

Restore a trustworthy, fast-enough test system so ordinary ChampCity development can continue.

This bundle does not implement the Tester role, Test Lifecycle Determination, temporary Implementer proof workflow, token-cost efficiency, or permanent future governance. Those belong to the later architecture initiative.

## Sequence

1. **TSR01 — Decompose Project Planning mega-scenarios**
2. **TSR02 — Decompose Work Card Planning and Intake mega-scenarios**
3. **TSR03 — Consolidate routed lifecycle and Phase acceptance replays**
4. **TSR04 — Replace remaining routed Architect/Issue mega-scenarios with bounded invariant proof**
5. **TSR05 — Disposition the deleted legacy Git mutation monolith without restoring it wholesale**
6. **TSR06 — Repair validation/test-toolbox expectation drift**
7. **TSR07 — Repair IntegrationCandidate and release-toolbox regression failures**
8. **TSR08 — Repair the remaining Issue Fix Card regression**
9. **TSR09 — Reclassify test execution safety by owned resource**
10. **TSR10 — Replace coarse cohort serialization with bounded resource-aware scheduling**
11. **TSR11 — Rebaseline and qualify the recovered suite**

## Common Constraints

- Do not implement the Session 2 Tester/Test Lifecycle architecture.
- Do not add permanent tests merely because a card changes tests.
- Prefer deleting/consolidating historical acceptance replay when equivalent durable proof already exists.
- Preserve unique regression obligations.
- Do not weaken production behavior merely to make old tests green.
- Do not use `npm test`, `test:full`, or full-supported-platform as an acceptance gate for TSR01–TSR10.
- Use only the focused files and validation surfaces named by each card.
- Broader failures discovered outside card ownership are evidence for their owning card, not permission to expand scope.
- Performance/soak evidence is intentionally expensive and should be isolated, not optimized simply because it is slow.
- No card may restore the old monolithic `git-mutation-boundary.test.cjs` as the default solution.

## Recovery Targets

By TSR11:

- ordinary functional test files should complete in under 60 seconds unless explicitly classified as a wider integration sentinel;
- any retained integration sentinel should have an explicit reason and complete inside its governing integration budget;
- performance/soak, packaging, and Desktop-exclusive work remain isolated in their proper lanes;
- current legitimate failures are repaired or truthfully classified;
- resource-safe tests are no longer serialized merely because they spawn a process or use an isolated temporary Git repository;
- the serial per-file timing audit should fall to a practical recovery baseline, with a target of 15 minutes or less excluding any explicitly documented environment blocker;
- representative integration-gate execution should return within the adopted under-3-minute target and remain below the 5-minute review threshold;
- final evidence records before/after timing rather than claiming success from test count.
