# Phase Planning Documents: Repository Reconciliation and Phase Planning Documents

> Superseded historical artifact. This 2026-07-02 phase-03 proposal has been superseded by the approved Phase 03 bundle for `Workflow Router Screen Correction and Guided Current Action UI`. Do not use this file as active Phase 03 planning authority.

Current Phase 03 authority:

- `planning/phases/phase-03/Phase_Interview.md`
- `planning/phases/phase-03/Phase_Planning.md`
- `planning/phases/phase-03/Work_Card_Plan.md`
- `planning/phases/phase-03/Operator_Phase_Approval.md`

## Source Context

Phase Planning Documents ID: PHASE_PLANNING_DOCUMENTS_repository_reconciliation_and_phase_planning_documents
Project: ChampCity A/I
Phase folder: phase-03
Phase name: Repository Reconciliation and Phase Planning Documents
Project Planning Documents JSON: PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json
Project Planning Documents Markdown: PROJECT_PLANNING_DOCUMENTS_champcity_a_i.md
Repository Reconciliation JSON: REPOSITORY_RECONCILIATION_champcity_a_i.json
Repository Reconciliation Markdown: REPOSITORY_RECONCILIATION_champcity_a_i.md
Phase Map JSON: PHASE_MAP_champcity_a_i.json
Phase Map Markdown: PHASE_MAP_champcity_a_i.md
Mapped phase ID: phase-03
Project Roadmap JSON: PROJECT_ROADMAP_champcity_a_i.json
Project Roadmap Markdown: PROJECT_ROADMAP_champcity_a_i.md
Phase Intake JSON: Not selected.
Phase Intake Markdown: Not found.
Phase Architect Interview Prompt JSON: Not selected.
Phase Architect Interview Prompt Markdown: Not found.
Review status: Superseded
Phase activation status: Superseded / Not Active
Created: 2026-07-02T18:05:46.022Z
Updated: 2026-07-02T18:05:46.022Z

## Artifact Authority

Phase Planning Documents = draft or approved plan for a selected phase. This specific artifact is superseded historical output for the obsolete Phase 03 title `Repository Reconciliation and Phase Planning Documents`; the active Phase 03 authority is the approved workflow-router bundle listed above.

## Formal Work Card Boundary

This document and its Work Card Plan are superseded planning proposals only. They must not be converted into active Formal Work Cards for Phase 03.

## Phase Brief

Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.

## Phase Goal

Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.

## Phase User/Operator Outcome

The Operator can generate phase planning documents for Repository Reconciliation and Phase Planning Documents from mapped roadmap context.

## Phase Scope

Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.

## Explicit Out-Of-Scope Items

- Not provided.

## Affected App Screens/Workflows

Not provided.

## Source Project Planning Context

Project Planning Documents record: PROJECT_PLANNING_DOCUMENTS_champcity_a_i
Project: ChampCity A/I
Confirmed facts: Project name: **ChampCity A/I**; Public/company/site brand: **ChampCity AI**; Current stage: **Alpha development**; The project is no longer in MVP. The MVP is closed and proved the work-card loop model. The current effort is Alpha development, using ChampCity A/I itself as dogfood for the larger project-planning workflow.; ChampCity A/I is an end-to-end platform for using the **Architect / Implementer** model workflow for agentic AI application development.; The application should help a non-developer or semi-technical Operator communicate with an AI Architect, plan a software project, create durable project artifacts, hand scoped work to an Implementer, validate results, manage repair loops, and track progress visually from project start through release readiness.; The primary users/operators are non-developer end users. They may be technically comfortable, but they should not be expected to know coding languages, software architecture, tech-stack design, implementation planning, or formal validation practices.; The Operator remains a centaur. ChampCity A/I should not become a fully autonomous software-creation system. The Operator remains responsible for approvals, validation, decision-making, and movement between workflow states.; The project’s source-of-truth location is:; `<PROJECT_REPO>`; The source of truth is an existing local repository with durable planning files.; The preferred Implementer tool is **Codex**.
Initial phase candidates: Not provided.

## Repository Reconciliation Summary

