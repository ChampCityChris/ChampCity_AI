import { useEffect, useState, type ReactNode } from "react";
import { Clipboard, FileText, FolderOpen, RefreshCw } from "lucide-react";
import type { WorkIntakeRecord } from "../../shared/workIntakeContracts";
import type { WorkRoutingAssessmentModel } from "../../shared/workRoutingAssessmentContracts";
import type { WorkRouteDecisionInput, WorkRouteDecisionModel } from "../../shared/workRouteDecisionContracts";
import { workRouteProfiles, workRouteProfileRegistry, type WorkRouteId } from "../../shared/workIntakeRoutingContracts";
import { DocumentChatWorkspaceShell } from "./DocumentChatWorkspaceShell";
import { FigmaMarkdownBody } from "./FigmaDocumentCard";

type RoutingDocument = "intake" | "assessment";

export function routingStatusLabel(assessment: WorkRoutingAssessmentModel | null, decision: WorkRouteDecisionModel | null): string {
  if (decision?.state === "revision-requested") return "A revised recommendation was requested. Prepare a new Architect handoff.";
  if (decision?.state === "stale" || assessment?.state === "stale" || assessment?.state === "superseded") return "Routing evidence changed. Refresh or prepare a new recommendation.";
  if (decision?.state === "selected") return "Route selected. Continue to the next available stage.";
  if (assessment?.assessment && (decision?.state === "awaiting-decision" || decision?.state === "reroute-required")) return "Recommendation ready for your route decision.";
  if (assessment?.state === "promotion-failed") return "The draft could not be promoted. Review the error and refresh.";
  if (assessment?.state === "waiting-for-drafts" || assessment?.state === "partial-draft-set" || assessment?.state === "ready-for-promotion") return "Handoff prepared. Work with the Architect, then refresh to check the draft.";
  return "Prepare an Architect handoff to get a route recommendation.";
}

export function WorkRoutingDecisionControls({ assessment, model, selectedRoute, rationale, busy, onRationaleChange, onSelectedRouteChange, onDecide }: {
  assessment: WorkRoutingAssessmentModel | null;
  model: WorkRouteDecisionModel | null;
  selectedRoute: WorkRouteId;
  rationale: string;
  busy: boolean;
  onRationaleChange: (value: string) => void;
  onSelectedRouteChange: (value: WorkRouteId) => void;
  onDecide: (disposition: WorkRouteDecisionInput["disposition"]) => void;
}): JSX.Element | null {
  if (!assessment?.assessment || !model?.sourceAssessment ||
    (model.state !== "awaiting-decision" && model.state !== "reroute-required")) return null;
  const disabled = busy || !rationale.trim();
  return <>
    <label>Decision rationale or revision instructions<textarea value={rationale} onChange={(event) => onRationaleChange(event.target.value)} /></label>
    <div className="figma-disposition-row">
      <button className="apply-button" type="button" disabled={disabled} onClick={() => onDecide("accept")}>Accept Recommendation</button>
      <label>Override Route<select value={selectedRoute} onChange={(event) => onSelectedRouteChange(event.target.value as WorkRouteId)}>
        {workRouteProfiles.map((route) => <option key={route.routeId} value={route.routeId}>{route.label}</option>)}
      </select></label>
      <button type="button" disabled={disabled} onClick={() => onDecide("override")}>Select Override Route</button>
      <button type="button" disabled={disabled} onClick={() => onDecide("request-revision")}>Request Revised Assessment</button>
    </div>
  </>;
}

