# RECONSTRUCTION-REPAIR01-REPAIR06A-REPAIR01 — Plain-Language Codex Approval Impact Presentation

## Repair Type

Narrow evidence-derived child repair of `RECONSTRUCTION-REPAIR01-REPAIR06A` after Architect code review found the execution authority and pending-approval architecture substantially correct but the Operator-facing impact explanation insufficient for a nontechnical user.

This repair does **not** reopen REPAIR06A sandbox authority, approval ownership, protected-process denial, IPC/preload wiring, or execution lifecycle. It corrects only the meaning presented to the Operator when an approval is already pending.

## Governing Standard

`planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

This card follows the retained Repair Card standard: confirmed review finding, bounded correction, preserved passed behavior, objective regression proof, no unrelated redesign, and no Git mutation unless separately authorized.

## Parent Repair / Failed Architect Review Evidence

Parent repair:

`repair/RECONSTRUCTION_REPAIR01-REPAIR06A_codex_execution_authority_and_operator_approval_boundary.md`

Parent Implementer Report:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR06A_codex_execution_authority_and_operator_approval_boundary.md`

Architect review result:

- REPAIR06A correctly changed normal Work Card execution to repository-scoped `workspace-write`.
- REPAIR06A correctly stopped automatic acceptance of command, file-change, legacy command/patch, and permission approval requests.
- REPAIR06A correctly added a pending approval path through transport → service → IPC/preload → Implement workspace UI.
- REPAIR06A correctly hard-denies obvious attempts to terminate the active ChampCity control process.
- REPAIR06A failed the intended nontechnical-Operator presentation requirement because `impactSummaryForApproval()` mostly repeats the raw command or raw permission structure instead of explaining the consequence.

Confirmed current command behavior:

```text
impactSummary =
"Codex wants to run this command in the selected project workspace: <raw command>"
```

The UI then renders the same raw command again under `Proposed Command`.

Example current experience:

```text
Codex wants to run this command in the selected project workspace:
taskkill /PID 9876 /F
```

A nontechnical Operator still has to know what `taskkill`, `/PID`, `/F`, PowerShell `Stop-Process`, package-manager commands, or raw permission JSON mean. That contradicts the REPAIR06A requirement that the Operator not need sandbox or command-line expertise to make the approval decision.

## Confirmed Root Cause

Primary production surface:

`src/main/workCardBuilding/codexAppServerTransport.ts`

`normalizeApprovalRequest()` derives `impactSummary` through `impactSummaryForApproval()`.

Current command implementation:

```text
if commandDisplay exists
→ "Codex wants to run this command ...: <commandDisplay>"
```

Current permission implementation similarly embeds the compact serialized permission structure rather than translating the request into ordinary language.

Existing focused tests only prove the summary contains wording such as `run this command`; they do not prove that an obvious disruptive operation is explained in terms the Operator can understand.

This is a presentation/classification defect. The approval authority itself is not defective in this child repair.

## Required Architecture

The architecture is explicit:

```text
APP SERVER APPROVAL REQUEST
→ existing ownership/protected-process checks
→ existing pending approval contract
→ bounded semantic impact classification for obvious request classes
→ plain-language impactSummary
→ retain exact raw command / file / permission detail separately
→ Operator Approve Once or Deny
```

The application should explain what an obvious operation **does**, while still showing the exact underlying request for auditability.

Do not create an AI-based risk classifier, shell interpreter, policy engine, second approval system, or exhaustive command parser.

## Repair Objective

After repair:

1. Obvious process-termination approvals explain that Codex wants to stop a running process/application and identify the target PID/name when available.
2. Obvious dependency/package restoration or installation commands explain that project or machine software/dependencies may be installed/replaced and that running project processes may be affected where applicable.
3. File-change approvals explain the number and available target paths rather than presenting an opaque count without context.
4. Network/filesystem permission approvals describe the type of access requested in plain language.
5. Unrecognized commands use a concise generic fallback and continue to show the exact raw command separately.
6. No approval, denial, sandbox, process-protection, or execution semantics change.

## Authorized Scope

### 1. Improve bounded approval impact classification

Primary production file:

`src/main/workCardBuilding/codexAppServerTransport.ts`

Authorized supporting changes only if needed by the existing shared contract/UI:

