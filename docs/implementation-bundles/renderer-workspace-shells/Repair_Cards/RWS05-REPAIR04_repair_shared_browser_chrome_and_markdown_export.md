# RWS05-REPAIR04 — Repair Shared Browser Chrome and Markdown Document Export

**Status:** IMPLEMENTER_READY  
**Parent:** RWS05 Architect Workspace Family / shared renderer primitives  
**Reviewed source baseline:** `ce5e5c6ec0c96303cc9af498cef79e304db709e0`  
**Repair type:** shared renderer + bounded Electron IPC defect

## Review evidence

Two shared presentation primitives currently misrepresent capabilities.

### Embedded ChatGPT panel

`src/renderer/app/figma/FigmaBrowserPanel.tsx` renders:

- a decorative ChatGPT tab;
- a fake address bar containing `chatgpt.com`.

Those controls do not navigate, select tabs, or expose a real browser address. They are visual dressing around the actual native browser host.

The real browser operations are reload/retry/attachment behavior.

### Document card

`src/renderer/app/FigmaDocumentCard.tsx` currently exposes:

- Copy — functional;
- Open — permanently disabled with a tooltip stating that no renderer API exists;
- Export — absent.

This is increasingly incorrect now that many displayed Markdown documents are generated projections of SQL state rather than durable repository files. A user must be able to save the exact Markdown currently being reviewed to a location of their choosing even when there is no authoritative backing Markdown file.

## Objective

Make shared browser/document chrome reflect real application capabilities.

Remove fake browser decoration. Add a real **Export Markdown…** action that opens the operating-system Save As dialog and writes the displayed Markdown projection as a UTF-8 `.md` file.

Do not make exported files authoritative and do not require a backing repository Markdown file.

## Required implementation

### 1. Remove fake browser tab/address chrome

From `FigmaBrowserPanel`, remove the decorative:

- ChatGPT tab strip;
- favicon/tab label used only as fake browser chrome;
- `chatgpt.com` address display.

Do not replace them with another fake browser UI.

Retain the real native browser host and meaningful load/attachment status.

Real reload/retry actions may remain as compact functional controls or be surfaced by caller-owned Browser Actions panels. They must remain real actions; do not remove browser recovery capability.

The browser host must continue to preserve:

- attachment generation handling;
- resize/bounds synchronization;
- detach cleanup;
- reload;
- retry when attachment recovery is actually available.

### 2. Add a bounded Markdown export IPC

Add one narrowly scoped renderer → preload → main-process API for exporting Markdown text.

The operation must:

1. receive a suggested filename and the exact Markdown text currently displayed;
2. show Electron's native Save As dialog;
3. allow the user to choose the destination;
4. default/filter to Markdown (`.md`) while still respecting the user's chosen destination;
5. write UTF-8 text only after the user confirms;
6. return a typed result such as saved/cancelled plus the selected path when saved;
7. treat cancel as a normal non-error result;
8. surface write/dialog failure to the renderer without mutating application state.

Validate/bound the IPC input. Do not expose an arbitrary general-purpose filesystem write API to the renderer.

The saved content must come from the selected document's current display projection, not by rereading `markdownPath`.

### 3. Add Export to FigmaDocumentCard

Add an explicit **Export** or **Export Markdown…** control next to Copy for every selected document with reviewable Markdown content.

The export source must be:

`selectedDocument.bodyMarkdown ?? selectedDocument.preview ?? ""`

or an equivalent exact display-source helper.

Use `selectedDocument.displayFilename` as the suggested filename when available. Normalize the suggestion to a safe `.md` filename without changing the user-selected final destination.

This must work equally for:

- physical historical/canonical Markdown documents;
- SQL-derived Intake projections;
- SQL-derived Architect Review projections;
- SQL-derived Planning/Phase/WorkItem review projections using the shared document card.

Exporting a projection creates only a user-selected copy. It must not create or revise Structured Project State, Decisions, canonical planning inventory, source revisions, or workflow eligibility.

### 4. Resolve the fake Open control

Do not leave a permanently disabled control that looks like a supported action.

Choose the narrow behavior supported by actual source capability:

- if the selected document has a real materialized file and the application can safely open that exact file through a bounded main-process API, expose a functional **Open** action;
- if the selected document is projection-only or no real open operation is implemented, omit **Open** for that document.

Do not synthesize a temporary authoritative file merely so Open can exist.

