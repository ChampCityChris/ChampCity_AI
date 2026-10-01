import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ArchitectReviewProjection } from "../../shared/projectState/architectReviewContracts";
import type { PlanningDocumentDetail } from "../../shared/documents/planningDocument";

export const GENERATED_ARCHITECT_MARKER = "<!-- GENERATED FROM CHAMPCITY STRUCTURED PROJECT STATE: ARCHITECT REVIEW -->";
export function architectReviewDocument(review: ArchitectReviewProjection): PlanningDocumentDetail {
  return {logicalDocumentId: review.cycleId, markdownPath: review.relativePath, displayFilename: review.filename,
    metadata: {artifactType: "generated-architect-review", artifactRevision: review.recordVersion, participationRole: "gatingReview"},
    effectiveDisposition: ({approved: "Approved", revision_requested: "RevisionRequested", rejected: "Rejected"} as const)[review.disposition.state as "approved"] ?? "Pending",
    initializationNeeded: false, documentReadState: "readable", bodyMarkdown: review.markdown, preview: review.markdown, previewTruncated: false};
}
/** Never overwrites historical prose; only its own generated namespace is writable. */
export function writeArchitectReviewProjection(root: string, review: ArchitectReviewProjection): void {
  if (!/^planning\/architect-reviews\/ARCHITECT_REVIEW_[a-zA-Z0-9_-]{1,128}\.md$/.test(review.relativePath)) throw Error("Invalid generated Architect projection path.");
  let parent = fs.realpathSync(root);
  for (const segment of review.relativePath.split("/").slice(0, -1)) {
    parent = path.join(parent, segment);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent);
    if (!fs.lstatSync(parent).isDirectory() || fs.lstatSync(parent).isSymbolicLink() || fs.realpathSync(parent) !== parent) throw Error("Architect projection requires contained real directories.");
  }
  const target = path.join(parent, path.posix.basename(review.relativePath));
  if (fs.existsSync(target) && (!fs.lstatSync(target).isFile() || fs.lstatSync(target).isSymbolicLink())) throw Error("Architect projection requires a regular target.");
  const temporary = path.join(parent, `.architect-${randomUUID()}.tmp`);
  try {
    const fd = fs.openSync(temporary, "wx");
    try { fs.writeFileSync(fd, review.markdown, "utf8"); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temporary, target);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
