import type {
  NextWorkCardIdResult,
  WorkCardDraftInput,
  WorkCardPreviewResult,
  WorkCardSaveResult,
} from "../shared/workCards/workCardDraft";
import type {
  ProjectIntake,
  ProjectIntakeInput,
  ProjectIntakePreviewResult,
  ProjectIntakeSaveResult,
  ProjectIntakeStage,
} from "../shared/workCards/projectIntake";
import type { ProjectIntakeValidationResult } from "../shared/workCards/validateProjectIntake";
import type {
  InvalidSavedProjectIntakeFile,
  ListSavedProjectIntakesResult,
  ProjectArchitectInterviewPrompt,
  ProjectArchitectInterviewPromptPreviewResult,
  ProjectArchitectInterviewPromptRequest,
  ProjectArchitectInterviewPromptSaveResult,
  SavedProjectIntakeSummary,
} from "../shared/workCards/projectArchitectInterviewPrompt";
import type {
  InvalidSavedProjectArchitectInterviewPromptFile,
  ListSavedProjectArchitectInterviewPromptsResult,
  InvalidSavedProjectPlanningDocumentsFile,
  ListSavedProjectPlanningDocumentsResult,
  ProjectPlanningDocumentArtifact,
  ProjectPlanningDocumentsPreviewResult,
  ProjectPlanningDocumentsRecord,
  ProjectPlanningDocumentsRequest,
  ProjectPlanningDocumentsSaveResult,
  SavedProjectArchitectInterviewPromptSummary,
  SavedProjectPlanningDocumentsSummary,
} from "../shared/workCards/projectPlanningDocuments";
import type {
  PhaseIntake,
  PhaseIntakeInput,
  PhaseIntakePreviewResult,
  PhaseIntakeSaveResult,
} from "../shared/workCards/phaseIntake";
import type { PhaseIntakeValidationResult } from "../shared/workCards/validatePhaseIntake";
import type {
  InvalidSavedPhaseArchitectInterviewPromptFile,
  InvalidSavedPhaseIntakeFile,
  ListSavedPhaseArchitectInterviewPromptsResult,
  ListSavedPhaseIntakesResult,
  PhaseArchitectInterviewPrompt,
  PhaseArchitectInterviewPromptPreviewResult,
  PhaseArchitectInterviewPromptRequest,
  PhaseArchitectInterviewPromptSaveResult,
  SavedPhaseArchitectInterviewPromptSummary,
  SavedPhaseIntakeSummary,
} from "../shared/workCards/phaseArchitectInterviewPrompt";
import type {
  InvalidSavedRepositoryReconciliationFile,
  ListSavedRepositoryReconciliationsResult,
  RepositoryReconciliationPreviewResult,
  RepositoryReconciliationPromptPreviewResult,
  RepositoryReconciliationPromptRequest,
  RepositoryReconciliationRecord,
  RepositoryReconciliationRequest,
  RepositoryReconciliationSaveResult,
  SavedRepositoryReconciliationSummary,
} from "../shared/workCards/repositoryReconciliation";
import type {
  PhasePlanningDocumentsPreviewResult,
  PhasePlanningDocumentsRecord,
  PhasePlanningDocumentsRequest,
  PhasePlanningDocumentsSaveResult,
} from "../shared/workCards/phasePlanningDocuments";
import type {
  InvalidSavedProjectRoadmapFile,
  ListSavedProjectRoadmapsResult,
  ProjectRoadmapNextPhaseArtifactPreview,
  ProjectRoadmapPreviewResult,
  ProjectRoadmapRecord,
  ProjectRoadmapRequest,
  ProjectRoadmapSaveResult,
  SavedProjectRoadmapSummary,
} from "../shared/workCards/projectRoadmap";
import type {
  InvalidSavedPhaseMapFile,
  ListSavedPhaseMapsResult,
  PhaseMapRequest,
  PhaseMapPreviewResult,
  PhaseMapRecord,
  PhaseMapSaveResult,
  SavedMappedPhaseSummary,
  SavedPhaseMapSummary,
} from "../shared/workCards/phaseMap";
import type {
  InvalidSavedWorkCardPlanFile,
  ListSavedWorkCardPlansResult,
  SavedWorkCardPlanSummary,
  WorkCardPlanItem,
  WorkCardPlanRecord,
} from "../shared/workCards/workCardPlan";
import type {
  ArchitectPromptPreviewResult,
  ArchitectPromptRequest,
  ArchitectPromptSaveResult,
  InvalidSavedWorkCardFile,
  ListSavedWorkCardsResult,
  SavedWorkCardSummary,
} from "../shared/workCards/renderArchitectFramingPrompt";
import type {
  ImplementerExecutionPacketArtifactListResult,
  ImplementerExecutionPacketArtifactOption,
  ImplementerExecutionPacketArtifactOptions,
  ImplementerExecutionPacketPreviewResult,
  ImplementerExecutionPacketRequest,
  ImplementerExecutionPacketSaveResult,
  ImplementerExecutionPacketSupportingArtifactFileNames,
  InvalidImplementerExecutionPacketArtifactFile,
} from "../shared/workCards/renderImplementerExecutionPacket";
import type {
  ImplementerReportCapturePreviewResult,
  ImplementerReportCaptureRequest,
  ImplementerReportCaptureSaveResult,
  ImplementerReportType,
  ImplementerReportValidationResult,
} from "../shared/workCards/validateImplementerReport";
import type {
  RiskReviewPreviewResult,
  RiskReviewRequest,
  RiskReviewSaveResult,
} from "../shared/workCards/renderRiskReviewMarkdown";
import type { WorkCardRiskReview } from "../shared/workCards/riskRouter";
import type {
  AvailablePhaseFoldersResult,
  ImplementerReportFileLoadRequest,
  ImplementerReportFileLoadResult,
  HumanValidationImplementerReportListRequest,
  HumanValidationImplementerReportListResult,
  HumanValidationImplementerReportOption,
  HumanValidationFormInput,
  HumanValidationOperatorDecision,
  HumanValidationPreviewResult,
  HumanValidationResult,
  HumanValidationSaveResult,
  HumanValidationStatusListResult,
  HumanValidationStatusSummary,
  InvalidHumanValidationImplementerReportFile,
  ManualValidationChecklistExtraction,
  ValidationEvidenceFileImportRequest,
  ValidationEvidenceFileImportResult,
} from "../shared/workCards/validationRecord";
import type {
  InvalidValidationTargetFile,
  ListValidationTargetsResult,
  ValidationTargetSummary,
} from "../shared/workCards/validationTarget";
import type {
  PhaseArtifactFolderSummary,
  PhaseArtifactSummary,
  PhaseWorkCardArtifactPair,
} from "../shared/workCards/phaseCloseout";
import type {
  NextPhaseActivationDecision,
  PhaseCloseoutDecision,
  PhaseCloseoutFormInput,
  PhaseCloseoutPreviewResult,
  PhaseCloseoutRecord,
  PhaseCloseoutSaveResult,
  PhaseCloseoutSummaryResult,
} from "../shared/workCards/phaseCloseoutRecord";
import type {
  CurrentRequiredAction,
  CurrentRequiredActionResult,
  CurrentRequiredActionWarning,
} from "../shared/workCards/currentActionProjection";
import type {
  RouteReviewRequestInput,
  RouteReviewRequestRecord,
  RouteReviewRequestSaveResult,
} from "../shared/workCards/routeReviewRequest";
import type { ArchitectTaskPacketSaveResult } from "../shared/workCards/architectTaskPacket";
import type {
  ArchitectReviewFormInput,
  ArchitectReviewPreviewResult,
  ArchitectReviewSaveResult,
} from "../shared/workCards/architectReviewRecord";
import type {
  ArtifactReviewEntry,
  ArtifactReviewExpectedOutput,
  ArtifactReviewGroup,
  ArtifactReviewMissingEntry,
  ArtifactReviewWorkspaceModel,
  PlanningArtifactPreviewRequest,
  PlanningArtifactPreviewResult,
} from "../shared/workCards/artifactReviewWorkspace";
import type {
  ContextPacketExportResult,
  CurrentContextPacketExportRequest,
  CurrentContextPacketPreviewRequest,
  CurrentContextPacketPreviewResult,
} from "../shared/contextPackets/contextPacket";
import type {
  AddProjectWorkspaceRequest,
  ProjectFolderSelectionResult,
  ProjectScanResult,
  ProjectWorkspaceListResult,
  ProjectWorkspaceMutationResult,
  RefreshRepositoryStateResult,
} from "../shared/projects";

