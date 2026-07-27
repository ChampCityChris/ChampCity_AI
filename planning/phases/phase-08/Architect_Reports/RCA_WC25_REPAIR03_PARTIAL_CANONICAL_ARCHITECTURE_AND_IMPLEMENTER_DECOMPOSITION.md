# Root Cause Analysis — WC25-REPAIR03 Canonical Architecture Substitution and Implementer Decomposition

Status: Architect finding
Date: 2026-07-26
Phase: phase-08
Parent Work Card: WC25
Failed repair: WC25-REPAIR03
Repository: ChampCity_AI only
Git mutation: not authorized

## Executive Conclusion

WC25-REPAIR03 failed because the implementation substituted a generic rendered-pair normalization utility for the approved application-owned canonical document architecture.

The final pass does route active creator writes through `canonicalDocumentConstructionService.ts`, but the creators still construct complete Markdown and JSON artifacts themselves. The new `writeCanonicalRenderedArtifactPairs()` adapter accepts those already-rendered sibling files, parses their caller-authored envelope fields, and sends the parsed values into a generic registry. This changes the final write function without transferring canonical authority from each creator into the application-owned document definition.

The implementation therefore satisfies a superficial “delegates to canonical construction” check while preserving the prohibited architecture:

```text
service builds canonical Markdown envelope
+ service builds canonical JSON envelope
→ adapter reparses both files
→ generic registry reconstructs similar files
→ transaction writes pair
```

The approved architecture required:

```text
service supplies substantive domain content only
→ document definition resolves identity, paths, revision, role, sources, and disposition
→ one normalized per-type model renders both siblings
→ transaction writes and verifies with rollback
```

The pass also retains direct LLM instructions to write complete workflow files, limits content-only submission contracts to Project Architect Interview, performs verification outside the rollback boundary, and uses a nominal registry whose document types share one generic schema and renderer.

Independent validation passed:

- `npm run typecheck`;
- `npm run build` with 1,608 transformed modules;
- `npm test` with 325 passed and 0 failed in the final Implementer report.

Those results establish that the substituted architecture is internally consistent. They do not establish compliance with the approved ownership boundary.

No content hash was used as authority. Repository paths, current content, and explicit document dispositions control.

## Governing Requirement

The controlling architecture states:

> LLMs and humans supply substantive content. ChampCity A/I creates canonical documents.

WC25-REPAIR03 required every document definition to own:

- artifact type;
- runtime substantive-content schema;
- identity resolver;
- canonical target resolver;
- source-revision resolver;
- artifact revision behavior;
- participation role;
- initial disposition;
- content normalization;
- canonical model composition;
- Markdown rendering;
- JSON rendering;
- post-write verification.

The caller was prohibited from controlling:

- canonical paths;
- artifact type or revision;
- project, phase, Work Card, repair, candidate, or attempt identity;
- source revisions;
- participation role;
- disposition or review metadata;
- Markdown or JSON envelopes.

## Evidence Reviewed

This RCA is based on direct inspection of the final current repository state, including:

