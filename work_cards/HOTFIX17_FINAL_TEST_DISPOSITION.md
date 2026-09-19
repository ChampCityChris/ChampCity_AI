# HOTFIX17 Final Test Disposition

This records the disposition of the changes actually made in HOTFIX13–HOTFIX16, using their local Implementer Reports and commit diffs, and the subsequent HOTFIX18 Architect-review repair below. The original inventory did not exhaust the residual source-proxy population. This is not a new repository-wide regex audit. Categories can overlap within a file: a removed source proxy does not invalidate its retained behavioral assertions.

Provenance, in execution order:

- `a8d535395900fa1b1e30134c587bf4d5a894de4e` — HOTFIX13 retire lexical governance gates.
- `3476cdb59280ccc51add050bc6b6f5b6235a9e44` — HOTFIX14 replace backend source-proxy tests.
- `6c3247b0df00b98d4b3eaefe6dd03a60400a858a` — HOTFIX15 replace desktop wiring source-proxy tests.
- `147cf612a7bad86e69abb1ee2d1bab6ddb7259dc` — HOTFIX16 replace renderer source-proxy tests.

The accompanying guidance in `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` makes durable invariants the purpose of permanent regression tests, treats one-time inventories as Architect audit evidence to disposition and retire, rejects raw source text as semantic behavioral proof, and permits AST/module analysis when structure is itself the invariant.

## retained legitimate runtime/rendered regex

Existing regex against observable rendered HTML/text, error messages, paths/IDs, process receipts, HTTP/MCP responses, canonical documents, or exact package/installer contracts remains appropriate. No source snapshot or natural-language authority classifier was substituted.

- `test/app-shell/app-shell.test.cjs`: workspace validation, persistence, and session-selection contracts retained; residual source checks are dispositioned in the HOTFIX18 section below.
- `test/agent-harness/agent-harness-runtime.test.cjs` and `test/agent-harness/git-mutation-boundary.test.cjs`: runtime, OAuth/resource access, selected-workspace, synthetic Git, invalid-metadata, and mutation safety behavior retained.
- `test/agent-harness/agent-harness-process-boundary.test.cjs`: real Electron, worker/Service Host, lifecycle, recovery, and heartbeat behavior retained.
- `test/agent-harness/mcp-tool-contract-generation.test.cjs`: generation/session/capture counts and normalized OAuth scopes retained.
- `test/agent-harness/release-toolbox-boundary.test.cjs`, `test/agent-harness/repository-file-operations.test.cjs`, and `test/agent-harness/repository-io-hardening.test.cjs`: runtime errors/receipts, public schemas, path containment, byte integrity, bounded resources, and failure recovery retained.
- `test/agent-harness/service-host-power-recovery.test.cjs` and `test/agent-harness/sibling-process-launch.test.cjs`: lifecycle and launch behavior retained.
- `test/app-shell/native-product-identity.test.cjs`: generated branding byte equality and runtime identity retained.
- `test/browser/architect-browser-handoff.test.cjs`: bounds sequencing, attachment generations, secure repository-free service behavior, and notifications retained.
- `test/documents/planning-document-service.test.cjs` and `test/architect-outputs/architect-output-workspace-repair.test.cjs`: canonical Markdown, revision/staleness, atomic rollback, repair, and durable output tests retained.
- `test/packaging/windows-packaging-lifecycle.test.cjs`: executable lifecycle/lease checks and literal Windows package/NSIS configuration contracts retained. Exact installer switches/identity are structural packaging contracts, not prose-policy inference.
- `test/performance/disposition-transaction-collapse.test.cjs`: acquisition counts, stable generation assembly, promotion retry boundaries, and measured latency retained.
- `test/renderer/agent-harness-settings-workspace.test.cjs`: rendered Settings, navigation/form helpers, polling policy, and remediation callbacks retained.
- `test/renderer/architect-browser-attachment-coordinator.test.cjs`: controlled ACK, measurement, retry, generation, detach, and stale-completion tests retained.
- `test/renderer/codex-execution-presentation-ownership.test.cjs`: all three reducer ownership/stale-response tests retained.
- `test/renderer/evidence-driven-refresh-coordinator.test.cjs`: event bursts, in-flight waits, stale/domain filtering, idle time, foreground return, and cancellation tests retained.
- `test/renderer/figma-redesign-shell.test.cjs`, `test/renderer/workflow-hub-shell.test.cjs`, and `test/renderer/issue-resolution-shell.test.cjs`: rendered application, landing, Hub, rail/sidebar, and Issue intake behavior retained. Executed MCP preflight cases remain in the Hub suite.
- `test/renderer/issue-architect-planning-workspace.test.cjs`, `test/renderer/issue-planning-workspace.test.cjs`, and `test/renderer/issue-fix-card-workspaces.test.cjs`: rendered evidence, eligibility, unavailable/error states, browser actions, and shared execution/validation/repair presentations retained.
- `test/renderer/phase-map-presentation.test.cjs` and `test/renderer/project-rail-presentation.test.cjs`: rendered metadata/source views, complete phase inventory, identity counts, disposition predicates, rail state, and duplicate-evidence handling retained.
- `test/renderer/work-card-building-review-workspace.test.cjs`: runtime availability labels and actual model/reasoning picker click behavior retained.
- `test/renderer/work-card-close-workspace.test.cjs` and `test/renderer/work-card-map-workspace.test.cjs`: rendered projections, parsers, close-return orchestration, candidate errors, and default refresh behavior retained.
- `test/renderer/work-card-report-review-workspace.test.cjs`: rendered document selection, missing evidence, Operator controls, and absence of advisory copy within validation controls retained.

