<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "repair-work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR05",
    "parentWorkCardId": "WC25"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR05_single_canonical_markdown_replacement_pair_protocol_deletion_and_operator_content_ingestion_completion.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Single Canonical Markdown Replacement and Old Authority Deletion",
    "executionMode": "one continuous Codex task",
    "recommendedReasoning": "medium",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Operator approved concise revision 2 after the first implementation retained prohibited compatibility authority and deleted regression coverage.",
    "reviewedAt": "2026-07-27"
  }
}
CHAMPCITY-METADATA -->

# WC25-REPAIR05 — Single Canonical Markdown Replacement and Old Authority Deletion

Status: approved for immediate continuation
Owner: Implementer
Execution: one continuous Codex task using medium reasoning
Repository: ChampCity_AI only
Git mutation: prohibited

## Objective

Complete the already approved replacement:

- one canonical Markdown file per governed document;
- one application-owned JSON metadata comment;
- human-readable Markdown body;
- direct workflow-owned document creation;
- direct Architect Output submission containing only `markdownBody`;
- no generic canonical registry, creation contracts, context keys, paired authority, or `jsonPath` compatibility aliases.

This revision does not authorize an alternative design. It replaces the prior macro-level implementation instructions with a concise analysis-and-execution contract.

## Stage 1 — Required Repository Analysis

Before editing, inspect the current working tree and identify:

1. every importer and caller of the four prohibited modules listed below;
2. every use of creation-contract, context-key, and `jsonPath` fields in `src/` and `test/`;
3. the owning Project, Phase, Work Card, validation, closeout, or Architect Interview service that must retain each necessary responsibility;
4. the ordered edit sequence required to delete the prohibited architecture and migrate all callers.

The analysis must assume the solution below is fixed. Do not evaluate whether compatibility aliases, a generic registry, contract tokens, or another universal construction layer would be safer.

Record the resulting dependency map in the final Implementer Report, then continue automatically into implementation. Do not stop for Operator approval after analysis.

## Stage 2 — Fixed Implementation

### Delete completely

Delete these production files and all imports of them:

- `src/main/documents/canonicalDocumentRegistry.ts`
- `src/main/documents/canonicalDocumentConstructionService.ts`
- `src/main/documents/canonicalContentSubmissionService.ts`
- `src/shared/documents/canonicalDocument.ts`

Do not rename, wrap, recreate, or preserve their architecture under another file.

### Remove completely from active runtime contracts

Remove these concepts from `src/`:

- `creationContractId`
- `architectOutputCreationContractId`
- `CanonicalCreationContract`
- `currentContextKey`
- `expectedContextKey`
- `contractIdFor`
- `parseContractId`
- `jsonPath`
- Markdown/JSON target pairs
- fake JSON aliases that point to Markdown

Legacy names may remain only inside `src/main/migrations/pairedArtifactsToCanonicalMarkdownV1.ts` and migration-input fixtures when required to read the old format.

Temporary TypeScript failures after deletion are expected. Repair callers; do not restore compatibility.

### Preserve and use

Preserve the single-file foundation:

- `src/shared/documents/canonicalMarkdown.ts`
- `src/main/documents/canonicalMarkdownDocumentWriter.ts`
- `src/main/migrations/pairedArtifactsToCanonicalMarkdownV1.ts`

Each owning workflow service must derive its own trusted path, identity, revision, source revisions, participation role, workflow data, and disposition, then call `writeCanonicalMarkdownDocument()` directly or through a narrowly owned domain function. Do not create another universal document-type registry.

### Architect Output

Implement one direct current-workspace operation equivalent to:

```ts
saveCurrentArchitectInterviewOutput(
  workspaceRoot: string,
  markdownBody: string,
): ArchitectInterviewSaveResult
```

Required wiring:

- main IPC: `architectInterview:saveOutput`;
- preload method: `saveArchitectInterviewOutput(markdownBody)`;
- renderer `saveArchitectOutput()` calls that method directly;
- no contract ID, document type, target path, identity, status, revision, or source metadata is supplied by the renderer.

The owning Architect Interview service derives all authority from the selected repository and current workflow evidence.

### Single-file shared contracts

Planning, workspace, resolver, and renderer types must expose `markdownPath` only. Remove `jsonPath` and paired output-target shapes rather than assigning them the Markdown path.

