# WIR-UX02-REPAIR03 — Decouple Promoted RouteAssessment Validity from Managed Dev HEAD Movement

**Parent:** `WIR-UX02 — Rebuild Routing Assessment and Route Decision Workspace`  
**Repairs:** `WIR-UX02-REPAIR02 — Add Explicit Stale-Assessment Recovery and Preserve Routed Handoff Navigation`  
**Prior Implementer Report:** `docs/implementation-bundles/work-intake-routing-ui-recovery/Implementer_Reports/IMPLEMENTER_REPORT_WIR-UX02-REPAIR02.md`  
**Governing structured routing implementation:** `WRB02-03 — Structured WIR Routing Handoff`  
**Status:** **ACTIVE — OPERATOR VALIDATION BLOCKER**

## Objective

Correct the Work Intake Routing freshness contract so a promoted advisory RouteAssessment remains actionable when the managed `Dev` HEAD advances after the assessment was prepared.

A promoted RouteAssessment is advisory evidence tied to the Work Intake version and carries source-revision provenance. Its captured `Dev` revision is historical evidence of what the Architect may have inspected; it is **not** a concurrency token that revokes the Operator's route decision when ordinary repository development advances.

Required behavior:

```text
current Work Intake + promoted RouteAssessment
-> Dev HEAD may advance
-> RouteAssessment remains current/actionable
-> Operator may Accept, Override, or Request Revised Assessment
-> Accept/Override creates the target Workflow from the CURRENT Dev baseline
```

A changed Work Intake remains a real freshness boundary and still requires a current assessment.

---

## Failed Operator validation

Operator validation on the live Work Intake Routing screen produced:

```text
Error invoking remote method 'structuredWIR:decide':
Error: Managed Dev HEAD changed; refresh and prepare a current routing assessment.
```

Observed sequence:

1. A current Architect recommendation existed: `Refactor / Migration`.
2. The Operator entered rationale, which enabled Override / Revision controls.
3. The Operator changed the override dropdown, then changed it back to the recommended route.
4. The Operator clicked **Accept Recommendation**.
5. Acceptance failed with the managed-`Dev` HEAD freshness error above.

Changing the override selector must not invalidate an assessment or require another Architect assessment.

---

## Confirmed implementation facts

Repository inspection confirms this is not caused by the dropdown.

### Renderer

`src/renderer/app/StructuredWorkRoutingWorkspace.tsx` stores the override selection only in local React state.

For `accept`, the renderer sends:

- exact `assessmentId`;
- `disposition: "accept"`;
- optional rationale.

It does **not** send the override selector value for an acceptance.

### Service

`src/main/workflow/structuredWorkRoutingService.ts` currently:

1. records optional managed `Dev` HEAD in RouteAssessment provenance;
2. reparses that revision through `assessmentVersionAndDev(...)`;
3. marks an already-promoted assessment stale when current `readDevRevision(root)` differs from the captured revision;
4. independently repeats the same comparison inside `decide(...)` and throws:
   `Managed Dev HEAD changed; refresh and prepare a current routing assessment.`;
5. then, if routing proceeds, reads current `Dev` HEAD again to seed the new target Workflow `SourceBaseline`.

The current implementation therefore conflates two separate concepts:

- **assessment provenance** — what source revision existed when Architect advice was prepared;
- **target Workflow baseline** — the source revision from which newly routed work must begin.

### Existing regression proof encodes the defect

`test/workflow/workflow-application-service.test.cjs` currently requires a promoted source-backed assessment to become stale and reject routing when the synthetic revision changes from `a...` to `b...`.

That test must be corrected with the production contract; do not preserve the defective assertion.

---

## Root cause

The stale-assessment contract introduced by the routing implementation and preserved by REPAIR02 is too broad.

REPAIR02 correctly repaired the stale-state UX, but it explicitly preserved managed-`Dev` revision mismatch as a route-decision blocker. That architecture treats the optional source revision captured with advisory routing evidence as if it were an optimistic-lock version for the later Operator decision.

It is not.

The Work Intake version and exact RouteAssessment identity govern whether the recommendation still applies to the request being routed. The target Workflow's source baseline is a separate lifecycle fact and must be captured from current managed source when the target is created.

---

# Required correction

## 1. Work Intake version remains the hard assessment freshness boundary

A promoted RouteAssessment is stale when its provenance does not correspond to the current Work Intake record version.

Preserve:

- exact Work Intake identity;
- exact current RouteAssessment identity;
- Work Intake `recordVersion` freshness;
- revision-request state;
- closed/routed state;
- exact Operator decision semantics.

