const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");

const { layoutSourceGraph } = loadRendererSourceModule("src/renderer/app/sourceGraphLayout.ts");
const { SourceControlWorkspace } = loadRendererSourceModule("src/renderer/app/SourceControlWorkspace.tsx");

function graphFixture() {
  const revisions = [
    ["i", ["h"]], ["h", ["g", "f"]], ["g", ["a"]], ["f", ["a"]],
    ["e", ["d", "c"]], ["d", ["b"]], ["c", ["b"]], ["b", ["a"]], ["a", []],
  ].map(([id, parents]) => ({ id, parents, timestamp: "2026-09-23T15:00:00Z",
    headOfLineIds: [], checkpointKinds: [], integrationStates: [] }));
  const sourceLines = [
    ["feature", "c", "work"], ["hotfix-one", "f", "work"], ["hotfix-two", "i", "work"],
    ["dev", "e", "dev"], ["main", "h", "main"],
  ].map(([id, headRevisionId, role]) => ({ id, headRevisionId, role, workflowIds: [], providerBranchName: id }));
  return { sourceLines, revisions, workflowBindings: [], integrationTargets: [{ lineId: "main" }, { lineId: "dev" }] };
}

test("source graph layout places feature and two hotfix lines below target chronology", () => {
  const layout = layoutSourceGraph(graphFixture());
  assert.deepEqual(layout.lines.map(line => line.id), ["main", "dev", "feature", "hotfix-one", "hotfix-two"]);
  const node = id => layout.nodes.find(row => row.revision.id === id);
  assert.equal(node("h").lineId, "main");
  assert.equal(node("e").lineId, "dev");
  assert.equal(node("c").lineId, "feature");
  assert.equal(node("f").lineId, "hotfix-one");
  assert.equal(node("i").lineId, "hotfix-two");
  assert.ok(layout.nodes.every(row => row.x >= 0 && row.x < layout.width && row.y >= 0 && row.y < layout.height));
});

test("integrated parents rejoin the dev and main chronology", () => {
  const layout = layoutSourceGraph(graphFixture());
  assert.equal(layout.edges.length, 10);
  assert.deepEqual(layout.edges.filter(edge => edge.integration).map(edge => [edge.parentId, edge.childId]),
    [["c", "e"], ["f", "h"]]);
  assert.ok(layout.edges.every(edge => edge.path.startsWith("M ")));
});

test("fast-forward integration visibly connects the work line to its target revision", () => {
  const graph = graphFixture();
  graph.sourceLines.find(line => line.id === "dev").headRevisionId = "c";
  graph.workflowBindings.push({ workflowId: "WF.01", lineId: "feature", integrationState: "integrated" });
  const layout = layoutSourceGraph(graph);
  const link = layout.edges.find(edge => edge.semantic);
  assert.deepEqual([link.parentId, link.childId, link.integration], ["feature", "c", true]);
  assert.equal(layout.nodes.find(node => node.revision.id === "c").lineId, "dev");
});

test("source workspace exposes read-only native navigation and a loading state", () => {
  const markup = renderToStaticMarkup(React.createElement(SourceControlWorkspace,
    { projectName: "Synthetic", onReturn: () => undefined }));
  assert.match(markup, /<h1 id="workspace-heading">Source Control<\/h1>/);
  assert.match(markup, /Loading source graph/);
  assert.match(markup, /Loading…/);
  assert.match(markup, /Workflows/);
  assert.doesNotMatch(markup, /Work Intakes|Work Intake progress/);
  assert.doesNotMatch(markup, /Merge branch|Reset branch|Stage files|Create branch/);
  const source = fs.readFileSync(path.join(process.cwd(), "src/renderer/app/SourceControlWorkspace.tsx"), "utf8");
  assert.doesNotMatch(source, /Work Intakes|Work Intake progress/);
  assert.doesNotMatch(source, /Stage files|Commit changes|Create branch|Reset branch|Switch branch/);
});
