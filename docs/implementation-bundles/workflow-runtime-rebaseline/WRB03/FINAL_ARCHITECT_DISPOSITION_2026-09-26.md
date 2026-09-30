# WRB03 Final Architect Disposition — 2026-09-26

**Reviewed through:** `495c9aca43bd6c90be4abfece01ed9e40fd4c82e`  
**Disposition:** CLOSED / ACCEPTED

## Review conclusion

WRB03 Repair01 closes the five defects identified at the first bundle review. WRB03 now establishes a usable exact-Workflow planning runtime for Feature/Capability and Issue Resolution and reaches the canonical shared-execution boundary without beginning WRB04 execution.

No additional WRB03 repair is required.

## Repair01 acceptance

### R01-01 — IPC/product-path reachability

Accepted at `0fe6d1202b4611d306200d37fc45152d2698dcaf`.

Feature and Issue planning IPC now:
- validate exact Workflow ID independently from channel arity;
- enforce the actual preload argument count per channel;
- validate bounded action/stage/outcome outer shapes;
- accept the normal renderer/preload mutation calls;
- reject missing/surplus arguments;
- surface malformed Architect JSON as workspace error state without invoking disposition.

The new listener-level proof exercises the registered IPC functions rather than bypassing them through direct service calls.

### R01-02 — exact Workflow ownership and Issue RCA authority

Accepted at `a39ae298d58ad634d7fcd62221501336ac431cae`.

Current Project Feature/Issue pre-plan semantics now use explicit `workflow_member` ownership:
- Feature Intake Findings;
- Issue Intake Findings;
- Issue RootCauses;
- BoundedSolution.

Project State rejects a second Workflow owner for a planning semantic record.

Plan existence is no longer inferred from the mere existence of a Workflow member. It is derived from the accepted Workflow-owned BoundedSolution plus accepted planning Decision, so pre-plan Findings/RootCauses do not block first plan acceptance.

Issue `solutionAddresses` require current Finding/RootCause records owned by the exact Workflow.

Issue RCA acceptance is now one typed transaction that creates RootCauses, Workflow ownership, explains/supports edges, accepted Decision governance, and the transition to `issue-planning`. Current RCA identity is recovered through explicit Decision → RootCause governance. No `canonical-root-causes` rationale marker remains in production.

### R01-03 — Feature assessment semantics and concurrent context isolation

Accepted at `495c9aca43bd6c90be4abfece01ed9e40fd4c82e`.

Accepted Feature Architect assessment is now durable SPS state:
- seven bounded Feature assessment Finding records;
- exact `workflow_member` ownership;
- accepted `feature-assessment-review` Decision governing the Workflow and exact assessment records;
- recovery after service recreation;
- exact accepted assessment included in subsequent Feature plan preparation.

Revision does not create a replacement accepted assessment.

Feature and Issue now share a relationship-based Project architecture selector. Workflow-owned BoundedSolutions and Workflow-specific governance are excluded, so one concurrent Workflow's accepted-but-unexecuted plan does not become established Project architecture for another Workflow.

## WRB03 final invariants

WRB03 now proves:

1. exact Workflow ID owns Feature and Issue planning;
2. direct and WIR-routed Feature targets use the same planning application;
3. WIR provenance remains context only after target creation;
4. Feature Intake, Feature assessment, Issue Intake, Issue RCA, and accepted planning semantics are recoverable from Structured Project State;
5. `workflow_member` is the explicit ownership predicate for Workflow-owned BoundedSolution/Finding/RootCause semantics;
6. accepted Feature assessment materially feeds Feature planning;
7. accepted Issue RCA is atomic and relationship-driven;
8. accepted implementation planning is an atomic canonical BoundedSolution/Phase/WorkItem/Criterion graph;
9. every Criterion has explicit validation policy;
10. `getWorkflowExecutionPlan(projectId, workflowId)` isolates concurrent Workflow graphs and rejects cross-Workflow dependency/membership;
11. source-backed planning reads immutable SourceBaseline state without materializing a writable checkout;
12. non-source Current Projects remain valid through planning;
13. exact Feature/Issue navigation recovers from Workflow.currentWorkspace + SPS;
14. the Work Item Map is read-only;
15. planning creates no ImplementationRecord, Validation, SourceCheckpoint, repair WorkItem, or IntegrationRecord;
16. current Feature/Issue planning is independent of the retired WorkIntake/route-owned planning authority;
17. no WRB04 execution/integration implementation was started.

## Known WRB04 entry debt

Two execution-side items are explicitly carried forward and are not WRB03 defects:

1. `integrationGit` candidate storage/ownership assumes a conventional physical `.git` directory. Managed Current Project `Dev/` is a linked worktree. WRB04 must normalize integration storage/ownership on exact Git common-directory identity and prove managed Dev → candidate → Dev integration.

2. Historical source-semantic repair proof contains a fixture that attempts repair ownership against a superseded Workflow. WRB04 must qualify repair creation/execution against the unique current exact Workflow owner and modernize/retire the stale fixture rather than weakening the current-owner invariant.

## Next authorized bundle

WRB04 — Shared Execution Kernel and Workspaces is authorized from `495c9aca43bd6c90be4abfece01ed9e40fd4c82e`.

WRB04 owns the post-plan runtime from the accepted Work Item Map through Work Card planning/decomposition, Implementer execution, Tester regression design, independent Validation, Repair, Phase/Workflow closure, source checkpoints, integration candidate/Integration Repair, and final Dev integration.