If the Work Intake changes after the assessment was prepared, the existing stale recovery flow remains valid.

Do not weaken this boundary.

---

## 2. Managed Dev HEAD movement must not stale a promoted RouteAssessment

After a RouteAssessment has been promoted into Project State, a difference between:

```text
assessment provenance dev-head
and
current managed Dev HEAD
```

must **not**:

- set `assessment.stale = true`;
- hide route-decision controls;
- trigger **Prepare Current Assessment**;
- reject Accept;
- reject Override;
- reject Request Revised Assessment;
- require a second Architect routing assessment.

Remove the promoted-assessment decision gate based solely on current `Dev` HEAD mismatch.

---

## 3. Preserve captured Dev revision as provenance

Do not discard source evidence.

The assessment may continue recording:

```text
work-intake-record-version:<n>;dev-head:<revision>
```

or the existing equivalent provenance representation.

That revision remains useful to establish:

> this advisory assessment was prepared with source evidence from revision X.

Do not rewrite old RouteAssessment provenance when `Dev` advances.

Do not mutate the promoted assessment merely to make it appear current.

---

## 4. Target Workflow baseline must use current Dev HEAD at the route decision

For `accept` and `override`, when the Project has managed source:

1. resolve/read the current managed `Dev` revision at decision time;
2. use that current revision as the target Workflow `SourceBaseline.baseRevisionId`;
3. create the normal lazy SourceBinding against that baseline;
4. complete the WIR handoff atomically.

Example:

```text
RouteAssessment provenance: dev-head = A
Dev advances to:             dev-head = B
Operator accepts route
Target SourceBaseline:       B
```

The target Workflow must not be seeded from historical assessment revision A merely because the Architect inspected A.

This behavior already mostly exists after the defective mismatch guard; preserve and prove it.

---

## 5. Current Dev availability is still required when creating a source-backed target

This repair does not allow source-backed target creation from an unknown baseline.

If a repository is configured and current managed `Dev` cannot be resolved at the moment of `accept` or `override`:

- fail before partial route handoff;
- create no target Workflow;
- create no route Decision;
- create no SourceBaseline/SourceBinding;
- leave the Work Intake/WIR workflow recoverable.

Preserve the existing no-partial-state behavior.

This is distinct from rejecting a known current revision merely because it differs from the assessment's historical provenance.

---

## 6. Override selector remains local UI state

Preserve the current renderer contract:

- changing the override dropdown does not write Project State;
- changing it does not mutate the RouteAssessment;
- changing it does not touch Git;
- changing it does not prepare a new assessment;
- changing it does not affect Accept Recommendation.

When the Operator returns the selector to the Architect recommendation and clicks **Accept Recommendation**, acceptance is evaluated solely as an `accept` disposition against the current RouteAssessment.

Do not add selector-driven freshness behavior.

---

## 7. Keep stale recovery, but align the copy with the corrected stale meaning

REPAIR02's stale recovery remains required for a genuinely changed Work Intake.

Where current UI copy says that the assessment may be stale because "the Work Intake or source evidence changed," revise it so it does not imply ordinary `Dev` movement invalidates a promoted assessment.

Use bounded language equivalent to:

```text
The Work Intake changed after this recommendation was prepared.
Prepare a current Architect assessment before selecting a route.
```

Do not remove the stale recovery state.

---

## 8. Do not broaden this repair into pending-handoff semantics

This card corrects **promoted RouteAssessment -> Operator decision** freshness.

Do not redesign the behavior of an Architect submission that is still pending and has not yet promoted a RouteAssessment.

Existing preparation-time supersession rules may remain unchanged in this repair.

If that behavior later proves too aggressive, route it as a separate defect rather than expanding this card.

---

# Required production areas

Inspect and modify only where required:

- `src/main/workflow/structuredWorkRoutingService.ts`;
- `src/renderer/app/StructuredWorkRoutingWorkspace.tsx` only for stale-state wording if needed;
- `test/workflow/workflow-application-service.test.cjs`;
- `test/renderer/work-intake-routed-workspaces.test.cjs` only where stale-state wording/contract proof requires adjustment.

Do not modify Project State schema, source-control services, Git tooling, MCP contracts, route taxonomy, or target planning workspaces.

---

# Regression proof

Prefer modifying existing stable tests rather than adding redundant permanent tests.

## A. Source-backed promoted assessment survives Dev movement

Modify the existing structured source-backed WIR test to prove:

1. assessment prepared/promoted while `Dev = A`;
2. stored RouteAssessment provenance retains `A`;
3. `Dev` advances to `B`;
4. `getStructuredWorkRouting(...)` still returns:
   - the same assessment identity;
   - `assessment.stale === false`;
   - a current/actionable routing state;
