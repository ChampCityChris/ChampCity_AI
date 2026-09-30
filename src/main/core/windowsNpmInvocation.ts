import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface WindowsNpmInvocation {
  executable: string;
  cliPath: string;
}

/** Resolve a paired standalone Node/npm installation without invoking a .cmd shim. */
export function resolveWindowsNpmInvocation(options: {
  executablePath?: string;
  pathValue?: string;
} = {}): WindowsNpmInvocation {
  const executablePath = options.executablePath ?? process.execPath;
  const pathValue = options.pathValue ?? process.env.PATH ?? process.env.Path ?? "";
  const searchRoots = windowsNpmSearchRoots(executablePath, pathValue);

  for (const searchRoot of searchRoots) {
    try {
      const resolvedSearchRoot = fs.realpathSync(searchRoot);
      const nodePath = path.join(resolvedSearchRoot, "node.exe");
      if (!fs.lstatSync(nodePath).isFile()) continue;
      const resolvedNodePath = fs.realpathSync(nodePath);
      if (!pathsEqual(resolvedNodePath, nodePath) || !isStandaloneNodeExecutable(resolvedNodePath)) continue;

      const packageJsonPath = path.join(resolvedSearchRoot, "node_modules", "npm", "package.json");
      const packageJsonStat = fs.lstatSync(packageJsonPath);
      if (!packageJsonStat.isFile() || packageJsonStat.size > 64 * 1_024 ||
          !pathsEqual(fs.realpathSync(packageJsonPath), packageJsonPath)) continue;
      const manifest = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { name?: unknown; bin?: unknown };
      const npmBin = typeof manifest.bin === "object" && manifest.bin !== null
        ? (manifest.bin as Record<string, unknown>).npm : manifest.bin;
      if (manifest.name !== "npm" || typeof npmBin !== "string") continue;
      const normalizedBin = path.normalize(npmBin);
      if (normalizedBin.toLowerCase() !== path.join("bin", "npm-cli.js").toLowerCase()) continue;
      const packageRoot = fs.realpathSync(path.dirname(packageJsonPath));
      if (!pathsEqual(packageRoot, path.join(resolvedSearchRoot, "node_modules", "npm"))) continue;
      const cliPath = fs.realpathSync(path.resolve(packageRoot, normalizedBin));
      const relativeCliPath = path.relative(packageRoot, cliPath);
      if (!relativeCliPath || relativeCliPath.startsWith("..") || path.isAbsolute(relativeCliPath)) continue;
      if (!fs.statSync(cliPath).isFile()) continue;
      return { executable: resolvedNodePath, cliPath };
    } catch {
      // Continue through the fixed runtime/PATH-derived candidate set.
    }
  }
  throw new Error("A standalone Node/npm toolchain could not be resolved from the fixed Windows runtime search path.");
}

function isStandaloneNodeExecutable(executablePath: string): boolean {
  const environment = { ...process.env };
  delete environment.ELECTRON_RUN_AS_NODE;
  const result = spawnSync(executablePath,
    ["-p", "JSON.stringify({releaseName:process.release?.name,electron:Boolean(process.versions?.electron)})"],
    { shell: false, windowsHide: true, encoding: "utf8", env: environment, timeout: 5_000, maxBuffer: 16 * 1_024 });
  if (result.error || result.status !== 0) return false;
  try {
    const identity = JSON.parse(result.stdout.trim()) as { releaseName?: unknown; electron?: unknown };
    return identity.releaseName === "node" && identity.electron === false;
  } catch { return false; }
}

function pathsEqual(left: string, right: string): boolean {
  return path.normalize(left).toLowerCase() === path.normalize(right).toLowerCase();
}

function windowsNpmSearchRoots(executablePath: string, pathValue: string): string[] {
  const unique = new Map<string, string>();
  for (const rawCandidate of [path.dirname(executablePath), ...pathValue.split(path.delimiter)]) {
    const candidate = rawCandidate.trim().replace(/^"|"$/g, "");
    if (!candidate || !path.isAbsolute(candidate)) continue;
    const normalized = path.normalize(candidate);
    unique.set(normalized.toLowerCase(), normalized);
  }
  return [...unique.values()];
}
