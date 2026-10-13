import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { AgentHarnessError } from "../core/applicationErrors";
import { runBoundedGit } from "../core/gitExecution";
import { assertSafeRelativePath, resolveRepositoryPath } from "./pathPolicy";
import { assertNoGitOperation, inspectGitChangedFiles, inspectGitOperationState, gitConflictPaths, deleteGitUntrackedPaths } from "./gitMutations";
import { inspectGitRemote, boundedRemoteName } from "./gitRemoteManagement";

const invalid = (message: string) => new AgentHarnessError("INVALID_INPUT", message);
const fail = (message: string) => new AgentHarnessError("GIT_EXECUTION_FAILED", message);
const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const fileDigest = (bytes: Buffer | null) => bytes === null ? digest("absent") : digest(Buffer.concat([Buffer.from("present\0"), bytes]));
const oid = (value: string) => { if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value)) throw invalid("Select an exact Git object ID."); return value; };
const run = (root: string, args: string[], rejectNonZero = true, stdin?: string) => runBoundedGit({ cwd: root, args, rejectNonZero, stdin, stdoutLimitBytes: 262144 });
export async function resolveExtendedGitCommit(root: string, value: string) {
  if (!value || value.length > 240 || value.startsWith("-") || /[\s\0:]/.test(value)) throw invalid("Select a bounded commit revision.");
  return oid((await run(root, ["rev-parse", "--verify", "--end-of-options", `${value}^{commit}`])).stdout.trim());
}
/** Ordinary individual files only: literal paths, no links, metadata, nested repos or directory recursion. */
function filePath(root: string, input: string) {
  if (typeof input !== "string" || !input || input.length > 4096 || /[\0\r\n]/.test(input)) throw invalid("Select an exact repository-relative file.");
  const relative = assertSafeRelativePath(input).split(path.sep).join("/");
  if (relative === "." || relative.split("/").some(part => part === "." || /^\.git(?:$|[. ])/i.test(part) || /[. ]$/.test(part))) throw invalid("Repository metadata and directory selectors are unavailable.");
  const resolved = resolveRepositoryPath(root, relative, { allowMissingLeaf: true });
  let current = resolved.rootRealPath;
  const parts = relative.split("/");
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]);
    if (!fs.existsSync(current)) { // lstat also detects dangling links.
      try { fs.lstatSync(current); throw invalid("File path contains a dangling link."); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      continue;
    }
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || stat.nlink > 1 && stat.isFile() || index < parts.length - 1 && !stat.isDirectory() || index === parts.length - 1 && !stat.isFile()) throw invalid("Select an ordinary file without links.");
    if (stat.isDirectory() && fs.existsSync(path.join(current, ".git"))) throw invalid("Nested repository paths are unavailable.");
  }
  return { relative, absolute: resolved.requestedPath };
}
function fileBytes(root: string, relative: string): Buffer | null {
  const selected = filePath(root, relative);
  if (!fs.existsSync(selected.absolute)) return null;
  if (fs.statSync(selected.absolute).size > 262144) throw invalid("File exceeds the bounded text-file size.");
  return fs.readFileSync(selected.absolute);
}
export async function inspectExtendedGitFile(root: string, input: { filePath: string }) {
  const selected = filePath(root, input.filePath), bytes = fileBytes(root, selected.relative);
  const content = bytes?.toString("utf8") ?? null;
  if (bytes && (bytes.includes(0) || !Buffer.from(content!, "utf8").equals(bytes))) throw invalid("Select a UTF-8 text file.");
  const index = (await run(root, ["--literal-pathspecs", "ls-files", "--stage", "-z", "--", selected.relative])).stdout;
  return { filePath: selected.relative, exists: bytes !== null, content, fileState: fileDigest(bytes), indexState: digest(index) };
}
/** Fingerprint dirty bytes and exact index entries, including untracked files; no application workflow state. */
export async function inspectExtendedGitState(root: string) {
  const headResult = await run(root, ["rev-parse", "--verify", "--quiet", "HEAD^{commit}"], false);
  const head = headResult.exitCode === 0 ? oid(headResult.stdout.trim()) : null;
  const branchResult = await run(root, ["symbolic-ref", "--quiet", "HEAD"], false);
  if (![0, 1].includes(branchResult.exitCode ?? -1)) throw fail("Active checkout ref could not be inspected.");
  const branch = branchResult.exitCode === 0 ? branchResult.stdout.trim() : null;
  const index = (await run(root, ["ls-files", "--stage", "-z"])).stdout;
  const files = await inspectGitChangedFiles(root);
  if (files.length > 256) throw fail("Dirty file state exceeds the bounded mutation inventory.");
  const dirty = files.map(file => ({ ...file, bytes: fileDigest(fileBytes(root, file.path)) }));
  const operationState = await inspectGitOperationState(root), conflicts = await gitConflictPaths(root);
  if (conflicts.truncated) throw fail("Conflict state exceeds its bound.");
  const directory = path.resolve(root, (await run(root, ["rev-parse", "--git-dir"])).stdout.trim());
  const operationFiles = ["MERGE_HEAD", "MERGE_MSG", "CHERRY_PICK_HEAD", "REVERT_HEAD", "ORIG_HEAD", "sequencer/head", "sequencer/todo", "rebase-merge/head-name", "rebase-merge/orig-head", "rebase-merge/onto", "rebase-merge/git-rebase-todo", "rebase-merge/done", "rebase-apply/head-name", "rebase-apply/orig-head", "rebase-apply/onto", "rebase-apply/next", "rebase-apply/last"];
  const operationIdentity = operationFiles.map(name => {
    const filename = path.join(directory, name);
    if (!fs.existsSync(filename)) return [name, null];
    const stat = fs.lstatSync(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink > 1 || stat.size > 65536) throw fail("Git operation metadata exceeds its safe bounds.");
    return [name, digest(fs.readFileSync(filename))];
  });
  return { head, branch, state: digest(JSON.stringify({ head, branch, index, dirty, operationState, operationIdentity })), clean: files.length === 0, operationState, ...conflicts };
}
async function expectedState(root: string, expected: string) {
  if (!/^[a-f0-9]{64}$/.test(expected)) throw invalid("Select the inspected exact checkout state.");
  const state = await inspectExtendedGitState(root);
  if (state.state !== expected) throw fail("Checkout state changed; inspect before retrying. No mutation was attempted.");
  return state;
}
export async function writeExtendedGitFile(root: string, input: { filePath: string; content: string; expectedFileState: string; expectedIndexState: string; stage?: boolean }) {
  if (typeof input.content !== "string" || input.content.includes("\0") || Buffer.byteLength(input.content) > 262144) throw invalid("Supply bounded UTF-8 text.");
  const selected = filePath(root, input.filePath), before = await inspectExtendedGitFile(root, input);
  if (before.fileState !== input.expectedFileState || before.indexState !== input.expectedIndexState) throw fail("File or index changed; inspect before retrying.");
  const temporary = path.join(path.dirname(selected.absolute), `.champcity-${randomUUID()}.tmp`);
  // Parents must already exist; creation never implicitly changes repository layout.
  const descriptor = fs.openSync(temporary, "wx", fs.existsSync(selected.absolute) ? fs.statSync(selected.absolute).mode : 0o600);
  try {
    try { fs.writeFileSync(descriptor, input.content, "utf8"); fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
    const current = await inspectExtendedGitFile(root, input);
    if (current.fileState !== before.fileState || current.indexState !== before.indexState) throw fail("File or index changed during write; no replacement was attempted.");
    fs.renameSync(temporary, selected.absolute);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  if (input.stage) await run(root, ["--literal-pathspecs", "add", "--", selected.relative]);
  return inspectExtendedGitFile(root, input);
}
export async function blameExtendedGitFile(root: string, input: { filePath: string; ref?: string; startLine?: number; endLine?: number }) {
  const selected = filePath(root, input.filePath), ref = await resolveExtendedGitCommit(root, input.ref ?? "HEAD");
  const start = input.startLine ?? 1;
  const lineCount = (await run(root, ["show", `${ref}:${selected.relative}`])).stdout.split("\n").length - 1;
  const end = input.endLine ?? Math.min(Math.max(1, lineCount), start + 199);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start || end - start > 999) throw invalid("Select at most 1000 blame lines.");
  const output = await run(root, ["--literal-pathspecs", "blame", "--line-porcelain", "--no-textconv", "-L", `${start},${end}`, ref, "--", selected.relative]);
  return { filePath: selected.relative, commit: ref, startLine: start, endLine: end, porcelain: output.stdout };
}
export async function grepExtendedGit(root: string, input: { query: string; ref?: string; paths?: string[] }) {
  if (!input.query || Buffer.byteLength(input.query) > 2000 || /[\0\r\n]/.test(input.query)) throw invalid("Select a bounded literal search string.");
  const paths = input.paths?.map(value => filePath(root, value).relative) ?? [];
  const ref = input.ref ? await resolveExtendedGitCommit(root, input.ref) : undefined;
  const result = await run(root, ["--literal-pathspecs", "grep", "--no-textconv", "-n", "-I", "-F", "-e", input.query, ...(ref ? [ref] : []), "--", ...paths], false);
  if (![0, 1].includes(result.exitCode ?? -1)) throw fail("Git search failed.");
  return { commit: ref ?? null, matches: result.stdout.split(/\r?\n/).filter(Boolean), matched: result.exitCode === 0 };
}
export async function mutateExtendedGitFile(root: string, operation: "remove" | "move", input: { filePath: string; destinationPath?: string; expectedState: string; cached?: boolean }) {
  await assertNoGitOperation(root); await expectedState(root, input.expectedState);
  const source = filePath(root, input.filePath);
  const tracked = (await run(root, ["--literal-pathspecs", "ls-files", "--stage", "-z", "--", source.relative])).stdout;
  if (!/^100(?:644|755) [a-f0-9]+ 0\t/.test(tracked) || tracked.split("\0").filter(Boolean).length !== 1) throw invalid("Select one ordinary tracked file.");
  if (operation === "move") {
    const target = filePath(root, input.destinationPath ?? "");
    if (fs.existsSync(target.absolute)) throw fail("Move destination must be absent.");
    await run(root, ["--literal-pathspecs", "mv", "--", source.relative, target.relative]);
  } else await run(root, ["--literal-pathspecs", "rm", ...(input.cached ? ["--cached"] : []), "--", source.relative]);
  return inspectExtendedGitState(root);
}
export async function checkoutExtendedGitRef(root: string, input: { ref: string; expectedState: string }) {
  await assertNoGitOperation(root); const before = await expectedState(root, input.expectedState);
  if (!before.clean) throw fail("Detached checkout requires a clean working tree and index.");
  const target = await resolveExtendedGitCommit(root, input.ref);
  await run(root, ["switch", "--detach", target]);
  return inspectExtendedGitState(root);
}
export async function checkoutExtendedGitBranch(root: string, input: { branchName: string; expectedState: string; expectedBranchCommit: string }) {
  await assertNoGitOperation(root); const before = await expectedState(root, input.expectedState);
  if (!before.clean) throw fail("Branch checkout requires a clean index and working tree.");
  await run(root, ["check-ref-format", "--branch", input.branchName]);
  const branch = `refs/heads/${input.branchName}`, target = await resolveExtendedGitCommit(root, branch);
  if (target !== oid(input.expectedBranchCommit)) throw fail("Target branch changed; no checkout was attempted.");
  await run(root, ["switch", "--no-guess", "--", input.branchName]);
  return inspectExtendedGitState(root);
}

async function configFile(root: string) {
  const common = path.resolve(root, (await run(root, ["rev-parse", "--git-common-dir"])).stdout.trim()), filename = path.join(common, "config");
  const stat = fs.lstatSync(filename); if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink > 1 || stat.size > 65536) throw fail("Repository configuration exceeds its ordinary-file bounds.");
  return { filename, bytes: fs.readFileSync(filename), mode: stat.mode };
}
async function mutateConfig(root: string, expectedConfiguration: string, changes: { key: string; value: string }[]) {
  const before = await configFile(root); if (digest(before.bytes) !== expectedConfiguration) throw fail("Repository configuration changed; no mutation was attempted.");
  const lock = `${before.filename}.lock`; let owns = false;
  try {
    const descriptor = fs.openSync(lock, "wx", before.mode); owns = true;
    try { fs.writeFileSync(descriptor, before.bytes); } finally { fs.closeSync(descriptor); }
    for (const change of changes) await run(root, ["config", "--file", lock, "--replace-all", change.key, change.value]);
    if (!fs.readFileSync(before.filename).equals(before.bytes)) throw fail("Configuration changed during mutation; inspect before retrying.");
    fs.renameSync(lock, before.filename); owns = false;
  } finally { if (owns) fs.unlinkSync(lock); }
}
export async function inspectExtendedGitIdentity(root: string) {
  const configuration = await configFile(root);
  const read = async (key: string) => { const result = await run(root, ["config", "--get", key], false); if (![0, 1].includes(result.exitCode ?? -1)) throw fail("Git identity could not be inspected."); return result.exitCode === 0 ? result.stdout.trim() : null; };
  return { name: await read("user.name"), email: await read("user.email"), configurationState: digest(configuration.bytes) };
}
export async function configureExtendedGitIdentity(root: string, input: { name: string; email: string; expectedConfigurationState: string }) {
  if (!input.name.trim() || input.name.length > 200 || /[\x00-\x1f<>]/.test(input.name) || !/^[^\s<>@\x00-\x1f]{1,100}@[^\s<>@\x00-\x1f]{1,150}$/.test(input.email)) throw invalid("Select a bounded Git author name and email.");
  await mutateConfig(root, input.expectedConfigurationState, [{ key: "user.name", value: input.name }, { key: "user.email", value: input.email }]);
  const after = await inspectExtendedGitIdentity(root); if (after.name !== input.name || after.email !== input.email) throw fail("Git identity is overridden; inspect configuration before retrying."); return after;
}
export async function restoreExtendedGitFile(root: string, input: { filePath: string; expectedState: string; sourceRef?: string; index: boolean; worktree: boolean }) {
  await assertNoGitOperation(root); await expectedState(root, input.expectedState); const selected = filePath(root, input.filePath);
  if (!input.index && !input.worktree || input.index && !input.sourceRef) throw invalid("Select index and/or working-file restoration with an explicit source for index writes.");
  const source = input.sourceRef ? await resolveExtendedGitCommit(root, input.sourceRef) : null;
  const metadata = (await run(root, source ? ["--literal-pathspecs", "ls-tree", "-z", source, "--", selected.relative] : ["--literal-pathspecs", "ls-files", "--stage", "-z", "--", selected.relative])).stdout;
  if (!/^100(?:644|755) (?:blob )?[a-f0-9]+(?: 0)?\t/.test(metadata) || metadata.split("\0").filter(Boolean).length !== 1) throw invalid("Restore selects one ordinary tracked source file.");
  const blob = metadata.split(/\s/).find(value => /^[a-f0-9]{40,64}$/.test(value)); if (!blob || Number((await run(root, ["cat-file", "-s", blob])).stdout) > 262144) throw invalid("Restore source exceeds the bounded file size.");
  await run(root, ["--literal-pathspecs", "restore", ...(source ? [`--source=${source}`] : []), ...(input.index ? ["--staged"] : []), ...(input.worktree ? ["--worktree"] : []), "--", selected.relative]);
  return inspectExtendedGitState(root);
}
export async function inspectExtendedGitTagObject(root: string, tagName: string) {
  if (!tagName || tagName.startsWith("-")) throw invalid("Select a bounded tag name."); await run(root, ["check-ref-format", `refs/tags/${tagName}`]);
  const result = await run(root, ["rev-parse", "--verify", "--quiet", `refs/tags/${tagName}`], false);
  if (![0, 1].includes(result.exitCode ?? -1)) throw fail("Tag inspection failed.");
  return { tagName, objectId: result.exitCode === 0 ? oid(result.stdout.trim()) : null };
}
export async function deleteExtendedGitTagObject(root: string, input: { tagName: string; expectedObjectId: string }) {
  const before = await inspectExtendedGitTagObject(root, input.tagName); if (before.objectId !== oid(input.expectedObjectId)) throw fail("Tag object changed; no deletion was attempted.");
  await run(root, ["update-ref", "-d", `refs/tags/${before.tagName}`, before.objectId]);
  return inspectExtendedGitTagObject(root, input.tagName);
}
export async function renameExtendedGitRemote(root: string, input: { remote: string; newName: string; expectedBinding: string }) {
  const before = await inspectGitRemote(root, input.remote), newName = boundedRemoteName(input.newName);
  if (before.binding !== input.expectedBinding || before.mirror || !before.destinationsEqual) throw fail("Remote binding changed or is ambiguous.");
  if ((await run(root, ["remote"])).stdout.split(/\r?\n/).includes(newName)) throw fail("New remote name must be absent.");
  await run(root, ["remote", "rename", "--", before.remote, newName]); return inspectGitRemote(root, newName);
}
export async function configureExtendedGitTracking(root: string, input: { remote: string; sourceBranch: string; trackingBranch: string; expectedBinding: string }) {
  const before = await inspectGitRemote(root, input.remote);
  if (before.binding !== input.expectedBinding || before.mirror || !before.destinationsEqual) throw fail("Remote binding changed or is ambiguous.");
  await run(root, ["check-ref-format", `refs/heads/${input.sourceBranch}`]); await run(root, ["check-ref-format", `refs/remotes/${before.remote}/${input.trackingBranch}`]);
  const configuration = await configFile(root);
  const effective = await run(root, ["config", "--null", "--get-all", `remote.${before.remote}.fetch`], false), local = await run(root, ["config", "--file", configuration.filename, "--null", "--get-all", `remote.${before.remote}.fetch`], false);
  if (effective.stdout !== local.stdout || ![0, 1].includes(effective.exitCode ?? -1)) throw fail("Inherited fetch configuration prevents bounded mutation.");
  await mutateConfig(root, digest(configuration.bytes), [{ key: `remote.${before.remote}.fetch`, value: `+refs/heads/${input.sourceBranch}:refs/remotes/${before.remote}/${input.trackingBranch}` }]);
  return inspectGitRemote(root, before.remote);
}
export async function resetExtendedGit(root: string, input: { sourceRef: string; mode: "soft" | "mixed"; expectedState: string }) {
  if (!["soft", "mixed"].includes(input.mode)) throw invalid("Only soft and mixed reset modes are exposed.");
  await assertNoGitOperation(root); const before = await expectedState(root, input.expectedState);
  const target = await resolveExtendedGitCommit(root, input.sourceRef);
  await run(root, ["reset", `--${input.mode}`, target, "--"]);
  return { previousCommit: before.head, targetCommit: target, mode: input.mode, ...(await inspectExtendedGitState(root)) };
}
export async function listExtendedGitStashes(root: string) {
  const output = await run(root, ["stash", "list", "--max-count=101", "--format=%H%x00%gd%x00%gs"]);
  const rows = output.stdout.split(/\r?\n/).filter(Boolean);
  return { entries: rows.slice(0, 100).map(row => { const [commit, selector, subject] = row.split("\0"); return { commit: oid(commit), selector, subject }; }), truncated: rows.length > 100 };
}
export async function mutateExtendedGitStash(root: string, action: "create" | "apply" | "pop" | "drop", input: { expectedState: string; paths?: string[]; message?: string; stashIndex?: number; expectedStashCommit?: string; restoreIndex?: boolean; includeUntracked?: boolean }) {
  await assertNoGitOperation(root); await expectedState(root, input.expectedState);
  if (action === "create") {
    if (!input.paths?.length || input.paths.length > 256) throw invalid("Stash creation requires explicit tracked file paths.");
    const paths = input.paths.map(value => filePath(root, value).relative);
    for (const selected of paths) {
      const tracked = (await run(root, ["--literal-pathspecs", "ls-files", "--stage", "-z", "--", selected])).stdout;
      if (!tracked && input.includeUntracked) {
        // check-ignore accepts literal filenames and rejects Git pathspec magic, including --literal-pathspecs.
        const ignored = await run(root, ["check-ignore", "--no-index", "--", selected], false);
        if (ignored.exitCode !== 1 || fileBytes(root, selected) === null) throw invalid("Untracked stash paths must be present ordinary nonignored files.");
      } else if (!/^100(?:644|755) [a-f0-9]+ 0\t/.test(tracked) || tracked.split("\0").filter(Boolean).length !== 1) throw invalid("Stash paths must be ordinary tracked files or explicitly selected nonignored untracked files.");
    }
    if (input.message !== undefined && (!input.message || input.message.length > 2000 || /[\0\r\n]/.test(input.message))) throw invalid("Select a bounded stash message.");
    await run(root, ["--literal-pathspecs", "stash", "push", ...(input.includeUntracked ? ["--include-untracked"] : []), ...(input.message ? ["-m", input.message] : []), "--", ...paths]);
  } else {
    const index = input.stashIndex;
    if (!Number.isSafeInteger(index) || index! < 0 || index! > 99) throw invalid("Select a bounded stash index.");
    const selector = `stash@{${index}}`, commit = await resolveExtendedGitCommit(root, selector);
    if (commit !== oid(input.expectedStashCommit ?? "")) throw fail("Stash changed; inspect before retrying.");
    if (action === "drop") await run(root, ["stash", "drop", selector]);
    else {
      const applied = await run(root, ["stash", "apply", ...(input.restoreIndex ? ["--index"] : []), commit], false);
      if (applied.exitCode !== 0) return { outcome: "conflicted-or-failed", exitCode: applied.exitCode, stashRetained: true, state: await inspectExtendedGitState(root) };
      if (action === "pop") {
        if (await resolveExtendedGitCommit(root, selector) !== commit) throw fail("Stash moved after apply; it was retained. Inspect before dropping.");
        await run(root, ["stash", "drop", selector]);
      }
    }
  }
  return { outcome: "completed", state: await inspectExtendedGitState(root), stashes: await listExtendedGitStashes(root) };
}
function notesRef(value = "commits") {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_/-]{0,99}$/.test(value) || value.split("/").some(part => !part || part === "." || part === "..")) throw invalid("Select a bounded notes namespace.");
  return `refs/notes/${value}`;
}
export async function inspectExtendedGitNotes(root: string, input: { namespace?: string; ref?: string }) {
  const namespace = notesRef(input.namespace), commit = input.ref ? await resolveExtendedGitCommit(root, input.ref) : undefined;
  const result = await run(root, ["notes", `--ref=${namespace}`, ...(commit ? ["show", commit] : ["list"])], false);
  if (result.exitCode !== 0 && !(result.exitCode === 1 && commit)) throw fail("Git notes inspection failed.");
  const ref = await run(root, ["rev-parse", "--verify", "--quiet", namespace], false);
  return { namespace, commit: commit ?? null, notesCommit: ref.exitCode === 0 ? oid(ref.stdout.trim()) : null, content: result.exitCode === 0 ? result.stdout : null };
}
export async function mutateExtendedGitNotes(root: string, action: "write" | "remove", input: { namespace?: string; ref: string; expectedNotesCommit: string; content?: string }) {
  const before = await inspectExtendedGitNotes(root, input);
  if ((before.notesCommit ?? "absent") !== input.expectedNotesCommit) throw fail("Notes ref changed; inspect before retrying.");
  if (action === "write" && (typeof input.content !== "string" || !input.content || Buffer.byteLength(input.content) > 65536 || input.content.includes("\0"))) throw invalid("Supply bounded note text.");
  await run(root, ["notes", `--ref=${before.namespace}`, ...(action === "remove" ? ["remove", before.commit!] : ["add", "--force", "-F", "-", before.commit!])], true, input.content);
  return inspectExtendedGitNotes(root, input);
}
export async function beginExtendedGitOperation(root: string, input: { operation: "merge" | "rebase" | "cherry-pick" | "revert"; sourceRef: string; expectedState: string; mainline?: number }) {
  if (!["merge", "rebase", "cherry-pick", "revert"].includes(input.operation)) throw invalid("Select an ordinary Git transform.");
  await assertNoGitOperation(root); const before = await expectedState(root, input.expectedState);
  if (!before.clean || !before.head) throw fail("Git transform requires a clean committed checkout.");
  const source = await resolveExtendedGitCommit(root, input.sourceRef);
  if (input.mainline !== undefined) {
    const parents = (await run(root, ["rev-list", "--parents", "-n", "1", source])).stdout.trim().split(/\s+/).length - 1;
    if (!["cherry-pick", "revert"].includes(input.operation) || !Number.isSafeInteger(input.mainline) || input.mainline < 1 || input.mainline > parents || parents < 2) throw invalid("Mainline must select one parent of a merge commit for cherry-pick or revert.");
  }
  const flags = input.operation === "rebase" ? ["--no-autostash", "--no-update-refs"] : ["--no-edit", "--no-gpg-sign"];
  const result = await run(root, ["-c", "rerere.enabled=false", input.operation, ...flags, ...(input.mainline === undefined ? [] : ["--mainline", String(input.mainline)]), source], false);
  return { outcome: result.exitCode === 0 ? "completed" : "conflicted-or-failed", exitCode: result.exitCode, previousCommit: before.head, sourceCommit: source, ...(await inspectExtendedGitState(root)) };
}
export async function recoverExtendedGitOperation(root: string, input: { operation: "merge" | "rebase" | "cherry-pick" | "revert"; step: "continue" | "abort" | "skip"; expectedState: string }) {
  const before = await expectedState(root, input.expectedState);
  const marker = { merge: "MERGE_HEAD", rebase: "rebase-", "cherry-pick": "CHERRY_PICK_HEAD", revert: "REVERT_HEAD" }[input.operation];
  if (!marker || !["continue", "abort", "skip"].includes(input.step) || input.operation === "merge" && input.step === "skip" || !before.operationState.some(item => item.startsWith(marker) || ["cherry-pick", "revert"].includes(input.operation) && item === "sequencer")) throw invalid("Requested recovery step does not match the active Git operation.");
  if (input.step === "continue" && before.conflictingPaths.length) throw fail("Resolve and stage all conflicts before continuing.");
  const result = await run(root, ["-c", "core.editor=true", "-c", "sequence.editor=true", input.operation, `--${input.step}`], false);
  return { outcome: result.exitCode === 0 ? "completed" : "conflicted-or-failed", exitCode: result.exitCode, ...(await inspectExtendedGitState(root)) };
}
export async function inspectExtendedGitPrune(root: string, remoteInput: string) {
  const remote = await inspectGitRemote(root, boundedRemoteName(remoteInput));
  if (!remote.destinationsEqual || remote.mirror) throw fail("Prune requires an exact nonmirroring destination.");
  const refs = (await run(root, ["for-each-ref", "--format=%(refname)%00%(objectname)", `refs/remotes/${remote.remote}/`])).stdout;
  const preview = (await run(root, ["remote", "prune", "--dry-run", "--", remote.remote])).stdout;
  return { remote: remote.remote, binding: remote.binding, trackingState: digest(refs), preview };
}
export async function pruneExtendedGitRemote(root: string, input: { remote: string; expectedBinding: string; expectedTrackingState: string }) {
  const before = await inspectExtendedGitPrune(root, input.remote);
  if (before.binding !== input.expectedBinding || before.trackingState !== input.expectedTrackingState) throw fail("Remote or tracking refs changed; inspect before pruning.");
  await run(root, ["remote", "prune", "--", before.remote]);
  return inspectExtendedGitPrune(root, input.remote);
}
export async function diagnoseExtendedGit(root: string) {
  const result = await run(root, ["fsck", "--connectivity-only", "--no-dangling"], false);
  return { healthy: result.exitCode === 0, exitCode: result.exitCode, diagnostic: result.stdout, state: await inspectExtendedGitState(root) };
}
export async function deleteExtendedGitUntrackedFile(root: string, input: { filePath: string; expectedState: string }) {
  await assertNoGitOperation(root); await expectedState(root, input.expectedState);
  const selected = filePath(root, input.filePath);
  await deleteGitUntrackedPaths(root, [selected.relative]);
  return inspectExtendedGitState(root);
}
