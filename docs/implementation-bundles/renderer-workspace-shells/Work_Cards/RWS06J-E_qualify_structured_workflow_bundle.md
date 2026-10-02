# RWS06J-E — Qualify Final Structured Workflow Architecture

**Status:** IMPLEMENTER_READY
**Parent:** RWS06J
**Sequence:** after RWS06J-D and the bounded completion repairs below
**Execution mode:** CONTINUOUS_BUNDLE_FINAL — if any required repair checkpoint is absent, execute the missing repairs in order and then immediately perform this qualification. The normal handback occurs only after this card's final checkpoint.

## Required entry sequence

Execute in this exact order without handback:

1. `RWS06J-REPAIR01_converge_greenfield_on_shared_workitem_pipeline.md`
2. `RWS06J-REPAIR02_retire_greenfield_workcard_compatibility_state.md`
3. `RWS06J-E-REPAIR01_retire_stale_legacy_proofs_after_cutover.md`
4. this RWS06J-E qualification.

These are mechanical implementation/checkpoint boundaries, not review or approval gates.

## Final architecture to qualify

### Application shell

`App.tsx` owns only application-level Project/Workflow selection, global navigation/chrome, Settings, Source Control, and top-level routing.

All substantive workflows enter through `StructuredWorkflowWorkspace`.

### Greenfield-specific boundary

Project Creation is intentionally unique only through Project/Phase authoring:

```text
Project registration/bootstrap
-> Project Intake
-> Architect Interview
-> Project Planning
-> Phase Map
-> Phase Interview
-> Phase Planning
```

### Common WorkItem boundary

After accepted Phase Planning, Project Creation must use the same common pipeline as Feature, Issue, Migration, Integration, Infrastructure, and implementation-bearing Research:

```text
SQL WorkItems
-> shared WorkItem Planning contract
-> shared Implementer
-> shared Tester
-> shared Validation / Repair
-> shared WorkItem Close
-> shared Phase Validation / Close
-> shared integration / Workflow Close
```

Greenfield Phase identity may constrain context and eligibility but must not create a separate execution engine.

### Authority

Structured Project State is the sole live workflow authority for the Current Project. Historical Markdown is inert evidence/readability only. Legacy canonical reads/writes are fenced.

## Seven-workflow qualification matrix

Exercise:

- Project Creation / Greenfield;
- Feature / Capability;
- Issue Resolution;
- Refactor / Migration;
- Integration / Composition;
- Infrastructure / Platform;
- Research / Prototype.

For applicable workflows prove:

- fresh Intake;
- Architect review;
- Planning;
- direct or phased topology;
- WorkItem Planning;
- implementation;
- Tester;
- validation/repair;
- close/integration;
- reopen/resume from SQL.

## Required common-pipeline proof

For Project Creation, explicitly prove:

1. Phase 1 authoring is Greenfield-specific through approved Phase Planning.
2. The resulting SQL WorkItems enter `WorkflowExecutionWorkspace` / `workflowExecutionApplicationService`.
3. WorkItem Planning uses the same `WorkItemPlanningWorkspace` and typed contract service as existing-project workflows.
4. Implementer, Tester, Validation, Repair and WorkItem Close use the same current IPC/service path.
5. Phase 1 close causes outer SQL navigation to return to Phase 2 Interview/Planning when Phase 2 requires authoring.
6. Phase 2 returns to the same shared execution pipeline.
7. Final integration/Workflow close uses the shared lifecycle.
8. Reopen at every durable boundary derives the same destination from SQL.
9. no `planningPreparedAt` runtime semantic affects current behavior;
10. no Phase WorkItem prepare/intake compatibility API is required by the current UI;
11. no Greenfield Work Card Map/Intake execution router exists.
12. existing-project workflow execution behavior is unchanged.

## Other required proof

Also prove:

- direct-start and optional-WIR targets converge on the same substantive Workflow behavior;
- exact Planning reopen from RWS06B repair;
- Research no-Plan close;
- Research implementation Plan path;
- generated Markdown edit/delete isolation;
- historical Markdown inertness;
- Project authority generation and idempotence;
- legacy canonical read/write fence active;
- browser attach/resize/detach;
- Settings extraction/return;
- Source Control remains reachable;
- App shell has no substantive workflow-specific state machine.

## Affected-profile failure attribution

Build the exact changed-path manifest across:

- RWS06J-A through D;
- RWS06J-REPAIR01;
- RWS06J-REPAIR02;
- RWS06J-E-REPAIR01;
- E proof-only changes.

Run the repository validation planner and affected profile.

If the wider receipt fails:

- identify each failing test owner;
- reproduce it on the current tree;
- classify it as attributable or unrelated with evidence;
- repair attributable failures before completion;
- keep unrelated failures separately reported;
- do not restore retired production code to satisfy stale proof;
- do not substitute a focused run for an attributable failed machine receipt without explaining each failure.

If qualification exposes another actual production defect requiring more than a trivial correction, write one bounded repair and continue through it before returning. Do not turn that repair into a human gate.

## Final report

Finalize:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06J_BUNDLE_QUALIFICATION_REPORT.md`

Replace all progress/incomplete/repair-handoff language.

Include:

- RWS06J-A through D checkpoint table;
- RWS06J-REPAIR01 checkpoint;
- RWS06J-REPAIR02 checkpoint;
- RWS06J-E-REPAIR01 checkpoint;
- final RWS06J-E checkpoint;
- RWS05F through final RWS06J accepted checkpoint manifest;
- exact changed-file manifest;
- seven-workflow matrix;
- Greenfield-to-shared-pipeline proof;
- Project authority-generation receipt;
- fence proof;
- retired legacy/compatibility module summary;
- remaining legitimate non-authoritative Markdown callsites;
- validation planner/affected receipts;
- unrelated failure attribution;
- `git diff --check`.

## Forbidden changes

This is qualification, not another architecture rewrite.

Do not:

- add new Markdown authority;
- restore legacy workflow services/UI;
- restore Greenfield-specific Work Card execution stages;
- weaken the Project authority fence;
- fix unrelated subsystems merely to make a global count green;
- create another human approval/handback point before completion.

## Acceptance

RWS06J-E passes when:

1. all three required repair checkpoints are present;
2. all seven substantive Workflow types complete their applicable structured lifecycle;
3. Greenfield is unique only through Project/Phase authoring and then demonstrably converges on the shared WorkItem pipeline;
4. no active Greenfield execution routing depends on `planningPreparedAt`, Work Card Intake/Map, or Phase WorkItem preparation APIs;
5. Structured Project State is the sole live workflow authority;
6. legacy canonical reads/writes are fenced for the Current Project;
7. attributable affected-profile failures are corrected;
8. unrelated failures are specifically evidenced and separated;
9. the final report is complete and truthful;
10. `git diff --check` passes.

## Checkpoint / handback

Commit:

`RWS06J-E qualify final structured workflow architecture`

After this checkpoint, return the completed RWS06J bundle, final report, checkpoint table, and separately attributed unrelated failures for Architect source review.
