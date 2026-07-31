<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC30"
  },
  "sourceRevisions": [
    {
      "path": "planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Reusable Architect Draft Ingestion Foundation",
    "status": "approved_for_implementation",
    "executionMode": "one bounded shared-infrastructure pass with no production workflow cutover",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC30_reusable_architect_draft_ingestion_foundation.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Build and prove the reusable Architect draft-ingestion and canonical-promotion foundation without migrating, replacing, or adding fallback behavior to any current production Architect workflow.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# WC30 — Reusable Architect Draft Ingestion Foundation

Status: Approved for Implementer execution  
Git mutation: prohibited

## Operator Direction

Build one reusable ChampCity A/I subsystem for future Architect-authored Markdown ingestion and canonical promotion.

Do not migrate, replace, redirect, or modify any currently active Architect-output workflow in this Work Card.

The purpose of WC30 is to establish and deterministically prove the shared infrastructure before any action-rail workspace is cut over. Existing Architect Interview, Project Planning, Phase Map, Phase Interview, Phase Planning, Work Card Planning, and Repair Work Card output paths remain unchanged during this card.

Do not create compatibility branches, fallbacks, aliases, dual-write behavior, legacy-file conversion, historical-file migration, or hidden use of the new subsystem by existing workflows.

## Objective

Create a generic Architect Draft Ingestion and Canonical Promotion foundation capable of supporting:

```text
single Architect-authored Markdown output
atomic multi-document Architect output bundle
application-owned structural validation
application-owned canonical metadata construction
application-owned final target resolution
atomic final canonical promotion
post-write verification
temporary-draft cleanup
```

WC30 proves this capability through isolated fixture definitions and temporary test workspaces only. It does not register a production action-rail output definition.

## Controlling Boundary

### Architect or other LLM content producer owns

- substantive Markdown prose;
- analysis, recommendations, phase content, work-card content, and other requested domain material;
- body-level structured blocks explicitly requested by the application.

The content producer does not own canonical metadata, final target authority, artifact revision, source revisions, role, disposition, or workflow advancement.

### ChampCity A/I owns

- output eligibility;
- exact temporary draft paths;
- exact final canonical target paths;
- output grouping and atomic bundle boundaries;
- artifact type, participation role, identity, source revisions, artifact revision, workflow data, disposition, notes, and review timestamp;
- structural validation required for the application to consume the draft;
- canonical Markdown serialization;
- final canonical write and verification;
- promotion status and workflow advancement.

### ChampCity_GPT MCP owns

Only the generic repository-write behavior of:

```text
artifact_toolbox.create_markdown_artifact
```

The MCP writes exact supplied Markdown to an exact safe temporary draft path. It does not know the final canonical target, metadata schema, workflow state, document type, or promotion rules.

## Required Change 1 — Typed Architect Output Definition Contract

Create one typed contract for registering Architect-authored output definitions.

A definition must support:

```text
outputKind
owningWorkspaceId
one or more output slots
single-output or atomic-bundle behavior
draft path construction
final target resolution
body validation
canonical metadata construction
post-promotion selection information
```

An output slot must support at least:

```text
slotId
displayLabel
draft filename or draft-path component
body validator
final canonical document builder
```

The contract must be strongly typed. Required behaviors cannot be optional untyped object properties that fail only at runtime.

Adding a future output definition must not require copying draft discovery, polling, transaction orchestration, cleanup, or generic error handling.

WC30 must not add any production output definition. Use fixture definitions located in tests or explicitly test-only modules.

## Required Change 2 — Shared Draft Submission Model

Create one application-owned draft submission model containing:

```text
submissionId
outputKind
owningWorkspaceId
source handoff path and revision
expected draft slots
exact draft path for each slot
promotion group identity
submission state
```

The submission ID must be deterministic from application context and safe for path construction. It must not be a hash, digest, secret, approval token, route token, or hidden authorization value.

The model must support single-output and multi-output bundles.

It must distinguish:

```text
waiting-for-drafts
partial-draft-set
ready-for-promotion
promotion-failed
promoted
superseded
```

Equivalent typed names are acceptable.

## Required Change 3 — Central Temporary Draft Root

Define one application-owned draft root:

```text
planning/Architect_Drafts/<submission-id>/<slot-id>.md
```

Equivalent naming is acceptable only when it is:

- repository-relative;
- centrally defined in one shared path helper;
- inside the configured artifact-write area used by the generic MCP writer;
- excluded from normal planning-document discovery;
- excluded from lifecycle resolution, rail counts, document lists, and review surfaces;
- temporary and non-authoritative.

Update planning discovery once, centrally, so the draft-root prefix is skipped before classification.

Do not classify drafts as legacy, malformed, Pending, historical, unmanaged, or current workflow evidence.

Do not add workspace-specific draft exclusions.

## Required Change 4 — Generic Draft Inspection Service

Create one main-process service that inspects only the exact draft paths declared by a supplied draft submission.

It must:

- determine which slots are present;
- report missing slots;
- distinguish partial and complete bundles;
- reject paths outside the central draft root;
- treat draft contents as body content, not canonical workflow documents;
- expose typed status and exact read errors;
- never scan arbitrary Markdown to guess which files belong to a submission.

WC30 does not add renderer polling to current production workspaces. Provide the reusable status API and prove it with direct service tests.

## Required Change 5 — Generic Canonical Promotion Service

Create one application service that promotes a ready draft submission through a registered output definition.

The service must:

1. resolve the supplied registered definition;
2. verify the submission and definition agree;
3. read the exact expected draft files;
4. apply generic body invariants;
5. apply the definition's registered structural validator;
6. derive final target paths and canonical metadata in ChampCity A/I;
7. serialize through the existing canonical writer;
8. use `writeCanonicalMarkdownDocument` for one output;
9. use `writeCanonicalMarkdownDocuments` for an atomic bundle;
10. reread and verify every final canonical output;
11. return a typed promotion result;
12. remove consumed drafts only after final verification succeeds.

Generic body invariants may include:

- non-empty content;
- no application metadata delimiters in the body;
- an application-defined size bound.

Definition-specific validators may enforce broad structure required for deterministic consumption, such as required headings or a parseable domain block. They must not judge strategic quality, completeness beyond the declared structural contract, or whether the Operator should approve the content.

## Required Change 6 — Failure, Idempotency, and Cleanup

Required behavior:

- a partial bundle creates no final output;
- failed promotion creates no partial final bundle;
- failed promotion retains all drafts for diagnosis;
- successful promotion removes consumed drafts only after verification;
- repeated promotion of the same completed submission does not increment revisions or rewrite outputs;
- superseded submissions are ignored by the current promotion request;
- cleanup accepts only an exact submission directory under the central draft root;
- cleanup does not scan or delete unrelated files;
- no background migration or cleanup worker is added.

Do not use caller-visible hashes, digests, checksums, approval tokens, route tokens, or revision tokens.

## Required Change 7 — Isolated Proof Definitions

Add test-only fixture definitions proving the generic subsystem can support:

```text
one single-output Architect document
one two-document atomic Architect bundle
```

The fixture definitions must exercise:

- draft path construction;
- partial-bundle detection;
- structural validation;
- application-owned metadata construction;
- single-file canonical promotion;
- bundle canonical promotion;
- atomic rollback;
- post-write verification;
- consumed-draft cleanup;
- repeated-call idempotency;
- superseded-submission rejection.

The test fixtures must not use production artifact types, production workspace IDs, or current action-rail services as hidden integration paths.

## Explicit Non-Scope — No Current Workflow Adoption

WC30 must not modify current production handoff instructions, current output save functions, current renderer action bars, or current action-rail polling behavior.

Do not migrate or cut over:

```text
Project Architect Interview
Project Profile
Project Roadmap
Phase Map
Phase Interview
Phase Planning
Work Card Plan
Formal Work Card
Repair Work Card
```

Do not remove their current application paths in WC30.

Do not make them call the new subsystem in parallel.

Do not add fallback logic from the new subsystem to the current paths or from the current paths to the new subsystem.

Do not migrate existing, historical, Approved, Pending, Rejected, or RevisionRequested files.

No production output may be used as evidence that WC30 succeeded.

## Future Adoption Boundary

After WC30 deterministic approval, a separate numbered Work Card must adopt exactly one production Architect-output flow as a pilot.

That pilot must:

- create fresh draft submission instructions;
- use the shared infrastructure without modifying it except for proven defects;
- cut over only one output flow;
- remove only that flow's obsolete direct-save path;
- provide no fallback to the retired path;
- leave all other Architect-output flows unchanged;
- receive Operator running-product validation before further rollout.

Later adoption cards should cut over additional single outputs or atomic bundles in bounded groups. No bulk migration card is authorized by WC30.

## Preserve Existing Infrastructure

Preserve:

- `APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md` principles;
- existing canonical parser and serializer;
- existing atomic artifact transaction and rollback behavior;
- existing document disposition controls;
- existing source freshness evaluation;
- existing production action rails and save flows during this card;
- no JSON sidecars;
- no MCP schema authority;
- no manual-import fallback added by WC30.

## Prohibited Designs

Do not implement:

- production workflow cutover;
- legacy-file migration;
- historical-file transformation;
- dual-write behavior;
- compatibility readers;
- fallback save paths;
- one ingestion service per output kind;
- one polling service per workspace;
- one canonical transaction implementation per output kind;
- final canonical document creation through the MCP;
- MCP-generated metadata;
- LLM-authored canonical metadata;
- draft files at final canonical targets;
- planning discovery of temporary drafts;
- generic untyped registry bags;
- automatic correction of Architect prose;
- schema or quality enforcement in the MCP.

## Expected Production Surface

Expected shared infrastructure may include:

```text
src/shared/architectOutputs/architectOutputContracts.ts
src/main/architectOutputs/architectOutputRegistry.ts
src/main/architectOutputs/architectDraftSubmissionService.ts
src/main/architectOutputs/architectDraftPromotionService.ts
src/main/architectOutputs/architectDraftPaths.ts
```

Expected existing-file changes are limited to shared infrastructure integration such as:

```text
src/main/documents/planningDocumentService.ts
src/main/documents/canonicalMarkdownDocumentWriter.ts only for a narrow generic extension when required
shared test support
focused tests
planning/project/Design_Documents for the reusable boundary
Implementer Report
```

Do not modify current handoff-producing services, current Architect-output save services, renderer production action bars, current output IPC methods, or current production polling loops.

Do not add dependencies or perform Git operations.

## Required Proof

Record each item as `Proven`, `OperatorValidationPending`, or `NotProven`.

1. One typed definition contract supports single-output and atomic-bundle definitions.
2. One central draft-root helper is used by the shared infrastructure.
3. The draft root is excluded centrally from planning discovery and lifecycle evidence.
4. One generic draft inspection service reports waiting, partial, ready, promoted, failed, and superseded states.
5. One generic promotion service uses the existing canonical writer for single and bundle output.
6. Canonical metadata is constructed by the registered application definition.
7. Partial bundles create no final output.
8. Failed promotion rolls back final outputs and retains drafts.
9. Successful promotion verifies outputs before deleting drafts.
10. Repeated promotion is idempotent without hashes or hidden tokens.
11. Superseded submissions cannot promote.
12. One test-only single-output definition passes end to end.
13. One test-only two-document bundle definition passes end to end.
14. Adding the fixture definitions required no duplicate inspection, promotion, cleanup, or transaction service.
15. No current production Architect-output flow uses the new subsystem.
16. No current production save path was removed, redirected, wrapped, or given fallback behavior.
17. No legacy or current production file was migrated or transformed.
18. Existing production tests remain green.
19. Typecheck, build, and complete tests pass in the normal Windows lane.
20. Implementer Report states plainly that WC30 is foundation-only and that production adoption requires a later numbered Work Card.

## Completion

Create the Implementer Report only after proof items 1–19 pass.

Do not package, promote, restart, reconnect, stage, commit, or push in this Work Card.
