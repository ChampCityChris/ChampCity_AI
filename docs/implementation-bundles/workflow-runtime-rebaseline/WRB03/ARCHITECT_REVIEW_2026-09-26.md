# WRB03 Architect Review — 2026-09-26

**Reviewed checkpoint:** `46da96bcd8d596b68b2924d0fa8dce8e11e06e9d`  
**Disposition:** CORE ARCHITECTURE ACCEPTED / REPAIR01 REQUIRED BEFORE CLOSURE

## Review conclusion

WRB03 established the correct overall planning boundary:

- exact Workflow ID owns the Current Project Feature/Issue planning application;
- direct and WIR-routed targets converge after handoff;
- accepted implementation planning normalizes into canonical SPS BoundedSolution/Phase/WorkItem/Criterion records;
- plan application is atomic;
- `getWorkflowExecutionPlan(projectId, workflowId)` scopes the future execution graph by exact Workflow and rejects cross-Workflow dependencies;
- source-backed planning reads immutable Workflow SourceBaseline state without materializing source;
- Feature and Issue exact-instance navigation reaches dedicated task surfaces;
- the Work Item Map is read-only and WRB04 execution/integration has not started.

The bundle is not closable at `46da96b` because the product path and several pre-plan canonical-authority details do not yet satisfy the released WRB03 contract.

## Finding 1 — product-blocking IPC argument validation

**Classification:** Implementer defect.  
**Severity:** closure blocker.

Both new planning IPC registries validate the entire IPC argument array as though every channel receives exactly one argument:

- `featurePlanningIpc.ts`: `exactId(args)` requires `args.length === 1`;
- `issuePlanningIpc.ts`: `exact(args)` requires `args.length === 1`.

The preload correctly invokes mutation channels with two arguments, for example:

`featurePlanning:saveIntake(workflowId, intake)`

`featurePlanning:prepare(workflowId, stage)`

`issuePlanning:addEvidence(workflowId, files)`

The main-process wrapper forwards those arguments unchanged. Therefore all two-argument Feature/Issue mutation channels reject before reaching their service. The service-level tests did not exercise the actual renderer → preload → IPC listener path.

Required repair:
- validate Workflow ID independently of channel arity;
- enforce correct channel-specific arity;
- add focused listener-level IPC proof for every new planning channel.

## Finding 2 — Workflow ownership contract is not actually used for Findings/RootCauses

**Classification:** Implementer defect.  
**Severity:** architectural closure blocker.

WRB03 introduced the correct explicit `workflow_member` relationship for BoundedSolution/Finding/RootCause → Workflow, but Feature and Issue services continue to use generic `relates_to` as the ownership predicate:

- Feature Intake Findings are created/read through `relates_to`;
- Issue Intake Findings are created/read through `relates_to`;
- accepted Issue RootCauses are created/read through `relates_to`;
- `acceptWorkflowPlanningGraph()` validates `solutionAddresses` ownership through `relates_to`.

This contradicts the released baseline:

> Do not use relates_to as a substitute for an ownership invariant if a typed membership rule is required.

It also leaves WRB04 without one trustworthy membership predicate for Workflow-scoped planning semantics.

A related implementation issue must be corrected at the same boundary: `acceptWorkflowPlanningGraph()` currently treats the existence of **any** `workflow_member` edge to the Workflow as proof that a canonical plan already exists. Once Findings/RootCauses correctly use `workflow_member`, that check would incorrectly prevent plan acceptance. Plan-existence detection must be based on the accepted BoundedSolution/planning Decision, not generic planning membership.

Required repair:
- migrate Current Project Feature/Issue Finding and RootCause ownership to `workflow_member`;
- make one active Workflow owner the invariant for each current `workflow_member` source record;
- validate Issue solution addresses through `workflow_member`;
- change plan-existence detection so pre-plan owned Findings/RootCauses do not block plan acceptance;
- retain `relates_to` only for genuinely non-owning association.

## Finding 3 — accepted Issue RCA identity is encoded inside Decision rationale

**Classification:** Implementer defect.  
**Severity:** architectural closure blocker.

Issue RCA acceptance records the accepted RootCause IDs inside free-text Decision rationale using:

`[canonical-root-causes:<ids>]`

