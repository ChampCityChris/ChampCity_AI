# Generic Work Card Project Scaffolding Guide — v15

## Purpose

This guide defines a simpler Architect / Builder workflow for people who want to design, build, fix, or improve software with AI assistance but do not want to manage a complicated prompt system.

The main mental model is:

```text
Capture → Frame → Plan → Build → Prove
```

A non-technical user should only need to understand this:

```text
Tell us what happened or what you want.
The Architect turns that into a clear Work Card.
The Builder plans the change.
The Builder makes the change.
You confirm whether it works.
```

The system may still use project files, Builder prompts, validation records, and durable Markdown artifacts internally. The user-facing workflow should not require the user to choose old prompt IDs, remember file names, or decide which handoff artifact comes next.

## What changed in v15

v15 changes the workflow from a prompt-number checklist into a Work Card loop.

The old v14 workflow was rigorous but exposed too much internal machinery: prompt numbers, handoff files, scaffold creation steps, dry-run approvals, report captures, validation captures, repair prompts, closeout reviews, and commit summaries. That detail is useful for auditability, but it is too much for a novice end user.

v15 keeps the important controls:

- Durable project memory.
- Bounded Builder work.
- Evidence-based validation.
- Human approval for risky changes.
- Narrow repair loops.
- Decisions and risks captured for future work.

v15 hides or consolidates the confusing parts:

- The primary user-facing artifact is a `WORK_CARD.md`.
- Prompt IDs are replaced by sequential workflow Actions.
- Full phase scaffolding is no longer the default for every task.
- Dry-run planning is required only when the risk tier calls for it.
- Builder reports and validation records are sections of the Work Card unless the project needs audit-grade handoffs.
- The same five-step loop applies to a whole project, a phase, or a single bug fix.

## Recommended next implementation step

The recommended next software-design, planning, and coding step is to build the **Work Card MVP** before building the full scaffold-management application.

Do not start by coding the entire v14-style phase scaffold UI. Start with a thin product that proves one loop:

```text
User submits bug or feature → Architect frames Work Card → Builder plans or builds → user validates → card closes or repairs
```

The MVP should implement these things first:

1. A simple user intake form for bugs, features, and phase goals.
2. A Work Card generator that converts rough user language into structured scope, acceptance criteria, risk tier, and validation checklist.
3. A risk router that decides Quick Fix, Standard Change, or High Risk.
4. A Builder prompt composer that reads the Work Card and project memory.
5. A Builder report capture step that saves what changed and what checks ran.
6. A human validation screen with three outcomes: Works, Still Broken, Not Sure.
7. A repair loop that converts failed validation into a narrow repair card.
8. A closeout step that updates project memory only when something useful was learned.

After that MVP works manually, add phase containers, archive views, Skills, MCP/tool integrations, and advanced automation.

## The five-step model

### 1. Capture

The user describes the problem, request, or goal in normal language.

For a bug, Capture asks:

```text
What were you trying to do?
What did you do right before the problem?
What did you expect to happen?
What actually happened?
Can you add a screenshot, screen recording, URL, console error, or log?
How severe is it?
```

For a feature, Capture asks:

```text
Who is this for?
What should they be able to do?
Why does it matter?
What should not change?
How will you know it works?
Any example screen, workflow, or reference?
```

For a phase, Capture asks:

```text
What outcome should this phase create?
Who benefits from it?
What is in scope?
What is out of scope?
What must not break?
How will we prove the phase is done?
```

The user should not be asked to identify files, diagnose code, choose architecture, or write a technical implementation plan unless they already know that information.

### 2. Frame

The Architect turns the raw input into a clear Work Card.

Frame produces:

- Plain-language summary.
- Work type: Bug, Feature, Refactor, Setup, Research, Documentation, or Phase.
- Scope.
- Out-of-scope boundaries.
- Acceptance criteria.
- Validation checklist.
- Evidence links or attachments.
- Risk tier.
- Recommended next action.

Frame is the translation layer between a non-technical user and an AI coding agent. The user describes behavior. The Architect writes the spec.

