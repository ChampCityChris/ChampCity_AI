# Test Suite Recovery — Architect Review

**Review date:** 2026-09-21  
**Reviewed revision:** `66c46367ca06dad3de48ea7292476c74b801fa69` (`dev`)  
**Reviewed range:** `8cf6127a5e6078cfb7647c4af76052350e815eb6..66c46367ca06dad3de48ea7292476c74b801fa69`  
**Primary evidence:** `TEST_SUITE_RECOVERY_FINAL_REPORT.md`, TSR01–TSR10 Implementer Reports, recovery Work Cards, repository diff, current validation source.

## Review Result

The Test Suite Recovery package materially achieves its operational objective.

The final evidence reports:

- 147/147 permanent executable test files passing;
- 1,180/1,180 tests passing;
- no skips, cancellations, or timeouts;
- serial per-file audit reduced from 2,694.252 seconds to 869.925 seconds;
- no ordinary functional owner above 60 seconds;
- representative production ValidationProfiles completing in approximately 14–19 seconds;
- real file-level overlap under the resource-aware scheduler; and
- no current catalog ownership/inventory gap.

Repository review confirms that TSR01–TSR08 primarily removed repeated upstream workflow replay, corrected stale expectations, decomposed the deleted Git aggregate into focused owners, and introduced prepared downstream fixtures. The package does not weaken production workflow behavior to make historical tests green.

TSR09–TSR10 introduce the substantive validation-runtime change: explicit owned-resource metadata and a repository-owned resource-aware scheduler. The scheduler is bounded, reconstructs the trusted schedule from the validated catalog, prevents caller-controlled capacity overrides, retains deterministic receipt order, and preserves exclusive barriers for Desktop, packaging, performance/soak, and shared-global work.

The suite does not need to return to legacy quarantine on the evidence reviewed here.

## Finding 1 — Validation lane and exclusive resource classification are not cross-validated

**Severity:** Bounded correctness / fail-closed contract defect  
**Repair:** Required, but not a reason to re-quarantine normal development.

### Verified repository state

`scripts/validation/catalog-schema.cjs::validateInventoryFields()` currently validates:

- the allowed validation lane;
- the allowed scheduling mode;
- allowed `ownedResources`;
- resource-to-dependency relationships for several resource classes;
- scheduling-mode-to-exclusive-resource relationships; and
- platform field agreement.

However, it does **not** establish a bidirectional contract between the dedicated validation lanes and their corresponding exclusive scheduling resources.

The following contradictory records can therefore be structurally valid under the current schema:

- a `desktop-platform` record without `electron-desktop` / `exclusive-desktop`;
- an `electron-desktop` / `exclusive-desktop` record classified into an ordinary `integration` or `fast` lane;
- a `packaging` record without `packaging` / `exclusive-packaging`, or the reverse;
- a `performance-soak` record without `performance-soak` / `exclusive-performance`, or the reverse;
- a Desktop-exclusive record whose platform pair is coherently declared as `none` / `any`.

This matters because `scripts/validation/planner.cjs::planValidation()` uses `proposedValidationLane` as the selection authority for lane/profile execution. Resource ownership controls scheduling **after selection**. A contradictory catalog record can therefore place an expensive or environment-specific test into an ordinary profile, or omit it from the dedicated qualification profile, without failing catalog validation.

The current catalog was manually audited during TSR09 and the final catalog tests pass, so this is not evidence that an existing file is presently misclassified. It is a hole in the fail-closed schema guarding future catalog changes.

### Why this is a recovery defect

TSR09 required complete resource classification and fail-closed handling of missing/unknown classification. Its Implementer Report further states that contradictory and scheduling-incompatible declarations are rejected. The current validator only partially establishes that guarantee.

The repair should harden the schema; it should **not** reclassify the current corpus unless the new invariant exposes a genuine existing mismatch.

## No additional material findings

The reviewed scheduler mechanics, planner/executor integration, telemetry migration, timing-audit exit-code repair, and prepared downstream fixture strategy did not expose another material defect requiring a repair card.

The prepared fixtures deliberately bypass upstream workflow replay while retaining production canonical writers and focused ownership boundaries. Their use is consistent with the recovery objective so long as upstream routing/intake behavior remains independently owned by its dedicated tests.

## Repair Artifact

See:

`Repair_Cards/TSR11-REPAIR01_enforce_validation_lane_resource_consistency.md`

This repair is also the first candidate Work Card for the Implementer reasoning-reduction experiment.
