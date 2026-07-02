# Generic Work Card Prompt Pack — v15

This prompt pack implements the v15 Work Card workflow:

```text
Capture → Frame → Plan → Build → Prove
```

Use the Actions in order. Do not use this as a loose prompt library. Each Action tells you the next Action.

The main user-facing artifact is:

```text
planning/work/[YYYY-MM-DD-short-slug]/WORK_CARD.md
```

For large or risky bodies of work, a phase may contain multiple Work Cards:

```text
planning/phases/[YYYY-MM-DD-phase-name]/PHASE_CARD.md
```

## How to use this prompt pack

Actions 0–4 set up or prove project memory.

Actions 5–13 repeat for each Work Card.

Action 14 manages phase containers.

Action 15 is for designing or coding an application that automates this workflow.

```text
0. Choose Mode and Next Action
1. Capture Project Setup
2. Frame Project Memory
3. Build Project Memory
4. Prove Project Readiness
5. Capture Work Card
6. Frame Work Card
7. Plan Work Card
8. Approve or Revise Plan
9. Build Work Card
10. Capture Builder Report
11. Prove Work
12. Repair Failed Work
13. Close Work Card
14. Manage Phase Loop
15. Design the Workflow Application MVP
```

## Workflow modes

| Mode | Use when | Planning rule |
|---|---|---|
| Quick Fix | Tiny low-risk edit | Action 7 may be skipped after Action 6 explicitly says direct build is safe. |
| Standard Work Card | Normal bug, feature, or improvement | Use Actions 5–13. |
| Full Phase | Multi-pass, high-risk, or broad work | Use Action 14 to create a phase, then run Actions 5–13 for each Work Card. |

## Artifact rule

If an output will be used later, save it as a Markdown artifact.

Default v15 artifact:

```text
WORK_CARD.md
```

Optional high-audit artifacts:

```text
BUILDER_PLAN.md
PLAN_APPROVAL.md
BUILDER_REPORT.md
VALIDATION_RECORD.md
REPAIR_RECORD.md
CLOSEOUT.md
```

Use optional high-audit artifacts only when the project is high-risk, regulated, multi-team, or benefits from separate records. Otherwise, put these sections inside `WORK_CARD.md`.

---

## Action 0 — Choose Mode and Next Action — Architect

Use this when the user is unsure what to do next.

```text
Act as Architect.

Goal:
Decide the simplest correct next workflow Action for the user's request.

User request:
[PASTE USER REQUEST]

Known project context, if any:
[PASTE PROJECT PROFILE, WORK CARD, PHASE CARD, OR WRITE UNKNOWN]

Rules:
- Prefer the simplest workflow that preserves safety and clarity.
- Do not require a full phase scaffold for a small task.
- Do not skip planning for risky or unclear work.
- Do not ask the user to choose old prompt numbers.
- If the request is a bug, feature, refactor, setup task, research task, or documentation task, route to Work Card flow.
- If the request is a broad body of work that requires multiple Work Cards, route to Phase flow.
- If project memory does not exist or is too vague for Builder work, route to Project Setup.

Classify mode:
- Quick Fix
- Standard Work Card
- Full Phase
- Project Setup
- Project Readiness
- Repair
- Closeout

Return:
1. Recommended mode.
2. Recommended next Action number and name.
3. Reason in plain language.
4. What the user needs to provide next, if anything.
5. Whether planning can be skipped, must be done, or requires explicit human approval.
6. Any safety or scope warning.
```

---

## Action 1 — Capture Project Setup — Architect

Use this once at the beginning of a new project, or when an existing project lacks durable AI-development context.

```text
Act as Architect and run a novice-friendly project setup capture.

Known project information:
[PASTE ROUGH IDEA, NOTES, PRODUCT BRIEF, ROADMAP, OR WRITE NONE]

Goal:
Capture only the information needed to create durable project memory.

Ask only questions that are truly needed. When a safe default is obvious, propose it and let the user approve it.

Capture fields:
1. Project name.
2. Plain-language project summary.
3. Primary users or operators.
4. Problem being solved.
5. Desired outcome.
6. Current stage: idea, prototype, MVP, alpha, beta, production, maintenance, or unknown.
7. Workspace or source-of-truth location, if known.
8. Builder tool, if known.
9. Architect surface, if known.
10. Allowed validation.
11. Disallowed validation.
12. Human validation responsibilities.
13. Security or data-handling constraints.
14. Explicit non-goals.
15. Known risks.
16. First likely Work Card or phase.

Novice rule:
Do not ask the user to invent architecture, persistence, Git policy, testing strategy, security policy, or deployment policy from a blank page. Offer safe plain-language defaults.

Return:
1. Questions, only if blocking.
2. Assumptions made.
3. Completed project setup capture.
4. Recommended defaults the user may approve as a bundle.
5. Whether project memory is ready to Frame.
6. Next Action: Action 2 — Frame Project Memory.
```

