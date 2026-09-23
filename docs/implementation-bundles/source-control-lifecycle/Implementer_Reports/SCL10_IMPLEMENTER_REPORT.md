# SCL10 Implementer Report

## Identity and scope

- Approved repository root: verified with `git rev-parse --show-toplevel` as the primary `ChampCity_AI` checkout; no workstation path is recorded here.
- Card: Work Card `SCL10`, Remove Legacy Gates and Qualify the Source Lifecycle.
- Predecessor: SCL09 checkpoint `6cb4dcd546c0101e9f6f5ad1adc9f884fbc946e7`.
- Branch and remote: `dev`, ahead of `origin/dev` by 51 commits before this card commit. No push was directed.
- Operator scope correction: leave projects that remain on legacy Markdown authority untouched. The existing legacy Intake admission behavior is therefore retained; SCL10 does **not** meet the card's universal no-dirty-tree-gate acceptance criterion. This exception is explicit, not an assertion that the live legacy path is qualified.

## Files

- Created: `test/source-control/source-lifecycle-package.test.cjs` and this report.
- Modified: `src/main/sourceControl/sourceGraphService.ts`, `src/renderer/app/sourceGraphLayout.ts`, `src/renderer/app/SourceControlWorkspace.tsx`, `test/source-control/source-graph-projection.test.cjs`, `test/renderer/source-control-graph-layout.test.cjs`, and `validation/capability-map.json`.
- Deleted: none.
- Intentionally not modified or created: legacy `workIntakeService` and `workIntakeBranchService`, new migration/cutover rules, renderer Git mutation, an agent-operated Git path, general worktree or multi-agent orchestration, web-client/Service Host cutover, and new dependencies. Ignored validation logs and generated build output remain outside source control.

## Implementation and evidence

The structured path's synthetic end-to-end fixture starts with an existing Project on structured authority and a dirty primary `dev` checkout. It captures a feature and two hotfix Work Intakes from the exact `dev` revision while preserving the current branch, HEAD, and dirty file. On the feature line it records a route decision, an implementation revision before review, a revision-requested Operator disposition, a revised implementation on the same line, and an accepted disposition. The exact feature head then fast-forwards into `dev`. A hotfix line creates an implementation revision, encounters a divergent target conflict, applies bounded Integration Repair, and integrates. Graph assertions confirm the five user source lines, three Work Intake bindings, target chronology, and integration states. This is an application-service fixture in a synthetic repository, not a live cutover or packaged Electron acceptance test.

The fixture exposed retained internal candidate refs in the graph inventory. The backend now excludes internal integration and MCP refs before applying the visible-line limit. The layout also draws an explicit semantic integration link when a fast-forward makes a work head part of the target's first-parent lane. The graph's legend describes that link. Focused projection and layout tests cover both corrections.

A source audit found no renderer direct Git/child-process mutation and no agent-session step in structured capture, route/implementation/disposition checkpoint, or integration services. Their normal Git mechanics run in main-process repository services. The legacy Markdown Intake projection and branch-establishment path still check global cleanliness/current branch. They were left unchanged under the Operator's direction. `STRUCTURED_STATE_QUALIFICATION.md` records that this package repository is not live cut-over because its read-only migration inventory found 23 canonical-document and 26 metadata conflicts. Consequently, the package does not establish that this checkout's current legacy Intake UI can accept dirty-checkout work.

## Validation

| Command | Execution lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows static/build | Passed after graph changes; TypeScript and Vite built. Existing Vite bundle-size advisory only. |
| `node --test test/renderer/source-control-graph-layout.test.cjs test/source-control/source-lifecycle-package.test.cjs` | Normal Windows focused renderer/application-service | Passed 5/5 after the graph corrections. |
| `node --test test/source-control/source-graph-projection.test.cjs test/renderer/source-control-graph-layout.test.cjs` | Normal Windows focused graph | Passed 7/7. |
| `node --test test/validation/capability-map.test.cjs` | Normal Windows catalog | Passed 5/5 after correcting catalog role order. |
| `npm run validate:plan -- --profile phase-close --changes tmp/scl10-changes.json` | Normal Windows planner preview | Passed. The final change list excludes legacy Intake files. |
| `npm run test:phase -- --changes tmp/scl10-changes.json` | Normal Windows phase-close | Passed: build and 431/431 tests in 64 files, zero failures/skips. Receipt `71996803-5e78-40c2-8069-78f7f34b8246`, `sourceStable: true`, 286306 ms. |
| `rg` audit for renderer Git/child-process calls and structured-service agent calls | Read-only source audit | Zero matches in the inspected surfaces. Legacy cleanliness/current-branch checks remain in the two unchanged legacy Intake services. |
| `git diff --check` and `git diff --cached --check` | Read-only source/staged checks | Passed before commit. |

The first phase run was intentionally interrupted after the Operator narrowed scope; it is not counted as validation. Earlier focused and catalog failures were corrected before the successful final profile. No external integration, live project cutover, packaged Electron acceptance, or Operator experiential validation was run. Those results are not claimed.

## Git and safety

The Operator directed one checkpoint commit for this card. Its hash is pending at report creation and will be reported after commit. The exact staged diff and staged secret, local-path, and generated-artifact scan were inspected before commit. No generated output, concrete workstation path, or credential content was staged. No push, merge, rebase, reset, clean, restore, stash, source-repository branch creation, or source-repository worktree creation was performed.

## Qualification limit and next task

The structured source lifecycle and graph are qualified by synthetic deterministic evidence. Universal Work Intake acceptance is **not** qualified: projects still on legacy Markdown authority retain the clean-checkout gate, and this repository has not passed live structured-state cutover. This is a known functional limit of the package in the current checkout. Leave those legacy projects untouched as directed. Final Architect/Operator review should assess this scoped result without treating it as release acceptance for legacy projects. Any later resolution of migration conflicts or legacy UI parity requires separate Operator direction.

General worktree provisioning and multi-agent execution remain explicitly deferred. The structured fixture prepares independent source refs without requiring either capability; no hidden worktree or multi-agent dependency was introduced.
