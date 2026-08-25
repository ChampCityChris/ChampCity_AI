# ISSUE_001-FC03-REPAIR02 — Issue Architect Decision, Disposition, and Status Authority

## Failed Evidence

Parent Fix Card: `ISSUE_001-FC03`.

Parent report: `issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC03_issue_architect_planning.md`.

Operator validation after FC03 and REPAIR01 confirmed that the browser pane now renders, but Architect Planning remains incomplete:

- the selected Issue has no authoritative stage/state in the sidebar;
- `ARCHITECT_INVESTIGATION.md` has no Operator disposition/review function;
- the handoff can reframe a bounded UX/missing-capability Issue merely because no defective implementation exists;
- existence of `ARCHITECT_INVESTIGATION.md` is treated as completion before Operator acceptance;
- there is no safe revision path for a future `RevisionRequested` disposition.

REPAIR01 is preserved as passed for its narrow browser sizing defect.

## Confirmed Root Cause

Repository inspection confirms:

- `buildIssueArchitectHandoffInstruction()` retains defect-centric reframe wording;
- `IssueArchitectPlanningProjection` has no recommendation, Operator disposition, review notes, or Issue Planning eligibility;
- `getIssueArchitectPlanningProjection()` returns `completed` solely because the final investigation file exists;
- no Issue Architect review artifact exists;
- `FigmaSidebar` receives only `IssueRecordProjection`, which has no lifecycle status.

The parent FC03 prohibition on formal disposition is superseded by current Operator validation: Operator review of an Architect output is required workflow authority, not an extra Architect-question gate.

## Objective

Correct the Issue Architect decision/state model so each selected Issue has a durable Architect recommendation, Operator disposition, and current stage/state projection. Correct the prompt so Issue Resolution means bounded corrective work, not only software-defect repair.

REPAIR03 owns the Figma workspace reconstruction.

## Required Changes

### Architect recommendation

Require exactly one recommendation in every new Architect Investigation:

```text
Proceed in Issue Resolution
Reframe to Development/Feature
Unsupported / No Action
```

The handoff must state:

- `Proceed in Issue Resolution` covers supported bounded corrections including code defects, UX/design deficiencies, configuration/environment problems, documentation problems, and missing bounded capabilities;
- absence of a pre-existing defective code path is not by itself a reason to reframe;
- reframe applies only when work is primarily new planned product expansion or too broad/multi-phase for the Issue workflow;
- unsupported applies when evidence does not support the reported project problem or no correction is warranted.

Require:

```text
## Architect Recommendation
<one exact value above>
```

Keep `## Architect Conclusion` for explanatory prose.

### Operator disposition

After a readable current investigation exists, project `Awaiting Operator Review`, not completed.

Support:

```text
Approved
RevisionRequested
Rejected
```

Persist the current review at:

`issues/<ISSUE_ID>/ARCHITECT_REVIEW.md`

The application-owned plain Markdown review records Issue ID, investigation path, Architect Recommendation, disposition, and Operator notes when supplied. `RevisionRequested` requires notes. Browser GPT must never write the review artifact.

### Progression

Projection must distinguish at least:

- Ready for Architect Handoff;
- Handoff Prepared;
- Draft Ready / promotion available;
- Awaiting Operator Review;
- Revision Requested;
- Approved — Ready for Issue Planning;
- Approved — Reframe Recommended;
- Approved — Unsupported / No Action;
- Rejected / Needs Attention.

Issue Planning eligibility is true only when the current investigation exists, disposition is `Approved`, and recommendation is `Proceed in Issue Resolution`.

Approved reframe/unsupported outcomes do not activate Issue Planning. Cross-workflow transfer and Issue Close are outside this repair.

### RevisionRequested

When the current review is `RevisionRequested`:

- Prepare Handoff is available again;
- the handoff includes the current investigation and exact Operator notes;
- Browser GPT still writes only a fresh temporary draft;
- prior investigation/review are preserved under one deterministic Issue-owned history location before current replacement;
- failed archive/replacement leaves the prior current investigation/review intact;
- after successful revised promotion, the revised investigation returns to Awaiting Operator Review.

Do not use a database, hidden store, or Development planning revision path.

### Selected-Issue status

Expose a workflow-status projection separate from `IssueRecordProjection`, identifying the selected Issue's current stage and state. FC03 reports `Architect Planning` plus the current state above. Later cards may extend the same projection.

## Preservation

Preserve FC01, FC02, FC03 MCP/temp-draft/promotion/browser reuse, REPAIR01 browser sizing, Development lifecycle/Repair semantics, Settings/Hub isolation, and project-owned Issue identity.

## Forbidden Changes

Do not implement FC04 planning, cross-workflow transfer, Issue Validation/Close, a database/JSON sidecar, Development `WorkspaceId`/`currentWorkflowService` ownership, a second browser/MCP system, the Figma workspace redesign owned by REPAIR03, Development disposition changes, or Git mutation.

## Acceptance Criteria

1. Prompt explicitly states Issue Resolution is broader than software-defect repair.
2. New investigations contain exactly one allowed Architect Recommendation.
3. Final investigation without review projects Awaiting Operator Review.
4. Approved, RevisionRequested, and Rejected are durably persisted; RevisionRequested requires notes.
5. Review is application-owned at `issues/<ISSUE_ID>/ARCHITECT_REVIEW.md`.
6. Only Approved + Proceed makes Issue Planning eligible.
7. RevisionRequested produces a revision-aware handoff and safe replacement preserving prior evidence.
8. Selected Issue exposes stage/state independently of other open Issues.
9. A bounded UX/missing-capability Issue is not automatically reframed merely because it is not a code defect.
10. Existing Development and Issue browser/MCP behavior remains intact.

## Tests

Add focused proof for the three recommendations, prompt wording, Awaiting Operator Review, disposition persistence, revision notes/history, eligibility matrix, and status projection.

Run at minimum:

```text
npm run build
node --test test/issue-resolution/issue-architect-planning-service.test.cjs
node --test test/issue-resolution/issue-resolution-service.test.cjs
node --test test/renderer/issue-resolution-shell.test.cjs
```

## Implementer Report

Write:

`issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC03-REPAIR02_issue_architect_decision_disposition_and_status_authority.md`

Report root cause, files changed, prompt contract, review/revision persistence, eligibility/status projection, commands/results, deviations, and remaining live validation.

## Return Path

Return to parent FC03 review. REPAIR03 may consume these projection/review actions without a separate prerequisite approval artifact.
