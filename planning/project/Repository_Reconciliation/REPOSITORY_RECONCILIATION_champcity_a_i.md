<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/repository_reconciliation/REPOSITORY_RECONCILIATION_champcity_a_i",
  "artifactType": "repository_reconciliation",
  "createdAt": "2026-07-02T15:40:24.160Z",
  "jsonPath": "planning/project/Repository_Reconciliation/REPOSITORY_RECONCILIATION_champcity_a_i.json",
  "markdownPath": "planning/project/Repository_Reconciliation/REPOSITORY_RECONCILIATION_champcity_a_i.md",
  "payload": {
    "kind": "repository_reconciliation",
    "title": "Repository Reconciliation: ChampCity A/I"
  },
  "payloadHash": "sha256:53f293227f1947fc2d94f740c91d6eb54fd7c6b65ae2a4699cf9f60801637351",
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
  "updatedAt": "2026-07-02T15:40:24.160Z"
}
-->

# Repository Reconciliation: ChampCity A/I

## Source Context

Reconciliation ID: REPOSITORY_RECONCILIATION_champcity_a_i
Project: ChampCity A/I
Source Project Planning Document: planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json
Source sidecar JSON: PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json
Source sidecar Markdown: PROJECT_PLANNING_DOCUMENTS_champcity_a_i.md
Source phase folder: phase-02
Created: 2026-07-02T15:40:24.160Z
Updated: 2026-07-02T15:40:24.160Z

## Reviewed Artifact Summary

### PROJECT_PROFILE.md
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

### PROJECT_STATE.md
# Project State
## Last Updated
2026-07-02
## Current Stage
Alpha app development.
## Current Milestone
Phase 02 upstream project planning workflow is complete and closed out.
Phase 02 has completed WC01 through WC06, including the WC06 Repository Reconciliation / Project Roadmap / Phase Planning workflow. The latest WC06 validation report records a pass, and the revised Phase 02 closeout report records `Close phase`.
## Phase 02 Status
Phase 02 is closed.
Latest closeout artifact reviewed:
- `planning/phases/phase-02/Closeout_Reports/CLOSEOUT_REPORT_phase-02_phase_2_closeout.md`
- JSON pair: `planning/phases/phase-02/Closeout_Reports/CLOSEOUT_REPORT_phase-02_phase_2_closeout.json`
- Generated: `2026-07-02T15:28:24.620Z`
- Closeout decision: `Close phase`
- Closeout summary: Phase 02 has been completed; all validations were performed; all Work Cards, fixes, and repairs passed validation.
- Completed items: all Work Cards, fixes, and repairs have been drafted, implemented, and validated.
- Remaining items: no Phase 2 items remain.

### WORK_CARD_BACKLOG.md
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

### OPEN_QUESTIONS.md
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

### RISKS.md
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

### DECISIONS.md
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

## Implemented State Summary

Not provided.

## Partially Implemented Items

- Not provided.

## Missing Items

- Not provided.

## Stale Planning Items

- Not provided.

## Design Drift Notes

Not provided.

## Current Risks

