import { spawn } from "node:child_process";
import { Readable, type Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReleaseAssetSource } from "./releaseAssetTransport";
import { MAX_RELEASE_ARTIFACT_SIZE } from "./releaseAssetTransport";
import { githubProviderEnvironment } from "./githubRuntime";

export type GithubCompatibilityOperation = "repository-settings" | "ref-read" | "ref-create" | "ref-delete" | "file-metadata" | "file-delete-cas" | "release-read" | "release-create" | "release-update" | "release-delete" | "asset-upload" | "asset-delete" | "asset-download";
const coordinate = (value: unknown) => { if (typeof value !== "string" || !/^[a-z0-9_-][a-z0-9_.-]{0,99}$/i.test(value) || value === "..") throw Error("Invalid identity."); return value; };
const positive = (value: unknown) => { if (!Number.isSafeInteger(value) || Number(value) < 1) throw Error("Invalid object ID."); return Number(value); };
const sha = (value: unknown) => { if (typeof value !== "string" || !/^[a-f0-9]{40}$/.test(value)) throw Error("Invalid SHA."); return value; };
const text = (value: unknown, max = 65536) => { if (typeof value !== "string" || value.includes("\0") || Buffer.byteLength(value) > max) throw Error("Invalid bounded text."); return value; };
const ref = (value: unknown) => { const name = text(value, 240); if (!name || name.startsWith("-") || /[\s~^:?*\[\\]|\.\.|@\{|\/\/|\/$|\.$/.test(name)) throw Error("Invalid ref."); return name; };
export type GithubCompatibilityExecutor = (args: string[], signal?: AbortSignal, input?: string | Buffer | Readable, allowAbsent?: boolean, destination?: Writable) => Promise<string>;
async function execute(args: string[], signal?: AbortSignal, input?: string | Buffer | Readable, allowAbsent = false, destination?: Writable): Promise<string> {
  const child = spawn("gh", args, { env: githubProviderEnvironment(), windowsHide: true, timeout: destination || input instanceof Readable ? 300000 : 60000, signal });
  let output = "", stderr = "", length = 0;
  child.stderr.on("data", chunk => { if (stderr.length < 16384) stderr += String(chunk).slice(0, 16384 - stderr.length); });
  const complete = new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", code => code === 0 || allowAbsent && /\(HTTP 404\)/.test(stderr) ? resolve() : reject(Error("Fixed GitHub compatibility command failed.")));
  });
  const outputTask = destination ? pipeline(child.stdout, destination, { signal }) : (async () => {
    const decoder = new TextDecoder();
    for await (const chunk of child.stdout) { length += chunk.length; if (length > 262144) throw Error("GitHub metadata exceeds bounds."); output += decoder.decode(chunk, { stream: true }); }
    output += decoder.decode();
  })();
  const inputTask = input instanceof Readable ? pipeline(input, child.stdin, { signal }) : new Promise<void>((resolve, reject) => { child.stdin.on("error", reject); child.stdin.end(input, resolve); });
  try { await Promise.all([complete, outputTask, inputTask]); }
  catch { child.kill(); throw Error("Fixed GitHub compatibility command failed."); }
  return allowAbsent && /\(HTTP 404\)/.test(stderr) ? '{"exists":false}' : output;
}
async function requestApi(endpoint: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: Record<string, unknown>, signal?: AbortSignal, executor: GithubCompatibilityExecutor = execute) {
  const output = await executor(["api", "--hostname", "github.com", "--method", method, endpoint, ...(body ? ["--input", "-"] : [])], signal, body ? JSON.stringify(body) : undefined);
  return output.trim() ? JSON.parse(output) as unknown : { deleted: true };
}

/** Application-private credential route. The resolved token never enters a tool result or Git argv/config. */
export function createGithubGitCredentialResolver(executor: GithubCompatibilityExecutor = execute, request: typeof fetch = fetch) {
 return async (identity: string, signal?: AbortSignal): Promise<string> => {
  const token = (await executor(["auth", "token", "--hostname", "github.com"], signal)).trim();
  if (!/^[\x21-\x7e]{1,2048}$/.test(token)) throw Error("GitHub Git authentication unavailable.");
  const response = await request("https://api.github.com/user", { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }, redirect: "error", signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(15000)]) });
  if (!response.ok || Number(response.headers.get("content-length")) > 16384) { await response.body?.cancel(); throw Error("GitHub Git authentication unavailable."); }
  const reader = response.body?.getReader(); if (!reader) throw Error("GitHub Git authentication unavailable.");
  let count = 0, output = ""; const decoder = new TextDecoder();
  try { while (true) { const part = await reader.read(); if (part.done) break; count += part.value.length; if (count > 16384) throw Error("GitHub Git identity exceeds bounds."); output += decoder.decode(part.value, { stream: true }); } }
  finally { await reader.cancel(); }
  const user = JSON.parse(output + decoder.decode()) as { login?: string };
  if (typeof user.login !== "string" || user.login.toLowerCase() !== coordinate(identity).toLowerCase()) throw Error("GitHub Git identity differs from official provider.");
  return token;
 };
}
export const resolveGithubGitCredential = createGithubGitCredentialResolver();