- `src/shared/workspaceContracts.ts`
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`
- focused tests listed below.

Prefer keeping the existing `impactSummary: string` contract. Do not add a new persistent approval schema unless a directly necessary presentation field cannot be represented without it.

### 2. Required process-termination presentation

Reuse the command normalization/tokenization already present for the protected-process guard.

For obvious `taskkill` or PowerShell `Stop-Process` requests that are **not** hard-denied as ChampCity self-termination, the pending approval impact summary must communicate the consequence in ordinary language.

Examples of required semantic output:

For:

```text
taskkill /PID 9876 /F
```

present materially equivalent meaning to:

```text
Codex wants to stop a running process. This may close an application that is currently running. Target process ID: 9876.
```

For:

```text
taskkill /IM ExampleApp.exe /F
```

or:

```text
Stop-Process -Name ExampleApp
```

present materially equivalent meaning to:

```text
Codex wants to stop a running application or process named ExampleApp. If it is currently open, it will be closed.
```

Requirements:

- keep the exact command visible separately under `Proposed Command`;
- do not claim the target belongs to the selected project unless that ownership is actually known;
- do not silently approve or deny non-protected targets;
- the existing protected ChampCity target continues to be hard-denied before any approval panel is shown.

### 3. Required dependency/package command presentation

Add only bounded recognition for common package/dependency operations that are materially relevant to the current development workflow.

At minimum classify these command families when represented directly in the approval payload:

```text
npm ci
npm install
pnpm install
pnpm install --frozen-lockfile
yarn install
yarn install --immutable
winget install
winget configure
```

Required plain-language meaning:

- repository dependency restore/install commands: explain that Codex wants to install or replace the selected project's dependency tree and that this may affect files used by a running project;
- WinGet install/configure commands: explain that Codex wants to install or configure software on Windows, not merely modify project files.

Do not infer package ownership or claim a specific package will be removed unless the request actually proves it.

Do not add additional package managers merely to expand coverage.

### 4. Required file-change presentation

Preserve current pending file-change approval semantics.

When the App Server supplies concrete target paths, `impactSummary` should name the available paths up to a compact bounded maximum and state that Codex wants to modify project files.

When only a count is available, communicate materially equivalent meaning to:

```text
Codex wants to modify 3 project files.
```

Do not imply final file contents are known when only target/count metadata is available.

### 5. Required permission presentation

Translate the existing permission request structure into ordinary language without changing the permission response contract.

At minimum:

- network permission → state that Codex wants temporary network access for the current turn and include requested targets when available;
- filesystem permission → state that Codex wants temporary filesystem access and summarize requested entries/paths when available;
- combined request → state both plainly.

Keep raw permission detail available separately under the existing `Requested Permission` detail.

Do not expose hidden authorization values or secrets.

### 6. Generic fallback

When a command or request does not match a bounded known class, use a generic summary such as:

```text
Codex wants permission to run a command in the selected project workspace. Review the exact command below before deciding.
```

Do not fabricate an effect from an unrecognized command.

## Acceptance Criteria

### AC1 — Process termination is understandable

Focused transport tests submit a non-protected command approval for at least:

```text
taskkill /PID 9876 /F
```

Expected pending approval:

- remains unresolved until Operator response;
- `impactSummary` clearly states that a running process/application would be stopped/closed;
- identifies PID `9876`;
- raw `commandDisplay` remains `taskkill /PID 9876 /F`.

Add equivalent focused proof for one process-name form (`taskkill /IM` or `Stop-Process -Name`).

### AC2 — Protected ChampCity termination remains hard denied

Existing synthetic protected-process tests remain passing.

A command targeting protected PID/image:

```text
→ no pending approval
→ App Server denial
→ runtime denial evidence
```

Do not weaken this behavior to obtain a nicer summary.

### AC3 — Dependency restore is explained

A focused approval test for `npm ci` must produce a pending approval whose `impactSummary` explains that project dependencies will be installed/replaced/restored and may affect files used by a running project.

The summary must not merely repeat `npm ci`.

### AC4 — Windows software installation is explained

A focused approval test for a representative direct `winget install ...` request must explain that Codex wants to install software on Windows.

Do not change whether the approval is allowed; only the explanation changes.

### AC5 — File-change impact is plain language

For a file-change approval with known paths, the pending approval names/summarizes the target paths and states that project files will be modified.

For count-only evidence, the summary states the number of requested project file changes in ordinary language.

### AC6 — Permission impact is plain language

Focused permission tests prove network-only, filesystem-only, and combined permission requests produce understandable summaries describing the requested access.

Raw permission detail remains separately available.

### AC7 — Unknown commands do not receive invented meaning

A focused test with an unrecognized command verifies:

- generic plain-language fallback;
- exact raw command retained;
- no fabricated process/package/file consequence.

### AC8 — Approval authority remains unchanged

Preserve and prove:

```text
request remains pending
→ Approve Once resolves only that request as accepted
→ Deny resolves only that request as denied
```

No command/file/permission request becomes auto-approved because of impact classification.

### AC9 — Existing UI placement remains unchanged

`Codex Approval Required` remains inside the existing Codex execution console.

The panel continues to render:

- approval type;
- improved plain-language impact summary;
- raw proposed command/file/permission detail;
- `Approve Once`;
- `Deny`.

No modal, toast, new workspace, or diagnostics-only presentation is authorized.

### AC10 — REPAIR06A execution controls remain intact

Focused tests must preserve:

- Work Card `workspace-write` sandbox;
- environment-resolution explicit broader authority;
- foreign/stale approval ownership rejection;
- protected ChampCity process hard denial;
- pending user input and MCP elicitation;
- cancellation and streaming;
- REPAIR05 side-effect-free status polling.

## Preserved Passed Behavior

Preserve all already-passing REPAIR06A behavior:

- repository-scoped Work Card sandbox;
- no `danger-full-access` fallback for implementation;
- explicit environment resolution;
- real pending Operator approval contract;
- single-request Approve Once / Deny semantics;
- protected control-plane process denial;
- IPC/preload/service wiring;
- approval telemetry and runtime denial evidence;
- current approval panel location and controls;
- no Git mutation unless separately authorized.

Also preserve REPAIR05 status-polling behavior.

## Forbidden Changes

Do not:

- reopen or redesign sandbox authority;
- change environment-resolution authority;
- add session-wide or durable blanket approval;
- auto-approve any approval class;
- remove protected-process hard denial;
- create a general shell parser or command-policy engine;
- use another LLM call to explain approval impact;
- infer process ownership that is not proven;
- hide the exact raw command/request from the Operator;
- special-case only the `ChampCity_AI` repository name;
- modify Phase-00 WC01 or REPAIR06B artifacts;
- run Phase-00 WC01 implementation as validation;
- stage/commit/push/branch-mutate unless separately authorized.

## Required Files / Areas to Inspect

At minimum:

- `src/main/workCardBuilding/codexAppServerTransport.ts`
- `src/main/workCardBuilding/codexAppServerProtocol.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts` for preservation only
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`
- `test/work-card-building/codex-app-server-transport.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/renderer/work-card-building-review-workspace.test.cjs`

