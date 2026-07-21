# Work Card Plan — Phase 08 Nested Lifecycle and Workspace Recovery

Status: approved complete implementation sequence; execution withheld
Plan revision: 7
Project: ChampCity A/I
Implementation execution: not authorized
Git mutation: not authorized

## Planning Rule

Phase 08 Work Cards were designed before release to the Implementer.

Creating and approving a Work Card records a bounded implementation design. It does not authorize execution.

The complete ordered sequence must be reviewed as a whole before the Operator releases WC01. After release, each card must be implemented, validated, reported, reviewed, and accepted before the next card begins.

## Complete Ordered Work Card Sequence

### WC01 — Nested Lifecycle and Extensible Workspace Registry Foundation

Purpose: establish the fixed Project, Phase, and Work Card lifecycle vocabulary and an immutable extensible workspace registry without adding lifecycle progression or hidden workflow authority.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC01_nested_lifecycle_extensible_workspace_registry_foundation.md`

### WC02 — Project Intake Capture and Architect Interview Prompt Generation

Depends on: WC01.

Purpose: implement the fixed Project Intake questionnaire, repository selection, durable Project Intake pair, and Architect Interview Prompt pair.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC02_project_intake_capture_and_architect_interview_prompt_generation.md`

### WC03 — Embedded Architect Browser and MCP Handoff Validation

Depends on: WC01 and WC02.

Risk: high. WC03 is the external-capability gate for every later embedded Architect workspace.

Purpose: prove the real embedded Architect subscription surface, repository-backed handoff, and MCP write-back. Mocked, simulated, provider-API, DOM-injected, or clipboard-only success is not acceptance evidence.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC03_embedded_architect_browser_and_mcp_handoff_validation.md`

### WC04 — Architect Interview Workspace

Depends on: WC01, WC02, and accepted WC03.

Purpose: implement the dual-pane Project / Intake Architect Interview workspace, repository-backed interview preview, revision loop, disposition, and derived Project Intake completion.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC04_architect_interview_workspace.md`

### WC05 — Project Planning Workspace

Depends on: WC01 through accepted WC04.

Purpose: implement the Project / Planning workspace, create `Project_Profile` and `Project_Roadmap`, review them independently, and apply one synchronized disposition to both.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC05_project_planning_workspace.md`

### WC06 — Project Building Phase Map Workspace

Depends on: accepted WC01 through WC05.

Purpose: implement the Project / Building Phase Map workspace, create and review the paired `Phase_Map`, and derive the first incomplete phase from mapped order and Approved Phase Close evidence.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC06_project_building_phase_map_workspace.md`

### WC07 — Phase Interview Workspace

Depends on: accepted WC06 and the WC03 integration proof.

Purpose: implement the Phase / Intake dual-pane workspace and create the durable `Phase_Interview` pair for Operator review and disposition. `Phase_Interview` always exists, including when no clarification questions are required.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC07_phase_interview_workspace.md`

### WC08 — Phase Planning Bundle Workspace

Depends on: accepted WC07 and the WC03 integration proof.

Purpose: implement the Phase / Planning workspace, create `Phase_Planning` and `Work_Card_Plan`, review them independently, and apply one synchronized disposition. `Work_Card_Plan` contains candidates only and creates no implementation authority.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC08_phase_planning_bundle_workspace.md`

### WC09 — Phase Building Work Card Candidate Selection and Intake Context

Depends on: accepted WC08.

Purpose: derive the first eligible incomplete candidate from the Approved `Work_Card_Plan` and explicit repository evidence, then create a candidate-scoped Work Card Intake Architect handoff.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC09_phase_building_work_card_candidate_selection_and_intake_context.md`

### WC10 — Formal Work Card Planning Workspace

Depends on: accepted WC09 and the WC03 integration proof.

Purpose: implement the Work Card / Planning dual-pane workspace, convert one candidate into a complete Formal Work Card, and support Operator review, revision, and disposition. The Approved Formal Work Card is the complete Implementer instruction.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC10_formal_work_card_planning_workspace.md`

### WC11 — Work Card Building Implementer Handoff and Report Review Workspace

Depends on: accepted WC10 and the WC03 integration proof.

Risk: high.

Purpose: present the exact Approved Formal Work Card as the Implementer handoff, detect the correct `Implementer_Report`, and record Architect review directly through the report disposition.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC11_work_card_building_implementer_handoff_and_report_review_workspace.md`

### WC12 — Work Card Repair Subsystem

Depends on: accepted WC11.

Risk: high.

Purpose: create bounded sibling repair cards from either a RevisionRequested Implementer Report or a RevisionRequested Validation Record. Repairs reference the original parent Work Card and do not create recursive lifecycle nesting.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC12_work_card_repair_subsystem.md`

### WC13 — Work Card Validation, Close, and Next-Candidate Return

