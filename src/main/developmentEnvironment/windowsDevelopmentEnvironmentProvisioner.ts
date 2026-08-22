import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  DevelopmentEnvironmentCommandSummary,
  DevelopmentEnvironmentHumanInteractionKind,
  DevelopmentEnvironmentPreflightResult,
  DevelopmentEnvironmentProviderAttempt,
  DevelopmentEnvironmentRequirement,
  DevelopmentEnvironmentRequirementBlockerKind,
  DevelopmentEnvironmentRequirementResult,
  DevelopmentEnvironmentRequirementState,
} from "../../shared/developmentEnvironmentContracts";
import {
  type DevelopmentEnvironmentCapabilityRegistryEntry,
  resolveCapabilityRegistryEntry,
  registrySupportsVersionConstraint,
} from "./developmentEnvironmentCapabilityRegistry";
import {
  repositoryEcosystemProviderAttempt,
} from "./repositoryEcosystemProvider";
import {
  refreshWindowsProcessEnvironment,
  type WindowsEnvironmentRefreshResult,
} from "./windowsEnvironmentRefresh";
import {
  WindowsPackageProviderResolver,
  type WindowsPackageProviderResolverOptions,
} from "./windowsPackageProviderResolver";

const minimumWingetVersionForConfigurationV3 = "1.11";

export interface CommandRunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface CommandRunResult {
  command: string;
  args: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export interface DevelopmentEnvironmentCommandRunner {
  run(command: string, args: string[], options?: CommandRunOptions): Promise<CommandRunResult>;
  runElevated?(command: string, args: string[], options?: CommandRunOptions): Promise<CommandRunResult>;
}

type ProcessRunner = (
  command: string,
  args: string[],
  options: CommandRunOptions,
) => Promise<CommandRunResult>;

export interface NodeCommandRunnerOptions {
  processRunner?: ProcessRunner;
  tempRoot?: string;
  executionIdFactory?: () => string;
}

export interface WindowsProvisionerOptions {
  runner?: DevelopmentEnvironmentCommandRunner;
  refreshEnvironment?: () => Promise<WindowsEnvironmentRefreshResult>;
  tempRoot?: string;
  platform?: NodeJS.Platform;
  arch?: string;
  packageResolverOptions?: WindowsPackageProviderResolverOptions;
}

interface ProbeResult {
  state: DevelopmentEnvironmentRequirementState;
  detectedVersion?: string;
  detectedProfile?: string;
  command: CommandRunResult;
}

export class WindowsDevelopmentEnvironmentProvisioner {
  private readonly runner: DevelopmentEnvironmentCommandRunner;
  private readonly refreshEnvironment: () => Promise<WindowsEnvironmentRefreshResult>;
  private readonly tempRoot: string;
  private readonly platform: NodeJS.Platform;
  private readonly arch: string;
  private readonly packageResolverOptions: WindowsPackageProviderResolverOptions;

  constructor(options: WindowsProvisionerOptions = {}) {
    this.runner = options.runner ?? new NodeCommandRunner();
    this.refreshEnvironment = options.refreshEnvironment ?? refreshWindowsProcessEnvironment;
    this.tempRoot = options.tempRoot ?? path.join(os.tmpdir(), "champcity-development-environment");
    this.platform = options.platform ?? process.platform;
    this.arch = options.arch ?? process.arch;
    this.packageResolverOptions = options.packageResolverOptions ?? {};
  }

  async preflight(
    requirements: DevelopmentEnvironmentRequirement[],
    workspaceRoot: string,
  ): Promise<DevelopmentEnvironmentPreflightResult> {
    if (requirements.length === 0) {
      return resultFromRequirements("not-required", "No development environment requirements were declared.", []);
    }
    if (this.platform !== "win32") {
      return resultFromRequirements(
        "blocked",
        "Windows development environment provisioning is only supported on Windows hosts.",
        requirements.map((requirement) =>
          isWindowsX64HostRequirement(requirement)
            ? windowsX64HostRequirement(requirement, this.platform, this.arch)
            : blockedRequirement(requirement, "Windows provisioner is unavailable on this host.", "unsupported", false)
        ),
      );
    }

    const requirementResults: DevelopmentEnvironmentRequirementResult[] = [];
    for (const requirement of requirements) {
      const entry = resolveCapabilityRegistryEntry(requirement);
      if (isWindowsX64HostRequirement(requirement)) {
        requirementResults.push(windowsX64HostRequirement(requirement, this.platform, this.arch));
        continue;
      }
      if (requirement.provisioning === "external" && !entry) {
        requirementResults.push(externalBlockedRequirement(requirement));
        continue;
      }
      if (!entry) {
        requirementResults.push(await this.resolveProviderBackedRequirement(requirement, workspaceRoot));
        continue;
      }
      if (!registrySupportsVersionConstraint(entry, requirement.versionConstraint)) {
        requirementResults.push(await this.resolveProviderBackedRequirement(requirement, workspaceRoot, entry));
        continue;
      }
      requirementResults.push(await this.resolveRequirement(requirement, entry, workspaceRoot));
    }

    return resultFromRequirements(finalState(requirementResults), summaryForRequirements(requirementResults), requirementResults);
  }