## Focused Validation

Required:

```text
npm run typecheck
npm run build
node --test --test-concurrency=1 test/work-card-building/codex-app-server-transport.test.cjs test/work-card-building/codex-implementer-execution-service.test.cjs test/renderer/work-card-building-review-workspace.test.cjs
```

Do not run the entire historical suite by default.

Do not run the actual Phase-00 WC01 implementation during this repair.

## Required Implementer Report

Write:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR06A-REPAIR01_plain_language_codex_approval_impact_presentation.md`

The report must include:

- parent REPAIR06A review finding;
- exact prior `impactSummaryForApproval()` defect;
- files changed;
- bounded command/request classes added;
- before/after sample summaries for process termination, `npm ci`, WinGet, file changes, and permissions;
- proof raw request detail remains visible;
- proof approval authority/sandbox/protected-process behavior did not change;
- focused commands/results;
- deviations/blockers;
- remaining Operator validation;
- confirmation no Git mutation.

## Operator Live Validation

After Architect review:

1. Restart/reload ChampCity A/I.
2. Use a safe synthetic/fixture Work Card that produces a command approval request.
3. Verify the panel appears in the existing Codex execution console.
4. Verify the explanation describes the consequence in ordinary language and the exact raw request is separately visible.
5. Verify `Deny` prevents that request from proceeding.
6. Verify `Approve Once` authorizes only that one request.
7. Do not perform real process termination or rerun Phase-00 WC01 as part of this validation.

## Return Path

Return this child repair for Architect code review and Operator approval-panel validation.

This repair introduces no prerequisite gate for REPAIR06B. It only corrects the outstanding REPAIR06A review finding; disposition of REPAIR06B remains a separate workflow decision.
