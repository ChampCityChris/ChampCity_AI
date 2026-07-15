<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC02-PREFLIGHT_repo_safety_hygiene_and_local_path_redaction",
  "artifactType": "work_card",
  "createdAt": "2026-07-03T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC02-PREFLIGHT_repo_safety_hygiene_and_local_path_redaction.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC02-PREFLIGHT_repo_safety_hygiene_and_local_path_redaction.md",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Repo Safety Hygiene and Local Path Redaction"
  },
  "payloadHash": "sha256:c2a2303170a6e0016482d9ff684952941fdc2d5eea7c0c8e30322540f58166ab",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 3,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Work Card: Repo Safety Hygiene and Local Path Redaction

## Work Card ID

WC02-PREFLIGHT

Created: 2026-07-03
Updated: 2026-07-03

## Phase

phase-03 — Workflow Router Screen Correction and Guided Current Action UI

## Status

ready_for_implementer

## Purpose

Make the repo safe to stage and commit before WC02 implementation begins, and update project rules so future Architect and Implementer artifacts do not write concrete local machine paths into durable repo artifacts.

This Work Card is a preflight safety Work Card. It does not replace WC02. WC02 should not be handed to the Implementer until this preflight pass is complete, reviewed, and committed or explicitly waived by the Operator.

## Source Context

Phase 03 approval and current Work Card sequence:

- `planning/phases/phase-03/Operator_Phase_Approval.md`
- `planning/phases/phase-03/Work_Card_Plan.md`
- `planning/phases/phase-03/Work_Cards/WC02_durable_current_required_action_model.md`

Recent commit checkpoint:

- `8405e906b244070599dbb1f211ba51397e399fdb`
- Commit message: `Phase 03 WC01 validation and WC02 handoff`

Known issue:

The MCP git safety gate blocked broad staging because multiple changed files contained concrete local path patterns. The Architect also needs to follow the same rule as the Implementer: durable committed artifacts must not contain concrete local machine paths.

## Problem

The repo contains changed text artifacts with local-path patterns. This prevents safe staging/committing through the MCP git workflow and creates a repeatable leak risk in Work Cards, Implementer Reports, validation records, closeout records, and handoff prompts.

The project needs a durable rule and a cleanup pass before WC02 implementation starts.

## Goal

Perform a complete safety repo hygiene pass for local-path leakage and update `AGENTS.md` so both Architect and Implementer outputs use safe placeholders and repo-relative paths.

The standard placeholder is:

```text
<PROJECT_REPO>
```

The standard way to reference files inside the repo is repo-relative path notation, for example:

```text
planning/phases/phase-03/Work_Cards/WC02_durable_current_required_action_model.md
```

## Included Scope

- Scan changed and relevant tracked text artifacts for concrete local path patterns.
- Redact concrete local repository paths to `<PROJECT_REPO>`.
- Prefer repo-relative paths for files inside the project.
- Update `AGENTS.md` with a Local Path Redaction rule applying to both Architect and Implementer artifacts.
- Update any current Phase 03 handoff text that still encourages concrete local path output.
- Confirm WC02 handoff uses `<PROJECT_REPO>` and repo-relative paths only.
- Stage and commit the safety-hygiene changes after the MCP pre-commit safety scan passes.
- Create a required Implementer Report for this preflight Work Card.

## Out Of Scope

- Do not implement WC02 durable current required action model.
- Do not implement the Figma workflow-router UI shell.
- Do not perform broad UI redesign.
- Do not change workflow-router product scope.
- Do not rename historical `Implementer_*` folders.
- Do not delete historical artifacts unless explicitly necessary and approved by the Operator.
- Do not push to remote unless the Operator explicitly requests it.
- Do not alter secrets, credentials, provider configuration, package credentials, or environment files.

## Required Redaction Policy

Add or update `AGENTS.md` with a rule equivalent to:

```text
## Local Path Redaction

Do not write concrete local machine paths into committed artifacts, Work Cards, Implementer Reports, validation records, closeout records, planning documents, or handoff prompts.

Use `<PROJECT_REPO>` to refer to the local repository root.

Use repo-relative paths for files inside the project, for example:
`planning/phases/phase-03/Work_Cards/WC02_durable_current_required_action_model.md`.

Implementers and Architects may verify the actual local path during execution, but reports must record that as “verified approved repo root” rather than printing the concrete local path.

Do not use concrete Windows, macOS, Linux, or home-directory paths in durable committed artifacts. Use `<PROJECT_REPO>` or repo-relative paths instead.
```

The wording may be refined, but the rule must clearly bind both Architect and Implementer outputs.

## Search Targets

Scan at minimum:

- `AGENTS.md`
- `docs/`
- `planning/`
- `scripts/`
- `src/`

Focus on text files that may be committed. Skip binary files unless the MCP safety scan reports them as text or the Operator explicitly asks to inspect them.

## Redaction Examples

Use:

```text
<PROJECT_REPO>
```

Instead of concrete local repo roots.

Use:

```text
<PROJECT_REPO>/planning/phases/phase-03/Validation_Targets/example.json
```

Or, preferably:

```text
planning/phases/phase-03/Validation_Targets/example.json
```

Do not preserve concrete local user or home-directory paths in committed artifacts.

## Commit Scope

This Work Card should create a focused safety-hygiene commit. The commit may include:

- `AGENTS.md`
- redacted planning/report/validation artifacts
- redacted work cards or handoff prompts
- a preflight Implementer Report

Do not commit unrelated code changes unless the safety scan requires a specific text redaction in those files.

If broad dirty state remains after the preflight commit, report it clearly without attempting a full unrelated cleanup.

## Acceptance Criteria

- `AGENTS.md` contains a clear Local Path Redaction rule binding Architects and Implementers.
- Current WC02 handoff and related Phase 03 artifacts use `<PROJECT_REPO>` or repo-relative paths instead of concrete local machine paths.
- The MCP pre-commit safety scan passes for the staged preflight commit.
- A focused preflight commit is created locally.
- No push is performed unless separately requested.
- A preflight Implementer Report exists at the required path.
- The report lists files changed, redaction strategy, safety scan result, commit hash, remaining unstaged/dirty files, and recommended next action.

## Validation

- Run the MCP or local equivalent of a pre-commit safety scan on staged files.
- Confirm no staged file contains concrete local machine path patterns.
- Run `git status --short` and report remaining dirty files after commit.
- If source code is changed only for redaction of strings/comments, run the lightweight validation lane appropriate for changed files. Do not broaden this into WC02 implementation validation.

## Risk Level

medium

## Implementer Instructions

You are acting as Implementer for ChampCity A/I.

Repository root placeholder: `<PROJECT_REPO>`
Expected remote: `ChampCityChris/ChampCity_AI`

Before editing:

1. Verify repo root and remote, but do not print the concrete local repo path in committed artifacts.
2. Read `AGENTS.md`.
3. Review the current git status.
4. Review the MCP safety-gate findings if available.
5. Keep this pass limited to local-path redaction and safety-rule documentation.

Deliverable report path:

```text
planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC02-PREFLIGHT_repo_safety_hygiene_and_local_path_redaction.md
```

The report must include:

- Summary of changes.
- Files changed.
- Redaction policy used.
- Whether `AGENTS.md` was updated.
- Safety scan results.
- Commit hash if a commit was created.
- Remaining dirty files after commit.
- Whether WC02 is safe to hand off.

## Implementer Handoff Prompt

```text
You are acting as Implementer for ChampCity A/I.

Work Card: WC02-PREFLIGHT — Repo Safety Hygiene and Local Path Redaction

Repository root placeholder: <PROJECT_REPO>
Expected remote: ChampCityChris/ChampCity_AI

Goal:
Make the repo safe to stage/commit before WC02 implementation begins and update AGENTS.md so both Architect and Implementer artifacts avoid concrete local machine paths.

Use this Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC02-PREFLIGHT_repo_safety_hygiene_and_local_path_redaction.md

Do not rely on chat context beyond this instruction. Use <PROJECT_REPO> and repo-relative paths in all committed artifacts. Create the required Implementer Report when complete.
```
