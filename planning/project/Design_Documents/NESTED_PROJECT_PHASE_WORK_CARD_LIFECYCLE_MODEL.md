<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {},
  "sourceRevisions": [],
  "workflowData": {
    "documentType": "project_design_decision",
    "title": "Nested Project, Phase, and Work Card Lifecycle Model",
    "project": "ChampCity A/I",
    "confirmedBy": "Operator",
    "confirmedDate": "2026-07-21",
    "status": "Approved",
    "hierarchy": [
      "Project",
      "Phase",
      "Work Card"
    ],
    "lifecycleStages": [
      "Intake",
      "Planning",
      "Building",
      "Validation",
      "Close"
    ],
    "projectLifecycle": [
      "Project Intake",
      "Project Planning",
      "Project Building",
      "Project Validation",
      "Project Close"
    ],
    "phaseLifecycle": [
      "Phase Intake",
      "Phase Planning",
      "Phase Building",
      "Phase Validation",
      "Phase Close"
    ],
    "workCardLifecycle": [
      "Work Card Intake",
      "Work Card Planning",
      "Work Card Building",
      "Work Card Validation",
      "Work Card Close"
    ],
    "controlRules": [
      "Project Building enters the Phase lifecycle.",
      "Phase Building enters the Work Card lifecycle.",
      "Work Card Close returns to Phase Building.",
      "Phase Close returns to Project Building.",
      "Project Close ends the project."
    ],
    "currentLocationCoordinates": {
      "level": [
        "Project",
        "Phase",
        "Work Card"
      ],
      "stage": [
        "Intake",
        "Planning",
        "Building",
        "Validation",
        "Close"
      ]
    },
    "derivedProductViews": [
      "workflow progression",
      "process maps",
      "UI navigation",
      "workspace organization",
      "visible actions",
      "current-location context"
    ],
    "authorityBoundary": {
      "documentsAndDispositionRemainVisibleState": true,
      "hiddenWorkflowAuthorityProhibited": true,
      "captureFramePlanBuildProveIsCanonical": false
    }
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Nested Project, Phase, and Work Card Lifecycle Model

Status: confirmed by Operator
Project: ChampCity A/I
Confirmed: 2026-07-21

## Canonical Structure

ChampCity A/I uses one lifecycle repeated at three nested levels:

```text
Project
└── Phase
    └── Work Card
```

Each level follows the same five-stage lifecycle:

```text
Intake → Planning → Building → Validation → Close
```

## Project Lifecycle

```text
Project Intake
→ Project Planning
→ Project Building
→ Project Validation
→ Project Close
```

Project Building is performed through one or more Phase lifecycles.

Project Close is terminal. It ends the project lifecycle.

## Phase Lifecycle

```text
Phase Intake
→ Phase Planning
→ Phase Building
→ Phase Validation
→ Phase Close
```

Phase Building is performed through one or more Work Card lifecycles.

After Phase Close:

- if another phase remains, control returns to Project Building and begins the next Phase Intake;
- if no phase remains, control returns to the Project lifecycle and advances to Project Validation.

## Work Card Lifecycle

```text
Work Card Intake
→ Work Card Planning
→ Work Card Building
→ Work Card Validation
→ Work Card Close
```

After Work Card Close:

- if another Work Card remains, control returns to Phase Building and begins the next Work Card Intake;
- if no Work Card remains, control returns to the Phase lifecycle and advances to Phase Validation.

## Control Rules

```text
Project Building enters the Phase lifecycle.
Phase Building enters the Work Card lifecycle.
Work Card Close returns to Phase Building.
Phase Close returns to Project Building.
Project Close ends the project.
```

A child lifecycle completes and returns control to its parent. “Next Work Card” and “Next Phase” are therefore parent-level continuation decisions, not independent top-level workflow stages.

## Derived Product Structure

This nested lifecycle is the source model for:

- workflow progression;
- process maps;
- UI navigation;
- workspace organization;
- visible actions;
- current-location context.

The application location can be expressed through two coordinates:

```text
Current level: Project | Phase | Work Card
Current stage: Intake | Planning | Building | Validation | Close
```

Workflow, navigation, workspaces, and actions are projections of this model. They must not be designed as unrelated systems.

## Authority Boundary

The nested lifecycle is a descriptive product and process model. It does not authorize hidden workflow state, route tokens, approval artifacts, role gates, execution-run authority, queues, or a second governance system.

Durable documents and their explicit dispositions remain the visible source of workflow state.

`Capture → Frame → Plan → Build → Prove` is not the canonical application structure. It may be used only as loose explanatory language where helpful.
