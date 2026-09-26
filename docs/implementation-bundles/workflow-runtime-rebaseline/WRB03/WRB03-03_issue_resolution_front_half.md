# WRB03-03 — Implement Issue Resolution Exact-Workflow Evidence, RCA, Correction Planning, and Canonicalization

**Depends on:** WRB03-02 checkpoint  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Replace the generic shell for issue-resolution with an exact-Workflow Issue front half that preserves the materially different Issue task:

Issue Intake
→ evidence/reproduction
→ RCA
→ bounded correction planning
→ canonical Workflow-owned planning graph.

The Issue front half may reuse useful UI/evidence mechanics from the existing Issue stack, but Current Project authority must move to exact Workflow ID and Structured Project State.

The card stops at the same read-only work-item-map boundary as Feature.

## 1. Issue planning application model

Create an Issue planning service/contracts keyed by exact workflowId.

Required projection includes:
- exact Workflow identity/title/state/currentWorkspace;
- source-backed/non-source context and exact SourceBaseline identity when present;
- optional WIR provenance for display only;
- saved Issue intake/reproduction context;
- canonical Evidence/Finding/RootCause state;
- current Architect RCA draft/review state;
- current correction-plan draft/review state;
- accepted canonical correction graph.

Do not use ISSUE_x display aliases, WorkIntake ID, route Decision ID, folder name, or Workflow type as canonical instance identity. Display aliases may exist only as presentation.

## 2. Issue Intake and evidence

Provide a usable Issue Intake workspace for an exact Issue Workflow.

Capture bounded issue context such as:
- observed behavior/failure;
- expected behavior;
- reproduction information;
- environment/context;
- supplied screenshots/files/evidence;
- known impact and constraints.

Promote durable semantics into SPS:
- observed defects become Finding records owned by the exact Workflow;
- supplied durable evidence becomes Evidence with explicit supports relationships to the relevant Workflow/Finding where applicable;
- evidence payloads retain digest/path/reference semantics rather than being silently embedded as Markdown-only authority.

Reuse existing screenshot handling only if it preserves these ownership and evidence invariants.

Direct-start Issue and WIR-routed Issue both use this same Issue service. Routed WIR request/evidence may seed context, but WIR remains closed routing history.

## 3. Architect RCA

Reuse the embedded Architect workflow pattern for investigation.

The RCA handoff must be built from:
- exact Issue Workflow identity;
- exact SourceBaseline when source-backed;
- canonical saved Issue context;
- canonical Findings/Evidence;
- relevant current Project architecture/source evidence.

The Architect may return bounded investigation output, but accepted RCA must be promoted into canonical SPS:
- one or more RootCause records;
- RootCause explains Finding relationships;
- applicable Evidence supports RootCause/Finding relationships;
- Operator disposition/Decision where the RCA review is explicitly an Operator decision;
- currentWorkspace advances only after successful canonical promotion.

Do not leave accepted root cause authority only in ISSUE_RESOLUTION_PLAN.md, an Architect Markdown artifact, or the old issueResolutionService document corpus.

Request Revision leaves the current canonical accepted RCA unchanged and prepares a fresh draft cycle.

## 4. Bounded correction solution and plan

After accepted RCA, prepare the correction plan using the shared WRB03 planning graph contract.

The correction graph must include:
- BoundedSolution addressing the accepted RootCause and/or Findings;
- explicit scope in/out, constraints, assumptions, risks;
- direct or phased topology;
- correction WorkItems;
- dependencies;
- explicit Criteria with verificationIntent and validationPolicy;
- optional Phase-level Criteria.

Correction WorkItems default to WorkItem kind fix.

RootCause/Finding/Solution ownership must resolve to this exact Issue Workflow.

Do not create the old Issue execution binding, Fix Card files, or private Issue execution plan in this card.

## 5. Operator correction-plan disposition

Request Revision/Reject remain planning decisions and create no partial canonical execution graph.

Accept:
- calls the same WRB03-01 atomic plan-normalization primitive used by Feature;
- links the accepted BoundedSolution to the canonical Issue RCA semantics as required;
- records the planning acceptance Decision in SPS;
- advances the exact Issue Workflow to work-item-map.

The normalized WorkItem/Phase/Criterion semantics must be indistinguishable to the future shared execution kernel except for normal Workflow context and WorkItem kind.

## 6. Retire Current Project Issue ownership bridges

For the new exact Issue path, do not use:
- RoutedIssueBridge;
- Work Intake route Decision as Issue identity;
- legacy Work Intake branch binding as Issue source owner;
- old private Issue Fix Card execution binding;
- legacy Issue Markdown disposition as canonical RCA/plan authority.

If old Issue modules remain because historical/unreachable surfaces still import them, fence them from Current Project exact Workflow navigation and document exact remaining callers in the report.

Do not preserve legacy behavior merely to keep retired tests green.

## 7. Read-only Work Item Map boundary

Render the exact Issue Workflow canonical planning graph after acceptance:
- Findings/RCA summary;
- Bounded Solution;
- WorkItems/Phases/dependencies;
- Criteria and validation policies.

No Implement/Validate/Repair/Integrate controls in WRB03.

## 8. Permanent proof

Add focused proof for:
- direct Issue exact-ID intake and evidence;
- two concurrent Issue Workflows isolate Findings/Evidence/RCA/plans;
- same-title Issues remain separate;
- accepted RCA creates canonical RootCause and explains relationships;
- screenshots/evidence are linked to the correct exact Workflow/Finding;
- revision request does not replace accepted RCA or create correction WorkItems;
- accepted correction plan creates Workflow-owned fix WorkItems/Phases/Criteria through the shared plan primitive;
- source-backed Issue planning does not materialize writable source;
- non-source Issue planning works;
- WIR-routed Issue, if exercised, converges on the same service and does not restore WIR ownership;
- Current Project exact Issue path does not invoke RoutedIssueBridge or route/intake-owned planning.

## Non-scope

Do not implement shared Work Card execution, source checkpoints, validation/repair, Phase closure, integration, or the deferred integrationGit repair.

Do not implement other Workflow front halves.

## Validation

Run build; focused new Issue service/renderer/RCA tests; WRB03-01 canonical graph tests; exact Workflow/Hub navigation regression; Evidence/Project State tests affected by the new typed commands; validation-plan preview; git diff --check.

Avoid the historical full Issue lifecycle suite when its only obligation is the retired private execution stack. Rewrite/delete only tests whose production behavior is actually replaced by this card.

## Report/checkpoint

Write docs/implementation-bundles/workflow-runtime-rebaseline/WRB03/Reports/WRB03-03_IMPLEMENTER_REPORT.md.

Suggested commit: WRB03-03 normalize Issue Workflow planning.

Then proceed directly to WRB03-04.
