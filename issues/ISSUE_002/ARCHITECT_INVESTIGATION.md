# ISSUE_002 — Architect Investigation

## Purpose

Investigate the application-launch and project-entry experience reported in `ISSUE_002`, determine whether the reported problem should proceed through Issue Resolution, be treated as unsupported, or be reframed as Feature/Development work, and establish the bounded architecture direction without decomposing the correction into Fix Cards.

The investigation treats the Issue Record as a report rather than as proof. Repository evidence is used to distinguish the actual startup behavior, current project-selection authority, shell/workflow boundaries, existing tests, and accepted behavior that must be preserved.

## Issue Assessment

The Issue Record identifies a supported UX/design deficiency in the existing application shell.

The report is directionally correct but imprecise when it says the application opens to the “most recent project.” The current application does not maintain or rank a recent-project history. It persists one selected `workspaceRoot` in Electron user data and reloads that single selection when it remains valid. The renderer then foregrounds the Workflow Hub with that project already active; it does not automatically enter the prior Development lifecycle workspace.

That distinction does not invalidate the reported problem. On launch, a returning Operator is placed directly into project-bound application context, while the primary open/change/clear project controls are owned by the left sidebar. There is no first-class application landing/project-entry state that makes `Start New Project` and `Open Existing Project` the primary choices before project context is established.

The requested correction is bounded to top-level shell/project-entry behavior. It does not require a new product domain, multi-phase subsystem, independent workflow engine, or broad product expansion. Under the current Issue Resolution scope, supported UX/design deficiencies and missing bounded capabilities are corrective Issue work even when the current code is internally consistent with an earlier design decision. The absence of a previously defective landing-page code path is therefore not a basis for reframe.

Repository evidence also provides architectural support for a separate project-entry boundary: the broader multi-workflow architecture models the intended top-level flow as `Open App -> Select Project -> Workflow Hub`, and the Workflow Hub architecture already places Project Selection at the Application Shell layer rather than inside Development. The current implementation collapses that application-level project-entry concern into persisted project restoration plus Hub-sidebar controls.

## Repository Evidence Inspected

The following current evidence was inspected through bound workspace `champcity_ai`:

- `issues/ISSUE_002/ISSUE_RECORD.md` — source Issue report and requested landing-page outcome; source SHA-256 `8028337db032f4879f99193caeb2f8c27de535ebba88a1a68774b2a865afc920`.
- `planning/project/Design_Documents/MULTI_WORKFLOW_ORCHESTRATION_ARCHITECTURE.md` — broader application architecture. Its top-level application model is `Open App -> Select Project -> Workflow Hub`, with the selected project providing resource/artifact context and the selected workflow providing lifecycle/tool context; source SHA-256 `7597f635bb085531d0af1c135e6cd7b5c75d0125b7c8930fb4cfdcbfcaaf01ce`.
- `planning/project/Design_Documents/WORKFLOW_HUB_ARCHITECTURE.md` — current specific Hub architecture. It places Project Selection, Workflow Hub, Settings, and Active Workflow beneath the Application Shell; it also currently defines launch as restoring a valid previously selected project and showing the Hub, and assigns Hub-mode project controls to the left sidebar; source SHA-256 `53614eb032fc68b7e56f5e7cdbff69d2e8b30fefd9ca7c8674ff81a7eed47b76`.
- `planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md` — baseline confirmation that one selected repository is persisted in `<Electron userData>/workspace-settings.json`, that the selected repository becomes project repository authority, and that the renderer is currently a left-rail workspace-oriented shell; source SHA-256 `b4553406307558cceda709089f58c1412ac9348bf3a60567178587940d1433d4`.
- `src/main/workspaceSettings.ts` — production persistence and validation authority for one selected `workspaceRoot`. `readSelectedWorkspace()` reloads it, `saveSelectedWorkspace()` persists it, and `clearSelectedWorkspace()` deletes the persisted selection; source SHA-256 `1182b08d45ddcbbc92a16fb0ac3c5c9c45553eed7220957c135fe0491c62c7d4`.
- `src/main/main.ts` — current main-process runtime wiring for workspace selection. `workspace:get` reads the persisted selected workspace, `workspace:choose` uses the Electron directory picker and persists the chosen workspace, and `workspace:clear` delegates to the same workspace-settings authority. Main-process services also consume the selected workspace through the required-workspace boundary; source SHA-256 `461a652cbd2b1a754c91088ca2e8e8bec89117a2d5efb8b8ee6b77048150c478`.
- `src/preload/index.ts` — renderer bridge exposing the existing `getSelectedWorkspace`, `chooseWorkspaceFolder`, and `clearSelectedWorkspace` APIs rather than renderer-owned filesystem authority; source SHA-256 `95eee57c58109f2f084310584f4268339971275aba7d52a8be974f006d6e6a3a`.
- `src/renderer/app/App.tsx` — current top-level shell implementation. `ShellView` contains only `workflow-hub`, `workflow`, and `settings`; it initializes to `workflow-hub`, calls `getSelectedWorkspace()` during startup, hydrates that selection, and leaves no workflow active until explicit workflow entry. There is no independent landing/project-entry shell state; source SHA-256 `575285023fc72db3eb8813a06a6a2defe3ec5368cddf13f76a137b0ea5e66897`.
- `src/renderer/app/WorkflowHubWorkspace.tsx` — current central Hub behavior. With no selected workspace it renders only a textual `Select a project` prompt; with a selected workspace it renders peer workflow cards. It does not provide the requested first-class new/open project actions; source SHA-256 `5f0f61d455a9c8a264551624452531094be305d568122670bc1e0fc03585c0fc`.
- `src/renderer/app/figma/FigmaSidebar.tsx` — current shell sidebar. In Hub mode it intentionally owns Project open/change/clear, Settings, and Theme; in Development and Issue Resolution it preserves workflow-specific shell context. This confirms that project discovery is presently concentrated in the left pane; source SHA-256 `25eb276c69e0d496cd0dcbe8ca78f76f1d2be7f0dc485ac73f0446e6f8029410`.
- `src/shared/workflowHubContracts.ts` — current peer-workflow registry containing Development and Issue Resolution, confirming that the Workflow Hub is a project-bound workflow selector rather than project-creation authority; source SHA-256 `2ecb80014d46a6878f6389bb4655034e6e6088a016c66421019b834edd679a32`.
- `test/app-shell/app-shell.test.cjs` — test evidence that workspace settings accept a readable/writable empty repository, persist and reload the selected workspace through user data, and expose workspace selection only through the approved preload bridge; source SHA-256 `680c8501d07003f2a3aa3009d4cc1e60929bf445b4d76bec1a7da065bb96cd82`.
- `test/renderer/workflow-hub-shell.test.cjs` — focused shell evidence requiring project activation to stop at the Hub, Hub sidebar ownership of project controls, no Development lifecycle state in Hub mode, and explicit workflow selection before the Development resolver is invoked; source SHA-256 `39644472f8657a5ff916b1c74f9cca4c0d03e0f52894b9891c8c73e9f62a784b`.
- `test/renderer/issue-resolution-shell.test.cjs` — current peer-workflow evidence requiring Issue Resolution to retain its own rail/lifecycle authority and not invoke the Development resolver; source SHA-256 `a74dc861072d3ebad23ac8db23b94cc9983236eb2acc2c2ed501da6ce9ab3df9`.
- `issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC01_workflow_hub_shell_and_development_entry.md` — historical implementation proof explaining the intentional separation of shell Hub state from Development lifecycle authority and reporting successful focused/build validation at that implementation point; source SHA-256 `9f7495835809fd84f10ace4661c5a0b6613c465b62625f9ee133fedc2dc0894e`.
- Current Git status was inspected. The relevant Hub, shell, preload, main-process, design, and test surfaces are presently modified during ongoing `ISSUE_001` work, so historical validation reports are not treated as proof that the entire current dirty worktree has been revalidated. The current production and test sources themselves were inspected as the operative evidence.

Verified repository facts are distinguished from Issue claims. “Bad UX design leads to User confusion” is an Operator experience assessment, not something source code can independently prove. The repository does, however, verify the concrete conditions underlying that assessment: automatic rehydration of one persisted selected project, no dedicated project-entry shell state, a central no-project surface without new/open actions, and project controls located in the Hub sidebar.

## Confirmed Current Architecture

ChampCity A/I has one application-owned selected-project authority. The main process persists a single selected repository path in Electron user data and validates that path before returning it. The preload bridge exposes bounded workspace-selection IPC methods to the renderer. The renderer does not own repository selection or direct filesystem access.