  private async resolveRequirement(
    requirement: DevelopmentEnvironmentRequirement,
    entry: DevelopmentEnvironmentCapabilityRegistryEntry,
    workspaceRoot: string,
  ): Promise<DevelopmentEnvironmentRequirementResult> {
    const before = await this.probe(entry, requirement, workspaceRoot);
    const commandSummaries = [summaryFromCommand(before.command)];
    const providerAttempts: DevelopmentEnvironmentProviderAttempt[] = [{
      provider: "specialized-adapter",
      stage: "discovery",
      outcome: before.state === "satisfied" ? "resolved" : "not-applicable",
      summary: `Specialized ${entry.kind} adapter probed ${requirement.capabilityId}.`,
    }];
    if (requirement.provisioning === "external") {
      if (before.state === "satisfied") {
        return requirementResult(requirement, before, "none", before, commandSummaries, {
          providerAttempts,
        });
      }
      return requirementResult(
        requirement,
        before,
        "external-block",
        before,
        commandSummaries,
        {
          blocker: `Capability ${requirement.capabilityId} is externally owned and must be provided outside ChampCity.`,
          blockerKind: "external",
          retryAllowed: false,
          providerAttempts,
        },
      );
    }
    if (before.state === "satisfied") {
      return requirementResult(requirement, before, "none", before, commandSummaries, {
        providerAttempts,
      });
    }

    const winget = await this.ensureWinget(workspaceRoot);
    commandSummaries.push(...winget.commandSummaries);
    if (!winget.ready) {
      return requirementResult(
        requirement,
        before,
        winget.actionTaken,
        before,
        commandSummaries,
        {
          blocker: winget.blocker,
          blockerKind: winget.blockerKind,
          retryAllowed: winget.retryAllowed,
          humanInteractionKind: winget.humanInteractionKind,
          humanInteractionReason: winget.humanInteractionReason,
          providerAttempts,
        },
      );
    }

    const packageResolution = entry.kind === "simple"
      ? await new WindowsPackageProviderResolver(this.runner, this.packageResolverOptions)
        .resolvePackage(requirement, workspaceRoot)
      : null;
    if (packageResolution) {
      commandSummaries.push(...packageResolution.commandSummaries.map(summaryFromCommand));
      providerAttempts.push(...packageResolution.attempts);
      if (packageResolution.state === "resolution-required" || !packageResolution.candidate) {
        return requirementResult(
          requirement,
          before,
          "provider-resolution",
          before,
          commandSummaries,
          {
            blocker: packageResolution.blocker ??
              `Capability ${requirement.capabilityId} requires provider-backed environment resolution.`,
            blockerKind: packageResolution.blockerKind ?? "provider-resolution-required",
            retryAllowed: true,
            providerAttempts,
          },
        );
      }
    }

    const resolvedCandidate = packageResolution?.candidate;
    const provisioned = entry.kind === "simple" && resolvedCandidate
      ? await this.installSimpleCapability(resolvedCandidate.packageId, resolvedCandidate.source, requirement, workspaceRoot)
      : await this.configureCompositeCapability(requirement, workspaceRoot);
    commandSummaries.push(...provisioned.commandSummaries);
    providerAttempts.push(...provisioned.providerAttempts ?? []);
    if (provisioned.humanInteractionReason) {
      return requirementResult(
        requirement,
        before,
        provisioned.actionTaken,
        before,
        commandSummaries,
        {
          retryAllowed: provisioned.retryAllowed,
          humanInteractionKind: provisioned.humanInteractionKind,
          humanInteractionReason: provisioned.humanInteractionReason,
          providerAttempts,
        },
      );
    }
    if (provisioned.blocker) {
      return requirementResult(
        requirement,
        before,
        provisioned.actionTaken,
        before,
        commandSummaries,
        {
          blocker: provisioned.blocker,
          blockerKind: provisioned.blockerKind,
          retryAllowed: provisioned.retryAllowed,
          providerAttempts,
        },
      );
    }

    const refresh = await this.refreshEnvironment();
    commandSummaries.push({
      command: "refresh Windows process environment",
      exitCode: refresh.refreshed ? 0 : null,
      stdout: refresh.summary,
      stderr: "",
    });
    const after = await this.probe(entry, requirement, workspaceRoot);
    commandSummaries.push(summaryFromCommand(after.command));
    const blocker = after.state === "satisfied"
      ? undefined
      : `Capability ${requirement.capabilityId} remained ${after.state} after provisioning.`;
    return requirementResult(
      requirement,
      before,
      provisioned.actionTaken,
      after,
      commandSummaries,
      {
        blocker,
        blockerKind: blocker ? "verification-failure" : undefined,
        retryAllowed: Boolean(blocker),
        providerAttempts,
      },
    );
  }

  private async resolveProviderBackedRequirement(
    requirement: DevelopmentEnvironmentRequirement,
    workspaceRoot: string,
    existingEntry?: DevelopmentEnvironmentCapabilityRegistryEntry,
  ): Promise<DevelopmentEnvironmentRequirementResult> {
    if (requirement.provisioning === "external") {
      return externalBlockedRequirement(requirement);
    }

    const genericEntry = existingEntry ?? genericProbeEntry(requirement);
    const before = existingEntry
      ? await this.probe(genericEntry, requirement, workspaceRoot)
      : unresolvedProviderIdentityProbe(requirement);
    const commandSummaries = [summaryFromCommand(before.command)];
    const providerAttempts: DevelopmentEnvironmentProviderAttempt[] = [{
      provider: "specialized-adapter",
      stage: "discovery",
      outcome: existingEntry ? "available" : "not-applicable",
      summary: existingEntry
        ? `Specialized adapter exists for ${requirement.capabilityId}, but provider-backed resolution is required for the requested version/profile.`
        : `No specialized adapter exists for ${requirement.capabilityId}; provider-backed resolution will be used.`,
    }];

    if (before.state === "satisfied") {
      return requirementResult(requirement, before, "none", before, commandSummaries, {
        providerAttempts,
      });
    }

    providerAttempts.push(repositoryEcosystemProviderAttempt(workspaceRoot));
    const winget = await this.ensureWinget(workspaceRoot);
    commandSummaries.push(...winget.commandSummaries);
    if (!winget.ready) {
      return requirementResult(
        requirement,
        before,
        winget.actionTaken,
        before,
        commandSummaries,
        {
          blocker: winget.blocker,
          blockerKind: winget.blockerKind,
          retryAllowed: winget.retryAllowed,
          humanInteractionKind: winget.humanInteractionKind,
          humanInteractionReason: winget.humanInteractionReason,
          providerAttempts,
        },
      );
    }

    const resolution = await new WindowsPackageProviderResolver(this.runner, this.packageResolverOptions)
      .resolvePackage(requirement, workspaceRoot);
    commandSummaries.push(...resolution.commandSummaries.map(summaryFromCommand));
    providerAttempts.push(...resolution.attempts);
    if (resolution.state === "resolution-required" || !resolution.candidate) {
      return requirementResult(
        requirement,
        before,
        "provider-resolution",
        before,
        commandSummaries,
        {
          blocker: resolution.blocker ??
            `Capability ${requirement.capabilityId} requires provider-backed environment resolution.`,
          blockerKind: resolution.blockerKind ?? "provider-resolution-required",
          retryAllowed: true,
          providerAttempts,
        },
      );
    }

    const provisioned = await this.installSimpleCapability(
      resolution.candidate.packageId,
      resolution.candidate.source,
      requirement,
      workspaceRoot,
    );
    commandSummaries.push(...provisioned.commandSummaries);
    if (provisioned.providerAttempts) {
      providerAttempts.push(...provisioned.providerAttempts);
    }
    if (provisioned.humanInteractionReason || provisioned.blocker) {
      return requirementResult(
        requirement,
        before,
        provisioned.actionTaken,
        before,
        commandSummaries,
        {
          blocker: provisioned.blocker,
          blockerKind: provisioned.blockerKind,
          retryAllowed: provisioned.retryAllowed,
          humanInteractionKind: provisioned.humanInteractionKind,
          humanInteractionReason: provisioned.humanInteractionReason,
          providerAttempts,
        },
      );
    }

    const refresh = await this.refreshEnvironment();
    commandSummaries.push({
      command: "refresh Windows process environment",
      exitCode: refresh.refreshed ? 0 : null,
      stdout: refresh.summary,
      stderr: "",
    });
    const after = existingEntry
      ? await this.probe(genericEntry, requirement, workspaceRoot)
      : await this.verifyProviderPackageInventory(
        resolution.candidate.packageId,
        resolution.candidate.source,
        requirement,
        workspaceRoot,
      );
    commandSummaries.push(summaryFromCommand(after.command));
    if (!existingEntry) {
      providerAttempts.push({
        provider: "winget-search",
        stage: "verification",
        outcome: after.state === "satisfied" ? "resolved" : "failed",
        summary: `Verified resolved package ${resolution.candidate.packageId} from ${resolution.candidate.source} using Windows Package Manager inventory.`,
        candidates: [{
          packageId: resolution.candidate.packageId,
          packageName: resolution.candidate.packageName,
          source: resolution.candidate.source,
          publisher: resolution.candidate.publisher,
          version: after.detectedVersion ?? resolution.candidate.version,
        }],
      });
    }
    const blocker = after.state === "satisfied"
      ? undefined
      : `Capability ${requirement.capabilityId} remained ${after.state} after provider-backed provisioning.`;
    return requirementResult(
      requirement,
      before,
      provisioned.actionTaken,
      after,
      commandSummaries,
      {
        blocker,
        blockerKind: blocker ? "verification-failure" : undefined,
        retryAllowed: Boolean(blocker),
        providerAttempts,
      },
    );
  }

