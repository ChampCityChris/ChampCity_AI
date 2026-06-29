# ChampCity A/I Figma UI Design Handoff

## Purpose

This folder packages the current ChampCity A/I UI context for a focused Figma design pass. It is meant to help Figma redesign the existing Electron app into a compact, modern, dark, consumer-friendly workflow without changing what the MVP already does.

This package is documentation only. It does not implement the redesigned UI.

## Current App State

ChampCity A/I is a Phase 1 Electron MVP with a React renderer and constrained Electron main/preload IPC. The app supports the full Work Card loop:

- New Work Card
- Architect Prompt Composer
- Risk Router
- Builder Prompt Generator
- Builder Report Capture
- Human Validation
- Phase Closeout

The current UI is functional and validated through WC08, but it is intentionally plain. It uses a light, form-heavy two-column layout with raw Markdown preview panels and compact status/warning boxes.

## What Figma Should Redesign

Figma should redesign the current renderer experience into a compact modern dark desktop app for a consumer end user. The redesign should make structured planning feel like a guided creative cockpit instead of a ticketing system, admin dashboard, or developer utility.

Figma should redesign:

- Overall navigation and screen hierarchy.
- Work Card creation flow.
- Saved Work Card selectors.
- Artifact preview panels.
- Warning, validation, empty, and saved-success states.
- Prompt and report preview surfaces.
- Artifact summary and closeout views.
- Component system suitable for React implementation.

## What Figma Should Preserve Functionally

The redesign must preserve access to every current workflow and artifact operation:

- Create paired Work Card JSON and Markdown artifacts.
- Generate and save Architect prompts.
- Generate and save deterministic Risk Reviews.
- Generate, copy, and save Builder prompts.
- Paste/import and save Builder Reports.
- Capture Human Validation records and create Repair Prompts when required.
- Summarize phase artifacts and save Phase Closeout records.
- Show warnings, validation errors, empty states, save results, and artifact paths.
- Keep renderer filesystem access mediated by main/preload IPC.

## What Figma Should Avoid

Avoid:

- A ticketing-system look.
- Enterprise admin dashboard patterns.
- Giant flat forms with no sense of progression.
- Developer-console or raw Markdown-first visual emphasis.
- Overly playful game UI.
- New product concepts that imply authentication, cloud sync, provider APIs, databases, deployments, or integrations.
- Removing functional labels that Codex will need for implementation.

## How To Use This Package

1. Read `BRAND_AND_UI_DIRECTION.md`.
2. Read `CURRENT_UI_INVENTORY.md` and `UX_FLOW_MAP.md`.
3. Use `SOURCE_REFERENCES.md` to point Codex or Figma back to the source files and planning artifacts.
4. Capture current screenshots using `SCREENSHOT_CAPTURE_INSTRUCTIONS.md`, or provide this folder if screenshots are not available yet.
5. Copy the full prompt from `FIGMA_PROMPT.md` into Figma.
6. After Figma returns a design, Architect should define a separate UI implementation Work Card. Do not implement UI changes from this package directly.
