<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC40"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC40_simultaneous_seven_flow_architect_output_product_cutover.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC40_simultaneous_seven_flow_architect_output_product_cutover.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC39_unified_architect_output_catalog_and_main_process_runtime_consolidation.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC40 Simultaneous Seven-Flow Architect Output Product Cutover",
    "reviewResult": "RevisionRequested",
    "confirmedImplementation": {
      "activeDefinitions": 7,
      "catalogSlots": 9,
      "genericIpcOperations": 4,
      "directSaveRoutesRemoved": true,
      "sharedRendererRefreshPresent": true
    },
    "blockingDefects": 5,
    "reportedValidation": {
      "typecheck": "passed",
      "typescriptBuild": "passed",
      "viteBuild": "passed in normal Windows lane",
      "tests": "182/182 reported passed"
    }
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "WC40 establishes the seven-definition catalog and generic renderer surface, but the production cutover is incomplete. Copy can inspect and promote drafts; generic review does not enforce current type/role/identity/source or synchronized bundle authority; documents:setDisposition remains a catalog-review bypass; the shared model does not derive not-ready/current context correctly and currentWorkflow still bypasses it for existing outputs; and Formal/Repair copied handoffs omit the exact body contracts while retaining hidden module-global context. Required production-path proof is also missing.",
    "reviewedAt": "2026-08-02"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC40

Disposition: `RevisionRequested`  
Git mutation: none

## Review Boundary

The review used ChampCity MCP to inspect the current repository, WC40 Work Card, Implementer Report, production catalog, generic workspace service, main IPC, preload API, shared contracts, current-workflow projection, renderer refresh and review shell, Formal Work Card definition, Repair Work Card definition, document disposition service, and focused tests.

The MCP server returned complete repository payloads during this review. The earlier delivery failure did not recur.

## Accepted Implementation

The following WC40 work is real and should be preserved:

- the production catalog registers seven active definitions and nine slots;
- Formal Work Card and Repair Work Card are registered single-output definitions using the WC39 coordinator;
- main and preload expose the four generic `architectOutput:*` operations;
- retired workspace-specific Architect-output IPC/preload families are absent;
- `saveFormalWorkCardOutput`, `saveRepairWorkCardOutput`, their IPC routes, renderer textareas, `LifecycleArchitectOutputImport`, and `Save Architect Output` are absent;
- one `architectOutputWorkspaceRefresh.ts` module remains and the prior workspace-specific refresh modules are absent;
- one generic renderer action bar and one generic review shell are present;
- currentWorkflow rejects catalog disposition through `currentWorkflow:applyDisposition`;
- the Implementer reports typecheck, compile, Vite build, and 182 passing tests in the normal Windows lane.

These accepted results are not rewritten as failures.

## Blocking Defect 1 — Copy Handoff Is Not Mutation-Free

WC40 requires Copy to copy only an already-prepared instruction and explicitly prohibits inspection or promotion.

The production chain is:

```text
architectOutput:copyHandoff
→ getPreparedArchitectOutputInstruction()
→ getArchitectOutputWorkspaceModel()
→ getArchitectOutputRuntimeStatus()
→ inspectArchitectDraftSubmission()
→ promoteArchitectDraftSubmission() when drafts are ready
```

The main handler then calls `copyArchitectOutputHandoffResult()`, which calls `getPreparedArchitectOutputInstruction()` a second time.

Consequences:

- Copy can inspect and promote drafts;
- Copy can change repository state and submission state;
- if drafts are ready, the first model call can promote the submission and remove the prepared instruction, causing Copy to fail rather than copy;
- the operation is evaluated twice instead of using one immutable prepared instruction.

Required correction:

- Copy must read the currently active waiting/partial submission directly;
- it must build or retrieve the existing prepared instruction without calling the promotion-capable workspace model;
- it must not inspect, promote, retry, create a submission, or advance an ordinal;
- the main handler must resolve the instruction once, write it to the clipboard once, and return the result without a second lookup.

