# Work Card — Phase 08 WC04 Architect Interview Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium-high
Depends on: WC02, WC03
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC04_architect_interview_workspace.md`

## Purpose

Complete `architect-interview` as a dual-pane Project / Intake workspace using the accepted WC03 browser/MCP integration and the canonical repository-backed Project Architect Interview pair.

## Controlling Designs

- `ARCHITECT_INTERVIEW_WORKSPACE_DEFINITION.md`
- `PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`
- `ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`

## Workspace

```text
id: architect-interview
level: project
stage: intake
order: 20
layout: Embedded Architect chat | Interview preview and disposition
```

Reuse the WC03 registry entry and browser component. Do not weaken dedicated session partitioning, remote Node isolation, context isolation, navigation controls, credential protections, or MCP readiness reporting.

## Canonical Interview Pair

```text
planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_<project-slug>.md
planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_<project-slug>.json
```

The WC02 generated prompt must name this exact target.

New or substantively revised interview content begins `Pending`, increments `artifactRevision`, and records current Project Intake and prompt source revisions.

## Review and Revision

Support missing/waiting, loading, ready, RevisionRequested, Approved, Rejected, and local read/synchronization error states.

Approve, Reject, and Request Revision write the same status to both siblings through staged writes. Revision notes remain in the interview pair; no separate approval or revision artifact is created.

The preview refreshes after MCP writes, preserves the last readable version on transient failure, and provides manual Refresh.

## Freshness and Completion

If the Project Intake or generated interview prompt source revision changes, the interview becomes Pending or stale through WC01B and Project Intake is no longer complete.

Project Intake completes only when the current Project Intake and prompt are valid/current and the current interview pair is valid, synchronized, fresh, and Approved.

No automatic navigation or persisted lifecycle state is authorized.

## Explicit Non-Goals

No Project Planning, raw transcript storage, DOM submission, provider API, hidden state, new dependency, Git command, commit, or push.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Cover canonical paths, browser-security regression, waiting/error states, pair writes and rollback, revision notes, source freshness, completion derivation, and real WC03 integration reuse.

## Acceptance Criteria

1. The existing `architect-interview` workspace is completed, not duplicated.
2. Chat and current interview preview are usable together.
3. The canonical interview pair and source revisions are enforced.
4. WC03 browser-security boundaries remain unchanged.
5. Revision and disposition writes are synchronized and safe.
6. Upstream changes invalidate stale interview approval.
7. Project Intake completion requires a current Approved interview.
8. No hidden transition or separate approval artifact is created.
9. Typecheck, build, and tests pass.
10. No Git mutation occurs.

## Implementer Report Requirements

Record repository verification, changed files, layout, canonical paths, WC03 security regression evidence, source freshness, pair-write behavior, validation results, and remaining Operator validation. End with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should conduct a real interview, request a revision, approve it, then revise Project Intake and confirm the older interview no longer completes Intake.

## Document Disposition

Document.Status=Approved
