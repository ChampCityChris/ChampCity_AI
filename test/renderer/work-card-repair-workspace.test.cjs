const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("work-card-repair renders a dedicated workspace instead of the generic document shell", () => {
  const appSource = read("src/renderer/app/App.tsx");
  const repairWorkspaceSource = read("src/renderer/app/WorkCardRepairWorkspace.tsx");
  const documentCardSource = read("src/renderer/app/FigmaDocumentCard.tsx");
  const stylesSource = read("src/renderer/styles.css");

  assert.match(appSource, /import \{ FigmaDocumentCard, FigmaMarkdownBody \} from "\.\/FigmaDocumentCard"/);
  assert.match(appSource, /import \{ WorkCardRepairWorkspace \} from "\.\/WorkCardRepairWorkspace"/);
  assert.match(appSource, /const isWorkCardRepair =\s*activeWorkspaceId === "work-card-repair"/);
  assert.match(appSource, /isArchitectEnabledWorkspace\(activeWorkspaceId\) && !isWorkCardPlanningPreparation && !isWorkCardRepair/);
  assert.match(appSource, /<WorkCardRepairWorkspace/);
  assert.match(appSource, /window\.champcity\.createRepairForCurrentFailure\(\)/);
  assert.match(appSource, /getCurrentRepairWorkspaceProjection/);
  assert.match(appSource, /!isVisibleArchitectOutputWorkspace &&\s*!isWorkCardRepair/);

  assert.match(documentCardSource, /className="figma-document-card"/);
  assert.match(documentCardSource, /className="figma-document-tabs"/);
  assert.match(documentCardSource, /className="figma-document-card-body"/);
  assert.match(documentCardSource, /FigmaMarkdownBody/);
  assert.match(repairWorkspaceSource, /import \{ FigmaDocumentCard \} from "\.\/FigmaDocumentCard"/);
  assert.match(repairWorkspaceSource, /<FigmaDocumentCard/);
  assert.match(repairWorkspaceSource, /slots=\{documentSlots\}/);
  assert.match(repairWorkspaceSource, /evidenceSlotFromRepairDocument/);
  assert.match(repairWorkspaceSource, /detailFromEvidenceDocument/);
  assert.match(repairWorkspaceSource, /Repair Work Card Architect/);
  assert.match(repairWorkspaceSource, /Validation Record/);
  assert.match(repairWorkspaceSource, /Implementer Report/);
  assert.match(repairWorkspaceSource, /Formal Work Card/);
  assert.match(repairWorkspaceSource, /Repair Work Card/);
  assert.match(repairWorkspaceSource, /repairWorkCardNeedsDisposition \? repairTabId/);
  assert.match(repairWorkspaceSource, /primaryEvidenceSlotId/);
  assert.match(repairWorkspaceSource, /Repair defect:/);
  assert.match(repairWorkspaceSource, /Repair target:/);
  assert.match(repairWorkspaceSource, /Prepare Repair Work Card Prompt/);
  assert.match(repairWorkspaceSource, /Copy Handoff/);
  assert.match(repairWorkspaceSource, /Reload ChatGPT/);
  assert.match(repairWorkspaceSource, /repairReviewPanel/);
  assert.match(repairWorkspaceSource, /selectedIsRepairWorkCard && repairReviewPanel/);
  assert.match(appSource, /reviewArchitectOutput/);
  assert.match(appSource, /FigmaArchitectReviewPanel/);
  assert.match(appSource, /onSelectRepairWorkCard/);
  assert.match(appSource, /revisionKeyForArchitectOutputSlot\(repairWorkCardSlot\)/);
  assert.match(repairWorkspaceSource, /primaryEvidenceDocument/);
  assert.match(repairWorkspaceSource, /supportingEvidenceDocuments/);
  assert.match(repairWorkspaceSource, /bodyMarkdown/);
  assert.doesNotMatch(repairWorkspaceSource, /Stage 1/);
  assert.doesNotMatch(repairWorkspaceSource, /Stage 2/);
  assert.doesNotMatch(repairWorkspaceSource, /Reuse Repair Handoff/);
  assert.doesNotMatch(repairWorkspaceSource, /Prepare Repair Handoff/);
  assert.doesNotMatch(repairWorkspaceSource, /Prepare Architect Prompt/);

  assert.doesNotMatch(repairWorkspaceSource, /<input/);
  assert.doesNotMatch(repairWorkspaceSource, /work-card-repair-grid/);
  assert.doesNotMatch(repairWorkspaceSource, /repair-evidence-preview/);
  assert.doesNotMatch(repairWorkspaceSource, /repair-evidence-tabs/);
  assert.doesNotMatch(repairWorkspaceSource, /RepairField/);
  assert.doesNotMatch(repairWorkspaceSource, /repair-authority-panel/);
  assert.doesNotMatch(repairWorkspaceSource, /work-card-repair-review-panel/);
  assert.doesNotMatch(stylesSource, /\.work-card-repair-review-panel/);
  assert.doesNotMatch(stylesSource, /\.repair-evidence-tabs/);
  assert.doesNotMatch(stylesSource, /\.repair-evidence-preview/);
  assert.doesNotMatch(stylesSource, /\.work-card-repair-grid/);
  assert.match(stylesSource, /\.work-card-repair-workspace/);
  assert.match(stylesSource, /\.figma-document-tabs/);
  assert.match(stylesSource, /\.figma-document-card-body/);
  assert.match(stylesSource, /\.work-card-repair-status-strip/);
  assert.match(stylesSource, /\.work-card-repair-disposition-slot/);
});
