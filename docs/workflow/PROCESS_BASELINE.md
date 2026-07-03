# ChampCity A/I Process Baseline

Status: Active baseline for the Project Mapping Rebaseline.

## Workflow spine

Project Intake -> Project Interview -> Reconciliation Review -> Project Mapping -> Operator Project Approval -> Phase Mapping -> Operator Phase Approval -> Work Card Loop -> Phase Closeout -> Operator Phase Closeout Approval -> Roadmap Update -> Next Phase Activation -> Repeat Phase Mapping / Work Card Loop.

## Correction

The application is a workflow router, not a screen picker. It should compute the current actionable step from durable project state and guide the Operator to that step.

## Primary state sources

- Project_Intake.md
- Project_Interview.md
- Reconciliation_Review.md
- Project_Profile.md
- Roadmap.md
- Phase_Interview.md
- Phase_Planning.md
- Work_Card_Plan.md
- Operator approval records
- Work Cards
- Implementer Reports
- Architect report review outcomes
- Validation Records
- Repair sub-cards
- Phase_Closeout.md
- Roadmap update state
- Next phase activation state

## Key rules

1. Project Interview is always required after Project Intake.
2. Reconciliation Review reconstructs completed work only and marks reconstructed records as reconstructed.
3. Roadmap.md is the living master record.
4. Phase Mapping is one phase at a time, beginning with the first incomplete phase.
5. Work_Card_Plan.md contains candidate IDs, titles, summaries, order, dependencies, and purpose only.
6. The Architect creates each full Work Card just in time.
7. The Work Card is also the Implementer prompt.
8. Implementer Reports are reviewed by the Architect.
9. Operator validation creates Validation Records.
10. Repair sub-cards use WCxx-REPAIRxx naming.
11. Phase Closeout may begin only when every mapped candidate is completed, completed via repair, carried forward, deferred, or cancelled.
12. Closeout approval authorizes Roadmap update and Next Phase Activation.

## UI implication

The main UI should show the current required action first. Secondary navigation may exist, but it should not be the primary workflow driver.

## Visual process map

The editable draw.io process map is stored at `docs/workflow/PROCESS_MAP.drawio`.