## replaced with behavioral test

- `test/agent-harness/agent-harness-process-boundary.test.cjs`: execute compiled bootstrap routes and actual protocol validators.
- `test/agent-harness/release-toolbox-boundary.test.cjs`: execute compiled process adapter with controlled spawn/timer boundaries; assert exact command arguments, shell policy, receipts, redaction, deadlines, and termination.
- `test/agent-harness/repository-file-operations.test.cjs`: copy/move a binary larger than 16 MiB, verify bytes/digest, and prohibit process launch.
- `test/agent-harness/repository-io-hardening.test.cjs`: prohibit synchronous process calls during actual status/diff and exercise cancellation/output-overflow cleanup.
- `test/agent-harness/service-host-power-recovery.test.cjs`: execute compiled host with actual lifecycle coordinator and controlled power/server/controller adapters.
- `test/agent-harness/sibling-process-launch.test.cjs`: execute both compiled launch callers through the real shared launcher.
- `test/app-shell/native-product-identity.test.cjs`: execute the actual window-construction function and verify supplied icon bytes, title, preload isolation, and load target.
- `test/browser/architect-browser-handoff.test.cjs`: execute actual IPC bodies, compiled preload, and service with repository-read counters and unsubscribe observations.
- `test/documents/planning-document-service.test.cjs`: observe shared canonical-writer verification hooks and durable disposition/revision results.
- `test/packaging/windows-packaging-lifecycle.test.cjs`: execute maintenance bootstrap and Desktop ownership/readiness sequencing with controlled native adapters. Existing process/package companions passed separately.
- `test/work-card-building/codex-runtime-initializer-client.test.cjs`: execute compiled initializer worker, protocol rejection, counted maintenance flow, and actual manager adoption.
- `test/repository/runtime-wiring-source.test.cjs`: invoke compiled preload through actual main handlers; assert selected-root/input/receipt propagation, constrained execution arguments, clipboard calls, runtime API surface, and production catalog behavior.
- `test/repository/issue-screenshot-submission-wiring.test.cjs`: execute intake, App, preload, main, and Issue writer; verify screenshot bytes, one creation path, and failure retention.
- `test/architect-outputs/architect-output-workspace-repair.test.cjs`: invoke actual copy IPC and count one resolution plus one clipboard write.
- `test/performance/disposition-transaction-collapse.test.cjs`: execute nine renderer mutation actions and actual projection application with one observed IPC call each; existing real repository counters and latency remain.
- `test/renderer/agent-harness-settings-workspace.test.cjs`: compiled Settings preload calls preserve bounded inputs across ten channels.
- `test/renderer/architect-output-workspace-source.test.cjs`: actual fingerprint, slot-selection, current-revision, and viewed-revision helpers.
- `test/renderer/document-review-surface-source.test.cjs`: render full body/fallback/error/empty state, invoke copy/slot callbacks, and execute actual refresh callback with retained/removed selection.
- `test/renderer/issue-fix-card-workspaces.test.cjs`: click actual candidate controls and inspect selected/busy states.
- `test/renderer/phase-map-presentation.test.cjs`: click actual accordion controls and inspect changed expanded content.
- `test/renderer/work-card-building-review-workspace.test.cjs`: render report-dependent controls and typed environment-interaction labels.
- `test/renderer/work-card-repair-workspace.test.cjs`: execute controlled component state/effects for evidence/current-repair selection, review visibility, handoff callbacks, and busy gating.
- `test/renderer/work-card-report-review-workspace.test.cjs`: actual workspace registry ordering, report classification, and rendered Operator controls.

