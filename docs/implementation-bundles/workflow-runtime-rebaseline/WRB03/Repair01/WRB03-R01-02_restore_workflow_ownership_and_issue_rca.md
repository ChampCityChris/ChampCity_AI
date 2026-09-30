# WRB03-R01-02 — Restore Exact Workflow Semantic Ownership and Atomic Issue RCA Authority

**Depends on:** WRB03-R01-01 checkpoint  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Make the exact Workflow ownership model real for pre-plan Feature/Issue semantic records and remove free-text identity from Issue RCA authority.

This card repairs Project State semantics. It does not redesign the accepted canonical plan graph.

## 1. Use `workflow_member` for planning semantic ownership

Current Project planning ownership for these records must use the explicit ownership predicate:

- Feature Intake Findings;
- Issue Intake Findings;
- Issue RootCauses;
- accepted Feature assessment Findings introduced by R01-03;
- BoundedSolution (already implemented).

Replace Current Project planning reads/writes that use:

`record -> relates_to -> Workflow`

as ownership with:

`record -> workflow_member -> Workflow`

Generic `relates_to` may remain for genuine non-owning associations only.

Do not infer owner from category, title, creation order, file path, route provenance, or Decision rationale.

## 2. Enforce one exact Workflow owner

Strengthen the Project State relationship command/boundary so a current BoundedSolution/Finding/RootCause cannot acquire multiple active `workflow_member` owners.

Required behavior:
- first valid owner may be established;
- duplicate identical edge is rejected by existing duplicate protection;
- a second distinct Workflow owner is rejected;
- WIR and Project Creation remain invalid ownership targets;
- non-current/terminal Workflow targets remain invalid;
- immutable ownership history remains durable.

Apply the invariant through the normal Project State relationship command used by application services, not only through UI convention.

Add focused proof for attempted cross-Workflow ownership.

## 3. Correct accepted-plan existence detection

`acceptWorkflowPlanningGraph()` currently treats any `workflow_member` edge to the Workflow as evidence that the Workflow is already planned.

That is incompatible with correctly owned pre-plan Findings/RootCauses.

Change plan-existence detection to the actual canonical plan marker.

A Workflow is already planned when its current accepted planning graph exists, for example through:
- an active Workflow-owned BoundedSolution plus accepted planning Decision; or
- an equivalent explicit canonical condition proven by the implementation.

Pre-plan Findings/RootCauses must not block first plan acceptance.

Do not permit a second accepted BoundedSolution graph for a Workflow whose canonical plan already exists.

## 4. Validate Issue solution addresses by exact ownership

In `acceptWorkflowPlanningGraph()`:
- `solutionAddresses` may reference only Finding/RootCause records;
- every referenced record must be a current member of the exact target Workflow through `workflow_member`;
- a Finding/RootCause owned by another Workflow must reject before graph mutation;
- no `relates_to` fallback.

The BoundedSolution `addresses` links remain the correct semantic relationship after ownership validation.

## 5. Add one typed atomic Issue RCA acceptance command

Move Issue RCA canonical promotion out of a chain of generic service calls.

Add a typed Project State command, named appropriately, whose input includes:
- exact active Issue Workflow ID;
- bounded RootCause candidates;
- exact Finding IDs;
- exact Evidence IDs;
- Operator rationale/review context as appropriate.

Preflight all candidates before mutation:
- target is exact current `issue-resolution` Workflow;
- Findings are current and owned by that Workflow through `workflow_member`;
- Evidence exists and is already supported by the exact Workflow/owned Issue context;
- candidate lists are bounded;
- each RootCause cites at least one valid Finding;
- no foreign Workflow semantic record is accepted.

Atomic success must:
- create accepted RootCause records;
- link each RootCause via `workflow_member` to the exact Issue Workflow;
- create `explains` links to exact Findings;
- create `supports` links from cited Evidence;
- create one accepted `issue-rca-review` Decision;
- link that Decision with `governs` to the Issue Workflow and each RootCause in the accepted RCA set;
- transition the Workflow to `issue-planning`;
- leave no partial RootCause/relationship/Decision/workspace change on failure.

The application/service must call this typed command for RCA acceptance.

## 6. Remove canonical identity from Decision rationale

Delete the `[canonical-root-causes:...]` marker convention.

Issue planning read state must determine the current accepted RCA from:
- current/latest applicable accepted RCA Decision;
- its explicit `governs` relationships to RootCause records;
- exact Workflow ownership.

Decision rationale remains human rationale only.

No regex/prose parse may be required to identify canonical RootCause records.

When a later RCA supersedes an earlier accepted RCA before correction-plan acceptance, preserve the earlier RCA as history but ensure only the latest accepted Decision's governed RootCauses are returned as current accepted RCA. If a state marker must change on prior RootCauses, do so explicitly and retain history.

## 7. Migrate the new WRB03 code path, not historical product data

This repository is still under active runtime recovery. Do not add a broad migration/provider compatibility layer for WRB03 states that were never released as a stable product contract.

Update focused fixtures and disposable Current Project proof to the corrected ownership model.

Do not add a `relates_to` compatibility read fallback to Current Project Feature/Issue planning.

## 8. Permanent proof

Prove:

- Feature Intake Findings use `workflow_member`;
- Issue Intake Findings use `workflow_member`;
- Issue RootCauses use `workflow_member`;
- one semantic record cannot be owned by two Workflows;
- pre-plan Findings do not falsely mark a Workflow as already planned;
- first plan acceptance still succeeds with owned Findings/RootCauses present;
- second canonical plan acceptance rejects;
- foreign Workflow `solutionAddresses` reject before mutation;
- Issue RCA acceptance is atomic under an injected/controlled failure;
- accepted RCA Decision governs exact RootCauses;
- current RCA read path uses relationships, not rationale markers;
- no `canonical-root-causes` marker remains in production;
- two concurrent Issues cannot consume each other's Findings/RootCauses.

## Non-scope

Do not yet redesign Feature assessment persistence or Project architecture context selection; R01-03 owns those.

Do not begin execution/source materialization/integration.

## Validation

Run:
- build;
- focused Project State relationship/planning graph tests;
- focused Issue planning/RCA service tests;
- Feature planning tests affected by ownership migration;
- Workflow-scoped projection regression;
- validation-plan preview;
- `git diff --check`.

Do not run broad legacy Issue execution tests.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB03/Repair01/Reports/WRB03-R01-02_IMPLEMENTER_REPORT.md`

Suggested commit:

`WRB03-R01-02 restore Workflow planning ownership and RCA authority`

Then proceed directly to R01-03.
