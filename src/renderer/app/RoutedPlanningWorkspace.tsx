import { useEffect, useState, type ReactNode } from "react";
import { Clipboard, FileText, FolderOpen, RefreshCw } from "lucide-react";
import type { WorkIntakeRecord } from "../../shared/workIntakeContracts";
import type { WorkPlanningModel, WorkPlanningReviewInput, WorkPlanningStage, WorkPlanStructure, WorkResearchOutcome } from "../../shared/workPlanningContracts";
import { workRouteProfileRegistry } from "../../shared/workIntakeRoutingContracts";
import { DocumentChatWorkspaceShell } from "./DocumentChatWorkspaceShell";
import { FigmaMarkdownBody } from "./FigmaDocumentCard";

type PlanningDocument = "assessment" | "plan";

export function researchOutcomeLabel(outcome: WorkResearchOutcome): string {
  return outcome.outcome === "no-implementation-plan-required"
    ? "Research is complete; no implementation Plan is required."
    : "The research calls for an implementation Plan.";
}

export function planningStatusLabel(model: WorkPlanningModel | null, stage: WorkPlanningStage): string {
  if (!model) return `Loading ${stage === "assessment" ? "Architect Assessment" : "Work Plan"}…`;
  if (model.artifact?.stale) return "Source evidence changed. Refresh the document before acting.";
  if (model.artifact?.disposition === "RevisionRequested") return "Revision requested. Prepare a revised Architect handoff here.";
  if (model.artifact?.disposition === "Rejected") return "The current document was rejected. Review the notes before continuing.";
  if (model.artifact?.disposition === "Approved") return stage === "assessment"
    ? model.researchClosed ? "Research complete. Continue to Integration." : "Assessment approved. Continue to Plan."
    : "Plan approved. Continue to Execution.";
  if (model.artifact) return "Draft ready for your review.";
  if (model.preparedInstruction) return "Handoff prepared. Work with the Architect, then refresh to check the draft.";
  return `Prepare the ${stage === "assessment" ? "assessment" : "Plan"} handoff with the Architect.`;
}

function readablePlanStructure(structure: WorkPlanStructure): JSX.Element {
  return <section className="work-plan-structure" aria-label="Plan structure">
    <h3>{structure.topology === "phased" ? "Phased Plan" : "Direct Plan"}</h3>
    <p>{structure.topologyRationale}</p>
    {structure.topology === "phased" ? <ol aria-label="Phases">{structure.phases.map((phase) => <li key={phase.phaseId}>
      <strong>{phase.title}</strong><p>{phase.purpose}</p>
      <p>{structure.workItems.filter((item) => item.phaseId === phase.phaseId).length} Work Items</p>
    </li>)}</ol> : null}
    <h4>Work Items</h4><ol>{structure.workItems.map((item) => <li key={item.workItemId}>
      <strong>{item.title}</strong><p>{item.purpose}</p>
      {item.dependsOn.length ? <p>After: {item.dependsOn.join(", ")}</p> : null}
    </li>)}</ol>
  </section>;
}

function researchOutcomeSummary(outcome: WorkResearchOutcome): JSX.Element {
  return <section className="work-research-outcome" aria-label="Research outcome">
    <h3>Research outcome</h3><p>{researchOutcomeLabel(outcome)}</p>
    <p>Prototype: {outcome.prototypeDisposition === "disposable" ? "Disposable" : "Candidate for later work"}</p>
    <p>Production follow-up: {outcome.productionFollowUp === "new-work-intake-required" ? "New Work Intake required" : "None proposed"}</p>
    <p>Decision enabled: {outcome.decisionEnabled}</p>
    <p>Result: {outcome.successFailureResult}</p>
    <p>Closure condition: {outcome.closureCondition}</p>
    {outcome.evidence.length ? <details><summary>Research evidence</summary><ul>{outcome.evidence.map((item) => <li key={item}>{item}</li>)}</ul></details> : null}
  </section>;
}

function withoutPlanDataBlock(markdown: string): string {
  return markdown.replace(/```champcity-work-plan\r?\n[\s\S]*?\r?\n```/g, "").trim();
}

