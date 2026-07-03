# Work Card: Split Phase Map Builder and Phase Planning Documents Generator

## Work Card ID

WC07

Created: 2026-07-02T00:00:00.000Z
Updated: 2026-07-02T00:00:00.000Z

## Phase

phase-02

## Status

ready_for_builder

## What Problem Are We Solving?

The existing Phase Planning Documents workflow still couples phase mapping, phase selection, compatibility Phase Intake, and completed Phase Architect Interview output. That makes the operator choose from already-created phase artifact folders before the app has generated the formal phase map that should define future mapped phases.

## What Should This Accomplish?

Split phase mapping and phase planning into two distinct operator screens so the app first generates a formal Phase Map from approved project planning sources, then uses mapped phase records to generate Phase Planning Documents without requiring Phase Intake or pasted Phase Architect Interview output in the normal path.

## What Should the User Be Able To Do?

The Operator can generate or update a Phase Map from Project Planning Documents, Repository Reconciliation, and Project Roadmap sources, then select a mapped phase and generate durable Phase Planning Documents with optional inline clarification answers only when needed.

## What Is Included?

- Create WC07 JSON and Markdown Work Card artifacts under Phase 02.
- Add a dedicated Phase Map Builder screen.
- Add a dedicated Phase Planning Documents Generator screen.
- Remove phase-folder dropdown requirements from Phase Map Builder.
- Generate formal mapped phase records from Project Planning Documents, Repository Reconciliation, and Project Roadmap sources.
- Persist paired Phase Map JSON and Markdown artifacts under `planning/project/Phase_Map/`.
- Populate the Phase Planning Documents Generator phase selector from mapped phase records, not only existing generated phase artifact folders.
- Prefer the roadmap-recommended mapped phase as the default generator selection when available.
- Move Compatibility Phase Intake source, Phase Architect Interview Prompt source, and completed Phase Architect Interview output into an optional Advanced / Legacy section.
- Replace the normal-path completed-interview blocking validation with Phase Map and source-artifact validation.
- Allow optional phase-specific clarification answers after roadmap and reconciliation context has established the selected phase.
- Update relevant Phase 02 and project planning documents with the corrected flow.
- Update fixture/static validation coverage for Phase Map and mapped-phase-driven Phase Planning Documents generation.
- Create the required WC07 Builder Report under the legacy `Builder_Reports` folder.

## What Is Not Included?

- Do not call an LLM API.
- Do not add provider SDKs.
- Do not require Zapier.
- Do not add authentication, database, cloud, deployment automation, MCP, connector integrations, or provider-specific SDKs.
- Do not generate Phase 03 Work Cards.
- Do not treat WC07 as Phase 03 planning.
- Do not perform Operator acceptance or Human Validation closeout.
- Do not close Phase 02.
- Do not remove legacy Phase Intake or Phase Architect Interview compatibility artifacts.
- Do not perform a broad UI redesign.
- Do not rename legacy Builder storage folders or files.

## Requirements

- Renderer code must not directly read or write local files.
- All new reads and writes must go through constrained Electron main/preload IPC.
- Source selections must be safe basenames from approved folders.
- The app must reject unsafe filenames, traversal, arbitrary absolute paths, and unsupported source paths.
- Phase Map writes must stay inside `planning/project/Phase_Map/`.
- Phase Planning Documents writes must stay inside `planning/phases/<phase-folder>/Phase_Planning_Documents/`.
- Initial Work Card Plan writes must stay inside `planning/phases/<phase-folder>/Work_Card_Plans/`.
- Saving paired artifacts must not silently overwrite existing artifacts; use safe suffixing where needed.
- Phase Map records must distinguish existing generated phase artifacts, mapped roadmap phases, and planned phase document bundles.
- Mapped phase records must include project name/key, phase id, phase title, phase purpose or summary, source roadmap id, source reconciliation id, source planning document id, status, timestamps, source references, and optional notes, assumptions, risks, and unresolved questions.
- The normal Phase Planning Documents Generator path must not require Compatibility Phase Intake, Phase Architect Interview Prompt, or completed Phase Architect Interview output.
- If no Phase Map exists, the generator must clearly instruct the Operator to run Phase Map Builder first.
- If required source artifacts are missing, the UI must identify the missing source artifact rather than asking for interview output.
- The retired blocking message `Paste the completed Phase Architect Interview output first.` must not appear in the normal path.
- Existing Project Intake, Project Architect Interview, Project Planning Documents, Phase Intake, Phase Interview, Validate screen, and Validation Target behavior must remain available.

