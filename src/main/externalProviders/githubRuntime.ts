import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";

export const githubRuntimeVersion = "1.12.2";
const artifacts: Record<string, { name: string; sha256: string }> = {
  x64: { name: "github-mcp-server_Windows_x86_64.zip", sha256: "c08872e69f700d4219e7b4ab9607d56d7993171519ee32b62fccb8fba0cab673" },
  arm64: { name: "github-mcp-server_Windows_arm64.zip", sha256: "3290d0f26b0aa75f3c8d88ea4e07f0101f7e1555170dc7affa9454acf6636b4c" },
};

export interface GithubRuntime {
  version: string;
  directory: string;
  executable: string;
  executableSha256: string;
}

export interface GithubRuntimeOperations {
  readonly version: string;
  loadCurrent(): Promise<GithubRuntime | null>;
  stage(signal: AbortSignal): Promise<GithubRuntime>;
  probe(runtime: GithubRuntime, signal: AbortSignal): Promise<void>;
  promote(runtime: GithubRuntime): Promise<void>;
}

// Only platform environment needed by the provider's native browser launcher.
// SDK defaults exclude GITHUB_*, GH_*, arbitrary OAuth and application credentials.
export function githubProviderEnvironment(): Record<string, string> {
  const env = getDefaultEnvironment();
  for (const key of ["SYSTEMROOT", "WINDIR", "LOCALAPPDATA", "APPDATA", "TEMP", "TMP"]) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
}

export function createGithubRuntimeOperations(userDataRoot: string): GithubRuntimeOperations {
  const root = path.resolve(userDataRoot, "external-providers", "github");
  const runtimeAt = (id: string, version: string, executableSha256: string): GithubRuntime => {
    if (!/^[0-9a-f-]{36}$/.test(id) || !/^\d+\.\d+\.\d+$/.test(version) || !/^[0-9a-f]{64}$/.test(executableSha256)) throw new Error("Invalid GitHub runtime identity.");
    const directory = path.join(root, "versions", id);
    return { version, directory, executable: path.join(directory, "github-mcp-server.exe"), executableSha256 };
  };
  const verify = async (runtime: GithubRuntime) => {
    const expected = runtimeAt(path.basename(runtime.directory), runtime.version, runtime.executableSha256);
    if (runtime.directory !== expected.directory || runtime.executable !== expected.executable) throw new Error("Invalid managed GitHub runtime boundary.");
    if ((await fs.lstat(runtime.executable)).isSymbolicLink() || (await fs.lstat(runtime.directory)).isSymbolicLink()) throw new Error("Invalid managed runtime link.");
    if (hash(await fs.readFile(runtime.executable)) !== runtime.executableSha256) throw new Error("GitHub runtime integrity failed.");
  };
  return {
    version: githubRuntimeVersion,
    async loadCurrent() {
      let value;
      try { value = JSON.parse(await fs.readFile(path.join(root, "current.json"), "utf8")); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw new Error("Saved GitHub runtime is invalid."); }
      const runtime = runtimeAt(value.directory, value.version, value.executableSha256);
      await verify(runtime);
      return runtime;
    },
    async stage(signal) {
      const artifact = artifacts[process.arch];
      if (process.platform !== "win32" || !artifact) throw new Error("Official GitHub runtime acquisition is unavailable for this platform.");
      const source = `https://github.com/github/github-mcp-server/releases/download/v${githubRuntimeVersion}/${artifact.name}`;
      const bytes = await officialArtifact(source, signal);
      if (hash(bytes) !== artifact.sha256) throw new Error("Official GitHub runtime archive integrity failed.");
      const directory = path.join(root, "versions", randomUUID());
      await fs.mkdir(directory, { recursive: true });
      const archive = path.join(directory, "provider.zip");
      await fs.writeFile(archive, bytes, { flag: "wx" });
      try {
        // Extract exactly one regular member from the verified official archive.
        const listing = await execute("tar.exe", ["-tvf", archive], signal);
        const binary = listing.split(/\r?\n/).filter((line) => /(?:^|\s)github-mcp-server\.exe$/.test(line));
        if (binary.length !== 1 || !binary[0].startsWith("-")) throw new Error("Official GitHub archive lacks the expected regular executable.");
        await execute("tar.exe", ["-xf", archive, "-C", directory, "github-mcp-server.exe"], signal);
        const executableSha256 = hash(await fs.readFile(path.join(directory, "github-mcp-server.exe")));
        return runtimeAt(path.basename(directory), githubRuntimeVersion, executableSha256);
      } finally { await fs.unlink(archive); }
    },
    async probe(runtime, signal) {
      await verify(runtime);
      const output = await execute(runtime.executable, ["--version"], signal);
      if (!output.includes(`Version: ${runtime.version}`) && !output.includes(`version ${runtime.version}`)) throw new Error("Official GitHub runtime version probe failed.");
    },
    async promote(runtime) {
      await verify(runtime);
      const temporary = path.join(root, `current.${randomUUID()}.tmp`);
      await fs.writeFile(temporary, JSON.stringify({ version: runtime.version, directory: path.basename(runtime.directory), executableSha256: runtime.executableSha256 }), { flag: "wx" });
      try { await fs.rename(temporary, path.join(root, "current.json")); }
      finally { await fs.unlink(temporary).catch(() => undefined); }
    },
  };
}

function hash(bytes: Buffer): string { return createHash("sha256").update(bytes).digest("hex"); }

function execute(executable: string, args: string[], signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(executable, args, { windowsHide: true, env: githubProviderEnvironment(), timeout: 30_000, maxBuffer: 1024 * 1024, signal, encoding: "utf8" }, (error, stdout) => {
      if (error) reject(new Error("Managed GitHub runtime probe or extraction failed."));
      else resolve(stdout);
    });
  });
}

async function officialArtifact(source: string, signal: AbortSignal): Promise<Buffer> {
  const boundedSignal = AbortSignal.any([signal, AbortSignal.timeout(120_000)]);
  let url = new URL(source);
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (url.protocol !== "https:" || !["github.com", "release-assets.githubusercontent.com"].includes(url.hostname) || url.username || url.password) throw new Error("Unexpected GitHub artifact source.");
    const response = await fetch(url, { redirect: "manual", signal: boundedSignal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      url = new URL(response.headers.get("location") ?? "", url);
      continue;
    }
    if (!response.ok || !response.body) throw new Error("Official GitHub artifact download failed.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      size += chunk.length;
      if (size > 40 * 1024 * 1024) throw new Error("Official GitHub artifact exceeded its size limit.");
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  throw new Error("Official GitHub artifact redirect limit exceeded.");
}
