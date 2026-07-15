<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/project_planning/PROJECT_PLANNING_DOCUMENTS_champcity_a_i",
  "artifactType": "project_planning",
  "createdAt": "2026-07-01T21:15:57.623Z",
  "jsonPath": "planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json",
  "markdownPath": "planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_champcity_a_i.md",
  "payload": {
    "kind": "project_planning",
    "title": "Project Planning Documents Generation: ChampCity A/I"
  },
  "payloadHash": "sha256:9204af3c95e8fe13f39c4e3b1187e005a4599089a42ec6f29a348f023eaab115",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "pending",
  "updatedAt": "2026-07-01T21:15:57.623Z"
}
-->

# Project Planning Documents Generation: ChampCity A/I

## Source Context

Project: ChampCity A/I
Record ID: PROJECT_PLANNING_DOCUMENTS_champcity_a_i
Created: 2026-07-01T21:15:57.623Z
Updated: 2026-07-01T21:15:57.623Z
Source Project Intake JSON: PROJECT_INTAKE_champcity_a_i.json
Source Project Intake Markdown: PROJECT_INTAKE_champcity_a_i.md
Source Project Architect Interview Prompt JSON: PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.json
Source Project Architect Interview Prompt Markdown: PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md

## Written Project Documents

- PROJECT_PROFILE.md
- PROJECT_STATE.md
- WORK_CARD_BACKLOG.md
- OPEN_QUESTIONS.md
- RISKS.md
- DECISIONS.md

## Architect Interview Output

# Project Architect Interview Completion Summary

## 1. Confirmed Facts

Project name: **ChampCity A/I**

Public/company/site brand: **ChampCity AI**

Current stage: **Alpha development**

The project is no longer in MVP. The MVP is closed and proved the work-card loop model. The current effort is Alpha development, using ChampCity A/I itself as dogfood for the larger project-planning workflow.

ChampCity A/I is an end-to-end platform for using the **Architect / Implementer** model workflow for agentic AI application development.

The application should help a non-developer or semi-technical Operator communicate with an AI Architect, plan a software project, create durable project artifacts, hand scoped work to an Implementer, validate results, manage repair loops, and track progress visually from project start through release readiness.

The primary users/operators are non-developer end users. They may be technically comfortable, but they should not be expected to know coding languages, software architecture, tech-stack design, implementation planning, or formal validation practices.

The Operator remains a centaur. ChampCity A/I should not become a fully autonomous software-creation system. The Operator remains responsible for approvals, validation, decision-making, and movement between workflow states.

The project’s source-of-truth location is:

`<PROJECT_REPO>`

The source of truth is an existing local repository with durable planning files.

The preferred Implementer tool is **Codex**.

The Architect surface is **ChatGPT**.

The first public release surface should be a **Windows desktop application first**, with Mac/Linux later.

The business/product goal is to create a free-to-use application distributed through a website with donation-based monetization.

The product should preserve the **Architect / Implementer / Operator** mental model as a central product concept.

The product should use the **Capture → Frame → Plan → Build → Prove** model as the plain-language workflow model. This model should apply both to the full project lifecycle and to individual work-card loops.

ChampCity MCP is not optional or merely advanced. ChampCity MCP is an **integral default Alpha workflow component**.

ChampCity MCP is expected to act as the bridge between ChatGPT subscription use and the local project repository. Its role is to allow ChatGPT, acting as Architect, to read from and write to the local repo so that durable prompts, planning artifacts, summaries, repair prompts, validation summaries, and handoff documents can be created directly in the project source of truth.

The intended loop is:

1. Operator works with ChatGPT through the subscription interface.
2. ChatGPT uses ChampCity MCP to inspect and update the local repository.
3. Architect prompts, project artifacts, work-card records, validation summaries, and repair prompts are saved directly into the repo.
4. Codex / Implementer reads those repo artifacts and performs scoped implementation work.
5. Codex writes Implementer Reports and changed artifacts back to the repo.
6. ChatGPT uses ChampCity MCP to review those reports and decide whether the work card is complete, needs repair, or needs escalation.

The subscription integration strategy is not merely clipboard automation. The practical integration model is:

**ChatGPT subscription surface + ChampCity MCP + local repo artifacts + Codex repo workflow.**

Clipboard or UI scripting may still be useful, but ChampCity MCP is the primary connective tissue for durable Architect-side repo interaction.