### Atomic workflow writes

A substantive revision and every resulting downstream invalidation must be one transaction. Do not update downstream source revisions to make stale content appear current. Stale downstream content must remain visibly stale or be regenerated by its owning workflow.

Project Planning and Phase Planning multi-document bundles must install or roll back as one transaction.

### Migration product path

Expose the existing versioned migration through the application:

- visible `Workspace Migration Required` state;
- `Preview Migration` action;
- `Migrate Workspace` action;
- preview reports valid pairs, missing siblings, malformed JSON, disposition mismatch, revision mismatch, source mismatch, duplicate active identity, target Markdown path, and files to delete;
- no fallback metadata for ambiguous or malformed governed documents;
- originals remain unchanged when a document is blocked.

### Capability tests

Restore every test file deleted during the first REPAIR05 implementation from the current HEAD content without using Git restore, checkout, reset, clean, or stash.

Rewrite only representation-specific assertions from paired Markdown/JSON expectations to the single-file model. Preserve the tested Project, Phase, Work Card, repair, validation, closeout, freshness, invalidation, browser, resolver, workspace, and restart behaviors.

No existing test file may remain deleted. A reduced green suite is failure.

## Stage 3 — Final Proof

Do not run a large validation bundle between individual edits. Complete the implementation first, then produce these proofs.

### Proof 1 — Prohibited architecture is absent

Search `src/` and active tests. The prohibited files and active runtime concepts listed in Stage 2 must have zero matches, except the explicit migration-only legacy-reader allowance.

### Proof 2 — Actual workflow integration

Using production services against a temporary repository, prove this single scenario:

```text
create Project Intake
→ approve Project Intake
→ resolve Architect Interview
→ save Architect Output through the direct markdownBody operation
→ request revision without incrementing artifact revision
→ save revised substantive output and increment revision
→ approve revised Interview
→ resolve Project Planning as current
→ reconstruct from disk and obtain the same result
```

At each step verify one Markdown file, no JSON sibling, correct metadata, correct body, correct revision, correct disposition, and correct source revisions.

### Proof 3 — Final application reachability

Run the approved Electron non-acceptance lane and verify:

- Architect Output is visible when prerequisites are satisfied;
- Save Architect Output uses the direct operation;
- the saved document refreshes visibly;
- disposition controls are available;
- progression reaches Project Planning;
- embedded ChatGPT attachment, readiness, context-menu Paste, reload, and session behavior remain intact.

Then run once:

- `npm run typecheck`
- `npm run build`
- `npm test`

## Stop Conditions

Contact the Operator only when exact repository evidence proves:

- a required workflow semantic is genuinely undefined or contradictory;
- an unrelated dirty-tree change cannot be preserved;
- a new dependency is unavoidable;
- ChampCity_GPT must change;
- a Git mutation is required.

Compilation failures, test failures, implementation size, deleted-module fallout, and inability to spawn a review subagent are not stop conditions.

## Report and Completion

Do not update the Implementer Report until all three proofs and final commands pass.

Then revise:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR05_single_canonical_markdown_replacement_pair_protocol_deletion_and_operator_content_ingestion_completion.md`

The report must contain:

- the Stage 1 dependency map;
- exact files deleted, created, and modified;
- restored and rewritten test inventory;
- Proof 1 search results;
- Proof 2 workflow evidence;
- Proof 3 Electron observations;
- final typecheck, build, and test results;
- confirmation no Git operation occurred;
- only remaining Operator acceptance.

Do not create WC25-REPAIR06. Do not label mandatory work as residual risk or future work.

## Acceptance

WC25-REPAIR05 is complete only when:

1. the four prohibited modules are deleted;
2. contract IDs, context keys, and active `jsonPath` aliases are gone;
3. Architect Output accepts only `markdownBody` through the current workspace;
4. workflow services own their document creation directly;
5. revision, invalidation, and bundle writes are atomic;
6. migration preview and apply are reachable in the application and block ambiguity;
7. no pre-existing test file remains deleted and lifecycle capability coverage is preserved;
8. the complete production-service workflow scenario passes;
9. Electron reachability passes;
10. typecheck, build, and the full restored test suite pass.