## Blocking Defect 2 — Generic Review Authority Is Incomplete and Bypassable

### Weak review preflight

`getArchitectOutputWorkspaceModel()` sets:

```text
canApplyDisposition = every slot has a logical ID, is readable, is fresh, and has no read error
```

It does not verify:

- expected artifact type;
- participation role;
- current identity;
- current source revisions;
- exact current handoff authority;
- synchronized bundle disposition;
- synchronized bundle notes;
- synchronized bundle review timestamp or revision authority.

`deriveState()` also accepts mixed bundle states. Examples:

- Pending + Approved becomes `ready-for-review`;
- RevisionRequested + Pending becomes `revision-requested`;
- Rejected + Approved becomes `rejected`.

`reviewArchitectOutput()` then rewrites every bundle member with one disposition without first proving synchronized current authority. A wrong-type or wrong-identity readable document at the target path can also be reviewed as a valid single output.

This violates the WC40 single-output and atomic-bundle review contracts and acceptance criteria 12–14.

### Generic document-disposition bypass

The production handler remains:

```text
documents:setDisposition(logicalDocumentId, status)
→ setDocumentDisposition()
```

`setDocumentDisposition()` accepts any readable canonical document and has no catalog-output exclusion. The method remains exposed through preload.

Therefore catalog outputs can bypass `architectOutput:review`, including compound synchronization and revision-note policy. Blocking `currentWorkflow:applyDisposition` alone does not close the required generic document-disposition bypass.

Required correction:

- add one backend catalog-review guard to the generic document disposition path;
- generic review must validate exact current type, role, identity, source revisions, and handoff authority;
- bundles must be rejected as `needs-attention` when any member is missing, mixed, malformed, stale, wrong, or unsynchronized;
- only a synchronized current bundle may receive the atomic disposition write;
- remove unused domain-specific disposition mutation façades that remain as duplicate internal authority after the generic review cutover.

## Blocking Defect 3 — Shared Model Does Not Resolve Not-Ready or Exact Current Context

The model defines `not-ready`, but `deriveState()` never returns it.

When no final document exists, the generic state becomes `ready-for-handoff` based solely on document absence. Domain failures are swallowed by `domainOverlay()` and converted to an empty overlay. Phase Map, Formal Work Card, and Repair Work Card do not have a domain overlay at all.

As a result, a workspace without current prerequisites or an Approved current handoff can be reported as Ready with Prepare enabled, followed by a service exception when Prepare is clicked.

Current handoff and target resolution are also not identity-bound:

- `handoffForWorkspace()` selects the last Approved handoff by artifact kind using `.at(-1)`;
- Formal Work Card selects the last Approved Work Card Intake handoff globally;
- Repair Work Card selects the last Approved repair handoff globally;
- target fallback uses the latest path by artifact type.

These lookups are not tied to the resolver-selected phase, candidate, repair, or exact lifecycle context.

Required correction:

- represent domain readiness explicitly in the generic model;
- return `not-ready` with Prepare disabled when prerequisites/current handoff authority are unavailable;
- do not swallow domain-resolution failures into a Ready state;
- resolve the exact current handoff and target by current project/phase/work-card/repair identity, not global `.at(-1)` or latest-artifact fallback;
- classify partial or conflicting final authority as `needs-attention` before any mutation.

## Blocking Defect 4 — Current Workflow Does Not Consume the Shared Model for Existing Outputs

`resolveCurrentWorkspaceModel()` calls `resolveFirstNonApprovedDocument()` first.

When a catalog output already exists as Pending, RevisionRequested, Rejected, stale, or otherwise incomplete, the function returns the legacy document-derived projection directly. The generic `currentModelFromArchitectOutput()` path is reached only through missing-output helpers after the resolver returns `all-approved` for existing evidence.

