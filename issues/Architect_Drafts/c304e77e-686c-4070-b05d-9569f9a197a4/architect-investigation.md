# ISSUE_002 — Architect Investigation

## Purpose

Investigate the reported application-launch UX in `ISSUE_002`, determine whether current behavior is a defect, unsupported claim, or a requested product/architecture change, and identify the governing shell/project-selection authority without decomposing implementation work into Fix Cards.

## Issue Assessment

**Assessment: Reframe as Feature/Development work. Do not proceed to Issue Planning as a corrective Issue.**

The Issue Record is partly accurate but imprecise about current behavior. The application does restore the single previously selected workspace when that stored selection remains valid. It does **not** currently derive a “most recent project” from a project-history list, and it does **not** automatically foreground the prior Development lifecycle. The renderer starts in the top-level Workflow Hub shell, restores the persisted selected-project context, and leaves `activeWorkflowId` unset until the Operator explicitly chooses a workflow.

The reported usability concern is therefore real as an Operator experience claim, but repository evidence does not show a defect against the accepted architecture. The requested replacement behavior — an application landing page with no left sidebar and prominent `Start New Project` / `Open Existing Project` actions — changes an accepted shell contract. Current architecture explicitly requires a valid prior project to be restored on launch and explicitly assigns project open/change/clear controls to the Workflow Hub left sidebar.

Accordingly, the Issue is not a failed implementation requiring root-cause correction. It is a request to revise top-level application UX and project-selection architecture and belongs in Feature/Development planning.

## Repository Evidence Inspected

Verified repository evidence inspected through bound workspace `champcity_ai`:

- `issues/ISSUE_002/ISSUE_RECORD.md` — source Issue claim and desired landing-page behavior; source SHA-256 `8028337db032f4879f99193caeb2f8c27de535ebba88a1a68774b2a865afc920`.
- `planning/project/Design_Documents/WORKFLOW_HUB_ARCHITECTURE.md` — current specific authority for shell state, startup/project-selection behavior, Hub sidebar ownership, Development entry, return-to-Hub behavior, UI ownership, and acceptance direction; source SHA-256 `53614eb032fc68b7e56f5e7cdbff69d2e8b30fefd9ca7c8674ff81a7eed47b76`.
- `planning/project/Design_Documents/MULTI_WORKFLOW_ORCHESTRATION_ARCHITECTURE.md` — broader authority establishing selected project as project/resource context and Workflow Hub as the peer-workflow selector; source SHA-256 `7597f635bb085531d0af1c135e6cd7b5c75d0125b7c8930fb4cfdcbfcaaf01ce`.
- `src/main/workspaceSettings.ts` — application-owned persistence and validation of one selected `workspaceRoot` in `workspace-settings.json`, plus clear-selection behavior; source SHA-256 `1182b08d45ddcbbc92a16fb0ac3c5c9c45553eed7220957c135fe0491c62c7d4`.
- `src/main/main.ts` — runtime IPC authority for `workspace:get`, `workspace:choose`, and `workspace:clear`, all delegated to the workspace-settings authority; source SHA-256 `9548628f9f4edf19defa8ede25f7afb8fdcd79b8dee0c6b716be933df7367f5a`.
- `src/preload/index.ts` — renderer bridge exposing `getSelectedWorkspace`, `chooseWorkspaceFolder`, and `clearSelectedWorkspace`; source SHA-256 `00ba4d3ad75e6af8cefbff3d6ef08134344f80bfc03d34c3944c5878cbc5eb90`.
- `src/renderer/app/App.tsx` — current shell routing. `shellView` initializes as `workflow-hub`; startup calls `getSelectedWorkspace()`, restores a valid selection, explicitly leaves the shell at `workflow-hub`, and sets no active workflow. Development is entered only through explicit workflow selection; source SHA-256 `b64b563ff184ccfc175523eb3c87bd15ad30a18bb5012f27713c0c810ce27b28`.
- `src/renderer/app/WorkflowHubWorkspace.tsx` — current Hub workspace: no-project state asks the Operator to select a project; selected-project state presents registered workflow cards; source SHA-256 `5f0f61d455a9c8a264551624452531094be305d568122670bc1e0fc03585c0fc`.
- `src/renderer/app/figma/FigmaSidebar.tsx` — current Hub-mode sidebar intentionally owns Project open/change/clear, Settings, and Theme while omitting Development Phase/Work Card state; source SHA-256 `d205e94810ba9811914400b09d5cb1a6f11095274fb156b68623e3fb5921e2c3`.
- `src/shared/workflowHubContracts.ts` — registered peer-workflow contract currently exposing Development and Issue Resolution; source SHA-256 `2ecb80014d46a6878f6389bb4655034e6e6088a016c66421019b834edd679a32`.
- `test/renderer/workflow-hub-shell.test.cjs` — focused test evidence requiring: the no-project Hub to expose project selection without Development lifecycle status; the selected-project Hub to render workflow cards; Hub sidebar ownership of project controls; Development rail ownership only while Development is foregrounded; project activation to remain at the Hub; and Development resolver invocation only after explicit Development entry; source SHA-256 `39644472f8657a5ff916b1c74f9cca4c0d03e0f52894b9891c8c73e9f62a784b`.
- Current Git worktree status and diff were inspected. Relevant shell/design/test files are presently modified as part of ongoing `ISSUE_001` Issue Resolution work. Those changes extend the Hub with Issue Resolution but do not establish evidence that the ISSUE_002 launch behavior is an accidental regression. The startup restoration and Hub/sidebar architecture remain coherent across design, production source, and focused tests.

