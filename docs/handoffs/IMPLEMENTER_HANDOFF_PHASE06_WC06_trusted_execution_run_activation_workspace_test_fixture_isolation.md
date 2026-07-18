# Implementer Handoff — Phase 06 WC06 Trusted Execution Run Activation Workspace and Test-Fixture Isolation

## Recommended Codex Configuration

- Model: strongest available GPT-5.x Codex coding model
- Reasoning: high
- Environment: normal Windows repository environment

## Exact Starting Point

Repository: `<PROJECT_REPO>`
Remote: `ChampCityChris/ChampCity_AI`
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
Required baseline HEAD: `8801ac0b60a5ad227bc68ba9397f10be461a6e85`

Abort before editing if the repository, remote, branch, or baseline differs.

Read first:

- `AGENTS.md`
- `docs/dev/VALIDATION_COMMAND_LANES.md`
- `docs/governance/EXECUTION_PASS_PROTOCOL.md`
- `docs/governance/IMPLEMENTER_LITERAL_COMPLIANCE_PROTOCOL.md`
- `docs/governance/INDEPENDENT_VALIDATION_PROTOCOL.md`
- `docs/architecture/EXECUTION_RUN_ORCHESTRATION.md`
- `docs/handoffs/WC06_APPROVED_AUTHORITY_BOOTSTRAP.md`
- accepted WC05 Implementer Report and Architect Review pairs

Do not reset, clean, discard, amend the checkpoint commit, push, merge, tag, release, or perform Operator acceptance.

## Authority Bootstrap — Complete Before Production Edits

The Operator has approved WC06. The canonical WC06 artifacts do not yet exist because the accepted recovery baseline was checkpointed before the next Work Card was created.

Before production edits, use the existing canonical artifact writer and Registry boundary to create and register these synchronized pairs:

### Work Card

Artifact ID: `champcity-ai/phase-06/work_card/WC06`
Artifact type: `work_card`
Revision: 1
Status: active
Phase: `phase-06`
Work Card ID: `WC06`
Parent: `champcity-ai/phase-06/work_card_plan/Work_Card_Plan`

Paths:

- `planning/phases/phase-06/Work_Cards/WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.json`
- `planning/phases/phase-06/Work_Cards/WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.md`

Title:

`Work Card: Phase 06 WC06 — Trusted Execution Run Activation Workspace and Test-Fixture Isolation`

Expected output:

`champcity-ai/phase-06/implementer_report/WC06`

Required Work Card data:

- `workCardKind: planned_candidate`
- `planOrder: 6`
- `owner: Implementer`
- `risk: high`
- `status: approved_for_implementer_execution`
- `sourceCodeChangesAuthorized: true`
- `pushAuthorized: false`
- `approvedBy: champcity-ai/phase-06/operator_approval/WC06`
- `approvedRevision: 1`
- `baselineCommit: 8801ac0b60a5ad227bc68ba9397f10be461a6e85`
- `expectedImplementerReportArtifactId: champcity-ai/phase-06/implementer_report/WC06`
- the exact `executionRunDefinition` below

### Operator Approval

Artifact ID: `champcity-ai/phase-06/operator_approval/WC06`
Artifact type: `operator_approval`
Revision: 1
Status: active
Parent: `champcity-ai/phase-06/work_card/WC06`

Paths:

- `planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.json`
- `planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.md`

Required approval data:

- `authorizationGranted: true`
- `sourceCodeChangesAuthorized: true`
- `authorizedWorkCardArtifactId: champcity-ai/phase-06/work_card/WC06`
- `authorizedRevision: 1`
- `baselineCommit: 8801ac0b60a5ad227bc68ba9397f10be461a6e85`
- `expectedImplementerReportArtifactId: champcity-ai/phase-06/implementer_report/WC06`
- `executionPassesAuthorized: [P01, P02, P03]`
- `pushAuthorized: false`
- `status: approved_for_implementer_execution`

The approval must state that the Operator authorizes P01–P03 in one governed implementation session while preserving pass-specific evidence. It does not authorize Independent Verifier Agent implementation, Operator Validation Agent implementation, Runner Transport, push, merge, tag, release, or Operator acceptance.

### Registration

Verify and register through `ArtifactPairService.registerExistingArtifactPairByPaths`:

- `champcity-ai/phase-06/architect_review/WC05`
- `champcity-ai/phase-06/work_card/WC06`
- `champcity-ai/phase-06/operator_approval/WC06`