For API users, the application may later support direct API-backed Architect or Implementer routing when the user supplies API keys.

For fallback use, the app should still support manual copy/paste and file-based handoff when MCP, Codex, or API integrations are unavailable.

A work card is done when the **Operator validates expected behavior**, the **Architect reviews the evidence**, and the work card is marked complete.

Expected validation evidence is primarily **plain-language notes and screenshots**.

Durable project artifacts should include:

Project profile, phase plans, work cards, Architect outputs, Implementer outputs, validation notes, Implementer Reports, repair prompts, closeout records, and decision history.

The existing ChampCity MCP Implementer Report index shows that the project already has substantial completed work.

Phase 1 includes Implementer Reports for work-card schema/rendering, work-card capture, Architect framing prompt composer, risk router, Implementer execution packet generation, Implementer Report capture, human validation and repair loop, phase closeout/status management, Figma UI handoff, and UI/terminology alignment.

Phase 2 includes Implementer Reports for project intake capture, Project Architect Interview prompt generation, validation/evidence UI, validation status/target selector, and project planning document generation, plus repair passes.

The next planning documents must not start from a blank roadmap. They must account for existing Phase 1 and Phase 2 work before recommending new phases or work cards.

## 2. Safe Assumptions

The default Alpha workflow should assume ChampCity MCP is available and configured for the project workspace.

Manual copy/paste remains a fallback path, not the primary desired workflow.

API-backed integration remains a separate optional mode for users who supply API keys.

Subscription-surface automation should be understood as a hybrid model: ChatGPT subscription UI for conversation and reasoning, ChampCity MCP for controlled local repo read/write, and Codex for implementation execution.

The planning documents should treat MCP permissions, workspace allowlisting, repo-safe writes, and artifact boundaries as core product architecture, not optional enhancement work.

The app should avoid describing the ChatGPT subscription workflow as official API integration unless an official integration path exists. The better framing is MCP-mediated repo interaction through the ChatGPT subscription surface.

The app should expose MCP status in plain language for non-developer users. Example status concepts:

* Repo connected.
* Architect can read project files.
* Architect can save handoff files.
* Implementer reports available.
* Validation evidence available.
* Repair prompt ready.

Validation evidence should support screenshots and notes first, with optional technical outputs later. The user should not be forced to provide terminal logs, formal test reports, or developer-style validation artifacts.

The planning system should keep full chat transcripts optional, not mandatory. Durable structured artifacts are more useful than raw transcript dumps.

## 3. Open Questions

These are not blockers for the next planning-documents step, but they should remain open profile fields until resolved.

First, how should ChampCity A/I expose and explain ChampCity MCP setup to non-developer users without overwhelming them?

Recommended default: the app should present MCP as a required local connector for the guided Alpha workflow, with simple status checks and plain-language explanations.

Second, should subscription-surface automation beyond MCP be built as browser automation, clipboard automation, desktop overlay/helper, staged copy/paste queue, or some combination of these?

Recommended default: treat this as a later design/research phase. MCP-mediated repo access is the primary Alpha integration path.

Third, should Beta require Mac/Linux support, or is Windows public release enough for Beta?

Recommended default: Windows public release is enough for Beta. Mac/Linux can follow after the workflow is proven.

Fourth, should screenshots be stored directly in the repo, stored in an app-controlled evidence folder, or referenced by path?

Recommended default: use an app-controlled evidence folder under the project planning structure, with repo-safe filenames and no hidden external dependency.

## 4. Recommended Project-Profile Values

Project name: **ChampCity A/I**

Public/company/site brand: **ChampCity AI**

Current stage: **Alpha**

Product category: Desktop workflow application for non-developer agentic AI software development using the Architect / Implementer model.

Primary operating model: Operator-mediated Architect / Implementer workflow.

Primary user: Non-developer or semi-technical Operator.

Core user problem: Non-developers can identify desired software behavior and bugs but struggle to communicate requirements, implementation tasks, validation evidence, and repair needs in a consistent way across AI tools.

Desired outcome: The Operator can move a project from initial idea through structured planning, phase organization, work-card creation, implementation handoff, validation, repair, closeout, and release preparation without losing project state.

Business goal: Free public application distributed through a website with donation-based monetization.

First release surface: Windows desktop application first; Mac/Linux later.

Source of truth: Local Git repository and durable Markdown/JSON planning files at `<PROJECT_REPO>`.

Preferred Implementer: Codex.

