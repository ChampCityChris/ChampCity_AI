<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "nonReviewHandoff",
  "identity": {},
  "sourceRevisions": [],
  "workflowData": {
    "designDocumentId": "GENERATED_ARCHITECT_HANDOFF_CONTRACT",
    "projectId": "champcity-ai",
    "title": "Generated Architect Handoff Contract",
    "status": "confirmed_sequence_correction",
    "successfulGenerationDisposition": "Approved",
    "paths": {
      "projectArchitectInterviewPrompt": "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<project-slug>.*",
      "projectPlanningHandoff": "planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_<project-slug>.*",
      "phaseMapHandoff": "planning/project/Architect_Handoffs/PHASE_MAP_ARCHITECT_HANDOFF_<project-slug>.*",
      "phaseInterviewHandoff": "planning/phases/<phase-id>/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_<phase-id>.*",
      "phasePlanningHandoff": "planning/phases/<phase-id>/Architect_Handoffs/PHASE_PLANNING_ARCHITECT_HANDOFF_<phase-id>.*",
      "workCardIntakeHandoff": "planning/phases/<phase-id>/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_<work-card-id>.*",
      "repairHandoff": "planning/phases/<phase-id>/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_<repair-id>.*"
    },
    "requiredMetadata": [
      "handoffType",
      "projectId",
      "phaseId",
      "workCardId",
      "outputTarget",
      "sourceRevisions",
      "artifactRevision",
      "participationRole",
      "documentDisposition"
    ]
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Generated Architect Handoff Contract

Status: confirmed sequence correction
Project: ChampCity A/I
Confirmed: 2026-07-21

## Purpose

Define one canonical treatment for every generated Architect prompt or handoff artifact so generated instructions remain durable and viewable without becoming unresolved approval gates.

## Participation and Disposition

Every generated system handoff is:

```text
Document.Status=Approved after successful generation
```

A handoff is not independently reviewed or approved. It is viewable, regenerable, and included in downstream source context. Generation failure leaves no Approved handoff and must surface a local actionable error.

The evidence-derived resolver must display the non-review role and exclude these artifacts from gating-document selection.

## Canonical Paths

```text
Project Architect Interview Prompt
planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_<project-slug>.*

Project Planning Handoff
planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_<project-slug>.*

Phase Map Handoff
planning/project/Architect_Handoffs/PHASE_MAP_ARCHITECT_HANDOFF_<project-slug>.*

Phase Interview Handoff
planning/phases/<phase-id>/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_<phase-id>.*

Phase Planning Handoff
planning/phases/<phase-id>/Architect_Handoffs/PHASE_PLANNING_ARCHITECT_HANDOFF_<phase-id>.*

Work Card Intake Handoff
planning/phases/<phase-id>/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_<work-card-id>.*

Repair Architect Handoff
planning/phases/<phase-id>/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_<repair-id>.*
```

`.*` means synchronized `.md` and `.json` siblings.

## Required Metadata

Each handoff pair must contain:

- handoff type;
- project, phase, and Work Card identity as applicable;
- deterministic output target expected from the Architect;
- authoritative source paths and source revision references;
- generated artifact revision;
- `participationRole=nonReviewHandoff`;
- explicit Approved disposition after successful generation.

## Regeneration

When any source revision changes, regenerate the handoff and increment its artifact revision. The handoff remains Approved after successful regeneration because it is not an approval target.

Regeneration must not silently preserve stale source references.

## Output Target Requirement

Every handoff must name the exact canonical output pair the Architect is expected to write. This includes the Project Architect Interview, Phase Map, Phase Interview, Phase Planning bundle, Formal Work Card, and repair Work Card outputs.

## Resolver Boundary

Non-review handoffs may be displayed in their owning workspace but must never become the current review target solely because of disposition. Their successful Approved status is evidence that the instruction was generated, not evidence that downstream work is complete.

## Authority Boundary

Do not add a new disposition value, hidden consumed flag, handoff queue, route token, execution run, or automatic remote-message submission.
