# Implementer Handoff — Phase 06 WC06 P04–P05

## Assignment

Continue the existing approved Work Card `champcity-ai/phase-06/work_card/WC06` with two additional bounded implementation passes:

- P04 — Independent Verifier Agent integration.
- P05 — Operator Validation Agent execution and evidence capture.

This is an extension of WC06. Do not create WC07 or another Work Card.

The current project phase is Phase 06. The Git branch name contains a stale Phase 04 label and is only repository history. It is not workflow authority and must not be used to infer project phase, Work Card state, current action, or routing.

## Recommended Codex Configuration

- Model: strongest available GPT-5.x Codex coding model.
- Reasoning: high.
- Environment: normal Windows repository environment.

## Repository and Baseline

Repository: `<PROJECT_REPO>`

Remote: `ChampCityChris/ChampCity_AI`

Current Git branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`

Required accepted WC06 baseline commit:

`7708682598bc9f66f3f4c8af8da61867aded56bb`

Before editing:

1. Verify the Git top-level is the approved ChampCity_AI repository.
2. Verify the remote exactly.
3. Verify HEAD contains the accepted WC06 baseline commit.
4. Verify the worktree is clean except for this handoff file if it has not yet been committed.
5. Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md`.
6. Read:
   - `docs/governance/EXECUTION_PASS_PROTOCOL.md`
   - `docs/governance/INDEPENDENT_VALIDATION_PROTOCOL.md`
   - `docs/architecture/EXECUTION_RUN_ORCHESTRATION.md`
   - the current WC06 Work Card, Operator Approval, Acceptance Contract, Execution Pass Plan, Execution Run, Implementer Report, and Registry entries.

Abort on the wrong repository or remote. Do not abort merely because the legacy Git branch name contains `phase-04`.

## Operator Authorization

The human Operator explicitly directs that WC06 continue for two additional passes and authorizes the Implementer to execute P04 and P05 under this handoff.

The existing WC06 approval authorizes only P01–P03. Before any production edit, materialize the continuation authority canonically:

1. Create revision 2 of the existing WC06 Work Card pair.
2. Create revision 2 of the existing WC06 Operator Approval pair.
3. Preserve P01–P03 as the accepted implementation baseline represented by commit `7708682598bc9f66f3f4c8af8da61867aded56bb` and the WC06 revision-1 Implementer Report.
4. Add only P04 and P05 to the new authorized scope.
5. Create a new subordinate continuation Acceptance Contract, Execution Pass Plan, and Execution Run containing only P04 and P05.
6. Do not rewrite, fabricate completion events for, or retroactively mutate the existing P01–P03 Execution Run ledger.
7. Use deterministic continuation identities and fixed canonical paths. The continuation must be distinguishable from the P01–P03 run without parsing filenames, titles, or timestamps for authority.
8. Register and reread the revised Work Card, revised approval, continuation Contract, Plan, and Run through exact Canonical Artifact Registry authority before production edits.

The revised approval must explicitly state:

- authorization granted: true;
- source-code changes authorized: true;
- authorized Work Card: `champcity-ai/phase-06/work_card/WC06` revision 2;
- authorized passes: P04 and P05;
- push authorized: false;
- final Operator acceptance remains human-only;
- no local Codex CLI or generic runner transport is authorized.

## Governing Boundary

P04 and P05 integrate the browser-based verifier and validation workflow through canonical assignments and results. They do not add local process spawning, Codex CLI execution, arbitrary command execution, hidden API calls, or a generic runner transport.

Browser agents consume exact canonical assignment artifacts through ChampCity MCP and return exact canonical result artifacts. The application remains the trusted authority that validates, ingests, displays, and advances state.

The renderer must never supply verification decisions, validation observations, Contract or Plan content, raw lifecycle events, result identity, or final Operator decisions as trusted input.

# P04 — Independent Verifier Agent Integration

## Objective

Make the Independent Verifier role operational after an exact Implementer result exists, using a separate browser-agent assignment, exact result binding, canonical evidence, and trusted run advancement.

## Required Production Behavior

### 1. Canonical verifier assignment

Create a strict canonical artifact type for an Independent Verifier assignment. The assignment must include exact, typed fields for:

- project ID;
- phase ID;
- Work Card artifact ID and revision;
- continuation Execution Run ID;
- pass ID and attempt number;
- Acceptance Contract ID;
- Execution Pass Plan ID;
- Implementer packet ID and fingerprint;
- exact Implementer result artifact ID and revision;
- requirement IDs assigned to the current pass;
- allowed repository paths;
- required independent tests;
- production files and tests to inspect;
- validation commands and recorded Implementer results;
- prohibited verifier actions;
- allowed decisions;
- expected Independent Verification Result artifact ID and fixed path.

The assignment must be generated by trusted main-process code from the exact canonical run bundle and exact Implementer result. Do not accept an assignment object from renderer input.

The complete Work Card and unrelated history must not be copied into the assignment. Use the bounded packet compiler and exact source references.

### 2. Browser-agent discoverability

