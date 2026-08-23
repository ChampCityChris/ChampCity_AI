<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "project-intake",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "Project.ArtifactKey": "champcity_a_i"
  },
  "sourceRevisions": [],
  "workflowData": {
    "projectName": "ChampCity A/I",
    "projectPurpose": "Continue development of the existing ChampCity A/I desktop application from its current implemented state. ChampCity A/I is a local-first AI software-development orchestration application that owns the Project → Phase → Work Card → Repair → Validation lifecycle, canonical planning artifacts, development-environment preparation, model-worker execution, and its Agent Harness/MCP runtime.\n\nThe immediate purpose of this development cycle is to reconcile the existing application from its current source-code baseline, move future ChampCity A/I development back inside the application itself, and continue building the provider-neutral Agent Harness needed for Browser ChatGPT to perform implementation work directly through ChampCity-owned tools and execution services.",
    "desiredOutcome": "The Operator should be able to manage a software-development project from intake through planning, implementation, review, repair, validation, and close entirely through ChampCity A/I.\n\nChampCity A/I should provide replaceable AI models with application-owned project context, repository and filesystem tools, development-environment capabilities, local execution, evidence capture, worker delegation, and workflow authority. Browser ChatGPT should become the primary high-reasoning development orchestrator, with Codex available as a specialist/fallback worker and future local models available for bounded mechanical work.\n\nThe application should also support remote Browser ChatGPT access to authorized development resources without requiring the same project to be selected in the desktop UI.",
    "projectType": "Desktop application",
    "projectRepository": "C:\\Users\\chapm\\Projects\\ChampCity_AI",
    "hasExistingSourceOrPlanning": true,
    "knownConstraints": "This is an existing application, not a greenfield rebuild.\n\nCurrent source code and tests are the primary evidence of implemented behavior. planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md is the condensed current-state description derived primarily from the source. planning/project/Design_Documents/FUTURE_APPLICATION_DESIGN.md defines intended future architecture and direction.\n\nDo not attempt to reconstruct a complete historical development sequence or infer missing Phase 01–08 artifacts. Earlier development history is intentionally incomplete and has been condensed because prior rebuilds and cleanup removed or superseded substantial planning material.\n\nReconciliation should determine what exists now and what remains to be built, not recreate how the application arrived at its current state.\n\nPreserve currently working application behavior unless current planning explicitly authorizes changing it. Avoid parallel authority systems, duplicated workflow mechanisms, unnecessary governance layers, and speculative redesign.\n\nChampCity A/I must remain the system of record for workflow, artifacts, resource authority, execution evidence, and validation. AI models are replaceable reasoning and implementation workers, not workflow authority.",
    "repositoryReviewContext": "This is an existing, substantially implemented application. Review the repository as a current-state software system, not as a historical planning reconstruction.\n\nTreat the source code and tests as the primary evidence of implemented behavior. Use planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md as the condensed current-state architecture and feature inventory; it was produced primarily from direct inspection of the current src tree. Use planning/project/Design_Documents/FUTURE_APPLICATION_DESIGN.md only as forward-looking architecture and intended development direction, not as evidence that those capabilities already exist.\n\nHistorical planning is intentionally incomplete. Earlier development artifacts were lost, superseded, or removed during rebuilds and cleanup. Do not attempt to reconstruct missing historical phases, Work Cards, or development chronology, and do not treat missing Phase 01–08 artifacts as a defect. Reconciliation should answer two questions: what does the application actually implement today, and what remains to be built from the current baseline?\n\nImportant current-state context: ChampCity A/I already implements the Project → Phase → Work Card → Repair → Validation lifecycle, canonical Markdown artifact handling, embedded ChatGPT Architect workflow, Codex App Server implementation support, Windows development-environment provisioning, and an A/I-owned Agent Harness/MCP runtime. Browser ChatGPT can currently access the application repository through that MCP runtime.\n\nThe future-design document intentionally changes some current architecture. In particular, the current Agent Harness restricts generic MCP repository access to the project selected in the desktop application. The intended future architecture decouples desktop workflow selection from MCP resource authority and adds multi-workspace access, bounded filesystem roots, generic local execution, and later role-based agent authority.\n\nPrefer current production code over stale README text or historical planning when they conflict. Preserve working current behavior unless the new planning process explicitly chooses to change it.",
    "repositoryAuthority": {
      "projectRepository": "C:\\Users\\chapm\\Projects\\ChampCity_AI"
    }
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": "2026-08-23T03:32:43.500Z"
  }
}
CHAMPCITY-METADATA -->

