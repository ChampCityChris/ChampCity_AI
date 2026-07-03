# Figma Source Diff - WC10 Strict Parity Repair

## Repair Pass

- Repair task: `REPAIR_WC10_strict_figma_source_parity_diff_pass`
- Repository inspected: `<PROJECT_REPO>`
- Git repository root inspected: `<PROJECT_REPO>`
- Latest Figma source zip inspected: `planning/phases/phase-01/UI_Design_Handoff/figma_source/Design Dark UI for ChampCity.zip`
- Zip SHA-256: `C439FF150A80F2095631FD17461356B5830F52702C12D9ED98169A876D02716A`
- Temporary extraction path: `redacted local temporary extraction path`
- No newer ZIP was found in `[redacted local attachment path]` during this pass, so the repo ZIP was treated as the latest supplied Figma package.

## Figma Source Inspected

- `src/app/App.tsx`
  - Line count: 2575
  - SHA-256: `D2DA99F47C990128A8D3E005B876468B80C54AB23B0F2815DC3665734060DB81`
  - Main structure inspected:
    - types and demo data at lines 27-132
    - CSS constants and `PIPELINE` at lines 157-215
    - atoms and form primitives at lines 218-383
    - `ActionBar` at lines 419-496
    - `ArtifactPanel` at lines 498-585
    - `ScreenLayout` at lines 587-607
    - `PipelineStepper` at lines 608-716
    - `AppHeader` at lines 718-798
    - seven screen components at lines 801-2542
    - app root at lines 2544-2575
- `src/main.tsx`
- `src/styles/tailwind.css`
- `src/styles/index.css`
- `src/styles/fonts.css`
- `src/styles/theme.css`
- `src/styles/globals.css`
- `src/imports/ChampCity_AI.png`
- `vite.config.ts`
- `postcss.config.mjs`
- `package.json`
- `default_shadcn_theme.css`
- optional generated components under `src/app/components/`

## Current App Source Inspected

- `src/renderer/app/App.tsx`
  - Line count before repair: 3394
  - Line count after repair: 3502
  - SHA-256 before repair: `2DCCB3AA4F5738129593F0AEEEA48DD1F4F173A989AEE867CC3F612D129C0CCA`
  - SHA-256 after repair: `23555B0665ADA71A1863DF63FB85D00FA5F3EA23F85404F8643EBC2D030D62ED`
  - Main structure inspected:
    - real app workflow types and `workflowSteps` at lines 30-129
    - real form defaults and CSS constants at lines 131-180
    - app root at lines 182-249
    - `AppHeader` at lines 251-305
    - `PipelineStepper` at lines 307-355
    - seven real IPC-backed screen components at lines 357-2213
    - shared layout and atoms at lines 2215-3392
- `src/renderer/main.tsx`
- `src/renderer/index.html`
- `src/renderer/styles/tailwind.css`
- `src/renderer/styles/index.css`
- `src/renderer/styles/fonts.css`
- `src/renderer/styles/theme.css`
- `src/renderer/styles/globals.css`
- `vite.config.ts`
- `package.json`

## Asset Diff

- Figma source banner: `src/imports/ChampCity_AI.png`
- Renderer banner: `src/renderer/assets/champcity_ai_ui_branding.png`
- Both files have SHA-256 `4FDD0A1D0CA1B82854F53CF662865AE0DCE79466BB712762899761616AAA3E30`.
- The current renderer already uses the Figma package banner asset as the large header image.
- The compact app icon remains separate at `src/renderer/assets/champcity_ai_icon_clean_no_shadow_TRANSPARENT.png`.

## Component Diff

### AppHeader

- Figma source uses a compact `h-16` single-row header with:
  - left banner image in a right-bordered brand block,
  - centered grouped `PipelineStepper`,
  - right-side phase select,
  - right-side Work Card select,
  - optional risk/status badges for the active card.
- Current app before this repair used a taller `min-h-[76px]` custom grid header with:
  - a larger responsive banner width,
  - a flat pipeline centered in the middle,
  - phase and mode badges,
  - a screen-title/context text block instead of select controls.
- Repair decision: copy the Figma header structure closely, replace demo phase/card data with real phase state and IPC-backed Work Card summaries, and retain only minimal `min-w-0`, truncation, and overflow safeguards for real titles.

### PipelineStepper

- Figma source groups steps as:
  - Architect group: `Capture`, `Architect`, `Risk`
  - large slash divider
  - Implementer group: `Implement`, `Report`
  - bordered final group: `Validate`, `Closeout`
