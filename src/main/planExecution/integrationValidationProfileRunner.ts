import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import type { IntegrationPolicyCheck, IntegrationValidationContext } from "../../shared/integrationPolicyContracts";
import { integrationPolicyPath, INTEGRATION_VALIDATION_LANES } from "../../shared/integrationPolicyContracts";
import type { IntegrationValidationEvidence, IntegrationProfileTelemetry } from "../../shared/integrationCandidateContracts";
import { integrationPaths, readIntegrationChangedPaths, readIntegrationCommitFile } from "../agentHarness/repository/integrationGit";
import { resolveWindowsNpmInvocation } from "../agentHarness/release/releaseCommandAdapter";

const TOOLKIT_FILES = ["affected.cjs", "authority.cjs", "build.cjs", "catalog-schema.cjs", "catalog.cjs", "child-cleanup.cjs", "executor.cjs", "environment.cjs", "planner.cjs", "process.cjs", "profile-runner.cjs", "scheduler.cjs", "telemetry.cjs"];
type Evidence = Omit<IntegrationValidationEvidence, "checkId">;
interface ProfileAuthority {
  targetCommit: string;
  sha256: string;
  catalog: unknown;
  profiles: unknown;
  scripts: Record<string, string>;
  files: Array<{ name: string; bytes: Buffer }>;
}
export async function loadValidationProfileAuthority(root: string, targetCommit: string, scripts: Record<string, string>): Promise<ProfileAuthority> {
  const files: ProfileAuthority["files"] = [];
  // Bounded immutable reads; no incoming code is loaded into the application.
  for (const name of TOOLKIT_FILES) files.push({ name, bytes: await readIntegrationCommitFile(root, targetCommit, `scripts/validation/${name}`, 128_000) });
  const catalog = await readIntegrationCommitFile(root, targetCommit, "validation/capability-map.json", 1_000_000);
  const profiles = await readIntegrationCommitFile(root, targetCommit, "validation/profiles.json", 128_000);
  const hash = createHash("sha256").update(catalog).update(profiles).update(JSON.stringify(scripts));
  for (const file of files) hash.update(file.name).update(file.bytes);
  const decode = (bytes: Buffer) => JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  return { targetCommit, sha256: hash.digest("hex"), catalog: decode(catalog), profiles: decode(profiles), scripts, files };
}

