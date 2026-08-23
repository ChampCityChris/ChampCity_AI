<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "project-architect-interview-prompt",
  "artifactRevision": 1,
  "participationRole": "nonReviewHandoff",
  "identity": {
    "projectSlug": "champcity_a_i",
    "Project.ArtifactKey": "champcity_a_i"
  },
  "sourceRevisions": [
    {
      "path": "planning/project/Project_Intake/PROJECT_INTAKE_champcity_a_i.md",
      "revision": 1
    }
  ],
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
    },
    "projectSlug": "champcity_a_i",
    "architectOutputTargets": {
      "markdown": "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_champcity_a_i.md"
    }
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Project Architect Interview Prompt: ChampCity A/I

Read these application-owned inputs:
- Project Intake Markdown: planning/project/Project_Intake/PROJECT_INTAKE_champcity_a_i.md

Conduct the Project Architect Interview conversationally with the Operator.

## Interview Method

Use plain language suitable for an Operator who may not be technically experienced.

Ask one primary question at a time. Do not present long questionnaires or large batches of unrelated questions.

Use the Project Intake and available evidence before asking the Operator for information. Do not ask questions whose answers can be derived from the supplied documents, repository evidence, or normal architectural judgment.

Distinguish between:

- Operator-owned decisions about purpose, users, priorities, constraints, acceptable risk, cost, timing, and desired behavior;
- Architect-owned technical decisions about implementation structure, internal design, libraries, patterns, and engineering approach;
- mixed decisions where technical tradeoffs materially affect product behavior, cost, risk, or scope.

For Architect-owned decisions, make a recommendation rather than transferring the design problem to the Operator.

When a question involves a meaningful choice:

1. ask the question in plain language;
2. explain briefly why it matters;
3. provide the recommended answer and rationale;
4. provide no more than two meaningful alternatives when alternatives are necessary;
5. allow the Operator to answer “use your recommendation” or “unsure.”

Avoid jargon. When a technical term is necessary, explain it briefly.

Do not repeatedly request confirmation for low-risk implementation details that the Architect can decide responsibly.

## Interview Length and Pace

Aim to complete the interview in approximately 8–12 substantive questions.

This is a soft operating range, not a hard stop.

After approximately five substantive questions, summarize:

- decisions made;
- assumptions recorded;
- unresolved material issues;
- remaining interview areas.

At approximately ten substantive questions, continue only when unresolved matters could materially affect scope, architecture, risk, dependencies, acceptance, cost, or delivery.

Do not compress multiple major decisions into one overwhelming question merely to stay within the suggested range.

## Required Coverage

Continue until the following are materially resolved:

- project purpose and desired outcome;
- intended users and primary workflows;
- scope and explicit non-scope;
- success and acceptance criteria;
- operational and technical constraints;
- existing systems, data, and integrations;
- security, privacy, compliance, and reliability requirements where applicable;
- major architectural direction;
- material risks and dependencies;
- assumptions;
- deferred decisions;
- unresolved questions requiring later confirmation;
- planning direction for the next project-planning stage.

Do not ask the Operator to choose implementation technologies or internal architecture unless the choice creates a material product, cost, risk, or operational tradeoff. In those cases, provide a recommendation first.

## Completion Confirmation

Before creating the final Interview document, present a concise confirmation summary containing:

- project understanding;
- key decisions;
- Architect recommendations accepted;
- assumptions;
- deferred items;
- unresolved issues.

Ask the Operator to confirm the summary or identify corrections.

Do not create placeholder output before the interview is substantively complete.

## Final Output

When the interview is complete and confirmed, synthesize one complete substantive Project Architect Interview Markdown document body, not a snippet.

The final document should include:

1. Project Understanding
2. Users and Primary Workflows
3. Scope
4. Non-Scope
5. Constraints
6. Key Decisions
7. Architect Recommendations
8. Data and Integration Requirements
9. Security, Compliance, and Operational Considerations
10. Risks and Dependencies
11. Assumptions
12. Deferred Decisions
13. Unresolved Questions
14. Acceptance Direction
15. Project Planning Direction

Open ChampCity A/I Architect Interview and copy its fresh handoff before writing the body.

That handoff provides the exact temporary draft path and the required `artifact_toolbox.create_markdown_artifact` invocation.

Do not write canonical metadata or a final Interview path. ChampCity A/I promotes the temporary draft into the Pending canonical Interview.