### 3. Plan

The Builder inspects the project and proposes a no-edit plan when the work is not trivial.

Plan answers:

- What files or systems are likely involved?
- What will change?
- What will not change?
- What checks will be run?
- What must the human validate manually?
- What risks exist?
- Should the work be split smaller?

Planning can be skipped for a true Quick Fix. Planning should not be skipped for user-visible behavior changes, data changes, authentication, payments, permissions, migrations, production systems, or unclear scope.

### 4. Build

The Builder implements only the approved Work Card.

Build must follow these rules:

- Work only from project memory, `AGENTS.md`, and the approved Work Card.
- Do not broaden scope.
- Do not perform unrelated refactors.
- Do not add dependencies without approval.
- Do not expose secrets.
- Run only allowed checks.
- Produce a final report with files changed, checks run, checks skipped, manual validation needed, and residual risks.

### 5. Prove

The work is not done until it is validated.

Prove uses the acceptance criteria from the Work Card. The user should not need to diagnose the code. The user only needs to answer:

```text
Did the expected behavior happen?
Did the original problem go away?
Did anything obvious break?
Can you attach evidence if it failed?
```

Possible outcomes:

```text
Works → Close the Work Card.
Still Broken → Run Repair.
Not Sure → Ask for specific missing validation evidence.
Different Problem → Close this card if fixed, then open a new Work Card.
```

## The same loop at three levels

### Project-level loop

Use this when starting a new project or preparing an existing project for AI-assisted development.

```text
Capture: What is the project, who is it for, and where is the source of truth?
Frame: Create PROJECT_PROFILE.md and project operating rules.
Plan: Decide initial phases, risk policy, Builder rules, and validation policy.
Build: Create project memory, AGENTS.md, and readiness files.
Prove: Confirm the workspace, Git state, commands, and validation limits are ready.
```

Project setup happens once, then updates only when the project learns something durable.

### Phase-level loop

Use this when a body of work needs multiple Work Cards.

```text
Capture: What outcome should this phase create?
Frame: Define phase goal, boundaries, acceptance criteria, and first Work Cards.
Plan: Sequence the Work Cards and identify high-risk work.
Build: Complete Work Cards one at a time.
Prove: Validate the phase outcome and close or carry forward risks.
```

A phase is a container. It does not replace Work Cards. A phase should be closed only after its Work Cards are validated, deferred, or explicitly cancelled.

### Work Card-level loop

Use this for a bug, feature, setup task, refactor, research task, or documentation update.

```text
Capture: User report or request.
Frame: WORK_CARD.md with acceptance criteria and risk tier.
Plan: Builder no-edit plan when required.
Build: Builder implementation pass.
Prove: Human and/or automated validation.
```

This is the default loop for daily development.

## Roles

### Human user

The human user owns the problem, priority, approval, credentials, business judgment, and final acceptance.

The user should provide:

- What they were trying to do.
- What they saw.
- What they expected.
- Screenshots, recordings, URLs, logs, or examples when available.
- Final validation: Works, Still Broken, Not Sure, or Different Problem.

The user should not be expected to provide:

- File names.
- Stack traces they do not understand.
- Architecture decisions from a blank page.
- Technical root-cause analysis.
- Builder prompt selection.

### Architect

The Architect turns human intent into structured work.

The Architect owns:

- Intake questions.
- Work Card framing.
- Scope boundaries.
- Acceptance criteria.
- Risk tiering.
- Plan review.
- Repair triage.
- Closeout and learning updates.

### Builder

The Builder modifies code, documents, automations, data artifacts, or other project files.

The Builder owns:

- Workspace verification.
- Codebase inspection.
- No-edit planning when required.
- Bounded implementation.
- Allowed checks.
- Final reports.
- Updating approved project records when instructed.

## Workflow modes

Not every task needs the full scaffold.

### Quick Fix Mode

Use Quick Fix Mode for very small, low-risk changes.

Examples:

- Typo fix.
- Label change.
- Small copy update.
- Obvious styling adjustment.
- Tiny documentation correction.

