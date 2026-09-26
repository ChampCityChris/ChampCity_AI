# WRB03-05 — Qualify Workflow Planning Normalization and Stop at the Shared Execution Boundary

**Depends on:** WRB03-04 checkpoint  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Qualify WRB03 as one vertical product outcome.

The acceptance target is not a collection of passing unit tests. It is a usable Current Project planning runtime in which exact Feature/Capability and Issue Resolution Workflow instances can independently progress from their bespoke front halves into one canonical Workflow-owned WorkItem/Phase/Criterion graph.

After qualification, stop. WRB04 is not authorized in this run.

## 1. Architecture audit

Review the implemented production call graph and verify:

- exact Workflow ID owns Feature and Issue planning;
- Workflow type selects semantics but is never instance identity;
- WIR provenance is context only after handoff;
- direct and routed Feature use the same planning service;
- accepted planning state is canonical SPS, not Markdown;
- there is no generic canonical Plan entity;
- top-level planning semantics, Phases, and WorkItems resolve to one exact Workflow;
- dependencies cannot cross Workflow ownership;
- current Work Item Map uses the Workflow-scoped projection;
- source remains unmaterialized through planning;
- no WRB04 execution/integration logic has been started.

Document any transitional legacy module retained and its exact production caller.

## 2. Qualification scenarios

Use disposable Current Projects and focused service/renderer tests.

### Concurrent direct Features

1. Start Feature A and Feature B with the same title.
2. Save different Feature intake context for each.
3. Prepare/review planning independently.
4. Accept both.
5. Confirm distinct canonical BoundedSolution/WorkItem/Criteria identities.
6. Confirm Workflow A projection contains no Workflow B records.
7. Confirm each reopens at its own work-item-map.

### Direct versus WIR-routed Feature convergence

8. Start one Feature directly.
9. Create a WIR, route a second request to Feature, and close the WIR.
10. Open both exact target Feature instances.
11. Confirm both use the same Feature service/contracts/workspaces.
12. Accept equivalent direct/routed plan shapes.
13. Confirm the routed Feature retains WIR provenance but owns its own canonical planning graph.
14. Change/reopen WIR history and prove target plan authority is unaffected.

### Source-backed Feature

15. Create source-backed Feature at exact Dev baseline.
16. Advance/dirty Dev after Workflow creation.
17. Confirm planning still references the Workflow's immutable baseline identity.
18. Confirm planning creates no workflow/<id> source branch/worktree and SourceBinding stays unprepared.

### Non-source Feature

19. Create and plan a Feature in a non-Git Current Project.
20. Confirm no Git/source admission gate is introduced.

### Issue Resolution

21. Start two independent Issues.
22. Save separate reproduction/evidence.
23. Accept RCA for one; verify canonical Finding/RootCause/explains/support relationships belong to that Issue only.
24. Request revision on the second; verify it does not partially create correction WorkItems.
25. Accept correction plans and confirm fix WorkItems/Phases/Criteria normalize through the same shared planning graph primitive used by Feature.
26. Confirm the future execution-facing projection differs only by normal Workflow context/WorkItem semantics, not a private Issue execution engine.

### Recovery and authority

27. Restart/reopen saved Feature and Issue Workflows and recover current workspace from SPS.
28. Delete/ignore a generated review projection in a disposable fixture and prove accepted canonical graph remains discoverable from SPS.
29. Confirm Current Project Feature/Issue navigation has no production path into intake/route-owned workPlanningKernel or RoutedIssueBridge.
30. Confirm completed WIR still reopens as completed WIR history.

### Shared execution boundary

31. Work Item Map presents exact canonical graph.
32. No Implement/Run/Validate/Repair/Integrate action is exposed.
33. No ImplementationRecord, Validation, SourceCheckpoint, repair WorkItem, or IntegrationRecord is created by WRB03 planning flows.

## 3. Canonical graph validation

Explicitly inspect accepted graphs for:
- exact Workflow membership;
- application-issued entity IDs;
- direct/phased structure;
- deterministic Phase sequence inside each Workflow;
- dependency DAG;
- WorkItem implements BoundedSolution;
- BoundedSolution addresses accepted Issue RootCause/Finding where applicable;
- explicit Criterion verificationIntent and validationPolicy;
- no orphan current planning semantic records;
- no cross-Workflow membership/dependency;
- Operator planning Decision tied to the accepted graph/Workflow.

Do not accept a test that merely checks generated Markdown content as proof of these invariants.

## 4. Lean validation strategy

Run:
- build;
- WRB03 planning graph/domain suite;
- Feature front-half focused suite;
- Issue front-half focused suite;
- exact Workflow Hub/navigation suite;
- structured WIR handoff regression needed for routed Feature convergence;
- Current Project registration/source-baseline regressions directly touched by WRB03;
- capability-map integrity when metadata changed;
- exact validation-plan preview;
- git diff --check.

Do not automatically run a historical full development/Issue lifecycle or broad affected sweep measured in many minutes. If validation planning selects retired legacy tests, classify them against the production path and report why they are retained, rewritten, or retired.

## 5. Bundle report

Write docs/implementation-bundles/workflow-runtime-rebaseline/WRB03/Reports/WRB03-05_BUNDLE_QUALIFICATION_REPORT.md.

Include:
- WRB03-01 through WRB03-05 checkpoint SHAs;
- final production services/contracts/UI paths;
- exact canonical ownership model implemented;
- Feature direct/routed convergence evidence;
- Issue RCA/correction normalization evidence;
- Workflow-scoped projection evidence;
- source-lifecycle non-mutation evidence;
- legacy planning modules/tests deleted or retained with exact remaining caller;
- focused validation evidence and plan preview;
- known WRB04 entry conditions, including the deferred linked-worktree integration candidate defect;
- explicit confirmation that WRB04 execution/integration was not started.

## 6. Architecture/rebaseline update

Update the governing architecture/rebaseline only to reflect implemented reality:
- mark WRB03 implemented/pending Architect review;
- document any final vocabulary added for Workflow planning membership;
- keep WRB04 integrationGit common-directory repair visible as a mandatory entry condition.

Do not mark WRB04 started.

## Checkpoint and STOP

Create one checkpoint commit:

WRB03-05 qualify Workflow planning normalization

Then STOP for human Architect review.

Do not begin WRB04.