Architect surface: ChatGPT.

Primary Alpha integration mode:

ChatGPT subscription interface connected to the local project repository through ChampCity MCP.

Implementer mode:

Codex reads structured repo artifacts and writes Implementer Reports, implementation notes, and changed files back to the repo.

Fallback mode:

Manual copy/paste and file-based handoff when MCP or Codex integration is unavailable.

Optional future mode:

API-backed Architect or Implementer routing for users who supply API keys.

MCP role:

ChampCity MCP is the repo bridge that allows the Architect to inspect project state, generate and save planning artifacts, review Implementer Reports, and support the Operator’s decision loop without relying on stale chat context alone.

Non-goal:

Fully autonomous software creation without Operator review, validation, and decision authority.

Security concerns:

API keys must never be committed, exposed in source code, written into durable planning artifacts, or packaged into public builds.

Subscription-session automation, MCP access, local repo access, and API-backed model routing must each have clear boundaries.

The app must be explicit about what ChatGPT can read, what it can write, where files are saved, and when the Operator needs to approve or review changes.

## 5. Success Definitions

### Alpha Success Definition

Alpha success is not merely completing multiple work cards. That was MVP success.

Alpha success means a non-developer Operator can use ChampCity A/I, ChatGPT subscription access, ChampCity MCP, and Codex to move a real software project from intake through planning, work-card execution, validation, repair, closeout, and release preparation until the project reaches a **releasable state**.

Alpha success requires the full project lifecycle to work coherently.

Alpha success should include:

The project can be captured and profiled.

The Architect can generate durable planning artifacts.

The app can organize phases and work cards.

The Operator can understand what to do next.

ChatGPT can use ChampCity MCP to inspect and update the local repository.

Codex can consume repo-saved handoffs.

Implementer Reports can be captured and reviewed.

Validation evidence can be attached or summarized.

Repair loops can be generated when needed.

Completed work can be tracked visually.

The project can reach release-readiness without the workflow collapsing into scattered chats, missing files, unclear status, or manual reconstruction.

### Beta Success Definition

Beta success means a non-developer Operator can install or download ChampCity A/I, connect it to a project repo and supported AI workflow, complete a project to releasable state, and use the application with enough stability and clarity that it is suitable for public distribution through the website with donation-supported monetization.

Beta should also require:

A stable onboarding path.

Clear MCP setup and status handling.

Documented fallback workflows.

Basic security safeguards for local repo access and API-key handling.

Repeatable release/checkpoint workflow.

A usable website/download/package path.

## 6. Recommended Initial Phase Candidates

The recommended sequence remains:

A → B → C → D → E → F → G → H

However, several of these areas are already partially or substantially complete and should not be replanned from scratch.

### A. Product Profile and Workflow Model Cleanup

Status: partially complete.

This interview contributes to this area. The next planning documents should consolidate the product profile, current Alpha position, MCP integration model, and Capture → Frame → Plan → Build → Prove workflow.

### B. Project / Phase / Work-Card Data Model

Status: substantially started or completed in Phase 1.

Existing Implementer Reports show work-card schema/rendering, work-card capture, status handling, phase closeout, JSON/Markdown artifacts, and related structure.

The next planning step should inventory the existing data model before creating additional work cards.

### C. Operator Dashboard and Progress Map

Status: partially complete.

Phase 1 includes status/closeout work and UI alignment. The full visual project/phase/work-card map likely needs Alpha refinement.

### D. Architect Prompt Generation and Review Flow

Status: partially complete.

Phase 1 includes Architect framing prompt composer work. Phase 2 includes Project Architect Interview prompt generation.

### E. Implementer Handoff Package Flow

Status: partially complete.

Phase 1 includes Implementer execution packet generation and Implementer Report capture.

### F. Validation / Evidence Capture Flow

Status: partially complete.

Phase 1 includes human validation and repair loop work. Phase 2 includes validation/evidence UI and validation status/target work.

### G. MCP Integration, Repo-Bridge Workflow, and Security Boundary Design

Status: core Alpha concern.

This should not be deferred too far. MCP is the mechanism that makes the ChatGPT subscription workflow viable.

This phase should define the repo bridge, MCP status model, read/write boundaries, Operator visibility, safe artifact writes, fallback behavior, and security posture.

### H. Public Release Packaging and Website / Download Flow

Status: later Alpha/Beta candidate.

This should follow once the core workflow is stable enough to support a releasable project lifecycle.