  private async probe(
    entry: DevelopmentEnvironmentCapabilityRegistryEntry,
    requirement: DevelopmentEnvironmentRequirement,
    workspaceRoot: string,
  ): Promise<ProbeResult> {
    if (entry.kind === "simple") {
      const command = await this.runner.run(entry.probe.command, entry.probe.args, { cwd: workspaceRoot });
      if (command.exitCode !== 0) {
        return { state: command.exitCode === null ? "missing" : "unknown", command };
      }
      const output = `${command.stdout}\n${command.stderr}`;
      const detectedVersion = entry.probe.versionPattern?.exec(output)?.[1];
      const state = versionSatisfiesConstraint(detectedVersion, requirement.versionConstraint)
        ? "satisfied"
        : "incompatible";
      return { state, detectedVersion, command };
    }

    const command = await this.runner.run("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      msvcDesktopCppProbeScript(),
    ], { cwd: workspaceRoot });
    if (command.exitCode !== 0) {
      return { state: "missing", command };
    }
    const detectedVersion = /Visual Studio\s+([0-9][^\s]*)/i.exec(`${command.stdout}\n${command.stderr}`)?.[1];
    return { state: "satisfied", detectedVersion, detectedProfile: "desktop-cpp", command };
  }

  private async verifyProviderPackageInventory(
    packageId: string,
    source: string,
    requirement: DevelopmentEnvironmentRequirement,
    workspaceRoot: string,
  ): Promise<ProbeResult> {
    const command = await this.runner.run("winget", [
      "list",
      "--id",
      packageId,
      "-e",
      "--source",
      source,
      "--accept-source-agreements",
    ], { cwd: workspaceRoot });
    if (command.exitCode !== 0) {
      return { state: command.exitCode === null ? "missing" : "unknown", command };
    }
    const detectedVersion = providerInventoryVersion(`${command.stdout}\n${command.stderr}`, packageId);
    const state = versionSatisfiesConstraint(detectedVersion, requirement.versionConstraint)
      ? "satisfied"
      : "incompatible";
    return { state, detectedVersion, command };
  }