5. Accept succeeds without preparing another assessment;
6. exact target Workflow is created;
7. target `SourceBaseline.baseRevisionId === B`;
8. RouteAssessment provenance remains `A`.

Do not temporarily set `Dev` back to A to make routing succeed.

## B. Override after Dev movement

Prove the same `A -> B` source movement permits a valid override with:

- distinct supported route;
- required rationale;
- target Workflow baseline B.

## C. Work Intake change still invalidates routing advice

Preserve or extend existing proof that changing the Work Intake version:

- supersedes a pending assessment submission where already governed;
- or marks an already-promoted assessment stale as applicable;
- blocks Accept/Override until a current assessment exists.

The correction must not reduce Work Intake version safety.

## D. Current source unavailable still fails atomically

Preserve existing proof that inability to resolve the current source baseline for a source-backed target leaves:

- Work Intake active;
- WIR Workflow active;
- no target route relationship;
- no route Decision;
- no SourceBaseline;
- no SourceBinding.

## E. Renderer selector behavior

Use existing renderer coverage or extend it minimally to prove:

```text
current assessment
-> enter rationale
-> choose another override route
-> return selector to recommended route
-> Accept Recommendation remains available
-> accept dispatch contains no override route
```

No assessment refresh or prepare call occurs from selector changes.

---

# Preserve prior validated behavior

Do not regress:

- no-prose Accept;
- optional acceptance note;
- override requires a distinct route plus rationale;
- revision request requires instructions;
- exact target Workflow navigation after Accept/Override;
- Revision remains in Routing;
- passive refresh does not auto-open target Workflow;
- stale Work Intake recovery through **Prepare Current Assessment**;
- automatic polling/promotion from REPAIR01/REPAIR02;
- historical RouteAssessment remains inspectable;
- target Workflow lazy source materialization;
- atomic no-partial-state route handoff.

---

# Forbidden changes

Do not:

- remove Work Intake version freshness;
- stop recording RouteAssessment source provenance;
- seed the target from stale assessment revision when a newer current baseline exists;
- introduce another assessment-validity store or hidden flag;
- add UI state as persistence;
- create a second routing API;
- change route IDs/taxonomy;
- redesign target Workflow intake/planning;
- change Project State schema;
- change Git/MCP/source-control architecture;
- run a broad refactor around structured WIR.

---

# Acceptance criteria

The repair passes when:

1. changing only the override dropdown cannot invalidate a RouteAssessment;
2. a promoted RouteAssessment remains actionable after managed `Dev` advances;
3. Accept succeeds after `Dev` advancement without another Architect assessment;
4. Override succeeds after `Dev` advancement when its normal inputs are valid;
5. Request Revised Assessment is not blocked solely by `Dev` advancement;
6. the RouteAssessment still records the source revision used as historical provenance;
7. the newly created target Workflow receives the current source revision as its `SourceBaseline`;
8. a changed Work Intake still requires a current assessment;
9. unavailable current source still prevents partial source-backed target creation;
10. REPAIR01/REPAIR02 polling, decision affordances, stale recovery, and routed navigation remain intact;
11. `git diff --check` passes.

---

# Validation

Run bounded repair validation:

- production typecheck/build through the repository's current repair validation lane;
- focused structured WIR service tests in `test/workflow/workflow-application-service.test.cjs`;
- focused renderer test only if renderer behavior/copy changes;
- repair validation-plan preview with the exact changed-path set;
- `git diff --check`.

Do not substitute the full regression suite for this repair.

The Implementer Report must distinguish:

- existing permanent tests reused unchanged;
- existing tests modified to replace the defective managed-`Dev` freshness assertion;
- any new permanent test, with a specific uncovered behavior justification.

---

# Implementer Report

Write:

`docs/implementation-bundles/work-intake-routing-ui-recovery/Implementer_Reports/IMPLEMENTER_REPORT_WIR-UX02-REPAIR03.md`

The report must state:

- confirmed root cause;
- production files changed;
- exact promoted-assessment freshness behavior;
- RouteAssessment provenance behavior;
- A -> B target-baseline proof;
- Work Intake stale-boundary preservation;
- unavailable-source atomicity proof;
- selector/Accept regression proof;
- focused validation results;
- deviations or blockers.

---

# Checkpoint and STOP

After implementation and focused proof, create the bounded checkpoint commit:

`WIR-UX02-REPAIR03 decouple promoted routing advice from Dev HEAD movement`

Then STOP for Architect review and Operator revalidation of the original live scenario.
