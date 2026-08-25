# ISSUE_003 — Architect Investigation

## Purpose

Evaluate the reported absence of screenshot capture in Issue Intake against the current Issue Resolution architecture, determine whether the problem is supported by repository/runtime evidence, and define the bounded correction direction without prematurely decomposing implementation Fix Cards.

The investigation specifically evaluates the required end-to-end behavior implied by the Issue Record: an Operator can paste one or more screenshots from the clipboard while recording an Issue, the screenshots become durable Issue-owned evidence, the application can present that evidence with the Issue Record, and the downstream Issue Architect can actually consume the image evidence during diagnosis.

## Issue Assessment

The reported problem is supported.

Verified current behavior is text-only. `IssueResolutionWorkspace.tsx` provides Title, Issue, Current Consequence, Needed Capability / Expected Outcome, and Discovery Context fields. It has no screenshot evidence surface, file input, image-preview state, clipboard-image paste handler, or removal/reordering behavior. `NewIssueInput` likewise contains only string fields, so there is no typed screenshot representation crossing the renderer/application boundary.

This is not evidence that the existing text intake is malfunctioning. The FC02 implementation was deliberately bounded to a lightweight text Issue Record and its focused tests prove that behavior. The deficiency is that the bounded FC02 implementation stopped short of the broader Issue Intake responsibility already established by `ISSUE_001/ISSUE_RESOLUTION_PLAN.md`: Issue Intake is expected to capture available runtime/repository evidence.

The requested correction is therefore a bounded missing capability and UX deficiency inside an existing Issue Resolution stage. It does not introduce a new product workflow, require a new multi-phase product area, or justify moving the work into Development/Feature merely because no pre-existing screenshot code path exists.

## Repository Evidence Inspected

The following current repository evidence was inspected through the bound `champcity_ai` workspace:

- `issues/ISSUE_003/ISSUE_RECORD.md` — reports the missing clipboard-paste screenshot path and the intended use of screenshots as diagnostic evidence.
- `issues/ISSUE_001/ISSUE_RESOLUTION_PLAN.md` — establishes Issue Intake as the project-owned stage responsible for recording the problem, discovery context, and available runtime/repository evidence; it also requires reuse of shared repository/evidence infrastructure rather than a duplicate Issue-specific execution or repository subsystem.
- `issues/ISSUE_001/Fix_Cards/ISSUE_001-FC02_issue_resolution_shell_issue_discovery_and_intake.md` — defines the implemented New Issue contract as five bounded text fields and requires application-owned Issue creation with renderer filesystem authority withheld.
- `issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC02_issue_resolution_shell_issue_discovery_and_intake.md` — confirms FC02 created the Issue service, typed IPC/preload path, renderer Intake surface, and only `ISSUE_RECORD.md` for a new Issue; focused build/typecheck/service/renderer tests passed in the approved Windows lane.
- `src/renderer/app/IssueResolutionWorkspace.tsx` — current Intake implementation is a React form backed only by `NewIssueInput`; submit forwards that object unchanged to `onCreateIssue`.
- `src/shared/issueResolutionContracts.ts` — `NewIssueInput` has only `title`, `issue`, `currentConsequence`, `neededCapability`, and `discoveryContext`; `IssueRecordProjection` exposes Markdown/read state but no evidence-asset collection.
- `src/renderer/app/App.tsx` current Issue Resolution wiring — `createIssue` forwards `NewIssueInput` through `window.champcity.createLightweightIssueRecord(...)` and stores only the returned Issue inventory/selection state.
- `src/preload/index.ts` — exposes the narrow `createLightweightIssueRecord(input)` bridge and no Issue evidence/binary attachment API or generic renderer filesystem API.
- `src/main/main.ts` current Issue Resolution IPC wiring — `issueResolution:createIssue` passes the typed New Issue input to `createLightweightIssueRecord(...)`; current Issue IPC has no screenshot-evidence parameter or evidence retrieval channel.
- `src/main/issueResolution/issueResolutionService.ts` together with its focused service tests and FC02 implementation report — current Issue creation/discovery authority is Issue-specific, filesystem work remains in the main/service layer, and the accepted creation contract creates only the Issue Record for a new Issue.
- `test/issue-resolution/issue-resolution-service.test.cjs` — explicitly verifies that new Issue creation writes only `ISSUE_RECORD.md`, validates required text fields, omits empty optional text sections, allocates the next Issue ID, and uses overwrite-disabled creation.
- `test/renderer/issue-resolution-shell.test.cjs` — verifies the bounded text Intake fields and current Issue Record presentation; there is no screenshot-paste or evidence-preview coverage.
- `src/renderer/app/FigmaDocumentCard.tsx` — `FigmaMarkdownBody` renders headings, simple list lines, and paragraphs only. Markdown image syntax is not interpreted as an image, so adding a Markdown image reference alone would not make screenshots visible in the current Issue document presentation.
- `src/renderer/app/IssueArchitectPlanningWorkspace.tsx` and `test/renderer/issue-architect-planning-workspace.test.cjs` — Architect Planning currently presents the Issue Record as Markdown text and its projection has no screenshot/evidence collection. The embedded ChatGPT handoff is therefore currently grounded in textual Issue evidence plus repository inspection, not an explicit image-evidence contract.
- `src/main/integrations/mcpWorkspacePromptContract.ts` and the current Issue Architect handoff contract — preserve strict bound-workspace authority and a constrained artifact-writing interface; there is no evidence in the inspected contract that merely writing a repository-local PNG and mentioning its path automatically guarantees image consumption by Browser GPT.

