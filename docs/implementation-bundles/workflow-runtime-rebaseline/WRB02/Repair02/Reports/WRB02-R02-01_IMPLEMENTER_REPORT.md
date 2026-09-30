# WRB02-R02-01 Implementer Report

## Scope and repository

- Card: Repair Card WRB02-R02-01, stable Workflow Hub launcher.
- Verified approved repository root: the primary `Dev` checkout (`git rev-parse --show-toplevel`); branch `dev`; `origin` is configured. No push was performed.
- Existing unrelated working-tree changes were present before this repair and were left untouched.

## Implementation

The Hub now renders exactly eight fixed cards in this order:

1. Work Intake Routing
2. Greenfield Project
3. Feature / Capability
4. Refactor / Migration
5. Integration / Composition
6. Issue Resolution
7. Infrastructure / Platform
8. Research / Prototype

The canonical `WORKFLOW_TYPE_REGISTRY` owns each card's label, concise purpose, order, entry workspace, and repeatability. The purpose statements are:

| Workflow | Purpose |
| --- | --- |
| Work Intake Routing | Use when you are not yet sure which workflow should handle the work. |
| Greenfield Project | Use to create and guide a brand-new project from initial intake through first project setup. |
| Feature / Capability | Use for adding or improving product functionality in an existing project. |
| Refactor / Migration | Use for structural changes, internal redesigns, upgrades, or migrations. |
| Integration / Composition | Use when combining systems, tools, services, or components into a coordinated solution. |
| Issue Resolution | Use to diagnose, repair, and validate defects, regressions, or broken behavior. |
| Infrastructure / Platform | Use for environment, platform, deployment, hosting, tooling, or operational foundation work. |
| Research / Prototype | Use to explore ideas, test feasibility, or develop proofs of concept before committed implementation. |

`WorkflowHubWorkspace` now shows only name, purpose, concise status, and navigation action. It has no inline title form, instance list, per-instance buttons, or creation state. The Project-level Source Control action and capability gate remain on the Hub. Three CSS grid columns at desktop width give the required 3/3/2 arrangement; narrower widths adapt to two or one column.

The new reusable `WorkflowTypeWorkspace` owns `Start New`, bounded 1–200 character title entry for direct-start types, current/history instance list, and exact-ID Open action. Existing `startWorkflow`, refreshed `listWorkflows`, and `getWorkflow` paths remain authoritative. Successful creation opens the exact returned Workflow in its existing Feature, Issue, or generic planning surface. `selectedWorkflowType` is separate from `selectedWorkflowId`; the Back path is exact Workflow → type surface → Hub. Settings return also preserves the type or exact surface.

Work Intake Routing opens its type surface without creating a Workflow. That surface offers New Work Intake and existing routing entries. The existing Work Intake save/routing contract still creates WIR identity, and exact saved WIR entries use the existing intake/summary surface.

Greenfield Project is always the second card. Authoritative `project-creation` Workflow inventory enables it and supplies the exact ID, including after completion or reopening through Existing Project entry. An inventory without Project Creation leaves the card visibly disabled with an existing/migrated applicability message. The card never starts or synthesizes a second Project Creation Workflow. Transient entry mode is not used as provenance.

This supersedes WRB02-02's Hub presentation requirements for inline direct-start forms and visible instance rows. Durable multi-instance Workflow persistence remains unchanged. The governing presentation is now Hub catalog → type intake/list → exact Workflow work.

## Files

- Modified: `src/shared/projectState/workflowTypeRegistry.ts`, `src/renderer/app/WorkflowHubWorkspace.tsx`, `src/renderer/app/App.tsx`, `src/renderer/styles.css`, `test/project-state/workflow-type-registry.test.cjs`, `test/renderer/workflow-hub-shell.test.cjs`.
- Created: `src/renderer/app/WorkflowTypeWorkspace.tsx` and this report.
- Deleted: none. Intentionally not created: persistence models, migrations, new APIs, dependencies, generated artifacts, and a second renderer workflow catalog.

## Validation

| Command | Lane and result |
| --- | --- |
| `npm run build` | Restricted sandbox: `spawn EPERM` at Vite/esbuild after TypeScript; rerun in normal Windows lane: pass, production TypeScript and Vite build. Final rerun after navigation adjustment: pass. |
| `node --test test/renderer/workflow-hub-shell.test.cjs test/project-state/workflow-type-registry.test.cjs test/workflow/workflow-application-service.test.cjs test/project-state/current-project-entry.test.cjs test/project-state/work-intake-routing.test.cjs` | Restricted sandbox: Node worker `spawn EPERM`; normal Windows lane: 69/70 passed. One existing Project entry controller fixture returned no adoption result and failed when its current contract read `sourceApplied`. The fixture was corrected in the touched renderer owner. Other 69 tests passed. |
| `node --test test/renderer/workflow-hub-shell.test.cjs` | Normal Windows lane after fixture correction: 24/24 passed. |
| `node --test test/renderer/workflow-hub-shell.test.cjs test/renderer/work-intake-routed-workspaces.test.cjs test/renderer/issue-resolution-shell.test.cjs` | Normal Windows lane: 33/33 passed, including the added Hub click proof. |
| `node --test test/renderer/workflow-hub-shell.test.cjs test/renderer/work-intake-routed-workspaces.test.cjs test/renderer/issue-resolution-shell.test.cjs test/project-state/workflow-type-registry.test.cjs test/workflow/workflow-application-service.test.cjs test/project-state/current-project-entry.test.cjs test/project-state/work-intake-routing.test.cjs` | Final focused normal Windows lane: 79/79 passed, exit 0. |
| `npm run validate:plan -- --profile repair --changes tmp/wrb02-r02-01-changes.json` | Repository preview lane: exit 0. The new type surface resolved to `renderer-navigation-and-presentation`; the plan also selected the expected Current Project, Workflow service, registry, and WIR owners. Preview only; the broad repair profile was not executed because the card requires focused validation. |
| `git -c core.safecrlf=false diff --check` | Repository Git lane: exit 0. |

Focused renderer proof verifies the exact card order and purpose text, eight-card count with 50 Issue instances, no Hub title form or instance rows, Source Control gating, Greenfield enabled/disabled states, type and Greenfield click actions, reusable type inventory, and WIR entry. Current Project entry and Project Creation identity/history, workflow application, and WIR service owners passed in the focused service run. Visual structure was inspected through rendered markup and CSS; no interactive desktop screenshot or Operator visual acceptance was performed.

## Checkpoint and remaining review

- Safety scan and exact staged diff review: performed immediately before checkpoint; only the eight repair files were staged, with no credential, local-machine path, or generated artifact found in the added content.
- Commit: pending; the card requires `WRB02-R02-01 reframe Workflow Hub as stable launcher`. The actual hash will be reported after commit without amending this report.
- Security/local path result: no credential, private path, or generated artifact in the checkpoint.
- Remaining Operator review: visually judge the launcher at desktop width, including the greyed Greenfield card for an Existing Project and the completed Greenfield card on reopen. No persistence or external integration behavior changed.
