# EPGA-R04-R03-R03 Implementer Report

## Scope and repository verification

- Approved repository root: verified as `<PROJECT_REPO>` before any change.
- Card type and identifier: Repair Card `EPGA-R04-R03-R03`.
- Branch: `dev` in the primary checkout, as required by the repository contract.
- Remote status at start: `dev` was 197 commits ahead of `origin/dev`; no pull, push, rebase, merge, reset, clean, restore, or stash was performed.
- The Repair Card was implemented literally. The real ChampCity_AI Existing Project conversion was not retried.

## Implementation summary

The old Agent Harness quiescence dependency was removed from Existing Project conversion. `quiesceConventionalProjectModelAccess()`, its Agent Harness checkout-revocation behavior, its error classification, and the now-obsolete conventional rollback projection were removed. Conversion no longer calls Agent Harness, MCP, Service Host controls, or model-facing checkout registration before Source Control mutation.

The machine-owned coordinator is `src/main/core/projectSourceOperationCoordinator.ts`. It uses a per-Project filesystem lease namespace under `<userData>/source-operation-leases/<sha256-of-canonical-project-root>/`. Raw Project paths are not persisted in the lease namespace or owner records.

Cross-process atomicity is provided by atomic directory creation under a short-lived per-Project gate. Shared leases coexist. Exclusive acquisition establishes `exclusive-intent` while holding the gate, which prevents later shared acquisitions, waits for existing shared leases to drain, and then installs the exclusive lease. Acquisition is bounded and returns the machine-level `PROJECT_SOURCE_BUSY` condition before Source Control is called. Lease owners publish bounded PID/token/owner/heartbeat metadata; dead PIDs, expired heartbeats, and orphaned directories are deterministically reclaimed. Every production acquisition releases in `finally`. Each Project has an independent hash namespace, so unrelated Projects do not block one another.

The Agent Harness central tool-dispatch boundary now acquires a shared Project lease before bounded Project tool execution and releases it after checkout release. This deliberately covers all bounded registered-Project tool calls, including `repo_toolbox` mutations, every `git_toolbox` inspection/mutation, and checkout-bound test/release actions. Acquire/release is not exposed as an MCP tool and models do not participate in lock decisions.

The `project:applyExistingGitAdoption` path acquires the exclusive lease before the adoption service revalidates the exact plan or can create journal/candidate/Git/worktree state. It releases the exclusive lease after Source Control finishes, then performs downstream model-access projection. Agent Harness absence is therefore irrelevant to Git authority: focused product-path proof converted and registered a conventional Project with an unavailable Agent Harness, preserved completed Git state, and returned degraded model access for later retry.

Project entry now has one renderer admission controller, `admitExistingProject()`, with the sequence choose folder -> inspect source state -> classify conversion state -> require consent when needed -> apply the exact plan -> register Current Project. Landing Open Existing Project and sidebar Open/Change Project delegate to this same function. There is no sidebar raw-folder-to-Hub path.

Clear Project clears the selected workspace, Current Project, pending migration, and repository-derived state, then returns to landing/project selection. Cancel does the same. `activateWorkspaceSelection()` now rejects every Project destination when no `CurrentProjectRuntimeContext` is supplied, so Workflow Hub cannot be activated by a generic filesystem selection.

For the Project Intake repository control, V1 now binds `projectRepository` to the admitted Current Project root and does not invoke the generic folder chooser. Arbitrary repository rebinding is intentionally not supported by this repair.

## Files

Created:

