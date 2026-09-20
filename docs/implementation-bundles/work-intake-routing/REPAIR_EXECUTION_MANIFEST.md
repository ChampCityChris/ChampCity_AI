# Work Intake Routing — Repair Execution Manifest

## Starting State

Expected implementation branch: `repair/work-intake-routing-wir22`.

Expected repair-package baseline checkpoint:

`cd6bc62ce7f78a886297fdeeb8530b0707107710` — repair evidence/plan/manifest/cards committed after the blocked WIR22 review.

Last passing implementation checkpoint before the repair package:

`45c04027705fb9beeffc8f78e5ce2887e63645c2` — WIR21.

WIR22 is blocked and has no passing checkpoint. Its report is failed-review evidence, not a completed-card report.

## Read First

1. `docs/implementation-bundles/work-intake-routing/REPAIR_PLAN_AFTER_WIR21.md`
2. `docs/implementation-bundles/work-intake-routing/REPAIR_EVIDENCE_2026-09-20.md`
3. `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`
4. governing architecture and Work Card/Repair Card standard
5. current Repair Card only

Do not preload later Repair Cards.

## Exact Execution Order

`WIR22-REPAIR01 → WIR22-REPAIR02 → WIR22-REPAIR03 → WIR22-REPAIR04 → WIR22-REPAIR05 → WIR22-REPAIR06 → WIR04-REPAIR01 → WIR22 → WIR23`

For each Repair Card:

1. verify current source and required prior repair report/checkpoint;
2. implement only the bounded repair;
3. run required focused validation;
4. write the Repair Implementer Report;
5. create exactly one checkpoint commit with message `<REPAIR_ID>: <exact repair title>`;
6. verify clean/safe state;
7. then read the next repair.

Stop on a new material architecture/product decision or if the current repair itself requires decomposition.

## Failed WIR22 Report

Preserve `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md` unchanged as the evidence that triggered repairs. If it is still untracked at repair initialization, include it as immutable failed-review evidence in the first repair checkpoint; do not rewrite it as a passing WIR22 report.

When original WIR22 is eventually resumed, it may replace/write its normal passing Implementer Report only after WIR22 actually passes.

## Source-Control Rule

Use only the source-control capability supplied by the execution harness for implementation-branch checkpointing.

Product-owned Git behavior under WIR22-REPAIR06 must be tested through production services in disposable Git fixtures.

No merge to dev/main, tag, release, or publication occurs during repairs, WIR22, or WIR23 unless separately directed after review.

## UI Rule

WIR04-REPAIR01 owns the Work Intake form defect proven by Operator screenshots. It does not redesign the Workflow Hub. The current Hub screenshot is acceptance evidence for original WIR22.

## Resume Rule

After WIR04-REPAIR01 passes, read the original WIR22 card fresh from the repository and execute it against the repaired dependency surface. Do not reuse the blocked WIR22 conclusions as a substitute for rerunning its required validation.

Only after WIR22 passes and checkpoints may WIR23 begin.