Rules:

- One Work Card.
- No full phase scaffold.
- No formal dry-run unless the Architect detects risk.
- Builder may build directly after the Work Card is framed.
- Prove still happens.

### Standard Work Card Mode

Use Standard Work Card Mode for ordinary product work.

Examples:

- User-visible bug.
- Small feature.
- UI workflow adjustment.
- Validation improvement.
- Small refactor with limited scope.

Rules:

- One Work Card.
- Builder no-edit plan is usually required.
- Human or Architect approves the plan.
- Builder implements one bounded pass.
- User validates against acceptance criteria.
- Repair stays narrow.

### Full Phase Mode

Use Full Phase Mode only when the work is broad, risky, or multi-pass.

Examples:

- New product or MVP.
- Complex feature area.
- Data model change.
- Authentication or permissions.
- Payment or billing change.
- Large refactor.
- Compliance-sensitive workflow.
- Anything expected to span multiple Builder passes.

Rules:

- A phase contains multiple Work Cards.
- Phase files may be created for planning, decisions, risks, and closeout.
- High-risk Work Cards require explicit plan approval.
- Closeout promotes decisions and risks to project memory.

## Risk router

Every Work Card receives a risk tier.

| Risk tier | Use when | Required workflow |
|---|---|---|
| Quick Fix | Small, obvious, low-risk change with minimal surface area | Frame → Build → Prove |
| Standard Change | User-visible behavior, several files possible, validation needed | Frame → Plan → Approve → Build → Prove |
| High Risk | Auth, permissions, payments, data deletion, migrations, secrets, production, compliance, unclear scope | Frame → Full Plan → Human Approval → Build → Prove → Closeout |

Escalate risk if any of these are true:

- The Builder might touch production data.
- Secrets or credentials are involved.
- The change affects login, permissions, billing, deletion, or database migrations.
- The user cannot clearly describe how to prove the change worked.
- The planned pass is large enough that unrelated changes may slip in.
- The Builder proposes new dependencies or broad refactors.

## Core artifacts

### Project memory

Project memory contains durable rules that should survive beyond a chat session.

Recommended files:

```text
AGENTS.md
planning/project/PROJECT_PROFILE.md
planning/project/PROJECT_STATE.md
planning/project/ENVIRONMENT.md
planning/project/DECISIONS.md
planning/project/RISKS.md
planning/project/GLOSSARY.md
planning/project/CHANGE_LOG.md
```

Keep project memory concise. Do not turn `AGENTS.md` into a dump of every plan, phase, and past conversation.

### Work Card

The Work Card is the primary artifact for daily work.

Recommended path:

```text
planning/work/YYYY-MM-DD-short-slug/WORK_CARD.md
planning/work/YYYY-MM-DD-short-slug/evidence/
```

Recommended Work Card sections:

```text
# Work Card — [Short Name]

## Status
Open / Framed / Planned / Approved / Built / Proving / Repairing / Closed / Cancelled

## Plain-Language Summary

## User Report

## Work Type
Bug / Feature / Refactor / Setup / Research / Documentation / Phase

## Risk Tier
Quick Fix / Standard Change / High Risk

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

### Phase container

A phase groups related Work Cards.

Recommended path:

```text
planning/phases/YYYY-MM-DD-phase-name/PHASE_CARD.md
planning/phases/YYYY-MM-DD-phase-name/work/
planning/phases/YYYY-MM-DD-phase-name/evidence/
```

For high-audit projects, a phase may also include separate files:

```text
01_PHASE_GOAL.md
02_SCOPE.md
03_ACCEPTANCE_CRITERIA.md
04_WORK_CARD_INDEX.md
05_VALIDATION_SUMMARY.md
06_DECISIONS_AND_RISKS.md
07_HANDOFF_TO_NEXT_PHASE.md
```

Use these only when they reduce confusion. Do not require them for every small task.

## Recommended root structure

For a new project:

```text
project-name/
  AGENTS.md
  planning/
    project/
      PROJECT_PROFILE.md
      PROJECT_STATE.md
      ENVIRONMENT.md
      DECISIONS.md
      RISKS.md
      GLOSSARY.md
      CHANGE_LOG.md
    work/
      YYYY-MM-DD-short-slug/
        WORK_CARD.md
        evidence/
    phases/
      YYYY-MM-DD-phase-name/
        PHASE_CARD.md
        work/
        evidence/
