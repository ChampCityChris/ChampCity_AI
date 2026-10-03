# WSF Remaining Boundary Audit — WSF16 through WSF20

**Reviewed head:** `4e86704` — WSF15 recovered Implement shell  
**Historical UI baseline:** `965536de265a4d494503f2173daddc5e81982a88`

## Purpose

This audit is the forward architecture/code review that must prevent the Implementer from discovering one missing SQL/domain boundary per remaining shell.

Reviewed:

- historical Review & Validation, Repair, Validation and Close workspace behavior;
- current `ImplementationAttempt` / `ImplementationRecord` model;
- Tester and Criterion validation paths;
- Repair creation and completion semantics;
- recovered Work Card Map / Intake / Planning adapters;
- current Greenfield navigation resolver;
- Project/Phase Closeout and source-integration sequencing.

## Findings

### F1 — WSF16 and WSF18 share one missing durable SQL validation/review artifact

Historical Greenfield used one `validation-record` family for both:

- direct Report Review Operator decisions (`ValidatePassed` / `RequestRepair`);
- explicit `Create Current Validation Attempt` in Work Card Validation.

The artifact bound the exact approved Work Card, exact Implementer Report revision, Operator notes, advisory Architect summary, and optional repair defect text.

Current SQL has excellent **criterion-level** authority:

- `TesterResult`;
- typed `Validation`;
- Criterion-specific Operator `Decision`;
- WorkItem completion eligibility.

But there is no aggregate exact Implementer-result review identity preserving the historical Operator decision.

**Required foundation:** one `WorkItemValidationCycle`, used by both WSF16 and WSF18. It does not replace criterion proof.

### F2 — Manual report-level defect cannot currently create Repair

`createWorkflowRepair` currently accepts:

- failing current required Criterion `Validation`;
- rejected current criterion-specific Operator `Decision`;
- exact current `TesterResult(recommendation=production-defect-suspected)`.

It correctly rejects a generic WorkItem/report failure.

Historical `RequestRepair` is nevertheless a legitimate human Operator finding against the exact current Implementer result and requires explicit defect text.

**Required foundation:** an exact `work-item-validation-review` Decision governing a current `WorkItemValidationCycle` with bounded nonempty `repairDefectText` becomes an accepted Repair failure source. Do not fabricate Tester or Criterion evidence.

### F3 — Advisory Architect review ingress is missing

Historical Review & Validation provided an advisory Architect handoff built from the approved Work Card and current Implementer Report.

Current structured review service has no equivalent. Because Architect output is durable workflow output under the current architecture, advisory output must enter SQL rather than be pasted into a renderer field.

**Required foundation:** extend WSF03A `workflow_toolbox.submit_stage_candidate` with `work-item-review-advisory`; persist the bounded advisory result on/referenced by the exact `WorkItemValidationCycle`. Operator disposition remains human-only.

### F4 — WSF17 lacks a structured Repair workspace adapter

The SQL Repair WorkItem itself already exists and has good lineage:

- `repairs` → parent WorkItem;
- `part_of` → exact Phase/Workflow;
- `implements` → accepted BoundedSolution;
- repair Criterion `derived_from` exact failure evidence;
- WSF03A WorkItem planning ingress can plan the Repair WorkItem;
- WSF14A/15 can implement it.

But there is no bounded application read model that reconstructs the historical Repair workspace context from those records.

**Required foundation:** one Repair workspace application adapter; no new Repair authority entity.

### F5 — WSF18 is an alternate/manual validation surface, not an extra mandatory lifecycle hop

Historical main Work Card loop allowed Report Review to produce the effective validation decision directly. The separate `work-card-validation` workspace existed as an explicit/manual validation surface.

The recovered nested rail already groups `work-card-report-review` and `work-card-validation` under one **Review & Validation** loop step.

Therefore Greenfield must not force:

`Report Review → Work Card Validation → Close`

for every card.

Both shells operate on the same `WorkItemValidationCycle` + criterion proof model. WSF18 remains a first-class building block and navigable surface.

### F6 — WSF19 card currently specifies behavior that never existed

Historical `WorkCardCloseWorkspace.tsx` does **not** contain:

- Close / DoNotClose;
- close rationale;
- a second Work Card close decision.

Work Card closure is already established by accepted validation/completion evidence. The historical Close screen is terminal evidence/status plus **Return to Phase Building / Next Work Card**.

The current WSF19 card must be corrected before execution.

### F7 — Greenfield navigation is still too coarse for WSF20

Current `GreenfieldNavigationProjection.currentWorkspace` only supports:

- Project Intake;
- Architect Interview;
- Project Planning;
- Phase Map;
- Phase Interview;
- Phase Planning;
- generic `workflow-execution`;
- Hub.

Current `GreenfieldWorkspace` mounts one generic `WorkflowExecutionWorkspace` for the entire nested Work Card / Validation / Close lifecycle.

WSF20 cannot compose the recovered shells until navigation resolves the full nested SQL lifecycle.

**Required foundation:** WSF19A full Greenfield nested lifecycle resolver.

### F8 — no separate Integration shell is required

Source-backed Project Creation sequencing is already correct after WSF05A:

```text
all Phase work complete
→ workflow integration-ready
→ Project Validation shell exposes source integration action
→ integration completes
→ Project Creation remains active and returns to project-validation
→ reviewed Project Closeout
→ Project Close
```

Do not create a hidden nineteenth/twentieth generic Execution/Integration workspace.

### F9 — Repair return semantics differ from the historical Markdown workflow

Current SQL `completeWorkItem` closes a Repair WorkItem then moves its parent from `validation_pending` to `ready`.

Historical effective-completion logic could treat an approved Repair chain as completion evidence for the parent without re-running its Implementer.

This is a real semantic difference. It is **not necessary to invent a renderer workaround in WSF17**. Current structured proof requires fresh parent implementation/tester evidence after source-changing repair, so WSF20 must route the resumed parent according to current SQL (`ready` → Implement) and expose this in Operator audit.

Do not silently claim historical direct-parent-close parity. A future policy change can alter effective Repair evidence after explicit Operator review; it is not required to finish shell recovery.

## Remaining implementation sequence

```text
WSF15A  structured WorkItem validation/report-review foundation
WSF16   recovered Review & Validation shell
WSF16A  structured Repair workspace application adapter
WSF17   recovered Repair shell
WSF18   recovered alternate/manual Work Card Validation shell
WSF19   corrected terminal Work Card Close shell
WSF19A  full SQL Greenfield nested lifecycle resolver
WSF20   compose Greenfield and stop for Operator audit
```

## Expected remaining domain changes

Only WSF15A should add a new Project State entity.

WSF16A and WSF19A are application/read/navigation boundaries and must not create new canonical authority.

## Stop expectation

After these foundations are implemented, no currently identified SQL/domain stop condition remains in WSF16–WSF20.

An Implementer should stop only for a genuinely new contradiction not covered by this audit.