Architect Interview waiting/review state is also projected directly rather than through the generic model.

Therefore the report's statement that currentWorkflow projects all seven Architect-output workspaces from the generic model is false. The implementation uses the shared model mainly for absent-output transitions, not for the complete workspace lifecycle.

Required correction:

- route all seven owning workspace IDs through the generic Architect-output model for ready, waiting, partial, failed, review, revision, rejected, completed, and needs-attention states;
- retain the existing resolver only for selecting lifecycle ownership and non-Architect steps;
- do not independently derive Architect-output state from file presence or a single current document.

## Blocking Defect 5 — Formal and Repair Real Handoffs Cannot Reliably Produce Valid Drafts

The generic copied instruction includes only generic body-writing language, output kind, slot label, and temporary path. It does not include the exact Formal Work Card or Repair Work Card heading contract.

The source handoff bodies are minimal:

```text
# Work Card Intake Architect Handoff - <id>
Formal Work Card Markdown: <target>
```

and:

```text
# Repair Architect Handoff
Repair Work Card Markdown: <target>
```

Neither contains the required H1/H2 body schema, while the new validators reject bodies that omit those headings.

The tests avoid the real defect by writing valid fixture bodies directly. The Repair Work Card test does not exercise temporary draft preparation, promotion, generic review, or return behavior at all.

Formal and Repair definitions also introduce hidden module-global context:

```text
lastFormalContext
currentFormalValidationId
lastRepairContext
```

Validation and post-promotion selection therefore depend on mutable adapter globals instead of the WC39 active record's typed domain context. This recreates hidden workspace-local authority that WC39 removed.

Required correction:

- the prepared instruction must include or unambiguously reference the complete exact body contract for every definition, especially Formal and Repair Work Cards;
- extend the typed definition/promotion contract so body validation and post-promotion selection receive the resolved domain context explicitly;
- remove all three module-global context variables and their lookup helpers;
- preserve the coordinator as the sole owner of active submission context.

## Required Proof Defect

The reported 182-test lane does not implement WC40's required production-path matrix.

Repository evidence shows:

- no test invokes the actual generic IPC handlers;
- no service test calls `reviewArchitectOutput()`;
- the Formal Work Card test approves through the retired `setFormalWorkCardDisposition()` function rather than the generic review operation;
- the Repair Work Card test only creates a repair handoff and never prepares, promotes, revises, reviews, or returns a Repair Work Card;
- renderer tests are source-string assertions;
- the cited production-service proof still uses the legacy Architect Interview review function and does not traverse the seven-flow cutover.

The revised pass must add a compact production-catalog matrix rather than one test island per workspace. It must prove:

- actual generic handler/service behavior for one existing single flow, one bundle, Formal, and Repair;
- mutation-free Copy;
- exact current context selection;
- not-ready and needs-attention gating;
- malformed and partial draft retention;
- revision behavior;
- synchronized bundle review and mixed-authority rejection;
- generic document-disposition bypass rejection;
- Formal and Repair body-contract instructions;
- downstream lifecycle results for all seven definitions.

## Validation Assessment

The Implementer reports:

```text
npx tsc --noEmit                 passed
npx tsc                          passed
npx vite build                   passed in the normal Windows lane
node --test --test-concurrency=1 182 passed, 0 failed
```

ChampCity MCP does not expose command execution, so this review does not claim those commands were independently rerun. The source and test inspection establishes that a green suite does not cover the blocking production paths above.

## Final Disposition

WC40 remains unresolved.

Preserve the accepted seven-definition catalog, generic IPC/preload family, renderer consolidation, direct-save retirement, and current WC39 coordinator. Repair the bounded production-path and authority defects above without reintroducing workspace-specific cutovers, fallback routes, compatibility aliases, hidden persistence, or Git mutation.

Operator running-product validation must not begin until the repaired implementation passes Architect source review and the required production-path matrix.

No Git operation was performed by this review.