```

For an existing project, add only the `planning/` folder and preserve the source tree where it already lives.

## Detailed progressive workflow

### Step 0 — Set up project memory once

Use this when a project is new or has no durable AI development context.

Output:

- Project profile.
- Workspace/source-of-truth rule.
- Builder tool policy.
- Validation policy.
- Security policy.
- AGENTS.md.
- Development environment and Git readiness notes.

Human-facing explanation:

```text
We are creating the project memory AI will use so you do not have to repeat the same instructions every time.
```

Do not implement product features during setup.

### Step 1 — Capture a work item

The user reports one bug, feature, setup task, or phase goal.

Good user input:

```text
The Save button says it worked, but when I refresh the page the phone number goes back to the old one.
```

Also useful:

- Screenshot.
- Screen recording.
- URL or page name.
- Error message.
- What the user expected.
- What the user tried right before the problem.

### Step 2 — Frame the Work Card

The Architect converts the user input into a Work Card.

The user should see a short review:

```text
I understand the issue as:
The profile page shows a success message after Save, but the changed phone number is not saved after refresh.

Success means:
- The updated phone number remains after refresh.
- Other profile fields do not change unexpectedly.
- The user sees a clear success or error message.

Out of scope:
- Redesigning the profile page.
- Changing account permissions.
```

The system saves the structured `WORK_CARD.md`.

### Step 3 — Decide risk and planning depth

The Architect or app assigns a risk tier.

Quick Fix may proceed directly to Build after framing.

Standard Change requires a Builder no-edit plan.

High Risk requires explicit plan approval and may require a full phase container.

### Step 4 — Plan the change

The Builder inspects the code or project files without editing.

The plan should be understandable to a non-technical user:

```text
The Builder expects to inspect the profile form, the save handler, and the user profile API call.
It expects to change only the save flow or data mapping.
It will not redesign the profile page.
It will run the available tests or explain why it cannot.
You will need to verify the save behavior in the browser.
```

### Step 5 — Approve the plan

The user or Architect approves, revises, rejects, or splits the plan.

For non-technical users, the approval screen should ask:

```text
Does this plan match the problem you wanted fixed?
Does it avoid changes you did not ask for?
Are you comfortable letting the Builder make this change?
```

### Step 6 — Build

The Builder implements the approved pass.

The Builder final report must include:

- Files changed.
- What changed in plain language.
- Checks run.
- Checks skipped and why.
- What the user should test.
- Remaining risks.

### Step 7 — Prove

The user validates using the Work Card checklist.

User-facing validation options:

```text
Works.
Still broken.
Not sure.
This revealed a different problem.
```

If the user selects Still Broken or Not Sure, the system asks for evidence instead of asking the user to diagnose code.

### Step 8 — Repair or close

If validation fails, the Architect creates a narrow repair objective.

Repair rule:

```text
Fix only the failed acceptance criterion. Do not redesign the feature. Do not broaden scope.
```

If validation passes, close the Work Card and update project memory only if something durable was learned.

### Step 9 — Loop to the next Work Card or phase

After closeout, the system recommends the next action:

```text
Open the next Work Card.
Start the next phase.
Update project rules.
Stop because the phase is complete.
```

## How phases use the same loop

A phase is not a separate confusing process. A phase is a larger Work Card container.

For each phase:

```text
Capture the phase outcome.
Frame the phase boundaries and acceptance criteria.
Plan the sequence of Work Cards.
Build each Work Card.
Prove the phase outcome.
```

A phase should have a `PHASE_CARD.md` with:

```text
# Phase Card — [Phase Name]

## Phase Goal

## Why This Phase Matters

## In Scope

## Out of Scope