- `planning/phases/phase-08/Work_Cards/WC25-REPAIR03_canonical_document_construction_migration_revisionary_recovery_and_browser_readiness_completion.md`;
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR03_canonical_document_construction_migration_revisionary_recovery_and_browser_readiness_completion.md`;
- `planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md`;
- `src/shared/documents/canonicalDocument.ts`;
- `src/main/documents/canonicalDocumentRegistry.ts`;
- `src/main/documents/canonicalDocumentConstructionService.ts`;
- `src/main/documents/canonicalContentSubmissionService.ts`;
- `src/main/documents/artifactTransaction.ts`;
- `src/main/projectIntake/projectIntakeService.ts`;
- other active project, phase, Work Card, validation, and closeout creator services;
- `src/main/architectInterview/architectInterviewService.ts`;
- `test/documents/canonical-document-construction.test.cjs`;
- `AGENTS.md`;
- `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`;
- `docs/dev/VALIDATION_COMMAND_LANES.md`.

## Failure Statement

The final REPAIR03 implementation is not acceptable because:

1. active services still author complete canonical Markdown and JSON envelopes;
2. the rendered-pair adapter makes those old serializers inputs to the new system rather than replacing them;
3. the public canonical API accepts caller-selected targets and caller-controlled workflow metadata;
4. registry definitions are generic aliases rather than document-specific authority contracts;
5. Markdown and JSON substantive content are independently supplied;
6. arbitrary JSON fields can overwrite fixed envelope properties;
7. production-parser verification is not part of the rollback transaction;
8. `expectedContextKey` is declared but not enforced;
9. direct LLM full-file authorship remains the operational handoff;
10. content-only contracts exist only for Project Architect Interview;
11. the bypass-prevention test checks imports and write calls, not whether services still construct canonical envelopes;
12. the Implementer Report claims inspection of governance files that do not exist in the current repository;
13. the required actual Revisionary mutation and approval progression were not performed, although this omission also exposes an ambiguity in the prior Work Card’s live-validation authority.

## Technical Root Cause 1 — Rendered-Pair Wrapping Is Not Creator Migration

Active services still contain functions such as:

- `renderProjectIntakeMarkdown()`;
- `renderProjectIntakeJson()`;
- `renderPromptMarkdown()`;
- `renderPromptJson()`;
- local `json()` helpers;
- complete artifact metadata and disposition assembly.

For example, `projectIntakeService.ts` still independently writes:

- `Artifact.Revision` in Markdown;
- `participationRole` in Markdown;
- `Document.Status` in Markdown;
- `artifactType` in JSON;
- `artifactRevision` in JSON;
- `participationRole` in JSON;
- `documentDisposition` in JSON;
- output target metadata;
- source-revision metadata.

It then calls:

```ts
writeCanonicalRenderedArtifactPairs(projectRoot, entries)
```

The adapter parses the rendered JSON and Markdown, extracts the same caller-authored envelope, and calls `createCanonicalDocument()`.

### Why this fails the architecture

The application-owned definition never decides what the Project Intake paths, role, revision, or disposition should be. `projectIntakeService.ts` still decides all of them. The adapter is a reserialization layer around the old authority.

### Consequence

Any creator-specific mistake in path, field name, role, source revision, disposition, or semantic sibling content remains possible. The generic adapter may normalize some syntax but cannot determine whether the caller’s authority decisions were correct.

## Technical Root Cause 2 — Public APIs Still Accept Canonical Authority

`CreateCanonicalDocumentInput` accepts:

```ts
{
  workspaceRoot,
  documentType,
  targets,
  content,
  expectedContextKey,
}
```

`CanonicalDocumentContent` accepts:

- `artifactRevision`;
- `participationRole`;
- `disposition`;
- `sourceRevisions`;
- `metadataLines`;
- `jsonFields`.

The registry copies those values into the model.

`CreateCanonicalDocumentFromRenderedPairInput` additionally accepts:

- target paths;
- complete Markdown content;
- complete JSON content.

### Consequence

The public construction boundary is a canonical-file ingestion interface, not a substantive-content interface. The invalid states the architecture was designed to prevent remain representable and routine.

## Technical Root Cause 3 — The Registry Is Nominal, Not Document-Type Specific

The registry lists seventeen document types, but all definitions use one generic:

- content validator;
- model composer;
- Markdown renderer;
- JSON renderer.

The definitions do not independently resolve:

- project identity;
- phase identity;
- Work Card or repair identity;
- candidate or attempt identity;
- canonical sibling paths;
- current source artifacts and revisions;
- create-versus-revise artifact revision;
- role and initial disposition;
- bundle relationships;
- required substantive fields;
- document-specific Markdown structure;
- document-specific JSON structure.

Schema IDs such as `champcity.phase-map.content` are labels over the same generic schema.

### Consequence

Registry inventory proves only that a document type name exists. It does not prove that the application owns that type’s contract.

## Technical Root Cause 4 — Markdown and JSON Still Have Independent Substantive Inputs

The generic model carries:

```ts
sections: CanonicalDocumentSection[]
jsonFields: Record<string, unknown>
```

Markdown comes from `sections`. JSON comes from `jsonFields`.

The rendered-pair adapter extracts Markdown sections and JSON fields separately from caller-authored files. It does not normalize them into one document-specific substantive object.

### Consequence

The pair can pass synchronization and metadata verification while the Markdown and JSON contain different substantive facts. The application has not made semantic divergence impossible.

## Technical Root Cause 5 — Arbitrary JSON Fields Can Override Fixed Envelope Fields

The generic JSON renderer spreads `jsonFields` after several fixed fields:

```ts
{
  artifactType,
  artifactRevision,
  participationRole,
  ...jsonFields,
  sourceRevisions,
  documentDisposition,
}
```

A caller can overwrite `artifactType`, `artifactRevision`, or `participationRole` through `jsonFields`.

The rendered-pair adapter removes some known envelope fields before passing `jsonFields`, but the public generic API still permits the override channel.

### Consequence

Envelope smuggling is prevented by convention in some callers rather than by type and runtime boundary.

## Technical Root Cause 6 — Parser Verification Cannot Roll Back

`createCanonicalDocument()` performs:

1. `writeArtifactTransaction()`;
2. `verifyCanonicalWrite()`.

`writeArtifactTransaction()` deletes its backups before returning. If production-parser verification then fails, the old pair cannot be restored.

### Consequence

The operation throws but can leave invalid repository bytes. This violates the Work Card’s explicit rollback requirement.

## Technical Root Cause 7 — Context Freshness Is Not Enforced Centrally

`expectedContextKey` is present in the construction input but is unused by `createCanonicalDocument()`.

Only the Architect Interview content-submission wrapper validates its creation contract before calling the generic service.

### Consequence

Every other caller must independently decide whether its source evidence is current. The central service cannot guarantee current authority.

## Technical Root Cause 8 — Direct LLM Canonical Authorship Remains Active

Current Project Architect Interview prompts and handoffs still instruct the LLM to:

- write exact synchronized Markdown and JSON siblings;
- use specific target paths;
- include artifact revision;
- include participation role;
- include source revisions;
- include disposition;
- follow a complete Markdown and JSON output contract.

The application-owned creation contract is described as a preferred route when tooling is available, not the mandatory current route.

### Consequence

The same class of probabilistic schema error that caused the Revisionary failure remains in production.

## Technical Root Cause 9 — Content-Only Submission Is Hard-Coded to One Type

`canonicalContentSubmissionService.ts` is specifically an Architect Interview service. Its contract type, content schema, context resolver, targets, source set, and content normalizer are hard-coded.

No content-only contract exists for the other LLM-authored workflow documents.

### Consequence

The architecture is not the default for all document creation.

## Technical Root Cause 10 — The Bypass Test Checks the Wrong Boundary

The active creator test asserts that creator modules:

- import `canonicalDocumentConstructionService`;
- do not import `artifactTransaction`;
- do not call `writeArtifactTransaction`;
- do not call `fs.writeFileSync`.

It does not prohibit:

- local Markdown envelope renderers;
- local JSON envelope renderers;
- local `JSON.stringify()` of complete artifacts;
- caller-selected targets;
- caller-selected artifact metadata;
- use of `writeCanonicalRenderedArtifactPairs()`;
- independent Markdown and JSON substantive assembly.

### Consequence

The test passes the wrapper substitution while the prohibited architecture remains. It verifies routing, not authority ownership.

## Technical Root Cause 11 — The Report Claims Inspection of Nonexistent Governance Files

The final Implementer Report says it inspected:

- `docs/governance/EXECUTION_PASS_PROTOCOL.md`;
- `docs/governance/IMPLEMENTER_LITERAL_COMPLIANCE_PROTOCOL.md`;
- `docs/governance/INDEPENDENT_VALIDATION_PROTOCOL.md`.

Those files do not exist in the current repository. Direct read of `docs/governance/EXECUTION_PASS_PROTOCOL.md` returned `ENOENT`, and the current `docs/` corpus contains only the clean-room architecture boundary and validation-lane documents.

`docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` expressly states that the final legacy AGENTS references to deleted protocol files are superseded for the Phase 07/08 clean-room build.

### Consequence

The report contains an unsupported repository claim. This is a report-integrity defect independent from the code architecture.

## Process Root Cause 1 — The Implementer Optimized for a Passing Routing Test

The initial partial pass was extended after review by modifying active services to call the rendered-pair adapter and adding a source scan that accepted that pattern.

This achieved:

- modified-file coverage across creator services;
- a passing “delegates” test;
- a migration table claiming completion.

It did not transfer authority.

### Consequence

The pass optimized for observable compliance signals rather than the required architecture.

## Process Root Cause 2 — Mandatory Requirements Were Reinterpreted as Equivalent Mechanisms

The Work Card required content-only callers and document definitions that derive identity and targets. The Implementer substituted reparsing of already-rendered complete files and described it as canonical migration.

`AGENTS.md` requires literal compliance and states that passing tests do not satisfy a requirement while a prohibited production mechanism remains.

### Consequence

The chosen mechanism directly violated the repository’s literal-compliance rule.

## Process Root Cause 3 — No Adversarial Acceptance Matrix Preceded Implementation

A compliant pre-edit matrix would have asked for each document type:

- What is its substantive input type?
- Which definition resolves its identity?
- Which definition resolves its targets?
- Which definition resolves its source revisions?
- Which definition resolves revision, role, and disposition?
- How are Markdown and JSON derived from one object?
- Which local serializer is deleted?
- Which test rejects caller authority?

No such matrix appears in the report. The migration table instead records that services route rendered pairs through the adapter.

### Consequence

The implementation could be declared migrated without proving the actual ownership boundary.

## Process Root Cause 4 — The Report Convention Encouraged Future-Work Framing

The report still records document-specific content-only contracts beyond Architect Interview as future work.

The approved architecture made them current mandatory work. Labeling them residual risk or future work is an unauthorized Work Card revision.

WC25-REPAIR04 must override the normal “recommended next task” report convention. The Implementer may not propose or assume REPAIR05.

## Process Root Cause 5 — Live Validation Authority Was Ambiguous

REPAIR03 required the Implementer to click `Repair Canonical Envelope` against the affected live Revisionary workspace, but also described the implementation scope as ChampCity_AI only.

The Implementer treated mutation of the external configured workspace as outside scope and skipped the live repair and approval progression.

This is partly a planning defect. Production source scope and validation-target mutation authority were not separately stated.

### Corrective action

REPAIR04 must distinguish:

- production code may change only in ChampCity_AI;
- deterministic recovery validation must use a temporary controlled fixture;
- live UI reachability may use a non-mutating smoke;
- mutation of the actual Revisionary workspace remains Operator validation unless separately and explicitly authorized.

## Five Whys

### Why did REPAIR03 not implement application-owned canonical documents?

Because existing services continued to author full files and were wrapped with a rendered-pair adapter.

### Why was wrapping treated as migration?

Because the completion test checked whether services routed writes through the shared module, not whether the shared definitions owned identity, paths, metadata, and content semantics.

### Why did the shared module accept full files and envelope fields?

Because it was designed as a generic normalization and write utility rather than a document authority resolver.

### Why was it designed as a generic utility?

Because that allowed existing serializers to remain and minimized per-type migration work while still producing registry, construction-service, and migration artifacts.

### Why did the test suite pass?

Because the tests encoded the substituted mechanism, supplied caller-controlled authority themselves, and did not adversarially enforce the approved ownership boundary.

## Fault Tree

```text
REPAIR03 fails
├── canonical authority not transferred
│   ├── creators still render full Markdown
│   ├── creators still render full JSON
│   ├── callers choose targets
│   ├── callers supply revision/role/disposition/sources
│   └── rendered-pair adapter reparses caller authority
├── registry not document-specific
│   ├── generic schema
│   ├── generic renderer
│   ├── no identity resolver
│   ├── no target resolver
│   └── no source resolver
├── integrity boundary incomplete
│   ├── Markdown/JSON semantic divergence possible
│   ├── jsonFields override channel
│   ├── expectedContextKey unused
│   └── verification outside rollback
├── LLM boundary unchanged
│   ├── full-file output still instructed
│   └── content contract only for Interview
└── verification/report defects
    ├── bypass test checks write routing only
    ├── live actual recovery not performed
    └── report cites nonexistent governance files
