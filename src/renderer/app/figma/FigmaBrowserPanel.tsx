import type { RefObject } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";

export function FigmaBrowserPanel({
  hostRef,
  onReload,
  onRetry,
  retryVisible,
  statusLabel,
}: {
  hostRef: RefObject<HTMLDivElement>;
  onReload: () => void;
  onRetry: () => void;
  retryVisible: boolean;
  statusLabel: string;
}): JSX.Element {
  const isReady = statusLabel === "ChatGPT ready";

  return (
    <aside className="architect-surface-pane figma-browser-panel" aria-label="Embedded ChatGPT browser">
      <div className="figma-browser-toolbar">
        <button onClick={onReload} title="Reload ChatGPT" type="button">
          <RefreshCw aria-hidden="true" size={12} />
        </button>
        <span className="figma-browser-toolbar-status">{statusLabel}</span>
        {retryVisible ? (
          <button onClick={onRetry} title="Retry browser attachment" type="button">
            <RotateCcw aria-hidden="true" size={12} />
          </button>
        ) : null}
      </div>
      <div ref={hostRef} className="architect-browser-host figma-browser-host">
        {!isReady ? <span>{statusLabel}</span> : null}
      </div>
      <div className="figma-browser-status">
        <i className={isReady ? "ready" : "waiting"} aria-hidden="true" />
        <span>{statusLabel}</span>
      </div>
    </aside>
  );
}