Reread all three by exact Registry authority. Do not proceed if any pair is loose, unsynchronized, conflicting, or not authoritative.

## Work Card Purpose

Make the recovered Execution Run foundation usable through a clear application workflow without adding runner transport.

The Operator must be able to:

1. Open `Supporting tools`.
2. Open `Execution Runs`.
3. Select an eligible approved Work Card.
4. Choose `Start Execution Run`.
5. Review run status, current pass, attempts, blockers, and the bounded next packet.
6. Restart the app and reopen the same run.

WC06 must also stop mounted Electron tests from contaminating the normal project selector or leaving temporary fixture projects selected.

## Exact Structured Execution Definition

Create and strictly validate schema version:

`champcity.execution-run-definition.v1`

Work Card `payload.data.executionRunDefinition` must contain:

### Global invariants

- `INV-ROLE-SEPARATION`: Architect defines authority; Implementer changes production code; verifier and Operator decisions remain separate.
- `INV-TRUSTED-MAIN-AUTHORITY`: Renderer intent cannot supply canonical Contract, Plan, lifecycle event, result, or decision data.
- `INV-HUMAN-OPERATOR-AUTHORITY`: No agent or UI grants final human Operator acceptance.

### P01 — Trusted activation compiler and authority

Requirements:

- `R01-DEFINITION-SCHEMA`: Strict structured definitions compile deterministically. Unknown or missing fields block. Parsing Markdown, titles, or filenames is prohibited.
- `R02-EXACT-AUTHORITY`: Activation resolves exact synchronized Work Card, revision, approval, dependency, project, and phase authority. Artifact existence alone is insufficient.
- `R03-IDEMPOTENT-START`: Starting the exact same run twice returns the existing run without semantic mutation. A conflicting existing run blocks.

Allowed paths:

- `src/shared/executionRuns`
- `src/main/executionRuns`
- `src/main/artifacts`
- `src/main/canonicalRuntime.ts`
- `test/wc06`

Required outputs:

- strict execution-definition schema and compiler
- trusted eligible-list operation
- trusted start/open operation
- canonical Acceptance Contract, Execution Pass Plan, and Execution Run pairs

### P02 — Execution Runs supporting workspace

Requirements:

- `R04-SUPPORTING-WORKSPACE`: Supporting Tools provides an Execution Runs workspace with eligible Work Cards, Start/Open actions, status, and bounded packet preview.
- `R05-PLAIN-STATES`: Empty and blocked states explain the missing exact authority in plain language.
- `R06-READ-ONLY-BOUNDARY`: No queue, process, raw-event, completion, verifier-decision, or Operator-acceptance controls may exist, including dormant or feature-flagged versions.

Allowed paths:

- `src/main/main.ts`
- `src/preload/index.ts`
- `src/renderer`
- `src/shared/executionRuns`
- `test/wc06`

### P03 — Test-fixture isolation and end-to-end proof

Requirements:

- `R07-TEST-ISOLATION`: Mounted Electron tests use isolated project-workspace persistence and clean up their fixture projects.
- `R08-CONTAMINATION-REPAIR`: Normal startup removes project roots contained under the host ChampCity_AI repository's `tmp/` directory while preserving external user projects. Do not use a hard-coded fixture-name blacklist.
- `R09-END-TO-END-PROOF`: The normal application demonstrates Start Execution Run, persistent status, and bounded packet preview without transport controls.
- `R10-PRESERVE-ROUTING`: Existing workflow routing and current-action semantics must remain unchanged.

Allowed paths:

- project workspace persistence modules
- `src/main/main.ts`
- mounted Electron scripts
- `test/wc06`
- `package.json`

## Trusted Activation Contract

Renderer code may submit only a selected canonical Work Card identity. It must not submit:

- Acceptance Contract objects
- Execution Pass Plan objects
- approval data
- lifecycle events
- result artifacts
- verifier decisions

Main-process code must:

1. Resolve exactly one synchronized authoritative Work Card.
2. Resolve exactly one synchronized authoritative Operator Approval.
3. Validate approval payload target, revision, and source-code authority.
4. Validate the structured execution definition with unknown-field rejection.
5. Compile deterministic Contract and Plan identities and fixed paths.
6. Call trusted Execution Run persistence.
7. Return an existing exact run idempotently.
8. Block conflicts rather than overwrite or infer.

