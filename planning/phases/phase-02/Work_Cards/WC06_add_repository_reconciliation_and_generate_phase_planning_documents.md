# Work Card: Add Repository Reconciliation and Generate Phase Planning Documents

## Work Card ID

WC06

Created: 2026-07-02T00:00:00.000Z
Updated: 2026-07-02T00:00:00.000Z

## Phase

phase-02

## Status

ready_for_builder

## What Problem Are We Solving?

The app can generate Project Planning Documents and Phase Architect Interview prompts, but it does not yet provide a reusable reconciliation workflow that lets the Architect understand the actual current repo/project state before roadmap, phase, or Work Card planning continues.

## What Should This Accomplish?

Add deterministic Repository Reconciliation and Phase Planning Documents workflows that use saved project planning context, completed reconciliation output, Phase Intake, and completed Phase Architect Interview output to generate durable phase planning artifacts and an initial Work Card plan.

## What Should the User Be Able To Do?

The Operator can generate a Repository Reconciliation Architect prompt, save the completed reconciliation output, select the relevant planning sources, paste completed Phase Architect Interview output, preview Phase Planning Documents and an initial Work Card plan, and save durable paired artifacts for later formal Work Card creation.

## What Is Included?

- Create WC06 JSON and Markdown Work Card artifacts under Phase 02.
- Add a Repository Reconciliation workflow screen or section.
- Generate a copy-ready Repository Reconciliation Architect prompt from current project/repo context.
- Allow the Operator to paste completed Architect repository reconciliation output back into the app.
- Save paired Repository Reconciliation JSON and Markdown artifacts under `planning/project/Repository_Reconciliation/`.
- Add a Phase Planning Documents workflow screen or section after reconciliation and Phase Interview.
- Allow the Operator to select Project Planning Documents, Repository Reconciliation, Phase Intake, and optional Phase Architect Interview Prompt sources.
- Allow the Operator to paste completed Phase Architect Interview output.
- Generate previewable Phase Planning Documents.
- Generate a previewable initial Work Card plan for the selected phase.
- Save durable Phase Planning Documents Markdown and JSON artifacts under `planning/phases/<phase-folder>/Phase_Planning_Documents/`.
- Save durable initial Work Card plan Markdown and JSON artifacts under `planning/phases/<phase-folder>/Work_Card_Plans/`.
- Update or create a phase-scoped backlog artifact for the selected phase.
- Add route/navigation from Phase Interview to Repository Reconciliation and Phase Plan where appropriate.
- Preserve the Capture -> Frame -> Plan -> Build -> Prove mental model.
- Preserve Operator / Architect / Implementer terminology.
- Keep the workflow deterministic and do not call an LLM API.
- Update `PROJECT_STATE.md` so it no longer says the next intended milestone is PH02 WC05.
- Create the required WC06 Implementer Report under the legacy `Builder_Reports` folder.

## What Is Not Included?

- Do not call an LLM API.
- Do not add provider SDKs.
- Do not add ChatGPT or Claude browser automation.
- Do not add database, auth, cloud, deployment automation, MCP, or connector integrations.
- Do not implement automatic formal Work Card creation from the initial plan.
- Do not create implementation-ready Work Card JSON files from the initial plan.
- Do not implement phase closeout.
- Do not close Phase 02.
- Do not implement release, package, or installer work.
- Do not perform a broad UI redesign.
- Do not rename `Builder_Reports` or legacy `BUILDER_REPORT_*` files.

## Requirements

