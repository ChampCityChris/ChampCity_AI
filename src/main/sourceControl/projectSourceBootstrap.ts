import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../agentHarness/core/errors";
import { runBoundedGit } from "../agentHarness/repository/boundedGit";
import type { ProjectSourceBootstrap } from "../../shared/sourceLifecycleContracts";

const initialSubject = "ChampCity initial source baseline";
const opaqueId = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

async function git(root: string, args: string[], optional = false): Promise<string | null> {
  const result = await runBoundedGit({ cwd: root, args, rejectNonZero: !optional });
  return optional && result.exitCode !== 0 ? null : result.stdout.trim();
}

/** Establishes only the empty initial topology; existing source is never imported or overwritten. */
export async function bootstrapProjectSource(root: string, repositoryId: string): Promise<ProjectSourceBootstrap> {
  if (!opaqueId.test(repositoryId)) throw new AgentHarnessError("INVALID_INPUT", "A bounded repository identity is required.");
  const canonical = fs.realpathSync(root);
  if (!fs.statSync(canonical).isDirectory()) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Selected Project root is not a directory.");
  const entries = fs.readdirSync(canonical);
  if (entries.some(entry => entry !== ".git" && entry !== ".champcity")) {
    throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Greenfield source bootstrap requires an empty selected Project root.");
  }
  for (const entry of entries) {
    const stat = fs.lstatSync(path.join(canonical, entry));
    if (!stat.isDirectory() || stat.isSymbolicLink() || path.dirname(fs.realpathSync(path.join(canonical, entry))) !== canonical) {
      throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Greenfield source storage is not an owned directory.");
    }
  }
  if (!fs.existsSync(path.join(canonical, ".git"))) await git(canonical, ["init", "-b", "main"]);
  const selectedRoot = await git(canonical, ["rev-parse", "--show-toplevel"]);
  if (!selectedRoot || fs.realpathSync(selectedRoot) !== canonical) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Git topology is not owned by the exact selected Project root.");
  if ((await git(canonical, ["ls-files", "--cached"])) !== "") throw new AgentHarnessError("STALE_SOURCE", "Greenfield source bootstrap requires an empty index.");
  const emptyTree = await git(canonical, ["write-tree"]);
  if (!emptyTree) throw new AgentHarnessError("GIT_EXECUTION_FAILED", "Empty source tree could not be written.");
  let main = await git(canonical, ["show-ref", "--verify", "--hash", "refs/heads/main"], true);
  if (!main) {
    const refs = await git(canonical, ["for-each-ref", "--format=%(refname)", "refs/heads"]);
    if (refs) throw new AgentHarnessError("STALE_SOURCE", "Greenfield source bootstrap found an incompatible existing branch.");
    main = (await runBoundedGit({ cwd: canonical,
      args: ["-c", "user.name=ChampCity", "-c", "user.email=champcity@invalid.local", "commit-tree", emptyTree, "-m", initialSubject],
      commitDates: { author: "946684800 +0000", committer: "946684800 +0000" } })).stdout.trim();
    if (!main) throw new AgentHarnessError("GIT_EXECUTION_FAILED", "Initial source revision could not be created.");
    await git(canonical, ["update-ref", "--no-deref", "refs/heads/main", main, "0".repeat(main.length)]);
  }
  const [parents, tree, subject] = await Promise.all([
    git(canonical, ["show", "-s", "--format=%P", main]),
    git(canonical, ["rev-parse", `${main}^{tree}`]),
    git(canonical, ["show", "-s", "--format=%s", main]),
  ]);
  if (parents || tree !== emptyTree || subject !== initialSubject) {
    throw new AgentHarnessError("STALE_SOURCE", "Existing main is not the compatible greenfield baseline.");
  }
  const refs = await git(canonical, ["for-each-ref", "--format=%(refname)", "refs/heads"]);
  if (refs?.split(/\r?\n/).some(ref => ref !== "refs/heads/main" && ref !== "refs/heads/dev")) {
    throw new AgentHarnessError("STALE_SOURCE", "Greenfield source bootstrap found an unrelated branch.");
  }
  const head = await git(canonical, ["rev-parse", "--verify", "HEAD"], true);
  if (head && head !== main) throw new AgentHarnessError("STALE_SOURCE", "Selected checkout already has incompatible source history.");
  if (!head) await git(canonical, ["symbolic-ref", "HEAD", "refs/heads/main"]);
  const dev = await git(canonical, ["show-ref", "--verify", "--hash", "refs/heads/dev"], true);
  if (dev && dev !== main) throw new AgentHarnessError("STALE_SOURCE", "Existing dev differs from the initial main revision.");
  if (!dev) await git(canonical, ["update-ref", "--no-deref", "refs/heads/dev", main, "0".repeat(main.length)]);
  const commitBytes = (await runBoundedGit({ cwd: canonical, args: ["cat-file", "commit", main] })).stdoutBuffer;
  return { repositoryId, initialRevision: { repositoryId, revisionId: main },
    initialCommitDigest: createHash("sha256").update(commitBytes).digest("hex"),
    stableLine: { repositoryId, sourceLineId: "main", providerBranchName: "main", headRevisionId: main },
    integrationTarget: { repositoryId, sourceLineId: "dev", headRevisionId: main } };
}
