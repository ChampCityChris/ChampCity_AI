<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/phase_map/PHASE_MAP_champcity_a_i",
  "artifactType": "phase_map",
  "createdAt": "2026-07-02T18:00:51.311Z",
  "jsonPath": "planning/project/Phase_Map/PHASE_MAP_champcity_a_i.json",
  "markdownPath": "planning/project/Phase_Map/PHASE_MAP_champcity_a_i.md",
  "payload": {
    "kind": "phase_map",
    "title": "Phase Map: ChampCity A/I"
  },
  "payloadHash": "sha256:de771883fb9ea45d062148760b6a2242b15734deafefe9e35490db40cde525a6",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC01",
      "champcity-ai/phase-03/implementer_report/WC01"
    ],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "pending",
  "updatedAt": "2026-07-02T18:00:51.311Z"
}
-->

# Phase Map: ChampCity A/I

## Source Context

Phase Map ID: PHASE_MAP_champcity_a_i
Project: ChampCity A/I
Project key: champcity_a_i
Project Planning Documents JSON: PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json
Project Planning Documents Markdown: PROJECT_PLANNING_DOCUMENTS_champcity_a_i.md
Repository Reconciliation JSON: REPOSITORY_RECONCILIATION_champcity_a_i.json
Repository Reconciliation Markdown: REPOSITORY_RECONCILIATION_champcity_a_i.md
Project Roadmap JSON: PROJECT_ROADMAP_champcity_a_i.json
Project Roadmap Markdown: PROJECT_ROADMAP_champcity_a_i.md
Roadmap ID: PROJECT_ROADMAP_champcity_a_i
Current/next phase: phase-03
Next phase title: Workflow Router Screen Correction and Guided Current Action UI
Activation boundary: Phase 03 is active by Operator closeout and Phase Approval; later mapped or pending-review phases are not active until an explicit Operator activation decision.
Source phase: phase-02
Source file: PROJECT_ROADMAP_champcity_a_i.json
Created: 2026-07-02T18:00:51.311Z
Updated: 2026-07-02T18:00:51.311Z

## Known Existing Phase Artifacts

### phase-01

- Work Cards: 10
- Implementer Reports: 20
- Validation Reports: 22
- Repair Prompts: 0
- Closeout Reports: 4
- Work Card Plans: None.
- Phase Planning Documents: None.
- Phase Readiness Reviews: None.
- Recommendation: Phase appears ready for closeout review.
- Observations: Existing Closeout Report artifacts found. Latest filename: CLOSEOUT_REPORT_phase-01_phase_1_closeout.md.

### phase-02

- Work Cards: 7
- Implementer Reports: 15
- Validation Reports: 36
- Repair Prompts: 3
- Closeout Reports: 2
- Work Card Plans: None.
- Phase Planning Documents: None.
- Phase Readiness Reviews: None.
- Recommendation: Phase appears ready for closeout review. Phase has repair prompts. Review repairs before closing.
- Observations: Repair Prompt artifacts exist and should be reviewed before closeout.; Existing Closeout Report artifacts found. Latest filename: CLOSEOUT_REPORT_phase-02_phase_2_closeout.md.

## Planned Roadmap Phases

- phase-01: MVP foundation and core Work Card loop
- phase-02: Upstream Project Planning and Corrective Workflow Authority
- phase-03: Workflow Router Screen Correction and Guided Current Action UI
- phase-04: Workflow Execution Hardening
- phase-05: MCP Integration, Repo Bridge, and Security Boundary
- phase-06: Guided Operator UX Polish and Figma Implementation
- phase-07: Evidence, Validation, and Release Packaging

## Detected Gaps Or Assumptions