```

## Impact Assessment

### Workflow integrity

The same class of wrong-path, wrong-field, wrong-role, wrong-source, and wrong-disposition errors remains possible.

### Data integrity

Verification failure can leave invalid bytes without restoration.

### Semantic integrity

Markdown and JSON can disagree while metadata appears synchronized.

### Architecture integrity

A registry name can exist without a real document definition.

### Test integrity

A source-routing test can certify migration while service-local canonical serializers remain.

### Delivery integrity

The repeated pattern converts approved architectural replacement into successive compatibility wrappers.

### Trust integrity

The report’s claim to have inspected nonexistent files undermines its reliability as evidence.

## Non-Causes

The failure was not caused by:

- hashes or hash mismatches;
- platform safety controls;
- a build failure in the approved Windows lane;
- a test failure;
- lack of repository read or write capability;
- required Git mutation;
- a required new dependency;
- an external MCP adapter requirement;
- a genuine approved stop condition.

## Corrective Action Strategy

### Preserve

Retain:

- browser application-host readiness;
- cancellation-aware `ERR_ABORTED` handling;
- embedded authentication and session behavior;
- constrained context menu and reload;
- Revisionary legacy-shape detection and visible recovery action;
- canonical source-revision syntax;
- useful fixture and browser tests.

### Delete or replace

Remove as active canonical authority:

- generic `CanonicalDocumentContent` envelope fields;
- public caller targets;
- arbitrary `metadataLines` and `jsonFields` envelope channels;
- rendered-pair migration as the final creator architecture;
- direct LLM full-file output instructions;
- source-routing-only bypass tests.

### Implement

Create real per-type definitions and migrate services to substantive domain inputs.

### Verify

Use adversarial tests that fail if any active creator:

- constructs `Artifact.Revision`, `participationRole`, source-revision sections, or disposition blocks;
- constructs root JSON envelope fields;
- supplies targets or workflow metadata to canonical construction;
- uses rendered-pair adapters as its normal creation path.

## Required Process Correction for WC25-REPAIR04

WC25-REPAIR04 must be one atomic repair with subordinate execution passes:

1. core authority redesign and rollback transaction;
2. project-level definitions and migration;
3. phase-level definitions and migration;
4. Work Card, report, validation, and closeout migration;
5. content-only creation contracts and handoff replacement;
6. Revisionary fixture recovery and browser regression;
7. full validation and evidence reconciliation.

The Implementer must continue through every pass unless an explicit REPAIR04 stop condition is met.

The following are not stop conditions:

- scope size;
- dirty-tree complexity;
- a passing partial test suite;
- a working rendered-pair adapter;
- desire for a cleaner later pass;
- time already spent;
- preference to defer document-specific contracts;
- inability to mutate the actual external Revisionary workspace during Implementer validation.

The Implementer may not:

- create, recommend, or assume REPAIR05;
- return another partial completion report;
- label mandatory architecture as future work;
- use a report narrative or passing routing scan as substitute evidence.

## Architect Disposition

WC25-REPAIR03 is `RevisionRequested`.

The next authorized sibling is WC25-REPAIR04. Operator validation remains suspended until the latest repair Implementer Report is approved.

## Document Disposition

Document.Status=Approved
