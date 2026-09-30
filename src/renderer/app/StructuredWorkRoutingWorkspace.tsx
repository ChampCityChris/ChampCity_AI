import { useEffect, useState, type ReactNode } from "react";
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

  async function refresh(showFeedback = false): Promise<void> {
    setError("");
    const next = await window.champcity.getStructuredWorkRouting(intakeId, routingWorkflowId);
    setModel(next);
    setRoute(next.assessment?.recommendation ?? "feature-change");
    routeStructuredWIRTarget(next.targetWorkflowId, "refresh", onRouted);
    if (showFeedback) setFeedback("Routing evidence refreshed from Project State.");
  }

  useEffect(() => {
    let current = true;
    window.champcity.getStructuredWorkRouting(intakeId, routingWorkflowId).then(next => {
      if (!current) return;
      setModel(next);
      setRoute(next.assessment?.recommendation ?? "feature-change");
      routeStructuredWIRTarget(next.targetWorkflowId, "load", onRouted);
    }).catch(failure => { if (current) setError(failure instanceof Error ? failure.message : "Routing could not be loaded."); });
    return () => { current = false; };
  }, [intakeId, routingWorkflowId]);

  async function run(action: "prepare" | "copy"): Promise<void> {
    setBusy(true); setError(""); setFeedback("");
    try {
      if (action === "prepare") {
        const next = await window.champcity.prepareStructuredWorkRouting(intakeId, routingWorkflowId);
        setModel(next);
        setRoute(next.assessment?.recommendation ?? route);
        setFeedback("Architect handoff prepared. Copy it when ready.");
      } else {
        await window.champcity.copyStructuredWorkRouting(intakeId, routingWorkflowId);
        setFeedback("Architect handoff copied.");
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Routing action failed."); }
    finally { setBusy(false); }
  }

  async function decide(disposition: StructuredWorkRoutingDecisionInput["disposition"]): Promise<void> {
    if (!model?.assessment || !rationale.trim()) return;
    setBusy(true); setError(""); setFeedback("");
    try {
      const next = await window.champcity.decideStructuredWorkRouting(intakeId, routingWorkflowId, {
        assessmentId: model.assessment.assessmentId, disposition, rationale: rationale.trim(),
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
  const canDecide = !!assessment && !assessment.stale && !model?.closed && !model?.targetWorkflowId && model?.reviewState !== "revision-requested";

  return <DocumentChatWorkspaceShell
    bodyClassName="work-intake-doc-chat-workspace" browserColumnClassName="work-intake-browser-column"
    className="work-intake-stage-workspace work-routing-workspace" documentColumnClassName="work-intake-document-column"
    eyebrow="Work Intake" heading="Routing" summary="Review the request, consider Architect advice, and choose a route."
    browserPanel={model?.closed ? null : browserPanel}
    browserActions={model?.closed ? null : <section className="figma-browser-actions-panel" aria-label="Routing browser actions">
      <header><span>Browser Actions</span></header>
      <div className="figma-browser-actions-row">
        <button type="button" className="primary-action" disabled={busy} onClick={onReloadBrowser}><RefreshCw aria-hidden="true" size={14} />Reload ChatGPT</button>
        <button type="button" disabled={busy || model?.closed} onClick={() => void run("prepare")}><FolderOpen aria-hidden="true" size={14} />Prepare Handoff</button>
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
        <p role="status">{model?.closed ? "This Work Intake is closed." : assessment?.stale ? "Work Intake or optional source evidence changed. Prepare a current assessment." : model?.targetWorkflowId ? "Route selected. The target Workflow is ready." : model?.reviewState === "revision-requested" ? "A revised recommendation was requested. Prepare a new Architect handoff." : assessment ? "Recommendation ready for your route decision." : "Prepare an Architect handoff to get a route recommendation."}</p>
        {assessment ? <p>Architect recommendation: <strong>{routeLabel(assessment.recommendation)}</strong></p> : null}
        {canDecide ? <>
          <label>Decision rationale or revision instructions<textarea maxLength={4000} value={rationale} onChange={event => setRationale(event.target.value)} /></label>
          <div className="figma-disposition-row">
            <button className="apply-button" type="button" disabled={busy || !rationale.trim()} onClick={() => void decide("accept")}>Accept Recommendation</button>
            <label>Override Route<select value={route} onChange={event => setRoute(event.target.value as ExistingProjectWorkRoute)}>
              {routes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select></label>
            <button type="button" disabled={busy || !rationale.trim() || route === assessment.recommendation} onClick={() => void decide("override")}>Select Override Route</button>
            <button type="button" disabled={busy || !rationale.trim()} onClick={() => void decide("request-revision")}>Request Revised Assessment</button>
          </div>
        </> : null}
        {model?.selectedRoute ? <p>Selected route: {routeLabel(model.selectedRoute)}</p> : null}
        {model?.targetWorkflowId ? <button className="apply-button" type="button" onClick={() => routeStructuredWIRTarget(model.targetWorkflowId, "explicit-open", onRouted)}>Open routed Workflow</button> : null}
        <button type="button" onClick={onReturn}>Back to Workflows</button>
      </section>
    </>}
  />;
}
