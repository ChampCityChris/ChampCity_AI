# WRB02 Final Architect Disposition — 2026-09-26

**Reviewed through:** dff9951225c319591ffe41b73a99621eb43c257c  
**Disposition:** CLOSED / ACCEPTED

## Review conclusion

WRB02 now satisfies its architectural boundary: the Current Project owns a multi-instance Workflow application, direct substantive Workflow creation and WIR-routed creation converge on one application/source-baseline service, exact Workflow ID is the navigation identity, and Work Intake Routing ends at target creation and handoff.

Repair01 is accepted as completed.

### R01-01

Accepted at bc7be408e8ca54ac0805b87815566fd293acf22c.

The repair correctly:
- rejects Start New Project after the one-time Project Creation Workflow exists;
- permits only the bounded incomplete-Greenfield retry that creates the missing Project Creation Workflow;
- keeps reopened/refreshed closed WIR instances on their completed summary;
- permits automatic target opening only from a newly successful live route decision;
- retains explicit Open routed Workflow navigation;
- preserves the complete Work Intake request while deriving a deterministic Workflow display title no longer than 200 characters.

The implementation remains inside the Workflow application/WIR ownership boundary and does not recreate legacy authority.

### R01-02 / R01-03

Accepted at dff9951225c319591ffe41b73a99621eb43c257c.

The modernized source-materialization proof establishes the supported seam:

WRB02 substantive Workflow creation
→ exact immutable SourceBaseline plus unprepared SourceBinding
→ exact Workflow-ID lazy materialization
→ workflow/<workflow-id> SourceLine
→ registered RepositoryCheckout
→ ready SourceBinding.

The retained focused proof also covers exact baseline preservation across Dev advance, supersession ownership, concurrent Workflow checkouts, ready retry, blocked/conflicting checkout behavior, and invalid owners.

The attempted structured-integration modernization exposed a separate production defect in integration candidate storage/ownership. integrationGit currently assumes the operation root owns a physical .git directory, while Current Project managed Dev is a linked worktree whose Git common directory is .champcity/repository.git. This is a real defect, but it is downstream of WRB02's application/routing/materialization boundary. It is correctly recorded as a mandatory WRB04 entry repair. WRB02 does not claim structured integration passed.

## WRB02 acceptance invariants

The reviewed implementation now establishes all WRB02 obligations:

1. exact Workflow ID, not type/title, is application identity;
2. Project Creation is one-time and reopened through Existing Project/Hub;
3. repeatable substantive Workflow types support independent concurrent instances;
4. direct substantive start bypasses WIR;
5. WIR is optional, source-neutral, and routing-only;
6. WIR recommendation/Operator disposition are Structured Project State authority;
7. accepted/overridden WIR creates one independent target Workflow through the same semantic creation primitive as direct start;
8. routes_to provenance is retained and WIR closes after successful handoff;
9. WIR owns no SourceBaseline, SourceBinding, SourceLine, target plan, execution, repair, or integration;
10. source-backed substantive Workflow creation captures the exact managed Dev baseline without materializing writable source;
11. closed WIR history is inspectable without implicit navigation;
12. the Current Project no longer enters the retired WIR-owned post-route planning/execution pipeline.

## Deferred debt

The linked-worktree integration candidate defect is owned by WRB04 and is not waived. WRB04 must resolve exact Git common-directory identity before shared integration qualification.

The historical structured-integration fixture remains stale until that WRB04 repair. It is not evidence against WRB02 application/routing acceptance and must not be rewritten to conceal the production defect.

## Next authorized bundle

WRB03 — Workflow Planning Normalization is authorized to begin from dff9951225c319591ffe41b73a99621eb43c257c.

WRB03 owns the exact-Workflow planning front half and the canonical Structured Project State planning boundary for Feature/Capability and Issue Resolution. WRB04 remains the first bundle authorized to execute, validate, repair, or integrate the resulting canonical plan graph.
