# Phase 08 — Nested Lifecycle and Workspace Recovery

Status: planning complete; execution withheld
Planning revision: 7
Project: ChampCity A/I
Activation: approved by Operator through ChatGPT
Implementation execution: not authorized
Git mutation: not authorized

## Phase Purpose

Phase 08 restores the product structure lost during the clean-room rebuild without restoring the rejected governance architecture.

The confirmed nested lifecycle is:

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

Each lifecycle level uses:

```text
Intake → Planning → Building → Validation → Close
```

Workflow behavior, process maps, navigation, workspaces, and actions are projections of this model rather than separate authority systems.

## Confirmed Foundation

The fixed lifecycle vocabulary is:

```text
Levels: Project | Phase | Work Card
Stages: Intake | Planning | Building | Validation | Close
```

A lifecycle location is one level plus one stage. A location may contain zero, one, or multiple ordered registry-backed workspaces.

Durable repository documents and their explicit dispositions remain the visible workflow evidence. Workspaces organize review and action but do not become a second workflow-state system.

## Confirmed Project Lifecycle

### Project / Intake

```text
Project Intake Capture
→ Architect Interview
```

Project Intake Capture uses the approved fixed questionnaire and creates the durable Project Intake and Architect Interview Prompt pairs.

A Yes answer to the existing-source-or-planning question adds repository-review requirements to the Architect Interview prompt. Reconciliation is not a separate lifecycle stage or default standalone artifact.

The Architect Interview workspace uses:

```text
Embedded Architect chat | Repo-backed interview preview and disposition
```

An Approved interview completes Project Intake.

### Project / Planning

The embedded Architect creates:

```text
Project_Profile
Project_Roadmap
```

The two documents are reviewed independently but use one synchronized Project Planning disposition. Both must be Approved.

### Project / Building

The embedded Architect creates and revises the paired `Phase_Map`.

The Approved Phase Map provides the structured phase sequence. The first incomplete phase is derived from mapped order and Approved Phase Close evidence rather than a hidden active-phase field.

### Project / Validation and Close

The Project Validation workspace provides:

```text
Project document population browser | Project_Closeout preview and disposition
```

The Operator reviews the governed project population, records the closure decision and rationale, and dispositions `Project_Closeout`.

Project Close completes only when:

```text
Project_Closeout.Document.Status = Approved
AND
Project_Closeout.closureDecision = Close
```

Project Close is terminal. No second approval or hidden terminal-state artifact is created.

## Confirmed Phase Lifecycle

### Phase / Intake

The selected phase enters the embedded Phase Interview workspace. `Phase_Interview` always exists, including when the Architect requires no additional clarification.

### Phase / Planning

The Architect creates:

```text
Phase_Planning
Work_Card_Plan
```

They are reviewed independently but use one synchronized disposition. `Work_Card_Plan` contains candidate Work Cards only and creates no implementation authority.

### Phase / Building

The first eligible incomplete Work Card candidate is derived from the Approved Work Card Plan and explicit repository evidence.

Each candidate enters the complete Work Card lifecycle. After a Work Card closes, control returns to Phase Building for the next eligible candidate.

### Phase / Validation and Close

The Phase Validation workspace provides:

```text
Phase document population browser | Phase_Closeout preview and disposition
```

The Operator reviews the pertinent phase record, records the closure decision and rationale, and dispositions `Phase_Closeout`.

Phase Close completes only when:

```text
Phase_Closeout.Document.Status = Approved
AND
Phase_Closeout.closureDecision = Close
```

After Phase Close, control returns to Project Building. The Approved Phase Map and Approved Phase Closeouts determine the next incomplete phase. No separate next-phase activation artifact is created.

## Confirmed Work Card Lifecycle

```text
Work Card / Intake
→ Work Card / Planning
→ Work Card / Building
→ Work Card / Validation
→ Work Card / Close
```

### Intake and Planning

A candidate-scoped Architect handoff is created. The embedded Architect converts the candidate into a complete Formal Work Card.

