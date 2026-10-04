import {registerArchitectBrowserRecovery, reloadArchitectBrowserWithRecovery} from "./architectBrowserRecovery";
import {useEffect, useRef, useState} from "react";
import type {ArchitectBrowserFoundationStatus} from "../../shared/workspaceContracts";
import {createArchitectAttachmentCoordinator, shouldShowArchitectBrowserRetry, type ArchitectAttachmentCoordinator} from "../../shared/architectInterview/architectBrowserAttachmentCoordinator";
import {reconcileArchitectBrowserBoundsAck} from "./architectBrowserBoundsOrchestration";
import {FigmaBrowserPanel} from "./figma/FigmaBrowserPanel";

/** One native browser host, attached only while its workspace companion is mounted. */
export function ApplicationBrowserHost() {
  const hostRef = useRef<HTMLDivElement>(null), sequence = useRef(0);
  const coordinator = useRef<ArchitectAttachmentCoordinator | null>(null);
  const [status, setStatus] = useState<ArchitectBrowserFoundationStatus | null>(null), [error, setError] = useState("");
  useEffect(() => {
    let active = true, frame: number | null = null;
    const accept = (value: ArchitectBrowserFoundationStatus) => {if (active) setStatus(value);};
    const measureHost = () => {
      const bounds = hostRef.current?.getBoundingClientRect();
      return bounds ? {x: Math.round(bounds.x), y: Math.round(bounds.y), width: Math.round(bounds.width), height: Math.round(bounds.height)} : null;
    };
    const attachment = createArchitectAttachmentCoordinator({measureHost, nextSequence: () => ++sequence.current,
      onError: message => {if (active) setError(message);}, onStatus: accept,
      setBounds: window.champcity.setArchitectBrowserBounds, showBrowser: window.champcity.showArchitectBrowser,
      hideBrowser: window.champcity.hideArchitectBrowser, waitForNextFrame: () => new Promise(resolve => window.requestAnimationFrame(() => resolve()))});
    coordinator.current = attachment;
    const unregisterRecovery = registerArchitectBrowserRecovery(attachment);
    const sync = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const bounds = measureHost();
        if (!active || !bounds) return;
        void window.champcity.setArchitectBrowserBounds({...bounds, sequence: ++sequence.current, attachmentGeneration: attachment.getGeneration()})
          .then(ack => {const result = reconcileArchitectBrowserBoundsAck(ack, {attachmentGeneration: attachment.getGeneration(), latestRequestedSequence: sequence.current}); if (active && result.applied) setError(result.error);})
          .catch(reason => {if (active) setError(String(reason));});
      });
    };
    const observer = new ResizeObserver(sync);
    if (hostRef.current) observer.observe(hostRef.current);
    window.addEventListener("resize", sync);
    const unsubscribe = window.champcity.onArchitectBrowserFoundationStatus(accept);
    void attachment.attach();
    return () => {
      active = false; unregisterRecovery(); unsubscribe(); observer.disconnect(); window.removeEventListener("resize", sync);
      if (frame !== null) window.cancelAnimationFrame(frame);
      coordinator.current = null;
      void attachment.detach().catch(() => undefined);
    };
  }, []);
  const reload = async () => {try {setError(""); setStatus(await reloadArchitectBrowserWithRecovery());} catch (reason) {setError(String(reason));}};
  const failedLoad = status?.browserState === "load-failed";
  const diagnostic = failedLoad ? status.navigationDiagnostics.slice().reverse().find(item => item.frame === "main-frame" && item.eventType === "did-fail-load" && item.loadResult?.success === false) : undefined;
  const failureDetail = diagnostic ? `${diagnostic.destinationHost ?? "unknown host"} / ${diagnostic.eventType} / error ${diagnostic.loadResult?.code ?? "unknown"}`.slice(0, 240) : "";
  const label = failedLoad || error ? "Browser unavailable" : status?.browserState === "loading" ? "Loading ChatGPT..." : status?.attachment.state === "attached-visible" ? "ChatGPT ready" : "Starting browser...";
  return <><FigmaBrowserPanel hostRef={hostRef} statusLabel={label}
    onReload={() => void reload()} onRetry={() => {void (async () => {await coordinator.current?.retry(); await reload();})();}}
    retryVisible={shouldShowArchitectBrowserRetry(status, error)} />{failureDetail || error ? <p role="status">{failureDetail || error}</p> : null}</>;
}
