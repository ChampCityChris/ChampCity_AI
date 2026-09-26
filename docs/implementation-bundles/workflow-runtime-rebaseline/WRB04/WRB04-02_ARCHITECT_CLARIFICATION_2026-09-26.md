# WRB04-02 Architect Clarification — 2026-09-26

**Observed checkpoint:** `ae6eb789f829e2c7320827eb24767709cc458bcd`  
**Disposition:** IMPLEMENTER STOP ACCEPTED / WRB04-02 REVISED AND RE-RELEASED

## Why the stop was correct

WRB04-01 correctly established the exact Workflow execution projection and lazy source boundary.

WRB04-02 then said to “adapt the existing Codex/App Server Implementer runtime” to exact Workflow/WorkItem identity. That direction was incomplete.

The existing Codex runtime has only these implementation ownership modes:

- legacy Development/current-workspace Work Card;
- legacy Issue/Fix Card;
- routed-development keyed by WorkIntake ID + routed Plan WorkItem;
- Integration Repair.

Its preflight resolves approved Markdown Work Card/Fix Card artifacts, its session identity carries legacy Work Card/Issue/Intake fields, its working directory is the legacy workspace root, and its automatic checkpoint completion uses the legacy Work Item checkpoint path.

There is no exact:

`Current Project → Workflow ID → canonical WorkItem ID → exact Workflow checkout → canonical ImplementationRecord → structured Workflow checkpoint`

selector/context/finalization path.

Simply wrapping a WRB03/04 WorkItem in the routed-development or Issue selectors would restore the ownership model WRB04 is explicitly replacing.

The Implementer therefore stopped at the correct architectural boundary.

## Classification

This is an **Architect miss in WRB04-02**.

The card correctly prohibited legacy authority but did not specify the concrete new runtime adapter contract needed to reach the reusable Codex/App Server mechanics.

No Implementer defect is recorded.

## Corrected execution boundary

WRB04-02 is re-released from `ae6eb789f829e2c7320827eb24767709cc458bcd`.

The revised card explicitly requires:

1. a new exact `workflow-work-item` Codex execution selector;
2. separation of Current Project container root from the exact execution working directory;
3. exact WorkItem execution-contract/runtime evidence owned by the new application path;
4. no legacy Markdown discovery for the exact mode;
5. one typed SPS decomposition command;
6. typed WorkItem attempt state transitions;
7. structured Implementer report/evidence recovery;
8. canonical ImplementationRecord finalization;
9. structured exact-Workflow source checkpointing for source-backed work;
10. a not-required checkpoint path for valid non-source execution;
11. direct proof that the new mode never calls routed-development, Issue Fix Card, or current-workspace Markdown context resolution.

WRB04-03 remains blocked until the revised WRB04-02 completes and checkpoints.
