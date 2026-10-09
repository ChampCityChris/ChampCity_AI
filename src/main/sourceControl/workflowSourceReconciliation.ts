import fs from "node:fs";
import path from "node:path";
import { runBoundedGit } from "../core/gitExecution";
import { resolveManagedProjectSourceTopology, resolveManagedWorkflowCheckoutPath, workflowRepositoryCheckoutId } from "./projectSourceTopology";
import { workflowSourceLineName } from "./workSourceNaming";

export function boundedSourcePaths(paths: string[]): string[] {
  if (paths.length > 256 || paths.some(file => typeof file !== "string" || !file || file.length > 512 ||
    path.isAbsolute(file) || /[\\\0\r\n:]/.test(file) || file.split("/").some(part => !part || part === "." || part === "..")))
    throw Error("Final source paths require inspection: inventory is unsafe or exceeds its bound.");
  return [...new Set(paths)].sort();
}
export function sourcePathsInScope(paths: string[], approved: string[]): boolean {
  return paths.every(file => approved.some(allowed => file === allowed || file.startsWith(`${allowed.replace(/\/$/, "")}/`)));
}

/** Git is authoritative only at the exact reserved managed source boundary. */
export async function reconcileWorkflowSource(root: string, workflowId: string, identity: {
  checkoutRoot?: string; repositoryCheckoutId: string; sourceLineId: string; expectedRevisionId: string;
}): Promise<string[]> {
  const managed = resolveManagedWorkflowCheckoutPath(root, workflowId).checkoutRoot;
  const checkout = fs.realpathSync(managed);
  if (checkout !== managed || fs.lstatSync(managed).isSymbolicLink() ||
    identity.checkoutRoot && identity.checkoutRoot !== checkout ||
    identity.repositoryCheckoutId !== workflowRepositoryCheckoutId(workflowId) || identity.sourceLineId !== workflowSourceLineName(workflowId))
    throw Error("Exact managed source identity changed; inspection required.");
  const dev = resolveManagedProjectSourceTopology(root).devCheckoutRoot;
  const [top, common, devCommon, branch, head, changes, untracked] = await Promise.all([
    runBoundedGit({ cwd: checkout, args: ["rev-parse", "--show-toplevel"] }),
    runBoundedGit({ cwd: checkout, args: ["rev-parse", "--git-common-dir"] }),
    runBoundedGit({ cwd: dev, args: ["rev-parse", "--git-common-dir"] }),
    runBoundedGit({ cwd: checkout, args: ["branch", "--show-current"] }),
    runBoundedGit({ cwd: checkout, args: ["rev-parse", "HEAD"] }),
    runBoundedGit({ cwd: checkout, args: ["diff", "--name-only", "--no-renames", "-z", "HEAD"] }),
    runBoundedGit({ cwd: checkout, args: ["ls-files", "--others", "--exclude-standard", "-z"] }),
  ]);
  if (fs.realpathSync(top.stdout.trim()) !== checkout ||
    fs.realpathSync(path.resolve(checkout, common.stdout.trim())) !== fs.realpathSync(path.resolve(dev, devCommon.stdout.trim())) ||
    branch.stdout.trim() !== identity.sourceLineId || head.stdout.trim() !== identity.expectedRevisionId)
    throw Error("Reserved source root, repository, branch or HEAD changed; inspection required.");
  return boundedSourcePaths([...changes.stdout.split("\0"), ...untracked.stdout.split("\0")].filter(Boolean));
}