## How We Know This Is Done

- Separate operator screens or routes exist for Phase Map Builder and Phase Planning Documents Generator.
- Phase Map Builder does not show or require a phase dropdown.
- Phase Map Builder can operate from Project Planning Documents, Repository Reconciliation, and Project Roadmap sources.
- Phase Map Builder creates or updates formal mapped phase records.
- Phase Planning Documents Generator uses mapped phase records for phase selection.
- The normal generator path does not require Compatibility Phase Intake, Phase Architect Interview Prompt, or completed Phase Architect Interview output.
- Legacy Phase Intake and Phase Interview inputs, if retained, are optional and placed under Advanced / Legacy UI.
- The completed Phase Architect Interview output blocking message no longer blocks normal planning generation.
- If no Phase Map exists, the generator tells the Operator to run Phase Map Builder first.
- If source artifacts are missing, the UI identifies the missing source artifact.
- Planning documents record WC07 and the corrected flow.
- Automated validation passes using the documented validation lane or records any lane-specific failure clearly.

## How This Should Be Validated

- Read `docs/dev/VALIDATION_COMMAND_LANES.md` before running child-process-heavy validation.
- Run `node --check scripts/verify-work-card-fixture.mjs`.
- Run the documented validation lane, normally `npm run validate:codex` for the full check set.
- Run `git status --short` and review changed files.
- List remaining Operator manual validation steps in the WC07 Builder Report without performing Operator acceptance.

## Risk Level

medium

## Risks and Watch Items

- The renderer is still a large single-file React implementation, so scoped route changes must avoid unrelated UI churn.
- Phase Map persistence adds a new approved artifact folder, so path validation must remain narrow.
- Existing WC06 artifacts describe the old interview-required flow; WC07 must supersede that operator model without rewriting historical records.
- Planning documents can be mistaken for formal accepted Work Cards unless the UI and reports keep Operator acceptance boundaries clear.

## Builder Instructions

- Verify the repository path and Git root before editing.
- Read `AGENTS.md`, the WC07 prompt, Phase 02 planning files, main/preload IPC, shared work-card generators, renderer source, and validation lane documentation before implementation.
- Keep this pass limited to the Phase Map Builder / Phase Planning Documents Generator split and related planning documentation.
- Preserve Operator / Architect / Implementer terminology.
- Preserve legacy Phase Intake and Phase Architect Interview behavior as optional compatibility paths.
- Do not perform Operator manual validation or create accepted Human Validation records.
- Run required validation commands and document results in the WC07 Builder Report.

## Operator Notes

- WC07 is a Phase 02 corrective Work Card, not Phase 03 planning.
- Corrected flow: Project Planning Documents + Repository Reconciliation + Project Roadmap -> Generate Phase Map -> Select mapped phase -> Generate Phase Planning Documents.
- Phase Intake is not a normal operator input for the corrected flow.
- Phase Architect Interview is optional downstream clarification only after roadmap and reconciliation context establish the selected phase.
- The Operator owns final WC07 acceptance and any Phase 02 closeout update.

## Builder Handoff Prompt

Use this as the starting Implementer prompt. The section heading remains a legacy Builder handoff heading for artifact compatibility.

You are acting as Implementer for ChampCity A/I.

The Implementer may be Codex, Claude Code, Cursor, or another coding agent. Build only from this structured handoff and preserve the approved scope.

Before editing:
- Verify the repository path before editing. Expected repository: `<PROJECT_REPO>`.
- Read `AGENTS.md` and relevant planning files.

Work Card: WC07 - Split Phase Map Builder and Phase Planning Documents Generator

Goal: Split phase mapping and phase planning into two distinct operator screens so the app first generates a formal Phase Map from approved project planning sources, then uses mapped phase records to generate Phase Planning Documents without requiring Phase Intake or pasted Phase Architect Interview output in the normal path.

