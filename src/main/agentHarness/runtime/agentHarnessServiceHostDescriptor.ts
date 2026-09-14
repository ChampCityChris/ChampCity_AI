import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getAgentHarnessSettingsDirectory } from "./agentHarnessSettings";

export const agentHarnessServiceHostDescriptorSchemaVersion = 1 as const;
export const agentHarnessServiceHostControlProtocolVersion = 1 as const;

export interface AgentHarnessServiceHostDescriptor {
  schemaVersion: typeof agentHarnessServiceHostDescriptorSchemaVersion;
  controlProtocolVersion: typeof agentHarnessServiceHostControlProtocolVersion;
  serviceHostProcessId: number;
  controlAddress: string;
  instanceId: string;
  runtimeBuildIdentity: string;
}

export function getAgentHarnessServiceHostDescriptorPath(userDataRoot: string): string {
  return path.join(getAgentHarnessSettingsDirectory(userDataRoot), "service-host.json");
}

export function createAgentHarnessServiceHostDescriptor(
  userDataRoot: string,
  runtimeBuildIdentity: string,
  serviceHostProcessId = process.pid,
): AgentHarnessServiceHostDescriptor {
  const instanceId = randomUUID();
  return {
    schemaVersion: agentHarnessServiceHostDescriptorSchemaVersion,
    controlProtocolVersion: agentHarnessServiceHostControlProtocolVersion,
    serviceHostProcessId,
    controlAddress: getAgentHarnessServiceHostControlAddress(userDataRoot),
    instanceId,
    runtimeBuildIdentity,
  };
}

export function createAgentHarnessServiceHostDescriptorFromIdentity(
  userDataRoot: string,
  identity: Pick<AgentHarnessServiceHostDescriptor, "serviceHostProcessId" | "instanceId" | "runtimeBuildIdentity">,
): AgentHarnessServiceHostDescriptor {
  return {
    schemaVersion: agentHarnessServiceHostDescriptorSchemaVersion,
    controlProtocolVersion: agentHarnessServiceHostControlProtocolVersion,
    serviceHostProcessId: identity.serviceHostProcessId,
    controlAddress: getAgentHarnessServiceHostControlAddress(userDataRoot),
    instanceId: identity.instanceId,
    runtimeBuildIdentity: identity.runtimeBuildIdentity,
  };
}

export function readAgentHarnessServiceHostDescriptor(
  userDataRoot: string,
): AgentHarnessServiceHostDescriptor | null {
  const descriptorPath = getAgentHarnessServiceHostDescriptorPath(userDataRoot);
  if (!fs.existsSync(descriptorPath)) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(descriptorPath, "utf8"));
  } catch {
    throw new Error("Agent Harness Service Host descriptor is unreadable or malformed.");
  }
  if (!isAgentHarnessServiceHostDescriptor(parsed)) {
    throw new Error("Agent Harness Service Host descriptor has an unsupported or invalid schema.");
  }
  return parsed;
}

export function writeAgentHarnessServiceHostDescriptor(
  userDataRoot: string,
  descriptor: AgentHarnessServiceHostDescriptor,
): void {
  if (!isAgentHarnessServiceHostDescriptor(descriptor)) {
    throw new Error("Refusing to write an invalid Agent Harness Service Host descriptor.");
  }
  const directory = getAgentHarnessSettingsDirectory(userDataRoot);
  fs.mkdirSync(directory, { recursive: true });
  const descriptorPath = getAgentHarnessServiceHostDescriptorPath(userDataRoot);
  const temporaryPath = `${descriptorPath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(descriptor, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.renameSync(temporaryPath, descriptorPath);
}

export function removeCurrentAgentHarnessServiceHostDescriptor(
  userDataRoot: string,
  instanceId: string,
): void {
  const descriptorPath = getAgentHarnessServiceHostDescriptorPath(userDataRoot);
  let descriptor: AgentHarnessServiceHostDescriptor | null;
  try {
    descriptor = readAgentHarnessServiceHostDescriptor(userDataRoot);
  } catch {
    removeAgentHarnessServiceHostDescriptorAfterEndpointAbsence(userDataRoot);
    return;
  }
  if (descriptor?.instanceId !== instanceId) {
    return;
  }
  try {
    fs.unlinkSync(descriptorPath);
  } catch (error) {
    if (!isMissingPathError(error)) {
      throw error;
    }
  }
}

export function removeAgentHarnessServiceHostDescriptorAfterEndpointAbsence(
  userDataRoot: string,
): void {
  try {
    fs.unlinkSync(getAgentHarnessServiceHostDescriptorPath(userDataRoot));
  } catch (error) {
    if (!isMissingPathError(error)) {
      throw error;
    }
  }
}

export function isAgentHarnessServiceHostDescriptor(
  value: unknown,
): value is AgentHarnessServiceHostDescriptor {
  if (!isRecord(value)) {
    return false;
  }
  return value.schemaVersion === agentHarnessServiceHostDescriptorSchemaVersion &&
    value.controlProtocolVersion === agentHarnessServiceHostControlProtocolVersion &&
    Number.isInteger(value.serviceHostProcessId) &&
    (value.serviceHostProcessId as number) > 0 &&
    typeof value.controlAddress === "string" &&
    value.controlAddress.length > 0 &&
    value.controlAddress.length <= 500 &&
    typeof value.instanceId === "string" &&
    /^[0-9a-f-]{36}$/i.test(value.instanceId) &&
    typeof value.runtimeBuildIdentity === "string" &&
    /^sha256:[0-9a-f]{64}$/i.test(value.runtimeBuildIdentity);
}

export function getAgentHarnessServiceHostControlAddress(userDataRoot: string): string {
  const resolvedRoot = path.resolve(userDataRoot);
  const normalizedRoot = process.platform === "win32" ? resolvedRoot.toLowerCase() : resolvedRoot;
  const rootIdentity = createHash("sha256").update(normalizedRoot).digest("hex").slice(0, 24);
  if (process.platform === "win32") {
    return `\\\\.\\pipe\\champcity-agent-harness-${rootIdentity}`;
  }
  return path.join(getAgentHarnessSettingsDirectory(userDataRoot), `.service-host-${rootIdentity}.sock`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMissingPathError(error: unknown): boolean {
  return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT";
}
