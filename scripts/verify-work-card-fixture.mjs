import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDir, "..");
const checkedInWorkCardsDirectory = resolve(
  repositoryRoot,
  "planning/phases/phase-01/Work_Cards",
);
const phase02WorkCardsDirectory = resolve(
  repositoryRoot,
  "planning/phases/phase-02/Work_Cards",
);
const uiDesignHandoffDirectory = resolve(
  repositoryRoot,
  "planning/phases/phase-01/UI_Design_Handoff",
);
const packageJsonPath = resolve(repositoryRoot, "package.json");
const rendererAppPath = resolve(repositoryRoot, "src/renderer/app/App.tsx");
const rendererEntryPath = resolve(repositoryRoot, "src/renderer/main.tsx");
const preloadPath = resolve(repositoryRoot, "src/preload/index.ts");
const mainWorkCardFileStorePath = resolve(
  repositoryRoot,
  "src/main/workCards/workCardFileStore.ts",
);
const rendererTailwindPath = resolve(
  repositoryRoot,
  "src/renderer/styles/tailwind.css",
);
const rendererThemePath = resolve(
  repositoryRoot,
  "src/renderer/styles/theme.css",
);
const figmaImplementationMapPath = resolve(
  uiDesignHandoffDirectory,
  "FIGMA_IMPLEMENTATION_MAP.md",
);
const rendererIconPath = resolve(
  repositoryRoot,
  "src/renderer/assets/champcity_ai_icon_clean_no_shadow_TRANSPARENT.png",
);
const rendererBrandingPath = resolve(
  repositoryRoot,
  "src/renderer/assets/champcity_ai_ui_branding.png",
);
const figmaSourcePackagePath = resolve(
  uiDesignHandoffDirectory,
  "figma_source/Design Dark UI for ChampCity.zip",
);
const currentUiScreens = [
  "Work Card Plan Review",
  "Ad Hoc Work Card Capture",
  "Architect Prompt Composer",
  "Risk Router",
  "Builder Prompt Generator",
  "Builder Report Capture",
  "Human Validation",
  "Phase Closeout",
];
const wc10PipelineLabels = [
  "Work Card Plan Review",
  "Ad Hoc Work Card Capture",
  "Architect",
  "Risk",
  "Implement",
  "Report",
  "Validate",
  "Closeout",
];

const { workCardFixture } = require("../dist/shared/workCards/fixtures/workCardFixture.js");
const { workCardCaptureFixture } = require("../dist/shared/workCards/fixtures/workCardCaptureFixture.js");
const {
  workCardArchitectPromptFixture,
} = require("../dist/shared/workCards/fixtures/workCardArchitectPromptFixture.js");
const {
  workCardRiskRouterFixture,
} = require("../dist/shared/workCards/fixtures/workCardRiskRouterFixture.js");
const {
  workCardBuilderPromptFixture,
} = require("../dist/shared/workCards/fixtures/workCardBuilderPromptFixture.js");
const {
  workCardBuilderReportFixture,
} = require("../dist/shared/workCards/fixtures/workCardBuilderReportFixture.js");
const {
  workCardHumanValidationFixture,
} = require("../dist/shared/workCards/fixtures/workCardHumanValidationFixture.js");
const {
  workCardPhaseCloseoutFixture,
} = require("../dist/shared/workCards/fixtures/workCardPhaseCloseoutFixture.js");
const {
  workCardProjectIntakeFixture,
} = require("../dist/shared/workCards/fixtures/workCardProjectIntakeFixture.js");
const {
  workCardProjectArchitectInterviewPromptFixture,
} = require("../dist/shared/workCards/fixtures/workCardProjectArchitectInterviewPromptFixture.js");
const {
  projectIntakeFixture,
} = require("../dist/shared/workCards/fixtures/projectIntakeFixture.js");
const {
  buildDraftWorkCard,
} = require("../dist/shared/workCards/workCardDraft.js");
const {
  buildProjectIntake,
  buildProjectIntakeFileNames,
  validateProjectIntakeArtifactFileName,
  validateProjectIntakeSlug,
} = require("../dist/shared/workCards/projectIntake.js");
const {
  projectIntakeMarkdownHeadings,
  projectIntakeNextStepText,
  renderProjectIntakeMarkdown,
} = require("../dist/shared/workCards/renderProjectIntakeMarkdown.js");
const {
  validateProjectIntake,
} = require("../dist/shared/workCards/validateProjectIntake.js");
const {
  buildProjectArchitectInterviewPrompt,
  buildProjectArchitectInterviewPromptFileNames,
  projectArchitectInterviewOperatorInstruction,
  projectArchitectInterviewPromptPurpose,
  validateProjectArchitectInterviewPrompt,
  validateProjectArchitectInterviewPromptArtifactFileName,
  validateProjectArchitectInterviewPromptSlug,
} = require("../dist/shared/workCards/projectArchitectInterviewPrompt.js");
const {
  projectArchitectInterviewPromptMarkdownHeadings,
  projectArchitectInterviewPromptNextStepText,
  renderProjectArchitectInterviewPromptMarkdown,
} = require("../dist/shared/workCards/renderProjectArchitectInterviewPromptMarkdown.js");
const {
  buildProjectPlanningDocuments,
  buildProjectPlanningDocumentsFileNames,
  renderProjectPlanningDocumentsPreview,
  renderProjectPlanningDocumentsRecordMarkdown,
  validateProjectPlanningDocumentsArtifactFileName,
  validateProjectPlanningDocumentsSlug,
} = require("../dist/shared/workCards/projectPlanningDocuments.js");
const {
  buildArchitectLedPhaseIntake,
  buildPhaseIntake,
  buildPhaseIntakeFileNames,
  phaseIntakeWorkTypes,
  validatePhaseIntakeArtifactFileName,
  validatePhaseIntakeGenerationMode,
  validatePhaseIntakeSlug,
  validatePhaseIntakeWorkType,
} = require("../dist/shared/workCards/phaseIntake.js");
const {
  phaseIntakeMarkdownHeadings,
  phaseIntakeNextStepText,
  renderPhaseIntakeMarkdown,
} = require("../dist/shared/workCards/renderPhaseIntakeMarkdown.js");
const {
  validatePhaseIntake,
} = require("../dist/shared/workCards/validatePhaseIntake.js");
const {
  buildPhaseArchitectInterviewPrompt,
  buildPhaseArchitectInterviewPromptFileNames,
  phaseArchitectInterviewOperatorInstruction,
  phaseArchitectInterviewPromptPurpose,
  validatePhaseArchitectInterviewPrompt,
  validatePhaseArchitectInterviewPromptArtifactFileName,
  validatePhaseArchitectInterviewPromptSlug,
} = require("../dist/shared/workCards/phaseArchitectInterviewPrompt.js");
const {
  phaseArchitectInterviewPromptMarkdownHeadings,
  phaseArchitectInterviewPromptNextStepText,
  renderPhaseArchitectInterviewPromptMarkdown,
} = require("../dist/shared/workCards/renderPhaseArchitectInterviewPromptMarkdown.js");
const {
  buildRepositoryReconciliationFileNames,
  buildRepositoryReconciliationPromptText,
  buildRepositoryReconciliationRecord,
  renderRepositoryReconciliationMarkdown,
  validateRepositoryReconciliationArtifactFileName,
} = require("../dist/shared/workCards/repositoryReconciliation.js");
const {
  buildCombinedPhasePlanningMarkdown,
  buildPhasePlanningDocuments,
  buildPhasePlanningDocumentsFileNames,
  renderPhasePlanningDocumentsMarkdown,
  validatePhasePlanningDocumentsArtifactFileName,
} = require("../dist/shared/workCards/phasePlanningDocuments.js");
const {
  buildCompatibilityPhaseIntakeFromRoadmap,
  buildPhaseReadinessReviewFileNames,
  buildPhaseReadinessReviewRecord,
  buildProjectRoadmap,
  buildProjectRoadmapFileNames,
  buildRoadmapWorkCardPlanRecord,
  renderPhaseReadinessReviewMarkdown,
  renderProjectRoadmapMarkdown,
  validatePhaseReadinessReviewArtifactFileName,
  validateProjectRoadmapArtifactFileName,
  validateProjectRoadmapRecord,
  validateProjectRoadmapSlug,
} = require("../dist/shared/workCards/projectRoadmap.js");
const {
  buildPhaseMapFileNames,
  buildPhaseMapRecord,
  renderPhaseMapMarkdown,
  validatePhaseMapArtifactFileName,
  validatePhaseMapRecord,
} = require("../dist/shared/workCards/phaseMap.js");
const {
  buildWorkCardPlanFileNames,
  buildWorkCardPlanRecord,
  renderPhaseScopedBacklogMarkdown,
  renderWorkCardPlanMarkdown,
  validateWorkCardPlanArtifactFileName,
} = require("../dist/shared/workCards/workCardPlan.js");
const {
  finalBuilderPromptBoundary,
  renderArchitectFramingPrompt,
} = require("../dist/shared/workCards/renderArchitectFramingPrompt.js");
const {
  renderWorkCardMarkdown,
  workCardMarkdownHeadings,
} = require("../dist/shared/workCards/renderWorkCardMarkdown.js");
const {
  buildRiskReviewFileName,
  renderRiskReviewMarkdown,
  riskReviewNoApprovalNote,
} = require("../dist/shared/workCards/renderRiskReviewMarkdown.js");
const {
  buildBuilderPromptFileName,
  builderPromptHighRiskWarning,
  builderPromptNoRiskReviewWarning,
  renderBuilderPrompt,
  standardBuilderValidationCommands,
} = require("../dist/shared/workCards/renderBuilderPrompt.js");
const {
  buildBuilderReportFileName,
  validateBuilderReport,
  validateBuilderReportMarkdownFileName,
  validateBuilderReportTopic,
} = require("../dist/shared/workCards/validateBuilderReport.js");
const {
  buildRepairPromptFileName,
  repairPromptScopeGuard,
  renderRepairPrompt,
  validateRepairPromptFileName,
} = require("../dist/shared/workCards/renderRepairPrompt.js");
const {
  renderValidationRecordMarkdown,
  validationRecordNonMutatingNote,
} = require("../dist/shared/workCards/renderValidationRecordMarkdown.js");
const {
  createEmptyPhaseArtifactFiles,
  getAllowedPhaseArtifactExtensions,
  phaseArtifactFolderNames,
  summarizePhaseArtifacts,
  validatePhaseArtifactFileName,
} = require("../dist/shared/workCards/phaseCloseout.js");
const {
  buildPhaseCloseoutJsonFileName,
  buildPhaseCloseoutMarkdownFileName,
  buildPhaseCloseoutRecord,
  validatePhaseCloseoutRecord,
  validatePhaseCloseoutReportFileName,
} = require("../dist/shared/workCards/phaseCloseoutRecord.js");
const {
  phaseCloseoutNonMutatingNote,
  renderPhaseCloseoutMarkdown,
} = require("../dist/shared/workCards/renderPhaseCloseoutMarkdown.js");
const {
  buildHumanValidationRecord,
  buildValidationReportJsonFileName,
  buildValidationReportMarkdownFileName,
  extractManualValidationChecklist,
  noBuilderReportSelectedWarning,
  shouldGenerateRepairPrompt,
  validateHumanValidationRecord,
  validateValidationReportFileName,
} = require("../dist/shared/workCards/validationRecord.js");
const {
  architectReviewOutputTemplateLines,
  pendingArchitectDisposition,
} = require("../dist/shared/workCards/reportReviewProtocol.js");
const {
  validateArchitectReview,
} = require("../dist/shared/workCards/validateArchitectReview.js");
const {
  routeWorkCardRisk,
} = require("../dist/shared/workCards/riskRouter.js");
const {
  evaluateCurrentRequiredAction,
  lockedWorkflowSteps,
} = require("../dist/shared/workCards/currentRequiredAction.js");
const { validateWorkCard } = require("../dist/shared/workCards/validateWorkCard.js");
const {
  validateSafePhaseFolder,
} = require("../dist/shared/workCards/workCardFileNames.js");
const {
  listAvailablePhaseFolders,
  getCurrentRequiredAction,
  listHumanValidationBuilderReports,
  listHumanValidationTargets,
  listSavedProjectPlanningDocuments,
  listSavedProjectArchitectInterviewPrompts,
  listSavedWorkCards,
  loadBuilderReportFile,
  previewHumanValidationRecord,
  resolvePhaseArchitectInterviewPromptsDirectory,
  resolvePhaseMapDirectory,
  resolvePhasePlanningDocumentsDirectory,
  resolveBuilderPromptsDirectory,
  resolveBuilderReportsDirectory,
  resolveCloseoutReportsDirectory,
  resolvePhaseIntakeDirectory,
  resolvePhaseScopedBacklogPath,
  resolveProjectArchitectInterviewPromptsDirectory,
  resolveProjectIntakeDirectory,
  resolveProjectPlanningDocumentPath,
  resolveProjectPlanningDocumentsDirectory,
  resolveProjectRoadmapDirectory,
  resolveRepositoryReconciliationDirectory,
  resolvePhaseReadinessReviewsDirectory,
  resolveWorkCardPlansDirectory,
  resolveInside,
  resolveRepairPromptsDirectory,
  resolveRiskReviewsDirectory,
  resolveValidationEvidenceDirectory,
  resolveValidationReportsDirectory,
  resolveValidationTargetsDirectory,
  validateMarkdownArtifactFileName,
  validateSavedPhaseMapJsonFileName,
  validateSavedProjectRoadmapJsonFileName,
  validateSavedRepositoryReconciliationJsonFileName,
  validateSavedPhaseIntakeJsonFileName,
  validateSavedPhaseArchitectInterviewPromptJsonFileName,
  validateSavedProjectPlanningDocumentsJsonFileName,
  validateSavedProjectArchitectInterviewPromptJsonFileName,
  validateSavedProjectIntakeJsonFileName,
  validateSavedWorkCardJsonFileName,
  validateValidationEvidenceFileName,
} = require("../dist/main/workCards/workCardFileStore.js");

if (process.argv.includes("--current-action-only")) {
  await assertCurrentRequiredActionModel();
  console.log("Current required action fixture validation passed.");
  process.exit(0);
}

if (process.argv.includes("--report-protocol-only")) {
  assertBuilderPrompt();
  await assertBuilderReportCapture();
  await assertHumanValidationAndRepair();
  await assertCurrentRequiredActionModel(true);
  console.log("Report review protocol fixture validation passed.");
  process.exit(0);
}

const renderedArtifacts = [
  {
    fixture: workCardFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC01_define_work_card_schema_and_markdown_renderer.md",
    ),
  },
  {
    fixture: workCardCaptureFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC02_build_new_work_card_capture_form.md",
    ),
  },
  {
    fixture: workCardArchitectPromptFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC03_add_architect_framing_prompt_composer.md",
    ),
  },
  {
    fixture: workCardRiskRouterFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC04_add_risk_router.md",
    ),
  },
  {
    fixture: workCardBuilderPromptFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC05_generate_builder_prompt.md",
    ),
  },
  {
    fixture: workCardBuilderReportFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC06_capture_builder_report.md",
    ),
  },
  {
    fixture: workCardHumanValidationFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC07_human_validation_and_repair_loop.md",
    ),
  },
  {
    fixture: workCardPhaseCloseoutFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC08_phase_1_closeout_and_status_management.md",
    ),
  },
  {
    fixture: workCardProjectIntakeFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-02/Work_Cards/WC01_add_project_intake_capture.md",
    ),
  },
  {
    fixture: workCardProjectArchitectInterviewPromptFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-02/Work_Cards/WC02_add_project_architect_interview_prompt_generator.md",
    ),
  },
];

for (const artifact of renderedArtifacts) {
  assertFixtureArtifact(artifact.fixture, artifact.path);
}

assertCheckedInJsonArtifacts(checkedInWorkCardsDirectory);
assertCheckedInJsonArtifacts(phase02WorkCardsDirectory);
assertUiDesignHandoffPackage();
assertWc10UiAndTerminology();
assertProjectIntake();
assertProjectArchitectInterviewPrompt();

const draft = buildDraftWorkCard(
  {
    workCardId: "WC99",
    title: "Capture a draft Work Card",
    phase: "phase-01",
    riskLevel: "medium",
    problem: "The Operator needs to capture an idea without writing Builder instructions.",
    importance: "The Architect needs structured source material.",
    userOutcome: "The Operator can save a draft that waits for Architect review.",
    scope: "Capture intent\nPreview Markdown",
    outOfScope: "Architect automation",
    knownSystems: "New Work Card screen",
    evidence: "Example report text",
    risks: "Draft could be mistaken for Builder-ready work",
    operatorNotes: "Keep the workflow human-reviewed",
  },
  "2026-06-28T00:00:00.000Z",
);

if (draft.status !== "ready_for_architect") {
  console.error("Draft Work Card construction did not preserve ready_for_architect status.");
  process.exit(1);
}

const draftMarkdown = renderWorkCardMarkdown(draft);

if (!draftMarkdown.includes("## Builder Handoff Prompt")) {
  console.error("Draft Work Card Markdown is missing the Builder Handoff Prompt heading.");
  process.exit(1);
}

if (!draftMarkdown.includes("Architect review is required")) {
  console.error("Draft Work Card Markdown does not state that Architect review is required.");
  process.exit(1);
}

if (validateSafePhaseFolder("../bad").length === 0) {
  console.error("Safe phase folder validation failed to reject traversal input.");
  process.exit(1);
}

if (validateSavedWorkCardJsonFileName("../bad").length === 0) {
  console.error("Saved Work Card JSON file validation failed to reject traversal input.");
  process.exit(1);
}

if (validateMarkdownArtifactFileName("../bad").length === 0) {
  console.error("Markdown artifact file validation failed to reject traversal input.");
  process.exit(1);
}