export function RoutedPlanningWorkspace({ intakeId, intake, stage, browserPanel, onReloadBrowser, onNavigationRefresh, onOpenDecomposition }: {
  intakeId: string;
  intake?: WorkIntakeRecord;
  stage: WorkPlanningStage;
  browserPanel: ReactNode;
  onReloadBrowser: () => void;
  onNavigationRefresh: (advance: boolean) => Promise<void>;
  onOpenDecomposition?: (workItemId: string) => void;
}): JSX.Element {
  const [model, setModel] = useState<WorkPlanningModel | null>(null);
  const [supportingAssessment, setSupportingAssessment] = useState<WorkPlanningModel | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<PlanningDocument>(stage);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    let current = true;
    Promise.all([window.champcity.getWorkPlanning(intakeId, stage),
      stage === "plan" ? window.champcity.getWorkPlanning(intakeId, "assessment") : Promise.resolve(null)])
      .then(([next, assessment]) => { if (current) { setModel(next); setSupportingAssessment(assessment); setSelectedDocument(stage); } })
      .catch((failure: unknown) => { if (current) setError(failure instanceof Error ? failure.message : "Planning could not be loaded."); });
    return () => { current = false; };
  }, [intakeId, stage]);

  async function run(action: "prepare" | "copy" | "refresh" | WorkPlanningReviewInput["disposition"]): Promise<void> {
    setBusy(true); setError(""); setFeedback("");
    try {
      if (action === "copy") {
        await window.champcity.copyWorkPlanning(intakeId, stage);
        setFeedback("Architect handoff copied.");
        return;
      }
      if (action === "prepare") {
        setModel(await window.champcity.prepareWorkPlanning(intakeId, stage));
        setFeedback("Architect handoff prepared. Copy it when ready.");
        return;
      }
      if (action === "refresh") {
        setModel(await window.champcity.getWorkPlanning(intakeId, stage));
        await onNavigationRefresh(false);
        setFeedback("Current planning evidence refreshed.");
        return;
      }
      if (!model?.artifact || model.artifact.stale) throw Error("Refresh the current document before reviewing.");
      const next = await window.champcity.reviewWorkPlanning(intakeId, stage, {
        expectedRevision: model.artifact.artifactRevision, disposition: action, notes,
      });
      setModel(next);
      setNotes("");
      setFeedback(action === "Approved" ? "Document approved." : action === "RevisionRequested" ? "Revision requested. Prepare a new handoff here." : "Document rejected.");
      await onNavigationRefresh(action === "Approved");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Planning action failed."); }
    finally { setBusy(false); }
  }

  const artifact = model?.artifact;
  const hasSupportingAssessment = stage === "plan" && !!supportingAssessment?.artifact;
  const shown = selectedDocument === "assessment" && hasSupportingAssessment ? supportingAssessment!.artifact : artifact;
  const reviewable = !!artifact && !artifact.stale && !busy;
  const title = stage === "assessment" ? "Architect Assessment" : "Work Plan";
  return <DocumentChatWorkspaceShell
    bodyClassName="work-intake-doc-chat-workspace" browserColumnClassName="work-intake-browser-column"
    className="work-intake-stage-workspace work-routed-planning-workspace" documentColumnClassName="work-intake-document-column"
    eyebrow="Work Intake" heading={title}
    summary={`${intake?.workRequest ?? "Current routed work"} · ${model?.routeId ? workRouteProfileRegistry[model.routeId].label : "Loading route"}`}
    browserPanel={browserPanel}
    browserActions={<section className="figma-browser-actions-panel" aria-label={`${title} browser actions`}>
      <header><span>Browser Actions</span></header>
      <div className="figma-browser-actions-row">
        <button className="primary-action" type="button" onClick={onReloadBrowser}><RefreshCw aria-hidden="true" size={14} />Reload ChatGPT</button>
        <button type="button" disabled={busy || !model?.canPrepare} onClick={() => void run("prepare")}><FolderOpen aria-hidden="true" size={14} />Prepare Handoff</button>
        <button type="button" disabled={busy || !model?.preparedInstruction} onClick={() => void run("copy")}><Clipboard aria-hidden="true" size={14} />Copy Handoff</button>
        <button type="button" disabled={busy} onClick={() => void run("refresh")}><RefreshCw aria-hidden="true" size={14} />Refresh</button>
      </div>
      {error || model?.error ? <p role="alert">{error || model?.error}</p> : null}
      {feedback ? <p role="status">{feedback}</p> : null}
    </section>}
    documentColumn={<>
      <article className="figma-document-card" aria-label={`${title} document`}>
        {hasSupportingAssessment ? <div className="figma-document-tabs" role="tablist" aria-label="Planning documents">
          <button type="button" aria-selected={selectedDocument === "plan"} className={selectedDocument === "plan" ? "active" : ""} onClick={() => setSelectedDocument("plan")}>Work Plan</button>
          <button type="button" aria-selected={selectedDocument === "assessment"} className={selectedDocument === "assessment" ? "active" : ""} onClick={() => setSelectedDocument("assessment")}>Approved Assessment</button>
        </div> : null}
        <header className="figma-document-card-header"><div className="figma-document-title-row"><FileText aria-hidden="true" size={14} /><strong>{selectedDocument === "assessment" ? "Architect Assessment" : title}</strong></div></header>
        <div className="figma-document-card-body">
          {shown ? <FigmaMarkdownBody markdown={selectedDocument === "plan" ? withoutPlanDataBlock(shown.bodyMarkdown) : shown.bodyMarkdown} />
            : <div className="figma-empty-document"><strong>No {title} yet</strong><span>Prepare a handoff with the Architect, then refresh to load the draft.</span></div>}
        </div>
        {shown ? <details><summary>Document details</summary><p>{shown.relativePath}, revision {shown.artifactRevision}</p></details> : null}
      </article>
      {stage === "assessment" && artifact?.researchOutcome ? researchOutcomeSummary(artifact.researchOutcome) : null}
      {stage === "plan" && artifact?.structure ? readablePlanStructure(artifact.structure) : null}
      {stage === "plan" && artifact?.disposition === "Approved" && !artifact.stale && artifact.structure && onOpenDecomposition ?
        <section className="work-decomposition-entry" aria-label="Review decomposition">
          <h3>Review decomposition</h3><p>Open a planning correction for a selected Work Item.</p>
          {artifact.structure.workItems.map((item) => <button key={item.workItemId} type="button"
            onClick={() => onOpenDecomposition(item.workItemId)}>Review decomposition for {item.workItemId}: {item.title}</button>)}
        </section> : null}
      <section className="figma-disposition-panel work-planning-decision" aria-label={`${title} disposition`}>
        <header><span>{title} Review</span></header>
        <p role="status">{planningStatusLabel(model, stage)}</p>
        {reviewable ? <>
          <label>Review notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          <div className="figma-disposition-row">
            <button className="apply-button" type="button" onClick={() => void run("Approved")}>Approve {stage === "plan" ? "Plan and topology" : artifact.researchOutcome ? "research outcome" : "assessment"}</button>
            <button type="button" disabled={!notes.trim()} onClick={() => void run("RevisionRequested")}>Request Revision</button>
            <button type="button" disabled={!notes.trim()} onClick={() => void run("Rejected")}>Reject</button>
          </div>
        </> : null}
      </section>
    </>}
  />;
}
