# SCL01J Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a workstation path.
- Card: Work Card `SCL01J`, Implement Decisions and Effective Disposition Projection.
- Predecessor: SCL01I checkpoint `98cfe894379678c818417cf81546da1649120945`.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.

## Files

- Created: `test/project-state/decision-disposition.test.cjs` and this report.
- Modified: `src/shared/projectState/entityTypeRegistry.ts`, `src/shared/projectState/projectStateService.ts`, `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: mutable disposition rows or Markdown status authority, an external decision provider, and a new workflow gate.

## Implementation and evidence

Typed Decision creation retains trusted actor and role, scope, outcome, decision time and optional effective time. Omitted free-text rationale is stored as an empty string, so a simple acceptance is valid. A typed correction creates a new Decision in the same lineage, marks the old Decision terminal without changing its body, and atomically records `supersedes` and replacement `governs` edges with StateChange/outbox pairs. Ordinary later Decisions retain separate lineages. Generic relationship creation cannot attach new `governs` edges outside a typed Decision command.

`getEffectiveDisposition` projects a governed target's state from active, effective, human Operator Decisions. It ignores Validation records, agent recommendations and future Decisions. The projection orders equal effective times by original Decision lineage creation sequence, so a correction does not displace an unrelated later Decision. It returns the governing Decision ID for traceability. `getRequiredOperatorDecisions` reports outstanding requirements only for active Criteria explicitly marked `operator_decision`; ordinary deterministic Criteria produce no requirement. The query does not create a Decision or gate.

Six cross-adapter tests prove chronology and correction history, immutable Decision bodies and governance, actor/effective-time filtering, an empty-rationale acceptance, and explicit Criterion requirements. Existing service, history and outbox tests also pass.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows, static/build | Passed after correcting the canonical UTC expression; initial compile exposed an optional event identity type error, then passed. |
| `node --test test/project-state/decision-disposition.test.cjs test/project-state/service-boundary.test.cjs test/project-state/revision-history-lineage.test.cjs test/project-state/state-change-outbox.test.cjs` | Normal Windows, focused capability | Passed 19/19 after correcting the UTC expression; initial run failed six new scenarios on that shared expression. |
| `node --test test/validation/capability-map.test.cjs` | Normal Windows, catalog | Passed 5/5 after replacing an invalid temporary-resource class; initial run failed one catalog schema test. |
| `npm run test:affected -- --changes tmp/scl01j-changes.json` | Normal Windows, work-item | Passed; receipt `277886d4-89b0-4e40-a901-13c25bc12717`, 16 selected files, zero failure evidence. |
| `git diff --check` | Read-only source check | Passed. |

The work-item profile supplied static/build, fast and affected integration evidence. No external integration was connected or claimed.

## Git and safety

The Operator directed one checkpoint commit for this card. Its hash is pending at report creation and will be reported after commit. The exact staged diff was inspected. `git diff --cached --check` passed; the added-line secret and concrete local-path scan and generated-artifact path scan found zero hits. No push, merge, rebase, reset, clean, restore, or stash was performed.

## Remaining validation and next task

The requirement query follows the explicit `operator_decision` Criterion value; policy ownership of that marking belongs to its workflow caller. Disposition is projected rather than persisted in the entity envelope. No Operator experiential judgment is required for this card. SCL01K can continue after this checkpoint.
