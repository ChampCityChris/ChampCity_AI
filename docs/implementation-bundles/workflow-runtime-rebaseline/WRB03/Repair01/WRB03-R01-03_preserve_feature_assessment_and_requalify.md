# WRB03-R01-03 — Preserve Feature Assessment Semantics, Isolate Project Context, and Requalify WRB03

**Depends on:** WRB03-R01-02 checkpoint  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Close the remaining semantic gap in the Feature front half and prove WRB03 as a usable product path after Repair01.

An accepted Feature Architect assessment must become durable exact-Workflow Structured Project State and must materially feed the subsequent Feature plan.

Concurrent peer Workflow plans must not be presented as already-established Project architecture.

This card is also the final Repair01 qualification card.

## 1. Define a bounded Feature assessment contract

Add a structured assessment candidate with the released Feature assessment dimensions:

- Current Product Baseline;
- Requested Capability Delta;
- Behavior and Contracts to Preserve;
- Affected Architecture and Integration Points;
- Compatibility and Rollout;
- Regression Boundary;
- Excluded Future Work.

The Architect handoff may still be human-readable, but acceptance must receive/validate bounded structured content rather than accepting any non-empty string as the entire assessment semantics.

Do not create a generic Plan entity or a new permanent Markdown authority.

## 2. Atomically promote accepted Feature assessment to SPS

Add a typed Project State/application command for Feature assessment acceptance.

Preflight:
- exact current `feature-capability` Workflow;
- current Feature Intake semantic records belong to that Workflow through `workflow_member`;
- assessment candidate is complete and bounded;
- no foreign Workflow record is referenced.

Atomic success must:
- create canonical Feature assessment semantic records in SPS using the existing reviewed vocabulary (Finding records are acceptable for assessment findings/context);
- link every assessment semantic record to the exact Feature Workflow through `workflow_member`;
- record one accepted `feature-assessment-review` Decision;
- link the Decision with `governs` to the Workflow and the exact accepted assessment records;
- advance the Workflow to `feature-planning`;
- return/recover the accepted assessment through SPS.

A revision request must:
- record review state as needed;
- keep the Workflow in the Feature assessment loop;
- create no replacement accepted assessment semantics.

If a later accepted assessment replaces an earlier one before plan acceptance, preserve prior history while exposing only the current accepted Decision's governed assessment set.

## 3. Feed the accepted assessment into Feature planning

Feature plan preparation must include the exact current accepted assessment semantic projection.

It must no longer discard the assessment and plan from Intake alone.

Required planning handoff context:
- exact Workflow identity;
- exact SourceBaseline context when present;
- exact current Feature Intake;
- exact accepted Feature assessment;
- bounded genuine Project-level architecture/governance context;
- routed provenance as context only.

Plan preparation must fail if no current accepted assessment exists.

Restart/reopen must recover the accepted assessment entirely from SPS.

Do not require the in-memory draft map or an old Markdown artifact to reconstruct accepted assessment semantics.

## 4. Isolate genuine Project-level architecture context

Replace the current broad collection of every active BoundedSolution and accepted/approved Decision in the Project.

Define one shared selector used by Feature and Issue planning.

It must exclude:
- BoundedSolutions owned by any Workflow through `workflow_member`;
- planning-acceptance Decisions governing any Workflow;
- Feature assessment review Decisions governing a Workflow;
- Issue RCA/planning review Decisions governing a Workflow;
- WIR route Decisions/assessments;
- any other peer Workflow-specific state.

It may include genuinely Project-level accepted architecture/governance such as:
- accepted Decisions governing the Project itself;
- accepted Decisions governing Project-level resources;
- legacy/current BoundedSolutions with no Workflow owner when they are legitimately Project-level context.

Prefer explicit relationship-based selection over decision-type regexes.

Prove that an accepted but unexecuted plan in Workflow A does not appear in Workflow B's `acceptedArchitecture`/Architect handoff.

## 5. Requalify direct and routed Feature convergence

Repeat a bounded end-to-end service path for:

Direct Feature:
- exact Workflow;
- intake;
- structured Architect assessment;
- accepted SPS assessment;
- plan preparation includes that assessment;
- canonical plan acceptance;
- read-only map.

WIR-routed Feature:
- WIR closes;
- target Feature opens;
- same Feature service and assessment contract;
- routed provenance remains context only;
- accepted assessment/plan owned by target Workflow;
- WIR state cannot change target assessment/plan authority.

## 6. Requalify Issue after ownership/RCA repair

Focused proof must confirm:
- Issue Intake Findings exact ownership;
- Evidence support;
- atomic accepted RCA;
- explicit Decision → RootCause governance;
- correction plan solutionAddresses exact ownership;
- canonical fix WorkItems;
- read-only map;
- no rationale-marker identity.

No private Issue execution path may be reintroduced.

## 7. Requalify actual IPC product paths

Retain R01-01 listener-level proof and include the critical renderer/preload/main path in final WRB03 qualification evidence.

At minimum, prove one successful mutation call for Feature and Issue reaches its service through the registered IPC handler with the preload argument shape.

Do not claim WRB03 usable solely from direct service tests.

## 8. Final WRB03 acceptance checks

Confirm:

1. exact Workflow ID owns Feature and Issue planning;
2. `workflow_member` is the ownership predicate for BoundedSolution/Finding/RootCause planning semantics;
3. a current planning semantic record has one exact Workflow owner;
4. accepted Feature assessment is durable SPS and feeds planning;
5. accepted Issue RCA is atomic SPS state and uses Decision relationships, not rationale parsing;
6. direct and routed Feature converge;
7. concurrent Workflows do not consume peer unexecuted plans as Project architecture;
8. accepted plan graph remains atomic and Workflow-scoped;
9. Work Item Map remains read-only;
10. planning creates no source checkout, SourceCheckpoint, ImplementationRecord, Validation, repair WorkItem, or IntegrationRecord;
11. non-source Projects remain valid;
12. completed WIR reopening behavior remains intact;
13. WRB04 linked-worktree integration candidate defect remains explicitly deferred;
14. no WRB04 execution/integration implementation is started.

## 9. Validation strategy

Run:
- build;
- R01-01 planning IPC proof;
- Project State ownership/atomic RCA tests from R01-02;
- Feature planning focused suite;
- Issue planning focused suite;
- exact Workflow Hub/navigation tests;
- structured WIR routing handoff regression needed for routed Feature convergence;
- capability-map integrity if metadata changed;
- exact validation-plan preview;
- `git diff --check`.

Do not run a broad historical development/Issue lifecycle suite simply because old dependencies select it.

If an old test fails because it asserts the replaced `relates_to` or rationale-marker authority, rewrite/retire that assertion rather than preserving obsolete behavior.

## 10. Final report

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB03/Repair01/Reports/WRB03-R01-03_FINAL_QUALIFICATION_REPORT.md`

Also update the parent WRB03 qualification report/rebaseline honestly with Repair01 results.

Suggested commit:

`WRB03-R01-03 requalify Workflow planning normalization`

Then **STOP for final Architect review**.

Do not begin WRB04.
