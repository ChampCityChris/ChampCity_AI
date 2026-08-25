import { useState, type FormEvent } from "react";
import { FileText, Plus, RefreshCw } from "lucide-react";

import type {
  IssueInventoryProjection,
  IssueRecordProjection,
  NewIssueInput,
} from "../../shared/issueResolutionContracts";
import { issueFixCardLoop } from "../../shared/issueResolutionContracts";
import { FigmaMarkdownBody } from "./FigmaDocumentCard";

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
  const issues = inventory?.issues ?? [];

  async function submitNewIssue(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError("");
    if (!input.title.trim() || !input.issue.trim() || !input.currentConsequence.trim()) {
      setFormError("Title, Issue, and Current Consequence are required.");
      return;
    }
    await onCreateIssue(input);
    setInput(emptyIssueInput);
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

        <form className="new-issue-form" onSubmit={(event) => void submitNewIssue(event)}>
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
          {formError ? <div className="document-error" role="status">{formError}</div> : null}
          <button className="apply-button" disabled={isCreating} type="submit">
            {isCreating ? "Creating..." : "Create Issue"}
          </button>
        </form>
      </div>

      <div className="issue-fix-card-contract" hidden>
        {issueFixCardLoop.map((step) => step.label).join(" -> ")}
      </div>
    </section>
  );
}
