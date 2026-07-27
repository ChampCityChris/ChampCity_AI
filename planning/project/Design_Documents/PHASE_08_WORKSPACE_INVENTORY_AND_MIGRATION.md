<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {},
  "sourceRevisions": [],
  "workflowData": {
    "designDocumentId": "PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION",
    "projectId": "champcity-ai",
    "title": "Phase 08 Workspace Inventory and Migration",
    "status": "confirmed_sequence_correction",
    "workspaces": [
      {
        "id": "project-intake-capture",
        "label": "Project Intake Capture",
        "level": "project",
        "stage": "intake",
        "order": 10,
        "owner": "WC02"
      },
      {
        "id": "architect-interview",
        "label": "Architect Interview",
        "level": "project",
        "stage": "intake",
        "order": 20,
        "owner": "WC03/WC04"
      },
      {
        "id": "project-planning-review",
        "label": "Project Plan and Roadmap Review",
        "level": "project",
        "stage": "planning",
        "order": 10,
        "replaces": "Project Planning",
        "owner": "WC05"
      },
      {
        "id": "project-phase-map",
        "label": "Phase Map",
        "level": "project",
        "stage": "building",
        "order": 10,
        "owner": "WC06"
      },
      {
        "id": "project-validation",
        "label": "Project Validation",
        "level": "project",
        "stage": "validation",
        "order": 10,
        "owner": "WC15"
      },
      {
        "id": "project-close",
        "label": "Project Close",
        "level": "project",
        "stage": "close",
        "order": 10,
        "owner": "WC15"
      },
      {
        "id": "phase-interview",
        "label": "Phase Interview",
        "level": "phase",
        "stage": "intake",
        "order": 10,
        "owner": "WC07"
      },
      {
        "id": "phase-planning-bundle",
        "label": "Phase Planning",
        "level": "phase",
        "stage": "planning",
        "order": 10,
        "replaces": "Phase Planning",
        "owner": "WC08"
      },
      {
        "id": "phase-work-card-selection",
        "label": "Work Card Selection",
        "level": "phase",
        "stage": "building",
        "order": 10,
        "owner": "WC09"
      },
      {
        "id": "phase-validation",
        "label": "Phase Validation",
        "level": "phase",
        "stage": "validation",
        "order": 10,
        "replaces": "Phase Closeout review responsibility",
        "owner": "WC14"
      },
      {
        "id": "phase-close",
        "label": "Phase Close",
        "level": "phase",
        "stage": "close",
        "order": 10,
        "replaces": "Phase Closeout navigation",
        "owner": "WC14"
      },
      {
        "id": "work-card-intake",
        "label": "Work Card Intake",
        "level": "workCard",
        "stage": "intake",
        "order": 10,
        "owner": "WC09"
      },
      {
        "id": "work-card-planning",
        "label": "Work Card Planning",
        "level": "workCard",
        "stage": "planning",
        "order": 10,
        "replaces": "Work Card",
        "owner": "WC10"
      },
      {
        "id": "work-card-building-review",
        "label": "Implementer Handoff and Report Review",
        "level": "workCard",
        "stage": "building",
        "order": 10,
        "owner": "WC11"
      },
      {
        "id": "work-card-repair",
        "label": "Work Card Repair",
        "level": "workCard",
        "stage": "building",
        "order": 20,
        "owner": "WC12"
      },
      {
        "id": "work-card-validation",
        "label": "Operator Validation",
        "level": "workCard",
        "stage": "validation",
        "order": 10,
        "replaces": "Operator Validation",
        "owner": "WC13"
      },
      {
        "id": "work-card-close",
        "label": "Work Card Close",
        "level": "workCard",
        "stage": "close",
        "order": 10,
        "owner": "WC13"
      }
    ]
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Phase 08 Workspace Inventory and Migration

Status: confirmed sequence correction
Project: ChampCity A/I
Confirmed: 2026-07-21

## Purpose

Define the complete production workspace inventory, stable identifiers, lifecycle locations, deterministic ordering, and retirement of the five provisional Phase 07 workspace entries.

Workspace IDs are stable open-ended identifiers. User-facing labels may later change without changing identity.

## Production Inventory

| Workspace ID | Label | Level | Stage | Order | Replaces provisional workspace | Owning card |
|---|---|---|---|---:|---|---|
| `project-intake-capture` | Project Intake Capture | Project | Intake | 10 | — | WC02 |
| `architect-interview` | Architect Interview | Project | Intake | 20 | — | WC03/WC04 |
| `project-planning-review` | Project Plan and Roadmap Review | Project | Planning | 10 | Project Planning | WC05 |
| `project-phase-map` | Phase Map | Project | Building | 10 | — | WC06 |
| `project-validation` | Project Validation | Project | Validation | 10 | — | WC15 |
| `project-close` | Project Close | Project | Close | 10 | — | WC15 |
| `phase-interview` | Phase Interview | Phase | Intake | 10 | — | WC07 |
| `phase-planning-bundle` | Phase Planning | Phase | Planning | 10 | Phase Planning | WC08 |
| `phase-work-card-selection` | Work Card Selection | Phase | Building | 10 | — | WC09 |
| `phase-validation` | Phase Validation | Phase | Validation | 10 | Phase Closeout document review responsibility | WC14 |
| `phase-close` | Phase Close | Phase | Close | 10 | Phase Closeout navigation entry | WC14 |
| `work-card-intake` | Work Card Intake | Work Card | Intake | 10 | — | WC09 |
| `work-card-planning` | Work Card Planning | Work Card | Planning | 10 | Work Card | WC10 |
| `work-card-building-review` | Implementer Handoff and Report Review | Work Card | Building | 10 | — | WC11 |
| `work-card-repair` | Work Card Repair | Work Card | Building | 20 | — | WC12 |
| `work-card-validation` | Operator Validation | Work Card | Validation | 10 | Operator Validation | WC13 |
| `work-card-close` | Work Card Close | Work Card | Close | 10 | — | WC13 |

## Migration Rules

The registry migration must be atomic from the user-visible perspective:

- `Project Planning` is replaced by `project-planning-review` in WC05.
- `Phase Planning` is replaced by `phase-planning-bundle` in WC08.
- `Work Card` is replaced by `work-card-planning` in WC10.
- `Operator Validation` is replaced by `work-card-validation` in WC13.
- `Phase Closeout` is retired in WC14. Phase closeout documents are reviewed in `phase-validation`; `phase-close` is the derived completion view.

No provisional and final entry may remain visible at the same time after the owning card is accepted.

## Multiple Workspaces at One Location

`work-card-building-review` and `work-card-repair` share Work Card / Building. Their deterministic order is 10 then 20.

## Intake Boundary

Phase / Building candidate selection and Work Card / Intake are separate workspaces:

```text
phase-work-card-selection
→ work-card-intake
→ work-card-planning
```

WC09 owns both registry entries but must not collapse their lifecycle identities.

## Close Views

`phase-close` and `project-close` do not provide another disposition action. They display the evidence-derived completion result and the return or terminal behavior authorized by the Approved closeout document.

## Registry Requirements

The production registry must reject duplicate IDs, provide deterministic order by lifecycle location, and support lookup by stable ID and by lifecycle location.

Navigation and document ownership must use workspace IDs rather than fixed label unions.