The verifier assignment must be registered in the Canonical Artifact Registry and readable by exact artifact ID through the existing ChampCity MCP artifact tools.

The Execution Runs workspace must show:

- `Awaiting Independent Verifier`;
- exact assignment artifact ID;
- pass and attempt;
- exact Implementer result target;
- bounded verifier packet preview;
- refresh status.

Do not require the Operator to manually reconstruct or paste the assignment text. A copy control may exist as a fallback convenience, but canonical artifact identity is the authority.

### 3. Strict Independent Verification Result schema

Create a strict canonical result artifact type containing:

- exact assignment artifact ID and revision;
- exact continuation run, pass, attempt, packet fingerprint, and Implementer result binding;
- requirement-by-requirement findings;
- inspected production files and symbols;
- independent commands and raw result summaries;
- evidence references;
- scope findings;
- one allowed decision:
  - `verified_for_next_pass`;
  - `changes_required_in_current_pass`;
  - `governance_contradiction`;
- summary and timestamp.

Unknown fields, missing exact identities, wrong Implementer-result binding, wrong packet fingerprint, duplicate active results, unsynchronized pairs, and result artifacts authored against another run/pass/attempt must block.

### 4. Trusted result ingestion and run advancement

Trusted main-process code must discover the expected result through exact Registry authority and validate the full result payload before advancing the run.

The renderer may request refresh or ingest-by-expected-assignment identity. It may not submit the verifier decision or result body.

Behavior:

- `verified_for_next_pass` verifies P04 and advances to P05 only when all exact bindings pass.
- `changes_required_in_current_pass` keeps P04 current, creates the next attempt, preserves findings, and compiles a corrected Implementer packet.
- `governance_contradiction` blocks the run and displays the exact human-attention reasons.

The Independent Verifier must not modify production code, generate Operator acceptance, or alter tests to make implementation pass.

## P04 UI

In Supporting Tools → Execution Runs:

- show current role and state clearly;
- show the verifier assignment and bounded packet preview;
- show exact target Implementer result;
- show `Refresh verification result` or equivalent trusted refresh action;
- show verified findings or blockers after ingestion;
- do not expose free-form verifier-decision controls;
- do not expose queue, process, CLI, completion, or final acceptance controls.

## P04 Tests

Create focused suites proving:

1. Verifier assignment generation is deterministic and bounded.
2. Assignment identity binds exact Work Card, run, pass, attempt, packet fingerprint, and Implementer result.
3. Renderer cannot submit result content or a verifier decision.
4. Wrong-result, wrong-pass, wrong-attempt, wrong-fingerprint, duplicate, missing, and unsynchronized results block.
5. `verified_for_next_pass` advances to P05.
6. `changes_required_in_current_pass` creates another P04 attempt with findings.
7. `governance_contradiction` blocks and requires human attention.
8. Verifier assignment and result pairs are readable through exact Registry authority.
9. No production code path permits verifier modification of production files.

# P05 — Operator Validation Agent Execution and Evidence Capture

## Objective

Make the Operator Validation Agent operational after P04 verification and Architect authorization, while preserving the human Operator as the only acceptance authority.

## Entry Gate

P05 must not begin merely because P04 passed.

Trusted main-process code must resolve an exact synchronized Architect Review that:

- reviews the exact WC06 revision-2 implementation result;
- authorizes Operator validation;
- identifies the exact validation procedure or assignment to execute;
- does not itself perform Operator acceptance.

Missing, conflicting, stale, unsynchronized, or non-authorizing Architect Review authority must block P05.

## Required Production Behavior

### 1. Canonical Operator Validation assignment

Generate a strict canonical validation assignment from exact authority. It must include:

- project, phase, Work Card, revision, run, and validation target identities;
- exact accepted Implementer and Independent Verification result identities;
- Architect Review identity and revision;
- numbered validation steps;
- expected result for each step;
- required application state and repository selection;
- restart and persistence checks;
- blocker and negative-control checks;
- required screenshot, log, or structured evidence slots;
- subjective questions reserved for the human Operator;
- expected draft Operator Validation Report artifact ID and fixed path.

### 2. Validation Agent evidence capture

Support canonical evidence records for:

- step number;
- observed result;
- pass/fail/blocked status;
- screenshot or image artifact reference;
- log or command evidence reference;
- anomaly description;
- agent recommendation;
- unresolved subjective question.

Evidence attachments must use constrained repository-relative paths or canonical artifact references. No arbitrary filesystem paths may be accepted from renderer input.

### 3. Draft Operator Validation Report

The Validation Agent may create only a draft report with status:

`validation_executed_awaiting_operator_decision`

The draft must include each step, expected result, observed result, evidence, pass/fail result, anomalies, subjective questions, and recommended disposition.

The Validation Agent must not:

- approve or reject WC06;
- close the phase;
- mark the Work Card accepted;
- create a human Operator decision;
- infer acceptance from a green test suite or lack of objections.

### 4. Human Operator decision boundary

