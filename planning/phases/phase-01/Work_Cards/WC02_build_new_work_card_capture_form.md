<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-01/work_card/WC02",
  "artifactType": "work_card",
  "createdAt": "2026-06-28T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-01/Work_Cards/WC02_build_new_work_card_capture_form.json",
  "markdownPath": "planning/phases/phase-01/Work_Cards/WC02_build_new_work_card_capture_form.md",
  "payload": {
    "kind": "work_card",
    "title": "Build New Work Card capture form"
  },
  "payloadHash": "sha256:f28d265a92ad860ab4acec481e0e1badca0e6b0caaba039d28d5bc1ee6bc0116",
  "phaseId": "phase-01",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-16T00:00:00.000Z",
  "workCardId": "WC02"
}
-->

# Work Card: Build New Work Card capture form

## Work Card ID

WC02

Created: 2026-06-28T00:00:00.000Z
Updated: 2026-06-28T00:00:00.000Z

## Phase

phase-01

## Status

ready_for_builder

## What Problem Are We Solving?

ChampCity A/I needs the first Operator-facing screen for capturing plain-language Work Card intent while preserving the Architect review boundary.

## What Should This Accomplish?

Add a narrow React renderer UI that captures Operator intent, previews the existing rendered Markdown, and saves structured JSON plus durable Markdown draft Work Card artifacts.

## What Should the User Be Able To Do?

The Operator can open the Electron app, enter Work Card intent in plain language, preview the rendered Markdown, and save both JSON and Markdown artifacts for Architect review.

## What Is Included?

- Add React and React DOM narrowly for the renderer UI.
- Build the New Work Card capture form with the required Operator-facing fields.
- Default phase to `phase-01`, risk level to `medium`, and captured status to `ready_for_architect`.
- Map form input into the existing WC01 Work Card schema.
- Use the existing WC01 Markdown renderer for preview and saved Markdown.
- Save JSON and Markdown through constrained Electron IPC under the selected phase Work_Cards folder.
- Add simple validation coverage for draft construction, Markdown rendering, and path sanitizer traversal rejection.
- Create the WC02 Builder Report.

## What Is Not Included?

- Do not implement editing existing Work Cards.
- Do not implement Architect automation.
- Do not implement risk router behavior.
- Do not implement Builder Report capture workflow.
- Do not add LLM provider SDKs or provider integrations.
- Do not add authentication, databases, cloud services, deployment automation, MCP integrations, or connector integrations.
- Do not perform a broad Figma-quality UI redesign.

## Requirements

- Renderer code must not use direct filesystem access.
- Filesystem writes must be mediated by constrained main/preload IPC.
- Save paths must be normalized, validated, and kept inside `planning/phases/<phase-folder>/Work_Cards/`.
- Status must not be exposed as an Operator-editable field.
- Plain-language validation errors must be shown for required fields.
- The preview must include `## Builder Handoff Prompt`.
- The preview should make clear that captured Work Cards are drafts requiring Architect review.

## How We Know This Is Done

- The New Work Card screen opens in the Electron renderer.
- The form captures every required Operator intent field.
- Required-field errors are plain language.
- Preview uses the existing Work Card Markdown renderer and includes `## Builder Handoff Prompt`.
- Saving creates both `.json` and `.md` files under `planning/phases/phase-01/Work_Cards/`.
- Captured Work Cards are saved with status `ready_for_architect`.
- Save-path sanitizer rejects traversal examples such as `../bad`.
- `npm run typecheck`, `npm run build`, `npm test`, and `npm run test:work-cards` pass.

## How This Should Be Validated

- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run `git status --short` and review changed files.
- Manually run `npm start` to confirm the UI opens and save behavior works.

## Risk Level

medium

## Risks and Watch Items

- The first React setup may expose build assumptions that future UI work needs to refine.
- Manual UI validation is still required because no renderer smoke test exists yet.
- The Work Card ID scanner will move to the next number after the WC02 artifact exists.

## Builder Instructions

- Verify the repository path before editing.
- Keep the pass limited to WC02 capture form, constrained IPC, draft mapping, validation coverage, the WC02 Work Card artifact, and the Builder Report.
- Do not add Architect automation, risk routing, provider SDKs, database, cloud, auth, deployment, MCP, or connector integrations.
- Run the required validation commands and document results in the Builder Report.
- Stage only files created or modified for WC02 and commit with `feat: add work card capture form`.

## Operator Notes

- A Work Card should never be authored by the Operator alone.
- The capture form records Operator intent as a draft with `ready_for_architect` status.
- The Architect remains responsible for translating captured intent into a Builder-ready Work Card.

## Builder Handoff Prompt

Use this as the starting Builder prompt:

You are acting as Builder for ChampCity A/I.

Before editing:
- Verify the repository path before editing. Expected repository: `<PROJECT_REPO>`.
- Read `AGENTS.md` and relevant planning files.

Work Card: WC02 - Build New Work Card capture form

Goal: Add a narrow React renderer UI that captures Operator intent, previews the existing rendered Markdown, and saves structured JSON plus durable Markdown draft Work Card artifacts.

Scope:
- Add React and React DOM narrowly for the renderer UI.
- Build the New Work Card capture form with the required Operator-facing fields.
- Default phase to `phase-01`, risk level to `medium`, and captured status to `ready_for_architect`.
- Map form input into the existing WC01 Work Card schema.
- Use the existing WC01 Markdown renderer for preview and saved Markdown.
- Save JSON and Markdown through constrained Electron IPC under the selected phase Work_Cards folder.
- Add simple validation coverage for draft construction, Markdown rendering, and path sanitizer traversal rejection.
- Create the WC02 Builder Report.

Out of scope:
- Do not implement editing existing Work Cards.
- Do not implement Architect automation.
- Do not implement risk router behavior.
- Do not implement Builder Report capture workflow.
- Do not add LLM provider SDKs or provider integrations.
- Do not add authentication, databases, cloud services, deployment automation, MCP integrations, or connector integrations.
- Do not perform a broad Figma-quality UI redesign.

Requirements:
- Renderer code must not use direct filesystem access.
- Filesystem writes must be mediated by constrained main/preload IPC.
- Save paths must be normalized, validated, and kept inside `planning/phases/<phase-folder>/Work_Cards/`.
- Status must not be exposed as an Operator-editable field.
- Plain-language validation errors must be shown for required fields.
- The preview must include `## Builder Handoff Prompt`.
- The preview should make clear that captured Work Cards are drafts requiring Architect review.

Acceptance criteria:
- The New Work Card screen opens in the Electron renderer.
- The form captures every required Operator intent field.
- Required-field errors are plain language.
- Preview uses the existing Work Card Markdown renderer and includes `## Builder Handoff Prompt`.
- Saving creates both `.json` and `.md` files under `planning/phases/phase-01/Work_Cards/`.
- Captured Work Cards are saved with status `ready_for_architect`.
- Save-path sanitizer rejects traversal examples such as `../bad`.
- `npm run typecheck`, `npm run build`, `npm test`, and `npm run test:work-cards` pass.

Validation plan:
- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards`.
- Run `git status --short` and review changed files.
- Manually run `npm start` to confirm the UI opens and save behavior works.

Builder Report:
- Create a Builder Report under `planning/phases/phase-01/Builder_Reports/` and include commands run, validation results, security notes, git actions, and the recommended next Builder task.
