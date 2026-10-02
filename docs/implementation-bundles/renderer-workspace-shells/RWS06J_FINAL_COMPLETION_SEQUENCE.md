# RWS06J — Final Completion Sequence

**Status:** IMPLEMENTER_READY
**Starting checkpoint:** RWS06J-D `057932e5d9d12440c851ed2c5e0e8787271bdba2`

## Purpose

Complete the remaining RWS06J work after Architect source review of the A-D checkpoints and the first E qualification attempt.

The review confirmed that the repository already supports Project Creation on the shared Structured WorkItem execution boundary. The remaining defect is not that Greenfield needs a repaired special Work Card loop; the defect is that transitional Greenfield Work Card states still sit in front of an already-shared execution pipeline.

## Continuous execution contract

Execute the following sequence without handback:

1. `Repair_Cards/RWS06J-REPAIR01_converge_greenfield_on_shared_workitem_pipeline.md`
2. `Repair_Cards/RWS06J-REPAIR02_retire_greenfield_workcard_compatibility_state.md`
3. `Repair_Cards/RWS06J-E-REPAIR01_retire_stale_legacy_proofs_after_cutover.md`
4. `Work_Cards/RWS06J-E_qualify_structured_workflow_bundle.md`

Each intermediate card writes its report and creates its own attributable checkpoint. Those checkpoints are rollback/evidence boundaries only.

**Do not return between cards. Do not wait for Architect review, Operator confirmation, or another user message.**

Stop early only for a genuine external blocker that cannot be repaired within this bounded sequence.

Assigned cleanup, a destructive deletion, the existence of the next card, an attributable test failure, or the significance of final qualification are not reasons to stop.

The normal handback occurs only after the final RWS06J-E checkpoint exists.

## Architecture being completed

```text
                       PROJECT CREATION
                              |
            +-----------------+-----------------+
            | Greenfield-specific authoring     |
            |                                   |
            | Project Intake                    |
            | Architect Interview               |
            | Project Planning                  |
            | Phase Map                         |
            | Phase Interview                   |
            | Phase Planning                    |
            +-----------------+-----------------+
                              |
                         SQL WorkItems
                              |
         +--------------------+--------------------+
         |         SHARED WORKITEM PIPELINE        |
         |                                         |
         | WorkItem Planning                       |
         | Implementer                             |
         | Tester                                  |
         | Validation / Repair                     |
         | WorkItem Close                          |
         | Phase Validation / Close                |
         | Integration / Workflow Close            |
         +--------------------+--------------------+
                              |
           Feature / Issue / Migration / Integration /
           Infrastructure / implementation-bearing Research
```

Greenfield Phase identity supplies execution context and ordering; it does not create a second WorkItem engine.

## Source basis for convergence

The current repository already establishes this architecture:

- `isStructuredExecutionWorkflowType("project-creation") === true`;
- `workflowExecutionApplicationService` admits `project-creation` to the same execution projection and execution-plan APIs;
- Greenfield WorkItem planning calls the same `structuredWorkItemPlanningService` and shared `acceptWorkItemExecutionPlan()`;
- `WorkflowExecutionWorkspace` already owns common WorkItem planning, implementation, Tester, validation, repair, WorkItem close, Phase close, and integration;
- `GreenfieldExecutionWorkspace` is only a thin adapter around that shared workspace;
- the residual Greenfield `phase-work-card-selection` / `work-card-intake` / `planningPreparedAt` path is not consumed by the shared execution service.

Therefore the completion work removes duplication rather than inventing new common infrastructure.

## Final return

Return only after RWS06J-E has:

- completed all required repair checkpoints;
- qualified all seven substantive Workflow types;
- finalized `Implementer_Reports/RWS06J_BUNDLE_QUALIFICATION_REPORT.md`;
- created the final RWS06J-E checkpoint;
- separated any demonstrated unrelated test failures from RWS06J acceptance evidence.
