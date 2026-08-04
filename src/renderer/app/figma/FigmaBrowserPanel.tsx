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
      <div className="figma-browser-tabbar">
        <div className="figma-browser-tab">
          <span className="figma-browser-favicon" aria-hidden="true">G</span>
          <strong>ChatGPT</strong>
        </div>
      </div>
      <div className="figma-browser-toolbar">
        <button onClick={onReload} title="Reload ChatGPT" type="button">
          <RefreshCw aria-hidden="true" size={12} />
        </button>
        <div className="figma-browser-address" aria-label="Embedded browser destination">
          <span aria-hidden="true">●</span>
          <strong>chatgpt.com</strong>
        </div>
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
