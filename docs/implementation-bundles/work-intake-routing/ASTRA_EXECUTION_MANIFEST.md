# Work Intake Routing — Astra Execution Manifest

## Purpose

This bundle implements the adopted Work Intake routing, route-specific planning, direct/phased Plan execution, application-owned Git lifecycle, integration-candidate lifecycle, and Integration Repair architecture in the current ChampCity application.

## Governing Sources

- Architecture: `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`
- Work Card plan: `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`
- Bundle index: `docs/implementation-bundles/work-intake-routing/BUNDLE_INDEX.md`
- Work Card standard: `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

## Context Loading Rule

Do **not** preload all 23 Work Cards into working context.

At initialization, read only:

1. this manifest;
2. the governing architecture;
3. the Work Card plan;
4. the bundle index;
5. WIR01.

After a card is complete and checkpointed, read the next Work Card from the repository plus only the dependency Implementer Reports required to verify its starting state.

The repository is the source of truth for the Work Cards. Later cards are future dependency context, not permission to broaden the current card.

## Before Starting

Do not begin WIR01 until all 23 Work Cards are present in the repository.

Verify:

1. selected repository is `ChampCity_AI`;
2. the Operator-selected implementation branch/baseline is correct;
3. the working tree does not contain unrelated changes that would make per-card attribution unsafe;
4. the governing architecture is readable and does not materially contradict the bundle.

If unrelated pre-existing changes prevent safe card-by-card commits, stop before WIR01 and report the blocker.

## Sequential Execution Contract

Execute exactly:

`WIR01 → WIR02 → WIR03 → WIR04 → WIR05 → WIR06 → WIR07 → WIR08 → WIR09 → WIR10 → WIR11 → WIR12 → WIR13 → WIR14 → WIR15 → WIR16 → WIR17 → WIR18 → WIR19 → WIR20 → WIR21 → WIR22 → WIR23`

For each card:

1. read the current card and required dependency reports;
2. re-verify the repository/baseline expected by that card;
3. implement only that card;
4. run its required focused validation;
5. write its Implementer Report;
6. create exactly one source-control checkpoint commit containing only that card's attributable changes and report, using the source-control capability supplied by the execution harness;
7. use commit message format: `<CARD_ID>: <exact card title>`;
8. verify the checkpoint succeeded and that repository state is suitable for the next card;
9. then read the next card from the repository and continue automatically.

Do not pause for routine Operator approval between cards.

## Source-Control Rule for This Bootstrap Bundle

Astra is the workflow controller for this implementation bundle, but the harness owns the mechanics available to it.

Use the source-control capability provided by the execution harness. Do not invent or bypass the harness with an alternate source-control mechanism.

For each passing Work Card:

- one card = one checkpoint commit;
- stage/commit only the current card's attributable implementation and Implementer Report;
- do not combine multiple Work Cards into one commit;
- do not merge the bundle branch into another branch during WIR01–WIR23;
- do not tag, release, or publish during individual cards;
- do not rewrite prior card commits merely to make later work convenient.

Cards WIR02/WIR03/WIR19–WIR21 may test product-owned Git behavior. Exercise that product behavior in disposable repositories/fixtures where the card requires it; that is distinct from checkpointing the implementation bundle itself.

## Test Rule

Do not add a test merely because production code changed.

For each card inspect existing tests and current `validation/capability-map.json` if present. Prefer:

1. reuse existing proof unchanged;
2. extend an existing test at the same behavior boundary;
3. consolidate only when the card explicitly authorizes it;
4. add a new permanent test only for a materially distinct uncovered behavior/boundary/regression/failure mode/contract/risk.

WIR23 owns the one bundle-wide full-regression run.

## Stop Conditions

Stop and report rather than improvising when:

- a dependency card did not produce the required contract;
- a required prior checkpoint commit is absent or inconsistent with its report;
- current source materially contradicts the governing architecture;
- a card itself must be decomposed beyond its stated objective;
- unrelated repository changes prevent safe attribution;
- an acceptance failure cannot be repaired without entering later-card scope;
- an Operator-owned product/architecture decision is required.

## Completion

After WIR23 passes:

1. write the WIR23 Implementer Report;
2. create the single WIR23 checkpoint commit;
3. verify repository state;
4. stop and return all Implementer Reports plus remaining Operator validation.

Do not begin the Electron → service/browser refactor. That work will be replanned through the newly implemented Start Work flow.
