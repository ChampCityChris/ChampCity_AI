# Repository Checkout Orchestration — Astra Execution Manifest

## Purpose

Implement first-class provider-neutral source-control and concurrent RepositoryCheckout mechanics in ChampCity A/I without exposing Git branch/worktree/index plumbing as the Operator's workflow model.

## Before Starting

Verify:

1. selected Repository is `ChampCity_AI`;
2. the implementation branch/checkpoint is isolated from unrelated work;
3. all eight RCO Work Cards exist;
4. governing architecture is readable and materially consistent with current source;
5. the current WIR22/source-control implementation that RCO builds upon is present.

Stop on material mismatch rather than redesigning around it.

## Context Rule

At initialization read only:

1. this manifest;
2. `CHAMPCITY_SOURCE_CONTROL_PROVIDER_ARCHITECTURE.md`;
3. `CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`;
4. `WORK_CARD_PLAN.md`;
5. `BUNDLE_INDEX.md`;
6. RCO01.

After each card is implemented, validated, reported, and checkpointed, read the next card plus only required dependency reports.

## Sequential Bundle Execution

Execute:

`RCO01 → RCO02 → RCO03 → RCO04 → RCO05 → RCO06 → RCO07 → RCO08`

For each card:

1. verify dependency state;
2. implement only that card;
3. run focused validation;
4. write the specified Implementer Report;
5. create exactly one checkpoint commit containing that card's attributable changes/report;
6. verify the checkpoint;
7. continue to the next card without routine Operator approval.

## Source-Control Rule

This bundle itself must follow the architecture it is implementing as far as the available execution harness permits.

- one card = one checkpoint commit;
- do not combine cards;
- do not merge the bundle branch into `dev` during individual cards;
- do not tag/release/publish;
- use disposable fixture repositories/worktrees for tests;
- do not mutate real external Codex worktrees as test fixtures.

## Test Rule

Inspect existing tests and `validation/capability-map.json` before permanent test changes. Prefer reuse, then extension, then explicitly authorized consolidation, then new proof only for a distinct uncovered behavior/risk.

RCO08 owns bundle-wide full regression and end-to-end concurrent execution acceptance.

## Stop Conditions

Stop for:

- dependency contract absence or contradiction;
- unsafe unrelated working-tree changes;
- inability to prove Repository/worktree ownership;
- a required action that would delete or overwrite uncommitted source;
- a provider/runtime behavior that cannot be represented through the adopted RepositoryCheckout contract;
- an Operator-owned architecture or product decision.

## Completion

After RCO08 passes and checkpoints, return the bundle for Architect review and integration. Do not publish a release as part of this bundle.