Issue claims and inference were not treated as verified repository facts. In particular, “bad UX design leads to User confusion” is an Operator/product judgment rather than a repository-verifiable defect condition.

## Confirmed Current Architecture

The application has one application-owned selected-project context. `workspaceSettings.ts` persists a single `workspaceRoot`, validates that it still exists and is readable/writable, and returns that selection through the main-process `workspace:get` IPC route. There is no current recent-project history or separate “last opened project” registry in the inspected authority.

The shell has a routing layer above workflow-specific workspaces:

```text
workflow-hub
workflow
settings
```

Project selection is context, not itself a workflow. When `shellView = workflow`, `activeWorkflowId` identifies the foreground workflow.

Application launch is intentionally defined as:

```text
Open App
→ restore previously selected project when still valid
→ display Workflow Hub
→ no workflow foregrounded
```

If no valid project is selected, the application remains in the no-project Workflow Hub state and the primary workspace asks the Operator to select a project.

The Workflow Hub is intentionally not a blank landing screen. Its left sidebar is part of the accepted design and owns exactly the shell-level Project, Settings, and Theme controls. In Hub mode, project open/change/clear is therefore expected to live in the left pane.

The Hub workspace itself owns top-level workflow selection. Once a project exists, it renders registered workflow cards. Development does not become navigation authority until the Operator selects the Development card. At that point the existing Development resolver determines the current Development workspace and Development-specific rail. Returning to the Hub is navigation only and must not reset Development state.

This separation is already encoded in current production code and is explicitly protected by focused renderer tests.

## Root Cause

There is no confirmed implementation defect root cause.

The root cause of the reported UX experience is the **accepted shell design decision** to treat the selected project as persistent application context and to make project switching a compact shell-level responsibility of the Workflow Hub sidebar. Because a valid prior project is restored automatically, the Operator does not see the Hub’s central no-project `Select a project` state on each launch; project creation/opening remains discoverable primarily through the Project controls in the left pane.

That behavior is consistent with the current governing architecture and current implementation. Replacing it with a mandatory launch landing page is therefore an architecture/product change, not a correction of code that departed from authority.

## Required Architecture

