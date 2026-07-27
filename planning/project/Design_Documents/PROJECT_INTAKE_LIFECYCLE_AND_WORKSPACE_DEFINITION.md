<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {},
  "sourceRevisions": [],
  "workflowData": {
    "documentType": "project_intake_lifecycle_and_workspace_definition",
    "project": "ChampCity A/I",
    "status": "confirmed_by_operator",
    "lifecycleLocation": {
      "level": "project",
      "stage": "intake"
    },
    "workspaces": [
      {
        "id": "project-intake-capture",
        "label": "Project Intake Capture",
        "order": 1
      },
      {
        "id": "architect-interview",
        "label": "Architect Interview",
        "order": 2
      }
    ],
    "fixedQuestions": [
      {
        "id": "project-name",
        "label": "Project Name",
        "responseType": "short_text",
        "required": true
      },
      {
        "id": "project-purpose",
        "label": "Project Purpose",
        "responseType": "long_text",
        "required": true
      },
      {
        "id": "desired-outcome",
        "label": "Desired Outcome",
        "responseType": "long_text",
        "required": true
      },
      {
        "id": "project-type",
        "label": "Project Type",
        "responseType": "dropdown",
        "required": true,
        "options": [
          "Desktop application",
          "Web application",
          "Mobile application",
          "CLI or tool",
          "Library or service",
          "Documentation or process",
          "Other"
        ]
      },
      {
        "id": "project-repository",
        "label": "Project Repository",
        "responseType": "repository_selector",
        "required": true
      },
      {
        "id": "existing-source-or-planning",
        "label": "Does this repository already contain source code or project-planning documents?",
        "responseType": "boolean",
        "required": true
      },
      {
        "id": "constraints",
        "label": "Known Constraints or Non-Negotiables",
        "responseType": "long_text",
        "required": false
      }
    ],
    "conditionalQuestions": [
      {
        "id": "reconciliation-note",
        "label": "What should the Architect know before reviewing the existing repository?",
        "responseType": "long_text",
        "required": false,
        "condition": {
          "questionId": "existing-source-or-planning",
          "equals": true
        }
      }
    ],
    "reconciliation": {
      "isSeparateLifecycleStage": false,
      "standaloneArtifactRequired": false,
      "defaultBehavior": "Add required repository review instructions to the Architect Interview Prompt and incorporate findings into standard Project Planning outputs.",
      "standardOutputs": [
        "Project_Profile",
        "Project_Roadmap"
      ]
    },
    "completionCriteria": [
      "Fixed intake questions captured",
      "Architect Interview Prompt created",
      "Architect Interview completed",
      "Interview reviewed by Operator",
      "Interview disposition Approved"
    ],
    "nextLifecycleLocation": {
      "level": "project",
      "stage": "planning",
      "workspace": "Project Plan and Roadmap Review"
    }
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Project Intake Lifecycle and Workspace Definition

Status: confirmed by Operator
Project: ChampCity A/I
Lifecycle location: Project / Intake

## Purpose

Project Intake captures the project the Operator is attempting to build. It gathers a small fixed set of answers sufficient for the Architect to design and conduct the Project Architect Interview.

Project Intake does not attempt to perform full project planning. Detailed architecture, milestones, risks, implementation sequencing, and Work Cards belong later.

## Workspace Structure

```text
Project / Intake
├── Project Intake Capture
└── Architect Interview
```

### Project Intake Capture

The Operator completes a fixed questionnaire. Saving the intake creates:

- the durable Project Intake document;
- the Architect Interview Prompt;
- a required repository-review instruction when the reconciliation question is answered Yes.

### Architect Interview

The Architect Interview is intended to be conducted through the embedded browser. When the interview is complete, the workspace presents the captured interview document for Operator review and disposition.

An Approved Architect Interview completes Project Intake and advances the project to Project / Planning.

## Fixed Intake Questions

| Question | Response type | Required |
|---|---|---:|
| Project Name | Short text | Yes |
| Project Purpose — What are you trying to create, change, or accomplish? | Long text | Yes |
| Desired Outcome — What should the finished project allow the user or Operator to do? | Long text | Yes |
| Project Type | Dropdown | Yes |
| Project Repository | Repository or folder selector | Yes |
| Does this repository already contain source code or project-planning documents? | Yes/No | Yes |
| Known Constraints or Non-Negotiables | Long text | No |

Recommended Project Type values:

```text
Desktop application
Web application
Mobile application
CLI or tool
Library or service
Documentation or process
Other
```

## Conditional Reconciliation Input

When the existing-code-or-planning question is answered Yes, show one additional optional field:

> What should the Architect know before reviewing the existing repository?

This note may identify known failures, abandoned attempts, important branches, protected areas, or other context. It does not replace the Architect's repository review.

## Reconciliation Behavior

Reconciliation is an optional subsystem inside Project Intake, not a separate lifecycle stage or required standalone artifact.

```text
Project Intake
→ Architect Interview Prompt includes repository review
→ Architect inspects the existing repository
→ Repository findings inform the interview and Project Planning outputs
```

The normal Project Planning outputs remain standardized for both greenfield and existing projects:

- `Project_Profile`
- `Project_Roadmap`

For an existing project:

- `Project_Profile` records the verified current project state;
- `Project_Roadmap` begins from that verified baseline rather than treating the project as greenfield;
- relevant findings use repository-relative references where practical.

A separate reconciliation artifact is exceptional, not part of the standard path. It may be used only when the repository review is too extensive or uncertain to summarize reliably in the normal planning outputs.

## Project Intake Completion

Project Intake is complete when:

1. the fixed intake questions have been captured;
2. the Architect Interview Prompt has been created;
3. the Architect Interview has been completed;
4. the interview document has been reviewed by the Operator;
5. the interview disposition is Approved.

Control then advances to:

```text
Project / Planning
└── Project Plan and Roadmap Review
```