  private async ensureWinget(workspaceRoot: string): Promise<{
    ready: boolean;
    actionTaken: "none" | "repair-winget";
    commandSummaries: DevelopmentEnvironmentCommandSummary[];
    blocker?: string;
    blockerKind?: DevelopmentEnvironmentRequirementBlockerKind;
    retryAllowed?: boolean;
    humanInteractionKind?: DevelopmentEnvironmentHumanInteractionKind;
    humanInteractionReason?: string;
  }> {
    const before = await this.runner.run("winget", ["--version"], { cwd: workspaceRoot });
    const summaries = [summaryFromCommand(before)];
    if (wingetVersionIsReady(before)) {
      const configure = await this.runner.run("winget", ["configure", "--help"], { cwd: workspaceRoot });
      summaries.push(summaryFromCommand(configure));
      if (configure.exitCode === 0) {
        return { ready: true, actionTaken: "none", commandSummaries: summaries };
      }
    }

    const repair = await this.runner.run("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      [
        "Install-PackageProvider -Name NuGet -Force | Out-Null",
        "Install-Module -Name Microsoft.WinGet.Client -Force -Repository PSGallery | Out-Null",
        "Repair-WinGetPackageManager -Force -Latest",
      ].join("; "),
    ], { cwd: workspaceRoot });
    summaries.push(summaryFromCommand(repair));
    const repairAttempt = await this.classifyCommandAttempt("repair-winget", repair, summaries, workspaceRoot);
    if (repairAttempt.humanInteractionReason || repairAttempt.blocker) {
      return {
        ready: false,
        actionTaken: "repair-winget",
        commandSummaries: summaries,
        blocker: repairAttempt.blocker,
        blockerKind: repairAttempt.blockerKind,
        retryAllowed: repairAttempt.retryAllowed,
        humanInteractionKind: repairAttempt.humanInteractionKind,
        humanInteractionReason: repairAttempt.humanInteractionReason,
      };
    }
    const refresh = await this.refreshEnvironment();
    summaries.push({
      command: "refresh Windows process environment",
      exitCode: refresh.refreshed ? 0 : null,
      stdout: refresh.summary,
      stderr: "",
    });
    const after = await this.runner.run("winget", ["--version"], { cwd: workspaceRoot });
    const configureAfter = await this.runner.run("winget", ["configure", "--help"], { cwd: workspaceRoot });
    summaries.push(summaryFromCommand(after), summaryFromCommand(configureAfter));
    return wingetVersionIsReady(after) && configureAfter.exitCode === 0
      ? { ready: true, actionTaken: "repair-winget", commandSummaries: summaries }
      : {
          ready: false,
          actionTaken: "repair-winget",
          commandSummaries: summaries,
          blocker: `WinGet repair/bootstrap did not produce a functional v3-capable winget configure backend (requires >=${minimumWingetVersionForConfigurationV3}).`,
          blockerKind: "verification-failure",
          retryAllowed: true,
        };
  }

  private async installSimpleCapability(
    packageId: string,
    source: string,
    requirement: DevelopmentEnvironmentRequirement,
    workspaceRoot: string,
  ): Promise<ProvisioningAttempt> {
    const args = [
      "install",
      "--id",
      packageId,
      "-e",
      "--source",
      source,
      "--accept-source-agreements",
      "--accept-package-agreements",
      "--disable-interactivity",
      "--silent",
    ];
    const exactVersion = exactVersionFromConstraint(requirement.versionConstraint);
    if (exactVersion) {
      args.push("--version", exactVersion);
    }
    const command = await this.runner.run("winget", args, { cwd: workspaceRoot });
    const summaries = [summaryFromCommand(command)];
    const attempt = await this.classifyCommandAttempt("install", command, summaries, workspaceRoot);
    const provisioningResolved = !attempt.blocker && !attempt.humanInteractionReason;
    return {
      ...attempt,
      providerAttempts: [{
        provider: "winget-search",
        stage: "provisioning",
        outcome: provisioningResolved ? "resolved" : "failed",
        summary: provisioningResolved
          ? `Resolved WinGet package ${packageId} from ${source}; package is installed or already current.`
          : `WinGet provisioning did not establish package ${packageId} from ${source}.`,
        candidates: [{ packageId, source }],
      }],
    };
  }

  private async configureCompositeCapability(
    requirement: DevelopmentEnvironmentRequirement,
    workspaceRoot: string,
  ): Promise<ProvisioningAttempt> {
    const configPath = this.writeMsvcDesktopCppConfiguration();
    const command = await this.runner.run("winget", [
      "configure",
      "--file",
      configPath,
      "--accept-configuration-agreements",
      "--disable-interactivity",
    ], { cwd: workspaceRoot });
    const summaries = [summaryFromCommand(command)];
    const attempt = await this.classifyCommandAttempt("configure", command, summaries, workspaceRoot);
    return {
      ...attempt,
      providerAttempts: [{
        provider: "winget-configuration",
        stage: "provisioning",
        outcome: command.exitCode === 0 ? "resolved" : "failed",
        summary: `Applied WinGet Configuration/DSC for ${requirement.capabilityId}.`,
        candidates: [{
          packageId: "Microsoft.VisualStudio.2022.BuildTools",
          packageName: "Visual Studio 2022 Build Tools Desktop C++ workload",
          source: "winget-configuration",
          publisher: "Microsoft",
        }],
      }],
    };
  }

  private async classifyCommandAttempt(
    actionTaken: ProvisioningAction,
    command: CommandRunResult,
    commandSummaries: DevelopmentEnvironmentCommandSummary[],
    workspaceRoot: string,
  ): Promise<ProvisioningAttempt> {
    const initial = classifyCommandResult(command);
    if (initial.kind !== "elevation-required" || !this.runner.runElevated) {
      return attemptFromClassification(actionTaken, commandSummaries, initial, command);
    }

    if (initial.kind === "elevation-required") {
      const elevated = await this.runner.runElevated(command.command, command.args, { cwd: workspaceRoot });
      commandSummaries.push(summaryFromCommand(elevated));
      return attemptFromClassification(
        actionTaken,
        commandSummaries,
        classifyCommandResult(elevated),
        elevated,
      );
    }

    return attemptFromClassification(actionTaken, commandSummaries, initial, command);
  }

  private writeMsvcDesktopCppConfiguration(): string {
    fs.mkdirSync(this.tempRoot, { recursive: true });
    const configPath = path.join(this.tempRoot, "msvc-x64-desktop-cpp.winget");
    fs.writeFileSync(configPath, msvcDesktopCppConfiguration(), "utf8");
    return configPath;
  }
}

interface ProvisioningAttempt {
  actionTaken: ProvisioningAction;
  commandSummaries: DevelopmentEnvironmentCommandSummary[];
  providerAttempts?: DevelopmentEnvironmentProviderAttempt[];
  blocker?: string;
  blockerKind?: DevelopmentEnvironmentRequirementBlockerKind;
  retryAllowed?: boolean;
  humanInteractionKind?: DevelopmentEnvironmentHumanInteractionKind;
  humanInteractionReason?: string;
}

type ProvisioningAction = "install" | "configure" | "repair-winget";

type CommandClassification =
  | { kind: "success" }
  | { kind: "already-installed"; reason: string }
  | { kind: "restart-required"; reason: string }
  | { kind: "operator-permission"; reason: string }
  | { kind: "elevation-required"; reason: string }
  | { kind: "policy-block"; reason: string }
  | { kind: "ambiguous-package"; reason: string }
  | { kind: "failure"; reason: string };

export class NodeCommandRunner implements DevelopmentEnvironmentCommandRunner {
  private readonly processRunner: ProcessRunner;
  private readonly tempRoot: string;
  private readonly executionIdFactory: () => string;

  constructor(options: NodeCommandRunnerOptions = {}) {
    this.processRunner = options.processRunner ?? runProcess;
    this.tempRoot = options.tempRoot ?? path.join(os.tmpdir(), "champcity-development-environment");
    this.executionIdFactory = options.executionIdFactory ?? (() => crypto.randomUUID());
  }

  async run(command: string, args: string[], options: CommandRunOptions = {}): Promise<CommandRunResult> {
    return this.processRunner(command, args, options);
  }

  async runElevated(command: string, args: string[], options: CommandRunOptions = {}): Promise<CommandRunResult> {
    const executionId = safeExecutionId(this.executionIdFactory());
    const executionRoot = path.join(this.tempRoot, "elevated", executionId);
    const requestPath = path.join(executionRoot, "request.json");
    const resultPath = path.join(executionRoot, "result.json");
    fs.mkdirSync(executionRoot, { recursive: true });
    fs.writeFileSync(
      requestPath,
      JSON.stringify({
        command,
        args,
        arguments: windowsCommandLineFromArguments(args),
        cwd: options.cwd,
        resultPath,
      }),
      "utf8",
    );
    const wrapperScript = elevatedWrapperScript(requestPath);
    const encodedWrapper = encodePowerShellCommand(wrapperScript);
    const outerScript = [
      `$encodedCommand = ${quotePowerShell(encodedWrapper)}`,
      "$process = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encodedCommand) -Verb RunAs -Wait -PassThru",
      "if ($null -ne $process.ExitCode) { exit $process.ExitCode }",
    ].join("; ");
    try {
      const outer = await this.processRunner("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        outerScript,
      ], options);
      const envelope = readElevatedResultEnvelope(resultPath);
      if (envelope) {
        return {
          command,
          args,
          exitCode: envelope.exitCode,
          stdout: sanitizeOutput(envelope.stdout),
          stderr: sanitizeOutput(envelope.stderr),
        };
      }
      if (outer.exitCode === 0) {
        return {
          command,
          args,
          exitCode: 1,
          stdout: sanitizeOutput(outer.stdout),
          stderr: "Elevated command completed without a valid ChampCity result envelope.",
        };
      }
      return outer;
    } finally {
      fs.rmSync(executionRoot, { recursive: true, force: true });
    }
  }
}

