# WRB01 Bundle Qualification Report

**Current disposition update (2026-09-25):** WRB01-R02-01 and WRB01-R02-02 are now complete. The earlier Repair01-only stop statement and R01 identity description below are historical; the final current identity and qualification evidence are recorded in the Repair02 addendum at the end of this report. Human Architect review is next. WRB02 has not started.

## Scope and checkpoints

The five WRB01 implementation cards and three Repair01 cards were executed sequentially on `dev`, with one attributable checkpoint commit for each completed card. Repair01 stops here for Architect review; WRB02 has not started.

| Card | Checkpoint | Result |
| --- | --- | --- |
| WRB01-01 | `c827a3a` | Established idempotent SPS Current Project registration and direct registration-based identity discovery. |
| WRB01-02 | `09cc5fe` | Added safe conventional Git adoption into a non-Git Project container with bare Repository metadata and sibling Main/Dev checkouts. |
| WRB01-03 | `d2eeb8b` | Added deterministic Greenfield managed Main/Dev baseline with tracked repository-root `.gitignore`. |
| WRB01-04 | `e217f29` | Wired landing IPC/preload/renderer entry to Current Project; Existing Project enters Hub, New Project enters Project Intake. |
| WRB01-05 | `287176637cc8784c4a9552e9305c5795884fbe97` | Removed current provider-generation discovery and zero-caller migration code/tests. The affected profile did not produce a final receipt; no affected-profile pass is claimed. |
| WRB01-R01-01 | `9fbb40456465d3724ca4ed3cb4a3384d43f4d48c` | Current identity now ignores abandoned Project rows, leaves old selected-repository state historical, and creates fresh SPS identity. Greenfield bootstraps managed source before registration and rejects an already-current Project. |
| WRB01-R01-02 | `e4a61b696913e9c2737e0fa09b565c988a7bfe34` | Adoption preserves dirty state on the current main/dev branch, supports a main-only baseline, and rejects unsupported branches before source movement. The repair profile exposed one unrelated legacy Work Intake fixture failure described below. |
| WRB01-R01-03 | Pending while this report is committed | Source Graph and Current Work Intake use managed Dev Git while Project metadata remains in SPS; Current Hub no longer exposes legacy Development/Issue recovery. Focused requalification passed; the broad affected profile was not run under the card's lean-test rule. |

## Final runtime path

Current Project identity is one SPS `ProjectResource` with resource type `source-repository` and locator `selected-project`. Historical Project rows, Workflows, and old `selected-repository` resources remain attached to their prior IDs and are not imported or attached to the new current Project. The current selection fails closed if multiple selected-project registrations exist.

Greenfield entry registers the Project container with Agent Harness, establishes or verifies the deterministic managed Main/Dev baseline, then registers the fresh Current Project SPS identity. A compatible managed baseline without SPS registration can finish entry. Existing Project registers Current Project first, then performs managed adoption. The Project container remains non-Git; `.champcity/repository.git` owns the shared Git metadata.

Managed adoption inspects the conventional repository's current branch before mutation. Main-current dirty state remains in Main; Dev-current dirty state remains in Dev. If main is current and dev is absent, only the copied metadata gains `refs/heads/dev`, at the exact Main revision. Other refs, remotes, and tags remain unchanged. Unsupported current branches fail before source movement.

The main-process Source Graph path resolves and validates the exact managed Dev checkout. Git branch/history and revision-detail reads use Dev; Current Project identity and structured workflow metadata use the Project container's SPS database. Current Work Intake branch inventory also comes from managed Dev. Missing, redirected, or non-Git Dev paths fail closed. Direct internal Source Control callers may omit the Project root for conventional single-root fixtures.

The Current Project Hub now offers Start Work and Source Control only. Its legacy Development and Issue recovery cards and Hub navigation handler were removed. WRB02 remains outside this bundle.

## Qualification evidence

- `npm run build` — normal Windows lane, exit 0. TypeScript and Vite build passed with the existing chunk-size advisory. The restricted lane returned the documented Vite/esbuild `spawn EPERM` and was not counted as a pass.
- Focused WRB01-R01-03 vertical suite: `node --test test/project-state/current-project-registration.test.cjs test/project-state/current-project-entry.test.cjs test/source-control/managed-project-source.test.cjs test/work-intake/greenfield-source-bootstrap.test.cjs test/source-control/source-graph-projection.test.cjs test/work-intake/structured-work-intake-capture.test.cjs test/renderer/workflow-hub-shell.test.cjs test/validation/capability-map.test.cjs` — normal Windows lane, 39 passed, 0 failed. It covers Current Project identity and entry, managed Main/Dev adoption/bootstrap, public Source Graph and known revision detail, SPS metadata availability, managed Dev Work Intake branch projection, no legacy Hub recovery, and capability-map integrity.
- `npm run validate:plan -- --profile repair --changes tmp/changes.json` — normal Windows lane, exit 0. The exact R01-03 path/capability preview selected 83 tests across 16 capabilities: 3 static, 12 fast, 16 affected-capability, and 52 integration tests, with a measured/estimated duration sum of about 528 seconds.
- `npm run test:repair -- --changes tmp/changes.json` — not run. The preview is a broad multi-minute legacy/dependency sweep and includes `test/source-control/source-lifecycle-package.test.cjs`, which failed during R01-02 repair validation because its old `selected-repository` fixture expects generic legacy Work Intake source state `ready` but receives `unprepared`. R01-03's focused Current Project Work Intake capture/projection tests pass. The card directs recording broad plans and focused evidence instead of repeating a historical sweep; no affected-profile pass is claimed.
- R01-01 repair profile: `npm run test:repair -- --changes tmp/changes.json` — normal Windows lane, passed, receipt status `passed`, 257,020 ms, no failure evidence.
- R01-02 repair profile: `npm run test:repair -- --changes tmp/changes.json` — normal Windows lane, exit 1 after 273,931 ms. Build and focused managed-source tests passed; only failure was the generic legacy Work Intake fixture detailed above.
- The focused R01-01 and R01-02 suite receipts and branch adoption results are recorded in their per-card Implementer Reports.
- No Electron launch, packaging, external service integration, or release qualification was performed; none is required by Repair01.