- `src/main/core/projectSourceOperationCoordinator.ts`
- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair03/Repair03/Reports/EPGA-R04-R03-R03_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/main.ts`
- `src/main/modelAccess/projectModelAccessCoordinator.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/existingProjectEntryController.ts`
- `test/agent-harness/agent-harness-core.test.cjs`
- `test/project-state/current-project-entry.test.cjs`
- `validation/capability-map.json`

Deleted: none.

Intentionally not created: no dependency, migration, schema, JSON workflow sidecar, Project-tree lock state, MCP lock tool, compatibility path, Service Host control API, raw-path lease record, or generated artifact was added.

## Permanent proof

- Current Project entry owner proves shared operation A is active, exclusive conversion intent becomes visible, later operation B cannot acquire, conversion waits, A releases, conversion proceeds, B proceeds afterward, and unrelated Project C remains usable.
- A detached Node child holds the same shared lease namespace used by the parent process, proving cross-process Desktop/Service Host coordination.
- Synthetic dead-owner metadata proves stale ownership is reclaimed without a long wall-clock wait; lease namespace inspection proves the raw Project root is not persisted.
- Product-path conversion with an unavailable Agent Harness proves exclusive machine ownership and Source Control completion precede degraded downstream projection.
- Agent Harness core proof shows repository mutation plus Git inspection/mutation paths acquire and release shared application leases against the Project root, including failure paths.
- Renderer/controller proof shows sidebar delegation, canonical chooser/inspection order, no pre-consent Hub activation, Clear/Cancel landing behavior, null-Current-Project rejection, Greenfield separation, and Current Project-only Intake repository binding.
- Existing managed-source tests preserve source-neutral, managed-ready, conversion-failed, forced-normalization, journaling/recovery, Main/Dev, and source-preservation behavior.

## Validation evidence

| Command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | restricted automated lane | Exit 0. Production TypeScript passed. |
| `npm run build` | restricted automated lane | Exit 1 with the documented `spawn EPERM` from esbuild/Vite; recorded once and not treated as a source failure. |
| `npm run build` | approved normal Windows lane | Exit 0. TypeScript, Vite production build, and branding copy passed; Vite emitted only its chunk-size advisory. |
| `node --test test/project-state/current-project-entry.test.cjs test/agent-harness/agent-harness-core.test.cjs` | approved normal Windows focused owner lane | Initial run identified two obsolete expectations (pre-conversion Agent Harness ordering and a Git call missing the already-required checkout selector). The two corrected cases passed, followed by a complete 34/34 pass in 44.34 s. |
| `node --test test/source-control/managed-project-source.test.cjs test/work-intake/greenfield-source-bootstrap.test.cjs test/source-control/workflow-source-materialization.test.cjs test/agent-harness/source-control-service-boundary.test.cjs test/agent-harness/agent-harness-build-identity.test.cjs test/validation/capability-map.test.cjs` | approved normal Windows focused owner lane | Production owners passed. Aggregate result was 32/34 because the two capability-map assertions detected only deterministic ordering errors in newly added metadata; ordering was corrected. |
| `node --test test/validation/capability-map.test.cjs` | restricted automated lane | Exit 1 with test-runner `spawn EPERM`; recorded once. |
| `node --test test/validation/capability-map.test.cjs` | approved normal Windows lane | First metadata rerun exposed the remaining Current Project ordering position; after correction, final rerun passed 5/5. |
| `node --test --test-name-pattern "machine-owned shared source lease\|source-operation fence\|tool dispatch holds" test/project-state/current-project-entry.test.cjs test/agent-harness/agent-harness-core.test.cjs` | approved normal Windows focused owner lane | Final coordinator heartbeat-hardening rerun passed 4/4. |
| `npm run test:repair -- --changes tmp/epga-r04-r03-r03-changes.json --preview` | repair validation-plan preview | Exit 0. The planner classified the exact production, test, validation-map, and report paths and produced the repair selection without executing the broad suite. |
| `git diff --check` | local static safety lane | Exit 0. No whitespace errors; Git emitted only the existing line-ending normalization warning for `toolRegistry.ts`. |

The broad/full regression suite was intentionally not run because the Repair Card requires focused validation only. No Electron launch smoke, packaging, release qualification, external network integration, or real-project conversion was performed or claimed.

## Security, path, and boundary review

- No secret, token, credential, cookie, private key, or `.env` content was requested, printed, persisted, or added.
- Durable artifacts use repository-relative paths or `<PROJECT_REPO>`; no concrete local-machine or temporary path is recorded here.
- Lease state is outside Project repositories under user data and uses only a stable SHA-256 Project identity.
- Source Control production code does not import Agent Harness, MCP runtime, Service Host, or toolbox implementation modules.
- The neutral coordinator is under `src/main/core/`; repository and neutral Git/error placement remains intact.
- The exact staged diff and final secret/local-path/generated-artifact scan were performed before the checkpoint commit; the staged set contained only the ten attributable files, no generated output, no concrete local path, and no secret-shaped value.

## Git actions and checkpoint

The card-authorized checkpoint commit is pending at report creation. Required message: `EPGA-R04-R03-R03 use machine source fence and close project entry bypass`. Per repository policy, this report is not amended solely to insert the same commit's hash; the actual hash will be reported to the Operator after commit. No push is authorized or planned.

## Remaining review, risks, and next task

No implementation blocker remains. Architect review is required next. Residual risk is limited to Architect judgment of the filesystem lease policy and renderer experience; deterministic tests cover ordering, bounded acquisition, cross-process participation, stale recovery, independent Projects, admission routing, and post-conversion degradation. Operator/Architect must not retry the real ChampCity_AI conversion until this repair is accepted.
