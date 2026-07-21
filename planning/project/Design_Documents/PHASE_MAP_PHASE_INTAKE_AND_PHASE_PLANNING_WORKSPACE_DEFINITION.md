# Phase Map, Phase Intake, and Phase Planning Workspace Definition

Status: confirmed by Operator
Project: ChampCity A/I
Confirmed: 2026-07-21

## Purpose

This design defines the lifecycle split between Project Building, Phase Intake, and Phase Planning.

It translates the approved Phase Mapping process into the nested lifecycle model:

```text
Project / Building
└── Phase Map Workspace
    └── opens the first incomplete Phase lifecycle

Phase / Intake
└── Phase Interview Workspace

Phase / Planning
└── Phase Planning Bundle Workspace
```

The design supersedes conflicting normal-flow portions of `planning/project/Design_Documents/PHASE_MAP_AND_PHASE_PLANNING_FLOW.md`. That earlier document remains historical evidence only where it describes separate approval artifacts, compatibility-only Phase Intake, or a flat phase-planning flow.

## End-to-End Flow

```text
Approved Project_Profile
+ Approved Project_Roadmap
→ Phase Map Workspace
→ Approved Phase_Map
→ first incomplete mapped phase
→ Phase / Intake
→ Approved Phase_Interview
→ Phase / Planning
→ Approved Phase_Planning + Work_Card_Plan
→ Phase / Building
→ first Work Card lifecycle
```

No separate approval artifact or hidden workflow record is required at any point in this flow.

## Project / Building — Phase Map Workspace

### Purpose

Create and maintain the structured `Phase_Map` used by the application to identify the ordered project phases and the first incomplete phase.

The `Project_Roadmap` remains the strategic project description. The `Phase_Map` is the structured operational projection used for phase selection.

### Inputs

- Approved `Project_Profile`.
- Approved `Project_Roadmap`.
- Existing `Phase_Map`, when revising an established project.
- Approved phase closeout evidence, when completed phases already exist.
- A saved Phase Map Architect prompt or handoff document.

### Workspace Layout

```text
Embedded Architect browser | Repo-backed Phase_Map preview and disposition
```

The Architect receives the approved project planning documents through the validated MCP handoff and writes the `Phase_Map` pair into the repository.

The Operator reviews the saved Phase Map in the same workspace and may approve, reject, or request revision. Revision returns the map to the Architect for correction.

### Phase Selection

After `Phase_Map` is Approved, the application identifies the first mapped phase that is not complete.

A phase is complete only when its required Phase Close evidence is Approved. Until Phase Close is implemented, this rule is a declarative contract and must not be replaced with a hidden current-phase flag.

The approved Phase Map and derived first-incomplete selection permit entry into that phase's Phase / Intake location.

## Phase / Intake — Phase Interview Workspace

### Purpose

Allow the Architect to review the selected phase context, ask any required clarification questions, and create the durable `Phase_Interview` document.

### Required Context

- Approved `Project_Profile`.
- Approved `Project_Roadmap`.
- Approved `Phase_Map` and selected phase record.
- Approved prior phase closeout, when one exists.
- Relevant project risks, constraints, decisions, and repository evidence.
- A saved Phase Interview prompt or handoff document.

### Workspace Layout

```text
Embedded Architect browser | Repo-backed Phase_Interview preview and disposition
```

The Architect reviews context and conducts guided clarification with the Operator. The final interview document records the answers and the Architect's phase-specific understanding.

`Phase_Interview` always exists. When the Architect determines that no additional questions are required, it records that context was reviewed and no additional clarification was necessary.

The Operator reviews the document and may approve, reject, or request revision. Approval completes Phase Intake.

## Phase / Planning — Phase Planning Bundle Workspace

### Purpose

Create the approved phase plan and the mapped Work Card candidate plan for the selected phase.

### Inputs

- Approved project planning documents.
- Approved `Phase_Map` and selected phase record.
- Approved `Phase_Interview`.
- Relevant prior phase closeout and current repository evidence.
- A saved Phase Planning prompt or handoff document.

### Workspace Layout

```text
Embedded Architect browser
|
├── Phase_Planning preview
└── Work_Card_Plan preview
```

The Architect writes two separate repository-backed documents:

```text
Phase_Planning
Work_Card_Plan
```

They are independently readable but use one synchronized Phase Planning disposition.

A revision request may identify a problem in either document. The Architect may revise either or both documents to maintain consistency. Both documents return for review together.

Applying a disposition writes the same explicit status to both documents as one coordinated operation. Phase Planning completes only when both documents are Approved.

## Work Card Plan Boundary

`Work_Card_Plan` contains mapped Work Card candidates only. It may define candidate IDs, titles, summaries, order, dependencies, and intent.

Approval of the plan does not:

- create Formal Work Cards;
- authorize implementation;
- create Implementer handoffs;
- create execution packets;
- bypass the Work Card lifecycle.

After the Phase Planning bundle is Approved, control enters Phase / Building. The first mapped candidate then enters its own Work Card lifecycle through later-defined behavior.

## Approval and Authority Boundary

Do not create or rely on:

- `Operator_Phase_Approval.md` or an equivalent approval artifact;
- independent approval of only one Phase Planning document;
- hidden current-phase or stage-complete state;
- route tokens, role gates, queues, hashes, or execution-run authority;
- browser chat state as workflow evidence.

The durable documents and their explicit dispositions remain the visible evidence:

```text
Phase_Map
Phase_Interview
Phase_Planning
Work_Card_Plan
```

## Implementation Sequence

The bounded implementation order is:

```text
WC06 Phase Map Workspace
→ WC07 Phase Interview Workspace
→ WC08 Phase Planning Bundle Workspace
```

These designs do not yet define Phase Building Work Card materialization, Phase Validation, Phase Close, or Project Validation and Close.

## Document Disposition

Document.Status=Approved
