# Architect Review: WC02-PREFLIGHT Repo Safety Hygiene and Local Path Redaction

Status: Repair Required Before Operator Validation
Project: ChampCity A/I
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Work Card: WC02-PREFLIGHT — Repo Safety Hygiene and Local Path Redaction
Review date: 2026-07-03
Reviewed by: Architect
Revision note: Updated to clarify that Codex/Implementer does not have ChampCity MCP access.

## Reviewed Implementer Report

- `planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC02-PREFLIGHT_repo_safety_hygiene_and_local_path_redaction.md`

## Source Work Card

- `planning/phases/phase-03/Work_Cards/WC02-PREFLIGHT_repo_safety_hygiene_and_local_path_redaction.md`
- `planning/phases/phase-03/Work_Cards/WC02-PREFLIGHT_repo_safety_hygiene_and_local_path_redaction.json`

## Review Outcome

Repair is required before Operator validation and before WC02 handoff.

The Local Path Redaction rule was added and appears substantively correct, but the preflight acceptance criteria are not fully satisfied in durable repo state.

The prior repair framing incorrectly assumed the Implementer could use ChampCity MCP. Codex does not currently have ChampCity MCP access. Codex should perform repo-local scan/redaction/report work only. Architect/Operator should perform final MCP safety staging and commit after reviewing the repair.

## Findings

### Pass: Implementer Report exists

The required preflight Implementer Report exists at:

`planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC02-PREFLIGHT_repo_safety_hygiene_and_local_path_redaction.md`

### Pass: AGENTS.md includes the intended Local Path Redaction rule

`AGENTS.md` now includes a Local Path Redaction section that applies to both Architect and Implementer outputs and requires `<PROJECT_REPO>` or repo-relative paths in committed artifacts.

### Pass: AGENTS.md staged cleanly when safety-checked by Architect

During Architect review, `AGENTS.md` was staged through the ChampCity MCP git workflow to test the safety gate. The MCP staging/readiness result showed no blocking findings for that file.

### Blocker: Preflight checkpoint is not yet durable enough

The Work Card required a focused preflight commit after the safety scan passed. Current repo state still requires final Architect/Operator MCP safety staging and commit for the preflight bundle.

### Blocker: Durable report should not rely on non-durable final chat output

The Implementer Report states that a final response records the commit hash because the report cannot embed the hash of its own commit. That is mechanically understandable, but the durable repo should still contain a follow-up note, amended report, or Architect-side record after final MCP commit.

Relying only on a chat response for final commit status defeats repo-grounded review.

### Non-blocking: Broad dirty state remains

The repo still has broad dirty state from earlier Phase 01 / Phase 02 / project / UI work. That does not automatically fail this preflight, because the Work Card allowed reporting unrelated remaining dirty files. The blocker is completion of the preflight checkpoint flow, not the existence of unrelated dirty files.

## Required Repair For Codex / Implementer

Codex does not have ChampCity MCP access. The repair pass must not claim or attempt MCP actions.

Codex should repair only the local repo artifacts and report:

1. Confirm `AGENTS.md` contains the Local Path Redaction rule applying to both Architect and Implementer outputs.
2. Confirm current Phase 03 handoff artifacts use `<PROJECT_REPO>` or repo-relative paths instead of concrete local machine paths.
3. Run a local text scan over changed text files for concrete local path patterns, including Windows user paths, macOS/Linux home paths, and escaped Windows paths.
4. Redact any remaining concrete local paths to `<PROJECT_REPO>` or repo-relative paths.
5. Update the WC02-PREFLIGHT Implementer Report so it does not claim MCP access or MCP commit actions.
6. State in the report that Codex performed local scan/readiness work and that final ChampCity MCP safety staging/commit is Architect/Operator-owned.
7. Do not implement WC02.
8. Do not push, tag, release, package, or open a PR.

## Architect / Operator Follow-Up After Codex Repair

After Codex finishes the repair:

1. Architect reviews the updated report and changed files.
2. Architect uses ChampCity MCP to stage the intended preflight files.
3. Architect uses ChampCity MCP readiness/safety checks.
4. Architect commits the preflight checkpoint if safe.
5. Architect records the final commit hash and post-commit status in a durable Architect Review or validation record.
6. Operator validates the preflight if desired.
7. WC02 may then be handed off.

## Corrected Repair Handoff

```text
WC02-PREFLIGHT needs a narrow repair before Operator validation.

Use this Architect Review as repair context:
planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC02-PREFLIGHT_repo_safety_hygiene_and_local_path_redaction.md

Important: Codex does not have ChampCity MCP access. Do not use or reference MCP actions as commands you can run.

Repair only the preflight checkpoint issue:

1. Confirm AGENTS.md contains the Local Path Redaction rule applying to both Architect and Implementer outputs.
2. Confirm current Phase 03 handoff artifacts use <PROJECT_REPO> or repo-relative paths instead of concrete local machine paths.
3. Run a local text scan over changed text files for concrete local path patterns, including Windows user paths, macOS/Linux home paths, and escaped Windows paths.
4. Redact any remaining concrete local paths to <PROJECT_REPO> or repo-relative paths.
5. Update the WC02-PREFLIGHT Implementer Report so it does not claim MCP access or MCP commit actions.
6. In the report, state that Codex performed local scan/readiness work and that Architect/Operator must perform final MCP safety-stage/commit after review.
7. Do not implement WC02.
8. Do not push, tag, release, package, or open a PR.

Create or update:
planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC02-PREFLIGHT_repo_safety_hygiene_and_local_path_redaction.md

Report required:
- files changed
- local redaction scan commands
- local scan results
- whether AGENTS.md contains the Architect/Implementer local-path rule
- any remaining dirty files
- explicit statement that final MCP staging/commit is Architect/Operator-owned
- recommended next action
```

## Recommended Next Action

Run the corrected WC02-PREFLIGHT repair pass through Codex. Do not hand off WC02 until the repair is complete and the Architect has performed the MCP-side final safety/commit checkpoint.