## Work Cards

## Phase Acceptance Criteria

## Validation Summary

## Decisions and Risks

## Handoff to Next Phase
```

A phase is ready to close when:

- Every required Work Card is closed, deferred, or cancelled.
- Phase-level acceptance criteria are passed, deferred, or explicitly marked unclear.
- Validation evidence is attached or described.
- Decisions and risks are promoted to project memory when useful.
- The next phase recommendation is clear.

## Acceptance criteria for non-technical users

Acceptance criteria should describe observable behavior, not implementation.

Good:

```text
When I update my phone number and click Save, the new number still appears after I refresh the page.
```

Weak:

```text
Fix the backend state bug.
```

Use Given / When / Then only when it helps clarity:

```text
Given I am editing my profile
When I change my phone number and click Save
Then the new phone number remains visible after refresh
And the other profile fields are unchanged
```

## Evidence policy

The user should be encouraged to attach evidence, not technical diagnosis.

Useful evidence:

- Screenshot.
- Screen recording.
- URL or page name.
- Browser console error.
- Error text.
- Exported log.
- Before/after example.
- Steps the user took.

Evidence belongs in the Work Card evidence folder:

```text
planning/work/YYYY-MM-DD-short-slug/evidence/
```

## Markdown artifact policy

Use Markdown files for durable handoffs.

Required rule:

```text
If an output will be used later, save it as a real .md file or have the Builder save it.
```

For v15, the default durable artifact is `WORK_CARD.md`.

Separate handoff files are optional unless the project is high-risk, audit-sensitive, or multi-team.

Acceptable outputs:

1. A real downloadable `.md` file.
2. A Builder-created `.md` file at the expected path.
3. Exact fallback Markdown text with a clear filename and save instruction.

Do not treat these as equivalent:

- Chat memory only.
- Screenshots of Markdown.
- DOCX or PDF exports when a `.md` handoff is required.
- Vague summaries without the actual durable content.

## AGENTS.md policy

`AGENTS.md` should contain durable Builder instructions that apply across tasks.

Keep it short.

Include:

- Source of truth.
- Workspace verification rule.
- Planning folder location.
- Scope-control rules.
- Validation limits.
- Security rules.
- Final report requirements.

Do not include:

- Every phase detail.
- Large pasted plans.
- Secrets.
- Temporary chat context.
- Conflicting instructions.

## Development readiness policy

Before meaningful implementation, the project should know:

- Where the workspace is.
- Whether Git is used.
- Current branch and uncommitted changes.
- Package manager or build tool.
- Install command.
- Start command.
- Build command.
- Test, lint, or typecheck command.
- Which checks are allowed.
- Which checks require human approval.
- Whether secrets are protected.

This can be captured in:

```text
planning/project/ENVIRONMENT.md
```

## Repair policy

Repair is a loop, not a restart.

When validation fails:

1. Identify the failed acceptance criterion.
2. Capture evidence.
3. Decide whether the failure is implementation, expectation mismatch, environment, or incomplete validation.
4. Create a narrow repair objective.
5. Send only the repair objective to the Builder.
6. Prove again.

Avoid vague repair prompts such as:

```text
It still does not work. Fix everything.
```

Use narrow repair prompts:

```text
The phone number still reverts after refresh. Fix only the persistence failure for the profile phone number. Do not redesign the page or change unrelated fields.
```

## Learning loop

Update project memory only when the learning is durable.

Good learning updates:

- A recurring Builder mistake to prevent.
- A validation command that works.
- A project-specific convention.
- A risky area of the codebase.
- A source-of-truth correction.

Bad learning updates:

- Temporary status.
- One-off chat notes.
- Large transcripts.
- Outdated implementation plans.
- Secrets or credentials.

## Software application design recommendation

The future application should automate the workflow without hiding accountability.

### MVP screens

Build these screens first:

1. Project Setup.
2. New Work Card.
3. Work Card Review.
4. Builder Plan Review.
5. Builder Report.
6. Human Validation.
7. Repair / Close.
8. Work Card Index.

### MVP entities

Core entities:

```text
Project
ProjectMemory
WorkCard
AcceptanceCriterion
EvidenceItem
BuilderPlan
BuilderRun
ValidationRecord
RepairRecord
Decision
Risk
Phase
```

### MVP services

Core services:

```text
RiskRouter
WorkCardFramer
PromptComposer
ArtifactWriter
BuilderReportIngestor
ValidationChecklistGenerator
RepairTriageService
ProjectMemoryUpdater
```

### MVP coding order

Recommended coding order:

1. Define the Work Card schema.
2. Implement local file-backed storage for Work Cards and evidence.
3. Implement the Capture form.
4. Implement the Frame action using the Architect prompt.
5. Implement risk routing.
6. Implement Builder prompt generation.
7. Implement plan approval.
8. Implement Builder report capture.
9. Implement validation capture.
10. Implement repair-card creation.
11. Implement closeout and project-memory update.
12. Add phase containers after the Work Card loop works.

### Do not build first

Do not build these first:

- Full visual phase archive.
- MCP integrations.
- Skills marketplace.
- Multi-agent orchestration UI.
- Complex permissions.
- Automated code execution without approval gates.
- A full clone of the v14 handoff-file structure.

These can come later.

## Completeness gates

### Project setup gate

Project setup is ready when:

- Project source of truth is known.
- Builder tool is known.
- `AGENTS.md` exists or is explicitly waived.
- Development commands are known or marked unknown.
- Validation limits are clear.
- Security rules are clear.
- Work Card storage path is known.

### Work Card frame gate

A Work Card is ready to plan or build when:

- The user goal is clear.
- Expected behavior is clear.
- Actual behavior or requested behavior is clear.
- Scope is bounded.
- Out-of-scope boundaries are listed.
- Acceptance criteria are observable.
- Risk tier is assigned.
- Validation checklist exists.

### Plan approval gate

A Standard or High Risk Work Card is ready to build when:

- Builder inspected without editing.
- Files likely to change are listed.
- Proposed fix is understandable.
- Scope is not broadened.
- Unauthorized dependencies are not added.
- Checks are listed.
- Manual validation is listed.
- Human or Architect approval is recorded.

### Build report gate

A build pass is ready for human validation when:

- Changed files are listed.
- Implementation summary is clear.
- Checks run are listed.
- Checks skipped are explained.
- Manual validation steps are listed.
- Residual risks are listed.

### Prove gate

A Work Card is ready to close when:

- Every required acceptance criterion is Passed, Failed, Deferred, or Unclear.
- Failures have repair cards or accepted deferrals.
- Evidence is attached or described.
- The user confirms Works or an equivalent accepted result.
- Durable decisions and risks are promoted if needed.

## Legacy v14 mapping for migration only

Do not present this table as the main user workflow. It exists only to help migrate old v14 documents.

| v14 area | v15 replacement |
|---|---|
| Prompt 0, 1, 1A, 1B | Project setup loop: Capture → Frame → Plan → Build → Prove project memory |
| Prompt 4, 4A, 4B, 4C | Project memory build and readiness proof |
| Prompt 3A, 6, 6A, 7 | Work Card or Phase Card framing |
| Prompt 8, 8A | Plan and approve Work Card |
| Prompt 9, 9A | Build Work Card and capture Builder report |
| Prompt 11A, 11 | Prove Work Card with human validation |
| Prompt 10A, 10 | Repair failed Work Card |
| Prompt 12A, 12, 13 | Close Work Card or Phase and update memory |
| Prompt 2 | Start the next phase using the same five-step loop |

## One-page summary for end users

```text
Every change becomes a Work Card.

A Work Card answers five questions:
1. What happened or what do you want?
2. What should happen instead?
3. What is allowed to change?
4. How will we prove it works?
5. What did we learn for next time?

The loop is always:
Capture → Frame → Plan → Build → Prove.

Small changes move quickly.
Risky changes get more planning and approval.
Failed validation becomes a narrow repair, not an open-ended back-and-forth.
```
