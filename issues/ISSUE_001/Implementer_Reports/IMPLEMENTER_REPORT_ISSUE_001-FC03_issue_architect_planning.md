# IMPLEMENTER REPORT - ISSUE_001-FC03 Issue Architect Planning

## Pass Type

Numbered Fix Card implementation pass for `ISSUE_001-FC03`.

## Repository State Inspected

- Repository path inspected: verified approved repo root (`<PROJECT_REPO>`).
- Branch inspected: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Starting state was dirty with prior FC02/Issue Resolution files and planning/design edits already present.
- Git mutation was not performed because FC03 explicitly forbids Git mutation.

## Files Created

- `src/renderer/app/IssueArchitectPlanningWorkspace.tsx`
- `test/issue-resolution/issue-architect-planning-service.test.cjs`
- `test/renderer/issue-architect-planning-workspace.test.cjs`
- `issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC03_issue_architect_planning.md`

## Files Modified

- `src/shared/issueResolutionContracts.ts`
- `src/main/issueResolution/issueResolutionService.ts`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/IssueResolutionRail.tsx`
- `src/renderer/styles.css`
- `src/shared/workspaceContracts.ts`
- `test/renderer/issue-resolution-shell.test.cjs`

## Files Intentionally Not Created

- No Issue JSON sidecars or canonical metadata records.
- No Development planning/current-workflow registry entries for Issue Architect Planning.
- No Issue Planning, Fix Card, Issue Validation, or Issue Close artifacts.
- No second embedded browser service, session, provider, or BrowserView subsystem.
- No package dependencies.

## Implementation Summary

FC03 makes `Architect Planning` the second functional Issue Resolution parent stage when the selected Issue has a readable `ISSUE_RECORD.md`. Intake remains functional, and Issue Planning, Fix Cards, Issue Validation, and Issue Close remain unavailable.

The Issue Architect workspace shows the selected Issue ID/title, Issue Record path and read-only evidence, Architect status, final `ARCHITECT_INVESTIGATION.md` target path, Prepare/Copy/Promote controls when no final investigation exists, the existing embedded ChatGPT browser panel, and an existing final investigation read-only when present.

## Issue Architect Service And Projection

`src/main/issueResolution/issueResolutionService.ts` now owns the Issue-domain Architect Planning projection and filesystem behavior:

- reads `issues/<ISSUE_ID>/ISSUE_RECORD.md`;
- detects `issues/<ISSUE_ID>/ARCHITECT_INVESTIGATION.md` without rewriting it;
- prepares one active temporary draft submission at `issues/Architect_Drafts/<submission-id>/architect-investigation.md`;
- validates only that active expected temporary draft;
- promotes a valid draft to `issues/<ISSUE_ID>/ARCHITECT_INVESTIGATION.md` with overwrite protection;
- clears a failed active submission so retry requires a fresh prepared submission;
- best-effort cleans the successful temporary draft submission.

## Navigation And Authority Proof

- Issue Resolution navigation uses `IssueResolutionRail`, not Development `NestedWorkflowRail`.
- `Architect Planning` availability is derived from the selected Issue Record readability, not from Phase or Work Card state.
- Issue entry in `App.tsx` refreshes Issue inventory and does not invoke `refreshDocuments`, `resolveCurrentDocument`, or Development current-workflow authority.
- Development-only lifecycle polling remains guarded by `isDevelopmentForeground`; Issue Architect Planning does not activate Development Architect-output polling.

## Embedded Browser Reuse Path

`App.tsx` broadens `shouldAttachEmbeddedArchitectSurface` so the existing Architect browser attaches when Issue Resolution is foregrounded and `activeIssueStageId === "architect-planning"`. The same `FigmaBrowserPanel`, `architectHostRef`, attachment coordinator, reload/retry controls, bounds sync, and `window.champcity.showArchitectBrowser/hideArchitectBrowser` path are reused.

No new browser provider/session/subsystem was added.

## MCP Handoff / Temporary Draft / Promotion Model

Prepare Handoff uses the shared MCP prompt helpers from `src/main/integrations/mcpWorkspacePromptContract.ts`:

- includes the shared MCP workspace binding block;
- includes exact Issue ID, Issue Record source path, final investigation path, and temporary draft path;
- instructs Browser GPT to inspect repository/runtime/test evidence through the bound ChampCity MCP workspace;
- requires the FC03 body-only Markdown headings;
- directs Browser GPT to call `artifact_toolbox.write_markdown_artifact` only for the temporary draft path with `overwrite: false`;
- explicitly tells Browser GPT not to write, overwrite, edit, or create the final investigation path directly.

Promotion validates substantive Markdown, exact selected-Issue H1, all required H2 sections, no application metadata delimiters, and no empty/placeholder sections before writing the final investigation.

## Existing Investigation Proof

`test/issue-resolution/issue-architect-planning-service.test.cjs` verifies an existing `ARCHITECT_INVESTIGATION.md` is projected as completed/read-only, disables handoff/promotion actions, and preserves file contents and timestamp.

## Temporary Fixture Proof

`test/issue-resolution/issue-architect-planning-service.test.cjs` verifies:

- copy fails clearly before Prepare Handoff;
- prepared prompt contains the Issue-specific source/target/temp paths and `overwrite: false`;
- prompt JSON never uses the final investigation as the `relativePath`;
- valid active draft promotes to the final path and cleans the temp draft;
- invalid draft rejects and requires a fresh prepared submission for retry;
- an existing final investigation is never overwritten.

## Commands Run And Results

- `pwd` - passed; verified approved repo root.
- `git status --short --branch` - passed; showed current feature branch and dirty/untracked files.
- Read required repository boundary, validation lane, Issue, FC02/FC03, report, and design authority documents.
- `npx tsc --noEmit` - passed, direct clean-room lane.
- `npx tsc` - passed, direct clean-room lane.
- `npx vite build` - sandbox failed with documented Vite/esbuild `spawn EPERM`; normal Windows lane passed.
- `npm run typecheck` - passed.
- `npm run build` - sandbox failed with documented Vite/esbuild `spawn EPERM`; normal Windows lane passed.
- `node --test test/issue-resolution/issue-architect-planning-service.test.cjs` - sandbox failed with documented `spawn EPERM`; normal Windows lane passed, 5 tests.
- `node --test test/renderer/issue-architect-planning-workspace.test.cjs` - sandbox failed with documented `spawn EPERM`; normal Windows lane passed, 3 tests.
- `node --test test/issue-resolution/issue-resolution-service.test.cjs` - normal Windows lane passed, 4 tests.
- `node --test test/renderer/issue-resolution-shell.test.cjs` - normal Windows lane passed, 4 tests.
- `node --test test/renderer/workflow-hub-shell.test.cjs` - normal Windows lane passed, 6 tests.
- `node --test test/renderer/agent-harness-settings-workspace.test.cjs` - normal Windows lane passed, 5 tests.
- `node --test test/lifecycle/nested-lifecycle.test.cjs` - normal Windows lane passed, 5 tests.
- `node --test test/browser/architect-browser-handoff.test.cjs` - normal Windows lane passed, 1 test.
- Optional `node --test test/renderer/architect-browser-attachment-coordinator.test.cjs` - normal Windows lane ran 11 tests, 10 passed, 1 failed due an unrelated/stale source-string assertion expecting a literal `aria-label="Select Project"` in `FigmaSidebar.tsx`.
- Safety scan over FC03 changed files - no new secrets or concrete local machine paths found; existing environment-variable references in `src/main/main.ts` were already present.

## Validation Performed

- Static typecheck.
- Electron/main/preload/shared TypeScript compile.
- Vite renderer bundle build.
- Focused Issue Architect service tests.
- Focused Issue Architect renderer tests.
- Existing Issue service, Issue shell, Workflow Hub, Settings, nested lifecycle, and Architect browser handoff regressions.
- Local path/secret scan over FC03 touched files.

## Validation Skipped And Reason

- Full historical `npm test` was not run. FC03 named focused suites and related regressions; broader suite execution was not required for this bounded pass.
- Electron live launch smoke was not performed. Operator live validation remains the required acceptance lane, and FC03 forbids terminating active ChampCity for validation.
- Real Browser GPT/MCP write-back was not performed by the Implementer. Automated tests prove the local prompt/projection/promotion contracts only.

## Git Actions Performed

- Read-only Git inspection only.
- No stage, commit, push, branch switch, pull, merge, rebase, tag, reset, clean, restore, or stash.
- Commit created: no.
- Commit hash: not applicable because FC03 forbids Git mutation.

## Security And Secret-Safety Notes

- No credentials, API keys, tokens, `.env` contents, or private material were added.
- No concrete local machine paths were written into this durable report.
- Renderer write authority remains constrained to typed Issue IPC; no arbitrary filesystem write method was exposed.
- Browser GPT is instructed to write only the temporary draft, never the final investigation path.

## Deviations And Blockers

- Deviation: none for FC03 implementation scope.
- Blocker: none for focused automated validation.
- Unrelated observed failure: optional `architect-browser-attachment-coordinator` suite has a stale source-string assertion in a file not modified by FC03. The directly relevant existing `architect-browser-handoff` regression passed.

## Operator Live Validation Required

1. `ISSUE_001` moves between Intake and Architect Planning and displays its existing investigation correctly.
2. An Issue without an investigation shows Prepare/Copy Handoff and the embedded ChatGPT surface.
3. The prepared prompt is Issue-specific and does not use Development Phase/Work Card language.
4. Settings and Workflows return to the correct Issue Architect context.
5. Entering Development and returning preserves both workflows' state.
6. Dark/Light and normal/narrow layouts remain usable.

## Residual Risks

- Automated tests cannot prove actual ChatGPT sign-in, embedded remote rendering, or MCP write-back.
- The optional stale Architect-browser attachment test should be repaired under the owning shell/browser test maintenance scope.
- Current working tree still contains pre-existing dirty/untracked FC02 and planning/design files outside this FC03 pass.

## Recommended Next Implementer Task

Return FC03 for Architect code/evidence review and Operator live validation. If accepted, proceed to `ISSUE_001-FC04` without implementing Issue Planning inside FC03.
