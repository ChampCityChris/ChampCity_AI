# WSF19A — Expand Greenfield SQL navigation to the full shell lifecycle

**Type:** Application Foundation Work Card  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Depends on:** WSF01–WSF19 and WSF15A/WSF16A  
**Unblocks:** WSF20 composition.

## Objective

Replace Greenfield's coarse `workflow-execution` navigation bucket with one SQL-derived nested lifecycle projection capable of selecting every recovered shell.

This card changes navigation/read resolution only. It creates no new canonical workflow state.

## Expanded Greenfield stage vocabulary

The navigation projection must support the recovered workspace IDs needed by Greenfield:

- project-intake-capture
- architect-interview
- project-planning-review
- project-phase-map
- phase-interview
- phase-planning-bundle
- phase-work-card-selection
- work-card-intake (presentation/navigation target)
- work-card-planning
- work-card-building-review
- work-card-report-review
- work-card-validation
- work-card-repair
- work-card-close (terminal presentation target)
- phase-validation
- phase-close (terminal presentation target)
- project-validation
- project-close (terminal presentation target)
- workflow-hub

Do not add a generic `workflow-execution` fallback for Greenfield.

## Canonical required-stage resolution

Resolve only from Structured Project State and current typed application projections.

### Project front half

Retain exact current Intake → Architect → Project Planning → Phase Map rules.

### Phase loop

For the first not-closed available Phase:

- Interview not approved/current → Phase Interview;
- Planning not approved/current → Phase Planning;
- open WorkItems remain → Work Card loop;
- all WorkItems closed but Phase not closed → Phase Validation;
- approved Closeout closes Phase; immediate UI may show Phase Close, while reopen resolves next Phase or Project Validation.

### Work Card Map / selection

When no WorkItem has durable current planning/execution/review state, canonical Phase work returns to Work Card Map.

Map candidate selection is Operator presentation/navigation state. Clicking **Begin Planning** may open Work Card Intake without mutating SQL.

Do not persist a fake selected WorkItem merely to navigate.

### Work Card durable state

Once one WorkItem has durable current state, exact SQL identity determines its required surface:

- contract candidate exists but current planning review not approved → Work Card Planning;
- approved contract and no current ImplementationAttempt → Implement;
- prepared/running ImplementationAttempt → Implement;
- completed ImplementationAttempt/result and WorkItem still validation_pending → Review & Validation;
- current WSF15A cycle revision-requested with active Repair → Repair;
- current Repair WorkItem follows the same Planning → Implement → Review/Validation building blocks;
- closed WorkItem returns canonical navigation to Work Card Map / next eligible WorkItem.

Work Card Intake and Work Card Close may be shown immediately through explicit user/action navigation even when canonical reopen returns Map. This is presentation state, not a second workflow authority.

### Work Card Validation

WSF18 is an alternate/manual surface under the same Review & Validation rail step.

Do not force it as an extra required stage after every Report Review.

A user may navigate to it whenever an exact current WSF15A validation cycle/criterion context exists.

### Repair return

Use current SQL WorkItem state after Repair closes. If parent becomes `ready`, canonical navigation returns parent to Implement. Do not override this in renderer state.

### Phase / Project terminal presentation

Approved Phase Closeout may immediately navigate to Phase Close; reopen resolves the next required Phase/Project stage from SQL.

Project Validation owns source integration for source-backed Project Creation:

```text
integration-ready
→ Project Validation (integration action)
→ integrated
→ Project Validation (Closeout)
→ approved Close
→ Project Close
→ Hub on later reopen
```

No separate Integration shell.

## Projection fields

At minimum return:

- exact Workflow ID;
- canonical current workspace;
- current Phase ID;
- current WorkItem ID;
- current Repair ID when applicable;
- parent WorkItem ID when applicable;
- reason/blockers;
- closed flag;
- enough nested rail status facts to render Project/Phase/WorkCard rails without re-deriving domain policy in React.

## Rail / inspection

Rail selection remains presentation-only.

Reopen/resume uses this SQL-derived canonical stage.

Completed and future workspace inspection must not mutate lifecycle state.

## Forbidden

- no renderer-owned canonical current stage;
- no second persisted stage field;
- no generic Execution fallback;
- no mutation-on-read;
- no hidden WorkItem selection persistence;
- no schema/domain entity change;
- no other workflow-family routing changes.

## Focused proof

Use a multi-Phase fixture with multiple WorkItems and prove canonical resolution at every durable boundary:

1. Intake;
2. Architect;
3. Project Planning;
4. Phase Map;
5. Phase Interview;
6. Phase Planning;
7. Work Card Map;
8. Work Card Planning after candidate ingress;
9. Implement after planning approval;
10. Review & Validation after completed implementation;
11. manual validation surface is navigable but not mandatory;
12. RequestRepair → exact Repair;
13. Repair Planning/Implement/Review progression;
14. current SQL Repair return behavior;
15. closed card → next Map/card;
16. Phase Validation;
17. Phase Close immediate presentation / reopen next Phase;
18. source-backed integration through Project Validation;
19. Project Closeout/Close;
20. closed Workflow → Hub.

No transition may depend on Markdown existence.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF19A_IMPLEMENTER_REPORT.md`.

## Checkpoint

`WSF19A expand Greenfield SQL shell navigation`

Then execute WSF20.
