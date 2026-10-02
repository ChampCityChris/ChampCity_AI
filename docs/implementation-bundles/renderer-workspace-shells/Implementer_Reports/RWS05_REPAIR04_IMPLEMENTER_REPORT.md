# RWS05-REPAIR04 Implementer Report

## Outcome

Repair Card RWS05-REPAIR04 removes decorative ChatGPT browser chrome and adds **Export Markdown…** to the shared `FigmaDocumentCard`. Export uses the exact Markdown projection currently displayed by the selected document and a bounded main-process API that opens Electron Save As. No backing Markdown file is needed, and export does not change application state.

The permanently disabled Open action is removed. Open is omitted because the shared document model does not guarantee a materialized file and there is no bounded exact-file opening operation for every document source.

## Repository and Git

- Approved repository root verified: `ChampCity_AI/Dev` source checkout.
- Card type and identifier: Repair Card `RWS05-REPAIR04`.
- Branch: `dev`; configured origin exists and the branch has no configured upstream in the local branch listing.
- Sequential predecessor: RWS05-REPAIR03, committed as `88769df` after its implementation landed with the concurrent RWS06B commit `d209f60`.
- The worktree retains unrelated pre-existing edits and untracked RWS06J/workflow files. Only REPAIR04-attributable paths are staged for its checkpoint.
- Checkpoint commit: pending at report creation; record the resulting hash in the completion message.

## Root cause and implementation

`FigmaBrowserPanel` displayed a fake ChatGPT tab, favicon, and `chatgpt.com` address around a native browser surface. `FigmaDocumentCard` had Copy, a permanently disabled Open button, and no export action. SQL-derived projections could not be saved without a repository Markdown source file.

The fake tab/address JSX was removed. The native host, status, Reload, retry visibility, and reload/retry callbacks remain in the shared panel. A status label remains beside its real controls.

The shared document card now offers Export for any selected document with a body or preview. It submits `bodyMarkdown ?? preview ?? ""` and a sanitized `.md` suggestion derived from `displayFilename`. Every existing card consumer receives the action through the same component. Copy remains unchanged.

The preload exposes only `exportMarkdownDocument({suggestedFilename, markdown})`. The main handler accepts exactly those two string fields, caps UTF-8 Markdown at 1,000,000 bytes, limits the filename to 240 characters, rejects control characters, sanitizes the suggested basename, then opens Save As with a Markdown filter. Cancellation returns `{status: "cancelled"}` without writing. Confirmation writes the supplied text as UTF-8 to the user-selected path and returns that path. Dialog and write errors reject the IPC promise; the card reports them in its renderer status area.

## IPC contract and authority boundary

- Request: `{ suggestedFilename: string, markdown: string }`, exact field set only.
- Bounds: 1 MB UTF-8 Markdown; filename length 1–240 characters with no control characters.
- Result: `{status: "cancelled"}` or `{status: "saved", path: string}`.
- Save dialog: native Electron Save As, Markdown `.md` filter, normalized suggestion.
- Export body: selected document's current body/preview supplied by renderer; no `markdownPath` reread.
- Authority: the handler only writes after Save As confirmation. It does not revise SQL records, dispositions, workflow state, revisions, or canonical inventory.

## Proof

- Document-card proof checks Export visibility, safe filename suggestion, and exact SQL-derived display body submission without a backing file read.
- Native-dialog proof checks cancellation with no output file, dialog failure propagation, confirmed UTF-8 save at the chosen destination, `.md` suggestion normalization, malformed input rejection, filename bounds, and the 1 MB text limit.
- Browser-panel proof checks fake tab/address removal while the native host, ready status, Reload, and retry controls remain present. Existing attachment-coordinator tests continue to cover generation, bounds, detach, and retry mechanics.
- Open proof: there is no disabled or other Open action in `FigmaDocumentCard`; no filesystem path is derived from a logical document ID.
- Copy remains available and its existing focused proof is unchanged.

## Files changed for this card

- `src/renderer/app/FigmaDocumentCard.tsx`
- `src/renderer/app/figma/FigmaBrowserPanel.tsx`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/styles.css`
- `test/app-shell/native-dialog.test.cjs`
- `test/renderer/document-review-surface-source.test.cjs`
- `test/renderer/architect-browser-attachment-coordinator.test.cjs`
- This report.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Normal Windows | Passed after REPAIR04 implementation. |
| `npm run build` | Normal Windows | Passed for the shared renderer/main/preload change set; Vite reported the existing >500 KB chunk advisory. |
| `node --test test/app-shell/native-dialog.test.cjs test/renderer/document-review-surface-source.test.cjs test/renderer/architect-browser-attachment-coordinator.test.cjs` | Normal Windows | Passed, 19 tests, 0 failures. |
| `node --test test/renderer/figma-redesign-shell.test.cjs test/app-shell/native-dialog.test.cjs test/renderer/document-review-surface-source.test.cjs test/renderer/architect-browser-attachment-coordinator.test.cjs` | Normal Windows | Passed, 32 tests, 0 failures. |
| `npm run test:repair -- --changes tmp/rws05-repair04-changes.json --preview` | Repository validation executor | Passed change selection preview. |
| `npm run test:repair -- --changes tmp/rws05-repair04-changes.json` | Repository validation executor | Failed in broad selected owners after ~17 minutes. Reported failures in source-control managed-project and workflow-integration suites, `runtime-wiring-source.test.cjs`, and renderer suites. The stale browser-chrome assertion was updated and the card-focused rerun passed. Two Workflow Hub identity assertions remain failed in code changed concurrently outside these cards. |
| `git diff --check` | Local source check | Passed for staged card changes; unrelated worktree files continue to produce Git line-ending notices. |

Focused Node tests were run in the normal Windows lane because the restricted lane returned `spawn EPERM`. The broad repair profile is not green; failures outside REPAIR04 are retained and documented rather than modified here.

## Safety and remaining validation

The renderer does not receive a general filesystem API. The only write follows the native Save As choice and is limited to bounded Markdown text. The IPC accepts no logical document ID or arbitrary destination path. No dependency, migration, generated artifact, or authority change was introduced.

No manual visual acceptance or launch smoke was performed. Visual source review remains available; all shared consumers use the changed primitives.

Recommended next task: return RWS05-REPAIR03 and RWS05-REPAIR04 for source-code review.