---

## Action 2 — Frame Project Memory — Architect

Use this after project setup capture.

```text
Act as Architect.

Project setup capture:
[PASTE ACTION 1 OUTPUT]

Existing project files, if any:
- AGENTS.md: [ATTACH/PASTE OR WRITE UNKNOWN]
- planning/project/PROJECT_PROFILE.md: [ATTACH/PASTE OR WRITE UNKNOWN]
- planning/project/ENVIRONMENT.md: [ATTACH/PASTE OR WRITE UNKNOWN]
- planning/project/DECISIONS.md: [ATTACH/PASTE OR WRITE UNKNOWN]
- planning/project/RISKS.md: [ATTACH/PASTE OR WRITE UNKNOWN]

Goal:
Create durable project memory that future Work Cards can use.

Create or revise these Markdown artifacts:
- planning/project/PROJECT_PROFILE.md
- planning/project/PROJECT_STATE.md
- planning/project/ENVIRONMENT.md
- planning/project/DECISIONS.md
- planning/project/RISKS.md
- planning/project/GLOSSARY.md
- planning/project/CHANGE_LOG.md
- Root AGENTS.md draft or patch notes

Rules:
- Keep project memory concise.
- Do not include secrets.
- Do not include temporary chat context.
- Mark unknown setup commands as unknown instead of inventing them.
- Make validation limits explicit.
- Make human approval responsibilities explicit.

Return:
1. Plain-language project summary.
2. Project memory file contents.
3. AGENTS.md draft or patch.
4. Project setup decisions.
5. Project risks.
6. Builder prompt for Action 3 — Build Project Memory.
7. Next Action: Action 3.
```

---

## Action 3 — Build Project Memory — Builder

Use this to create or update the project planning files and root AGENTS.md. Do not implement product features in this Action.

```text
You are the Builder for [PROJECT NAME].

Before making changes:
1. Print the current working directory or active workspace.
2. Confirm it matches: [EXPECTED WORKSPACE].
3. Confirm the source of truth matches: [EXPECTED SOURCE OF TRUTH].
4. If the workspace or source of truth is wrong, stop without editing.

Controlling input:
[PASTE ACTION 2 PROJECT MEMORY CONTENT]

Task:
Create or update project memory files.

Allowed file updates:
- AGENTS.md
- planning/project/PROJECT_PROFILE.md
- planning/project/PROJECT_STATE.md
- planning/project/ENVIRONMENT.md
- planning/project/DECISIONS.md
- planning/project/RISKS.md
- planning/project/GLOSSARY.md
- planning/project/CHANGE_LOG.md
- planning/work/.gitkeep
- planning/phases/.gitkeep

Preservation rules:
- Do not modify application source files.
- Do not initialize frameworks.
- Do not install dependencies.
- Do not run application tests unless explicitly requested.
- Do not print or store secrets.
- Preserve existing decision and risk history; append rather than overwrite when possible.

AGENTS.md rules:
- Keep AGENTS.md concise.
- Include source-of-truth, workspace verification, planning folder, scope limits, validation limits, security rules, and final report requirements.
- Do not paste full phase plans or large transcripts into AGENTS.md.

Final report:
1. Workspace verification result.
2. Files created.
3. Files updated.
4. Files skipped and why.
5. Any conflicts.
6. Confirmation that no source files were changed.
7. Recommended next Action: Action 4 — Prove Project Readiness.
```

---

## Action 4 — Prove Project Readiness — Builder

Use this after project memory exists and before meaningful implementation.

