<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "repair-work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR04"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC25-REPAIR04",
    "phaseId": "phase-08",
    "originalParentWorkCardId": "WC25",
    "priorRepairWorkCardId": "WC25-REPAIR03",
    "title": "Document Authority Transfer, Creator Migration, Transactional Verification, and Content-Only Handoff Completion",
    "status": "approved",
    "owner": "Implementer",
    "risk": "high",
    "repository": "ChampCity_AI",
    "executionAuthorization": {
      "authorized": true,
      "source": "Operator request for full REPAIR03 RCA and WC25-REPAIR04",
      "separateApprovalRequired": false,
      "gitMutationAuthorized": false,
      "atomicRepair": true,
      "partialCompletionAuthorized": false,
      "futureRepairRecommendationAuthorized": false
    },
    "bindingAuthority": {
      "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR03_canonical_document_construction_migration_revisionary_recovery_and_browser_readiness_completion.md",
      "requiredReportDisposition": "RevisionRequested",
      "rcaPath": "planning/phases/phase-08/Architect_Reports/RCA_WC25_REPAIR03_PARTIAL_CANONICAL_ARCHITECTURE_AND_IMPLEMENTER_DECOMPOSITION.md",
      "canonicalDesignMarkdown": "planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md",
      "canonicalDesignJson": "planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.json",
      "authorityRule": "Repository paths, current content, and explicit document dispositions control. Content hashes are non-authoritative diagnostics and cannot gate execution, review, freshness, or workflow progression."
    },
    "controllingPrinciple": "Content producers provide substantive content. Document definitions derive and create canonical workflow artifacts.",
    "confirmedRootCauses": [
      "Active creators still render complete Markdown and JSON envelopes before calling the rendered-pair adapter.",
      "Public canonical APIs accept caller-selected targets and workflow-envelope authority.",
      "Registry entries share one generic schema and renderer rather than document-specific authority definitions.",
      "Markdown sections and JSON fields are independent substantive channels.",
      "Arbitrary JSON fields can overwrite fixed envelope fields.",
      "Production-parser verification occurs after transaction backups are discarded.",
      "expectedContextKey is not enforced by the central construction service.",
      "Direct LLM full-file authorship remains the active handoff path.",
      "Content-only submission is implemented only for Project Architect Interview.",
      "The bypass test verifies routing to a shared module rather than transfer of canonical authority.",
      "The REPAIR03 report claims inspection of governance files that do not exist and are superseded."
    ],
    "publicBoundary": {
      "allowedInputs": [
        "workspaceRoot",
        "documentType",
        "substantiveContent",
        "expectedContextKey"
      ],
      "prohibitedInputs": [
        "canonical targets",
        "sibling stem",
        "artifact type",
        "artifact revision",
        "participation role",
        "disposition",
        "source revisions",
        "identity fields derived from repository context",
        "bundle membership",
        "review metadata",
        "metadata lines",
        "Markdown envelope",
        "serialized JSON envelope",
        "arbitrary JSON fields",
        "serializer selection",
        "schema selection"
      ]
    },
    "requiredDefinitionCapabilities": [
      "document-specific runtime substantive-content schema",
      "current-context resolver",
      "identity resolver",
      "canonical target resolver",
      "artifact revision resolver",
      "source-revision resolver",
      "participation-role resolver",
      "initial-disposition resolver",
      "one per-type canonical substantive model",
      "Markdown renderer",
      "JSON renderer",
      "document-specific production-parser verifier"
    ],
    "requiredCreatorMigration": [
      "project-intake",
      "project-architect-interview-prompt",
      "generated-architect-handoff",
      "project-architect-interview",
      "project-profile",
      "project-roadmap",
      "phase-map",
      "phase-interview",
      "phase-planning",
      "work-card-plan",
      "work-card-intake",
      "formal-work-card",
      "repair-work-card",
      "implementer-report",
      "validation-record",
      "phase-closeout",
      "project-closeout"
    ],
    "renderedPairAdapterRule": {
      "normalCreatorUseProhibited": true,
      "allowedUse": "Explicitly enumerated legacy recovery only",
      "activeCreatorImportsAllowed": false,
      "mayBeClaimedAsMigration": false
    },
    "transactionRequirements": [
      "capture original sibling bytes",
      "stage and install new siblings",
      "re-read through planningDocumentService before deleting backups",
      "verify exact identity, revision, role, sources, disposition, synchronization, and document-specific content identity",
      "restore originals on parser or verification failure",
      "remove temporary and backup files after success or rollback"
    ],
    "contentContractRequirements": {
      "allActiveLlmOutputsCovered": true,
      "contentOnly": true,
      "externalChampCityGptAdapterOutOfScope": true,
      "directCanonicalFileInstructionProhibited": true,
      "submissionIsWorkflowArtifact": false
    },
    "executionPasses": [
      "Pass 1 — Canonical Core Authority",
      "Pass 2 — Project-Level Migration",
      "Pass 3 — Phase-Level Migration",
      "Pass 4 — Work Card-Level Migration",
      "Pass 5 — Content-Only Handoff Conversion",
      "Pass 6 — Revisionary and Browser Validation",
      "Pass 7 — Reconciliation and Full Validation"
    ],
    "nonStopConditions": [
      "scope size",
      "number of creator services",
      "dirty-tree existence by itself",
      "implementation difficulty",
      "time spent",
      "a green partial suite",
      "working browser or recovery subset",
      "rendered-pair adapter availability",
      "lack of external MCP adapter",
      "inability to mutate the actual Revisionary workspace during Implementer validation",
      "preference for another repair"
    ],
    "stopConditions": [
      "A required document type lacks current authoritative semantics and implementation would require invention.",
      "Migration requires an unauthorized protected lifecycle, review, disposition, source-revision, or invalidation change.",
      "A specific new dependency is necessary for safe runtime validation.",
      "Transactional rollback requires an unauthorized filesystem-safety change.",
      "A specific target file cannot be changed without destroying inseparable unrelated dirty-tree work.",
      "Implementation requires a ChampCity_GPT source change.",
      "Implementation requires Git mutation.",
      "Current controlling documents contain an unresolved contradiction after applying the authority order."
    ],
    "requiredValidation": [
      "npm run typecheck",
      "npm run build",
      "npm test",
      "controlled temporary-workspace Electron non-acceptance validation"
    ],
    "acceptanceCriteria": [
      "The public creation boundary accepts substantive content only.",
      "Callers cannot provide targets or workflow authority.",
      "Every active document type has a real authority definition.",
      "Every active creator is migrated from local full-envelope assembly.",
      "No normal creator uses rendered-pair migration.",
      "Markdown and JSON derive from one per-type model.",
      "JSON envelope overwrite is impossible.",
      "Current context is centrally enforced.",
      "Production-parser verification is transactional and rolls back.",
      "Every active LLM output uses a content-only creation contract.",
      "Current handoffs no longer instruct canonical file authorship.",
      "Content submissions remain outside workflow authority.",
      "The authority-focused bypass test passes.",
      "Revisionary fixture recovery preserves content and advances through approval in a controlled workspace.",
      "Browser and UI corrections remain intact.",
      "Typecheck, build, tests, and required Electron evidence pass.",
      "The Implementer Report contains no incomplete migration row, mandatory future work, proposed REPAIR05, or unsupported repository claim.",
      "No ChampCity_GPT source change, provider replacement, external mode, DOM inspection, fabricated content, hidden authority, hash gate, or Git mutation occurs."
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR04_document_authority_transfer_creator_migration_transactional_verification_and_content_only_handoff_completion.md",
    "returnTarget": "parent-work-card-building-review"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC25-REPAIR04 Document Authority Transfer, Creator Migration, Transactional Verification, and Content-Only Handoff Completion

Status: approved for immediate Implementer execution
Owner: Implementer
Phase: phase-08
Parent Work Card: WC25 — Architect Interview Visible Embedded Surface Attachment Repair
Prior repair: WC25-REPAIR03 — Canonical Document Construction Migration, Revisionary Recovery, and Browser Readiness Completion
Repair sequence: 4
Risk: high
Repository: ChampCity_AI only
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR04_document_authority_transfer_creator_migration_transactional_verification_and_content_only_handoff_completion.md`

## Binding Authority

This repair is bound to current repository evidence:

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR03_canonical_document_construction_migration_revisionary_recovery_and_browser_readiness_completion.md` with `Document.Status=RevisionRequested`;
- `planning/phases/phase-08/Architect_Reports/RCA_WC25_REPAIR03_PARTIAL_CANONICAL_ARCHITECTURE_AND_IMPLEMENTER_DECOMPOSITION.md`;
- `planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md`;
- `planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.json`;
- `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`;
- `docs/dev/VALIDATION_COMMAND_LANES.md`.

Repository paths, current content, and explicit document dispositions control. Content hashes are non-authoritative diagnostics and must not authorize, block, invalidate, supersede, or require reconciliation of this repair.

The deleted governance protocol files referenced by the final legacy section of `AGENTS.md` are superseded by `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`. Do not claim to inspect or depend on files that do not exist.

## Non-Negotiable Execution Rule

This is one atomic repair Work Card.

The Implementer must use the internal Execution Pass Plan defined below and continue through every pass before returning the Implementer Report, unless an explicit stop condition in this card is actually met.

The Implementer is not authorized to:

- narrow the Work Card;
- return an interim or partial completion report;
- label mandatory requirements as future work;
- recommend, create, or assume `WC25-REPAIR05`;
- stop because a subset passes tests;
- stop because the tree is dirty;
- stop because the scope is large;
- stop because a rendered-pair adapter provides an easier route;
- stop because an external MCP adapter is not yet implemented;
- substitute routing through a shared module for transfer of canonical authority.

The normal `AGENTS.md` report convention requiring a “Recommended next Implementer task” is overridden for this repair. The report must contain no recommended follow-up implementation task. It may list only remaining Operator validation after all implementation requirements are complete.

If a genuine stop condition is discovered, stop at that point and report the exact repository evidence. Do not present the pass as complete and do not invent a future repair.

## Purpose

Complete the approved architecture by transferring canonical document authority from active creator services and LLM output into real document-type definitions owned by ChampCity A/I.

Controlling rule:

> Content producers provide substantive content. Document definitions derive and create canonical workflow artifacts.

The final architecture must make the following invalid state unrepresentable:

> A creator or LLM chooses a canonical target, revision, role, disposition, source revision, Markdown envelope, or JSON envelope.

## Confirmed REPAIR03 Defects

### 1. Rendered-pair wrapping preserved the old authority

Active services still render complete canonical Markdown and JSON, then call `writeCanonicalRenderedArtifactPairs()`.

That is not migration. It reparses caller-authored authority.

### 2. The public canonical API accepts authority fields

Current construction inputs accept target paths, artifact revision, role, disposition, source revisions, metadata envelope lines, and arbitrary JSON fields.

### 3. The registry is generic

Document-type entries share one generic schema, model composer, Markdown renderer, and JSON renderer. The definitions do not resolve document-specific identity or repository authority.

### 4. Sibling semantics can diverge

Markdown sections and JSON fields are independent inputs.

### 5. Verification cannot restore prior bytes

Production-parser verification occurs after transaction backups are removed.

### 6. Context freshness is not enforced centrally

`expectedContextKey` is unused by the construction service.

### 7. Direct LLM full-file authorship remains active

Current prompts still instruct LLMs to write canonical Markdown and JSON files.

### 8. Content-only submission is limited to Architect Interview

No general application-side contract system exists for other LLM-authored document types.

### 9. The bypass test verifies routing, not authority

It permits local full-file renderers as long as they call the shared rendered-pair adapter.

### 10. The Implementer Report contains unsupported repository claims

It states that deleted governance protocol files were inspected even though they are absent and explicitly superseded.

## Required Final Architecture

## 1. Substantive-Content-Only Public Boundary

The public creation service must be equivalent to:

```ts
createCanonicalDocument({
  workspaceRoot,
  documentType,
  substantiveContent,
  expectedContextKey,
})
```

The public caller must not provide:

- Markdown target;
- JSON target;
- sibling stem;
- artifact type;
- artifact revision;
- participation role;
- disposition;
- source revisions;
- identity fields controlled by repository context;
- bundle membership;
- review metadata;
- metadata header lines;
- Markdown envelope;
- serialized JSON envelope;
- arbitrary JSON fields;
- serializer or schema selection.

Remove these fields from the public substantive content type. Runtime validation must reject them rather than silently treating them as authority.

An internal recovery function may preserve an existing artifact revision only after a document definition validates the exact recognized recovery context. That privilege must not be exposed to ordinary content producers.

## 2. Real Document-Type Definitions

Every active document type must have a real definition with its own runtime substantive-content schema and authority resolvers.

A definition must own or delegate through explicitly typed components equivalent to:

```ts
interface CanonicalDocumentDefinition<SubstantiveContent, CanonicalModel> {
  documentType: CanonicalDocumentType;
  contentSchemaId: string;
  contentSchemaVersion: number;
  validateSubstantiveContent(input: unknown): SubstantiveContent;
  resolveCurrentContext(workspaceRoot: string): DocumentContext;
  resolveIdentity(context: DocumentContext): CanonicalIdentity;
  resolveTargets(context: DocumentContext): CanonicalTargets;
  resolveArtifactRevision(context: DocumentContext): number;
  resolveSourceRevisions(context: DocumentContext): SourceRevision[];
  resolveParticipationRole(context: DocumentContext): ParticipationRole;
  resolveInitialDisposition(context: DocumentContext): DocumentDispositionStatus;
  composeCanonicalModel(context: DocumentContext, content: SubstantiveContent): CanonicalModel;
  renderMarkdown(model: CanonicalModel): string;
  renderJson(model: CanonicalModel): string;
  verifyParsedDocument(parsed, model): VerificationResult;
}
```

Equivalent code organization is acceptable. Equivalent authority ownership is mandatory.

A definition must not be a generic alias over the same title/sections/jsonFields schema unless the document types genuinely share one substantive contract and that equivalence is proven.

## 3. One Per-Type Substantive Model

Each definition must normalize one substantive object.

Markdown and JSON must be rendered from that same object. Independent caller-provided Markdown sections and JSON fields are prohibited.

Example principle:

```ts
ProjectIntakeContent
→ ProjectIntakeCanonicalModel
→ renderProjectIntakeMarkdown(model)
→ renderProjectIntakeJson(model)
```

The Markdown and JSON renderers may present information differently, but they must derive from the same typed values.

## 4. No Envelope-Smuggling Channels

Remove generic caller-controlled:

- `metadataLines`;
- `jsonFields`;
- `sections` when used as a universal substitute for per-type schemas;
- `artifactRevision`;
- `participationRole`;
- `disposition`;
- `sourceRevisions`;
- `targets`.

Fixed envelope fields must be written after substantive fields or from a structure that makes duplicate keys impossible.

Tests must prove that an input containing envelope-like properties is rejected and cannot alter output authority.

## 5. Transactional Production-Parser Verification

Extend or replace `writeArtifactTransaction()` so production-parser verification occurs before backups are discarded.

Required behavior:

```text
capture originals
→ stage new siblings
→ install new siblings
→ re-read through planningDocumentService
→ verify identity, revision, role, sources, disposition, synchronization, and document-specific content identity
→ delete backups only after verification succeeds
```

If verification fails:

- restore all original bytes;
- remove staged and temporary files;
- return or throw bounded failure;
- leave no partial new pair;
- prove restoration in deterministic tests.

## 6. Central Context-Key Enforcement

The construction service must require and validate current repository context.

`expectedContextKey` must be compared against the definition-resolved current context before any write.

A stale, unknown, ambiguous, superseded, or consumed contract must not create or modify canonical output.

Direct internal creator calls must use the same current-context enforcement as LLM content submissions.

## 7. Rendered-Pair Adapter Boundary

`writeCanonicalRenderedArtifactPairs()` and `createCanonicalDocumentFromRenderedPair()` must not be used by active normal creator paths.

They may be:

- deleted; or
- retained only as an explicitly named legacy recovery adapter for a bounded recognized historical defect.

If retained:

- no active creator service may import or call them;
- they must not be described as migration;
- they must not determine current canonical identity or authority;
- recovery must normalize immediately into a real per-type substantive model;
- tests must identify every allowed recovery caller.

## Mandatory Creator Migration Matrix

Migrate the following active creators from full-envelope rendering to substantive-content adapters and document definitions.

### Project-level

- `src/main/projectIntake/projectIntakeService.ts`
  - Project Intake definition;
  - Project Architect Interview Prompt definition;
  - no local `Artifact.Revision`, role, source section, disposition block, root artifact JSON, or target authority assembly.

- `src/main/architectInterview/architectInterviewService.ts`
  - Project Architect Interview draft, content submission, revision, and recovery;
  - bounded review-only disposition writer may remain if it does not change substantive revision.

- `src/main/projectPlanning/projectPlanningService.ts`
  - Project Profile;
  - Project Roadmap;
  - related generated handoff content contracts.

- `src/main/phaseMap/phaseMapService.ts`
  - Phase Map;
  - generated handoff contract.

- `src/main/projectClose/projectCloseService.ts`
  - Project Closeout.

### Phase-level

- `src/main/phaseInterview/phaseInterviewService.ts`
  - Phase Interview and its content contract.

- `src/main/phasePlanning/phasePlanningService.ts`
  - Phase Planning;
  - Work Card Plan;
  - candidate revision behavior;
  - generated handoff contract.

- `src/main/phaseClose/phaseCloseService.ts`
  - Phase Closeout.

### Work Card-level

- `src/main/workCardIntake/workCardIntakeService.ts`
  - Work Card Intake handoff.

- `src/main/workCardPlanning/workCardPlanningService.ts`
  - Formal Work Card and content contract.

- `src/main/workCardBuilding/workCardBuildingReviewService.ts`
  - Implementer Report creation/import and review behavior.

- `src/main/workCardRepair/workCardRepairService.ts`
  - repair Work Card.

- `src/main/workCardValidation/workCardValidationService.ts`
  - Validation Record.

For every migrated path, preserve existing:

- canonical paths;
- artifact type;
- identity fields;
- source set;
- role;
- initial disposition;
- substantive content semantics;
- create/revise behavior;
- bundle behavior;
- downstream invalidation;
- lifecycle ordering;
- review behavior.

## Content-Only Creation Contracts for Every LLM-Authored Output

Implement a general creation-contract registry for every active LLM-authored workflow output.

Each contract must contain:

- contract ID;
- document type;
- content schema ID and version;
- current context key;
- permitted substantive fields;
- invalidation rule;
- application-side submission channel;
- display-only expected output identity.

The current ChampCity_AI application must support content-only ingestion without requiring the external ChampCity_GPT adapter.

Acceptable application-side mechanisms include:

- existing IPC/preload content submission with a bounded Operator paste/import surface; or
- an application-defined non-workflow content-submission inbox that is excluded from planning discovery and consumed by the application.

The external MCP adapter remains a separate ChampCity_GPT Work Card.

Current handoffs must no longer instruct LLMs to write canonical Markdown or JSON files. They must instruct the LLM to produce or submit only the substantive payload defined by the creation contract.

Do not retain full-file authorship as the preferred, fallback, compatibility, or “until tooling is available” route for active governed documents.

## Repository-Integrity Enforcement

Replace the current routing-only scan with an authority-focused integrity test.

The test must fail if an active creator:

- imports or calls `writeCanonicalRenderedArtifactPairs()`;
- imports or calls `createCanonicalDocumentFromRenderedPair()` as a normal creation path;
- supplies targets to canonical construction;
- supplies artifact revision, role, disposition, or source revisions as content;
- constructs canonical Markdown metadata headers;
- constructs canonical `## Source Revisions` lines;
- constructs canonical `## Document Disposition` blocks;
- constructs root JSON `artifactType`, `artifactRevision`, `participationRole`, `sourceRevisions`, or `documentDisposition` for new/revised artifacts;
- independently serializes both canonical siblings.

Narrow read, recovery, or disposition-only exemptions must be explicitly enumerated and tested.

The test must inspect the actual active creator inventory, not only a manually incomplete list.

## Revisionary Recovery

Preserve and correct the current `Repair Canonical Envelope` behavior.

Deterministic fixture validation must prove:

1. the recognized legacy `artifactRevision` source-reference shape is detected;
2. unrelated malformed shapes are not silently normalized;
3. substantive content is preserved semantically;
4. the definition derives current Intake and Prompt sources;
5. artifact revision remains unchanged for envelope-only repair;
6. role and Pending disposition are application-derived;
7. both siblings are rendered from one recovered substantive model;
8. production-parser verification occurs inside the rollback boundary;
9. the workspace becomes `Awaiting Approval`;
10. approval advances to Project Planning in a controlled temporary workspace;
11. unrelated historical files remain unchanged.

Production source changes remain limited to ChampCity_AI.

Implementer live validation must not mutate the actual configured Revisionary workspace unless the Operator separately authorizes that specific mutation. Use a temporary controlled repository for mutation and progression validation. Actual Revisionary recovery remains an Operator validation step.

## Browser and UI Preservation

Retain and regression-test:

- ChatGPT/OpenAI host-specific readiness;
- Google authentication host non-readiness;
- cancellation-aware `ERR_ABORTED` behavior;
- genuine load-failure presentation;
- embedded persistent session and partition;
- constrained right-click edit menu;
- Reload ChatGPT using the existing webContents;
- success/info/error feedback;
- compact dual-pane layout;
- visible Repair Canonical Envelope action when applicable.

Do not reopen the authentication architecture or add external-browser mode.

## Internal Execution Pass Plan

These passes are mandatory implementation procedure within WC25-REPAIR04. They are not separate Work Cards and do not create separate acceptance points.

### Pass 1 — Canonical Core Authority

- redesign public types;
- implement real definition interface;
- implement per-type schema mechanism;
- implement central context-key validation;
- implement transactional verification rollback;
- add adversarial core tests.

Pass 1 must pass focused tests before Pass 2, but the Work Card is not complete.

### Pass 2 — Project-Level Migration

- Project Intake;
- Prompt and generated handoffs;
- Architect Interview;
- Project Profile and Roadmap;
- Phase Map;
- Project Closeout.

Delete or bypass no local authority by wrapping rendered pairs.

### Pass 3 — Phase-Level Migration

- Phase Interview;
- Phase Planning;
- Work Card Plan;
- Phase Closeout.

### Pass 4 — Work Card-Level Migration

- Work Card Intake;
- Formal Work Card;
- repair Work Card;
- Implementer Report;
- Validation Record.

### Pass 5 — Content-Only Handoff Conversion

- general creation-contract registry;
- application-side content ingestion;
- remove active direct LLM full-file instructions;
- prove submissions remain outside workflow discovery.

### Pass 6 — Revisionary and Browser Validation

- controlled temporary recovery workspace;
- recovery and approval progression;
- browser regression;
- UI reachability and non-acceptance smoke.

### Pass 7 — Reconciliation and Full Validation

- authority-focused repository-integrity scan;
- complete migration matrix;
- typecheck;
- build;
- full tests;
- final non-acceptance Electron smoke;
- exact final dirty-tree inventory;
- report only after all passes complete.

## Prohibited Partial-Completion Substitutes

The following do not satisfy this card:

- adding more document names to the existing generic registry;
- wrapping creator-rendered files in the rendered-pair adapter;
- moving `JSON.stringify()` into a helper without transferring authority;
- source scans that check only imports or final write functions;
- a creation contract for Architect Interview only;
- keeping direct canonical-file handoffs as fallback;
- parser verification after backups are deleted;
- caller fields that are “ignored in one wrapper” but remain accepted by the public API;
- declaring a document type migrated because no active final output creator currently exists while its LLM handoff still requires full-file authorship;
- passing tests authored around the substituted mechanism;
- another recommended future pass.

## Explicit Stop Conditions

Stop and report only if repository evidence proves one of these conditions:

1. a required active document type has no current authoritative identity, path, source, role, disposition, or revision semantics in the approved planning corpus or production behavior, and implementing it would require invention;
2. migration requires changing a protected lifecycle, review, disposition, source-revision, or invalidation semantic not authorized by this card;
3. a required safe runtime content validator cannot be implemented with the existing dependency set and a specific new dependency is necessary;
4. transactional rollback cannot be implemented without changing protected filesystem or repository safety behavior outside scope;
5. preserving the dirty tree is impossible for a specific target file because unrelated changes cannot be separated safely;
6. implementation requires a ChampCity_GPT source change;
7. implementation requires Git mutation;
8. an actual repository contradiction exists between current controlling documents and cannot be resolved by the authority order.

The following are explicitly not stop conditions:

- scope size;
- number of creator services;
- dirty-tree existence by itself;
- implementation difficulty;
- time spent;
- a green partial suite;
- working browser/recovery subset;
- rendered-pair adapter availability;
- lack of external MCP adapter;
- inability to mutate the actual Revisionary workspace during Implementer validation;
- preference for another repair.

## Required Deterministic Tests

### Core authority

Prove:

1. public substantive input types contain no targets or workflow-envelope fields;
2. runtime input with envelope fields is rejected;
3. each document definition has a distinct or explicitly justified substantive schema;
4. definitions derive identity and targets;
5. definitions derive current source revisions;
6. definitions derive artifact revision, role, and initial disposition;
7. stale context keys fail before write;
8. unknown and ambiguous context fails before write;
9. Markdown and JSON derive from one per-type substantive model;
10. semantic sibling equivalence is verified;
11. fixed JSON envelope fields cannot be overwritten;
12. production-parser verification failure restores original bytes;
13. partial write and second-file failure restore original bytes;
14. no temporary or backup files remain after success or failure.

### Migration

For every creator in the mandatory matrix, prove:

15. the normal creation path uses substantive content only;
16. no active creator uses rendered-pair migration;
17. canonical paths and metadata remain equivalent to approved behavior;
18. existing lifecycle and invalidation tests pass;
19. substantive revision and disposition-only revision behavior remain correct;
20. bundles remain atomic and synchronized.

### Content contracts

Prove:

21. every active LLM-authored output has a creation contract;
22. contracts identify permitted substantive fields only;
23. stale, unknown, ambiguous, or superseded contracts fail before write;
24. caller target or envelope fields are rejected;
25. submissions are excluded from planning discovery, review queues, lifecycle resolution, source graphs, and disposition controls;
26. current handoffs contain no instruction to write canonical Markdown or JSON files.

### Recovery and browser

Prove:

27. Revisionary fixture recovery preserves substantive content and revision;
28. recovery is transactional and parser-verified;
29. recovery becomes reviewable and approval advances to Project Planning in the controlled workspace;
30. browser host and canceled-navigation corrections remain passing;
31. session, reload, context-menu, feedback, and layout behavior remain passing.

### Report integrity

Prove or manually inspect:

32. every repository file claimed as inspected exists;
33. the report contains no unsupported validation claim;
34. the report contains no recommended future implementation pass;
35. the migration matrix has no incomplete or future-work entry.

## Mandatory Validation

Read `docs/dev/VALIDATION_COMMAND_LANES.md` before commands that may spawn child processes.

Run in ChampCity_AI:

```text
npm run typecheck
npm run build
npm test
```

After a sandbox `spawn EPERM`, run the approved normal Windows lane once and report both attempts.

Do not use Playwright.

## Required Non-Acceptance Electron Validation

Using the freshly built application and a controlled temporary planning workspace, verify:

1. the application launches;
2. embedded authenticated ChatGPT remains visible and usable without credential inspection;
3. loaded ChatGPT displays `ChatGPT ready`;
4. Google authentication host does not display ready when encountered;
5. right-click Paste remains available;
6. copy success remains non-error styled;
7. Reload ChatGPT preserves the embedded view and session;
8. a controlled malformed Interview pair displays `Repair Canonical Envelope`;
9. repair preserves substantive content and becomes `Awaiting Approval`;
10. approval in the controlled workspace advances to Project Planning;
11. content-only submission creates canonical output without full-file caller input;
12. stale content submission is rejected;
13. content submissions are absent from workflow lists;
14. representative project-, phase-, Work Card-, validation-, and closeout creators produce canonical pairs after migration;
15. no toolbar scrolling, extra control card, or unrelated UI redesign appears.

Do not mutate the actual configured Revisionary workspace during Implementer validation without separate Operator authorization.

## Acceptance Criteria

WC25-REPAIR04 passes only when:

1. the public canonical creation boundary accepts substantive content only;
2. callers cannot provide targets or workflow authority;
3. every active document type has a real authority definition;
4. every active creator is migrated from local full-envelope assembly;
5. no normal creator uses rendered-pair migration;
6. Markdown and JSON derive from one per-type model;
7. JSON envelope overwrite is impossible;
8. current context is centrally enforced;
9. production-parser verification is transactional and rolls back;
10. every active LLM output uses a content-only creation contract;
11. current handoffs no longer instruct canonical file authorship;
12. submissions remain non-workflow transport;
13. the authority-focused bypass test passes;
14. Revisionary fixture recovery is safe, preserving, reviewable, and progression-complete;
15. browser and UI corrections remain intact;
16. typecheck passes;
17. build passes;
18. all tests pass;
19. required Electron non-acceptance evidence passes;
20. the report contains exact and supported evidence;
21. no mandatory requirement is labeled incomplete, deferred, residual, or future work;
22. no ChampCity_GPT source change, new provider, external mode, DOM inspection, fabricated content, hidden authority, hash gate, or Git mutation occurs.

## Implementer Report Requirements

Create:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR04_document_authority_transfer_creator_migration_transactional_verification_and_content_only_handoff_completion.md`

The report must include:

- repository, branch, remote, HEAD, and exact starting dirty-tree path inventory;
- binding report path and `RevisionRequested` disposition;
- controlling RCA path;
- exact files created, modified, and deleted;
- Execution Pass 1 through 7 results;
- final public API signatures;
- per-type definition and schema inventory;
- per-type identity, target, source, revision, role, and disposition resolver inventory;
- creator migration matrix with no incomplete row;
- removed local serializer inventory;
- rendered-pair adapter final disposition and allowed callers, if any;
- transactional verification and rollback proof;
- context-key enforcement proof;
- content-contract inventory for every LLM-authored output;
- proof current handoffs no longer require full-file authorship;
- authority-focused repository-integrity test results;
- Revisionary controlled-fixture before/after evidence;
- browser and UI regression evidence;
- exact validation commands, lanes, and results;
- every required Electron observation;
- exact final dirty-tree status;
- confirmation that all claimed repository paths exist;
- confirmation that no Git operation occurred;
- remaining Operator validation only.

The report must not contain:

- a recommended next implementation task;
- a proposed REPAIR05;
- incomplete migration rows;
- “future work” for any acceptance criterion;
- a partial-completion disposition;
- unsupported claims that nonexistent files were inspected.

The report must end with:

```markdown
## Return Target

```text
WC25-REPAIR04 Implementer Report
→ Architect review
→ parent WC25 Work Card Building review
→ Operator validation only after Architect approval
```