- No prior Project Roadmap artifacts were found under planning/project/Project_Roadmap/.
- phase-02 has Repair Prompts that must be reviewed before closeout or next-phase creation.
- Open Questions
- These are not blockers for the next planning-documents step, but they should remain open profile fields until resolved.
- First, how should ChampCity A/I expose and explain ChampCity MCP setup to non-developer users without overwhelming them?
- Recommended default: the app should present MCP as a required local connector for the guided Alpha workflow, with simple status checks and plain-language explanations.
- Second, should subscription-surface automation beyond MCP be built as browser automation, clipboard automation, desktop overlay/helper, staged copy/paste queue, or some combination of these?
- Recommended default: treat this as a later design/research phase. MCP-mediated repo access is the primary Alpha integration path.
- Third, should Beta require Mac/Linux support, or is Windows public release enough for Beta?
- Recommended default: Windows public release is enough for Beta. Mac/Linux can follow after the workflow is proven.
- Fourth, should screenshots be stored directly in the repo, stored in an app-controlled evidence folder, or referenced by path?
- Recommended default: use an app-controlled evidence folder under the project planning structure, with repo-safe filenames and no hidden external dependency.
- Decisions
- The Operator remains a centaur. ChampCity A/I should not become a fully autonomous software-creation system. The Operator remains responsible for approvals, validation, decision-making, and movement between workflow states.
- Project profile, phase plans, work cards, Architect outputs, Implementer outputs, validation notes, Implementer Reports, repair prompts, closeout records, and decision history.
- ChampCity MCP is the repo bridge that allows the Architect to inspect project state, generate and save planning artifacts, review Implementer Reports, and support the Operator’s decision loop without relying on stale chat context alone.
- Fully autonomous software creation without Operator review, validation, and decision authority.
- The project must avoid state fragmentation. The app must keep durable profile, phase, work-card, prompt, handoff, validation, repair, closeout, and decision artifacts tied together. Raw chats alone are not sufficient.
- Durable planning artifacts are stored as Markdown and JSON in the repository.
- Product-facing terminology uses Operator, Architect, and Implementer.
- The core loop remains Capture -> Frame -> Plan -> Build -> Prove.
- Preferred Implementer tool: Codex.
- Older phase-03 draft artifacts for Repository Reconciliation and Phase Planning Documents are superseded historical records.
- phase-03 is active and approved for just-in-time Work Card execution from the approved workflow-router Phase 03 bundle.
- phase-04 is mapped from the roadmap but has no generated phase artifact folder yet.
- phase-05 is mapped from the roadmap but has no generated phase artifact folder yet.
- phase-06 is mapped from the roadmap but has no generated phase artifact folder yet.
- phase-07 is mapped from the roadmap but has no generated phase artifact folder yet.

## Mapped Phase Records

### phase-01: MVP foundation and core Work Card loop

- Status: closed
- Purpose: Preserve completed phase evidence and use closeout records as source context.
- Source Roadmap ID: PROJECT_ROADMAP_champcity_a_i
- Source Reconciliation ID: REPOSITORY_RECONCILIATION_champcity_a_i
- Source Planning Document ID: PROJECT_PLANNING_DOCUMENTS_champcity_a_i
- Notes: Roadmap confidence: high; MVP foundation decisions.; Phase appears ready for closeout review.
- Assumptions: phase-01/Work_Cards (10); phase-01/Implementer_Reports (20); phase-01/Validation_Reports (22); phase-01/Repair_Prompts (0); phase-01/Closeout_Reports (4); Closeout artifacts are present.; Use the latest closeout report when running future readiness reviews.
- Risks: Existing Closeout Report artifacts found. Latest filename: CLOSEOUT_REPORT_phase-01_phase_1_closeout.md.
- Unresolved questions: None.

#### Planned Work Cards
1. WC01: Scope MVP foundation and core Work Card loop
2. WC02: Implement MVP foundation and core Work Card loop foundation
3. WC03: Validate MVP foundation and core Work Card loop outcomes

### phase-02: Upstream Project Planning and Corrective Workflow Authority

- Status: closed
- Purpose: Preserve completed phase evidence and use closeout records as source context.
- Source Roadmap ID: PROJECT_ROADMAP_champcity_a_i
- Source Reconciliation ID: REPOSITORY_RECONCILIATION_champcity_a_i
- Source Planning Document ID: PROJECT_PLANNING_DOCUMENTS_champcity_a_i
- Notes: Roadmap confidence: high; Phase 01 core workflow artifacts.; Repair prompts must be resolved or explicitly deferred.; Phase appears ready for closeout review. Phase has repair prompts. Review repairs before closing.
- Assumptions: phase-02/Work_Cards (6); phase-02/Implementer_Reports (14); phase-02/Validation_Reports (36); phase-02/Repair_Prompts (3); phase-02/Closeout_Reports (2); Closeout artifacts are present.; Use the latest closeout report when running future readiness reviews.
- Risks: Repair Prompt artifacts exist and should be reviewed before closeout.; Existing Closeout Report artifacts found. Latest filename: CLOSEOUT_REPORT_phase-02_phase_2_closeout.md.; Repair prompts exist and should be resolved before closeout.
- Unresolved questions: None.

