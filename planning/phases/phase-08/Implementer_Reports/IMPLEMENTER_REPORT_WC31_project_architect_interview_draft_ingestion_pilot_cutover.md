<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "implementer-report",
  "artifactRevision": 1,
  "participationRole": "implementationEvidence",
  "identity": { "phaseId": "phase-08", "workCardId": "WC31" },
  "sourceRevisions": [
    { "path": "planning/phases/phase-08/Work_Cards/WC31_project_architect_interview_draft_ingestion_pilot_cutover.md", "revision": 1 }
  ],
  "workflowData": { "passType": "numbered-work-card", "gitMutationAuthorized": false },
  "documentDisposition": { "status": "Pending", "notes": "Automated implementation evidence; Operator running-product validation remains required.", "reviewedAt": null }
}
CHAMPCITY-METADATA -->

# Implementer Report — WC31 Project Architect Interview Draft-Ingestion Pilot Cutover

## Repository and Git

- Repository inspected: verified approved repo root.
- Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Remote: `origin` configured for the approved repository.
- Intended commit message: `WC31 project architect interview draft ingestion pilot cutover`.
- Git actions: none. WC31 prohibits staging, committing, pushing, and other Git mutation.
- Commit hash: not created.

## Implementation Summary

The Project Architect Interview is the sole production output registered for the shared WC30 draft-ingestion and promotion services. A fresh handoff creates one application-owned temporary draft path under `planning/Architect_Drafts/`, instructs the embedded chat to use `artifact_toolbox.create_markdown_artifact` with `overwrite: false`, and excludes canonical metadata and final-target authority.

The status refresh detects only that registered draft, promotes it through the shared canonical writer, verifies the final document, then cleans the consumed draft. Promotion failure keeps the draft and exposes the error; a retry creates a distinct fresh draft path. The retired Interview-only direct save IPC and preload API were removed. Other Architect output flows were not changed.

## Files

Created:

- `src/main/architectInterview/architectInterviewDraftPilot.ts`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC31_project_architect_interview_draft_ingestion_pilot_cutover.md`

Modified for this cutover:

- `src/main/architectInterview/architectInterviewService.ts`
- `src/main/integrations/architectMcpHandoffService.ts`
- `src/main/main.ts`
- `src/main/projectIntake/projectIntakeService.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `test/architect-interview/architect-interview-workspace.test.cjs`
- `test/documents/single-file-workflow.test.cjs`
- `test/project-intake/project-intake-service.test.cjs`
- `test/repository/runtime-wiring-source.test.cjs`
- `test/workflow/production-service-proof.test.cjs`

Intentionally not created: migration utilities, fallback save paths, manual-import UI, a second production output definition, MCP changes, or compatibility readers.

## Validation

Normal Windows Lane 1 passed:

- `npx tsc --noEmit` — passed.
- `npx tsc` — passed.
- `npx vite build` — passed.
- `node --test --test-concurrency=1` — passed: 157 tests, 0 failures.

The first sandboxed full test attempt returned the documented `spawn EPERM` environment failure. It was not treated as a source failure or as passing evidence; the normal Windows lane above was used.

## Required Proof

1. Proven — exactly one production definition: Project Architect Interview.
2. Proven — uses shared WC30 inspection and promotion services.
3. Proven — fresh handoff supplies one generated draft path and only the generic artifact writer invocation.
4. Proven — tests simulate writing only the temporary draft before application promotion.
5. Proven — application definition builds and writes the canonical Interview.
6. Proven — artifact semantics, freshness, and review surface are preserved by focused production-path tests.
7. Proven — shared promotion verifies final output before cleanup; covered by shared and pilot tests.
8. Proven — malformed body retains draft, creates no final Interview, and reports promotion failure.
9. Proven — existing Interview files are neither migration inputs nor modified by the pilot path.
10. Proven — retired Interview-specific save service, IPC handler, and preload method are removed.
11. Proven — no old save fallback, alias, dual write, old-action retry, or manual import was added.
12. Proven — regression suite confirms other Architect-output flows retain their existing behavior.
13. Proven — typecheck, TypeScript build, Vite build, and complete tests pass in the normal Windows lane.
14. OperatorValidationPending — live embedded ChatGPT/MCP running-product validation is required before additional output adoption.

## Manual Validation Required

The Operator must run the WC31 fresh-output sequence in the actual Electron application: prepare handoff; confirm the exact draft path arrives in embedded ChatGPT; create only the draft through MCP; confirm automatic promotion, cleanup, Pending review visibility, and disposition controls. Also verify malformed-draft visibility, fresh retry behavior, absence of the old save path, and unchanged behavior for every non-Interview Architect output flow.

## Security and Residual Risks

No secrets, credentials, tokens, `.env` files, or concrete local machine paths were added. Renderer filesystem authority remains absent; draft and canonical writes stay main-process-owned. The active fresh submission is process-resident, so an application restart before promotion requires preparing a fresh handoff rather than discovering an abandoned draft. This is consistent with the pilot's fresh-submission and no-migration boundary, but the Operator should include it in the running-product review.

## Recommended Next Implementer Task

Do not adopt another output flow until the Operator records successful WC31 running-product validation.
