import { useEffect, useMemo, useState, type ReactNode } from "react";
import {ArchitectInterviewShell, ArchitectInterviewBrowserActions} from "./ArchitectInterviewShell";
import { type StructuredArchitectWorkspaceModel } from "../../shared/architectWorkspaceContracts";
import {FigmaDocumentDispositionPanel} from "./FigmaDocumentDispositionPanel";
import type {DocumentDispositionStatus} from "../../shared/documents/documentDisposition";

export function GreenfieldArchitectWorkspace(props: {workflowId: string | null; browserCompanion: ReactNode; browserVisible: boolean; onRailStatus?: (status: StructuredArchitectWorkspaceModel["railStatus"]) => void;
  stageLabel?: string; onReturn?: () => void; onNext?: () => Promise<void>; onApproved?: () => Promise<void>; supportControls?: ReactNode; refreshToken?: number}): JSX.Element {
  const [model, setModel] = useState<StructuredArchitectWorkspaceModel | null>(null);
  const [finalDraftHandoff, setFinalDraftHandoff] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<DocumentDispositionStatus | "">("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState("intake");
  const revision = model?.review?.cycleId ? `${model.review.cycleId}@${model.review.recordVersion}` : null;
  const slots = useMemo(() => [
    {slotId: "intake", displayLabel: "Project Intake", logicalDocumentId: model?.intakeDocument?.logicalDocumentId},
    ...(model?.reviewDocument ? [{slotId: "architect-review", displayLabel: "Architect Review", logicalDocumentId: model.reviewDocument.logicalDocumentId}] : []),
  ], [model]);
  const selectedDocument = selectedSlotId === "architect-review" ? model?.reviewDocument ?? null : model?.intakeDocument ?? null;
  const showingReview = selectedSlotId === "architect-review" && !!revision && !!model?.reviewDocument;
  function accept(next: StructuredArchitectWorkspaceModel, preferReview = false) {
    setModel(next); props.onRailStatus?.(next.railStatus);
    setSelectedSlotId((preferReview || next.reviewDocument) && next.reviewDocument ? "architect-review" : "intake");
  }
  useEffect(() => {
    let active = true;
    setModel(null); setSelectedSlotId("intake"); setError("");
    if (props.workflowId) window.champcity.getStructuredArchitectWorkspace(props.workflowId).then(next => {if (active) accept(next);}).catch(reason => {if (active) setError(String(reason));});
    else setError("Select the exact Workflow to open its Architect stage.");
    return () => {active = false;};
  }, [props.workflowId, props.refreshToken]);
  async function action(work: () => Promise<void>) {setBusy(true); setError(""); setFeedback(""); try {await work();} catch (reason) {setError(reason instanceof Error ? reason.message : String(reason));} finally {setBusy(false);}}
  const refresh = () => void action(async () => {if (!props.workflowId) throw Error("Exact Greenfield Workflow required."); accept(await window.champcity.getStructuredArchitectWorkspace(props.workflowId));});
  const prepare = () => void action(async () => {if (!props.workflowId) throw Error("Exact Greenfield Workflow required."); accept(await window.champcity.prepareStructuredArchitectWorkspace(props.workflowId)); setFeedback("Handoff prepared from current SQL Intake.");});
  const browserActions = <ArchitectInterviewBrowserActions canPrepareHandoff={!busy && !!model?.ready} canCopyHandoff={!busy && !!model?.handoff}
    canRegeneratePrompt={!busy && !!model?.ready} onRegeneratePrompt={prepare}
    canPrepareFinalDraftHandoff={!busy && !!model?.handoff} canCopyFinalDraftHandoff={!busy && !!finalDraftHandoff}
    onPrepareFinalDraftHandoff={() => {setFinalDraftHandoff(model?.handoff ? `${model.handoff}\nSubmit the final semantic Architect Interview candidate through workflow_toolbox.submit_stage_candidate using the stage and workspace binding above.` : "");}}
    onCopyFinalDraftHandoff={() => void action(async () => {await navigator.clipboard.writeText(finalDraftHandoff);})}
    onPrepareHandoff={prepare} onCopyHandoff={() => void action(async () => {await navigator.clipboard.writeText(model!.handoff!);})}
    onRefresh={refresh} onReloadBrowser={() => void action(async () => {await window.champcity.reloadArchitectBrowser();})}
    onRetryBrowser={() => void action(async () => {await window.champcity.reloadArchitectBrowser();})}
    isRevisionRequest={model?.review?.disposition.state === "revision_requested"} actionMessage={error ? {kind:"error",message:error} : feedback ? {kind:"success",message:feedback} : null} />;
  return <ArchitectInterviewShell label={props.stageLabel ?? "Architect Interview Figma document workspace"} browserVisible={props.browserVisible}
    browserCompanion={<div className="figma-browser-column">{props.browserCompanion}{browserActions}</div>}
    document={{selectedDocument, documentError:"", feedback:model?.materializationError ?? "", slots, selectedSlotId, onSelectSlot:setSelectedSlotId,
      onCopy:() => void action(async () => {await navigator.clipboard.writeText(selectedDocument?.bodyMarkdown ?? selectedDocument?.preview ?? "");})}}
    reviewControls={<>
      {showingReview && model?.review ? <FigmaDocumentDispositionPanel canApply={!!status && !busy} isApplying={busy}
        currentDocument={selectedDocument?.displayFilename} effectiveDisposition={selectedDocument?.effectiveDisposition}
        workflowStep="Review & Validation" notes={notes} onNotesChange={setNotes} onStatusChange={setStatus} status={status}
        onApply={() => void action(async () => {const outcome = status === "Approved" ? "approved" : status === "RevisionRequested" ? "revision_requested" : "rejected";
          const next = await window.champcity.reviewStructuredArchitectOutput(props.workflowId!, model!.review!.cycleId, {expectedRecordVersion:model!.review!.recordVersion, outcome, notes});
          if (outcome === "approved" && props.onApproved) await props.onApproved(); else accept(next); setStatus(""); setFeedback("Operator review recorded.");})} /> : null}
      {!props.onReturn && props.onNext ? <section className="architect-workflow-action-panel" aria-label="Workflow action"><header>Next stage</header><button className="apply-button" disabled={busy || !model?.nextStageReady} onClick={() => void action(props.onNext!)}>Continue to Project Planning</button></section> : null}
      {props.supportControls}
      {model?.supportRecords?.length ? <details><summary>Workflow supporting records</summary><ul>{model.supportRecords.map(record => <li key={record.id}><code>{record.id}</code> · {record.entityType === "Evidence" ? record.body.description : record.entityType === "Finding" ? record.body.title : record.entityType}</li>)}</ul></details> : null}
      </>}
    />;
}