```text
You are the Builder for [PROJECT NAME].

Before making changes:
1. Print the current working directory or active workspace.
2. Confirm it matches: [EXPECTED WORKSPACE].
3. Confirm the source of truth matches: [EXPECTED SOURCE OF TRUTH].
4. Confirm whether AGENTS.md exists.
5. If the workspace or source of truth is wrong, stop without editing.

Task:
Audit development readiness. Do not implement product features.

Inspect and report:
1. Whether this is a Git repository.
2. Current branch.
3. Remote URL, if any.
4. Working tree status.
5. Whether uncommitted changes exist.
6. Detected language, runtime, framework, and package manager.
7. Dependency files present.
8. Whether dependencies appear installed.
9. Install command, if inferable.
10. Start/dev command, if inferable.
11. Build command, if inferable.
12. Test, lint, or typecheck commands, if inferable.
13. Whether .gitignore protects common build artifacts and env files.
14. Whether .env or secret-bearing files appear present. Do not print secret values.
15. Whether .env.example or equivalent exists.
16. Checks that can be run safely now.
17. Checks that require human approval.
18. Manual validation likely required.

Allowed file updates:
- planning/project/ENVIRONMENT.md
- planning/project/PROJECT_STATE.md
- planning/project/RISKS.md
- planning/project/CHANGE_LOG.md

Do not:
- Install dependencies.
- Initialize frameworks.
- Run destructive commands.
- Print secrets.
- Modify source files.

Final report:
1. Workspace verification.
2. Git/source-control status.
3. Detected stack and package manager.
4. Commands discovered.
5. Missing setup documentation.
6. Secret/env risks without exposing values.
7. Checks run.
8. Checks skipped and why.
9. Whether Work Card implementation can proceed.
10. Recommended next Action: Action 5 — Capture Work Card.
```

---

## Action 5 — Capture Work Card — Architect

Use this for every bug, feature, setup task, refactor, research task, or documentation request.

```text
Act as Architect and help a non-technical user capture one Work Card.

Raw user request:
[PASTE USER REQUEST]

Evidence provided:
[SCREENSHOTS, LOGS, URLS, RECORDING NOTES, ERROR TEXT, OR WRITE NONE]

Project memory:
[PASTE PROJECT PROFILE OR SUMMARY, IF AVAILABLE]

Goal:
Capture the user's intent without asking them to diagnose code.

Classify work type:
- Bug
- Feature
- Refactor
- Setup
- Research
- Documentation
- Phase goal
- Unknown

For a bug, capture:
1. What the user was trying to do.
2. What happened right before the problem.
3. Expected behavior.
4. Actual behavior.
5. Frequency: always, sometimes, once, unknown.
6. Severity: blocking, serious, annoying, cosmetic, unknown.
7. Evidence.

For a feature, capture:
1. Who it is for.
2. What they should be able to do.
3. Why it matters.
4. What should not change.
5. How the user will know it works.
6. Examples or references.

For other work, capture:
1. Desired outcome.
2. Boundaries.
3. Evidence or examples.
4. Success definition.

Question rule:
Ask at most three questions, and only if the missing information blocks safe framing. If enough information exists, do not ask more questions; produce the capture summary.

Return:
1. Work type.
2. Plain-language capture summary.
3. Evidence summary.
4. Missing information, if any.
5. Questions, only if blocking.
6. Whether this can proceed to framing.
7. Next Action: Action 6 — Frame Work Card.
```

---

## Action 6 — Frame Work Card — Architect

Use this after Capture. This Action creates the actual `WORK_CARD.md` content.

