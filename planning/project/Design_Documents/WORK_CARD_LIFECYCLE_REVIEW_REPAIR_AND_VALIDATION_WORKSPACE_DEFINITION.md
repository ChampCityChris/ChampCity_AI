# Work Card Lifecycle, Review, Repair, and Validation Workspace Definition

Status: confirmed by Operator
Project: ChampCity A/I
Lifecycle location: Phase / Building and Work Card / Intake through Close
Confirmed: 2026-07-21

## Purpose

This document defines how an approved `Work_Card_Plan` candidate enters the nested Work Card lifecycle, becomes the executable Formal Work Card, is implemented and reviewed, enters Operator validation, receives bounded repairs when necessary, and closes without creating another lifecycle level.

## Lifecycle Shape

```text
Phase / Building
└── first incomplete Work Card candidate
    └── Work Card
        ├── Intake
        ├── Planning
        ├── Building
        ├── Validation
        └── Close
```

A Work Card candidate is a planned entry inside the approved `Work_Card_Plan`. It is not executable until the Architect creates a complete Formal Work Card and the Operator approves that document.

## Phase Building Candidate Selection

The Phase / Building workspace reads the approved `Work_Card_Plan` in its defined order.

A candidate is complete only when its Formal Work Card has an Approved `Validation_Record`. The application selects the first candidate that:

- is not complete;
- has all declared predecessor candidates complete; and
- has not been explicitly deferred, superseded, or satisfied by an approved planning revision.

Candidate selection is derived from repository documents. It must not require a hidden active-card record, candidate queue, route token, or execution-run state.

## Work Card Intake

Work Card Intake assembles the selected candidate context for the Architect. Required context includes:

- the selected candidate ID, title, summary, sequence, and dependencies;
- approved `Project_Profile` and `Project_Roadmap`;
- approved `Phase_Map` and selected phase record;
- approved `Phase_Interview`;
- approved `Phase_Planning` and `Work_Card_Plan`;
- applicable earlier Work Card validation and repair evidence;
- relevant repository facts, constraints, risks, and decisions.

The workspace saves an Architect handoff prompt in the repository. It does not create a Formal Work Card during Intake.

## Work Card Planning

The Work Card / Planning workspace follows the established dual-pane pattern:

```text
Embedded Architect browser | Formal Work Card preview and disposition
```

The Architect converts the selected candidate into a complete Formal Work Card. The Work Card must contain the implementation contract, including:

1. identity and source-candidate reference;
2. purpose and expected outcome;
3. source context and dependencies;
4. implementation scope;
5. explicit out-of-scope boundary;
6. risks and constraints;
7. acceptance criteria;
8. validation expectations;
9. Implementer instructions;
10. required Implementer Report format.

The Operator may approve, reject, or request revision. Only an Approved Formal Work Card may enter Work Card Building.

The Approved Work Card is the Implementer instruction. No separate Implementer Execution Packet or primary Implementer prompt artifact is created.

## Work Card Building

The Implementer consumes the Approved Formal Work Card, performs the bounded implementation, and writes an `Implementer_Report` with `Document.Status=Pending`.

The embedded Architect reviews the repository-backed report and applicable changed-work evidence. The report itself is the disposition target:

```text
Implementer_Report = Approved
→ implementation is ready for Operator validation

Implementer_Report = RevisionRequested
→ repair is required before Operator validation
```

An Implementer Report review that occurs before Operator validation must not create a `Validation_Record`.

## Repair Subsystem

A repair artifact uses the parent Work Card identifier with a sequential suffix:

```text
WCxx-REPAIR01
WCxx-REPAIR02
WCxx-REPAIR03
```

A repair card is a durable child implementation artifact associated with the parent Work Card. It is not another lifecycle level and cannot recursively create a Work Card-inside-Work-Card hierarchy.

Every repair card must include:

- repair ID and parent Work Card ID;
- bounded repair purpose and scope;
- evidence source that caused the repair;
- explicit non-scope;
- acceptance criteria;
- required validation or re-review expectations;
- return target;
- required Implementer Report format.

The parent Work Card remains open while repairs execute. Each repair has its own Implementer Report.

### Pre-validation repair

```text
Implementer_Report = RevisionRequested
→ create repair card from report findings
→ Implementer executes repair
→ repair Implementer Report
→ Architect reviews again
→ return to parent Work Card Building review
```

No `Validation_Record` exists in this path because the Operator has not validated.

### Post-validation repair

```text
Validation_Record = RevisionRequested
→ create repair card from Operator evidence
→ Implementer executes repair
→ repair Implementer Report
→ Architect reviews repair
→ return to parent Work Card Validation
```

The failed Validation Record remains durable evidence. A later validation attempt creates or updates the authoritative validation record according to the repository artifact convention without erasing prior evidence.

The Operator may inspect a repair card and request correction, but a separate formal Operator approval artifact is not required. The repair card's explicit Approved disposition is the visible handoff condition.

## Work Card Validation

After the parent or latest repair Implementer Report is Approved, the Architect provides validation steps based on:

- the Approved Formal Work Card;
- its acceptance criteria and validation expectations;
- the Approved Implementer Report;
- relevant repair history.

The Operator performs the validation and only then creates the repository-backed `Validation_Record`.

The disposition meanings are:

```text
Pending           = validation record is incomplete
Approved          = validation passed
RevisionRequested = validation failed and requires repair
Rejected          = Operator declines or abandons acceptance; Work Card remains unresolved
```

The Validation Record must capture the steps performed, observed results, evidence references, issues found, and Operator notes.

## Work Card Close

An Approved `Validation_Record` is the explicit Work Card close evidence. No separate Work Card approval, completion, or closeout artifact is required.

A candidate is complete when:

- its Formal Work Card exists and remains Approved;
- its latest required Implementer Report review is Approved; and
- an Approved Validation Record exists for the parent Work Card after the latest repair.

After close:

```text
Work Card / Close
→ return to Phase / Building
→ select next incomplete candidate
```

When no eligible incomplete candidate remains, the Phase may proceed to Phase Validation and Phase Close. Those stages are outside this definition.

## Workspace Pattern

The Work Card workspaces should reuse the established workspace model:

```text
Work Card / Intake
└── candidate context and Architect handoff

Work Card / Planning
└── embedded Architect browser | Formal Work Card preview

Work Card / Building
└── Implementer handoff status | Implementer Report preview and Architect review

Work Card / Validation
└── Architect validation guidance | Operator validation record and evidence

Work Card / Close
└── explicit completion evidence and return to Phase Building
```

## Authority Boundaries

This design does not introduce:

- a separate Implementer Execution Packet;
- a separate Architect approval artifact for report review;
- a Validation Record before Operator validation occurs;
- recursive repair lifecycles;
- hidden active Work Card or current-action state;
- execution runs, route tokens, role gates, approval queues, or target hashes;
- automatic creation of every Formal Work Card from the Work Card Plan.

Durable repository documents and their explicit dispositions remain the visible workflow evidence.

## Document Disposition

Document.Status=Approved
