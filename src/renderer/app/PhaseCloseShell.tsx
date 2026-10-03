import type {ReactNode} from "react";
import {FileText} from "lucide-react";
import type {PlanningDocumentDetail,PlanningDocumentSummary} from "../../shared/documents/planningDocument";
import type {DocumentDispositionStatus} from "../../shared/documents/documentDisposition";
import {FigmaMarkdownBody} from "./FigmaDocumentCard";

export interface PhaseCloseShellProps {
  presentation: {currentRequiredWorkflowStep:string;currentTarget:string;eligibility:string;requiredAction:string;expectedOutput:string;expectedNextState:string;actionContext:string;actionPath:string};
  inputs:{closureDecision:"Close"|"DoNotClose";rationale:string;status:DocumentDispositionStatus};
  onChange:(value:PhaseCloseShellProps["inputs"])=>void;
  onApplyDisposition:()=>void;onCreateCloseout:()=>void;onSelectDocument:(id:string)=>void;
  canReview:boolean;canCreate:boolean;showReview:boolean;showCreate:boolean;documentStep:string;
  selectedDocument:PlanningDocumentDetail|null;selectedDocumentId:string|null;
  workspaceGroups:Array<{group:string;documents:PlanningDocumentSummary[]}>;
  feedback:string;documentError:string;emptyMessage:string;
  navigation?:ReactNode;evidenceActions?:ReactNode;contextualActions?:ReactNode;
}
/** Phase Close composition recovered from App@965536de; all authority is supplied. */
export function PhaseCloseShell(props:PhaseCloseShellProps):JSX.Element {
 const {presentation:p,inputs,selectedDocument,selectedDocumentId,workspaceGroups}=props;
 const update=<K extends keyof typeof inputs>(key:K,value:(typeof inputs)[K])=>props.onChange({...inputs,[key]:value});
 return <section className="flex h-full min-h-0 flex-col overflow-hidden" aria-label={p.currentTarget+" workspace"}>
  {props.navigation}
  <div className="flex min-h-0 flex-1 overflow-hidden"><div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4"><div className="max-w-2xl space-y-3">
   <FigmaInfoCard><FigmaInfoGrid items={[
    {label:"Current Required Workflow Step",value:p.currentRequiredWorkflowStep},{label:"Current Target",value:p.currentTarget},
    {label:"Eligibility",value:p.eligibility,muted:true},{label:"Required Action",value:p.requiredAction,muted:true}]} />
    <div className="mt-3 border-t border-border pt-3"><p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Expected Output</p><p className="break-all font-mono text-[12px] text-muted-foreground">{p.expectedOutput}</p></div>
    <div className="mt-2"><p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Next State</p><p className="text-[12px] text-muted-foreground">{p.expectedNextState}</p></div>
   </FigmaInfoCard>
   <FigmaInfoCard><div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1">
    <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Action Context</p><p className="break-words text-[13px] font-medium text-foreground">{p.actionContext}</p><p className="mt-1 break-all font-mono text-[12px] text-muted-foreground">{p.actionPath}</p>
   </div><div className="flex flex-wrap items-center gap-2">
    {props.showReview?<><select aria-label="Disposition" className="min-h-8 rounded border border-border bg-input-background px-2 text-[13px] text-foreground outline-none transition-colors focus:border-primary/50" onChange={event=>update("status",event.target.value as DocumentDispositionStatus)} value={inputs.status}>
     <option value="Approved">Approve</option><option value="Rejected">Reject</option><option value="RevisionRequested">Request Revision</option>
    </select>
    <button className="min-h-8 rounded border border-sky-500/20 bg-sky-500/10 px-3 text-[13px] font-medium text-sky-400 transition-colors hover:bg-sky-500/20" disabled={!props.canReview} onClick={props.onApplyDisposition} type="button">Apply Current Disposition</button></>:null}
    {props.showCreate?<><select aria-label="Closure Decision" className="min-h-8 rounded border border-border bg-input-background px-2 text-[13px] text-foreground outline-none transition-colors focus:border-primary/50" onChange={event=>update("closureDecision",event.target.value as "Close"|"DoNotClose")} value={inputs.closureDecision}><option value="Close">Close</option><option value="DoNotClose">Do Not Close</option></select>
    <input aria-label="Rationale" className="min-h-8 rounded border border-border bg-input-background px-2 text-[13px] text-foreground outline-none transition-colors focus:border-primary/50" onChange={event=>update("rationale",event.target.value)} placeholder="Rationale" value={inputs.rationale} />
    <button className="min-h-8 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 text-[13px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20" disabled={!props.canCreate} onClick={props.onCreateCloseout} type="button">Create Current Phase Closeout</button></>:null}
   </div></div>{props.evidenceActions}{props.contextualActions}</FigmaInfoCard>
   {!workspaceGroups.some(group=>group.documents.length)?<FigmaEmptyDocSlot message={props.emptyMessage}/>:null}
   <FigmaDocumentSelectCard groups={workspaceGroups} documentStep={props.documentStep} onSelectDocument={props.onSelectDocument} selectedDocument={selectedDocument} selectedDocumentId={selectedDocumentId}/>
   {selectedDocument?<FigmaInfoCard className="overflow-hidden p-0"><div className="border-b border-border bg-muted px-4 py-2"><p className="truncate font-mono text-[13px] font-medium text-foreground">{selectedDocument.displayFilename}</p><p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{selectedDocument.markdownPath}</p></div><div className="max-h-80 overflow-auto px-4 py-3"><FigmaMarkdownBody markdown={selectedDocument.bodyMarkdown??selectedDocument.preview??""}/></div></FigmaInfoCard>:null}
   {props.feedback?<div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-500" role="status">{props.feedback}</div>:null}
   {props.documentError?<div className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-400" role="status">{props.documentError}</div>:null}
  </div></div></div>
 </section>;
}
function FigmaInfoCard({ children, className = "" }: { children: React.ReactNode; className?: string }): JSX.Element {
  return (
    <section className={`rounded-lg border border-border bg-card p-3.5 text-card-foreground ${className}`}>
      {children}
    </section>
  );
}

function FigmaInfoGrid({
  items,
}: {
  items: Array<{ label: string; value: string; muted?: boolean }>;
}): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{item.label}</p>
          <p className={`break-words text-[13px] ${item.muted ? "text-muted-foreground" : "text-foreground"}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function FigmaEmptyDocSlot({ message }: { message: string }): JSX.Element {
  return (
    <section className="rounded-lg border border-border bg-card p-8 text-center">
      <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
      <p className="text-[13px] text-muted-foreground">{message}</p>
    </section>
  );
}

function FigmaDocumentSelectCard({
  groups,
  documentStep,
  onSelectDocument,
  selectedDocument,
  selectedDocumentId,
}: {
  documentStep: string;
  groups: Array<{ group: string; documents: PlanningDocumentSummary[] }>;
  onSelectDocument: (logicalDocumentId: string) => void;
  selectedDocument: PlanningDocumentDetail | null;
  selectedDocumentId: string | null;
}): JSX.Element {
  const flatDocuments = groups.flatMap((group) => group.documents);
  const selectedPosition = selectedDocumentId
    ? flatDocuments.findIndex((document) => document.logicalDocumentId === selectedDocumentId) + 1
    : 0;
  return (
    <FigmaInfoCard>
      <div className="mb-3 grid grid-cols-2 gap-4">
        <div>
          <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Current Workflow Step</p>
          <p className="text-[12px] text-foreground">{selectedDocument ? documentStep : "Waiting"}</p>
        </div>
        <div>
          <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Current Document</p>
          <p className="truncate font-mono text-[12px] text-sky-400/80">{selectedDocument?.displayFilename ?? "Select a document"}</p>
        </div>
        <div>
          <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Effective Disposition</p>
          <p className={`text-[12px] ${selectedDocument?.effectiveDisposition === "Pending" ? "text-amber-400" : selectedDocument ? "text-emerald-400" : "text-muted-foreground"}`}>
            {selectedDocument?.effectiveDisposition ?? "Waiting"}
          </p>
        </div>
        <div>
          <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Position</p>
          <p className="text-[12px] text-muted-foreground">
            {selectedPosition > 0 ? `Document ${selectedPosition} of ${flatDocuments.length}` : "Waiting"}
          </p>
        </div>
      </div>
      <div className="border-t border-border pt-2">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Select a document</p>
        <p className="mb-1.5 text-[11px] text-muted-foreground">Repository relative path</p>
        <select
          className="w-full rounded border border-border bg-input-background px-2 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-primary/50"
          disabled={flatDocuments.length === 0}
          onChange={(event) => event.target.value && onSelectDocument(event.target.value)}
          value={selectedDocumentId ?? ""}
        >
          <option value="">{flatDocuments.length ? "Select document" : "Document workflow not yet implemented"}</option>
          {flatDocuments.map((document) => (
            <option key={document.logicalDocumentId} value={document.logicalDocumentId}>
              {document.displayFilename}
            </option>
          ))}
        </select>
      </div>
    </FigmaInfoCard>
  );
}