The application must display the draft report in a dedicated review state and provide explicit human-only actions:

- Approve;
- Reject;
- Approve with observations;
- Request additional validation.

The human decision must create a separate canonical Operator decision artifact. It must never overwrite the Validation Agent draft.

The decision action must require deliberate UI confirmation and must not be callable through the browser-agent result-ingestion endpoint.

### 5. P05 UI

Supporting Tools → Execution Runs must show:

- `Awaiting Operator Validation Agent`;
- validation assignment ID;
- validation progress by step;
- evidence references;
- draft report status;
- human-decision state.

Before a draft exists, explain what authority or evidence is missing. After a draft exists, route the human to a clear review screen rather than exposing raw JSON.

## P05 Tests

Create focused suites proving:

1. P05 blocks without exact Architect authorization.
2. Validation assignment compilation is deterministic and exact.
3. Evidence records reject arbitrary paths, wrong steps, wrong targets, and unknown fields.
4. The Validation Agent can create only `validation_executed_awaiting_operator_decision`.
5. Browser-agent ingestion cannot create human approval, rejection, or acceptance.
6. Human decisions are separate canonical artifacts and require explicit UI confirmation.
7. Approve, reject, approve-with-observations, and additional-validation routes remain distinct.
8. Restart preserves assignment, evidence, draft, and pending human decision state.
9. Existing project routing remains unchanged outside the Execution Runs supporting workspace.
10. No local runner transport, Codex CLI, hidden process spawn, or generic command execution is introduced.

# Authorized Repository Surface

- existing WC06 Work Card and Operator Approval pairs, revised canonically;
- continuation Acceptance Contract, Execution Pass Plan, and Execution Run records;
- `src/shared/executionRuns`;
- `src/main/executionRuns`;
- minimum `src/main/artifacts` changes required for new canonical types;
- constrained IPC and preload types;
- Execution Runs supporting workspace and dedicated Operator review UI;
- focused `test/wc06` suites;
- mounted Electron validation scripts;
- minimum package-script wiring;
- WC06 revision-2 Implementer Report pair;
- Registry updates produced through the canonical service.

# Prohibited Scope

Do not:

- create WC07 or another Work Card;
- reinterpret the stale Git branch label as workflow state;
- mutate or fabricate P01–P03 ledger completion;
- implement Codex CLI or local process spawning;
- add arbitrary command execution;
- add provider API integration or token-based agent calls;
- allow renderer-submitted verifier or validation decisions;
- allow an agent to perform final Operator acceptance;
- broaden unrelated workflow routing, onboarding, providers, connectors, authentication, or deployment;
- use Playwright;
- commit, push, merge, tag, release, or close the phase;
- perform human Operator acceptance.

# Validation

Use the approved normal Windows validation lane.

Run at minimum:

- `npm run typecheck`;
- focused P04 verifier-assignment/result/advancement tests;
- focused P05 validation-assignment/evidence/draft/human-boundary tests;
- existing WC04, WC05, WC06 P01–P03, and WC09 regression suites;
- repository gates;
- mounted Electron initial and restart validation;
- Canonical Artifact Registry load and synchronization verification;
- exact browser-agent artifact readability checks through ChampCity MCP-compatible artifact IDs;
- final `npm test`;
- final `git status --short`.

No Playwright.

# Required Output

Update the existing WC06 Implementer Report as revision 2 or create the exact revision-2 report pair at the existing fixed WC06 report paths, according to the canonical revision rules.

Artifact ID remains:

`champcity-ai/phase-06/implementer_report/WC06`

The report must include:

- authority-continuation bootstrap results;
- exact continuation identities and paths;
- P04 and P05 implementation summaries;
- files created, modified, and removed;
- requirement-to-production-and-test evidence;
- browser-agent assignment/result artifact IDs;
- validation commands and results;
- mounted UI evidence;
- confirmation that P01–P03 ledger history was not fabricated or rewritten;
- exact Registry revision and entry count;
- skipped checks and reasons;
- residual risks;
- final Git status;
- manual Operator validation steps;
- confirmation that no commit, push, merge, release, phase closeout, or Operator acceptance occurred.

# Manual Validation After Codex

Human checks only:

1. Open Supporting Tools → Execution Runs.
2. Open the WC06 continuation run.
3. Confirm P04 shows a separate Independent Verifier assignment bound to the exact Implementer result.
4. Confirm no free-form verifier-decision control exists.
5. After a valid verifier result is present, confirm P05 appears only when exact Architect authorization exists.
6. Confirm the Operator Validation draft is visibly separate from the human decision.
7. Confirm the only final decision actions are explicit human actions.
8. Restart and confirm continuation state persists.
9. Confirm no test fixture projects appear in the normal project selector.

# Remaining Work After P05

- Browser/MCP transport ergonomics may be improved later without changing the canonical assignment/result protocol.
- Retry limits and runner-failure escalation remain separate work.
- Automatic Git checkpoints remain separate work.
- Local Codex CLI Runner Transport remains deferred and is not implied by P04 or P05.
