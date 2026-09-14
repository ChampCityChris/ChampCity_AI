import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
} from "react";
import { FileText, Plus, RefreshCw } from "lucide-react";

import {
  issueFixCardLoop,
  issueScreenshotEvidenceMimeTypes,
  issueScreenshotEvidencePolicy,
  type IssueInventoryProjection,
  type IssueRecordProjection,
  type NewIssueInput,
} from "../../shared/issueResolutionContracts";
import { FigmaMarkdownBody } from "./FigmaDocumentCard";
import {
  blobToCanonicalBase64,
  buildNewIssueSubmission,
  decideScreenshotPasteAdmission,
  inspectClipboardImageData,
  prepareScreenshotPaste,
  readClipboardImageDimensions,
  removePendingScreenshot,
  submitIssueAndResetOnSuccess,
  type PendingIssueScreenshot,
} from "./issueScreenshotIntake";

interface IssueResolutionWorkspaceProps {
  currentIssue: IssueRecordProjection | null;
  error: string;
  inventory: IssueInventoryProjection | null;
  isCreating: boolean;
  isLoading: boolean;
  onCreateIssue: (input: NewIssueInput) => Promise<void>;
  onRefresh: () => void;
  onSelectIssue: (issueId: string | null) => void;
  projectName: string;
}

const emptyIssueInput: NewIssueInput = {
  title: "",
  issue: "",
  currentConsequence: "",
  neededCapability: "",
  discoveryContext: "",
};

const screenshotFormatLabel = issueScreenshotEvidenceMimeTypes
  .map((mimeType) => mimeType.replace("image/", "").toUpperCase())
  .join(", ");

function formatScreenshotByteCount(byteCount: number): string {
  return `${Math.ceil(byteCount / 1024).toLocaleString()} KB`;
}

