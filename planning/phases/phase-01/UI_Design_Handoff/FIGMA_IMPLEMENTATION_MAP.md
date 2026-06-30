# Figma Implementation Map - REPAIR_WC10 Source-Driven UI Parity

## Source Package

- Package inspected: `planning/phases/phase-01/UI_Design_Handoff/figma_source/Design Dark UI for ChampCity.zip`
- Temporary extraction used for inspection only: `C:\Users\chapm\AppData\Local\Temp\champcity_figma_source_27f6c760432744aaaf08f1a6ca5b94fc`
- The package was already present in the repository path, so no attachment copy was needed.

## Figma Source Files Inspected

- `src/app/App.tsx`
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
- `src/app/components/ui/*.tsx`
- `src/app/components/figma/ImageWithFallback.tsx`

## Figma Source Files Directly Reused

- `src/imports/ChampCity_AI.png` visual role was reused through the existing renderer banner asset `src/renderer/assets/champcity_ai_ui_branding.png`.
- `src/styles/index.css` import structure was reused as `src/renderer/styles/index.css`.
- `src/styles/tailwind.css` Tailwind v4 source-entry pattern was reused as `src/renderer/styles/tailwind.css`.
- `src/styles/theme.css` dark token palette was reused as `src/renderer/styles/theme.css`.

## Figma Source Files Adapted

- `src/app/App.tsx` was adapted into `src/renderer/app/App.tsx`.
  - Reused visual shell concepts: compact dark app shell, banner-led header, pipeline stepper, mode badges, `Notice`, `Badge`, `FieldGroup`, `ActionBar`, `ArtifactPanel`, `ScreenLayout`, `WorkCardSummary`, `MonoBlock`, and compact preview panels.
  - Replaced Figma demo state with real `window.champCity` IPC calls.
  - Replaced mock Work Card, risk, artifact, report, validation, and closeout data with live app data.
- `src/main.tsx` was adapted into `src/renderer/main.tsx`.
- `vite.config.ts` was adapted into root `vite.config.ts` with `src/renderer` as the Vite root and `dist/renderer` as the build output.
- `src/styles/fonts.css` was adapted to use local/system font stacks instead of a Google Fonts network import.

## Figma Source Files Intentionally Not Used

- `src/app/components/ui/*.tsx` were not imported because the Figma App implementation did not actually use the generated shadcn/Radix component files for this UI.
- `src/app/components/figma/ImageWithFallback.tsx` was not needed because the banner image is a known local asset.
- `default_shadcn_theme.css` was not used because the implemented renderer uses the Figma dark token set in `theme.css`.
- `postcss.config.mjs` was not added because Tailwind CSS v4 is wired through `@tailwindcss/vite`.
- Screenshot imports were not bundled into the app because they are design evidence, not runtime UI assets.

## Dependencies Added

- Runtime:
  - `lucide-react`: required for the Figma source icon language in navigation, action buttons, notices, and empty states.
- Development:
  - `vite`: required to build the React/Tailwind renderer module graph.
  - `@vitejs/plugin-react`: required for the React renderer build.
  - `tailwindcss`: required for the Figma Tailwind utility classes.
  - `@tailwindcss/vite`: required for Tailwind CSS v4 integration with Vite.
  - `@types/react`: required to typecheck the TSX renderer.
  - `@types/react-dom`: required to typecheck the TSX renderer entry.

## Dependencies Intentionally Not Added

- Broad unused generated dependencies from the Figma package, including Radix UI packages, MUI packages, charting packages, motion packages, carousel packages, date pickers, drag-and-drop packages, form libraries, and router libraries.
- `tw-animate-css`, because the implemented UI does not depend on the generated animation utility import.
- `@emotion/*`, because no MUI components are used.
- Playwright or screenshot tooling, because heavy visual testing was out of scope for this repair.
- Any cloud, auth, database, LLM provider SDK, MCP, connector, deployment, or packaging dependency.

## Workflow Mapping

- Capture -> `NewWorkCardScreen`
  - Uses the Figma capture shell and field grouping.
  - Preserves real `getNextWorkCardId`, `previewWorkCardDraft`, and `saveWorkCardDraft` IPC behavior.
- Architect -> `ArchitectPromptComposerScreen`
  - Uses Figma source selector panel and artifact preview pattern.
  - Preserves real `listSavedWorkCards`, `previewArchitectPrompt`, copy, and `saveArchitectPrompt` behavior.
- Risk -> `RiskRouterScreen`
  - Uses Figma risk badge, metric, notice, and review-section patterns.
  - Preserves real deterministic `previewRiskReview` and `saveRiskReview` behavior.
- Implement -> `BuilderPromptGeneratorScreen`
  - Uses Figma Implementer handoff visual language and action bar.
  - Preserves real supporting artifact selectors, high-risk warnings, missing Risk Review warnings, copy, and `saveBuilderPrompt` behavior.
- Report -> `BuilderReportCaptureScreen`
  - Uses Figma report/evidence check panel and detection metric cards.
  - Preserves real report type, optional Work Card association, import/paste, validation warning, generated filename, and `saveBuilderReportCapture` behavior.
- Validate -> `HumanValidationScreen`
  - Uses Figma validation record layout and repair path notice pattern.
  - Preserves real Implementer Report selection, checklist extraction, validation preview, Repair Prompt generation state, and `saveHumanValidationRecord` behavior.
- Closeout -> `PhaseCloseoutScreen`
  - Uses Figma phase artifact summary cards, decision fields, and closeout preview panel.
  - Preserves real `getPhaseCloseoutSummary`, `previewPhaseCloseoutRecord`, and `savePhaseCloseoutRecord` behavior.

## Remaining Visual Differences

- The implementation keeps all real MVP fields visible, so some screens are denser than the Figma demo.
- The Google Fonts import from Figma was not reused to avoid a renderer network request; the UI uses the same Inter-first system font stack.
- Some generated Figma micro-interactions and unused shadcn component variants were not imported because they were not used by the supplied App source and would add unnecessary dependencies.
- Manual Operator validation is still required to judge pixel-level closeness in the running Electron window.
