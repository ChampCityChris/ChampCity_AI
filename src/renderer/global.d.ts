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
  RiskReviewPreviewResult,
  RiskReviewRequest,
  RiskReviewSaveResult,
} from "../shared/workCards/renderRiskReviewMarkdown";
import type { WorkCardRiskReview } from "../shared/workCards/riskRouter";

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
    };
  }
}