export function IssueResolutionWorkspace({
  currentIssue,
  error,
  inventory,
  isCreating,
  isLoading,
  onCreateIssue,
  onRefresh,
  onSelectIssue,
  projectName,
}: IssueResolutionWorkspaceProps): JSX.Element {
  const [input, setInput] = useState<NewIssueInput>(emptyIssueInput);
  const [formError, setFormError] = useState("");
  const [pendingScreenshots, setPendingScreenshots] = useState<PendingIssueScreenshot[]>([]);
  const [screenshotError, setScreenshotError] = useState("");
  const [screenshotProcessingCount, setScreenshotProcessingCount] = useState(0);
  const pendingScreenshotsRef = useRef<PendingIssueScreenshot[]>([]);
  const pasteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const activePasteCountRef = useRef(0);
  const screenshotIdRef = useRef(0);
  const submissionInFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  const issues = inventory?.issues ?? [];
  const isScreenshotProcessing = screenshotProcessingCount > 0;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      for (const screenshot of pendingScreenshotsRef.current) {
        URL.revokeObjectURL(screenshot.previewUrl);
      }
      pendingScreenshotsRef.current = [];
    };
  }, []);

  function replacePendingScreenshots(next: PendingIssueScreenshot[]): void {
    pendingScreenshotsRef.current = next;
    setPendingScreenshots(next);
  }

  function resetCompletedIntake(): void {
    for (const screenshot of pendingScreenshotsRef.current) {
      URL.revokeObjectURL(screenshot.previewUrl);
    }
    replacePendingScreenshots([]);
    setInput(emptyIssueInput);
    setFormError("");
    setScreenshotError("");
  }

  function handleScreenshotPaste(event: ClipboardEvent<HTMLFormElement>): void {
    const selection = inspectClipboardImageData(
      event.clipboardData.items,
      event.clipboardData.files,
    );
    const admission = decideScreenshotPasteAdmission(
      selection,
      submissionInFlightRef.current || isCreating,
    );
    if (admission.kind === "native-text-paste") {
      return;
    }

    event.preventDefault();
    if (admission.kind === "blocked-during-create") {
      setScreenshotError(admission.feedback);
      return;
    }

    activePasteCountRef.current += 1;
    setScreenshotProcessingCount(activePasteCountRef.current);
    setScreenshotError("");

    const queuedPaste = pasteQueueRef.current.then(async () => {
      const accepted = await prepareScreenshotPaste(
        pendingScreenshotsRef.current,
        admission.candidates,
        {
          readDimensions: readClipboardImageDimensions,
          encodeBase64: blobToCanonicalBase64,
          createPreviewUrl: (blob) => URL.createObjectURL(blob),
          revokePreviewUrl: (previewUrl) => URL.revokeObjectURL(previewUrl),
          makeId: () => {
            screenshotIdRef.current += 1;
            return `pending-screenshot-${screenshotIdRef.current}`;
          },
        },
      );
      if (!isMountedRef.current) {
        for (const screenshot of accepted) {
          URL.revokeObjectURL(screenshot.previewUrl);
        }
        return;
      }
      replacePendingScreenshots([...pendingScreenshotsRef.current, ...accepted]);
      setScreenshotError("");
    });
    pasteQueueRef.current = queuedPaste.catch(() => undefined);
    void queuedPaste
      .catch((error) => {
        if (isMountedRef.current) {
          setScreenshotError(
            error instanceof Error ? error.message : "Screenshot paste could not be processed.",
          );
        }
      })
      .finally(() => {
        activePasteCountRef.current = Math.max(0, activePasteCountRef.current - 1);
        if (isMountedRef.current) {
          setScreenshotProcessingCount(activePasteCountRef.current);
        }
      });
  }

  function removeScreenshot(screenshotId: string): void {
    if (activePasteCountRef.current > 0 || submissionInFlightRef.current || isCreating) {
      return;
    }
    const removed = pendingScreenshotsRef.current.find(
      (screenshot) => screenshot.id === screenshotId,
    );
    if (!removed) {
      return;
    }
    URL.revokeObjectURL(removed.previewUrl);
    replacePendingScreenshots(
      removePendingScreenshot(pendingScreenshotsRef.current, screenshotId),
    );
    setScreenshotError("");
  }

  async function submitNewIssue(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError("");
    if (activePasteCountRef.current > 0) {
      setScreenshotError("Wait for screenshot processing to finish before creating the Issue.");
      return;
    }
    if (submissionInFlightRef.current || isCreating) {
      return;
    }
    if (!input.title.trim() || !input.issue.trim() || !input.currentConsequence.trim()) {
      setFormError("Title, Issue, and Current Consequence are required.");
      return;
    }
    submissionInFlightRef.current = true;
    try {
      await submitIssueAndResetOnSuccess(
        buildNewIssueSubmission(input, pendingScreenshotsRef.current),
        onCreateIssue,
        resetCompletedIntake,
      );
    } catch {
      // App owns the current service error; preserve this form for retry.
    } finally {
      submissionInFlightRef.current = false;
    }
  }

  return (
    <section className="issue-resolution-workspace" aria-labelledby="workspace-heading">
      <header className="issue-resolution-header">
        <div>
          <span>Issue Resolution</span>
          <h1 id="workspace-heading">Issue Intake</h1>
          <p>{`Discover and record project-owned issues for ${projectName}.`}</p>
        </div>
        <button
          className="icon-button text-button"
          disabled={isLoading}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={16} />
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {error ? <div className="document-error" role="status">{error}</div> : null}

      <div className="issue-resolution-grid">
        <section className="issue-inventory-panel" aria-label="Issue discovery">
          <header>
            <h2>Issues</h2>
            <span>{issues.length === 1 ? "1 issue" : `${issues.length} issues`}</span>
          </header>
          {issues.length > 0 ? (
            <div className="issue-list">
              {issues.map((issue) => (
                <button
                  aria-current={currentIssue?.issueId === issue.issueId ? "page" : undefined}
                  className={currentIssue?.issueId === issue.issueId ? "active" : ""}
                  key={issue.issueId}
                  onClick={() => onSelectIssue(issue.issueId)}
                  type="button"
                >
                  <strong>{issue.issueId}</strong>
                  <span>{issue.title}</span>
                  <small>{issue.recordState === "readable" ? issue.recordPath : issue.readError}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="figma-empty-document">
              <strong>No issues discovered</strong>
              <span>Only immediate ISSUE_NNN directories under issues/ are shown.</span>
            </div>
          )}
          {currentIssue ? (
            <button className="secondary-action-button" onClick={() => onSelectIssue(null)} type="button">
              Clear Current Issue
            </button>
          ) : null}
        </section>

        <article className="issue-record-panel" aria-label="Selected Issue Record">
          <header>
            <div className="figma-document-title-row">
              <FileText aria-hidden="true" size={14} />
              <strong>{currentIssue ? `${currentIssue.issueId}: ${currentIssue.title}` : "No issue selected"}</strong>
            </div>
            <span>{currentIssue?.recordPath ?? "Repository-relative path"}</span>
          </header>
          {currentIssue?.recordState === "readable" ? (
            <div className="issue-record-body">
              <FigmaMarkdownBody markdown={currentIssue.bodyMarkdown ?? ""} />
            </div>
          ) : currentIssue ? (
            <div className="document-error" role="status">
              {currentIssue.readError ?? "Issue Record could not be read."}
            </div>
          ) : (
            <div className="figma-empty-document">
              <strong>No Issue Record selected</strong>
              <span>Select an Issue or create a new lightweight Issue Record.</span>
            </div>
          )}
        </article>

        <form
          aria-busy={isScreenshotProcessing || isCreating}
          className="new-issue-form"
          onPaste={handleScreenshotPaste}
          onSubmit={(event) => void submitNewIssue(event)}
        >
          <header>
            <div>
              <span>New Issue</span>
              <h2>Record an issue</h2>
            </div>
            <Plus aria-hidden="true" size={18} />
          </header>
          <label>
            Title
            <input
              onChange={(event) => setInput((current) => ({ ...current, title: event.target.value }))}
              required
              value={input.title}
            />
          </label>
          <label>
            Issue
            <textarea
              onChange={(event) => setInput((current) => ({ ...current, issue: event.target.value }))}
              required
              rows={4}
              value={input.issue}
            />
          </label>
          <label>
            Current Consequence
            <textarea
              onChange={(event) => setInput((current) => ({ ...current, currentConsequence: event.target.value }))}
              required
              rows={4}
              value={input.currentConsequence}
            />
          </label>
          <label>
            Needed Capability / Expected Outcome
            <textarea
              onChange={(event) => setInput((current) => ({ ...current, neededCapability: event.target.value }))}
              rows={3}
              value={input.neededCapability}
            />
          </label>
          <label>
            Discovery Context
            <textarea
              onChange={(event) => setInput((current) => ({ ...current, discoveryContext: event.target.value }))}
              rows={3}
              value={input.discoveryContext}
            />
          </label>
          <section
            aria-labelledby="screenshot-evidence-heading"
            className="issue-screenshot-evidence"
          >
            <header>
              <div>
                <strong id="screenshot-evidence-heading">Screenshot Evidence</strong>
                <span>
                  {`${pendingScreenshots.length}/${issueScreenshotEvidencePolicy.maxCount} pending`}
                </span>
              </div>
              <p>
                {`Paste screenshots anywhere in this form. Supported: ${screenshotFormatLabel}. Maximum ${issueScreenshotEvidencePolicy.maxCount}.`}
              </p>
            </header>
            {isScreenshotProcessing ? (
              <div className="issue-screenshot-processing" role="status">
                Processing pasted screenshot evidence...
              </div>
            ) : null}
            {pendingScreenshots.length > 0 ? (
              <ol className="issue-screenshot-preview-list">
                {pendingScreenshots.map((screenshot, index) => (
                  <li key={screenshot.id}>
                    <img
                      alt={`Pending screenshot ${index + 1}`}
                      src={screenshot.previewUrl}
                    />
                    <div>
                      <strong>{`Screenshot ${index + 1}`}</strong>
                      <span>
                        {`${screenshot.mimeType} · ${screenshot.width}×${screenshot.height} · ${formatScreenshotByteCount(screenshot.sourceByteCount)}`}
                      </span>
                    </div>
                    <button
                      disabled={isScreenshotProcessing || isCreating}
                      onClick={() => removeScreenshot(screenshot.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <span className="issue-screenshot-empty">No screenshots pending.</span>
            )}
          </section>
          {screenshotError ? (
            <div className="document-error issue-screenshot-error" role="status">
              {screenshotError}
            </div>
          ) : null}
          {formError ? <div className="document-error" role="status">{formError}</div> : null}
          <button
            className="apply-button"
            disabled={isCreating || isScreenshotProcessing}
            type="submit"
          >
            {isScreenshotProcessing
              ? "Processing screenshots..."
              : isCreating
                ? "Creating..."
                : "Create Issue"}
          </button>
        </form>
      </div>

      <div className="issue-fix-card-contract" hidden>
        {issueFixCardLoop.map((step) => step.label).join(" -> ")}
      </div>
    </section>
  );
}