## 7. Risks and Drift Warnings

The largest technical/product risk is MCP boundary design. Because ChampCity MCP is integral, the project must be precise about what ChatGPT can read, what it can write, where files are saved, and how the Operator sees or approves those changes.

Subscription integration risk should be reframed. The primary concern is not whether ChatGPT can use an API. The intended Alpha path is ChatGPT subscription plus MCP-mediated repo access. The risk is whether this can be made understandable, safe, reliable, and repeatable for non-developer users.

The project should guard against treating MCP as invisible magic. The user needs simple status indicators and plain-language explanations of what is connected, what files are being touched, and what action comes next.

The project should guard against over-reliance on chat context. MCP should be used to ground Architect decisions in durable repo artifacts: project profile, phase state, work cards, Implementer Reports, validation reports, and closeout records.

The project must avoid scope drift into autonomy. The app should help the Operator drive the AI workflow; it should not silently become an autonomous coding agent.

The workflow must avoid developer-first language where possible. “Capture,” “Frame,” “Plan,” “Build,” and “Prove” are better user-facing concepts than “requirements elicitation,” “architecture decomposition,” “implementation orchestration,” and “acceptance validation.”

The project must avoid duplicate planning work. Since Phase 1 and Phase 2 already implemented core pieces, the next generator must inventory existing Implementer Reports before proposing new work. Otherwise it will create redundant phase plans.

The project must avoid state fragmentation. The app must keep durable profile, phase, work-card, prompt, handoff, validation, repair, closeout, and decision artifacts tied together. Raw chats alone are not sufficient.

Security boundaries must remain explicit. API keys, subscription sessions, local repo access, MCP permissions, generated prompts, and build artifacts need separate treatment. The documents should not collapse those into one generic “AI integration” bucket.

Architect / Implementer role separation must remain clear. The Architect frames, evaluates, decides repair/complete, and generates handoffs. The Implementer executes scoped build work and reports results. The Operator approves, validates, and controls movement between states.

## 8. Suggested Next Step

Generate the **Project Planning Documents** using this interview completion summary plus the existing ChampCity MCP Implementer Report evidence.

The planning generator should not start from a blank roadmap. It should explicitly account for completed Phase 1 and Phase 2 work before recommending the next Alpha phase.

## PROJECT_PROFILE.md

# Project Profile

## Project Name

ChampCity A/I

## Product Thesis

We are attempting to build a end to end platform for using the Architect/Implementer model workflow for Agentic AI app development.  ChampCity A/I should help a non-developer end user in communicating with an AI Architect to plan a project through all phases of design to complete working application.  The final intended use is not just a prompt implementer but a connector where prompts are created, passed on to the architect model, output is reviewed by operator and then passed to the implementer, results are then validated by the operator and passed back to the architect for evaluation to decide if a fix is need, or a work card is complete.  The application should also provide a visual checklist of phase completion so the operator can see a visual map of the project, phase progress.

## User Type

Non-developer end users. They may be tech savvy but  have limited knowledge in coding languages, tech stacks, or development planning.

## Core Loop

Capture -> Frame -> Plan -> Build -> Prove

## Source of Truth

<PROJECT_REPO>

## Roles

- Operator: owns priority, approval, credentials, business judgment, and final acceptance.
- Architect: ChatGPT or another planning surface that frames work before implementation.
- Implementer: Codex or another coding/build agent that executes bounded Work Cards.

## Approved Technical Shape

- Target surface: Electron desktop app.
- Language: TypeScript.
- Frontend direction: React for post-foundation UI work.
- Persistence: file-backed Markdown and JSON planning artifacts.
- LLM providers: provider abstraction may be designed later, but no provider SDK is part of this planning generation step.

## Source Context

- Project Intake: PROJECT_INTAKE_champcity_a_i.json
- Project Architect Interview Prompt: PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.json
- Completed Architect interview output: pasted by Operator.

## Confirmed Facts

