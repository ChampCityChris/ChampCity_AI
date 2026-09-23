# Work Intake Routing UI recovery — final qualification

## Scope and outcome

Work Cards WIR-UX01 through WIR-UX07 were implemented in order on `dev`. The routed journey now uses a stage rail and dedicated task workspaces. The running Electron UI was inspected with isolated, synthetic project fixtures at 1280×720 and 1440×900. The final focused suite passed 127 tests; the affected work-item profile passed 31 selected test files with a stable source snapshot.

The route is ready for **Operator dogfooding** of the UI journey. The Operator should still judge the feel of the real embedded Architect interaction, a live Codex run, and whether the long document and repair flows are comfortable in a real project. The isolated visual fixtures did not execute an external Architect or model run.

## Workflow change

| Before recovery | After recovery |
| --- | --- |
| A routing or planning screen nested later lifecycle panels and exposed service controls out of task context. | Intake → Routing → Assessment → Plan → Execution → Integration, with available stages derived from current workflow evidence. |
| Work Item progression appeared within one large execution panel. | Execution opens Work Item Map, then Planning, Implement, Review & Validation, Repair when requested, Close / Next, and Acceptance when required. |
| Research completion inherited Plan assumptions. | Approved Research assessment proceeds directly to Research Integration; Plan and Work Item execution remain unavailable. |
| Issue handling appeared as a second routed workflow. | Routed Issue opens the existing Issue Resolution rail and returns to Work Intake Integration after Issue Close. |
| Decomposition and Integration Repair were difficult to locate in the surrounding flow. | Decomposition is a contextual Architect workspace returning to the selected map candidate; Integration Repair has an in-product Implementer and explicit Operator-decision state. |

## Components and patterns

Retired the obsolete `RoutedExecutionPanel` and its nested lifecycle composition. Retired the raw Integration Repair JSON patch transfer UI and the separate `research-routed-integration` renderer test file. No replacement Issue RCA/Fix Card renderer was added under Work Intake.

The workspaces reuse the stage rail, shared document and embedded browser shell, existing Architect handoff controls, shared Codex execution actions and console, Work Card review and repair presentations, and the existing Issue Resolution workspaces. WIR-UX07 kept long request text available in a native disclosure while shortening the Assessment header, moved technical Work Card paths behind a file-location disclosure, translated the map's `ready` stage to “Ready to begin,” and exposed a visible jump to the Integration Repair Implementer.

## Permanent proof disposition

`test/renderer/work-intake-routed-workspaces.test.cjs` is the primary routed renderer owner. It covers the ordinary planned route, Research's direct Integration route, the Issue bridge and return, accepted decomposition, and Integration Repair's in-product action with exact candidate and repair identity. The former Research test's distinct assertions moved into this owner; its separate file was removed. Assertions requiring old nested component identities were retired. The route-decision proofs in `test/architect-outputs/architect-output-workspace-repair.test.cjs` were retained because they verify application authority, revision, branch, and lineage behavior that the renderer owner does not duplicate. `validation/capability-map.json` was updated for the new test inventory and proof locators.

## Validation and visual evidence

| Check | Result |
| --- | --- |
| `npm run build` | Passed in the normal Windows lane; TypeScript, Vite, and asset copy. Vite emitted its existing large-chunk advisory. |
| Focused `node --test` routed, Issue, Work Card, Codex presentation, route-decision, and capability-map owners | Passed: 127 tests, zero failures. |
| `npm run validate:plan -- --profile work-item --changes tmp/wir-ux07-changes.json` | Passed: 31 selected test files and a build. |
| `npm run test:affected -- --changes tmp/wir-ux07-changes.json` | Passed: receipt `11339f3e-f6ce-481b-b723-7de0e5ac6e67`; 31 selected results, zero failure evidence, stable source snapshot. |

The running Electron app was inspected using isolated project fixtures. Local screenshots were captured under ignored `output/playwright/` for Intake, Routing, Assessment, Work Item Map and Planning, running Implementer, Research Integration, repair-required Integration, running Integration Repair, and the Operator-decision state. Key captures include `wir-ux07-assessment-after-fix-1280x720.png`, `wir-ux07-work-item-planning-1280x720.png`, `wir-ux07-click=Continue Work Item-1280x720.png`, `wir-ux07-research-integration-normal-1440x900.png`, and `wir-ux07-integration-repair-running-1280x720.png`. These screenshots are local visual evidence, not committed artifacts. The asynchronous Implementer and Integration Repair screens used a temporary status-projection injection into ignored compiled output; production bundles were rebuilt afterward and contain no injection. The screenshots show the real Electron renderer and styling, but do not prove live Codex execution.

At 1280×720, inspected screens had no document-level horizontal overflow. Primary controls were visible without hover, blocked stage buttons carried explanatory titles, and separate document/browser columns retained scroll ownership. Native buttons, selects, and disclosure summaries provide keyboard focus targets. Long request text remained available through the disclosure; technical paths and attempt IDs were made secondary to task labels. Revision and validation Repair controls are covered by the permanent renderer proof. A subsequent CDP capture of the validation Repair screen could not complete because the isolated renderer target stopped answering CDP commands after relaunch; there is no running-UI screenshot for that screen. Its full interaction still merits Operator dogfooding in a real project.

## Remaining UI debt

- The real embedded Architect page and live Codex approval/input states need experiential review in an actual project; isolated fixtures cannot judge their response timing or content quality.
- Long document reading, revision requests, and validation Repair should be exercised by the Operator with representative real content. The automated UI inspection establishes layout and controls, not final usability acceptance.
- The renderer bundle still triggers Vite's large-chunk advisory; there is no functional build failure from that advisory.