/** Fixed routes for proven pinned-server gaps. Never accepts a URL, route, token or argument vector. */
export function createGithubCompatibilityRunner(executor: GithubCompatibilityExecutor = execute) {
 return async (operation: GithubCompatibilityOperation, input: Record<string, unknown>, identity: string, signal?: AbortSignal): Promise<unknown> => {
  const api = (endpoint: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: Record<string, unknown>, requestSignal?: AbortSignal) => requestApi(endpoint, method, body, requestSignal, executor);
  const account = await api("user", "GET", undefined, signal) as { login?: string };
  if (typeof account.login !== "string" || account.login.toLowerCase() !== coordinate(identity).toLowerCase()) throw Error("GitHub accounts differ.");
  const root = `repos/${coordinate(input.owner)}/${coordinate(input.repo)}`;
  switch (operation) {
    case "repository-settings": {
      const body: Record<string, unknown> = {};
      if (input.visibility !== undefined) { if (!["private", "public"].includes(String(input.visibility))) throw Error("Invalid visibility."); body.private = input.visibility === "private"; }
      if (input.description !== undefined) body.description = text(input.description, 2000);
      if (!Object.keys(body).length) throw Error("Select settings.");
      return api(root, "PATCH", body, signal);
    }
    case "ref-read": case "ref-delete": case "ref-create": {
      if (!["branches", "tags"].includes(String(input.kind))) throw Error("Invalid ref kind.");
      const kind = input.kind === "branches" ? "heads" : "tags", name = ref(input.name);
      return operation === "ref-create" ? api(`${root}/git/refs`, "POST", { ref: `refs/${kind}/${name}`, sha: sha(input.sourceCommit) }, signal)
        : api(`${root}/git/${operation === "ref-read" ? "ref" : "refs"}/${kind}/${encodeURIComponent(name)}`, operation === "ref-read" ? "GET" : "DELETE", undefined, signal);
    }
    case "file-metadata": case "file-delete-cas": {
      const file = text(input.filePath, 4096);
      if (!file || file.startsWith("/") || file.includes("\\") || file.split("/").some(part => !part || part === "." || part === ".." || /^\.git$/i.test(part))) throw Error("Invalid file.");
      const endpoint = `${root}/contents/${file.split("/").map(encodeURIComponent).join("/")}`;
      if (operation === "file-metadata") return JSON.parse(await executor(["api", "--hostname", "github.com", "--method", "GET", `${endpoint}?ref=${sha(input.commit)}`], signal, undefined, true));
      return api(endpoint, "DELETE", { branch: ref(input.branch), sha: sha(input.expectedSha), message: text(input.message, 2000) }, signal);
    }
    case "release-read": return api(`${root}/releases/${positive(input.releaseId)}`, "GET", undefined, signal);
    case "release-create": case "release-update": {
      const body = { tag_name: ref(input.tagName), name: text(input.name, 2000), body: text(input.body), draft: input.draft, prerelease: input.prerelease };
      if (typeof body.draft !== "boolean" || typeof body.prerelease !== "boolean") throw Error("Explicit release state required.");
      return api(`${root}/releases${operation === "release-update" ? `/${positive(input.releaseId)}` : ""}`, operation === "release-create" ? "POST" : "PATCH", body, signal);
    }
    case "release-delete": return api(`${root}/releases/${positive(input.releaseId)}`, "DELETE", undefined, signal);
    case "asset-delete": return api(`${root}/releases/assets/${positive(input.assetId)}`, "DELETE", undefined, signal);
    case "asset-download": {
      if (!input.destination || typeof (input.destination as Writable).write !== "function") throw Error("Private artifact destination required.");
      await executor(["api", "--hostname", "github.com", "--method", "GET", `${root}/releases/assets/${positive(input.assetId)}`, "--header", "Accept: application/octet-stream"], signal, undefined, false, input.destination as Writable);
      return { downloaded: true };
    }
    case "asset-upload": {
      const name = text(input.name, 160);
      if (!/^[a-z0-9][a-z0-9_.-]{0,159}$/i.test(name) || (input.source !== undefined) === (input.contentBase64 !== undefined)) throw Error("Invalid asset.");
      let bytes: Buffer | Readable, size: number;
      if (input.source !== undefined) {
        const source = input.source as ReleaseAssetSource;
        if (!Number.isSafeInteger(source.size) || source.size < 1 || source.size > MAX_RELEASE_ARTIFACT_SIZE || !/^[a-f0-9]{64}$/.test(source.sha256) || typeof source.open !== "function") throw Error("Invalid private artifact source.");
        bytes = source.open(); size = source.size;
      } else {
        const encoded = text(input.contentBase64, 699052);
        if (!encoded || !/^[a-z0-9+/]*={0,2}$/i.test(encoded)) throw Error("Invalid asset.");
        bytes = Buffer.from(encoded, "base64"); size = bytes.length;
        if (bytes.toString("base64") !== encoded || size > 524288) throw Error("Invalid base64 or asset size.");
      }
      const endpoint = `https://uploads.github.com/${root}/releases/${positive(input.releaseId)}/assets?name=${encodeURIComponent(name)}`;
      await executor(["api", "--hostname", "github.com", "--method", "POST", endpoint, "--header", "Content-Type: application/octet-stream", "--header", `Content-Length: ${size}`, "--input", "-"], signal, bytes);
      return api(`${root}/releases/${positive(input.releaseId)}`, "GET", undefined, signal);
    }
  }
 };
}
export const runGithubCompatibility = createGithubCompatibilityRunner();