- Project name: **ChampCity A/I**
- Public/company/site brand: **ChampCity AI**
- Current stage: **Alpha development**
- The project is no longer in MVP. The MVP is closed and proved the work-card loop model. The current effort is Alpha development, using ChampCity A/I itself as dogfood for the larger project-planning workflow.
- ChampCity A/I is an end-to-end platform for using the **Architect / Implementer** model workflow for agentic AI application development.
- The application should help a non-developer or semi-technical Operator communicate with an AI Architect, plan a software project, create durable project artifacts, hand scoped work to an Implementer, validate results, manage repair loops, and track progress visually from project start through release readiness.
- The primary users/operators are non-developer end users. They may be technically comfortable, but they should not be expected to know coding languages, software architecture, tech-stack design, implementation planning, or formal validation practices.
- The Operator remains a centaur. ChampCity A/I should not become a fully autonomous software-creation system. The Operator remains responsible for approvals, validation, decision-making, and movement between workflow states.
- The project’s source-of-truth location is:
- `<PROJECT_REPO>`
- The source of truth is an existing local repository with durable planning files.
- The preferred Implementer tool is **Codex**.

## Safe Assumptions

- The default Alpha workflow should assume ChampCity MCP is available and configured for the project workspace.
- Manual copy/paste remains a fallback path, not the primary desired workflow.
- API-backed integration remains a separate optional mode for users who supply API keys.
- Subscription-surface automation should be understood as a hybrid model: ChatGPT subscription UI for conversation and reasoning, ChampCity MCP for controlled local repo read/write, and Codex for implementation execution.
- The planning documents should treat MCP permissions, workspace allowlisting, repo-safe writes, and artifact boundaries as core product architecture, not optional enhancement work.
- The app should avoid describing the ChatGPT subscription workflow as official API integration unless an official integration path exists. The better framing is MCP-mediated repo interaction through the ChatGPT subscription surface.
- The app should expose MCP status in plain language for non-developer users. Example status concepts:
- Repo connected.
- Architect can read project files.
- Architect can save handoff files.
- Implementer reports available.
- Validation evidence available.

## PROJECT_STATE.md

# Project State

## Current Stage

Alpha app development.

## Current Milestone

Phase 02 upstream project planning workflow.

## Next Intended Milestone

PH02 WC05: Add Phase Intake and Phase Interview prompt generator.

## Known Unresolved Decisions

See `planning/project/OPEN_QUESTIONS.md` and `planning/project/DECISIONS.md`.

## Current Notes

- MVP foundation is complete; current work should be described as Alpha app development.
- Phase 02 sequence has been reconciled after WC03 was used for validation and evidence UI repair.
- Project planning documents are generated deterministically from selected source artifacts and pasted Architect interview output.
- Project: ChampCity A/I.
- Latest selected intake stage: mvp.

## Recommended Initial Phase Candidates

- No separate phase candidates were detected in the pasted Architect output.

## WORK_CARD_BACKLOG.md

# Work Card Backlog

## Reconciled Phase 02 Sequence

- WC01: Add Project Intake capture
- WC02: Add Project Architect Interview prompt generator
- WC03: Repair validation and evidence UI
- WC04: Generate Project Planning Documents
- WC05: Add Phase Intake and Phase Interview prompt generator
- WC06: Generate Phase Planning Documents and pending-review Work Card Plan proposal

## Next Recommended Implementer Task

PH02 WC05: Add Phase Intake and Phase Interview prompt generator.

## Notes

- WC03 is the validation and evidence UI repair that replaced the original WC03 planning slot.
- WC04 is this Project Planning Documents generation workflow.
- Do not generate initial Work Cards beyond this backlog correction until the dedicated Phase Planning Documents Work Card.

## OPEN_QUESTIONS.md

# Open Questions

## Questions

- These are not blockers for the next planning-documents step, but they should remain open profile fields until resolved.
- First, how should ChampCity A/I expose and explain ChampCity MCP setup to non-developer users without overwhelming them?
- Recommended default: the app should present MCP as a required local connector for the guided Alpha workflow, with simple status checks and plain-language explanations.
- Second, should subscription-surface automation beyond MCP be built as browser automation, clipboard automation, desktop overlay/helper, staged copy/paste queue, or some combination of these?
- Recommended default: treat this as a later design/research phase. MCP-mediated repo access is the primary Alpha integration path.
- Third, should Beta require Mac/Linux support, or is Windows public release enough for Beta?
- Recommended default: Windows public release is enough for Beta. Mac/Linux can follow after the workflow is proven.
- Fourth, should screenshots be stored directly in the repo, stored in an app-controlled evidence folder, or referenced by path?
- Recommended default: use an app-controlled evidence folder under the project planning structure, with repo-safe filenames and no hidden external dependency.
- Operator uncertainty: I am unsure how to code a solution for integrating this application with the subscription versions of ChatGPT or Claude