```text
Act as Architect.

Captured work item:
[PASTE ACTION 5 OUTPUT]

Project memory:
[PASTE PROJECT PROFILE, AGENTS RULES, ENVIRONMENT SUMMARY, OR WRITE UNKNOWN]

Goal:
Convert the captured user request into a precise Work Card for an AI Builder.

Rules:
- The user describes behavior; the Architect writes the spec.
- Do not ask the user for technical diagnosis.
- Use observable acceptance criteria.
- Mark assumptions clearly.
- Keep scope narrow.
- Add out-of-scope boundaries.
- Assign risk tier: Quick Fix, Standard Change, or High Risk.
- Decide whether Builder no-edit planning is required.

Risk tier rules:
- Quick Fix: tiny, obvious, low-risk, minimal surface area.
- Standard Change: normal user-visible bug, feature, or bounded improvement.
- High Risk: auth, permissions, payments, data deletion, migrations, secrets, production, compliance, broad refactor, or unclear scope.

Return:
1. Plain-language summary for user review.
2. Scope.
3. Out of scope.
4. Acceptance criteria.
5. Validation checklist.
6. Evidence list.
7. Risk tier.
8. Planning decision: Skip Plan / Plan Required / Full Approval Required.
9. Recommended path and filename for the Work Card.
10. Complete `WORK_CARD.md` content.
11. If Quick Fix and safe, Builder prompt for Action 9.
12. If Standard or High Risk, Builder prompt for Action 7.
13. Next Action.

WORK_CARD.md must include:
# Work Card — [Short Name]

## Status

## Plain-Language Summary

## User Report

## Work Type

## Risk Tier

## Scope

## Out of Scope

## Acceptance Criteria

## Validation Checklist

## Evidence

## Builder Plan

## Plan Approval

## Build Report

## Human Validation

## Repair Notes

## Decisions and Risks

## Learning Updates

## Closeout
```

---

## Action 7 — Plan Work Card — Builder

Use this for Standard Change and High Risk Work Cards. This is a no-edit planning pass.

```text
You are the Builder for [PROJECT NAME].

Before making changes:
1. Print the current working directory or active workspace.
2. Confirm it matches: [EXPECTED WORKSPACE].
3. Read AGENTS.md if it exists.
4. Read the Work Card.
5. If the workspace is wrong or the Work Card is missing, stop without editing.

Work Card:
[ATTACH OR PASTE WORK_CARD.md]

Task:
Inspect the project and produce a no-edit plan. Do not modify files.

Your plan must include:
1. Your understanding of the Work Card.
2. Files or areas likely involved.
3. Files or areas that should not change.
4. Proposed change.
5. Checks you expect to run.
6. Checks you cannot run and why.
7. Manual validation needed from the human user.
8. Risks and regression points.
9. Whether the work should be split smaller.
10. Any conflict between the Work Card and current code/project state.

Rules:
- Do not broaden scope.
- Do not propose unrelated refactors.
- Do not add dependencies unless clearly justified and marked for approval.
- Do not expose secrets.
- Do not edit files.

Return:
1. No-edit Builder plan.
2. Recommended approval status: Proceed / Revise / Split / Blocked.
3. Questions or blockers.
4. Markdown content to append to the `## Builder Plan` section of WORK_CARD.md.
5. Next Action: Action 8 — Approve or Revise Plan.
```

---

## Action 8 — Approve or Revise Plan — Architect

Use this after the Builder produces a no-edit plan.

```text
Act as Architect.

Work Card:
[PASTE WORK_CARD.md]

Builder no-edit plan:
[PASTE ACTION 7 OUTPUT]

Goal:
Decide whether the Builder plan is safe, scoped, and ready to implement.

Review for:
1. Alignment with Work Card scope.
2. Out-of-scope changes.
3. Unauthorized dependencies.
4. Unrelated refactors.
5. Missing validation.
6. Missing human validation.
7. Risk of regression.
8. Whether the pass should be split.
9. Whether any user approval is required.

Return:
1. Approval status: Approved / Approved with Changes / Rejected / Split Required / Blocked.
2. Plain-language reason.
3. Final approved pass objective.
4. Any plan edits.
5. Any human approval required before build.
6. Markdown content to append to `## Plan Approval` in WORK_CARD.md.
7. Builder implementation prompt for Action 9.
8. Next Action: Action 9 if approved, Action 7 if revised, or Action 5/6 if the Work Card must be reframed.
```

---

## Action 9 — Build Work Card — Builder

Use this after a Quick Fix is framed for direct build or after a Standard/High Risk plan is approved.

```text
You are the Builder for [PROJECT NAME].

Before making changes:
1. Print the current working directory or active workspace.
2. Confirm it matches: [EXPECTED WORKSPACE].
3. Read AGENTS.md if it exists.
4. Read the approved Work Card.
5. If this is Standard or High Risk work, confirm that the plan approval is present.
6. If workspace, source of truth, or approval is missing, stop without editing.

Approved Work Card:
[ATTACH OR PASTE WORK_CARD.md]

Approved pass objective:
[PASTE APPROVED PASS OBJECTIVE]