#### Planned Work Cards
1. WC01: Scope Upstream project planning workflow
2. WC02: Implement Upstream project planning workflow foundation
3. WC03: Validate Upstream project planning workflow outcomes

### phase-03: Workflow Router Screen Correction and Guided Current Action UI

- Status: approved_for_work_card_creation
- Purpose: Correct the application screens so durable project state routes the Operator to the current required action.
- Source Roadmap ID: PROJECT_ROADMAP_champcity_a_i
- Source Reconciliation ID: REPOSITORY_RECONCILIATION_champcity_a_i
- Source Planning Document ID: PROJECT_PLANNING_DOCUMENTS_champcity_a_i
- Notes: Phase 02 closeout activated Phase 03 manually.; Current Phase 03 authority is Phase_Interview.md, Phase_Planning.md, Work_Card_Plan.md, and Operator_Phase_Approval.md.; Older phase-03 Repository Reconciliation and Phase Planning Documents artifacts are superseded historical records.; Only WC01 is a current executable Work Card; later Phase 03 Work Cards remain just-in-time candidates.
- Assumptions: Locked workflow baseline; Workflow-router rebaseline; Operator Phase Approval on 2026-07-03; Approved Work_Card_Plan.md candidates.
- Risks: Superseded Phase 03 artifacts could be mistaken for active authority unless clearly marked.
- Unresolved questions: None for WC01 artifact reconciliation.

#### Planned Work Cards
1. WC01: Superseded Phase 03 Artifact and Roadmap State Reconciliation
2. WC02: Durable Current Required Action Model
3. WC03: Figma Workflow Router UI Shell Integration
4. WC04: Primary Current Action Panel
5. WC05: Subordinate Navigation and Manual Fallback Preservation
6. WC06: Left-to-Right Workflow Visibility
7. WC07: Artifact Review Workspace
8. WC08: Current Step Context Inspector
9. WC09: Phase Mapping and Operator Phase Approval Route Correction
10. WC10: Work Card as Implementer Handoff Route
11. WC11: Implementer Report to Architect Review Route
12. WC12: Operator Validation Record and REPAIR Sub-Card Route
13. WC13: Phase Closeout, Roadmap Update, and Next Phase Activation Route
14. WC14: MCP/Direct Write Status and Manual Artifact Fallbacks
15. WC15: Router UI Fixture Validation and Regression Scenarios

### phase-04: Workflow Execution Hardening

- Status: mapped
- Purpose: Harden the Work Card Loop, Implementer Report review, validation records, repair routing, and closeout status transitions.
- Source Roadmap ID: PROJECT_ROADMAP_champcity_a_i
- Source Reconciliation ID: REPOSITORY_RECONCILIATION_champcity_a_i
- Source Planning Document ID: PROJECT_PLANNING_DOCUMENTS_champcity_a_i
- Notes: Roadmap confidence: low; Prior phase must be repaired, validated, and closed or explicitly carried forward.; Roadmap / Phase Map should be reviewed at phase closeout before this phase starts.; Operator must approve the phase before formal Work Cards are created.
- Assumptions: Project Planning Documents; Repository Reconciliation; 2026-07-01 Architect Alignment Amendment; All approved Work Cards have Implementer Reports.; Validation Reports and repair decisions are reconciled.; Phase Closeout and Next Phase Readiness Review artifacts are saved.
- Risks: Later phase details are lower confidence until the previous phase has been closed.
- Unresolved questions: Confirm scope boundaries during Next Phase Readiness Review.

#### Planned Work Cards
1. WC01: Scope Workflow Execution Hardening
2. WC02: Implement Workflow Execution Hardening foundation
3. WC03: Validate Workflow Execution Hardening outcomes