export async function runValidationProfile(root: string, candidateRoot: string, check: IntegrationPolicyCheck, context: Readonly<IntegrationValidationContext>, authority: ProfileAuthority): Promise<Evidence> {
  if (check.runner.kind !== "validation-profile") throw Error("Expected registered validation profile.");
  const profileId = check.runner.profile;
  if (context.targetCommit !== authority.targetCommit || !/^[a-f0-9]{64}$/.test(context.candidateId)
    || ![context.targetCommit, context.incomingCommit, context.candidateCommit].every(value=>/^[a-f0-9]{40,64}$/.test(value))) throw Error("Profile validation requires immutable application context.");
  const paths = integrationPaths(root, context.candidateId);
  if (path.resolve(candidateRoot) !== path.resolve(paths.checkout)) throw Error("Profile context does not identify this candidate.");
  const changedPaths = await readIntegrationChangedPaths(root, context);
  const runtime = fs.mkdtempSync(path.join(paths.base, "validation-runtime-"));
  try {
    for (const file of authority.files) fs.writeFileSync(path.join(runtime, file.name), file.bytes, { flag: "wx" });
    const executable = process.platform === "win32" ? resolveWindowsNpmInvocation().executable : process.execPath;
    const result = await new Promise<{ exitCode: number | null; output: string; stopped: boolean }>((resolve) => {
      let output = "", bytes = 0, stopped = false, settled = false;
      const env = { ...process.env };
      for (const key of Object.keys(env)) if (/^(npm_|node_options$|node_path$|node_test_context$|electron_run_as_node$)/i.test(key)) delete env[key];
      const child = spawn(executable, ["--require", path.join(runtime, "child-cleanup.cjs"), path.join(runtime, "profile-runner.cjs")], { cwd: candidateRoot, env, windowsHide: true, detached: process.platform !== "win32", stdio: ["pipe", "pipe", "pipe"] });
      let fallback: NodeJS.Timeout | undefined;
      const finish = (exitCode: number | null) => { if (settled) return; settled = true; clearTimeout(timer); clearTimeout(fallback); resolve({ exitCode, output, stopped }); };
      const stop = () => {
        if (stopped || settled) return; stopped = true;
        if (child.pid) {
          if (process.platform === "win32") { const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore", timeout: 3000 }); killer.on("error", ()=>child.kill("SIGKILL")); }
          else { try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); } }
        }
        fallback = setTimeout(()=>{child.stdout.destroy();child.stderr.destroy();child.unref();finish(null);},3500);
      };
      const timer = setTimeout(stop, check.runner.timeoutMs);
      child.stdout.on("data", (chunk: Buffer)=>{ bytes += chunk.length; if(bytes>256_000)stop(); else output += chunk.toString("utf8"); });
      child.stderr.on("data", (chunk: Buffer)=>{bytes += chunk.length;if(bytes>256_000)stop();});
      child.once("error", ()=>finish(null)); child.once("close", finish); child.stdin.on("error", ()=>undefined);
      child.stdin.end(JSON.stringify({ root: candidateRoot, profile: profileId, context, changedPaths, targetCatalog: authority.catalog, targetProfiles: authority.profiles, targetScripts: authority.scripts }));
    });
    if (result.stopped) return { exitCode: null, summary: "Validation profile exceeded its bounded duration or output limit." };
    let response: { status?: unknown; runId?: unknown; selectedTests?: unknown; excludedLanes?: unknown; durationMs?: unknown; telemetry?: unknown; message?: unknown };
    try { response = JSON.parse(result.output.trim()); } catch { return { exitCode: null, summary: "Validation profile did not return bounded structured evidence." }; }
    if (!Array.isArray(response.selectedTests) || response.selectedTests.length > 512 || response.selectedTests.some(file=>typeof file!=="string" || !/^test\/.+\.test\.cjs$/.test(file) || integrationPolicyPath(file)!==file)
      || !Array.isArray(response.excludedLanes) || response.excludedLanes.some(lane=>!INTEGRATION_VALIDATION_LANES.includes(lane))
      || typeof response.runId!=="string" || !/^[a-f0-9-]{36}$/.test(response.runId) || !Number.isInteger(response.durationMs) || (response.durationMs as number)<0
      || !["passed","failed","incomplete"].includes(response.status as string) || !validTelemetry(response.telemetry)) {
      const unknown = typeof response.message === "string" && response.message.startsWith("Unclassified changed source") ? " Unclassified changed source under target authority; update reviewed ownership." : "";
      return { exitCode: null, summary: `Validation profile planning or execution failed.${unknown}` };
    }
    const status = response.status as "passed" | "failed" | "incomplete";
    return { exitCode: result.exitCode === 0 && status === "passed" ? 0 : 1, summary: `Target-owned ${profileId} ${status}; ${response.selectedTests.length} selected files.`,
      profileEvidence: { profileId, authoritySha256: authority.sha256, targetCommit: context.targetCommit, incomingCommit: context.incomingCommit, candidateCommit: context.candidateCommit,
        runId: response.runId, status, selectedTests: response.selectedTests as string[], excludedLanes: response.excludedLanes as string[], durationMs: response.durationMs as number, telemetry: response.telemetry as IntegrationProfileTelemetry } };
  } finally {
    if (path.dirname(runtime) !== paths.base || !path.basename(runtime).startsWith("validation-runtime-")) throw Error("Invalid profile runtime cleanup boundary.");
    fs.rmSync(runtime, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

function validTelemetry(value: unknown): value is IntegrationProfileTelemetry {
  if (!value || typeof value !== "object") return false;
  const t = value as IntegrationProfileTelemetry;
  const count = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) <= 1_000_000_000;
  const lane = (n: unknown): boolean => typeof n === "string" && INTEGRATION_VALIDATION_LANES.includes(n as typeof INTEGRATION_VALIDATION_LANES[number]);
  return count(t.buildDurationMs) && count(t.concurrency) && t.concurrency >= 1 && t.concurrency <= 4 && count(t.cohortCount)
    && Array.isArray(t.selectedLanes) && t.selectedLanes.length <= 9 && t.selectedLanes.every(lane)
    && Array.isArray(t.selectedCapabilities) && t.selectedCapabilities.length <= 512 && t.selectedCapabilities.every(id=>typeof id === "string" && /^[a-z0-9-]{1,160}$/.test(id))
    && Array.isArray(t.perLane) && t.perLane.length <= 9 && t.perLane.every(row=>row && lane(row.lane) && count(row.fileCount) && count(row.fileDurationMs))
    && Boolean(t.counts) && ["tests","pass","fail","skipped","cancelled","unavailableFiles","blockedFiles","unknownCountFiles"].every(key=>count(t.counts[key as keyof typeof t.counts]))
    && Array.isArray(t.slowestFiles) && t.slowestFiles.length <= 5 && t.slowestFiles.every(row=>row && typeof row.testPath === "string" && /^test\/.+\.test\.cjs$/.test(row.testPath) && !row.testPath.includes("..") && !row.testPath.includes(":") && count(row.durationMs) && ["passed","failed","execution-failed","unavailable","blocked"].includes(row.status))
    && Boolean(t.budget) && ["not-budgeted","within-target","target-missed","review-required"].includes(t.budget.status)
    && (t.budget.targetMs === null || count(t.budget.targetMs)) && (t.budget.reviewThresholdMs === null || count(t.budget.reviewThresholdMs));
}