interface ElevatedResultEnvelope {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export function elevatedWrapperScript(requestPath: string): string {
  return [
    "$ErrorActionPreference = 'Stop'",
    `$requestPath = ${quotePowerShell(requestPath)}`,
    "$request = Get-Content -Raw -LiteralPath $requestPath | ConvertFrom-Json",
    "$resultPath = [string]$request.resultPath",
    "try {",
    "  $processInfo = New-Object System.Diagnostics.ProcessStartInfo",
    "  $processInfo.FileName = [string]$request.command",
    "  $processInfo.Arguments = [string]$request.arguments",
    "  if ($request.cwd) { $processInfo.WorkingDirectory = [string]$request.cwd }",
    "  $processInfo.UseShellExecute = $false",
    "  $processInfo.CreateNoWindow = $true",
    "  $processInfo.RedirectStandardOutput = $true",
    "  $processInfo.RedirectStandardError = $true",
    "  $process = [System.Diagnostics.Process]::Start($processInfo)",
    "  $stdoutReader = $process.StandardOutput",
    "  $stderrReader = $process.StandardError",
    "  $stdoutTask = $stdoutReader.ReadToEndAsync()",
    "  $stderrTask = $stderrReader.ReadToEndAsync()",
    "  $process.WaitForExit()",
    "  $stdoutTask.Wait()",
    "  $stderrTask.Wait()",
    "  $stdout = $stdoutTask.Result",
    "  $stderr = $stderrTask.Result",
    "  $result = [ordered]@{ exitCode = $process.ExitCode; stdout = $stdout; stderr = $stderr }",
    "  [System.IO.File]::WriteAllText($resultPath, ($result | ConvertTo-Json -Depth 4), [System.Text.UTF8Encoding]::new($false))",
    "  exit $process.ExitCode",
    "} catch {",
    "  $result = [ordered]@{ exitCode = 1; stdout = ''; stderr = $_.Exception.Message }",
    "  [System.IO.File]::WriteAllText($resultPath, ($result | ConvertTo-Json -Depth 4), [System.Text.UTF8Encoding]::new($false))",
    "  exit 1",
    "}",
  ].join("\n");
}

function encodePowerShellCommand(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

function readElevatedResultEnvelope(resultPath: string): ElevatedResultEnvelope | null {
  if (!fs.existsSync(resultPath)) {
    return null;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(resultPath, "utf8")) as Partial<ElevatedResultEnvelope>;
    const exitCode = parsed.exitCode;
    if (
      !(typeof exitCode === "number" || exitCode === null) ||
      typeof parsed.stdout !== "string" ||
      typeof parsed.stderr !== "string"
    ) {
      return null;
    }
    return {
      exitCode,
      stdout: parsed.stdout,
      stderr: parsed.stderr,
    };
  } catch {
    return null;
  }
}

export function windowsCommandLineFromArguments(args: string[]): string {
  return args.map(quoteWindowsCommandLineArgument).join(" ");
}

function quoteWindowsCommandLineArgument(argument: string): string {
  if (argument.length > 0 && !/[\s"]/.test(argument)) {
    return argument;
  }
  let quoted = '"';
  let backslashCount = 0;
  for (const character of argument) {
    if (character === "\\") {
      backslashCount += 1;
      continue;
    }
    if (character === '"') {
      quoted += "\\".repeat(backslashCount * 2 + 1);
      quoted += '"';
      backslashCount = 0;
      continue;
    }
    quoted += "\\".repeat(backslashCount);
    quoted += character;
    backslashCount = 0;
  }
  quoted += "\\".repeat(backslashCount * 2);
  quoted += '"';
  return quoted;
}

function safeExecutionId(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9._-]/g, "-");
  return sanitized || crypto.randomUUID();
}

function runProcess(
  command: string,
  args: string[],
  options: CommandRunOptions,
): Promise<CommandRunResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({ command, args, exitCode: null, stdout: stdout.trim(), stderr: sanitizeOutput(error.message) });
    });
    child.on("close", (exitCode) => {
      resolve({
        command,
        args,
        exitCode,
        stdout: sanitizeOutput(stdout),
        stderr: sanitizeOutput(stderr),
      });
    });
  });
}

function requirementResult(
  requirement: DevelopmentEnvironmentRequirement,
  before: ProbeResult,
  actionTaken: DevelopmentEnvironmentRequirementResult["actionTaken"],
  after: ProbeResult,
  commandSummaries: DevelopmentEnvironmentCommandSummary[],
  options: {
    blocker?: string;
    blockerKind?: DevelopmentEnvironmentRequirementBlockerKind;
    retryAllowed?: boolean;
    humanInteractionKind?: DevelopmentEnvironmentHumanInteractionKind;
    humanInteractionReason?: string;
    providerAttempts?: DevelopmentEnvironmentProviderAttempt[];
  } = {},
): DevelopmentEnvironmentRequirementResult {
  const result: DevelopmentEnvironmentRequirementResult = {
    capabilityId: requirement.capabilityId,
    requestedVersionConstraint: requirement.versionConstraint,
    requestedProfile: requirement.profile,
    provisioning: requirement.provisioning,
    beforeState: before.state,
    actionTaken,
    afterState: after.state,
    detectedVersion: after.detectedVersion ?? before.detectedVersion,
    detectedProfile: after.detectedProfile ?? before.detectedProfile,
    commandSummaries,
    retryAllowed: options.retryAllowed ?? false,
  };
  if (options.providerAttempts?.length) {
    result.providerAttempts = options.providerAttempts;
  }
  if (options.blocker) {
    result.blocker = options.blocker;
  }
  if (options.blockerKind) {
    result.blockerKind = options.blockerKind;
  }
  if (options.humanInteractionKind) {
    result.humanInteractionKind = options.humanInteractionKind;
  }
  if (options.humanInteractionReason) {
    result.humanInteractionReason = options.humanInteractionReason;
  }
  return result;
}

function blockedRequirement(
  requirement: DevelopmentEnvironmentRequirement,
  blocker: string,
  blockerKind: DevelopmentEnvironmentRequirementBlockerKind,
  retryAllowed: boolean,
  providerAttempts: DevelopmentEnvironmentProviderAttempt[] = [],
): DevelopmentEnvironmentRequirementResult {
  return {
    capabilityId: requirement.capabilityId,
    requestedVersionConstraint: requirement.versionConstraint,
    requestedProfile: requirement.profile,
    provisioning: requirement.provisioning,
    beforeState: "unknown",
    actionTaken: requirement.provisioning === "external" ? "external-block" : "none",
    afterState: "unknown",
    commandSummaries: [],
    providerAttempts,
    blocker,
    blockerKind,
    retryAllowed,
  };
}

