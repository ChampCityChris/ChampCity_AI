<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "generated-handoff",
  "artifactRevision": 1,
  "participationRole": "nonReviewHandoff",
  "identity": {
    "handoffKind": "project-planning"
  },
  "sourceRevisions": [
    {
      "path": "planning/project/Project_Intake/PROJECT_INTAKE_champcity_a_i.md",
      "revision": 1
    },
    {
      "path": "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md",
      "revision": 1
    },
    {
      "path": "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_champcity_a_i.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "handoffKind": "project-planning",
    "contractId": "project-planning-output-submission-v2",
    "projectProfileTarget": "planning/project/PROJECT_PROFILE.md",
    "projectRoadmapTarget": "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
    "reconciliationMode": "reconciliation-required",
    "repositoryReviewRequired": true,
    "repositoryReviewContext": "This is an existing, substantially implemented application. Review the repository as a current-state software system, not as a historical planning reconstruction.\n\nTreat the source code and tests as the primary evidence of implemented behavior. Use planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md as the condensed current-state architecture and feature inventory; it was produced primarily from direct inspection of the current src tree. Use planning/project/Design_Documents/FUTURE_APPLICATION_DESIGN.md only as forward-looking architecture and intended development direction, not as evidence that those capabilities already exist.\n\nHistorical planning is intentionally incomplete. Earlier development artifacts were lost, superseded, or removed during rebuilds and cleanup. Do not attempt to reconstruct missing historical phases, Work Cards, or development chronology, and do not treat missing Phase 01–08 artifacts as a defect. Reconciliation should answer two questions: what does the application actually implement today, and what remains to be built from the current baseline?\n\nImportant current-state context: ChampCity A/I already implements the Project → Phase → Work Card → Repair → Validation lifecycle, canonical Markdown artifact handling, embedded ChatGPT Architect workflow, Codex App Server implementation support, Windows development-environment provisioning, and an A/I-owned Agent Harness/MCP runtime. Browser ChatGPT can currently access the application repository through that MCP runtime.\n\nThe future-design document intentionally changes some current architecture. In particular, the current Agent Harness restricts generic MCP repository access to the project selected in the desktop application. The intended future architecture decouples desktop workflow selection from MCP resource authority and adds multi-workspace access, bounded filesystem roots, generic local execution, and later role-based agent authority.\n\nPrefer current production code over stale README text or historical planning when they conflict. Preserve working current behavior unless the new planning process explicitly chooses to change it.",
    "legacyPlanningPaths": [
      "planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md",
      "planning/project/Design_Documents/FUTURE_APPLICATION_DESIGN.md",
      "planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md"
    ],
    "sourceEvidencePaths": [
      "package.json",
      "src/main/agentHarness/core/errors.ts",
      "src/main/agentHarness/repository/attachedImages.ts",
      "src/main/agentHarness/repository/patches.ts",
      "src/main/agentHarness/repository/pathPolicy.ts",
      "src/main/agentHarness/repository/repositoryOperations.ts",
      "src/main/agentHarness/repository/textProjection.ts",
      "src/main/agentHarness/runtime/agentHarnessService.ts",
      "src/main/agentHarness/runtime/agentHarnessSettings.ts",
      "src/main/agentHarness/runtime/bindingPolicy.ts",
      "src/main/agentHarness/runtime/httpRuntime.ts",
      "src/main/agentHarness/runtime/mcpServer.ts",
      "src/main/agentHarness/runtime/oauthStore.ts",
      "src/main/agentHarness/tools/toolRegistry.ts",
      "src/main/agentHarness/workspace/workspaceAuthority.ts",
      "src/main/architectInterview/architectInterviewContextResolver.ts",
      "src/main/architectInterview/architectInterviewDraftPilot.ts",
      "src/main/architectInterview/architectInterviewService.ts",
      "src/main/architectInterview/projectArchitectInterviewPromptWriter.ts",
      "src/main/architectOutputs/architectDraftPaths.ts",
      "src/main/architectOutputs/architectDraftPromotionService.ts",
      "src/main/architectOutputs/architectDraftSubmissionService.ts",
      "src/main/architectOutputs/architectOutputRegistry.ts",
      "src/main/architectOutputs/architectOutputRuntimeService.ts",
      "src/main/architectOutputs/architectOutputWorkspaceService.ts",
      "src/main/architectOutputs/productionArchitectOutputCatalog.ts",
      "src/main/browser/architectBrowserService.ts",
      "src/main/contextMenu/localRendererContextMenu.ts",
      "src/main/currentWorkflow/currentWorkflowService.ts",
      "src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts",
      "src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts",
      "src/main/developmentEnvironment/repositoryEcosystemProvider.ts",
      "src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts",
      "src/main/developmentEnvironment/windowsEnvironmentRefresh.ts",
      "src/main/developmentEnvironment/windowsPackageProviderResolver.ts",
      "src/main/documents/artifactTransaction.ts",
      "src/main/documents/canonicalMarkdownDocumentWriter.ts",
      "src/main/documents/documentDispositionWriter.ts",
      "src/main/documents/firstNonApprovedResolver.ts",
      "src/main/documents/planningDocumentService.ts",
      "src/main/documents/repositoryAuthority.ts",
      "src/main/integrations/architectMcpHandoffService.ts",
      "src/main/integrations/mcpWorkspacePromptContract.ts",
      "src/main/main.ts",
      "src/main/migrations/pairedArtifactsToCanonicalMarkdownV1.ts",
      "src/main/phaseClose/phaseCloseService.ts",
      "src/main/phaseInterview/phaseInterviewDraftOutput.ts",
      "src/main/phaseInterview/phaseInterviewService.ts",
      "src/main/phaseMap/phaseMapDraftOutput.ts",
      "src/main/phaseMap/phaseMapService.ts",
      "src/main/phasePlanning/phasePlanningDraftBundle.ts",
      "src/main/phasePlanning/phasePlanningService.ts",
      "src/main/projectClose/projectCloseService.ts",
      "src/main/projectIntake/projectIntakeService.ts",
      "src/main/projectPlanning/projectPlanningContext.ts",
      "src/main/projectPlanning/projectPlanningDraftBundle.ts",
      "src/main/projectPlanning/projectPlanningPreflight.ts",
      "src/main/projectPlanning/projectPlanningService.ts",
      "src/main/workCardBuilding/codexAppServerProtocol.ts",
      "src/main/workCardBuilding/codexAppServerTransport.ts",
      "src/main/workCardBuilding/codexImplementerExecutionPolicy.ts",
      "src/main/workCardBuilding/codexImplementerExecutionService.ts",
      "src/main/workCardBuilding/workCardBuildingReviewService.ts",
      "src/main/workCardIntake/workCardIntakeService.ts",
      "src/main/workCardLoop/workCardLoopAuthorityService.ts",
      "src/main/workCardPlanning/workCardPlanningService.ts",
      "src/main/workCardRepair/workCardRepairService.ts",
      "src/main/workCardValidation/workCardValidationService.ts",
      "src/main/workspaceSettings.ts",
      "src/preload/index.ts",
      "src/renderer/app/App.tsx",
      "src/renderer/app/architectOutputWorkspaceRefresh.ts",
      "src/renderer/app/ExecutionContextDashboard.tsx",
      "src/renderer/app/figma/FigmaAppStrip.tsx",
      "src/renderer/app/figma/FigmaBrowserPanel.tsx",
      "src/renderer/app/figma/FigmaSidebar.tsx",
      "src/renderer/app/FigmaDocumentCard.tsx",
      "src/renderer/app/NestedWorkflowRail.tsx",
      "src/renderer/app/phaseMapPresentation.tsx",
      "src/renderer/app/WorkCardBuildingReviewWorkspace.tsx",
      "src/renderer/app/WorkCardCloseWorkspace.tsx",
      "src/renderer/app/WorkCardIntakeWorkspace.tsx",
      "src/renderer/app/WorkCardMapWorkspace.tsx",
      "src/renderer/app/workCardPlanPresentation.tsx",
      "src/renderer/app/WorkCardRepairWorkspace.tsx",
      "src/renderer/app/WorkCardReportReviewWorkspace.tsx",
      "src/renderer/app/workflowReviewDocuments.ts",
      "src/renderer/assets.d.ts",
      "src/renderer/global.d.ts",
      "src/renderer/index.html",
      "src/renderer/main.tsx",
      "src/renderer/styles.css",
      "src/shared/architectInterview/architectBrowserAttachmentCoordinator.ts",
      "src/shared/architectInterview/architectBrowserNavigationPolicy.ts",
      "src/shared/architectInterview/architectInterviewRefreshState.ts",
      "src/shared/architectOutputs/architectOutputContracts.ts",
      "src/shared/developmentEnvironment/developmentEnvironmentContract.ts",
      "src/shared/developmentEnvironmentContracts.ts",
      "src/shared/documents/canonicalMarkdown.ts",
      "src/shared/documents/documentDisposition.ts",
      "src/shared/documents/documentOrder.ts",
      "src/shared/documents/lifecycleArtifact.ts",
      "src/shared/documents/planningDocument.ts",
      "src/shared/documents/sourceFreshness.ts",
      "src/shared/lifecycle/nestedLifecycle.ts",
      "src/shared/projectIntake/postSubmitReviewState.ts",
      "src/shared/projectIntake/projectIntakeCorpus.ts",
      "src/shared/workspaceContracts.ts",
      "src/shared/workspaces/documentWorkspace.ts",
      "src/shared/workspaces/projectLifecycleRailStatus.ts",
      "src/shared/workspaces/projectRailPresentation.ts",
      "src/shared/workspaces/workspaceRegistry.ts",
      "test/agent-harness/agent-harness-core.test.cjs",
      "test/agent-harness/agent-harness-runtime.test.cjs",
      "test/app-shell/app-shell.test.cjs",
      "test/architect-interview/architect-interview-workspace.test.cjs",
      "test/architect-outputs/architect-draft-ingestion.test.cjs",
      "test/architect-outputs/architect-output-prompt-contracts.test.cjs",
      "test/architect-outputs/architect-output-workspace-repair.test.cjs",
      "test/browser/architect-browser-handoff.test.cjs",
      "test/context-menu/local-renderer-context-menu.test.cjs",
      "test/development-environment/elevated-command-transport.test.cjs",
      "test/development-environment/windows-development-environment-provisioner.test.cjs",
      "test/development-environment/windows-environment-refresh.test.cjs",
      "test/documents/artifact-source-revision.test.cjs",
      "test/documents/artifact-transaction.test.cjs",
      "test/documents/canonical-markdown-document.test.cjs",
      "test/documents/planning-document-service.test.cjs",
      "test/documents/single-file-workflow.test.cjs",
      "test/dogfood/real-corpus-dogfood.test.cjs",
      "test/fixtures/fake-winget-mcp-server.cjs",
      "test/lifecycle/evidence-lifecycle-resolver.test.cjs",
      "test/lifecycle/nested-lifecycle.test.cjs",
      "test/migration/paired-artifacts-to-canonical-markdown-v1.test.cjs",
      "test/phase-close/phase-close-service.test.cjs",
      "test/phase-interview/phase-interview-service.test.cjs",
      "test/phase-map/phase-map-service.test.cjs",
      "test/phase-planning/phase-planning-service.test.cjs",
      "test/project-close/project-close-service.test.cjs",
      "test/project-intake/post-submit-review-state.test.cjs",
      "test/project-intake/project-intake-corpus-status.test.cjs",
      "test/project-intake/project-intake-service.test.cjs",
      "test/project-planning/project-planning-service.test.cjs",
      "test/reconstruction/reconstruction-repair01.test.cjs",
      "test/renderer/agent-harness-settings-workspace.test.cjs",
      "test/renderer/architect-browser-attachment-coordinator.test.cjs",
      "test/renderer/architect-interview-refresh-state.test.cjs",
      "test/renderer/architect-output-viewed-revisions.test.cjs",
      "test/renderer/architect-output-workspace-source.test.cjs",
      "test/renderer/document-review-surface-source.test.cjs",
      "test/renderer/execution-context-dashboard.test.cjs",
      "test/renderer/figma-redesign-shell.test.cjs",
      "test/renderer/phase-map-presentation.test.cjs",
      "test/renderer/project-planning-blocker-banner.test.cjs",
      "test/renderer/project-rail-presentation.test.cjs",
      "test/renderer/renderer-source-loader.cjs",
      "test/renderer/work-card-building-review-workspace.test.cjs",
      "test/renderer/work-card-close-workspace.test.cjs",
      "test/renderer/work-card-intake-workspace.test.cjs",
      "test/renderer/work-card-map-workspace.test.cjs",
      "test/renderer/work-card-plan-presentation.test.cjs",
      "test/renderer/work-card-repair-workspace.test.cjs",
      "test/renderer/work-card-report-review-workspace.test.cjs",
      "test/repository/runtime-wiring-source.test.cjs",
      "test/resolver/first-non-approved-resolver.test.cjs",
      "test/resolver/single-file-resolver.test.cjs",
      "test/support/architect-output-fixtures.cjs",
      "test/support/canonical-markdown-fixtures.cjs",
      "test/work-card-building/codex-app-server-transport.test.cjs",
      "test/work-card-building/codex-implementer-execution-service.test.cjs",
      "test/work-card-building/work-card-building-review-service.test.cjs",
      "test/work-card-intake/work-card-intake-service.test.cjs",
      "test/work-card-loop/work-card-loop-authority-service.test.cjs",
      "test/work-card-planning/development-environment-contract.test.cjs",
      "test/work-card-planning/work-card-planning-service.test.cjs",
      "test/work-card-repair/work-card-repair-service.test.cjs",
      "test/work-card-validation/work-card-validation-service.test.cjs",
      "test/workflow/current-execution-context.test.cjs",
      "test/workflow/production-service-proof.test.cjs",
      "test/workspaces/workspace-document-review.test.cjs",
      "tsconfig.json",
      "vite.config.ts"
    ],
    "requiredProfileSections": [
      "Current-State Baseline",
      "Existing Implementation",
      "Legacy Planning Reconciliation",
      "Risks and Unknowns"
    ],
    "requiredRoadmapSections": [
      "Baseline Summary",
      "Work-State Classification",
      "MVP Scope",
      "Sequenced Roadmap",
      "Post-MVP Roadmap",
      "Deferred and Conditional Work",
      "Dependencies and Constraints"
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

# Project Planning Handoff

Contract ID: project-planning-output-submission-v2
Reconciliation Mode: reconciliation-required
Repository Review Required: true
Repository Review Context: This is an existing, substantially implemented application. Review the repository as a current-state software system, not as a historical planning reconstruction.

Treat the source code and tests as the primary evidence of implemented behavior. Use planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md as the condensed current-state architecture and feature inventory; it was produced primarily from direct inspection of the current src tree. Use planning/project/Design_Documents/FUTURE_APPLICATION_DESIGN.md only as forward-looking architecture and intended development direction, not as evidence that those capabilities already exist.

Historical planning is intentionally incomplete. Earlier development artifacts were lost, superseded, or removed during rebuilds and cleanup. Do not attempt to reconstruct missing historical phases, Work Cards, or development chronology, and do not treat missing Phase 01–08 artifacts as a defect. Reconciliation should answer two questions: what does the application actually implement today, and what remains to be built from the current baseline?

Important current-state context: ChampCity A/I already implements the Project → Phase → Work Card → Repair → Validation lifecycle, canonical Markdown artifact handling, embedded ChatGPT Architect workflow, Codex App Server implementation support, Windows development-environment provisioning, and an A/I-owned Agent Harness/MCP runtime. Browser ChatGPT can currently access the application repository through that MCP runtime.

The future-design document intentionally changes some current architecture. In particular, the current Agent Harness restricts generic MCP repository access to the project selected in the desktop application. The intended future architecture decouples desktop workflow selection from MCP resource authority and adds multi-workspace access, bounded filesystem roots, generic local execution, and later role-based agent authority.

Prefer current production code over stale README text or historical planning when they conflict. Preserve working current behavior unless the new planning process explicitly chooses to change it.

Project Intake Markdown: planning/project/Project_Intake/PROJECT_INTAKE_champcity_a_i.md
Architect Interview Prompt Markdown: planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md
Approved Architect Interview Markdown: planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_champcity_a_i.md
Project Profile Markdown: planning/project/PROJECT_PROFILE.md
Project Roadmap Markdown: planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md

Current source revisions:
- planning/project/Project_Intake/PROJECT_INTAKE_champcity_a_i.md revision 1
- planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md revision 1
- planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_champcity_a_i.md revision 1

Legacy planning evidence paths:
- planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md
- planning/project/Design_Documents/FUTURE_APPLICATION_DESIGN.md
- planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md

Source evidence paths:
- package.json
- src/main/agentHarness/core/errors.ts
- src/main/agentHarness/repository/attachedImages.ts
- src/main/agentHarness/repository/patches.ts
- src/main/agentHarness/repository/pathPolicy.ts
- src/main/agentHarness/repository/repositoryOperations.ts
- src/main/agentHarness/repository/textProjection.ts
- src/main/agentHarness/runtime/agentHarnessService.ts
- src/main/agentHarness/runtime/agentHarnessSettings.ts
- src/main/agentHarness/runtime/bindingPolicy.ts
- src/main/agentHarness/runtime/httpRuntime.ts
- src/main/agentHarness/runtime/mcpServer.ts
- src/main/agentHarness/runtime/oauthStore.ts
- src/main/agentHarness/tools/toolRegistry.ts
- src/main/agentHarness/workspace/workspaceAuthority.ts
- src/main/architectInterview/architectInterviewContextResolver.ts
- src/main/architectInterview/architectInterviewDraftPilot.ts
- src/main/architectInterview/architectInterviewService.ts
- src/main/architectInterview/projectArchitectInterviewPromptWriter.ts
- src/main/architectOutputs/architectDraftPaths.ts
- src/main/architectOutputs/architectDraftPromotionService.ts
- src/main/architectOutputs/architectDraftSubmissionService.ts
- src/main/architectOutputs/architectOutputRegistry.ts
- src/main/architectOutputs/architectOutputRuntimeService.ts
- src/main/architectOutputs/architectOutputWorkspaceService.ts
- src/main/architectOutputs/productionArchitectOutputCatalog.ts
- src/main/browser/architectBrowserService.ts
- src/main/contextMenu/localRendererContextMenu.ts
- src/main/currentWorkflow/currentWorkflowService.ts
- src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts
- src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts
- src/main/developmentEnvironment/repositoryEcosystemProvider.ts
- src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts
- src/main/developmentEnvironment/windowsEnvironmentRefresh.ts
- src/main/developmentEnvironment/windowsPackageProviderResolver.ts
- src/main/documents/artifactTransaction.ts
- src/main/documents/canonicalMarkdownDocumentWriter.ts
- src/main/documents/documentDispositionWriter.ts
- src/main/documents/firstNonApprovedResolver.ts
- src/main/documents/planningDocumentService.ts
- src/main/documents/repositoryAuthority.ts
- src/main/integrations/architectMcpHandoffService.ts
- src/main/integrations/mcpWorkspacePromptContract.ts
- src/main/main.ts
- src/main/migrations/pairedArtifactsToCanonicalMarkdownV1.ts
- src/main/phaseClose/phaseCloseService.ts
- src/main/phaseInterview/phaseInterviewDraftOutput.ts
- src/main/phaseInterview/phaseInterviewService.ts
- src/main/phaseMap/phaseMapDraftOutput.ts
- src/main/phaseMap/phaseMapService.ts
- src/main/phasePlanning/phasePlanningDraftBundle.ts
- src/main/phasePlanning/phasePlanningService.ts
- src/main/projectClose/projectCloseService.ts
- src/main/projectIntake/projectIntakeService.ts
- src/main/projectPlanning/projectPlanningContext.ts
- src/main/projectPlanning/projectPlanningDraftBundle.ts
- src/main/projectPlanning/projectPlanningPreflight.ts
- src/main/projectPlanning/projectPlanningService.ts
- src/main/workCardBuilding/codexAppServerProtocol.ts
- src/main/workCardBuilding/codexAppServerTransport.ts
- src/main/workCardBuilding/codexImplementerExecutionPolicy.ts
- src/main/workCardBuilding/codexImplementerExecutionService.ts
- src/main/workCardBuilding/workCardBuildingReviewService.ts
- src/main/workCardIntake/workCardIntakeService.ts
- src/main/workCardLoop/workCardLoopAuthorityService.ts
- src/main/workCardPlanning/workCardPlanningService.ts
- src/main/workCardRepair/workCardRepairService.ts
- src/main/workCardValidation/workCardValidationService.ts
- src/main/workspaceSettings.ts
- src/preload/index.ts
- src/renderer/app/App.tsx
- src/renderer/app/architectOutputWorkspaceRefresh.ts
- src/renderer/app/ExecutionContextDashboard.tsx
- src/renderer/app/figma/FigmaAppStrip.tsx
- src/renderer/app/figma/FigmaBrowserPanel.tsx
- src/renderer/app/figma/FigmaSidebar.tsx
- src/renderer/app/FigmaDocumentCard.tsx
- src/renderer/app/NestedWorkflowRail.tsx
- src/renderer/app/phaseMapPresentation.tsx
- src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
- src/renderer/app/WorkCardCloseWorkspace.tsx
- src/renderer/app/WorkCardIntakeWorkspace.tsx
- src/renderer/app/WorkCardMapWorkspace.tsx
- src/renderer/app/workCardPlanPresentation.tsx
- src/renderer/app/WorkCardRepairWorkspace.tsx
- src/renderer/app/WorkCardReportReviewWorkspace.tsx
- src/renderer/app/workflowReviewDocuments.ts
- src/renderer/assets.d.ts
- src/renderer/global.d.ts
- src/renderer/index.html
- src/renderer/main.tsx
- src/renderer/styles.css
- src/shared/architectInterview/architectBrowserAttachmentCoordinator.ts
- src/shared/architectInterview/architectBrowserNavigationPolicy.ts
- src/shared/architectInterview/architectInterviewRefreshState.ts
- src/shared/architectOutputs/architectOutputContracts.ts
- src/shared/developmentEnvironment/developmentEnvironmentContract.ts
- src/shared/developmentEnvironmentContracts.ts
- src/shared/documents/canonicalMarkdown.ts
- src/shared/documents/documentDisposition.ts
- src/shared/documents/documentOrder.ts
- src/shared/documents/lifecycleArtifact.ts
- src/shared/documents/planningDocument.ts
- src/shared/documents/sourceFreshness.ts
- src/shared/lifecycle/nestedLifecycle.ts
- src/shared/projectIntake/postSubmitReviewState.ts
- src/shared/projectIntake/projectIntakeCorpus.ts
- src/shared/workspaceContracts.ts
- src/shared/workspaces/documentWorkspace.ts
- src/shared/workspaces/projectLifecycleRailStatus.ts
- src/shared/workspaces/projectRailPresentation.ts
- src/shared/workspaces/workspaceRegistry.ts
- test/agent-harness/agent-harness-core.test.cjs
- test/agent-harness/agent-harness-runtime.test.cjs
- test/app-shell/app-shell.test.cjs
- test/architect-interview/architect-interview-workspace.test.cjs
- test/architect-outputs/architect-draft-ingestion.test.cjs
- test/architect-outputs/architect-output-prompt-contracts.test.cjs
- test/architect-outputs/architect-output-workspace-repair.test.cjs
- test/browser/architect-browser-handoff.test.cjs
- test/context-menu/local-renderer-context-menu.test.cjs
- test/development-environment/elevated-command-transport.test.cjs
- test/development-environment/windows-development-environment-provisioner.test.cjs
- test/development-environment/windows-environment-refresh.test.cjs
- test/documents/artifact-source-revision.test.cjs
- test/documents/artifact-transaction.test.cjs
- test/documents/canonical-markdown-document.test.cjs
- test/documents/planning-document-service.test.cjs
- test/documents/single-file-workflow.test.cjs
- test/dogfood/real-corpus-dogfood.test.cjs
- test/fixtures/fake-winget-mcp-server.cjs
- test/lifecycle/evidence-lifecycle-resolver.test.cjs
- test/lifecycle/nested-lifecycle.test.cjs
- test/migration/paired-artifacts-to-canonical-markdown-v1.test.cjs
- test/phase-close/phase-close-service.test.cjs
- test/phase-interview/phase-interview-service.test.cjs
- test/phase-map/phase-map-service.test.cjs
- test/phase-planning/phase-planning-service.test.cjs
- test/project-close/project-close-service.test.cjs
- test/project-intake/post-submit-review-state.test.cjs
- test/project-intake/project-intake-corpus-status.test.cjs
- test/project-intake/project-intake-service.test.cjs
- test/project-planning/project-planning-service.test.cjs
- test/reconstruction/reconstruction-repair01.test.cjs
- test/renderer/agent-harness-settings-workspace.test.cjs
- test/renderer/architect-browser-attachment-coordinator.test.cjs
- test/renderer/architect-interview-refresh-state.test.cjs
- test/renderer/architect-output-viewed-revisions.test.cjs
- test/renderer/architect-output-workspace-source.test.cjs
- test/renderer/document-review-surface-source.test.cjs
- test/renderer/execution-context-dashboard.test.cjs
- test/renderer/figma-redesign-shell.test.cjs
- test/renderer/phase-map-presentation.test.cjs
- test/renderer/project-planning-blocker-banner.test.cjs
- test/renderer/project-rail-presentation.test.cjs
- test/renderer/renderer-source-loader.cjs
- test/renderer/work-card-building-review-workspace.test.cjs
- test/renderer/work-card-close-workspace.test.cjs
- test/renderer/work-card-intake-workspace.test.cjs
- test/renderer/work-card-map-workspace.test.cjs
- test/renderer/work-card-plan-presentation.test.cjs
- test/renderer/work-card-repair-workspace.test.cjs
- test/renderer/work-card-report-review-workspace.test.cjs
- test/repository/runtime-wiring-source.test.cjs
- test/resolver/first-non-approved-resolver.test.cjs
- test/resolver/single-file-resolver.test.cjs
- test/support/architect-output-fixtures.cjs
- test/support/canonical-markdown-fixtures.cjs
- test/work-card-building/codex-app-server-transport.test.cjs
- test/work-card-building/codex-implementer-execution-service.test.cjs
- test/work-card-building/work-card-building-review-service.test.cjs
- test/work-card-intake/work-card-intake-service.test.cjs
- test/work-card-loop/work-card-loop-authority-service.test.cjs
- test/work-card-planning/development-environment-contract.test.cjs
- test/work-card-planning/work-card-planning-service.test.cjs
- test/work-card-repair/work-card-repair-service.test.cjs
- test/work-card-validation/work-card-validation-service.test.cjs
- test/workflow/current-execution-context.test.cjs
- test/workflow/production-service-proof.test.cjs
- test/workspaces/workspace-document-review.test.cjs
- tsconfig.json
- vite.config.ts

Required Project Profile sections:
- Current-State Baseline
- Existing Implementation
- Legacy Planning Reconciliation
- Risks and Unknowns

Ground-zero baseline rule:
- Project ground zero is the selected project repository plus the local development machine.
- Do not assume greenfield means the development machine is ready.
- In Current-State Baseline, Existing Implementation, and Risks and Unknowns, distinguish verified installed, verified missing, and unverified development capabilities; repository-native dependency or bootstrap mechanisms; project-local agent, build, and validation instructions; and any required capability explicitly externally managed.
- A missing required local development capability is project work by default unless approved evidence establishes external ownership.

Required Project Roadmap sections:
- Baseline Summary
- Work-State Classification
- MVP Scope
- Sequenced Roadmap
- Post-MVP Roadmap
- Deferred and Conditional Work
- Dependencies and Constraints

Roadmap sequencing rule:
- Missing development capabilities required by planned implementation must be sequenced as project work before dependent work.
- Engineering or foundation stages must establish both machine readiness and repository readiness when applicable.
- Required capabilities must derive from approved architecture and intended implementation work; do not invent tools merely to fill a foundation.

Browser chat is not durable authority. The Architect must create both temporary body-only Markdown drafts through the generic artifact toolbox Markdown writer.