Task:
Implement only the approved Work Card or approved pass.

Hard constraints:
- Do not broaden scope.
- Do not change unrelated behavior.
- Do not perform unrelated refactors.
- Do not introduce dependencies unless explicitly approved.
- Do not hard-code only to the validation example.
- Do not print secrets.
- Do not run disallowed validation.

After implementation:
1. Run allowed relevant checks if available.
2. Update project planning files only if the Work Card explicitly instructs it or if reporting updates are required.
3. Prepare a final report.

Final report must include:
1. Files changed.
2. Plain-language summary of changes.
3. Checks run.
4. Checks skipped and why.
5. Manual validation checklist.
6. Residual risks.
7. Any new decision or risk that should be added to project memory.
8. Recommended next Action: Action 10 — Capture Builder Report.
```

---

## Action 10 — Capture Builder Report — Architect

Use this immediately after the Builder reports implementation or repair results.

```text
Act as Architect.

Work Card:
[PASTE WORK_CARD.md]

Builder final report:
[PASTE ACTION 9 OR ACTION 12 BUILDER REPORT]

Goal:
Convert the Builder report into durable Work Card updates and a human validation checklist.

Rules:
- Do not mark the Work Card as closed unless human validation already passed.
- Separate Builder-run checks from human validation.
- Preserve skipped checks and residual risks.
- Translate technical details into plain language for the user.

Return:
1. Build report summary for `## Build Report`.
2. Checks run.
3. Checks skipped and why.
4. Manual validation checklist for `## Human Validation`.
5. Residual risks for `## Decisions and Risks`.
6. Updated Work Card status: Built / Proving / Repairing / Blocked.
7. Any project-memory updates to consider.
8. Next Action: Action 11 — Prove Work.
```

---

## Action 11 — Prove Work — Architect

Use this when the human user has tested the result, or when the system needs to guide the user through validation.

```text
Act as Architect and guide a non-technical human validation pass.

Work Card:
[PASTE WORK_CARD.md]

Builder report summary:
[PASTE ACTION 10 OUTPUT OR WRITE INCLUDED IN WORK CARD]

Raw human observations:
[PASTE USER NOTES, SCREENSHOT DESCRIPTIONS, LOGS, ERRORS, OR WRITE NONE]

Goal:
Determine whether the Work Card passed, failed, is unclear, or revealed a different problem.

Ask only for missing information that is required to judge acceptance criteria.

For each acceptance criterion, classify:
- Passed
- Failed
- Unclear
- Deferred by human decision

User-facing result options:
- Works
- Still broken
- Not sure
- Different problem

Rules:
- Do not ask the user to diagnose code.
- Ask for evidence when validation fails.
- If a different problem is discovered, keep this Work Card focused. Recommend opening a new Work Card if the original acceptance criteria passed.

Return:
1. Validation result: Passed / Failed / Unclear / Different Problem / Deferred.
2. Acceptance criteria status table.
3. Evidence summary.
4. Markdown content for `## Human Validation`.
5. If failed or unclear, recommended next Action: Action 12 — Repair Failed Work.
6. If passed or accepted with deferrals, recommended next Action: Action 13 — Close Work Card.
```

---

## Action 12 — Repair Failed Work — Architect then Builder

Use this when validation failed or is unclear. This Action has two parts: Architect repair triage and Builder repair.

### Part A — Architect repair triage

```text
Act as Architect.

Work Card:
[PASTE WORK_CARD.md]

Validation result:
[PASTE ACTION 11 OUTPUT]

Evidence:
[SCREENSHOTS, LOGS, ERRORS, USER OBSERVATIONS, OR WRITE NONE]

Goal:
Convert failed validation into a narrow repair objective.

Analyze:
1. Which acceptance criteria failed.
2. Whether the failure appears to be implementation, expectation mismatch, environment, incomplete validation, or new unrelated problem.
3. Whether the Work Card must be reframed before repair.
4. What the Builder should fix.
5. What the Builder must not touch.
6. What validation should be rerun.

Return:
1. Root-cause hypothesis, marked as hypothesis.
2. Narrow repair objective.
3. Out-of-scope list.
4. Evidence summary.
5. Markdown content for `## Repair Notes`.
6. Builder repair prompt for Part B.
7. Next Action after repair: Action 9 or Part B below.
```

### Part B — Builder repair

```text
You are repairing a failed Work Card for [PROJECT NAME].

