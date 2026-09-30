import { useEffect, useRef, useState, type ReactNode } from "react";
import { Clipboard, FileText, FolderOpen, RefreshCw } from "lucide-react";
import type { StructuredWorkRoutingDecisionInput, StructuredWorkRoutingModel } from "../../shared/structuredWorkRoutingContracts";
import type { ExistingProjectWorkRoute } from "../../shared/projectState/workflowTypeRegistry";
import { DocumentChatWorkspaceShell } from "./DocumentChatWorkspaceShell";
import { FigmaMarkdownBody } from "./FigmaDocumentCard";

const routes: ReadonlyArray<{ id: ExistingProjectWorkRoute; label: string }> = [
  { id: "feature-change", label: "Feature / Capability" },
  { id: "refactor-migration", label: "Refactor / Migration" },
  { id: "integration-composition", label: "Integration / Composition" },
  { id: "infrastructure-platform", label: "Infrastructure / Platform" },
  { id: "research-prototype", label: "Research / Prototype" },
  { id: "issue-resolution", label: "Issue Resolution" },
];

export const structuredRoutingPollIntervalMs = 1500;

export function shouldPollStructuredWorkRouting(model: StructuredWorkRoutingModel | null): boolean {
  return !!model?.preparedSubmission &&
    (model.preparedSubmission.state === "waiting-for-drafts" || model.preparedSubmission.state === "partial-draft-set") &&
    !model.closed && !model.targetWorkflowId;
}

export type StructuredRoutingViewState = "empty" | "pending" | "current" | "stale" | "revision-requested" | "routed" | "closed";

export function structuredRoutingViewState(model: StructuredWorkRoutingModel | null): StructuredRoutingViewState {
  if (model?.closed) return "closed";
  if (model?.targetWorkflowId) return "routed";
  if (shouldPollStructuredWorkRouting(model)) return "pending";
  if (model?.assessment?.stale) return "stale";
  if (model?.reviewState === "revision-requested") return "revision-requested";
  return model?.assessment ? "current" : "empty";
}

export function startStructuredRoutingPolling(model: StructuredWorkRoutingModel | null,
  read: () => Promise<StructuredWorkRoutingModel>, onModel: (next: StructuredWorkRoutingModel) => void,
  onError: (failure: unknown) => void,
  schedule: (callback: () => void, interval: number) => ReturnType<typeof setInterval> = setInterval,
  cancel: (timer: ReturnType<typeof setInterval>) => void = clearInterval): () => void {
  if (!shouldPollStructuredWorkRouting(model)) return () => undefined;
  let active = true;
  let inFlight = false;
  const timer = schedule(() => {
    if (!active || inFlight) return;
    inFlight = true;
    void read().then(next => {
      if (!active) return;
      onModel(next);
      if (!shouldPollStructuredWorkRouting(next)) { active = false; cancel(timer); }
    }).catch(failure => {
      if (active) onError(failure);
    }).finally(() => { inFlight = false; });
  }, structuredRoutingPollIntervalMs);
  return () => { active = false; cancel(timer); };
}

export function routeStructuredWIRTarget(targetWorkflowId: string | null, source: "load" | "refresh" | "live-decision" | "explicit-open",
  onRouted: (workflowId: string) => void): void {
  if (targetWorkflowId && (source === "live-decision" || source === "explicit-open")) onRouted(targetWorkflowId);
}