- The current app workflow surface is broader than a prompt implementer. It includes project intake, Architect interview generation, project planning document generation, reconciliation/project state review, phase intake, phase Architect interview, phase planning documents, Work Card capture, Architect prompt composer, risk router, Implementer execution packet generator, Implementer report capture, human validation, and phase closeo
- MCP integration is conceptually central but still under-defined as a product feature. The documents correctly identify ChampCity MCP as the repo bridge, but the remaining risk is operational: the Operator needs clear status indicators, visible read/write boundaries, artifact previews, approval gates, and understandable failure states.
- A dedicated MCP integration/security phase is missing as the next practical product phase. The risks already identify this as the largest technical/product risk, but it has not yet been converted into the next phase plan.
- RISKS.md contains structural residue. The fragments ### G. MCP Integration... and ## 7. Risks and Drift Warnings appear embedded in the risk list rather than normalized as risk entries.
- Design Drift Notes
- The product thesis has expanded from prompt generation into a guided operating system for Architect / Implementer software work. That drift is probably correct, but the documents must stop describing the app as if the next step is still basic planning-document generation.
- The core risk is no longer whether ChampCity A/I can generate planning artifacts. It can. The current risk is whether it can safely coordinate repo-grounded state, MCP-mediated access, Operator approvals, Implementer handoffs, validation evidence, and phase progression without confusing a non-developer.
- The largest current risk is MCP boundary design. The user must know what is connected, what files are being read, what files may be written, and when approval is required.
- The second-largest risk is stale state. The contradiction between Phase 02 closure and the backlog’s Phase 02 WC05 recommendation is exactly the kind of drift the product is supposed to prevent.
- The third risk is subscription integration ambiguity. The documents correctly avoid treating API integration as the only path, but browser/clipboard/desktop-helper/subscription-surface automation remains unresolved and should not be mixed into the immediate MCP repo-bridge phase.
- The fourth risk is release confusion. The app has planning features, but public release requires packaging, onboarding, safe defaults, docs, validation lanes, and regression discipline.
- The fifth risk is developer-language leakage. The project is intended for non-developers, so labels like validation, closeout, repair prompt, and phase artifact may need user-facing translations while preserving the underlying Architect / Implementer precision.
- Phase 03: MCP Integration, Repo-Bridge Workflow, and Security Boundary Design
- The recommended next phase is Phase 03: MCP Integration, Repo-Bridge Workflow, and Security Boundary Design.
- This should come before subscription automation, broad UI polish, or public release work. MCP is the foundation of the intended Alpha workflow, and the project’s own risk register identifies it as the largest product and security boundary risk.

## Recommended Roadmap

Not provided.

## Recommended Milestones

- Not provided.

## Recommended Phases

- Not provided.

## Recommended Next Phase

Not provided.

## Architect Notes

Not provided.

## Completed Architect Reconciliation Output

Reviewed Artifact Summary

Reviewed the supplied reconciliation handoff for ChampCity A/I, including the safe summaries for PROJECT_PROFILE.md, PROJECT_STATE.md, WORK_CARD_BACKLOG.md, OPEN_QUESTIONS.md, RISKS.md, DECISIONS.md, Phase 02 artifact counts, current app workflow surface, and repository structure. I also checked the available ChampCity MCP capability surface; it confirms bounded local project document lookup and Implementer Report summary support, but not arbitrary web fetch or hidden memory mutation. The attached handoff is the controlling evidence source for this reconciliation.

Implemented State Summary

ChampCity A/I is in Alpha app development. The approved technical shape remains Electron desktop app with TypeScript. The product thesis is stable: help non-developer Operators move through an Architect / Implementer workflow using the Capture -> Frame -> Plan -> Build -> Prove mental model.

Phase 02 is recorded as closed. The supplied state says WC01 through WC06 are complete, including project intake, project Architect interview, validation/evidence repair, project planning documents, phase intake/interview, and phase planning document generation. The closeout artifact is dated 2026-07-02T15:28:24.620Z and records Close phase.

The current app workflow surface is broader than a prompt implementer. It includes project intake, Architect interview generation, project planning document generation, reconciliation/project state review, phase intake, phase Architect interview, phase planning documents, Work Card capture, Architect prompt composer, risk router, Implementer execution packet generator, Implementer report capture, human validation, and phase closeout.

The repo structure appears coherent for the current Alpha state: root at <PROJECT_REPO>, with src/main, src/preload, src/renderer, src/shared, plus planning/project and planning/phases.

Partially Implemented Items

The planning workflow spine is implemented, but the product-facing release workflow is not yet complete. The app appears to support the major planning and validation surfaces, but there is no evidence yet of a fully guided end-to-end “new user can complete a project safely” experience.

MCP integration is conceptually central but still under-defined as a product feature. The documents correctly identify ChampCity MCP as the repo bridge, but the remaining risk is operational: the Operator needs clear status indicators, visible read/write boundaries, artifact previews, approval gates, and understandable failure states.

The evidence workflow exists enough to be discussed in Phase 02, but screenshot/evidence storage remains unresolved. The recommended default is an app-controlled evidence folder under the planning structure, but that still appears to be an open product decision.

The release surface is not yet reconciled. The app has internal workflow surfaces, but there is no evidence here of installer packaging, first-run onboarding, repo-selection safety checks, user-facing MCP setup flow, release validation, or public documentation.

