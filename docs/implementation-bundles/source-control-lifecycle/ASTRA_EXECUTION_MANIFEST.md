# Astra Execution Manifest — Source-Control Lifecycle

Execute `SCL01`, then `SCL01A` through `SCL01Z`, then `SCL02` through `SCL10` sequentially as one continuous implementation package.

For every card:

1. read the governing architecture and current card from the repository;
2. inspect the exact dependency reports and current source before implementation;
3. keep changes bounded to the card;
4. use the validation planner/work-item profile with the exact changed-path set and card-owned focused tests;
5. write the required Implementer Report;
6. create one attributable checkpoint commit for the card using the available deterministic source-control capability;
7. verify the checkpoint and immediately continue to the next card.

There is **no Architect or Operator review pause between cards**. Card acceptance criteria, bounded validation, the Implementer Report, and the verified checkpoint commit are the continuation gate.

The Operator's authorization to execute this package applies to the complete sequence, including deterministic migration/cutover mechanics explicitly defined by these cards. Do not request a second approval merely because a card boundary was reached.

Treat a checkpoint commit as mechanical provenance, not as an approval gate.

Stop and return a blocker only when at least one of these conditions is true:

- the governing architecture leaves a genuine product/architecture decision unresolved;
- SCL01E proves the preferred SQLite runtime binding cannot satisfy the supported-runtime contract;
- migration evidence contains semantic ambiguity that cannot be resolved deterministically from the authoritative source;
- a destructive/recovery action outside the approved card scope would be required;
- repeated card-local correction cannot satisfy the card's acceptance criteria; or
- unrelated concurrent repository state makes safe continuation impossible.

Ordinary implementation defects, focused validation failures, migration mapping defects, and deterministic equivalence mismatches are repaired inside the current card and revalidated; they are not reasons to ask the Operator to review the card.

References to Operator Decisions/dispositions inside product behavior describe application semantics. They do not imply a package-execution pause.

Do not replace application-owned Git mechanics with shell instructions or agent-operated Git.

Do not expand this package into multi-agent worktree orchestration.
