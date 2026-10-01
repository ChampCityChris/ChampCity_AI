import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { JsonlCodexAppServerTransport } from "./codexAppServerTransport";
import type { CodexRuntimeExecutionOperations } from "./codexRuntimeManager";
import type {
  CodexRuntimeMaintenanceOperations,
  ManagedCodexRuntime,
} from "./codexRuntimeInitialization";
import type { CodexModelSelection } from "../../shared/codexRuntimeContracts";
import { RuntimeHealthError } from "./codexRuntimeInitialization";
import { CodexConnectionPolicy, managedConnectionOverrides } from "./codexConnectionPolicy";

const registry = "https://registry.npmjs.org";

export interface CodexRuntimeOperations
  extends CodexRuntimeMaintenanceOperations, CodexRuntimeExecutionOperations {}

// Immutable version directories plus an atomic pointer; repository dependencies are bootstrap input only.
export function createCodexRuntimeOperations(userData: string): CodexRuntimeOperations {
  const root = path.join(userData, "codex-runtime");
  const connections = new CodexConnectionPolicy(userData);
  const shutdown = new AbortController();
  const transports = new Set<JsonlCodexAppServerTransport>();
  const isolatedHomes = new Set<string>();
  const execute = (file: string, args: string[], options: { windowsHide: boolean; timeout: number; maxBuffer?: number }) =>
    new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execFile(file, args, { ...options, signal: shutdown.signal, encoding: "utf8" }, (error, stdout, stderr) => error ? reject(error) : resolve({ stdout, stderr }));
    });
  const platform = `${process.platform}-${process.arch}`;
  const triples: Record<string, string> = {
    "win32-x64": "x86_64-pc-windows-msvc", "win32-arm64": "aarch64-pc-windows-msvc",
    "darwin-x64": "x86_64-apple-darwin", "darwin-arm64": "aarch64-apple-darwin",
    "linux-x64": "x86_64-unknown-linux-musl", "linux-arm64": "aarch64-unknown-linux-musl",
  };
  const triple = triples[platform];
  const runtimeAt = (directory: string, version: string): ManagedCodexRuntime => {
    if (!triple) throw new Error("Unsupported managed Codex platform.");
    return { directory, version, executable: path.join(directory, "vendor", triple, "bin", process.platform === "win32" ? "codex.exe" : "codex") };
  };
  const newDirectory = async () => {
    shutdown.signal.throwIfAborted();
    const directory = path.join(root, "versions", randomUUID());
    await fs.mkdir(directory, { recursive: true });
    return directory;
  };
  const launchTransport = async (runtime: ManagedCodexRuntime, overrides: string[], probeHome?: string) => {
    shutdown.signal.throwIfAborted();
    await fs.mkdir(root, { recursive: true });
    const transport = new JsonlCodexAppServerTransport(() => spawn(runtime.executable, [...overrides, "app-server", "--listen", "stdio://"], {
      cwd: root, windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...(probeHome ? { CODEX_HOME: probeHome } : {}), PATH: `${path.join(runtime.directory, "vendor", triple, "codex-path")}${path.delimiter}${process.env.PATH ?? ""}` },
    }));
    transports.add(transport);
    const dispose = transport.dispose.bind(transport);
    transport.dispose = async () => { transports.delete(transport); await dispose(); };
    try { await bounded(transport.initialize(), 30_000); return transport; }
    catch (error) { await transport.dispose(); throw error; }
  };
  const launchNeutralTransport = async (runtime: ManagedCodexRuntime) => {
    shutdown.signal.throwIfAborted();
    const probeHome = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-runtime-isolated-"));
    isolatedHomes.add(probeHome);
    try {
      shutdown.signal.throwIfAborted();
      const auth = path.join(process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"), "auth.json");
      try { await fs.copyFile(auth, path.join(probeHome, "auth.json")); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      const transport = await launchTransport(runtime, ["-c", "features.apps=false", "-c", "features.plugins=false"], probeHome);
      const dispose = transport.dispose.bind(transport);
      transport.dispose = async () => { try { await dispose(); } finally { await fs.rm(probeHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); isolatedHomes.delete(probeHome); } };
      return transport;
    } catch (error) { await fs.rm(probeHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); isolatedHomes.delete(probeHome); throw error; }
  };
  const inventory = async (runtime: ManagedCodexRuntime): Promise<string[]> => {
    // `mcp list` reads configuration without starting MCP workers. Never retain its raw credential-bearing payload.
    const result = await execute(runtime.executable, ["mcp", "list", "--json"], { windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024 })
      .catch(() => { throw new Error("Could not read Codex connection inventory."); });
    let value;
    try { value = JSON.parse(result.stdout); } catch { throw new Error("Could not read Codex connection inventory."); }
    if (!Array.isArray(value) || value.some(entry => typeof entry?.name !== "string")) throw new Error("Invalid Codex connection inventory.");
    return value.map(entry => entry.name);
  };
  const preflight = async (runtime: ManagedCodexRuntime) => {
    let approved;
    let names;
    try { approved = await connections.read(); }
    catch { connections.fail("Connection policy check failed. Approved connection projection could not be read."); throw new Error(connections.getStatus().blocker!); }
    try { names = await inventory(runtime); }
    catch { connections.fail("Connection inventory check failed. Safe implementation isolation could not be established."); throw new Error(connections.getStatus().blocker!); }
    const candidates = approved.filter(entry => entry.enabled).map(entry => entry.name);
    let transport: JsonlCodexAppServerTransport | undefined;
    let policyFailed = false;
    try {
      transport = candidates.length ? await launchTransport(runtime, managedConnectionOverrides(names, candidates)) : await launchNeutralTransport(runtime);
      const observed = await bounded(transport.listManagedConnections(), 30_000);
      if (observed.some(entry => entry.initialized && !candidates.includes(entry.name))) throw new Error("Unapproved Codex connection detected.");
      connections.project(approved, observed);
    } catch (error) {
      if (error instanceof Error && error.message === "Unapproved Codex connection detected.") {
        connections.fail("Connection policy check failed. Unapproved connection detected; implementation blocked.");
        throw error;
      }
      policyFailed = !transport;
      connections.project(approved, [], true);
    } finally { await transport?.dispose(); }
    return { names, status: connections.getStatus(), policyFailed };
  };
  const launch = async (runtime: ManagedCodexRuntime) => {
    const { names, status } = await preflight(runtime);
    if (status.blocker) throw new Error(status.blocker);
    // Optional outbound connections remain excluded from implementation. This V1 recovery boundary
    // cannot guarantee that an authenticated optional worker will remain healthy after preflight.
    const required = status.connections.filter(entry => entry.enabled && entry.requirement === "required" && entry.status === "ready").map(entry => entry.name);
    const transport = required.length ? await launchTransport(runtime, managedConnectionOverrides(names, required)) : await launchNeutralTransport(runtime);
    transport.setManagedConnectionBoundary(required.length ? names : [], required);
    return transport;
  };
  return {
    verifyCandidateConnections: async (runtime) => { if ((await preflight(runtime)).policyFailed) throw new Error("Candidate connection policy check failed."); },
    getConnectionsStatus: () => connections.getStatus(),
    refreshConnections: async (runtime) => (await preflight(runtime)).status,
    setConnectionEnabled: (name, enabled) => connections.setEnabled(name, enabled),
    async loadCurrent() {
      let current;
      try { current = JSON.parse(await fs.readFile(path.join(root, "current.json"), "utf8")); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
      if (!/^[a-f0-9-]{36}$/.test(current.directory) || !/^\d+\.\d+\.\d+$/.test(current.version)) throw new Error("Invalid managed runtime pointer.");
      return runtimeAt(path.join(root, "versions", current.directory), current.version);
    },
    async bootstrap() {
      const require = createRequire(__filename);
      const bundled = JSON.parse(await fs.readFile(require.resolve("@openai/codex/package.json"), "utf8"));
      const packageRoot = path.dirname(require.resolve(`@openai/codex-${platform}/package.json`));
      const directory = await newDirectory();
      await fs.cp(resolveBundledCodexVendorPath(packageRoot), path.join(directory, "vendor"), { recursive: true });
      return runtimeAt(directory, bundled.version);
    },
    async latestVersion() {
      const metadata = await registryJson(`${registry}/@openai%2fcodex/latest`, shutdown.signal);
      return metadata.version;
    },
    async stage(version) {
      if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Invalid stable version.");
      const directory = await newDirectory();
      const metadata = await registryJson(`${registry}/@openai%2fcodex/${version}-${platform}`, shutdown.signal);
      if (metadata.version !== `${version}-${platform}`) throw new Error("Unexpected runtime package version.");
      const url = new URL(metadata.dist.tarball);
      if (url.origin !== registry || !url.pathname.startsWith("/@openai/codex/-/")) throw new Error("Unexpected runtime download source.");
      const response = await fetch(url, { signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(120_000)]), redirect: "error" });
      if (!response.ok) throw new Error("Runtime download failed.");
      const bytes = Buffer.from(await response.arrayBuffer());
      const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
      if (integrity !== metadata.dist.integrity) throw new Error("Runtime integrity verification failed.");
      const archive = path.join(directory, "runtime.tgz");
      await fs.writeFile(archive, bytes);
      // Registry package extraction is confined to a fresh staging directory; no install scripts run.
      const listing = await execute("tar", ["-tzf", archive], { windowsHide: true, timeout: 30_000, maxBuffer: 8 * 1024 * 1024 });
      if (listing.stdout.split(/\r?\n/).filter(Boolean).some((entry) => !entry.startsWith("package/") || entry.split(/[\\/]/).includes("..") || entry.includes(":"))) throw new Error("Invalid runtime archive path.");
      await execute("tar", ["-xzf", archive, "--strip-components=1", "-C", directory], { windowsHide: true, timeout: 60_000 });
      await fs.unlink(archive);
      return runtimeAt(directory, version);
    },
    async probe(runtime) {
      try {
        const version = await execute(runtime.executable, ["--version"], { windowsHide: true, timeout: 15_000 });
        if (!version.stdout.includes(`codex-cli ${runtime.version}`)) throw new Error();
      } catch { throw new RuntimeHealthError("Runtime executable check failed", "Executable did not report the expected version."); }
      const schemaDirectory = path.join(runtime.directory, "probe-schema");
      try {
        await fs.mkdir(schemaDirectory, { recursive: true });
        await execute(runtime.executable, ["app-server", "generate-json-schema", "--out", schemaDirectory], { windowsHide: true, timeout: 30_000 });
        await verifyRequiredSchema(schemaDirectory);
      } catch { throw new RuntimeHealthError("Runtime schema compatibility check failed", "Required execution protocol could not be verified."); }
      // A fresh CODEX_HOME has no ambient MCP configuration. Authentication is borrowed
      // only for this transport's lifetime and removed by disposal, including failed probes.
      let transport: JsonlCodexAppServerTransport | undefined;
      try {
        try { transport = await launchNeutralTransport(runtime); }
        catch { throw new RuntimeHealthError("Runtime App Server initialization failed", "Connection-neutral App Server could not initialize."); }
        let catalog;
        try { catalog = await bounded(transport.listModels(), 30_000); }
        catch { throw new RuntimeHealthError("Model catalog check failed", "Connection-neutral model enumeration failed."); }
        if (!catalog.length) throw new RuntimeHealthError("Model catalog check failed", "Runtime advertised no models.");
        return catalog;
      } catch (error) {
        if (error instanceof RuntimeHealthError) throw error;
        throw new RuntimeHealthError("Model catalog check failed", "Probe authentication or metadata could not be prepared.");
      } finally { await transport?.dispose(); }
    },
    async persistVerified(runtime, catalog) {
      await atomicJson(path.join(root, "verified.json"), {
        version: runtime.version, catalog: catalog.slice(0, 128).map(entry => ({
          ...entry, id: entry.id.slice(0, 500), model: entry.model.slice(0, 500), displayName: entry.displayName.slice(0, 500),
          description: entry.description.slice(0, 4000), supportedReasoningEfforts: entry.supportedReasoningEfforts.slice(0, 32).map(effort => effort.slice(0, 100)),
          defaultReasoningEffort: entry.defaultReasoningEffort.slice(0, 100),
        })), verifiedAt: new Date().toISOString(), executionContractVersion: "1",
      });
    },
    async promote(runtime) {
      shutdown.signal.throwIfAborted();
      await atomicJson(path.join(root, "current.json"), { version: runtime.version, directory: path.basename(runtime.directory) });
    },
    async readSelection() {
      try {
        const value = JSON.parse(await fs.readFile(path.join(root, "selection.json"), "utf8"));
        if (typeof value.model !== "string" || typeof value.reasoningEffort !== "string") throw new Error("Invalid saved selection.");
        return { model: value.model, reasoningEffort: value.reasoningEffort };
      } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
    },
    writeSelection: (selection: CodexModelSelection) => atomicJson(path.join(root, "selection.json"), selection),
    launch,
    async shutdown() {
      shutdown.abort();
      try { await Promise.all([...transports].map((transport) => transport.dispose())); }
      finally {
        // Await cleanup even when shutdown interrupts initialization before a transport owns its home.
        await Promise.all([...isolatedHomes].map(async home => {
          await fs.rm(home, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
          isolatedHomes.delete(home);
        }));
      }
    },
  };
}

export function createCodexRuntimeExecutionOperations(
  userData: string,
): CodexRuntimeExecutionOperations {
  const operations = createCodexRuntimeOperations(userData);
  return {
    writeSelection: operations.writeSelection,
    launch: operations.launch,
    getConnectionsStatus: operations.getConnectionsStatus,
    refreshConnections: operations.refreshConnections,
    setConnectionEnabled: operations.setConnectionEnabled,
    shutdown: operations.shutdown,
  };
}

export function resolveBundledCodexVendorPath(packageRoot: string): string {
  const vendorPath = path.join(packageRoot, "vendor");
  const asarBoundary = `${path.sep}app.asar${path.sep}`;
  return vendorPath.includes(asarBoundary)
    ? vendorPath.replace(asarBoundary, `${path.sep}app.asar.unpacked${path.sep}`)
    : vendorPath;
}

async function registryJson(url: string, signal: AbortSignal): Promise<any> {
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]), redirect: "error" });
  if (!response.ok) throw new Error("Codex registry lookup failed.");
  return response.json();
}