The application shell is layered above workflow-specific lifecycle authority. Current shell state is limited to:

```text
workflow-hub
workflow
settings
```

When the application launches, renderer startup obtains the persisted selected workspace. If that selection is still valid, the project is rehydrated and the Hub is foregrounded. No Development or Issue Resolution workflow is automatically entered.

The Workflow Hub is project-context navigation. Once a project is active, it presents the registered peer workflows. Development and Issue Resolution remain independent workflow authorities beneath the Hub. Selecting Development invokes the existing Development resolver; selecting Issue Resolution uses the Issue-specific inventory and lifecycle surfaces without invoking Development authority.

Hub-mode project controls are deliberately implemented in `FigmaSidebar`: open/change project and clear project live there together with Settings and Theme. The central `WorkflowHubWorkspace` only displays a textual select-project state when no workspace is active and workflow cards after a project is active.

The broader architecture already separates Project Selection from Workflow Hub conceptually. Project selection establishes resource/artifact context; workflow selection determines what type of work is performed against that project. The implementation does not currently represent that project-selection layer as its own foreground shell state.

Project Intake remains the canonical authority for establishing project definition inside a repository. The selected repository becomes project repository authority, and an empty readable/writable repository is already a supported workspace selection according to current production validation and tests.

## Root Cause

The root cause is a top-level shell architecture deficiency: **project entry is an application-level responsibility, but it is not represented as a first-class application shell state.**

`ShellView` has no landing/project-entry state. Startup therefore begins at `workflow-hub`, immediately rehydrates the persisted selected workspace, and uses the Hub sidebar as the primary location for opening, changing, or clearing project context. The central no-project Hub surface does not provide direct new/open project actions.

This creates the reported discoverability problem even though the implementation is internally consistent with the current specific Hub startup design. A returning Operator can enter the application already bound to the previous selected repository without encountering an explicit project-entry decision, while the controls for changing that context are visually secondary in the left pane.

The architecture documents also expose the underlying boundary mismatch. The multi-workflow model describes `Open App -> Select Project -> Workflow Hub`, and the Hub architecture places Project Selection directly under Application Shell, but the current startup contract bypasses a visible project-selection step whenever persisted workspace state exists.

The problem is therefore not that Development is being resumed incorrectly and not that project persistence itself is defective. The problem is that persisted selection, active project context, and the launch destination are coupled in a way that removes the intended first-class project-entry surface.

## Required Architecture

The correction should introduce a dedicated application-level landing/project-entry state above the project-bound Workflow Hub. It must remain shell architecture and must not be added to the Development `WorkspaceId` lifecycle or to Issue Resolution lifecycle state.

On every fresh application launch, the foreground UI should be the landing/project-entry surface. That surface should occupy the primary application workspace without the left project/workflow sidebar or any Development/Issue Resolution navigation rail. It should present the ChampCity A/I identity and first-class `Start New Project` and `Open Existing Project` actions as the dominant Operator choices.

The launch landing state must be genuinely unbound from active project context. Merely hiding the sidebar while `workspace-settings.json` continues to make an old repository the effective runtime project would create a split-brain condition between the visible shell and main-process/MCP authority. The implementation must therefore distinguish remembered persistence, if retained for convenience, from the project that is currently activated for application work. No downstream project-bound service should silently operate against the previous repository before the Operator explicitly chooses a project-entry action.

`Open Existing Project` should reuse the existing main-process/preload workspace-selection authority and validation boundary. After a valid repository is explicitly activated, the application should enter the existing Workflow Hub with no peer workflow automatically selected. Development and Issue Resolution remain explicit choices from the Hub.

`Start New Project` must reuse existing repository/workspace validation and the canonical Project Intake authority rather than inventing a parallel project-creation model. Once the Operator establishes the new/empty writable repository, the explicit `Start New Project` action may route into the existing Development entry/resolver path necessary to reach Project Intake. Project Intake remains responsible for project name, purpose, desired outcome, project type, repository path, and creation of the minimum planning structure.

After project establishment, the existing project-bound shell may continue to expose project change/clear controls and Settings/Theme according to the accepted shell design. The correction is specifically the launch/project-entry boundary; it is not a replacement for the Workflow Hub or for workflow-specific navigation.

No recent-project list, project catalog, database, secondary project registry, new workflow type, or new lifecycle authority is required by this Issue. Those would be separate product decisions if later desired.

