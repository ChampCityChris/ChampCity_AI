<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "repair-work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR03"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC25-REPAIR03",
    "phaseId": "phase-08",
    "originalParentWorkCardId": "WC25",
    "priorRepairWorkCardId": "WC25-REPAIR02",
    "title": "Canonical Document Construction Migration, Revisionary Recovery, and Browser Readiness Completion",
    "status": "approved",
    "owner": "Implementer",
    "risk": "high",
    "executionAuthorization": {
      "authorized": true,
      "source": "Architect review of WC25-REPAIR02 under approved repair lifecycle",
      "separateOperatorApprovalRequired": false,
      "authorizedRepository": "ChampCity_AI"
    },
    "gitMutationAuthorized": false,
    "bindingEvidence": {
      "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR02_embedded_browser_status_context_menu_reload_and_feedback_semantics_repair.md",
      "requiredReportDisposition": "RevisionRequested",
      "priorRepairWorkCardPath": "planning/phases/phase-08/Work_Cards/WC25-REPAIR02_embedded_browser_status_context_menu_reload_and_feedback_semantics_repair.md",
      "priorRepairRevision": 5,
      "canonicalDesignMarkdown": "planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md",
      "canonicalDesignJson": "planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.json",
      "authorityRule": "Repository paths, current content, and explicit document dispositions control. Content hashes are non-authoritative diagnostics and cannot gate execution, review, freshness, or workflow progression."
    },
    "confirmedDefects": [
      "WC25-REPAIR02 omitted the approved Canonical Document Definition Registry and Construction Service",
      "No runtime content schemas, creation contracts, content ingestion, post-write verification, or active-creator migration exist",
      "Revisionary remains blocked because only an LLM correction handoff was added",
      "Authentication-provider main pages can be labeled ChatGPT ready",
      "ERR_ABORTED main-frame navigation is treated as terminal failure",
      "Required live Electron evidence is absent"
    ],
    "requiredSubsystems": [
      "Canonical Document Definition Registry",
      "Runtime-Validated Content Schemas",
      "Canonical Document Construction Service",
      "Application-Generated Creation Contracts",
      "Application-Side Content Submission Ingestion",
      "Canonical Model Markdown and JSON Rendering",
      "Atomic Pair Writing",
      "Production Parser Post-Write Verification",
      "Explicit Revisionary Canonical Envelope Recovery",
      "Active Creator Migration and Bypass Prevention"
    ],
    "activeCreatorCoverage": [
      "project-intake",
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
    "revisionaryRecovery": {
      "operatorVisibleAction": "Repair Canonical Envelope",
      "preserveSubstantiveContent": true,
      "deriveCurrentSourcesFromRepository": true,
      "canonicalJsonSourceField": "revision",
      "canonicalMarkdownSourceFormat": "- path: <path> revision: <number>",
      "requiredResult": "Awaiting Approval"
    },
    "browserCorrections": [
      "ChatGPT ready requires a stopped successful main load on an OpenAI or ChatGPT application host",
      "Authentication-provider hosts cannot present ChatGPT ready",
      "ERR_ABORTED or equivalent canceled navigation is non-terminal",
      "Genuine main-frame load failures remain terminal and visible"
    ],
    "preservedBehavior": [
      "REPAIR01 authentication and persistent partition behavior",
      "Attachment generation and stale-detach protection",
      "Typed feedback semantics",
      "Constrained remote context menu",
      "Reload ChatGPT existing-webContents behavior",
      "Strict source-revision validation",
      "Existing lifecycle ordering, review, disposition, and invalidation semantics"
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test",
      "Required live Electron validation recorded in the Markdown card"
    ],
    "acceptanceCriteria": [
      "One shared registry and construction service own every active document type",
      "All active creators are migrated",
      "Callers cannot control canonical envelope authority",
      "Markdown and JSON render from one canonical model",
      "Production-parser post-write verification is mandatory",
      "Creation contracts and application-side content ingestion reject stale or malformed submissions",
      "Revisionary is repaired without substantive-content loss and becomes reviewable",
      "Approving Revisionary advances to Project Planning",
      "Authentication-provider pages are never labeled ChatGPT ready",
      "ERR_ABORTED is not terminal while genuine failures remain visible",
      "All tests and live Electron checks pass",
      "No ChampCity_GPT change, prohibited dependency, API replacement, external mode, DOM inspection, fabricated content, hidden authority, or Git mutation"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR03_canonical_document_construction_migration_revisionary_recovery_and_browser_readiness_completion.md",
    "returnTarget": "parent-work-card-building-review"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC25-REPAIR03 Canonical Document Construction Migration, Revisionary Recovery, and Browser Readiness Completion

Status: approved for immediate Implementer execution
Owner: Implementer
Phase: phase-08
Parent Work Card: WC25 — Architect Interview Visible Embedded Surface Attachment Repair
Prior repair: WC25-REPAIR02 — Embedded Browser Usability, Interview Progression, and Application-Owned Canonical Document Construction Repair
Repair sequence: 3
Risk: high
Git mutation: not authorized
Repository: ChampCity_AI only
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR03_canonical_document_construction_migration_revisionary_recovery_and_browser_readiness_completion.md`

## Binding Evidence

This repair is bound to:

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR02_embedded_browser_status_context_menu_reload_and_feedback_semantics_repair.md` with `Document.Status=RevisionRequested`;
- `planning/phases/phase-08/Work_Cards/WC25-REPAIR02_embedded_browser_status_context_menu_reload_and_feedback_semantics_repair.md`, Revision 5;
- `planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md`;
- `planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.json`.

Content hashes are non-authoritative diagnostics only. Repository paths, current content, and explicit document dispositions control. A hash value or mismatch must never authorize, block, invalidate, supersede, or require reconciliation of this repair.

This card is the next sibling repair required by the approved Work Card lifecycle. It does not create a nested repair lifecycle.

## Purpose

Complete the authority that WC25-REPAIR02 left unfinished. Preserve the materially aligned browser, feedback, context-menu, reload, and source-handoff changes while implementing the application-owned canonical document system across every active ChampCity A/I document creator.

Controlling rule:

> LLMs and humans supply substantive content. ChampCity A/I creates canonical documents.

This repair must remove syntax-sensitive workflow authority from language-model output and from duplicated per-service serializers.

## Confirmed Defects

### 1. Approved architecture was not implemented

WC25-REPAIR02 did not create:

- the Canonical Document Definition Registry;
- runtime content schemas;
- the Canonical Document Construction Service;
- application-generated creation contracts;
- content-submission ingestion;
- canonical model composition;
- shared Markdown and JSON rendering;
- production-parser post-write verification;
- active-creator migration;
- bypass-prevention tests.

### 2. Revisionary remains blocked

The existing Revisionary Interview pair contains substantive content but malformed source-revision envelopes. The prior pass generated another LLM correction instruction instead of implementing the required application-owned recovery action. The pair remains unreviewable.

### 3. Browser readiness conflates application and authentication hosts

`inferArchitectBrowserLoadState()` currently treats `accounts.google.com` as equivalent to a ChatGPT/OpenAI application host. The renderer can therefore display `ChatGPT ready` while the main surface is still on the identity provider.

### 4. Canceled navigation is treated as terminal failure

The main browser service treats every main-frame `did-fail-load`, including `ERR_ABORTED` / code `-3`, as `load-failed`. Existing tests enforce this incorrect terminal classification.

## Required Architecture

### Canonical Document Definition Registry

Implement one explicit typed registry. Every definition must own:

- artifact type;
- content schema ID and version;
- runtime content validator;
- identity resolver;
- canonical Markdown and JSON target resolver;
- source-revision resolver;
- participation role;
- initial disposition;
- content normalization;
- canonical model composition;
- Markdown renderer;
- JSON renderer;
- post-write verifier.

Unknown or unregistered document types must fail before any write.

### Canonical Document Construction Service

Implement one shared service equivalent to:

```ts
createCanonicalDocument({
  workspaceRoot,
  documentType,
  content,
  expectedContextKey,
})
```

Required sequence:

```text
resolve repository authority
→ reject stale or ambiguous context
→ validate substantive content
→ derive identity, targets, role, disposition, and source revisions
→ compose one canonical in-memory model
→ render Markdown and JSON from that model
→ write both siblings atomically
→ re-read through planningDocumentService
→ verify exact production metadata and synchronization
→ report success
```

A byte write without successful production-parser verification is failure.

### Application-generated creation contracts

Create a current contract for each LLM-authored document request containing:

- contract ID;
- document type;
- content schema ID and version;
- current evidence/context key;
- permitted substantive fields;
- application-side submission-ingestion identity;
- invalidation rule when repository evidence changes.

The content producer must not control:

- canonical paths;
- artifact type or artifact revision;
- project, phase, Work Card, repair, candidate, or attempt identity;
- source revisions;
- participation role;
- disposition or review metadata;
- Markdown envelope;
- canonical JSON envelope;
- serializer or schema selection.

A stale, unknown, ambiguous, or superseded creation contract must not write or modify canonical output.

### Application-side content submission

Implement a stable ChampCity A/I ingestion interface that accepts only:

```ts
{
  creationContractId: string;
  content: unknown;
}
```

Workspace and target authority must come from the current application context, not from caller input.

Content submissions are transport records, not workflow artifacts. They must not appear in planning discovery, lifecycle resolution, disposition controls, review queues, or source-revision graphs.

The external ChampCity MCP adapter remains governed by the separate ChampCity_GPT Work Card and is out of scope here.

## Mandatory Active-Creator Migration

Migrate every active creation path to the shared registry and construction service:

- Project Intake;
- all generated Architect prompts and handoffs;
- Project Architect Interview;
- Project Profile;
- Project Roadmap;
- Phase Map;
- Phase Interview;
- Phase Planning;
- Work Card Plan;
- Work Card Intake output;
- Formal Work Card;
- repair Work Card;
- Implementer Report;
- Validation Record;
- Phase Closeout;
- Project Closeout.

Human-authored, system-generated, and LLM-authored documents must use the same canonical service. Only the substantive content source may differ.

After migration, no active service may independently concatenate canonical Markdown metadata while separately constructing a JSON envelope.

Add a repository-integrity test that inventories active creator modules and fails if a creator bypasses the canonical registry/service.

## Revisionary Recovery

Add an Operator-visible action labeled `Repair Canonical Envelope` when the current exact Interview pair is substantive but fails a recognized legacy envelope schema.

The recovery must:

1. read the existing Revisionary Markdown and JSON siblings;
2. extract substantive content without treating malformed metadata as authority;
3. resolve the current Project Intake and Architect Interview Prompt from repository evidence;
4. preserve the Interview artifact revision unless substantive content changes;
5. preserve `participationRole=gatingReview`;
6. preserve `Document.Status=Pending`;
7. construct the canonical pair through the shared service;
8. emit JSON `sourceRevisions` using `{ path, revision }`;
9. emit Markdown source lines using `- path: <path> revision: <number>`;
10. write atomically;
11. re-read and verify through production parsing;
12. move the workspace automatically to `Awaiting Approval`;
13. enable Interview disposition controls;
14. preserve substantive content byte-for-byte where format permits, or prove normalized semantic equivalence where canonical rendering changes formatting.

The recovery must be explicit and Operator-initiated. Do not silently bulk-rewrite historical artifacts.

## Browser Readiness Completion

### Host-specific readiness

Separate navigation permission from product readiness.

- OpenAI/ChatGPT application host + stopped successful main load + visible attachment may present `ChatGPT ready`.
- Authentication-provider host must never present `ChatGPT ready`.
- While the main surface is on `accounts.google.com`, use a non-ready presentation such as `Loading ChatGPT...` without claiming account state.
- External or invalid hosts remain unavailable or externally handled under the existing navigation policy.

Use an explicit application-host predicate rather than the broad embedded-navigation allow predicate.

### Cancellation-aware failure handling

Treat `ERR_ABORTED` / code `-3` and equivalent canceled or superseded main-frame navigation as non-terminal unless the current stopped main page is actually unavailable.

Requirements:

- preserve diagnostic recording;
- do not latch `Browser unavailable` solely from an aborted navigation;
- use the current main URL and subsequent load lifecycle to derive final presentation;
- preserve terminal failure for genuine main-frame load errors;
- authentication-popup failures must not overwrite main-surface state.

## Preserved Work

Retain unless correction is required to satisfy this card:

- REPAIR01 embedded authentication and persistent partition behavior;
- attachment-generation and stale-detach protection;
- close-after-detach lifecycle integrity;
- human-readable browser status UI;
- typed success/info/error feedback;
- constrained remote context menu;
- Reload ChatGPT using the existing webContents;
- exact source-revision examples in handoff content;
- inspectable invalid Interview output;
- strict canonical source-revision validation;
- existing lifecycle ordering, workspace ownership, review, disposition, and invalidation semantics.

## Strict Repository Scope

Repository: `ChampCity_AI` only.

Authorized areas include:

```text
planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.*
src/main/documents/
src/shared/documents/
src/main/projectIntake/projectIntakeService.ts
src/main/architectInterview/
src/main/projectPlanning/projectPlanningService.ts
src/main/phaseMap/phaseMapService.ts
src/main/phaseInterview/phaseInterviewService.ts
src/main/phasePlanning/phasePlanningService.ts
src/main/workCardIntake/workCardIntakeService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/workCardRepair/workCardRepairService.ts
src/main/workCardValidation/workCardValidationService.ts
src/main/phaseClose/phaseCloseService.ts
src/main/projectClose/projectCloseService.ts
src/main/browser/architectBrowserService.ts
src/main/integrations/architectMcpHandoffService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/styles.css
focused shared helpers and tests required by this card
```

Do not modify ChampCity_GPT under this card.

## Explicit Non-Goals

Do not:

- implement the external MCP adapter;
- add an API/provider replacement;
- add external-browser mode;
- change the authentication architecture;
- inspect ChatGPT DOM, cookies, credentials, account identity, or generated content;
- automate paste or submission;
- add dependencies unless an existing approved runtime validator cannot express the required schemas and the Architect approves the exact dependency first;
- weaken source-revision validation;
- use parser aliases as the primary fix;
- use regex repair as the canonical construction path;
- create duplicated serializers;
- silently fabricate substantive content;
- bulk-migrate historical artifacts;
- perform Git operations.

## Required Deterministic Tests

### Registry and construction

Prove:

1. every active document type has one registered definition;
2. unknown types fail before write;
3. malformed substantive content fails before write;
4. caller envelope fields are rejected or ignored as non-authoritative;
5. identity and targets are derived deterministically;
6. current source revisions are derived from repository evidence;
7. Markdown and JSON are rendered from one canonical model;
8. both siblings use the same normalized source array;
9. JSON emits `revision` inside source references;
10. Markdown emits canonical source lines;
11. pair writes are atomic;
12. production-parser verification is mandatory;
13. parser or verification failure rolls back or reports bounded failure without false success;
14. disposition-only review does not increment artifact revision;
15. substantive revision increments artifact revision and preserves downstream invalidation;
16. stale creation contracts cannot create output;
17. submissions remain outside planning discovery and lifecycle authority;
18. every active creator delegates to the shared service;
19. repository-integrity inventory prevents future bypass.

### Revisionary recovery

Prove:

1. the exact legacy `artifactRevision` source-reference shape is recognized only for explicit recovery;
2. recovery preserves substantive content;
3. canonical source metadata is derived from current Revisionary evidence;
4. recovery writes and verifies the same target pair;
5. recovery moves the workspace to `Awaiting Approval`;
6. disposition controls become available;
7. approval advances to Project Planning;
8. no manual JSON or Markdown edit is required;
9. unrelated historical files are unchanged.

### Browser state

Prove:

1. stopped main load at `chatgpt.com` can present ready;
2. stopped main load at `accounts.google.com` cannot present ready;
3. auth-popup activity cannot overwrite main readiness;
4. `ERR_ABORTED` does not produce terminal unavailable state;
5. genuine main-frame failure does produce unavailable state;
6. reload enters loading and returns to correct host-specific presentation;
7. existing session, view identity, partition, and attachment remain unchanged.

### Migration regression

For each migrated creator, prove:

- the same artifact type, paths, content semantics, role, initial disposition, source set, revision behavior, bundle behavior, and downstream invalidation expected by existing tests;
- both siblings pass production parsing;
- no placeholder or hidden authority is introduced.

## Mandatory Validation

Run in ChampCity_AI:

```text
npm run typecheck
npm run build
npm test
```

Use the approved normal Windows lane after a sandbox `spawn EPERM` and report both attempts.

## Required Live Electron Validation

The Implementer must perform and record non-acceptance live evidence before Architect review:

1. authenticated embedded ChatGPT remains visible and usable;
2. Google authentication pages never display `ChatGPT ready`;
3. loaded ChatGPT displays `ChatGPT ready`;
4. right-click Paste works;
5. copy success is not error styled;
6. Reload ChatGPT preserves the signed-in session and embedded view;
7. Revisionary displays `Repair Canonical Envelope` for the known malformed pair;
8. recovery preserves substantive Interview content;
9. recovery changes Revisionary to `Awaiting Approval` without restart;
10. approving the repaired Interview advances to Project Planning;
11. direct application-side content submission creates and verifies a canonical test Interview;
12. stale creation contract submission is rejected;
13. content submissions do not appear as workflow documents;
14. representative system-generated and Operator-authored creators still function after migration;
15. no toolbar scrolling, new control card, or unrelated UI redesign is introduced.

Operator acceptance remains a separate later authority.

## Acceptance Criteria

WC25-REPAIR03 passes only when:

1. the full application-owned canonical document architecture is implemented;
2. all active creators are migrated;
3. no active creator independently assembles both canonical envelopes;
4. creation contracts and application-side content ingestion are operational;
5. caller-controlled workflow metadata cannot become authority;
6. production-parser post-write verification is mandatory;
7. Revisionary is repaired without substantive-content loss and becomes reviewable;
8. approval of the repaired Interview advances to Project Planning;
9. authentication-provider pages cannot be labeled ChatGPT ready;
10. aborted navigation is not treated as terminal failure;
11. genuine load failures remain visible;
12. all deterministic tests pass;
13. typecheck, build, and full tests pass;
14. required live Electron evidence passes;
15. focused REPAIR02 and REPAIR01 behavior remains intact;
16. no ChampCity_GPT change, dependency expansion, API replacement, external mode, DOM inspection, fabricated content, hidden authority, or Git mutation occurs.

## Implementer Report Requirements

Create:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR03_canonical_document_construction_migration_revisionary_recovery_and_browser_readiness_completion.md`

The report must include:

- repository, remote, branch, HEAD, and exact starting dirty-tree inventory;
- binding report path and explicit disposition;
- exact files created, modified, and deleted;
- registry inventory and document-type coverage;
- content schema inventory and versions;
- construction sequence and verification behavior;
- migration table for every active creator;
- repository-integrity bypass-prevention evidence;
- creation-contract format and invalidation rules;
- application-side submission schema and receipt behavior;
- Revisionary before/after metadata and substantive-content preservation evidence;
- browser readiness and cancellation behavior;
- tests added or changed;
- exact validation commands and results;
- every required live Electron observation;
- remaining Operator validation;
- final dirty-tree status;
- confirmation that no Git operation occurred.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Return Target

```text
WC25-REPAIR03 Implementer Report
→ Architect review
→ parent WC25 Work Card Building review
→ Operator validation only after Architect approval
```

## Document Disposition

Document.Status=Approved
