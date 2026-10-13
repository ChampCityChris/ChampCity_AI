import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { Readable, Transform, type Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { AgentHarnessError } from "../core/applicationErrors";

export const MAX_RELEASE_ARTIFACT_SIZE = 2 * 1024 * 1024 * 1024;
const fail = () => new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Release artifact must be an ordinary checkout-contained file with matching size and SHA-256.");
const within = (root: string, target: string) => { const relative = path.relative(root, target); return !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`); };
const canonicalKey = (value: string) => process.platform === "win32" ? path.resolve(value).toLowerCase() : path.resolve(value);
export interface ReleaseAssetSource { size: number; sha256: string; open: () => Readable }

/** Private, bounded disk snapshots keep provider mutation independent of source path races. */
export class ReleaseArtifactStore {
  private directory?: string;
  private readonly artifacts = new Map<string, { file: string; expires: number; size: number }>();
  private active = 0;
  private readonly cleanupTimers = new Set<NodeJS.Timeout>();
  private async reserve() {
    for (const [handle, artifact] of this.artifacts) if (artifact.expires <= Date.now()) { await fs.promises.unlink(artifact.file); this.artifacts.delete(handle); }
    if (this.active + this.artifacts.size >= 2) throw new AgentHarnessError("INVALID_INPUT", "Temporary artifact capacity reached; wait for the 30-minute retention window.");
    this.active++;
    try {
      this.directory ??= fs.mkdtempSync(path.join(os.tmpdir(), "champcity-release-artifacts-"));
      fs.chmodSync(this.directory, 0o700);
      return path.join(this.directory, randomBytes(24).toString("hex"));
    } catch (error) { this.active--; throw error; }
  }
  private meter(expectedSize: number, expectedSha256?: string) {
    if (!Number.isSafeInteger(expectedSize) || expectedSize < 1 || expectedSize > MAX_RELEASE_ARTIFACT_SIZE ||
      expectedSha256 !== undefined && !/^[a-f0-9]{64}$/.test(expectedSha256)) throw fail();
    let size = 0; const hash = createHash("sha256");
    const stream = new Transform({ transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length; if (size > expectedSize) { callback(fail()); return; }
      hash.update(chunk); callback(null, chunk);
    } });
    return { stream, finish: () => { const sha256 = hash.digest("hex"); if (size !== expectedSize || expectedSha256 && sha256 !== expectedSha256) throw fail(); return { size, sha256 }; } };
  }
  async withCheckoutSource<T>(checkout: { root: string; commonDirectory: string; gitDirectory: string }, input: { relativePath: string; expectedSize: number; expectedSha256: string }, work: (source: ReleaseAssetSource) => Promise<T>, signal?: AbortSignal): Promise<T> {
    const relative = input.relativePath;
    if (typeof relative !== "string" || relative.length > 4096 || /[\\:\x00-\x1f]/.test(relative) || path.isAbsolute(relative) ||
      relative.split("/").some(part => !part || part === "." || part === ".." || /[. ]$|^\.git(?:$|[. ])|^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw fail();
    const file = path.resolve(checkout.root, relative);
    if (!within(checkout.root, file) || within(checkout.commonDirectory, file) || within(checkout.gitDirectory, file)) throw fail();
    const verify = () => {
      let current = checkout.root;
      for (const part of relative.split("/")) {
        current = path.join(current, part);
        const stat = fs.lstatSync(current);
        if (stat.isSymbolicLink() || canonicalKey(fs.realpathSync.native(current)) !== canonicalKey(current) || !stat.isDirectory() && !stat.isFile()) throw fail();
        if (stat.isDirectory() && (fs.existsSync(path.join(current, ".git")) ||
          ["HEAD", "objects", "refs"].every(entry => fs.existsSync(path.join(current, entry))))) throw fail();
      }
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.nlink !== 1 || stat.size !== input.expectedSize) throw fail();
      return stat;
    };
    const meter = this.meter(input.expectedSize, input.expectedSha256), before = verify();
    const descriptor = await fs.promises.open(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    let snapshot: string | undefined;
    try {
      const opened = await descriptor.stat();
      if (!opened.isFile() || opened.nlink !== 1 || opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== before.size) throw fail();
      snapshot = await this.reserve();
      await pipeline(descriptor.createReadStream({ autoClose: false }), meter.stream, fs.createWriteStream(snapshot, { flags: "wx", mode: 0o600 }), { signal });
      const verified = meter.finish(), after = verify(), final = await descriptor.stat();
      if (after.ino !== opened.ino || after.dev !== opened.dev || final.size !== opened.size || final.mtimeMs !== opened.mtimeMs || final.ctimeMs !== opened.ctimeMs) throw fail();
      const source = snapshot;
      return await work({ ...verified, open: () => fs.createReadStream(source) });
    } finally { await descriptor.close(); if (snapshot) { this.active--; await fs.promises.unlink(snapshot).catch(() => undefined); } }
  }
  async download(input: { filename: string; size: number; providerDigest: string | null }, transfer: (destination: Writable) => Promise<unknown>, signal?: AbortSignal) {
    const meter = this.meter(input.size), file = await this.reserve();
    let retained = false;
    const destination = fs.createWriteStream(file, { flags: "wx", mode: 0o600 });
    const written = pipeline(meter.stream, destination, { signal });
    // Install rejection handling before a provider failure can close the stream.
    void written.catch(() => undefined);
    try {
      await transfer(meter.stream); meter.stream.end(); await written;
      const verified = meter.finish();
      if (input.providerDigest?.startsWith("sha256:") && input.providerDigest !== `sha256:${verified.sha256}`) throw fail();
      const artifactHandle = `release_artifact_${randomBytes(24).toString("hex")}`;
      this.artifacts.set(artifactHandle, { file, size: verified.size, expires: Date.now() + 30 * 60_000 }); retained = true;
      const timer = setTimeout(() => { this.cleanupTimers.delete(timer); this.artifacts.delete(artifactHandle); void fs.promises.unlink(file).catch(() => undefined); }, 30 * 60_000);
      timer.unref(); this.cleanupTimers.add(timer);
      return { artifactHandle, filename: input.filename, ...verified, providerDigest: input.providerDigest, expiresInSeconds: 1800 };
    } finally { this.active--; if (!retained) { meter.stream.destroy(); await written.catch(() => undefined); await fs.promises.unlink(file).catch(() => undefined); } }
  }
  async close() {
    for (const timer of this.cleanupTimers) clearTimeout(timer);
    this.cleanupTimers.clear();
    this.artifacts.clear();
    if (this.directory) { await fs.promises.rm(this.directory, { recursive: true, force: true }); this.directory = undefined; }
  }
}