## Preservation Rules

- Preserve exactly one authoritative active project/workspace context across main process, preload, renderer, MCP binding, and downstream services. Do not create competing “landing project,” “selected project,” and “runtime project” authorities.
- Preserve the existing main-process ownership of workspace validation and persistence. Renderer UI must continue to use bounded preload/IPC methods rather than direct filesystem authority.
- Preserve the Workflow Hub as the project-bound authority for selecting among peer workflows after an existing project is opened.
- Preserve explicit workflow entry. Opening an existing project must not automatically enter Development, Issue Resolution, or any future peer workflow.
- Preserve Development lifecycle authority, its resolver, Phase/Work Card state, and Development-specific navigation. The landing page must not become a Development `WorkspaceId` or interpret Development lifecycle state.
- Preserve Issue Resolution as an independent peer workflow with its own rail, issue state, and disposition authority. The landing correction must not route Issue Resolution through the Development resolver.
- Preserve return-to-Hub navigation as navigation only; leaving a workflow for the Hub must not reset, close, or reinterpret workflow state.
- Preserve Project Intake as the canonical project-definition path. `Start New Project` must not duplicate Project Intake artifacts, planning initialization, or project authority.
- Preserve support for readable/writable empty repository selection unless a separate approved architecture explicitly changes that contract.
- Preserve existing artifact, registry, workflow-state, Git, execution, browser, and agent-session authorities. The landing surface is presentation and shell routing, not a new authority over those systems.
- Do not introduce a recent-project/history subsystem merely to satisfy this Issue. The reported “most recent project” wording does not describe an existing recent-project architecture and does not require one.

## Risks and Constraints

The primary architectural risk is hidden stale project authority. Current main-process services obtain the selected workspace from persisted workspace settings, and MCP binding can be derived from that selected project. A landing page that visually appears project-neutral while those services remain bound to yesterday’s repository would be more dangerous than the current UX. Project activation/deactivation semantics must therefore be explicit and testable across renderer and main-process boundaries.

Changing launch semantics intersects with persistence behavior that is currently covered by tests. Persistence itself need not be removed, but tests must distinguish persistence of remembered data from explicit activation for the current application session if those concepts are separated.

`Start New Project` must not become a second project-creation subsystem. Current architecture treats repository selection and Project Intake as separate authorities. The correction should compose those existing capabilities rather than creating a competing project model or writing planning artifacts directly from the landing surface.

Current focused Hub tests intentionally protect project activation stopping at the Hub, Hub/Development rail separation, and peer-workflow isolation. The correction will require focused test changes or additions for the new launch state, but those existing behavioral protections remain valid after project activation.

The current worktree contains ongoing `ISSUE_001` changes in the same high-risk shell surfaces, including `App.tsx`, `FigmaSidebar.tsx`, Workflow Hub contracts/workspace, main/preload wiring, design documents, and renderer tests. ISSUE_002 implementation must be based on the then-current production state and must not overwrite, revert, or silently supersede accepted Issue Resolution work from `ISSUE_001`.

The Issue Record specifies the no-left-pane landing concept and the two primary actions but does not require a recent-project list, automatic reopening shortcut, new storage model, or redesign of workflow-specific screens. Expanding into those areas would exceed the bounded correction.

## Architect Recommendation
Proceed in Issue Resolution

## Architect Conclusion

ISSUE_002 should proceed in Issue Resolution as a bounded application-shell UX/design correction.

The repository supports the reported condition: ChampCity A/I persists one selected workspace, reloads it at startup, has no dedicated project-entry shell state, and places the current project open/change/clear controls in the Workflow Hub sidebar. The application does not incorrectly resume Development; the defect is the missing first-class launch/project-entry boundary and the coupling of persisted selection to immediately active project context.

The requested landing page does revise the current specific Hub startup behavior, but that does not make it Feature/Development work under the Issue Resolution scope. It is a bounded correction to an existing shell responsibility, and the broader architecture already recognizes Project Selection as an Application Shell concern preceding the Workflow Hub.

The correction should add a project-neutral launch surface with first-class `Start New Project` and `Open Existing Project` actions, explicitly activate project authority only after Operator choice, reuse existing workspace selection and Project Intake authorities, and preserve the current Workflow Hub plus independent Development and Issue Resolution lifecycles once project context is established.