Scope:
- Create WC07 JSON and Markdown Work Card artifacts under Phase 02.
- Add a dedicated Phase Map Builder screen.
- Add a dedicated Phase Planning Documents Generator screen.
- Remove phase-folder dropdown requirements from Phase Map Builder.
- Generate formal mapped phase records from Project Planning Documents, Repository Reconciliation, and Project Roadmap sources.
- Persist paired Phase Map JSON and Markdown artifacts under `planning/project/Phase_Map/`.
- Populate the Phase Planning Documents Generator phase selector from mapped phase records, not only existing generated phase artifact folders.
- Prefer the roadmap-recommended mapped phase as the default generator selection when available.
- Move Compatibility Phase Intake source, Phase Architect Interview Prompt source, and completed Phase Architect Interview output into an optional Advanced / Legacy section.
- Replace the normal-path completed-interview blocking validation with Phase Map and source-artifact validation.
- Allow optional phase-specific clarification answers after roadmap and reconciliation context has established the selected phase.
- Update relevant Phase 02 and project planning documents with the corrected flow.
- Update fixture/static validation coverage for Phase Map and mapped-phase-driven Phase Planning Documents generation.
- Create the required WC07 Builder Report under the legacy `Builder_Reports` folder.

Out of scope:
- Do not call an LLM API.
- Do not add provider SDKs.
- Do not require Zapier.
- Do not add authentication, database, cloud, deployment automation, MCP, connector integrations, or provider-specific SDKs.
- Do not generate Phase 03 Work Cards.
- Do not treat WC07 as Phase 03 planning.
- Do not perform Operator acceptance or Human Validation closeout.
- Do not close Phase 02.
- Do not remove legacy Phase Intake or Phase Architect Interview compatibility artifacts.
- Do not perform a broad UI redesign.
- Do not rename legacy Builder storage folders or files.

Requirements:
- Renderer code must not directly read or write local files.
- All new reads and writes must go through constrained Electron main/preload IPC.
- Source selections must be safe basenames from approved folders.
- The app must reject unsafe filenames, traversal, arbitrary absolute paths, and unsupported source paths.
- Phase Map writes must stay inside `planning/project/Phase_Map/`.
- Phase Planning Documents writes must stay inside `planning/phases/<phase-folder>/Phase_Planning_Documents/`.
- Initial Work Card Plan writes must stay inside `planning/phases/<phase-folder>/Work_Card_Plans/`.
- Saving paired artifacts must not silently overwrite existing artifacts; use safe suffixing where needed.
- Phase Map records must distinguish existing generated phase artifacts, mapped roadmap phases, and planned phase document bundles.
- Mapped phase records must include project name/key, phase id, phase title, phase purpose or summary, source roadmap id, source reconciliation id, source planning document id, status, timestamps, source references, and optional notes, assumptions, risks, and unresolved questions.
- The normal Phase Planning Documents Generator path must not require Compatibility Phase Intake, Phase Architect Interview Prompt, or completed Phase Architect Interview output.
- If no Phase Map exists, the generator must clearly instruct the Operator to run Phase Map Builder first.
- If required source artifacts are missing, the UI must identify the missing source artifact rather than asking for interview output.
- The retired blocking message `Paste the completed Phase Architect Interview output first.` must not appear in the normal path.
- Existing Project Intake, Project Architect Interview, Project Planning Documents, Phase Intake, Phase Interview, Validate screen, and Validation Target behavior must remain available.

Acceptance criteria:
- Separate operator screens or routes exist for Phase Map Builder and Phase Planning Documents Generator.
- Phase Map Builder does not show or require a phase dropdown.
- Phase Map Builder can operate from Project Planning Documents, Repository Reconciliation, and Project Roadmap sources.
- Phase Map Builder creates or updates formal mapped phase records.
- Phase Planning Documents Generator uses mapped phase records for phase selection.
- The normal generator path does not require Compatibility Phase Intake, Phase Architect Interview Prompt, or completed Phase Architect Interview output.
- Legacy Phase Intake and Phase Interview inputs, if retained, are optional and placed under Advanced / Legacy UI.
- The completed Phase Architect Interview output blocking message no longer blocks normal planning generation.
- If no Phase Map exists, the generator tells the Operator to run Phase Map Builder first.
- If source artifacts are missing, the UI identifies the missing source artifact.
- Planning documents record WC07 and the corrected flow.
- Automated validation passes using the documented validation lane or records any lane-specific failure clearly.

Validation plan:
- Read `docs/dev/VALIDATION_COMMAND_LANES.md` before running child-process-heavy validation.
- Run `node --check scripts/verify-work-card-fixture.mjs`.
- Run the documented validation lane, normally `npm run validate:codex` for the full check set.
- Run `git status --short` and review changed files.
- List remaining Operator manual validation steps in the WC07 Builder Report without performing Operator acceptance.

Implementer Report:
- Create an Implementer Report under the legacy `planning/phases/phase-02/Builder_Reports/` folder and include commands run, validation results, security notes, git actions, and the recommended next Implementer task.