Canonical Implementer storage migration is complete. Historical archived paths remain evidence only and are excluded from active workflow discovery.

Missing Items

A current post-Phase-02 roadmap artifact is missing. Phase 02 closed the upstream planning workflow, but the supplied backlog still points backward into Phase 02 rather than forward into Phase 03.

A product release milestone map is missing. The project needs a clear sequence from Alpha workflow completion to internal Alpha hardening, Beta readiness, and public release.

A dedicated MCP integration/security phase is missing as the next practical product phase. The risks already identify this as the largest technical/product risk, but it has not yet been converted into the next phase plan.

A non-developer onboarding path is missing or at least not evidenced. The user type is explicitly non-developer, so setup, MCP connection, project folder selection, repo safety, and “what do I do next?” must be explained in plain operational language.

A consolidated state-reconciliation mechanism is missing. The current project needs the app to detect stale project planning docs, stale phase references, stale backlog items, and conflicting status claims before the Operator continues planning.

A release validation framework is missing. Current validation appears Work Card and phase oriented; product release needs installer checks, clean-machine checks, repo permission checks, artifact write checks, UI path checks, evidence capture checks, and regression validation.

Stale Planning Items

WORK_CARD_BACKLOG.md is stale. It says the next recommended Implementer task is PH02 WC05: Add Phase Intake and Phase Interview prompt generator, but PROJECT_STATE.md says Phase 02 completed WC01 through WC06 and is closed.

The backlog note saying not to generate initial Work Cards beyond the backlog correction until the dedicated Phase Planning Documents Work Card is stale. That dedicated workflow is now represented as completed by WC06.

The phase artifact summary is stale where it says Phase 02 appears ready for closeout review and repairs should be reviewed before closing. The supplied PROJECT_STATE.md says the latest revised closeout report records Close phase.

The open question language saying items are “not blockers for the next planning-documents step” is stale. The project is now past the Phase 02 planning-documents step. These should be reframed as Alpha product-design questions.

RISKS.md contains structural residue. The fragments ### G. MCP Integration... and ## 7. Risks and Drift Warnings appear embedded in the risk list rather than normalized as risk entries.

DECISIONS.md contains decision fragments that should be rewritten into complete decision records. For example, “Project profile, phase plans...” reads like an artifact inventory, not a decision.

Design Drift Notes

The product thesis has expanded from prompt generation into a guided operating system for Architect / Implementer software work. That drift is probably correct, but the documents must stop describing the app as if the next step is still basic planning-document generation.

The core risk is no longer whether ChampCity A/I can generate planning artifacts. It can. The current risk is whether it can safely coordinate repo-grounded state, MCP-mediated access, Operator approvals, Implementer handoffs, validation evidence, and phase progression without confusing a non-developer.

There is a tension between “connector” and “centaur.” The app should connect the workflow, but not silently automate Operator judgment. The decision that the Operator remains responsible for approval and validation is still correct and should remain a hard boundary.

The current workflow surface risks becoming functionally complete but cognitively heavy. Capture -> Frame -> Plan -> Build -> Prove should become the visible product navigation model, with the detailed artifacts hidden behind plain-language steps.

Current Risks

The largest current risk is MCP boundary design. The user must know what is connected, what files are being read, what files may be written, and when approval is required.

The second-largest risk is stale state. The contradiction between Phase 02 closure and the backlog’s Phase 02 WC05 recommendation is exactly the kind of drift the product is supposed to prevent.

The third risk is subscription integration ambiguity. The documents correctly avoid treating API integration as the only path, but browser/clipboard/desktop-helper/subscription-surface automation remains unresolved and should not be mixed into the immediate MCP repo-bridge phase.

The fourth risk is release confusion. The app has planning features, but public release requires packaging, onboarding, safe defaults, docs, validation lanes, and regression discipline.

The fifth risk is developer-language leakage. The project is intended for non-developers, so labels like validation, closeout, repair prompt, and phase artifact may need user-facing translations while preserving the underlying Architect / Implementer precision.

Recommended Roadmap

First, reconcile state and backlog. Update project state, backlog, open questions, risks, and decisions so they no longer point to Phase 02 work as pending. The next actionable state should say Phase 02 is closed and the next phase is Phase 03.

