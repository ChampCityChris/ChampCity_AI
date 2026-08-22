import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  DevelopmentEnvironmentProviderAttempt,
  DevelopmentEnvironmentProviderCandidate,
  DevelopmentEnvironmentRequirement,
} from "../../shared/developmentEnvironmentContracts";
import type {
  CommandRunResult,
  DevelopmentEnvironmentCommandRunner,
} from "./windowsDevelopmentEnvironmentProvisioner";

export interface WindowsPackageProviderResolution {
  state: "resolved" | "resolution-required";
  candidate?: Required<Pick<DevelopmentEnvironmentProviderCandidate, "packageId" | "source">> &
    DevelopmentEnvironmentProviderCandidate;
  attempts: DevelopmentEnvironmentProviderAttempt[];
  commandSummaries: CommandRunResult[];
  blocker?: string;
  blockerKind?: "ambiguous-package" | "provider-resolution-required";
}

export interface WindowsPackageMcpFindResult {
  candidates: DevelopmentEnvironmentProviderCandidate[];
  summary: string;
  rawText: string;
}

export interface WindowsPackageMcpClient {
  find(
    serverPath: string,
    query: string,
    workspaceRoot: string,
    serverArgs?: string[],
  ): Promise<WindowsPackageMcpFindResult>;
}

export interface WindowsPackageProviderResolverOptions {
  mcpClient?: WindowsPackageMcpClient;
}

export class WindowsPackageProviderResolver {
  private readonly mcpClient: WindowsPackageMcpClient;

  constructor(
    private readonly runner: DevelopmentEnvironmentCommandRunner,
    options: WindowsPackageProviderResolverOptions = {},
  ) {
    this.mcpClient = options.mcpClient ?? new StdioWindowsPackageMcpClient();
  }

  async resolvePackage(
    requirement: DevelopmentEnvironmentRequirement,
    workspaceRoot: string,
  ): Promise<WindowsPackageProviderResolution> {
    const query = packageIdentityQueryForRequirement(requirement);
    const commandSummaries: CommandRunResult[] = [];
    const attempts: DevelopmentEnvironmentProviderAttempt[] = [];

    const mcp = await this.runner.run("winget", ["mcp"], { cwd: workspaceRoot });
    commandSummaries.push(mcp);
    const mcpServerPath = mcp.exitCode === 0 ? parseMcpServerPath(`${mcp.stdout}\n${mcp.stderr}`) : null;
    attempts.push({
      provider: "winget-mcp",
      stage: "discovery",
      outcome: mcp.exitCode === 0 && mcpServerPath ? "available" : "unavailable",
      summary: mcp.exitCode === 0 && mcpServerPath
        ? `WinGet MCP server discovered at ${mcpServerPath}.`
        : evidenceFromCommand(mcp, "WinGet MCP interface is unavailable; direct WinGet search will be used."),
    });

    if (mcpServerPath) {
      const mcpFind = await this.invokeMcpFind(mcpServerPath, query, workspaceRoot);
      commandSummaries.push(mcpFind.command);
      const mcpCandidates = filterCandidatesForRequirement(requirement, mcpFind.candidates);
      attempts.push({
        provider: "winget-mcp",
        stage: "resolution",
        query,
        outcome: outcomeForCandidateSet(mcpFind.command, mcpCandidates),
        summary: evidenceFromCommand(mcpFind.command, mcpFind.summary),
        candidates: mcpCandidates,
      });
      const selected = selectUnambiguousCandidate(requirement, mcpCandidates);
      if (selected) {
        return {
          state: "resolved",
          candidate: selected,
          attempts,
          commandSummaries,
        };
      }
      if (mcpCandidates.length > 1) {
        return resolutionRequired(
          attempts,
          commandSummaries,
          "WinGet MCP returned multiple materially plausible package candidates; exact package identity is required.",
          "ambiguous-package",
        );
      }
    }

    const sourceResults: Array<{ source: "winget" | "msstore"; result: CommandRunResult }> = [];
    for (const source of ["winget", "msstore"] as const) {
      const result = await this.runner.run("winget", [
        "search",
        "--query",
        query,
        "--source",
        source,
        "--accept-source-agreements",
      ], { cwd: workspaceRoot });
      commandSummaries.push(result);
      sourceResults.push({ source, result });
    }

    const candidates = sourceResults.flatMap(({ source, result }) =>
      parseProviderCandidates(result, source)
    );
    const compatibleCandidates = filterCandidatesForRequirement(requirement, candidates);
    attempts.push({
      provider: "winget-search",
      stage: "resolution",
      query,
      outcome: outcomeForSearchResults(sourceResults.map(({ result }) => result), compatibleCandidates),
      summary: `Direct WinGet search across trusted configured sources returned ${compatibleCandidates.length} compatible candidate(s).`,
      candidates: compatibleCandidates,
    });

    const selected = selectUnambiguousCandidate(requirement, compatibleCandidates);
    if (selected) {
      return {
        state: "resolved",
        candidate: selected,
        attempts,
        commandSummaries,
      };
    }
    if (compatibleCandidates.length > 1) {
      return resolutionRequired(
        attempts,
        commandSummaries,
        "WinGet search returned multiple materially plausible package candidates; exact package identity is required.",
        "ambiguous-package",
      );
    }
    return resolutionRequired(
      attempts,
      commandSummaries,
      "Windows Package Manager did not resolve an exact package candidate for the approved managed capability.",
      "provider-resolution-required",
    );
  }