Before making changes:
1. Print the current working directory or active workspace.
2. Confirm it matches: [EXPECTED WORKSPACE].
3. Read AGENTS.md if it exists.
4. Read the Work Card and repair objective.
5. If the workspace or repair objective is unclear, stop without editing.

Work Card:
[ATTACH OR PASTE WORK_CARD.md]

Repair objective:
[PASTE NARROW REPAIR OBJECTIVE]

Evidence:
[PASTE EVIDENCE SUMMARY]

Hard constraints:
- Fix only the failed behavior described in the repair objective.
- Do not redesign the feature.
- Do not change unrelated files.
- Do not introduce new dependencies unless explicitly approved.
- Do not run disallowed validation.
- Do not print secrets.

After repair:
1. Run relevant allowed checks.
2. Produce a repair report.

Final report:
1. Root cause, if discovered.
2. Files changed.
3. Fix summary.
4. Checks run.
5. Checks skipped and why.
6. Manual validation required.
7. Residual risks.
8. Recommended next Action: Action 10 — Capture Builder Report, then Action 11 — Prove Work again.
```

---

## Action 13 — Close Work Card — Architect

Use this after validation passes or after the human accepts deferrals.

```text
Act as Architect.

Work Card:
[PASTE WORK_CARD.md]

Validation result:
[PASTE ACTION 11 OUTPUT]

Builder report:
[PASTE ACTION 10 OUTPUT OR SUMMARY]

Goal:
Close the Work Card and update durable project memory only when useful.

Check:
1. Acceptance criteria status.
2. Evidence references.
3. Deferred work, if any.
4. Decisions to preserve.
5. Risks or debt to preserve.
6. Lessons that should update AGENTS.md or project memory.
7. Whether a new Work Card or next phase is recommended.

Rules:
- Do not update AGENTS.md for one-off details.
- Do update project memory for recurring Builder mistakes, stable commands, source-of-truth corrections, or durable conventions.
- If a new problem was discovered, open a new Work Card instead of expanding this one.

Return:
1. Closeout status: Closed / Closed with Deferrals / Cancelled / Not Ready.
2. Plain-language closeout summary.
3. Markdown content for `## Closeout`.
4. Project-memory updates, if any.
5. Change-log entry, if any.
6. Suggested commit/archive message, if useful.
7. Recommended next Action: Action 5 for next Work Card, Action 14 for phase management, or stop.
```

---

## Action 14 — Manage Phase Loop — Architect

Use this for broad work that should contain multiple Work Cards.

```text
Act as Architect and manage a phase using the same five-step model.

Project memory:
[PASTE PROJECT PROFILE OR SUMMARY]

Phase request or current phase state:
[PASTE PHASE GOAL, PRIOR PHASE HANDOFF, PHASE_CARD.md, OR WRITE NONE]

Goal:
Create, update, or close a phase container without making the phase process confusing.

A phase follows:
Capture → Frame → Plan → Build → Prove.

For a new phase, return:
1. Phase name.
2. Phase goal.
3. Why this phase matters.
4. In scope.
5. Out of scope.
6. Phase acceptance criteria.
7. Initial Work Cards.
8. Risk notes.
9. Recommended first Work Card.
10. `PHASE_CARD.md` content.
11. Next Action: Action 5 — Capture Work Card for the first Work Card.

For an active phase, return:
1. Current phase status.
2. Open Work Cards.
3. Blocked Work Cards.
4. Closed Work Cards.
5. Risks and decisions.
6. Recommended next Work Card.
7. Next Action.

For phase closeout, check:
1. Required Work Cards are closed, deferred, or cancelled.
2. Phase acceptance criteria are passed, deferred, or clearly unresolved.
3. Evidence is referenced.
4. Decisions and risks are promoted to project memory.
5. Next phase recommendation exists.

For phase closeout, return:
1. Closeout status: Ready / Not Ready / Ready with Deferrals.
2. Missing information.
3. Accepted deferrals.
4. Decisions to promote.
5. Risks to promote.
6. Handoff to next phase.
7. Updated `PHASE_CARD.md` content.
8. Next Action.
```

---

## Action 15 — Design the Workflow Application MVP — Product Architect

Use this when planning or coding the application that will automate this manual workflow.

```text
Act as Product Architect for an application that operationalizes the Work Card workflow.

