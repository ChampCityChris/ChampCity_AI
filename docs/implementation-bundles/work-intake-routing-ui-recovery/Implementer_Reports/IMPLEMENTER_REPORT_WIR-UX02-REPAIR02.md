# WIR-UX02-REPAIR02 Implementer Report

## Scope and repository

- Card: active Repair Card `WIR-UX02-REPAIR02`.
- Approved repository root: verified in the `Dev` Git checkout by `git rev-parse --show-toplevel`, `AGENTS.md`, and source inspection.
- Branch: `dev`; `origin` is configured and the branch has no upstream tracking entry. No push was performed.
- Pre-existing unrelated working-tree changes were left untouched. This card modifies `src/renderer/app/StructuredWorkRoutingWorkspace.tsx`, `src/renderer/styles.css`, and `test/renderer/work-intake-routed-workspaces.test.cjs`, and creates this report. No files were deleted. No new API, dependency, schema, migration, Project State, source-control, or Agent Harness artifact was created. A temporary validation change-set input was removed after the preview.

## Implementation and behavior

- A pure `structuredRoutingViewState` helper covers empty, pending, current, stale, revision-requested, routed, and closed states. The stale state keeps the historical Routing Assessment document visible while removing all route-decision controls. Its decision panel labels the old recommendation as previous and stale, explains why a decision is unavailable, and offers an enabled primary **Prepare Current Assessment** button plus **Back to Workflows**.
- The stale recovery button, browser **Prepare Handoff**, and **Prepare Revised Assessment** all call the existing `run("prepare")` path and `prepareStructuredWorkRouting(intakeId, routingWorkflowId)`. The returned model is set in the mounted workspace. Human-facing feedback says the current Architect handoff is ready, and the returned `preparedInstruction` enables **Copy Handoff**.
- A returned `waiting-for-drafts` or `partial-draft-set` submission starts the existing 1500 ms poll. Each authoritative read updates the same mounted workspace. Promotion to a fresh assessment restores Accept, Override, and Request Revised Assessment controls without re-entry or manual Refresh. The poll stops on promotion or any other non-pending state, closure, target creation, or unmount; it prevents overlapping reads. Read failures surface an error and leave polling available for retry. A returned promotion failure is shown through the model error alert.
- Current-assessment behavior remains: Accept permits empty prose; Override needs a distinct route and rationale; Revision needs instructions. The service's stale identity, record-version, managed Dev revision, and exact Operator checks were not changed.
- Accept and Override use `routeStructuredWIRTarget(..., "live-decision")` to call `onRouted` with the returned exact target ID. The App callback calls `openRoutedTargetWorkflow`, refreshes inventory, reads that exact Workflow, sets its type and ID, and foregrounds `workflow-instance`. Revision returns no target and stays in Routing. Load and passive refresh do not call `onRouted`; explicit **Open routed Workflow** does.
- Routing browser actions now distinguish enabled and disabled buttons with routing-scoped contrast, hover, focus, opacity, and cursor rules. The recovery CTA uses the existing primary routing button fill and states.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `node --test test/renderer/work-intake-routed-workspaces.test.cjs` | restricted Windows sandbox | `spawn EPERM` before test execution; not counted as a source failure or pass. |
| `npm run build` | restricted Windows sandbox | First run exposed a TypeScript nullability error; corrected before the normal-lane run. |
| `npm run build` | approved normal Windows | Passed TypeScript and Vite production bundle. Existing large-chunk advisory only. |
| `node --test test/renderer/work-intake-routed-workspaces.test.cjs` | approved normal Windows | Passed, 12 tests. Covers stale screenshot state, state matrix, shared preparation, mounted recovery and promotion, polling stop conditions, passive-navigation guard, live decision callback, and executable App handoff seam. |
| `node --test --test-name-pattern='structured WIR\|structured source-backed WIR' test/workflow/workflow-application-service.test.cjs` | approved normal Windows | Passed, 4 selected tests. Covers promotion, exact target creation, stale source authority, empty-prose acceptance, and Override/Revision input gates. |
| `npm run test:repair -- --changes tmp/wir-ux02-repair02-changes.json --preview` | restricted Windows sandbox | Passed plan preview. The plan includes a wider dependency closure; the card requires focused execution, so that broad planned suite was not run. Temporary input removed. |
| `git diff --check` | repository checkout | Passed. |

No live Electron visual acceptance was claimed. The seven Operator screen states in the card still need experiential inspection at the reported desktop width. Focused rendered-markup and CSS assertions verify presence, absence, enabled state, and styling contracts, but do not establish screenshot quality. No external Architect handoff or live target Workflow was used in this pass.

## Safety and checkpoint

- The exact staged paths and staged diff were inspected. A bounded scan found no apparent secrets, concrete local-machine paths, or generated output in this card's staged changes.
- Required checkpoint: `WIR-UX02-REPAIR02 add stale assessment recovery and preserve routed navigation`. The commit hash is pending in this committed report and will be supplied to the Operator after creation.
- Remaining step: Architect review and Operator visual acceptance of the live desktop states.
