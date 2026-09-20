# WIR04 Implementer Report

## Outcome and baseline

Work Card **WIR04 — Implement Universal Work Intake Capture and Canonical Persistence** passes focused automated acceptance. Final Operator UI judgment remains deferred to WIR23. The checkpoint hash is pending the single harness commit containing this report and will be recorded in the execution response.

- Verified approved `ChampCity_AI` working directory and Git top-level (`<PROJECT_REPO>`).
- Branch: `codex/work-intake-routing`, no upstream; `origin` configured. No bundle push/fetch/integration was performed.
- Starting head: `6445b3e6bac67ca74f5bda206742bec797d9ff59`, the verified WIR03 checkpoint, exact four-file set, and passing dependency report. Working tree/index were clean.
- Governing architecture remains at SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`. Project/Intake separation, concise capture, branch-before-persistence, and Markdown lineage requirements agree with the implementation.
- Inspected Project Intake service/contracts, App entry/capture paths, canonical metadata/writer/transaction services, containment helpers, IPC/preload, focused tests, and capability-map entries. No future card was loaded or implemented. Existing WC02/governance material was preserved.

## Attributable files

Created:

- `src/shared/workIntakeContracts.ts`
- `src/main/workIntake/workIntakeService.ts`
- `src/renderer/app/WorkIntakeWorkspace.tsx`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR04_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/App.tsx`
- `test/project-intake/project-intake-service.test.cjs`
- `test/project-intake/post-submit-review-state.test.cjs`

Deleted: none.

## Implementation and proof

- Each Intake has its own identity and canonical `planning/work-intake/intakes/<intake-id>.md`. A separate `planning/work-intake/PROJECT.md` supplies durable Project/repository identity, reused by subsequent Intakes. No JSON sidecars are created.
- Capture contains Project identity, work request, desired outcome, constraints, existing-source/planning indicator, optional evidence context, explicit selected base branch/commit, and WIR03 branch binding. Canonical source revisions reference the Project document's actual revision.
- WIR03 establishes/verifies the branch before an atomic canonical document transaction creates Project identity where needed and the first Intake. Read/projection APIs use the current branch's explicit binding; historical Project Intake is never inferred as active Work Intake. Historical documents are not rewritten or deleted.
- New Project entry opens universal capture in the selected repository. Existing Projects can open `Capture Work Intake` from the Hub. The screen asks for bounded work intent and an integration branch, with no route/Project Type choice. WIR22 retains ownership of making Start Work the canonical Hub design.
- Constrained preload methods invoke main handlers that resolve the selected repository themselves. Submission rejects unsupported fields, including a renderer-supplied repository path. Canonical reads/writes reject path traversal and redirected canonical paths; bounded inventory/read checks fail visibly.
- New Work Intake submission creates no generic Architect Interview prompt or route-specific planning output. Historical Project Intake APIs and review state remain available for existing-workflow compatibility; the new-Project front door uses the new submission path.
- Real main/preload handlers, application service, branch mechanics, and repository persistence were exercised together. Tests prove repeat Intake identity reuse, exact persisted branch binding, unchanged historical bytes, only the intended new Markdown files, no active-Intake inference, and transactional rollback after injected write verification failure. Rendered-form proof checks the intended capture fields and absence of route selection.

Intentionally not created: routing assessments/decisions, roadmaps, implementation execution, Git initialization/automatic commits or pushes, worktrees, dependencies, migrations, capability-map changes, or the service/browser refactor. A clean committed Git baseline remains mandatory, as established by WIR03; unsupported repositories receive a visible explanation.

## Validation

| Exact command | Lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0 |
| `npm run build` | Approved normal Windows | Exit 0 |
| `node --test --test-concurrency=1 test/project-intake/project-intake-service.test.cjs test/project-intake/post-submit-review-state.test.cjs test/characterization/desktop-project-repository-binding.test.cjs` | Approved normal Windows | Exit 0; 14 passed, 0 failed/skipped |
| `node --test --test-concurrency=1 test/renderer/workflow-hub-shell.test.cjs` | Approved normal Windows | Exit 0; 9 passed, 0 failed/skipped |
| `git diff --check` | Read-only restricted Windows | Exit 0 |

The additional shell suite is focused proof for the changed App entry. Normal process-heavy execution follows the already-observed WIR01 sandbox `spawn EPERM`; no redundant restricted retries. Product Git mutations used disposable fixtures. No external remote integration, Electron launch, or visual acceptance is claimed. Full regression remains reserved for WIR23; packaging was out of scope.

Test categories: existing Project Intake, post-submit history, Desktop repository binding, and shell proof reused unchanged. Three permanent cases were added within existing relevant suites: (1) Work Intake main/preload/service persistence and repeated Project reuse, (2) first-Intake atomic persistence/rollback, and (3) rendered universal capture. Their coverage gaps are new user-facing persistence/API and capture boundaries absent from historical Project Intake proof. No tests consolidated or retired.

## Checkpoint and safety

Intended message: `WIR04: Implement Universal Work Intake Capture and Canonical Persistence`.

Checkpoint set is exactly the ten files listed above. Staging and the single commit use the supplied ChampCity harness. Shell Git commands are read-only. No merge, rebase, push, tag, release, publication, or prior-card amendment.

The exact staged diff was inspected and `git diff --cached --check` passed. A bounded scan of staged file content for private-key headers, credential-shaped literals, and concrete home paths passed with no findings. Authored files use repository-relative durable references and no generated/dependency artifacts or archive imports. Generated build output stays ignored. The successful harness `pre_commit_scan` reported only eight unchanged, unstaged branding PNGs; no finding applies to this checkpoint. The final report is re-inspected after staging.

## Remaining validation and next action

No automated acceptance blocker remains. WIR23 owns final Operator UI review. Routing controls are intentionally absent until their owning cards; successful capture presents a saved confirmation and identifies routing assessment as next.

Verify the single WIR04 checkpoint and clean tree, then read WIR05 and its required dependency reports.
