import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../core/errors";
import { resolveRepositoryPath } from "./pathPolicy";

export interface PendingPatchProposal {
  id: string;
  root: string;
  patchHash: string;
  affectedFiles: string[];
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

const TTL_MS = 2 * 60 * 60 * 1000;

export function sha256Patch(patch: string): string {
  return createHash("sha256").update(patch, "utf8").digest("hex");
}

export function pendingPatchStorePath(userDataRoot: string): string {
  return path.join(userDataRoot, "agent-harness", "generated", "pending-patches.local.json");
}

export function readPendingPatches(userDataRoot: string): PendingPatchProposal[] {
  const storePath = pendingPatchStorePath(userDataRoot);
  if (!fs.existsSync(storePath)) {
    return [];
  }
  const parsed = JSON.parse(fs.readFileSync(storePath, "utf8")) as { proposals?: PendingPatchProposal[] };
  return Array.isArray(parsed.proposals) ? parsed.proposals : [];
}

function writePendingPatches(userDataRoot: string, proposals: PendingPatchProposal[]): void {
  const storePath = pendingPatchStorePath(userDataRoot);
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, `${JSON.stringify({ proposals }, null, 2)}\n`, "utf8");
}

export function registerPatchProposal(userDataRoot: string, root: string, patch: string, affectedFiles = inferAffectedFiles(patch)): PendingPatchProposal {
  const now = Date.now();
  const proposals = readPendingPatches(userDataRoot).filter((proposal) => proposal.used || Date.parse(proposal.expiresAt) > now);
  const proposal: PendingPatchProposal = {
    id: randomUUID(),
    root: path.resolve(root),
    patchHash: sha256Patch(patch),
    affectedFiles,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TTL_MS).toISOString(),
    used: false,
  };
  writePendingPatches(userDataRoot, [...proposals, proposal]);
  return proposal;
}

export function applyApprovedPatch(userDataRoot: string, root: string, patch: string, proposalId: string, patchHash: string): {
  proposalId: string;
  affectedFiles: string[];
} {
  const actualHash = sha256Patch(patch);
  if (actualHash !== patchHash) {
    throw new AgentHarnessError("PATCH_DENIED", "Patch hash does not match the supplied patch content.");
  }
  const proposals = readPendingPatches(userDataRoot);
  const proposal = proposals.find((entry) => entry.id === proposalId && entry.patchHash === actualHash && path.resolve(entry.root) === path.resolve(root));
  if (!proposal) {
    throw new AgentHarnessError("PATCH_DENIED", "Patch does not match a registered pending proposal.");
  }
  if (proposal.used) {
    throw new AgentHarnessError("PATCH_DENIED", "Patch proposal has already been used.");
  }
  if (Date.parse(proposal.expiresAt) <= Date.now()) {
    throw new AgentHarnessError("PATCH_DENIED", "Patch proposal has expired.");
  }
  applySimplePatch(root, patch);
  writePendingPatches(userDataRoot, proposals.map((entry) => entry.id === proposal.id ? { ...entry, used: true } : entry));
  return { proposalId, affectedFiles: proposal.affectedFiles };
}

function inferAffectedFiles(patch: string): string[] {
  const files: string[] = [];
  for (const line of patch.split(/\r?\n/)) {
    const match = /^\*\*\* Update File: (.+)$/.exec(line) ?? /^\*\*\* Add File: (.+)$/.exec(line);
    if (match) {
      files.push(match[1].trim());
    }
  }
  return files;
}

function applySimplePatch(root: string, patch: string): void {
  const lines = patch.split(/\r?\n/);
  if (lines[0] !== "*** Begin Patch" || !lines.includes("*** End Patch")) {
    throw new AgentHarnessError("PATCH_DENIED", "Only Codex-style bounded patches are supported.");
  }
  let index = 1;
  while (index < lines.length) {
    const line = lines[index];
    if (line === "*** End Patch") {
      return;
    }
    const addMatch = /^\*\*\* Add File: (.+)$/.exec(line);
    const updateMatch = /^\*\*\* Update File: (.+)$/.exec(line);
    if (addMatch) {
      const target = resolveRepositoryPath(root, addMatch[1], { allowMissingLeaf: true });
      if (fs.existsSync(target.resolvedPath)) {
        throw new AgentHarnessError("PATCH_DENIED", "Add File target already exists.", { relativePath: target.relativePath });
      }
      const content: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("*** ")) {
        if (!lines[index].startsWith("+")) {
          throw new AgentHarnessError("PATCH_DENIED", "Add File lines must start with '+'.");
        }
        content.push(lines[index].slice(1));
        index += 1;
      }
      fs.mkdirSync(path.dirname(target.resolvedPath), { recursive: true });
      fs.writeFileSync(target.resolvedPath, `${content.join("\n")}\n`, "utf8");
      continue;
    }
    if (updateMatch) {
      const target = resolveRepositoryPath(root, updateMatch[1]);
      let content = fs.readFileSync(target.resolvedPath, "utf8");
      index += 1;
      while (index < lines.length && !lines[index].startsWith("*** ")) {
        if (lines[index].startsWith("@@")) {
          index += 1;
          continue;
        }
        const removals: string[] = [];
        const additions: string[] = [];
        while (index < lines.length && lines[index].startsWith("-")) {
          removals.push(lines[index].slice(1));
          index += 1;
        }
        while (index < lines.length && lines[index].startsWith("+")) {
          additions.push(lines[index].slice(1));
          index += 1;
        }
        if (removals.length === 0) {
          index += 1;
          continue;
        }
        const oldText = removals.join("\n");
        if (!content.includes(oldText)) {
          throw new AgentHarnessError("PATCH_DENIED", "Patch removal block was not found exactly.", {
            relativePath: target.relativePath,
          });
        }
        content = content.replace(oldText, additions.join("\n"));
      }
      fs.writeFileSync(target.resolvedPath, content, "utf8");
      continue;
    }
    throw new AgentHarnessError("PATCH_DENIED", `Unsupported patch directive: ${line}`);
  }
}
