# Work Card — Phase 08 WC14 Phase Validation and Close Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium
Depends on: WC13
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC14_phase_validation_and_close_workspace.md`

## Purpose

Implement `phase-validation` and the derived `phase-close` view. Assemble the current pertinent phase document population, create and disposition `Phase_Closeout`, and complete Phase Close only from the semantic Approved + Close predicate.

## Controlling Designs

- `PHASE_AND_PROJECT_VALIDATION_CLOSE_WORKSPACE_DEFINITION.md`
- `PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `EVIDENCE_DERIVED_LIFECYCLE_PROJECTION_AND_WORKSPACE_RESOLUTION.md`
- `ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`
- `WORK_CARD_CANDIDATE_CONTRACT.md`

## Workspaces and Migration

```text
id: phase-validation
level: phase
stage: validation
order: 10

id: phase-close
level: phase
stage: close
order: 10
```

Retire the provisional `Phase Closeout` navigation entry. Closeout documents are reviewed and dispositioned in `phase-validation`; `phase-close` is a derived completion view with no second disposition action.

## Entry Eligibility

Require current Approved Phase Interview, current Approved Phase Planning bundle, and every candidate either derived complete or explicitly resolved under the candidate contract with required evidence.

Completion and candidate status are computed from current documents. No stored completion flag or Phase Map completion field is authorized.

## Phase Population

Group and navigate current:

- Phase Interview, Phase Planning, Work Card Plan;
- Formal Work Cards;
- Implementer Reports and their current Architect dispositions;
- repair Work Cards and repair reports;
- Validation Records;
- candidate resolution evidence;
- observations, risks, decisions, and relevant evidence.

“Architect report disposition” means the disposition written on the corresponding Implementer Report. Do not create or require a separate Architect Review artifact.

The population is an index over current durable documents, not a copied corpus snapshot.

## Phase Closeout

```text
planning/phases/<phase-id>/Phase_Closeouts/PHASE_<phase-number>_CLOSEOUT_<slug>.*
```

A newly created or substantively revised closeout begins `Pending`, contains artifact/source revisions, and records phase identity/outcome, `Close` or `DoNotClose`, rationale, completion summary, limitations, unresolved/deferred/superseded/carried-forward matters, observation/risk/decision reconciliation, map/roadmap impact, Operator approval statement, and disposition.

Support Approved, Rejected, and RevisionRequested through synchronized pair writes.

## Semantic Completion

```text
Phase Close complete
= current Phase_Closeout.Document.Status=Approved
  AND closureDecision=Close
```

Approved `DoNotClose` remains current at `phase-validation`. It records an accepted decision to keep the phase open and does not advance.

After semantic close, `phase-close` displays the evidence and Return to Project Building. WC01A re-evaluates the Phase Map and current closeouts to identify the next phase or Project Validation boundary.

## Freshness

Any current phase document revision that affects closeout sources invalidates the closeout. Completion indicators are always recomputed from current evidence.

## Explicit Non-Goals

No repeated Work Card testing, Project Validation, second approval, activation artifact, duplicate corpus snapshot, hidden active/completion state, route tokens, provider API, DOM automation, new dependency, or Git operation.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Cover provisional migration, stable IDs, eligibility, population grouping, current/stale evidence, Pending creation, Approved Close, Approved DoNotClose, revision invalidation, computed next phase, and no duplicate review artifact.

## Acceptance Criteria

1. `phase-validation` and `phase-close` exist at the correct lifecycle locations.
2. The provisional Phase Closeout entry is retired.
3. Entry is derived from current phase and candidate evidence.
4. The pertinent population is grouped and navigable without duplication.
5. Architect review means Implementer Report disposition, not a separate artifact.
6. New closeouts begin Pending and support safe revision/disposition.
7. Approved Close completes; Approved DoNotClose remains at Validation.
8. Completion and next phase are computed from current documents.
9. Upstream revisions invalidate stale closeout approval.
10. No second approval or hidden state is created.
11. Typecheck, build, and tests pass.
12. No Git mutation occurs.

## Implementer Report Requirements

Record repository verification, changed files, migration, workspace IDs, eligibility, grouping, closeout schema/status, semantic resolver evidence, DoNotClose behavior, freshness, next-phase projection, and validation results. End with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should inspect a complete and incomplete phase, approve DoNotClose and Close decisions, revise underlying evidence, and confirm the current location and computed next phase update correctly.

## Document Disposition

Document.Status=Approved
