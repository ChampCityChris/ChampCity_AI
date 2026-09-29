import fs from "node:fs";
import path from "node:path";
import type { IntegrationValidationEvidence } from "../../shared/integrationCandidateContracts";
import type { IntegrationPolicyCheck, IntegrationValidationContext } from "../../shared/integrationPolicyContracts";
import { inspectIntegrationCheckout, integrationCommonDirectory, integrationPaths, registeredIntegrationCheckout } from "../agentHarness/repository/integrationGit";

type Evidence = Omit<IntegrationValidationEvidence, "checkId">;

/** Application-owned minimum validation; it inspects Git state and never executes candidate source. */
export async function runSourceIntegrity(
  repositoryRoot: string,
  candidateRoot: string,
  check: IntegrationPolicyCheck,
  context: Readonly<IntegrationValidationContext>,
): Promise<Evidence> {
  if (check.runner.kind !== "source-integrity") throw Error("Expected the registered source-integrity runner.");
  if (!/^[a-f0-9]{64}$/.test(context.candidateId)
    || ![context.targetCommit, context.incomingCommit, context.candidateCommit].every(value => /^[a-f0-9]{40,64}$/.test(value))) {
    throw Error("Source-integrity validation requires immutable application context.");
  }
  const root = fs.realpathSync(repositoryRoot);
  if (fs.lstatSync(repositoryRoot).isSymbolicLink()) throw Error("Integration repository root must not be redirected.");
  await integrationCommonDirectory(root);
  const expected = integrationPaths(root, context.candidateId);
  const registered = await registeredIntegrationCheckout(root, context.candidateId);
  if (path.resolve(candidateRoot) !== path.resolve(expected.checkout)
    || path.resolve(registered.checkout) !== path.resolve(expected.checkout)) {
    throw Error("Source-integrity validation requires the exact registered isolated candidate.");
  }
  const state = await inspectIntegrationCheckout(root, context.candidateId);
  if (!state.clean || state.conflictingPaths.length || state.commit !== context.candidateCommit) {
    return { exitCode: 1, summary: "Application-owned source integrity found a changed or inexact candidate checkout." };
  }
  return { exitCode: 0, summary: "Application-owned source integrity passed." };
}