try {
  resolveInside(resolve(repositoryRoot, "planning", "phases"), "../bad");
  console.error("Path sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

try {
  resolveRiskReviewsDirectory("../bad");
  console.error("Risk Review directory sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

try {
  resolveBuilderPromptsDirectory("../bad");
  console.error("Builder Prompt directory sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

try {
  resolveBuilderReportsDirectory("../bad");
  console.error("Builder Report directory sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

try {
  resolveValidationReportsDirectory("../bad");
  console.error("Validation Reports directory sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

try {
  resolveValidationTargetsDirectory("../bad");
  console.error("Validation Targets directory sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

try {
  resolveRepairPromptsDirectory("../bad");
  console.error("Repair Prompts directory sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

try {
  resolveCloseoutReportsDirectory("../bad");
  console.error("Closeout Reports directory sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

assertArchitectPrompt(workCardArchitectPromptFixture);
assertRiskRouter();
assertRiskReviewMarkdown();
assertBuilderPrompt();
await assertBuilderReportCapture();
await assertHumanValidationAndRepair();
assertPhaseCloseout();
await assertSavedWorkCardListing();
await assertProjectPlanningDocuments();
await assertPhaseIntakeAndInterviewPrompt();
assertProjectRoadmapAndPhaseMap();
assertRepositoryReconciliationAndPhasePlanning();
await assertCurrentRequiredActionModel();

console.log("Work Card fixture validation passed.");

async function assertCurrentRequiredActionModel(skipLiveRepositoryCheck = false) {
  if (
    !lockedWorkflowSteps.includes("Project Intake") ||
    !lockedWorkflowSteps.includes("Work Card Loop") ||
    !lockedWorkflowSteps.includes("Next Phase Activation")
  ) {
    console.error("Locked workflow steps are missing required coverage.");
    process.exit(1);
  }

  const scenarios = [
    ["project_intake_required", makeCurrentActionState({
      project: { projectIntake: missingArtifact("planning/project/Project_Intake/PROJECT_INTAKE_test.md") },
    })],
    ["project_interview_required", makeCurrentActionState({
      project: { projectInterview: missingArtifact("planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_test.md") },
    })],
    ["reconciliation_review_required", makeCurrentActionState({
      project: { reconciliationReview: missingArtifact("planning/project/Repository_Reconciliation/REPOSITORY_RECONCILIATION_test.md") },
    })],
    ["project_mapping_required", makeCurrentActionState({
      project: {
        projectRoadmap: missingArtifact("planning/project/Project_Roadmap/PROJECT_ROADMAP_test.md"),
        phaseMap: missingArtifact("planning/project/Phase_Map/PHASE_MAP_test.md"),
      },
    })],
    ["operator_project_approval_required", makeCurrentActionState({
      project: {
        operatorProjectApproval: missingArtifact("planning/project/OPERATOR_PROJECT_APPROVAL.md"),
        projectApprovalSatisfiedByPhaseActivation: false,
      },
    })],
    ["phase_mapping_required", makeCurrentActionState({ activePhase: undefined })],
    ["phase_mapping_required", makeCurrentActionState({
      activePhase: {
        sourceArtifacts: [
          artifact("planning/phases/phase-99/Phase_Interview.md", "Phase Interview"),
          missingArtifact("planning/phases/phase-99/Phase_Planning.md", "Phase Planning"),
          artifact("planning/phases/phase-99/Work_Card_Plan.md", "Work Card Plan"),
        ],
      },
    })],
    ["operator_phase_approval_required", makeCurrentActionState({
      activePhase: {
        operatorPhaseApproval: missingArtifact("planning/phases/phase-99/Operator_Phase_Approval.md"),
      },
    })],
    ["full_work_card_creation_required", makeCurrentActionState()],
    ["operator_work_card_review_required", makeCurrentActionState({
      activePhase: {
        workCards: [workCard({ status: "ready_for_operator_review" })],
      },
    })],
    ["implementer_handoff_required", makeCurrentActionState({
      activePhase: {
        workCards: [workCard({ status: "implementer_handoff_required" })],
      },
    })],
    ["implementer_report_required", makeCurrentActionState({
      activePhase: {
        workCards: [workCard({ status: "ready_for_implementer" })],
      },
    })],
    ["architect_review_of_implementer_report_required", makeCurrentActionState({
      activePhase: {
        workCards: [
          workCard({
            status: "ready_for_implementer",
            implementerReport: artifact("planning/phases/phase-99/Builder_Reports/BUILDER_REPORT_WC01_test.md", "Implementer Report"),
          }),
        ],
      },
    })],
    ["operator_validation_required", makeCurrentActionState({
      activePhase: {
        workCards: [
          workCard({
            status: "ready_for_implementer",
            implementerReport: artifact("planning/phases/phase-99/Builder_Reports/BUILDER_REPORT_WC01_test.md", "Implementer Report"),
            architectReview: {
              status: "Ready for Operator Validation",
              sourceArtifact: artifact("planning/phases/phase-99/Architect_Reviews/ARCHITECT_REVIEW_WC01_test.md", "Architect Review"),
            },
          }),
        ],
      },
    })],
    ["architect_review_of_validation_report_required", makeCurrentActionState({
      activePhase: {
        workCards: [
          workCard({
            implementerReport: artifact("planning/phases/phase-99/Builder_Reports/BUILDER_REPORT_WC01_test.md", "Implementer Report"),
            architectReview: {
              status: "Ready for Operator Validation",
              sourceArtifact: artifact("planning/phases/phase-99/Architect_Reviews/ARCHITECT_REVIEW_WC01_test.md", "Architect Review"),
            },
            validation: validation("Partial", pendingArchitectDisposition, false, {
              architectDispositionPending: true,
              legacyOperatorDecision: "Partial - repair or follow-up needed",
            }),
          }),
        ],
      },
    })],
    ["operator_validation_required", makeCurrentActionState({
      activePhase: {
        workCards: [
          workCard({
            implementerReport: artifact("planning/phases/phase-99/Builder_Reports/BUILDER_REPORT_WC01_test.md", "Implementer Report"),
            architectReview: {
              status: "Ready for Operator Validation",
              sourceArtifact: artifact("planning/phases/phase-99/Architect_Reviews/ARCHITECT_REVIEW_WC01_test.md", "Architect Review"),
            },
            validation: validation(
              "Fail",
              "Failed - repair needed",
              false,
              { routeBlocked: true },
            ),
          }),
        ],
      },
    })],
    ["repair_sub_card_creation_required", makeCurrentActionState({
      activePhase: {
        workCards: [
          workCard({
            validation: validation("Fail", "Failed - repair needed", true),
          }),
        ],
      },
    })],
    ["repair_implementer_handoff_required", makeCurrentActionState({
      activePhase: {
        workCards: [
          workCard({
            validation: validation("Fail", "Failed - repair needed", true),
            repair: {
              repairId: "WC01-REPAIR01",
              repairPrompt: artifact("planning/phases/phase-99/Repair_Prompts/REPAIR_PROMPT_WC01_test.md", "Repair Prompt"),
            },
          }),
        ],
      },
    })],
    ["repair_validation_required", makeCurrentActionState({
      activePhase: {
        workCards: [
          workCard({
            validation: validation("Fail", "Failed - repair needed", true),
            repair: {
              repairId: "WC01-REPAIR01",
              repairPrompt: artifact("planning/phases/phase-99/Repair_Prompts/REPAIR_PROMPT_WC01_test.md", "Repair Prompt"),
              implementerReport: artifact("planning/phases/phase-99/Builder_Reports/BUILDER_REPORT_WC01-REPAIR01_test.md", "Repair Implementer Report"),
            },
          }),
        ],
      },
    })],
    ["phase_closeout_required", makeCurrentActionState({
      activePhase: {
        workCards: [workCard({ validation: validation("Pass", "Passed - proceed", false) })],
      },
    })],
    ["operator_phase_closeout_approval_required", makeCurrentActionState({
      activePhase: {
        workCards: [workCard({ validation: validation("Pass", "Passed - proceed", false) })],
        closeout: {
          sourceArtifact: artifact("planning/phases/phase-99/Closeout_Reports/CLOSEOUT_REPORT_phase-99_phase_closeout.md", "Phase Closeout"),
          operatorApproved: false,
        },
      },
    })],
    ["roadmap_update_required", makeCurrentActionState({
      activePhase: {
        workCards: [workCard({ validation: validation("Pass", "Passed - proceed", false) })],
        closeout: {
          sourceArtifact: artifact("planning/phases/phase-99/Closeout_Reports/CLOSEOUT_REPORT_phase-99_phase_closeout.md", "Phase Closeout"),
          operatorApproved: true,
        },
      },
    })],
    ["next_phase_activation_required", makeCurrentActionState({
      activePhase: {
        workCards: [workCard({ validation: validation("Pass", "Passed - proceed", false) })],
        closeout: {
          sourceArtifact: artifact("planning/phases/phase-99/Closeout_Reports/CLOSEOUT_REPORT_phase-99_phase_closeout.md", "Phase Closeout"),
          operatorApproved: true,
        },
        roadmapUpdatedAfterCloseout: true,
      },
    })],
    ["project_complete", makeCurrentActionState({
      project: { isComplete: true },
    })],
  ];

  for (const [expectedId, state] of scenarios) {
    const action = evaluateCurrentRequiredAction(state);

    if (action.id !== expectedId) {
      console.error(`Current-action scenario expected ${expectedId}, got ${action.id}.`);
      process.exit(1);
    }
  }

  const unresolvedArchitectDispositions = [
    "Repair required before Operator validation",
    "Blocked / incomplete",
  ];

  for (const decision of unresolvedArchitectDispositions) {
    const action = evaluateCurrentRequiredAction(
      makeCurrentActionState({
        activePhase: {
          workCardCandidates: [
            {
              workCardId: "WC01",
              title: "Fixture Work Card",
              order: 1,
              status: "completed",
              sourceArtifact: artifact("planning/phases/phase-99/Work_Card_Plan.md", "Mapped Work Card candidate"),
            },
            {
              workCardId: "WC02",
              title: "Next Fixture Work Card",
              order: 2,
              status: "planned",
              sourceArtifact: artifact("planning/phases/phase-99/Work_Card_Plan.md", "Mapped Work Card candidate"),
            },
          ],
          workCards: [
            workCard({
              status: "completed",
              implementerReport: artifact("planning/phases/phase-99/Builder_Reports/BUILDER_REPORT_WC01_test.md", "Implementer Report"),
              architectReview: {
                status: "Ready for Operator Validation",
                sourceArtifact: artifact("planning/phases/phase-99/Architect_Reviews/ARCHITECT_REVIEW_WC01_test.md", "Architect Review"),
              },
              validation: validation("Pass", decision, decision === "Repair required"),
              repair: {
                repairId: "WC01-REPAIR01",
                repairWorkCard: artifact("planning/phases/phase-99/Work_Cards/WC01-REPAIR01_test.md", "Repair Work Card"),
                implementerReport: artifact("planning/phases/phase-99/Builder_Reports/BUILDER_REPORT_WC01-REPAIR01_test.md", "Repair Implementer Report"),
              },
            }),
          ],
        },
      }),
    );

    if (
      action.id !== "repair_validation_required" ||
      action.workCardId !== "WC01-REPAIR01"
    ) {
      console.error(
        `Architect disposition ${decision} should keep WC01 on repair validation, got ${action.workCardId ?? "none"}/${action.id}.`,
      );
      process.exit(1);
    }

    if (
      !action.sourceArtifacts.some((source) =>
        source.path.includes("/Validation_Reports/VALIDATION_REPORT_WC01_"),
      )
    ) {
      console.error(
        `Architect disposition ${decision} repair validation should retain the failed parent Validation Report as source evidence. Sources: ${action.sourceArtifacts.map((source) => source.path).join(", ")}`,
      );
      process.exit(1);
    }
  }

  const passingDecisionOverrideAction = evaluateCurrentRequiredAction(
    makeCurrentActionState({
      activePhase: {
        workCardCandidates: [
          {
            workCardId: "WC01",
            title: "Fixture Work Card",
            order: 1,
            status: "planned",
            sourceArtifact: artifact("planning/phases/phase-99/Work_Card_Plan.md", "Mapped Work Card candidate"),
          },
          {
            workCardId: "WC02",
            title: "Next Fixture Work Card",
            order: 2,
            status: "planned",
            sourceArtifact: artifact("planning/phases/phase-99/Work_Card_Plan.md", "Mapped Work Card candidate"),
          },
        ],
        workCards: [
          workCard({
            validation: validation("Fail", "Mergeable", false),
          }),
        ],
      },
    }),
  );

  if (
    passingDecisionOverrideAction.id !== "full_work_card_creation_required" ||
    passingDecisionOverrideAction.workCardId !== "WC02"
  ) {
    console.error(
      "A final mergeable Architect disposition should override a conflicting raw failure and resolve WC01.",
    );
    process.exit(1);
  }

  const legacyOperatorAdvisoryAction = evaluateCurrentRequiredAction(
    makeCurrentActionState({
      activePhase: {
        workCardCandidates: [
          {
            workCardId: "WC01",
            title: "Fixture Work Card",
            order: 1,
            status: "planned",
            sourceArtifact: artifact("planning/phases/phase-99/Work_Card_Plan.md", "Mapped Work Card candidate"),
          },
          {
            workCardId: "WC02",
            title: "Next Fixture Work Card",
            order: 2,
            status: "planned",
            sourceArtifact: artifact("planning/phases/phase-99/Work_Card_Plan.md", "Mapped Work Card candidate"),
          },
        ],
        workCards: [
          workCard({
            validation: validation("Pass", undefined, false, {
              legacyOperatorDecision: "Failed - repair needed",
            }),
          }),
        ],
      },
    }),
  );

  if (
    legacyOperatorAdvisoryAction.id !== "full_work_card_creation_required" ||
    legacyOperatorAdvisoryAction.workCardId !== "WC02"
  ) {
    console.error(
      "Legacy Operator Decision incorrectly controlled current-action routing.",
    );
    process.exit(1);
  }

  const warningAction = evaluateCurrentRequiredAction(
    makeCurrentActionState({
      warnings: [
        {
          code: "missing_stale_validation_target",
          message: "A stale Validation_Targets reference is missing.",
          severity: "warning",
          sourceArtifactPath: "planning/phases/phase-03/Validation_Reports/example.md",
        },
      ],
    }),
  );

  if (
    !warningAction.warnings.some(
      (warning) => warning.code === "missing_stale_validation_target",
    )
  ) {
    console.error("Current-action warnings did not preserve stale target references.");
    process.exit(1);
  }

  if (skipLiveRepositoryCheck) {
    return;
  }

  const liveCurrentAction = await getCurrentRequiredAction();

  if (!liveCurrentAction.ok || !liveCurrentAction.currentAction) {
    console.error("Live current required action evaluation failed.");
    process.exit(1);
  }

  if (liveCurrentAction.currentAction.phaseId !== "phase-03") {
    console.error("Live current required action did not route to Phase 03.");
    process.exit(1);
  }

  const allowedLiveActionsByWorkCard = {
    WC02: [
      "implementer_report_required",
      "architect_review_of_implementer_report_required",
      "operator_validation_required",
    ],
    WC03: [
      "implementer_report_required",
      "architect_review_of_implementer_report_required",
      "operator_validation_required",
    ],
    WC04: [
      "implementer_report_required",
      "architect_review_of_implementer_report_required",
      "operator_validation_required",
    ],
    "WC04-REPAIR01": [
      "repair_validation_required",
    ],
    WC05: [
      "implementer_report_required",
      "architect_review_of_implementer_report_required",
      "operator_validation_required",
    ],
    WC06: [
      "operator_validation_required",
    ],
    WC07: [
      "implementer_report_required",
      "architect_review_of_implementer_report_required",
      "operator_validation_required",
    ],
    "WC07-REPAIR01": [
      "repair_implementer_handoff_required",
      "repair_validation_required",
    ],
    WC08: [
      "implementer_report_required",
      "architect_review_of_implementer_report_required",
      "operator_validation_required",
    ],
  };
  const liveWorkCardId = liveCurrentAction.currentAction.workCardId;

  if (!liveWorkCardId || !allowedLiveActionsByWorkCard[liveWorkCardId]) {
    console.error(
      `Live current required action should route to an active Phase 03 Work Card, got ${liveWorkCardId ?? "none"}.`,
    );
    process.exit(1);
  }

  if (
    !allowedLiveActionsByWorkCard[liveWorkCardId].includes(
      liveCurrentAction.currentAction.id,
    )
  ) {
    console.error(
      `Live ${liveWorkCardId} current action has unexpected state ${liveCurrentAction.currentAction.id}.`,
    );
    process.exit(1);
  }
}

function makeCurrentActionState(overrides = {}) {
  const project = {
    projectIntake: artifact("planning/project/Project_Intake/PROJECT_INTAKE_test.md", "Project Intake"),
    projectInterview: artifact("planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_test.md", "Project Interview"),
    reconciliationReview: artifact("planning/project/Repository_Reconciliation/REPOSITORY_RECONCILIATION_test.md", "Reconciliation Review"),
    projectRoadmap: artifact("planning/project/Project_Roadmap/PROJECT_ROADMAP_test.md", "Living Roadmap"),
    phaseMap: artifact("planning/project/Phase_Map/PHASE_MAP_test.md", "Phase Map"),
    operatorProjectApproval: artifact("planning/project/OPERATOR_PROJECT_APPROVAL.md", "Operator Project Approval"),
    projectApprovalSatisfiedByPhaseActivation: true,
    ...(overrides.project ?? {}),
  };
  const activePhaseOverride = overrides.activePhase;
  const activePhase =
    activePhaseOverride === undefined && "activePhase" in overrides
      ? undefined
      : {
          phaseId: "phase-99",
          phaseTitle: "Fixture Phase",
          sourceArtifacts: [
            artifact("planning/phases/phase-99/Phase_Interview.md", "Phase Interview"),
            artifact("planning/phases/phase-99/Phase_Planning.md", "Phase Planning"),
            artifact("planning/phases/phase-99/Work_Card_Plan.md", "Work Card Plan"),
          ],
          operatorPhaseApproval: artifact("planning/phases/phase-99/Operator_Phase_Approval.md", "Operator Phase Approval"),
          workCardCandidates: [
            {
              workCardId: "WC01",
              title: "Fixture Work Card",
              order: 1,
              status: "planned",
              sourceArtifact: artifact("planning/phases/phase-99/Work_Card_Plan.md", "Mapped Work Card candidate"),
            },
          ],
          workCards: [],
          ...(activePhaseOverride ?? {}),
        };

  return {
    project,
    activePhase,
    warnings: overrides.warnings ?? [],
  };
}

function artifact(path, role = "Fixture artifact", status = "available") {
  return {
    path,
    role,
    status,
    exists: true,
  };
}

function missingArtifact(path, role = "Missing fixture artifact") {
  return {
    path,
    role,
    exists: false,
  };
}

function workCard(overrides = {}) {
  return {
    workCardId: "WC01",
    title: "Fixture Work Card",
    phaseId: "phase-99",
    status: "ready_for_implementer",
    sourceArtifacts: [
      artifact("planning/phases/phase-99/Work_Cards/WC01_fixture_work_card.md", "Work Card Markdown"),
    ],
    ...overrides,
  };
}

function validation(result, decision, repairRequired, overrides = {}) {
  return {
    result,
    decision,
    repairRequired,
    sourceArtifacts: [
      artifact("planning/phases/phase-99/Validation_Reports/VALIDATION_REPORT_WC01_fixture_work_card.md", "Validation Report"),
    ],
    ...overrides,
  };
}

function assertFixtureArtifact(fixture, renderedFixturePath) {
  const validation = validateWorkCard(fixture);

  if (!validation.valid) {
    console.error(`Work Card fixture ${fixture.workCardId} validation failed:`);
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const markdown = renderWorkCardMarkdown(fixture);
  const requiredHeadings = [
    `# Work Card: ${fixture.title}`,
    ...workCardMarkdownHeadings,
  ];
  const missingHeadings = requiredHeadings.filter(
    (heading) => !markdown.includes(heading),
  );

  if (missingHeadings.length > 0) {
    console.error(
      `Rendered Work Card Markdown for ${fixture.workCardId} is missing required headings:`,
    );
    for (const heading of missingHeadings) {
      console.error(`- ${heading}`);
    }
    process.exit(1);
  }

  const checkedInMarkdown = readFileSync(renderedFixturePath, "utf8");

  if (checkedInMarkdown !== markdown) {
    console.error(
      `Checked-in ${fixture.workCardId} Markdown does not match the renderer output.`,
    );
    process.exit(1);
  }
}

function assertCheckedInJsonArtifacts(workCardsDirectory) {
  const jsonFileNames = readdirSync(workCardsDirectory)
    .filter((fileName) => fileName.toLowerCase().endsWith(".json"))
    .sort();

  if (jsonFileNames.length === 0) {
    console.error("No checked-in Work Card JSON artifacts were found.");
    process.exit(1);
  }

  for (const fileName of jsonFileNames) {
    const jsonPath = resolve(workCardsDirectory, fileName);
    const markdownPath = resolve(
      workCardsDirectory,
      fileName.replace(/\.json$/i, ".md"),
    );

    let parsed;

    try {
      parsed = JSON.parse(readFileSync(jsonPath, "utf8"));
    } catch (error) {
      console.error(`Checked-in Work Card JSON could not be parsed: ${fileName}`);
      console.error(error);
      process.exit(1);
    }

    const validation = validateWorkCard(parsed);

    if (!validation.valid) {
      console.error(`Checked-in Work Card JSON ${fileName} validation failed:`);
      for (const error of validation.errors) {
        console.error(`- ${error}`);
      }
      process.exit(1);
    }

    if (!existsSync(markdownPath)) {
      console.error(
        `Checked-in Work Card JSON ${fileName} does not have a matching Markdown artifact.`,
      );
      process.exit(1);
    }

    const markdown = renderWorkCardMarkdown(parsed);
    const requiredHeadings = [`# Work Card: ${parsed.title}`, ...workCardMarkdownHeadings];
    const missingHeadings = requiredHeadings.filter(
      (heading) => !markdown.includes(heading),
    );

    if (missingHeadings.length > 0) {
      console.error(
        `Rendered checked-in Work Card Markdown for ${fileName} is missing required headings:`,
      );
      for (const heading of missingHeadings) {
        console.error(`- ${heading}`);
      }
      process.exit(1);
    }

    const checkedInMarkdown = readFileSync(markdownPath, "utf8");

    if (checkedInMarkdown !== markdown) {
      console.error(
        `Checked-in Work Card JSON ${fileName} does not render to its matching Markdown artifact.`,
      );
      process.exit(1);
    }
  }
}

function assertArchitectPrompt(fixture) {
  const prompt = renderArchitectFramingPrompt(fixture);
  const requiredText = [
    fixture.workCardId,
    fixture.title,
    "Ask only clarifying questions that are necessary",
    "Provide recommended defaults",
    finalBuilderPromptBoundary,
  ];
  const missingText = requiredText.filter((text) => !prompt.includes(text));

  if (missingText.length > 0) {
    console.error("Architect framing prompt is missing required text:");
    for (const text of missingText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }
}

function assertRiskRouter() {
  const highRiskCases = [
    {
      category: "Secrets or credentials",
      text: "Use an API key, secret token, and credentials in the workflow.",
    },
    {
      category: "Authentication or authorization",
      text: "Add authentication, authorization, and login behavior.",
    },
    {
      category: "Filesystem writes outside approved planning paths",
      text: "Allow arbitrary filesystem writes outside approved planning folders.",
    },
    {
      category: "Database or migration changes",
      text: "Run a database migration that changes SQL tables.",
    },
    {
      category: "Cloud, deployment, or infrastructure changes",
      text: "Update cloud deployment, hosting, and infrastructure settings.",
    },
    {
      category: "External API/provider integration",
      text: "Add an OpenAI provider SDK and external API integration.",
    },
    {
      category: "MCP or connector integration",
      text: "Add MCP connector integration for saved Work Cards.",
    },
    {
      category: "Payment, billing, or account deletion",
      text: "Change Stripe payment, billing, refund, and account deletion behavior.",
    },
    {
      category: "Security policy changes",
      text: "Change the security policy and content security policy.",
    },
    {
      category: "Destructive Git/GitHub actions",
      text: "Run git reset --hard and force push the branch.",
    },
    {
      category: "Large dependency upgrades or audit fixes",
      text: "Run npm audit fix and upgrade dependencies across the app.",
    },
    {
      category: "Broad refactors",
      text: "Perform a broad refactor and rewrite the architecture.",
    },
  ];

  highRiskCases.forEach((riskCase, index) => {
    const review = routeWorkCardRisk(
      makeWorkCard({
        workCardId: `WCRISK${index + 1}`,
        title: riskCase.category,
        problem: riskCase.text,
        scope: [riskCase.text],
      }),
    );

    if (review.assessedRiskLevel !== "high") {
      console.error(`${riskCase.category} was not classified as high risk.`);
      process.exit(1);
    }

    if (
      !review.flaggedCategories.some(
        (flag) => flag.category === riskCase.category,
      )
    ) {
      console.error(`${riskCase.category} was not flagged by the risk router.`);
      process.exit(1);
    }
  });

  const scopeCreepReview = routeWorkCardRisk(
    makeWorkCard({
      workCardId: "WCSCOPE",
      title: "Scope creep sample",
      problem:
        "Combine a UI redesign with a database migration and cloud deployment work.",
      scope: [
        "UI redesign",
        "Database migration",
        "Cloud deployment",
      ],
    }),
  );

  if (scopeCreepReview.scopeCreepSignals.length === 0) {
    console.error("Risk router did not detect a simple scope-creep combination.");
    process.exit(1);
  }

  const lowRiskReview = routeWorkCardRisk(
    makeWorkCard({
      workCardId: "WCLOW",
      title: "Update planning note",
      riskLevel: "low",
      problem: "Make a documentation-only Markdown planning note update.",
      goal: "Tighten prompt wording in a report update.",
      userOutcome: "The Operator can read clearer documentation.",
      scope: ["Update Markdown wording."],
      requirements: ["Keep this to documentation-only copy edits."],
      acceptanceCriteria: ["The Markdown note is easier to read."],
      validationPlan: ["Read the Markdown note."],
      risks: ["Wording could still need Architect review."],
      builderInstructions: ["Keep the update documentation-only."],
      operatorNotes: ["Documentation-only note."],
    }),
  );

  if (lowRiskReview.assessedRiskLevel !== "low") {
    console.error("Documentation-only Work Card was not classified as low risk.");
    process.exit(1);
  }

  const lowRiskMarkdown = renderRiskReviewMarkdown(
    makeWorkCard({
      workCardId: "WCLOW",
      title: "Update planning note",
      riskLevel: "low",
      problem: "Make a documentation-only Markdown planning note update.",
      goal: "Tighten prompt wording in a report update.",
      userOutcome: "The Operator can read clearer documentation.",
      scope: ["Update Markdown wording."],
      requirements: ["Keep this to documentation-only copy edits."],
      acceptanceCriteria: ["The Markdown note is easier to read."],
      validationPlan: ["Read the Markdown note."],
      risks: ["Wording could still need Architect review."],
      builderInstructions: ["Keep the update documentation-only."],
      operatorNotes: ["Documentation-only note."],
    }),
    lowRiskReview,
    "2026-06-29T00:00:00.000Z",
  );

  if (!lowRiskMarkdown.includes("Normal Architect review is still required")) {
    console.error("Low-risk Markdown does not require normal Architect review.");
    process.exit(1);
  }

  if (/auto-approve|automatically approved|approved for (Builder|Implementer)/i.test(lowRiskMarkdown)) {
    console.error("Low-risk Markdown implies automatic approval.");
    process.exit(1);
  }
}

function assertRiskReviewMarkdown() {
  const highRiskWorkCard = makeWorkCard({
    workCardId: "WCREVIEW",
    title: "Review secrets",
    problem: "Handle an API key and secret token.",
    scope: ["Check credential handling."],
  });
  const review = routeWorkCardRisk(highRiskWorkCard);
  const markdown = renderRiskReviewMarkdown(
    highRiskWorkCard,
    review,
    "2026-06-29T00:00:00.000Z",
  );

  const requiredText = [
    "- Assessed risk level: high",
    "## Flagged Categories",
    "Secrets or credentials",
    "## Architect Review Questions",
    "Does this Work Card need access to secrets or credentials, and can that be avoided?",
    riskReviewNoApprovalNote,
    "does not modify or approve",
  ];
  const missingText = requiredText.filter((text) => !markdown.includes(text));

  if (missingText.length > 0) {
    console.error("Risk Review Markdown is missing required text:");
    for (const text of missingText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const expectedFileName = "RISK_REVIEW_WC04_add_risk_router.md";

  if (buildRiskReviewFileName(workCardRiskRouterFixture) !== expectedFileName) {
    console.error("Risk Review filename builder returned the wrong filename.");
    process.exit(1);
  }
}

function assertBuilderPrompt() {
  const noRiskReviewPrompt = renderBuilderPrompt(workCardBuilderPromptFixture);
  const requiredNoRiskText = [
    workCardBuilderPromptFixture.workCardId,
    workCardBuilderPromptFixture.title,
    "<PROJECT_REPO>",
    "You are acting as Implementer for ChampCity A/I.",
    "The Implementer may be Codex, Claude Code, Cursor, or another coding agent.",
    "git status --short --branch",
    "git remote -v",
    "Implementer Report Requirement",
    "## Architect Review Instructions",
    "## Architect Review Decision",
    "## Observation Register Impact",
    "## Operator Validation Steps",
    "BUILDER_REPORT_WC05_generate_builder_prompt.md",
    "Do not push unless explicitly instructed.",
    "Do not create a release tag unless explicitly instructed.",
    "Do not call an LLM API unless explicitly in scope.",
    "Do not broaden scope.",
    builderPromptNoRiskReviewWarning,
    ...standardBuilderValidationCommands,
  ];
  const missingNoRiskText = requiredNoRiskText.filter(
    (text) => !noRiskReviewPrompt.includes(text),
  );

  if (missingNoRiskText.length > 0) {
    console.error("Implementer prompt without Risk Review is missing required text:");
    for (const text of missingNoRiskText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const highRiskPrompt = renderBuilderPrompt(workCardBuilderPromptFixture, {
    riskReview: {
      fileName: "RISK_REVIEW_WC05_generate_builder_prompt.md",
      content:
        "- Assessed risk level: high\nThis Work Card appears high risk and needs Architect review.",
    },
  });
  const requiredHighRiskText = [
    builderPromptHighRiskWarning,
    "Selected Risk Review Context",
    "RISK_REVIEW_WC05_generate_builder_prompt.md",
  ];
  const missingHighRiskText = requiredHighRiskText.filter(
    (text) => !highRiskPrompt.includes(text),
  );

  if (missingHighRiskText.length > 0) {
    console.error("Implementer prompt with high-risk Risk Review is missing required text:");
    for (const text of missingHighRiskText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const expectedFileName = "BUILDER_PROMPT_WC05_generate_builder_prompt.md";

  if (buildBuilderPromptFileName(workCardBuilderPromptFixture) !== expectedFileName) {
    console.error("Builder Prompt filename builder returned the wrong filename.");
    process.exit(1);
  }
}

async function assertBuilderReportCapture() {
  const completeReport = [
    "# Builder Report - WC06 Capture Builder Report",
    "",
    "## Repository Path Inspected",
    "Current working directory inspected: verified approved repo root",
    "",
    "## Git Branch And Remote Status",
    "Current branch: master. git remote -v confirmed origin.",
    "",
    "## Files Created",
    "- planning/phases/phase-01/Work_Cards/WC06_capture_builder_report.json",
    "",
    "## Files Modified",
    "- src/renderer/app/App.tsx",
    "",
    "## Files Intentionally Not Created",
    "- No report index was created.",
    "",
    "## Commands Run And Results",
    "- npm run typecheck - passed",
    "",
    "## Validation Performed",
    "- npm run build - passed",
    "",
    "## Validation Skipped And Reason",
    "- Manual Electron UI validation was skipped because this is an automated script.",
    "",
    "## Git Actions Performed",
    "- Commit hash: abc1234",
    "",
    "## Security/Secret-Safety Notes",
    "- No secrets were stored.",
    "",
    "## Blocking Questions",
    "None.",
    "",
    "## Recommended Next Builder Task",
    "Operator should manually validate the screen.",
    "",
    "## Architect Review Instructions",
    "The Architect must not rely only on this report's claims.",
    "Ready for Operator validation requires Operator Validation Steps.",
    "Observation Register impact must be assessed.",
  ].join("\n");
  const completeValidation = validateBuilderReport(completeReport);

  if (!completeValidation.validEnoughToSave) {
    console.error("Complete Builder Report was not valid enough to save.");
    process.exit(1);
  }

  const completeMissingSignals = Object.entries(completeValidation.detected)
    .filter(([_key, value]) => !value)
    .map(([key]) => key);

  if (completeMissingSignals.length > 0) {
    console.error(
      `Complete Builder Report did not detect expected signals: ${completeMissingSignals.join(", ")}.`,
    );
    process.exit(1);
  }

  const imperfectReport = [
    "# Builder Report - quick note",
    "",
    "## Repository Path Inspected",
    "Checked verified approved repo root.",
  ].join("\n");
  const imperfectValidation = validateBuilderReport(imperfectReport);

  if (!imperfectValidation.validEnoughToSave) {
    console.error("Imperfect non-empty Builder Report should still be valid enough to save.");
    process.exit(1);
  }

  if (imperfectValidation.warnings.length === 0) {
    console.error("Imperfect Builder Report did not return warnings.");
    process.exit(1);
  }

  if (validateBuilderReport("").validEnoughToSave) {
    console.error("Empty Builder Report text should not be valid enough to save.");
    process.exit(1);
  }

  const detectionReport = [
    "# Builder Report",
    "Commit hash: 1a2b3c4d",
    "npm run test:work-cards - passed",
    "## Blocking Questions",
    "No blockers.",
    "## Recommended Next Builder Task",
    "Manual validation.",
  ].join("\n");
  const detectionValidation = validateBuilderReport(detectionReport);

  if (!detectionValidation.detected.hasCommitHash) {
    console.error("Builder Report commit hash detection failed.");
    process.exit(1);
  }

  if (!detectionValidation.detected.hasValidationResults) {
    console.error("Builder Report validation results detection failed.");
    process.exit(1);
  }

  if (!detectionValidation.detected.hasBlockingQuestions) {
    console.error("Builder Report blocking question detection failed.");
    process.exit(1);
  }

  if (!detectionValidation.detected.hasRecommendedNextTask) {
    console.error("Builder Report recommended next task detection failed.");
    process.exit(1);
  }

  const expectedFileNames = [
    {
      input: {
        reportType: "Work Card",
        workCardId: "WC06",
        workCardTitle: "Capture Builder Report",
        topic: "Capture Builder Report",
      },
      fileName: "BUILDER_REPORT_WC06_capture_builder_report.md",
    },
    {
      input: {
        reportType: "Fix",
        topic: "FIX07 save button issue",
      },
      fileName: "BUILDER_REPORT_FIX07_save_button_issue.md",
    },
    {
      input: {
        reportType: "Fix",
        topic: "config issue",
      },
      fileName: "BUILDER_REPORT_FIX_config_issue.md",
    },
    {
      input: {
        reportType: "Repair",
        workCardId: "WC06",
        topic: "capture builder report save issue",
      },
      fileName: "BUILDER_REPORT_REPAIR_WC06_capture_builder_report_save_issue.md",
    },
    {
      input: {
        reportType: "Repair",
        topic: "artifact backfill",
      },
      fileName: "BUILDER_REPORT_REPAIR_artifact_backfill.md",
    },
    {
      input: {
        reportType: "Other",
        topic: "planning note",
      },
      fileName: "BUILDER_REPORT_OTHER_planning_note.md",
    },
  ];

  for (const expected of expectedFileNames) {
    const actual = buildBuilderReportFileName(expected.input);

    if (actual !== expected.fileName) {
      console.error(
        `Builder Report filename generation returned ${actual}; expected ${expected.fileName}.`,
      );
      process.exit(1);
    }
  }

  if (validateBuilderReportTopic("../bad").length === 0) {
    console.error("Builder Report topic sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  try {
    buildBuilderReportFileName({
      reportType: "Other",
      topic: "../bad",
    });
    console.error("Builder Report filename builder failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  try {
    buildBuilderReportFileName({
      reportType: "Work Card",
      workCardId: "WC06",
      topic: "../bad",
    });
    console.error("Work Card Builder Report filename builder failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  try {
    validateBuilderReportMarkdownFileName("../bad.md");
    console.error("Builder Report filename sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  const loadedReport = await loadBuilderReportFile({
    phase: "phase-02",
    fileName: "BUILDER_REPORT_WC02_add_project_architect_interview_prompt_generator.md",
  });

  if (!loadedReport.ok || !loadedReport.content?.includes("WC02")) {
    console.error("Saved WC02 Implementer Report could not be loaded through the file-store API.");
    process.exit(1);
  }

  const reportSource = [
    readFileSync(rendererAppPath, "utf8"),
    readFileSync(preloadPath, "utf8"),
    readFileSync(mainWorkCardFileStorePath, "utf8"),
  ].join("\n");
  const requiredReportImportSource = [
    "loadBuilderReportFile",
    "Saved Implementer Report",
    "Implementer Report text imported.",
    "workCards:loadBuilderReportFile",
  ];
  const missingReportImportSource = requiredReportImportSource.filter(
    (text) => !reportSource.includes(text),
  );

  if (missingReportImportSource.length > 0) {
    console.error("Implementer Report import source wiring is missing required text:");
    for (const text of missingReportImportSource) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }
}

function assertPhaseCloseout() {
  const filesByFolder = createEmptyPhaseArtifactFiles();

  filesByFolder.Work_Cards = [
    "WC01_define_work_card_schema_and_markdown_renderer.json",
    "WC01_define_work_card_schema_and_markdown_renderer.md",
    "WC02_build_new_work_card_capture_form.json",
    "WC03_add_architect_framing_prompt_composer.md",
  ];
  filesByFolder.Builder_Reports = [
    "BUILDER_REPORT_WC01_work_card_schema_renderer.md",
  ];
  filesByFolder.Repair_Prompts = [
    "REPAIR_PROMPT_WC02_build_new_work_card_capture_form.md",
  ];

  const incompleteSummary = summarizePhaseArtifacts({
    phase: "phase-01",
    filesByFolder,
  });

  const missingFolders = phaseArtifactFolderNames.filter(
    (folder) => typeof incompleteSummary.artifactCounts[folder] !== "number",
  );

  if (
    incompleteSummary.folders.length !== phaseArtifactFolderNames.length ||
    missingFolders.length > 0
  ) {
    console.error("Phase artifact summary did not include expected folders.");
    process.exit(1);
  }

  if (incompleteSummary.artifactCounts.Work_Cards !== 4) {
    console.error("Phase artifact summary returned the wrong Work_Cards count.");
    process.exit(1);
  }

  if (incompleteSummary.workCardsWithBothJsonAndMarkdown.length !== 1) {
    console.error("Work Card pairing did not detect the paired WC01 artifacts.");
    process.exit(1);
  }

  if (!incompleteSummary.workCardsMissingMarkdown.some((pair) => pair.workCardId === "WC02")) {
    console.error("Work Card pairing did not detect missing Markdown.");
    process.exit(1);
  }

  if (!incompleteSummary.workCardsMissingJson.some((pair) => pair.workCardId === "WC03")) {
    console.error("Work Card pairing did not detect missing JSON.");
    process.exit(1);
  }

  if (
    !incompleteSummary.deterministicRecommendation.includes(
      "Phase has missing Work Card JSON/Markdown pairs. Repair before closeout.",
    )
  ) {
    console.error("Phase closeout recommendation did not warn about missing Work Card pairs.");
    process.exit(1);
  }

  if (
    !incompleteSummary.deterministicRecommendation.includes(
      "Phase has repair prompts. Review repairs before closing.",
    )
  ) {
    console.error("Phase closeout recommendation did not warn about repair prompts.");
    process.exit(1);
  }

  const completeFilesByFolder = createEmptyPhaseArtifactFiles();

  for (let index = 1; index <= 10; index += 1) {
    const workCardId = `WC${String(index).padStart(2, "0")}`;
    completeFilesByFolder.Work_Cards.push(`${workCardId}_sample.json`);
    completeFilesByFolder.Work_Cards.push(`${workCardId}_sample.md`);
    completeFilesByFolder.Builder_Reports.push(
      `BUILDER_REPORT_${workCardId}_sample.md`,
    );
  }

  completeFilesByFolder.Validation_Reports = [
    "VALIDATION_REPORT_WC07_human_validation_and_repair_loop.json",
    "VALIDATION_REPORT_WC07_human_validation_and_repair_loop.md",
  ];

  const completeSummary = summarizePhaseArtifacts({
    phase: "phase-01",
    filesByFolder: completeFilesByFolder,
  });
  const record = buildPhaseCloseoutRecord(
    {
      phase: "phase-01",
      decision: "Ready for release/package pass",
      nextPhaseActivationDecision: "Keep next phase inactive",
      nextPhaseActivationNotes:
        "Phase 02 / Phase 03 activation remains Operator-owned.",
      closeoutSummary: "Phase 1 artifacts have been reviewed for closeout.",
      completedItems: "WC01 through WC08 foundation workflows.",
      remainingItems: "Manual UI validation and release/package readiness planning.",
      knownRisks: "Manual validation evidence still requires Operator review.",
      operatorNotes: "Closeout record is non-mutating.",
      recommendedNextAction: "Run manual validation, then plan release/package readiness.",
    },
    completeSummary,
    "2026-06-29T12:00:00.000Z",
  );
  const validation = validatePhaseCloseoutRecord(record);

  if (!validation.valid) {
    console.error("Phase Closeout record did not validate:");
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const markdown = renderPhaseCloseoutMarkdown(record);
  const requiredCloseoutText = [
    "# Phase Closeout Report - phase-01",
    "## Closeout Decision",
    "Ready for release/package pass",
    "## Next Phase Activation Decision",
    "Keep next phase inactive",
    "## Next Phase Activation Notes",
    "Phase 02 / Phase 03 activation remains Operator-owned.",
    "## Deterministic Recommendation",
    "Phase may be ready for release/package readiness pass.",
    "## Artifact Summary",
    "## Missing Or Warning Observations",
    "## Recommended Next Action",
    phaseCloseoutNonMutatingNote,
  ];
  const missingCloseoutText = requiredCloseoutText.filter(
    (text) => !markdown.includes(text),
  );

  if (missingCloseoutText.length > 0) {
    console.error("Phase Closeout Markdown is missing required text:");
    for (const text of missingCloseoutText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  if (
    buildPhaseCloseoutJsonFileName(record) !==
    "CLOSEOUT_REPORT_phase-01_phase_1_closeout.json"
  ) {
    console.error("Phase Closeout JSON filename generation returned the wrong filename.");
    process.exit(1);
  }

  if (
    buildPhaseCloseoutMarkdownFileName(record) !==
    "CLOSEOUT_REPORT_phase-01_phase_1_closeout.md"
  ) {
    console.error("Phase Closeout Markdown filename generation returned the wrong filename.");
    process.exit(1);
  }

  if (validatePhaseArtifactFileName("../bad", [".md"]).length === 0) {
    console.error("Phase artifact filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (
    validatePhaseArtifactFileName(
      "CLOSEOUT_REPORT_phase-01_phase_1_closeout.json",
      getAllowedPhaseArtifactExtensions("Closeout_Reports"),
    ).length > 0
  ) {
    console.error("Phase artifact filename sanitizer rejected a valid closeout filename.");
    process.exit(1);
  }

  try {
    validatePhaseCloseoutReportFileName("../bad.json");
    console.error("Phase Closeout filename sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }
}

async function assertHumanValidationAndRepair() {
  const baseInput = {
    phase: "phase-01",
    workCardFileName: "WC07_human_validation_and_repair_loop.json",
    validationResult: "Fail",
    testedItems: "Opened the Human Validation screen and attempted a failed save flow.",
    passedItems: "Navigation loaded and Work Card details displayed.",
    failedItems: "Repair prompt preview did not appear.",
    evidenceReferences:
      "Manual note: screenshot path planning/phases/phase-02/Validation_Evidence/WC07/wc07-failure.png",
    screenshotOrFileReferences:
      "planning/phases/phase-02/Validation_Evidence/WC07/wc07-failure.png",
    commandsRun: "npm start",
    observedErrors: "No repair prompt preview was visible.",
    additionalOperatorObservations: "The validation record should remain non-mutating.",
    recommendedNextAction: "Repair the missing prompt preview.",
  };
  const record = buildHumanValidationRecord(
    workCardHumanValidationFixture,
    baseInput,
    "2026-06-29T12:00:00.000Z",
  );
  const validation = validateHumanValidationRecord(record);

  if (!validation.valid) {
    console.error("Human Validation record did not validate:");
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (
    Object.hasOwn(record, "operatorDecision") ||
    record.architectDisposition !== pendingArchitectDisposition
  ) {
    console.error(
      "New Human Validation records must omit Operator Decision and set Architect Disposition pending.",
    );
    process.exit(1);
  }

  const validationMarkdown = renderValidationRecordMarkdown(record);
  const requiredValidationText = [
    "# Human Validation Report - WC07 Human validation and repair loop",
    "## Validation Target",
    "- Validation Target kind: work_card",
    "## Validation Result",
    "## What Was Tested?",
    "## What Passed?",
    "## What Failed?",
    "## Evidence References Or Paths",
    "## Screenshots Or Files Referenced By Path",
    "## Manual Commands Run",
    "## Observed Errors",
    "## Additional Operator Observations",
    "## Operator Suggested Follow-up (Advisory)",
    "## Field Semantics",
    "## Architect Review Instructions",
    "## Architect Disposition",
    "Status: Pending Architect review",
    validationRecordNonMutatingNote,
  ];
  const missingValidationText = requiredValidationText.filter(
    (text) => !validationMarkdown.includes(text),
  );

  if (missingValidationText.length > 0) {
    console.error("Human Validation Markdown is missing required text:");
    for (const text of missingValidationText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const readyReviewLines = architectReviewOutputTemplateLines().filter(
    (line) =>
      ![
        "- Repair required before Operator validation",
        "- Blocked / incomplete",
        "- Out of scope",
      ].includes(line),
  );
  const readyWithoutSteps = validateArchitectReview(readyReviewLines.join("\n"));

  if (readyWithoutSteps.valid || readyWithoutSteps.hasOperatorValidationSteps) {
    console.error(
      "Ready Architect Review without Operator Validation Steps was not rejected.",
    );
    process.exit(1);
  }

  const stepsHeadingIndex = readyReviewLines.indexOf(
    "## Operator Validation Steps",
  );
  readyReviewLines.splice(
    stepsHeadingIndex + 1,
    0,
    "",
    "1. Open the routed validation target and confirm the acceptance criteria.",
  );
  const readyWithSteps = validateArchitectReview(readyReviewLines.join("\n"));

  if (!readyWithSteps.valid || !readyWithSteps.hasOperatorValidationSteps) {
    console.error(
      `Ready Architect Review with Operator Validation Steps failed validation: ${readyWithSteps.errors.join(" ")}`,
    );
    process.exit(1);
  }

  const checklistReport = [
    "# Builder Report - sample",
    "",
    "## Manual Validation Required",
    "",
    "Manual validation should confirm:",
    "",
    "- The app opens.",
    "- Fail validation generates a draft Repair Prompt.",
    "",
    "## Git Actions Performed",
    "None.",
  ].join("\n");
  const checklist = extractManualValidationChecklist(checklistReport);

  if (!checklist.detected || !checklist.text.includes("draft Repair Prompt")) {
    console.error("Manual validation checklist extraction failed.");
    process.exit(1);
  }

  if (extractManualValidationChecklist("# Report\nNo checklist.").detected) {
    console.error("Checklist extraction should not detect unrelated text.");
    process.exit(1);
  }

  const noReportPreview = await previewHumanValidationRecord(baseInput);

  if (!noReportPreview.ok) {
    console.error("Human Validation preview without Builder Report failed.");
    process.exit(1);
  }

  if (noReportPreview.builderReportWarning !== noBuilderReportSelectedWarning) {
    console.error("Missing Builder Report warning was not returned.");
    process.exit(1);
  }

  const phaseFolders = await listAvailablePhaseFolders();

  if (!phaseFolders.ok || !phaseFolders.phases?.includes("phase-02")) {
    console.error("Available phase folder listing did not include phase-02.");
    process.exit(1);
  }

  const wc02BuilderReports = await listHumanValidationBuilderReports({
    phase: "phase-02",
    workCardFileName:
      "WC02_add_project_architect_interview_prompt_generator.json",
  });

  if (
    !wc02BuilderReports.ok ||
    wc02BuilderReports.defaultFileName !==
      "BUILDER_REPORT_WC02_add_project_architect_interview_prompt_generator.md"
  ) {
    console.error("WC02 validation did not default to the matching WC02 Implementer Report.");
    process.exit(1);
  }

  const phase02ValidationTargets = await listHumanValidationTargets("phase-02");

  if (!phase02ValidationTargets.ok) {
    console.error("Phase 02 Validation Target listing failed.");
    process.exit(1);
  }

  const expectedValidationTargets = [
    {
      id: "WC03_REPAIR_validation_and_evidence_ui",
      fileName: "VALIDATION_TARGET_WC03_repair_validation_and_evidence_ui.json",
      reportFile: "BUILDER_REPORT_WC03_repair_validation_and_evidence_ui.md",
    },
    {
      id: "WC03_REPAIR_header_layout_regression",
      fileName: "VALIDATION_TARGET_WC03_repair_header_layout_regression.json",
      reportFile: "BUILDER_REPORT_WC03_repair_header_layout_regression.md",
    },
    {
      id: "FIX_context_menu_copy_paste",
      fileName: "VALIDATION_TARGET_FIX_context_menu_copy_paste.json",
      reportFile: "BUILDER_REPORT_FIX_context_menu_copy_paste.md",
    },
  ];

  if (
    !phase02ValidationTargets.targets?.some(
      (target) =>
        target.kind === "work_card" &&
        target.sourceJsonFile ===
          "WC03_repair_validation_and_evidence_ui.json",
    )
  ) {
    console.error("Validation Target listing did not preserve normal Work Card JSON support.");
    process.exit(1);
  }

  for (const expectedTarget of expectedValidationTargets) {
    const target = phase02ValidationTargets.targets?.find(
      (candidate) => candidate.id === expectedTarget.id,
    );

    if (!target) {
      console.error(`Validation Target listing is missing ${expectedTarget.id}.`);
      process.exit(1);
    }

    if (
      target.fileName !== expectedTarget.fileName ||
      target.expectedImplementerReportFile !== expectedTarget.reportFile
    ) {
      console.error(`Validation Target metadata is wrong for ${expectedTarget.id}.`);
      process.exit(1);
    }

    const targetReports = await listHumanValidationBuilderReports({
      phase: "phase-02",
      workCardFileName: target.sourceJsonFile,
      validationTargetFileName: target.fileName,
    });

    if (!targetReports.ok || targetReports.defaultFileName !== expectedTarget.reportFile) {
      console.error(`Validation Target ${expectedTarget.id} did not default to its expected Implementer Report.`);
      process.exit(1);
    }
  }

  const repairValidationTarget = phase02ValidationTargets.targets?.find(
    (target) => target.id === "WC03_REPAIR_validation_and_evidence_ui",
  );

  const repairTargetPreview = await previewHumanValidationRecord({
    ...baseInput,
    phase: "phase-02",
    workCardFileName: repairValidationTarget?.sourceJsonFile ?? "",
    validationTargetFileName: repairValidationTarget?.fileName,
    builderReportFileName:
      "BUILDER_REPORT_WC03_repair_validation_and_evidence_ui.md",
    validationResult: "Not tested",
  });

  if (
    !repairTargetPreview.ok ||
    repairTargetPreview.record?.validationTargetId !==
      "WC03_REPAIR_validation_and_evidence_ui" ||
    !repairTargetPreview.validationMarkdown?.includes("## Validation Target")
  ) {
    console.error("Repair Validation Target preview did not preserve target metadata.");
    process.exit(1);
  }

  const mismatchedRepairTargetPreview = await previewHumanValidationRecord({
    ...baseInput,
    phase: "phase-02",
    workCardFileName: repairValidationTarget?.sourceJsonFile ?? "",
    validationTargetFileName: repairValidationTarget?.fileName,
    builderReportFileName:
      "BUILDER_REPORT_WC03_repair_header_layout_regression.md",
    validationResult: "Not tested",
  });

  if (mismatchedRepairTargetPreview.ok) {
    console.error("Repair Validation Target accepted a mismatched explicit Implementer Report.");
    process.exit(1);
  }

  for (const validationResult of [
    "Pass",
    "Pass with concerns",
    "Partial",
    "Fail",
    "Not tested",
    "Blocked",
  ]) {
    const pendingRecord = buildHumanValidationRecord(
      workCardHumanValidationFixture,
      { ...baseInput, validationResult },
      "2026-06-29T12:00:00.000Z",
    );

    if (shouldGenerateRepairPrompt(pendingRecord)) {
      console.error(
        `Validation Result ${validationResult} generated repair before Architect disposition.`,
      );
      process.exit(1);
    }
  }

  const legacyAdvisoryRecord = {
    ...record,
    operatorDecision: "Failed - repair needed",
  };

  if (shouldGenerateRepairPrompt(legacyAdvisoryRecord)) {
    console.error("Legacy Operator Decision must remain advisory and must not generate repair.");
    process.exit(1);
  }

  const architectRepairRecord = {
    ...record,
    architectDisposition: "Repair required before Operator validation",
  };

  if (!shouldGenerateRepairPrompt(architectRepairRecord)) {
    console.error("Final Architect repair disposition did not generate a repair prompt.");
    process.exit(1);
  }

  const repairPrompt = renderRepairPrompt(architectRepairRecord, {
    validationRecordFileName: "VALIDATION_REPORT_WC07_human_validation_and_repair_loop.json",
  });
  const requiredRepairPromptText = [
    "You are acting as Implementer for ChampCity A/I.",
    "The Implementer may be Codex, Claude Code, Cursor, or another coding agent.",
    "<PROJECT_REPO>",
    "## Required Repo Checks",
    "git status --short --branch",
    "git remote -v",
    "Read `AGENTS.md`.",
    "Read the validation record",
    "## Validation Evidence And Architect Disposition",
    "Architect disposition: Repair required before Operator validation",
    "## Validation Commands",
    "npm run typecheck",
    "npm run build",
    "npm test",
    "npm run test:work-cards",
    "git status --short",
    repairPromptScopeGuard,
    "Do not broaden implementation.",
    "Do not update Work Card status.",
    "Implementer Report Requirement",
    "## Architect Review Instructions",
    "## Architect Review Decision",
    "## Operator Validation Steps",
    "BUILDER_REPORT_REPAIR_WC07_human_validation_and_repair_loop.md",
    "Do not create a release tag.",
    "Do not push unless explicitly instructed.",
  ];
  const missingRepairPromptText = requiredRepairPromptText.filter(
    (text) => !repairPrompt.includes(text),
  );

  if (missingRepairPromptText.length > 0) {
    console.error("Repair prompt is missing required text:");
    for (const text of missingRepairPromptText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const expectedValidationJsonFileName =
    "VALIDATION_REPORT_WC07_human_validation_and_repair_loop.json";
  const expectedValidationMarkdownFileName =
    "VALIDATION_REPORT_WC07_human_validation_and_repair_loop.md";
  const expectedRepairPromptFileName =
    "REPAIR_PROMPT_WC07_human_validation_and_repair_loop.md";

  if (buildValidationReportJsonFileName(record) !== expectedValidationJsonFileName) {
    console.error("Validation Report JSON filename generation returned the wrong filename.");
    process.exit(1);
  }

  if (
    buildValidationReportMarkdownFileName(record) !==
    expectedValidationMarkdownFileName
  ) {
    console.error("Validation Report Markdown filename generation returned the wrong filename.");
    process.exit(1);
  }

  if (buildRepairPromptFileName(record) !== expectedRepairPromptFileName) {
    console.error("Repair Prompt filename generation returned the wrong filename.");
    process.exit(1);
  }

  try {
    validateValidationReportFileName("../bad.json");
    console.error("Validation Report filename sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  try {
    validateRepairPromptFileName("../bad.md");
    console.error("Repair Prompt filename sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  const evidenceDirectory = resolveValidationEvidenceDirectory({
    workCardId: "WC02",
    title: "Add Project Architect Interview prompt generator",
    phase: "phase-02",
  });

  if (
    !evidenceDirectory
      .replace(/\\/g, "/")
      .endsWith(
        "planning/phases/phase-02/Validation_Evidence/WC02_add_project_architect_interview_prompt_generator",
      )
  ) {
    console.error("Validation evidence directory did not resolve to the expected phase/work-card folder.");
    process.exit(1);
  }

  if (validateValidationEvidenceFileName("../bad.png").length === 0) {
    console.error("Validation evidence filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (validateValidationEvidenceFileName("screenshot.png").length > 0) {
    console.error("Validation evidence filename sanitizer rejected a valid image.");
    process.exit(1);
  }

  const validationSource = [
    readFileSync(rendererAppPath, "utf8"),
    readFileSync(preloadPath, "utf8"),
    readFileSync(mainWorkCardFileStorePath, "utf8"),
  ].join("\n");
  const requiredValidationRepairSource = [
    "listAvailablePhases",
    "listHumanValidationTargets",
    "Validation Target",
    "Validation_Targets",
    "attachValidationEvidenceFile",
    "Attach or paste screenshot",
    "Validation_Evidence",
    "Selected Implementer Report does not match",
    "workCards:attachValidationEvidenceFile",
  ];
  const missingValidationRepairSource = requiredValidationRepairSource.filter(
    (text) => !validationSource.includes(text),
  );

  if (missingValidationRepairSource.length > 0) {
    console.error("Human Validation repair source wiring is missing required text:");
    for (const text of missingValidationRepairSource) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }
}

async function assertSavedWorkCardListing() {
  const result = await listSavedWorkCards("phase-01");

  if (!result.ok) {
    console.error("Saved Work Card listing failed for phase-01:");
    for (const error of result.errorMessages ?? []) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const listedWorkCardIds = new Set(
    (result.workCards ?? []).map((workCard) => workCard.workCardId),
  );
  const expectedWorkCardIds = [
    "WC01",
    "WC02",
    "WC03",
    "WC04",
    "WC05",
    "WC06",
    "WC07",
    "WC08",
    "WC09",
    "WC10",
  ];
  const missingWorkCardIds = expectedWorkCardIds.filter(
    (workCardId) => !listedWorkCardIds.has(workCardId),
  );

  if (missingWorkCardIds.length > 0) {
    console.error(
      `Saved Work Card listing is missing expected Work Cards: ${missingWorkCardIds.join(", ")}.`,
    );
    process.exit(1);
  }
}

function assertUiDesignHandoffPackage() {
  const requiredFiles = [
    "README.md",
    "CURRENT_UI_INVENTORY.md",
    "UX_FLOW_MAP.md",
    "BRAND_AND_UI_DIRECTION.md",
    "FIGMA_PROMPT.md",
    "SOURCE_REFERENCES.md",
    "SCREENSHOT_CAPTURE_INSTRUCTIONS.md",
  ];

  for (const fileName of requiredFiles) {
    const filePath = resolve(uiDesignHandoffDirectory, fileName);

    if (!existsSync(filePath)) {
      console.error(`UI design handoff package is missing ${fileName}.`);
      process.exit(1);
    }
  }

  const figmaPrompt = readFileSync(
    resolve(uiDesignHandoffDirectory, "FIGMA_PROMPT.md"),
    "utf8",
  );
  const requiredPromptText = [
    "ChampCity A/I",
    "Architect / Implementer",
    "dark",
    "compact",
    "React",
  ];
  const missingPromptText = requiredPromptText.filter(
    (text) => !figmaPrompt.includes(text),
  );

  if (missingPromptText.length > 0) {
    console.error("Figma prompt is missing required text:");
    for (const text of missingPromptText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const screenshotInstructions = readFileSync(
    resolve(uiDesignHandoffDirectory, "SCREENSHOT_CAPTURE_INSTRUCTIONS.md"),
    "utf8",
  );
  const missingScreens = currentUiScreens.filter(
    (screen) => !screenshotInstructions.includes(screen),
  );

  if (missingScreens.length > 0) {
    console.error("Screenshot capture instructions are missing screens:");
    for (const screen of missingScreens) {
      console.error(`- ${screen}`);
    }
    process.exit(1);
  }

  const zipPath = resolve(
    uiDesignHandoffDirectory,
    "ChampCity_AI_Figma_UI_Handoff.zip",
  );

  if (existsSync(zipPath)) {
    const zipText = readFileSync(zipPath).toString("latin1").replace(/\\/g, "/");
    const forbiddenEntries = ["node_modules/", ".git/"];
    const foundForbiddenEntry = forbiddenEntries.find((entry) =>
      zipText.includes(entry),
    );

    if (foundForbiddenEntry) {
      console.error(
        `UI handoff zip includes a forbidden folder: ${foundForbiddenEntry}`,
      );
      process.exit(1);
    }
  }
}

function assertWc10UiAndTerminology() {
  const requiredFiles = [
    rendererAppPath,
    rendererEntryPath,
    rendererTailwindPath,
    rendererThemePath,
    rendererIconPath,
    rendererBrandingPath,
    figmaSourcePackagePath,
    figmaImplementationMapPath,
    resolve(
      checkedInWorkCardsDirectory,
      "WC10_implement_figma_ui_and_terminology_alignment.json",
    ),
    resolve(
      checkedInWorkCardsDirectory,
      "WC10_implement_figma_ui_and_terminology_alignment.md",
    ),
  ];

  for (const filePath of requiredFiles) {
    if (!existsSync(filePath)) {
      console.error(`WC10 required artifact is missing: ${filePath}`);
      process.exit(1);
    }
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const rendererSource = [
    readFileSync(rendererAppPath, "utf8"),
    readFileSync(rendererEntryPath, "utf8"),
  ].join("\n");
  const rendererStyles = [
    readFileSync(rendererTailwindPath, "utf8"),
    readFileSync(rendererThemePath, "utf8"),
  ].join("\n");

  for (const label of wc10PipelineLabels) {
    if (!rendererSource.includes(`label: "${label}"`)) {
      console.error(`Renderer pipeline is missing step label: ${label}`);
      process.exit(1);
    }
  }

  const requiredRendererText = [
    "Architect / Implementer",
    "Implementer Prompt Generator",
    "Implementer Report Capture",
    "Save Implementer Prompt",
    "Save Implementer Report",
    "champcity_ai_ui_branding.png",
    "window.champCity",
    "listSavedWorkCards",
    "previewBuilderPrompt",
    "saveHumanValidationRecord",
    "PipelineStepper",
    "ArtifactPanel",
    "ScreenLayout",
  ];
  const missingRendererText = requiredRendererText.filter(
    (text) => !rendererSource.includes(text),
  );

  if (missingRendererText.length > 0) {
    console.error("Renderer is missing WC10 UI terminology or branding text:");
    for (const text of missingRendererText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const forbiddenRendererText = [
    'label: "Build"',
    '"Builder Prompt Generator"',
    '"Builder Report Capture"',
    "champcity_ai_icon_clean_no_shadow_TRANSPARENT.png",
    'className: "brand-mark"',
    'h("p", { className: "eyebrow" }, "Architect / Implementer")',
    "DEMO_CARDS",
    "ARTIFACT_SUMMARY",
    "src=\"./vendor/react.development.js\"",
  ];
  const foundForbiddenText = forbiddenRendererText.filter((text) =>
    rendererSource.includes(text),
  );

  if (foundForbiddenText.length > 0) {
    console.error("Renderer contains old visible labels or Figma demo data:");
    for (const text of foundForbiddenText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const requiredStyleText = [
    "color-scheme: dark",
    "#080a0d",
    "--primary: #00cce6",
    "@import \"tailwindcss\" source(none)",
    "@source \"../**/*.{js,ts,jsx,tsx}\"",
    "@theme inline",
  ];
  const missingStyleText = requiredStyleText.filter(
    (text) => !rendererStyles.includes(text),
  );

  if (missingStyleText.length > 0) {
    console.error("Renderer Tailwind styles are missing WC10 dark UI tokens:");
    for (const text of missingStyleText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const requiredAppStyleText = [
    "flex-col gap-2",
    "border-t border-border/70",
    "whitespace-nowrap",
    "break-anywhere",
    "bg-background",
    "text-primary",
    "border-border",
  ];
  const missingAppStyleText = requiredAppStyleText.filter(
    (text) => !rendererSource.includes(text),
  );

  if (missingAppStyleText.length > 0) {
    console.error("Renderer source is missing expected Figma/Tailwind class usage:");
    for (const text of missingAppStyleText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const requiredDependencies = {
    dependencies: ["lucide-react", "react", "react-dom"],
    devDependencies: [
      "@tailwindcss/vite",
      "@vitejs/plugin-react",
      "@types/react",
      "@types/react-dom",
      "tailwindcss",
      "vite",
    ],
  };

  for (const [dependencyGroup, dependencyNames] of Object.entries(requiredDependencies)) {
    for (const dependencyName of dependencyNames) {
      if (!packageJson[dependencyGroup]?.[dependencyName]) {
        console.error(
          `Renderer package dependency is missing: ${dependencyGroup}.${dependencyName}`,
        );
        process.exit(1);
      }
    }
  }

  const implementerReport = [
    "# Implementer Report - sample",
    "",
    "## Repository Path Inspected",
    "<PROJECT_REPO>",
    "",
    "## Git Branch And Remote Status",
    "git status and git remote were checked.",
    "",
    "## Files Created",
    "None.",
    "",
    "## Files Modified",
    "None.",
    "",
    "## Files Intentionally Not Created",
    "None.",
    "",
    "## Commands Run And Results",
    "npm run typecheck - passed",
    "",
    "## Validation Performed",
    "npm run build - passed",
    "",
    "## Validation Skipped And Reason",
    "Manual UI validation skipped in script.",
    "",
    "## Git Actions Performed",
    "Commit hash: abc1234",
    "",
    "## Security/Secret-Safety Notes",
    "No secrets.",
    "",
    "## Blocking Questions",
    "None.",
    "",
    "## Recommended Next Implementer Task",
    "Manual validation.",
  ].join("\n");
  const reportValidation = validateBuilderReport(implementerReport);

  if (!reportValidation.validEnoughToSave) {
    console.error("Implementer Report heading was not accepted by the report validator.");
    process.exit(1);
  }
}

function assertProjectIntake() {
  const validation = validateProjectIntake(projectIntakeFixture);

  if (!validation.valid) {
    console.error("Project Intake fixture validation failed:");
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    console.error("Project Intake fixture should include optional warning context.");
    for (const warning of validation.warnings) {
      console.error(`- ${warning}`);
    }
    process.exit(1);
  }

  const markdown = renderProjectIntakeMarkdown(projectIntakeFixture);
  const requiredMarkdownText = [
    `# Project Intake: ${projectIntakeFixture.projectName}`,
    ...projectIntakeMarkdownHeadings,
    projectIntakeNextStepText,
  ];
  const missingMarkdownText = requiredMarkdownText.filter(
    (text) => !markdown.includes(text),
  );

  if (missingMarkdownText.length > 0) {
    console.error("Project Intake Markdown is missing required text:");
    for (const text of missingMarkdownText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const missingRequired = validateProjectIntake({
    ...projectIntakeFixture,
    projectName: "",
    productSummary: "",
    targetUsers: "",
    userProblem: "",
    desiredUserOutcome: "",
    sourceOfTruthLocation: "",
  });

  if (missingRequired.valid || missingRequired.errors.length < 6) {
    console.error("Project Intake validation did not reject missing required fields.");
    process.exit(1);
  }

  const missingHelpfulContext = validateProjectIntake({
    ...projectIntakeFixture,
    knownConstraints: "",
    nonGoals: "",
    securityOrDataConcerns: "",
    operatorUncertainties: "",
  });

  if (!missingHelpfulContext.valid) {
    console.error("Project Intake warnings should not block save.");
    process.exit(1);
  }

  if (missingHelpfulContext.warnings.length < 4) {
    console.error("Project Intake did not warn for missing optional-but-important fields.");
    process.exit(1);
  }

  const builtProjectIntake = buildProjectIntake(
    {
      projectName: "ChampCity A/I",
      workingTitle: "Upstream intake",
      productSummary: "Capture the project idea.",
      targetUsers: "Operator",
      userProblem: "Project starts are hard to express.",
      desiredUserOutcome: "Operator can save intake.",
      businessOrPersonalGoal: "Improve planning.",
      currentStage: "mvp",
      sourceOfTruthLocation: "<PROJECT_REPO>",
      preferredImplementerTool: "Codex",
      architectSurface: "ChatGPT",
      knownConstraints: "",
      nonGoals: "",
      securityOrDataConcerns: "",
      examplesOrReferences: "",
      operatorUncertainties: "",
      notesForArchitect: "",
    },
    "2026-06-30T15:00:00.000Z",
  );

  if (builtProjectIntake.projectIntakeId !== "PROJECT_INTAKE_champcity_a_i") {
    console.error("Project Intake builder did not create the expected intake ID.");
    process.exit(1);
  }

  const intakeFileNames = buildProjectIntakeFileNames("ChampCity A/I");

  if (
    intakeFileNames.jsonFileName !== "PROJECT_INTAKE_champcity_a_i.json" ||
    intakeFileNames.markdownFileName !== "PROJECT_INTAKE_champcity_a_i.md"
  ) {
    console.error("Project Intake filename generation returned unexpected filenames.");
    process.exit(1);
  }

  if (validateProjectIntakeSlug("../bad").length === 0) {
    console.error("Project Intake slug sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (validateProjectIntakeArtifactFileName("../bad.json").length === 0) {
    console.error("Project Intake artifact filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  try {
    resolveInside(resolveProjectIntakeDirectory(), "../bad");
    console.error("Project Intake path sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  const intakeSource = [
    readFileSync(rendererAppPath, "utf8"),
    readFileSync(preloadPath, "utf8"),
    readFileSync(mainWorkCardFileStorePath, "utf8"),
  ].join("\n");
  const requiredSourceText = [
    'label: "Project Intake"',
    "What are you trying to build?",
    "previewProjectIntake",
    "saveProjectIntake",
    "Project Architect Interview",
    "Open Project Architect Interview",
    'onNavigate("project-architect-interview")',
    "Project Profile",
    "planningProjectRoot",
    "resolveProjectIntakeDirectory",
    "validateProjectIntakeArtifactFileName",
  ];
  const missingSourceText = requiredSourceText.filter(
    (text) => !intakeSource.includes(text),
  );

  if (missingSourceText.length > 0) {
    console.error("Project Intake source wiring is missing required text:");
    for (const text of missingSourceText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }
}

function assertProjectArchitectInterviewPrompt() {
  const promptRecord = buildProjectArchitectInterviewPrompt(
    projectIntakeFixture,
    "PROJECT_INTAKE_champcity_a_i.json",
    "PROJECT_INTAKE_champcity_a_i.md",
    "2026-06-30T18:30:00.000Z",
  );
  const validation = validateProjectArchitectInterviewPrompt(promptRecord);

  if (!validation.valid) {
    console.error("Project Architect Interview Prompt validation failed:");
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (promptRecord.promptPurpose !== projectArchitectInterviewPromptPurpose) {
    console.error("Project Architect Interview Prompt purpose changed unexpectedly.");
    process.exit(1);
  }

  if (
    promptRecord.operatorInstruction !==
    projectArchitectInterviewOperatorInstruction
  ) {
    console.error("Project Architect Interview operator instruction changed unexpectedly.");
    process.exit(1);
  }

  const requiredPromptText = [
    "Act as Architect for the project described below.",
    "Project Intake:",
    projectIntakeFixture.projectName,
    projectIntakeFixture.productSummary,
    "Do not create the final Project Profile yet.",
    "Do not create a roadmap yet.",
    "Do not create Phase Plans yet.",
    "Do not create Work Cards yet.",
    "Do not write implementation code.",
    "Do not pretend you saved files.",
    "Your goal is not to create the final Project Profile yet.",
    "Ask only the questions that truly require Operator judgment.",
    "When a reasonable default is available, propose the default and mark it as an assumption",
    "For every question you ask, provide suggested answers in plain language.",
    "Preserve the Architect / Implementer mental model.",
    "Builder/Implementer tooling",
    "Required project-profile areas to complete:",
    "Source-of-truth location",
    "Initial phase candidates",
    "Key risks and drift warnings",
    "Produce a structured Project Architect Interview Completion Summary",
    "Suggested next step: generate Project Planning Documents.",
    "Do not generate the Project Planning Documents yet.",
  ];
  const missingPromptText = requiredPromptText.filter(
    (text) => !promptRecord.promptText.includes(text),
  );

  if (missingPromptText.length > 0) {
    console.error("Project Architect Interview prompt text is missing required text:");
    for (const text of missingPromptText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const markdown = renderProjectArchitectInterviewPromptMarkdown(promptRecord);
  const requiredMarkdownText = [
    `# Project Architect Interview Prompt: ${projectIntakeFixture.projectName}`,
    ...projectArchitectInterviewPromptMarkdownHeadings,
    promptRecord.promptText,
    projectArchitectInterviewPromptNextStepText,
  ];
  const missingMarkdownText = requiredMarkdownText.filter(
    (text) => !markdown.includes(text),
  );

  if (missingMarkdownText.length > 0) {
    console.error("Project Architect Interview Prompt Markdown is missing required text:");
    for (const text of missingMarkdownText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const promptFileNames =
    buildProjectArchitectInterviewPromptFileNames("ChampCity A/I");

  if (
    promptFileNames.jsonFileName !==
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.json" ||
    promptFileNames.markdownFileName !==
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md"
  ) {
    console.error("Project Architect Interview Prompt filename generation returned unexpected filenames.");
    process.exit(1);
  }

  if (validateProjectArchitectInterviewPromptSlug("../bad").length === 0) {
    console.error("Project Architect Interview Prompt slug sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (
    validateProjectArchitectInterviewPromptArtifactFileName("../bad.json")
      .length === 0
  ) {
    console.error("Project Architect Interview Prompt artifact filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (validateSavedProjectIntakeJsonFileName("../bad.json").length === 0) {
    console.error("Saved Project Intake JSON filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (
    validateSavedProjectIntakeJsonFileName("PROJECT_INTAKE_bad.md").length ===
    0
  ) {
    console.error("Saved Project Intake JSON filename sanitizer failed to require JSON.");
    process.exit(1);
  }

  try {
    resolveInside(resolveProjectArchitectInterviewPromptsDirectory(), "../bad");
    console.error("Project Architect Interview Prompt path sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  const source = [
    readFileSync(rendererAppPath, "utf8"),
    readFileSync(preloadPath, "utf8"),
    readFileSync(mainWorkCardFileStorePath, "utf8"),
  ].join("\n");
  const requiredSourceText = [
    'label: "Project Architect Interview"',
    "Project Architect Interview",
    "Saved Project Intake",
    "Generate Interview Prompt",
    "Copy Architect Prompt",
    "Save Architect Prompt",
    "Open Project Plan",
    'onNavigate("project-planning-documents")',
    "Project_Architect_Interview_Prompts",
    "listSavedProjectIntakes",
    "previewProjectArchitectInterviewPrompt",
    "saveProjectArchitectInterviewPrompt",
    "validateSavedProjectIntakeJsonFileName",
    "validateProjectArchitectInterviewPromptArtifactFileName",
    "compareSavedProjectArtifactSummaries",
  ];
  const missingSourceText = requiredSourceText.filter(
    (text) => !source.includes(text),
  );

  if (missingSourceText.length > 0) {
    console.error("Project Architect Interview source wiring is missing required text:");
    for (const text of missingSourceText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }
}

async function assertProjectPlanningDocuments() {
  const promptRecord = buildProjectArchitectInterviewPrompt(
    projectIntakeFixture,
    "PROJECT_INTAKE_champcity_a_i.json",
    "PROJECT_INTAKE_champcity_a_i.md",
    "2026-07-01T12:00:00.000Z",
  );
  const architectOutput = [
    "# Project Architect Interview Completion Summary",
    "",
    "## Confirmed facts",
    "- Project name: ChampCity A/I",
    "- The product is now in Alpha app development.",
    "",
    "## Safe assumptions",
    "- The repository remains the source of truth.",
    "",
    "## Open questions",
    "- Which Phase Intake fields should be captured first?",
    "",
    "## Recommended project-profile values",
    "- Product thesis: Turn Operator intent into durable planning artifacts.",
    "",
    "## Recommended initial phase candidates",
    "- Phase 02: upstream project planning.",
    "",
    "## Risks and drift warnings",
    "- Risk: do not add provider SDKs before a dedicated Work Card.",
    "",
    "## Decisions",
    "- Decision: preserve Operator / Architect / Implementer terminology.",
  ].join("\n");
  const record = buildProjectPlanningDocuments({
    projectIntake: projectIntakeFixture,
    sourceProjectIntakeJsonFileName: "PROJECT_INTAKE_champcity_a_i.json",
    sourceProjectIntakeMarkdownFileName: "PROJECT_INTAKE_champcity_a_i.md",
    projectArchitectInterviewPrompt: promptRecord,
    sourceProjectArchitectInterviewPromptJsonFileName:
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.json",
    sourceProjectArchitectInterviewPromptMarkdownFileName:
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md",
    architectInterviewOutput: architectOutput,
    timestamp: "2026-07-01T12:30:00.000Z",
  });

  const documentNames = new Set(
    record.documents.map((document) => document.fileName),
  );
  const requiredDocumentNames = [
    "PROJECT_PROFILE.md",
    "PROJECT_STATE.md",
    "WORK_CARD_BACKLOG.md",
    "OPEN_QUESTIONS.md",
    "RISKS.md",
    "DECISIONS.md",
  ];
  const missingDocumentNames = requiredDocumentNames.filter(
    (fileName) => !documentNames.has(fileName),
  );

  if (missingDocumentNames.length > 0) {
    console.error("Project Planning Documents missing generated documents:");
    for (const fileName of missingDocumentNames) {
      console.error(`- ${fileName}`);
    }
    process.exit(1);
  }

  const combinedMarkdown = renderProjectPlanningDocumentsPreview(record.documents);
  const sidecarMarkdown = renderProjectPlanningDocumentsRecordMarkdown(record);
  const requiredMarkdownText = [
    "Alpha app development.",
    "Capture -> Frame -> Plan -> Build -> Prove",
    "WC03: Repair validation and evidence UI",
    "WC04: Generate Project Planning Documents",
    "WC06: Generate Phase Planning Documents and pending-review Work Card Plan proposal",
    "PROJECT_PROFILE.md",
    "PROJECT_STATE.md",
    "DECISIONS.md",
    "Project Planning Documents Generation",
  ];
  const missingMarkdownText = requiredMarkdownText.filter(
    (text) => !`${combinedMarkdown}\n${sidecarMarkdown}`.includes(text),
  );

  if (missingMarkdownText.length > 0) {
    console.error("Project Planning Documents Markdown is missing required text:");
    for (const text of missingMarkdownText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  if (combinedMarkdown.includes("ChampCity_AI Work Card MVP")) {
    console.error("Project Planning Documents contain stale MVP product naming.");
    process.exit(1);
  }

  const fileNames = buildProjectPlanningDocumentsFileNames("ChampCity A/I");

  if (
    fileNames.jsonFileName !== "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json" ||
    fileNames.markdownFileName !== "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.md"
  ) {
    console.error("Project Planning Documents filename generation returned unexpected filenames.");
    process.exit(1);
  }

  if (validateProjectPlanningDocumentsSlug("../bad").length === 0) {
    console.error("Project Planning Documents slug sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (
    validateProjectPlanningDocumentsArtifactFileName("../bad.json").length === 0
  ) {
    console.error("Project Planning Documents artifact filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (
    validateSavedProjectArchitectInterviewPromptJsonFileName("../bad.json")
      .length === 0
  ) {
    console.error("Saved Project Architect Interview Prompt filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (
    validateSavedProjectArchitectInterviewPromptJsonFileName(
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_bad.md",
    ).length === 0
  ) {
    console.error("Saved Project Architect Interview Prompt filename sanitizer failed to require JSON.");
    process.exit(1);
  }

  try {
    resolveInside(resolveProjectPlanningDocumentsDirectory(), "../bad");
    console.error("Project Planning Documents sidecar path sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  try {
    resolveProjectPlanningDocumentPath("../bad");
    console.error("Project Planning Documents approved document path sanitizer failed to reject unsafe filenames.");
    process.exit(1);
  } catch {
    // Expected.
  }

  const planningDocumentPath = resolveProjectPlanningDocumentPath("PROJECT_PROFILE.md");

  if (!planningDocumentPath.endsWith("planning\\project\\PROJECT_PROFILE.md")) {
    console.error("Project Planning Documents approved path resolved unexpectedly.");
    process.exit(1);
  }

  const listing = await listSavedProjectArchitectInterviewPrompts();

  if (!listing.ok) {
    console.error("Saved Project Architect Interview Prompt listing failed:");
    for (const error of listing.errorMessages ?? []) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const source = [
    readFileSync(rendererAppPath, "utf8"),
    readFileSync(preloadPath, "utf8"),
    readFileSync(mainWorkCardFileStorePath, "utf8"),
  ].join("\n");
  const requiredSourceText = [
    'label: "Project Plan"',
    "Project Planning Documents",
    "Completed Architect interview output",
    "Save Planning Docs",
    "Select Project Intake",
    "Select Architect Prompt",
    "setSelectedProjectIntakeFileName(projectIntakes[0]?.fileName",
    "setSelectedPromptFileName(prompts[0]?.fileName",
    "Project_Planning_Documents",
    "listProjectPlanningDocumentProjectIntakes",
    "listProjectPlanningDocumentArchitectPrompts",
    "previewProjectPlanningDocuments",
    "saveProjectPlanningDocuments",
    "validateSavedProjectArchitectInterviewPromptJsonFileName",
    "resolveProjectPlanningDocumentPath",
  ];
  const missingSourceText = requiredSourceText.filter(
    (text) => !source.includes(text),
  );

  if (missingSourceText.length > 0) {
    console.error("Project Planning Documents source wiring is missing required text:");
    for (const text of missingSourceText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }
}

async function assertPhaseIntakeAndInterviewPrompt() {
  const phaseIntake = buildPhaseIntake(
    {
      phaseFolder: "phase-02",
      phaseName: "Phase 02 upstream planning",
      projectName: "ChampCity A/I",
      sourceProjectPlanningSidecarJsonFileName:
        "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json",
      phaseProblem: "The Operator needs phase-level planning input.",
      phaseGoal: "Capture phase context before a Phase Architect Interview.",
      userOutcome: "The Operator can generate a phase interview prompt.",
      includedScope: "Phase Intake and Phase Architect Interview prompt generation.",
      outOfScope: "Phase Planning Documents and Work Cards.",
      affectedScreensOrWorkflows: "Project Plan, Phase Intake, Phase Interview.",
      knownConstraints: "No LLM API or provider SDK.",
      knownRisks: "Phase scope could drift into implementation planning.",
      dependencies: "Project Planning Documents sidecar.",
      validationExpectations: "Automated typecheck, build, and work-card script.",
      operatorNotes: "Keep the Architect focused on questions and defaults.",
    },
    "2026-07-01T13:00:00.000Z",
    "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.md",
  );
  const validation = validatePhaseIntake(phaseIntake);

  if (!validation.valid) {
    console.error("Phase Intake validation failed:");
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    console.error("Phase Intake fixture should include optional warning context.");
    for (const warning of validation.warnings) {
      console.error(`- ${warning}`);
    }
    process.exit(1);
  }

  const markdown = renderPhaseIntakeMarkdown(phaseIntake);
  const requiredMarkdownText = [
    `# Phase Intake: ${phaseIntake.phaseName}`,
    ...phaseIntakeMarkdownHeadings,
    "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json",
    phaseIntakeNextStepText,
  ];
  const missingMarkdownText = requiredMarkdownText.filter(
    (text) => !markdown.includes(text),
  );

  if (missingMarkdownText.length > 0) {
    console.error("Phase Intake Markdown is missing required text:");
    for (const text of missingMarkdownText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const generatedProjectArchitectPrompt = buildProjectArchitectInterviewPrompt(
    projectIntakeFixture,
    "PROJECT_INTAKE_champcity_a_i.json",
    "PROJECT_INTAKE_champcity_a_i.md",
    "2026-07-01T12:30:00.000Z",
  );
  const generatedProjectPlanningRecord = buildProjectPlanningDocuments({
    projectIntake: projectIntakeFixture,
    sourceProjectIntakeJsonFileName: "PROJECT_INTAKE_champcity_a_i.json",
    sourceProjectIntakeMarkdownFileName: "PROJECT_INTAKE_champcity_a_i.md",
    projectArchitectInterviewPrompt: generatedProjectArchitectPrompt,
    sourceProjectArchitectInterviewPromptJsonFileName:
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.json",
    sourceProjectArchitectInterviewPromptMarkdownFileName:
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md",
    architectInterviewOutput: [
      "## Confirmed facts",
      "- ChampCity A/I is an Electron app.",
      "",
      "## Recommended initial phase candidates",
      "- Phase 03: formal Work Card conversion.",
      "",
      "## Risks",
      "- Risk: do not add provider SDKs yet.",
    ].join("\n"),
    timestamp: "2026-07-01T12:40:00.000Z",
  });
  const generatedRepositoryReconciliation = buildRepositoryReconciliationRecord(
    {
      projectName: "ChampCity A/I",
      projectPlanningDocumentFileName:
        "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json",
      sourcePhaseFolder: "phase-02",
      architectReconciliationOutput: [
        "## Reviewed Artifact Summary",
        "- Project and phase artifacts reviewed.",
        "",
        "## Implemented State Summary",
        "- Phase Intake exists but should become Architect-led.",
        "",
        "## Current Risks",
        "- Risk: manual Phase Intake can drift into operator-invented scope.",
        "",
        "## Recommended Milestones",
        "- Generate Architect-led Phase Intake from prior artifacts.",
        "",
        "## Recommended Next Phase",
        "- Phase 03: formal Work Card conversion.",
        "",
        "## Architect Notes",
        "- Keep Reconcile before Phase Intake.",
      ].join("\n"),
    },
    {
      projectPlanningDocumentsSummary: "Current planning documents.",
      selectedProjectPlanningDocumentsSummary:
        "Selected sidecar JSON: PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json",
      phaseArtifactSummary: "phase-02 artifacts exist.",
      repositoryStructureSummary: "src, planning, and scripts exist.",
      appWorkflowSummary:
        "Project Intake, Project Plan, Reconcile, Phase Intake, Phase Interview, Phase Plan.",
    },
    "2026-07-01T12:50:00.000Z",
  );
  const architectLedPhaseIntake = buildArchitectLedPhaseIntake(
    {
      generationMode: "architect-led",
      phaseFolder: "phase-02",
      phaseName: "",
      projectName: "",
      projectIntakeFileName: "PROJECT_INTAKE_champcity_a_i.json",
      projectArchitectInterviewPromptFileName:
        "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.json",
      sourceProjectPlanningSidecarJsonFileName:
        "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json",
      repositoryReconciliationFileName:
        "REPOSITORY_RECONCILIATION_champcity_a_i.json",
      existingPhaseIntakeFileName: "",
      operatorNextWorkIntent:
        "Turn the next phase recommendation into formal Work Cards.",
      operatorProjectWorkType: "ongoing_project",
      operatorMustKeepConstraints:
        "Do not add provider SDKs or acceptance records.",
      phaseProblem: "",
      phaseGoal: "",
      userOutcome: "",
      includedScope: "",
      outOfScope: "",
      affectedScreensOrWorkflows: "",
      knownConstraints: "",
      knownRisks: "",
      dependencies: "",
      validationExpectations: "",
      operatorNotes: "",
      sourceProjectIntake: projectIntakeFixture,
      sourceProjectIntakeJsonFileName: "PROJECT_INTAKE_champcity_a_i.json",
      sourceProjectIntakeMarkdownFileName: "PROJECT_INTAKE_champcity_a_i.md",
      sourceProjectArchitectInterviewPrompt: generatedProjectArchitectPrompt,
      sourceProjectArchitectInterviewPromptJsonFileName:
        "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.json",
      sourceProjectArchitectInterviewPromptMarkdownFileName:
        "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md",
      sourceProjectPlanningDocuments: generatedProjectPlanningRecord,
      sourceProjectPlanningSidecarMarkdownFileName:
        "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.md",
      sourceRepositoryReconciliation: generatedRepositoryReconciliation,
      sourceRepositoryReconciliationMarkdownFileName:
        "REPOSITORY_RECONCILIATION_champcity_a_i.md",
    },
    "2026-07-01T13:10:00.000Z",
  );
  const architectLedValidation = validatePhaseIntake(architectLedPhaseIntake);

  if (!architectLedValidation.valid) {
    console.error("Architect-led Phase Intake validation failed:");
    for (const error of architectLedValidation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (architectLedPhaseIntake.generationMode !== "architect-led") {
    console.error("Architect-led Phase Intake did not record generated mode.");
    process.exit(1);
  }

  if ((architectLedPhaseIntake.sourceArtifactsUsed ?? []).length < 4) {
    console.error("Architect-led Phase Intake did not record source artifacts.");
    process.exit(1);
  }

  const architectLedMarkdown = renderPhaseIntakeMarkdown(architectLedPhaseIntake);
  const requiredArchitectLedMarkdownText = [
    "Architect-led generated Phase Intake.",
    "## Source Artifacts Used",
    "## Plain-Language Operator Intent",
    "What to work on next: Turn the next phase recommendation into formal Work Cards.",
    "## Architect-Derived Scope",
    "## Acceptance Definition",
    "Use this generated Phase Intake to run the Phase Interview",
  ];
  const missingArchitectLedMarkdownText = requiredArchitectLedMarkdownText.filter(
    (text) => !architectLedMarkdown.includes(text),
  );

  if (missingArchitectLedMarkdownText.length > 0) {
    console.error("Architect-led Phase Intake Markdown is missing required text:");
    for (const text of missingArchitectLedMarkdownText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  if (phaseIntakeWorkTypes.length !== 6) {
    console.error("Phase Intake work type options changed unexpectedly.");
    process.exit(1);
  }

  if (validatePhaseIntakeWorkType("bad_type").length === 0) {
    console.error("Phase Intake work type validation failed to reject bad input.");
    process.exit(1);
  }

  if (validatePhaseIntakeGenerationMode("unsafe").length === 0) {
    console.error("Phase Intake generation mode validation failed to reject bad input.");
    process.exit(1);
  }

  const missingRequired = validatePhaseIntake({
    ...phaseIntake,
    phaseFolder: "",
    phaseName: "",
    projectName: "",
    phaseProblem: "",
    phaseGoal: "",
    userOutcome: "",
  });

  if (missingRequired.valid || missingRequired.errors.length < 6) {
    console.error("Phase Intake validation did not reject missing required fields.");
    process.exit(1);
  }

  const missingHelpfulContext = validatePhaseIntake({
    ...phaseIntake,
    includedScope: "",
    outOfScope: "",
    affectedScreensOrWorkflows: "",
    knownConstraints: "",
    knownRisks: "",
    dependencies: "",
    validationExpectations: "",
  });

  if (!missingHelpfulContext.valid) {
    console.error("Phase Intake warnings should not block save.");
    process.exit(1);
  }

  if (missingHelpfulContext.warnings.length < 7) {
    console.error("Phase Intake did not warn for missing optional-but-important fields.");
    process.exit(1);
  }

  const intakeFileNames = buildPhaseIntakeFileNames("Phase 02 upstream planning");

  if (
    intakeFileNames.jsonFileName !== "PHASE_INTAKE_phase_02_upstream_planning.json" ||
    intakeFileNames.markdownFileName !== "PHASE_INTAKE_phase_02_upstream_planning.md"
  ) {
    console.error("Phase Intake filename generation returned unexpected filenames.");
    process.exit(1);
  }

  if (validatePhaseIntakeSlug("../bad").length === 0) {
    console.error("Phase Intake slug sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (validatePhaseIntakeArtifactFileName("../bad.json").length === 0) {
    console.error("Phase Intake artifact filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (validateSavedProjectPlanningDocumentsJsonFileName("../bad.json").length === 0) {
    console.error("Saved Project Planning Documents filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (
    validateSavedProjectPlanningDocumentsJsonFileName(
      "PROJECT_PLANNING_DOCUMENTS_bad.md",
    ).length === 0
  ) {
    console.error("Saved Project Planning Documents filename sanitizer failed to require JSON.");
    process.exit(1);
  }

  if (validateSavedPhaseIntakeJsonFileName("../bad.json").length === 0) {
    console.error("Saved Phase Intake filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  try {
    resolveInside(resolvePhaseIntakeDirectory("phase-02"), "../bad");
    console.error("Phase Intake path sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  try {
    resolvePhaseIntakeDirectory("../bad");
    console.error("Phase Intake directory sanitizer failed to reject unsafe phases.");
    process.exit(1);
  } catch {
    // Expected.
  }

  const promptRecord = buildPhaseArchitectInterviewPrompt(
    phaseIntake,
    "PHASE_INTAKE_phase_02_upstream_planning.json",
    "PHASE_INTAKE_phase_02_upstream_planning.md",
    "2026-07-01T13:30:00.000Z",
  );
  const promptValidation = validatePhaseArchitectInterviewPrompt(promptRecord);

  if (!promptValidation.valid) {
    console.error("Phase Architect Interview Prompt validation failed:");
    for (const error of promptValidation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (promptRecord.promptPurpose !== phaseArchitectInterviewPromptPurpose) {
    console.error("Phase Architect Interview Prompt purpose changed unexpectedly.");
    process.exit(1);
  }

  if (
    promptRecord.operatorInstruction !==
    phaseArchitectInterviewOperatorInstruction
  ) {
    console.error("Phase Architect Interview operator instruction changed unexpectedly.");
    process.exit(1);
  }

  const requiredPromptText = [
    "Act as Architect for the development phase described below.",
    "Saved Phase Intake:",
    "Review the saved Phase Intake before asking questions.",
    "Review relevant project planning context",
    "Ask only the questions needed to complete phase planning.",
    "Infer safe defaults where reasonable",
    "Provide suggested plain-language answers",
    "Preserve Operator / Architect / Implementer terminology.",
    "Avoid implementation code.",
    "Avoid generating Phase Planning Documents or Work Cards in this step.",
    "Return only:",
    "Do not generate Phase Planning Documents.",
    "Do not generate a Work Card Plan proposal.",
    "Do not generate Work Cards.",
  ];
  const missingPromptText = requiredPromptText.filter(
    (text) => !promptRecord.promptText.includes(text),
  );

  if (missingPromptText.length > 0) {
    console.error("Phase Architect Interview prompt text is missing required text:");
    for (const text of missingPromptText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const promptMarkdown =
    renderPhaseArchitectInterviewPromptMarkdown(promptRecord);
  const requiredPromptMarkdownText = [
    `# Phase Architect Interview Prompt: ${phaseIntake.phaseName}`,
    ...phaseArchitectInterviewPromptMarkdownHeadings,
    promptRecord.promptText,
    phaseArchitectInterviewPromptNextStepText,
  ];
  const missingPromptMarkdownText = requiredPromptMarkdownText.filter(
    (text) => !promptMarkdown.includes(text),
  );

  if (missingPromptMarkdownText.length > 0) {
    console.error("Phase Architect Interview Prompt Markdown is missing required text:");
    for (const text of missingPromptMarkdownText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const promptFileNames = buildPhaseArchitectInterviewPromptFileNames(
    "Phase 02 upstream planning",
  );

  if (
    promptFileNames.jsonFileName !==
      "PHASE_ARCHITECT_INTERVIEW_PROMPT_phase_02_upstream_planning.json" ||
    promptFileNames.markdownFileName !==
      "PHASE_ARCHITECT_INTERVIEW_PROMPT_phase_02_upstream_planning.md"
  ) {
    console.error("Phase Architect Interview Prompt filename generation returned unexpected filenames.");
    process.exit(1);
  }

  if (validatePhaseArchitectInterviewPromptSlug("../bad").length === 0) {
    console.error("Phase Architect Interview Prompt slug sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (
    validatePhaseArchitectInterviewPromptArtifactFileName("../bad.json")
      .length === 0
  ) {
    console.error("Phase Architect Interview Prompt artifact filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (
    validateSavedPhaseArchitectInterviewPromptJsonFileName("../bad.json")
      .length === 0
  ) {
    console.error("Saved Phase Architect Interview Prompt filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  try {
    resolveInside(
      resolvePhaseArchitectInterviewPromptsDirectory("phase-02"),
      "../bad",
    );
    console.error("Phase Architect Interview Prompt path sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  try {
    resolvePhaseArchitectInterviewPromptsDirectory("../bad");
    console.error("Phase Architect Interview Prompt directory sanitizer failed to reject unsafe phases.");
    process.exit(1);
  } catch {
    // Expected.
  }

  const listing = await listSavedProjectPlanningDocuments();

  if (!listing.ok) {
    console.error("Saved Project Planning Documents listing failed:");
    for (const error of listing.errorMessages ?? []) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const source = [
    readFileSync(rendererAppPath, "utf8"),
    readFileSync(preloadPath, "utf8"),
    readFileSync(mainWorkCardFileStorePath, "utf8"),
  ].join("\n");
  const requiredSourceText = [
    'label: "Phase Map"',
    'label: "Phase Plan"',
    'label: "Reconcile"',
    "Reconcile / Project State Review",
    "Phase Map Builder",
    "Phase Planning Documents Generator",
    "Project Roadmap",
    "Advanced / Legacy Phase Intake",
    "Generate Compatibility Intake",
    "Manual Legacy Edit",
    "What do you want to work on next?",
    "Any must-keep constraints or concerns?",
    "Existing Phase Intake editable source",
    "Repository Reconciliation is recommended for ongoing",
    "Advanced / Legacy Phase Intake Preview",
    "Project Planning Documents",
    "Open Roadmap",
    "Open Phase Interview",
    "Select generated compatibility intake",
    "Project Roadmap source",
    "Phase Architect Interview",
    "Generate Phase Prompt",
    "Copy Phase Prompt",
    "Save Phase Prompt",
    "Phase_Intake",
    "Phase_Architect_Interview_Prompts",
    "listPhaseIntakeProjectPlanningDocuments",
    "previewPhaseIntake",
    "savePhaseIntake",
    "listPhaseArchitectInterviewPhaseIntakes",
    "listPhasePlanningRepositoryReconciliations",
    "previewPhaseArchitectInterviewPrompt",
    "savePhaseArchitectInterviewPrompt",
    "validateSavedProjectPlanningDocumentsJsonFileName",
    "validateSavedPhaseIntakeJsonFileName",
  ];
  const missingSourceText = requiredSourceText.filter(
    (text) => !source.includes(text),
  );

  if (missingSourceText.length > 0) {
    console.error("Phase Intake and Interview source wiring is missing required text:");
    for (const text of missingSourceText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }
}

function assertProjectRoadmapAndPhaseMap() {
  const phase01Files = createEmptyPhaseArtifactFiles();

  for (let index = 1; index <= 10; index += 1) {
    const workCardId = `WC${String(index).padStart(2, "0")}`;

    phase01Files.Work_Cards.push(`${workCardId}_sample.json`);
    phase01Files.Work_Cards.push(`${workCardId}_sample.md`);
    phase01Files.Builder_Reports.push(`BUILDER_REPORT_${workCardId}_sample.md`);
  }

  phase01Files.Validation_Reports = [
    "VALIDATION_REPORT_WC10_foundation_validation.json",
    "VALIDATION_REPORT_WC10_foundation_validation.md",
  ];
  phase01Files.Closeout_Reports = ["PHASE_CLOSEOUT_REPORT_phase_01.md"];

  const phase02Files = createEmptyPhaseArtifactFiles();

  for (let index = 1; index <= 6; index += 1) {
    const workCardId = `WC${String(index).padStart(2, "0")}`;

    phase02Files.Work_Cards.push(`${workCardId}_phase_02_upstream_planning.json`);
    phase02Files.Work_Cards.push(`${workCardId}_phase_02_upstream_planning.md`);

    if (index < 6) {
      phase02Files.Builder_Reports.push(
        `BUILDER_REPORT_${workCardId}_phase_02_upstream_planning.md`,
      );
    }
  }

  phase02Files.Validation_Reports = [
    "VALIDATION_REPORT_WC05_phase_02_reconciliation.json",
    "VALIDATION_REPORT_WC05_phase_02_reconciliation.md",
  ];
  phase02Files.Repair_Prompts = [
    "REPAIR_PROMPT_WC06_project_roadmap_phase_map.md",
  ];

  const phase01Summary = summarizePhaseArtifacts({
    phase: "phase-01",
    filesByFolder: phase01Files,
  });
  const phase02Summary = summarizePhaseArtifacts({
    phase: "phase-02",
    filesByFolder: phase02Files,
  });
  const roadmap = buildProjectRoadmap(
    {
      projectName: "ChampCity A/I",
      mode: "project-roadmap",
      completedPhaseFolder: "phase-01",
      sourceProjectPlanningDocumentFileName:
        "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json",
      sourceRepositoryReconciliationFileName:
        "REPOSITORY_RECONCILIATION_champcity_a_i.json",
      operatorDirection:
        "Replace primary Phase Intake with Project Roadmap, full Phase Map, and Next Phase Readiness Review.",
      sourceArtifacts: [
        {
          label: "Project State",
          path: "planning/project/PROJECT_STATE.md",
          status: "found",
          notes: "Current durable project status.",
        },
        {
          label: "Repository Reconciliation",
          path: "planning/project/Repository_Reconciliation/REPOSITORY_RECONCILIATION_champcity_a_i.md",
          status: "selected",
          notes: "Architect alignment amendment controls this repair.",
        },
      ],
      phaseContexts: [
        {
          phase: "phase-01",
          summary: phase01Summary,
          workCardFileNames: phase01Files.Work_Cards,
          builderReportFileNames: phase01Files.Builder_Reports,
          validationReportFileNames: phase01Files.Validation_Reports,
          repairPromptFileNames: phase01Files.Repair_Prompts,
          closeoutReportFileNames: phase01Files.Closeout_Reports,
          workCardPlanFileNames: ["WORK_CARD_PLAN_phase_01.md"],
          phasePlanningDocumentFileNames: [
            "PHASE_PLANNING_DOCUMENTS_phase_01.md",
          ],
          phaseReadinessReviewFileNames: [
            "PHASE_READINESS_REVIEW_phase_01.md",
          ],
        },
        {
          phase: "phase-02",
          summary: phase02Summary,
          workCardFileNames: phase02Files.Work_Cards,
          builderReportFileNames: phase02Files.Builder_Reports,
          validationReportFileNames: phase02Files.Validation_Reports,
          repairPromptFileNames: phase02Files.Repair_Prompts,
          closeoutReportFileNames: phase02Files.Closeout_Reports,
          workCardPlanFileNames: [],
          phasePlanningDocumentFileNames: [],
          phaseReadinessReviewFileNames: [],
        },
      ],
      projectStateMarkdown:
        "Current work: PH02 WC06. Latest selected intake stage: MVP.",
      workCardBacklogMarkdown: "Next up: PH02 WC05 remains listed.",
      openQuestionsMarkdown:
        "- Which repair prompts remain unresolved before closeout?",
      decisionsMarkdown:
        "- Decide whether phase-02 must repair before phase-03 creation.",
      risksMarkdown:
        "- Risk: stale project state could start the wrong phase.",
      repositoryReconciliationRecommendedPhases: [
        "Phase 03: Workflow Router Screen Correction and Guided Current Action UI.",
        "Phase 04: Workflow Execution Hardening.",
      ],
      repositoryReconciliationRisks: [
        "Risk: generated plans could be mistaken for formal Work Cards.",
      ],
      existingRoadmapFileNames: [],
    },
    "2026-07-02T12:55:00.000Z",
  );
  const validationErrors = validateProjectRoadmapRecord(roadmap);

  if (validationErrors.length > 0) {
    console.error("Project Roadmap validation failed:");
    for (const error of validationErrors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const phase01 = roadmap.phaseMap.find((phase) => phase.phaseFolder === "phase-01");
  const phase02 = roadmap.phaseMap.find((phase) => phase.phaseFolder === "phase-02");
  const phase03 = roadmap.phaseMap.find((phase) => phase.phaseFolder === "phase-03");
  const phase07 = roadmap.phaseMap.find((phase) => phase.phaseFolder === "phase-07");

  if (
    phase01?.status !== "closed" ||
    phase02?.status !== "repair required" ||
    phase03?.status !== "proposed" ||
    phase07?.status !== "proposed"
  ) {
    console.error("Project Roadmap did not map expected phase statuses.");
    process.exit(1);
  }

  if (
    roadmap.nextExecutablePhase.kind !== "repair-current" ||
    roadmap.nextExecutablePhase.phaseFolder !== "phase-02" ||
    roadmap.nextExecutablePhase.shouldCreatePhaseFolder
  ) {
    console.error("Project Roadmap did not keep the next recommended action on current-phase repair.");
    process.exit(1);
  }

  const requiredWarnings = [
    "PROJECT_STATE and WORK_CARD_BACKLOG disagree",
    "MVP intake-stage label",
    "No prior Project Roadmap artifacts",
    "phase-02 has Validation Reports but no Closeout Report.",
    "phase-02 has Repair Prompts",
    "Future phases are mapped",
  ];
  const missingWarnings = requiredWarnings.filter(
    (text) =>
      !roadmap.staleStateWarnings.some((warning) => warning.includes(text)),
  );

  if (missingWarnings.length > 0) {
    console.error("Project Roadmap stale-state warnings are missing required text:");
    for (const text of missingWarnings) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const roadmapMarkdown = renderProjectRoadmapMarkdown(roadmap);
  const requiredRoadmapMarkdownText = [
    "# Project Roadmap: ChampCity A/I",
    "## Source Context",
    "## Artifact Authority Model",
    "## Proposed Roadmap Phases",
    "## Next Phase Recommendation",
    "## Proposed Work Card Plan",
    "## Stale-State Warnings",
    "## Next Phase Readiness Review Questions",
    "planning/project/Project_Roadmap/",
    "Work Card plans are planning artifacts",
    "Formal Work Cards = approved executable units saved under Work_Cards/.",
    "Activation decision required before execution: yes",
  ];
  const missingRoadmapMarkdownText = requiredRoadmapMarkdownText.filter(
    (text) => !roadmapMarkdown.includes(text),
  );

  if (missingRoadmapMarkdownText.length > 0) {
    console.error("Project Roadmap Markdown is missing required text:");
    for (const text of missingRoadmapMarkdownText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const roadmapFileNames = buildProjectRoadmapFileNames("ChampCity A/I");

  if (
    roadmapFileNames.jsonFileName !== "PROJECT_ROADMAP_champcity_a_i.json" ||
    roadmapFileNames.markdownFileName !== "PROJECT_ROADMAP_champcity_a_i.md"
  ) {
    console.error("Project Roadmap filename generation returned unexpected filenames.");
    process.exit(1);
  }

  const readinessFileNames = buildPhaseReadinessReviewFileNames("phase-02");

  if (
    readinessFileNames.jsonFileName !==
      "PHASE_READINESS_REVIEW_phase_02.json" ||
    readinessFileNames.markdownFileName !==
      "PHASE_READINESS_REVIEW_phase_02.md"
  ) {
    console.error("Phase Readiness Review filename generation returned unexpected filenames.");
    process.exit(1);
  }

  if (validateProjectRoadmapSlug("../bad").length === 0) {
    console.error("Project Roadmap slug sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (validateProjectRoadmapArtifactFileName("../bad.json").length === 0) {
    console.error("Project Roadmap artifact filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (
    validatePhaseReadinessReviewArtifactFileName("../bad.json").length === 0
  ) {
    console.error("Phase Readiness Review artifact filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (validateSavedProjectRoadmapJsonFileName("../bad.json").length === 0) {
    console.error("Saved Project Roadmap filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  try {
    resolveInside(resolveProjectRoadmapDirectory(), "../bad");
    console.error("Project Roadmap path sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  try {
    resolvePhaseReadinessReviewsDirectory("../bad");
    console.error("Phase Readiness Review directory sanitizer failed to reject unsafe phases.");
    process.exit(1);
  } catch {
    // Expected.
  }

  const readinessReview = buildPhaseReadinessReviewRecord(
    roadmap,
    "2026-07-02T13:00:00.000Z",
  );
  const readinessMarkdown = renderPhaseReadinessReviewMarkdown(readinessReview);

  if (
    !readinessMarkdown.includes("# Next Phase Readiness Review:") ||
    !readinessMarkdown.includes("Project Roadmap ID: PROJECT_ROADMAP_champcity_a_i")
  ) {
    console.error("Phase Readiness Review Markdown is missing Roadmap source context.");
    process.exit(1);
  }

  const roadmapWorkCardPlan = buildRoadmapWorkCardPlanRecord(
    roadmap,
    "2026-07-02T13:05:00.000Z",
  );

  if (
    !roadmapWorkCardPlan.planPurpose.includes(
      "does not create formal app-selectable Work Card JSON files",
    )
  ) {
    console.error("Roadmap Work Card Plan did not preserve planning-only boundary.");
    process.exit(1);
  }

  const compatibilityPhaseIntake = buildCompatibilityPhaseIntakeFromRoadmap(
    roadmap,
    "2026-07-02T13:10:00.000Z",
  );
  const compatibilityValidation = validatePhaseIntake(compatibilityPhaseIntake);

  if (!compatibilityValidation.valid) {
    console.error("Roadmap compatibility Phase Intake did not validate:");
    for (const error of compatibilityValidation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (
    compatibilityPhaseIntake.generationMode !== "architect-led" ||
    compatibilityPhaseIntake.operatorProjectWorkType !== "repair_pass" ||
    !compatibilityPhaseIntake.assumptions?.some((assumption) =>
      assumption.includes("Project Roadmap / Phase Map"),
    )
  ) {
    console.error("Roadmap compatibility Phase Intake did not record Roadmap authority.");
    process.exit(1);
  }

  const phaseMap = buildPhaseMapRecord(
    {
      projectPlanningDocumentFileName:
        "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json",
      repositoryReconciliationFileName:
        "REPOSITORY_RECONCILIATION_champcity_a_i.json",
      projectRoadmapFileName: "PROJECT_ROADMAP_champcity_a_i.json",
      sourceProjectPlanningDocuments: {
        recordId: "PROJECT_PLANNING_DOCUMENTS_champcity_a_i",
        projectName: "ChampCity A/I",
      },
      sourceProjectPlanningDocumentsMarkdownFileName:
        "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.md",
      sourceRepositoryReconciliation: {
        reconciliationId: "REPOSITORY_RECONCILIATION_champcity_a_i",
        projectName: "ChampCity A/I",
      },
      sourceRepositoryReconciliationMarkdownFileName:
        "REPOSITORY_RECONCILIATION_champcity_a_i.md",
      sourceProjectRoadmap: roadmap,
      sourceProjectRoadmapMarkdownFileName: "PROJECT_ROADMAP_champcity_a_i.md",
      existingPhaseArtifacts: [
        {
          phaseFolder: "phase-01",
          summary: phase01Summary,
          workCardPlanFileNames: ["WORK_CARD_PLAN_phase_01.md"],
          phasePlanningDocumentFileNames: [
            "PHASE_PLANNING_DOCUMENTS_phase_01.md",
          ],
          phaseReadinessReviewFileNames: [
            "PHASE_READINESS_REVIEW_phase_01.md",
          ],
        },
        {
          phaseFolder: "phase-02",
          summary: phase02Summary,
          workCardPlanFileNames: [],
          phasePlanningDocumentFileNames: [],
          phaseReadinessReviewFileNames: [],
        },
      ],
    },
    "2026-07-02T13:20:00.000Z",
  );
  const phaseMapValidationErrors = validatePhaseMapRecord(phaseMap);

  if (phaseMapValidationErrors.length > 0) {
    console.error("Phase Map validation failed:");
    for (const error of phaseMapValidationErrors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const phaseMapMarkdown = renderPhaseMapMarkdown(phaseMap);
  const requiredPhaseMapMarkdown = [
    "# Phase Map: ChampCity A/I",
    "Current/next phase:",
    "Activation boundary:",
    "Mapped Phase Records",
    "phase-03",
  ];
  const missingPhaseMapMarkdown = requiredPhaseMapMarkdown.filter(
    (text) => !phaseMapMarkdown.includes(text),
  );

  if (missingPhaseMapMarkdown.length > 0) {
    console.error("Phase Map Markdown is missing required text:");
    for (const text of missingPhaseMapMarkdown) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const phaseMapFileNames = buildPhaseMapFileNames("ChampCity A/I");

  if (
    phaseMapFileNames.jsonFileName !== "PHASE_MAP_champcity_a_i.json" ||
    phaseMapFileNames.markdownFileName !== "PHASE_MAP_champcity_a_i.md"
  ) {
    console.error("Phase Map filename generation returned unexpected filenames.");
    process.exit(1);
  }

  if (validatePhaseMapArtifactFileName("../bad.json").length === 0) {
    console.error("Phase Map artifact filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (validateSavedPhaseMapJsonFileName("../bad.json").length === 0) {
    console.error("Saved Phase Map filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  try {
    resolveInside(resolvePhaseMapDirectory(), "../bad");
    console.error("Phase Map path sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  const source = [
    readFileSync(rendererAppPath, "utf8"),
    readFileSync(preloadPath, "utf8"),
    readFileSync(mainWorkCardFileStorePath, "utf8"),
  ].join("\n");
  const requiredSourceText = [
    'label: "Phase Map"',
    "Phase Map Builder",
    "Project Roadmap",
    "Generate Roadmap",
    "Save Roadmap",
    "Save Roadmap & Draft Artifacts",
    "draft / pending-review next-phase",
    "activate a phase or create Formal Work Cards",
    "Advanced / Legacy Phase Intake",
    "Project_Roadmap",
    "Phase_Map",
    "Phase_Readiness_Reviews",
    "Project Roadmap source",
    "Compatibility Phase Intake source",
    "Open Project Roadmap Source",
    "Mapped Phase Source",
    "previewProjectRoadmap",
    "saveProjectRoadmap",
    "listSavedProjectRoadmaps",
    "previewPhaseMap",
    "savePhaseMap",
    "listSavedPhaseMaps",
    "validateSavedProjectRoadmapJsonFileName",
    "validateSavedPhaseMapJsonFileName",
    "resolveProjectRoadmapDirectory",
    "resolvePhaseMapDirectory",
    "resolvePhaseReadinessReviewsDirectory",
  ];
  const missingSourceText = requiredSourceText.filter(
    (text) => !source.includes(text),
  );

  if (missingSourceText.length > 0) {
    console.error("Project Roadmap source wiring is missing required text:");
    for (const text of missingSourceText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }
}

function assertRepositoryReconciliationAndPhasePlanning() {
  const projectPlanningRecord = buildProjectPlanningDocuments({
    projectIntake: projectIntakeFixture,
    sourceProjectIntakeJsonFileName: "PROJECT_INTAKE_champcity_a_i.json",
    sourceProjectIntakeMarkdownFileName: "PROJECT_INTAKE_champcity_a_i.md",
    architectInterviewOutput: [
      "## Confirmed facts",
      "- Project name: ChampCity A/I",
      "- Alpha app development is active.",
      "",
      "## Recommended initial phase candidates",
      "- Phase 02: upstream project planning.",
      "",
      "## Risks",
      "- Risk: do not add provider SDKs yet.",
    ].join("\n"),
    timestamp: "2026-07-02T12:00:00.000Z",
  });
  const reconciliationContext = {
    projectPlanningDocumentsSummary:
      "PROJECT_STATE.md says Phase 02 upstream planning is active.",
    selectedProjectPlanningDocumentsSummary:
      "Selected sidecar JSON: PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json",
    phaseArtifactSummary:
      "phase-02 has Work Cards, Builder_Reports, and Validation_Reports.",
    repositoryStructureSummary:
      "Repository root contains src, planning, scripts, and package.json.",
    appWorkflowSummary:
      "Project Intake, Project Plan, Reconcile, Phase Intake, Phase Interview, Phase Plan.",
  };
  const promptText = buildRepositoryReconciliationPromptText(
    {
      projectName: "ChampCity A/I",
      projectPlanningDocumentFileName:
        "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json",
      sourcePhaseFolder: "phase-02",
    },
    reconciliationContext,
  );
  const requiredPromptText = [
    "Act as Architect for repository and project-state reconciliation.",
    "Review current project planning documents.",
    "Current phase/work-card artifact summary:",
    "Safe repository structure summary:",
    "## Reviewed Artifact Summary",
    "## Recommended Roadmap",
    "Do not create formal Work Card JSON artifacts.",
  ];
  const missingPromptText = requiredPromptText.filter(
    (text) => !promptText.includes(text),
  );

  if (missingPromptText.length > 0) {
    console.error("Repository Reconciliation prompt is missing required text:");
    for (const text of missingPromptText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const reconciliationOutput = [
    "## Reviewed Artifact Summary",
    "- Reviewed project planning docs and phase artifacts.",
    "",
    "## Implemented State Summary",
    "- Project Intake, Project Planning Documents, Reconcile, Phase Intake, and Phase Interview are implemented.",
    "",
    "## Partially Implemented Items",
    "- Phase planning exists as a planned workflow but not a saved artifact yet.",
    "",
    "## Missing Items",
    "- Repository Reconciliation artifacts.",
    "- Phase Planning Documents artifacts.",
    "",
    "## Stale Planning Items",
    "- PROJECT_STATE still points at WC05.",
    "",
    "## Design Drift Notes",
    "- Keep reconciliation reusable for future projects.",
    "",
    "## Current Risks",
    "- Risk: generated plan could be mistaken for formal Work Cards.",
    "",
    "## Recommended Roadmap",
    "- Finish WC06, then convert selected plan items into formal Work Cards.",
    "",
    "## Recommended Milestones",
    "- Complete upstream phase planning.",
    "",
    "## Recommended Phases",
    "- Phase 03: formal Work Card conversion.",
    "",
    "## Recommended Next Phase",
    "- Phase 03: formal Work Card conversion.",
    "",
    "## Architect Notes",
    "- Preserve Operator / Architect / Implementer terminology.",
  ].join("\n");
  const reconciliation = buildRepositoryReconciliationRecord(
    {
      projectName: "ChampCity A/I",
      projectPlanningDocumentFileName:
        "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json",
      sourcePhaseFolder: "phase-02",
      architectReconciliationOutput: reconciliationOutput,
    },
    reconciliationContext,
    "2026-07-02T12:30:00.000Z",
  );
  const reconciliationMarkdown =
    renderRepositoryReconciliationMarkdown(reconciliation);
  const requiredReconciliationText = [
    "# Repository Reconciliation: ChampCity A/I",
    "## Implemented State Summary",
    "Repository Reconciliation artifacts.",
    "Phase 03: formal Work Card conversion.",
  ];
  const missingReconciliationText = requiredReconciliationText.filter(
    (text) => !reconciliationMarkdown.includes(text),
  );

  if (missingReconciliationText.length > 0) {
    console.error("Repository Reconciliation Markdown is missing required text:");
    for (const text of missingReconciliationText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const reconciliationFileNames =
    buildRepositoryReconciliationFileNames("ChampCity A/I");

  if (
    reconciliationFileNames.jsonFileName !==
      "REPOSITORY_RECONCILIATION_champcity_a_i.json" ||
    reconciliationFileNames.markdownFileName !==
      "REPOSITORY_RECONCILIATION_champcity_a_i.md"
  ) {
    console.error("Repository Reconciliation filename generation returned unexpected filenames.");
    process.exit(1);
  }

  if (
    validateRepositoryReconciliationArtifactFileName("../bad.json").length === 0
  ) {
    console.error("Repository Reconciliation artifact filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (
    validateSavedRepositoryReconciliationJsonFileName("../bad.json").length ===
    0
  ) {
    console.error("Saved Repository Reconciliation filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  try {
    resolveInside(resolveRepositoryReconciliationDirectory(), "../bad");
    console.error("Repository Reconciliation path sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  const phase02Files = createEmptyPhaseArtifactFiles();

  for (let index = 1; index <= 3; index += 1) {
    const workCardId = `WC${String(index).padStart(2, "0")}`;

    phase02Files.Work_Cards.push(`${workCardId}_phase_02_upstream_planning.json`);
    phase02Files.Work_Cards.push(`${workCardId}_phase_02_upstream_planning.md`);
    phase02Files.Builder_Reports.push(
      `BUILDER_REPORT_${workCardId}_phase_02_upstream_planning.md`,
    );
  }

  const phase02Summary = summarizePhaseArtifacts({
    phase: "phase-02",
    filesByFolder: phase02Files,
  });
  const projectRoadmap = buildProjectRoadmap(
    {
      projectName: "ChampCity A/I",
      mode: "project-roadmap",
      sourceProjectPlanningDocumentFileName:
        "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json",
      sourceRepositoryReconciliationFileName:
        "REPOSITORY_RECONCILIATION_champcity_a_i.json",
      operatorDirection:
        "Use the reviewed Roadmap to continue Phase 02 planning without manually inventing phase scope.",
      sourceArtifacts: [
        {
          label: "Repository Reconciliation",
          path: "planning/project/Repository_Reconciliation/REPOSITORY_RECONCILIATION_champcity_a_i.md",
          status: "selected",
        },
      ],
      phaseContexts: [
        {
          phase: "phase-02",
          summary: phase02Summary,
          workCardFileNames: phase02Files.Work_Cards,
          builderReportFileNames: phase02Files.Builder_Reports,
          validationReportFileNames: phase02Files.Validation_Reports,
          repairPromptFileNames: phase02Files.Repair_Prompts,
          closeoutReportFileNames: phase02Files.Closeout_Reports,
          workCardPlanFileNames: [],
          phasePlanningDocumentFileNames: [],
          phaseReadinessReviewFileNames: [],
        },
      ],
      projectStateMarkdown: "Current work: PH02 WC06.",
      workCardBacklogMarkdown: "Current backlog aligns with PH02 WC06.",
      repositoryReconciliationRecommendedPhases: reconciliation.recommendedPhases,
      repositoryReconciliationRisks: reconciliation.currentRisks,
      existingRoadmapFileNames: ["PROJECT_ROADMAP_previous_review.md"],
    },
    "2026-07-02T12:45:00.000Z",
  );
  const phaseMap = buildPhaseMapRecord(
    {
      projectPlanningDocumentFileName:
        "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json",
      repositoryReconciliationFileName:
        "REPOSITORY_RECONCILIATION_champcity_a_i.json",
      projectRoadmapFileName: "PROJECT_ROADMAP_champcity_a_i.json",
      sourceProjectPlanningDocuments: projectPlanningRecord,
      sourceProjectPlanningDocumentsMarkdownFileName:
        "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.md",
      sourceRepositoryReconciliation: reconciliation,
      sourceRepositoryReconciliationMarkdownFileName:
        "REPOSITORY_RECONCILIATION_champcity_a_i.md",
      sourceProjectRoadmap: projectRoadmap,
      sourceProjectRoadmapMarkdownFileName: "PROJECT_ROADMAP_champcity_a_i.md",
      existingPhaseArtifacts: [
        {
          phaseFolder: "phase-02",
          summary: phase02Summary,
          workCardPlanFileNames: [],
          phasePlanningDocumentFileNames: [],
          phaseReadinessReviewFileNames: [],
        },
      ],
    },
    "2026-07-02T12:47:00.000Z",
  );
  const selectedMappedPhase =
    phaseMap.mappedPhases.find(
      (phase) => phase.phaseId === phaseMap.currentOrNextPhase,
    ) ?? phaseMap.mappedPhases[0];
  const phaseClarificationAnswers = [
    "## Phase-Specific Clarification",
    "- Prioritize source safety.",
    "- Convert selected plan items into formal Work Cards only after Operator review.",
    "- Keep generated phase planning documents separate from acceptance records.",
  ].join("\n");
  const phasePlanningDocuments = buildPhasePlanningDocuments(
    {
      phaseFolder: selectedMappedPhase.phaseId,
      projectPlanningDocumentFileName:
        "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.json",
      repositoryReconciliationFileName:
        "REPOSITORY_RECONCILIATION_champcity_a_i.json",
      phaseMapFileName: "PHASE_MAP_champcity_a_i.json",
      mappedPhaseId: selectedMappedPhase.phaseId,
      projectRoadmapFileName: "PROJECT_ROADMAP_champcity_a_i.json",
      phaseClarificationAnswers,
      operatorPlanAdjustments: "Prioritize source safety.",
      sourceProjectPlanningDocuments: projectPlanningRecord,
      sourceProjectPlanningDocumentsMarkdownFileName:
        "PROJECT_PLANNING_DOCUMENTS_champcity_a_i.md",
      sourceRepositoryReconciliation: reconciliation,
      sourceRepositoryReconciliationMarkdownFileName:
        "REPOSITORY_RECONCILIATION_champcity_a_i.md",
      sourcePhaseMap: phaseMap,
      sourcePhaseMapMarkdownFileName: "PHASE_MAP_champcity_a_i.md",
      sourceMappedPhase: selectedMappedPhase,
      sourceProjectRoadmap: projectRoadmap,
      sourceProjectRoadmapMarkdownFileName: "PROJECT_ROADMAP_champcity_a_i.md",
    },
    "2026-07-02T13:00:00.000Z",
  );
  const phasePlanningMarkdown =
    renderPhasePlanningDocumentsMarkdown(phasePlanningDocuments);
  const workCardPlan = buildWorkCardPlanRecord(
    {
      projectName: phasePlanningDocuments.projectName,
      phaseFolder: phasePlanningDocuments.phaseFolder,
      phaseName: phasePlanningDocuments.phaseName,
      sourcePhasePlanningDocumentsId:
        phasePlanningDocuments.phasePlanningDocumentsId,
      phaseGoal: phasePlanningDocuments.phaseGoal,
      phaseScope: phasePlanningDocuments.phaseScope,
      phaseRisks: phasePlanningDocuments.phaseRisks,
      dependencies: phasePlanningDocuments.phaseDependencies,
      validationExpectations: phasePlanningDocuments.validationExpectations,
      recommendedImplementationSequence:
        phasePlanningDocuments.recommendedImplementationSequence,
      phaseArchitectInterviewOutput:
        phasePlanningDocuments.phaseArchitectInterviewOutput,
      operatorPlanAdjustments: phasePlanningDocuments.operatorPlanAdjustments,
    },
    "2026-07-02T13:00:00.000Z",
  );
  const workCardPlanMarkdown = renderWorkCardPlanMarkdown(workCardPlan);
  const backlogMarkdown = renderPhaseScopedBacklogMarkdown(workCardPlan);
  const combinedMarkdown = buildCombinedPhasePlanningMarkdown(
    phasePlanningMarkdown,
    workCardPlanMarkdown,
    backlogMarkdown,
  );
  const requiredPhasePlanningText = [
    `# Phase Planning Documents: ${selectedMappedPhase.phaseTitle}`,
    "Phase Map JSON: PHASE_MAP_champcity_a_i.json",
    `Mapped phase ID: ${selectedMappedPhase.phaseId}`,
    "Project Roadmap JSON: PROJECT_ROADMAP_champcity_a_i.json",
    "Phase Intake JSON: Not selected.",
    "Review status: Pending Review",
    "Phase activation status: Not Active",
    "## Artifact Authority",
    "## Formal Work Card Boundary",
    "Phase-Specific Clarification Answers",
    "## Repository Reconciliation Summary",
    "## Proposed Work Card Plan",
    `# Pending Review Work Card Plan: ${selectedMappedPhase.phaseTitle}`,
    `# Work Card Backlog: ${selectedMappedPhase.phaseTitle}`,
    "Draft / Pending Review / Not Active",
    "Formal Work Cards require a separate Operator approval step",
    "The formal Phase Map is the selectable phase authority",
  ];
  const missingPhasePlanningText = requiredPhasePlanningText.filter(
    (text) => !combinedMarkdown.includes(text),
  );

  if (missingPhasePlanningText.length > 0) {
    console.error("Phase Planning Documents output is missing required text:");
    for (const text of missingPhasePlanningText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const phasePlanningFileNames = buildPhasePlanningDocumentsFileNames(
    selectedMappedPhase.phaseTitle,
  );
  const workCardPlanFileNames = buildWorkCardPlanFileNames(
    selectedMappedPhase.phaseTitle,
  );

  if (
    phasePlanningFileNames.jsonFileName !==
      `${phasePlanningDocuments.phasePlanningDocumentsId}.json` ||
    phasePlanningFileNames.markdownFileName !==
      `${phasePlanningDocuments.phasePlanningDocumentsId}.md` ||
    workCardPlanFileNames.jsonFileName !==
      `${workCardPlan.workCardPlanId}.json` ||
    workCardPlanFileNames.markdownFileName !==
      `${workCardPlan.workCardPlanId}.md`
  ) {
    console.error("Phase Planning or Work Card Plan filename generation returned unexpected filenames.");
    process.exit(1);
  }

  if (
    validatePhasePlanningDocumentsArtifactFileName("../bad.json").length === 0
  ) {
    console.error("Phase Planning Documents filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (validateWorkCardPlanArtifactFileName("../bad.json").length === 0) {
    console.error("Work Card Plan filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  try {
    resolvePhasePlanningDocumentsDirectory("../bad");
    console.error("Phase Planning Documents directory sanitizer failed to reject unsafe phases.");
    process.exit(1);
  } catch {
    // Expected.
  }

  try {
    resolveWorkCardPlansDirectory("../bad");
    console.error("Work Card Plans directory sanitizer failed to reject unsafe phases.");
    process.exit(1);
  } catch {
    // Expected.
  }

  try {
    resolvePhaseScopedBacklogPath("../bad");
    console.error("Phase scoped backlog path sanitizer failed to reject unsafe phases.");
    process.exit(1);
  } catch {
    // Expected.
  }

  const source = [
    readFileSync(rendererAppPath, "utf8"),
    readFileSync(preloadPath, "utf8"),
    readFileSync(mainWorkCardFileStorePath, "utf8"),
  ].join("\n");
  const requiredSourceText = [
    'label: "Reconcile"',
    'label: "Phase Map"',
    "Repository Reconciliation",
    "Phase Map Builder",
    "Phase Planning Documents Generator",
    "Work Card Plan Review",
    "Draft / Pending Review / Not Active",
    "Generate Roadmap",
    "Generate / Update Phase Map",
    "Save Reconciliation",
    "Save Roadmap",
    "Save Phase Plan",
    "pending-review Work Card Plan proposal",
    "Formal Work Cards",
    "Draft this Work Card",
    "Manual/ad hoc mode is active",
    "Open Reconcile",
    "Open Phase Map",
    "Open Phase Planning Generator",
    "Open Phase Map Builder",
    "No saved Phase Map was found",
    "Run Phase Map Builder first",
    "Project Roadmap source",
    "Mapped Phase Source",
    "Phase-Specific Clarification",
    "Advanced / Legacy",
    "Repository_Reconciliation",
    "Project_Roadmap",
    "Phase_Map",
    "Phase_Readiness_Reviews",
    "Phase_Planning_Documents",
    "Work_Card_Plans",
    "WORK_CARD_BACKLOG.md",
    "previewRepositoryReconciliationPrompt",
    "saveRepositoryReconciliation",
    "previewProjectRoadmap",
    "saveProjectRoadmap",
    "listSavedProjectRoadmaps",
    "previewPhaseMap",
    "savePhaseMap",
    "listSavedPhaseMaps",
    "listPhasePlanningRepositoryReconciliations",
    "listPhasePlanningPhaseArchitectInterviewPrompts",
    "previewPhasePlanningDocuments",
    "savePhasePlanningDocuments",
    "listSavedWorkCardPlans",
    "validateSavedProjectRoadmapJsonFileName",
    "validateSavedPhaseMapJsonFileName",
    "validateSavedRepositoryReconciliationJsonFileName",
  ];
  const missingSourceText = requiredSourceText.filter(
    (text) => !source.includes(text),
  );

  if (missingSourceText.length > 0) {
    console.error("Repository Reconciliation and Phase Planning source wiring is missing required text:");
    for (const text of missingSourceText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }
}

function makeWorkCard(overrides = {}) {
  return {
    workCardId: "WCTEST",
    title: "Risk router test card",
    phase: "phase-01",
    status: "ready_for_architect",
    createdAt: "2026-06-29T00:00:00.000Z",
    updatedAt: "2026-06-29T00:00:00.000Z",
    problem: "Build a small UI validation change.",
    goal: "Make the workflow clearer.",
    userOutcome: "The Operator can review clearer guidance.",
    scope: ["Make a narrow change."],
    outOfScope: ["Avoid unrelated work."],
    requirements: ["Keep the change narrow."],
    acceptanceCriteria: ["The behavior is visible."],
    validationPlan: ["Run the lightweight validation script."],
    riskLevel: "medium",
    risks: ["Manual review is still required."],
    builderInstructions: ["Keep the Builder task narrow."],
    operatorNotes: ["This is a deterministic test card."],
    ...overrides,
  };
}