The read path regex-parses that rationale to discover which RootCause records constitute the accepted RCA.

That makes structured semantic identity depend on parsing a text field and bypasses the explicit Project State relationship model. It also means RCA promotion is assembled through multiple independent Project State transactions: RootCause creation, ownership, explains/supports edges, Decision creation, and Workflow transition can partially succeed.

Required repair:
- add one typed atomic Issue RCA acceptance command;
- preflight all Finding/Evidence references before mutation;
- create RootCauses, exact Workflow membership, explains/supports relationships, accepted Decision governance, and the `issue-planning` transition atomically;
- link the accepted Decision with `governs` to the exact accepted RootCause records;
- resolve current accepted RCA from Decision relationships, never from a marker embedded in rationale;
- preserve prior RCA history without treating obsolete RootCauses as the current accepted set.

## Finding 4 — accepted Feature assessment is discarded before planning

**Classification:** Implementer defect.  
**Severity:** product/semantic closure blocker.

The Feature assessment workspace requires a non-empty Architect draft, but accepting the assessment records only a `feature-assessment-review` Decision. The assessment content itself is then deleted from the in-memory draft map.

The subsequent plan handoff is rebuilt from Feature Intake plus broad Project context; it does not contain the accepted Architect assessment.

The result is a ritual gate:

Feature Intake → Architect assessment → Accept → discard assessment → plan from Intake again.

WRB03 requires a substantive Feature assessment stage feeding planning, not merely an approval bit.

Required repair:
- define a bounded structured Feature assessment candidate covering the released assessment dimensions;
- atomically promote accepted assessment semantics into exact-Workflow SPS records;
- govern those accepted assessment records with the assessment Decision;
- include the exact current accepted assessment in Feature plan preparation;
- revision must not partially replace the current accepted assessment;
- no Markdown/prose scan may be required to recover the accepted assessment.

## Finding 5 — concurrent Workflow plans leak into “accepted Project architecture” context

**Classification:** Architect miss in specification, implemented behavior is still unacceptable.  
**Severity:** closure blocker because WRB03 explicitly supports concurrent independent Workflows.

Both Feature and Issue planning services build `acceptedArchitecture` by broadly collecting active BoundedSolutions and accepted/approved Decisions from the Project.

A newly accepted plan for Workflow A therefore becomes “accepted Project architecture” presented to Workflow B before Workflow A has executed or integrated. Feature assessment/planning Decisions can also enter another Workflow's context.

That violates the intended concurrency boundary even though it does not mutate Workflow B.

Required repair:
- define the Project-level architecture context selector explicitly;
- exclude BoundedSolutions owned by another active Workflow through `workflow_member`;
- exclude Workflow-scoped planning/assessment/RCA Decisions from peer Workflow context;
- include only genuinely Project-level accepted architecture/governance state, such as accepted Decisions governing the Project/project-level resources and legacy project-level solutions with no Workflow owner, where applicable;
- prove two concurrent Workflows do not consume each other's unexecuted plans as current Project architecture.

## Accepted implementation areas

No repair is requested for these WRB03 areas unless the repair exposes a direct regression:

- atomic accepted planning graph normalization;
- application-issued canonical plan IDs;
- explicit Criterion validation policies;
- direct/phased topology validation;
- exact Workflow-scoped WorkItem/Phase projection;
- cross-Workflow WorkItem dependency rejection;
- immutable SourceBaseline planning context;
- no planning-time source materialization;
- direct/WIR target planning convergence at the service boundary;
- exact-instance renderer dispatch;
- read-only Work Item Map boundary;
- WRB04 linked-worktree integration defect remains deferred to WRB04.

## Repair release

Release `WRB03/Repair01/` as three sequential cards:

1. `WRB03-R01-01` — restore Feature/Issue IPC product-path reachability;
2. `WRB03-R01-02` — restore canonical Workflow ownership and atomic Issue RCA authority;
3. `WRB03-R01-03` — preserve Feature assessment semantics, isolate Project architecture context, and requalify WRB03.

Luna Medium may execute all three sequentially with one focused checkpoint and Implementer Report per card.

No Architect review is required between cards.

After R01-03: **STOP for final Architect review.**

Do not begin WRB04.