Depends on: accepted WC09, WC11, and WC12.

Risk: high.

Purpose: implement Operator validation attempts, create repository-backed Validation Records only after Operator action, derive Work Card Close from an Approved Validation Record, and return to Phase Building for the next candidate.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC13_work_card_validation_close_and_next_candidate_return.md`

### WC14 — Phase Validation and Close Workspace

Depends on: accepted WC13.

Purpose: implement the Phase / Validation document-population review workspace, create and disposition `Phase_Closeout`, and derive Phase Close from an Approved `Close` decision.

Required result:

```text
Completed phase document population
→ Operator completeness review
→ Phase_Closeout
→ Approved Close
→ Phase / Close
→ Project / Building
```

No additional Work Card testing, second close approval, or next-phase activation artifact is permitted.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC14_phase_validation_and_close_workspace.md`

### WC15 — Project Validation and Close Workspace

Depends on: accepted WC14.

Purpose: implement the Project / Validation governed-corpus review workspace, create and disposition `Project_Closeout`, verify Phase Map completion coverage, and derive terminal Project Close from an Approved `Close` decision.

Required result:

```text
Governed project document population
→ Operator completeness review
→ Project_Closeout
→ Approved Close
→ terminal Project / Close
```

No second project approval, duplicate corpus snapshot, or hidden terminal-state artifact is permitted.

Detailed design:

`planning/phases/phase-08/Work_Cards/WC15_project_validation_and_close_workspace.md`

## Dependency and Stop Rules

The approved execution order is:

```text
WC01 → WC02 → WC03 → WC04 → WC05 → WC06 → WC07 → WC08
→ WC09 → WC10 → WC11 → WC12 → WC13 → WC14 → WC15
```

Rules:

1. Do not execute a card before every dependency is accepted.
2. Stop on a failed acceptance criterion, scope conflict, or unresolved external-capability blocker.
3. Do not implement later-card scope early.
4. A blocked WC03 blocks every later embedded Architect workspace.
5. WC12 must be accepted before failed validation can enter the repair path.
6. WC14 must be accepted before Project Validation is implemented.
7. Work Card design approval does not equal execution authorization.
8. Git mutation remains unauthorized unless the Operator separately authorizes it.

## Complete Design Coverage

The ordered set now covers the complete nested lifecycle:

```text
Project
├── Intake
├── Planning
├── Building
│   └── Phase
│       ├── Intake
│       ├── Planning
│       ├── Building
│       │   └── Work Card
│       │       ├── Intake
│       │       ├── Planning
│       │       ├── Building
│       │       ├── Validation
│       │       └── Close
│       ├── Validation
│       └── Close
├── Validation
└── Close
```

Authoritative design documents:

- `planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`
- `planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/ARCHITECT_INTERVIEW_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/PROJECT_PLANNING_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/PHASE_MAP_PHASE_INTAKE_AND_PHASE_PLANNING_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/PHASE_AND_PROJECT_VALIDATION_CLOSE_WORKSPACE_DEFINITION.md`

## Release Rule

No Phase 08 Work Card is currently authorized for Implementer execution.

Before release, the Operator and Architect must review WC01–WC15 as one sequence for gaps, duplication, and dependency conflicts.

When the Operator releases the sequence:

1. provide only the active card and its approved handoff to the Implementer;
2. complete implementation and the required Implementer Report;
3. perform Architect review and Operator manual validation;
4. resolve repairs before release of the next card;
5. preserve the approved order unless the Operator explicitly rebaselines it.

## Global Constraints

- Preserve clean-room Markdown/JSON disposition behavior.
- Keep durable repository documents as visible workflow evidence.
- Do not reintroduce approval artifacts, approval queues, hashes, route tokens, role gates, execution-run authority, or a second workflow-state system.
- Do not use workspace identity, browser chat state, timestamps, or filesystem order as workflow authority.
- Do not create separate Implementer Execution Packets or Architect Review approval artifacts.
- Do not create Validation Records before Operator validation.
- Do not create recursive repair lifecycles.
- Do not create separate Phase or Project closeout approval artifacts.
- Do not duplicate the reviewed corpus into a new authority snapshot.
- Do not persist hidden current-lifecycle or terminal state unless a future approved design proves a bounded need.
- Do not add provider APIs, DOM automation, credential extraction, or browser-security bypasses.
- Do not add dependencies without explicit Work Card authority.
- Do not use Playwright unless a later Work Card expressly authorizes it.
- Do not perform Git operations without explicit Operator authorization.

## Planning Completion Condition

The Phase 08 nested lifecycle, workspace structure, repair loop, validation behavior, and close behavior are now fully represented by WC01–WC15.

Planning is complete for sequence review. Implementation remains withheld until the Operator explicitly releases WC01 for sequential execution.

## Document Disposition

Document.Status=Approved
