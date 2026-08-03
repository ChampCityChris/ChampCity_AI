<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC31-REPAIR01",
    "repairId": "WC31-REPAIR01",
    "parentWorkCardId": "WC31"
  },
  "sourceRevisions": [
    { "path": "planning/phases/phase-08/Work_Cards/WC31_project_architect_interview_draft_ingestion_pilot_cutover.md", "revision": 2 },
    { "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC31_project_architect_interview_draft_ingestion_pilot_cutover.md", "revision": 1 }
  ],
  "workflowData": {
    "title": "Interview Cutover Contract, Revision, and Retry Repair",
    "status": "approved_for_implementation",
    "executionMode": "one bounded WC31 repair pass",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC31-REPAIR01_interview_cutover_contract_and_retry_repair.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Repair only the generic MCP invocation, WC30 identity bypass, guarded canonical Interview revision, and failed-submission retry path.",
    "reviewedAt": "2026-07-31"
  }
}
CHAMPCITY-METADATA -->

# WC31-REPAIR01 — Interview Cutover Contract, Revision, and Retry Repair

Status: Approved for Implementer execution  
Parent: `WC31`  
Git mutation: prohibited

## Objective

Correct four defects in the implemented Project Architect Interview cutover. Preserve the WC30 foundation and make the cutover support both initial Interview creation and guarded substantive revision through one production path.

## 1. Emit the Real MCP Toolbox Invocation

Generate this exact invocation structure in the Architect handoff:

```json
{
  "action": "create_markdown_artifact",
  "workspaceId": "<resolved workspace ID>",
  "params": {
    "relativePath": "<application-generated temporary draft path>",
    "content": "<complete body-only Interview Markdown>",
    "overwrite": false
  }
}
```

Requirements:

- instruct the Architect to resolve the configured workspace ID when unknown;
- use `relativePath`, not `path`;
- place action arguments inside `params`;
- keep `overwrite:false` for temporary drafts;
- include no final canonical target, metadata, handoff kind, old save action, fallback, or manual import;
- test the complete nested shape, not loose substring presence.

## 2. Use WC30 Deterministic Submission Identity

Delete the Interview-specific timestamp identity implementation:

```text
Date.now()
lastSubmissionTimestamp
custom submission ID strings
custom promotion group ID strings
```

Use `buildDeterministicArchitectDraftSubmissionId()` through the production definition for both submission ID and promotion group ID.

Submission context must include:

- output kind;
- owning workspace ID;
- current Prompt path and revision;
- an application-owned submission key.

Submission keys:

```text
initial request: request-1
first explicit retry or revision request: request-2
next explicit request: request-3
```

The ordinal is process-owned orchestration state. It increments only when the Operator explicitly prepares or copies a new handoff. Polling must not increment it. Do not use time, randomness, hashes, secrets, tokens, or filesystem scanning to derive it.

## 3. Implement Guarded Canonical Interview Revision

Temporary drafts are never overwritten. Final canonical Interviews may be substantively revised only when the existing target is the current valid Interview.

### Target absent

Promote as:

```text
artifactRevision=1
documentDisposition=Pending
notes=""
reviewedAt=null
```

### Target exists and is eligible

Allow replacement only when the existing file is:

- readable canonical Markdown;
- `artifactType=project-architect-interview`;
- `participationRole=gatingReview`;
- at the exact application-owned target;
- matched to the current expected project identity;
- the single current Interview resolved by `resolveCanonicalArchitectInterviewContext()`;
- `RevisionRequested` or otherwise explicitly selected for substantive replacement by the current Interview workflow.

Use the shared canonical substantive-revision semantics:

```text
same final path
artifactRevision + 1
current Intake and Prompt source revisions
same artifact type, role, identity, and workflow data
new body
Pending disposition
notes cleared
reviewedAt cleared
```

Use `metadataWithSubstantiveRevision()` or `updateCanonicalMarkdownSubstantiveRevision()` where appropriate. Do not reproduce revision arithmetic or disposition reset logic.

### Target exists but is not eligible

Block promotion and retain the draft when the target is unmanaged, malformed, unreadable, wrong type, wrong role, wrong identity, duplicated, conflicting, stale outside the current revision workflow, or otherwise not the current resolvable Interview.

Do not modify the existing target in these cases.

## 4. Explicit Fresh Retry After Promotion Failure

When a submission reaches `promotion-failed`:

- retain the failed draft unchanged;
- keep the failure visible in the workspace model;
- polling alone must not create another submission;
- the next explicit prepare/copy action must increment the request ordinal once;
- create a distinct submission ID and distinct absent draft path;
- make the new handoff target only the new path with `overwrite:false`;
- do not reuse, delete, overwrite, or silently supersede the failed draft.

The same explicit-new-handoff mechanism must support a `RevisionRequested` Interview by creating a fresh temporary draft while preserving the existing canonical Interview until promotion succeeds.

## Preserve

Preserve:

- exactly one production Project Architect Interview definition;
- WC30 inspection, promotion, cleanup, and canonical writer services;
- removal of the retired direct-save function, IPC, preload exposure, and shared API;
- current Interview context resolution, freshness checks, review surface, and Project Planning readiness;
- Project Intake and every other output flow;
- no fallback, alias, compatibility wrapper, dual write, old-action retry, or manual import.

## Authorized Surface

Expected changes are limited to:

```text
src/main/architectInterview/architectInterviewDraftPilot.ts
src/main/architectInterview/architectInterviewService.ts
src/main/integrations/architectMcpHandoffService.ts only if required for explicit handoff preparation
focused Architect Interview and runtime-wiring tests
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC31-REPAIR01_interview_cutover_contract_and_retry_repair.md
```

Do not modify WC30 foundation services, Project Intake, renderer, preload, shared API contracts, or other output services unless a compile-only adjustment is unavoidable and documented.

## Required Proof

Record each as `Proven`, `OperatorValidationPending`, or `NotProven`.

1. The generated handoff contains the exact callable action/workspace/params structure.
2. The handoff uses `relativePath` and `overwrite:false` for drafts.
3. Submission and promotion IDs use the WC30 deterministic identity builder.
4. No time, randomness, hash, secret, token, or hidden value participates in identity.
5. Repeated polling does not change the active submission ID or request ordinal.
6. Each explicit prepare/copy action advances the ordinal exactly once and produces a distinct draft path.
7. An absent final target promotes as canonical Interview revision 1.
8. A current eligible existing Interview promotes at the same path with revision +1 and resets to Pending with cleared notes and reviewedAt.
9. An ineligible or conflicting existing target remains byte-identical and blocks promotion.
10. Promotion failure retains the failed draft and creates no final change.
11. Explicit retry uses a new absent draft path and leaves the failed draft untouched.
12. The old direct-save route remains absent.
13. Other output flows remain unchanged.
14. Typecheck, build, and complete tests pass in the normal Windows lane.
15. Operator running-product validation remains pending.

## Non-Scope

Do not alter WC30 algorithms, migrate existing files, add cleanup workers, add broad abandoned-draft discovery, adopt another output flow, add dependencies, or perform Git operations.

## Completion

Create the Implementer Report only after proof items 1–14 pass. Do not claim Operator running-product validation.
