export const INTEGRATION_POLICY_PATH = ".champcity/integration-policy.json";
export const INTEGRATION_POLICY_MAX_BYTES = 64 * 1024;
export const INTEGRATION_POLICY_MAX_CHECKS = 32;
export const INTEGRATION_CHECK_MAX_TIMEOUT_MS = 15 * 60 * 1000;
export const INTEGRATION_VALIDATION_LANES = [
  "static", "fast", "affected-capability", "integration", "desktop-platform",
  "packaging", "migration", "performance-soak", "full-regression",
] as const;

export interface IntegrationPolicyCheck {
  checkId: string;
  lane: typeof INTEGRATION_VALIDATION_LANES[number];
  runner: { kind: "npm-script"; script: string; timeoutMs: number };
}
export interface IntegrationPolicy {
  schemaVersion: 1;
  checks: IntegrationPolicyCheck[];
  requiredIntegrationChecks: string[];
  repair?: IntegrationRepairScope;
}
export interface IntegrationRepairScope {
  allowedEditableRoots: string[];
  protectedPaths?: string[];
  sources: Array<{ role: "architecture" | "contract"; path: string }>;
}

export function integrationPolicyPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 4096 || !value || value.split("/").some((part) =>
    !part || part === "." || part === ".." || /[\\:*?\x00-\x1f<>|]/.test(part) || /[. ]$/.test(part))) throw Error("Integration repair policy requires exact repository-relative paths.");
  return value;
}
function parseRepair(value: unknown): IntegrationRepairScope {
  const hasProtected = !!value && typeof value === "object" && Object.hasOwn(value, "protectedPaths");
  const repair = object(value, ["allowedEditableRoots", "sources", ...(hasProtected ? ["protectedPaths"] : [])]);
  const paths = (value: unknown, minimum: number) => {
    if (!Array.isArray(value) || value.length < minimum || value.length > 32) throw Error("Integration repair policy paths exceed their bound.");
    const result = value.map(integrationPolicyPath);
    if (new Set(result.map((entry) => entry.toLowerCase())).size !== result.length) throw Error("Integration repair policy paths must be distinct.");
    return result;
  };
  const allowedEditableRoots = paths(repair.allowedEditableRoots, 1);
  if (!Array.isArray(repair.sources) || repair.sources.length > 14) throw Error("Integration repair governing sources exceed their bound.");
  const sources = repair.sources.map((value) => {
    const entry = object(value, ["role", "path"]);
    if (entry.role !== "architecture" && entry.role !== "contract") throw Error("Invalid integration repair governing source role.");
    const sourcePath = integrationPolicyPath(entry.path);
    if (!sourcePath.endsWith(".md")) throw Error("Integration repair governing sources must be Markdown documents.");
    return { role: entry.role, path: sourcePath } as IntegrationRepairScope["sources"][number];
  });
  if (new Set(sources.map((entry) => entry.path.toLowerCase())).size !== sources.length) throw Error("Duplicate integration repair governing source.");
  return { allowedEditableRoots, ...(hasProtected ? { protectedPaths: paths(repair.protectedPaths, 0) } : {}), sources };
}

function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw Error("Integration policy requires its exact versioned schema.");
  }
  return value as Record<string, unknown>;
}
const identity = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value);

/** No executable text, paths, extra arguments, or unregistered adapter kinds cross this contract. */
export function parseIntegrationPolicy(value: unknown): IntegrationPolicy {
  const hasRepair = !!value && typeof value === "object" && Object.hasOwn(value, "repair");
  const policy = object(value, ["schemaVersion", "checks", "requiredIntegrationChecks", ...(hasRepair ? ["repair"] : [])]);
  if (policy.schemaVersion !== 1) throw Error("Unsupported integration policy schema version.");
  if (!Array.isArray(policy.checks) || !policy.checks.length || policy.checks.length > INTEGRATION_POLICY_MAX_CHECKS) {
    throw Error("Integration policy requires a bounded nonempty check list.");
  }
  const checks: IntegrationPolicyCheck[] = policy.checks.map((value) => {
    const check = object(value, ["checkId", "lane", "runner"]);
    if (!identity(check.checkId)) throw Error("Invalid integration check identity.");
    if (!INTEGRATION_VALIDATION_LANES.includes(check.lane as IntegrationPolicyCheck["lane"])) throw Error("Invalid integration validation lane.");
    const runner = object(check.runner, ["kind", "script", "timeoutMs"]);
    if (runner.kind !== "npm-script") throw Error("Unsupported integration runner adapter.");
    if (typeof runner.script !== "string" || !/^[A-Za-z0-9][A-Za-z0-9:._-]{0,79}$/.test(runner.script)) throw Error("Invalid npm script identity.");
    if (!Number.isInteger(runner.timeoutMs) || (runner.timeoutMs as number) < 1 || (runner.timeoutMs as number) > INTEGRATION_CHECK_MAX_TIMEOUT_MS) throw Error("Integration check duration exceeds its bound.");
    return { checkId: check.checkId, lane: check.lane as IntegrationPolicyCheck["lane"], runner: { kind: "npm-script", script: runner.script, timeoutMs: runner.timeoutMs as number } };
  });
  if (new Set(checks.map((check) => check.checkId)).size !== checks.length) throw Error("Duplicate integration check identity.");
  const required = policy.requiredIntegrationChecks;
  if (!Array.isArray(required) || !required.length || required.length > INTEGRATION_POLICY_MAX_CHECKS
    || required.some((id) => !identity(id) || !checks.some((check) => check.checkId === id)) || new Set(required).size !== required.length) {
    throw Error("Required integration checks must uniquely reference declared check IDs.");
  }
  return { schemaVersion: 1, checks, requiredIntegrationChecks: [...required], ...(hasRepair ? { repair: parseRepair(policy.repair) } : {}) };
}