export function StructuredWorkRoutingWorkspace({ intakeId, routingWorkflowId, browserPanel, onReloadBrowser, onReturn, onRouted }: {
  intakeId: string;
  routingWorkflowId: string;
  browserPanel: ReactNode;
  onReloadBrowser: () => void;
  onReturn: () => void;
  onRouted: (workflowId: string) => void;
}): JSX.Element {
  const [model, setModel] = useState<StructuredWorkRoutingModel | null>(null);
  const [route, setRoute] = useState<ExistingProjectWorkRoute>("feature-change");
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const mounted = useRef(false);
  const identity = `${intakeId}\u0000${routingWorkflowId}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const refreshPromise = useRef<{ identity: string; request: Promise<StructuredWorkRoutingModel> } | null>(null);

  async function refresh(showFeedback = false): Promise<StructuredWorkRoutingModel> {
    if (refreshPromise.current?.identity === identity) return refreshPromise.current.request;
    const request = window.champcity.getStructuredWorkRouting(intakeId, routingWorkflowId);
    refreshPromise.current = { identity, request };
    try {
      const next = await request;
      if (mounted.current && identityRef.current === identity) {
        setError("");
        setModel(next);
        setRoute(next.assessment?.recommendation ?? "feature-change");
        routeStructuredWIRTarget(next.targetWorkflowId, "refresh", onRouted);
        if (showFeedback) setFeedback("Routing evidence refreshed from Project State.");
      }
      return next;
    } finally { if (refreshPromise.current?.request === request) refreshPromise.current = null; }
  }

  useEffect(() => {
    mounted.current = true;
    setModel(null);
    void refresh().catch(failure => { if (mounted.current) setError(failure instanceof Error ? failure.message : "Routing could not be loaded."); });
    return () => { mounted.current = false; };
  }, [intakeId, routingWorkflowId]);

  useEffect(() => startStructuredRoutingPolling(model, () => refresh(), () => undefined,
    failure => { if (mounted.current) setError(failure instanceof Error ? failure.message : "Routing refresh failed."); }),
  [model, intakeId, routingWorkflowId]);

  async function run(action: "prepare" | "copy"): Promise<void> {
    setBusy(true); setError(""); setFeedback("");
    try {
      if (action === "prepare") {
        const next = await window.champcity.prepareStructuredWorkRouting(intakeId, routingWorkflowId);
        setModel(next);
        setRoute(next.assessment?.recommendation ?? route);
        setFeedback("Current Architect assessment handoff prepared. Submit it to the Architect; this screen will update automatically when the assessment is ready.");
      } else {
        await window.champcity.copyStructuredWorkRouting(intakeId, routingWorkflowId);
        setFeedback("Architect handoff copied.");
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Routing action failed."); }
    finally { setBusy(false); }
  }

  async function decide(disposition: StructuredWorkRoutingDecisionInput["disposition"]): Promise<void> {
    if (!model?.assessment || !canDecide || (disposition !== "accept" && !rationale.trim()) ||
      (disposition === "override" && route === model.assessment.recommendation)) return;
    setBusy(true); setError(""); setFeedback("");
    try {
      const next = await window.champcity.decideStructuredWorkRouting(intakeId, routingWorkflowId, {
        assessmentId: model.assessment.assessmentId, disposition,
        ...(rationale.trim() ? { rationale: rationale.trim() } : {}),
        ...(disposition === "override" ? { route } : {}),
      });
      setModel(next); setRationale("");
      routeStructuredWIRTarget(next.targetWorkflowId, "live-decision", onRouted);
      if (!next.targetWorkflowId) setFeedback("Revision instructions saved. Prepare the next Architect handoff here.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Route decision failed."); }
    finally { setBusy(false); }
  }

  const assessment = model?.assessment ?? null;
  const routeLabel = (value: ExistingProjectWorkRoute) => routes.find(item => item.id === value)?.label ?? value;
  const intakeMarkdown = model ? `# Work Intake\n\n## Request\n${model.request}\n\n## Desired outcome\n${model.desiredOutcome}\n\n## Constraints\n${model.constraints.join("\n") || "None supplied."}\n\n## Evidence context\n${model.evidenceContext.join("\n") || "None supplied."}` : "# Work Intake\n\nLoading Project State…";
  const assessmentMarkdown = assessment ? `# Routing Assessment\n\n## Recommended route\n${routeLabel(assessment.recommendation)}\n\n## Rationale\n${assessment.rationale}\n\n## Work traits\n${assessment.traits.map(item => item.replaceAll("-", " ")).join(", ") || "None identified"}${assessment.alternate ? `\n\n## Alternate route\n${routeLabel(assessment.alternate)}` : ""}${assessment.evidenceNotes ? `\n\n## Inspected evidence notes\n${assessment.evidenceNotes}` : ""}` : "";
  const viewState = structuredRoutingViewState(model);
  const canDecide = !!assessment && viewState === "current";

  return <DocumentChatWorkspaceShell
    bodyClassName="work-intake-doc-chat-workspace" browserColumnClassName="work-intake-browser-column"
    className="work-intake-stage-workspace work-routing-workspace" documentColumnClassName="work-intake-document-column"
    eyebrow="Work Intake" heading="Routing" summary="Review the request, consider Architect advice, and choose a route."
    browserPanel={model?.closed ? null : browserPanel}
    browserActions={model?.closed ? null : <section className="figma-browser-actions-panel work-routing-browser-actions" aria-label="Routing browser actions">
      <header><span>Browser Actions</span></header>
      <div className="figma-browser-actions-row">
        <button type="button" className="primary-action" disabled={busy} onClick={onReloadBrowser}><RefreshCw aria-hidden="true" size={14} />Reload ChatGPT</button>
        <button type="button" disabled={busy} onClick={() => void run("prepare")}><FolderOpen aria-hidden="true" size={14} />Prepare Handoff</button>
        <button type="button" disabled={busy || !model?.preparedInstruction} onClick={() => void run("copy")}><Clipboard aria-hidden="true" size={14} />Copy Handoff</button>
        <button type="button" disabled={busy} onClick={() => { setBusy(true); void refresh(true).catch(failure => setError(failure instanceof Error ? failure.message : "Refresh failed.")).finally(() => setBusy(false)); }}><RefreshCw aria-hidden="true" size={14} />Refresh</button>
      </div>
      {error || model?.error ? <p role="alert">{error || model?.error}</p> : null}
      {feedback ? <p role="status">{feedback}</p> : null}
    </section>}
    documentColumn={<>
      <article className="figma-document-card" aria-label="Routing documents">
        <header className="figma-document-card-header"><div className="figma-document-title-row"><FileText aria-hidden="true" size={14} /><strong>{assessment ? "Routing Assessment" : "Work Intake"}</strong></div></header>
        <div className="figma-document-card-body"><FigmaMarkdownBody markdown={assessment ? assessmentMarkdown : intakeMarkdown} /></div>
        {assessment ? <details><summary>Assessment identity</summary><p>RouteAssessment {assessment.assessmentId}</p><p>Work Intake recordVersion {assessment.sourceRecordVersion}{assessment.stale ? " (stale)" : ""}</p></details> : null}
      </article>
      <section className="figma-disposition-panel work-routing-decision" aria-label="Operator route decision">
        <header><span>Route Decision</span></header>
        <p role="status">{viewState === "closed" ? "This Work Intake is closed." : viewState === "routed" ? "Route selected. The target Workflow is ready." : viewState === "pending" ? "Waiting for the current Architect assessment." : viewState === "stale" ? "Route decision unavailable while this assessment is stale." : viewState === "revision-requested" ? "A revised recommendation was requested. Prepare a new Architect handoff." : viewState === "current" ? "Recommendation ready for your route decision." : "Prepare an Architect handoff to get a route recommendation."}</p>
        {assessment && viewState !== "stale" ? <p>{assessment.stale ? "Previous recommendation" : "Architect recommendation"}: <strong>{routeLabel(assessment.recommendation)}</strong></p> : null}
        {viewState === "stale" ? <div className="work-routing-recovery" aria-label="Stale assessment recovery">
          <strong>Assessment needs refresh</strong>
          <p>The Work Intake changed after this recommendation was prepared. Prepare a current Architect assessment before selecting a route.</p>
          <p>Previous recommendation: <strong>{routeLabel(assessment!.recommendation)}</strong> <span>(stale)</span></p>
          <button className="work-routing-button work-routing-button-primary" type="button" disabled={busy} onClick={() => void run("prepare")}>Prepare Current Assessment</button>
        </div> : null}
        {viewState === "revision-requested" ? <button className="work-routing-button work-routing-button-primary" type="button" disabled={busy} onClick={() => void run("prepare")}>Prepare Revised Assessment</button> : null}
        {canDecide ? <>
          <label className="work-routing-rationale">Override / revision rationale<textarea maxLength={4000} value={rationale} onChange={event => setRationale(event.target.value)} /></label>
          <p className="work-routing-rationale-help">Optional when accepting the recommendation. Required to override the route or request a revised assessment.</p>
          <div className="work-routing-actions">
            <div className="work-routing-action-group"><button className="work-routing-button work-routing-button-primary" type="button" disabled={busy || !canDecide} onClick={() => void decide("accept")}>Accept Recommendation</button></div>
            <div className="work-routing-action-group work-routing-override">
              <label>Override Route<select value={route} disabled={busy} onChange={event => setRoute(event.target.value as ExistingProjectWorkRoute)}>
                {routes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select></label>
              <button className="work-routing-button work-routing-button-secondary" type="button" disabled={busy || !canDecide || !rationale.trim() || route === assessment.recommendation} onClick={() => void decide("override")}>Use Override Route</button>
            </div>
            <div className="work-routing-action-group"><button className="work-routing-button work-routing-button-warning" type="button" disabled={busy || !canDecide || !rationale.trim()} onClick={() => void decide("request-revision")}>Request Revised Assessment</button></div>
          </div>
        </> : null}
        {model?.selectedRoute ? <p>Selected route: {routeLabel(model.selectedRoute)}</p> : null}
        {model?.targetWorkflowId ? <button className="work-routing-button work-routing-button-primary" type="button" onClick={() => routeStructuredWIRTarget(model.targetWorkflowId, "explicit-open", onRouted)}>Open routed Workflow</button> : null}
        <button className="work-routing-button work-routing-button-tertiary" type="button" onClick={onReturn}>Back to Workflows</button>
      </section>
    </>}
  />;
}