The current working tree also shows the Issue Resolution implementation as active work on the existing peer workflow surfaces rather than a separate Feature subsystem. No repository evidence inspected contradicted the Issue claim.

## Confirmed Current Architecture

Issue Intake is owned directly by the selected project under the peer `issue-resolution` workflow. It is intentionally separate from Development Phase/Work Card lifecycle authority.

The current creation path is:

`IssueResolutionWorkspace.tsx` → `App.tsx` → typed `window.champcity.createLightweightIssueRecord(...)` preload bridge → `issueResolution:createIssue` main IPC → `createLightweightIssueRecord(...)` in the Issue Resolution service → `issues/ISSUE_NNN/ISSUE_RECORD.md`.

The renderer does not receive arbitrary filesystem write access. Repository mutation is intentionally concentrated in application-owned main/service authority. That boundary is accepted architecture and must remain intact.

Issue discovery returns an `IssueRecordProjection` containing Issue identity, record path/state, and Markdown content. Both Intake and Architect Planning consume the textual record through the current Markdown presentation path. There is no first-class Issue evidence-asset model at the shared contract, IPC, repository-service, projection, presentation, or Architect-handoff boundary.

Existing Issue artifacts are lightweight Markdown rather than canonical planning-document pairs. Existing records are discovered/read without incidental rewrites, and new records are created with overwrite disabled. Screenshot evidence must fit this Issue-owned model rather than forcing Issue records into Development planning authority or introducing a second generic repository subsystem.

## Root Cause

The root cause is an incomplete Issue Intake evidence contract introduced by the deliberately narrow FC02 implementation.

The governing Issue Resolution architecture assigned Intake responsibility for available runtime/repository evidence, but FC02 implemented only scalar text capture and explicitly constrained new Issue creation to a single `ISSUE_RECORD.md`. That text-only assumption now exists consistently across all current layers:

- the renderer form has no image evidence state or paste target;
- `NewIssueInput` cannot represent screenshots;
- preload/main IPC cannot transport screenshot evidence;
- Issue service creation has no bounded binary-evidence write contract;
- `IssueRecordProjection` cannot enumerate associated evidence assets;
- current Markdown presentation does not render image references;
- Architect Planning has no explicit image-evidence projection or handoff consumption contract.

Because the omission is systemic across the existing bounded intake path, adding only an `onPaste` handler to a textarea would not resolve the Issue. That would capture clipboard bytes in the renderer without establishing durable artifact ownership, safe main-process persistence, later presentation, or actual Architect access.

## Required Architecture

Issue Intake should be extended with a first-class, bounded screenshot-evidence seam while retaining the existing Issue service as filesystem authority.

The Intake UI should provide an explicit Screenshot Evidence area associated with the New Issue form. Pasting clipboard content containing supported `image/*` data into that surface must capture the image without requiring the Operator to save it to disk first. The primary required interaction is direct clipboard paste comparable to a modern chat composer. A conventional file chooser may be provided only as a secondary convenience if later planning determines it is useful; it must not substitute for clipboard paste.

The renderer should hold pending screenshots only as bounded UI state until submission and should show visible thumbnails with a way to remove an unintended screenshot before creating the Issue. Multiple screenshots should be supported because the Issue requirement and ordinary defect evidence can involve more than one view. Ordinary text paste into the existing text fields must continue to behave normally.

The shared Issue contract must gain a typed evidence representation rather than passing arbitrary local paths or granting generic filesystem capability. The transport should carry only the data and metadata required for accepted screenshot formats, with explicit validation for MIME/type, count, and size. Binary IPC representation may be chosen at implementation time, but avoid using unrestricted path strings as renderer authority.

The main/Issue Resolution service must validate the evidence again and persist it under the owning `issues/ISSUE_NNN/` boundary using safe, deterministic repository-relative names and overwrite-disabled semantics. A dedicated Issue-owned evidence/attachment location is warranted because binary screenshots should not be embedded as base64 blobs inside `ISSUE_RECORD.md`. The Issue Record should include a clear Evidence section that references the durable repository-local assets in capture order.

Creation should behave transactionally at the Issue boundary. Validation should occur before durable writes where practical, and a failure while persisting screenshots must not leave an apparently successful Issue Record that silently lost its evidence. Any cleanup must be confined to files/directories created by that failed new-Issue operation and must never remove pre-existing Issue content.

