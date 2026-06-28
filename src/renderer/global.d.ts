import type {
  NextWorkCardIdResult,
  WorkCardDraftInput,
  WorkCardPreviewResult,
  WorkCardSaveResult,
} from "../shared/workCards/workCardDraft";

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
    };
  }
}
