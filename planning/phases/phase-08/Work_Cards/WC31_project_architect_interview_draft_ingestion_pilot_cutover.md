<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC31"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC30_reusable_architect_draft_ingestion_and_canonical_promotion.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC30-REPAIR01_submission_identity_cleanup_and_report_integrity.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC30-REPAIR02_unambiguous_source_path_identity_encoding.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC30A_single_canonical_markdown_writer_consolidation.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Project Architect Interview Draft-Ingestion Pilot Cutover",
    "status": "approved_for_implementation",
    "executionMode": "one bounded production cutover",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC31_project_architect_interview_draft_ingestion_pilot_cutover.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Cut over only new Project Architect Interview output creation to the approved WC30 draft-ingestion foundation. Preserve Project Intake, existing Interview evidence, review behavior, and every other Architect-output flow.",
    "reviewedAt": "2026-07-31"
  }
}
CHAMPCITY-METADATA -->

# WC31 — Project Architect Interview Draft-Ingestion Pilot Cutover

Status: Approved for Implementer execution  
Git mutation: prohibited

## Code-Review Finding

The current Project Architect Interview output path is still domain-specific:

```text
buildArchitectHandoffInstruction()
→ instructs ChatGPT to call artifact_toolbox.submit_handoff_outputs
→ saveCurrentArchitectInterviewOutput(markdownBody)
→ application builds canonical Interview metadata and writes final target directly
```

The removable direct-save surface is:

```text
src/main/architectInterview/architectInterviewService.ts
  saveCurrentArchitectInterviewOutput()

src/main/main.ts
  architectInterview:saveOutput

src/preload/index.ts
  saveArchitectInterviewOutput

src/shared/workspaceContracts.ts
  saveArchitectInterviewOutput contract
```

The existing context resolver already owns the Project Intake and Prompt prerequisites, final Interview target, canonical identity, source revisions, freshness, conflict detection, and review eligibility. The existing renderer already refreshes the Architect Interview workspace model. Those authorities must be preserved rather than duplicated.

## Objective

Cut over only new Project Architect Interview output creation to the WC30 shared foundation:

```text
current Approved Project Intake and Prompt
→ application creates deterministic Architect Interview draft submission
→ handoff gives ChatGPT the exact temporary draft path
→ ChatGPT calls artifact_toolbox.create_markdown_artifact
→ existing workspace-model refresh inspects and promotes the draft
→ application constructs and writes the final canonical Interview
→ successful promotion removes the consumed draft
→ existing Pending review surface displays the final Interview
```

Existing Interview files remain repository evidence and are not migrated, rewritten, imported, or converted into draft submissions.

## Required Change 1 — One Production Output Definition

Register exactly one production `ArchitectOutputDefinition` for Project Architect Interview.

It must use:

```text
outputKind: project-architect-interview
owningWorkspaceId: architect-interview
bundleMode: single-output
one slot: architect-interview.md
```

The definition must derive from `resolveCanonicalArchitectInterviewContext()`:

- current Approved Project Intake;
- current Approved associated Architect Interview Prompt;
- application-owned final Interview target;
- expected project identity;
- exact source revisions.

The definition must build the same final canonical meaning currently produced by `saveCurrentArchitectInterviewOutput()`:

```text
artifactType=project-architect-interview
participationRole=gatingReview
artifactRevision=1 for a fresh absent target
identity=current expected project identity
sourceRevisions=current Intake and Prompt revisions
workflowData={}
documentDisposition.status=Pending
```

WC31 is a fresh-output pilot. If the exact final target already exists, do not overwrite or revise it through this cutover. Return the existing workspace state. RevisionRequested correction of an existing Interview remains outside this pilot.

## Required Change 2 — Deterministic Submission Orchestration

Add one narrow Project Architect Interview orchestration service that:

1. resolves the current ready Interview context;
2. creates the WC30 submission from the current Prompt path and revision;
3. exposes the exact expected temporary draft path in the workspace model or handoff instruction;
4. inspects the submission during Architect Interview model refresh;
5. promotes only when the complete expected draft is ready;
6. returns the existing `ArchitectInterviewWorkspaceModel` after promotion or failure.

Use the shared WC30 registry, submission, inspection, promotion, and cleanup services. Do not reproduce their algorithms in the Interview service.

Promotion failure must remain visible through the Architect Interview model as actionable `Needs Attention` evidence. Do not silently suppress it, delete the failed draft, or create a final Interview.

## Required Change 3 — Replace Handoff Instructions

Replace the current `submit_handoff_outputs` instructions with the generic writer invocation:

```json
{
  "action": "create_markdown_artifact",
  "workspaceId": "<resolved workspace ID>",
  "params": {
    "relativePath": "<application-generated temporary draft path>",
    "content": "<complete body-only Project Architect Interview Markdown>",
    "overwrite": false
  }
}
```

The handoff must state:

- the exact temporary draft path;
- only body Markdown belongs in the draft;
- no metadata delimiters or canonical metadata;
- MCP creates only the temporary draft;
- ChampCity A/I owns validation, final target, metadata, promotion, and review state;
- completion is not claimed until the application detects and promotes the draft;
- failure must be reported exactly with no fallback.

Remove all active Interview instructions for:

- `submit_handoff_outputs`;
- `handoffKind=architect-interview`;
- domain-specific MCP metadata derivation;
- retired save actions;
- manual copy/import fallback.

## Required Change 4 — Remove the Old Direct-Save Surface

After the new path is connected, delete:

- `saveCurrentArchitectInterviewOutput()`;
- `architectInterview:saveOutput` IPC registration;
- preload `saveArchitectInterviewOutput` exposure;
- shared API contract for that method;
- tests whose sole purpose is the retired direct-save route.

Do not retain an alias, compatibility wrapper, fallback, hidden retry, dual write, or alternate manual input path.

Do not remove disposition review functions or the existing context resolver.

## Required Change 5 — Preserve Current Application Behavior

Preserve unchanged:

- Project Intake creation and approval;
- Architect Interview Prompt creation and approval;
- final Interview path family;
- Interview context resolution and conflict handling;
- freshness evaluation;
- Operator disposition controls;
- selected review document behavior;
- lifecycle rail status after final promotion;
- Project Planning readiness after Interview approval;
- every other Architect-output flow.

Do not change Project Intake unless fresh-project validation exposes a concrete regression. Stop and report that regression rather than expanding WC31.

## Authorized Production Surface

Expected changes are limited to:

```text
src/main/architectInterview/architectInterviewService.ts
src/main/architectInterview/architectInterviewContextResolver.ts only if a narrow read-only accessor is required
src/main/architectOutputs/architectOutputRegistry.ts or one adjacent production-definition module
src/main/architectOutputs/architectDraftSubmissionService.ts only if an existing public function must be reused without behavior change
src/main/architectOutputs/architectDraftPromotionService.ts only if an existing foundation defect is proven; otherwise do not modify
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx only for existing model-refresh/status presentation wiring
focused Architect Interview and WC30 integration tests
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC31_project_architect_interview_draft_ingestion_pilot_cutover.md
```

Any change to WC30 foundation behavior requires stopping and reporting a separate repair need.

## Required Automated Proof

Record each as `Proven`, `OperatorValidationPending`, or `NotProven`:

1. Exactly one production Architect-output definition exists: Project Architect Interview.
2. A fresh ready context produces one deterministic submission and one exact draft path.
3. Handoff instructions use only `create_markdown_artifact` with `overwrite:false`.
4. Handoff contains no active `submit_handoff_outputs`, `handoffKind`, domain-specific save action, or final canonical target instruction.
5. A valid draft is detected and promoted through WC30 without duplicate inspection or promotion logic.
6. Final canonical metadata, identity, source revisions, target, Pending disposition, and review behavior match the pre-cutover meaning.
7. Successful promotion removes the expected draft only after final verification.
8. Invalid draft or promotion failure creates no final Interview and retains the draft with visible failure state.
9. An existing final Interview is not overwritten, migrated, or converted into a submission.
10. The old direct-save function, IPC, preload exposure, shared API contract, and active tests are absent.
11. No fallback, alias, compatibility path, dual write, old-action retry, or manual import exists.
12. Project Intake and every other Architect-output flow remain unchanged.
13. Typecheck, build, and complete tests pass in the normal Windows lane.
14. Fresh-project running-product validation remains pending for the Operator.

## Required Operator Validation

Use a fresh test project or repository state with no existing Architect Interview final target:

```text
create Project Intake
→ verify canonical Intake and Prompt
→ approve Intake
→ open Architect Interview
→ copy/send generated handoff
→ ChatGPT creates only the exact temporary draft
→ application detects and promotes automatically
→ temporary draft disappears after success
→ final Interview appears Pending in the existing review surface
→ apply Approved disposition
→ verify Project Planning becomes available
```

Also verify one malformed draft attempt:

```text
malformed body-only draft
→ no final Interview
→ draft retained
→ visible Needs Attention state
```

Do not authorize another production-output cutover until this running-product validation passes.

## Non-Scope

Do not:

- revise an existing Interview through the new path;
- adopt Project Planning, Phase Map, Phase Interview, Phase Planning, Work Card Plan, Formal Work Card, or Repair Work Card;
- migrate existing files;
- modify ChampCity_GPT;
- add background workers, broad directory scans, sidecars, marker files, hashes, tokens, databases, or persistent run stores;
- add content-quality scoring or new governance gates;
- perform Git operations.

## Completion

Create the Implementer Report only after automated proof items 1–13 pass. Item 14 must remain `OperatorValidationPending` until the running application is validated by the Operator.

Do not package, promote, restart, reconnect, stage, commit, push, reset, clean, stash, merge, tag, or publish in this Work Card.