Repository Reconciliation: REPOSITORY_RECONCILIATION_champcity_a_i
Implemented state: Not provided.
Recommended next phase: Not provided.
Current risks: The current app workflow surface is broader than a prompt builder. It includes project intake, Architect interview generation, project planning document generation, reconciliation/project state review, phase intake, phase Architect interview, phase planning documents, Work Card capture, Architect prompt composer, risk router, Implementer prompt generator, Implementer report capture, human validation, and phase closeo; MCP integration is conceptually central but still under-defined as a product feature. The documents correctly identify ChampCity MCP as the repo bridge, but the remaining risk is operational: the Operator needs clear status indicators, visible read/write boundaries, artifact previews, approval gates, and understandable failure states.; A dedicated MCP integration/security phase is missing as the next practical product phase. The risks already identify this as the largest technical/product risk, but it has not yet been converted into the next phase plan.; RISKS.md contains structural residue. The fragments ### G. MCP Integration... and ## 7. Risks and Drift Warnings appear embedded in the risk list rather than normalized as risk entries.; Design Drift Notes; The product thesis has expanded from prompt generation into a guided operating system for Architect / Implementer software work. That drift is probably correct, but the documents must stop describing the app as if the next step is still basic planning-document generation.; The core risk is no longer whether ChampCity A/I can generate planning artifacts. It can. The current risk is whether it can safely coordinate repo-grounded state, MCP-mediated access, Operator approvals, Implementer handoffs, validation evidence, and phase progression without confusing a non-developer.; The largest current risk is MCP boundary design. The user must know what is connected, what files are being read, what files may be written, and when approval is required.; The second-largest risk is stale state. The contradiction between Phase 02 closure and the backlog’s Phase 02 WC05 recommendation is exactly the kind of drift the product is supposed to prevent.; The third risk is subscription integration ambiguity. The documents correctly avoid treating API integration as the only path, but browser/clipboard/desktop-helper/subscription-surface automation remains unresolved and should not be mixed into the immediate MCP repo-bridge phase.; The fourth risk is release confusion. The app has planning features, but public release requires packaging, onboarding, safe defaults, docs, validation lanes, and regression discipline.; The fifth risk is developer-language leakage. The project is intended for non-developers, so labels like validation, closeout, repair prompt, and phase artifact may need user-facing translations while preserving the underlying Architect / Implementer precision.; Phase 03: MCP Integration, Repo-Bridge Workflow, and Security Boundary Design; The recommended next phase is Phase 03: MCP Integration, Repo-Bridge Workflow, and Security Boundary Design.; This should come before subscription automation, broad UI polish, or public release work. MCP is the foundation of the intended Alpha workflow, and the project’s own risk register identifies it as the largest product and security boundary risk.

## Clarification / Legacy Interview Summary

Mapped phase: phase-03 - Repository Reconciliation and Phase Planning Documents
Purpose: Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.
Status: pending review / not active
Notes: Roadmap confidence: medium; Prior phase must be repaired, validated, and closed or explicitly carried forward.; Roadmap / Phase Map should be reviewed at phase closeout before this phase starts.; Operator must approve the phase before formal Work Cards are created.
Assumptions: Project Planning Documents; Repository Reconciliation; 2026-07-01 Architect Alignment Amendment; All approved Work Cards have Builder Reports.; Validation Reports and repair decisions are reconciled.; Phase Closeout and Next Phase Readiness Review artifacts are saved.
Risks: Later phase details are lower confidence until the previous phase has been closed.

## Phase Assumptions

- Project Planning Documents
- Repository Reconciliation
- 2026-07-01 Architect Alignment Amendment
- All approved Work Cards have Builder Reports.
- Validation Reports and repair decisions are reconciled.
- Phase Closeout and Next Phase Readiness Review artifacts are saved.
- The formal Phase Map is the selectable phase authority for this planning pass.
- Project Roadmap / Phase Map is the planning authority; compatibility Phase Intake is generated only if needed internally.

## Phase Risks

- Later phase details are lower confidence until the previous phase has been closed.
- The current app workflow surface is broader than a prompt builder. It includes project intake, Architect interview generation, project planning document generation, reconciliation/project state review, phase intake, phase Architect interview, phase planning documents, Work Card capture, Architect prompt composer, risk router, Implementer prompt generator, Implementer report capture, human validation, and phase closeo
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

## Phase Dependencies

- Roadmap confidence: medium
- Prior phase must be repaired, validated, and closed or explicitly carried forward.
- Roadmap / Phase Map should be reviewed at phase closeout before this phase starts.
- Operator must approve the phase before formal Work Cards are created.

## Validation Expectations

- Validate mapped phase phase-03 planning artifacts before Operator acceptance.

## Recommended Implementation Sequence

1. WC01: Generate durable Project Roadmap and Phase Map
2. WC02: Consolidate validation evidence and stale-state warnings
3. WC03: Create Next Phase Readiness Review workflow
4. WC04: Produce roadmap-driven Work Card plans

