# Implementer Handoff — Phase 06 WC05 Execution Pass and Independent Verification Foundation Recovery

## Recommended Codex Configuration

- Model: strongest available GPT-5.x Codex coding model
- Reasoning: high
- Execution environment: normal Windows repository environment

## Approval and Dependency Gate

WC05 is approved but not yet executable.

Before editing, verify all of the following:

1. Exact active Operator Approval:
   - Work Card: `champcity-ai/phase-06/work_card/WC05`
   - Work Card revision: 3
   - Operator Approval: `champcity-ai/phase-06/operator_approval/WC05`
   - Expected Implementer Report: `champcity-ai/phase-06/implementer_report/WC05`
2. WC04 has a synchronized canonical Implementer Report pair.
3. An Architect Review explicitly accepts WC04.
4. The real Artifact Registry loads through `ArtifactPairService` and canonical writes succeed.

If any condition is absent, stop without editing and report the missing exact authority or dependency.

## Repository Verification

Verify:

- Git top-level is the approved ChampCity_AI repository.
- Remote is `ChampCityChris/ChampCity_AI`.
- Branch is `feature/phase-04-wc01-repair01-evidence-derived-workflow` unless later approved authority changes it.
- Read `AGENTS.md`.
- Read `docs/dev/VALIDATION_COMMAND_LANES.md`.
- Read `planning/phases/phase-06/Work_Cards/WC05_execution_pass_independent_verification_foundation_recovery.{json,md}`.
- Read `planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC05_execution_pass_independent_verification_foundation_recovery.{json,md}`.
- Read the accepted WC04 Implementer Report and Architect Review.
- Read the four governance and architecture documents named by WC05.
- Inspect the complete frozen dirty diff before editing.

Abort on the wrong repository, remote, branch, Work Card identity, revision, approval, or missing WC04 dependency.

## Dirty-Tree Authorization

This is a governed recovery of the frozen prototype. Do not reset or discard the entire dirty tree.

Before editing, classify every dirty path as:

- retain and refactor;
- remove as deferred transport;
- remove as temporary or misleading evidence;
- leave untouched because unrelated.

The final report must provide this inventory.

## Exact Assignment

Recover only the Execution Pass and Independent Verification foundation.

Retain:

- Acceptance Contract;
- Execution Pass Plan;
- pure Execution Run state machine;
- bounded Implementer packet;
- bounded Independent Verifier packet;
- exact result binding;
- same-pass correction;
- governance-contradiction stop;
- canonical run persistence;
- read-only status and packet-preview UI;
- permanent governance protocols.

Remove from production:

- Codex CLI adapter;
- process spawning;
- Codex command construction;
- JSONL parsing;
- transport logs and polling;
- runner records;
- automatic transport reconciliation;
- renderer queue and completion controls;
- runner-specific result generation.

Do not leave transport code dormant, disabled, feature-flagged, or as fallback.

## Required Architecture Repair

Decompose the prototype into dedicated modules for:

- shared Execution Run domain;
- shared pass-packet compilation;
- main-process canonical persistence;
- trusted main-process authority;
- read-only renderer model.

Do not keep the recovered foundation appended to generic context-packet files or combined in one oversized service.

## Required Authority Repair

Renderer/preload must not expose:

- arbitrary Execution Run initialization objects;
- raw lifecycle-event recording;
- completion callbacks;
- verifier decisions;
- live job queueing.

Initialization and advancement must be main-process operations derived from exact synchronized canonical authority. Renderer may only load status and preview the bounded next packet.

## Required Cleanup

Remove from the final WC05 change set:

- `docs/handoffs/IMPLEMENTER_HANDOFF_EXECUTION_RUN_CODEX_CLI_TRANSPORT.md`;
- `docs/handoffs/INTEGRATION_CUSTOM_HANDOFF.md`;
- `planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_execution_run_codex_cli_transport.md`.

Repair `AGENTS.md` line endings and retain only the intended governance delta.

## Required Tests

Create focused suites proving:

- strict plan and identity validation;
- bounded current-pass packet content;
- exact verifier target binding;
- no advancement on Implementer self-report;
- same-pass retry;
- prerequisite-ready advancement;
- governance-contradiction blocking;
- canonical persistence and revision increments;
- no renderer raw-event or decision authority;
- no production Codex transport;
- read-only panel behavior;
- no automatic Operator acceptance.

Do not use transport test doubles as evidence for this Work Card.

## Validation

Use the approved normal Windows lane.

Run:

- `npm run typecheck`;
- focused domain tests;
- focused persistence tests;
- focused IPC-authority tests;
- focused renderer tests;
- repository gates proving transport removal;
- `npm test`;
- canonical pair synchronization checks;
- `git status --short`.

Do not launch Codex from the application. Do not perform Operator acceptance. Do not push or merge.

## Required Output

Create:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC05_execution_pass_independent_verification_foundation_recovery.{json,md}`

Artifact ID:

`champcity-ai/phase-06/implementer_report/WC05`

The report must map every acceptance criterion to exact files, symbols, tests, commands, and negative evidence.

## Manual Validation After Codex

Confirm the panel is read-only, displays pass state and bounded packet preview, has no queue or completion controls, cannot advance without independent verification, shows same-pass retry and governance blocks, launches no Codex process, and creates no Operator acceptance.

## Remaining Passes

After WC05 is independently reviewed and accepted:

- Independent Verifier Agent integration.
- Operator Validation Agent execution and evidence capture.
- Runner Transport adapter.
- retry limits and runner-failure escalation.
- automatic git checkpoints.