# Project Intake: ChampCity A/I

Project Purpose: Continue development of the existing ChampCity A/I desktop application from its current implemented state. ChampCity A/I is a local-first AI software-development orchestration application that owns the Project → Phase → Work Card → Repair → Validation lifecycle, canonical planning artifacts, development-environment preparation, model-worker execution, and its Agent Harness/MCP runtime.

The immediate purpose of this development cycle is to reconcile the existing application from its current source-code baseline, move future ChampCity A/I development back inside the application itself, and continue building the provider-neutral Agent Harness needed for Browser ChatGPT to perform implementation work directly through ChampCity-owned tools and execution services.
Desired Outcome: The Operator should be able to manage a software-development project from intake through planning, implementation, review, repair, validation, and close entirely through ChampCity A/I.

ChampCity A/I should provide replaceable AI models with application-owned project context, repository and filesystem tools, development-environment capabilities, local execution, evidence capture, worker delegation, and workflow authority. Browser ChatGPT should become the primary high-reasoning development orchestrator, with Codex available as a specialist/fallback worker and future local models available for bounded mechanical work.

The application should also support remote Browser ChatGPT access to authorized development resources without requiring the same project to be selected in the desktop UI.
Project Type: Desktop application
Project Repository: C:\Users\chapm\Projects\ChampCity_AI
Existing Source Or Planning: Yes
Known Constraints: This is an existing application, not a greenfield rebuild.

Current source code and tests are the primary evidence of implemented behavior. planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md is the condensed current-state description derived primarily from the source. planning/project/Design_Documents/FUTURE_APPLICATION_DESIGN.md defines intended future architecture and direction.

Do not attempt to reconstruct a complete historical development sequence or infer missing Phase 01–08 artifacts. Earlier development history is intentionally incomplete and has been condensed because prior rebuilds and cleanup removed or superseded substantial planning material.

Reconciliation should determine what exists now and what remains to be built, not recreate how the application arrived at its current state.

Preserve currently working application behavior unless current planning explicitly authorizes changing it. Avoid parallel authority systems, duplicated workflow mechanisms, unnecessary governance layers, and speculative redesign.

ChampCity A/I must remain the system of record for workflow, artifacts, resource authority, execution evidence, and validation. AI models are replaceable reasoning and implementation workers, not workflow authority.
Repository Review Context: This is an existing, substantially implemented application. Review the repository as a current-state software system, not as a historical planning reconstruction.

Treat the source code and tests as the primary evidence of implemented behavior. Use planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md as the condensed current-state architecture and feature inventory; it was produced primarily from direct inspection of the current src tree. Use planning/project/Design_Documents/FUTURE_APPLICATION_DESIGN.md only as forward-looking architecture and intended development direction, not as evidence that those capabilities already exist.

Historical planning is intentionally incomplete. Earlier development artifacts were lost, superseded, or removed during rebuilds and cleanup. Do not attempt to reconstruct missing historical phases, Work Cards, or development chronology, and do not treat missing Phase 01–08 artifacts as a defect. Reconciliation should answer two questions: what does the application actually implement today, and what remains to be built from the current baseline?

Important current-state context: ChampCity A/I already implements the Project → Phase → Work Card → Repair → Validation lifecycle, canonical Markdown artifact handling, embedded ChatGPT Architect workflow, Codex App Server implementation support, Windows development-environment provisioning, and an A/I-owned Agent Harness/MCP runtime. Browser ChatGPT can currently access the application repository through that MCP runtime.

The future-design document intentionally changes some current architecture. In particular, the current Agent Harness restricts generic MCP repository access to the project selected in the desktop application. The intended future architecture decouples desktop workflow selection from MCP resource authority and adds multi-workspace access, bounded filesystem roots, generic local execution, and later role-based agent authority.

Prefer current production code over stale README text or historical planning when they conflict. Preserve working current behavior unless the new planning process explicitly chooses to change it.