export function WorkRoutingWorkspace({ intake, browserPanel, onReloadBrowser, onNavigationRefresh }: {
  intake: WorkIntakeRecord;
  browserPanel: ReactNode;
  onReloadBrowser: () => void;
  onNavigationRefresh: (advance: boolean) => Promise<void>;
}): JSX.Element {
  const [document, setDocument] = useState<RoutingDocument>("intake");
  const [assessment, setAssessment] = useState<WorkRoutingAssessmentModel | null>(null);
  const [decision, setDecision] = useState<WorkRouteDecisionModel | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<WorkRouteId>("greenfield");
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let current = true;
    Promise.all([window.champcity.getWorkRoutingAssessment(intake.intakeId), window.champcity.getWorkRouteDecision(intake.intakeId)])
      .then(([nextAssessment, nextDecision]) => {
        if (!current) return;
        setAssessment(nextAssessment);
        setDecision(nextDecision);
        setSelectedRoute(nextDecision.recommendation?.kind === "architect-reroute-recommendation"
          ? nextDecision.recommendation.replacementRouteId
          : nextDecision.selection?.selectedRouteId ?? nextAssessment.assessment?.recommendedRouteId ?? "greenfield");
        setDocument(nextAssessment.assessment ? "assessment" : "intake");
      }).catch((failure: unknown) => { if (current) setError(failure instanceof Error ? failure.message : "Routing could not be loaded."); });
    return () => { current = false; };
  }, [intake.intakeId]);

  async function refresh(): Promise<void> {
    const [nextAssessment, nextDecision] = await Promise.all([
      window.champcity.getWorkRoutingAssessment(intake.intakeId), window.champcity.getWorkRouteDecision(intake.intakeId),
    ]);
    setAssessment(nextAssessment);
    setDecision(nextDecision);
    setSelectedRoute(nextDecision.recommendation?.kind === "architect-reroute-recommendation"
      ? nextDecision.recommendation.replacementRouteId
      : nextDecision.selection?.selectedRouteId ?? nextAssessment.assessment?.recommendedRouteId ?? "greenfield");
    if (nextAssessment.assessment) setDocument("assessment");
    await onNavigationRefresh(false);
  }

  async function run(action: "prepare" | "copy" | "refresh"): Promise<void> {
    setBusy(true); setError(""); setFeedback("");
    try {
      if (action === "prepare") {
        setAssessment(await window.champcity.prepareWorkRoutingAssessment(intake.intakeId));
        setFeedback("Architect handoff prepared. Copy it when ready.");
      } else if (action === "copy") {
        await window.champcity.copyWorkRoutingAssessment(intake.intakeId);
        setFeedback("Architect handoff copied.");
      } else {
        await refresh();
        setFeedback("Routing evidence refreshed.");
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Routing action failed."); }
    finally { setBusy(false); }
  }

  async function decide(disposition: WorkRouteDecisionInput["disposition"]): Promise<void> {
    if (!decision?.sourceAssessment || !rationale.trim()) return;
    setBusy(true); setError(""); setFeedback("");
    try {
      const next = await window.champcity.decideWorkRoute(intake.intakeId, {
        expectedDecisionRevision: decision.artifactRevision, sourceAssessment: decision.sourceAssessment,
        disposition, rationale: rationale.trim(), ...(disposition === "override" ? { selectedRouteId: selectedRoute } : {}),
      });
      setDecision(next);
      setRationale("");
      setFeedback(disposition === "request-revision" ? "Revision requested. Prepare a new handoff here." : "Route decision saved.");
      await onNavigationRefresh(disposition !== "request-revision");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Route decision failed."); }
    finally { setBusy(false); }
  }

  const advice = assessment?.assessment;
  const recommendedRouteId = decision?.recommendation?.kind === "architect-reroute-recommendation"
    ? decision.recommendation.replacementRouteId : advice?.recommendedRouteId;
  const intakeMarkdown = `# ${intake.projectName}\n\n## Work request\n${intake.workRequest}\n\n## Desired outcome\n${intake.desiredOutcome}\n\n## Constraints\n${intake.knownConstraints || "None supplied."}`;
  const traitLabels = advice?.traits.map((trait) => trait.replaceAll("-", " ")).join(", ") || "None identified";
  const assessmentMarkdown = advice ? `# Routing Assessment\n\n## Recommended route\n${workRouteProfileRegistry[advice.recommendedRouteId].label}\n\n## Rationale\n${advice.rationale}\n\n## Work traits\n${traitLabels}${advice.alternate ? `\n\n## Alternate route\n${workRouteProfileRegistry[advice.alternate.routeId].label}: ${advice.alternate.rationale}` : ""}` : "";
  const presentedDocument = document === "assessment" && advice ? assessmentMarkdown : intakeMarkdown;

  return <DocumentChatWorkspaceShell
    bodyClassName="work-intake-doc-chat-workspace" browserColumnClassName="work-intake-browser-column"
    className="work-intake-stage-workspace work-routing-workspace" documentColumnClassName="work-intake-document-column"
    eyebrow="Work Intake" heading="Routing" summary="Review the work request, get Architect advice, and choose a route."
    browserPanel={browserPanel}
    browserActions={<section className="figma-browser-actions-panel" aria-label="Routing browser actions">
      <header><span>Browser Actions</span></header>
      <div className="figma-browser-actions-row">
        <button type="button" className="primary-action" onClick={onReloadBrowser}><RefreshCw aria-hidden="true" size={14} />Reload ChatGPT</button>
        <button type="button" disabled={busy} onClick={() => void run("prepare")}><FolderOpen aria-hidden="true" size={14} />Prepare Handoff</button>
        <button type="button" disabled={busy || !assessment?.preparedInstruction} onClick={() => void run("copy")}><Clipboard aria-hidden="true" size={14} />Copy Handoff</button>
        <button type="button" disabled={busy} onClick={() => void run("refresh")}><RefreshCw aria-hidden="true" size={14} />Refresh</button>
      </div>
      {error || assessment?.error || decision?.error ? <p role="alert">{error || assessment?.error || decision?.error}</p> : null}
      {feedback ? <p role="status">{feedback}</p> : null}
    </section>}
    documentColumn={<>
      <article className="figma-document-card" aria-label="Routing documents">
        {advice ? <div className="figma-document-tabs" role="tablist" aria-label="Routing documents">
          <button type="button" aria-selected={document === "intake"} className={document === "intake" ? "active" : ""} onClick={() => setDocument("intake")}>Work Intake</button>
          <button type="button" aria-selected={document === "assessment"} className={document === "assessment" ? "active" : ""} onClick={() => setDocument("assessment")}>Routing Assessment</button>
        </div> : null}
        <header className="figma-document-card-header"><div className="figma-document-title-row"><FileText aria-hidden="true" size={14} /><strong>{document === "assessment" && advice ? "Routing Assessment" : "Work Intake"}</strong></div></header>
        <div className="figma-document-card-body"><FigmaMarkdownBody markdown={presentedDocument} /></div>
        {document === "assessment" && advice ? <details><summary>Evidence and document details</summary>
          <p>Evidence: {advice.evidencePaths.join(", ")}</p><p>Document: {advice.relativePath}, revision {advice.artifactRevision}</p>
        </details> : null}
      </article>
      <section className="figma-disposition-panel work-routing-decision" aria-label="Operator route decision">
        <header><span>Route Decision</span></header>
        <p role="status">{routingStatusLabel(assessment, decision)}</p>
        {recommendedRouteId ? <p>Architect recommendation: <strong>{workRouteProfileRegistry[recommendedRouteId].label}</strong></p> : null}
        {decision?.recommendation?.kind === "architect-reroute-recommendation" ? <p>{decision.recommendation.rationale}</p> : null}
        <WorkRoutingDecisionControls assessment={assessment} model={decision} selectedRoute={selectedRoute} rationale={rationale} busy={busy}
          onRationaleChange={setRationale} onSelectedRouteChange={setSelectedRoute} onDecide={(disposition) => void decide(disposition)} />
        {decision?.selection ? <p>Selected route: {workRouteProfileRegistry[decision.selection.selectedRouteId].label}</p> : null}
        {decision?.history.length ? <details><summary>Prior route decisions</summary><ol>{decision.history.map((entry) => <li key={entry.decision.decisionId}>{entry.decision.rationale}</li>)}</ol></details> : null}
      </section>
    </>}
  />;
}