The Approved Formal Work Card is the complete Implementer instruction. No separate Implementer Execution Packet is created.

### Building and Architect Review

The Implementer writes an `Implementer_Report` with `Document.Status=Pending`.

The Architect reviews and dispositions the report directly:

```text
Approved          → ready for Operator validation
RevisionRequested → repair required before validation
Rejected          → parent Work Card remains unresolved
```

### Repair Subsystem

Repair artifacts use sibling IDs:

```text
WCxx-REPAIR01
WCxx-REPAIR02
WCxx-REPAIR03
```

Repairs reference the original parent Work Card, have bounded scope and their own Implementer Reports, and do not create recursive lifecycle nesting.

Pre-validation repairs return to parent Building review. Post-validation repairs return to parent Validation.

### Validation and Close

A `Validation_Record` is created only after the Operator performs validation.

An Approved Validation Record after the latest applicable repair is the explicit Work Card Close evidence. No separate Work Card closeout artifact or hidden completed flag is created.

## Approved Complete Work Card Sequence

The complete Phase 08 implementation design is:

```text
WC01 → WC02 → WC03 → WC04 → WC05 → WC06 → WC07 → WC08
→ WC09 → WC10 → WC11 → WC12 → WC13 → WC14 → WC15
```

### Foundation and Project Intake/Planning

- WC01 — Nested Lifecycle and Extensible Workspace Registry Foundation
- WC02 — Project Intake Capture and Architect Interview Prompt Generation
- WC03 — Embedded Architect Browser and MCP Handoff Validation
- WC04 — Architect Interview Workspace
- WC05 — Project Planning Workspace

### Project Building and Phase Intake/Planning

- WC06 — Project Building Phase Map Workspace
- WC07 — Phase Interview Workspace
- WC08 — Phase Planning Bundle Workspace

### Phase Building and Work Card Lifecycle

- WC09 — Phase Building Work Card Candidate Selection and Intake Context
- WC10 — Formal Work Card Planning Workspace
- WC11 — Work Card Building Implementer Handoff and Report Review Workspace
- WC12 — Work Card Repair Subsystem
- WC13 — Work Card Validation, Close, and Next-Candidate Return

### Phase and Project Validation/Close

- WC14 — Phase Validation and Close Workspace
- WC15 — Project Validation and Close Workspace

The authoritative order, dependencies, stop rules, and detailed card paths are recorded in:

`planning/phases/phase-08/Work_Card_Plan.md`

## Authoritative Design Documents

- `planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`
- `planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/ARCHITECT_INTERVIEW_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/PROJECT_PLANNING_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/PHASE_MAP_PHASE_INTAKE_AND_PHASE_PLANNING_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/PHASE_AND_PROJECT_VALIDATION_CLOSE_WORKSPACE_DEFINITION.md`

## Prohibited Architecture

Phase 08 must not reintroduce:

- approval artifacts or approval queues;
- hidden current-action, active-phase, active-Work-Card, or terminal-state authority;
- route tokens or role gates;
- execution runs as workflow authority;
- target hashes or decision timelines;
- a second workflow-state system;
- one-workspace-per-stage assumptions;
- a fixed exhaustive workspace-name union;
- separate Implementer Execution Packet authority;
- separate Architect Review approval artifacts;
- Validation Records before Operator validation;
- recursive repair lifecycles;
- separate Phase or Project closeout approval artifacts;
- duplicate corpus snapshots as authority;
- provider API substitution for the approved subscription/MCP workflow;
- browser credential extraction or DOM automation.

## Implementation Boundary

Phase 08 planning is complete, but no Work Card is currently authorized for Implementer execution.

Implementation begins only after:

1. the Operator and Architect review WC01–WC15 as one ordered sequence;
2. any identified gaps or conflicts are corrected;
3. the Operator explicitly releases WC01 for sequential implementation.

Each later card remains withheld until its dependencies are accepted and the Operator releases it in sequence.

Git mutation remains separately unauthorized.

## Document Disposition

Document.Status=Approved
