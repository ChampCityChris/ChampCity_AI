# Work Card — Phase 08 WC15 Project Validation and Close Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium
Depends on: WC14
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC15_project_validation_and_close_workspace.md`

## Purpose

Implement `project-validation` and the derived terminal `project-close` view. Assemble the current governed project corpus, create and disposition `Project_Closeout`, and complete terminal Project Close only from the semantic Approved + Close predicate.

## Controlling Designs

- `PHASE_AND_PROJECT_VALIDATION_CLOSE_WORKSPACE_DEFINITION.md`
- `PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `EVIDENCE_DERIVED_LIFECYCLE_PROJECTION_AND_WORKSPACE_RESOLUTION.md`
- `ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`

## Workspaces

```text
id: project-validation
level: project
stage: validation
order: 10

id: project-close
level: project
stage: close
order: 10
```

`project-close` is a terminal evidence view with no second disposition action.

## Entry Eligibility

Require current Approved Project Profile and Roadmap, current Approved Phase Map, a current Approved `Close` Phase Closeout for every required mapped phase, and explicit treatment of remaining project work as resolved, deferred, transferred, abandoned, or known limitation.

WC01A must explain any missing, stale, contradictory, or DoNotClose phase evidence rather than hide it behind a project-ready flag.

## Governed Corpus

Provide grouping, search, filtering, navigation, and preview for current:

- Project Intake, Architect handoffs, and Architect Interview;
- Project Profile, Roadmap, and Phase Map;
- each phase's interview, planning bundle, candidates, Formal Work Cards, Implementer Reports and their Architect dispositions, repairs, Validation Records, and Phase Closeout;
- observations, risks, decisions, unresolved matters, evidence, and relevant release records.

“Architect disposition” means the status on the corresponding Implementer Report. The browser references existing documents and does not create a duplicate authority snapshot.

## Project Closeout

```text
planning/project/Project_Closeouts/PROJECT_CLOSEOUT_<project-slug>.*
```

A newly created or substantively revised closeout begins Pending, contains artifact/source revisions, and records project identity/purpose/outcome, `Close` or `DoNotClose`, rationale, phase completion summary, delivered outcomes, limitations, unresolved/deferred/transferred/abandoned work, observation/risk/decision reconciliation, release/completion status, Operator approval statement, and disposition.

Support Approved, Rejected, and RevisionRequested through synchronized pair writes.

## Semantic Terminal Completion

```text
Project Close complete
= current Project_Closeout.Document.Status=Approved
  AND closureDecision=Close
```

Approved `DoNotClose` remains current at `project-validation`.

Before allowing Approved Close, block and explain any required missing/stale/contradictory phase or Work Card evidence.

After semantic close, `project-close` displays the completed-project summary and retains corpus access. No hidden terminal record, automatic next project, or second approval is created.

## Freshness

Any governed source revision that affects project completeness invalidates the closeout. Terminal status is always computed from current evidence.

## Explicit Non-Goals

No repeated phase/Work Card testing, release/deployment approval workflow, second project approval, duplicate corpus snapshot, automatic new project, hidden terminal state, route tokens, provider API, DOM automation, new dependency, or Git operation.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Cover stable IDs, entry eligibility, large-corpus grouping/search/filter contracts, current/stale evidence, Pending creation, Approved Close, Approved DoNotClose, final-close blockers, revision invalidation, terminal projection, and retained review access.

## Acceptance Criteria

1. `project-validation` and `project-close` exist at the correct locations.
2. Entry is derived from current project and Phase Close evidence.
3. The governed corpus is grouped, searchable, filterable, navigable, and non-duplicative.
4. Architect dispositions are read from Implementer Reports.
5. New closeouts begin Pending and support safe revision/disposition.
6. Required missing/stale/contradictory evidence blocks Approved Close with plain-language diagnostics.
7. Approved Close completes terminal Project Close.
8. Approved DoNotClose remains at Validation.
9. Upstream revisions invalidate stale terminal approval.
10. No second approval, corpus snapshot, or hidden terminal state is created.
11. Typecheck, build, and tests pass.
12. No Git mutation occurs.

## Implementer Report Requirements

Record repository verification, changed files, workspace IDs, eligibility, corpus grouping/navigation, closeout schema/status, semantic terminal resolver evidence, blockers, DoNotClose behavior, freshness, retained access, and validation results. End with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should review complete and incomplete project corpora, exercise DoNotClose and Close, revise an upstream phase source, and confirm terminal status and blockers update from current evidence.

## Document Disposition

Document.Status=Approved