- Figma source uses small dot status markers, `ChevronRight` separators, group captions, and larger final buttons.
- Current app before this repair used a flat icon navigation row with all seven steps in one group.
- Repair decision: copy the grouped Figma visual model, preserve product wording `Capture -> Architect -> Risk -> Implement -> Report -> Validate -> Closeout`, keep real screen IDs, and add only horizontal overflow containment for narrow windows.

### ScreenLayout

- Figma source uses a two-pane layout with a fixed left pane, right pane, border divider, and independent vertical scrolling.
- Current app follows that model but uses `min-h-0`, responsive stacking, and a `390px` left pane to protect real MVP forms.
- Repair decision: retain the current source-derived two-pane layout because it preserves the Figma layout model while preventing obvious overflow in real desktop and narrow-window use.

### ArtifactPanel

- Figma source uses a right-pane panel with eyebrow, title, optional status, optional filename, optional copy/save actions, and empty state.
- Current app follows this model, adapted to real status strings and long filenames with `break-anywhere`, wrapped actions, and `IconButton`.
- Repair decision: retain the current adapted version because it preserves the Figma panel structure and handles real app paths without layout breakage.

### ActionBar

- Figma source uses a left-pane footer action bar with status text on the left and preview/copy/save buttons on the right.
- Current app follows that model and adds sticky bottom behavior, wrapping at very narrow widths, and the shared `IconButton` helper.
- Repair decision: retain the adapted version because the visual model is source-aligned and the additions prevent real status text/buttons from overflowing.

### Notice

- Figma source uses color-coded dark notices with small lucide icons and compact text.
- Current app follows that model with typed lucide icon references and `break-anywhere` for real paths/messages.
- Repair decision: retain the current adapted version.

### Badge

- Figma source uses small uppercase bordered badges.
- Current app follows the same class strategy.
- Repair decision: retain the current adapted version.

### FieldGroup

- Figma source uses compact grouped form sections with an uppercase divider label and hairline rule.
- Current app follows the same structure and adds responsive `min-w-0`.
- Repair decision: retain the current adapted version.

## Screen-Level Layout Diff

- Screen 1, New Work Card / Capture:
  - Figma source contains demo state and fake save paths.
  - Current app keeps the Figma left form plus right preview panel model, but wires real preview/save IPC and paired JSON/Markdown output.
- Screen 2, Architect Prompt:
  - Figma source uses demo Work Card state and fake prompt output.
  - Current app keeps the source two-pane composer/preview pattern, but lists saved Work Cards through IPC and saves real Architect prompts.
- Screen 3, Risk Router:
  - Figma source shows static risk category/demo review content.
  - Current app keeps the source review/status card pattern, but uses real deterministic risk preview/save IPC.
- Screen 4, Implementer Prompt:
  - Figma source uses mock supporting artifact selection.
  - Current app keeps the source two-pane prompt preview pattern, but lists real optional supporting artifacts and saves real Implementer prompts.
- Screen 5, Implementer Report:
  - Figma source uses a report capture form with detection chips and fake save path.
  - Current app keeps the source capture/preview pattern, import affordance, and detection grid while using real report validation/save IPC.
- Screen 6, Human Validation:
  - Figma source uses demo validation state and fake repair prompt generation.
  - Current app keeps the source validation record plus repair-prompt preview model, but uses real validation preview/save IPC and real report listing.
- Screen 7, Phase Closeout:
  - Figma source uses static artifact summary data.
  - Current app keeps the source artifact summary and decision record model, but uses real phase artifact summary/preview/save IPC.

## Visual Differences Before This Repair

- Header was taller than the Figma `h-16` shell and used a custom grid composition.
- Pipeline was a generic flat icon nav rather than the Figma grouped Architect / slash / Implementer / Validate-Closeout model.
- Header context controls were badges/text instead of source-style phase and Work Card selects.
- The current app carried real-data overflow safeguards throughout the shared atoms; these are intentional but must remain narrow and documented.

## Components Copied Closely In This Repair

- `AppHeader`
  - Restored the Figma `h-16` compact single-row shell.
  - Restored the left brand block with right border and `h-11` banner image.
  - Restored the centered stepper region.
  - Restored right-side phase and Work Card select controls.
  - Restored active-card risk/status badge placement.