  private async invokeMcpFind(
    serverPath: string,
    query: string,
    workspaceRoot: string,
  ): Promise<{ command: CommandRunResult; candidates: DevelopmentEnvironmentProviderCandidate[]; summary: string }> {
    try {
      const result = await this.mcpClient.find(serverPath, query, workspaceRoot);
      return {
        command: {
          command: serverPath,
          args: ["mcp", "official-sdk", "find", query],
          exitCode: 0,
          stdout: result.rawText,
          stderr: "",
        },
        candidates: result.candidates,
        summary: result.summary,
      };
    } catch (error) {
      return {
        command: {
          command: serverPath,
          args: ["mcp", "official-sdk", "find", query],
          exitCode: 1,
          stdout: "",
          stderr: errorMessage(error),
        },
        candidates: [],
        summary: "WinGet MCP package find failed; direct WinGet search will be used.",
      };
    }
  }
}

export function packageIdentityQueryForRequirement(requirement: DevelopmentEnvironmentRequirement): string {
  return requirement.capabilityId.trim();
}

function resolutionRequired(
  attempts: DevelopmentEnvironmentProviderAttempt[],
  commandSummaries: CommandRunResult[],
  blocker: string,
  blockerKind: "ambiguous-package" | "provider-resolution-required",
): WindowsPackageProviderResolution {
  return {
    state: "resolution-required",
    attempts,
    commandSummaries,
    blocker,
    blockerKind,
  };
}

function selectUnambiguousCandidate(
  requirement: DevelopmentEnvironmentRequirement,
  candidates: DevelopmentEnvironmentProviderCandidate[],
): WindowsPackageProviderResolution["candidate"] | null {
  const installable = filterCandidatesForRequirement(requirement, candidates)
    .filter((candidate) => candidate.packageId && candidate.source);
  if (installable.length === 0) {
    return null;
  }
  if (installable.length === 1) {
    const candidate = installable[0];
    return {
      ...candidate,
      packageId: candidate.packageId ?? "",
      source: candidate.source ?? "",
    };
  }

  const normalizedCapability = normalizeIdentity(requirement.capabilityId);
  const exact = installable.filter((candidate) =>
    normalizeIdentity(candidate.packageId ?? "") === normalizedCapability ||
    normalizeIdentity(candidate.packageName ?? "") === normalizedCapability
  );
  if (exact.length === 1) {
    const candidate = exact[0];
    return {
      ...candidate,
      packageId: candidate.packageId ?? "",
      source: candidate.source ?? "",
    };
  }
  return null;
}

function filterCandidatesForRequirement(
  requirement: DevelopmentEnvironmentRequirement,
  candidates: DevelopmentEnvironmentProviderCandidate[],
): DevelopmentEnvironmentProviderCandidate[] {
  return candidates.filter((candidate) =>
    versionSatisfiesConstraint(candidate.version, requirement.versionConstraint)
  );
}

