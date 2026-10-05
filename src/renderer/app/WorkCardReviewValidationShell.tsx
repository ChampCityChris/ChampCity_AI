import {useState,type ComponentProps,type ReactNode} from "react";
import {OperatorValidationPresentation} from "./OperatorValidationPresentation";
export interface WorkCardReviewValidationShellProps {
  identity: string; contractPath: string; reportStatus: string; reportPath: string;
  decision: ComponentProps<typeof OperatorValidationPresentation>;
  proofActions?: ReactNode; testerActions?: ReactNode; criteriaActions?: ReactNode; documentActions?: ReactNode; browserPanel?: ReactNode; navigation?: ReactNode;
  contextKey?: string;
}
/** Historical document/control composition with adapter supplied state and actions. */
export function WorkCardReviewValidationShell(props: WorkCardReviewValidationShellProps): JSX.Element {
  const [selection,setSelection]=useState({key:props.contextKey,tab:"Documents"});
  const tab=selection.key===props.contextKey?selection.tab:"Documents";
  return <section className={"figma-doc-chat-workspace review-validation-workspace"+(props.browserPanel?"":" chat-hidden")} aria-label="Review & Validation workspace" tabIndex={-1}><section className="work-card-report-review-workspace" aria-label="Review & Validation">
    <section className="work-card-report-evidence-strip" aria-label="Review and validation evidence">
      <div><span>Work Card</span><strong>{props.identity}</strong><small>{props.contractPath}</small></div>
      <div><span>Report</span><strong>{props.reportStatus}</strong><small>{props.reportPath}</small></div>
      <div><span>Decision ownership</span><strong>Architect review advisory; Operator decision creates validation basis.</strong></div>
    </section>
    <div className="architect-document-selector review-workspace-tabs" role="tablist" aria-label="Review workspace tabs">
      {["Documents","Tester","Criteria","Decision"].map(name=><button key={name} type="button" role="tab" aria-selected={tab===name} className={tab===name?"document-choice selected":"document-choice"} onClick={()=>setSelection({key:props.contextKey,tab:name})}>{name}</button>)}
    </div>
    <div className="work-card-report-review-body" role="tabpanel" aria-label={tab}>
      {tab==="Documents"?<><OperatorValidationPresentation {...props.decision} surface="documents"/>{props.documentActions}</>:null}
      {tab==="Tester"||tab==="Criteria"?(tab==="Tester"?props.testerActions:props.criteriaActions??props.proofActions):null}
      {tab==="Decision"?<OperatorValidationPresentation {...props.decision} surface="decision"/>:null}
    </div>{props.navigation}
  </section>{props.browserPanel}</section>;
}