No corrective Issue architecture is authorized because the Issue should be reframed rather than advanced to Fix Cards.

If the requested UX is carried forward through Feature/Development planning, the intended architecture should be treated as an explicit revision to the top-level shell contract:

- introduce a dedicated application landing/project-entry surface above the project-bound Workflow Hub, or intentionally revise the current Hub launch state to serve that role;
- on initial application launch, present a single primary landing workspace without the current project sidebar;
- make `Start New Project` and `Open Existing Project` first-class primary actions rather than secondary sidebar affordances;
- after project establishment, route to the Workflow Hub and preserve the existing separation between project selection and workflow selection;
- do not use the landing-page change to auto-enter Development, Issue Resolution, or any other workflow;
- preserve one application-owned selected-project authority across main, preload, renderer, MCP binding, and downstream services rather than introducing a second competing “landing selection” state;
- route `Start New Project` into the existing project/workspace and Project Intake authorities rather than creating a duplicate project-planning subsystem;
- explicitly redefine persisted-project startup semantics as part of that Development decision, because the requested landing behavior conflicts with the current requirement to restore a valid prior selected project directly into the Hub context.

This is architecture direction only. It does not decompose implementation into Fix Cards or prescribe a particular component hierarchy.

## Preservation Rules

Any future landing-page Development work must preserve the following accepted behavior and authority unless separately and explicitly revised:

- Workflow Hub remains the authority for choosing among peer workflows after a project is established.
- Selecting or opening a project must not implicitly enter Development.
- Development remains governed by the existing Development resolver, lifecycle state, and Development-specific navigation rail.
- Issue Resolution remains a peer workflow with its own navigation/lifecycle authority and must not inherit Development rail semantics.
- Returning to shell-level navigation must not reset, close, reinterpret, or rewrite Development or Issue Resolution artifacts.
- The application must retain one authoritative selected-project/workspace context; UI state must not diverge from main-process workspace authority or MCP workspace binding.
- Existing artifact, registry, workflow-state, Git, execution, and agent-session authorities must not be duplicated by the landing-page implementation.
- A `Start New Project` affordance must reuse the canonical Project Intake path for project definition rather than bypassing or replacing it.

## Risks and Constraints

Changing startup behavior affects more than visual layout. The current persisted selected workspace is consumed by main-process services through `readSelectedWorkspace()` / `getRequiredWorkspaceRoot()`, and MCP workspace binding is derived from the selected project. A new landing state must therefore avoid creating a hidden mismatch where the UI appears unbound while runtime services remain bound to an old project.

The requested `Start New Project` action introduces a semantic distinction that the current shell does not expose. Current workspace selection is fundamentally folder selection; Feature/Development planning must define how a new repository/workspace is established before Project Intake without creating a second project authority.

Current focused Hub tests encode the accepted sidebar and project-activation behavior. Implementing the requested landing page as a “fix” while leaving those authorities unchanged would create contradictory requirements. The governing design and tests must be intentionally revised together if the feature is approved.

The worktree is currently active with `ISSUE_001` implementation changes to the Workflow Hub/Issue Resolution surfaces. ISSUE_002 landing-page work should not be folded into those Fix Cards or treated as a repair of that implementation; doing so would mix a separate product-design change into the Issue Resolution bootstrap scope.

## Architect Conclusion

**Reframe ISSUE_002 into Feature/Development work. Do not proceed to Issue Planning.**

The repository confirms that ChampCity A/I intentionally restores a valid persisted selected project on launch, foregrounds the Workflow Hub rather than Development, and places project open/change/clear controls in the Hub sidebar. Current production code and focused tests conform to that accepted architecture.

The requested no-sidebar landing page with first-class `Start New Project` and `Open Existing Project` actions is a legitimate UX/product direction, but it requires an intentional revision of the top-level application shell and persisted-project startup contract. It is not evidence-derived corrective work beneath the current Issue Resolution authority.