## Proposed Work Card Plan

### WC01: Generate durable Project Roadmap and Phase Map

- Plan status: Proposed
- Reconciliation status: Planned
- Executable status: Not Executable
- Problem: Generate durable Project Roadmap and Phase Map is needed to advance Repository Reconciliation and Phase Planning Documents toward: Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.
- User outcome: The Operator can review generate durable project roadmap and phase map as part of Repository Reconciliation and Phase Planning Documents progress.
- Included scope: Generate durable Project Roadmap and Phase Map. Phase scope context: Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.
- Out of scope: Do not perform Operator acceptance, phase closeout, release work, provider SDK integration, database/auth/cloud work, MCP work, connector work, or automatic formal Work Card creation.
- Dependencies: Roadmap confidence: medium; Prior phase must be repaired, validated, and closed or explicitly carried forward.; Roadmap / Phase Map should be reviewed at phase closeout before this phase starts.; Operator must approve the phase before formal Work Cards are created.
- Risk level: high
- Validation items: Validate mapped phase phase-03 planning artifacts before Operator acceptance.
- Suggested ordering: 1
- Notes for Architect/Implementer: Review before conversion into a formal Work Card. Preserve Operator / Architect / Implementer terminology.

### WC02: Consolidate validation evidence and stale-state warnings

- Plan status: Proposed
- Reconciliation status: Planned
- Executable status: Not Executable
- Problem: Consolidate validation evidence and stale-state warnings is needed to advance Repository Reconciliation and Phase Planning Documents toward: Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.
- User outcome: The Operator can review consolidate validation evidence and stale-state warnings as part of Repository Reconciliation and Phase Planning Documents progress.
- Included scope: Consolidate validation evidence and stale-state warnings. Phase scope context: Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.
- Out of scope: Do not perform Operator acceptance, phase closeout, release work, provider SDK integration, database/auth/cloud work, MCP work, connector work, or automatic formal Work Card creation.
- Dependencies: Roadmap confidence: medium; Prior phase must be repaired, validated, and closed or explicitly carried forward.; Roadmap / Phase Map should be reviewed at phase closeout before this phase starts.; Operator must approve the phase before formal Work Cards are created.
- Risk level: high
- Validation items: Validate mapped phase phase-03 planning artifacts before Operator acceptance.
- Suggested ordering: 2
- Notes for Architect/Implementer: Review before conversion into a formal Work Card. Preserve Operator / Architect / Implementer terminology.

### WC03: Create Next Phase Readiness Review workflow

- Plan status: Proposed
- Reconciliation status: Planned
- Executable status: Not Executable
- Problem: Create Next Phase Readiness Review workflow is needed to advance Repository Reconciliation and Phase Planning Documents toward: Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.
- User outcome: The Operator can review create next phase readiness review workflow as part of Repository Reconciliation and Phase Planning Documents progress.
- Included scope: Create Next Phase Readiness Review workflow. Phase scope context: Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.
- Out of scope: Do not perform Operator acceptance, phase closeout, release work, provider SDK integration, database/auth/cloud work, MCP work, connector work, or automatic formal Work Card creation.
- Dependencies: Roadmap confidence: medium; Prior phase must be repaired, validated, and closed or explicitly carried forward.; Roadmap / Phase Map should be reviewed at phase closeout before this phase starts.; Operator must approve the phase before formal Work Cards are created.
- Risk level: high
- Validation items: Validate mapped phase phase-03 planning artifacts before Operator acceptance.
- Suggested ordering: 3
- Notes for Architect/Implementer: Review before conversion into a formal Work Card. Preserve Operator / Architect / Implementer terminology.

### WC04: Produce roadmap-driven Work Card plans

- Plan status: Proposed
- Reconciliation status: Planned
- Executable status: Not Executable
- Problem: Produce roadmap-driven Work Card plans is needed to advance Repository Reconciliation and Phase Planning Documents toward: Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.
- User outcome: The Operator can review produce roadmap-driven work card plans as part of Repository Reconciliation and Phase Planning Documents progress.
- Included scope: Produce roadmap-driven Work Card plans. Phase scope context: Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.
- Out of scope: Do not perform Operator acceptance, phase closeout, release work, provider SDK integration, database/auth/cloud work, MCP work, connector work, or automatic formal Work Card creation.
- Dependencies: Roadmap confidence: medium; Prior phase must be repaired, validated, and closed or explicitly carried forward.; Roadmap / Phase Map should be reviewed at phase closeout before this phase starts.; Operator must approve the phase before formal Work Cards are created.
- Risk level: high
- Validation items: Validate mapped phase phase-03 planning artifacts before Operator acceptance.
- Suggested ordering: 4
- Notes for Architect/Implementer: Review before conversion into a formal Work Card. Preserve Operator / Architect / Implementer terminology.

