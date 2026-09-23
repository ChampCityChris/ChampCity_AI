# Work Intake Routing Repairs — Architect Review

**Review date:** 2026-09-22  
**Reviewed repairs:** WIR23-REPAIR01-REPAIR01, WIR23-REPAIR04, WIR23-REPAIR03A, WIR23-REPAIR03B, WIR23-REPAIR03C  
**Review basis:** Implementer Reports, current production/test source, current combined build/test evidence, Implementer-Ready Work Card experiment standard.

## Overall result

The repair sequence is substantially correct. The sequential-Intake repair and Research completion/checkpoint architecture are implemented as designed. Generic completion evidence is now a real integration-domain concept rather than a fake Plan adapter, and planning-only Research can reach target-owned candidate validation/integration without manufacturing a Plan, Work Item, Phase, or routed-development execution binding.

Two bounded defects remain in the combined production call chain.

They are not reasons to reopen the WIR architecture. Both are specific freshness/retained-state seams and have dedicated repair cards.

## Independent review evidence

Current combined source passed an independent production build while running the authoritative test owner.

Independent targeted results obtained during this review:

- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`: 10/10 passed.
- `test/issue-resolution/issue-architect-planning-service.test.cjs`: 12/12 passed.
- production build invoked by the validation runner: passed.

Further independent test-toolbox invocations were unavailable because another validation run held the repository validation lock. That is an execution-availability condition, not a test failure. The Implementer Reports contain passing evidence for every card-mandated focused command.

## WIR23-REPAIR01-REPAIR01

### Conforming implementation

`workPlanningKernel.ts` now distinguishes mutable route-history provenance from semantic planning freshness:

- full route source revision/digest remains persisted;
- routeDecisionId/routeId remain the planning identity;
- already-promoted artifact freshness ignores only the route-decision provenance path;
- all Intake, Assessment, Issue/RCA and other semantic sources remain exact;
- in-flight preparation/promotion remains strict.

Existing Feature planning and real-route supersession proof is preserved.

### Finding AR-WIR-R1 — Issue-generated Assessment still rewrites on history-only route change

`workIssueRoutingService.ts` remains coupled to `route.artifactRevision`.

It constructs:

`sources = [current Intake revision, current route-decision revision]`

and, whenever readable Issue RCA exists, regenerates the route-specific Assessment's `sourceRevisions` and `workflowData.sourceDigests`. Its write predicate compares full workflowData.

After a same-route reroute disposition:

1. effective `route.selection.decisionId` and route remain unchanged;
2. `workPlanningKernel` correctly considers the existing Issue Assessment/Plan semantically current;
3. the canonical route-decision document revision/digest advances for audit history;
4. a later `runWorkIssueAction(..., "status")` sees the newer route revision/digest;
5. no Issue/RCA semantic evidence changed, but the service rewrites the Assessment anyway;
6. the Assessment revision advances;
7. an existing Plan still references the prior Assessment revision and becomes stale.

This defeats the retained-route guarantee through the bespoke Issue adapter even though the generic planning kernel is correct.

Repair: `WIR23-REPAIR01-REPAIR02_preserve_issue_planning_freshness_after_retained_route_history.md`.

## WIR23-REPAIR04

No material defect found.

The service now owns `suggestedBase`; a checked-out managed Work Intake resolves its recorded integration target against current branch inventory; the historical base commit is not reused; missing target fails closed; the renderer consumes the service suggestion; and explicit Operator branch selection remains legal.

The existing branch-establishment service remains the exact stale-source authority.

## WIR23-REPAIR03A

No material defect found.

Research completion now has a real `IntegrationCompletionEvidence` identity. The completion resolver requires a current selected Research route and current approved no-Plan Assessment. Fingerprint is SHA-256 of exact canonical Assessment bytes.

The Research lifecycle boundary uses the existing application-owned checkpoint mechanism. The bounded canonical source graph is verified, unrelated changes fail closed, route-history provenance is the only allowed semantic revision exception, and no Plan/Work Item/Phase is manufactured.

The Implementer additionally touched the shared fixture and ValidationCatalog metadata beyond the card's primary expected list. Review found those changes attributable to exercising the new existing owners rather than architectural scope expansion.

## WIR23-REPAIR03B

No material defect found in the IntegrationCandidate/Repair contract migration itself.

`IntegrationCandidateRecord` now owns one `completion: IntegrationCompletionEvidence`; the candidate layer no longer projects Plans; candidate identity binds to the complete six-field completion tuple; and Integration Repair has one protected `completion` governing source supporting both Plan and Research canonical evidence.

Plan-backed integration remains expressed as `kind: "plan"` completion evidence.

## WIR23-REPAIR03C

### Conforming implementation

Planning-only Research now:

- resolves before Plan lookup;
- exposes completion-neutral routed integration state;
- checkpoints immediately before first candidate creation;
- validates matching Research lifecycle checkpoint evidence;
- constructs the ordinary shared IntegrationCandidate;
- advances the target only after candidate validation;
- retains the Work Intake checkout;
- exposes shared integration UI without Plan execution controls.

The new renderer owner is justified because no prior renderer test represented integration without an execution projection.

### Finding AR-WIR-R2 — Changed completion can hide an active retained candidate

`routedIntegrationService.query()` currently performs:

`candidate.list(intakeId).filter(entry => sameCompletion(entry.completion, state.completion))`

before selecting the retained candidate.

That is too strict for candidate discovery.

If a candidate has already been retained in `conflicted`, `validation-failed`, `failed`, `constructing`, or `operator-decision` state and the same logical completion later gets a new revision/fingerprint, the retained record no longer passes `sameCompletion()`.

The workflow therefore cannot surface that candidate for abort. It can project the new completion as candidate-free and may offer construction of another candidate.

This regresses the previous Plan-specific behavior, which found records by stable Plan identity first and then blocked when revision/fingerprint changed until the retained candidate was aborted.

The candidate core itself correctly rejects a changed completion when `current(record)` is called. The defect is that routed discovery stops finding the record before that safety can matter.

Repair: `WIR23-REPAIR03C-REPAIR01_retain_candidate_until_abort_when_completion_changes.md`.

## Repair order

The two repairs are independent.

1. WIR23-REPAIR01-REPAIR02
2. WIR23-REPAIR03C-REPAIR01

Either may be implemented first. Each should return independently for Architect review.

After both pass, the WIR repair package is ready for final architecture closure review.