- `PipelineStepper`
  - Restored the grouped visual model:
    - Architect group: `Capture`, `Architect`, `Risk`
    - large slash divider
    - Implementer group: `Implement`, `Report`
    - final bordered group: `Validate`, `Closeout`
  - Restored small dot status markers, `ChevronRight` separators, group captions, and larger final buttons.
  - Preserved the exact product-facing sequence `Capture -> Architect -> Risk -> Implement -> Report -> Validate -> Closeout`.
- The header and pipeline class strings now follow the Figma source much more closely than the previous custom grid and flat icon rail.

## Components Adapted Because They Contain Demo Data

- `AppHeader`
  - Figma `PHASES` were copied as `phase-01`, `phase-02`, `phase-03`.
  - Figma `DEMO_CARDS` were not copied.
  - The Work Card select is populated from real `listSavedWorkCards(phase)` results.
  - The active-card risk/status badges use real `UiWorkCardSummary` state.
  - Minimal overflow constraints remain on the banner and stepper so the compact header does not break with real Work Card titles.
- `PipelineStepper`
  - Figma screen IDs were mapped to existing real app screen IDs:
    - `architect-prompt` -> `architect-prompt-composer`
    - `builder-prompt` -> `builder-prompt-generator`
    - `builder-report` -> `builder-report-capture`
  - Figma demo icons were not shown in the stepper after repair because the source grouped design uses dot markers rather than icon buttons.
- Screen components
  - All seven screens continue to adapt the Figma two-pane visual model to real state, validation, preview, save, and artifact-listing behavior.

## Current App Functions Retained For Real IPC Behavior

- `NewWorkCardScreen`
  - Retains real `getNextWorkCardId`, `previewWorkCardDraft`, and `saveWorkCardDraft` calls.
- `ArchitectPromptComposerScreen`
  - Retains real Work Card listing and `previewArchitectPrompt` / `saveArchitectPrompt` calls.
- `RiskRouterScreen`
  - Retains real `previewRiskReview` / `saveRiskReview` calls.
- `BuilderPromptGeneratorScreen`
  - Retains real supporting artifact listing and `previewBuilderPrompt` / `saveBuilderPrompt` calls.
- `BuilderReportCaptureScreen`
  - Retains report import, real validation preview, and `saveBuilderReportCapture` calls.
- `HumanValidationScreen`
  - Retains real Work Card and Implementer Report listing, validation preview, repair prompt state, and `saveHumanValidationRecord` calls.
- `PhaseCloseoutScreen`
  - Retains real phase artifact summary, closeout preview, and `savePhaseCloseoutRecord` calls.
- Shared hooks retained:
  - `useWorkCards`
  - `useDefaultSelectedFile`
  - `useSelectedWorkCard`
- Shared helpers retained:
  - `copyText`
  - `validateWorkCardForm`
  - `toUiWorkCardSummary`
  - risk/status color helpers

## Validation Notes

- `npm run typecheck` passed.
- `npm run build` passed when rerun with escalation after sandboxed Vite/esbuild `spawn EPERM`.
- `npm test` passed.
- `npm run test:work-cards` passed when rerun with escalation after the same sandboxed Vite/esbuild `spawn EPERM`.
- `npm start` was run directly; Electron launched and remained open until the bounded timeout, which is expected for a desktop app.
- Automated Electron DOM smoke validation passed:
  - `document.title` was `ChampCity A/I`.
  - React root had one mounted child.
  - Renderer text was nonblank.
  - Grouped shell text included Architect, slash divider, and Implementer.
  - Pipeline labels present: `Capture`, `Architect`, `Risk`, `Implement`, `Report`, `Validate`, `Closeout`.
  - No DevTools `Log.entryAdded` entries were captured.

## Visual Differences Remaining After This Repair

- The app still has denser real MVP forms than the Figma demo screens because it preserves all existing workflow inputs and validations.
- Shared atoms keep narrow overflow safeguards (`min-w-0`, `break-anywhere`, truncation, wrapping, scroll containers) for real paths, titles, filenames, and status strings.
- `ScreenLayout`, `ArtifactPanel`, `ActionBar`, `Notice`, `Badge`, `FieldGroup`, and screen bodies remain adapted rather than byte-for-byte copied so real IPC behavior and long local artifact data do not break the layout.
- The Work Card selector in the compact header updates app-level active-card context; individual workflow screens keep their own real selectors and load/save flows.
- Pixel-level visual parity still requires Operator inspection in the running Electron window.