declare global {
  type ChampCityWorkCardDraftInput = WorkCardDraftInput;
  type ChampCityProjectIntake = ProjectIntake;
  type ChampCityProjectIntakeInput = ProjectIntakeInput;
  type ChampCityProjectIntakeStage = ProjectIntakeStage;
  type ChampCityProjectIntakeValidationResult =
    ProjectIntakeValidationResult;
  type ChampCityProjectIntakePreviewResult = ProjectIntakePreviewResult;
  type ChampCityProjectIntakeSaveResult = ProjectIntakeSaveResult;
  type ChampCityProjectArchitectInterviewPrompt =
    ProjectArchitectInterviewPrompt;
  type ChampCityProjectArchitectInterviewPromptRequest =
    ProjectArchitectInterviewPromptRequest;
  type ChampCityProjectArchitectInterviewPromptPreviewResult =
    ProjectArchitectInterviewPromptPreviewResult;
  type ChampCityProjectArchitectInterviewPromptSaveResult =
    ProjectArchitectInterviewPromptSaveResult;
  type ChampCitySavedProjectIntakeSummary = SavedProjectIntakeSummary;
  type ChampCityInvalidSavedProjectIntakeFile =
    InvalidSavedProjectIntakeFile;
  type ChampCityListSavedProjectIntakesResult =
    ListSavedProjectIntakesResult;
  type ChampCitySavedProjectArchitectInterviewPromptSummary =
    SavedProjectArchitectInterviewPromptSummary;
  type ChampCityInvalidSavedProjectArchitectInterviewPromptFile =
    InvalidSavedProjectArchitectInterviewPromptFile;
  type ChampCityListSavedProjectArchitectInterviewPromptsResult =
    ListSavedProjectArchitectInterviewPromptsResult;
  type ChampCityProjectPlanningDocumentsRequest =
    ProjectPlanningDocumentsRequest;
  type ChampCityProjectPlanningDocumentArtifact =
    ProjectPlanningDocumentArtifact;
  type ChampCityProjectPlanningDocumentsRecord =
    ProjectPlanningDocumentsRecord;
  type ChampCityProjectPlanningDocumentsPreviewResult =
    ProjectPlanningDocumentsPreviewResult;
  type ChampCityProjectPlanningDocumentsSaveResult =
    ProjectPlanningDocumentsSaveResult;
  type ChampCitySavedProjectPlanningDocumentsSummary =
    SavedProjectPlanningDocumentsSummary;
  type ChampCityInvalidSavedProjectPlanningDocumentsFile =
    InvalidSavedProjectPlanningDocumentsFile;
  type ChampCityListSavedProjectPlanningDocumentsResult =
    ListSavedProjectPlanningDocumentsResult;
  type ChampCityPhaseIntake = PhaseIntake;
  type ChampCityPhaseIntakeInput = PhaseIntakeInput;
  type ChampCityPhaseIntakeValidationResult =
    PhaseIntakeValidationResult;
  type ChampCityPhaseIntakePreviewResult = PhaseIntakePreviewResult;
  type ChampCityPhaseIntakeSaveResult = PhaseIntakeSaveResult;
  type ChampCityPhaseArchitectInterviewPrompt =
    PhaseArchitectInterviewPrompt;
  type ChampCityPhaseArchitectInterviewPromptRequest =
    PhaseArchitectInterviewPromptRequest;
  type ChampCityPhaseArchitectInterviewPromptPreviewResult =
    PhaseArchitectInterviewPromptPreviewResult;
  type ChampCityPhaseArchitectInterviewPromptSaveResult =
    PhaseArchitectInterviewPromptSaveResult;
  type ChampCitySavedPhaseArchitectInterviewPromptSummary =
    SavedPhaseArchitectInterviewPromptSummary;
  type ChampCityInvalidSavedPhaseArchitectInterviewPromptFile =
    InvalidSavedPhaseArchitectInterviewPromptFile;
  type ChampCityListSavedPhaseArchitectInterviewPromptsResult =
    ListSavedPhaseArchitectInterviewPromptsResult;
  type ChampCitySavedPhaseIntakeSummary = SavedPhaseIntakeSummary;
  type ChampCityInvalidSavedPhaseIntakeFile =
    InvalidSavedPhaseIntakeFile;
  type ChampCityListSavedPhaseIntakesResult =
    ListSavedPhaseIntakesResult;
  type ChampCityRepositoryReconciliationPromptRequest =
    RepositoryReconciliationPromptRequest;
  type ChampCityRepositoryReconciliationRequest =
    RepositoryReconciliationRequest;
  type ChampCityRepositoryReconciliationRecord =
    RepositoryReconciliationRecord;
  type ChampCityRepositoryReconciliationPromptPreviewResult =
    RepositoryReconciliationPromptPreviewResult;
  type ChampCityRepositoryReconciliationPreviewResult =
    RepositoryReconciliationPreviewResult;
  type ChampCityRepositoryReconciliationSaveResult =
    RepositoryReconciliationSaveResult;
  type ChampCitySavedRepositoryReconciliationSummary =
    SavedRepositoryReconciliationSummary;
  type ChampCityInvalidSavedRepositoryReconciliationFile =
    InvalidSavedRepositoryReconciliationFile;
  type ChampCityListSavedRepositoryReconciliationsResult =
    ListSavedRepositoryReconciliationsResult;
  type ChampCityPhasePlanningDocumentsRequest =
    PhasePlanningDocumentsRequest;
  type ChampCityPhasePlanningDocumentsRecord =
    PhasePlanningDocumentsRecord;
  type ChampCityPhasePlanningDocumentsPreviewResult =
    PhasePlanningDocumentsPreviewResult;
  type ChampCityPhasePlanningDocumentsSaveResult =
    PhasePlanningDocumentsSaveResult;
  type ChampCityProjectRoadmapRequest = ProjectRoadmapRequest;
  type ChampCityProjectRoadmapRecord = ProjectRoadmapRecord;
  type ChampCityProjectRoadmapPreviewResult = ProjectRoadmapPreviewResult;
  type ChampCityProjectRoadmapSaveResult = ProjectRoadmapSaveResult;
  type ChampCityProjectRoadmapNextPhaseArtifactPreview =
    ProjectRoadmapNextPhaseArtifactPreview;
  type ChampCitySavedProjectRoadmapSummary = SavedProjectRoadmapSummary;
  type ChampCityInvalidSavedProjectRoadmapFile =
    InvalidSavedProjectRoadmapFile;
  type ChampCityListSavedProjectRoadmapsResult = ListSavedProjectRoadmapsResult;
  type ChampCityPhaseMapRequest = PhaseMapRequest;
  type ChampCityPhaseMapRecord = PhaseMapRecord;
  type ChampCityPhaseMapPreviewResult = PhaseMapPreviewResult;
  type ChampCityPhaseMapSaveResult = PhaseMapSaveResult;
  type ChampCitySavedMappedPhaseSummary = SavedMappedPhaseSummary;
  type ChampCitySavedPhaseMapSummary = SavedPhaseMapSummary;
  type ChampCityInvalidSavedPhaseMapFile = InvalidSavedPhaseMapFile;
  type ChampCityListSavedPhaseMapsResult = ListSavedPhaseMapsResult;
  type ChampCityWorkCardPlanItem = WorkCardPlanItem;
  type ChampCityWorkCardPlanRecord = WorkCardPlanRecord;
  type ChampCitySavedWorkCardPlanSummary = SavedWorkCardPlanSummary;
  type ChampCityInvalidSavedWorkCardPlanFile = InvalidSavedWorkCardPlanFile;
  type ChampCityListSavedWorkCardPlansResult = ListSavedWorkCardPlansResult;
  type ChampCityWorkCardPreviewResult = WorkCardPreviewResult;
  type ChampCityWorkCardSaveResult = WorkCardSaveResult;
  type ChampCityNextWorkCardIdResult = NextWorkCardIdResult;
  type ChampCitySavedWorkCardSummary = SavedWorkCardSummary;
  type ChampCityInvalidSavedWorkCardFile = InvalidSavedWorkCardFile;
  type ChampCityArchitectPromptRequest = ArchitectPromptRequest;
  type ChampCityListSavedWorkCardsResult = ListSavedWorkCardsResult;
  type ChampCityArchitectPromptPreviewResult = ArchitectPromptPreviewResult;
  type ChampCityArchitectPromptSaveResult = ArchitectPromptSaveResult;
  type ChampCityRiskReviewRequest = RiskReviewRequest;
  type ChampCityRiskReviewPreviewResult = RiskReviewPreviewResult;
  type ChampCityRiskReviewSaveResult = RiskReviewSaveResult;
  type ChampCityWorkCardRiskReview = WorkCardRiskReview;
  type ChampCityImplementerExecutionPacketRequest = ImplementerExecutionPacketRequest;
  type ChampCityImplementerExecutionPacketArtifactListResult =
    ImplementerExecutionPacketArtifactListResult;
  type ChampCityImplementerExecutionPacketArtifactOptions = ImplementerExecutionPacketArtifactOptions;
  type ChampCityImplementerExecutionPacketArtifactOption = ImplementerExecutionPacketArtifactOption;
  type ChampCityInvalidImplementerExecutionPacketArtifactFile =
    InvalidImplementerExecutionPacketArtifactFile;
  type ChampCityImplementerExecutionPacketSupportingArtifactFileNames =
    ImplementerExecutionPacketSupportingArtifactFileNames;
  type ChampCityImplementerExecutionPacketPreviewResult = ImplementerExecutionPacketPreviewResult;
  type ChampCityImplementerExecutionPacketSaveResult = ImplementerExecutionPacketSaveResult;
  type ChampCityImplementerReportType = ImplementerReportType;
  type ChampCityImplementerReportValidationResult = ImplementerReportValidationResult;
  type ChampCityImplementerReportCaptureRequest = ImplementerReportCaptureRequest;
  type ChampCityImplementerReportCapturePreviewResult =
    ImplementerReportCapturePreviewResult;
  type ChampCityImplementerReportCaptureSaveResult =
    ImplementerReportCaptureSaveResult;
  type ChampCityHumanValidationResult = HumanValidationResult;
  type ChampCityHumanValidationOperatorDecision =
    HumanValidationOperatorDecision;
  type ChampCityHumanValidationFormInput = HumanValidationFormInput;
  type ChampCityHumanValidationImplementerReportOption =
    HumanValidationImplementerReportOption;
  type ChampCityInvalidHumanValidationImplementerReportFile =
    InvalidHumanValidationImplementerReportFile;
  type ChampCityManualValidationChecklistExtraction =
    ManualValidationChecklistExtraction;
  type ChampCityHumanValidationImplementerReportListRequest =
    HumanValidationImplementerReportListRequest;
  type ChampCityHumanValidationImplementerReportListResult =
    HumanValidationImplementerReportListResult;
  type ChampCityHumanValidationPreviewResult = HumanValidationPreviewResult;
  type ChampCityHumanValidationSaveResult = HumanValidationSaveResult;
  type ChampCityHumanValidationStatusSummary = HumanValidationStatusSummary;
  type ChampCityHumanValidationStatusListResult =
    HumanValidationStatusListResult;
  type ChampCityValidationTargetSummary = ValidationTargetSummary;
  type ChampCityInvalidValidationTargetFile = InvalidValidationTargetFile;
  type ChampCityListValidationTargetsResult = ListValidationTargetsResult;
  type ChampCityPhaseArtifactFolderSummary = PhaseArtifactFolderSummary;
  type ChampCityPhaseArtifactSummary = PhaseArtifactSummary;
  type ChampCityPhaseWorkCardArtifactPair = PhaseWorkCardArtifactPair;
  type ChampCityPhaseCloseoutDecision = PhaseCloseoutDecision;
  type ChampCityNextPhaseActivationDecision = NextPhaseActivationDecision;
  type ChampCityPhaseCloseoutFormInput = PhaseCloseoutFormInput;
  type ChampCityPhaseCloseoutRecord = PhaseCloseoutRecord;
  type ChampCityPhaseCloseoutSummaryResult = PhaseCloseoutSummaryResult;
  type ChampCityPhaseCloseoutPreviewResult = PhaseCloseoutPreviewResult;
  type ChampCityPhaseCloseoutSaveResult = PhaseCloseoutSaveResult;
  type ChampCityAvailablePhaseFoldersResult = AvailablePhaseFoldersResult;
  type ChampCityImplementerReportFileLoadRequest =
    ImplementerReportFileLoadRequest;
  type ChampCityImplementerReportFileLoadResult = ImplementerReportFileLoadResult;
  type ChampCityValidationEvidenceFileImportRequest =
    ValidationEvidenceFileImportRequest;
  type ChampCityValidationEvidenceFileImportResult =
    ValidationEvidenceFileImportResult;
  type ChampCityCurrentRequiredAction = CurrentRequiredAction;
  type ChampCityCurrentRequiredActionWarning =
    CurrentRequiredActionWarning;
  type ChampCityCurrentRequiredActionResult =
    CurrentRequiredActionResult;
  type ChampCityRouteReviewRequestInput = RouteReviewRequestInput;
  type ChampCityRouteReviewRequestRecord = RouteReviewRequestRecord;
  type ChampCityRouteReviewRequestSaveResult = RouteReviewRequestSaveResult;
  type ChampCityArtifactReviewEntry = ArtifactReviewEntry;
  type ChampCityArtifactReviewExpectedOutput = ArtifactReviewExpectedOutput;
  type ChampCityArtifactReviewGroup = ArtifactReviewGroup;
  type ChampCityArtifactReviewMissingEntry = ArtifactReviewMissingEntry;
  type ChampCityArtifactReviewWorkspaceModel = ArtifactReviewWorkspaceModel;
  type ChampCityPlanningArtifactPreviewRequest =
    PlanningArtifactPreviewRequest;
  type ChampCityPlanningArtifactPreviewResult = PlanningArtifactPreviewResult;
  type ChampCityCurrentContextPacketPreviewRequest =
    CurrentContextPacketPreviewRequest;
  type ChampCityCurrentContextPacketPreviewResult =
    CurrentContextPacketPreviewResult;
  type ChampCityContextPacketExportResult = ContextPacketExportResult;

  interface Window {
    champCity: {
      listProjects: () => Promise<ProjectWorkspaceListResult>;
      chooseProjectFolder: () => Promise<ProjectFolderSelectionResult>;
      addProject: (
        input: AddProjectWorkspaceRequest,
      ) => Promise<ProjectWorkspaceMutationResult>;
      selectProject: (
        projectId: string,
      ) => Promise<ProjectWorkspaceMutationResult>;
      refreshRepositoryState: () => Promise<RefreshRepositoryStateResult>;
      showArchitectBrowser: (bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
      }) => Promise<{ ok: boolean; errorMessages?: string[] }>;
      resizeArchitectBrowser: (bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
      }) => Promise<{ ok: boolean; errorMessages?: string[] }>;
      hideArchitectBrowser: () => Promise<{ ok: boolean; errorMessages?: string[] }>;
      onRepositoryProjectionChanged: (
        listener: (result: ProjectScanResult) => void,
      ) => () => void;
      getAppInfo: () => {
        name: string;
        stage: string;
        coreLoop: string[];
      };
      listAvailablePhases: () => Promise<AvailablePhaseFoldersResult>;
      previewProjectIntake: (
        input: ProjectIntakeInput,
      ) => Promise<ProjectIntakePreviewResult>;
      saveProjectIntake: (
        input: ProjectIntakeInput,
      ) => Promise<ProjectIntakeSaveResult>;
      listSavedProjectIntakes: () => Promise<ListSavedProjectIntakesResult>;
      previewProjectArchitectInterviewPrompt: (
        input: ProjectArchitectInterviewPromptRequest,
      ) => Promise<ProjectArchitectInterviewPromptPreviewResult>;
      saveProjectArchitectInterviewPrompt: (
        input: ProjectArchitectInterviewPromptRequest,
      ) => Promise<ProjectArchitectInterviewPromptSaveResult>;
      listProjectPlanningDocumentProjectIntakes: () => Promise<ListSavedProjectIntakesResult>;
      listProjectPlanningDocumentArchitectPrompts: () => Promise<ListSavedProjectArchitectInterviewPromptsResult>;
      previewProjectPlanningDocuments: (
        input: ProjectPlanningDocumentsRequest,
      ) => Promise<ProjectPlanningDocumentsPreviewResult>;
      saveProjectPlanningDocuments: (
        input: ProjectPlanningDocumentsRequest,
      ) => Promise<ProjectPlanningDocumentsSaveResult>;
      listPhaseIntakeProjectPlanningDocuments: () => Promise<ListSavedProjectPlanningDocumentsResult>;
      previewPhaseIntake: (
        input: PhaseIntakeInput,
      ) => Promise<PhaseIntakePreviewResult>;
      savePhaseIntake: (
        input: PhaseIntakeInput,
      ) => Promise<PhaseIntakeSaveResult>;
      listPhaseArchitectInterviewPhaseIntakes: (
        phase: string,
      ) => Promise<ListSavedPhaseIntakesResult>;
      previewPhaseArchitectInterviewPrompt: (
        input: PhaseArchitectInterviewPromptRequest,
      ) => Promise<PhaseArchitectInterviewPromptPreviewResult>;
      savePhaseArchitectInterviewPrompt: (
        input: PhaseArchitectInterviewPromptRequest,
      ) => Promise<PhaseArchitectInterviewPromptSaveResult>;
      listRepositoryReconciliationProjectPlanningDocuments: () => Promise<ListSavedProjectPlanningDocumentsResult>;
      previewRepositoryReconciliationPrompt: (
        input: RepositoryReconciliationPromptRequest,
      ) => Promise<RepositoryReconciliationPromptPreviewResult>;
      previewRepositoryReconciliation: (
        input: RepositoryReconciliationRequest,
      ) => Promise<RepositoryReconciliationPreviewResult>;
      saveRepositoryReconciliation: (
        input: RepositoryReconciliationRequest,
      ) => Promise<RepositoryReconciliationSaveResult>;
      previewProjectRoadmap: (
        input: ProjectRoadmapRequest,
      ) => Promise<ProjectRoadmapPreviewResult>;
      saveProjectRoadmap: (
        input: ProjectRoadmapRequest,
      ) => Promise<ProjectRoadmapSaveResult>;
      listSavedProjectRoadmaps: () => Promise<ListSavedProjectRoadmapsResult>;
      previewPhaseMap: (
        input: PhaseMapRequest,
      ) => Promise<PhaseMapPreviewResult>;
      savePhaseMap: (input: PhaseMapRequest) => Promise<PhaseMapSaveResult>;
      listSavedPhaseMaps: () => Promise<ListSavedPhaseMapsResult>;
      listPhasePlanningProjectPlanningDocuments: () => Promise<ListSavedProjectPlanningDocumentsResult>;
      listPhasePlanningRepositoryReconciliations: () => Promise<ListSavedRepositoryReconciliationsResult>;
      listPhasePlanningPhaseIntakes: (
        phase: string,
      ) => Promise<ListSavedPhaseIntakesResult>;
      listPhasePlanningPhaseArchitectInterviewPrompts: (
        phase: string,
      ) => Promise<ListSavedPhaseArchitectInterviewPromptsResult>;
      previewPhasePlanningDocuments: (
        input: PhasePlanningDocumentsRequest,
      ) => Promise<PhasePlanningDocumentsPreviewResult>;
      savePhasePlanningDocuments: (
        input: PhasePlanningDocumentsRequest,
      ) => Promise<PhasePlanningDocumentsSaveResult>;
      listSavedWorkCardPlans: (
        phase: string,
      ) => Promise<ListSavedWorkCardPlansResult>;
      getNextWorkCardId: (phase: string) => Promise<NextWorkCardIdResult>;
      previewWorkCardDraft: (
        input: WorkCardDraftInput,
      ) => Promise<WorkCardPreviewResult>;
      saveWorkCardDraft: (
        input: WorkCardDraftInput,
      ) => Promise<WorkCardSaveResult>;
      listSavedWorkCards: (
        phase: string,
      ) => Promise<ListSavedWorkCardsResult>;
      previewArchitectPrompt: (
        input: ArchitectPromptRequest,
      ) => Promise<ArchitectPromptPreviewResult>;
      saveArchitectPrompt: (
        input: ArchitectPromptRequest,
      ) => Promise<ArchitectPromptSaveResult>;
      previewRiskReview: (
        input: RiskReviewRequest,
      ) => Promise<RiskReviewPreviewResult>;
      saveRiskReview: (
        input: RiskReviewRequest,
      ) => Promise<RiskReviewSaveResult>;
      listImplementerExecutionPacketSupportingArtifacts: (
        input: ImplementerExecutionPacketRequest,
      ) => Promise<ImplementerExecutionPacketArtifactListResult>;
      previewImplementerExecutionPacket: (
        input: ImplementerExecutionPacketRequest,
      ) => Promise<ImplementerExecutionPacketPreviewResult>;
      saveImplementerExecutionPacket: (
        input: ImplementerExecutionPacketRequest,
      ) => Promise<ImplementerExecutionPacketSaveResult>;
      previewImplementerReportCapture: (
        input: ImplementerReportCaptureRequest,
      ) => Promise<ImplementerReportCapturePreviewResult>;
      saveImplementerReportCapture: (
        input: ImplementerReportCaptureRequest,
      ) => Promise<ImplementerReportCaptureSaveResult>;
      previewArchitectReviewRecord: (
        input: ArchitectReviewFormInput,
      ) => Promise<ArchitectReviewPreviewResult>;
      saveArchitectReviewRecord: (
        input: ArchitectReviewFormInput,
      ) => Promise<ArchitectReviewSaveResult>;
      saveCompletedViaRepairDisposition: (input: {
        rationale: string;
      }) => Promise<{
        ok: boolean;
        jsonPath?: string;
        markdownPath?: string;
        nextActionId?: string | null;
        errorMessages?: string[];
      }>;
      ensureArchitectTaskPacket: () => Promise<ArchitectTaskPacketSaveResult>;
      loadImplementerReportFile: (
        input: ImplementerReportFileLoadRequest,
      ) => Promise<ImplementerReportFileLoadResult>;
      listHumanValidationImplementerReports: (
        input: HumanValidationImplementerReportListRequest,
      ) => Promise<HumanValidationImplementerReportListResult>;
      listHumanValidationTargets: (
        phase: string,
      ) => Promise<ListValidationTargetsResult>;
      listHumanValidationStatuses: (
        phase: string,
      ) => Promise<HumanValidationStatusListResult>;
      previewHumanValidationRecord: (
        input: HumanValidationFormInput,
      ) => Promise<HumanValidationPreviewResult>;
      saveHumanValidationRecord: (
        input: HumanValidationFormInput,
      ) => Promise<HumanValidationSaveResult>;
      attachValidationEvidenceFile: (
        input: ValidationEvidenceFileImportRequest,
      ) => Promise<ValidationEvidenceFileImportResult>;
      getPhaseCloseoutSummary: (
        phase: string,
      ) => Promise<PhaseCloseoutSummaryResult>;
      getCurrentRequiredAction: () => Promise<CurrentRequiredActionResult>;
      previewCurrentContextPacket: (
        input: CurrentContextPacketPreviewRequest,
      ) => Promise<CurrentContextPacketPreviewResult>;
      exportCurrentContextPacket: (
        input: CurrentContextPacketExportRequest,
      ) => Promise<ContextPacketExportResult>;
      saveRouteReviewRequest: (
        input: RouteReviewRequestInput,
      ) => Promise<RouteReviewRequestSaveResult>;
      previewPlanningArtifact: (
        input: PlanningArtifactPreviewRequest,
      ) => Promise<PlanningArtifactPreviewResult>;
      previewPhaseCloseoutRecord: (
        input: PhaseCloseoutFormInput,
      ) => Promise<PhaseCloseoutPreviewResult>;
      savePhaseCloseoutRecord: (
        input: PhaseCloseoutFormInput,
      ) => Promise<PhaseCloseoutSaveResult>;
    };
  }
}