AST selection used to execute a production function or registration is a loading technique in these tests; it does not turn the behavioral assertions into source-shape assertions. Native adapters and controlled hook harnesses are deterministic evidence, not visual acceptance.

## replaced with AST/module structural test

- `test/agent-harness/git-mutation-boundary.test.cjs`: narrow TypeScript AST check of direct relative dependencies in the Git dispatch and mutation modules excludes workflow decision services.
- `test/agent-harness/agent-harness-process-boundary.test.cjs`: narrow direct-import structural boundary over Desktop, host, and controller modules replaces whole-source ownership/name scans.

These assertions inspect module dependency structure because that boundary is the durable contract. They are intentionally direct-dependency checks, not transitive graph proof or natural-language word filters. No general-purpose meta-scanner was added.

## deleted as migration-only/redundant

- Deleted `test/governance/product-authority-vocabulary.test.cjs` in full: the corpus vocabulary gate and its classifier self-tests were one-time audit enforcement.
- Removed the prohibited-identifier walk in `test/app-shell/app-shell.test.cjs`, vocabulary walk in `test/agent-harness/agent-harness-runtime.test.cjs`, and prose/authority scans in `test/agent-harness/git-mutation-boundary.test.cjs`.
- Removed the redundant polling/source-name scan in `test/agent-harness/mcp-tool-contract-generation.test.cjs`; runtime generation/session/counter tests remain.
- Removed former implementation names, comments, whole-source ownership/order proxies, and duplicate lexical fragments in the HOTFIX14 and HOTFIX15 files listed above, after behavioral or narrow dependency replacements.
- Removed pure renderer component/function/ref/JSX spelling checks and obsolete CSS/layout rules across all 19 HOTFIX16 files listed above. Removed only lexical tails from mixed rendered/callback tests.
- Removed obsolete-module absence checks in `test/renderer/architect-output-workspace-source.test.cjs` and the one-time unused Figma bundle dependency/asset inventory in `test/renderer/figma-redesign-shell.test.cjs`. Retired component/module names are no longer permanent contracts.
- Removed source-reader, CSS-slicing, and source-order helpers only where their dispositioned checks were their sole consumers.

No production file changed in HOTFIX13–HOTFIX16. Consequently the already-removed workflow Git permission hierarchy was not restored, no production symbol was renamed for authority vocabulary, and OAuth/security authorization terminology is unchanged. The identified corpus-wide natural-language and authority/authorization gates are retired, with no replacement meta-scanner. Original validation results and the five-commit record through HOTFIX17 are recorded in `work_cards/HOTFIX17_IMPLEMENTER_REPORT.md`.

## HOTFIX18 Architect-review repair

Independent Architect review after HOTFIX17 found residual raw production-source proxy tests in eight files outside the original inventory. HOTFIX18 was required to repair those missed assertions; it does not rewrite the HOTFIX13–16 provenance or reopen their completed changes. The following dispositions describe the repaired repository state. No new executable inventory, repository-wide scanner, or meta-test banning source reads was added.

### retained legitimate runtime/rendered regex