Goal:
Design the smallest useful software product that supports non-technical users through:
Capture → Frame → Plan → Build → Prove.

Current manual workflow:
[PASTE CURRENT WORKFLOW OR WRITE v15 WORK CARD MODEL]

Target users:
[PASTE TARGET USERS]

Builder tools expected:
[Codex, Claude Code, Cursor, Lovable, human implementer, or other]

Design the MVP around these principles:
- The user should not see prompt IDs as the primary workflow.
- The user should not manually manage handoff files.
- The user should describe behavior; the app should create the Work Card.
- The app should preserve approval gates for risky changes.
- The app should keep evidence and validation tied to acceptance criteria.
- The app should support repair without open-ended back-and-forth.
- The app should update project memory only for durable learnings.

Return:
1. Product thesis.
2. MVP scope.
3. Non-goals.
4. Core user flows.
5. Core screens.
6. Core data entities.
7. Suggested database or file-backed schema.
8. Prompt-composition architecture.
9. Builder integration architecture.
10. Risk-router logic.
11. Artifact-writing logic.
12. Human validation flow.
13. Repair flow.
14. Closeout and learning flow.
15. Recommended first coding milestone.
16. Second coding milestone.
17. V2 backlog.
18. Risks and guardrails.
19. Acceptance criteria for the MVP.
20. Implementation Work Cards to create next.
```

---

## Work Card template

```markdown
# Work Card — [Short Name]

## Status
Open

## Plain-Language Summary
[What the user wants or what is broken.]

## User Report
[Raw or lightly cleaned user report.]

## Work Type
Bug / Feature / Refactor / Setup / Research / Documentation / Phase

## Risk Tier
Quick Fix / Standard Change / High Risk

## Scope
[What may change.]

## Out of Scope
[What must not change.]

## Acceptance Criteria
- [Observable pass condition.]
- [Observable pass condition.]

## Validation Checklist
- [What Builder can check.]
- [What human must check.]

## Evidence
- [Screenshot, log, URL, recording, example, or none.]

## Builder Plan
[No-edit plan or note that plan was skipped because this is a Quick Fix.]

## Plan Approval
[Approved / Approved with Changes / Rejected / Split Required / Not Required.]

## Build Report
[Files changed, summary, checks run, checks skipped, manual validation, residual risks.]

## Human Validation
[Acceptance criteria status, evidence, pass/fail/unclear.]

## Repair Notes
[Repair attempts and outcomes.]

## Decisions and Risks
[Durable decisions or risks from this Work Card.]

## Learning Updates
[Updates recommended for project memory or AGENTS.md.]

## Closeout
[Closed, closed with deferrals, cancelled, or not ready.]
```

## Phase Card template

```markdown
# Phase Card — [Phase Name]

## Status
Open

## Phase Goal
[Outcome this phase should create.]

## Why This Phase Matters
[User or business reason.]

## In Scope
[What this phase includes.]

## Out of Scope
[What this phase excludes.]

## Phase Acceptance Criteria
- [Observable phase-level pass condition.]

## Work Cards
- [Work Card slug] — [Status]

## Validation Summary
[Phase-level validation status.]

## Decisions and Risks
[Decisions and risks to preserve.]

## Handoff to Next Phase
[What the next phase should know.]
```

## Legacy v14 prompt mapping for migration only

Do not use this as the primary workflow.

| v14 prompt | v15 Action |
|---|---|
| Prompt 0 | Action 1 |
| Prompt 1 | Action 2 |
| Prompt 1A / 1B | Action 2 / 3 |
| Prompt 4 / 4A / 4B / 4C | Action 3 / 4 |
| Prompt 3A / 6 / 6A / 7 | Action 5 / 6 / 14 |
| Prompt 8 / 8A | Action 7 / 8 |
| Prompt 9 / 9A | Action 9 / 10 |
| Prompt 11A / 11 | Action 11 |
| Prompt 10A / 10 | Action 12 |
| Prompt 12A / 12 / 13 | Action 13 / 14 |
| Prompt 2 | Action 14 |
| Prompt 15 | Action 15 |
