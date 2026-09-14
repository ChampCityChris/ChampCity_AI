import type { CodexModelSelection } from "../../shared/codexRuntimeContracts";
import { Clipboard, FileText, FolderOpen, GitBranch, RefreshCw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import type {
  IssueArchitectReviewDisposition,
  IssueArchitectReviewInput,
  IssueFixCardProjection,
  IssueFixCardValidationDecisionInput,
  IssuePlanningProjection,
  IssueRecordProjection,
} from "../../shared/issueResolutionContracts";
import type {
  AgentHarnessStatus,
  ArchitectOutputDocumentSlotModel,
  CodexImplementerExecutionModel,
} from "../../shared/workspaceContracts";
import type { PlanningDocumentDetail } from "../../shared/documents/planningDocument";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import { IssueFixCardMapPanel } from "./IssuePlanningWorkspace";
import { WorkCardClosePresentation } from "./WorkCardCloseWorkspace";
import { FigmaBrowserPanel } from "./figma/FigmaBrowserPanel";
import { FigmaDocumentCard } from "./FigmaDocumentCard";
import { FigmaDocumentDispositionPanel } from "./FigmaDocumentDispositionPanel";
import { IssueDocumentChatWorkspaceShell } from "./IssueDocumentChatWorkspaceShell";
import { OperatorValidationPresentation } from "./OperatorValidationPresentation";
import { WorkCardRepairPresentation } from "./WorkCardRepairWorkspace";
import {
  CodexExecutionActions,
  CodexExecutionConsole,
  DevelopmentEnvironmentStatus,
  LastRunSummary,
  type CodexExecutionContextSummary,
} from "./WorkCardBuildingReviewWorkspace";

export function IssueFixCardMapWorkspace({
  actionError,
  actionFeedback,
  actionPending,
  currentIssue,
  fixCardProjection,
  isLoading,
  onRefresh,
  onSelectCandidate,
  projection,
  projectName,
}: {
  actionError: string;
  actionFeedback: string;
  actionPending: boolean;
  currentIssue: IssueRecordProjection | null;
  fixCardProjection?: IssueFixCardProjection | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSelectCandidate?: (fixCardId: string) => void;
  projection: IssuePlanningProjection | null;
  projectName: string;
}): JSX.Element {
  const isReady = Boolean(projection?.fixCardsEligible);
  const selectedIssueLabel = currentIssue
    ? `${currentIssue.issueId}: ${currentIssue.title}`
    : "No issue selected";

  return (
    <section className="issue-fix-card-map-workspace" aria-labelledby="workspace-heading">
      <header className="issue-resolution-header">
        <div>
          <span>Issue Resolution</span>
          <h1 id="workspace-heading">Fix Card Map</h1>
          <p>{`Work the selected Fix Card for ${projectName}.`}</p>
        </div>
        <button className="icon-button text-button" disabled={isLoading} onClick={onRefresh} type="button">
          <RefreshCw aria-hidden="true" size={16} />
          Refresh
        </button>
      </header>

      {!isReady ? (
        <div className="issue-fix-card-map-layout">
          <IssueFixCardMapSummary
            activeStepLabel="Fix Card Map"
            fixCardProjection={fixCardProjection}
            isLoading={isLoading}
            isReady={isReady}
            projection={projection}
            selectedIssueLabel={selectedIssueLabel}
          />
          <IssueFixCardUnavailablePanel projection={projection} />
        </div>
      ) : (
        <div className="issue-fix-card-map-layout">
          <IssueFixCardMapSummary
            activeStepLabel="Fix Card Map"
            fixCardProjection={fixCardProjection}
            isLoading={isLoading}
            isReady={isReady}
            projection={projection}
            selectedIssueLabel={selectedIssueLabel}
          />
          <IssueFixCardMapSelectionPanel
            actionError={actionError}
            actionFeedback={actionFeedback}
            actionPending={actionPending}
            fixCardProjection={fixCardProjection}
            onSelectCandidate={onSelectCandidate}
            projection={projection}
          />
        </div>
      )}
    </section>
  );
}

function IssueFixCardMapSummary({
  activeStepLabel,
  fixCardProjection,
  isLoading,
  isReady,
  projection,
  selectedIssueLabel,
}: {
  activeStepLabel: string;
  fixCardProjection?: IssueFixCardProjection | null;
  isLoading: boolean;
  isReady: boolean;
  projection: IssuePlanningProjection | null;
  selectedIssueLabel: string;
}): JSX.Element {
  return (
    <section className="figma-document-card issue-fix-card-map-summary" aria-label="Fix Card Map source records">
      <header className="figma-document-card-header">
        <div className="figma-document-title-row">
          <GitBranch aria-hidden="true" size={14} />
          <strong>{isReady ? "Fix Card Map Ready" : "Fix Card Map Unavailable"}</strong>
        </div>
        <div className="figma-document-card-actions">
          <span className="figma-document-status">
            {projection?.workflowStatus.stateLabel ?? (isLoading ? "Loading" : "Unavailable")}
          </span>
        </div>
      </header>

      <div className="issue-architect-compact-status">
        <strong>{selectedIssueLabel}</strong>
        <span>
          {isReady
            ? "Map entries are derived only from the validated champcity-fix-card-plan domain block."
            : projection?.statusMessage ?? "Approved Issue Planning is required before the Fix Card Map can open."}
        </span>
      </div>

      <dl className="issue-fix-card-map-source-list">
        <div>
          <dt>Fix Card Plan</dt>
          <dd>{projection?.fixCardPlanPath ?? "issues/ISSUE_NNN/FIX_CARD_PLAN.md"}</dd>
        </div>
        <div>
          <dt>Planning Review</dt>
          <dd>{projection?.reviewPath ?? "issues/ISSUE_NNN/ISSUE_PLANNING_REVIEW.md"}</dd>
        </div>
        <div>
          <dt>Planning State</dt>
          <dd>{projection?.operatorDisposition ?? "Not approved"}</dd>
        </div>
        <div>
          <dt>Source Block</dt>
          <dd>champcity-fix-card-plan</dd>
        </div>
        <div>
          <dt>Current Fix Card</dt>
          <dd>{fixCardProjection?.selectedCandidate?.fixCardId ?? "Select a candidate"}</dd>
        </div>
        <div>
          <dt>Step</dt>
          <dd>{activeStepLabel}</dd>
        </div>
      </dl>
    </section>
  );
}

export function IssueFixCardContextStrip({
  activeStepLabel,
  currentIssue,
  fixCardProjection,
}: {
  activeStepLabel: string;
  currentIssue: IssueRecordProjection | null;
  fixCardProjection?: IssueFixCardProjection | null;
}): JSX.Element {
  return (
    <section className="issue-fix-card-context-strip" aria-label="Selected Fix Card context">
      <div>
        <span>Issue</span>
        <strong>{currentIssue ? `${currentIssue.issueId}: ${currentIssue.title}` : "No issue selected"}</strong>
      </div>
      <div>
        <span>Fix Card</span>
        <strong>{fixCardProjection?.selectedCandidate ? `${fixCardProjection.selectedCandidate.fixCardId}: ${fixCardProjection.selectedCandidate.title}` : "Select a candidate"}</strong>
      </div>
      <div>
        <span>Current implementation</span>
        <strong>{fixCardProjection?.currentImplementationId ?? "Waiting"}{fixCardProjection?.parentImplementationId ? ` (parent: ${fixCardProjection.parentImplementationId})` : ""}</strong>
      </div>
      <div>
        <span>Step</span>
        <strong>{activeStepLabel}</strong>
      </div>
    </section>
  );
}

function IssueFixCardUnavailablePanel({
  projection,
}: {
  projection: IssuePlanningProjection | null;
}): JSX.Element {
  return (
    <section className="issue-fix-card-map-panel" aria-label="Fix Card Map unavailable">
      <header>
        <div className="figma-document-title-row">
          <FileText aria-hidden="true" size={14} />
          <strong>Issue-Owned Attention State</strong>
        </div>
        <span>Unavailable</span>
      </header>
      <div className="figma-empty-document">
        <strong>No approved Fix Card Map</strong>
        <span>
          {projection?.statusMessage ?? "Return to Issue Planning to produce and approve a valid generated planning bundle."}
        </span>
      </div>
    </section>
  );
}

function IssueFixCardMapSelectionPanel({
  actionError,
  actionFeedback,
  actionPending,
  fixCardProjection,
  onSelectCandidate,
  projection,
}: {
  actionError: string;
  actionFeedback: string;
  actionPending: boolean;
  fixCardProjection?: IssueFixCardProjection | null;
  onSelectCandidate?: (fixCardId: string) => void;
  projection: IssuePlanningProjection | null;
}): JSX.Element {
  return (
    <IssueFixCardMapPanel
      actionMessage={<IssueFixCardActionMessage actionError={actionError} actionFeedback={actionFeedback} />}
      candidates={fixCardProjection?.candidates}
      isSelectionPending={actionPending}
      onSelectCandidate={onSelectCandidate}
      projection={projection}
      selectedFixCardId={fixCardProjection?.selectedCandidate?.fixCardId}
    />
  );
}

export function IssueFixCardPlanningWorkspace({
  activeStepLabel = "Planning",
  agentHarnessStatus,
  actionError,
  actionFeedback,
  actionPending,
  browserPanel,
  currentIssue,
  fixCardProjection,
  onApplyContractReview,
  onCopyPlanningHandoff,
  onPreparePlanningHandoff,
  onRefresh,
  onReloadBrowser,
  projectName = "ChampCity_AI",
}: {
  activeStepLabel?: string;
  agentHarnessStatus?: AgentHarnessStatus | null;
  actionError: string;
  actionFeedback: string;
  actionPending: boolean;
  browserPanel?: ReactNode;
  currentIssue?: IssueRecordProjection | null;
  fixCardProjection?: IssueFixCardProjection | null;
  onApplyContractReview?: (input: IssueArchitectReviewInput) => Promise<void>;
  onCopyPlanningHandoff?: () => void;
  onPreparePlanningHandoff?: () => void;
  onRefresh: () => void;
  onReloadBrowser?: () => void;
  projectName?: string;
}): JSX.Element {
  const [disposition, setDisposition] = useState<DocumentDispositionStatus | "">("");
  const [notes, setNotes] = useState("");
  const selected = fixCardProjection?.selectedCandidate;
  const mcpContractAttention = fixCardPlanningMcpContractAttention(agentHarnessStatus, fixCardProjection);
  const canReview = Boolean(
    fixCardProjection?.canApplyContractReview &&
    fixCardProjection.controlledDraftBodySha256 &&
    disposition &&
    disposition !== "Pending" &&
    (disposition !== "RevisionRequested" || notes.trim()),
  );
  const selectedDocument: PlanningDocumentDetail | null = fixCardProjection?.contractPath &&
      (fixCardProjection.contractState !== "missing" || fixCardProjection.controlledDraftPath)
    ? {
        logicalDocumentId: fixCardProjection.controlledDraftPath
          ? `controlled-fix-card-draft:${fixCardProjection.controlledDraftPath}`
          : `fix-card:${fixCardProjection.contractPath}`,
        markdownPath: fixCardProjection.contractPath,
        displayFilename: selected
          ? `${selected.fixCardId}: ${selected.title}`
          : "Current Fix Card draft",
        metadata: {
          artifactType: fixCardProjection.controlledDraftPath ? "fix-card-draft" : "fix-card",
          artifactRevision: fixCardProjection.contractRevision,
          candidateId: selected?.fixCardId,
        },
        effectiveDisposition: fixCardProjection.contractDisposition ?? "Pending",
        documentReadState: fixCardProjection.contractState,
        initializationNeeded: false,
        readError: fixCardProjection.contractReadError,
        bodyMarkdown: fixCardProjection.contractMarkdown ?? "",
        preview: fixCardProjection.contractMarkdown ?? "",
        previewTruncated: false,
      }
    : null;
  async function apply(): Promise<void> {
    if (!disposition || disposition === "Pending" || !onApplyContractReview) {
      return;
    }
    await onApplyContractReview({
      disposition: disposition as IssueArchitectReviewDisposition,
      operatorNotes: notes,
      expectedReviewedBodySha256: fixCardProjection?.controlledDraftBodySha256,
    });
    setDisposition("");
    setNotes("");
  }
  return (
    <IssueDocumentChatWorkspaceShell
      bodyClassName="issue-fix-card-planning-workspace"
      browserActions={(
        <section className="figma-browser-actions-panel issue-fix-card-browser-actions-panel" aria-label="Fix Card Planning browser actions">
          <div className="figma-browser-actions-row">
            <button onClick={onReloadBrowser} type="button">
              <RefreshCw aria-hidden="true" size={14} />
              Reload ChatGPT
            </button>
            <button onClick={onRefresh} type="button">
              <RefreshCw aria-hidden="true" size={14} />
              Refresh
            </button>
            <button disabled={!fixCardProjection?.canPreparePlanningHandoff || actionPending} onClick={onPreparePlanningHandoff} type="button">
              <FolderOpen aria-hidden="true" size={14} />
              Prepare Handoff
            </button>
            <button disabled={!fixCardProjection?.canCopyPlanningHandoff || actionPending} onClick={onCopyPlanningHandoff} type="button">
              <Clipboard aria-hidden="true" size={14} />
              Copy Handoff
            </button>
          </div>
          <IssueFixCardActionMessage actionError={actionError} actionFeedback={actionFeedback} />
          {mcpContractAttention ? (
            <div className="figma-browser-action-message error" role="status">
              {mcpContractAttention}
            </div>
          ) : null}
        </section>
      )}
      browserColumnClassName="issue-fix-card-browser-column"
      browserPanel={browserPanel ?? (
        <FigmaBrowserPanel hostRef={{ current: null }} onReload={() => undefined} onRetry={() => undefined} retryVisible={false} statusLabel="ChatGPT ready" />
      )}
      className="issue-fix-card-document-chat-workspace"
      documentColumn={(
        <>
        <FigmaDocumentCard
          documentError={fixCardProjection?.contractReadError ?? ""}
          feedback={fixCardProjection?.statusMessage ?? "Select a candidate first."}
          neutralMessage="Prepare Handoff to create the application-controlled Fix Card draft."
          onCopy={() => {
            if (fixCardProjection?.contractMarkdown) {
              void navigator.clipboard.writeText(fixCardProjection.contractMarkdown);
            }
          }}
          selectedDocument={selectedDocument}
        />
        {fixCardProjection?.canApplyContractReview ? (
          <FigmaDocumentDispositionPanel
            canApply={canReview}
            currentDocument={selectedDocument?.displayFilename}
            effectiveDisposition={selectedDocument?.effectiveDisposition}
            isApplying={actionPending}
            notes={notes}
            onApply={() => void apply()}
            onNotesChange={setNotes}
            onStatusChange={setDisposition}
            status={disposition}
            workflowStep="Fix Card Planning"
          />
        ) : null}
        </>
      )}
      documentColumnClassName="issue-fix-card-document-column"
      heading="Fix Card Planning"
      summary={issueFixCardWorkspaceSummary({
        action: "Plan the selected Issue-owned Fix Card",
        activeStepLabel,
        currentIssue,
        fixCardProjection,
        projectName,
      })}
    />
  );
}

export function fixCardPlanningMcpContractAttention(
  status: AgentHarnessStatus | null | undefined,
  projection: IssueFixCardProjection | null | undefined,
): string | null {
  if (!projection?.activePlanningSubmission || projection.canApplyContractReview) {
    return null;
  }
  if (!status || status.state !== "running") {
    return "The controlled draft is prepared, but the Agent Harness MCP runtime is not currently available.";
  }

  const registryHasBodyWrite = status.toolContractDiagnostics.registry.tools.some((tool) =>
    tool.name === "artifact_toolbox" && tool.actions.includes("replace_markdown_body"));
  if (!registryHasBodyWrite) {
    return "The controlled draft is prepared, but the current Agent Harness registry does not expose the required body-write contract.";
  }
  if (status.toolContractDiagnostics.published.state === "stale") {
    return `The controlled draft is prepared, but ${status.toolContractDiagnostics.published.staleSessionCount} published MCP session contract(s) are being synchronized.`;
  }

  const publishedWriteContractReady = status.toolContractDiagnostics.published.contracts.some((contract) =>
    contract.current &&
    contract.scope.split(/\s+/).includes("files.write") &&
    contract.tools.some((tool) =>
      tool.name === "artifact_toolbox" && tool.actions.includes("replace_markdown_body")));
  if (!publishedWriteContractReady) {
    return status.toolContractDiagnostics.published.state === "none"
      ? "The controlled draft is prepared, but no active MCP session has published the required body-write contract yet."
      : "The controlled draft is prepared, but no active write-authorized MCP session has published the required body-write contract.";
  }
  return null;
}

export function IssueFixCardImplementWorkspace({
  actionError,
  actionFeedback,
  codexExecution,
  fixCardProjection,
  isActionPending,
  onCancelCodex,
  onRecoverImplementSetup,
  onResolveEnvironment,
  onRespondToCodexApproval,
  onRespondToCodexMcpElicitation,
  onRespondToCodexUserInput,
  onRunCodex,
}: {
  actionError: string;
  actionFeedback: string;
  codexExecution?: CodexImplementerExecutionModel | null;
  fixCardProjection?: IssueFixCardProjection | null;
  isActionPending: boolean;
  onCancelCodex?: () => void;
  onRecoverImplementSetup?: () => void;
  onResolveEnvironment?: () => void;
  onRespondToCodexApproval?: (requestId: string, decision: "approve" | "deny") => void;
  onRespondToCodexMcpElicitation?: (
    requestId: string,
    action: "accept" | "decline" | "cancel",
    content: unknown | null,
  ) => void;
  onRespondToCodexUserInput?: (requestId: string, answers: Record<string, string[]>) => void;
  onRunCodex?: (selection: CodexModelSelection) => void;
}): JSX.Element {
  const showRecovery = fixCardProjection?.canReserveImplementerReport &&
    fixCardProjection.implementerReportReadiness === "missing";
  const contextSummary: CodexExecutionContextSummary | undefined = fixCardProjection?.contractPath && fixCardProjection.implementerReportPath
    ? {
        contractLabel: "Approved Fix Card Contract",
        contractPath: fixCardProjection.contractPath,
        contractRevision: fixCardProjection.contractRevision ?? "Waiting",
        reportPath: fixCardProjection.implementerReportPath,
        reportRevision: fixCardProjection.implementerReportRevision ?? "Pending",
      }
    : undefined;
  return (
    <section className="work-card-building-workspace issue-fix-card-implement-workspace" aria-label="Fix Card Implement">
      <section className="work-card-building-context issue-fix-card-implement-context" aria-label="Fix Card implementation context and controls">
        <header>
          <div>
            <span>Selected Fix Card</span>
            <h2>{fixCardProjection?.selectedCandidate?.fixCardId ?? "Fix Card"}</h2>
          </div>
          <strong>{fixCardProjection?.selectedCandidate?.title ?? "Implement"}</strong>
        </header>
        <dl>
          <div><dt>Approved Fix Card Contract</dt><dd>{fixCardProjection?.contractPath ?? "Waiting"}</dd></div>
          <div><dt>Contract Revision</dt><dd>{fixCardProjection?.contractRevision ?? "Waiting"}</dd></div>
          <div><dt>Contract Disposition</dt><dd>{fixCardProjection?.contractDisposition ?? "Waiting"}</dd></div>
          <div><dt>Implementer Report Target</dt><dd>{fixCardProjection?.implementerReportPath ?? "Waiting"}</dd></div>
          <div><dt>Report Status</dt><dd>{fixCardProjection?.implementerReportDisposition ?? (fixCardProjection?.implementerReportState === "missing" ? "Missing" : "Waiting")}</dd></div>
          <div><dt>Report Revision</dt><dd>{fixCardProjection?.implementerReportRevision ?? "Waiting"}</dd></div>
          <div><dt>Report Readiness</dt><dd>{fixCardProjection?.implementerReportReadiness ?? "Waiting"}</dd></div>
          <div><dt>Readiness Reason</dt><dd>{fixCardProjection?.implementerReportReadinessReason ?? "Waiting"}</dd></div>
        </dl>
        <DevelopmentEnvironmentStatus execution={codexExecution ?? null} />
        <LastRunSummary execution={codexExecution ?? null} />
        {showRecovery ? (
          <button className="apply-button" disabled={isActionPending} onClick={onRecoverImplementSetup} type="button">
            <FileText aria-hidden="true" size={14} />
            Retry Implement Setup
          </button>
        ) : null}
        {!showRecovery ? (
          <CodexExecutionActions
            canRunOverride={Boolean(fixCardProjection?.canRunImplementer)}
            execution={codexExecution ?? null}
            isActionRunning={isActionPending}
            onCancel={() => onCancelCodex?.()}
            onResolveEnvironment={() => onResolveEnvironment?.()}
            onRun={(selection) => onRunCodex?.(selection)}
          />
        ) : null}
        <IssueFixCardActionMessage actionError={actionError} actionFeedback={actionFeedback} />
      </section>

      <CodexExecutionConsole
        contextSummary={contextSummary}
        execution={codexExecution ?? null}
        isActionRunning={isActionPending}
        onRespondToCodexApproval={(requestId, decision) => onRespondToCodexApproval?.(requestId, decision)}
        onRespondToCodexMcpElicitation={(requestId, action, content) =>
          onRespondToCodexMcpElicitation?.(requestId, action, content)}
        onRespondToCodexUserInput={(requestId, answers) => onRespondToCodexUserInput?.(requestId, answers)}
        postRunMessage={issueFixCardPostRunMessage(codexExecution ?? null, fixCardProjection)}
      />
    </section>
  );
}

export function IssueFixCardReviewValidationWorkspace({
  activeStepLabel = "Review & Validation",
  actionError,
  actionFeedback,
  actionPending,
  browserPanel,
  currentIssue,
  fixCardProjection,
  onCopyAdvisoryPrompt,
  onApplyDecision,
  onRefresh,
  onReloadBrowser,
  projectName = "ChampCity_AI",
}: {
  activeStepLabel?: string;
  actionError: string;
  actionFeedback: string;
  actionPending: boolean;
  browserPanel?: ReactNode;
  currentIssue?: IssueRecordProjection | null;
  fixCardProjection?: IssueFixCardProjection | null;
  onCopyAdvisoryPrompt?: () => void;
  onApplyDecision: (input: IssueFixCardValidationDecisionInput) => void;
  onRefresh: () => void;
  onReloadBrowser?: () => void;
  projectName?: string;
}): JSX.Element {
  const [selectedTab, setSelectedTab] = useState<"contract" | "report" | "advisory" | "validation">("contract");
  const [operatorNotes, setOperatorNotes] = useState("");
  const [advisorySummary, setAdvisorySummary] = useState("");
  const [boundedDefect, setBoundedDefect] = useState("");
  const markdown = selectedTab === "report"
    ? fixCardProjection?.implementerReportMarkdown
    : selectedTab === "advisory"
    ? fixCardProjection?.architectReviewMarkdown
    : selectedTab === "validation"
    ? fixCardProjection?.validationRecordMarkdown
    : fixCardProjection?.contractMarkdown;
  const selectedLabel = selectedTab === "contract"
    ? "Current Fix Card or Repair Contract"
    : selectedTab === "report"
    ? "Implementer Report"
    : selectedTab === "advisory"
    ? "Optional Advisory Context"
    : "Validation Record";
  const selectedPath = selectedTab === "contract"
    ? fixCardProjection?.contractPath
    : selectedTab === "report"
    ? fixCardProjection?.implementerReportPath
    : selectedTab === "advisory"
    ? fixCardProjection?.architectReviewPath
    : fixCardProjection?.validationRecordPath;
  const selectedReadState = selectedTab === "contract"
    ? fixCardProjection?.contractState
    : selectedTab === "report"
    ? fixCardProjection?.implementerReportState
    : selectedTab === "advisory"
    ? fixCardProjection?.architectReviewState
    : fixCardProjection?.validationRecordState;
  const decisionAvailable = Boolean(fixCardProjection?.canApplyValidationDecision) && !actionPending;
  return (
    <IssueDocumentChatWorkspaceShell
      bodyClassName="issue-fix-card-review-validation-workspace"
      browserActions={(
        <section className="figma-browser-actions-panel issue-fix-card-browser-actions-panel" aria-label="Review & Validation advisory actions">
          <div className="figma-browser-actions-row">
            <button onClick={onReloadBrowser} type="button">
              <RefreshCw aria-hidden="true" size={14} />
              Reload ChatGPT
            </button>
            <button disabled={!fixCardProjection?.canCopyAdvisoryPrompt || actionPending} onClick={onCopyAdvisoryPrompt} type="button">
              <Clipboard aria-hidden="true" size={14} />
              Copy Advisory Prompt
            </button>
            <button onClick={onRefresh} type="button">
              <RefreshCw aria-hidden="true" size={14} />
              Refresh
            </button>
          </div>
          <IssueFixCardActionMessage actionError={actionError} actionFeedback={actionFeedback} />
        </section>
      )}
      browserColumnClassName="issue-fix-card-browser-column"
      browserPanel={browserPanel ?? (
        <FigmaBrowserPanel hostRef={{ current: null }} onReload={() => undefined} onRetry={() => undefined} retryVisible={false} statusLabel="ChatGPT ready" />
      )}
      className="issue-fix-card-document-chat-workspace"
      documentColumn={(
        <OperatorValidationPresentation
        advisoryField={{
          label: "Advisory summary / pasted recommendation (optional)",
          value: advisorySummary,
          onChange: setAdvisorySummary,
        }}
        ariaLabel="Fix Card Validation documents and decision"
        canRequestRepair={decisionAvailable && Boolean(boundedDefect.trim())}
        canValidatePassed={decisionAvailable}
        decisionAriaLabel="Operator Fix Card validation decision"
        documentChoices={[
          { id: "contract", label: "Current Contract", available: Boolean(fixCardProjection?.contractMarkdown) },
          { id: "report", label: "Implementer Report", available: Boolean(fixCardProjection?.implementerReportMarkdown) },
          { id: "advisory", label: "Advisory Context (optional)", available: Boolean(fixCardProjection?.architectReviewMarkdown) },
          { id: "validation", label: "Validation Record", available: Boolean(fixCardProjection?.validationRecordMarkdown) },
        ]}
        documentError={actionError}
        feedback={actionFeedback}
        isApplying={actionPending}
        onOperatorNotesChange={setOperatorNotes}
        onRepairDefectTextChange={setBoundedDefect}
        onRequestRepair={() => onApplyDecision({ decision: "RequestRepair", operatorNotes, advisorySummary, boundedDefect })}
        onSelectDocument={(id) => setSelectedTab(id as typeof selectedTab)}
        onValidatePassed={() => onApplyDecision({ decision: "ValidatePassed", operatorNotes, advisorySummary })}
        operatorNotes={operatorNotes}
        operatorNotesLabel={`Operator validation notes — advisory recommendation: ${fixCardProjection?.architectReviewRecommendation ?? "not provided"}`}
        outcomeMessage={fixCardProjection?.validationRecordDisposition === "Approved" ? "Validated / Awaiting Close. Continue to Close / Next." : undefined}
        repairDefectLabel="Bounded defect required for Repair"
        repairDefectText={boundedDefect}
        selectedDocumentBody={markdown ?? `Evidence unavailable.\n\n${fixCardProjection?.statusMessage ?? "Resolve the selected exact-evidence document."}`}
        selectedDocumentFilename={displayFilenameFromIssuePath(selectedPath) ?? selectedLabel}
        selectedDocumentId={selectedTab}
        selectedDocumentLabel={selectedLabel}
        selectedDocumentPath={selectedPath ?? "Repository-relative evidence path unavailable."}
        selectedDocumentStatus={`${selectedReadState ?? "missing"} / ${fixCardProjection?.validationRecordDisposition ?? "Awaiting Operator decision"}`}
      />
      )}
      documentColumnClassName="issue-fix-card-document-column"
      heading="Fix Card Review & Validation"
      summary={issueFixCardWorkspaceSummary({
        action: "Review exact implementation evidence and apply the Operator validation decision",
        activeStepLabel,
        currentIssue,
        fixCardProjection,
        projectName,
      })}
    />
  );
}

export function IssueFixCardCloseWorkspace({
  actionError,
  actionFeedback,
  actionPending,
  currentIssue,
  fixCardProjection,
  onClose,
}: {
  actionError: string;
  actionFeedback: string;
  actionPending: boolean;
  currentIssue?: IssueRecordProjection | null;
  fixCardProjection?: IssueFixCardProjection | null;
  onClose: () => void;
}): JSX.Element {
  const candidate = fixCardProjection?.selectedCandidate;
  const validationPath = fixCardProjection?.validationRecordPath;
  const closeReady = Boolean(fixCardProjection?.canCloseFixCard && validationPath);
  const nextCandidate = fixCardProjection?.nextEligibleCandidate;
  const evidence = validationPath ? [{
    path: validationPath,
    displayName: displayFilenameFromIssuePath(validationPath) ?? "Approved Fix Card Validation Record",
    disposition: fixCardProjection?.validationRecordDisposition ?? "Unavailable",
    readState: fixCardProjection?.validationRecordState ?? "missing",
  }] : [];
  return (
    <WorkCardClosePresentation
      actionError={actionError}
      actionFeedback={actionFeedback}
      actionLabel="Close Fix Card / Return to Map"
      actingLabel="Closing..."
      ariaLabel="Issue Fix Card Close workspace"
      canAct={closeReady}
      evidence={evidence}
      fields={[
        { label: "Issue ID", value: currentIssue?.issueId ?? "Waiting" },
        { label: "Root Fix Card", value: candidate?.fixCardId ?? "Waiting" },
        { label: "Current Implementation", value: fixCardProjection?.currentImplementationId ?? "Waiting" },
        { label: "Validation Record", value: validationPath ?? "Waiting" },
        { label: "Return Target", value: "fix-card-map" },
        { label: "Next Eligible", value: nextCandidate ? `${nextCandidate.fixCardId}: ${nextCandidate.title}` : "None currently projected" },
      ]}
      identityLine={`${currentIssue?.issueId ?? "issue unresolved"} / ${candidate?.fixCardId ?? "fix card unresolved"}${fixCardProjection?.currentRepairId ? ` / ${fixCardProjection.currentRepairId}` : ""}`}
      isActing={actionPending}
      nextWorkspace={nextCandidate ? `Fix Card Map; ${nextCandidate.fixCardId} becomes Eligible after close.` : "Fix Card Map; all planned Fix Cards may be complete."}
      onAction={onClose}
      projectionAction="issueFixCard.close"
      reason={fixCardProjection?.closeRecord.reason ?? "Exact Approved Fix Card Validation evidence is required."}
      stateLabel={closeReady ? "Ready to Close" : fixCardProjection?.closeRecord.state === "read-error" ? "Needs Attention" : "Not Ready"}
      title={`${candidate?.fixCardId ?? "Fix Card"} - ${candidate?.title ?? "Close / Next"}`}
    />
  );
}

export function IssueFixCardRepairWorkspace({
  actionError,
  actionFeedback,
  actionPending,
  browserPanel,
  currentIssue,
  fixCardProjection,
  onApplyContractReview,
  onCopyRepairHandoff,
  onPrepareRepairHandoff,
  onRefresh,
  onReloadBrowser,
}: {
  actionError: string;
  actionFeedback: string;
  actionPending: boolean;
  browserPanel?: ReactNode;
  currentIssue?: IssueRecordProjection | null;
  fixCardProjection?: IssueFixCardProjection | null;
  onApplyContractReview: (input: IssueArchitectReviewInput) => void;
  onCopyRepairHandoff: () => void;
  onPrepareRepairHandoff: () => void;
  onRefresh: () => void;
  onReloadBrowser?: () => void;
}): JSX.Element {
  const [disposition, setDisposition] = useState<DocumentDispositionStatus | "">("");
  const [operatorNotes, setOperatorNotes] = useState("");
  const isCurrentRepair = fixCardProjection?.currentImplementationKind === "repair";
  const repairDraft = fixCardProjection?.activeRepairSubmission;
  const [selectedDocumentId, setSelectedDocumentId] = useState(
    repairDraft ? "repair-draft" : isCurrentRepair && fixCardProjection?.canApplyContractReview ? "repair-contract" : "validation-record",
  );
  useEffect(() => {
    if (repairDraft) setSelectedDocumentId("repair-draft");
    else if (isCurrentRepair && fixCardProjection?.canApplyContractReview) setSelectedDocumentId("repair-contract");
  }, [repairDraft?.submissionId, repairDraft?.bodySha256, repairDraft?.validationError,
    fixCardProjection?.currentRepairId, fixCardProjection?.contractRevision, fixCardProjection?.canApplyContractReview]);
  const [copyFeedback, setCopyFeedback] = useState("");
  const repairDocuments = issueRepairPresentationDocuments(fixCardProjection);
  const selectedRepairDocument = repairDocuments.find((document) => document.slot.slotId === selectedDocumentId)
    ?? repairDocuments[0];
  const repairStateLabel = repairDraft
    ? repairDraft.validationError ? "Draft Needs Correction" : "Repair Draft Ready"
    : isCurrentRepair
    ? fixCardProjection?.canApplyContractReview ? "Repair Card Reviewable" : "Repair Contract Current"
    : fixCardProjection?.canCopyRepairHandoff ? "Prompt Ready"
    : fixCardProjection?.canPrepareRepairHandoff ? "Evidence Ready"
    : "Needs Attention";
  const repairStatusText = repairDraft
    ? repairDraft.validationError ?? `Controlled Repair draft ${repairDraft.repairId}; submission ${repairDraft.submissionId}. Copy the handoff to write its body.`
    : isCurrentRepair
    ? "The current Issue-owned Repair contract is available for its normal disposition."
    : fixCardProjection?.canPrepareRepairHandoff
    ? "Exact Issue validation evidence is ready for a bounded Repair handoff."
    : fixCardProjection?.statusMessage ?? "Repair evidence needs attention.";
  return (
    <WorkCardRepairPresentation
      actionError={actionError}
      actionFeedback={actionFeedback}
      architectAriaLabel="Issue Repair Architect"
      architectHeading="Issue Repair Architect"
      architectStateLabel={repairStateLabel}
      architectStatusText={repairStatusText}
      browserPanel={browserPanel ?? <FigmaBrowserPanel hostRef={{ current: null }} onReload={() => undefined} onRetry={() => undefined} retryVisible={false} statusLabel="ChatGPT ready" />}
      copyEnabled={Boolean(fixCardProjection?.canCopyRepairHandoff) && !actionPending}
      documentFeedback={copyFeedback}
      documentSlots={repairDocuments.map((document) => document.slot)}
      isArchitectPaneVisible
      isPreparing={actionPending}
      onCopyDocument={() => {
        if (!selectedRepairDocument) {
          return;
        }
        void window.navigator.clipboard.writeText(selectedRepairDocument.detail.bodyMarkdown ?? "");
        setCopyFeedback("Selected Issue Repair document copied.");
      }}
      onCopyHandoff={onCopyRepairHandoff}
      onPrepareHandoff={onPrepareRepairHandoff}
      onRefresh={onRefresh}
      onReloadBrowser={onReloadBrowser ?? (() => undefined)}
      onSelectDocument={(slotId) => {
        setCopyFeedback("");
        setSelectedDocumentId(slotId);
      }}
      prepareButtonLabel="Prepare Repair Handoff"
      prepareEnabled={Boolean(fixCardProjection?.canPrepareRepairHandoff) && !actionPending}
      repairReviewPanel={!repairDraft && isCurrentRepair && fixCardProjection?.canApplyContractReview ? (
        <FigmaDocumentDispositionPanel
          canApply={Boolean(disposition) && disposition !== "Pending" && (disposition !== "RevisionRequested" || Boolean(operatorNotes.trim()))}
          currentDocument={selectedRepairDocument?.detail.displayFilename}
          effectiveDisposition={selectedRepairDocument?.detail.effectiveDisposition}
          isApplying={actionPending}
          notes={operatorNotes}
          onApply={() => {
            if (disposition && disposition !== "Pending") {
              onApplyContractReview({ disposition: disposition as IssueArchitectReviewDisposition, operatorNotes });
            }
          }}
          onNotesChange={setOperatorNotes}
          onStatusChange={setDisposition}
          status={disposition}
          workflowStep="Issue Repair"
        />
      ) : undefined}
      selectedDocument={selectedRepairDocument?.detail ?? null}
      selectedSlotId={selectedRepairDocument?.slot.slotId ?? ""}
      showRepairReviewPanel={selectedRepairDocument?.slot.slotId === "repair-contract"}
      statusDefectText={fixCardProjection?.validationBoundedDefect}
      statusIdentity={repairDraft ? `${repairDraft.repairId}; submission ${repairDraft.submissionId}` : isCurrentRepair ? fixCardProjection?.currentRepairId ?? "Issue Repair" : "Bounded Issue Repair"}
      statusLabel={repairStateLabel}
      statusReason={`Issue ${currentIssue?.issueId ?? "not selected"}; root Fix Card ${fixCardProjection?.selectedCandidate?.fixCardId ?? "not selected"}${fixCardProjection?.parentImplementationId ? `; failed implementation ${fixCardProjection.parentImplementationId}` : ""}.`}
      statusTarget={repairDraft?.temporaryDraftPath ?? (isCurrentRepair ? fixCardProjection?.contractPath : undefined)}
      workspaceAriaLabel="Issue Repair workspace"
    />
  );
}

function issueRepairPresentationDocuments(
  fixCardProjection?: IssueFixCardProjection | null,
): Array<{ slot: ArchitectOutputDocumentSlotModel; detail: PlanningDocumentDetail }> {
  const documents = [
    issueRepairPresentationDocument({
      slotId: "validation-record",
      label: "Validation Record",
      path: fixCardProjection?.validationRecordPath,
      markdown: fixCardProjection?.validationRecordMarkdown,
      readError: fixCardProjection?.validationRecordReadError,
      readState: fixCardProjection?.validationRecordState,
      revision: fixCardProjection?.validationRecordRevision,
      disposition: fixCardProjection?.validationRecordDisposition,
    }),
    issueRepairPresentationDocument({
      slotId: "implementer-report",
      label: "Implementer Report",
      path: fixCardProjection?.implementerReportPath,
      markdown: fixCardProjection?.implementerReportMarkdown,
      readError: fixCardProjection?.implementerReportReadError,
      readState: fixCardProjection?.implementerReportState,
      revision: fixCardProjection?.implementerReportRevision,
      disposition: fixCardProjection?.implementerReportDisposition,
    }),
    issueRepairPresentationDocument({
      slotId: "failed-implementation-contract",
      label: "Failed / Current Implementation Contract",
      path: fixCardProjection?.parentImplementationPath ?? fixCardProjection?.contractPath,
      markdown: fixCardProjection?.currentImplementationKind === "repair" ? undefined : fixCardProjection?.contractMarkdown,
      readError: fixCardProjection?.currentImplementationKind === "repair" ? undefined : fixCardProjection?.contractReadError,
      readState: fixCardProjection?.currentImplementationKind === "repair" ? "missing" : fixCardProjection?.contractState,
      revision: fixCardProjection?.currentImplementationKind === "repair" ? undefined : fixCardProjection?.contractRevision,
      disposition: fixCardProjection?.currentImplementationKind === "repair" ? undefined : fixCardProjection?.contractDisposition,
    }),
  ];
  if (fixCardProjection?.activeRepairSubmission) {
    const draft = fixCardProjection.activeRepairSubmission;
    documents.push(issueRepairPresentationDocument({
      slotId: "repair-draft",
      label: "Repair Draft",
      path: draft.temporaryDraftPath,
      markdown: draft.bodyMarkdown,
      readState: "readable",
      revision: draft.draftRevision,
      disposition: "Pending",
    }));
  } else if (fixCardProjection?.currentImplementationKind === "repair") {
    documents.push(issueRepairPresentationDocument({
      slotId: "repair-contract",
      label: "Current Repair Contract",
      path: fixCardProjection.contractPath,
      markdown: fixCardProjection.contractMarkdown,
      readError: fixCardProjection.contractReadError,
      readState: fixCardProjection.contractState,
      revision: fixCardProjection.contractRevision,
      disposition: fixCardProjection.contractDisposition,
    }));
  }
  return documents;
}

function issueRepairPresentationDocument({
  disposition,
  label,
  markdown,
  path,
  readError,
  readState,
  revision,
  slotId,
}: {
  disposition?: IssueArchitectReviewDisposition | "Pending";
  label: string;
  markdown?: string;
  path?: string;
  readError?: string;
  readState?: "missing" | "readable" | "read-error";
  revision?: number;
  slotId: string;
}): { slot: ArchitectOutputDocumentSlotModel; detail: PlanningDocumentDetail } {
  const resolvedPath = path ?? `<unresolved ${label} path>`;
  const resolvedState = readState ?? "missing";
  const bodyMarkdown = markdown ?? `# ${label}\n\n${readError ?? `Document body is not available for ${resolvedPath}.`}`;
  return {
    slot: {
      slotId,
      displayLabel: label,
      targetPath: resolvedPath,
      logicalDocumentId: `issue-repair:${slotId}:${resolvedPath}`,
      artifactRevision: revision,
      disposition,
      documentReadState: resolvedState,
      readError,
    },
    detail: {
      logicalDocumentId: `issue-repair:${slotId}:${resolvedPath}`,
      markdownPath: resolvedPath,
      displayFilename: displayFilenameFromIssuePath(resolvedPath) ?? label,
      metadata: { artifactRevision: revision },
      effectiveDisposition: disposition ?? "Pending",
      documentReadState: resolvedState,
      initializationNeeded: false,
      readError,
      bodyMarkdown,
      preview: bodyMarkdown,
      previewTruncated: false,
    },
  };
}

function displayFilenameFromIssuePath(markdownPath?: string): string | undefined {
  return markdownPath?.split(/[\\/]/).filter(Boolean).at(-1);
}

function issueFixCardWorkspaceSummary({
  action,
  activeStepLabel,
  currentIssue,
  fixCardProjection,
  projectName,
}: {
  action: string;
  activeStepLabel: string;
  currentIssue?: IssueRecordProjection | null;
  fixCardProjection?: IssueFixCardProjection | null;
  projectName: string;
}): string {
  const issueLabel = currentIssue ? `${currentIssue.issueId}: ${currentIssue.title}` : "No issue selected";
  const selected = fixCardProjection?.selectedCandidate;
  const fixCardLabel = selected ? `${selected.fixCardId}: ${selected.title}` : "Select a candidate";
  return `${action} for ${projectName}. Issue: ${issueLabel}. Fix Card: ${fixCardLabel}. Step: ${activeStepLabel}.`;
}

function IssueFixCardActionMessage({
  actionError,
  actionFeedback,
}: {
  actionError: string;
  actionFeedback: string;
}): JSX.Element | null {
  if (actionError) {
    return <div className="codex-execution-message error" role="status">{actionError}</div>;
  }
  if (actionFeedback) {
    return <div className="codex-execution-message" role="status">{actionFeedback}</div>;
  }
  return null;
}

function issueFixCardPostRunMessage(
  execution: CodexImplementerExecutionModel | null,
  fixCardProjection?: IssueFixCardProjection | null,
): string | null {
  const state = execution?.state ?? "unavailable";
  if (state !== "completed" && state !== "failed" && state !== "cancelled") {
    return null;
  }
  return fixCardProjection?.implementerReportReadiness === "ready-for-review"
    ? "Current Implementer Report is ready for advisory Architect Review."
    : "Complete the reserved Issue-owned Implementer Report before advisory Architect Review.";
}