- Renderer code must not directly read or write local files.
- All new reads and writes must go through constrained Electron main/preload IPC.
- Source selections must be safe basenames from approved folders.
- The app must reject unsafe filenames, traversal, arbitrary absolute paths, and unsupported source paths.
- Repository Reconciliation source reads must stay inside approved project planning folders.
- Repository Reconciliation writes must stay inside `planning/project/Repository_Reconciliation/`.
- Phase Planning Documents writes must stay inside `planning/phases/<phase-folder>/Phase_Planning_Documents/`.
- Initial Work Card Plan writes must stay inside `planning/phases/<phase-folder>/Work_Card_Plans/`.
- Saving paired artifacts must not silently overwrite existing artifacts; use safe suffixing where needed.
- Generated previews must be visible before save.
- Save result must show written Markdown and JSON paths.
- Repository Reconciliation saved output must capture the required reconciliation fields including implemented state, missing items, stale planning items, risks, roadmap, milestones, phases, and next phase.
- Phase Planning Documents output must include phase brief, goal, user/operator outcome, scope, out-of-scope items, affected workflows, source context, reconciliation summary, Architect interview summary, assumptions, risks, dependencies, validation expectations, recommended sequence, initial Work Card plan, open questions, and next action.
- Initial Work Card plan output must include proposal ID, title, problem, user outcome, included scope, out of scope, dependencies, risk level, validation items, suggested ordering, and notes for Architect/Implementer.
- The initial Work Card plan must remain a planning artifact and must not automatically create formal app-selectable Work Card JSON files.
- Existing Project Intake screen must continue to work.
- Existing Project Architect Interview screen must continue to work.
- Existing Project Planning Documents screen must continue to work.
- Existing Phase Intake screen must continue to work.
- Existing Phase Interview screen must continue to work.
- Existing Validate screen and Validation Target behavior must continue to work.

## How We Know This Is Done

- WC06 Work Card JSON and Markdown artifacts are created.
- A visible Repository Reconciliation workflow appears in the app.
- The Operator can generate and copy a Repository Reconciliation Architect prompt.
- The Operator can paste completed Architect reconciliation output and preview the saved reconciliation artifact.
- Saving Repository Reconciliation creates paired JSON and Markdown artifacts under the approved project folder.
- A visible Phase Planning Documents workflow appears in the app.
- The Operator can select Project Planning Documents, Repository Reconciliation, Phase Intake, and optional Phase Architect Interview Prompt sources.
- The Operator can paste completed Phase Architect Interview output.
- A deterministic preview includes Phase Planning Documents, an initial Work Card plan, and phase-scoped backlog output.
- Saving writes paired Phase Planning Documents artifacts and paired initial Work Card Plan artifacts under the selected phase folder.
- Saving updates or creates a phase-scoped backlog artifact for the selected phase.
- Unsafe source filenames, traversal, arbitrary absolute paths, and unsupported source paths are rejected.
- Existing Project Intake, Project Architect Interview, Project Planning Documents, Phase Intake, Phase Interview, Validate screen, and Validation Target behavior remain available.
- No LLM API call, provider SDK, browser automation, database, auth, cloud, deployment, MCP, connector, phase closeout, formal Work Card auto-creation, release, package, installer, broad redesign, or legacy Builder path rename is added.
- `PROJECT_STATE.md` no longer says the next intended milestone is PH02 WC05.
- WC06 Implementer Report is created.

## How This Should Be Validated

- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards` if the build environment allows it.
- Run `git status --short` and review changed files.
- List remaining Operator manual validation steps in the WC06 Implementer Report without performing Operator acceptance.

## Risk Level

medium

## Risks and Watch Items

- This workflow adds several new artifact folders, so path validation must stay narrow.
- The deterministic generators can organize pasted Architect output but cannot replace Architect judgment.
- The renderer is still a large single-file React implementation, so the new screens must be inserted without broad redesign.
- The initial Work Card plan could be mistaken for implementation scope unless the UI and artifacts clearly mark it as planning-only.

## Builder Instructions

- Verify the repository path and Git root before editing.
- Read `AGENTS.md`, Phase 02 WC04 and WC05 artifacts, project planning files, existing Project Planning Documents, Phase Intake, and Phase Architect Interview models, main/preload IPC, and renderer source before implementation.
- Keep this pass limited to deterministic Repository Reconciliation, Phase Planning Documents, initial Work Card Plan, and the related artifact paths.
- Preserve product-facing Operator, Architect, Implementer, Implementer Prompt, and Implementer Report terminology.
- Preserve legacy `Builder_*` compatibility artifact folders and file prefixes.
- Do not perform Operator manual validation or create accepted Human Validation records.
- Run required validation commands and document results in the WC06 Implementer Report.
- Stage only files changed or created for WC06 and commit with `feat: add repository reconciliation and phase planning`.

## Operator Notes

- Repository reconciliation is a reusable product feature for partially completed projects, not a one-off ChampCity A/I task.
- Phase generation should be driven by Project Planning Documents, Repository Reconciliation output, and completed Phase Architect Interview output.
- The initial Work Card plan is a planning artifact. A later workflow can convert selected plan items into formal Work Cards.
- Existing legacy Builder artifact names remain compatibility storage names until a dedicated migration Work Card changes them safely.

## Builder Handoff Prompt

Use this as the starting Implementer prompt. The section heading remains a legacy Builder handoff heading for artifact compatibility.

You are acting as Implementer for ChampCity A/I.

The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Build only from this structured handoff and preserve the approved scope.

Before editing:
- Verify the repository path before editing. Expected repository: `C:\Users\chapm\Projects\ChampCity_AI`.
- Read `AGENTS.md` and relevant planning files.

Work Card: WC06 - Add Repository Reconciliation and Generate Phase Planning Documents

Goal: Add deterministic Repository Reconciliation and Phase Planning Documents workflows that use saved project planning context, completed reconciliation output, Phase Intake, and completed Phase Architect Interview output to generate durable phase planning artifacts and an initial Work Card plan.

Scope:
- Create WC06 JSON and Markdown Work Card artifacts under Phase 02.
- Add a Repository Reconciliation workflow screen or section.
- Generate a copy-ready Repository Reconciliation Architect prompt from current project/repo context.
- Allow the Operator to paste completed Architect repository reconciliation output back into the app.
- Save paired Repository Reconciliation JSON and Markdown artifacts under `planning/project/Repository_Reconciliation/`.
- Add a Phase Planning Documents workflow screen or section after reconciliation and Phase Interview.
- Allow the Operator to select Project Planning Documents, Repository Reconciliation, Phase Intake, and optional Phase Architect Interview Prompt sources.
- Allow the Operator to paste completed Phase Architect Interview output.
- Generate previewable Phase Planning Documents.
- Generate a previewable initial Work Card plan for the selected phase.
- Save durable Phase Planning Documents Markdown and JSON artifacts under `planning/phases/<phase-folder>/Phase_Planning_Documents/`.
- Save durable initial Work Card plan Markdown and JSON artifacts under `planning/phases/<phase-folder>/Work_Card_Plans/`.
- Update or create a phase-scoped backlog artifact for the selected phase.
- Add route/navigation from Phase Interview to Repository Reconciliation and Phase Plan where appropriate.
- Preserve the Capture -> Frame -> Plan -> Build -> Prove mental model.
- Preserve Operator / Architect / Implementer terminology.
- Keep the workflow deterministic and do not call an LLM API.
- Update `PROJECT_STATE.md` so it no longer says the next intended milestone is PH02 WC05.
- Create the required WC06 Implementer Report under the legacy `Builder_Reports` folder.

Out of scope:
- Do not call an LLM API.
- Do not add provider SDKs.
- Do not add ChatGPT or Claude browser automation.
- Do not add database, auth, cloud, deployment automation, MCP, or connector integrations.
- Do not implement automatic formal Work Card creation from the initial plan.
- Do not create implementation-ready Work Card JSON files from the initial plan.
- Do not implement phase closeout.
- Do not close Phase 02.
- Do not implement release, package, or installer work.
- Do not perform a broad UI redesign.
- Do not rename `Builder_Reports` or legacy `BUILDER_REPORT_*` files.

Requirements:
- Renderer code must not directly read or write local files.
- All new reads and writes must go through constrained Electron main/preload IPC.
- Source selections must be safe basenames from approved folders.
- The app must reject unsafe filenames, traversal, arbitrary absolute paths, and unsupported source paths.
- Repository Reconciliation source reads must stay inside approved project planning folders.
- Repository Reconciliation writes must stay inside `planning/project/Repository_Reconciliation/`.
- Phase Planning Documents writes must stay inside `planning/phases/<phase-folder>/Phase_Planning_Documents/`.
- Initial Work Card Plan writes must stay inside `planning/phases/<phase-folder>/Work_Card_Plans/`.
- Saving paired artifacts must not silently overwrite existing artifacts; use safe suffixing where needed.
- Generated previews must be visible before save.
- Save result must show written Markdown and JSON paths.
- Repository Reconciliation saved output must capture the required reconciliation fields including implemented state, missing items, stale planning items, risks, roadmap, milestones, phases, and next phase.
- Phase Planning Documents output must include phase brief, goal, user/operator outcome, scope, out-of-scope items, affected workflows, source context, reconciliation summary, Architect interview summary, assumptions, risks, dependencies, validation expectations, recommended sequence, initial Work Card plan, open questions, and next action.
- Initial Work Card plan output must include proposal ID, title, problem, user outcome, included scope, out of scope, dependencies, risk level, validation items, suggested ordering, and notes for Architect/Implementer.
- The initial Work Card plan must remain a planning artifact and must not automatically create formal app-selectable Work Card JSON files.
- Existing Project Intake screen must continue to work.
- Existing Project Architect Interview screen must continue to work.
- Existing Project Planning Documents screen must continue to work.
- Existing Phase Intake screen must continue to work.
- Existing Phase Interview screen must continue to work.
- Existing Validate screen and Validation Target behavior must continue to work.

Acceptance criteria:
- WC06 Work Card JSON and Markdown artifacts are created.
- A visible Repository Reconciliation workflow appears in the app.
- The Operator can generate and copy a Repository Reconciliation Architect prompt.
- The Operator can paste completed Architect reconciliation output and preview the saved reconciliation artifact.
- Saving Repository Reconciliation creates paired JSON and Markdown artifacts under the approved project folder.
- A visible Phase Planning Documents workflow appears in the app.
- The Operator can select Project Planning Documents, Repository Reconciliation, Phase Intake, and optional Phase Architect Interview Prompt sources.
- The Operator can paste completed Phase Architect Interview output.
- A deterministic preview includes Phase Planning Documents, an initial Work Card plan, and phase-scoped backlog output.
- Saving writes paired Phase Planning Documents artifacts and paired initial Work Card Plan artifacts under the selected phase folder.
- Saving updates or creates a phase-scoped backlog artifact for the selected phase.
- Unsafe source filenames, traversal, arbitrary absolute paths, and unsupported source paths are rejected.
- Existing Project Intake, Project Architect Interview, Project Planning Documents, Phase Intake, Phase Interview, Validate screen, and Validation Target behavior remain available.
- No LLM API call, provider SDK, browser automation, database, auth, cloud, deployment, MCP, connector, phase closeout, formal Work Card auto-creation, release, package, installer, broad redesign, or legacy Builder path rename is added.
- `PROJECT_STATE.md` no longer says the next intended milestone is PH02 WC05.
- WC06 Implementer Report is created.

Validation plan:
- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run test:work-cards` if the build environment allows it.
- Run `git status --short` and review changed files.
- List remaining Operator manual validation steps in the WC06 Implementer Report without performing Operator acceptance.

Implementer Report:
- Create an Implementer Report under the legacy `planning/phases/phase-02/Builder_Reports/` folder and include commands run, validation results, security notes, git actions, and the recommended next Implementer task.
