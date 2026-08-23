<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "generated-handoff",
  "artifactRevision": 1,
  "participationRole": "nonReviewHandoff",
  "identity": {
    "handoffKind": "phase-map",
    "projectSlug": "champcity_a_i"
  },
  "sourceRevisions": [
    {
      "path": "planning/project/PROJECT_PROFILE.md",
      "revision": 1
    },
    {
      "path": "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "handoffKind": "phase-map",
    "contractId": "phase-map-output-submission-v1",
    "phaseMapTarget": "planning/project/Phase_Map/PHASE_MAP_champcity_a_i.md",
    "requiredTitle": "Phase Map",
    "requiredDomainBlocks": [
      "champcity-phase-map"
    ],
    "repositoryAuthority": {
      "projectRepository": "C:\\Users\\chapm\\Projects\\ChampCity_AI"
    }
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Phase Map Architect Handoff

Contract ID: phase-map-output-submission-v1
Approved Project Profile Markdown: planning/project/PROJECT_PROFILE.md
Approved Project Profile Revision: 1
Approved Project Roadmap Markdown: planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md
Approved Project Roadmap Revision: 1
Exact Phase Map output target: planning/project/Phase_Map/PHASE_MAP_champcity_a_i.md
Required Phase Map title: Phase Map
Project Identity: champcity_a_i

The Architect must derive the substantive phase list from the approved full Project Roadmap and Project Profile.
The application does not pre-author any phase entries.
The Phase Map Markdown body must include exactly one champcity-phase-map fenced JSON block.
The champcity-phase-map JSON block must be an object with one phases array.
Each phase entry must contain phaseId, title, order, purpose, dependsOn, and sourceReferences.
The phases array must be non-empty; phaseId values and order values must be unique.
Every dependency must resolve to another phase in the same map; self-dependencies and dependency cycles are prohibited.
sourceReferences must contain normalized repository-relative paths.
Do not persist completion state in the Phase Map.
Keep the output limited to project-level phase sequencing and repository evidence references.
Browser chat is not durable authority. The Architect must create one temporary body-only Markdown draft through the generic artifact toolbox Markdown writer.