## Owner

The Operator owns final answers. The Architect may help frame options before implementation.

## RISKS.md

# Risks

## Known Risks And Drift Warnings

- The largest technical/product risk is MCP boundary design. Because ChampCity MCP is integral, the project must be precise about what ChatGPT can read, what it can write, where files are saved, and how the Operator sees or approves those changes.
- Subscription integration risk should be reframed. The primary concern is not whether ChatGPT can use an API. The intended Alpha path is ChatGPT subscription plus MCP-mediated repo access. The risk is whether this can be made understandable, safe, reliable, and repeatable for non-developer users.
- The project should guard against treating MCP as invisible magic. The user needs simple status indicators and plain-language explanations of what is connected, what files are being touched, and what action comes next.
- The project should guard against over-reliance on chat context. MCP should be used to ground Architect decisions in durable repo artifacts: project profile, phase state, work cards, Implementer Reports, validation reports, and closeout records.
- The project must avoid scope drift into autonomy. The app should help the Operator drive the AI workflow; it should not silently become an autonomous coding agent.
- The workflow must avoid developer-first language where possible. “Capture,” “Frame,” “Plan,” “Build,” and “Prove” are better user-facing concepts than “requirements elicitation,” “architecture decomposition,” “implementation orchestration,” and “acceptance validation.”
- The project must avoid duplicate planning work. Since Phase 1 and Phase 2 already implemented core pieces, the next generator must inventory existing Implementer Reports before proposing new work. Otherwise it will create redundant phase plans.
- The project must avoid state fragmentation. The app must keep durable profile, phase, work-card, prompt, handoff, validation, repair, closeout, and decision artifacts tied together. Raw chats alone are not sufficient.
- Security boundaries must remain explicit. API keys, subscription sessions, local repo access, MCP permissions, generated prompts, and build artifacts need separate treatment. The documents should not collapse those into one generic “AI integration” bucket.
- Architect / Implementer role separation must remain clear. The Architect frames, evaluates, decides repair/complete, and generates handoffs. The Implementer executes scoped build work and reports results. The Operator approves, validates, and controls movement between states.
- Phase 1 includes Implementer Reports for work-card schema/rendering, work-card capture, Architect framing prompt composer, risk router, Implementer execution packet generation, Implementer Report capture, human validation and repair loop, phase closeout/status management, Figma UI handoff, and UI/terminology alignment.
- Security concerns:
- Basic security safeguards for local repo access and API-key handling.
- ### G. MCP Integration, Repo-Bridge Workflow, and Security Boundary Design
- This phase should define the repo bridge, MCP status model, read/write boundaries, Operator visibility, safe artifact writes, fallback behavior, and security posture.
- ## 7. Risks and Drift Warnings
- Security or data concern: model API integration will require strict security to not be exposed in source code or final build packaging
- Known constraint: ChatGPT subscriptions prevent the use of API for wiring the model directly into the application.

## Risk Handling Notes

- Keep renderer filesystem access mediated through Electron main/preload IPC.
- Do not add provider SDKs, auth, databases, cloud services, MCP, or connector integrations without a dedicated approved Work Card.
- Operator manual validation remains required for acceptance and closeout decisions.

## DECISIONS.md

# Decisions

## Current Decisions

- The Operator remains a centaur. ChampCity A/I should not become a fully autonomous software-creation system. The Operator remains responsible for approvals, validation, decision-making, and movement between workflow states.
- Project profile, phase plans, work cards, Architect outputs, Implementer outputs, validation notes, Implementer Reports, repair prompts, closeout records, and decision history.
- ChampCity MCP is the repo bridge that allows the Architect to inspect project state, generate and save planning artifacts, review Implementer Reports, and support the Operator’s decision loop without relying on stale chat context alone.
- Fully autonomous software creation without Operator review, validation, and decision authority.
- The project must avoid state fragmentation. The app must keep durable profile, phase, work-card, prompt, handoff, validation, repair, closeout, and decision artifacts tied together. Raw chats alone are not sufficient.
- Durable planning artifacts are stored as Markdown and JSON in the repository.
- Product-facing terminology uses Operator, Architect, and Implementer.
- The core loop remains Capture -> Frame -> Plan -> Build -> Prove.
- Preferred Implementer tool: Codex.
- Architect surface: ChatGPT.

## Decision Notes

Active Implementer artifacts use canonical storage names; historical archived paths remain evidence only.
