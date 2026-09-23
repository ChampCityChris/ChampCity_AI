import type { SourceGraph } from "../../shared/sourceLifecycleContracts";

type Line = SourceGraph["sourceLines"][number];
type Revision = SourceGraph["revisions"][number];

export interface SourceGraphLayout {
  lines: Line[];
  nodes: Array<{ revision: Revision; x: number; y: number; lineId: string }>;
  edges: Array<{ parentId: string; childId: string; path: string; integration: boolean; semantic?: boolean }>;
  width: number;
  height: number;
}

const laneHeight = 92;
const columnWidth = 74;

/** Graph geometry uses semantic revision/parent contracts only; Git output never reaches the renderer. */
export function layoutSourceGraph(graph: SourceGraph): SourceGraphLayout {
  const lines = [...graph.sourceLines].sort((a, b) => {
    const rank = (line: Line) => line.role === "main" ? 0 : line.role === "dev" ? 1 : 2;
    return rank(a) - rank(b) || a.id.localeCompare(b.id);
  });
  const byId = new Map(graph.revisions.map(revision => [revision.id, revision]));
  const laneByRevision = new Map<string, string>();
  for (const line of lines) {
    let revisionId: string | undefined = line.headRevisionId;
    const visited = new Set<string>();
    while (revisionId && !visited.has(revisionId)) {
      visited.add(revisionId);
      const revision = byId.get(revisionId);
      if (!revision) break;
      if (!laneByRevision.has(revisionId)) laneByRevision.set(revisionId, line.id);
      revisionId = revision.parents[0];
    }
  }
  const fallbackLineId = lines.find(line => line.role === "dev")?.id ?? lines[0]?.id ?? "";
  const rowByLine = new Map(lines.map((line, index) => [line.id, index]));
  const nodes = [...graph.revisions].reverse().map((revision, index) => {
    const lineId = laneByRevision.get(revision.id) ?? fallbackLineId;
    return { revision, lineId, x: 40 + index * columnWidth, y: 46 + (rowByLine.get(lineId) ?? 0) * laneHeight };
  });
  const nodeById = new Map(nodes.map(node => [node.revision.id, node]));
  const edges: SourceGraphLayout["edges"] = [];
  for (const node of nodes) node.revision.parents.forEach((parentId, index) => {
    const parent = nodeById.get(parentId);
    if (!parent) return;
    const middle = (parent.x + node.x) / 2;
    edges.push({ parentId, childId: node.revision.id, integration: index > 0,
      path: `M ${parent.x} ${parent.y} C ${middle} ${parent.y}, ${middle} ${node.y}, ${node.x} ${node.y}` });
  });
  // Fast-forward integration makes the work head part of the target's first-parent lane.
  // Retain a visible, semantic connection from the Work Intake line to that exact revision.
  for (const work of graph.workBindings) {
    if (work.integrationState !== "integrated" || !work.lineId) continue;
    const line = lines.find(row => row.id === work.lineId);
    const head = line ? nodeById.get(line.headRevisionId) : undefined;
    const workRow = rowByLine.get(work.lineId);
    if (!head || workRow === undefined || head.lineId === work.lineId ||
      !graph.integrationTargets.some(target => target.lineId === head.lineId)) continue;
    const y = 46 + workRow * laneHeight;
    const middle = head.x / 2;
    edges.push({ parentId: work.lineId, childId: head.revision.id, integration: true, semantic: true,
      path: `M 0 ${y} C ${middle} ${y}, ${middle} ${head.y}, ${head.x} ${head.y}` });
  }
  return { lines, nodes, edges, width: Math.max(720, 88 + nodes.length * columnWidth),
    height: Math.max(96, lines.length * laneHeight) };
}
