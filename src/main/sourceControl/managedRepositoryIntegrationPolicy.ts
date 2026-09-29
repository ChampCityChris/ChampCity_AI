import fs from "node:fs";
import path from "node:path";
import type { IntegrationPolicy } from "../../shared/integrationPolicyContracts";
import { parseIntegrationPolicy } from "../../shared/integrationPolicyContracts";
import { VALIDATION_PROFILE_REQUIRED_SCRIPTS, VALIDATION_PROFILE_TOOLKIT_FILES } from "../planExecution/integrationValidationProfileRunner";

const GENERIC_TIMEOUT_MS = 60_000;
const PROFILE_TIMEOUT_MS = 900_000;
const PACKAGE_MAX_BYTES = 1_000_000;
const PROFILE_METADATA_MAX_BYTES = 1_000_000;
const TOOLKIT_MAX_BYTES = 128_000;

function readOrdinaryBoundedFile(root: string, relativePath: string, limit: number): Buffer | null {
  const absolute = path.join(root, ...relativePath.split("/"));
  try {
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limit) return null;
    const real = fs.realpathSync(absolute);
    const relative = path.relative(fs.realpathSync(root), real);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
    const bytes = fs.readFileSync(real);
    return bytes.length <= limit ? bytes : null;
  } catch { return null; }
}

function json(bytes: Buffer | null): unknown | null {
  if (!bytes) return null;
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { return null; }
}

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Detects the fixed target-owned authority used by the current validation-profile adapter without loading or executing it. */
export function supportsManagedRepositoryValidationProfile(sourceRoot: string): boolean {
  let root: string;
  try {
    root = fs.realpathSync(sourceRoot);
    if (!fs.statSync(root).isDirectory() || fs.lstatSync(sourceRoot).isSymbolicLink()) return false;
  } catch { return false; }
  for (const name of VALIDATION_PROFILE_TOOLKIT_FILES) {
    if (!readOrdinaryBoundedFile(root, `scripts/validation/${name}`, TOOLKIT_MAX_BYTES)) return false;
  }
  const catalog = json(readOrdinaryBoundedFile(root, "validation/capability-map.json", PROFILE_METADATA_MAX_BYTES));
  const profiles = json(readOrdinaryBoundedFile(root, "validation/profiles.json", PROFILE_METADATA_MAX_BYTES));
  const manifest = json(readOrdinaryBoundedFile(root, "package.json", PACKAGE_MAX_BYTES));
  if (!record(catalog) || !record(profiles) || !record(manifest) || !record(manifest.scripts)) return false;
  const scripts = manifest.scripts;
  if (!Array.isArray(catalog.capabilities) || !record(profiles.profiles) || !record(profiles.profiles["integration-gate"])) return false;
  return VALIDATION_PROFILE_REQUIRED_SCRIPTS.every(name => {
    const definition = scripts[name];
    return typeof definition === "string" && Boolean(definition.trim()) && definition.length <= 8192;
  });
}

/** Creates fresh current-schema policy for a repository at the managed-baseline boundary. */
export function createManagedRepositoryIntegrationPolicy(sourceRoot: string): IntegrationPolicy {
  const policy: IntegrationPolicy = supportsManagedRepositoryValidationProfile(sourceRoot) ? {
    schemaVersion: 1,
    checks: [{ checkId: "champcity-integration-gate", lane: "integration", runner: { kind: "validation-profile", profile: "integration-gate", timeoutMs: PROFILE_TIMEOUT_MS } }],
    requiredIntegrationChecks: ["champcity-integration-gate"],
  } : {
    schemaVersion: 1,
    checks: [{ checkId: "champcity-source-integrity", lane: "static", runner: { kind: "source-integrity", timeoutMs: GENERIC_TIMEOUT_MS } }],
    requiredIntegrationChecks: ["champcity-source-integrity"],
  };
  return parseIntegrationPolicy(policy);
}

export function writeManagedRepositoryIntegrationPolicy(sourceRoot: string): IntegrationPolicy {
  const policy = createManagedRepositoryIntegrationPolicy(sourceRoot);
  const directory = path.join(sourceRoot, ".champcity");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "integration-policy.json"), `${JSON.stringify(policy, null, 2)}\n`, { flag: "wx" });
  return policy;
}
