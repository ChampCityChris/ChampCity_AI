import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, GitBranch, RefreshCw } from "lucide-react";
import type { SourceGraph, SourceGraphRevisionDetail } from "../../shared/sourceLifecycleContracts";
import { layoutSourceGraph } from "./sourceGraphLayout";

type Selection = { kind: "line" | "work" | "revision"; id: string };
type Work = SourceGraph["workBindings"][number];

const shortRevision = (value: string) => value.slice(0, 9);
const workStatus = (work: Work) => work.integrationState === "integrated" ? "Integrated"
  : ["closed", "cancelled"].includes(work.lifecycleState) ? "Completed" : "Active";
const label = (value: string | null | undefined) => value?.replaceAll("-", " ") ?? "Not recorded";

export function SourceControlWorkspace({ projectName, onReturn }: { projectName: string; onReturn: () => void }): JSX.Element {
  const [graph, setGraph] = useState<SourceGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [revisionDetail, setRevisionDetail] = useState<SourceGraphRevisionDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const layout = useMemo(() => graph ? layoutSourceGraph(graph) : null, [graph]);

  async function refresh(): Promise<void> {
    setLoading(true);
    setError("");
    try {
      const response = await window.champcity.getSourceGraph({ maxRevisions: 160, maxLines: 64 });
      if (!response.ok) throw Error(response.error.message);
      setGraph(response.result);
      setSelection(current => {
        if (current?.kind === "line" && response.result.sourceLines.some(line => line.id === current.id)) return current;
        if (current?.kind === "work" && response.result.workBindings.some(work => work.workIntakeId === current.id)) return current;
        if (current?.kind === "revision" && response.result.revisions.some(revision => revision.id === current.id)) return current;
        return response.result.sourceLines[0] ? { kind: "line", id: response.result.sourceLines[0].id } : null;
      });
    } catch (failure) {
      setGraph(null);
      setError(failure instanceof Error ? failure.message : "Source graph could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (selection?.kind !== "revision") { setRevisionDetail(null); setDetailError(""); return; }
    let active = true;
    setRevisionDetail(null);
    setDetailError("");
    void window.champcity.getSourceGraphRevisionDetail(selection.id).then(response => {
      if (!active) return;
      if (response.ok) setRevisionDetail(response.result);
      else setDetailError(response.error.message);
    }).catch(failure => { if (active) setDetailError(failure instanceof Error ? failure.message : "Revision details are unavailable."); });
    return () => { active = false; };
  }, [selection?.kind, selection?.id]);

  const selectedLine = selection?.kind === "line" ? graph?.sourceLines.find(line => line.id === selection.id) : undefined;
  const selectedWork = selection?.kind === "work" ? graph?.workBindings.find(work => work.workIntakeId === selection.id) : undefined;
  const selectedRevision = selection?.kind === "revision" ? graph?.revisions.find(revision => revision.id === selection.id) : undefined;
  const lineWork = selectedLine ? graph?.workBindings.filter(work => work.lineId === selectedLine.id) ?? [] : [];

  return <section className="source-control-workspace" aria-labelledby="workspace-heading">
    <header className="source-control-header">
      <div><span className="source-control-eyebrow">{projectName} · Repository view</span>
        <h1 id="workspace-heading">Source Control</h1>
        <p>Inspect source lines, revision ancestry, and Work Intake progress.</p></div>
      <div className="source-control-header-actions">
        <button type="button" onClick={onReturn}><ArrowLeft size={16} aria-hidden="true" /> Workflows</button>
        <button type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} aria-hidden="true" /> {loading ? "Loading…" : "Refresh graph"}</button>
      </div>
    </header>
    {error ? <div className="source-control-state" role="alert"><p>{error}</p><button type="button" onClick={() => void refresh()}>Try again</button></div> : null}
    {loading && !graph ? <p className="source-control-state" role="status">Loading source graph…</p> : null}
    {graph && layout ? <>
      <div className="source-control-summary" aria-label="Graph summary">
        <span>{graph.sourceLines.length} source lines</span><span>{graph.revisions.length} revisions shown</span>
        <span>{graph.integrationTargets.length} integration targets</span>
      </div>
      {graph.providerDiagnostics.metadata === "unavailable" ? <p className="source-control-notice" role="status">Workflow details are unavailable. Repository topology is still shown.</p> : null}
      {graph.truncation.linesTruncated || graph.truncation.revisionsTruncated || graph.truncation.workBindingsTruncated ?
        <p className="source-control-notice" role="status">Showing a bounded view. {graph.truncation.linesTruncated ? `First ${graph.truncation.maxLines} source lines. ` : ""}
          {graph.truncation.revisionsTruncated ? `First ${graph.truncation.maxRevisions} revisions. ` : ""}
          {graph.truncation.workBindingsTruncated ? "Some Work Intake details are omitted." : ""}</p> : null}
      {graph.sourceLines.length ? <div className="source-control-content">
        <div className="source-control-main">
          <section className="source-graph-section" aria-label="Source graph">
            <div className="source-graph-guide"><span>Source lines</span><span>Older revisions <span aria-hidden="true">→</span> newer revisions · scroll graph horizontally</span></div>
            <div className="source-graph-board">
              <div className="source-graph-labels" aria-label="Select source line">
                {layout.lines.map(line => {
                  const work = graph.workBindings.find(binding => binding.lineId === line.id);
                  const status = line.role === "main" || line.role === "dev" ? "Target" : work ? workStatus(work) : "Source line";
                  return <button type="button" key={line.id} aria-pressed={selection?.kind === "line" && selection.id === line.id}
                    onClick={() => setSelection({ kind: "line", id: line.id })} title={work?.title ?? line.providerBranchName ?? "Source line"}>
                    <strong>{work?.title ?? (line.role === "main" ? "Main" : line.role === "dev" ? "Development" : "Unbound source line")}</strong>
                    <span>{status}{work?.route ? ` · ${label(work.route)}` : ""}</span>
                  </button>;
                })}
              </div>
              <div className="source-graph-scroll" role="region" tabIndex={0} aria-label="Scrollable revision graph">
                <div className="source-graph-canvas" style={{ width: layout.width, height: layout.height }}>
                  <svg width={layout.width} height={layout.height} aria-hidden="true" focusable="false">
                    {layout.lines.map((line, index) => <line key={line.id} x1="0" x2={layout.width} y1={46 + index * 92} y2={46 + index * 92} className="source-graph-guide-line" />)}
                    {layout.edges.map(edge => <path key={`${edge.parentId}-${edge.childId}`} d={edge.path}
                      className={edge.integration ? "source-graph-edge integration" : "source-graph-edge"} />)}
                  </svg>
                  {layout.nodes.map(node => <button type="button" key={node.revision.id}
                    className={`source-graph-node${node.revision.parents.length > 1 ? " merge" : ""}`}
                    style={{ left: node.x, top: node.y }}
                    aria-label={`Revision ${shortRevision(node.revision.id)}${node.revision.parents.length > 1 ? ", merge" : ""}`}
                    aria-pressed={selection?.kind === "revision" && selection.id === node.revision.id}
                    title={`${shortRevision(node.revision.id)} · ${node.revision.timestamp}`}
                    onClick={() => setSelection({ kind: "revision", id: node.revision.id })}>
                    <span aria-hidden="true">{node.revision.parents.length > 1 ? "◆" : "●"}</span>
                  </button>)}
                </div>
              </div>
            </div>
            <p className="source-graph-key"><span>● Revision</span><span>◆ Merge revision</span><span>Dashed curve: integrated parent</span></p>
          </section>
          {graph.workBindings.length ? <section className="source-work-list" aria-label="Work Intakes">
            <h2>Work Intakes</h2>
            <div>{graph.workBindings.map(work => <button type="button" key={work.workIntakeId}
              aria-pressed={selection?.kind === "work" && selection.id === work.workIntakeId}
              onClick={() => setSelection({ kind: "work", id: work.workIntakeId })}>
              <strong>{work.title}</strong><span>{workStatus(work)} · {label(work.route ?? work.workType)}</span>
            </button>)}</div>
          </section> : null}
        </div>
        <aside className="source-control-inspector" aria-label="Selected source details">
          <h2>Details</h2>
          {selectedLine ? <>
            <p className="source-control-detail-type"><GitBranch size={15} aria-hidden="true" /> Source line</p>
            <h3>{lineWork[0]?.title ?? (selectedLine.role === "main" ? "Main" : selectedLine.role === "dev" ? "Development" : "Unbound source line")}</h3>
            <p>{selectedLine.role === "main" || selectedLine.role === "dev" ? "Integration target" : lineWork[0] ? workStatus(lineWork[0]) : "No Work Intake binding"}</p>
            <dl><div><dt>Current revision</dt><dd><code>{shortRevision(selectedLine.headRevisionId)}</code></dd></div>
              {lineWork[0]?.baseRevisionId ? <div><dt>Base revision</dt><dd><code>{shortRevision(lineWork[0].baseRevisionId)}</code></dd></div> : null}
              {lineWork[0] ? <><div><dt>Route / type</dt><dd>{label(lineWork[0].route ?? lineWork[0].workType)}</dd></div>
                <div><dt>Lifecycle</dt><dd>{label(lineWork[0].lifecycleState)}</dd></div>
                <div><dt>Checkpoints</dt><dd>{lineWork[0].checkpointKinds.length ? lineWork[0].checkpointKinds.map(label).join(", ") : "None recorded"}</dd></div>
                <div><dt>Integration</dt><dd>{label(lineWork[0].integrationState)}</dd></div></> : null}</dl>
            <details><summary>Provider details</summary><dl><div><dt>Branch</dt><dd><code>{selectedLine.providerBranchName ?? "Unavailable"}</code></dd></div>
              <div><dt>Full head revision</dt><dd><code>{selectedLine.headRevisionId}</code></dd></div></dl></details>
          </> : selectedWork ? <>
            <p className="source-control-detail-type">Work Intake</p><h3>{selectedWork.title}</h3>
            <p>{workStatus(selectedWork)}</p>
            <dl><div><dt>Route / type</dt><dd>{label(selectedWork.route ?? selectedWork.workType)}</dd></div>
              <div><dt>Lifecycle</dt><dd>{label(selectedWork.lifecycleState)}</dd></div>
              <div><dt>Workflow</dt><dd>{label(selectedWork.workflowState)}</dd></div>
              <div><dt>Base revision</dt><dd>{selectedWork.baseRevisionId ? <code>{shortRevision(selectedWork.baseRevisionId)}</code> : "Not recorded"}</dd></div>
              <div><dt>Current revision</dt><dd>{selectedWork.currentRevisionId ? <code>{shortRevision(selectedWork.currentRevisionId)}</code> : "Not recorded"}</dd></div>
              <div><dt>Checkpoints</dt><dd>{selectedWork.checkpointKinds.length ? selectedWork.checkpointKinds.map(label).join(", ") : "None recorded"}</dd></div>
              <div><dt>Integration</dt><dd>{label(selectedWork.integrationState)}</dd></div></dl>
            <details><summary>Work Intake identity</summary><code>{selectedWork.workIntakeId}</code></details>
          </> : selectedRevision ? <>
            <p className="source-control-detail-type">Revision{selectedRevision.parents.length > 1 ? " · Merge" : ""}</p>
            <h3><code>{shortRevision(selectedRevision.id)}</code></h3>
            <dl><div><dt>Recorded</dt><dd>{new Date(selectedRevision.timestamp).toLocaleString()}</dd></div>
              <div><dt>Parents</dt><dd>{selectedRevision.parents.length ? selectedRevision.parents.map(shortRevision).join(", ") : "Initial revision"}</dd></div>
              <div><dt>Checkpoint</dt><dd>{selectedRevision.checkpointKinds.length ? selectedRevision.checkpointKinds.map(label).join(", ") : "None recorded"}</dd></div>
              <div><dt>Integration</dt><dd>{selectedRevision.integrationStates.length ? selectedRevision.integrationStates.map(label).join(", ") : "None recorded"}</dd></div></dl>
            <h4>Changed files</h4>
            {detailError ? <p role="alert">{detailError}</p> : revisionDetail ? <>
              <p>{revisionDetail.totalChangedFiles} changed{revisionDetail.changedFilesTruncated ? "; first 24 shown" : ""}.</p>
              <ul className="source-control-files">{revisionDetail.changedFiles.map(file => <li key={`${file.status}:${file.path}`}><span>{file.status}</span><code>{file.path}</code></li>)}</ul>
            </> : <p role="status">Loading revision details…</p>}
            <details><summary>Provider details</summary><code>{selectedRevision.id}</code></details>
          </> : <p>Select a source line, Work Intake, or revision to inspect it.</p>}
        </aside>
      </div> : <p className="source-control-state">No local source lines are available yet.</p>}
    </> : null}
  </section>;
}
