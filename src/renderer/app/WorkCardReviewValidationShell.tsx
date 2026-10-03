import type {ComponentProps, ReactNode} from "react";
import {OperatorValidationPresentation} from "./OperatorValidationPresentation";
export interface WorkCardReviewValidationShellProps {
  identity: string; contractPath: string; reportStatus: string; reportPath: string;
  decision: ComponentProps<typeof OperatorValidationPresentation>;
  proofActions?: ReactNode; documentActions?: ReactNode; browserPanel?: ReactNode; navigation?: ReactNode;
}
/** Historical document/control composition with adapter supplied state and actions. */
export function WorkCardReviewValidationShell(props: WorkCardReviewValidationShellProps): JSX.Element {
  return <section className={"figma-doc-chat-workspace review-validation-workspace"+(props.browserPanel?"":" chat-hidden")} aria-label="Review & Validation workspace" tabIndex={-1}><section className="work-card-report-review-workspace" aria-label="Review & Validation">
    <section className="work-card-report-evidence-strip" aria-label="Review and validation evidence">
      <div><span>Work Card</span><strong>{props.identity}</strong><small>{props.contractPath}</small></div>
      <div><span>Report</span><strong>{props.reportStatus}</strong><small>{props.reportPath}</small></div>
      <div><span>Decision ownership</span><strong>Architect review advisory; Operator decision creates validation basis.</strong></div>
    </section>
    <div className="work-card-report-review-body"><OperatorValidationPresentation {...props.decision}/>{props.documentActions}{props.proofActions}{props.navigation}</div>
  </section>{props.browserPanel}</section>;
}
