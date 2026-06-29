import type {
  NextWorkCardIdResult,
  WorkCardDraftInput,
  WorkCardPreviewResult,
  WorkCardSaveResult,
} from "../shared/workCards/workCardDraft";
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
  HumanValidationBuilderReportListRequest,
  HumanValidationBuilderReportListResult,
  HumanValidationBuilderReportOption,
  HumanValidationFormInput,
  HumanValidationOperatorDecision,
  HumanValidationPreviewResult,
  HumanValidationResult,
  HumanValidationSaveResult,
  InvalidHumanValidationBuilderReportFile,
  ManualValidationChecklistExtraction,
} from "../shared/workCards/validationRecord";

type ReactStateSetter<T> = (value: T | ((previous: T) => T)) => void;

interface ReactRoot {
  render: (node: unknown) => void;
}

interface ReactGlobal {
  createElement: (
    type: unknown,
    props?: Record<string, unknown> | null,
    ...children: unknown[]
  ) => unknown;
  useEffect: (
    effect: () => void | (() => void),
    dependencies?: readonly unknown[],
  ) => void;
  useMemo: <T>(factory: () => T, dependencies: readonly unknown[]) => T;
  useState: <T>(initialValue: T | (() => T)) => [T, ReactStateSetter<T>];
}

interface ReactDomGlobal {
  createRoot: (container: Element | DocumentFragment) => ReactRoot;
}

declare global {
  const React: ReactGlobal;
  const ReactDOM: ReactDomGlobal;

  type ChampCityWorkCardDraftInput = WorkCardDraftInput;
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

  interface Window {
    champCity: {
      getAppInfo: () => {
        name: string;
        stage: string;
        coreLoop: string[];
      };
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
      listHumanValidationBuilderReports: (
        input: HumanValidationBuilderReportListRequest,
      ) => Promise<HumanValidationBuilderReportListResult>;
      previewHumanValidationRecord: (
        input: HumanValidationFormInput,
      ) => Promise<HumanValidationPreviewResult>;
      saveHumanValidationRecord: (
        input: HumanValidationFormInput,
      ) => Promise<HumanValidationSaveResult>;
    };
  }
}