function parseMcpServerPath(text: string): string | null {
  const fromJson = parseMcpServerPathFromJson(text);
  if (fromJson) {
    return fromJson;
  }
  const match = /([A-Za-z]:\\[^\r\n"]*WindowsPackageManagerMCPServer\.exe)/i.exec(text);
  return match?.[1] ?? null;
}

function parseMcpServerPathFromJson(text: string): string | null {
  try {
    return findMcpServerPath(JSON.parse(text) as unknown);
  } catch {
    const command = /"command"\s*:\s*("(?:\\.|[^"\\])*WindowsPackageManagerMCPServer\.exe")/i.exec(text)?.[1];
    if (!command) {
      return null;
    }
    try {
      return JSON.parse(command) as string;
    } catch {
      return null;
    }
  }
}

function findMcpServerPath(value: unknown): string | null {
  if (typeof value === "string") {
    return /WindowsPackageManagerMCPServer\.exe$/i.test(value) ? value : null;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findMcpServerPath(entry);
      if (found) return found;
    }
    return null;
  }
  for (const entry of Object.values(value)) {
    const found = findMcpServerPath(entry);
    if (found) return found;
  }
  return null;
}

function parseProviderCandidates(
  result: CommandRunResult,
  fallbackSource: string,
): DevelopmentEnvironmentProviderCandidate[] {
  if (result.exitCode !== 0) {
    return [];
  }
  const text = `${result.stdout}\n${result.stderr}`.trim();
  const jsonCandidates = parseJsonCandidates(text, fallbackSource);
  if (jsonCandidates.length > 0) {
    return jsonCandidates;
  }
  return parseWingetTableCandidates(text, fallbackSource);
}

function parseJsonCandidates(
  text: string,
  fallbackSource: string,
): DevelopmentEnvironmentProviderCandidate[] {
  try {
    const parsed = JSON.parse(text) as unknown;
    const entries = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { packages?: unknown[] })?.packages)
        ? (parsed as { packages: unknown[] }).packages
        : [];
    return entries
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
      .map((entry) => ({
        packageId: stringValue(entry.id ?? entry.packageId),
        packageName: stringValue(entry.name ?? entry.packageName),
        source: stringValue(entry.source) ?? fallbackSource,
        publisher: stringValue(entry.publisher),
        version: stringValue(entry.version),
      }))
      .filter((candidate) => candidate.packageId || candidate.packageName);
  } catch {
    return [];
  }
}

function candidatesFromUnknownValue(
  value: unknown,
  fallbackSource: string,
): DevelopmentEnvironmentProviderCandidate[] {
  const collected: DevelopmentEnvironmentProviderCandidate[] = [];
  collectCandidates(value, fallbackSource, collected);
  return collected;
}

function collectCandidates(
  value: unknown,
  fallbackSource: string,
  collected: DevelopmentEnvironmentProviderCandidate[],
): void {
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectCandidates(entry, fallbackSource, collected);
    }
    return;
  }
  const record = value as Record<string, unknown>;
  const candidate = {
    packageId: stringValue(record.id ?? record.packageId),
    packageName: stringValue(record.name ?? record.packageName),
    source: stringValue(record.source) ?? fallbackSource,
    publisher: stringValue(record.publisher),
    version: stringValue(record.version),
  };
  if (candidate.packageId || candidate.packageName) {
    collected.push(candidate);
    return;
  }
  for (const entry of Object.values(record)) {
    collectCandidates(entry, fallbackSource, collected);
  }
}

function parseWingetTableCandidates(
  text: string,
  fallbackSource: string,
): DevelopmentEnvironmentProviderCandidate[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const candidates: DevelopmentEnvironmentProviderCandidate[] = [];
  for (const line of lines) {
    if (/^name\s+id\s+version/i.test(line) || /^-+$/.test(line) || /no package found/i.test(line)) {
      continue;
    }
    const columns = line.split(/\s{2,}/).map((column) => column.trim()).filter(Boolean);
    if (columns.length < 2) {
      continue;
    }
    const [packageName, packageId, version, source] = columns;
    if (!/^[\w.-]+$/.test(packageId)) {
      continue;
    }
    candidates.push({
      packageName,
      packageId,
      version,
      source: source ?? fallbackSource,
    });
  }
  return candidates;
}

function outcomeForCandidateSet(
  result: CommandRunResult,
  candidates: DevelopmentEnvironmentProviderCandidate[],
): DevelopmentEnvironmentProviderAttempt["outcome"] {
  if (result.exitCode !== 0) {
    return "failed";
  }
  if (candidates.length === 0) {
    return "no-results";
  }
  return candidates.length === 1 ? "resolved" : "ambiguous";
}

function outcomeForSearchResults(
  results: CommandRunResult[],
  candidates: DevelopmentEnvironmentProviderCandidate[],
): DevelopmentEnvironmentProviderAttempt["outcome"] {
  if (candidates.length === 1) {
    return "resolved";
  }
  if (candidates.length > 1) {
    return "ambiguous";
  }
  return results.some((result) => result.exitCode === 0) ? "no-results" : "failed";
}