Do not use a SQL logical entity ID as a filesystem path.

### 5. Keep document action semantics explicit

Copy, Open, and Export must represent different operations:

- **Copy** copies the displayed Markdown text to clipboard.
- **Open** opens an existing real file only when one actually exists and the operation is supported.
- **Export** writes the displayed Markdown text to a new user-selected file.

The UI must not imply that an exported copy becomes the application's backing document.

### 6. Shared behavior, not Architect-only behavior

`FigmaDocumentCard` is a shared renderer primitive. Implement Export at that level or through an equally shared wrapper so every current consumer can use the capability.

Do not create a Greenfield-only export button.

Likewise, fake browser chrome removal applies to every `FigmaBrowserPanel` consumer.

## Preserve

Do not change:

- SQL authority;
- generated Markdown projection semantics;
- workflow dispositions;
- document logical IDs;
- browser navigation target/partition/session ownership;
- native browser attachment lifecycle;
- workflow-specific browser actions;
- structured Architect tab/disposition behavior from RWS05-REPAIR03;
- planning/execution/validation/close semantics;
- global `project_state_authority`;
- legacy write fence;
- unrelated RWS06J preparation files or unrelated dirty worktree changes.

## Explicitly out of scope

- changing which semantic records generate Markdown;
- making exports canonical;
- auto-export/background export;
- file synchronization after export;
- arbitrary renderer filesystem access;
- browser URL navigation controls;
- adding a general browser tab system;
- Architect disposition redesign;
- RWS06 lifecycle repairs;
- historical Markdown cleanup.

## Expected production areas

Primary:

- `src/renderer/app/FigmaDocumentCard.tsx`
- `src/renderer/app/figma/FigmaBrowserPanel.tsx`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/styles.css`

Potential narrow supporting helper:

- a small shared export result/request contract if needed;
- existing app-shell/native-dialog test owner.

Do not create a broad filesystem service for this feature.

## Focused proof

Reuse existing stable test owners where practical, especially native-dialog/app-shell/document-review tests.

Prove at minimum:

1. production `FigmaBrowserPanel` no longer contains fake `chatgpt.com` address chrome.
2. production `FigmaBrowserPanel` no longer renders a decorative ChatGPT tab.
3. native browser host/status and real reload/retry recovery remain wired.
4. FigmaDocumentCard renders Export only when a selected document has displayable Markdown.
5. Export sends the exact current displayed Markdown body, not a repository reread.
6. SQL-derived projection content can be exported with no backing canonical file.
7. Save dialog cancellation writes nothing and is not treated as an error.
8. confirmed Save As writes the exact UTF-8 Markdown bytes to the selected destination.
9. suggested filename derives safely from `displayFilename` and defaults to `.md`.
10. the IPC rejects malformed/unbounded input.
11. Export does not mutate SQL state, document disposition, or canonical document inventory.
12. Open is never rendered as a permanently disabled fake action.
13. when Open is shown, it invokes a real bounded open-file operation against an existing materialized path.
14. Copy behavior remains unchanged.

## Validation

Run:

- focused `FigmaDocumentCard` / document-review renderer proof;
- existing app-shell/native-dialog tests extended for Save As;
- focused browser panel/attachment tests;
- affected work-item profile using the exact changed paths;
- production build/typecheck as required by repository policy;
- `git diff --check`.

Report unrelated existing failures separately.

## Acceptance criteria

RWS05-REPAIR04 passes when:

1. fake ChatGPT tab/address chrome is gone from the shared browser panel.
2. real browser host/reload/retry behavior remains available.
3. every shared document-card consumer can export the displayed Markdown through a native Save As dialog.
4. SQL-derived projections export correctly without requiring a backing file.
5. Export creates only a user-selected external copy and has no authority side effects.
6. Open is either real and capability-driven or absent; no fake disabled Open remains.
7. Copy remains functional.
8. focused owned proof passes.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS05_REPAIR04_IMPLEMENTER_REPORT.md`

Include:

- source root cause;
- exact production files changed;
- IPC contract and input bounds;
- Save As/cancel/error behavior;
- projection-only export proof;
- browser chrome removal proof;
- Open capability decision and proof;
- focused/affected validation results;
- unrelated failures observed;
- deviations, if any.

## Checkpoint

Commit:

`RWS05-R04 repair shared browser and markdown export primitives`

Return the checkpoint and Implementer Report for source-code review.

This card creates no Operator approval or execution gate.