### WC05: Assumptions: Project Planning Documents; Repository Reconciliation; 2026-07-01 Architect Alignme

- Plan status: Proposed
- Reconciliation status: Planned
- Executable status: Not Executable
- Problem: Assumptions: Project Planning Documents; Repository Reconciliation; 2026-07-01 Architect Alignme is needed to advance Repository Reconciliation and Phase Planning Documents toward: Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.
- User outcome: The Operator can review assumptions: project planning documents; repository reconciliation; 2026-07-01 architect alignme as part of Repository Reconciliation and Phase Planning Documents progress.
- Included scope: Assumptions: Project Planning Documents; Repository Reconciliation; 2026-07-01 Architect Alignme. Phase scope context: Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.
- Out of scope: Do not perform Operator acceptance, phase closeout, release work, provider SDK integration, database/auth/cloud work, MCP work, connector work, or automatic formal Work Card creation.
- Dependencies: Roadmap confidence: medium; Prior phase must be repaired, validated, and closed or explicitly carried forward.; Roadmap / Phase Map should be reviewed at phase closeout before this phase starts.; Operator must approve the phase before formal Work Cards are created.
- Risk level: high
- Validation items: Validate mapped phase phase-03 planning artifacts before Operator acceptance.
- Suggested ordering: 5
- Notes for Architect/Implementer: Review before conversion into a formal Work Card. Preserve Operator / Architect / Implementer terminology.

### WC06: Planned Work Cards: WC01: Generate durable Project Roadmap and Phase Map; WC02: Consolidate vali

- Plan status: Proposed
- Reconciliation status: Planned
- Executable status: Not Executable
- Problem: Planned Work Cards: WC01: Generate durable Project Roadmap and Phase Map; WC02: Consolidate vali is needed to advance Repository Reconciliation and Phase Planning Documents toward: Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.
- User outcome: The Operator can review planned work cards: wc01: generate durable project roadmap and phase map; wc02: consolidate vali as part of Repository Reconciliation and Phase Planning Documents progress.
- Included scope: Planned Work Cards: WC01: Generate durable Project Roadmap and Phase Map; WC02: Consolidate vali. Phase scope context: Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.
- Out of scope: Do not perform Operator acceptance, phase closeout, release work, provider SDK integration, database/auth/cloud work, MCP work, connector work, or automatic formal Work Card creation.
- Dependencies: Roadmap confidence: medium; Prior phase must be repaired, validated, and closed or explicitly carried forward.; Roadmap / Phase Map should be reviewed at phase closeout before this phase starts.; Operator must approve the phase before formal Work Cards are created.
- Risk level: high
- Validation items: Validate mapped phase phase-03 planning artifacts before Operator acceptance.
- Suggested ordering: 6
- Notes for Architect/Implementer: Review before conversion into a formal Work Card. Preserve Operator / Architect / Implementer terminology.

## Open Questions

- Confirm scope boundaries during Next Phase Readiness Review.

## Next Recommended Action

Use the approved Phase 03 workflow-router bundle instead. Preserve this file only as historical evidence of the superseded repository-reconciliation planning path.

## Phase-Specific Clarification Answers

Not provided.

## Clarification / Legacy Interview Context

Mapped phase: phase-03 - Repository Reconciliation and Phase Planning Documents
Purpose: Stabilize project state authority, validation summaries, stale-state detection, and next-phase recommendation.
Status: pending review / not active
Notes: Roadmap confidence: medium; Prior phase must be repaired, validated, and closed or explicitly carried forward.; Roadmap / Phase Map should be reviewed at phase closeout before this phase starts.; Operator must approve the phase before formal Work Cards are created.
Assumptions: Project Planning Documents; Repository Reconciliation; 2026-07-01 Architect Alignment Amendment; All approved Work Cards have Builder Reports.; Validation Reports and repair decisions are reconciled.; Phase Closeout and Next Phase Readiness Review artifacts are saved.
Risks: Later phase details are lower confidence until the previous phase has been closed.
Unresolved questions: Confirm scope boundaries during Next Phase Readiness Review.
Planned Work Cards: WC01: Generate durable Project Roadmap and Phase Map; WC02: Consolidate validation evidence and stale-state warnings; WC03: Create Next Phase Readiness Review workflow; WC04: Produce roadmap-driven Work Card plans