- `test/app-shell/app-shell.test.cjs`: workspace validation, persistence, session activation/switching/clearing, and runtime error assertions remain.
- `test/agent-harness/multi-user-startup-registration.test.cjs`: all existing installed-scope, preference, exact login-item identity, opt-out, tray wording, and synthetic user-isolation behavior remains.
- `test/repository/phase-validation-wiring.test.cjs`: the previous three tests had only source proxies; the new tests assert executable API results and runtime rejection messages.
- `test/renderer/issue-screenshot-intake.test.cjs`: all existing clipboard/image admission, conversion, limits, removal, failure-retention, and rendered guidance tests remain.
- `test/renderer/issue-validation-workspace.test.cjs`: rendered aggregate validation content and Issue rail eligibility remain.
- `test/renderer/phase-validation-renderer-sequencing.test.cjs`: rendered mutation availability, projection validation, explicit entry, and mutation/refresh sequencing remain.
- `test/renderer/project-planning-blocker-banner.test.cjs`: exact rendered reason/required action, duplicate suppression, initial evidence cap, and non-blocked/non-workspace invisibility remain.
- `test/workflow/phase-validation-production-boundary.test.cjs`: actual repository continuation, closeout/disposition, action pruning, and all five negative production-boundary cases remain.

### replaced with behavioral test

- `test/app-shell/app-shell.test.cjs`: actual main handlers and compiled preload execute session selection, cancellation, rejection, switching, and clear behavior; loaded registry definitions supply labels; the empty workflow UI renders the neutral message. The exposed API is inspected at runtime for workspace methods and absence of unrestricted native access.
- `test/agent-harness/multi-user-startup-registration.test.cjs`: execute the compiled Service Host with real opt-out intent and lifecycle preferences, observing exit before runtime identity work or controller/lifecycle/server/tray construction.
- `test/repository/phase-validation-wiring.test.cjs`: compiled preload invokes actual main handlers and services against a disposable canonical workspace. Tests observe the projection target arriving at the service despite a different active model workspace, reject Phase Close bypass, and compare create/disposition action evidence with refreshed repository projections.
- `test/renderer/issue-screenshot-intake.test.cjs`: invoke the actual paste handler for both synchronous submission-in-flight and renderer creating state; assert no paste accounting, queueing, preparation, preview allocation, ID allocation, or pending-evidence mutation.
- `test/renderer/issue-validation-workspace.test.cjs`: execute the actual decision, post-mutation projection application, and sidebar-selection functions. Repository destinations control active stage and projection loading, including corrective Issue Planning re-entry, without timers or a corrective-mode override.
- `test/renderer/phase-validation-renderer-sequencing.test.cjs`: execute the actual App disposition and mutation orchestration functions; observe projection workspace target, repository refresh, final navigation, and retained completion evidence. Invalid or unavailable disposition projections cannot invoke mutation.
- `test/renderer/project-planning-blocker-banner.test.cjs`: click the actual disclosure callback and rerender to verify expansion/collapse without model mutation; execute the runtime rail-status owner with different supplied planning statuses.
- `test/workflow/phase-validation-production-boundary.test.cjs`: execute the actual transition function using repository-derived create/dispose/complete actions. Direct Phase Close selection clears pending actions while preserving completion state.

The two strictly required test helpers are `test/support/production-execution.cjs` (shared AST-selected function/main-handler execution plus compiled preload VM loading) and `test/support/phase-validation-fixtures.cjs` (the existing canonical workflow fixture moved out of the production-boundary test for reuse by the IPC tests). Production bodies are executed without rewriting their decisions. AST selection is a loading technique, not a source-spelling assertion.

### replaced with AST/module structural test

- `test/renderer/issue-screenshot-intake.test.cjs`: a narrow direct-import check over the two clipboard intake modules protects the renderer/native filesystem dependency boundary. It is not a transitive dependency or unrestricted filesystem-access proof.

### deleted as migration-only/redundant

- Removed the source-order, source-slicing, implementation-name, and whole-source regex assertions replaced above in all eight files, along with unused source-reader helpers/imports.
- Retired the Project Planning banner's one-time exact JSX placement/lower-placement and CSS implementation checks. Existing rendered content/absence evidence remains; this repair does not claim a new visual-layout acceptance test.
- Retired screenshot source negatives for drag/drop spelling, browser clipboard API spelling, and `File.path`; retained rendered upload-surface absence and actual clipboard behavior. The direct filesystem import boundary has the narrow structural replacement described above.

HOTFIX18 changes only the eight named tests, the two required test helpers, and this disposition record. No production behavior, schemas, dependencies, production names, workflow Git authority, or OAuth/security terminology changed. Focused/full validation and completion status are recorded in `work_cards/HOTFIX18_IMPLEMENTER_REPORT.md`.