Second, run a dedicated MCP integration and repo-bridge phase. This should define MCP status, repo selection, read/write boundaries, safe artifact writes, Operator approval gates, evidence paths, fallback behavior, and user-facing explanations.

Third, harden the guided Alpha workflow. The app should guide the Operator through Capture -> Frame -> Plan -> Build -> Prove as a progressive flow, not as a set of loosely related tools.

Fourth, add state reconciliation as a first-class product feature. The app should detect stale phase references, contradictory status, missing reports, incomplete validation, unresolved repairs, and outdated next-step recommendations.

Fifth, prepare Beta readiness. This includes installer packaging, clean environment testing, documentation, onboarding, validation-lane rules, error handling, and release notes.

Sixth, defer subscription-surface automation until the MCP-mediated workflow is reliable. Browser automation, clipboard staging, desktop overlays, or ChatGPT/Claude subscription integration should be treated as a later research/design phase, not the immediate next build phase.

Recommended Milestones

Milestone 1: Phase 02 State Reconciled
Outcome: all planning docs agree that Phase 02 is closed and no Phase 02 Work Card remains pending.

Milestone 2: MCP Repo Bridge Usable by a Non-Developer
Outcome: the app clearly shows connection status, selected repo, allowed actions, files touched, pending writes, and approval steps.

Milestone 3: Guided Alpha Workflow Complete
Outcome: an Operator can start with project intake and progress through Capture -> Frame -> Plan -> Build -> Prove without needing to understand the underlying artifact structure.

Milestone 4: Evidence and Validation System Hardened
Outcome: validation notes, screenshots, Implementer Reports, repair prompts, and closeout artifacts are consistently linked and recoverable.

Milestone 5: Beta Candidate
Outcome: installable app, documented setup, clean-machine validation, known limitations, fallback procedures, and no stale planning contradictions.

Milestone 6: Public Windows Release
Outcome: Windows release is supportable, understandable, and safe for the intended non-developer Operator.

Recommended Phases

Phase 03: MCP Integration, Repo-Bridge Workflow, and Security Boundary Design
Purpose: turn ChampCity MCP from a project assumption into a visible, safe, user-understandable product workflow.

Phase 04: Guided Alpha Workflow UX
Purpose: convert the current tool surface into a progressive Capture -> Frame -> Plan -> Build -> Prove workflow for non-developer Operators.

Phase 05: State Reconciliation and Artifact Integrity
Purpose: make contradiction detection, stale backlog detection, missing artifact detection, and repair routing part of the product.

Phase 06: Evidence, Validation, and Release Hardening
Purpose: mature validation evidence, screenshot storage, Implementer Report handling, repair loop integrity, and closeout confidence.

Phase 07: Beta Packaging and Onboarding
Purpose: installer, first-run setup, repo selection, MCP setup explanation, documentation, and clean-environment validation.

Phase 08: Subscription-Surface Integration Research
Purpose: evaluate browser automation, clipboard queues, desktop helper flows, and subscription ChatGPT/Claude workflow support after the repo-grounded Alpha path is stable.

Recommended Next Phase

The recommended next phase is Phase 03: MCP Integration, Repo-Bridge Workflow, and Security Boundary Design.

This should come before subscription automation, broad UI polish, or public release work. MCP is the foundation of the intended Alpha workflow, and the project’s own risk register identifies it as the largest product and security boundary risk.

The Phase 03 goal should be: make local project connection, repo access, artifact reads, artifact writes, approval gates, evidence storage, and failure states explicit enough that a non-developer Operator can use them safely.

Architect Notes

Do not continue using the current WORK_CARD_BACKLOG.md as the operational next-step source until it is reconciled. It points to a completed Phase 02 Work Card and conflicts with PROJECT_STATE.md.

The product direction is sound, but the project needs a stronger state authority model. When PROJECT_STATE.md, backlog, closeout reports, and phase summaries conflict, the app should identify the conflict and ask the Operator or Architect to reconcile it before new planning continues.

Phase 03 should not be framed as “add more MCP features.” It should be framed as “make the repo bridge safe, visible, and understandable.” That phrasing better fits the non-developer user model and the Capture -> Frame -> Plan -> Build -> Prove operating loop.