async function atomicJson(destination: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value), { flag: "wx" });
  await fs.rename(temporary, destination);
}

async function bounded<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Codex runtime probe timed out.")), milliseconds); })]); }
  finally { clearTimeout(timer); }
}

async function verifyRequiredSchema(directory: string): Promise<void> {
  const schemas: Record<string, any> = {};
  async function read(root: string): Promise<void> {
    for (const item of await fs.readdir(root, { withFileTypes: true })) {
      if (item.isDirectory()) await read(path.join(root, item.name));
      else if (item.name.endsWith(".json")) schemas[item.name] = JSON.parse(await fs.readFile(path.join(root, item.name), "utf8"));
    }
  }
  await read(directory);
  const text = JSON.stringify(schemas);
  for (const method of ["initialize", "model/list", "thread/start", "turn/start", "turn/interrupt", "mcpServerStatus/list", "item/commandExecution/requestApproval", "item/fileChange/requestApproval", "item/permissions/requestApproval", "item/tool/requestUserInput", "mcpServer/elicitation/request"]) {
    if (!text.includes(`"${method}"`)) throw new Error(`Codex schema is missing ${method}.`);
  }
  function hasFields(value: any, title: string, fields: string[]): boolean {
    if (!value || typeof value !== "object") return false;
    if (value.title === title && fields.every((field) => value.properties?.[field])) return true;
    return Object.entries(value).some(([key, child]) => (key === title && fields.every((field) => (child as any)?.properties?.[field])) || hasFields(child, title, fields));
  }
  if (!hasFields(schemas, "ThreadStartParams", ["model", "sandbox", "approvalPolicy", "approvalsReviewer"]) ||
      !hasFields(schemas, "TurnStartParams", ["model", "effort", "sandboxPolicy", "approvalsReviewer"])) throw new Error("Codex schema does not support the required execution contract.");
}