### phase-05: MCP Integration, Repo Bridge, and Security Boundary

- Status: mapped
- Purpose: Make repo access visible, bounded, understandable, and safe for non-developer Operators.
- Source Roadmap ID: PROJECT_ROADMAP_champcity_a_i
- Source Reconciliation ID: REPOSITORY_RECONCILIATION_champcity_a_i
- Source Planning Document ID: PROJECT_PLANNING_DOCUMENTS_champcity_a_i
- Notes: Roadmap confidence: low; Prior phase must be repaired, validated, and closed or explicitly carried forward.; Roadmap / Phase Map should be reviewed at phase closeout before this phase starts.; Operator must approve the phase before formal Work Cards are created.
- Assumptions: Project Planning Documents; Repository Reconciliation; 2026-07-01 Architect Alignment Amendment; All approved Work Cards have Implementer Reports.; Validation Reports and repair decisions are reconciled.; Phase Closeout and Next Phase Readiness Review artifacts are saved.
- Risks: Later phase details are lower confidence until the previous phase has been closed.
- Unresolved questions: Confirm scope boundaries during Next Phase Readiness Review.

#### Planned Work Cards
1. WC01: Scope MCP Integration, Repo Bridge, and Security Boundary
2. WC02: Implement MCP Integration, Repo Bridge, and Security Boundary foundation
3. WC03: Validate MCP Integration, Repo Bridge, and Security Boundary outcomes

### phase-06: Guided Operator UX Polish and Figma Implementation

- Status: mapped
- Purpose: Apply broader visual polish and Figma design refinement after the workflow-router correction is implemented.
- Source Roadmap ID: PROJECT_ROADMAP_champcity_a_i
- Source Reconciliation ID: REPOSITORY_RECONCILIATION_champcity_a_i
- Source Planning Document ID: PROJECT_PLANNING_DOCUMENTS_champcity_a_i
- Notes: Roadmap confidence: low; Prior phase must be repaired, validated, and closed or explicitly carried forward.; Roadmap / Phase Map should be reviewed at phase closeout before this phase starts.; Operator must approve the phase before formal Work Cards are created.
- Assumptions: Project Planning Documents; Repository Reconciliation; 2026-07-01 Architect Alignment Amendment; All approved Work Cards have Implementer Reports.; Validation Reports and repair decisions are reconciled.; Phase Closeout and Next Phase Readiness Review artifacts are saved.
- Risks: Later phase details are lower confidence until the previous phase has been closed.
- Unresolved questions: Confirm scope boundaries during Next Phase Readiness Review.

#### Planned Work Cards
1. WC01: Scope Guided Operator UX Polish and Figma Implementation
2. WC02: Implement Guided Operator UX Polish and Figma Implementation foundation
3. WC03: Validate Guided Operator UX Polish and Figma Implementation outcomes

### phase-07: Evidence, Validation, and Release Packaging

- Status: mapped
- Purpose: Prepare auditability, validation summaries, onboarding, release notes, packaging, and Beta readiness.
- Source Roadmap ID: PROJECT_ROADMAP_champcity_a_i
- Source Reconciliation ID: REPOSITORY_RECONCILIATION_champcity_a_i
- Source Planning Document ID: PROJECT_PLANNING_DOCUMENTS_champcity_a_i
- Notes: Roadmap confidence: low; Prior phase must be repaired, validated, and closed or explicitly carried forward.; Roadmap / Phase Map should be reviewed at phase closeout before this phase starts.; Operator must approve the phase before formal Work Cards are created.
- Assumptions: Project Planning Documents; Repository Reconciliation; 2026-07-01 Architect Alignment Amendment; All approved Work Cards have Implementer Reports.; Validation Reports and repair decisions are reconciled.; Phase Closeout and Next Phase Readiness Review artifacts are saved.
- Risks: Later phase details are lower confidence until the previous phase has been closed.
- Unresolved questions: Confirm scope boundaries during Next Phase Readiness Review.

#### Planned Work Cards
1. WC01: Scope Evidence, Validation, and Release Packaging
2. WC02: Implement Evidence, Validation, and Release Packaging foundation
3. WC03: Validate Evidence, Validation, and Release Packaging outcomes

## Document Disposition
Document.Status=Pending