## Deferred validation item and final disposition

The generic legacy Work Intake fixture failure is outside the Current Project managed Dev projection and branch-adoption proof. Its owning workflow must update or disposition that fixture. It is preserved as a validation limitation, not attributed as a managed-adoption failure. The final focused WRB01 repair suite passes; the R01-03 broad affected profile remains unexecuted because its plan is too broad under the lean-test rule.

Repair01 implementation and checkpointing are complete. Human Architect review is the next required workflow step. Do not begin WRB02 before that review.

## Repair02 — Optional Source Foundation

Repair02 followed the cards sequentially, with one checkpoint per card:

| Card | Checkpoint | Result |
| --- | --- | --- |
| WRB01-R02-01 | `9d14f0d` | Separated the canonical Current Project registration marker from optional Repository identity. Non-Git Projects have no Repository resource; inactive, duplicate, and obsolete R01 markers do not select a Project. |
| WRB01-R02-02 | Pending while this report is committed | Completed optional-source entry and Hub behavior, source-neutral WIR readiness and projections, local-only Git adoption, fail-closed Source Graph access, and focused WRB01 requalification. See `Repair02/Reports/WRB01-R02-02_FINAL_QUALIFICATION_REPORT.md`. |

### Current runtime identity and source ownership

Current Project selection requires exactly one active `current-project-registration` ProjectResource on an active Project. A source-backed Project may also have one active `source-repository` ProjectResource with the managed Repository locator. A non-source Current Project is valid and carries no placeholder Repository ID. The obsolete R01 `source-repository + selected-project` marker remains historical and is not migrated.

Source Control appears in the Project Hub only when the Current Project has its optional Repository resource. Its desktop Source Graph and revision detail paths resolve repository identity from that resource and use the managed Dev checkout. Non-source Source Graph requests fail before managed Dev resolution. MCP Project-container access remains separate from Git checkout identity.

Work Intake Routing is source-neutral. Capture and retry return `source: not-applicable` for both source-backed and non-source Projects. A non-source Work Intake projection returns null Repository identity and no branches/current branch/suggested base. Routing decisions own no SourceBaseline, SourceBinding, SourceLine, or source checkpoint; routed substantive Workflows own source records where needed.

Conventional local Git adoption accepts a successful empty remote list and preserves it as empty. Existing source-backed Projects retain Main/Dev registration, refs, remotes, and dirty/untracked user state. Greenfield remains a fresh SPS Current Project with managed Main/Dev and tracked `.gitignore`.

### Final focused qualification

- `npm run build` — normal Windows lane, exit 0; TypeScript, Vite, and branding copy passed with the existing chunk-size advisory. The restricted run produced the documented Vite/esbuild `spawn EPERM`; the normal Windows rerun passed.
- `node --test test/project-state/current-project-registration.test.cjs test/project-state/current-project-entry.test.cjs test/source-control/managed-project-source.test.cjs test/work-intake/greenfield-source-bootstrap.test.cjs test/source-control/source-graph-projection.test.cjs test/work-intake/structured-work-intake-capture.test.cjs test/renderer/workflow-hub-shell.test.cjs test/source-control/source-lifecycle-package.test.cjs test/validation/capability-map.test.cjs` — final normal Windows focused suite passed 48/48.
- Repair-plan preview command: `npm run validate:plan -- --profile repair --changes tmp/wrb01-r02-02-changes.json` — normal Windows lane, exit 0; preview selected 97 tests (3 static, 12 fast, 21 affected-capability, 61 integration), estimated 775176 ms (~12m55s). The expanded profile was not run. The focused owned qualification above is the acceptance evidence for Repair02; no expanded repair-profile pass is claimed.
- No Electron launch, packaging, external integrations, or release qualification was run.

### Deferred runtime and disposition

The generic legacy Work Intake fallback remains only for the no-Current-Project `workIntake:submit` branch. The Current Project entry and routing path do not call it. Legacy provider-generation residue on that unreplaced fallback remains a later retirement task. Direct conventional-root source fixtures remain explicit internal compatibility paths; the Current Project desktop path requires managed Dev.

Both Repair02 checkpoints are complete. Human Architect review of WRB01 is the next step. Do not begin WRB02 before that review.
