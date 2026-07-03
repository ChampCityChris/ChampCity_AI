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
  PhaseMapBuilderRequest,
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
  BuilderPromptArtifactListResult,
  BuilderPromptArtifactOption,
  BuilderPromptArtifactOptions,
  BuilderPromptPreviewResult,
  BuilderPromptRequest,
  BuilderPromptSaveResult,
  BuilderPromptSupportingArtifactFileNames,
  InvalidBuilderPromptArtifactFile,
} from "../shared/workCards/renderBuilderPrompt";
import type {
  BuilderReportCapturePreviewResult,
  BuilderReportCaptureRequest,
  BuilderReportCaptureSaveResult,
  BuilderReportType,
  BuilderReportValidationResult,
} from "../shared/workCards/validateBuilderReport";
import type {
  RiskReviewPreviewResult,
  RiskReviewRequest,
  RiskReviewSaveResult,
} from "../shared/workCards/renderRiskReviewMarkdown";
import type { WorkCardRiskReview } from "../shared/workCards/riskRouter";
import type {
  AvailablePhaseFoldersResult,
  BuilderReportFileLoadRequest,
  BuilderReportFileLoadResult,
  HumanValidationBuilderReportListRequest,
  HumanValidationBuilderReportListResult,
  HumanValidationBuilderReportOption,
  HumanValidationFormInput,
  HumanValidationOperatorDecision,
  HumanValidationPreviewResult,
  HumanValidationResult,
  HumanValidationSaveResult,
  HumanValidationStatusListResult,
  HumanValidationStatusSummary,
  InvalidHumanValidationBuilderReportFile,
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
  type ChampCityPhaseMapBuilderRequest = PhaseMapBuilderRequest;
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
  type ChampCityBuilderPromptRequest = BuilderPromptRequest;
  type ChampCityBuilderPromptArtifactListResult =
    BuilderPromptArtifactListResult;
  type ChampCityBuilderPromptArtifactOptions = BuilderPromptArtifactOptions;
  type ChampCityBuilderPromptArtifactOption = BuilderPromptArtifactOption;
  type ChampCityInvalidBuilderPromptArtifactFile =
    InvalidBuilderPromptArtifactFile;
  type ChampCityBuilderPromptSupportingArtifactFileNames =
    BuilderPromptSupportingArtifactFileNames;
  type ChampCityBuilderPromptPreviewResult = BuilderPromptPreviewResult;
  type ChampCityBuilderPromptSaveResult = BuilderPromptSaveResult;
  type ChampCityBuilderReportType = BuilderReportType;
  type ChampCityBuilderReportValidationResult = BuilderReportValidationResult;
  type ChampCityBuilderReportCaptureRequest = BuilderReportCaptureRequest;
  type ChampCityBuilderReportCapturePreviewResult =
    BuilderReportCapturePreviewResult;
  type ChampCityBuilderReportCaptureSaveResult =
    BuilderReportCaptureSaveResult;
  type ChampCityHumanValidationResult = HumanValidationResult;
  type ChampCityHumanValidationOperatorDecision =
    HumanValidationOperatorDecision;
  type ChampCityHumanValidationFormInput = HumanValidationFormInput;
  type ChampCityHumanValidationBuilderReportOption =
    HumanValidationBuilderReportOption;
  type ChampCityInvalidHumanValidationBuilderReportFile =
    InvalidHumanValidationBuilderReportFile;
  type ChampCityManualValidationChecklistExtraction =
    ManualValidationChecklistExtraction;
  type ChampCityHumanValidationBuilderReportListRequest =
    HumanValidationBuilderReportListRequest;
  type ChampCityHumanValidationBuilderReportListResult =
    HumanValidationBuilderReportListResult;
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
  type ChampCityBuilderReportFileLoadRequest =
    BuilderReportFileLoadRequest;
  type ChampCityBuilderReportFileLoadResult = BuilderReportFileLoadResult;
  type ChampCityValidationEvidenceFileImportRequest =
    ValidationEvidenceFileImportRequest;
  type ChampCityValidationEvidenceFileImportResult =
    ValidationEvidenceFileImportResult;

  interface Window {
    champCity: {
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
        input: PhaseMapBuilderRequest,
      ) => Promise<PhaseMapPreviewResult>;
      savePhaseMap: (input: PhaseMapBuilderRequest) => Promise<PhaseMapSaveResult>;
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
      listBuilderPromptSupportingArtifacts: (
        input: BuilderPromptRequest,
      ) => Promise<BuilderPromptArtifactListResult>;
      previewBuilderPrompt: (
        input: BuilderPromptRequest,
      ) => Promise<BuilderPromptPreviewResult>;
      saveBuilderPrompt: (
        input: BuilderPromptRequest,
      ) => Promise<BuilderPromptSaveResult>;
      previewBuilderReportCapture: (
        input: BuilderReportCaptureRequest,
      ) => Promise<BuilderReportCapturePreviewResult>;
      saveBuilderReportCapture: (
        input: BuilderReportCaptureRequest,
      ) => Promise<BuilderReportCaptureSaveResult>;
      loadBuilderReportFile: (
        input: BuilderReportFileLoadRequest,
      ) => Promise<BuilderReportFileLoadResult>;
      listHumanValidationBuilderReports: (
        input: HumanValidationBuilderReportListRequest,
      ) => Promise<HumanValidationBuilderReportListResult>;
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
      previewPhaseCloseoutRecord: (
        input: PhaseCloseoutFormInput,
      ) => Promise<PhaseCloseoutPreviewResult>;
      savePhaseCloseoutRecord: (
        input: PhaseCloseoutFormInput,
      ) => Promise<PhaseCloseoutSaveResult>;
    };
  }
}