function externalBlockedRequirement(
  requirement: DevelopmentEnvironmentRequirement,
): DevelopmentEnvironmentRequirementResult {
  return {
    ...blockedRequirement(
      requirement,
      `Capability ${requirement.capabilityId} is externally owned and must be provided outside ChampCity.`,
      "external",
      false,
    ),
    actionTaken: "external-block",
  };
}

function resultFromRequirements(
  state: DevelopmentEnvironmentPreflightResult["state"],
  summary: string,
  requirements: DevelopmentEnvironmentRequirementResult[],
): DevelopmentEnvironmentPreflightResult {
  const retryAllowed = retryAllowedForPreflight(state, requirements);
  return {
    state,
    summary,
    retryAllowed,
    requirements,
    evidenceMarkdown: evidenceMarkdown(state, summary, retryAllowed, requirements),
  };
}

function finalState(
  requirements: DevelopmentEnvironmentRequirementResult[],
): DevelopmentEnvironmentPreflightResult["state"] {
  if (requirements.some(isStructuralUnsatisfiedRequirement)) {
    return "blocked";
  }
  if (requirements.some((requirement) => isUnsatisfiedRequirement(requirement) && requirement.humanInteractionKind)) {
    return "waiting-for-operator";
  }
  if (requirements.some(isRecoverableResolutionRequirement)) {
    return "resolution-required";
  }
  if (requirements.some(isUnsatisfiedRequirement)) {
    return requirements.every((requirement) => !isUnsatisfiedRequirement(requirement) || requirement.retryAllowed)
      ? "resolution-required"
      : "blocked";
  }
  return "ready";
}

function summaryForRequirements(requirements: DevelopmentEnvironmentRequirementResult[]): string {
  const provisioned = requirements.filter((requirement) =>
    requirement.actionTaken === "install" || requirement.actionTaken === "configure" || requirement.actionTaken === "repair-winget"
  ).length;
  const satisfied = requirements.filter((requirement) => requirement.afterState === "satisfied").length;
  if (requirements.some(isStructuralUnsatisfiedRequirement)) {
    return "Development environment preflight is blocked by unsatisfied requirements.";
  }
  const interactionKinds = new Set(
    requirements
      .filter(isUnsatisfiedRequirement)
      .map((requirement) => requirement.humanInteractionKind)
      .filter((kind): kind is DevelopmentEnvironmentHumanInteractionKind => Boolean(kind)),
  );
  if (interactionKinds.size > 0) {
    const hasPermission = interactionKinds.has("windows-permission");
    const hasRestart = interactionKinds.has("restart-required");
    if (hasPermission && hasRestart) {
      return "Windows permission and restart are required before the development environment can be verified.";
    }
    if (hasRestart) {
      return "Windows restart is required before the development environment can be verified.";
    }
    return "Windows permission is required before the development environment can be verified.";
  }
  if (requirements.some(isRecoverableResolutionRequirement)) {
    return "Development environment resolution is required before Work Card implementation can start.";
  }
  if (requirements.some(isUnsatisfiedRequirement)) {
    return requirements.every((requirement) => !isUnsatisfiedRequirement(requirement) || requirement.retryAllowed)
      ? "Development environment preflight is blocked by retryable managed provisioning or verification failures."
      : "Development environment preflight is blocked by unsatisfied requirements.";
  }
  return provisioned > 0
    ? `Development environment ready after provisioning ${provisioned} capability requirement(s).`
    : `Development environment ready; ${satisfied} capability requirement(s) already satisfied.`;
}

function evidenceMarkdown(
  state: DevelopmentEnvironmentPreflightResult["state"],
  summary: string,
  retryAllowed: boolean,
  requirements: DevelopmentEnvironmentRequirementResult[],
): string {
  const lines = [
    "Development environment preflight evidence:",
    `- Final state: ${state}`,
    `- Summary: ${summary}`,
    `- Retry allowed: ${retryAllowed ? "yes" : "no"}`,
  ];
  for (const requirement of requirements) {
    lines.push(
      `- ${requirement.capabilityId}: ${requirement.beforeState} -> ${requirement.afterState}; action=${requirement.actionTaken}; provisioning=${requirement.provisioning}` +
        `${requirement.detectedVersion ? `; version=${requirement.detectedVersion}` : ""}` +
        `${requirement.detectedProfile ? `; profile=${requirement.detectedProfile}` : ""}` +
        `${requirement.humanInteractionKind ? `; humanInteractionKind=${requirement.humanInteractionKind}` : ""}` +
        `${requirement.humanInteractionReason ? `; humanInteraction=${requirement.humanInteractionReason}` : ""}` +
        `${requirement.blockerKind ? `; blockerKind=${requirement.blockerKind}` : ""}` +
        `${requirement.blocker ? `; blocker=${requirement.blocker}` : ""}` +
        `; retryAllowed=${requirement.retryAllowed ? "yes" : "no"}`,
    );
  }
  return lines.join("\n");
}

function retryAllowedForPreflight(
  state: DevelopmentEnvironmentPreflightResult["state"],
  requirements: DevelopmentEnvironmentRequirementResult[],
): boolean {
  if (state === "ready" || state === "not-required" || state === "checking" || state === "provisioning") {
    return false;
  }
  if (state === "resolution-required") {
    return true;
  }
  const unsatisfied = requirements.filter((requirement) =>
    isUnsatisfiedRequirement(requirement)
  );
  return unsatisfied.length > 0 && unsatisfied.every((requirement) => requirement.retryAllowed);
}

function isUnsatisfiedRequirement(requirement: DevelopmentEnvironmentRequirementResult): boolean {
  return requirement.afterState !== "satisfied" ||
    Boolean(requirement.blocker) ||
    Boolean(requirement.humanInteractionKind);
}

function isStructuralUnsatisfiedRequirement(requirement: DevelopmentEnvironmentRequirementResult): boolean {
  if (!isUnsatisfiedRequirement(requirement)) {
    return false;
  }
  return !requirement.retryAllowed ||
    requirement.blockerKind === "external" ||
    requirement.blockerKind === "unsupported" ||
    requirement.blockerKind === "host-policy";
}

function isRecoverableResolutionRequirement(requirement: DevelopmentEnvironmentRequirementResult): boolean {
  if (!isUnsatisfiedRequirement(requirement)) {
    return false;
  }
  return requirement.provisioning === "managed" &&
    requirement.retryAllowed &&
    !requirement.humanInteractionKind &&
    requirement.blockerKind !== "host-policy";
}

