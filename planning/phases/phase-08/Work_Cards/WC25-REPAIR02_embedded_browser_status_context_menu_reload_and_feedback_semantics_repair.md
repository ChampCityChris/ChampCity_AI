<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "repair-work-card",
  "artifactRevision": 5,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR02"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC25-REPAIR02",
    "phaseId": "phase-08",
    "originalParentWorkCardId": "WC25",
    "priorRepairWorkCardId": "WC25-REPAIR01",
    "title": "Embedded Browser Usability, Interview Progression, and Application-Owned Canonical Document Construction Repair",
    "status": "approved",
    "owner": "Implementer",
    "risk": "high",
    "executionAuthorization": {
      "authorized": true,
      "source": "Operator validation and architecture direction messages dated 2026-07-26",
      "implicitBinding": true,
      "separateApprovalRequired": false,
      "authorizedRepository": "ChampCity_AI",
      "crossRepositoryImplementationAuthorized": false
    },
    "amendment": {
      "revision": 5,
      "reason": "Removed ChampCity_GPT adapter implementation and validation from this repair. WC25-REPAIR02 now owns only ChampCity A/I canonical construction, application-side content contracts and ingestion, Revisionary recovery, and browser usability."
    },
    "gitMutationAuthorized": false,
    "controllingDesign": {
      "markdown": "planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md",
      "json": "planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md",
      "principle": "LLMs create content. The application creates canonical documents."
    },
    "evidence": {
      "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR01_embedded_chromium_authentication_attachment_lifecycle_and_control_surface_repair.md",
      "revisionaryInterviewJson": "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_revisionary.json",
      "revisionaryInterviewMarkdown": "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_revisionary.md",
      "authorityRule": "Repository paths, current content, and explicit document dispositions control. Content hashes are non-authoritative diagnostics and cannot gate execution, review, freshness, or workflow progression.",
      "operatorObservations": [
        "Raw attached-visible diagnostic displayed while authenticated ChatGPT is usable",
        "Successful Copy Architect Handoff confirmation is styled as an error",
        "Right-click inside embedded ChatGPT does not provide Paste",
        "Embedded ChatGPT lacks a dedicated reload action",
        "Created Architect Interview documents fail current Project Intake source-revision validation and block progression",
        "The exact Revisionary sourceRevisions use artifactRevision while the parser requires revision",
        "The application should own canonical schema for all document creation rather than relying on LLM syntax fidelity"
      ]
    },
    "confirmedRootCauses": [
      {
        "id": "raw-attachment-state-exposed",
        "summary": "The renderer displays the internal attachment enum directly as user-facing browser status."
      },
      {
        "id": "stale-main-load-state",
        "summary": "Main browser state enters loading on did-start-loading but does not reliably derive a ready presentation from did-stop-loading and main-surface host state."
      },
      {
        "id": "untyped-feedback-presentation",
        "summary": "Copy success and actual failures share one fixed red architect-action-message style."
      },
      {
        "id": "remote-context-menu-unregistered",
        "summary": "The local renderer has a context-menu handler but the embedded browser and authentication webContents do not."
      },
      {
        "id": "browser-reload-operation-missing",
        "summary": "Refresh Output updates repository evidence and no purpose-built embedded-browser reload operation exists."
      },
      {
        "id": "handoff-source-revision-schema-mismatch",
        "summary": "The Revisionary Interview JSON uses artifactRevision inside sourceRevisions, while planningDocumentService accepts only revision; all JSON source entries are discarded. The Markdown uses descriptive artifactRevision lines rather than canonical '- path: ... revision: ...' lines and is likewise unparseable."
      },
      {
        "id": "direct-llm-canonical-artifact-authorship",
        "summary": "Atomic byte writes exist, but canonical identity, metadata, Markdown, and JSON envelopes remain manually assembled by services or directly authored by the LLM. Workflow authority therefore depends on probabilistic syntax reproduction."
      },
      {
        "id": "duplicated-document-serialization",
        "summary": "Active creation services independently render Markdown and construct JSON instead of using one canonical definition registry and model."
      }
    ],
    "applicationOwnership": [
      "artifactType",
      "artifactRevision",
      "participationRole",
      "canonical identity and paths",
      "sourceRevisions",
      "output targets",
      "bundle membership",
      "initial disposition",
      "review metadata",
      "Markdown metadata and section ordering",
      "JSON property names and nesting",
      "serialization",
      "atomic write and rollback",
      "post-write production-parser verification"
    ],
    "contentProducerOwnership": [
      "substantive narrative and structured content fields defined by a runtime-validated document content schema"
    ],
    "requiredSubsystems": [
      "Canonical Document Definition Registry",
      "Canonical Document Construction Service",
      "Runtime-Validated Content Schemas",
      "Application-Generated Creation Contracts",
      "Content Submission Ingestion",
      "Canonical Markdown and JSON Rendering from One Model",
      "Atomic Pair Writing",
      "Production Parser Post-Write Verification",
      "Explicit Legacy Envelope Recovery"
    ],
    "canonicalSourceRevisionContract": {
      "json": {
        "pathField": "path",
        "revisionField": "revision"
      },
      "markdown": "- path: <repository-relative-path> revision: <positive-integer>",
      "rule": "artifactRevision identifies the artifact itself; revision identifies a referenced source and the names are not interchangeable"
    },
    "llmSubmissionBoundary": {
      "directCanonicalFullFileWritesProhibited": true,
      "acceptedInputs": [
        "workspaceId",
        "creationContractId",
        "substantive content"
      ],
      "prohibitedCallerInputs": [
        "canonical target paths",
        "artifact type",
        "artifact revision",
        "participation role",
        "source revisions",
        "document disposition",
        "review metadata",
        "serializer selection",
        "arbitrary schema"
      ],
      "contentSubmissionIsWorkflowArtifact": false
    },
    "documentTypesRequiredInRegistry": [
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
      "project-closeout",
      "all future workflow artifact types"
    ],
    "requiredRepairs": [
      {
        "id": "browser-usability",
        "requirements": [
          "Replace raw attachment state with truthful human-readable browser presentation",
          "Use reliable main-surface load-stop readiness",
          "Add typed success, info, and error feedback",
          "Add constrained remote editing context menu",
          "Add Reload ChatGPT distinct from Refresh Output"
        ]
      },
      {
        "id": "revisionary-progression-recovery",
        "requirements": [
          "Preserve substantive Revisionary Interview content",
          "Resolve current Intake and Prompt revisions from repository evidence",
          "Rewrite the existing pair through the canonical service",
          "Emit canonical path/revision metadata in both siblings",
          "Verify through the production parser",
          "Move the Interview to Awaiting Approval and advance to Project Planning after approval"
        ]
      },
      {
        "id": "canonical-document-registry-and-service",
        "requirements": [
          "Implement one typed runtime-validated definition registry",
          "Implement one shared canonical construction service",
          "Render both siblings from one canonical model",
          "Derive all envelope fields from repository evidence",
          "Write atomically and verify by re-reading through production parsing",
          "Fail on any identity, source, role, synchronization, disposition, or parser mismatch"
        ]
      },
      {
        "id": "all-active-document-creation-migration",
        "requirements": [
          "Migrate every active document creator to the shared service",
          "Remove independent active-service canonical envelope assembly",
          "Preserve artifact-specific content and lifecycle semantics",
          "Preserve revision and downstream invalidation behavior",
          "Add repository-integrity tests that prevent future bypass"
        ]
      },
      {
        "id": "application-content-submission-protocol",
        "requirements": [
          "Generate current application-owned creation contracts",
          "Expose a stable ChampCity A/I submission-ingestion interface",
          "Accept only current creation-contract identity and substantive content",
          "Reject caller-controlled canonical envelope and target fields",
          "Validate schema and current contract",
          "Keep content submissions outside workflow discovery and authority",
          "Construct and verify the canonical pair through the shared service"
        ]
      }
    ],
    "authorizedChampCityAiAreas": [
      "planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.*",
      "src/main/documents canonical registry, construction, schema, creation-contract, submission-ingestion, transaction, parser, and verification modules",
      "all current active document creation services",
      "Architect Interview resolver/service and handoff integration",
      "browser, IPC, preload, contracts, renderer, and styles required for the bounded UI defects and recovery action",
      "stable capability and migrated service tests"
    ],
    "protectedBehavior": [
      "WC25-REPAIR01 authentication navigation and callback behavior",
      "attachment generation and stale-detach protection",
      "bounds sequence handling",
      "strict canonical identity and source-revision validation",
      "lifecycle ordering, workspace ownership, artifact-specific content, review, and disposition semantics",
      "downstream invalidation semantics",
      "workflow rail behavior",
      "session partition and secure Electron preferences",
      "Refresh Output repository semantics"
    ],
    "prohibitedSubstitutes": [
      "a longer prompt as the sole fix",
      "direct LLM writes to canonical workflow targets",
      "permissive aliases for arbitrary field drift as the primary design",
      "regex repair after arbitrary LLM output",
      "duplicated per-service serializers",
      "separately assembled Markdown and JSON metadata",
      "weakening source-revision validation",
      "silent fabrication or replacement of substantive content",
      "generic command execution or arbitrary MCP passthrough"
    ],
    "validation": {
      "champcityAi": [
        "npm run typecheck",
        "npm run build",
        "npm test"
      ],
      "live": [
        "embedded browser status, feedback, context menu, and reload",
        "application-side substantive Interview submission through the stable creation-contract interface",
        "application-owned canonical pair creation and parser verification",
        "Revisionary recovery without substantive-content loss",
        "Interview review and progression to Project Planning",
        "content submissions excluded from lifecycle discovery",
        "stale creation contract rejection",
        "representative migrated system and Operator document creation"
      ]
    },
    "acceptanceCriteria": [
      "No raw attachment enum appears in normal UI",
      "Loaded ChatGPT presents ChatGPT ready rather than stale loading",
      "Copy success is not error styled",
      "Right-click Paste works in embedded ChatGPT",
      "Reload ChatGPT is distinct from Refresh Output and preserves session and attachment",
      "One approved design pair controls application-owned canonical construction",
      "One shared registry and service own every active document type",
      "Content producers cannot control canonical envelope fields",
      "Markdown and JSON are rendered from one canonical model and verified through production parsing",
      "All active document creators are migrated",
      "No active service independently assembles canonical sibling envelopes",
      "Governed artifacts are not created through generic direct LLM file writes",
      "ChampCity A/I content submission accepts only current creation-contract identity and substantive content",
      "Content submissions remain outside workflow authority",
      "Stale creation contracts cannot create current output",
      "Revisionary is recovered without substantive-content loss",
      "Corrected Interview becomes reviewable and approval advances to Project Planning",
      "Strict source-revision and lifecycle semantics remain intact",
      "The ChampCity_AI validation lane and live application checks pass",
      "No prohibited dependency, API replacement, external mode, DOM automation, credential inspection, fabricated content, generic command execution, or Git mutation"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR02_embedded_browser_status_context_menu_reload_and_feedback_semantics_repair.md",
    "returnTarget": "work-card-building-review"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC25-REPAIR02 Embedded Browser Usability, Interview Progression, and Application-Owned Canonical Document Construction Repair

Status: approved by Operator for immediate Implementer execution
Revision: 5 — ChampCity A/I-only canonical construction scope and current binding evidence
Owner: Implementer
Phase: phase-08
Parent Work Card: WC25 — Architect Interview Visible Embedded Surface Attachment Repair
Prior repair: WC25-REPAIR01 — Embedded Chromium Authentication, Attachment Lifecycle, and Control Surface Repair
Repair sequence: 2
Risk: high
Execution authorization: this Operator validation message implicitly and immediately authorizes implementation; no separate approval or activation artifact is required
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR02_embedded_browser_status_context_menu_reload_and_feedback_semantics_repair.md`

## Binding Evidence

This repair is bound to:

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR01_embedded_chromium_authentication_attachment_lifecycle_and_control_surface_repair.md`
- the referenced REPAIR01 Implementer Report and its explicit `RevisionRequested` disposition.

Content hashes are non-authoritative diagnostics only. A hash value or mismatch must never authorize, block, invalidate, supersede, or require reconciliation of this repair.
- Operator screenshots and observations supplied on 2026-07-26 showing an authenticated embedded ChatGPT session and the current Architect Interview toolbar and browser pane

The Operator confirmed that the browser is logged into `chatgpt.com`. The current product display still shows raw attachment state and a stale loading message, styles a successful handoff-copy confirmation as an error, lacks right-click paste inside the embedded ChatGPT surface, and lacks a browser-specific reload action.

A later Operator observation showed that after the Architect Interview siblings were created, the application displayed `Needs Attention — Architect Interview output must reference the current Project Intake JSON source revision` and did not progress. The Interview-progression finding and the Revision 4 application-owned document-construction architecture are part of the same implicit execution authorization.

The Approved repair card itself is the complete Implementer instruction.

## Purpose

Correct the repaired Architect Interview defects and replace direct LLM authorship of canonical workflow files with an application-owned document-construction system. The same system becomes the mandatory default for every active and future document-creation path. Preserve the authentication architecture, attachment-generation design, strict repository evidence authority, Interview review authority, and workflow rail.

Required product result:

```text
Embedded ChatGPT
├── truthful human-readable browser readiness
├── normal right-click editing menu, including Paste
├── dedicated Reload ChatGPT action
├── correctly styled success, informational, and error feedback
└── exact source-revision handoff and deterministic progression after Interview output creation
```

Raw attachment diagnostics remain available for tests and troubleshooting but are not presented as user-facing browser state.

## Confirmed Defect 1 — Internal Attachment Enum Is Exposed as Product Status

Current renderer behavior displays:

```tsx
<strong>{browserStatus?.attachment.state ?? "detached"}</strong>
```

The browser pane header also displays the raw attachment state.

`attached-visible` means only that the native `WebContentsView` is attached to the current Electron window and has positive bounds. It does not mean:

- ChatGPT is loading;
- ChatGPT finished loading;
- the user is signed in;
- the page is usable;
- the current ChatGPT conversation produced output.

The internal enum is technically valid but is misleading product language.

### Required correction

1. Do not display these raw internal values anywhere in normal product UI:
   - `detached`
   - `attaching`
   - `attached-zero-bounds`
   - `attached-visible`
   - `attach-failed`
2. Preserve the internal attachment contract and diagnostic fields for service behavior and tests.
3. Replace the raw display with one concise human-readable browser presentation state derived from attachment and top-level load state.
4. Approved user-facing states are equivalent to:

```text
Starting browser…
Loading ChatGPT…
ChatGPT ready
Browser unavailable
```

5. `ChatGPT ready` means only:
   - the view is attached and visible;
   - the current top-level page has completed or stopped loading;
   - the current top-level host is an allowed ChatGPT/OpenAI application host.
6. Do not claim `Signed in`, account identity, subscription state, or authentication success from browser events.
7. A logged-in ChatGPT page must not continue displaying `Loading ChatGPT…` after its top-level load has stopped.
8. The pane header should show `Embedded ChatGPT` and product actions, not a raw diagnostic enum.
9. Raw attachment state may appear only in explicit diagnostics or debug evidence, not the normal toolbar or pane header.

## Confirmed Defect 2 — Browser Load State Can Remain Stale

The browser service currently sets:

```ts
currentBrowserState = "loading";
```

on `did-start-loading`, while the visible ready transition depends on `did-finish-load` and inferred URL state. ChatGPT is a long-lived single-page application with redirects and continuing navigation activity. The current implementation can therefore leave the product message at `Loading ChatGPT…` while the authenticated page is already rendered and usable.

### Required correction

1. Model top-level browser loading separately from attachment state.
2. Use a reliable top-level completion signal such as `did-stop-loading`, combined with current main-surface URL classification.
3. Do not allow subframe, authentication-popup, service-worker, or unrelated background activity to leave the main embedded ChatGPT presentation in a permanent loading state.
4. Loading-state events from temporary authentication windows must not overwrite the main surface’s ready state after the callback returns.
5. On main-surface top-level navigation start, display `Loading ChatGPT…`.
6. On main-surface load stop at an allowed ChatGPT/OpenAI application host, display `ChatGPT ready`.
7. On a main-surface load failure, display `Browser unavailable` or a concise failure message and retain diagnostic details outside the normal status label.
8. Reattachment of an already loaded persistent surface must return directly to the correct ready state rather than resetting to a false sign-in or loading message.
9. Preserve the prohibition on DOM inspection, account inspection, cookie inspection, and fabricated authentication detection.

## Confirmed Defect 3 — Successful Copy Feedback Is Styled as an Error

The renderer combines:

```text
attachmentError
copyFeedback
pollingError
```

into one `.architect-action-message` region. That CSS is red/error styled regardless of message meaning.

Observed successful text:

```text
Architect handoff copied. Paste and send it manually in the embedded Architect chat.
```

This is a successful action, not an error.

### Required correction

1. Introduce explicit feedback severity or presentation kind:

```ts
"success" | "info" | "error"
```

Equivalent naming is acceptable.
2. Copy Handoff success uses success or neutral informational styling, never red.
3. Attachment and polling failures use error styling.
4. Do not select message color by inspecting message text.
5. The feedback region remains non-scrolling and compact.
6. A successful copy confirmation should clear automatically after a short bounded interval or when superseded by a newer action.
7. Errors must remain visible until corrected, dismissed, or superseded by successful recovery.
8. If no action feedback or actionable error exists, render no banner.
9. Preserve screen-reader status semantics without announcing ordinary success as an alert.

## Confirmed Defect 4 — Embedded ChatGPT Has No Right-Click Editing Menu

`src/main/main.ts` registers a context-menu handler for the local ChampCity renderer. The embedded Architect `WebContentsView` does not register an equivalent handler.

Result:

- `Ctrl+V` works;
- right-click inside the ChatGPT composer does not provide Paste;
- normal browser editing behavior is missing from the application-owned embedded surface.

### Required correction

1. Register a constrained native context menu on the main embedded ChatGPT `webContents`.
2. Register the same editing behavior on application-owned authentication popup `webContents` where applicable.
3. For editable fields, provide standard native roles as applicable:

```text
Undo
Redo
Cut
Copy
Paste
Select All
```

4. For selected non-editable text, provide Copy and Select All where applicable.
5. For an ordinary non-editable location with no selection, no menu is acceptable.
6. Right-click Paste in the ChatGPT composer must work after Copy Architect Handoff.
7. Use Electron-native menu roles and `context-menu` event parameters; do not inspect ChatGPT DOM content.
8. Do not add DevTools, Inspect Element, arbitrary navigation, credential controls, or custom JavaScript execution.
9. Do not log selected text, form values, clipboard contents, credentials, or page content.
10. Reuse the existing safe local-renderer context-menu design where practical, but keep remote-surface behavior appropriately constrained.

## Confirmed Defect 5 — No Embedded Browser Reload Action

`Refresh Output` refreshes repository-backed Architect Interview output. It does not reload `chatgpt.com`.

The Operator reports that ChatGPT can become stuck in a loop or fail to display generated output until the page is refreshed. The embedded product therefore needs a browser-specific recovery action.

### Required correction

1. Add one dedicated browser action labeled:

```text
Reload ChatGPT
```

2. Place it in the embedded browser pane header or the compact Architect toolbar adjacent to browser status. Do not add another card or panel.
3. Keep `Refresh Output` unchanged as a repository-output refresh.
4. Implement one purpose-built main-process service operation and IPC/preload method for the reload.
5. Reload the existing main embedded ChatGPT `webContents`; do not destroy and recreate the persistent browser surface.
6. Preserve the existing `persist:champcity-architect` session, cookies, authenticated state, and secure web preferences.
7. Do not open the workstation browser.
8. Do not detach the native view during reload.
9. Set the human-readable state to `Loading ChatGPT…` while reload is active and restore `ChatGPT ready` when loading stops successfully.
10. If no main embedded view exists, return a clear bounded error rather than silently succeeding.
11. The reload operation must not change repository evidence, document selection, Interview review state, attachment generation, or handoff contents.
12. A standard reload is the default. A cache-bypassing reload may be used only if the existing service design demonstrates it is required and the Implementer explains the choice.

## Confirmed Defect 6 — Created Interview Pair Fails Exact Source-Revision Validation

After the Architect Interview Markdown and JSON files were created, the application displayed:

```text
Needs Attention
Architect Interview output must reference the current Project Intake JSON source revision.
```

The application did not advance to Interview review or the next Project section.

### Confirmed failure chain

`architectInterviewContextResolver.ts` correctly requires the Interview output metadata to contain exact source-revision entries for both:

```text
current Project Intake JSON path + artifact revision
current Architect Interview Prompt JSON path + artifact revision
```

However, `buildArchitectHandoffInstruction()` currently copies only the four source and target paths plus the required participation role and disposition. It does not state the exact source-revision entries that the resolver later requires in the Interview Markdown and JSON.

The current copied instruction therefore omits a mandatory machine contract. The Architect can create substantive synchronized output at the exact paths and still be rejected because it was never explicitly told to include:

```text
## Source Revisions
- path: <current Project Intake JSON> revision: <current revision>
- path: <current Prompt JSON> revision: <current revision>
```

and the equivalent JSON:

```json
"sourceRevisions": [
  { "path": "<current Project Intake JSON>", "revision": 1 },
  { "path": "<current Prompt JSON>", "revision": 1 }
]
```

The exact revision values must be derived from current repository evidence and must not be hard-coded to `1`.

The exact created Interview pair was inspected through the configured `revisionary` MCP workspace. The current source artifacts are:

```text
planning/project/Project_Intake/PROJECT_INTAKE_revisionary.json
artifactRevision: 3

planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_revisionary.json
artifactRevision: 3
```

The created Interview JSON contains four `sourceRevisions` objects, but each uses the field name `artifactRevision` instead of the canonical field name `revision`. For example:

```json
{
  "path": "planning/project/Project_Intake/PROJECT_INTAKE_revisionary.json",
  "artifactRevision": 3
}
```

`planningDocumentService.sourceRevisionsValue()` accepts only `{ path, revision }`. It discards entries that do not contain an integer `revision` field. Consequently, the parsed Interview metadata contains no usable source revisions and the resolver correctly rejects the pair.

The Interview Markdown has the same schema incompatibility. It uses descriptive lines such as:

```text
- Project Intake JSON: planning/project/Project_Intake/PROJECT_INTAKE_revisionary.json, artifactRevision=3
```

The Markdown parser accepts only canonical lines matching:

```text
- path: planning/project/Project_Intake/PROJECT_INTAKE_revisionary.json revision: 3
```

This is therefore not an unknown missing/wrong-path/wrong-revision condition. It is a confirmed producer/consumer schema mismatch: the Architect output wrote `artifactRevision`, while the application contract and parser require `revision`.

### Required correction

1. Extend the generated Architect handoff instruction with the exact current Project Intake JSON path and artifact revision.
2. Include the exact current Architect Interview Prompt JSON path and artifact revision.
3. State the required Markdown `## Source Revisions` lines verbatim with the current values.
4. State the required JSON `sourceRevisions` array entries verbatim with the current values.
5. Require both siblings to carry equivalent source-revision metadata.
6. Do not rely on the Architect to infer revisions by reading the source documents.
7. When an exact target pair exists but fails source-revision validation, keep Copy Architect Handoff enabled and generate a correction handoff that:
   - names the current validation failure;
   - names both exact target files;
   - instructs the Architect to read the existing output;
   - preserves its substantive content;
   - rewrites both synchronized siblings with the exact current source-revision metadata;
   - keeps `participationRole=gatingReview` and `Document.Status=Pending`.
8. Present a concise actionable message equivalent to:

```text
Interview files were created but cannot be reviewed because their source-revision metadata is missing or stale. Copy the correction handoff and resend it in the embedded Architect chat.
```

9. Do not require the Operator to manually edit JSON or Markdown source-revision metadata.
10. After corrected siblings are detected, polling must move the workspace automatically from `Needs Attention` to `Awaiting Approval` and enable Interview review.
11. After the corrected Interview is Approved, Project Intake must become complete and the lifecycle resolver must advance to Project Planning rather than remain trapped in Architect Interview.
12. Preserve strict source-revision validation. Do not weaken the resolver to accept absent, approximate, Markdown-only, or stale references.
13. Do not automatically fabricate or replace substantive Architect Interview content.

## Architecture Decision 7 — Application-Owned Canonical Document Construction

The Operator has approved this as the default architecture for all document creation.

Controlling design pair:

- `planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md`
- `planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.json`

The governing rule is:

> LLMs create content. The application creates canonical documents.

A more explicit prompt is required as short-term recovery guidance, but prompt wording alone does not satisfy this repair.

### Confirmed architectural defect

`writeArtifactTransaction()` currently makes file replacement atomic, but each service still manually constructs Markdown and JSON envelopes. LLM-authored outputs are instructed to write complete canonical files through generic MCP file writers. This leaves identity, field names, source-revision syntax, role, disposition, and sibling equivalence exposed to language-model drift.

The Revisionary failure is the direct result: the LLM created substantive content correctly but wrote `artifactRevision` where the application parser requires `revision`.

### Required ownership boundary

The content producer—LLM, Operator, Implementer, or application form—may supply only substantive document content defined by a runtime-validated content schema.

The application must exclusively derive and write:

- artifact type and revision;
- participation role;
- project, phase, Work Card, repair, attempt, and candidate identity;
- canonical target paths and sibling stem;
- exact source paths and `revision` values;
- output-target relationships;
- initial disposition and review metadata;
- Markdown metadata headers and section ordering;
- canonical Markdown `## Source Revisions` lines;
- canonical JSON property names and nesting;
- bundle membership;
- serialization and line endings;
- atomic writes and rollback;
- post-write production-parser verification.

Callers must not provide these values when the application can derive them from current repository evidence.

### Required shared subsystem

Implement one typed, runtime-validated Canonical Document Definition Registry and one Canonical Document Construction Service.

Each document definition must own:

```text
artifact type
content schema and schema version
identity resolver
canonical target resolver
source-revision resolver
participation role
initial disposition
content normalization
canonical model composition
Markdown renderer
JSON renderer
post-write verifier
```

The shared construction sequence is mandatory:

```text
resolve current repository authority
→ reject stale or ambiguous context
→ validate substantive content
→ derive canonical envelope
→ compose one in-memory canonical model
→ render both siblings from that model
→ write atomically
→ re-read through planningDocumentService
→ verify exact identity, revisions, role, sources, synchronization, and disposition
→ report success
```

The service must not report success after writing bytes without verifying the pair through the same production parser used by the resolver.

### Required content-only LLM submission boundary

The LLM must no longer write complete workflow Markdown or JSON files at canonical target paths.

The application must generate a current creation contract containing:

- stable creation-contract ID;
- document type;
- current evidence/context key;
- content schema identifier and version;
- permitted substantive fields;
- application-controlled content-submission destination or channel;
- invalidation rule when source evidence changes.

The LLM submits only substantive content against that contract. It must not submit canonical paths as authority, envelope metadata, source revisions, role, disposition, review metadata, a Markdown envelope, or serialized canonical JSON.

The content submission is not a workflow artifact and must be excluded from planning-document discovery, disposition resolution, and lifecycle ordering.

### External MCP transport boundary — out of scope for this card

WC25-REPAIR02 must implement only the ChampCity A/I side of the content-only protocol: application-generated creation contracts, runtime-validated substantive content schemas, application-owned submission ingestion, canonical construction, and post-write verification.

Do not implement, register, or validate a ChampCity MCP action under this card.

The application-side protocol must define the fields an external adapter is permitted to submit and must reject caller-controlled envelope metadata. The external adapter implementation is assigned to `planning/phases/phase-v1.0/Work_Cards/WC-V1-0202B_content_only_canonical_document_submission_protocol.md` in the ChampCity_GPT repository.

WC25-REPAIR02 does not authorize changes to `ChampCity_GPT`, does not require a ChampCity_GPT validation lane, and does not depend on completion of that adapter for its own acceptance.

### Mandatory migration of all active document creation

This repair must migrate every active creation path to the shared service. It is not acceptable to implement the service for Architect Interview and leave every other service manually serializing canonical envelopes.

The default applies to:

- Project Intake;
- generated Architect prompts and handoffs;
- Project Architect Interview;
- Project Profile and Project Roadmap;
- Phase Map;
- Phase Interview;
- Phase Planning and Work Card Plan;
- Work Card Intake output;
- Formal Work Card;
- repair Work Card;
- Implementer Report;
- Validation Record;
- Phase Closeout;
- Project Closeout;
- all future workflow artifact types.

Human-authored, system-generated, and LLM-authored documents use the same construction service. Only the substantive content producer differs.

After migration, active services must not manually concatenate canonical Markdown envelopes and separately assemble canonical JSON envelopes.

### Immediate Revisionary recovery

The existing Revisionary Interview pair is substantive and must not be discarded or regenerated from scratch.

Provide an explicit Operator-visible recovery action that:

1. reads the existing Markdown and JSON content;
2. extracts and validates the substantive content without treating its malformed envelope as authority;
3. resolves the current Revisionary Intake and Prompt revisions from repository evidence;
4. constructs the canonical envelope through the new service;
5. rewrites the same target siblings atomically;
6. uses canonical `{ path, revision }` JSON entries;
7. uses canonical `- path: ... revision: ...` Markdown lines;
8. preserves `artifactRevision=1` for the Interview itself unless substantive content changes;
9. preserves `Document.Status=Pending`;
10. re-reads and verifies the corrected pair;
11. advances the UI to `Awaiting Approval` after successful verification.

Do not require manual editing of Revisionary files. Do not silently bulk-migrate unrelated historical artifacts.

### Revision and review behavior

Substantive document revisions must use the same construction service, increment artifact revision, and trigger approved downstream invalidation.

Disposition-only and review-note updates may continue through a bounded canonical review writer without incrementing substantive artifact revision.

### Prohibited substitute solutions

Do not claim this architecture complete through:

- a longer prompt alone;
- parser aliases that accept arbitrary field drift as the primary solution;
- regex repair after arbitrary LLM output;
- duplicated per-service serializers;
- separately assembled Markdown and JSON metadata;
- direct LLM writes to canonical workflow targets;
- weakening source-revision validation;
- silent fabrication or replacement of substantive content.

## Strict Scope

Authorized ChampCity A/I production and architecture files:

```text
src/main/browser/architectBrowserService.ts
src/main/architectInterview/architectInterviewService.ts
src/main/main.ts
src/main/contextMenu/localRendererContextMenu.ts only if a safe shared helper extraction is necessary
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/styles.css
planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md
planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.json
src/main/documents/artifactTransaction.ts
src/main/documents/planningDocumentService.ts
new canonical document registry, construction, content-schema, creation-contract, submission-ingestion, and verification modules under src/main/documents/ or src/shared/documents/
src/main/architectInterview/architectInterviewContextResolver.ts only if required for explicit recovery presentation without weakening validation
src/main/projectIntake/projectIntakeService.ts
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
src/main/integrations/architectMcpHandoffService.ts
```

Small focused helpers are authorized where needed, but no duplicate serializer, schema, or renderer may be created outside the shared canonical subsystem.

Authorized tests:

```text
test/browser/architect-browser-handoff.test.cjs
test/architect-interview/architect-interview-workspace.test.cjs
test/context-menu/local-renderer-context-menu.test.cjs only if the shared helper changes
test/renderer/architect-browser-attachment-coordinator.test.cjs only for bounded source/presentation assertions
new stable capability tests under test/documents/ for the canonical registry, construction service, content schemas, creation contracts, submission ingestion, post-write verification, revision, recovery, and migration invariants
existing stable service tests for every migrated document creator
```

Authorized report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR02_embedded_browser_status_context_menu_reload_and_feedback_semantics_repair.md
```

## Protected Behavior

Do not alter:

- the authentication-host classification repaired by WC25-REPAIR01;
- internal authentication callback and popup partition behavior except to register the constrained editing context menu;
- attachment generation or stale-detach protection;
- bounds sequence handling;
- repository clear/switch behavior;
- strict canonical Interview identity and exact source-revision validation; the handoff and recovery instructions may be corrected but the resolver must not be weakened;
- polling and evidence fingerprints;
- review source tokens or disposition writes;
- Prompt versus Interview authority;
- workflow rail behavior;
- existing lifecycle ordering, workspace ownership, content requirements, and approval semantics for Project Intake and later workspaces; their creation implementation must migrate to the shared canonical subsystem;
- the substantive purpose and output intent of existing MCP handoffs; their transport must change from direct canonical file authorship to the approved content-only creation-contract protocol;
- session partition name;
- secure Electron preferences.

If a protected behavior must change to compile, stop and report the exact conflict instead of broadening scope.

## Explicit Non-Goals

Do not:

- redesign the Architect Interview workspace again;
- change authentication architecture;
- infer or inspect whether the Operator is signed in;
- inspect ChatGPT DOM, cookies, account identity, subscription, prompts, or generated content;
- automate pasting or submission;
- add keyboard simulation;
- add an API/provider replacement;
- add external-browser mode;
- add dependencies;
- add general browser controls such as Back, Forward, Home, address bar, downloads UI, or DevTools;
- change repository-output refresh semantics;
- perform Git operations.

## Required Tests

### Browser presentation state

Prove:

1. raw attachment enum remains in internal status contracts but is not rendered as normal product text;
2. detached or failed attachment presents browser unavailable;
3. visible attachment plus active main load presents Loading ChatGPT;
4. `did-stop-loading` at an allowed ChatGPT/OpenAI host presents ChatGPT ready;
5. auth-popup loading events cannot overwrite main-surface ready state;
6. reattaching an already loaded surface presents ready without fabricated sign-in state;
7. main load failure presents a bounded unavailable/error state.

### Feedback semantics

Prove:

1. copy success uses success/info presentation;
2. copy success does not use the error class;
3. attachment or polling errors use error presentation;
4. no message renders when no feedback exists;
5. success feedback clears through the bounded lifecycle.

### Remote context menu

Prove:

1. editable context includes Paste;
2. editable context includes standard safe editing roles;
3. selected non-editable content includes Copy;
4. no DevTools/Inspect item exists;
5. no selected text or form content is logged;
6. the handler is registered on the main embedded browser;
7. auth popup uses the constrained handler when present.

### Reload ChatGPT

Prove:

1. IPC/preload/service contract exists and is purpose-built;
2. reload acts on the existing main embedded `webContents`;
3. reload does not recreate the view;
4. session partition remains `persist:champcity-architect`;
5. reload does not detach the view;
6. reload enters loading state and returns to ready after load stop;
7. missing view returns a bounded failure;
8. Refresh Output remains a separate repository action.

### Interview source-revision and progression recovery

Prove:

1. the copied initial Architect handoff contains the exact current Project Intake JSON path and revision;
2. the copied initial handoff contains the exact current Prompt JSON path and revision;
3. the handoff includes exact Markdown `## Source Revisions` lines and exact JSON `sourceRevisions` entries;
4. revision values are derived from repository evidence rather than hard-coded;
5. an Interview pair with no Intake source entry is inspectable, `Needs Attention`, and not reviewable;
6. an Interview pair with the correct Intake path but wrong revision is classified stale and not reviewable;
7. an invalid existing pair keeps the handoff action available;
8. the correction handoff includes the exact validation reason, current revisions, existing target paths, preserve-content instruction, and synchronized rewrite instruction;
9. correcting only the exact source-revision metadata while preserving substantive content moves the workspace to `ready-for-review` / `Awaiting Approval`;
10. polling recognizes the corrected same-target pair without repository restart or manual route change;
11. approving the corrected Interview marks Architect Interview `Completed`;
12. the lifecycle resolver advances to Project Planning after approval;
13. strict validation still rejects missing, stale, approximate, Markdown-only, or wrong-path source references;
14. the application does not silently mutate or fabricate the Architect-authored substantive output.

### Canonical document construction and migration

Prove through compiled production behavior:

1. the registry contains one explicit definition for every active document type listed in Architecture Decision 7;
2. unknown document types are rejected;
3. content schemas reject malformed substantive payloads before any write;
4. callers cannot control canonical paths, artifact type, artifact revision, participation role, source revisions, or initial disposition;
5. exact source revisions are resolved from current repository evidence;
6. Markdown and JSON are rendered from one canonical model and one normalized `SourceRevision[]`;
7. JSON always emits `{ path, revision }` and never emits `artifactRevision` inside `sourceRevisions`;
8. Markdown always emits canonical `- path: <path> revision: <number>` lines;
9. both siblings are written through the canonical transaction;
10. the service re-reads the result through `planningDocumentService` and fails if exact post-write verification does not pass;
11. partial writes, parser failures, identity mismatches, source mismatches, role mismatches, or disposition mismatches do not report success;
12. disposition-only review writes do not increment substantive artifact revision;
13. substantive revision uses the canonical service and preserves downstream invalidation behavior;
14. stale or superseded creation contracts cannot submit current content;
15. content submissions are excluded from planning discovery and lifecycle resolution;
16. every active creation service delegates canonical envelope creation to the shared subsystem;
17. no active service independently assembles canonical Markdown and JSON envelopes after migration;
18. Project Intake, handoffs, Project Planning, Phase, Work Card, report, validation, and closeout behavior remain semantically equivalent after migration;
19. the Revisionary malformed pair is recoverable without changing its substantive content;
20. recovery produces canonical source metadata and makes the Interview reviewable;
21. future document definitions cannot bypass the registry without a failing repository-integrity test.

## Mandatory Validation

Run:

```text
npm run typecheck
npm run build
npm test
```

Run these commands only in `ChampCity_AI`. Use the documented normal Windows lane after a sandbox `spawn EPERM` and report both results when applicable.

No ChampCity_GPT command, test, build, self-test, public scan, package, promotion, restart, or connector action is authorized by this card.

## Required Live Electron Validation

In the normal Windows application, with the Operator-authenticated persistent ChatGPT session where available, verify:

1. the normal toolbar and pane header do not display `attached-visible` or any other raw attachment enum;
2. the loaded ChatGPT page displays `ChatGPT ready`, not `Loading ChatGPT…`;
3. Copy Architect Handoff displays a success or neutral confirmation, not a red error banner;
4. right-click in the ChatGPT composer displays Paste;
5. Paste inserts clipboard content through the normal native menu;
6. `Ctrl+V` still works;
7. Reload ChatGPT reloads the embedded page inside ChampCity;
8. Reload does not open the workstation browser;
9. Reload preserves the signed-in session;
10. Reload does not detach, resize, or replace the browser pane;
11. Refresh Output still performs repository-output refresh only;
12. document preview and embedded ChatGPT remain visible together;
13. no new toolbar scroll or control clutter is introduced.
14. create or retain an Interview pair missing the exact current Intake source-revision entry and confirm the application shows an actionable correction state;
15. Copy Architect Handoff in that state produces the exact current Intake and Prompt JSON path/revision entries and identifies the existing invalid target pair;
16. after the Architect rewrites the same target siblings with corrected metadata, Refresh Output or polling moves the workspace to `Awaiting Approval` without restart;
17. Interview review controls become available for the corrected output;
18. after approving the corrected Interview, the lifecycle advances to Project Planning and no longer displays the source-revision error.
19. the ChampCity A/I creation-contract and submission-ingestion interfaces are inspectable and stable for the separately authorized external adapter;
20. direct application-side submission of valid substantive Interview content creates canonical siblings with application-derived metadata;
21. the resulting pair contains exact current source revisions in both canonical formats and passes production-parser verification;
22. no content-submission record appears in document lists, lifecycle resolution, or disposition controls;
23. a stale creation contract is rejected and does not create or modify canonical output;
24. representative migrated system-generated and Operator-authored document creation still succeeds through the shared canonical service;
25. no active ChampCity A/I creator independently assembles both canonical sibling envelopes.

Do not claim completion without these observations. Credential or account contents must not be recorded.

## Acceptance Criteria

WC25-REPAIR02 passes only when:

1. no raw attachment enum is visible in normal product UI;
2. user-facing browser state is concise and truthful;
3. an already loaded authenticated ChatGPT surface does not remain labeled Loading ChatGPT;
4. no sign-in or account state is fabricated;
5. successful handoff copy is not styled as an error;
6. feedback severity is explicit and testable;
7. right-click Paste works in the embedded ChatGPT composer;
8. remote context menus remain constrained and contain no DevTools or content logging;
9. Reload ChatGPT is visible and distinct from Refresh Output;
10. reload operates on the existing persistent embedded webContents;
11. reload preserves the persistent session and in-application surface;
12. Refresh Output semantics remain unchanged;
13. authentication navigation and attachment lifecycle repairs from REPAIR01 remain intact;
14. typecheck, build, and all tests pass;
15. live Electron validation proves the browser usability and feedback defects corrected;
16. the copied handoff explicitly provides both exact current JSON source-revision entries;
17. existing invalid Interview output produces an actionable correction handoff rather than a dead end;
18. corrected same-target Interview siblings automatically become reviewable;
19. approving the corrected Interview completes Architect Interview and advances to Project Planning;
20. strict source-revision validation is preserved;
21. substantive Architect-authored content is not silently fabricated or replaced;
22. the approved application-owned canonical document construction design pair exists and controls implementation;
23. one shared registry and construction service own every active document type;
24. LLMs and callers provide substantive content only and cannot control canonical envelope fields;
25. Markdown and JSON are rendered from one canonical model and verified through the production parser;
26. all active document creation services are migrated and no active service independently assembles canonical sibling envelopes;
27. governed workflow artifacts are no longer created by direct generic MCP Markdown/JSON writes;
28. the ChampCity A/I content-submission interface accepts only current creation-contract identity and substantive content;
29. content submissions remain outside lifecycle discovery and cannot become approval or routing authority;
30. stale creation contracts cannot create current output;
31. the Revisionary pair is recoverable without substantive-content loss and becomes reviewable through the canonical service;
32. future document types cannot bypass the registry without failing tests;
33. the ChampCity_AI validation lane passes;
34. no dependency, API replacement, external mode, DOM automation, credential inspection, fabricated content, or Git mutation is introduced.

## Implementer Report Requirements

Create:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR02_embedded_browser_status_context_menu_reload_and_feedback_semantics_repair.md`

The report must include:

- repository, remote, branch, HEAD, and exact starting dirty-tree inventory;
- binding report path and explicit disposition;
- exact files created, modified, and deleted in ChampCity_AI;
- final Canonical Document Definition Registry inventory and document-type coverage;
- final content-schema inventory and versioning rule;
- canonical construction sequence and post-write verification behavior;
- migration table mapping every prior creation service to the shared construction service;
- proof that active services no longer independently assemble canonical Markdown and JSON envelopes;
- application-generated creation-contract format and invalidation behavior;
- ChampCity A/I content-submission schema, ingestion route, validation boundary, and receipt behavior;
- proof that content submissions remain outside planning discovery and workflow authority;
- proof that caller-supplied envelope fields and canonical target paths are rejected;
- Revisionary recovery result with before/after source metadata and substantive-content preservation;
- exact validation commands and results for ChampCity_AI;
- final internal versus product-facing status model;
- exact load events used and why stale loading cannot persist;
- feedback severity model and success-clear behavior;
- remote context-menu roles and registration points;
- Reload ChatGPT service, IPC, preload, and renderer path;
- final Architect handoff contract with the exact Intake and Prompt JSON source revisions;
- invalid-output correction handoff behavior and actionable UI message;
- proof that corrected same-target output becomes reviewable through polling;
- proof that approval advances the lifecycle to Project Planning;
- confirmation that strict source-revision validation remains unchanged;
- confirmation that the same persistent webContents and partition are retained;
- tests added or changed and exact results;
- live Electron results for each required check;
- remaining Operator validation, if any;
- final repository status;
- confirmation that no Git operation occurred in ChampCity_AI.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Return Target

After implementation and Architect review:

```text
WC25-REPAIR02 Implementer Report
→ parent WC25 Work Card Building review
→ Operator validation resumes only after Architect approval
```

## Document Disposition

Document.Status=Approved
