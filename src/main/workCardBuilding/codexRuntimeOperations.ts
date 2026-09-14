import fs from "node:fs/promises";
import path from "node:path";
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

const registry = "https://registry.npmjs.org";

export interface CodexRuntimeOperations
  extends CodexRuntimeMaintenanceOperations, CodexRuntimeExecutionOperations {}

// Immutable version directories plus an atomic pointer; repository dependencies are bootstrap input only.
export function createCodexRuntimeOperations(userData: string): CodexRuntimeOperations {
  const root = path.join(userData, "codex-runtime");
  const shutdown = new AbortController();
  const transports = new Set<JsonlCodexAppServerTransport>();
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
  const launch = async (runtime: ManagedCodexRuntime) => {
    shutdown.signal.throwIfAborted();
    const transport = new JsonlCodexAppServerTransport(() => spawn(runtime.executable, ["app-server", "--listen", "stdio://"], {
      cwd: root, windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PATH: `${path.join(runtime.directory, "vendor", triple, "codex-path")}${path.delimiter}${process.env.PATH ?? ""}` },
    }));
    transports.add(transport);
    const dispose = transport.dispose.bind(transport);
    transport.dispose = async () => { transports.delete(transport); await dispose(); };
    try { await bounded(transport.initialize(), 30_000); return transport; }
    catch (error) { await transport.dispose(); throw error; }
  };
  return {
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
      const version = await execute(runtime.executable, ["--version"], { windowsHide: true, timeout: 15_000 });
      if (!version.stdout.includes(`codex-cli ${runtime.version}`)) throw new Error("Managed runtime version mismatch.");
      const schemaDirectory = path.join(runtime.directory, "probe-schema");
      await fs.mkdir(schemaDirectory, { recursive: true });
      await execute(runtime.executable, ["app-server", "generate-json-schema", "--out", schemaDirectory], { windowsHide: true, timeout: 30_000 });
      await verifyRequiredSchema(schemaDirectory);
      const transport = await launch(runtime);
      try { return await bounded(transport.listModels(), 30_000); }
      finally { await transport.dispose(); }
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
    async shutdown() { shutdown.abort(); await Promise.all([...transports].map((transport) => transport.dispose())); },
  };
}

export function createCodexRuntimeExecutionOperations(
  userData: string,
): CodexRuntimeExecutionOperations {
  const operations = createCodexRuntimeOperations(userData);
  return {
    writeSelection: operations.writeSelection,
    launch: operations.launch,
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
  for (const method of ["initialize", "model/list", "thread/start", "turn/start", "turn/interrupt", "item/commandExecution/requestApproval", "item/fileChange/requestApproval", "item/permissions/requestApproval", "item/tool/requestUserInput", "mcpServer/elicitation/request"]) {
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