function summaryFromCommand(result: CommandRunResult): DevelopmentEnvironmentCommandSummary {
  return {
    command: [result.command, ...result.args].join(" "),
    exitCode: result.exitCode,
    stdout: truncateAuditText(result.stdout),
    stderr: truncateAuditText(result.stderr),
  };
}

function genericProbeEntry(
  requirement: DevelopmentEnvironmentRequirement,
): DevelopmentEnvironmentCapabilityRegistryEntry {
  return {
    kind: "simple",
    capabilityId: requirement.capabilityId,
    probe: {
      command: executableFromCapabilityId(requirement.capabilityId),
      args: ["--version"],
      versionPattern: /(\d+(?:\.\d+){0,3}[^\s]*)/,
    },
    supportedVersionConstraints: ["exact", "minimum"],
  };
}

function unresolvedProviderIdentityProbe(
  requirement: DevelopmentEnvironmentRequirement,
): ProbeResult {
  return {
    state: "unknown",
    command: {
      command: "provider-inventory",
      args: ["pending-provider-identity", requirement.capabilityId],
      exitCode: null,
      stdout: "No specialized semantic probe exists before provider package identity resolution.",
      stderr: "",
    },
  };
}

function isWindowsX64HostRequirement(requirement: DevelopmentEnvironmentRequirement): boolean {
  return requirement.capabilityId === "windows-x64-host" &&
    requirement.profile === "development-host" &&
    requirement.provisioning === "external";
}

function windowsX64HostRequirement(
  requirement: DevelopmentEnvironmentRequirement,
  platform: NodeJS.Platform,
  arch: string,
): DevelopmentEnvironmentRequirementResult {
  const command: DevelopmentEnvironmentCommandSummary = {
    command: "detect windows-x64-host",
    exitCode: platform === "win32" && arch === "x64" ? 0 : 1,
    stdout: `platform=${platform}; arch=${arch}`,
    stderr: "",
  };
  if (platform === "win32" && arch === "x64") {
    return {
      capabilityId: requirement.capabilityId,
      requestedVersionConstraint: requirement.versionConstraint,
      requestedProfile: requirement.profile,
      provisioning: requirement.provisioning,
      beforeState: "satisfied",
      actionTaken: "none",
      afterState: "satisfied",
      detectedProfile: "win32/x64 development-host",
      commandSummaries: [command],
      providerAttempts: [{
        provider: "specialized-adapter",
        stage: "verification",
        outcome: "resolved",
        summary: "Detected compatible Windows x64 development host.",
      }],
      retryAllowed: false,
    };
  }
  return {
    ...blockedRequirement(
      requirement,
      `Capability ${requirement.capabilityId} requires a Windows x64 development host; detected ${platform}/${arch}.`,
      "external",
      false,
      [{
        provider: "specialized-adapter",
        stage: "verification",
        outcome: "failed",
        summary: `Detected incompatible host ${platform}/${arch}.`,
      }],
    ),
    actionTaken: "external-block",
    commandSummaries: [command],
  };
}

function executableFromCapabilityId(capabilityId: string): string {
  return capabilityId
    .trim()
    .split(/[\/\s]+/)[0]
    .replace(/[^a-zA-Z0-9._-]/g, "-");
}

function providerInventoryVersion(text: string, packageId: string): string | undefined {
  const jsonVersion = providerInventoryVersionFromJson(text, packageId);
  if (jsonVersion) {
    return jsonVersion;
  }
  const normalizedPackageId = packageId.toLowerCase();
  for (const line of text.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)) {
    if (!line.toLowerCase().includes(normalizedPackageId)) {
      continue;
    }
    const columns = line.split(/\s{2,}/).map((column) => column.trim()).filter(Boolean);
    const idIndex = columns.findIndex((column) => column.toLowerCase() === normalizedPackageId);
    const version = idIndex >= 0 ? columns[idIndex + 1] : undefined;
    if (version) {
      return version;
    }
  }
  return undefined;
}

function providerInventoryVersionFromJson(text: string, packageId: string): string | undefined {
  try {
    return findProviderInventoryVersion(JSON.parse(text) as unknown, packageId.toLowerCase());
  } catch {
    return undefined;
  }
}

function findProviderInventoryVersion(value: unknown, packageId: string): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findProviderInventoryVersion(entry, packageId);
      if (found) return found;
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const id = typeof (record.id ?? record.packageId) === "string"
    ? String(record.id ?? record.packageId).toLowerCase()
    : "";
  if (id === packageId && typeof record.version === "string") {
    return record.version;
  }
  for (const entry of Object.values(record)) {
    const found = findProviderInventoryVersion(entry, packageId);
    if (found) return found;
  }
  return undefined;
}

function wingetVersionIsReady(result: CommandRunResult): boolean {
  if (result.exitCode !== 0) {
    return false;
  }
  const version = /v?(\d+(?:\.\d+){1,3})/i.exec(`${result.stdout}\n${result.stderr}`)?.[1];
  return Boolean(version && compareVersions(version, minimumWingetVersionForConfigurationV3) >= 0);
}

function classifyCommandResult(result: CommandRunResult): CommandClassification {
  if (result.exitCode === 0) {
    return { kind: "success" };
  }
  if (isAlreadyInstalledWingetResult(result)) {
    return {
      kind: "already-installed",
      reason: result.stdout || result.stderr || "WinGet reported the exact package is already installed and current.",
    };
  }
  if (isRebootRequired(result)) {
    return {
      kind: "restart-required",
      reason: "Windows restart is required before provisioning can be verified.",
    };
  }
  if (isElevationDeclined(result)) {
    return {
      kind: "operator-permission",
      reason: "Windows permission was not granted for the selected development capability.",
    };
  }
  if (isElevationRequired(result)) {
    return {
      kind: "elevation-required",
      reason: "Windows permission is required to install the selected development capability.",
    };
  }
  if (isPolicyBlock(result)) {
    return { kind: "policy-block", reason: "Host policy blocked provisioning." };
  }
  if (isAmbiguousWingetResult(result)) {
    return {
      kind: "ambiguous-package",
      reason: "WinGet returned an ambiguous package result; exact package identity is required.",
    };
  }
  return {
    kind: "failure",
    reason: result.stderr || result.stdout || "Provisioning command failed.",
  };
}