function evidenceFromCommand(result: CommandRunResult, fallback: string): string {
  return result.stderr || result.stdout || fallback;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeIdentity(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function versionSatisfiesConstraint(
  detectedVersion: string | undefined,
  versionConstraint: string | undefined,
): boolean {
  if (!versionConstraint) {
    return true;
  }
  if (!detectedVersion) {
    return false;
  }
  const trimmed = versionConstraint.trim();
  if (/^\d+(?:\.\d+){0,3}$/.test(trimmed)) {
    return compareVersions(detectedVersion, trimmed) === 0;
  }
  const minimum = /^>=\s*(\d+(?:\.\d+){0,3})$/.exec(trimmed)?.[1];
  if (minimum) {
    return compareVersions(detectedVersion, minimum) >= 0;
  }
  return false;
}

function compareVersions(left: string, right: string): number {
  const leftParts = numericVersionParts(left);
  const rightParts = numericVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }
  return 0;
}

function numericVersionParts(version: string): number[] {
  return version
    .replace(/^[^\d]*/, "")
    .split(/[^\d]+/)
    .filter(Boolean)
    .map((part) => Number(part));
}

const mcpRequestTimeoutMs = 10_000;

export class StdioWindowsPackageMcpClient implements WindowsPackageMcpClient {
  async find(
    serverPath: string,
    query: string,
    workspaceRoot: string,
    serverArgs: string[] = [],
  ): Promise<WindowsPackageMcpFindResult> {
    const transport = new StdioClientTransport({
      command: serverPath,
      args: serverArgs,
      cwd: workspaceRoot,
      stderr: "pipe",
    });
    let stderr = "";
    transport.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
    });
    const client = new Client(
      { name: "champcity-ai", version: "0.1.0" },
      { capabilities: {} },
    );
    try {
      await client.connect(transport, { timeout: mcpRequestTimeoutMs });
      const toolsResult = await client.listTools(undefined, { timeout: mcpRequestTimeoutMs });
      const toolName = findPackageFindToolName(toolsResult);
      if (!toolName) {
        throw new Error("WinGet MCP server did not advertise a package find tool.");
      }
      const findResult = await client.callTool({
        name: toolName,
        arguments: { query },
      }, undefined, { timeout: mcpRequestTimeoutMs });
      const rawText = JSON.stringify(findResult);
      return {
        candidates: normalizeMcpFindCandidates(findResult),
        rawText,
        summary: `WinGet MCP ${toolName} returned package discovery data.`,
      };
    } catch (error) {
      const stderrText = stderr.trim();
      throw new Error(stderrText ? `${errorMessage(error)} ${stderrText}` : errorMessage(error));
    } finally {
      await client.close().catch(() => undefined);
    }
  }
}

function findPackageFindToolName(result: unknown): string | null {
  const tools = Array.isArray((result as { tools?: unknown[] })?.tools)
    ? (result as { tools: unknown[] }).tools
    : [];
  const names = tools
    .filter((tool): tool is Record<string, unknown> => Boolean(tool) && typeof tool === "object")
    .map((tool) => stringValue(tool.name))
    .filter((name): name is string => Boolean(name));
  return names.find((name) => name === "find") ??
    names.find((name) => /find/i.test(name) && /package|winget/i.test(name)) ??
    null;
}

function normalizeMcpFindCandidates(result: unknown): DevelopmentEnvironmentProviderCandidate[] {
  const direct = candidatesFromUnknownValue(result, "winget");
  const textCandidates = mcpTextContent(result).flatMap((text) => {
    const json = parseJsonCandidates(text, "winget");
    return json.length > 0 ? json : parseWingetTableCandidates(text, "winget");
  });
  return [...direct, ...textCandidates]
    .filter((candidate, index, candidates) =>
      candidates.findIndex((other) =>
        normalizeIdentity(other.packageId ?? other.packageName ?? "") ===
          normalizeIdentity(candidate.packageId ?? candidate.packageName ?? "")
      ) === index
    );
}

function mcpTextContent(result: unknown): string[] {
  const content = Array.isArray((result as { content?: unknown[] })?.content)
    ? (result as { content: unknown[] }).content
    : [];
  return content
    .map((entry) => typeof entry === "object" && entry !== null
      ? stringValue((entry as Record<string, unknown>).text)
      : undefined)
    .filter((text): text is string => Boolean(text));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
