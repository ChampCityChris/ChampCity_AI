import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { INTEGRATION_POLICY_PATH, INTEGRATION_POLICY_MAX_BYTES, parseIntegrationPolicy } from "../../shared/integrationPolicyContracts";
import { readIntegrationCommitFile, registeredIntegrationCheckout } from "../agentHarness/repository/integrationGit";
import type { IntegrationCandidateHooks } from "./integrationCandidateService";
import { readIntegrationPolicyFile } from "./integrationPolicyFiles";
import { runIntegrationPolicyCheck } from "./integrationPolicyRunners";

const PACKAGE_MANIFEST_MAX_BYTES = 1_000_000;
const PACKAGE_SCRIPT_MAX_BYTES = 8192;

function parseJsonBytes(bytes: Buffer, label: string): unknown {
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw Error(`${label} must be a valid UTF-8 JSON document.`); }
}

function parsedPolicy(bytes: Buffer) {
  return { policy: parseIntegrationPolicy(parseJsonBytes(bytes, "Integration policy")), sha256: createHash("sha256").update(bytes).digest("hex") };
}

export function loadIntegrationPolicy(repositoryRoot: string) {
  return parsedPolicy(readIntegrationPolicyFile(repositoryRoot, INTEGRATION_POLICY_PATH, INTEGRATION_POLICY_MAX_BYTES));
}

export async function loadIntegrationPolicyAtCommit(repositoryRoot: string, targetCommit: string) {
  return parsedPolicy(await readIntegrationCommitFile(repositoryRoot, targetCommit, INTEGRATION_POLICY_PATH, INTEGRATION_POLICY_MAX_BYTES));
}

function requiredTargetScripts(value: unknown, names: string[]): Map<string, string> {
  const scripts = value && typeof value === "object" && !Array.isArray(value)
    ? (value as { scripts?: unknown }).scripts : undefined;
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) throw Error("Target package manifest does not define the required integration scripts.");
  const definitions = new Map<string, string>();
  for (const name of names) {
    const definition = (scripts as Record<string, unknown>)[name];
    if (typeof definition !== "string" || !definition.trim() || definition.length > PACKAGE_SCRIPT_MAX_BYTES) throw Error("Target package manifest does not define the required integration scripts.");
    definitions.set(name, definition);
  }
  return definitions;
}

/** Main-process production provider; deliberately not connected to routed Development until REPAIR06. */
export function createIntegrationPolicyProvider(repositoryRoot: string): Required<Pick<IntegrationCandidateHooks, "validationPolicy">> {
  const root = fs.realpathSync(repositoryRoot);
  if (fs.lstatSync(repositoryRoot).isSymbolicLink()) throw Error("Integration repository root must not be redirected.");
  return { validationPolicy: { resolve: async (targetCommit) => {
    const snapshot = await loadIntegrationPolicyAtCommit(root, targetCommit);
    const required = snapshot.policy.requiredIntegrationChecks.map((checkId) => snapshot.policy.checks.find((entry) => entry.checkId === checkId)!);
    const manifest = parseJsonBytes(await readIntegrationCommitFile(root, targetCommit, "package.json", PACKAGE_MANIFEST_MAX_BYTES), "Target package manifest");
    const scripts = requiredTargetScripts(manifest, required.map((check) => check.runner.script));
    async function assertCandidate(candidateRoot: string) {
      const relative = path.relative(path.join(root, ".git", "champcity-integration"), candidateRoot).split(path.sep);
      if (relative.length !== 2 || !/^[a-f0-9]{64}$/.test(relative[0]) || relative[1] !== "checkout") throw Error("Validation requires an isolated integration candidate checkout.");
      const owned = await registeredIntegrationCheckout(root, relative[0]);
      if (path.resolve(candidateRoot) !== path.resolve(owned.checkout)) throw Error("Validation requires an isolated integration candidate checkout.");
      // A proposed replacement may differ, but it must be a complete supported policy before advancement.
      loadIntegrationPolicy(owned.checkout);
    }
    return {
      sha256: snapshot.sha256,
      assertCandidate,
      checks: required.map((check) => ({ checkId: check.checkId, run: async (candidateRoot: string) => {
        await assertCandidate(candidateRoot);
        const result = await runIntegrationPolicyCheck(candidateRoot, check, scripts.get(check.runner.script)!);
        await assertCandidate(candidateRoot);
        return result;
      } })),
    };
  } } };
}