function attemptFromClassification(
  actionTaken: ProvisioningAction,
  commandSummaries: DevelopmentEnvironmentCommandSummary[],
  classification: CommandClassification,
  result: CommandRunResult,
): ProvisioningAttempt {
  switch (classification.kind) {
    case "success":
    case "already-installed":
      return { actionTaken, commandSummaries };
    case "restart-required":
    case "operator-permission":
    case "elevation-required":
      return {
        actionTaken,
        commandSummaries,
        retryAllowed: true,
        humanInteractionKind: classification.kind === "restart-required"
          ? "restart-required"
          : "windows-permission",
        humanInteractionReason: classification.reason,
      };
    case "policy-block":
      return {
        actionTaken,
        commandSummaries,
        blocker: classification.reason || result.stderr || result.stdout || "Provisioning command failed.",
        blockerKind: "host-policy",
        retryAllowed: false,
      };
    case "ambiguous-package":
      return {
        actionTaken,
        commandSummaries,
        blocker: classification.reason || result.stderr || result.stdout || "Provisioning command failed.",
        blockerKind: "ambiguous-package",
        retryAllowed: false,
      };
    case "failure":
      return {
        actionTaken,
        commandSummaries,
        blocker: classification.reason || result.stderr || result.stdout || "Provisioning command failed.",
        blockerKind: "provisioning-failure",
        retryAllowed: true,
      };
  }
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

function exactVersionFromConstraint(versionConstraint: string | undefined): string | null {
  const trimmed = versionConstraint?.trim();
  return trimmed && /^\d+(?:\.\d+){0,3}$/.test(trimmed) ? trimmed : null;
}

function msvcDesktopCppConfiguration(): string {
  return [
    "$schema: https://raw.githubusercontent.com/PowerShell/DSC/main/schemas/2023/08/config/document.json",
    "metadata:",
    "  winget:",
    "    processor:",
    "      identifier: dscv3",
    "resources:",
    "- type: Microsoft.WinGet/Package",
    "  name: VisualStudioBuildTools",
    "  properties:",
    "    id: Microsoft.VisualStudio.2022.BuildTools",
    "    source: winget",
    "    useLatest: true",
    "  metadata:",
    "    winget:",
    "      securityContext: elevated",
    "    description: Install Visual Studio 2022 Build Tools",
    "- type: Microsoft.DSC.Transitional/WindowsPowerShellScript",
    "  name: VisualStudioDesktopCppWorkload",
    "  dependsOn:",
    "  - VisualStudioBuildTools",
    "  properties:",
    "    testScript: |",
    indentScript(msvcDesktopCppProbeScript(), 6),
    "    setScript: |",
    indentScript(msvcDesktopCppInstallScript(), 6),
    "  metadata:",
    "    winget:",
    "      securityContext: elevated",
    "    description: Ensure MSVC x64 desktop C++ workload and Windows SDK components",
    "",
  ].join("\n");
}

function msvcDesktopCppProbeScript(): string {
  return [
    "$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\\Installer\\vswhere.exe'",
    "if (-not (Test-Path $vswhere)) { exit 1 }",
    "$install = & $vswhere -latest -version '[17.0,18.0)' -products * -requires Microsoft.VisualStudio.Workload.VCTools Microsoft.VisualStudio.Component.VC.Tools.x86.x64 Microsoft.VisualStudio.Component.Windows10SDK -property installationPath",
    "if (-not $install) { exit 1 }",
    "$version = & $vswhere -latest -version '[17.0,18.0)' -products * -requires Microsoft.VisualStudio.Workload.VCTools Microsoft.VisualStudio.Component.VC.Tools.x86.x64 Microsoft.VisualStudio.Component.Windows10SDK -property installationVersion",
    "if (-not ($version -match '^17\\.')) { exit 1 }",
    "$vcvars = Join-Path $install 'VC\\Auxiliary\\Build\\vcvars64.bat'",
    "if (-not (Test-Path $vcvars)) { exit 1 }",
    "Write-Output \"Visual Studio $version desktop-cpp profile ready\"",
    "exit 0",
  ].join("\n");
}

function msvcDesktopCppInstallScript(): string {
  return [
    "$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\\Installer\\vswhere.exe'",
    "if (-not (Test-Path $vswhere)) { throw 'Visual Studio Installer was not found after Build Tools installation.' }",
    "$install = & $vswhere -latest -version '[17.0,18.0)' -products Microsoft.VisualStudio.Product.BuildTools -property installationPath",
    "if (-not $install) { throw 'Visual Studio 2022 Build Tools installation path was not found.' }",
    "$version = & $vswhere -latest -version '[17.0,18.0)' -products Microsoft.VisualStudio.Product.BuildTools -property installationVersion",
    "if (-not ($version -match '^17\\.')) { throw 'Visual Studio 2022 Build Tools generation 17 was not selected.' }",
    "$installer = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\\Installer\\setup.exe'",
    "$args = @(",
    "  'modify',",
    "  '--installPath', $install,",
    "  '--add', 'Microsoft.VisualStudio.Workload.VCTools',",
    "  '--add', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64',",
    "  '--add', 'Microsoft.VisualStudio.Component.Windows10SDK',",
    "  '--includeRecommended',",
    "  '--quiet',",
    "  '--wait',",
    "  '--norestart'",
    ")",
    "$process = Start-Process -FilePath $installer -ArgumentList $args -Wait -PassThru",
    "exit $process.ExitCode",
  ].join("\n");
}

function indentScript(script: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return script.split("\n").map((line) => `${prefix}${line}`).join("\n");
}

function isElevationRequired(result: CommandRunResult): boolean {
  return /elevat|administrator|admin privileges|requires.*privilege|uac/i.test(`${result.stdout}\n${result.stderr}`);
}

function isElevationDeclined(result: CommandRunResult): boolean {
  return result.exitCode === 1223 || /cancelled|canceled|declined|operation was canceled/i.test(`${result.stdout}\n${result.stderr}`);
}

function isRebootRequired(result: CommandRunResult): boolean {
  return result.exitCode === 3010 || /reboot|restart required/i.test(`${result.stdout}\n${result.stderr}`);
}

function isPolicyBlock(result: CommandRunResult): boolean {
  return /policy|disabled by your organization|administrator has blocked|execution policy/i.test(`${result.stdout}\n${result.stderr}`);
}

function isAmbiguousWingetResult(result: CommandRunResult): boolean {
  return /multiple packages|multiple sources|ambiguous|refine the input|more than one/i.test(`${result.stdout}\n${result.stderr}`);
}

function isAlreadyInstalledWingetResult(result: CommandRunResult): boolean {
  const text = `${result.stdout}\n${result.stderr}`;
  return /already installed|no applicable update|no available upgrade|no upgrade available|upgrade is not available|latest version is already installed/i.test(text);
}

function truncateAuditText(value: string): string {
  const normalized = sanitizeOutput(value).replace(/\s+/g, " ").trim();
  return normalized.length > 800 ? `${normalized.slice(0, 800)}...` : normalized;
}

function sanitizeOutput(value: string): string {
  return value
    .replace(/(token|password|secret|api[_-]?key)=\S+/gi, "$1=<redacted>")
    .trim();
}

function quotePowerShell(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
