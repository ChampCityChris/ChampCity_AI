<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {},
  "sourceRevisions": [],
  "workflowData": {
    "designDocumentId": "PHASE_AND_PROJECT_VALIDATION_CLOSE_WORKSPACE_DEFINITION",
    "projectId": "champcity-ai",
    "title": "Phase and Project Validation and Close Workspace Definition",
    "status": "confirmed_by_operator",
    "confirmedAt": "2026-07-21",
    "lifecycleLocations": [
      {
        "level": "phase",
        "stage": "validation"
      },
      {
        "level": "phase",
        "stage": "close"
      },
      {
        "level": "project",
        "stage": "validation"
      },
      {
        "level": "project",
        "stage": "close"
      }
    ],
    "sharedRule": {
      "validationPurpose": "Review the durable document population and record the Operator closure decision and rationale.",
      "closePurpose": "Execute an Approved closeout decision without requiring a second approval.",
      "closeEvidence": "Approved closeout document with closureDecision Close",
      "additionalTestingRequired": false,
      "separateApprovalArtifact": false
    },
    "phase": {
      "workspace": "Phase Validation Workspace",
      "layout": [
        "Phase document population browser",
        "Phase_Closeout preview and disposition"
      ],
      "entryRequirements": [
        "Approved Phase Planning bundle",
        "Approved Validation_Record for every required Formal Work Card",
        "Every remaining candidate explicitly resolved, deferred, superseded, already satisfied, or carried forward"
      ],
      "reviewPopulation": [
        "Phase_Interview",
        "Phase_Planning",
        "Work_Card_Plan",
        "Formal Work Cards",
        "Implementer Reports",
        "Architect report dispositions",
        "Repair Work Cards and reports",
        "Validation Records",
        "Candidate resolution decisions",
        "Applicable observations, risks, decisions, and evidence"
      ],
      "closeoutPath": "planning/phases/<phase-id>/Phase_Closeouts/PHASE_<phase-number>_CLOSEOUT_<slug>.*",
      "completionRule": "Phase Close completes when Phase_Closeout is Approved and closureDecision is Close.",
      "returnTarget": "Project / Building"
    },
    "project": {
      "workspace": "Project Validation Workspace",
      "layout": [
        "Project document population browser",
        "Project_Closeout preview and disposition"
      ],
      "entryRequirements": [
        "Approved Project Profile and Project Roadmap",
        "Approved Phase Map",
        "Approved Phase Closeout for every required mapped phase",
        "Remaining project work explicitly resolved, deferred, transferred, or documented as a known limitation"
      ],
      "reviewPopulationGroups": [
        "Project Intake and Architect Interview",
        "Project Profile and Project Roadmap",
        "Phase Map",
        "Phase planning and Work Card records",
        "Implementer Reports and repairs",
        "Validation Records",
        "Phase Closeouts",
        "Project-level observations, risks, decisions, and unresolved items"
      ],
      "closeoutPath": "planning/project/Project_Closeouts/PROJECT_CLOSEOUT_<project-slug>.*",
      "completionRule": "Project Close completes when Project_Closeout is Approved and closureDecision is Close.",
      "terminal": true
    },
    "supportedActions": [
      "navigate_population",
      "preview_closeout",
      "approve",
      "reject",
      "request_revision",
      "refresh_after_revision"
    ],
    "prohibitedArchitecture": [
      "Separate phase or project closeout approval artifacts",
      "Separate validation-complete or close-complete authority records",
      "Hidden lifecycle or terminal-state database",
      "Route tokens, role gates, approval queues, execution runs, hashes, or decision timelines",
      "Repeated Work Card testing during Phase or Project Validation",
      "Duplicate corpus snapshots as authority"
    ]
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Phase and Project Validation and Close Workspace Definition

Status: confirmed by Operator
Project: ChampCity A/I
Lifecycle locations:

```text
Phase / Validation
Phase / Close
Project / Validation
Project / Close
```

Confirmed: 2026-07-21

## Purpose

Phase and Project validation are completeness-review stages. They do not require the Operator to repeat Work Card acceptance testing.

The Operator reviews the relevant durable document population, records a closure decision and rationale in a closeout document, and dispositions that closeout document.

An Approved closeout document is both:

1. the recorded Operator completeness assessment produced during Validation; and
2. the explicit authorization that permits the corresponding Close stage to complete.

The Close stage does not require a second approval or separate approval artifact.

## Shared Lifecycle Rule

```text
Validation
→ review durable document population
→ create or revise closeout document
→ Operator disposition
→ Approved closeout document
→ Close completes
```

Validation is the review and decision stage. Close is the execution of the Approved closeout decision.

## Phase Validation and Close

### Entry Condition

Phase Validation may begin only when:

- the Phase Planning bundle is Approved;
- every required Formal Work Card in the Approved `Work_Card_Plan` has an Approved `Validation_Record`; and
- no required candidate remains unresolved unless explicitly documented as deferred, superseded, already satisfied, or carried forward.

### Workspace Layout

```text
Phase Validation Workspace
├── Phase document population browser
└── Phase_Closeout preview and disposition
```

The workspace is a document viewer and disposition screen. It does not require an embedded Architect browser as a primary surface, although an Architect may assist with drafting or revising the closeout through the existing repository integration.

### Required Phase Review Population

The phase population must collect and organize the pertinent phase records, including:

- `Phase_Interview`;
- `Phase_Planning`;
- `Work_Card_Plan`;
- every Formal Work Card;
- every Implementer Report;
- every Architect report disposition;
- every repair Work Card and repair Implementer Report;
- every Validation Record;
- deferred, superseded, already-satisfied, carried-forward, or unresolved candidate decisions;
- applicable observations, risks, decisions, and evidence;
- prior phase closeout context when relevant.

The population is a review index over existing durable documents. It is not a new authority artifact and must not duplicate the full corpus into another file.

### Phase Closeout Document

The canonical phase closeout pair is stored under:

```text
planning/phases/<phase-id>/Phase_Closeouts/PHASE_<phase-number>_CLOSEOUT_<slug>.md
planning/phases/<phase-id>/Phase_Closeouts/PHASE_<phase-number>_CLOSEOUT_<slug>.json
```

The closeout must record at least:

- phase identity and intended outcome;
- closure decision: Close or Do Not Close;
- closure rationale;
- completed Work Cards and validation evidence summary;
- known limitations;
- unresolved, deferred, superseded, or carried-forward matters;
- observation, risk, and decision reconciliation;
- impact on the Project Roadmap or Phase Map when applicable;
- Operator approval statement;
- explicit document disposition.

### Completion Rule

Phase Validation completes when the Operator has reviewed the phase population and dispositions the `Phase_Closeout`.

Phase Close completes only when:

```text
Phase_Closeout.Document.Status = Approved
AND
Phase_Closeout.closureDecision = Close
```

After Phase Close completes, control returns to Project / Building. The approved `Phase_Map` and Approved Phase Closeouts determine the next incomplete phase. No separate next-phase activation artifact is required.

## Project Validation and Close

### Entry Condition

Project Validation may begin only when:

- the Project Profile and Project Roadmap are Approved;
- the Phase Map is Approved;
- every required mapped phase has an Approved Phase Closeout; and
- remaining project work is explicitly resolved, deferred, transferred, or documented as a known limitation.

### Workspace Layout

```text
Project Validation Workspace
├── Project document population browser
└── Project_Closeout preview and disposition
```

The workspace must organize the complete governed project corpus for practical review rather than show one undifferentiated file list.

### Required Project Review Population

The project population should be grouped as:

```text
Project records
├── Project Intake and Architect Interview
├── Project Profile and Project Roadmap
├── Phase Map
├── Phase records
│   ├── Phase Interview and Planning
│   ├── Work Card Plans and Formal Work Cards
│   ├── Implementer Reports and repairs
│   ├── Validation Records
│   └── Phase Closeouts
└── Project-level observations, risks, decisions, and unresolved items
```

The population browser references existing durable documents. It does not create a duplicate corpus or hidden completion database.

### Project Closeout Document

The canonical project closeout pair is:

```text
planning/project/Project_Closeouts/PROJECT_CLOSEOUT_<project-slug>.md
planning/project/Project_Closeouts/PROJECT_CLOSEOUT_<project-slug>.json
```

The closeout must record at least:

- project identity and intended outcome;
- closure decision: Close or Do Not Close;
- closure rationale;
- phase completion summary;
- known limitations;
- unresolved, deferred, or transferred work;
- observation, risk, and decision reconciliation;
- release, completion, or terminal status when applicable;
- Operator approval statement;
- explicit document disposition.

### Completion Rule

Project Validation completes when the Operator has reviewed the governed project population and dispositions the `Project_Closeout`.

Project Close completes only when:

```text
Project_Closeout.Document.Status = Approved
AND
Project_Closeout.closureDecision = Close
```

Project Close is terminal. No next-project routing, hidden terminal-state record, or separate project approval artifact is required.

## Disposition and Revision Behavior

Both closeout workspaces must support:

- document population navigation;
- closeout document preview;
- `Approved`, `Rejected`, and `RevisionRequested` dispositions;
- durable revision notes;
- refreshed preview after revision;
- local containment of unreadable or invalid documents.

A revision request returns the closeout document for correction. The underlying reviewed population remains available so the Operator can reassess the revised closeout.

## Authority Boundary

Do not introduce:

- `Operator_Phase_Closeout_Approval` artifacts;
- `Operator_Project_Closeout_Approval` artifacts;
- separate validation-complete or close-complete authority records;
- hidden current-phase, current-project, or terminal-state databases;
- route tokens, role gates, approval queues, execution runs, hashes, or decision timelines;
- repeated Work Card acceptance testing at Phase or Project Validation;
- duplicate corpus snapshots as workflow authority.

The Approved closeout document and the existing durable corpus remain the visible evidence.