Do not parse Markdown, filenames, titles, timestamps, directory order, or ID suffixes to invent execution meaning.

## User Experience Contract

Add `Execution Runs` to Supporting Tools.

The screen must:

- list eligible approved Work Cards for the selected real project;
- show not started, active, complete, and blocked states;
- provide `Start Execution Run` when eligible and not started;
- provide `Open Execution Run` when a run exists;
- display run status, current pass, attempt count, findings, and Operator-attention reasons;
- provide `Preview next packet` and show the bounded packet;
- explain why a card is ineligible or blocked;
- clearly state that runner transport is deferred.

Do not hide this behind developer-only navigation.

## Test-Fixture Isolation Contract

The screenshot supplied during WC05 validation showed the normal application selected:

`<PROJECT_REPO>/tmp/wc01-repair01-electron-project`

Do not fix this by matching that literal name.

Required mechanism:

- normal development and packaged project registries must reject or purge roots contained under the host application's own `<PROJECT_REPO>/tmp/` directory;
- mounted tests must use unique test-owned user-data and workspace-registry locations;
- test registries and fixture roots must be cleaned in `finally`/cleanup paths;
- external project roots must remain untouched;
- after contamination repair, select the real ChampCity_AI project when available;
- add mounted regression proof that test projects never remain in the normal selector.

Do not commit Electron caches, session data, temporary projects, or generated user-data files.

## Prohibited Scope

Do not:

- reintroduce Codex CLI, `child_process`, process launching, JSONL parsing, transport logs, queues, or polling;
- implement the Independent Verifier Agent;
- implement the Operator Validation Agent;
- grant Operator acceptance;
- broaden unrelated WC03 workflow behavior;
- alter providers, connectors, authentication, deployment, or release architecture;
- use Playwright;
- push, merge, tag, or release.

## Required Tests

Add focused WC06 suites proving:

1. Valid definitions compile deterministically.
2. Unknown or missing definition fields block.
3. Wrong Work Card, revision, approval, project, phase, or dependency blocks.
4. Public renderer IPC cannot provide Contract or Plan objects.
5. Starting creates synchronized Contract, Plan, and Run pairs.
6. Exact repeat start is idempotent.
7. Conflicting existing run blocks.
8. Eligible listing excludes invalid or unapproved cards.
9. Empty and blocked states identify exact missing authority.
10. UI has Start/Open and bounded preview with no mutation or acceptance controls.
11. Mounted tests use isolated persistence and clean up.
12. Internal repository `tmp/` roots are purged from normal registry.
13. External user projects are preserved.
14. Real ChampCity_AI is selected after repair.
15. Existing 73-unit-test coverage remains present.
16. Repository and mounted renderer lanes pass.

## Validation

Use the approved normal Windows lane.

Run at minimum:

- `npm run typecheck`
- focused WC06 tests
- restored WC04/WC05 and WC09 regression suites
- `npm test`
- Registry load and pair synchronization verification
- mounted test-isolation validation
- normal application activation/restart validation
- `git status --short`

If an existing mounted probe is flaky, report the exact isolated harness failure, but do not classify a functional WC06 failure as a cleanup observation without evidence.

## Required Implementer Report

Create and register the synchronized pair:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.{json,md}`

Artifact ID:

`champcity-ai/phase-06/implementer_report/WC06`

The report must include:

- bootstrap artifact creation and registration evidence;
- pass-by-pass files and symbols;
- requirement-to-test matrix;
- screenshots or exact mounted UI evidence for the Execution Runs workspace;
- project-registry contamination before/after evidence;
- complete validation commands and results;
- final Registry revision and entry count;
- final git status;
- no push and no Operator acceptance.

## Manual Validation After Codex

The final Operator validation must be understandable and executable:

1. Launch the normal application.
2. Confirm the active project is the real ChampCity_AI repository, not a `tmp/` fixture.
3. Open `Supporting tools` → `Execution Runs`.
4. Select WC06.
5. Click `Start Execution Run`.
6. Confirm run status and bounded next-packet preview appear.
7. Confirm no queue, process, completion, verifier-decision, or acceptance controls exist.
8. Restart and confirm the same run persists.
9. Run mounted tests, restart normally, and confirm no test projects appear.

## Remaining Passes After WC06

- Independent Verifier Agent integration.
- Operator Validation Agent execution and evidence capture.
- Deferred Runner Transport.
- Retry limits, runner-failure escalation, and automatic git checkpoints.
