import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { AgentHarnessError } from "../core/applicationErrors";
import type { ForgejoHostingConfiguration, RepositoryHostingSettings, RepositoryHostingSettingsInput } from "../../shared/repositoryHostingContracts";
import { validateForgejoHostingConfiguration } from "./forgejoHostingAdapter";

const fail = () => new AgentHarnessError("REPOSITORY_PROVIDER_FAILED", "Repository provider settings could not be read or saved safely.");
const settingsPath = (userDataRoot: string) => path.join(userDataRoot, "repository-hosting", "providers.json");
export function readRepositoryHostingSettings(userDataRoot: string): RepositoryHostingSettings {
  try {
  const file = settingsPath(userDataRoot);
  let providers: ForgejoHostingConfiguration[] = [];
  if (fs.existsSync(file)) {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink > 1 || stat.size > 262144) throw fail();
    let parsed: unknown;
    try { parsed = JSON.parse(fs.readFileSync(file, "utf8")); } catch { throw fail(); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).some(field => !["schemaVersion", "providers"].includes(field))) throw fail();
    const stored = parsed as { schemaVersion?: unknown; providers?: unknown };
    if (stored.schemaVersion !== 1 || !Array.isArray(stored.providers) || stored.providers.length > 32) throw fail();
    providers = stored.providers.map(validateForgejoHostingConfiguration).sort((left, right) => left.providerId.localeCompare(right.providerId));
    if (new Set(providers.map(provider => provider.providerId)).size !== providers.length) throw fail();
  }
  return { providers, configurationId: createHash("sha256").update(JSON.stringify(providers)).digest("hex") };
  } catch (error) { if (error instanceof AgentHarnessError) throw error; throw fail(); }
}
export function saveRepositoryHostingSettings(userDataRoot: string, input: RepositoryHostingSettingsInput): RepositoryHostingSettings {
  try {
  if (!input || typeof input !== "object" || Object.keys(input).some(field => !["providers", "configurationId"].includes(field)) || !Array.isArray(input.providers) || input.providers.length > 32 || typeof input.configurationId !== "string" || !/^[a-f0-9]{64}$/.test(input.configurationId)) throw fail();
  const providers = input.providers.map(validateForgejoHostingConfiguration).sort((left, right) => left.providerId.localeCompare(right.providerId));
  if (new Set(providers.map(provider => provider.providerId)).size !== providers.length) throw fail();
  const file = settingsPath(userDataRoot), lock = `${file}.lock`, temporary = `${file}.tmp-${randomBytes(8).toString("hex")}`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let descriptor: number;
  try { descriptor = fs.openSync(lock, "wx"); } catch { throw fail(); }
  const ownedLock = fs.fstatSync(descriptor);
  try {
    if (readRepositoryHostingSettings(userDataRoot).configurationId !== input.configurationId) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Repository provider settings changed; refresh before saving.");
    fs.writeFileSync(temporary, JSON.stringify({ schemaVersion: 1, providers }, null, 2), { flag: "wx" });
    fs.renameSync(temporary, file);
    return readRepositoryHostingSettings(userDataRoot);
  } finally {
    fs.closeSync(descriptor);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    const current = fs.existsSync(lock) ? fs.lstatSync(lock) : null;
    if (current?.ino === ownedLock.ino && current.dev === ownedLock.dev && current.birthtimeMs === ownedLock.birthtimeMs) fs.unlinkSync(lock);
  }
  } catch (error) { if (error instanceof AgentHarnessError) throw error; throw fail(); }
}