Issue discovery/read projection must expose the associated screenshot evidence through a constrained metadata/read path so the application can show the images on both the Intake selected-Issue surface and the Architect Planning Issue Record surface. Do not rely on the existing `FigmaMarkdownBody` to make Markdown image syntax visible; it currently has no image renderer. Either a bounded Issue evidence viewer or a safely constrained image rendering extension is required. Repository-local image resolution must prevent traversal, symlink escape, and arbitrary external URL/file access.

The downstream Architect contract is part of this correction, not an optional follow-up. The prepared Issue Architect handoff must identify the Issue's screenshot evidence and the supported mechanism by which Browser GPT can consume it. The implementation must prove that the Architect can actually inspect the image bytes. A Markdown link or repository path is insufficient acceptance evidence unless the bound ChampCity MCP path is verified to expose that image content to the Architect. If the existing MCP repository surface cannot supply image content, the bounded correction must use an application-controlled attachment path into the existing embedded ChatGPT workflow or a narrowly scoped MCP evidence-read capability. It must not create a second browser/provider/session subsystem.

No canonical Issue sidecar, database, Development planning-document migration, generic attachment platform, or general-purpose renderer filesystem API is required to resolve this Issue.

## Preservation Rules

- Preserve the current peer-workflow ownership: screenshots belong to the selected project Issue, not to a Development Phase, Work Card, or Repair genealogy.
- Preserve the existing text-only New Issue path when zero screenshots are supplied. Existing required/optional text-field semantics and generated Status language should remain valid unless a narrowly necessary Evidence section is added.
- Preserve existing Issues that have no screenshot evidence. Discovery/open must not migrate or rewrite them merely because screenshot support now exists.
- Preserve application-owned main/service filesystem authority. The renderer must not receive generic read/write access or arbitrary repository path selection.
- Preserve overwrite-disabled Issue/artifact creation and current safe path/symlink boundaries.
- Preserve the current Issue selection, Hub/Settings round trips, Issue rail, Development isolation, and later Architect Planning behavior unrelated to evidence presentation.
- Preserve ordinary clipboard text behavior in Title/textareas; image handling must be scoped so it does not consume or corrupt normal text paste.
- Preserve the existing embedded ChatGPT/browser foundation. Screenshot support must not introduce a second BrowserView, provider session, or parallel Architect workflow.
- Do not automatically transmit screenshots to an external service merely when an Issue is recorded. External/model consumption should occur only through the existing Architect workflow when the Operator invokes that workflow.
- Do not introduce broad image editing, annotation, OCR, ticketing, media-library, or generic project-attachment functionality as part of this correction.

## Risks and Constraints

Clipboard image payloads can be large. The implementation needs explicit per-image/count/aggregate limits so renderer state and Electron IPC cannot consume unbounded memory. Limits should fail visibly before Issue creation rather than silently dropping images.

Images are untrusted binary input. Accepted MIME/type must be validated in the application-owned service rather than trusting renderer metadata or a filename extension. Repository-relative filenames must be generated by the application, not supplied as writable paths by the renderer.

Multi-file persistence introduces partial-write risk. The current overwrite-disabled single-Markdown creation model is simple; screenshot support must preserve conservative failure behavior so an Issue is not reported as successfully created while evidence persistence failed.

Current Issue document rendering is text-oriented. A raw Markdown image link would currently appear as text, so end-to-end UI validation must include actual thumbnail/full-image presentation rather than merely asserting that a path was written into Markdown.

The most important integration risk is Architect consumption. The inspected handoff/MCP contract proves text artifact access but does not prove that Browser GPT can inspect repository binary images merely from a path. Planning and validation must therefore treat successful AI image consumption as an explicit acceptance requirement, not an assumption.

Screenshots can contain secrets, credentials, local paths, customer/member information, or other sensitive material. The application should not infer that pasted screenshots are safe to transmit externally. The existing Operator-driven Architect handoff boundary should remain the point at which model use occurs.

Focused validation should cover at minimum clipboard-image capture behavior, multiple-image preview/removal, zero-image backward compatibility, service-side type/size/path validation, deterministic safe evidence persistence, overwrite/escape protection, partial-write failure handling, discovery/read presentation, Architect handoff evidence enumeration, and one end-to-end proof that the Architect can actually access the stored image evidence through the supported path.

## Architect Recommendation

Proceed in Issue Resolution

## Architect Conclusion

ISSUE_003 is a supported bounded deficiency in the existing Issue Intake workflow. The current implementation is internally consistent with FC02's original text-only scope, but that narrow contract does not fulfill the broader Issue Resolution responsibility to capture available evidence when screenshots are the clearest diagnostic input.

The correction should extend the existing typed Issue Intake → main/service → repository → projection → Architect path with bounded screenshot evidence. The architectural success condition is not merely that a screenshot can be pasted into the form; the same evidence must survive Issue creation, remain visible with the Issue Record, retain safe project/Issue ownership, and be demonstrably consumable by the downstream Issue Architect without weakening the current filesystem, workflow, or browser authority boundaries.
